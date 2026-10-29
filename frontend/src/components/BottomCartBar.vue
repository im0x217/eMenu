<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { triggerHaptic } from '../utils/haptics';
import { gsap } from 'gsap';

const router = useRouter();
const route = useRoute();
const cartStore = useCartStore();

const isBadgeBouncing = ref(false);
const isShimmering = ref(false);
const qtyTickDir = ref('qty-up');
let bounceTimer = null;
let shimmerTimer = null;

const showBar = computed(() => {
  // Don't show the bar if we are already on the cart page or if the cart is empty
  return route.path !== '/cart' && cartStore.items.length > 0;
});

const totalItems = computed(() => {
  return Math.round(cartStore.items.reduce((total, item) => total + item.quantity, 0) * 100) / 100;
});

const totalPrice = computed(() => cartStore.cartTotal);

// Smooth GSAP Odometer for Cart Total Price
const tweenedPriceObj = { val: Number(cartStore.cartTotal) || 0 };
const animatedPrice = ref(Number(cartStore.cartTotal) || 0);

watch(totalPrice, (newVal) => {
  const target = Number(newVal) || 0;
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    animatedPrice.value = target;
    return;
  }
  gsap.to(tweenedPriceObj, {
    val: target,
    duration: 0.42,
    ease: 'power2.out',
    overwrite: true,
    onUpdate: () => {
      // Preserve integer vs decimal precision cleanly
      animatedPrice.value = Number.isInteger(target)
        ? Math.round(tweenedPriceObj.val)
        : Math.round(tweenedPriceObj.val * 100) / 100;
    }
  });
}, { immediate: true });

watch(totalItems, (newVal, oldVal) => {
  if (newVal !== oldVal && newVal > 0) {
    qtyTickDir.value = newVal >= (oldVal || 0) ? 'qty-up' : 'qty-down';
    isBadgeBouncing.value = true;
    isShimmering.value = true;
    if (bounceTimer) clearTimeout(bounceTimer);
    if (shimmerTimer) clearTimeout(shimmerTimer);
    bounceTimer = setTimeout(() => {
      isBadgeBouncing.value = false;
    }, 380);
    shimmerTimer = setTimeout(() => {
      isShimmering.value = false;
    }, 650);
  }
});

const handleNavigateToCart = () => {
  triggerHaptic('light');
  router.push('/cart');
};
</script>

<template>
  <Transition name="slide-up">
    <div 
      v-if="showBar" 
      class="floating-cart-bar glass-panel" 
      :class="{ 'is-shimmering': isShimmering }"
      role="button"
      tabindex="0"
      :aria-label="cartStore.isEditingOrder ? `متابعة تعديل طلب #${cartStore.editingOrderNumber}` : `عرض السلة، تحتوي على ${totalItems} أصناف بإجمالي ${totalPrice} دينار`"
      @click="handleNavigateToCart"
      @keydown.enter="handleNavigateToCart"
      @keydown.space.prevent="handleNavigateToCart"
    >
      <!-- Specular Shimmer Sweep on Cart Update -->
      <div class="cart-bar-specular-sweep" aria-hidden="true"></div>

      <div class="cart-summary">
        <div class="cart-icon-group">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="8" cy="21" r="1"/>
            <circle cx="19" cy="21" r="1"/>
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
          </svg>
          <span class="item-count-badge" :class="{ 'badge-bounce': isBadgeBouncing }">
            <Transition :name="qtyTickDir" mode="out-in">
              <span :key="totalItems" class="badge-tick-num text-mono">{{ totalItems }}</span>
            </Transition>
          </span>
        </div>
        <div class="price-info">
          <span class="price-val text-mono">{{ animatedPrice }}</span>
          <span class="price-unit">د.ل</span>
        </div>
      </div>
      <div class="action-btn">
        <span>{{ cartStore.isEditingOrder ? `متابعة تعديل طلب #${cartStore.editingOrderNumber}` : 'عرض السلة' }}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="rtl-flip action-arrow-svg" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.floating-cart-bar {
  position: fixed;
  bottom: calc(64px + var(--safe-bottom)); /* Float just above BottomNav */
  left: max(0.75rem, env(safe-area-inset-left, 0px));
  right: max(0.75rem, env(safe-area-inset-right, 0px));
  min-height: 48px;
  padding: 0.65rem 1rem;
  border-radius: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 998;
  cursor: pointer;
  overflow: hidden;
  touch-action: manipulation;
  background: rgba(255, 253, 249, 0.92);
  backdrop-filter: blur(24px) saturate(1.9);
  -webkit-backdrop-filter: blur(24px) saturate(1.9);
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-top: 1px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 12px 32px rgba(44, 37, 32, 0.14), 0 2px 10px rgba(var(--primary-color-rgb), 0.14);
  transition: transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease;
}

