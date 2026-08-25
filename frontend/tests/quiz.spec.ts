import { test, expect, Page } from '@playwright/test';

// Helper to authenticate
async function authenticate(page: Page, username: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  // Toggle to register mode if needed
  if (await page.locator('button', { hasText: 'Need an account? Register' }).isVisible()) {
    await page.click('button:has-text("Need an account? Register")');
  }

  await page.getByLabel('Username').fill(username);
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Welcome to English Card Bot')).toBeVisible({ timeout: 10000 });
}

test.describe.skip('Quiz Operations', () => {
  const username = `testuser_quiz_${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    await authenticate(page, username);

    // Add a few words to make sure quiz has data
    await page.click('text=Add Words');
    await page.fill('textarea', 'hello\\nworld');
    await page.click('button:has-text("Add Words")');
    await expect(page.locator(`li:has-text("hello"):has-text("processed")`)).toBeVisible({ timeout: 25000 });
    await expect(page.locator(`li:has-text("world"):has-text("processed")`)).toBeVisible({ timeout: 25000 });
  });

  // test('should take a quiz using added words', async ({ page }) => {
  //   // Navigate to Quiz
  //   await page.click('text=Quiz');
  //   await expect(page.locator('text=Ready to test your vocabulary?')).toBeVisible();

  //   // Start Quiz
  //   await page.click('button:has-text("Start Quiz")');
    
  //   // Expect Quiz card
  //   await expect(page.locator('h4:has-text("Quiz")')).toBeVisible({ timeout: 10000 });
    
  //   // Check if translation is hidden by default
  //   await expect(page.locator('text=Translation:')).not.toBeVisible();

  //   // Click "Translate definition"
  //   await page.click('button:has-text("Translate definition")');
  //   // Translation text should appear
  //   await expect(page.locator('text=Translation:')).toBeVisible();

  //   // Fill a suggestion
  //   await page.fill('label:has-text("Your answer")', 'world'); // We just guess 'world' for whichever word came up
  //   await page.click('button:has-text("Submit")');
    
  //   // Expect evaluation chip (Success, Close Match, or Incorrect)
  //   // Since we guessed 'world', it might be Success or Incorrect depending on what came up.
  //   // The UI renders a Chip with label Success! 🎉, Close Match 🤔, or Incorrect 😢
  //   const hasResult = await page.locator('text=Success! 🎉').isVisible() 
  //     || await page.locator('text=Incorrect 😢').isVisible() 
  //     || await page.locator('text=Close Match 🤔').isVisible();
    
  //   expect(hasResult).toBe(true);

  //   // Try clicking variants
  //   await page.click('button:has-text("Show variants")');
  //   await expect(page.locator('h6:has-text("Variants:")')).toBeVisible();

  //   // Click next definition
  //   await page.click('button:has-text("Another definition")');
  //   // Should get another definition. It might be hard to test if it actually changes without storing state, but we can verify it doesn't crash.
  //   await expect(page.locator('h4:has-text("Quiz")')).toBeVisible();

  //   // Click next card
  //   await page.click('button:has-text("Next card")');
  //   await expect(page.locator('h4:has-text("Quiz")')).toBeVisible();
  // });
});
