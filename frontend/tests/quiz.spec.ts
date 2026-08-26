import { test, expect } from '@playwright/test';
import { register, login, addWordsToDictionary, setupSettings } from './helpers';

test.describe('Quiz Operations', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[PAGE ERROR LOG]: ${msg.text()}`);
      }
    });
    page.on('pageerror', error => console.log(`[PAGE ERROR]: ${error.message}`));

    const username = `testuser_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    // We register and then login the user for each test
    await register(page, username);
    await login(page, username);
    // Set up default settings so worker processes jobs correctly
    await setupSettings(page);
  });

  test('should navigate to Quiz and click Start Quiz', async ({ page }) => {
    // Add a word first so the quiz has content
    await addWordsToDictionary(page, ['apple']);

    await page.goto('/quiz');
    await expect(page.locator('text=Ready to test your vocabulary?')).toBeVisible({ timeout: 15000 });
    await page.click('button:has-text("Start Quiz")');
    
    // Expect the quiz UI to show up
    await expect(page.locator('h4:has-text("Quiz")')).toBeVisible({ timeout: 5000 });
    
    const cardContent = page.locator('.MuiCardContent-root');
    await expect(cardContent).toContainText('[Mock] Definition');
    await expect(cardContent).toContainText('for apple in ru');

    const answerInput = page.getByLabel(/Your answer/i);
    const submitBtn = page.locator('button:has-text("Submit")');

    // 1. Test Incorrect Answer
    await answerInput.fill('banana');
    await submitBtn.click();
    await expect(page.locator('text=Incorrect 😢')).toBeVisible();
    await expect(page.locator('text=Your answer: banana')).toBeVisible();

    // 2. Test Typo (Close Match)
    await answerInput.fill('aple');
    await submitBtn.click();
    await expect(page.locator('text=Close Match 🤔')).toBeVisible();
    await expect(page.locator('text=Your answer: aple')).toBeVisible();

    // 3. Test Correct Answer
    await answerInput.fill('apple');
    await submitBtn.click();
    await expect(page.locator('text=Success! 🎉')).toBeVisible();
    await expect(page.locator('text=Your answer: apple')).toBeVisible();

    // 4. Test Translate Definition
    await page.click('button:has-text("Translate definition")');
    await expect(page.locator('text=Translation: [MOCK: ru -> en] [Mock] Definition')).toBeVisible();

    // 5. Test Show Variants (Hints)
    await page.click('button:has-text("Show variants")');
    await expect(page.locator('h6:has-text("Variants:")')).toBeVisible();
    // Click the correct variant
    await page.getByRole('button', { name: /apple/i }).click();
    // Clicking the variant directly submits it to the API, UI updates to Success
    await expect(page.locator('text=Success! 🎉')).toBeVisible();
    
    // 6. Test Another Definition
    const currentDefText = await cardContent.innerText();
    await page.click('button:has-text("Another definition")');
    
    // Wait for the definition to change
    await expect(async () => {
      const newDefText = await cardContent.innerText();
      expect(newDefText).not.toEqual(currentDefText);
      expect(newDefText).toContain('[Mock] Definition');
    }).toPass({ timeout: 5000 });
  });

});
