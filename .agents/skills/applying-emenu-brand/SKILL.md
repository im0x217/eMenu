---
name: applying-emenu-brand
description: Applies حلويات عبمبر الزروق (e-Menu) multi-shop brand tokens, Vue 3 + Vite styling architecture, and Arabic RTL copy standards. Use when styling Vue components, editing tokens.json, checking Shop 1 gold vs. Shop 2 navy contrast, writing Arabic UI copy or error messages, or validating WCAG accessibility.
---

# Applying e-Menu Brand Identity

Single source of truth for **حلويات عبمبر الزروق** (`e-Menu`) visual tokens, multi-shop theming, Vue 3 architecture, and Arabic RTL copywriting.

**Stack Rule:** e-Menu runs on **Vue 3 + Vite + W3C DTCG CSS tokens + Cairo RTL**. Never introduce React, Tailwind CSS, shadcn/ui, Bootstrap, or jQuery.

## When to use this skill
- Creating or restyling Vue components in `frontend/src/components/` or views in `frontend/src/views/`
- Modifying design tokens in `frontend/src/tokens/tokens.json`
- Verifying Shop 1 (Gold) vs. Shop 2 (Navy) contrast and employee health certificate badges
- Writing Arabic UI labels, placeholders, currency figures, or API/frontend error messages

## Workflow (Plan -> Read -> Draft -> Build -> Validate)

1. **Plan:** Identify whether the change touches visual tokens, Vue layout/styling, or Arabic copy.
2. **Read:** Load the matching resource file(s) from [Resources](#resources) and check `design-system/e-menu/MASTER.md` before writing CSS or copy.
3. **Draft:** Edit `frontend/src/tokens/tokens.json` (never hand-edit generated `tokens.css` or `tokens.js`), apply semantic CSS custom properties, and enforce Cairo RTL + Arabic copy mechanics.
4. **Build Tokens & Audit:**
   ```powershell
   npm run tokens:build
   npm run ux:audit
   npm run build
   ```
5. **Validate:** Confirm every item on the checklist below passes with `0` audit errors and `0` warnings.

## Task Routing

| Task Type | Resource to Load | Key Focus |
| --- | --- | --- |
| Colors, Shop 1/2 themes, health badges, spacing, Vue stack | [`resources/brand-tokens-summary.md`](resources/brand-tokens-summary.md) | W3C DTCG `tokens.json`, contrast pairs, 4px grid, touch targets |
| Arabic headings, placeholders, `…`, `د.ل`, error copy | [`resources/arabic-voice-tone.md`](resources/arabic-voice-tone.md) | Typographic ellipsis, no imperative verbs, LTR/RTL isolation |

## Validation Checklist

Copy and verify before finishing any UI or copy change:

- [ ] **Actual Stack Only:** Code uses Vue 3 (`^3.5.x`), Vite, Pinia, Hugeicons/Phosphor/inline SVGs (`aria-hidden="true"` on decorative SVGs), and CSS custom properties — zero React, Tailwind, shadcn/ui, or emoji icons
- [ ] **Token Source of Truth:** Token edits happen in `frontend/src/tokens/tokens.json` and regenerate `frontend/src/tokens/tokens.css` and `frontend/src/tokens/tokens.js` via `npm run tokens:build`
- [ ] **Shop Theme Contrast:** Shop 1 (`.shop-theme-shop1`, `#fdb518`) uses dark `#0c0603` text on primary buttons/active pills; Shop 2 (`.shop-theme-shop2`, `#1e3a5f`) uses `#ffffff` text
- [ ] **Warm Neutrals & Health Badges:** Warm cream canvas `#f7f3ec`, warm card `#fffdf9`, primary text `#2c2520`, muted `#685f58`, danger `#dc2626`, and exact green/yellow/red semantics on health certificate badges
- [ ] **Cairo RTL & Mobile Guard:** `'Cairo', sans-serif` with `line-height` >= `1.4` body / `1.25` headings, `letter-spacing: normal` on `:lang(ar)` headings, `16px` font-size on mobile inputs (`<= 768px`), and `>= 48px` (or `>= 44px` expanded hit box) touch targets
- [ ] **Arabic Copy & Errors:** Uses typographic `…` (never `...`), zero imperative placeholder prefixes (`اكتب…` / `أدخل…`), currency `د.ل` with `tabular-nums`, and calm Arabic errors with zero leaked English stack/DB details
- [ ] **Automated Checks:** `npm run ux:audit` exits `0` (`0` errors, `0` warnings) and `npm run build` succeeds

## Resources
- [`resources/brand-tokens-summary.md`](resources/brand-tokens-summary.md) — Exact DTCG hex tokens, shop themes, health cert states, spacing/radii, and Vue styling rules
- [`resources/arabic-voice-tone.md`](resources/arabic-voice-tone.md) — Brand naming, Arabic punctuation (`…`), placeholders, currency (`د.ل`), RTL date/phone handling, and error tone
