# EMI Pro — Professional Loan Planning Dashboard & EMI Calculator

> **Tagline**: Plan Smart. Borrow Better.

EMI Pro is a production-grade, vanilla web application designed for comprehensive loan planning, repayment estimation, loan comparison, and prepayment analysis. Built purely with **HTML5, CSS3, Vanilla ES6+ JavaScript, and the HTML5 Canvas API**, it operates 100% offline with zero external dependencies, frameworks, or chart libraries.

---

## 🚀 Key Features

- **⚡ Instant EMI Calculator**: Real-time reduces-balance EMI calculation with synchronized slider controls and formatted inputs.
- **🎨 Dual Theme Support**: Glassmorphic UI supporting Light Mode and Dark Mode (`[data-theme="dark"]`), persisting user preferences.
- **📊 Canvas Doughnut Chart**: Interactive HiDPI HTML5 Canvas doughnut chart displaying principal vs. interest breakdown.
- **⚖️ Loan Comparison Engine**: Side-by-side comparison of two loan scenarios with automated savings detection and grouped bar visualization.
- **📅 Interactive Amortization Schedule**: Paginated month-by-month and year-by-year payment tables with lazy generation and final instalment clamping.
- **💰 Prepayment Simulator**: Multi-mode simulator (Reduce Tenure vs Reduce EMI) calculating exact time and interest saved.
- **💡 Rule-Based Financial Insights**: Dynamic loan analytics (interest-to-principal ratio, 50% milestone date, rate sensitivity preview) plus an interactive What-If slider.
- **💾 Local Scenario Manager**: Save, load, rename, compare, and manage up to 50 loan scenarios safely in `localStorage` (`emipro.scenarios.v1`).
- **📥 Exporters & Reports**: UTF-8 BOM CSV exporter and printable PDF/Print report layout (`window.print()`).
- **♿ WCAG AA Accessible**: Semantic landmarks, keyboard focus management, ARIA live regions (`aria-live="polite"`), and screen-reader support.

---

## 🛠️ Technology Stack & Design System

- **Core**: HTML5, Vanilla JavaScript (ES6+)
- **Styling**: Vanilla CSS3 (Custom properties, CSS Grid, Flexbox, Glassmorphism, CSS Animations <250ms)
- **Graphics**: HTML5 Canvas API (Doughnut chart & Grouped comparison bar chart)
- **Icons**: Inline SVGs & Data URI Favicon
- **Persistence**: Browser `localStorage`

### Color Tokens

| Token | Light Theme | Dark Theme | Purpose |
|---|---|---|---|
| Primary | `#2563EB` | `#3B82F6` | Primary accents, buttons, cards |
| Gradient Accent | `#2563EB` to `#7C3AED` | `#3B82F6` to `#8B5CF6` | Hero gradients, highlight card |
| Background | `#F5F7FB` | `#0F172A` | Page background |
| Card | `#FFFFFF` | `#1E293B` | Container card backgrounds |
| Text | `#172033` | `#E5E7EB` | Primary typography |
| Secondary Text | `#64748B` | `#94A3B8` | Subtitles, labels |
| Border | `#E2E8F0` | `#334155` | Dividers and field borders |

---

## 📂 Project Structure

```
emi-calculator/
├── index.html      # Semantic HTML5 page structure, modals, inline SVGs
├── style.css       # Design tokens, light/dark themes, responsive layout, print styles
├── script.js       # Core engine (window.EMIPro.calc) + DOM state controller & UI bindings
├── tests.html      # Browser unit test runner
├── tests.js        # Universal unit test suite (Node.js CLI & Browser compatible)
└── README.md       # Project documentation & Viva Q&A
```

---

## 📖 Calculation Model & Formulas

Standard fixed-rate, monthly reducing-balance loan model.

```
R = annualRate / 12 / 100
N = totalMonths
EMI = (R === 0) ? (P / N) : (P * R * (1 + R)^N) / ((1 + R)^N - 1)
```

