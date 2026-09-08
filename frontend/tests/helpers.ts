import { Page, expect } from '@playwright/test';

export async function register(page: Page, username: string, baseLang = 'en', targetLang = 'ru') {
  await page.goto('/register');
  await expect(page.locator('button:has-text("Create account")')).toBeVisible();
  await page.getByLabel(/Username|Login/i).fill(username);

  // Call setupSettings which fills the selects by label
  await setupSettings(page, baseLang, targetLang);

  await page.click('button:has-text("Create account")');
  await expect(page.locator('text=Registration successful')).toBeVisible();
  await page.click('a:has-text("Back to login")');
  await expect(page).toHaveURL(/.*\/login/);
}

export async function login(page: Page, username: string) {
  await page.goto('/login');
  await page.getByLabel(/Username|Login/i).fill(username);
  await page.click('button:has-text("Log in")');
  await expect(page).toHaveURL('/');
}

export async function addWordsToDictionary(page: Page, words: string[]) {
  await page.goto('/dictionary');
  await expect(page.getByRole('heading', { name: 'Dictionary' })).toBeVisible();
  
  const text = words.join('\n');
  await page.fill('textarea', text);
  
  await expect(page.locator('button:has-text("Submit Words")')).toBeVisible();
  await page.click('button:has-text("Submit Words")');
  
  // Wait for submission to complete (textarea is cleared upon success)
  await expect(page.locator('textarea').first()).toHaveValue('');
}

export async function addWordsAndAwaitDefinitions(page: Page, words: string[]) {
  await addWordsToDictionary(page, words);
  
  for (const word of words) {
    const accordion = page.locator('.MuiAccordion-root').filter({ hasText: word });
    await expect(accordion).toBeVisible();
    
    // We check that it has finished processing by ensuring StatusChip is hidden
    // and then expand it and ensure at least one definition exists.
    await expect(accordion.locator('text=Processing definitions...')).toBeHidden();
    await expect(accordion.locator('text=Fetching...')).toBeHidden();
    
    await accordion.click();
    await expect(accordion.locator('[aria-label="Edit definition"]').first()).toBeVisible();
    await expect(accordion.locator('[aria-label="Edit translation"]').first()).toBeVisible();
    await accordion.click(); // collapse it back
  }
}

export async function setupSettings(page: Page, baseLang = 'en', targetLang = 'ru') {
  // Select base language
  await page.getByLabel('Native Language').click();
  await page.locator(`li[data-value="${baseLang}"]`).click();

  // Select target language
  await page.getByLabel('Learning Language').click();
  await page.locator(`li[data-value="${targetLang}"]`).click();
}
