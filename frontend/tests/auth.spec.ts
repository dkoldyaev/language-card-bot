import { test, expect } from '@playwright/test';
import { createDictionary, register, login, addWordsAndAwaitDefinitions } from './helpers';

test.describe('Authentication Flow', () => {
  test('navigation between login and register', async ({ page }) => {
    // 1. Initial navigation to login
    await page.goto('/login');
    await expect(page).toHaveURL('/en/login');
    await expect(page.locator('h5:has-text("Log in")').first()).toBeVisible();

    // 2. Click on "Sign up" to go to registration
    await page.click('a:has-text("Sign up")');
    await expect(page).toHaveURL('/en/register');
    await expect(page.locator('button:has-text("Create account")')).toBeVisible();
    await expect(page.locator('a:has-text("Log in instead")')).toBeVisible();
  });

  test('full registration and login journey', async ({ page }, testInfo) => {
    const timestamp = Date.now();
    const validUser = `testuser_${timestamp}_${testInfo.workerIndex}`;
    const wrongUser = `wronguser_${timestamp}_${testInfo.workerIndex}`;

    // 1. Fill in the registration form & expect success
    await register(page, validUser);

    // 2. Attempt to log in with an incorrect user
    await page.goto('/login');
    await page.getByLabel(/Username|Login/i).fill(wrongUser);
    await page.click('button:has-text("Log in")');

    // 3. Expect an error message
    await expect(page.locator('.MuiAlert-message')).toBeVisible();
    await expect(page).toHaveURL('/en/login'); // Should still be on login

    // 4. Attempt to log in with the correct user & expect success
    await login(page, validUser);

    // 5. Logout
    await page.locator('button, [role="button"]').filter({ hasText: /Sign out|Logout/i }).first().click();
    await expect(page).toHaveURL('/en');
    
    // 6. Log in again
    await login(page, validUser);
  });

  test('user state isolation after logout', async ({ page }, testInfo) => {
    const timestamp = Date.now();
    const user1 = `user1_${timestamp}_${testInfo.workerIndex}`;
    const user2 = `user2_${timestamp}_${testInfo.workerIndex}`;

    // 1. Register and login user 1
    await register(page, user1);
    await login(page, user1);
    await createDictionary(page, { name: 'User 1 deck' });

    // 2. Add words for user 1
    await addWordsAndAwaitDefinitions(page, ['apple']);
    
    // Start quiz for user 1
    await page.locator('nav').getByText('Quiz').click();
    await expect(page.getByRole('heading', { name: 'Quiz' })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.MuiCardContent-root').first()).toContainText('apple');
    
    // 3. Logout
    await page.locator('button, [role="button"]').filter({ hasText: /Sign out|Logout/i }).first().click();
    await expect(page).toHaveURL('/en');

    // 4. Register and login user 2
    await register(page, user2);
    await login(page, user2);

    // 5. A new account must not receive another account's dictionary or active quiz.
    // Opening Dictionary therefore starts with its creation dialog, rather than a word list.
    await page.locator('nav').getByText('Dictionary').click();
    const createDictionaryDialog = page.getByRole('dialog', { name: 'Create New Dictionary' });
    await expect(createDictionaryDialog).toBeVisible();
    await expect(page.locator('.MuiAccordion-root').filter({ hasText: 'apple' })).toHaveCount(0);
    await createDictionaryDialog.getByRole('button', { name: 'Cancel' }).click();

    // Quiz is intentionally unavailable until this user adds words. Its disabled control,
    // together with the empty dashboard, is the user-visible isolation contract.
    await page.locator('nav').getByText('Dashboard').click();
    await expect(page.getByRole('heading', { name: `Welcome, ${user2}.` })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start a quiz' })).toBeDisabled();
    await expect(page.locator('nav').getByRole('button', { name: 'Quiz' })).toBeDisabled();
  });
});
