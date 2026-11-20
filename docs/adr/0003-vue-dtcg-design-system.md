# ADR 0003: Vue 3 + W3C DTCG Design System and Brand Skill Governance

- **Status:** Accepted
- **Date:** 2026-11-20

## Context

The e-Menu frontend (`frontend/`) is a production Arabic RTL (`dir="rtl"`) Single-Page Application and PWA built with:
- **Vue 3 (`^3.5.39`)**, **Vite (`^8.1.1`)**, **Pinia (`^3.0.4`)**, **Vue Router (`^4.6.4`)**
- **Icons & Motion:** `@hugeicons/vue`, `@phosphor-icons/vue`, inline SVGs, **GSAP (`^3.15.0`)**, Apple-inspired physical sheet gestures (`frontend/src/utils/sheetGesture.js`), and shared-element View Transitions (`frontend/src/utils/viewTransition.js`)
- **Design Tokens:** W3C DTCG / Tokens Studio source of truth at [`frontend/src/tokens/tokens.json`](../../frontend/src/tokens/tokens.json), compiled via `npm run tokens:build` ([`scripts/build-tokens.js`](../../scripts/build-tokens.js)) into `frontend/src/tokens/tokens.css` and `frontend/src/tokens/tokens.js`
- **Automated WCAG/UX Gate:** `npm run ux:audit` ([`scripts/ux-audit.js`](../../scripts/ux-audit.js)) inspecting all 20 `.vue` files in `components/` and `views/`.

Two structural conflicts emerged during architecture & UX auditing:
1. **Global Brand Skill vs. Actual Stack Conflict:** The global user-level skill `applying-brand-identity` (`~/.gemini/config/skills/applying-brand-identity/`) is a generic placeholder template mandating **React (TypeScript) + Tailwind CSS + shadcn/ui + Lucide React + English Title Case**, which directly contradicts e-Menu's Vue 3 + CSS Custom Properties + Cairo RTL codebase.
2. **Token Drift & Raw Hex Accumulation:**
   - `design-system/e-menu/MASTER.md` drifted from `tokens.json` (`#faf7f2` vs `#f7f3ec`, `#ffffff` vs `#fffdf9`, `#6c757d` vs `#685f58`), and `scripts/build-tokens.js` emitted cyclic self-references (`--touch-target-min: var(--touch-target-min);`).
   - Across non-token files in `frontend/src/`, static inspection reveals **3,157 raw hex color occurrences** (**3,187 total** including `tokens.css`/`tokens.js`), concentrated in `views/AdminView.vue` (1,988), `components/AdminEmployeesTab.vue` (218), `components/InventoryTab.vue` (178), `views/AccountView.vue` (145), `views/CartView.vue` (134), `style.css` (59), and `assets/admin-tabs-shared.css` (57).

## Decision

1. **Stay on Vue 3 + Vite + Custom CSS Variables + W3C DTCG (`tokens.json`):**
   Keep e-Menu on Vue 3 SFCs, custom CSS variables, Cairo RTL typography, GSAP + View Transitions, and the `npm run tokens:build` + `npm run ux:audit` toolchain rather than introducing Tailwind CSS, React, or `shadcn/ui`.

2. **Resolve the Global Brand Skill Mismatch via a Project-Scoped Skill:**
   Do **not** edit global `~/.gemini/config/` skills. Instead, create a workspace-scoped brand authority skill at `.agents/skills/applying-emenu-brand/` (with concise references for tokens and Arabic RTL voice/tone: `د.ل` currency, typographic `…`, no imperative verbs in placeholders, Shop 1 Gold `#fdb518` / `#0c0603` vs Shop 2 Navy `#1e3a5f` / `#ffffff`, and health-certificate badge semantics) and keep `design-system/e-menu/MASTER.md` strictly synchronized with `frontend/src/tokens/tokens.json`.

3. **Three-Tier Token Pipeline Integrity:**
   - `frontend/src/tokens/tokens.json` is the **single source of truth** (`global`, `semantic.shop1/shop2`, `component`).
   - Fix self-referencing CSS aliases in `scripts/build-tokens.js` so `tokens.css` remains strictly acyclic.
   - Maintain **zero Errors and zero Warnings** in `npm run ux:audit` across all Vue components and views (using expanded `::before`/`::after` hit pads `>= 44px` where compact toolbar/stepper chrome cannot grow visually).

4. **Incremental Semantic Token Migration Plan (3,157 Raw Hex Occurrences):**
   Avoid a risky single-PR rewrite of all 3,157 raw hex colors. Instead, migrate incrementally across four priority waves:
   - **Wave 1 (Phase 0 — Immediate):** Reconcile `MASTER.md`, fix `build-tokens.js` cyclic variables, and enforce token usage for all new UI/utilities.
   - **Wave 2 (Customer Storefront):** Expand semantic tokens in `tokens.json` (surface tints, borders, status success/warning/danger, health-cert badge colors) and migrate `style.css`, `ProductCard.vue`, `CartView.vue` (134), `AccountView.vue` (145), and `ShopView.vue`.
   - **Wave 3 (Extracted Admin Tabs):** Migrate `assets/admin-tabs-shared.css` (57), `AdminEmployeesTab.vue` (218), `InventoryTab.vue` (178), `AdminSettingsTab.vue` (36), and `RtlDatePicker.vue` (32).
   - **Wave 4 (`AdminView.vue` Co-Migration):** Replace the 1,988 raw hexes in `AdminView.vue` (31,463 lines) opportunistically as POS/back-office tabs are extracted into standalone components in Phase 3, and add an optional `--strict-tokens` check to `scripts/ux-audit.js` once storefront waves complete.

## Alternatives Considered

- **Rewriting the frontend in React + Tailwind + `shadcn/ui`:** Rejected; offers zero business value to bakery customers or POS cashiers while risking months of RTL, GSAP gesture, PWA iOS manifest injection, and POS keyboard-shortcut regressions.
- **Adding Tailwind CSS alongside existing Vue scoped `<style>` blocks:** Rejected; introduces competing CSS specificity layers, bloats the build chain, and still wouldn't remove the existing 3,157 raw hexes without manual migration.
- **Big-bang regex replacement of all 3,157 hexes in one commit:** Rejected; identical hexes sometimes play different semantic roles (e.g., light badge background vs border vs text) and require visual/contrast review per component.

## Consequences

- **Positive:**
  - Agents and developers have one unambiguous brand authority (`.agents/skills/applying-emenu-brand/` + `tokens.json` + `MASTER.md`) tailored to Vue 3 and Arabic RTL.
  - Zero runtime framework churn; `npm run tokens:build` and `npm run ux:audit` enforce token compilation and WCAG geometry automatically.
- **Tradeoffs / Risks:**
  - Raw hex debt (`AdminView.vue` especially) remains during Phases 1–2 until Wave 2–4 migrations complete; PR reviews must block introducing *new* raw hex literals where semantic tokens already exist.
  - Global `applying-brand-identity` remains visible in user-level agent context, so workspace skill descriptions and `docs/README.md` must clearly route e-Menu UI work to `applying-emenu-brand`.
