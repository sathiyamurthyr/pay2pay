# PAY2PAY Enterprise AppShell Architecture Documentation

---

## 1. Executive Summary & Core Purpose

The **PAY2PAY Enterprise AppShell** is the single reusable application layout engine that governs all modules (DMT, AEPS, BBPS, Wallet, Reports, Settlement, Customer Management).

It establishes:
1. **Deterministic Viewport Control**: Fixed `100vw` / `100vh` grid layout with `position: "fixed"` preventing browser-window scrollbars.
2. **Independent Panel Y-Scrollbars**: The Sidebar, Main Workspace, and Operations Panel scroll independently.
3. **Responsive CSS Grid Engine**:
   - `grid-template-areas: "header header header" "sidebar workspace operations" "footer footer footer"`
   - Responsive column calculation across 1366px, 1600px, 1920px, 2560px, and 3840px viewports.

---

## 2. Grid Dimensions Blueprint

| Resolution | Header Height | Sidebar Width | Main Workspace Canvas | Operations Panel Width | Footer Height |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **3840 × 2160 (4K XL)** | `72px` Sticky | `340px` Expanded / `72px` Collapsed | **`minmax(0, 1fr)` Canvas** | `420px` Panel | `64px` Sticky |
| **2560 × 1440 (2K LG)** | `72px` Sticky | `320px` Expanded / `72px` Collapsed | **`minmax(0, 1fr)` Canvas** | `380px` Panel | `64px` Sticky |
| **1920 × 1080 (Full HD MD)**| `72px` Sticky | `300px` Expanded / `72px` Collapsed | **`minmax(0, 1fr)` Canvas** | `360px` Panel | `64px` Sticky |
| **1600 × 900 (Laptop MD)** | `72px` Sticky | `290px` Expanded / `72px` Collapsed | **`minmax(0, 1fr)` Canvas** | `340px` Panel | `64px` Sticky |
| **1366 × 768 (Laptop SM)** | `72px` Sticky | `280px` Expanded / `72px` Collapsed | **`minmax(0, 1fr)` Canvas** | `320px` Panel | `64px` Sticky |

---

## 3. Sub-Component Inventory

- **`EnterpriseHeader`**: 72px sticky header containing logo, title, breadcrumbs, search, wallet balance chip, switch status, and user profile.
- **`EnterpriseSidebar`**: 300px / 72px collapsible sidebar with categorized module navigation groups.
- **`OperationsPanel`**: 360px right panel housing system health matrix, switch status, and AI route telemetry.
- **`StickyFooter`**: 64px footer with Previous Action (Left), Step Context (Center), and Primary Action (Right).
