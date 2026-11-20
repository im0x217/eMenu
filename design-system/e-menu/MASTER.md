# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** e-Menu (حلويات عبمبر الزروق)
**Updated:** 2026-11-20
**Category:** Restaurant / Culinary E-Commerce & POS (Arabic RTL)

> **Single Source of Truth:** All primitive, semantic, and component design tokens live in [`frontend/src/tokens/tokens.json`](../../frontend/src/tokens/tokens.json) (W3C DTCG / Tokens Studio format). Never edit generated token outputs manually—update `tokens.json` and run `npm run tokens:build` (implemented in [`scripts/build-tokens.js`](../../scripts/build-tokens.js)) to regenerate `frontend/src/tokens/tokens.css` and `frontend/src/tokens/tokens.js`.

---

## Global Rules

### Color Palette

Your brand supports dynamic multi-shop theme branding synchronized with `frontend/src/tokens/tokens.json`:

| Role | Hex | Token / CSS Variable | Usage |
|------|-----|----------------------|-------|
| **Shop 1 Primary (Gold)** | `#fdb518` | `--color-gold` / `--primary-color` | Warm Gold accent & CTAs for Shop 1 (luxury pastries & sweets) |
| **Shop 2 Primary (Navy)** | `#1e3a5f` | `--color-blue` / `--primary-color` | Deep Navy Blue accent & CTAs for Shop 2 (dry pastries & Nawashef) |
| **Warm Backdrop** | `#f7f3ec` | `--color-warm-bg` / `--bg-dark` | Global warm cream background canvas |
| **Card Surface** | `#fffdf9` | `--color-warm-card` / `--bg-card` | Warm elevated card & panel surface |
| **Foreground / Text** | `#2c2520` | `--color-warm-text` | Rich dark espresso primary typography |
| **Muted Text** | `#685f58` | `--color-warm-muted` / `--text-muted` | Secondary details & metadata (WCAG AA >= 5.4:1 on warm surfaces) |
| **Danger / Alert Badge** | `#dc2626` | `--color-danger-badge` | WCAG AA accessible notification & error badge with `#ffffff` text (4.83:1) |
| **Card Media Wrapper** | `#0f172a` | `--color-slate-900` / `--product-card-image-bg` | Dark slate foundation for 4:3 product image wrappers |
| **Card Border** | `rgba(44, 37, 32, 0.06)` | `--border-card` | Warm subtle card outline (`frontend/src/style.css`) |

**Color Notes:** Preserved original e-Menu multi-tenant brand identities: Shop 1 (Warm Gold `#fdb518` with `#0c0603` button text) and Shop 2 (Deep Navy `#1e3a5f` with `#ffffff` button text), set on the canonical warm cream canvas `#f7f3ec`, `#fffdf9` card surfaces, and `#685f58` muted copy from `frontend/src/tokens/tokens.json`.

### Typography

