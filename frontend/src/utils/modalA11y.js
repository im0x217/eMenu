/**
 * WCAG 2.1 AA Modal Focus Trap, Trigger Focus Restoration & Reference-Counted Scroll Lock
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

let scrollLockCount = 0;
let savedBodyOverflow = '';

export function lockBodyScroll(addModalClass = false) {
  if (typeof document === 'undefined') return;
  if (scrollLockCount === 0) {
    const currentOverflow = document.body.style.overflow || '';
    savedBodyOverflow = currentOverflow === 'hidden' ? '' : currentOverflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLockCount += 1;
  if (addModalClass) {
    document.body.classList.add('modal-open');
  }
}

export function unlockBodyScroll(removeModalClass = false) {
  if (typeof document === 'undefined') return;
  if (scrollLockCount > 0) {
    scrollLockCount -= 1;
  }
  if (scrollLockCount === 0) {
    document.body.style.overflow = savedBodyOverflow;
    savedBodyOverflow = '';
    document.body.classList.remove('modal-open');
  } else if (removeModalClass) {
    // Keep modal-open if another storefront sheet is still mounted
    const stillHasDialog = document.querySelector('.qv-backdrop[role="dialog"], .modal-backdrop[role="dialog"], .confirm-modal-backdrop[role="dialog"]');
    if (!stillHasDialog) {
      document.body.classList.remove('modal-open');
    }
  }
}

export function getFocusableElements(container) {
  if (!container || typeof container.querySelectorAll !== 'function') return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  });
}

export function trapTabKey(event, containerOrSelector) {
  if (!event || event.key !== 'Tab' || typeof document === 'undefined') return false;
  let container = null;
  if (typeof containerOrSelector === 'string') {
    const matches = document.querySelectorAll(containerOrSelector);
    container = matches.length > 0 ? matches[matches.length - 1] : null;
  } else {
    container = containerOrSelector;
  }
  if (!container) return false;

  const focusable = getFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    return true;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (!container.contains(active)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return true;
  }

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
    return true;
  }

  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
    return true;
  }

  return false;
}

export function restoreElementFocus(el) {
  if (!el || typeof el.focus !== 'function' || typeof document === 'undefined') return;
  if (document.contains(el)) {
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  }
}
