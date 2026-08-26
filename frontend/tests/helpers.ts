import { Page, expect } from '@playwright/test';

export async function register(page: Page, username: string) {
  await page.goto('/register');
  await expect(page.locator('button:has-text("Create account")')).toBeVisible();
  await page.getByLabel(/Username|Login/i).fill(username);
  await page.click('button:has-text("Create account")');
  await expect(page.locator('text=Registration successful')).toBeVisible({ timeout: 5000 });
  await page.click('a:has-text("Back to login")');
  await expect(page).toHaveURL(/.*\/login/);
}

export async function login(page: Page, username: string) {
  await page.goto('/login');
  await expect(page.locator('h4:has-text("Log in"), h5:has-text("Log in")').first()).toBeVisible();
  await page.getByLabel(/Username|Login/i).fill(username);
  await page.click('button:has-text("Log in")');
  await expect(page).toHaveURL(/.*\/$/);
  await expect(page.locator('text=Welcome to English Card Bot')).toBeVisible({ timeout: 10000 });
}

export async function addWordsToDictionary(page: Page, words: string[]) {
  const modeSwitchPromise = page.waitForResponse(response => response.url().includes('/switch_mode_dictionary_add') && response.status() === 200);
  await page.goto('/dictionary/add');
  await expect(page.locator('h4:has-text("Add Words")')).toBeVisible();
  await modeSwitchPromise;
  
  const text = words.join('\n');
  await page.fill('textarea', text);
  
  await expect(page.locator('button:has-text("Submit Words")')).toBeVisible();
  await page.click('button:has-text("Submit Words")');
  
  // Wait for submission to complete (textarea is cleared upon success)
  await expect(page.locator('textarea').first()).toHaveValue('', { timeout: 10000 });
}

export async function setupSettings(page: Page, baseLang = 'en', targetLang = 'ru', level = 'A1') {
  await page.goto('/settings');
  await expect(page.locator('h4:has-text("Settings")')).toBeVisible();

  // Ensure the page is loaded
  await expect(page.locator('[data-testid="base-language-select"]')).toBeVisible();

  // Select base language
  await page.locator('.MuiSelect-select').nth(0).click();
  await page.locator(`li[data-value="${baseLang}"]`).click();

  // Select target language
  await page.locator('.MuiSelect-select').nth(1).click();
  await page.locator(`li[data-value="${targetLang}"]`).click();

  // Select level
  await page.locator('.MuiSelect-select').nth(2).click();
  await page.locator(`li[data-value="${level}"]`).click();

  // Save Settings
  const saveBtn = page.locator('button:has-text("Save Settings")');
  await expect(saveBtn).toBeVisible();
  await saveBtn.click();
  // Wait for success message
  await expect(page.locator('text=Settings saved successfully')).toBeVisible({ timeout: 5000 });
}
