import { test, expect } from '@playwright/test';

// Credentials for verified live test accounts:
const ACCOUNTS = {
  RETAILER: {
    mobile: '9878497878',
    password: 'DemoPassword@123',
    role: 'RETAILER',
    userTypeRefId: 2,
    dashboardUrl: '/retailer/dashboard',
  },
  DISTRIBUTOR: {
    mobile: '9877497878',
    password: 'DemoPassword@123',
    role: 'DIST',
    userTypeRefId: 3,
    dashboardUrl: '/dist/dashboard',
  },
  SUPER_DISTRIBUTOR: {
    mobile: '9876497878',
    password: 'DemoPassword@123',
    role: 'SD',
    userTypeRefId: 4,
    dashboardUrl: '/sd/dashboard',
  },
};

test.describe('P0 Dynamic Role-Based Login & Dashboard Routing', () => {

  test('Unauthenticated user accessing protected dashboard is redirected to /login', async ({ page }) => {
    // Attempting direct access to any protected dashboard while not logged in
    await page.goto('/retailer/dashboard');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/dist/dashboard');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/sd/dashboard');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Retailer authentication via /login redirects to Retailer dashboard', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await expect(page.locator('input[type="tel"]')).toBeVisible();

    await page.fill('input[type="tel"]', ACCOUNTS.RETAILER.mobile);
    await page.fill('input[type="password"]', ACCOUNTS.RETAILER.password);
    await page.click('button[type="submit"]');

    // Expected redirection to /retailer/dashboard
    await page.waitForURL('**/retailer/dashboard**', { timeout: 20000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/retailer/dashboard');

    // Verify session cookies set correctly
    const cookies = await context.cookies();
    const userTypeCookie = cookies.find(c => c.name === 'p2p_user_type_ref_id');
    const roleCookie = cookies.find(c => c.name === 'p2p_user_role');
    expect(userTypeCookie?.value).toBe('2');
    expect(roleCookie?.value).toBe('RETAILER');

    // Test: Retailer page refresh -> Retailer dashboard remains
    await page.reload({ waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/retailer/dashboard');

    // Test: Unauthorized dashboard access -> Retailer accessing /dist/dashboard, /sd/dashboard, or /admin/dashboard is redirected to authorized dashboard
    await page.goto('/dist/dashboard');
    await page.waitForURL('**/retailer/dashboard**', { timeout: 15000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/retailer/dashboard');

    await page.goto('/sd/dashboard');
    await page.waitForURL('**/retailer/dashboard**', { timeout: 15000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/retailer/dashboard');

    await page.goto('/admin/dashboard');
    await page.waitForURL('**/retailer/dashboard**', { timeout: 15000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/retailer/dashboard');

    // Issue C Verification: Authenticated dashboard does NOT contain public marketing header
    const publicMarketingNav = page.locator('header nav:has-text("Products"), header nav:has-text("Pricing"), header:has-text("Near4Pay")');
    await expect(publicMarketingNav).not.toBeVisible();
  });

  test('Distributor authentication via /login redirects to Distributor dashboard', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await expect(page.locator('input[type="tel"]')).toBeVisible();

    await page.fill('input[type="tel"]', ACCOUNTS.DISTRIBUTOR.mobile);
    await page.fill('input[type="password"]', ACCOUNTS.DISTRIBUTOR.password);
    await page.click('button[type="submit"]');

    // Expected redirection to /dist/dashboard
    await page.waitForURL('**/dist/dashboard**', { timeout: 20000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/dist/dashboard');

    // Verify session cookies
    const cookies = await context.cookies();
    const userTypeCookie = cookies.find(c => c.name === 'p2p_user_type_ref_id');
    const roleCookie = cookies.find(c => c.name === 'p2p_user_role');
    expect(userTypeCookie?.value).toBe('3');
    expect(roleCookie?.value).toBe('DIST');

    // Test: Distributor page refresh -> Distributor dashboard remains
    await page.reload({ waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/dist/dashboard');

    // Test: Unauthorized dashboard access -> Distributor accessing /sd/dashboard or /admin/dashboard is redirected to /dist/dashboard
    await page.goto('/sd/dashboard');
    await page.waitForURL('**/dist/dashboard**', { timeout: 15000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/dist/dashboard');

    await page.goto('/admin/dashboard');
    await page.waitForURL('**/dist/dashboard**', { timeout: 15000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/dist/dashboard');

    // Issue C Verification: No public marketing header
    const publicMarketingNav = page.locator('header nav:has-text("Products"), header nav:has-text("Pricing"), header:has-text("Near4Pay")');
    await expect(publicMarketingNav).not.toBeVisible();
  });

  test('Super Distributor authentication via /login redirects to Super Distributor dashboard', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await expect(page.locator('input[type="tel"]')).toBeVisible();

    await page.fill('input[type="tel"]', ACCOUNTS.SUPER_DISTRIBUTOR.mobile);
    await page.fill('input[type="password"]', ACCOUNTS.SUPER_DISTRIBUTOR.password);
    await page.click('button[type="submit"]');

    // Expected redirection to /sd/dashboard
    await page.waitForURL('**/sd/dashboard**', { timeout: 20000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/sd/dashboard');

    // Verify session cookies
    const cookies = await context.cookies();
    const userTypeCookie = cookies.find(c => c.name === 'p2p_user_type_ref_id');
    const roleCookie = cookies.find(c => c.name === 'p2p_user_role');
    expect(userTypeCookie?.value).toBe('4');
    expect(roleCookie?.value).toBe('SD');

    // Test: SD page refresh -> SD dashboard remains
    await page.reload({ waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/sd/dashboard');

    // Test: Unauthorized higher administration -> SD accessing /admin/dashboard is redirected to /sd/dashboard
    await page.goto('/admin/dashboard');
    await page.waitForURL('**/sd/dashboard**', { timeout: 15000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/sd/dashboard');

    // Issue C Verification: No public marketing header
    const publicMarketingNav = page.locator('header nav:has-text("Products"), header nav:has-text("Pricing"), header:has-text("Near4Pay")');
    await expect(publicMarketingNav).not.toBeVisible();
  });

  test('Authenticated user accessing /login is redirected to their authorized dashboard', async ({ page, context }) => {
    // Log in as Retailer
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[type="tel"]', ACCOUNTS.RETAILER.mobile);
    await page.fill('input[type="password"]', ACCOUNTS.RETAILER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/retailer/dashboard**', { timeout: 20000, waitUntil: 'domcontentloaded' });

    // Navigating back to /login while authenticated
    await page.goto('/login');
    // Middleware should redirect to /retailer/dashboard
    await page.waitForURL('**/retailer/dashboard**', { timeout: 15000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/retailer/dashboard');
  });

  test('Admin dashboard route exists and does not return 404 (Issue B)', async ({ page, context }) => {
    // Set admin cookies to verify /admin/dashboard route is active and not a Next.js 404
    await context.clearCookies();
    await context.addCookies([
      { name: 'p2p_token', value: 'admin_test_token', domain: '127.0.0.1', path: '/' },
      { name: 'p2p_user_role', value: 'SUPER_ADMIN', domain: '127.0.0.1', path: '/' },
      { name: 'p2p_user_type_ref_id', value: '1', domain: '127.0.0.1', path: '/' },
    ]);

    const res = await page.goto('/admin/dashboard');
    expect(res?.status()).not.toBe(404);
    // Page heading or content should not be "404" or "This page could not be found"
    const notFoundText = page.locator('text="This page could not be found"');
    await expect(notFoundText).not.toBeVisible();
  });

  test('Logout clears session cookies and redirects to /login', async ({ page, context }) => {
    // Log in as Retailer
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[type="tel"]', ACCOUNTS.RETAILER.mobile);
    await page.fill('input[type="password"]', ACCOUNTS.RETAILER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/retailer/dashboard**', { timeout: 20000, waitUntil: 'domcontentloaded' });

    // Call backend enterprise logout to flush server and client cookies
    await page.evaluate(async () => {
      try {
        await fetch('/api/v1/auth/enterprise/logout', { method: 'POST', credentials: 'include' });
      } catch {}
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    });

    await page.waitForURL('**/login**', { timeout: 15000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/login');

    // Verify navigating to protected route now sends to /login
    await page.goto('/retailer/dashboard');
    await page.waitForURL('**/login**', { timeout: 15000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/login');
  });
});
