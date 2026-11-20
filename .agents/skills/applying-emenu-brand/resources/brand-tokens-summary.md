# e-Menu Brand Tokens & Vue Architecture Summary

Authoritative token values compiled from `frontend/src/tokens/tokens.json` by `scripts/build-tokens.js` (`npm run tokens:build`) into `frontend/src/tokens/tokens.css` and `frontend/src/tokens/tokens.js`. Imported globally via `frontend/src/style.css` (`@import './tokens/tokens.css';`) and layered with `frontend/src/styles/premium.css` in `frontend/src/main.js`.

## 1. Technology Stack (No React / Tailwind)

- **Framework:** Vue 3 (`^3.5.39`), Vue Router (`^4.6.4`), Pinia (`^3.0.4`), Vite (`^8.1.1`)
- **Motion & Media:** GSAP (`^3.15.0`), `frontend/src/utils/sheetGesture.js`, `frontend/src/utils/viewTransition.js`, Cropper.js, JsBarcode
- **Icons:** `@hugeicons/vue`, `@phosphor-icons/vue`, and clean inline SVGs (`aria-hidden="true"` when decorative). Never use emojis as UI icons.
- **Forbidden:** React, Tailwind CSS, shadcn/ui, Bootstrap, jQuery, or manual edits to `tokens.css` / `tokens.js`.

## 2. Color Tokens & Shop Contrast

| Role | Hex / Value | Token / CSS Variable | Usage & Contrast Rule |
| --- | --- | --- | --- |
| **Shop 1 Primary (Gold)** | `#fdb518` | `--color-gold` / `--primary-color` (`.shop-theme-shop1`) | Luxury pastries & sweets; pair with `#0c0603` foreground on primary buttons and active category pills |
| **Shop 1 Glow** | `rgba(253, 181, 24, 0.15)` | `--primary-glow` (`.shop-theme-shop1`) | Active states and subtle focus/card highlights |
| **Shop 2 Primary (Navy)** | `#1e3a5f` | `--color-blue` / `--primary-color` / `--shop2-ink` (`.shop-theme-shop2`) | Dry pastries (`قسم النواشف`); pair with `#ffffff` foreground on primary buttons and active category pills |
| **Shop 2 Glow** | `rgba(30, 58, 95, 0.15)` | `--primary-glow` (`.shop-theme-shop2`) | Active states and subtle focus/card highlights |
| **Warm Cream Canvas** | `#f7f3ec` | `--color-warm-bg` / `--bg-dark` | Global app background and light meta `theme-color` |
| **Warm Card Surface** | `#fffdf9` | `--color-warm-card` / `--bg-card` | Elevated panels, product cards, modal sheets |
| **Primary Text** | `#2c2520` | `--color-warm-text` | High-contrast body and heading copy |
| **Muted Text** | `#685f58` | `--color-warm-muted` / `--text-muted` | Secondary metadata (`>= 5.4:1` WCAG AA on warm surfaces) |
| **Danger / Badge Red** | `#dc2626` | `--color-danger-badge` | WCAG AA notification badges (`4.83:1` with white text) and destructive states |
| **Dark Media Backdrop** | `#0f172a` | `--color-slate-900` / `--product-card-image-bg` | Product card image wrapper foundation and admin dark header theme |

## 3. Health Certificate Badge Semantics

Defined in `frontend/src/components/AdminEmployeesTab.vue` (`getHealthCertInfo`):

| State | Rule | Class | Background | Border | Text | Dot | Arabic Label |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Valid** | `> 30` days remaining | `.is-valid` | `#ecfdf5` | `#6ee7b7` | `#047857` | `#10b981` | `سارية` |
| **Approaching** | `0..30` days remaining | `.is-approaching` | `#fefce8` | `#facc15` | `#854d0e` | `#eab308` | `قرب الانتهاء` |
| **Expired** | `< 0` days remaining | `.is-expired` | `#fef2f2` | `#fca5a5` | `#b91c1c` | `#ef4444` | `منتهية` |
| **Unset / Invalid** | Empty or invalid ISO date | `.is-unset` | `#f8fafc` | `#cbd5e1` (dashed) | `#64748b` | `#94a3b8` | `غير مسجلة` |

## 4. Typography, Grid, and Touch Ergonomics

- **Typeface:** `'Cairo', sans-serif` (`--typography-font-family`).
- **Line Height:** `1.25` tight headings (`--typography-line-height-tight`), `1.5` normal body, `1.65` relaxed; keep `line-height >= 1.4` on Arabic body copy to prevent Cairo ascender/descender clipping.
- **Arabic Tracking:** `:where(:lang(ar)) :is(h1, h2, h3, .display-title, .modal-title)` keeps `letter-spacing: normal` (`frontend/src/styles/premium.css`) so connected Arabic glyphs never fracture.
- **iOS Auto-Zoom Guard:** Keep mobile (`<= 768px`) `<input>`, `<select>`, and `<textarea>` font-size at `16px` (`--typography-font-size-input-mobile`).
- **4px / 8px Spacing Grid:** `--spacing-xs: 4px`, `--spacing-sm: 8px`, `--spacing-md: 16px`, `--spacing-lg: 24px`, `--spacing-xl: 32px`, `--spacing-2xl: 48px`. Never use odd pixel spacing.
- **Radii & Component Tokens:** `--border-radius-sm: 6px`, `md: 10px`, `lg: 16px`, `xl: 20px`, `pill: 9999px`; `--product-card-aspect-ratio: 4 / 3`; `--bottom-sheet-handle-width: 40px` (`4px` height).
- **Touch Targets:** `--touch-target-min: 48px` and `--touch-target-clearance: 8px` (`scripts/ux-audit.js` enforces `>= 44px` via element size or `::before`/`::after` expanded hit boxes on customer/mobile views).
