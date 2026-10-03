import { Page, expect } from '@playwright/test';

export async function register(page: Page, username: string, baseLang = 'en', targetLang = 'ru') {
  await page.goto('/register');
  await expect(page.locator('button:has-text("Create account")')).toBeVisible();
  await page.getByLabel(/Username|Login/i).fill(username);


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
  
  // Wait for the dashboard stats API call to complete so dictionaries are populated in the store
  await page.waitForResponse(response => response.url().includes('/stats') && response.status() === 200, { timeout: 10000 }).catch(() => {});
  
  await page.evaluate(() => localStorage.setItem('cardbot_guideline_completed', 'true'));
  
  // We need to setup a dictionary for the new user, otherwise tests fail
  // We check if the dictionary selector says "Select Dictionary", which implies it's empty
  // Or we just always call it. For now, let's just call it.
  await setupSettings(page);
}

export async function addWordsToDictionary(page: Page, words: string[]) {
  await page.goto('/dictionary');
  await expect(page.getByText('Vocabulary Deck', { exact: true })).toBeVisible();
  
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
  // Wait for the dictionary selector to be visible
  await expect(page.getByTestId('dictionary-selector-button')).toBeVisible({ timeout: 15000 });
  
  const selectorText = await page.getByTestId('dictionary-selector-button').innerText();
  if (!selectorText.includes('Select Dictionary')) {
    // If a dictionary is already selected (e.g. from a previous test step), we don't need to create one
    return;
  }

  await page.getByTestId('dictionary-selector-button').click();

  // Click on "Create New Dictionary"
  await expect(page.locator('[data-tour="create-dictionary-menu-item"]')).toBeVisible();
  await page.locator('[data-tour="create-dictionary-menu-item"]').click();

  // Wait for the dialog to open
  await expect(page.locator('[data-tour="create-dictionary-dialog-paper"]')).toBeVisible();

  // Select target language
  await page.getByLabel(/Target|Language to Learn/i).click();
  await page.locator(`li[data-value="${targetLang}"]`).click();

  // Select base language
  await page.getByLabel(/Native|Explanations/i).click();
  await page.locator(`li[data-value="${baseLang}"]`).click();
  
  // Submit
  await page.locator('[data-tour="create-dictionary-dialog-submit"]').click();
  
  // Wait for dialog to close
  await expect(page.locator('[data-tour="create-dictionary-dialog-paper"]')).not.toBeVisible();
}
