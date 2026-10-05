import { expect, test, type Page } from '@playwright/test';
import { createDictionary, login, register } from './helpers';

async function createSpanishPreset(page: Page, title: string) {
  await page.locator('nav').getByText('Presets').click();
  await expect(page.getByText('Presets Catalog')).toBeVisible();
  await page.getByRole('button', { name: 'Create Preset' }).first().click();
  await page.getByPlaceholder('e.g. 50 Essential Spanish Verbs').fill(title);
  await page.getByRole('button', { name: 'Create Preset', exact: true }).click();
  await expect(page.locator('.MuiCard-root').filter({ hasText: title })).toBeVisible();
}

async function applyGuestPreset(page: Page, presetTitle: string) {
  const presetsSection = page.getByTestId('dictionary-presets-section');
  const presetCard = presetsSection.locator('.MuiCard-root').filter({ hasText: presetTitle });
  await expect(presetCard).toBeVisible();
  await presetCard.getByRole('button', { name: 'Add to Dictionary' }).click();
  await expect(page.getByText(`Added "${presetTitle}"`, { exact: false })).toBeVisible();
}

test.describe('Guest access', () => {
  test('guest creates a dictionary, applies a preset, keeps it after reload, and practices', async ({ page }, testInfo) => {
    test.setTimeout(90000);
    const suffix = `${Date.now()}_${testInfo.workerIndex}`;
    const presetTitle = `Guest Spanish ${suffix}`;

    await register(page, `admin_guest_${suffix}`);
    await login(page, `admin_guest_${suffix}`);
    await createSpanishPreset(page, presetTitle);
    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page).toHaveURL('/en');
    await expect(page.getByTestId('guest-banner')).toBeVisible();
    await createDictionary(page, { name: 'Guest Spanish', targetLanguage: 'es', baseLanguage: 'en' });
    await applyGuestPreset(page, presetTitle);

    await page.reload();
    await expect(page).toHaveURL(/\/en\/dictionary\/\d+$/);
    await expect(page.getByRole('heading', { name: 'Guest Spanish', exact: true })).toBeVisible();
    await expect(page.locator('.MuiAccordion-root').filter({ hasText: 'hola' })).toBeVisible();

    await page.locator('nav').getByText('Quiz').click();
    await expect(page.getByRole('heading', { name: 'Quiz' })).toBeVisible({ timeout: 20000 });
    await page.getByRole('textbox', { name: 'Your answer' }).fill('hola');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Your answer', { exact: true }).last()).toBeVisible();
  });

  test('existing account offers to merge guest vocabulary and retains it after confirmation', async ({ page }, testInfo) => {
    test.setTimeout(90000);
    const suffix = `${Date.now()}_${testInfo.workerIndex}`;
    const username = `existing_guest_${suffix}`;
    const presetTitle = `Merge Spanish ${suffix}`;

    await register(page, `admin_merge_${suffix}`);
    await login(page, `admin_merge_${suffix}`);
    await createSpanishPreset(page, presetTitle);
    await page.getByRole('button', { name: 'Sign out' }).click();

    await register(page, username);
    await login(page, username);
    await page.getByRole('button', { name: 'Sign out' }).click();

    await createDictionary(page, { name: 'Guest data to merge', targetLanguage: 'es', baseLanguage: 'en' });
    await applyGuestPreset(page, presetTitle);

    await page.getByTestId('guest-banner-auth-btn').click();
    await page.getByLabel(/Username|Login/i).fill(username);
    await page.getByRole('button', { name: 'Log in' }).click();

    const mergeDialog = page.getByTestId('merge-guest-dialog');
    await expect(mergeDialog).toBeVisible();
    await mergeDialog.getByTestId('merge-guest-confirm-btn').click();
    await expect(page).toHaveURL('/en');
    await expect(page.getByTestId('guest-banner')).toBeHidden();

    await page.locator('nav').getByText('Dictionary').click();
    await expect(page.locator('.MuiAccordion-root').filter({ hasText: 'hola' })).toBeVisible();
  });
});