- **Primary Font:** Cairo (`'Cairo', sans-serif`) — `--typography-font-family`
- **Line Heights:** Tight `1.25` (`--typography-line-height-tight`), Normal `1.5` (`--typography-line-height-normal`), Relaxed `1.65` (`--typography-line-height-relaxed`)
- **Mobile Input Guard:** `16px` (`--typography-font-size-input-mobile`) on `<input>`, `<select>`, and `<textarea>` at `<= 768px` to prevent iOS Safari auto-zoom
- **Mood:** Modern, RTL-native (`dir="rtl"`), clean culinary digital menu
- **Google Fonts:** [Cairo](https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
```

### Spacing, Radius & Touch Target Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` (`--spacing-xs`) | `4px` | Tight gaps |
| `--space-sm` (`--spacing-sm`) | `8px` | Icon gaps, inline spacing, minimum touch clearance |
| `--space-md` (`--spacing-md`) | `16px` | Standard padding |
| `--space-lg` (`--spacing-lg`) | `24px` | Section padding |
| `--space-xl` (`--spacing-xl`) | `32px` | Large gaps |
| `--space-2xl` (`--spacing-2xl`) | `48px` | Section margins |
| `--radius-sm`..`--radius-pill` | `6px`, `10px`, `16px`, `20px`, `9999px` | Control, card (`16px`), bottom sheet (`20px`), and pill radii |
| `--touch-target-min` | `48px` | Minimum accessible interactive hit area (expanded via `::before`/`::after` where visual icons are compact) |
| `--touch-target-clearance` | `8px` | Minimum clearance between interactive touch siblings |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` (`--box-shadow-sm`) | `0 1px 3px rgba(44, 37, 32, 0.04), 0 1px 2px rgba(44, 37, 32, 0.03)` | Subtle lift |
| `--shadow-md` (`--box-shadow-md`) | `0 4px 12px rgba(44, 37, 32, 0.06), 0 1px 4px rgba(44, 37, 32, 0.04)` | Cards, buttons |
| `--shadow-lg` (`--box-shadow-lg`) | `0 8px 24px rgba(44, 37, 32, 0.08), 0 2px 8px rgba(44, 37, 32, 0.04)` | Modals, dropdowns |
| `--shadow-xl` (`--box-shadow-xl`) | `0 16px 40px rgba(44, 37, 32, 0.1), 0 4px 12px rgba(44, 37, 32, 0.05)` | Floating elements, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button — uses dynamic --primary-color per shop theme */
.btn-primary {
  background: var(--primary-color);
  color: #ffffff;
  padding: 0.85rem 1.5rem;
  border-radius: 12px;
  font-family: var(--typography-font-family);
  font-weight: 700;
  transition: opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 8px rgba(var(--primary-color-rgb), 0.25);
  cursor: pointer;
}

/* Shop-specific contrast overrides */
.shop-theme-shop1 .btn-primary { color: #0c0603; } /* Dark text on Gold */
.shop-theme-shop2 .btn-primary { color: #ffffff; } /* White text on Navy */
```

### Cards

```css
.glass-panel {
  background: var(--color-warm-card); /* #fffdf9 — warm white */
  border: 1px solid var(--border-card);
  border-radius: var(--radius-lg); /* 16px */
  box-shadow: var(--box-shadow-md);
  transition: box-shadow 0.25s ease, border-color 0.25s ease;
}

.glass-panel:hover {
  box-shadow: var(--box-shadow-lg);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  font-size: var(--typography-font-size-input-mobile);
  transition: border-color 200ms ease, box-shadow 200ms ease;
}

.input:focus {
  border-color: var(--primary-color);
  outline: none;
  box-shadow: 0 0 0 3px var(--primary-glow);
}

.input.is-invalid {
  border-color: var(--color-danger-badge); /* #dc2626 */
}
```

### Modals & Bottom Sheets

```css
.modal-overlay {
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--color-warm-card); /* #fffdf9 */
  border-radius: var(--bottom-sheet-radius); /* 20px on mobile sheets */
  padding: var(--space-xl);
  box-shadow: var(--box-shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Stack:** Vue 3 + Vite + Pinia + Vue Router + Custom CSS Variables (`tokens.json` -> `tokens.css` / `tokens.js`)

**Style:** Warm Luxury Culinary Storefront & Precision RTL POS

**Keywords:** Arabic RTL, Cairo typography, warm alabaster (`#f7f3ec` / `#fffdf9`), 4:3 culinary media on `#0f172a`, dual-shop identity (Gold `#fdb518` / Navy `#1e3a5f`), physical Apple-style bottom sheets (`sheetGesture.js`, `viewTransition.js`)

**Key Effects:** GPU-composited transitions (`transform`, `opacity`), shared-element View Transitions with `prefers-reduced-motion` fallback, horizontal scroll-snap rows with edge peek, 150–300ms state transitions

### Storefront Pattern

- **Shop Entry:** Shop 1 (`/` or `?shop=shop1`, Gold) and Shop 2 (`?shop=shop2`, Navy Nawashef) sharing unified checkout, customer account, and PWA shells
- **Section Order:** 1. Sticky Header & Search, 2. Marketing Carousel, 3. Category Tabs & Subcategories, 4. Product Grid / 1-Row Horizontal Scroll (`4:3` cards), 5. Floating Bottom Cart Bar & Navigation

---

## Anti-Patterns (Do NOT Use)

- ❌ Low-quality imagery or raw hardcoded hex drift when a token exists in `tokens.json`
- ❌ Cyclic token definitions (e.g., `--touch-target-min: var(--touch-target-min)`)
- ❌ **Emojis as UI icons** — Use SVG icons (`@hugeicons/vue`, `@phosphor-icons/vue`, or inline SVG with `aria-hidden="true"`)
- ❌ **Missing cursor:pointer** — All clickable elements must have `cursor: pointer`
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio (3:1 for large text/borders)
- ❌ **Instant state changes** — Always use smooth transitions (150–300ms)
- ❌ **Invisible focus states** — Focus states must remain visible for keyboard navigation

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] Token source of truth (`frontend/src/tokens/tokens.json`) compiled via `npm run tokens:build` (`scripts/build-tokens.js`) with zero manual edits to `tokens.css` / `tokens.js`
- [ ] `npm run ux:audit` passes with 0 Errors and 0 Warnings
- [ ] No emojis used as interactive UI icons; decorative `<svg>` elements declare `aria-hidden="true"`
- [ ] Consistent icon set (`@hugeicons/vue`, `@phosphor-icons/vue`, or inline SVG)
- [ ] Interactive touch targets meet `>= 44px` (`--touch-target-min: 48px`) with `8px` clearance
- [ ] `cursor: pointer` on all clickable elements and hover transitions (`150–300ms`)
- [ ] Light mode text contrast meets `>= 4.5:1` (`#2c2520` / `#685f58` on `#f7f3ec` / `#fffdf9`)
- [ ] Keyboard focus states visible, modals trap `Tab` and close on `Escape`
- [ ] `prefers-reduced-motion` respected across CSS & `viewTransition.js`
- [ ] Responsive viewports verified (375px, 768px, 1024px, 1440px) with no unintended horizontal scroll on mobile and no content hidden behind fixed bottom navbars
