import { gsap } from 'gsap';
import { triggerHaptic } from './haptics';

/**
 * Apple Fluid Interface Rubber-banding calculation (from SKILL.md)
 */
function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * Exponential decay momentum endpoint projection (from SKILL.md)
 */
function project(initialVelocity /* px/ms */, decelerationRate = 0.998) {
  return initialVelocity * decelerationRate / (1 - decelerationRate);
}

// Movement (px) required before a press becomes a drag — keeps taps on the hero/body from nudging the sheet.
const DRAG_HYSTERESIS_PX = 6;
// Release velocity is averaged over this trailing window; a single pointermove sample is too noisy.
const VELOCITY_WINDOW_MS = 80;

const OVERLAY_SELECTOR = '.modal-overlay, .confirm-modal-backdrop, .password-modal-overlay, .zoom-backdrop, .command-palette-backdrop, .qv-backdrop';

/** Average velocity (px/ms) across the trailing sample window. */
function computeReleaseVelocity(samples) {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  let first = samples[0];
  for (let i = samples.length - 2; i >= 0; i--) {
    if (last.t - samples[i].t > VELOCITY_WINDOW_MS) break;
    first = samples[i];
  }
  const dt = last.t - first.t;
  return dt > 0 ? (last.y - first.y) / dt : 0;
}

/**
 * Binds 1:1 direct manipulation touch/pointer dragging and velocity-based dismissal to a bottom sheet modal element.
 *
 * @param {HTMLElement} sheetEl - The modal content card element
 * @param {Function} onDismiss - Callback invoked when sheet is dragged/flicked past dismissal threshold
 * @returns {Function} cleanup - Function to unbind event listeners
 */
