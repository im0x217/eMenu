# e-Menu — Complete UI/UX Design Guide
> Compiled from **ui-ux-pro-max** skill across all domains

---

## 1. UX Best Practices — Forms, Checkout & Navigation

### Forms & Checkout Flow

| Guideline | Do ✅ | Don't ❌ | Severity |
|-----------|------|---------|----------|
| **Inline Validation** | Validate on blur for most fields | Validate only on submit | Medium |
| **Submit Feedback** | Show loading → success/error state | No feedback after submit | 🔴 High |
| **Form Labels** | Use `<label>` with `for` attribute or wrap input | Placeholder-only inputs | 🔴 High |

### Mobile Touch & Navigation

| Guideline | Do ✅ | Don't ❌ | Severity |
|-----------|------|---------|----------|
| **Touch Target Size** | Minimum **44×44px** touch targets | Tiny 24px clickable areas | 🔴 High |
| **Touch Spacing** | Minimum **8px gap** between targets | Tightly packed buttons | Medium |
| **Tap Delay** | `touch-action: manipulation` CSS | Default 300ms mobile tap | Medium |
| **Pull to Refresh** | `overscroll-behavior: contain` where not needed | Enable by default everywhere | Low |
| **Back Button** | Preserve navigation history with `history.pushState()` | Break back with `location.replace()` | 🔴 High |
| **Sticky Navigation** | Add padding equal to nav height | Let nav overlap content | Medium |
| **Haptic Feedback** | Use for confirmations & important actions only | Vibrate on every tap | Low |

### Already Implemented ✅
- `overscroll-behavior: none` on html/body
- Safe area padding via `env(safe-area-inset-*)`
- Bottom nav padding compensation (160px)
- `-webkit-tap-highlight-color: transparent`

---

## 2. Icon Library — Recommended: Phosphor Icons

> **Why Phosphor**: Consistent outline style, excellent commerce icon coverage, lightweight, available as SVG sprites or individual imports.

### Key Commerce Icons for e-Menu

| Icon | Use Case | Keywords |
|------|----------|----------|
| `shopping-cart` | Cart tab, add-to-cart | cart, checkout, basket |
| `shopping-bag` | Order confirmation, bag view | purchase, buy, store |
| `tag` | Price labels, discount badges | label, price, discount |
| `percent` | Discount/sale banners | discount, promo, sale |
| `gift` | Loyalty rewards, offers | present, reward, bonus |
| `credit-card` | Payment flow | payment, checkout |
| `currency-dollar` | Price display, totals | money, price, currency |

### Integration Options
```html
<!-- Option A: SVG sprite (recommended for e-Menu's current SVG-inline approach) -->
<!-- Just continue using inline SVGs as currently done -->

<!-- Option B: Phosphor Vue package -->
<!-- npm install @phosphor-icons/vue -->
```

> [!TIP]
> Your current inline SVG approach is already clean and performant. Consider switching to Phosphor only if you need 50+ unique icons to maintain consistency.

---

## 3. GSAP Animation Presets

### 🟢 Subtle — Product Grid Stagger (Recommended First)
Best for: Product cards appearing on category change or page load.

```js
// Product grid card entrance
gsap.from('.product-card', {
  opacity: 0,
  y: 8,
  duration: 0.3,
  stagger: 0.03,
  ease: 'power1.out'
});
```

| | |
|--|--|
| **Trigger** | Load or category switch |
| **Duration** | 250–350ms |
| **Stagger** | 0.03s per item |
| **Do** | Keep stagger ≤ 0.04s for lists > 10 items |
| **Don't** | Stagger > 0.1s on long lists |
| **Vue Note** | Use `onMounted()` or `watch()` with `nextTick()` |

---

### 🟢 Subtle — Scroll Reveal (Sections)
Best for: Cart view sections, account sections appearing as user scrolls.

```js
gsap.from(el, {
  opacity: 0,
  y: 12,
  duration: 0.35,
  ease: 'power1.out',
  scrollTrigger: {
    trigger: el,
    start: 'top 90%',
    toggleActions: 'play none none reverse'
  }
});
```

| | |
|--|--|
| **Do** | Keep y offset small (8–16px) — fade, not slide |
| **Don't** | Hide SEO content by default without no-JS fallback |

---

### 🟡 Standard — Grid Wave Stagger
Best for: Product grid with bento/masonry-like reveal.

```js
gsap.from('.product-card', {
  opacity: 0,
  scale: 0.92,
  y: 16,
  duration: 0.4,
  stagger: {
    each: 0.06,
    from: 'start',
    grid: 'auto' // Infers rows/columns from CSS grid
  },
  ease: 'back.out(1.4)'
});
```

| | |
|--|--|
| **Do** | Use `from: 'center'` for bento layouts |
| **Don't** | Use `back.out` on dense data tables |

---

### 🟡 Standard — Hover Micro-interaction (Cards)
Best for: Product card hover/active states (PC users).

```js
// On mouseenter
gsap.to(el, {
  y: -4,
  scale: 1.02,
  boxShadow: '0 12px 24px rgba(0,0,0,0.12)',
  duration: 0.25,
  ease: 'power2.out'
});

// On mouseleave — always pair reverse!
gsap.to(el, {
  y: 0,
  scale: 1,
  boxShadow: 'var(--shadow-sm)',
  duration: 0.2,
  ease: 'power2.out'
});
```

> [!TIP]
> Use `gsap.quickTo()` for lists with 20+ hoverable cards to avoid GC churn.

---

### 🟢 Subtle — Page Transition
Best for: Vue Router route changes (already using `<transition name="fade">`).

```js
// Enhanced page transition
gsap.to(main, {
  opacity: 0,
  duration: 0.2,
  onComplete: () => {
    navigate();
    gsap.fromTo(main,
      { opacity: 0 },
      { opacity: 1, duration: 0.2 }
    );
  }
});
```

