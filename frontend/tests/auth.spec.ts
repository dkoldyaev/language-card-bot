import { test, expect } from '@playwright/test';
import { register, login, addWordsToDictionary, setupSettings } from './helpers';

test.describe('Authentication Flow', () => {
  test('navigation between login and register', async ({ page }) => {
    // 1. Initial redirect to login
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('h4:has-text("Log in"), h5:has-text("Log in")').first()).toBeVisible();

    // 2. Click on "Sign up" to go to registration
    await page.click('a:has-text("Sign up")');
    await expect(page).toHaveURL(/.*\/register/);
    await expect(page.locator('button:has-text("Create account")')).toBeVisible();
    await expect(page.locator('a:has-text("Log in instead")')).toBeVisible();
  });

  test('full registration and login journey', async ({ page }) => {
    const timestamp = Date.now();
    const validUser = `testuser_${timestamp}`;
    const wrongUser = `wronguser_${timestamp}`;

    // 1. Fill in the registration form & expect success
    await register(page, validUser);

    // 2. Attempt to log in with an incorrect user
    await page.goto('/login');
    await page.getByLabel(/Username|Login/i).fill(wrongUser);
    await page.click('button:has-text("Log in")');

    // 3. Expect an error message
    await expect(page.locator('.MuiAlert-message')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/.*\/login/); // Should still be on login

    // 4. Attempt to log in with the correct user & expect success
    await login(page, validUser);

    // 5. Logout
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL(/.*\/login/);
    
    // 6. Log in again
    await login(page, validUser);
  });

  test('user state isolation after logout', async ({ page }) => {
    const timestamp = Date.now();
    const user1 = `user1_${timestamp}`;
    const user2 = `user2_${timestamp}`;

    // 1. Register and login user 1
    await register(page, user1);
    await login(page, user1);
    await setupSettings(page);

    // 2. Add words for user 1
    await addWordsToDictionary(page, ['apple']);

    // Ensure the word is visible and processed for user 1
    await expect(async () => {
      await page.goto('/dictionary/edit');
      const appleAccordion = page.locator('.MuiAccordion-root').filter({ hasText: 'apple' });
      await expect(appleAccordion).toBeVisible();
      // Need to wait until definition is added by the worker before starting quiz
      await expect(appleAccordion.locator('text=definition(s)')).toBeVisible();
    }).toPass({ timeout: 15000 });
    
    // Start quiz for user 1
    await page.goto('/quiz');
    await expect(page.locator('text=Ready to test your vocabulary?')).toBeVisible({ timeout: 15000 });
    await page.click('button:has-text("Start Quiz")');
    await expect(page.locator('h4:has-text("Quiz")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.MuiCardContent-root')).toContainText('apple');
    // Capture user 1's localStorage before logout to compare later
    const user1Storage = await page.evaluate(() => ({ ...localStorage }));
    
    // 3. Logout
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL(/.*\/login/);

    // 4. Register and login user 2
    await register(page, user2);
    await login(page, user2);

    // 5. Verify the word 'apple' is not visible for user 2 on dictionary page
    await page.goto('/dictionary/edit');
    await expect(page.locator('.MuiAccordion-root').filter({ hasText: 'apple' })).toBeHidden({ timeout: 5000 });

    // Verify user 2 does not see user 1's active quiz
    await page.goto('/quiz');
    await expect(page.locator('text=Ready to test your vocabulary?')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h4:has-text("Quiz")')).toBeHidden();

    // 6. Explicitly check the Zustand store structure in localStorage
    const user2StorageStr = await page.evaluate(() => localStorage.getItem('english-card-bot-storage'));
    expect(user2StorageStr).toBeTruthy();
    
    if (user2StorageStr) {
      const parsedStorage = JSON.parse(user2StorageStr);
      const state = parsedStorage.state;

      // 1. Dictionary should be empty for the new user
      expect(state.dictionary).toEqual([]);

      // 2. Word processing queue should be empty
      expect(state.wordProcessing).toEqual([]);

      // 3. Quiz state should be completely reset
      expect(state.quizCard).toBeNull();
      expect(state.quizEvaluation).toBeNull();
      expect(state.quizTranslation).toBeNull();
      expect(state.quizVariants).toBeNull();

      // 4. App settings should be reset to default
      expect(state.appState).toBeNull();

      // 5. Profile should belong to user 2, not user 1
      expect(state.profile).not.toBeNull();
      expect(state.profile.username).toEqual(user2);
      expect(state.profile.username).not.toEqual(user1);
    }
  });
});
