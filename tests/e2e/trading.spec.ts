import { test, expect } from '@playwright/test';

test.describe('Trading Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the trading page before each test
    await page.goto('/trading');
  });

  test('should display trading interface', async ({ page }) => {
    // Check if essential trading elements are visible
    await expect(page.getByRole('heading', { name: 'Trading' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Place Order' })).toBeVisible();
  });

  test('should be able to submit a buy order', async ({ page }) => {
    // Fill in order details
    await page.getByLabel('Symbol').fill('SOL/USDC');
    await page.getByLabel('Price').fill('100');
    await page.getByLabel('Amount').fill('1');
    await page.getByRole('button', { name: 'Buy' }).click();

    // Check for success message
    await expect(page.getByText('Order placed successfully')).toBeVisible();
  });

  test('should show error for invalid order', async ({ page }) => {
    // Submit invalid order
    await page.getByLabel('Symbol').fill('INVALID');
    await page.getByRole('button', { name: 'Buy' }).click();

    // Check for error message
    await expect(page.getByText('Invalid trading pair')).toBeVisible();
  });
}); 