| | |
|--|--|
| **Do** | Preload destination route assets before exit tween finishes |
| **Don't** | Block navigation on animation — cap exit at ~250ms |
| **Key Rule** | Exit animation should always be **faster** than entrance |

---

## 4. Dark Mode Palette Options

Your current brand colors preserved. These palettes are for **optional** future dark mode:

### Option A: Warm Restaurant Dark (Recommended)
Derived from `Restaurant/Food Service` + `Recipe & Cooking App` palettes.

```css
/* Future: @media (prefers-color-scheme: dark) or .dark-mode class */
:root.dark-mode {
  --bg-dark: #1a1410;         /* Deep warm brown-black */
  --bg-card: #2a2118;         /* Warm dark card */
  --border-card: rgba(253, 181, 24, 0.08);
  --text-muted: #a89888;
  color: #f5efe8;             /* Warm cream text */

  /* Brand primaries stay identical */
  --primary-color: #fdb518;   /* Shop1 Gold — unchanged */
  /* --primary-color: #1e3a5f; — Shop2 would use lighter Navy accent */
}
```

### Option B: Food Delivery Warm
From `Food Delivery / On-Demand` palette — orange-forward.

| Role | Light (current) | Dark alternative |
|------|----------------|-----------------|
| Background | `#f7f3ec` | `#1c1510` |
| Card | `#fffdf9` | `#2b2118` |
| Text | `#2c2520` | `#f5efe8` |
| Muted | `#8a8078` | `#a89888` |
| Border | `rgba(44,37,32,0.06)` | `rgba(253,181,24,0.08)` |

> [!IMPORTANT]
> Primary brand colors (`#fdb518` Gold, `#1e3a5f` Navy) remain identical in dark mode. Only backgrounds, surfaces, and text adjust.

---

## 5. Vue.js Stack Guidelines

| Category | Guideline | Do ✅ | Don't ❌ |
|----------|-----------|------|---------|
| **Reactivity** | Use `shallowRef` for large objects | `shallowRef(largeObject)` | `ref(largeObject)` for deep nesting |
| **Performance** | Use `shallowReactive` for flat objects | `shallowReactive({ count: 0 })` | `reactive()` for simple state |
| **Composables** | Name with `use` prefix | `useFetch`, `useAuth`, `useForm` | `getData`, `fetchApi` |

### Already Well-Implemented ✅
- `useShopStore`, `useCartStore`, `useFavoritesStore`, `useAuthStore` — proper composable naming
- Pinia stores with clean separation of concerns
- `computed()` for derived state
- `watch()` for reactive side effects

---

## 6. Admin Dashboard — Page Override

Generated with **density: 8/10** (dense/dashboard) and **variance: 4/10** (balanced).

### Admin-Specific Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Spacing scale | 8–32px | Denser than customer views |
| Card radius | 12px | Slightly tighter than customer 18px |
| Data font | Consider `Fira Code` for order IDs/numbers | Monospace for data clarity |

### Key Admin Effects
- Deal/order movement animations
- Metric counter updates with easing
- Status change highlights (pending → confirmed → ready)
- Quick toggle transitions for stock availability

### Admin Avoid ❌
- Slow data refresh without loading indicators
- No automation or batch action support

