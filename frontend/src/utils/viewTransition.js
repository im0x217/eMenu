/**
 * Shared-Element Morph Engine (View Transitions API)
 * ---------------------------------------------------
 * Morphs a product photo from its card into the Quick View hero (and back),
 * so the sheet reads as *emerging from* the tapped card instead of popping in
 * (Apple Design §7 — spatial consistency: enter and exit along the same path).
 *
 * Progressive enhancement contract:
 *  - Browsers without `document.startViewTransition`, users with
 *    `prefers-reduced-motion: reduce`, or a missing/off-screen source element
 *    all fall back to the component's existing Vue <Transition> untouched.
 *  - Only one morph runs at a time; a new request skips the running one
 *    (interruptible — never locks input while animating).
 */
import { ref, nextTick } from 'vue';

/** Single view-transition-name shared by the card image and the Quick View hero. */
export const PRODUCT_HERO_VT_NAME = 'product-hero';

/**
 * True while a morph is being captured/animated. Components bind to it to:
 *  - expose the hero `view-transition-name` only during the morph, and
 *  - bypass their own CSS enter/leave transitions so snapshots capture final state.
 */
export const isProductMorphing = ref(false);

const ROOT_CLASS = 'vt-product-morph';
let activeTransition = null;
let morphToken = 0;

export function supportsViewTransitions() {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function';
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** An element is a valid morph endpoint only if it is attached, rendered, and intersects the viewport. */
export function isMorphableElement(el) {
  if (!el || !el.isConnected || typeof el.getBoundingClientRect !== 'function') return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return false;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return rect.bottom > 0 && rect.right > 0 && rect.top < vh && rect.left < vw;
}

export function canMorph(el) {
  return supportsViewTransitions() && !prefersReducedMotion() && isMorphableElement(el);
}

/**
 * Runs `update` inside a shared-element view transition.
 *
 * @param {Object} options
 * @param {HTMLElement|null} options.outgoingEl - Element carrying the name in the *old* snapshot
 *        (the card image when opening). Pass null when the named element is the reactive Quick View hero.
 * @param {() => (HTMLElement|null)} [options.getIncomingEl] - Resolves the element that should carry the
 *        name in the *new* snapshot (the card image when closing). Leave empty when the hero is reactive.
 * @param {() => (void|Promise<void>)} options.update - Synchronous/async state change (open/close).
 * @returns {Promise<boolean>} true if a morph ran, false if it fell back to a plain update.
 */
export async function runProductMorph({ outgoingEl = null, getIncomingEl = null, update }) {
  if (typeof update !== 'function') return false;

  if (activeTransition) {
    try { activeTransition.skipTransition(); } catch { /* already finished */ }
    activeTransition = null;
  }

  const root = document.documentElement;
  let incomingEl = null;

  // Expose the reactive hero name *before* the old snapshot (needed when closing).
  isProductMorphing.value = true;
  root.classList.add(ROOT_CLASS);
  if (outgoingEl) outgoingEl.style.viewTransitionName = PRODUCT_HERO_VT_NAME;
  await nextTick();

  const clearNames = () => {
    if (outgoingEl) outgoingEl.style.viewTransitionName = '';
    if (incomingEl) incomingEl.style.viewTransitionName = '';
  };

  let transition;
  try {
    transition = document.startViewTransition(async () => {
      // Exactly one element may own the name per snapshot: hand it over atomically.
      if (outgoingEl) outgoingEl.style.viewTransitionName = '';
      await update();
      await nextTick();
      if (typeof getIncomingEl === 'function') {
        const candidate = getIncomingEl();
        if (isMorphableElement(candidate)) {
          incomingEl = candidate;
          incomingEl.style.viewTransitionName = PRODUCT_HERO_VT_NAME;
        }
      }
    });
  } catch (err) {
    // Defensive: a throwing startViewTransition must never block the user's action.
    console.warn('[viewTransition] morph unavailable, falling back:', err);
    clearNames();
    root.classList.remove(ROOT_CLASS);
    isProductMorphing.value = false;
    await update();
    return false;
  }

  activeTransition = transition;
  const token = ++morphToken;

  try {
    await transition.finished;
  } catch {
    // Skipped/aborted transitions still applied the DOM update; nothing to recover.
  } finally {
    clearNames();
    // Only the most recent morph owns the global flags; a superseded one must not reset them.
    if (token === morphToken) {
      activeTransition = null;
      root.classList.remove(ROOT_CLASS);
      isProductMorphing.value = false;
    }
  }
  return true;
}

/**
 * Per-view controller that remembers which card image opened the Quick View,
 * so closing can morph the hero back into that exact card (same path in and out).
 *
 * Usage:
 *   const qvMorph = createQuickViewMorph();
 *   qvMorph.open(sourceImgEl, isImageCached(url), () => { ...set open state... });
 *   qvMorph.close(closePayload, () => { ...clear state... });
 */
export function createQuickViewMorph() {
  let sourceEl = null;

  const open = (el, imageReady, applyOpen) => {
    sourceEl = el || null;
    // Morph only when the photo is already decoded; otherwise the hero would morph into a blank shimmer.
    if (imageReady && canMorph(sourceEl)) {
      return runProductMorph({ outgoingEl: sourceEl, update: applyOpen });
    }
    applyOpen();
    return Promise.resolve(false);
  };

  const close = (payload, applyClose) => {
    const target = sourceEl;
    sourceEl = null;
    const viaGesture = payload && payload.via === 'gesture';
    if (!viaGesture && canMorph(target)) {
      return runProductMorph({ getIncomingEl: () => target, update: applyClose });
    }
    applyClose();
    return Promise.resolve(false);
  };

  return { open, close };
}
