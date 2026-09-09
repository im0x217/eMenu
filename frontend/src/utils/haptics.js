/**
 * Web Vibration API tactile haptic utility
 * Follows Apple Design guidelines (SKILL.md §13)
 * - Causality: fires on actual causal event
 * - Harmony: fires synchronously on the tap frame
 * - Utility: reserved for meaningful moments (stepper, add to cart, confirm, clear)
 */

export const triggerHaptic = (type = 'light') => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.vibrate) {
    return;
  }

  try {
    switch (type) {
      case 'light':
        // Sub-perceptual crisp micro-tap for +/- stepper, date pills, tabs
        navigator.vibrate(10);
        break;
      case 'medium':
        // Distinct tactile click for add-to-cart, modal open
        navigator.vibrate(22);
        break;
      case 'success':
        // Satisfying double-tap confirmation pattern for order sent/saved
        navigator.vibrate([15, 50, 25]);
        break;
      case 'warning':
        // Alert vibration for clear cart or delete action
        navigator.vibrate([30, 45, 30]);
        break;
      default:
        navigator.vibrate(15);
        break;
    }
  } catch {
    // Ignore environments where vibrate is restricted or unsupported
  }
};
