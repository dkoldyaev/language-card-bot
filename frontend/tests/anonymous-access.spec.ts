import { expect, test } from '@playwright/test';

const createDictionaryDialogName = 'Create New Dictionary';

test.describe('Anonymous session onboarding', () => {
  test('a first-time visitor receives an anonymous session and is prompted to create the first dictionary', async ({ page }) => {
    await page.goto('/en');

    await expect(page.getByTestId('guest-banner')).toBeVisible();
    await expect(page.getByRole('dialog', { name: createDictionaryDialogName })).toBeVisible();
    await expect(page.getByLabel('Language to Learn (Target)')).toBeVisible();
    await expect(page.getByLabel('Explanations / Native Language')).toBeVisible();
  });

  test('legacy local dictionary is silently moved into an anonymous session without asking for another dictionary', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('english-card-bot-storage', JSON.stringify({
        state: {
          dictionaries: [{
            id: 42,
            name: 'Legacy Spanish',
            targetLanguage: 'es',
            baseLanguage: 'en',
            wordCount: 0,
            isActive: true,
          }],
          dictionary: [],
          guestDictionaryWords: {},
          guestQuizAttempts: [],
        },
      }));
    });

    await page.goto('/en');

    await expect(page.getByTestId('guest-banner')).toBeVisible();
    await expect(page.getByRole('button', { name: /Legacy Spanish/ })).toBeVisible();
    await expect(page.getByRole('dialog', { name: createDictionaryDialogName })).toBeHidden();
  });

  test('a newly registered user with no dictionaries is prompted to create one', async ({ page }, testInfo) => {
    const username = `empty_dictionary_${Date.now()}_${testInfo.workerIndex}`;

    await page.goto('/en/register');
    await page.getByLabel(/Username|Login/i).fill(username);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL('/en');
    await expect(page.getByTestId('guest-banner')).toBeHidden();
    await expect(page.getByRole('dialog', { name: createDictionaryDialogName })).toBeVisible();
  });
});
