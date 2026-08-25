import { test, expect } from '@playwright/test';
import { register, login } from './helpers';

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
});
