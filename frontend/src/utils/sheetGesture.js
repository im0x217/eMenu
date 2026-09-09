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

  const handlePointerDown = (e) => {
    // Only respond to primary mouse click or direct touch
    if (e.button && e.button !== 0) return;

    // Do not initiate drag if user tapped inside an input, textarea or button
    const targetTag = (e.target.tagName || '').toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'button' || e.target.closest('button')) {
      return;
    }

    isDragging = true;
    startY = e.clientY;
    currentY = 0;
    lastY = e.clientY;
    lastTime = performance.now();
    velocity = 0;

    sheetEl.setPointerCapture?.(e.pointerId);
    gsap.killTweensOf(sheetEl);
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
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    isDragging = false;

    sheetEl.releasePointerCapture?.(e.pointerId);

    // Calculate projected endpoint using momentum
    const projectedY = currentY + project(velocity * 0.4);

    // Dismiss if pulled down > 90px OR if flicked downward with high velocity
    const shouldDismiss = currentY > 90 || projectedY > 160 || (velocity > 0.65 && currentY > 20);

    if (shouldDismiss) {
      triggerHaptic('light');
      // Animate downward off-screen smoothly inheriting velocity
      const duration = Math.min(0.28, Math.max(0.16, 250 / (Math.abs(velocity) * 1000 + 400)));
      gsap.to(sheetEl, {
        y: '105%',
        duration: duration,
        ease: 'power2.in',
        onComplete: () => {
          onDismiss?.();
          sheetEl.style.transform = '';
        }
      });
    } else {
      // Spring back gracefully to resting position (Apple Damping 0.85)
      gsap.to(sheetEl, {
        y: 0,
        duration: 0.35,
        ease: 'back.out(1.8)',
        onComplete: () => {
          sheetEl.style.transform = '';
        }
      });
    }
  };

  const handlePointerCancel = () => {
    if (!isDragging) return;
    isDragging = false;
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