### Precision & Rounding Policy
1. **Full Precision Internally**: Unrounded double-precision floating-point numbers are maintained for intermediate schedule calculations, cumulative balances, and total repayments.
2. **Display Rounding**: Values are rounded to 2 decimal places (`Intl.NumberFormat`) only when rendered on screen.
3. **Schedule Clamping**: The final schedule instalment is clamped so that the closing balance equals exactly `0.00` (never negative or `-0.00`).
4. **Discrepancy Note**: Displayed paise-level sums across rounded table rows may differ from total repayment values by a few paise due to cumulative display rounding.

---

## 🧪 Unit & Calculation Engine Test Suite

The core calculation engine (`window.EMIPro.calc`) is fully covered by automated assertions in `tests.js`.

### Running Tests

**Via Node.js CLI:**
```bash
node emi-calculator/tests.js
```

**Via Browser:**
Open `emi-calculator/tests.html` in any web browser.

### Test Verification Matrix

| Test Case | Expected EMI / Metric | Status |
|---|---|---|
| ₹10,00,000 @ 8.5% for 20 yrs | ₹8,678.23 | **PASSED** |
| ₹5,00,000 @ 10% for 5 yrs | ₹10,623.52 | **PASSED** |
| ₹1,00,000 @ 0% for 12 months (Zero Rate) | ₹8,333.33 | **PASSED** |
| ₹25,00,000 @ 7.5% for 15 yrs | ₹23,175.10 (±0.50 Float Float Match) | **PASSED** |
| Validation Boundaries (Min ₹10k, Max ₹1Cr, Rate 0-30%, Tenure 1-480m) | Rejection of out-of-bound & junk inputs | **PASSED** |
| Schedule Reconciliation | Final balance = 0, Sum(P) = Loan Principal | **PASSED** |
| Prepayment Simulator Safety | Over-prepayment stops at 0 balance without negative numbers | **PASSED** |
| Tenure Unit Conversions | 20 yrs = 240m; 0.58 yrs = 7m | **PASSED** |
| CSV Escaping & BOM Header | UTF-8 BOM `\uFEFF` & numeric column formatting | **PASSED** |

---

## 🌐 Browser Audit & Responsive Verification

Verified across 5 screen breakpoints using the integrated browser agent:

- **1440px (Desktop)**: 2-column layout, full hero illustration, dual scenario comparison grid (**PASSED**).
- **1024px (Tablet Landscape)**: Adaptive grid scaling, touch-friendly controls (**PASSED**).
- **768px (Tablet Portrait)**: Single column layout, mobile dropdown menu toggle (**PASSED**).
- **390px (Mobile Standard)**: Touch targets ≥44px, full responsive sliders (**PASSED**).
- **360px (Mobile Compact)**: Zero horizontal page overflow (**PASSED**).

---

## 🎓 Viva Q&A & Code Architecture (For Mini-Project Defense)

### Q1: How does the application calculate EMI for a reducing balance loan?
> **Answer**: It calculates interest on the remaining principal balance at the beginning of each month. As principal is repaid every month, the interest portion of subsequent EMIs decreases while the principal portion increases.

### Q2: Why is the calculation engine decoupled from DOM operations?
> **Answer**: By exposing `window.EMIPro.calc` as pure, side-effect-free functions, the business logic can be independently unit tested in Node.js CLI scripts (`node tests.js`) without needing a DOM tree (Jsdom/Browser).

### Q3: How do you prevent XSS vulnerabilities when saving custom scenario names?
> **Answer**: All user-provided strings are sanitized using `calc.escapeHTML()` and rendered strictly via `element.textContent` rather than `innerHTML`.

### Q4: How is theme preference persisted across sessions?
> **Answer**: The application writes theme settings to `localStorage` under `emipro.settings.v1` and applies the `data-theme="dark"` or `data-theme="light"` attribute to `<html>` prior to page paint.

---

## ⚠️ Limitations & Educational Disclaimer

*EMI Pro provides estimates for educational and planning purposes only. Actual loan instalments, interest charges, fees, taxes, prepayment benefits, and repayment schedules may vary depending on lender policies, floating rate revisions, and loan agreements. Please verify the final terms with your financial institution before making a borrowing decision.*
