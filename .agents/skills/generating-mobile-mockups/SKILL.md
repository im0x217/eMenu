---
name: generating-mobile-mockups
description: Generates premium, app-native mobile screen concepts and multi-screen flows as images only without outputting code. Use when designing mobile onboarding flows, auth screens, dashboards, commerce flows, profile screens, or multi-screen app mockups inside clean phone frames.
---

# Generating Mobile Mockups

Elite mobile product design art direction for generating premium, app-native, readable mobile screen images and multi-screen flow images.

## Scope & Core Directive

**Images only — never switch into coding mode.** Do not write SwiftUI, React Native, Flutter, HTML, CSS, or implementation instructions.

- **Use for:** onboarding flows, auth flows, home dashboards, profiles, settings, chat, ecommerce, fintech, health/fitness, productivity, social, utilities, multi-screen app concepts, and mobile redesigns.
- **Do not use for:** websites, landing pages, desktop dashboards, image-to-code conversion, or frontend implementation.

**Break standard AI mobile defaults aggressively:** reject fake chart-spam dashboards, phone-shaped websites, purple-blue startup clichés, arbitrary glassmorphism, nested box-in-box cards, sterile flat backgrounds, generic developer icon packs, tiny unreadable text, cloned onboarding templates, and oversized device frames that overwhelm the UI.

## Active Baseline Configuration

Apply these defaults unless the prompt or app category calls for an explicit override:

| Parameter | Default | Scale & Meaning |
| --- | --- | --- |
| `DESIGN_VARIANCE` | `8` | `1` rigid/standard — `10` highly art-directed/varied |
| `VISUAL_DENSITY` | `3` | `1` airy/calm — `10` dense/packed |
| `ART_DIRECTION` | `9` | `1` safe utility UI — `10` bold premium mobile statement |
| `PLATFORM_AWARENESS` | `9` | `1` generic phone UI — `10` strongly app-native |
| `FLOW_VARIETY` | `8` | `1` repeated templates — `10` clearly differentiated rhythm |
| `IMAGE_GENERATION_EAGERNESS` | `10` | `1` minimal screens — `10` generate all needed screens and detail views |
| `SPACING_GENEROSITY` | `9` | `1` tight — `10` spacious and breathable |
| `CLARITY_DISCIPLINE` | `10` | `1` loose vibe — `10` highly readable, structured, clean |
| `IMAGE_CREATIVITY` | `9` | `1` minimal imagery — `10` art-directed imagery and visual treatments |
| `TEXTURE_STRENGTH` | `7` | `1` perfectly flat — `10` rich tactile/grainy/textured surfaces |
| `COLOR_PALETTE_DISCIPLINE` | `10` | `1` muddy/random — `10` clean, controlled, intentional palette |
| `NON_GENERICITY` | `10` | `1` standard template — `10` distinct and product-specific |
| `COMPLEXITY_WITH_CONTROL` | `8` | `1` forced minimalism — `10` rich layered UI that stays clean |
| `CONSISTENCY_STRENGTH` | `10` | `1` loose relationship — `10` unified product design system |
| `FLOW_LOGIC_DISCIPLINE` | `10` | `1` random screen set — `10` logical user journey progression |
| `MOCKUP_FRAME_DISCIPLINE` | `9` | `1` sloppy presentation — `10` clean, even, balanced device framing |
| `TEXT_READABILITY_PRIORITY` | `10` | `1` decorative/tiny text — `10` clearly readable text at normal size |
| `CONTENT_FIRST_MOCKUP_BALANCE` | `10` | `1` frame dominates — `10` frame supports screen, content stays hero |
| `MIN_TEXT_SIZE_DISCIPLINE` | `10` | `1` small text accepted — `10` text never feels small at normal view |

### Prompt Adaptation Rules
- **"clean":** reduce `VISUAL_DENSITY`, raise `CLARITY_DISCIPLINE`.
- **"premium iOS":** bias toward cleaner top safe areas, restrained chrome, calm hierarchy, and native sheets.
- **"Android":** bias toward Material-like component rhythm, clear app bars, bottom nav clarity, and firm framing.
- **"creative social app":** increase visual variance and image creativity while preserving legibility.
- **"fintech", "health", or "productivity":** emphasize trust, calm spacing, structural clarity, and zero fake chart spam.

## Workflow (Plan -> Bible -> Generate -> Validate)

1. **Plan Mode & Direction:** Infer app category, lock one coherent platform mode (`iOS-native premium`, `Android-native premium`, or `cross-platform premium neutral`), and pick art-direction axes from the Style Variation Engine.
2. **Lock Internal App Design Bible:** Fix device frame, device scale, palette logic, typography scale, spacing rhythm, corner radii, custom icon language, texture intensity, and navigation model before generating screens.
3. **Generate Screen-First Outputs:** Produce the full requested screen count (`1`, `2`, `3`, `5`, `7`, or complete flow) as standalone high-readability renders — never crop/zoom old images or collapse a flow into one unreadable collage.
4. **Frame Content-First:** Present UI inside a clean, visible device mockup with balanced outer canvas margins unless the user explicitly asks for raw borderless screens.
5. **Validate & Regenerate:** Audit every screen against the quality checklist below and regenerate any weak, cramped, website-like, or inconsistent screen before finalizing.

## Reference Guides

Load only the reference guide needed for the active design decision:
- [`references/layout-and-flow.md`](references/layout-and-flow.md) — Platform modes, screen-count and no-crop rules, App Design Bible, multi-screen consistency, logical journeys, device frame rules, onboarding, first-screen cleanliness, safe areas, navigation, and anti-box-clutter layout.
- [`references/visual-direction.md`](references/visual-direction.md) — Creative image direction, surface textures, image-behind-text masks, restrained SVG accents, custom iconography, mobile anti-AI-tells, full 9-axis Style Variation Engine, palette rules, and fixed media frames.
- [`references/typography-and-quality.md`](references/typography-and-quality.md) — Short copy rules, readable text scale, type hierarchy, category biases (Fintech, Health, Productivity, Social, Commerce, Wellness), regeneration triggers, 27-point Quality Check, 28-step Response Behavior, and example interpretations.

## Pre-Output Image Generation Checklist

Copy and verify before delivering generated mockup images:

- [ ] Output consists strictly of mobile screen/flow images (zero code, zero implementation steps)
- [ ] One coherent platform mode locked (no careless iOS + Android mixing)
- [ ] Full requested screen count generated as standalone readable images (zero crops/collages)
- [ ] Screen 1 is calm and uncluttered: one primary focal point, short headline, clear primary CTA
- [ ] Visual safe areas respected (status bar, top title bar, bottom nav/home indicator, sheet zones)
- [ ] Layout avoids box-in-box card stacks, decorative pill spam, and website-in-a-phone patterns
- [ ] Text is large enough to read comfortably at normal view size; text over imagery has clean fades/scrims
- [ ] Surfaces carry intentional texture/atmosphere and clean, controlled palette contrast (no purple-blue AI slop)
- [ ] Iconography feels custom and cohesive rather than generic developer icon packs
- [ ] Consistent product Design Bible and balanced, content-first device framing across every screen in the set
- [ ] Any screen failing the [27-point Quality Check](references/typography-and-quality.md#quality-check) has been regenerated
