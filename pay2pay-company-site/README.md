# Pay2Pay Corporate Website (`pay2pay-company-site`)

Production-ready, single-page enterprise fintech public landing website for **SUPER REX PRODUCTS PRIVATE LIMITED**.

## 🚀 Features

- **Complete Project Isolation**: Independent dependencies, build pipelines, process, and zero cross-contamination with existing dashboards.
- **Enterprise Fintech Visuals**: Premium dark navy theme, smooth SVG abstract node ecosystem animations, glassmorphism, gold & cyan accents.
- **Configuration-Driven**: All branding, contact info, service offerings, and legal policies are governed from `config/site-config.ts`.
- **Role-Based Login Routing**: Clean redirection to Retailer, DIT, and Super-Distributor portals using environment variables.
- **Health Check Route**: `GET /health` responding with `200 OK` and `{ "status": "ok", "service": "pay2pay-company-site" }`.
- **Validated Contact Form**: Client & server-side validated merchant contact form with loading/success/error feedback.
- **Dynamic Legal Dialogs**: Terms & Conditions, Privacy Policy, and Refund/Cancellation Policy modals.

## 🛠️ Quick Start

```bash
cd pay2pay-company-site
npm install
npm run dev
```

Visit [http://localhost:3005](http://localhost:3005) in your browser.

## 📦 Production Build & Deploy

```bash
npm run build
npm run start
```
