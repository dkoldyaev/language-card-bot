import { test, expect } from '@playwright/test';

test('redirects to login when unauthenticated', async ({ page }) => {
  // Go to the home page
  await page.goto('/');
  
  // Verify that we are redirected to /login
  await expect(page).toHaveURL(/.*\/login/);

  // Verify that the login form is rendered
  await expect(page.locator('button:has-text("Login"), button:has-text("Register")').first()).toBeVisible();
});
