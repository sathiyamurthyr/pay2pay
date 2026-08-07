# PAY2PAY Enterprise Design System & Architectural Foundation

---

## 1. Executive Summary & Design Principles

The PAY2PAY Enterprise Design System establishes a unified, high-speed financial transaction operational interface across all enterprise web modules (DMT, AEPS, BBPS, Wallet, Reports, Card to Cash, Settlement, KYC, Customer Management).

### Core Principles
1. **High-Speed Transaction Focus**: Eliminates dashboard bloat, centering all visual focus on transaction execution and customer identification.
2. **Deterministic Layout Architecture**: Fixed 100vw/100vh viewport ownership with independent panel Y-scrollbars. Zero arbitrary `maxWidth` containers or centered margins.
3. **Glassmorphism Financial Surfaces**: Uses `rgba(18, 27, 48, 0.75)` surface backgrounds with `backdropFilter: "blur(20px)"` and soft blue glows (`rgba(37, 99, 235, 0.35)`).
4. **Single Source of Truth**: All components inherit tokens from `@/design-system/tokens/design-tokens` and styles from `@/design-system/theme/theme`.

---

## 2. Token Architecture Reference

### Colors (`tokens.colors`)
- **Brand Primary**: `#2563EB` (Primary Action Blue)
- **Brand Glow**: `rgba(37, 99, 235, 0.35)`
- **Dark Background**: `#08111F`
- **Dark Surface**: `rgba(18, 27, 48, 0.75)`
- **Status Success**: `#16A34A` / Text: `#4ADE80`
- **Status Error**: `#DC2626` / Text: `#F87171`

### Typography Scale (`tokens.typography`)
- **Font Family**: Inter, Roboto, -apple-system, sans-serif
- **Sizes**: `xs: 11px`, `sm: 13px`, `md: 14px`, `lg: 16px`, `xl: 18px`, `h3: 20px`, `h2: 24px`, `h1: 30px`
- **Weights**: `Regular (400)`, `Medium (500)`, `Semibold (600)`, `Bold (700)`, `Heavy (900)`

### Spacing & Radii (`tokens.spacing`, `tokens.radii`)
- **Spacing Base**: 4px / 8px (`xxs: 4px`, `xs: 8px`, `sm: 12px`, `md: 16px`, `lg: 20px`, `xl: 24px`, `xxl: 32px`)
- **Radii**: `xs: 4px`, `sm: 8px`, `md: 10px`, `lg: 12px`, `xl: 16px`, `pill: 9999px`

---

## 3. Standardized Layout Primitives

| Layout Component | Usage Scenario | Grid Blueprint |
| :--- | :--- | :--- |
| **`AppShell`** | Root application viewport | `310px` Sidebar + `minmax(0, 1fr)` Workspace + `360px` Right Panel |
| **`PageLayout`** | Standard module wrapper | Vertical flex stack with standardized page title and header actions |
| **`TwoColumnLayout`** | Dual workspace | `grid-template-columns: 1fr 1fr` (Responsive split) |
| **`ThreeColumnLayout`** | Multi-panel operations | `300px minmax(0, 1fr) 320px` |
| **`DashboardLayout`** | Performance monitoring | Top KPI metric row + Main content canvas + Right telemetry side |
| **`FormLayout`** | Structured inputs | Glass surface paper with top header and bottom sticky actions |
| **`TransactionLayout`** | Direct Money Transfer | Customer Header -> Beneficiary Grid -> Amount Entry -> Audit Table |

---

## 4. Accessibility & Performance Compliance

- **WCAG AA Compliance**: High-contrast text tokens (`#F8FAFC` on `#08111F` = 14.2:1 contrast ratio).
- **Keyboard Navigation**: Native `tabIndex={0}` focus rings with `outline: "2px solid #2563EB"`.
- **Tree-Shakable Exports**: All components exported via `@/design-system`.
