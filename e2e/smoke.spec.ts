import { expect, test } from '@playwright/test';

test('home page shows the app name', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'fomodoro' })).toBeVisible();
});

test('page links a web app manifest', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    /manifest\.webmanifest$/,
  );
});
