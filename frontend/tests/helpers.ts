import { Page, expect } from '@playwright/test';

export async function register(page: Page, username: string) {
  await page.goto('/register');
  await expect(page.locator('button:has-text("Create account")')).toBeVisible();
  await page.getByLabel(/Username|Login/i).fill(username);
  await page.click('button:has-text("Create account")');
  await expect(page.locator('text=Registration successful')).toBeVisible({ timeout: 5000 });
  await page.click('a:has-text("Back to login")');
  await expect(page).toHaveURL(/.*\/login/);
}

export async function login(page: Page, username: string) {
  await page.goto('/login');
  await expect(page.locator('h4:has-text("Log in"), h5:has-text("Log in")').first()).toBeVisible();
  await page.getByLabel(/Username|Login/i).fill(username);
  await page.click('button:has-text("Log in")');
  await expect(page).toHaveURL(/.*\/$/);
  await expect(page.locator('text=Welcome to English Card Bot')).toBeVisible({ timeout: 10000 });
}
