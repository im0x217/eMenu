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
  let startY = 0;
  let currentY = 0;
  let lastY = 0;
  let lastTime = 0;
  let velocity = 0; // px/ms

  const getOverlay = () => {
    return sheetEl.closest('.modal-overlay, .confirm-modal-backdrop, .password-modal-overlay, .zoom-backdrop, .command-palette-backdrop') || sheetEl.parentElement;
  };

  // Reset any residual dismissal state from previous lifecycle
  sheetEl.classList.remove('sheet-gesture-dismissing');
  sheetEl.style.transform = '';
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

    isDragging = true;
    startY = e.clientY;
    currentY = 0;
    lastY = e.clientY;
    lastTime = performance.now();
    velocity = 0;

    sheetEl.setPointerCapture?.(e.pointerId);
    gsap.killTweensOf(sheetEl);
    const overlay = getOverlay();
    if (overlay) gsap.killTweensOf(overlay);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;

    const deltaRaw = e.clientY - startY;
    const now = performance.now();
    const dt = Math.max(1, now - lastTime);

    // Track instant velocity (px/ms)
    velocity = (e.clientY - lastY) / dt;
    lastY = e.clientY;
    lastTime = now;

    if (deltaRaw >= 0) {
      // Direct 1:1 downward manipulation
      currentY = deltaRaw;
    } else {
      // Soft rubber-band resistance when pulling upwards
      currentY = rubberband(deltaRaw, 300, 0.45);
    }

    sheetEl.style.transform = `translate3d(0, ${currentY}px, 0)`;

    // Direct manipulation of backdrop opacity while dragging down
    if (deltaRaw > 0) {
      const overlay = getOverlay();
      if (overlay) {
        const progress = Math.min(1, currentY / (sheetEl.clientHeight || 400));
        overlay.style.opacity = `${Math.max(0.15, 1 - progress * 0.75)}`;
      }
    }
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    isDragging = false;

    sheetEl.releasePointerCapture?.(e.pointerId);

    // Calculate projected endpoint using momentum
    const projectedY = currentY + project(velocity * 0.4);

    // Dismiss if pulled down > 80px OR if flicked downward with fluid velocity (RICO Mobile benchmark)
    const shouldDismiss = currentY > 80 || projectedY > 140 || (velocity > 0.55 && currentY > 15);

    const overlay = getOverlay();

    if (shouldDismiss) {
      triggerHaptic('light');
      // Animate downward off-screen smoothly inheriting velocity (Apple Design §5 & §6)
      const absV = Math.abs(velocity);
      const duration = Math.min(0.32, Math.max(0.18, 0.28 / (absV + 0.8)));

      if (overlay) {
        gsap.to(overlay, {
          opacity: 0,
          duration: duration,
          ease: 'power2.in'
        });
      }

      gsap.to(sheetEl, {
        y: '105%',
        duration: duration,
        ease: 'power2.in',
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
    if (!isDragging) return;
    isDragging = false;
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
    const overlay = el.closest('.modal-overlay, .confirm-modal-backdrop, .password-modal-overlay, .zoom-backdrop, .command-palette-backdrop') || el.parentElement;
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

