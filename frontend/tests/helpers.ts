import { Page, expect } from '@playwright/test';

export async function register(page: Page, username: string, baseLang = 'en', targetLang = 'ru') {
  await page.goto('/en/register');
  await expect(page.locator('button:has-text("Create account")')).toBeVisible();
  await page.getByLabel(/Username|Login/i).fill(username);

  await page.click('button:has-text("Create account")');
  await expect(page.locator('text=Registration successful')).toBeVisible({ timeout: 30000 });
  await page.click('a:has-text("Back to login")');
  await expect(page).toHaveURL('/en/login');
}

export async function login(page: Page, username: string) {
  await page.goto('/en/login');
  await page.getByLabel(/Username|Login/i).fill(username);
  await page.click('button:has-text("Log in")');
  await expect(page).toHaveURL('/en');

  // Wait for the dashboard stats API call to complete so dictionaries are populated in the store
  await page.waitForResponse(response => response.url().includes('/stats') && response.status() === 200, { timeout: 10000 }).catch(() => {});

  await page.evaluate(() => localStorage.setItem('cardbot_guideline_completed', 'true'));
}

export async function createDictionary(
  page: Page,
  { name, targetLanguage = 'en', baseLanguage = 'ru' }: {
    name: string;
    targetLanguage?: string;
    baseLanguage?: string;
  },
) {
  await page.locator('nav').getByText('Dictionary').click();
  const createDialog = page.getByRole('dialog', { name: 'Create New Dictionary' });
  await expect(createDialog).toBeVisible();

  await createDialog.getByLabel('Language to Learn (Target)').click();
  await page.locator(`li[data-value="${targetLanguage}"]`).click();
  await createDialog.getByLabel('Explanations / Native Language').click();
  await page.locator(`li[data-value="${baseLanguage}"]`).click();
  await createDialog.getByLabel('Dictionary Name (optional)').fill(name);
  await createDialog.locator('[data-tour="create-dictionary-dialog-submit"]').click();
  await expect(createDialog).toBeHidden();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}

export async function addWordsToDictionary(page: Page, words: string[]) {
  await page.locator('nav').getByText('Dictionary').click();
  const wordsInput = page.getByRole('textbox', { name: 'Words to add' });
  await expect(wordsInput).toBeVisible();

  const text = words.join('\n');
  await wordsInput.fill(text);

  await expect(page.locator('button:has-text("Submit Words")')).toBeVisible();
  await page.click('button:has-text("Submit Words")');

  // Wait for submission to complete (textarea is cleared upon success)
  await expect(wordsInput).toHaveValue('');
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
