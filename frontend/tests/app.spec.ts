import { test, expect } from '@playwright/test';
import { register, login } from './helpers';

test.describe('English Card Bot Frontend E2E', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // ... setup console logging ...
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[PAGE ERROR LOG]: ${msg.text()}`);
      }
    });
    page.on('pageerror', error => console.log(`[PAGE ERROR]: ${error.message}`));

    const username = `testuser_${Date.now()}_${testInfo.workerIndex}`;
    // We register and then login the user for each test
    await register(page, username);
    await login(page, username);
  });

  test('should display Dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should redirect /settings to dashboard', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL('/');
  });
});
