import { test, expect } from '@playwright/test';

test.describe('English Card Bot Frontend E2E', () => {

  // test('should display Welcome page', async ({ page }) => {
  //   await page.goto('/');
  //   await expect(page.locator('text=Welcome to English Card Bot')).toBeVisible();
  // });

  // test('should navigate to Settings and save settings', async ({ page }) => {
  //   // Navigate to settings
  //   await page.goto('/settings');
  //   await expect(page.locator('h4:has-text("Settings")')).toBeVisible();

  //   // Select options if possible (checking the selects exist)
  //   await expect(page.locator('[data-testid="base-language-select"]')).toBeVisible();
  //   await expect(page.locator('[data-testid="learned-language-select"]')).toBeVisible();
  //   await expect(page.locator('[data-testid="level-select"]')).toBeVisible();

  //   // In a real e2e test, we'd interact with MUI selects and click save, 
  //   // but this depends on if backend is returning properly mocked data or real data.
  //   // Let's at least check if Save button is there.
  //   await expect(page.locator('button:has-text("Save Settings")')).toBeVisible();
  // });

  // test('should navigate to Dictionary Add and add a word', async ({ page }) => {
  //   await page.goto('/dictionary/add');
  //   await expect(page.locator('h4:has-text("Add Words")')).toBeVisible();

  //   // Fill the text area
  //   await page.fill('textarea', 'apple');
  //   await expect(page.locator('button:has-text("Submit Words")')).toBeVisible();
  //   await page.click('button:has-text("Submit Words")');
  //   // We would expect a success or processing list update
  // });

  // test('should navigate to Dictionary Edit', async ({ page }) => {
  //   await page.goto('/dictionary/edit');
  //   // Check title or presence of accordion/list
  // });

  // test('should navigate to Quiz and click Start Quiz', async ({ page }) => {
  //   await page.goto('/quiz');
  //   await expect(page.locator('text=Ready to test your vocabulary?')).toBeVisible();
  //   await page.click('button:has-text("Start Quiz")');
  //   // Expect the quiz UI to show up instead of failing silently
  //   await expect(page.locator('h4:has-text("Quiz")')).toBeVisible({ timeout: 5000 });
  // });

});
