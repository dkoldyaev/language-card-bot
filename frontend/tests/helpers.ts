import { Page, expect } from '@playwright/test';

export async function register(page: Page, username: string, baseLang = 'en', targetLang = 'ru') {
  await page.goto('/register');
  await expect(page.locator('button:has-text("Create account")')).toBeVisible();
  await page.getByLabel(/Username|Login/i).fill(username);

  // Call setupSettings which fills the selects by label
  await setupSettings(page, baseLang, targetLang);

  await page.click('button:has-text("Create account")');
  await expect(page.locator('text=Registration successful')).toBeVisible({ timeout: 30000 });
  await page.click('a:has-text("Back to login")');
  await expect(page).toHaveURL(/.*\/login/);
}

export async function login(page: Page, username: string) {
  await page.goto('/login');
  await page.getByLabel(/Username|Login/i).fill(username);
  await page.click('button:has-text("Log in")');
  await expect(page).toHaveURL('/');
  await page.evaluate(() => localStorage.setItem('cardbot_guideline_completed', 'true'));
}

export async function addWordsToDictionary(page: Page, words: string[]) {
  await page.goto('/dictionary');
  await expect(page.locator('text=Vocabulary Deck')).toBeVisible();
  
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
    
    const summary = accordion.locator('.MuiAccordionSummary-root');
    await expect(async () => {
      const isExpanded = await summary.getAttribute('aria-expanded') === 'true';
      if (!isExpanded) {
        await summary.click();
      }
      await expect(accordion.locator('[aria-label="Edit definition"]').first()).toBeVisible({ timeout: 1000 });
      await expect(accordion.locator('[aria-label="Edit translation"]').first()).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 20000 });

    if (await summary.getAttribute('aria-expanded') === 'true') {
      await summary.click();
    }
  }
}

export async function setupSettings(page: Page, baseLang = 'en', targetLang = 'ru') {
  // Select base language
  await page.getByLabel(/Native/i).click();
  await page.locator(`li[data-value="${baseLang}"]`).click();

  // Select target language
  await page.getByLabel(/Learned|Target/i).click();
  await page.locator(`li[data-value="${targetLang}"]`).click();
}
