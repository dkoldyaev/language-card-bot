import { test, expect, Page } from '@playwright/test';

// Helper to authenticate
async function authenticate(page: Page, username: string) {
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('requestfailed', request => console.log('FAILED:', request.url(), request.failure()?.errorText));
  page.on('response', response => console.log('RESPONSE:', response.url(), response.status()));

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  
  // Toggle to register mode if needed
  if (await page.locator('button', { hasText: 'Need an account? Register' }).isVisible()) {
    await page.click('button:has-text("Need an account? Register")');
  }

  await page.getByLabel('Username').fill(username);
  await page.click('button[type="submit"]');
  // Wait for redirect to home
  await expect(page.locator('text=Welcome to English Card Bot')).toBeVisible({ timeout: 10000 });
}

test.describe.skip('Dictionary Operations', () => {
  const username = `testuser_dict_${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    await authenticate(page, username);
  });

  // test('should add 10 words, edit dictionary, and test duplicate/new logic', async ({ page }) => {
  //   test.setTimeout(120000); // 2 minutes since adding 10 words takes time to process

  //   // 1. Add 10 words
  //   await page.click('text=Add Words');
  //   await expect(page.locator('h4:has-text("Add Words")')).toBeVisible();

  //   const words = ['apple', 'banana', 'orange', 'grape', 'mango', 'kiwi', 'pear', 'peach', 'plum', 'cherry'];
  //   await page.fill('textarea', words.join('\\n'));
  //   await page.click('button:has-text("Add Words")');

  //   // Wait for all to be processed. 
  //   // The UI displays status strings, usually "<word> - processed".
  //   for (const word of words) {
  //     await expect(page.locator(`li:has-text("${word}"):has-text("processed")`)).toBeVisible({ timeout: 25000 });
  //   }

  //   // 2. Edit Dictionary - Verify they are present
  //   await page.click('text=Edit Dictionary');
  //   await expect(page.locator('h4:has-text("Edit Dictionary")')).toBeVisible();

  //   for (const word of words) {
  //     await expect(page.locator(`text=${word}`).first()).toBeVisible();
  //   }

  //   // 3. Test deleting a word (apple)
  //   // Click on the accordion for apple to make sure it's focused, then click delete
  //   const appleItem = page.locator('.MuiAccordion-root').filter({ hasText: 'apple' }).first();
  //   // In DictionaryEdit.tsx: <IconButton aria-label={`Delete ${word.text}`}>
  //   page.on('dialog', dialog => dialog.accept()); // Accept confirm dialog
  //   await appleItem.locator('button[aria-label="Delete apple"]').click();
    
  //   // Verify it disappears
  //   await expect(page.locator('text=apple').first()).not.toBeVisible();

  //   // 4. Test editing a definition (for banana)
  //   const bananaItem = page.locator('.MuiAccordion-root').filter({ hasText: 'banana' }).first();
  //   await bananaItem.click(); // Expand accordion
    
  //   // Click edit definition
  //   await bananaItem.locator('button[aria-label="Edit definition"]').first().click();
  //   await bananaItem.locator('input[type="text"]').first().fill('A yellow fruit');
  //   await bananaItem.locator('button:has-text("Save")').click();
    
  //   // Verify definition updated
  //   await expect(bananaItem.locator('text=A yellow fruit')).toBeVisible();

  //   // 5. Test editing translation
  //   // Wait for "Add Translation" or "Edit translation"
  //   if (await bananaItem.locator('button:has-text("Add Translation")').isVisible()) {
  //     await bananaItem.locator('button:has-text("Add Translation")').click();
  //   } else {
  //     await bananaItem.locator('button[aria-label="Edit translation"]').first().click();
  //   }
  //   await bananaItem.locator('input[type="text"]').first().fill('Желтый фрукт');
  //   await bananaItem.locator('button:has-text("Save")').click();
    
  //   // Verify translation updated
  //   await expect(bananaItem.locator('text=Translation: Желтый фрукт')).toBeVisible();

  //   // 6. Test deleting definition
  //   await bananaItem.locator('button[aria-label="Delete definition"]').first().click();
  //   // Because dialog auto-accepts, it should disappear
  //   await expect(bananaItem.locator('text=A yellow fruit')).not.toBeVisible();

  //   // 7. Duplicate add logic
  //   await page.click('text=Add Words');
  //   await expect(page.locator('h4:has-text("Add New Words")')).toBeVisible();
    
  //   // Add existing word
  //   await page.fill('textarea', 'banana');
  //   await page.click('button:has-text("Add Words")');
  //   await expect(page.locator(`li:has-text("banana"):has-text("duplicate")`)).toBeVisible({ timeout: 15000 });

  //   // 8. Add a new word
  //   await page.fill('textarea', 'strawberry');
  //   await page.click('button:has-text("Add Words")');
  //   await expect(page.locator(`li:has-text("strawberry"):has-text("processed")`)).toBeVisible({ timeout: 15000 });

  //   // 9. Add previously deleted word (apple)
  //   await page.fill('textarea', 'apple');
  //   await page.click('button:has-text("Add Words")');
  //   await expect(page.locator(`li:has-text("apple"):has-text("processed")`)).toBeVisible({ timeout: 15000 });
  // });
});