> [!NOTE]
> Admin page override saved at: [admin.md](file:///c:/wamp64/www/e-Menu/design-system/e-menu/pages/admin.md) (generate with `--page "admin" --force` when ready to persist)

---

## 7. Visual Style References

### Current Style: Warm & Elevated
Your app currently implements a warm, premium light-mode style with:
- Warm cream canvas (`#f7f3ec`)
- Warm-tinted shadows (`rgba(44,37,32,...)`)
- Frosted glass navigation panels
- Cairo Arabic typography
- Soft card elevation with hover lift

### Alternative Styles Explored

| Style | Vibe | Best For |
|-------|------|----------|
| **Vibrant & Block-based** | Bold, energetic, geometric | Youth-focused, startups |
| **Glassmorphism Mobile** | Frosted panels, depth layers | Premium consumer apps |
| **Soft & Rounded** | Gentle, approachable, pastel | Wellness, lifestyle, food |
| **Minimalist Monochrome** | Editorial, austere, typographic | Luxury fashion, portfolios |

> [!TIP]
> Your current **Warm & Elevated** direction is ideal for a restaurant/food-ordering app. It feels premium and appetizing without being aggressive.

---

## 8. Pre-Delivery Checklist

Before any UI deployment, verify:

- [x] No emojis used as functional icons (SVG throughout)
- [x] `cursor: pointer` on all clickable elements
- [x] Hover states with smooth transitions (200–300ms)
- [x] Light mode text contrast ≥ 4.5:1
- [x] Focus states visible for keyboard navigation
- [x] `prefers-reduced-motion` respected for animations
- [x] Responsive: 375px, 768px breakpoints tested
- [x] No content hidden behind fixed navbars (160px padding)
- [x] No horizontal scroll on mobile
- [x] Safe area insets respected (iOS notch/home indicator)
- [x] `touch-action: manipulation` / tap highlight disabled
- [x] `overscroll-behavior: none` preventing rubber-banding
- [x] Progressive scroll loading / chunked rendering on large product lists

---

## 9. Performance & Progressive Scroll Loading Standard (Infinite Scrolling)

> **Mandatory Habit for All Future Builds**: Large product listings (20+ items) must never mount all DOM nodes at once. Instead, use progressive chunked scroll loading to guarantee 60 FPS and zero frame drops.

### Core Implementation Rules
1. **Initial Display Batch**: Render an initial batch (e.g. `24` items) on modal/view open:
   ```javascript
   const displayLimit = ref(24);
   const displayedProducts = computed(() => filteredProducts.value.slice(0, displayLimit.value));
   ```
2. **Passive Scroll Listener**: Attach `@scroll.passive="onProductsScroll"` to the scroll container:
   ```javascript
   const onProductsScroll = (e) => {
     const target = e.target;
     if (target.scrollTop + target.clientHeight >= target.scrollHeight - 70) {
       if (displayLimit.value < filteredProducts.value.length) {
         displayLimit.value += 24;
       }
     }
   };
   ```
3. **Filter/Search Reset Watcher**: Automatically reset `displayLimit.value = 24` whenever search query or category filters change:
   ```javascript
   watch([searchQuery, categoryFilter], () => {
     displayLimit.value = 24;
   });
   ```
4. **Native Lazy Image Loading**: Always include `loading="lazy"` on all product image thumbnails.
5. **Progressive Loading Indicator**: Show a subtle non-blocking counter hint (`عرض X من Y (مرر للأسفل للمزيد)`) when additional items are available.

---

## 10. Golden Engineering & UX Habits (Living Consistency Registry)

> **Habits Spotted & Preserved**: Every new feature must adhere to these established app-wide habits to maintain 100% visual, architectural, and behavioral consistency across all future updates.

### 🧠 1. Search & Suggestions Dropdown Habit
- **Active-Only Visibility**: Dropdowns must appear strictly when an input is actively focused or clicked (`@focus`, `@click`), never floating open unprompted.
- **Unobtrusive Dismissal**: Always close on `@blur` (with 150-200ms grace period for click registration), `Escape`, or `Tab`.
- **Keyboard Auto-Scroll**: Use `scrollDropdownItemIntoView` on `ArrowUp`/`ArrowDown` so highlighted items always stay in the visible viewport.

### ⌨️ 2. Rapid Keyboard-First POS Flow
- **Continuous Add**: Pressing `Enter` adds the highlighted product and clears the search text without kicking the user out of the input, enabling continuous multi-item addition.
- **Fast Quantity Modifiers**: Support `Space` / `+` to increment and `-` to decrement items in the cart directly from suggestions or catalog cards.

### 🎨 3. Typography & Layout Preservation
- **Preserve Existing Grid Layouts**: Never alter HTML layout containers, flex/grid dimensions, or button positions during style refreshes.
- **Consistent Cairo Typography**: Use `'Cairo', sans-serif` across all modals, labels, and badges with line-height `1.45` to prevent Arabic character clipping.
- **Monospace Financial Data**: Always format currency, order IDs, quantities, and totals using monospace font (`.text-mono`).

### 🔄 4. State & Backend Synchronization
- **Parallel Refresh**: On mutation (create/edit/delete/payment), always refresh associated data in parallel using `Promise.all([fetchOrders(), fetchCustomers(), fetchAnalytics()])`.
- **Non-Blocking Feedback**: Always show immediate user feedback via global toast notifications (`toastStore.show(...)`).

### 🛡️ 5. Zero-Regression Build & Push Standard
- **Always Validate Build**: Run a full production build (`npm run build`) before pushing to verify 0 compiler, SFC, or reference errors.
- **Semantic Commit Messages**: Commit with clear prefixes (`feat:`, `fix:`, `style:`, `refactor:`) to keep Git history clean and traceable.

### 📅 6. Standardized Date Pickers & Relative Shortcuts Habit
- **Always Pair Relative Shortcuts**: Date pickers for operational flows (Orders Management, Fast POS Order, Reports) must always feature instant 1-click relative shortcut pills: **أمس** (Yesterday), **اليوم** (Today), **غداً** (Tomorrow).
- **Custom Popover Consistency**: Use the custom Arabic calendar popover instead of raw browser-native `<input type="date">` to guarantee identical styling, RTL month headers, and day selection across all desktop and mobile browsers.

### 🖨️ 7. Print Pagination & Zero-Gap Rule
- **Granular Row-Level Breaks Only**: Never apply `page-break-inside: avoid;` to large multi-row outer containers (such as category product blocks). This prevents the browser from pushing entire sections to the next page and creating massive blank gaps after header/KPI cards.
- **Natural Parent Flow**: Parent blocks must use `page-break-inside: auto;` while individual rows (`tr`) use `page-break-inside: avoid;` to ensure seamless, continuous multi-page printouts.

### 📄 8. Explicit Print Page Size Enforcement (A4 vs A5)
- **Reconciliation & Analytics Reports**: Must be strictly forced to **A4 Portrait** (`setPrintPageSize('A4 portrait', '6mm 8mm')`).
- **Customer Order & Payment Receipts**: Must be strictly forced to **A5 Portrait** (`setPrintPageSize('A5 portrait', '4mm 6mm')`).
- **Dynamic `@page` Injection**: Use the dynamic print style injection manager before `window.print()` so browser print preview dialogs automatically lock to the correct paper standard on all devices and browsers.

### 📐 9. Adaptive Dynamic Density Scaling Habit
- **Context-Aware Visual Density**: For multi-item document generation (reconciliation sheets, catalog exports), calculate visual weight dynamically based on `totalProductRows + (subcategories * 1.5) + (categories * 2.5)`.
- **4 Progressive Density Tiers**:
  - `spacious` (<= 12 items): Generous luxury 1-page layout, 10pt font, 15pt brand title, 8px padding.
  - `balanced` (13-28 items): Clean, balanced 1-to-2 page layout, 8.5pt font, 12pt KPI cards.
  - `dense` (29-52 items): High-efficiency compression, 7.8pt font, tight margins.
  - `ultra-dense` (> 52 items): Maximum multi-page space utilization, 7.2pt font, 2px table padding.
- **Zero Wasted Space Guarantee**: Automatically expands smaller reports to fill 1 A4 page beautifully without tiny font or giant white bottom voids, and dynamically compresses larger reports so they use the absolute minimum number of pages.

### 🔘 10. POS Quick-Action Button Grid & Brand Orange Accent Habit
- **50/50 Dual Shortcut Split**: In cashier and POS modals, pair operational shortcuts (e.g. "اليوم" and "غداً") directly beneath the main trigger in a 2-column grid (`grid-template-columns: 1fr 1fr; gap: 8px; width: 100%`) for effortless touch-screen cashier tapping.
- **Brand Orange Active Hierarchy**: Inactive state is clean white with subtle gray border (`#ffffff`, `border: 1.5px solid #e2e8f0`); active selected state is illuminated with **Brand Orange** (`background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; box-shadow: 0 3px 12px rgba(217, 119, 6, 0.35);`).
- **Full Cairo Typography**: Strict application of `'Cairo', sans-serif`, `font-weight: 800-900`, `height: 38px`, and `border-radius: 10px`.

### 🔐 11. Customer Account Security, Unique Phone & Password Verification Habit
- **Strict Phone Uniqueness**: Phone numbers are unique identifiers across the platform. Once an account is registered with a phone number, it cannot be registered again by another user.
- **Client-Side Profile Locking**: Customer names and phone numbers are immutable in client views. Customers cannot edit their names or phones in the shop interface; edits are restricted exclusively to administrators in the Admin Panel.
- **Password-Secured Accounts & Modern Setup Alerts**:
  - Accounts are protected with salted SHA-512/PBKDF2 passwords.
  - Legacy or guest accounts without passwords are automatically presented with a clean modern popup modal alert (`SetPasswordModal.vue`) prompting them to set a password to safeguard their order history and data.
- **Dedicated Sign Out & Switch Account Actions**: Replace old inline profile editing inputs with a verified profile summary card, "حساب موثق ✓" badge, and one-tap **"تسجيل الخروج"** / **"تبديل الحساب"** buttons.

### ✏️ 12. Order Editability & Cart-Import Lifecycle Habit
- **Pre-Print Cart Import Window**: Customers can edit any pending unprinted order by tapping **"تعديل الطلب في السلة"** in the Account tab. The order items, delivery date, notes, and price mode are imported directly into the active Cart Store (`cartStore.isEditingOrder = true`).
- **Seamless Store Browsing & Product Additions**: While in Edit Order Mode, customers can freely adjust existing quantities, remove items, or browse the menu normally to add new products to the order.
- **Visual Edit Mode Banner & Actions**: A distinctive Amber banner in the Cart view (`.order-edit-mode-banner`) alerts the user that they are modifying an existing order (`#orderNumber`), providing one-tap shortcuts to browse the store or cancel edit mode.
- **Brand Orange Save & Update CTA**: The primary checkout button transforms into **"حفظ وتحديث الطلب"**, atomically sending the updated items and totals to `PUT /api/customer/orders/:id` and regenerating the updated WhatsApp confirmation receipt.
- **Atomic Print-Lock Guard**: Once the administrator prints the order receipt (`PUT /api/admin/orders/:id/printed`), the order is permanently locked for customer editing and displays the locked indicator (*"تمت طباعة الطلب في المحل ولا يمكن تعديله"*).

### 💬 13. Alphabetical Product Collation in WhatsApp Receipts Habit
- **Arabic Alphabetical Sorting**: All items in generated WhatsApp messages (new orders, order edits, and resends from order history) are sorted alphabetically by product name using Arabic locale-aware collation (`(a.name || '').localeCompare(b.name || '', 'ar', { sensitivity: 'base' })`).
- **Standardized Kitchen & Cashier Review**: Ensures predictable, indexed order listings that allow cashiers and kitchen staff to cross-check items against inventory rapidly without missing any items.

### 🚫 14. Strict "No Emojis" & SVG-First Vector Iconography Habit
- **Zero Emoji Policy**: Emojis must **NEVER** be used anywhere in the user interface (UI text, headings, badges, toasts, alerts, modal headers, action buttons, table rows, or receipts).
- **Pure SVG Vector Icons**: All icons must be rendered using lightweight, crisp inline SVG icons (following Lucide/Feather stroke styling: `viewBox="0 0 24 24"`, `stroke-width="2"`, `stroke="currentColor"`, `stroke-linecap="round"`).
- **Missing Icon Protocol**: If a desired icon or vector asset is not available in the codebase, **NEVER fallback to an emoji**. Immediately pause and ask the user to provide or recommend an icon library/asset.

### 📱 15. Admin Adaptive Mobile Card-View & Bottom-Sheet Ergonomics Habit
- **Dual-Mode Adaptive Layout (Desktop Table ⇄ Mobile Touch Cards)**:
  - On desktop/laptop screens ($\ge 769\text{px}$), data-dense multi-column HTML tables (`.desktop-orders-table`, `.desktop-products-table`, `.desktop-customers-table`) provide high-speed managerial scanning.
  - On mobile/tablet screens ($\le 768\text{px}$), wide tables automatically transform into touch-first **Mobile Cards** (`.mobile-orders-cards-grid`, `.mobile-products-cards-grid`, `.mobile-customers-cards-grid`) eliminating horizontal scrolling friction.
- **Order Cards Composition**:
  - Top header: Order `#` pill, Date/Time, Price Mode tag (`جملة`/`مفرد`), and Print status badge (`مطبوع`).
  - Customer row: Name + Phone with **1-tap direct Call & WhatsApp circular quick action buttons**.
  - Items summary: Compact chips showing item quantities and special notes.
  - Prominent Total Price + Color-coded Payment status badge (`خالص`/`جزئي`/`غير خالص`).
  - Footer action bar: Full-width Arabic status selector (`قيد الانتظار`/`جاهز`/`تم الاستلام`/`ملغي`) + Quick Print and Quick Edit buttons.
- **Mobile Bottom-Sheet Modal Behavior**:
  - On screens $\le 640\text{px}$, modal dialogs smoothly transition into **Bottom Sheets** (`border-radius: 20px 20px 0 0`, `max-height: 92vh`, `animation: slideUpMobile`) for natural thumb reach, avoiding center-screen clipping when mobile keyboards open.
  - Inputs enforce `min-height: 42px` and `font-size: 16px` equivalent to prevent unwanted iOS Safari auto-zooming.

### 📞 16. Libyan WhatsApp Phone Normalization (+218) Habit
- **Local Customer Format Support**: Customers naturally enter phone numbers as `091xxxxxxx`, `092xxxxxxx`, `094xxxxxxx`, `093xxxxxxx`, or `9xxxxxxxx`.
- **Automatic Libyan Country Code Injection**: All WhatsApp chat URL generators (`getLibyanWhatsAppUrl` / `formatLibyanWhatsappNumber` from `src/utils/phone.js`) automatically clean non-digit characters, strip redundant leading zeros (`0` or `00`), and prepend Libya's international calling code `218` (producing `https://wa.me/2189xxxxxxxx`).
- **Universal Cross-Platform WhatsApp Compatibility**: Guarantees that 1-tap WhatsApp buttons on mobile order cards, customer profile hubs, checkout flows, and resend receipts always open valid direct chats on WhatsApp Web, Android WhatsApp, and iOS WhatsApp without invalid phone number errors.

### 🧾 17. Modern Clean Customer Debt Statement & Audit Report Print Habit
- **Executive Header & Branding**: Includes shop logo, business identity (`قسم النواشف` / `حلويات عبمبر الزروق`), formal title (*"كشف حساب ومديونيات العملاء التفصيلي"*), certified status badge (*"تقرير مالي معتمد"*), generation timestamp, and active filter parameters.
- **Top Financial KPIs Summary Grid**: High-level statistical cards displaying **Total Customer Purchases**, **Total Paid / Collected**, **Total Outstanding Debt**, and **Indebted Customers Ratio**.
- **Standard 4-Column Accounting Table**:
  - **العميل (Customer)**: Name & Phone number (in monospace format).
  - **إجمالي المشتريات (Total Purchases)**: Total transaction volume for the selected timeframe.
  - **المدفوع (Paid Amount)**: Total funds received from the customer.
  - **الديون المتبقية (Remaining Debt)**: Clear balance status with color-coded debt pill (`is-debt` vs `0.00 د.ل خالص`).
- **Grand Total Calculation & Authentication Blocks**:
  - Bold summary row calculating the bottom-line sum of Purchases, Paid amounts, and Outstanding Debts.
  - Signature and official stamp authentication blocks for accounting and management verification.
- **Dual Form-Factor Print Engine**: Formatted specifically for A4 portrait with zero-margin suppression of browser header/footer artifacts and clean page-break isolation.

---

### 🌐 18. Mandatory Web Interface Guidelines Compliance Habit (Permanent Standard)
> **Global Mandate**: All future features, modals, components, forms, buttons, and styles across e-Menu MUST strictly adhere to the **Web Interface Guidelines**:

1. **Accessibility Semantics**:
   - **Icon-Only Buttons**: Every button without text MUST have an explicit, descriptive `aria-label` (e.g. `aria-label="إغلاق النافذة"`, `aria-label="مراسلة عبر واتساب"`).
   - **Decorative Assets**: All non-informative SVGs, decorative status dots, and icons MUST have `aria-hidden="true"`.
   - **Interactive Modals**: Modals must declare `role="dialog"`, `aria-modal="true"`, and `:aria-labelledby="titleId"`. Must always support `Escape` key dismissal and backdrop click.
   - **Semantic Tags**: Use `<button>` for user actions and `<a>` for navigational links. Never attach click handlers to unadorned `<div>` elements without semantic role, `tabindex="0"`, and `keydown` support.
   - **Live Notifications**: Async updates, toasts, and status changes must declare `aria-live="polite"`.

2. **Focus & Keyboard Navigation**:
   - **Visible Focus**: Interactive elements must provide crisp `:focus-visible` outline/ring indicators.
   - **No Naked Outlines**: Never apply `outline: none` without a custom `:focus-visible` replacement.
   - **Focus Inset Protection**: Sticky bars, modal backdrops, and bottom action sheets must never conceal focused form controls.

3. **Form Controls & Inputs**:
   - **Meaningful Labels**: Inputs must be paired with visible `<label>` or explicit `aria-label`.
   - **Proper Types & Input Modes**: Use semantic types (`type="tel"`, `type="number"`, `type="text"`) and `inputmode`.
   - **Autocomplete & Spellcheck**: Provide `autocomplete="off"` on non-auth search fields to prevent unwanted browser autofill triggers, and `spellcheck="false"` on phone/code inputs.
   - **Placeholders**: Placeholders must end with an ellipsis character (`…`), not three periods (`...`).

4. **Animations & Transitions**:
   - **Explicit Properties**: Never declare `transition: all`. Always specify explicit animated properties (e.g. `transition: background-color 0.18s ease, transform 0.18s ease;`).
   - **Compositor Friendly**: Animate `transform` and `opacity` only; avoid animating heavy layout geometry (`width`, `height`, `margin`, `padding`).
   - **Reduced Motion**: Respect `prefers-reduced-motion` for all entrance, shimmer, and bounce animations.

5. **Typography & Tabular Data**:
   - **Ellipsis**: Always use the true unicode ellipsis `…` for loading states (`"جاري التحميل…"`) and input placeholders.
   - **Tabular Numerics**: Numerical data columns, prices, quantities, currency totals, dates, and order numbers MUST enforce `font-variant-numeric: tabular-nums` or monospace font (`.text-mono` / `'Fira Code'`).

6. **Content Safety & Robust Layouts**:
   - **Flex Child Inset**: Flex children containing dynamic text must specify `min-width: 0` to enable proper text truncation (`text-truncate` / `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`).
   - **Resilient Empty States**: Never render broken, blank, or misaligned containers when lists or search results are empty. Always provide a clean empty state with an SVG vector icon and guidance text.

---

### 📱 19. Mobile Viewport Compact Density Standard (80% Zoomout Equivalent)
> **Global Mandate**: On mobile viewports ($\le 768\text{px}$), all views, cards, modals, navigation bars, and inputs MUST adopt compact density equivalent to an 80% browser zoom-out:

1. **Root Font Scaling (`:root { font-size: 82.5%; }`)**:
   - Scales all `rem`-based typography and spacing tokens seamlessly by ~18–20% without coordinate shift or RTL overflow clipping (which occurs with native CSS `zoom: 0.8` on `dir="rtl"`).
   - Desktop viewports ($> 768\text{px}$) strictly remain at standard 100% scale (`font-size: 100%`).

2. **iOS Safari Form Control Guard**:
   - All mobile form controls (`input`, `select`, `textarea`) MUST enforce `font-size: 16px !important;` on mobile viewports to prevent iOS Safari from automatically zooming into the page on focus.

3. **Touch Ergonomics**:
   - Even with compact visual density, primary interactive elements maintain minimum accessible tap areas ($\ge 44\times 44\text{px}$ or generous tap padding) with `touch-action: manipulation`.

4. **Component Density Profiles**:
   - **Product Cards & Catalog Grid**: `grid-auto-columns: minmax(172px, 205px); gap: 10px;` allowing two products comfortably side-by-side on phone screens without horizontal scroll obstruction.
   - **Bottom Navigation Bar**: Compact height `calc(54px + env(safe-area-inset-bottom))`, 20px icons, `0.68rem` typography.
   - **Floating Bottom Cart Bar**: Compact padding `0.65rem 1rem`, 14px radius, positioned at `bottom: calc(62px + var(--safe-bottom))`.
   - **Order Cards (Admin & Cart)**: Compact paddings (`9–10px`), 48px product thumbnails, 32px quick-action circles, and 34px action buttons.
   - **POS Fast Order Modal**: Compact section cards, 34px product thumbs, 34px stepper buttons, and tight sticky dock footer.

---

### 🔢 20. Universal Stepper Standard (`[- 1 +]` Step by 1 Integer Stepping)
> **Global Mandate**: All stepper controls (`[- / +]`), quantity adjusters, and increment/decrement buttons across the application MUST strictly step by integer increments (`1`), regardless of whether the product has `allowFloat: true` enabled.

1. **Universal Stepper Invariance**:
   - Tapping `+` or `-` buttons always increments or decrements quantity by exactly `1` across all customer and administrative interfaces (`ProductCard.vue`, `CartView.vue`, and `AdminView.vue` POS & order edit modals).
   - Quantity inputs paired with stepper controls declare `step="1"`.
   - Initial addition of any product to the cart or POS order adds `1` unit.

2. **Float Support via Direct Typing Only**:
   - Products with `allowFloat: true` (e.g., items sold by weight like nuts or sweets) preserve the ability for customers and administrators to type fractional quantities (e.g., `0.5`, `1.25`, `2.75`) directly into the input field.
   - Quantity inputs declare `min="0.1"` with `inputmode="decimal"` to support easy fractional input on mobile devices.
   - All quantity calculations are rounded to 2 decimal places (`Math.round(qty * 100) / 100`) to eliminate IEEE 754 floating-point drift (e.g., `1.4000000000000001`).

3. **Hybrid Stepping Behavior on Fractional Quantities**:
   - When a user steps up (`+`) from a fractional quantity (e.g., `1.5`), the quantity advances by `+1` (to `2.5`), cleanly preserving the fractional offset.
   - When a user steps down (`-`) from a fractional quantity (e.g., `2.5`), it decrements by `-1` (to `1.5`).
   - If reduced to `0` or below the minimum threshold, customer cards remove the item with a warning haptic and morph back to the full-width `"أضف للسلة"` action button.

---

### 📊 21. Analytics Temporal Consistency Standard (Order Rec-Date Baseline)
> **Global Mandate**: All analytical metrics, summaries, trends, and breakdowns in the **Analytics** tab (`kpi`, `revenueTrend`, `priceModeSplit`, `paymentMethodsSplit`, `categorySales`, `topProducts`, `topCustomers`) MUST strictly measure and attribute performance against the **Order Effective Receiving Date (`rec_date`)** using `getOrderEffectiveDateStr(order)`.

1. **Unified Temporal Baseline**:
   - Never mix order creation timestamps, payment transaction timestamps, and order receiving dates within the same analytical dashboard view.
   - When an administrator selects a timeframe (e.g., *Today*, *7 Days*, *30 Days*, or *Custom Dates*), all data cards reflect transactions and revenues belonging to orders scheduled for or received within that designated window.

2. **Payment Methods Distribution Attribution**:
   - **No Payment Timestamp Partitioning**: Payments must NEVER be aggregated by the payment document's `createdAt` timestamp in analytics.
   - **Order-Centric Payment Mapping**: Payments from `paymentsCollection` are mapped via `payment.distributedTo[].orderId` to their corresponding orders. Direct POS payments are mapped via `order.paymentMethod` and `order.paidAmount`.
   - **Deferred Debt Collection Alignment**: If an order was received on September 1st and paid two weeks later on September 15th, its payment amount and method are correctly attributed to September 1st (the day goods were delivered/received), ensuring that daily sales revenue and payment distribution reconcile with 100% accuracy.
   - **Mixed Tender Accounting**: Orders settled using multiple payment methods (e.g., part cash, part card/transfer) correctly allocate each specific tender amount to its respective method breakdown.

3. **Top Financial KPIs Sequence Standard**:
   - In the top KPI metrics grid (`.kpi-grid`), financial metrics MUST follow a logical chronological accounting sequence:
     1. **إجمالي المبيعات (Total Sales)**: Gross volume of all successful/received orders in the timeframe.
     2. **إجمالي المدفوع (Total Paid)**: Total settled funds received across all payment methods (`.text-success`), strictly matching the sum of the payment methods split.
     3. **إجمالي المتبقي (Total Remaining)**: Net unpaid balance / outstanding debts (`.text-danger`), strictly satisfying `totalRemaining = Math.max(0, totalRevenue - totalPaid)`.
     4. **إجمالي الطلبات (Total Orders)**: Total volume of received orders.
     5. **متوسط الطلب (Average Order Value)**: Average revenue per order.
     6. **العملاء النشطون (Active Customers)**: Unique customer count.
   - All numerical KPI values MUST enforce `font-variant-numeric: tabular-nums` (or `.text-mono`) to prevent visual jitter on real-time filter transitions.

---

### ⌨️ 22. Keyboard Navigation Standard: Vertical Arrow Isolation for Table Records
> **Global Mandate**: Vertical navigation keys (`ArrowDown`, `ArrowUp`, `j`, `k`) in administrative views MUST strictly and exclusively traverse tabular records within the active view (`.keyboard-selected-row`). They must NEVER cycle navigation tabs or switch administrative views.

1. **Strict Axis Separation**:
   - **Vertical Traversal (`ArrowDown` / `ArrowUp` / `j` / `k`)**: Reserved solely for intra-view record selection across all administrative tables (`orders`, `products`, `customers`, `categories`, `tags`, `users`). Pressing `ArrowDown` or `ArrowUp` increments/decrements `selectedTableRowIndex`, scrolls the active row smoothly into view (`scrollIntoView({ block: 'nearest', behavior: 'smooth' })`), and never changes the active tab.
   - **Horizontal Traversal (`ArrowLeft` / `ArrowRight` / `[` / `]`)**: Dedicated exclusively to cycling through administrative navigation tabs with boundary wrap-around.
   - **Direct Numerical Access (`Alt+1..9`)**: Instant deterministic switching to specific tabs by index.

2. **Sidebar Focus Isolation & Blur**:
   - Sidebar navigation buttons (`.sidebar-menu .menu-item`) must never retain persistent keyboard focus after click or tab selection.
   - Whenever a user clicks a tab button or invokes `setTab(tab)`, `document.activeElement.blur()` is immediately executed to release focus from the sidebar button.
   - Any accidental focus remaining on a menu item or button is automatically neutralized on `ArrowDown` / `ArrowUp` keystrokes.
   - `handleSidebarKeydown` on `<nav class="sidebar-menu">` must never intercept vertical arrow keys. Only `Home` and `End` may be handled if explicitly focused.

3. **Active Table Row Contract**:
   - When switching tabs, `selectedTableRowIndex` must immediately reset to `0`.
   - Every administrative table row must bind `:class="{ 'keyboard-selected-row': selectedTableRowIndex === idx }"`.
   - Pressing `Enter` when a row is selected opens that record's edit or details modal (`openOrderEditModal`, `openProductModal`, `openCustomerDetails`, `openCategoryModal`, `openTagModal`, `openUserModal`).
   - In the Orders tab, pressing `p` or `P` or `ح` prints the receipt for the currently selected order row.

4. **Table Arrow Auto-Scroll Extension & Page Traversal Contract**:
   - **Extended Auto-Scroll Reach**: When traversing down with `ArrowDown` or `j` on a paginated table (`orders`, `products`, `customers` with `totalPages > 1`), reaching the final row on the page causes the subsequent `ArrowDown` to deselect the row and smoothly scroll the pagination controls (`.admin-pagination-bar`) into view with high-visibility focus styling (`.keyboard-selected-pagination`).
   - **Pagination Bar Active Key Bindings**:
     - `ArrowDown` / `j` / `Enter` / `Space`: Advances to the next page (`goToNextPage()`).
     - `ArrowLeft` (RTL next): Advances to the next page.
     - `ArrowRight` (RTL previous): Regresses to the previous page (`goToPrevPage()`).
     - `ArrowUp` / `k`: Seamlessly ascends back into the table, selecting and scrolling into view the last row of the current page.
     - `Escape`: Neutralizes pagination focus and restores selection to the table's final row.
   - **Dedicated Page Traversal Keyboard Shortcuts**:
     - `PageDown` or `Ctrl+ArrowDown`: Deterministically advances to the next table page from anywhere in the view.
     - `PageUp` or `Ctrl+ArrowUp`: Deterministically regresses to the previous table page from anywhere in the view.
     - Upon page transition, `selectedTableRowIndex` automatically resets to `0`, `paginationFocused` resets to `false`, and the first row of the new page is smoothly brought into view.

---

### 📱 23. iOS Safari PWA & Viewport Safe-Area Ergonomics Standard
> **Global Mandate**: The application must provide isolated, deterministic Home Screen PWA experiences for both the Customer Storefront and Administrative Panel on iOS Safari. Layout containers must never inject artificial bottom space simulating legacy hardware or Android 3-button navigation.

1. **Deterministic PWA Entry Points & WebClip Architecture**:
   - **No Hash Fragments in `start_url`**: iOS Safari WebClip launcher strips URL fragments (`#...`) upon standalone PWA boot. Administrative manifests MUST use explicit query parameters (e.g., `start_url: "/app/?view=admin"`), which WebKit preserves unconditionally.
   - **Immediate Synchronous Head Inspection**: `<head>` includes an inline pre-render bootstrap script that detects `admin` routes or `?view=admin`, immediately setting `<meta name="apple-mobile-web-app-title" content="إدارة الزروق">`, linking `/manifest-admin.json`, and setting `window.location.hash = '#/admin'` prior to Vue initialization.
   - **Server-Side Dedicated Admin Routing**: Express explicitly handles `/admin`, `/admin/*`, and `/app/manifest-admin.json` to ensure clean initial loads and manifest delivery.
   - **Router Navigation Guards**: `router.beforeEach()` validates `?view=admin` or `?mode=admin` and forces immediate redirection to `/admin`.

2. **Zero-Phantom-Space Bottom Ergonomics (Anti-Double-Inset Rule)**:
   - **Single Inset Ownership**: Only the outermost scroll container (`.admin-main` in back-office, `.app-container` in storefront) may declare `env(safe-area-inset-bottom)`. Child components, table wrappers, and tab contents must NEVER duplicate bottom safe-area insets.
   - **Admin Back-Office Bottom Padding**: Administrative views have no persistent bottom navigation bar. `.admin-main` on mobile strictly specifies `padding: 12px 10px calc(20px + env(safe-area-inset-bottom, 0px)) 10px !important;`. Tab contents must NOT add redundant 90px+ artificial voids.
   - **Mobile Header Notch/Island Clearance**: `.admin-mobile-header` must include `padding-top: calc(8px + env(safe-area-inset-top, 0px))` with matching calculated height to guarantee full clearance under iOS Dynamic Island and hardware notches.

---

### 🛍️ 24. Storefront Skeleton Loader & Wholesale Price Visibility Standard
> **Global Mandate**: The storefront menu must provide fluid, zero-layout-shift visual skeleton placeholders during catalog transit. Wholesale pricing tiers must remain strictly invisible to retail customers unless wholesale verification is explicitly unlocked.

1. **Hardware-Accelerated Skeleton Architecture (`ShopView.vue`)**:
   - **Mirror Layout Hierarchy**: When `shopStore.isLoading` is active, the view renders `.shop-skeleton-wrapper` matching the exact visual rhythm of the real menu:
     - Horizontal category pills row (`.skeleton-categories-row`): 6 glass-panel pills with circular icon and label placeholder.
     - Subcategory sections (`.skeleton-sections-wrapper`): 2 stacked rows each with title bar, count badge, and a horizontal 1-row product cards grid (`.subcat-products-grid-1row`).
     - Product card placeholders (`.skeleton-card`): Aspect ratio 4:3 image container, 80% title bar, 55% description bar, price pill placeholder, and 40px action button bar.
   - **GPU-Composited Shimmer Wave**: All skeleton waves MUST use hardware-accelerated transforms (`transform: translate3d(...)`) with `will-change: transform` and `contain: layout paint`. Never animate `background-position` or properties that cause CPU layout reflows.
   - **Accessible Motion Fallback**: Automatically disables wave animations under `@media (prefers-reduced-motion: reduce)`.
   - **Zero Premature Flash**: Real category navigation and product rows remain unrendered until initial catalog data is completely resolved to prevent container pops.

2. **Wholesale Pricing Tier Isolation Standard (`ProductCard.vue` & `ShopView.vue`)**:
   - **Defensive Visibility Guard**: `showBulkPrice` strictly requires:
     1. `price_bulk` to be non-null, non-empty, and defined.
     2. If `purchaseType === 'bulk'`, shows wholesale price.
     3. If `purchaseType === 'both'`, **strictly checks `isBulkMode.value` (`shopStore.isBulkVerified`)**.
     4. Retail customers browsing hybrid items (`purchaseType === 'both'`) will NEVER see bulk pricing pills (`.bulk-price`). Only the regular price pill is displayed.
   - **Wholesale Activation Contrast**: When wholesale mode is verified (`shopStore.isBulkVerified === true`):
     - The header toggle button highlights in vibrant green (`أسعار الجملة: مفعّلة`).
     - The product card renders the wholesale price pill (`.bulk-price.active`) with high visual prominence while dimming the regular price for comparison.
   - **Defensive Storefront Catalog Guard**: `hasBulkProducts` in `ShopView.vue` checks for both `purchaseType` and valid non-empty `price_bulk` values before offering the wholesale toggle button.

---

### 📱 25. Admin Mobile Viewport Isolation: Table Row Selection Suppression, Fluid Grid Minmax, and Unwanted Autofocus Elimination
> **Global Mandate**: On mobile viewports ($\le 768\text{px}$), the back-office management console MUST completely suppress desktop-centric keyboard selection highlights, prevent CSS Grid container track blowout, and eliminate unwanted software keyboard popups upon modal activation.

1. **Table Row & Pagination Selection Suppression**:
   - Keyboard traversal selection indicators (`.keyboard-selected-row`, `.keyboard-selected-pagination`) are designed exclusively for physical hardware keyboards. On mobile touch viewports, they must NEVER display on table rows or pagination controls.
   - All table row and pagination class bindings MUST be guarded with `!isMobileScreen` (e.g. `:class="{ 'keyboard-selected-row': !isMobileScreen && selectedTableRowIndex === idx }"`).
   - `@media (max-width: 768px)` MUST enforce strict CSS resets ensuring `background: transparent !important; outline: none !important; box-shadow: none !important;`.

2. **CSS Grid `minmax(0, 1fr)` Container Track Containment**:
   - CSS Grid tracks defined with `grid-template-columns: 1fr` default to `min-width: auto`, which causes containers like `.charts-grid` to expand and blowout to the largest child element (e.g., multi-step funnels or data tables), creating horizontal overflow on mobile screens.
   - All mobile grid containers MUST explicitly specify `grid-template-columns: minmax(0, 1fr) !important; width: 100% !important; max-width: 100% !important;`.
   - Grid cards (`.chart-card`) MUST specify `min-width: 0 !important; max-width: 100% !important; overflow: hidden !important;`.
   - Tables and horizontal elements within cards must declare `overflow-x: auto !important; -webkit-overflow-scrolling: touch !important;` to ensure internal scrollability without parent container distortion.

3. **Zero-Autofocus Touch Protection (Unwanted Virtual Keyboard Elimination)**:
   - On touch devices, programmatic `.focus()` on form inputs forcibly opens the virtual software keyboard, obstructing viewports and causing disorientation.
   - All modal opening methods (`openProductModal`, `openEditOrderModal`, `openNewOrderModal`, `openCustomerEditModal`, `openCategoryModal`, `openTagModal`, `openUserModal`, `openCommandPalette`), global hotkeys (`/`), and barcode scan handlers MUST be guarded with `if (!isMobileScreen.value && el) el.focus()`.
   - Any HTML `autofocus` attributes MUST bind dynamically: `:autofocus="!isMobileScreen"`.


