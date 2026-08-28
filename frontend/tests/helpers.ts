import { Page, expect } from '@playwright/test';

export async function register(page: Page, username: string, baseLang = 'en', targetLang = 'ru', level = 'A1') {
  await page.goto('/register');
  await expect(page.locator('button:has-text("Create account")')).toBeVisible();
  await page.getByLabel(/Username|Login/i).fill(username);

  // Call setupSettings which fills the selects by label
  await setupSettings(page, baseLang, targetLang, level);

  await page.click('button:has-text("Create account")');
  await expect(page.locator('text=Registration successful')).toBeVisible({ timeout: 5000 });
  await page.click('a:has-text("Back to login")');
  await expect(page).toHaveURL(/.*\/login/);
}

export async function login(page: Page, username: string) {
  await page.goto('/login');
  await expect(page.locator('h5:has-text("Log in")').first()).toBeVisible();
  await page.getByLabel(/Username|Login/i).fill(username);
  await page.click('button:has-text("Log in")');
  await expect(page).toHaveURL(/.*\/$/);
  // Dashboard shows personalized welcome
  await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 10000 });
}

export async function addWordsToDictionary(page: Page, words: string[]) {
  await page.goto('/dictionary');
  await expect(page.locator('h4:has-text("Dictionary")')).toBeVisible();
  
  const text = words.join('\n');
  await page.fill('textarea', text);
  
  await expect(page.locator('button:has-text("Submit Words")')).toBeVisible();
  await page.click('button:has-text("Submit Words")');
  
  // Wait for submission to complete (textarea is cleared upon success)
  await expect(page.locator('textarea').first()).toHaveValue('', { timeout: 10000 });
}

export async function addWordsAndAwaitDefinitions(page: Page, words: string[]) {
  await addWordsToDictionary(page, words);
  
  await expect(async () => {
    await page.goto('/dictionary');
    for (const word of words) {
      const accordion = page.locator('.MuiAccordion-root').filter({ hasText: word });
      await expect(accordion).toBeVisible();
      await expect(accordion).toContainText(/[1-9]\d* definition\(s\)/);
    }
  }).toPass({ timeout: 15000 });
}

export async function setupSettings(page: Page, baseLang = 'en', targetLang = 'ru', level = 'A1') {
  // Select base language
  await page.getByLabel('Native Language').click();
  await page.locator(`li[data-value="${baseLang}"]`).click();

  // Select target language
  await page.getByLabel('Learning Language').click();
  await page.locator(`li[data-value="${targetLang}"]`).click();

  // Select level
  await page.getByLabel('Level').click();
  await page.locator(`li[data-value="${level}"]`).click();
}
