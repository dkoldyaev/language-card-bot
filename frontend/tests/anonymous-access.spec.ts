import { test, expect } from '@playwright/test';
import { register, login } from './helpers';

test.describe('Anonymous (Guest) Access Flow', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[PAGE ERROR LOG]: ${msg.text()}`);
      }
    });
    page.on('pageerror', (error) => console.log(`[PAGE ERROR]: ${error.message}`));
  });

  test('full guest journey: onboarding, presets, local quiz, second visit persistence, and account migration', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90000);

    // 1. Visit root with empty storage as first-time guest
    await page.goto('/');

    // Verify Guest Onboarding Dialog opens
    const onboardingDialog = page.locator('[data-testid="guest-onboarding-dialog"]');
    await expect(onboardingDialog).toBeVisible({ timeout: 10000 });
    await expect(onboardingDialog).toContainText('Welcome to CardBot');

    // Step 1: Click "Next" to go to preset selection
    const nextBtn = page.locator('[data-testid="guest-onboarding-next-btn"]');
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Step 2: Presets should be loaded and displayed
    const presetCards = page.locator('[data-testid^="preset-card-"]');
    await expect(presetCards.first()).toBeVisible({ timeout: 10000 });

    // Click to select the first preset
    await presetCards.first().click();

    // Click finish button to start learning
    const finishBtn = page.locator('[data-testid="guest-onboarding-finish-btn"]');
    await expect(finishBtn).toBeEnabled();
    await finishBtn.click();

    // Onboarding modal should close
    await expect(onboardingDialog).toBeHidden({ timeout: 5000 });

    // Guest banner should be visible
    const guestBanner = page.locator('[data-testid="guest-banner"]');
    await expect(guestBanner).toBeVisible();
    await expect(guestBanner).toContainText(/guest mode/i);

    // Verify words are stored in localStorage
    const storageStr = await page.evaluate(() => localStorage.getItem('english-card-bot-storage'));
    expect(storageStr).toBeTruthy();
    const parsedState = JSON.parse(storageStr!).state;
    expect(parsedState.dictionaries.length).toBeGreaterThan(0);
    expect(parsedState.dictionary.length).toBeGreaterThan(0);
    const initialWordCount = parsedState.dictionary.length;

    // 2. Second visit persistence: reload page
    await page.reload();

    // Modal must NOT re-open on second visit
    await expect(onboardingDialog).toBeHidden();
    await expect(guestBanner).toBeVisible();

    // 3. Quiz practice in guest mode
    await page.goto('/quiz');
    await expect(page).toHaveURL('/quiz');

    // Quiz heading or start button should appear
    await expect(async () => {
      const heading = page.locator('h1:has-text("Quiz"), h4:has-text("Quiz")');
      if (await heading.isVisible()) return;
      const startBtn = page.locator('button:has-text("Start Quiz")');
      if (await startBtn.isVisible()) {
        await startBtn.click();
      }
      await expect(heading).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 15000 });

    // Interact with quiz card
    const cardContent = page.locator('.MuiCardContent-root').first();
    await expect(cardContent).toBeVisible();

    const answerInput = page.getByLabel(/Your answer/i);
    const submitBtn = page.locator('button[type="submit"]');

    if (await answerInput.isVisible()) {
      await answerInput.fill('testword');
      await submitBtn.click();
    } else {
      const variantBtn = page.locator('button[data-testid^="variant-btn-"]').first();
      if (await variantBtn.isVisible()) {
        await variantBtn.click();
      }
    }

    // Check that guest attempt was recorded in localStorage
    await expect.poll(async () => {
      const updatedStorage = await page.evaluate(() => localStorage.getItem('english-card-bot-storage'));
      const updatedState = updatedStorage ? JSON.parse(updatedStorage).state : null;
      return updatedState?.guestQuizAttempts?.length ?? 0;
    }, { timeout: 10000 }).toBeGreaterThanOrEqual(1);

    // Navigate to dashboard and verify it displays guest stats smoothly
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(guestBanner).toBeVisible();

    // 4. Registration and automatic migration
    const timestamp = Date.now();
    const newUsername = `guest_mig_${timestamp}_${testInfo.workerIndex}`;

    await register(page, newUsername, 'en', 'es');
    await login(page, newUsername);

    // Guest banner should now be gone because user is logged in
    await expect(guestBanner).toBeHidden();

    // Verify user profile is active
    const postAuthStorage = await page.evaluate(() => localStorage.getItem('english-card-bot-storage'));
    const postAuthState = JSON.parse(postAuthStorage!).state;
    expect(postAuthState.token).toBeTruthy();
    expect(postAuthState.profile.username).toEqual(newUsername);

    // Check that dictionary page has words
    await page.goto('/dictionary');
    const presetDictBtn = page.locator('button').filter({ hasText: /Preset ES/i }).first();
    if (await presetDictBtn.isVisible()) {
      await presetDictBtn.click();
    }
    await expect(page.locator('.MuiAccordion-root').first()).toBeVisible({ timeout: 10000 });

    // 5. Existing account login & merge confirmation dialog
    // Sign out
    const signOutBtn = page.locator('button, [role="button"]').filter({ hasText: /Sign out|Logout/i }).first();
    await signOutBtn.click();
    await expect(page).toHaveURL('/');
    await expect(onboardingDialog).toBeVisible({ timeout: 10000 });

    // Pick another preset as a new guest session
    await nextBtn.click();
    await expect(presetCards.first()).toBeVisible({ timeout: 10000 });
    await presetCards.first().click();
    await expect(finishBtn).toBeEnabled();
    await finishBtn.click();
    await expect(onboardingDialog).toBeHidden();
    await expect(guestBanner).toBeVisible();

    // Now navigate to login to log into existing user
    await page.goto('/login');
    await page.getByLabel(/Username|Login/i).fill(newUsername);
    await page.click('button:has-text("Log in")');

    // Merge confirmation dialog must appear!
    const mergeDialog = page.locator('[data-testid="merge-guest-dialog"]');
    await expect(mergeDialog).toBeVisible({ timeout: 10000 });

    // Click "Merge data"
    const confirmMergeBtn = page.locator('[data-testid="merge-guest-confirm-btn"]');
    await expect(confirmMergeBtn).toBeVisible();
    await confirmMergeBtn.click();

    // Successfully navigated to dashboard
    await expect(page).toHaveURL('/');
    await expect(guestBanner).toBeHidden();
  });
});
