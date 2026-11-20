# Layout, Platform Modes, Framing, and Multi-Screen Flow

Structural rules for mobile platform fidelity, multi-screen consistency, clean hierarchy, and device presentation.

## Platform Mode Rule

Decide one dominant platform mode first and stay coherent across the entire set (never mix iOS and Android chrome carelessly):

1. **iOS-native premium:** Cleaner top areas, tab-bar clarity, safe-area awareness, generous spacing, restrained chrome, calm hierarchy, native-feeling sheets and cards, polished restraint.
2. **Android-native premium:** Stronger component rhythm, clearer app bar behavior, bottom navigation clarity, sheet logic, crisp card/list structure, slightly firmer layout framing, explicit state clarity.
3. **Cross-platform premium neutral:** Clean safe-area handling, universal mobile navigation patterns, clear hierarchy, minimal platform-specific ornament, broadly buildable premium language.

## Mandatory Screen-First Rule

Generate screen images or flow sets directly for mobile requests. Never:
- Answer with text only.
- Describe what the app could look like without generating images.
- Collapse multiple requested screens into one vague idea board.

Deliver standalone mobile screen images, extra detail renders when clarity demands it, and coherent multi-screen flow sets.

## Screen Count & No-Crop Rules

### Generate Enough Screens
Do not cut screen count out of convenience when it weakens the flow:
- `1 screen` -> `1` screen image; `2` -> `2`; `3` -> `3`; `5` -> `5`; `7` -> `7`.
- `onboarding flow` -> multiple distinct onboarding screens, not one.
- `auth flow` -> separate sign-in, sign-up, and recovery states when useful.
- `app concept` -> meaningful multi-screen set, not a single isolated hero mockup.

Prefer multiple clean, readable screens over one compressed board with tiny text. If a detail is unclear, generate a dedicated detail render or regenerate cleanly.

### Never Crop Old Images
Never zoom or crop into a previously generated image (such as cutting a settings screen or card out of a multi-screen collage) because cropping distorts spacing, proportions, and typography. Always generate a fresh standalone screen or detail render inheriting the exact same design bible and optimized for readability.

## App Design Bible & Multi-Screen Consistency

Before generating screen 2+, lock an internal **App Design Bible** covering all 16 system traits:
- Platform mode, device frame style, and device scale
- Palette logic, background logic, and texture intensity
- Typography mood and type scale rhythm
- Spacing system and corner radius logic
- Icon style, illustration/imagery treatment, image framing, and decorative accents
- Navigation model, card/list behavior, button styling, and shadow language

**Vary between screens:** top-area composition, image-to-text balance, content density, card/list emphasis, CTA placement, visual tempo, module proportions, background treatment, texture intensity, and creative asset usage.

**Never drift:** product identity, design system, mockup quality, or core spacing logic. Screens 3, 4, and 5 must unmistakably belong to the same app.

## Logical Flow Rule

Every multi-screen set must form a believable user journey rather than random unrelated screens:
- `onboarding -> auth -> home`
- `home -> browse -> detail`
- `profile -> settings -> edit profile`
- `cart -> checkout -> confirmation`
- `dashboard -> activity -> detail`
- `welcome -> permissions -> personalized home`

Verify internally: why screen `N+1` follows screen `N`, which action/navigation triggers the transition, and how UI state carries forward.

## Device Mockup Framing Rules

### Default Mockup Presence
By default, show mobile UI inside a clean phone mockup with a visible device border/frame:
- Clean iPhone-style frame for iOS or neutral premium concepts.
- Clean Android-style frame for Android-native concepts.
- Subtle premium generic phone frame for cross-platform concepts.

Omit the visible frame only when the user explicitly requests raw screen-only output, borderless presentation clearly fits better, or the deliverable is isolated UI sheets/assets. Default rule: **phone mockup present, content still primary**.

### Frame Geometry & Polish
- Use one coherent device style and consistent scale across the full series (unless mixed devices are requested).
- Center or align mockups cleanly with balanced, visually even canvas margins on all four sides — never let the phone touch canvas edges or crop awkwardly.
- Keep shadows soft and controlled; keep bezels consistent and subtle so the UI inside remains the hero.
- For multiple devices in one frame: keep identical scale, equal gutter spacing, clean alignment, and avoid random overlap unless intentionally art-directed.
- If frame-free output is justified, maintain equal outer margins and controlled padding around the screen.

## Onboarding & First-Screen Cleanliness

### Onboarding Flows
- Vary layout composition and the image/text/CTA balance across onboarding screens while keeping the journey fast and coherent.
- Keep copy short and first screen extra clean.
- Avoid 3 identical template slides with swapped icons, verbose paragraphs, meaningless giant blobs, fake motivational filler, or premature rating/review prompts.

### First Screen Cleanliness
Whether onboarding, home, auth, welcome, or dashboard, screen 1 must feel calm, immediately readable, and visually focused:
- Use one primary focal point, controlled top area, short headline (1–3 short lines preferred), concise supporting text, and one clear primary CTA.
- Never overload the first viewport with dense stats, chips, pills, overlapping cards, giant text walls, fake enterprise complexity, or a website hero squeezed into a phone.
- Protect text placed over imagery with clean fades, masks, or soft scrims.

## Safe Areas, Navigation, and Clean Layout

### Safe Area & System Regions
Respect real mobile geometry: status bar, top bar/title area, bottom navigation, home indicator, sheet docking zones, and gesture space. Never cram critical UI into unsafe edges or design edge-to-edge posters with no functional chrome.

### Navigation Clarity
Use believable mobile patterns: tab bar/bottom navigation for top-level sections, stack navigation for drill-downs, sheets for secondary tasks, segmented controls for local switching, app bars where helpful, and clear primary vs. secondary action hierarchy. Never overload bottom tabs or bury the main path.

### Clean Layout (Anti-Box-in-Box)
Reject giant nested card stacks, 5 levels of container framing, floating surfaces everywhere, dense mini-widget clutter, fake OS badges, and decorative pill noise. Prefer cleaner surfaces, stronger whitespace, fewer clearer containers, flatter structure, and one strong structural move per zone.

### Screen-to-Screen Variation
Alternate visual tempo across a flow (pairing calmer screens with richer screens) while keeping the unified design bible intact.