.floating-cart-bar.is-shimmering {
  border-color: rgba(var(--primary-color-rgb), 0.45);
  box-shadow: 0 14px 36px rgba(44, 37, 32, 0.18), 0 0 18px rgba(var(--primary-color-rgb), 0.25);
}

.cart-bar-specular-sweep {
  position: absolute;
  top: 0;
  left: -120%;
  width: 75%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.55) 50%,
    transparent 100%
  );
  transform: skewX(-20deg);
  pointer-events: none;
}

.floating-cart-bar.is-shimmering .cart-bar-specular-sweep {
  animation: cartBarSweep 0.62s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes cartBarSweep {
  0% { left: -120%; }
  100% { left: 160%; }
}

.floating-cart-bar:active {
  transform: scale(0.975);
  transition: transform 70ms ease-out;
  box-shadow: 0 4px 14px rgba(44, 37, 32, 0.1);
}

.cart-summary {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.cart-icon-group {
  position: relative;
  color: var(--primary-text-strong, #92400e);
  display: flex;
  align-items: center;
}

.item-count-badge {
  position: absolute;
  top: -8px;
  right: -9px;
  background: #dc2626;
  color: #fff;
  border-radius: 999px;
  font-size: 0.65rem;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  border: 1.5px solid #ffffff;
  box-shadow: 0 2px 6px rgba(230, 57, 70, 0.35);
  overflow: hidden;
}

.badge-tick-num {
  display: inline-block;
  line-height: 1;
}

.item-count-badge.badge-bounce {
  animation: cartBadgeBounce 0.36s cubic-bezier(0.175, 0.885, 0.32, 1.32);
}

@keyframes cartBadgeBounce {
  0% { transform: scale(1); }
  40% { transform: scale(1.38); }
  75% { transform: scale(0.92); }
  100% { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .item-count-badge.badge-bounce,
  .floating-cart-bar.is-shimmering .cart-bar-specular-sweep {
    animation: none !important;
  }
  .slide-up-enter-active,
  .slide-up-leave-active,
  .floating-cart-bar,
  .action-arrow-svg {
    transition: none !important;
  }
}

.price-info {
  font-weight: 800;
  font-size: 1.06rem;
  color: #2c2520;
  display: flex;
  align-items: baseline;
}

.price-unit {
  font-size: 0.8rem;
  margin-right: 3px;
  color: var(--text-muted);
}

.action-btn {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--primary-text-strong, #92400e);
  font-weight: 800;
  font-size: 0.95rem;
}

.action-arrow-svg {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.floating-cart-bar:hover .action-arrow-svg {
  transform: scaleX(-1) translateX(3px);
}

/* Animations - Apple Settle Spring (Response 0.38s, Damping 0.92) */
.slide-up-enter-active {
  transition: transform 0.42s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease-out;
}

.slide-up-leave-active {
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease-in;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate3d(0, 28px, 0) scale(0.96);
}

@media (prefers-reduced-transparency: reduce) {
  .floating-cart-bar {
    background: #fffdf9 !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
}
</style>
