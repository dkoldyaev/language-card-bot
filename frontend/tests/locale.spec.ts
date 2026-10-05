import { test, expect } from '@playwright/test';

test.describe('Locale and Routing logic', () => {
  test.use({ locale: 'ru-RU' });

  test('should use browser locale (ru) when visiting root', async ({ page }) => {
    await page.goto('/');
    // Check that we are redirected to /ru
    await expect(page).toHaveURL('/ru');

    await expect(page.locator('text=Добро пожаловать.').first()).toBeVisible({ timeout: 5000 });
  });

  test('should persist locale when navigating', async ({ page }) => {
    // Visit root -> redirects to /ru
    await page.goto('/');
    await expect(page).toHaveURL('/ru');

    await page.getByTestId('sidebar-login-btn').click();
    await expect(page).toHaveURL('/ru/login');
    await page.getByRole('link', { name: 'Зарегистрироваться' }).click();
    await expect(page).toHaveURL('/ru/register');
    await expect(page.getByRole('heading', { name: 'Создать аккаунт' })).toBeVisible();

    await page.getByRole('link', { name: 'Уже есть аккаунт? Войти' }).click();
    await expect(page).toHaveURL('/ru/login');
    await expect(page.getByRole('heading', { name: 'Войти' })).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL('/ru/login');
    await expect(page.getByRole('heading', { name: 'Войти' })).toBeVisible();
  });

  test('should fallback to default locale (en) if browser locale is unsupported', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'nl-NL' });
    const page = await context.newPage();

    await page.goto('/');
    await expect(page).toHaveURL('/en');
    await expect(page.locator('text=Welcome.').first()).toBeVisible();
    await context.close();
  });

  test('should respect url locale and set cookie over browser locale', async ({ page }) => {
    // Even though browser is 'ru-RU', visiting '/en' should force English
    await page.goto('/en');
    await expect(page).toHaveURL('/en');
    await expect(page.locator('text=Welcome.').first()).toBeVisible();

    // Now visit root again, it should redirect to '/en' because cookie is set
    await page.goto('/');
    await expect(page).toHaveURL('/en');
    await expect(page.locator('text=Welcome.').first()).toBeVisible();
  });
});
