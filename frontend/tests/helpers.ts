import { Page, expect } from '@playwright/test';

export interface FirstDictionary {
  name: string;
  targetLanguage: string;
  baseLanguage: string;
}

async function fillCreateDictionaryDialog(page: Page, dictionary: FirstDictionary) {
  const createDialog = page.getByRole('dialog', { name: 'Create New Dictionary' });
  await expect(createDialog).toBeVisible();

  await createDialog.getByLabel('Language to Learn (Target)').click();
  await page.locator(`li[data-value="${dictionary.targetLanguage}"]`).click();
  await createDialog.getByLabel('Explanations / Native Language').click();
  await page.locator(`li[data-value="${dictionary.baseLanguage}"]`).click();
  await createDialog.getByLabel('Dictionary Name (optional)').fill(dictionary.name);
  await createDialog.locator('[data-tour="create-dictionary-dialog-submit"]').click();
  await expect(createDialog).toBeHidden();
}

export async function register(page: Page, username: string, firstDictionary: FirstDictionary) {
  await page.goto('/en/register');
  await expect(page.locator('button:has-text("Create account")')).toBeVisible();
  await page.getByLabel(/Username|Login/i).fill(username);

  await page.click('button:has-text("Create account")');
  await expect(page).toHaveURL('/en');
  await fillCreateDictionaryDialog(page, firstDictionary);
}

export async function login(page: Page, username: string) {
  if (await page.getByRole('button', { name: 'Sign out' }).isVisible().catch(() => false)) {
    return;
  }

  await page.goto('/en/login');
  await page.getByLabel(/Username|Login/i).fill(username);
  await page.click('button:has-text("Log in")');
  await expect(page).toHaveURL('/en');

  // Wait for the dashboard stats API call to complete so dictionaries are populated in the store
  await page.waitForResponse(response => response.url().includes('/stats') && response.status() === 200, { timeout: 10000 }).catch(() => {});

  await page.evaluate(() => localStorage.setItem('cardbot_guideline_completed', 'true'));
}

export async function createDictionary(page: Page, dictionary: FirstDictionary) {
  await page.locator('nav').getByText('Dictionary').click();
  await page.getByRole('button', { name: 'New Dictionary' }).click();
  await fillCreateDictionaryDialog(page, dictionary);
  await expect(page.getByRole('heading', { name: dictionary.name, exact: true })).toBeVisible();
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

export async function addWordsAndAwaitDefinitions(
  page: Page,
  words: string[],
  { waitForTranslations = false }: { waitForTranslations?: boolean } = {},
) {
  if (waitForTranslations) {
    await page.evaluate(() => {
      const testWindow = window as typeof window & { __mercureWordStatusEvents?: Array<{ type?: string }> };
      testWindow.__mercureWordStatusEvents = [];
      window.addEventListener('mercure-word-status', (event) => {
        testWindow.__mercureWordStatusEvents?.push((event as CustomEvent<{ type?: string }>).detail);
      });
    });
  }

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
    }).toPass({ timeout: 20000 });

    if (await summary.getAttribute('aria-expanded') === 'true') {
      await summary.click();
    }
  }

  if (waitForTranslations) {
    await expect.poll(
      () => page.evaluate(() => {
        const testWindow = window as typeof window & { __mercureWordStatusEvents?: Array<{ type?: string }> };
        return testWindow.__mercureWordStatusEvents?.some(
          (event) => event.type === 'definition_translate_loaded',
        ) ?? false;
      }),
      { timeout: 30000 },
    ).toBe(true);
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
