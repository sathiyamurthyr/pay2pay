import { test, expect } from '@playwright/test';

test.describe('P0 Announcements Dual-Route & Multi-Company Recovery Tests', () => {

  test('1. Company Branding API Verification - SMSPAY, Near4You, Pay2Pay', async ({ request }) => {
    // SMSPAY
    const resSMS = await request.get('/api/v1/companies/branding?domain=admin.smspay.store');
    expect(resSMS.ok()).toBeTruthy();
    const dataSMS = (await resSMS.json()).data;
    expect(dataSMS.company_code).toBe('SMSPAY');
    expect(dataSMS.display_name || dataSMS.company_name).toContain('SMSPAY');

    // Near4You
    const resN4U = await request.get('/api/v1/companies/branding?domain=admin.near4you.store');
    expect(resN4U.ok()).toBeTruthy();
    const dataN4U = (await resN4U.json()).data;
    expect(dataN4U.company_code).toBe('NEAR4YOU');

    // Pay2Pay
    const resP2P = await request.get('/api/v1/companies/branding?domain=admin.pay2pay.in');
    expect(resP2P.ok()).toBeTruthy();
    const dataP2P = (await resP2P.json()).data;
    expect(dataP2P.company_code).toBe('PAY2PAY');
  });

  test('2. Backend Announcements API Contract Verification', async ({ request }) => {
    // 1. Active announcements for popup
    const resActive = await request.get('/api/v1/announcements/active?audience=RETAILER');
    expect(resActive.ok()).toBeTruthy();
    const dataActive = await resActive.json();
    expect(dataActive.success).toBe(true);
    expect(Array.isArray(dataActive.data)).toBe(true);

    // 2. Admin announcement list
    const resList = await request.get('/api/v1/announcements/admin/list');
    expect(resList.ok()).toBeTruthy();
    const dataList = await resList.json();
    expect(dataList.success).toBe(true);
    expect(Array.isArray(dataList.data)).toBe(true);
  });

  test('3. Route Availability - /announcements & /admin/announcements', async ({ page }) => {
    // Set up mock admin session cookies
    await page.context().addCookies([
      {
        name: 'p2p_admin_token',
        value: 'mock-admin-token-for-testing-12345',
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'p2p_portal_role',
        value: 'ADMIN',
        domain: 'localhost',
        path: '/',
      }
    ]);

    // Test Route A: /announcements
    const responseA = await page.goto('/announcements');
    expect(responseA?.status()).toBeLessThan(400); // No 404, No 500

    // Test Route B: /admin/announcements
    const responseB = await page.goto('/admin/announcements');
    expect(responseB?.status()).toBeLessThan(400); // No 404, No 500
  });

  test('4. Security Boundary - Non-Admin Retailer Redirection', async ({ page }) => {
    // Set up Retailer session
    await page.context().addCookies([
      {
        name: 'p2p_retailer_token',
        value: 'mock-retailer-token-12345',
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'p2p_portal_role',
        value: 'RETAILER',
        domain: 'localhost',
        path: '/',
      }
    ]);

    // Attempting /admin/announcements as Retailer should restrict or redirect to retailer dashboard
    await page.goto('/admin/announcements');
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/admin/announcements');
  });

});
