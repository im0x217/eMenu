---
trigger: always_on
---

# UI/UX & Design System Behavioral Standards
*Learned and synthesized from RICO Mobile UI, Mobile-UI-Design, Tokens Studio (W3C DTCG), and Empirical UX Research Datasets.*

All UI components, views, styles, and interaction workflows in this project must adhere to the following empirically grounded design and accessibility standards:

---

## 1. Design Token Architecture & Spatial Rhythm (Tokens Studio / DTCG Standard)
- **3-Tier Token Hierarchy**:
  - **Primitive / Global**: Raw values (palette hex codes, 4px grid increments, Cairo font families).
  - **Semantic / Alias**: Purpose-driven tokens (`--bg-primary`, `--surface-card`, `--text-main`, `--text-muted`, `--border-subtle`, `--accent-primary`).
  - **Component-Scoped**: Specific overrides (`--card-radius`, `--shimmer-wave-speed`, `--sheet-handle-width`).
- **4px / 8px Spatial Grid**:
  - All spacing (`margin`, `padding`, `gap`, element dimensions) must follow multiples of 4px (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`). Never use arbitrary odd numbers (e.g. `13px`, `27px`).
- **Cairo Arabic Typography Geometry**:
  - Arabic scripts (Cairo font) feature high ascenders and deep descenders. Always specify a generous `line-height` ($\ge 1.4$ for body text, $\ge 1.25$ for titles) and adequate top/bottom padding to prevent glyph clipping.
  - Inputs, selects, and textareas on mobile viewports ($\le 768\text{px}$) must strictly enforce `font-size: 16px` to prevent iOS Safari auto-zoom.

---

## 2. Mobile Ergonomics & Spatial Bounding Boxes (RICO & Mobile-UI-Design Standards)
- **Strict Touch Target Geometry**:
  - Every interactive element (buttons, icon toggles, stepper counters, dropdowns) must provide a minimum tappable bounding box of **$48 \times 48\text{px}$** (or minimum $44 \times 44\text{px}$ with surrounding padding clearance).
  - Interactive touch siblings must maintain at least **$8\text{px}$ clearance** to eliminate accidental touch errors.
- **Thumb-Zone Optimization**:
  - On mobile screens, primary user actions (Floating Cart Bar, Checkout button, Quantity Steppers, Bottom Sheet grab handles) must be situated in the natural bottom thumb-reach zone.
- **Horizontal Scroll Ergonomics (`subcat-products-grid-1row`)**:
  - Single horizontal scroll rows must offer momentum scrolling (`-webkit-overflow-scrolling: touch`), edge snap alignment, and mouse drag-to-scroll support for desktop users.
  - The final card in a visible horizontal row must partially "peek" past the screen edge ($15\% - 25\%$) to visually communicate scrollability.

---

## 3. WCAG 2.1 AA Accessibility & Error Prevention (Empirical UX Datasets)
- **High Contrast Ratio**:
  - Maintain a minimum contrast ratio of **4.5:1** for normal text and **3:1** for large text / UI borders against their dark slate backgrounds (`#0f172a`, `#1e293b`).
- **Accessible Screen Reader Contracts**:
  - Every icon-only `<button>` or `<a>` tag must carry an explicit, descriptive Arabic `aria-label`.
  - All decorative SVGs must have `aria-hidden="true"`.
  - Form inputs must have matching `<label>` elements or descriptive `aria-label` / `placeholder`.
- **Keyboard & Modal Focus Management**:
  - All modal dialogs and bottom sheets must trap `Tab` focus within the active overlay while open.
  - Pressing `Escape` must close the top-most modal and cleanly restore user focus to the triggering element.
  - Background body scrolling must be locked (`overflow: hidden`) during modal presentation.

---

## 4. Perceptual Performance & Motion Design
- **Zero Premature Skeleton Expirations**:
  - Skeleton waves and shimmer placeholders must remain active for the genuine transit duration of remote network assets. Never use arbitrary `setTimeout` overrides that reveal raw containers or grey blanks before assets are decoded.
- **Hardware-Accelerated Transforms**:
  - All animations (shimmer waves, modal slides, drawer sheets) must strictly use GPU-composited properties (`transform: translate3d(...)`, `opacity`) with `will-change` hints and `contain: layout paint` where appropriate.
- **Accessible Motion (`prefers-reduced-motion`)**:
  - Always provide graceful fallbacks disabling or shortening continuous animations when the user has requested reduced motion.
