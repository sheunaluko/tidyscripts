import { test, expect } from '@playwright/test';

test.describe('Meditation App - Basic Test', () => {
  test('should load meditation page', async ({ page }) => {
    // Navigate to meditation page
    await page.goto('/laboratory/meditation');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for header
    await expect(page.locator('h1')).toContainText('Meditation');

    // Check for tabs
    await expect(page.locator('text=Event Generator')).toBeVisible();
    await expect(page.locator('text=Event Monitor')).toBeVisible();
    await expect(page.locator('text=Reflections Explorer')).toBeVisible();

    console.log('✓ Meditation page loaded successfully');
  });

  test('should switch to Reflections Explorer tab', async ({ page }) => {
    await page.goto('/laboratory/meditation');
    await page.waitForLoadState('networkidle');

    // Click Reflections Explorer tab
    await page.click('text=Reflections Explorer');

    // Wait a bit for tab to switch
    await page.waitForTimeout(500);

    // Check for Reflections Explorer content
    await expect(page.locator('text=Core Query Methods')).toBeVisible();

    console.log('✓ Reflections Explorer tab works');
  });
});
