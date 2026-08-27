import { test, expect } from '@playwright/test';
import { register, login, addWordsAndAwaitDefinitions, setupSettings } from './helpers';

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
  });

  test('should navigate to Quiz and click Start Quiz', async ({ page }) => {
    // Add a word first so the quiz has content
    await addWordsAndAwaitDefinitions(page, ['apple']);

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
    await addWordsAndAwaitDefinitions(page, ['apple', 'banana']);

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
    await expect(answerInput).toBeEmpty();
    await expect(submitBtn).toBeDisabled();
  });

  test('should show variants and handle correct/incorrect clicks', async ({ page }) => {
    // Add words so we have variants
    await addWordsAndAwaitDefinitions(page, ['apple', 'banana', 'cherry']);

    await page.goto('/quiz');
    await expect(page.locator('text=Ready to test your vocabulary?')).toBeVisible({ timeout: 15000 });
    await page.click('button:has-text("Start Quiz")');
    
    // Expect the quiz UI to show up
    await expect(page.locator('h4:has-text("Quiz")')).toBeVisible({ timeout: 5000 });
    
    const cardContent = page.locator('.MuiCardContent-root');
    await expect(cardContent).toContainText('[Mock] Definition');

    const initialDefText = await cardContent.innerText();
    
    // Determine the current word from the mock definition text
    let currentWord = '';
    const words = ['apple', 'banana', 'cherry'];
    for (const w of words) {
        if (initialDefText.includes(`for ${w} in ru`)) {
            currentWord = w;
            break;
        }
    }
    
    expect(currentWord).not.toBe('');

    // Click 'Show variants'
    await page.click('button:has-text("Show variants")');

    // Check variants appear
    await expect(page.locator('h6:has-text("Variants:")')).toBeVisible();

    // Check there are variant buttons
    const variantButtons = page.locator('.MuiButton-colorSecondary');
    
    // There should be 3 variants total since we added 3 words
    await expect(variantButtons).toHaveCount(3);

    const correctVariantBtn = variantButtons.filter({ hasText: currentWord });
    const answerInput = page.getByLabel(/Your answer/i);
    const submitBtn = page.locator('button:has-text("Submit")');
    
    // Click an incorrect variant
    const totalVariants = await variantButtons.count();
    let incorrectVariantIdx = 0;
    for (let i = 0; i < totalVariants; i++) {
        const text = await variantButtons.nth(i).innerText();
        if (text.toLowerCase() !== currentWord.toLowerCase()) {
            incorrectVariantIdx = i;
            break;
        }
    }

    await variantButtons.nth(incorrectVariantIdx).click();
    
    // Incorrect answer shows Incorrect message
    await expect(page.locator('text=Incorrect 😢')).toBeVisible();

    // Now click the correct variant
    await correctVariantBtn.click();
    await expect(page.locator('text=Success! 🎉')).toBeVisible();
    
    // Wait for auto-advance to next card (2000ms delay in component)
    await expect(cardContent).not.toContainText(`for ${currentWord} in ru`, { timeout: 5000 });
    await expect(answerInput).toBeEmpty();
    await expect(submitBtn).toBeDisabled();
  });

});
