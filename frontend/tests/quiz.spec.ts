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

    // 3. Test Translate Definition
    await page.click('button:has-text("Translate definition")');
    await expect(page.locator('text=Translation: [MOCK: ru -> en] [Mock] Definition')).toBeVisible();

    // 4. Test Another Definition
    const currentDefText = await cardContent.innerText();
    await page.click('button:has-text("Another definition")');
    
    // Wait for the definition to change
    await expect(async () => {
      const newDefText = await cardContent.innerText();
      expect(newDefText).not.toEqual(currentDefText);
      expect(newDefText).toContain('[Mock] Definition');
    }).toPass({ timeout: 5000 });

    // 5. Test Correct Answer
    await answerInput.fill('apple');
    await submitBtn.click();
    await expect(page.locator('text=Success! 🎉')).toBeVisible();
    await expect(page.locator('text=Your answer: apple')).toBeVisible();
    await expect(page.locator('text=Success! 🎉')).toBeHidden({ timeout: 5000 });
  });

  test('should go to the next card in case of success answer', async ({ page }) => {
    // Add a word first so the quiz has content
    await addWordsToDictionary(page, ['apple', 'banana']);

    // Ensure the words have definitions by checking Dictionary Edit
    await expect(async () => {
      await page.goto('/dictionary/edit');
      
      const appleAccordion = page.locator('.MuiAccordion-root').filter({ hasText: 'apple' });
      await expect(appleAccordion).toBeVisible();
      await expect(appleAccordion.locator('text=2 definition(s)')).toBeVisible();

      const bananaAccordion = page.locator('.MuiAccordion-root').filter({ hasText: 'banana' });
      await expect(bananaAccordion).toBeVisible();
      await expect(bananaAccordion.locator('text=2 definition(s)')).toBeVisible();
    }).toPass({ timeout: 15000 });

    await page.goto('/quiz');
    await expect(page.locator('text=Ready to test your vocabulary?')).toBeVisible({ timeout: 15000 });
    await page.click('button:has-text("Start Quiz")');
    
    // Expect the quiz UI to show up
    await expect(page.locator('h4:has-text("Quiz")')).toBeVisible({ timeout: 5000 });
    
    const cardContent = page.locator('.MuiCardContent-root');
    await expect(cardContent).toContainText('[Mock] Definition');
    const initialDefText = await cardContent.innerText();
    let currentWord = 'apple';
    let nextWord = 'banana';
    
    if (initialDefText.includes('for banana')) {
      currentWord = 'banana';
      nextWord = 'apple';
    }

    await expect(cardContent).toContainText(`for ${currentWord} in ru`);

    const answerInput = page.getByLabel(/Your answer/i);
    const submitBtn = page.locator('button:has-text("Submit")');

    // Test Correct Answer
    await answerInput.fill(currentWord);
    await submitBtn.click();
    await expect(page.locator('text=Success! 🎉')).toBeVisible();
    await expect(page.locator(`text=Your answer: ${currentWord}`)).toBeVisible();
    await expect(page.locator('text=Success! 🎉')).toBeHidden({ timeout: 5000 });

    // Verify it switched to the next word
    await expect(cardContent).toContainText(`for ${nextWord} in ru`, { timeout: 5000 });
  });

});
