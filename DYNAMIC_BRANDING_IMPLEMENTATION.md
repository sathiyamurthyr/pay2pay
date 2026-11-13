# DYNAMIC BRANDING IMPLEMENTATION
## Multi-Company Theming & Brand Palette Architecture

**Module:** Dynamic Branding Engine  
**Frontend Hook:** `frontend/src/hooks/useCompanyBranding.ts`  
**Backend Endpoint:** `GET /api/v1/companies/branding`  
**Status:** Verified & Fully Operational  

---

## 1. Multi-Company Branding Engine

The Dynamic Branding system provides runtime brand customization across all registered companies without hardcoded frontend stylesheets:
1. **Unauthenticated Resolution (Domain-Driven)**:
   - When a user navigates to `login.near4you.store`, `login.pay2pay.in`, or `login.smspay.in`, the client hook automatically detects the hostname.
   - It queries `GET /api/v1/companies/branding?domain=<hostname>`.
   - The backend resolves the company record and returns its official colors, logo URL, favicon URL, and display name.
2. **Authenticated Resolution (Token-Driven)**:
   - Upon logging in, the user's JWT Bearer token contains `company_ref_id`.
   - The branding hook uses the authenticated user's company context to maintain brand continuity throughout all dashboard pages.

---

## 2. Official Brand Palettes

### 2.1 Near4You (`company_ref_id: 1`)
- **Primary Brand Color**: Burgundy `#A20A3A`
- **Secondary Accent Color**: Gold Yellow `#EDC11E`
- **Background**: Strict White `#FFFFFF` (Secondary `#FAF8F9`)
- **Dual Gradients**: `linear-gradient(135deg, #A20A3A, #EDC11E)`
- **Logo Mark**: `/branding/logo.svg`
- **Favicon**: `/branding/favicon.png`

### 2.2 Pay2Pay (`company_ref_id: 47`)
- **Primary Brand Color**: Blue `#2563EB`
- **Secondary Accent Color**: Navy `#1E40AF`
- **Background**: White `#FFFFFF`
- **Dual Gradients**: `linear-gradient(135deg, #2563EB, #1E40AF)`
- **Logo Mark**: `/branding/pay2pay-logo.png`
- **Favicon**: `/branding/favicon.png`

### 2.3 SMSPAY (`company_ref_id: 2`)
- **Primary Brand Color**: Emerald `#059669`
- **Secondary Accent Color**: Deep Green `#047857`
- **Background**: White `#FFFFFF`
- **Dual Gradients**: `linear-gradient(135deg, #059669, #047857)`
- **Logo Mark**: `/branding/smspay-logo.svg`
- **Favicon**: `/branding/favicon.png`

### 2.4 Future Dynamically Registered Companies
- Colors, logos, and gradients are read directly from `public.company_branding` in PostgreSQL.
- Updated instantly when modified through Central Super Admin.

---

## 3. Dynamic DOM & CSS Token Injection

When branding is loaded, `useCompanyBranding.ts` injects CSS custom properties directly into the document root:
```javascript
root.style.setProperty("--brand-primary", data.primary_colour);
root.style.setProperty("--brand-secondary", data.secondary_colour);
root.style.setProperty("--accent", data.primary_colour);
root.style.setProperty("--accent-gold", data.secondary_colour);
```
Furthermore, the document title and `<link rel="shortcut icon">` update dynamically to reflect the active company identity:
```javascript
document.title = `${data.display_name} - Enterprise FinTech Platform`;
faviconLink.href = data.favicon_url;
```

