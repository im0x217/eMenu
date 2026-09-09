import { gsap } from 'gsap';
import { triggerHaptic } from './haptics';

/**
 * Executes a parabolic ballistic trajectory animation of a ghost image towards the Cart target.
 * Respects prefers-reduced-motion.
 *
 * @param {HTMLElement} startEl - The source element (e.g. product image or card)
 * @param {string} [customThumbUrl] - Optional image URL to display inside the flying ghost clone
 */
export const flyToCart = (startEl, customThumbUrl = '') => {
  if (typeof window === 'undefined' || !startEl) return;

  // Check reduced motion preference
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  // 1. Locate the destination cart element (floating cart bar or bottom nav cart tab)
  const floatingBar = document.querySelector('.floating-cart-bar');
  const navCartTab = document.querySelector('.bottom-nav-bar .nav-tab-btn:nth-child(3)') || document.querySelector('.bottom-nav-bar');
  const targetEl = (floatingBar && window.getComputedStyle(floatingBar).opacity !== '0') ? floatingBar : navCartTab;

  if (!targetEl) return;

  const startRect = startEl.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  // Starting center point
  const startX = startRect.left + startRect.width / 2;
  const startY = startRect.top + startRect.height / 2;

  // Destination center point
  const targetX = targetRect.left + targetRect.width / 2;
  const targetY = targetRect.top + targetRect.height / 2;

  // 2. Create the flying ghost particle element
  const flyer = document.createElement('div');
  flyer.className = 'fly-to-cart-ghost';
  flyer.style.position = 'fixed';
  flyer.style.zIndex = '99999';
  flyer.style.pointerEvents = 'none';
  flyer.style.left = `${startX - 24}px`;
  flyer.style.top = `${startY - 24}px`;
  flyer.style.width = '48px';
  flyer.style.height = '48px';
  flyer.style.borderRadius = '50%';
  flyer.style.overflow = 'hidden';
  flyer.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.28), 0 0 12px rgba(253, 181, 24, 0.4)';
  flyer.style.border = '2px solid #ffffff';
  flyer.style.background = '#fdb518';
  flyer.style.willChange = 'transform, opacity';

  if (customThumbUrl) {
    const img = document.createElement('img');
    img.src = customThumbUrl;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    flyer.appendChild(img);
  } else {
    flyer.innerHTML = `
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
      </div>
    `;
  }

  document.body.appendChild(flyer);

  // 3. Animate along a parabolic arc using independent X & Y tweens
  const deltaX = targetX - startX;
  const deltaY = targetY - startY;

  // Arc upward trajectory peak
  const arcApex = -Math.min(100, Math.max(50, Math.abs(deltaY) * 0.25));

  const tl = gsap.timeline({
    onComplete: () => {
      if (flyer.parentNode) {
        flyer.parentNode.removeChild(flyer);
      }
      // 4. Spring bounce on target badge / cart bar on impact
      const badge = targetEl.querySelector('.item-count-badge, .badge-count') || targetEl;
      if (badge) {
        gsap.fromTo(badge, 
          { scale: 1.45 }, 
          { scale: 1, duration: 0.4, ease: 'back.out(3.5)' }
        );
      }
      triggerHaptic('success');
    }
  });

  // Scale down and spin gently
  tl.to(flyer, {
    scale: 0.35,
    rotation: 20,
    opacity: 0.85,
    duration: 0.52,
    ease: 'power2.in'
  }, 0);

  // Horizontal motion (uniform / smooth ease)
  tl.to(flyer, {
    x: deltaX,
    duration: 0.52,
    ease: 'power1.inOut'
  }, 0);

  // Vertical motion (parabolic arc: jumps up to apex then accelerates downward into cart)
  tl.to(flyer, {
    y: arcApex,
    duration: 0.22,
    ease: 'power2.out'
  }, 0);

  tl.to(flyer, {
    y: deltaY,
    duration: 0.30,
    ease: 'power2.in'
  }, 0.22);
};
