import { test, expect } from '@playwright/test';
import { register, login } from './helpers';

test.describe('Presets & Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[PAGE ERROR LOG]: ${msg.text()}`);
      }
    });
    page.on('pageerror', (error) => console.log(`[PAGE ERROR]: ${error.message}`));
  });

  test('regular user cannot access presets in navigation or direct URL', async ({ page }, testInfo) => {
    const regularUsername = `reguser_${Date.now()}_${testInfo.workerIndex}`;
    await register(page, regularUsername, { name: 'Regular deck', targetLanguage: 'en', baseLanguage: 'ru' });
    await login(page, regularUsername);

    // Verify "Presets" link is not present in navigation
    await expect(page.getByRole('link', { name: 'Presets' })).not.toBeVisible();

    // A manually entered protected URL is still rejected; this is a routing boundary,
    // not a substitute for navigation-flow coverage.
    await page.goto('/en/presets');
    await expect(page).toHaveURL('/en');
  });

  test('admin user sees presets navigation, creates a preset, and applies it to dictionary', async ({ page }, testInfo) => {
    test.setTimeout(90000);

    const adminUsername = `admin_${Date.now()}_${testInfo.workerIndex}`;
    await register(page, adminUsername, { name: 'Spanish Learner', targetLanguage: 'es', baseLanguage: 'en' });
    await login(page, adminUsername);

    // Verify "Presets" is visible in sidebar for admin
    const presetsNav = page.locator('nav').getByText('Presets');
    await expect(presetsNav).toBeVisible();

    // Navigate to Presets page
    await presetsNav.click();
    await expect(page).toHaveURL('/en/presets');
    await expect(page.getByText('Presets Catalog')).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL('/en/presets');
    await expect(page.getByText('Presets Catalog')).toBeVisible();

    // Open Create Preset modal
    await page.getByRole('button', { name: 'Create Preset' }).first().click();
    await expect(page.getByText('Create New Preset')).toBeVisible();

    // Fill form
    const presetTitle = `Spanish Pack ${Date.now()}`;
    await page.getByPlaceholder('e.g. 50 Essential Spanish Verbs').fill(presetTitle);

    // Submit new preset
    const submitBtn = page.getByRole('button', { name: 'Create Preset', exact: true });
    await submitBtn.click();

    // Wait for card to appear
    const presetCard = page.locator('.MuiCard-root').filter({ hasText: presetTitle });
    await expect(presetCard).toBeVisible();

    // Verify "Apply to Dict" button is NOT present on Presets card
    await expect(presetCard.getByRole('button', { name: 'Apply to Dict' })).not.toBeVisible();

    // Navigate to dictionary to verify that the preset is listed under Available Presets and can be applied
    await page.locator('nav').getByText('Dictionary').click();
    await expect(page.getByRole('heading', { name: 'Spanish Learner', exact: true })).toBeVisible();

    const presetsSection = page.getByTestId('dictionary-presets-section');
    await expect(presetsSection).toBeVisible();
    const presetItem = presetsSection.locator('.MuiCard-root').filter({ hasText: presetTitle });
    await expect(presetItem).toBeVisible();

    // Apply preset to dictionary from the dictionary page
    await presetItem.getByRole('button', { name: 'Add to Dictionary' }).click();
    await expect(page.locator('text=Added "').first()).toBeVisible();

    // The default template contains the word "hola"
    await expect(page.locator('.MuiAccordion-root').filter({ hasText: 'hola' })).toBeVisible();
  });

});
