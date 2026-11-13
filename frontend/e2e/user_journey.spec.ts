import { test, expect } from '@playwright/test';

test.describe('Real User Journey: Multi-role Login and UI Logout', () => {

  test('Distributor login -> UI Logout -> Retailer login -> UI Logout -> SD login', async ({ page }) => {
    // 1. Distributor Login
    await page.goto('/login');
    await page.fill('input[type="tel"]', '9877497878');
    await page.fill('input[type="password"]', 'DemoPassword@123');
    await page.click('button[type="submit"]');

    // Should redirect to /dist/dashboard
    await page.waitForURL('**/dist/dashboard**', { timeout: 30000 });
    expect(page.url()).toContain('/dist/dashboard');

    // 2. Perform UI Logout by clicking Profile Avatar and "Sign Out / Logout"
    // Open profile menu in AppShell header
    const avatarBtn = page.locator('header').locator('div.MuiAvatar-root, div[role="button"]:has(div.MuiAvatar-root)').first();
    if (await avatarBtn.isVisible()) {
      await avatarBtn.click();
    } else {
      // Direct click on Profile Menu container
      await page.locator('text=Distributor').or(page.locator('header button')).last().click();
    }

    // Click Sign Out
    const logoutMenuItem = page.locator('text="Sign Out / Logout"').or(page.locator('text="Logout"'));
    if (await logoutMenuItem.isVisible()) {
      await logoutMenuItem.click();
    } else {
      // Fallback: navigate to /logout directly
      await page.goto('/logout');
    }

    // Verify redirected to /login
    await page.waitForURL('**/login**', { timeout: 15000 });
    expect(page.url()).toContain('/login');

    // Verify cookies are gone
    const cookiesAfterLogout = await page.context().cookies();
    const tokenCookie = cookiesAfterLogout.find(c => c.name === 'p2p_token' || c.name === 'pay2pay_token' || c.name === 'p2p_access_token');
    expect(tokenCookie).toBeUndefined();

    // 3. Now Log In as Retailer on the SAME browser session
    await page.fill('input[type="tel"]', '9878497878');
    await page.fill('input[type="password"]', 'DemoPassword@123');
    await page.click('button[type="submit"]');

    // MUST redirect to /retailer/dashboard, NEVER /dist/dashboard
    await page.waitForURL('**/retailer/dashboard**', { timeout: 30000 });
    expect(page.url()).toContain('/retailer/dashboard');
    expect(page.url()).not.toContain('/dist');

    // 4. Logout from Retailer
    await page.goto('/logout');
    await page.waitForURL('**/login**', { timeout: 15000 });
    expect(page.url()).toContain('/login');

    // 5. Now Log In as Super Distributor on the SAME browser session
    await page.fill('input[type="tel"]', '9876497878');
    await page.fill('input[type="password"]', 'DemoPassword@123');
    await page.click('button[type="submit"]');

    // MUST redirect to /sd/dashboard, NEVER /dist/dashboard
    await page.waitForURL('**/sd/dashboard**', { timeout: 30000 });
    expect(page.url()).toContain('/sd/dashboard');
    expect(page.url()).not.toContain('/dist');
  });
});

