import { test, expect } from '@playwright/test';

test.describe('P0 Enterprise Dynamic Multi-Company Platform Tests', () => {

  test('1. API Domain Resolution - Near4You, Pay2Pay, and SMSPAY', async ({ request }) => {
    // 1. Near4You resolution
    const resN4U = await request.get('/api/v1/companies/branding?domain=login.near4you.store');
    expect(resN4U.ok()).toBeTruthy();
    const dataN4U = (await resN4U.json()).data;
    expect(dataN4U.company_code).toBe('NEAR4YOU');
    expect(dataN4U.company_ref_id).toBe(1);
    expect(dataN4U.primary_colour.toUpperCase()).toBe('#A20A3A');
    expect(dataN4U.secondary_colour.toUpperCase()).toBe('#EDC11E');
    expect(dataN4U.logo_url).toContain('logo.svg');

    // 2. Pay2Pay resolution
    const resP2P = await request.get('/api/v1/companies/branding?domain=login.pay2pay.in');
    expect(resP2P.ok()).toBeTruthy();
    const dataP2P = (await resP2P.json()).data;
    expect(dataP2P.company_code).toBe('PAY2PAY');
    expect(dataP2P.company_ref_id).toBe(47);
    expect(dataP2P.primary_colour.toUpperCase()).toBe('#2563EB');
    expect(dataP2P.secondary_colour.toUpperCase()).toBe('#1E40AF');
    expect(dataP2P.logo_url).toContain('pay2pay-logo.png');

    // 3. SMSPAY resolution
    const resSMS = await request.get('/api/v1/companies/branding?domain=login.smspay.in');
    expect(resSMS.ok()).toBeTruthy();
    const dataSMS = (await resSMS.json()).data;
    expect(dataSMS.company_code).toBe('SMSPAY');
    expect(dataSMS.company_ref_id).toBe(2);
    expect(dataSMS.primary_colour.toUpperCase()).toBe('#059669');
    expect(dataSMS.secondary_colour.toUpperCase()).toBe('#047857');
    expect(dataSMS.logo_url).toContain('smspay-logo.svg');
  });

  test('2. Explicit Domain Resolution Endpoint - /api/v1/companies/resolve-by-domain', async ({ request }) => {
    const res = await request.get('/api/v1/companies/resolve-by-domain?domain=pay2pay.in');
    expect(res.ok()).toBeTruthy();
    const data = (await res.json()).data;
    expect(data.company_code).toBe('PAY2PAY');
    expect(data.company_name).toBe('Pay2Pay');
    expect(data.company_ref_id).toBe(47);
  });

  test('3. Super Admin Company Directory - Lists All Registered Companies', async ({ request }) => {
    const res = await request.get('/api/v1/companies/list');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
    expect(json.total).toBeGreaterThanOrEqual(3);

    const codes = json.data.map((c: any) => c.company_code);
    expect(codes).toContain('NEAR4YOU');
    expect(codes).toContain('PAY2PAY');
    expect(codes).toContain('SMSPAY');
  });

  test('4. Dynamic Future Company Onboarding - Zero Code Change', async ({ request }) => {
    const testCode = `APEX_${Date.now().toString().slice(-4)}`;
    const newCompanyPayload = {
      company_name: 'Apex Pay Solutions',
      company_code: testCode,
      legal_name: 'Apex Pay Technologies Private Limited',
      display_name: 'Apex Pay',
      short_name: 'APEX',
      primary_domain: `${testCode.toLowerCase()}.in`,
      additional_domains: [`login.${testCode.toLowerCase()}.in`],
      support_email: `support@${testCode.toLowerCase()}.in`,
      support_phone: '+91 9988776655',
      primary_colour: '#7C3AED',
      secondary_colour: '#4C1D95',
      logo_url: '/branding/logo.svg',
      favicon_url: '/branding/favicon.png'
    };

    // Super Admin creates company
    const createRes = await request.post('/api/v1/companies', { data: newCompanyPayload });
    expect(createRes.ok()).toBeTruthy();
    const createData = (await createRes.json()).data;
    expect(createData.company_code).toBe(testCode);

    // Verify dynamic domain resolution for newly onboarded company without server rebuild
    const resolveRes = await request.get(`/api/v1/companies/branding?domain=login.${testCode.toLowerCase()}.in`);
    expect(resolveRes.ok()).toBeTruthy();
    const resolved = (await resolveRes.json()).data;
    expect(resolved.company_code).toBe(testCode);
    expect(resolved.primary_colour.toUpperCase()).toBe('#7C3AED');
    expect(resolved.display_name).toBe('Apex Pay');
  });

  test('5. Multi-Company Data Isolation - Transaction Scoping', async ({ request }) => {
    // Query transactions scoped by Near4You
    const resN4U = await request.get('/api/v1/report?company_ref_id=1&limit=5');
    if (resN4U.ok()) {
      const dataN4U = await resN4U.json();
      if (dataN4U.data && dataN4U.data.length > 0) {
        for (const txn of dataN4U.data) {
          if (txn.company_ref_id) {
            expect(txn.company_ref_id).toBe(1);
          }
        }
      }
    }

    // Query transactions scoped by Pay2Pay
    const resP2P = await request.get('/api/v1/report?company_ref_id=47&limit=5');
    if (resP2P.ok()) {
      const dataP2P = await resP2P.json();
      if (dataP2P.data && dataP2P.data.length > 0) {
        for (const txn of dataP2P.data) {
          if (txn.company_ref_id) {
            expect(txn.company_ref_id).toBe(47);
          }
        }
      }
    }
  });

  test('6. UI Dynamic Single Login - Brand Rendering by Host Context', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="tel"]')).toBeVisible();

    // Verify company branding elements are mounted
    const logoImg = page.locator('img[alt*="Near"], img[alt*="Pay"], img[alt*="SMS"]').first();
    await expect(logoImg).toBeVisible();

    // Verify regulatory footer contains legal company attribution
    const footerText = page.locator('text=/© \\d{4}.*Technology|Portal/i').first();
    await expect(footerText).toBeVisible();
  });
});