export const bindSheetGesture = (sheetEl, onDismiss) => {
  if (!sheetEl || typeof window === 'undefined') return () => {};

  let isDragging = false;
  let isPressed = false;
  let startY = 0;
  let currentY = 0;
  let velocity = 0; // px/ms
  let samples = [];
  let activePointerId = null;
  let grabBaseY = 0;

  const getOverlay = () => {
    return sheetEl.closest(OVERLAY_SELECTOR) || sheetEl.parentElement;
  };

  // Reset any residual dismissal state from previous lifecycle
  sheetEl.classList.remove('sheet-gesture-dismissing');
  gsap.set(sheetEl, { clearProps: 'transform' }); // clears GSAP's transform cache as well as the inline style
  sheetEl.style.opacity = '';
  sheetEl.style.visibility = '';
  const initialOverlay = getOverlay();
  if (initialOverlay) {
    initialOverlay.classList.remove('sheet-gesture-dismissing');
    initialOverlay.style.opacity = '';
  }

  const handlePointerDown = (e) => {
    // Only respond to primary mouse click or direct touch
    if (e.button && e.button !== 0) return;

    // Bottom sheet swipe-to-dismiss is strictly a mobile pattern (<= 768px) or touch pointer.
    // Never hijack mouse pointer on desktop PC viewports.
    const isMobileViewport = typeof window !== 'undefined' && window.innerWidth <= 768;
    if (!isMobileViewport && e.pointerType === 'mouse') {
      return;
    }

    // Do not initiate drag if user clicked/tapped inside form controls, dropzones, or interactive elements
    const targetTag = (e.target.tagName || '').toLowerCase();
    if (
      targetTag === 'input' || 
      targetTag === 'textarea' || 
      targetTag === 'button' || 
      targetTag === 'select' || 
      targetTag === 'label' || 
      e.target.closest('button, input, textarea, select, label, .image-upload-dropzone, .image-dropzone, .dropzone-placeholder, .image-preview-container, .hidden-file-input, [role="button"]')
    ) {
      return;
    }

    // If target is inside a scrollable child currently scrolled down, defer to native scroll
    const isGrabHandle = !!e.target.closest('.sheet-grab-handle');
    if (!isGrabHandle) {
      let el = e.target;
      while (el && el !== sheetEl) {
        if (el.scrollHeight > el.clientHeight && el.scrollTop > 0) {
          const overflowY = window.getComputedStyle(el).overflowY;
          if (overflowY === 'auto' || overflowY === 'scroll') {
            return;
          }
        }
        el = el.parentElement;
      }
    }

    // Arm the gesture; it only becomes a drag once it clears the hysteresis threshold.
    isPressed = true;
    isDragging = false;
    activePointerId = e.pointerId;
    startY = e.clientY;
    currentY = 0;
    grabBaseY = 0;
    velocity = 0;
    samples = [{ y: e.clientY, t: performance.now() }];
  };

  const beginDrag = () => {
    isDragging = true;
    sheetEl.setPointerCapture?.(activePointerId);
    // Interruptible: grabbing a settling sheet takes over from its *current* on-screen offset
    // (Apple Design §3 — animate from the presentation value, never jump back to the target).
    gsap.killTweensOf(sheetEl);
    const overlay = getOverlay();
    if (overlay) gsap.killTweensOf(overlay);
    grabBaseY = Number(gsap.getProperty(sheetEl, 'y')) || 0;
  };

  const handlePointerMove = (e) => {
    if (!isPressed || e.pointerId !== activePointerId) return;

    const deltaRaw = e.clientY - startY;
    if (!isDragging) {
      if (Math.abs(deltaRaw) < DRAG_HYSTERESIS_PX) return;
      beginDrag();
    }

    const now = performance.now();
    samples.push({ y: e.clientY, t: now });
    if (samples.length > 12) samples.shift();

    const offset = grabBaseY + deltaRaw;
    if (offset >= 0) {
      // Direct 1:1 downward manipulation
      currentY = offset;
    } else {
      // Soft rubber-band resistance when pulling upwards
      currentY = rubberband(offset, 300, 0.45);
    }

    // Write through GSAP so its transform cache stays in sync with the settle/dismiss tweens.
    gsap.set(sheetEl, { y: currentY });

    // Direct manipulation of backdrop opacity while dragging down
    if (offset > 0) {
      const overlay = getOverlay();
      if (overlay) {
        const progress = Math.min(1, currentY / (sheetEl.clientHeight || 400));
        overlay.style.opacity = `${Math.max(0.15, 1 - progress * 0.75)}`;
      }
    }
  };

  const handlePointerUp = (e) => {
    if (!isPressed || (e && e.pointerId !== activePointerId)) return;
    isPressed = false;
    if (!isDragging) return; // A tap, not a drag: leave the sheet untouched.
    isDragging = false;

    sheetEl.releasePointerCapture?.(e.pointerId);
    velocity = computeReleaseVelocity(samples);
    samples = [];

    // Calculate projected endpoint using momentum
    const projectedY = currentY + project(velocity * 0.4);

    // Dismiss if pulled down > 80px OR if flicked downward with fluid velocity (RICO Mobile benchmark)
    const shouldDismiss = currentY > 80 || projectedY > 140 || (velocity > 0.55 && currentY > 15);

    const overlay = getOverlay();

    if (shouldDismiss) {
      triggerHaptic('light');
      // Apple Design §5 velocity handoff: with a power1.out ease the tween's initial speed is
      // 2 × distance / duration, so solving for duration makes the sheet leave at the finger's speed
      // (no seam between drag and animation). Clamped so slow drags still finish briskly.
      const sheetHeight = sheetEl.getBoundingClientRect().height || window.innerHeight;
      const remaining = Math.max(1, sheetHeight * 1.05 - currentY);
      const handoffSpeed = Math.max(velocity, 1.1); // px/ms floor
      const duration = Math.min(0.34, Math.max(0.14, (2 * remaining) / handoffSpeed / 1000));

      if (overlay) {
        gsap.to(overlay, {
          opacity: 0,
          duration: duration,
          ease: 'power1.out'
        });
      }

      gsap.to(sheetEl, {
        y: '105%',
        duration: duration,
        ease: 'power1.out',
        onComplete: () => {
          sheetEl.classList.add('sheet-gesture-dismissing');
          if (overlay) {
            overlay.classList.add('sheet-gesture-dismissing');
          }
          onDismiss?.();
        }
      });
    } else {
      // Apple Design §4: Critically damped settle (damping 1.0) unless released with upward momentum
      const hasUpwardMomentum = velocity < -0.3;
      if (overlay) {
        gsap.to(overlay, {
          opacity: 1,
          duration: 0.32,
          ease: 'power3.out',
          onComplete: () => {
            overlay.style.opacity = '';
          }
        });
      }
      gsap.to(sheetEl, {
        y: 0,
        duration: 0.32,
        ease: hasUpwardMomentum ? 'back.out(1.2)' : 'power3.out',
        onComplete: () => {
          sheetEl.style.transform = '';
        }
      });
    }
  };

  const handlePointerCancel = () => {
    const wasDragging = isDragging;
    isPressed = false;
    isDragging = false;
    samples = [];
    if (!wasDragging) return;
    const overlay = getOverlay();
    if (overlay) {
      gsap.to(overlay, {
        opacity: 1,
        duration: 0.25,
        ease: 'power1.out',
        onComplete: () => {
          overlay.style.opacity = '';
        }
      });
    }
    gsap.to(sheetEl, {
      y: 0,
      duration: 0.25,
      ease: 'power1.out',
      onComplete: () => {
        sheetEl.style.transform = '';
      }
    });
  };

  sheetEl.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerCancel);

  return () => {
    sheetEl.removeEventListener('pointerdown', handlePointerDown);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerCancel);
  };
};

/**
 * Vue 3 Custom Directive `v-sheet-gesture`
 * Binds fluid bottom sheet swipe-to-dismiss gesture to any modal card.
 * Usage: `v-sheet-gesture="onDismissHandler"`
 */
export const vSheetGesture = {
  mounted(el, binding) {
    el.classList.remove('sheet-gesture-dismissing');
    el.style.transform = '';
    el.style.opacity = '';
    el.style.visibility = '';
    const overlay = el.closest(OVERLAY_SELECTOR) || el.parentElement;
    if (overlay) {
      overlay.classList.remove('sheet-gesture-dismissing');
      overlay.style.opacity = '';
    }
    if (typeof binding.value === 'function') {
      el._currentSheetDismiss = binding.value;
      el._cleanupSheetGesture = bindSheetGesture(el, (arg) => {
        if (typeof el._currentSheetDismiss === 'function') {
          el._currentSheetDismiss(arg);
        }
      });
    }
  },
  updated(el, binding) {
    if (typeof binding.value === 'function') {
      el._currentSheetDismiss = binding.value;
    }
  },
  unmounted(el) {
    if (el._cleanupSheetGesture) {
      el._cleanupSheetGesture();
      delete el._cleanupSheetGesture;
      delete el._currentSheetDismiss;
    }
  }
};

