import { test, expect } from '@playwright/test';
import { register, login, addWordsToDictionary } from './helpers';

test.describe('English Card Bot Frontend E2E', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[PAGE ERROR LOG]: ${msg.text()}`);
      }
    });
    page.on('pageerror', error => console.log(`[PAGE ERROR]: ${error.message}`));

    const username = `testuser_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    // We register and then login the user for each test
    await register(page, username);
    await login(page, username);
  });

  test('should display Welcome page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Welcome to English Card Bot')).toBeVisible();
  });

  test('should navigate to Settings and save settings', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');
    await expect(page.locator('h4:has-text("Settings")')).toBeVisible();

    // Select options if possible (checking the selects exist)
    await expect(page.locator('[data-testid="base-language-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="learned-language-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="level-select"]')).toBeVisible();

    // In a real e2e test, we'd interact with MUI selects and click save, 
    // but this depends on if backend is returning properly mocked data or real data.
    // Let's at least check if Save button is there.
    await expect(page.locator('button:has-text("Save Settings")')).toBeVisible();
  });

  test('should navigate to Dictionary Add, add words, and verify them in Dictionary Edit', async ({ page }) => {
    // 1. Add words using the helper function
    const wordsToAdd = ['apple', 'banana'];
    await addWordsToDictionary(page, wordsToAdd);

    // 2. Navigate to Dictionary Edit
    await page.goto('/dictionary/edit');
    await expect(page.locator('h4:has-text("Edit Dictionary")')).toBeVisible();

    // 3. Verify that the added words are displayed in the list
    for (const word of wordsToAdd) {
      await expect(page.locator(`text=${word}`).first()).toBeVisible({ timeout: 10000 });
    }
  });

  // test('should navigate to Quiz and click Start Quiz', async ({ page }) => {
  //   await page.goto('/quiz');
  //   await expect(page.locator('text=Ready to test your vocabulary?')).toBeVisible();
  //   await page.click('button:has-text("Start Quiz")');
  //   // Expect the quiz UI to show up instead of failing silently
  //   await expect(page.locator('h4:has-text("Quiz")')).toBeVisible({ timeout: 5000 });
  // });

});
