import { test, expect } from '@playwright/test';
import { register, login } from './helpers';

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

  test('registration creates an authenticated account and first dictionary', async ({ page }, testInfo) => {
    const timestamp = Date.now();
    const validUser = `testuser_${timestamp}_${testInfo.workerIndex}`;

    // Registration links the anonymous session to the new account and keeps it signed in.
    await register(page, validUser, { name: 'Auth deck', targetLanguage: 'en', baseLanguage: 'ru' });
    await expect(page.getByRole('heading', { name: `Welcome, ${validUser}.` })).toBeVisible();

    // Logging out returns to the guest workspace.
    await page.locator('button, [role="button"]').filter({ hasText: /Sign out|Logout/i }).first().click();
    await expect(page).toHaveURL('/en');
  });

  test('user state isolation after logout', async ({ page }, testInfo) => {
    const timestamp = Date.now();
    const user1 = `user1_${timestamp}_${testInfo.workerIndex}`;
    const user2 = `user2_${timestamp}_${testInfo.workerIndex}`;

    // 1. Register and login user 1
    await register(page, user1, { name: 'User 1 deck', targetLanguage: 'en', baseLanguage: 'ru' });
    await login(page, user1);

    // 2. Logout
    await page.locator('button, [role="button"]').filter({ hasText: /Sign out|Logout/i }).first().click();
    await expect(page).toHaveURL('/en');

    // 3. Register and login user 2
    await register(page, user2, { name: 'User 2 deck', targetLanguage: 'en', baseLanguage: 'ru' });
    await login(page, user2);

    // 4. A new account receives its own initial dictionary, never another user's data.
    await page.locator('nav').getByText('Dictionary').click();
    await expect(page.getByRole('heading', { name: 'User 2 deck', exact: true })).toBeVisible();
    // Quiz is unavailable until this user adds words; the empty first dictionary is the
    // user-visible isolation contract.
    await page.locator('nav').getByText('Dashboard').click();
    await expect(page.getByRole('heading', { name: `Welcome, ${user2}.` })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start a quiz' })).toBeDisabled();
    await expect(page.locator('nav').getByRole('button', { name: 'Quiz' })).toBeDisabled();
  });
});
