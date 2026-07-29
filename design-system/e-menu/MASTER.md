# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** e-Menu
**Generated:** 2026-07-29 21:19:19
**Category:** Restaurant/Food Service

---

## Global Rules

### Color Palette

Your brand supports dynamic multi-shop theme branding:

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| **Shop 1 Primary (Gold)** | `#fdb518` | `--primary-color` | Warm Gold accent & CTAs for Shop 1 |
| **Shop 2 Primary (Navy)** | `#1e3a5f` | `--primary-color` | Deep Navy Blue accent & CTAs for Shop 2 |
| **Background (Light)** | `#faf7f2` | `--bg-dark` | Warm cream background canvas |
| **Card Background** | `#ffffff` | `--bg-card` | Clean white elevated panels |
| **Foreground / Text** | `#2c2520` | `--color-foreground` | Rich dark brown primary typography |
| **Muted Text** | `#6c757d` | `--text-muted` | Secondary details & metadata |
| **Card Border** | `rgba(0,0,0,0.05)` | `--border-card` | Subtle subtle card outline |

**Color Notes:** Preserved original e-Menu multi-tenant brand identities: Shop 1 (Warm Gold `#fdb518`) and Shop 2 (Deep Navy `#1e3a5f`), set on a warm cream canvas `#faf7f2`.

### Typography

- **Primary Font:** Cairo (`'Cairo', sans-serif`)
- **Mood:** Modern, RTL-native, clean culinary digital menu
- **Google Fonts:** [Cairo](https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
```

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(44,37,32,0.04), 0 1px 2px rgba(44,37,32,0.03)` | Subtle lift |
| `--shadow-md` | `0 4px 12px rgba(44,37,32,0.06), 0 1px 4px rgba(44,37,32,0.04)` | Cards, buttons |
| `--shadow-lg` | `0 8px 24px rgba(44,37,32,0.08), 0 2px 8px rgba(44,37,32,0.04)` | Modals, dropdowns |
| `--shadow-xl` | `0 16px 40px rgba(44,37,32,0.1), 0 4px 12px rgba(44,37,32,0.05)` | Floating elements, featured cards |

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
  font-family: 'Cairo', sans-serif;
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
  background: var(--bg-card); /* #fffdf9 — warm white */
  border: 1px solid var(--border-card);
  border-radius: 18px;
  box-shadow: var(--shadow-md);
  transition: box-shadow 0.25s ease, border-color 0.25s ease;
}

.glass-panel:hover {
  box-shadow: var(--shadow-lg);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #DC2626;
  outline: none;
  box-shadow: 0 0 0 3px #DC262620;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Vibrant & Block-based

**Keywords:** Bold, energetic, playful, block layout, geometric shapes, high color contrast, duotone, modern, energetic

**Best For:** Startups, creative agencies, gaming, social media, youth-focused, entertainment, consumer

**Key Effects:** Large sections (48px+ gaps), animated patterns, bold hover (color shift), scroll-snap, large type (32px+), 200-300ms

### Page Pattern

**Pattern Name:** Enterprise Gateway

- **Conversion Strategy:** Path selection (I am a...). Mega menu navigation. Trust signals prominent.
- **CTA Placement:** Contact Sales (Primary) + Login (Secondary)
- **Section Order:** 1. Hero (Video/Mission), 2. Solutions by Industry, 3. Solutions by Role, 4. Client Logos, 5. Contact Sales

---

## Anti-Patterns (Do NOT Use)

- ❌ Low-quality imagery
- ❌ Outdated hours

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
