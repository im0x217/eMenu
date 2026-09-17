<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { triggerHaptic } from '../utils/haptics';

const router = useRouter();
const route = useRoute();
const cartStore = useCartStore();

const showBar = computed(() => {
  // Don't show the bar if we are already on the cart page or if the cart is empty
  return route.path !== '/cart' && cartStore.items.length > 0;
});

const totalItems = computed(() => {
  return cartStore.items.reduce((total, item) => total + item.quantity, 0);
});

const totalPrice = computed(() => cartStore.cartTotal);

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
      role="button"
      tabindex="0"
      :aria-label="cartStore.isEditingOrder ? `متابعة تعديل طلب #${cartStore.editingOrderNumber}` : `عرض السلة، تحتوي على ${totalItems} أصناف بإجمالي ${totalPrice} دينار`"
      @click="handleNavigateToCart"
      @keydown.enter="handleNavigateToCart"
      @keydown.space.prevent="handleNavigateToCart"
    >
      <div class="cart-summary">
        <div class="cart-icon-group">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="8" cy="21" r="1"/>
            <circle cx="19" cy="21" r="1"/>
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
          </svg>
          <span class="item-count-badge">{{ totalItems }}</span>
        </div>
        <div class="price-info">
          <span class="price-val">{{ totalPrice }}</span>
          <span class="price-unit">د.ل</span>
        </div>
      </div>
      <div class="action-btn">
        <span>{{ cartStore.isEditingOrder ? `متابعة تعديل طلب #${cartStore.editingOrderNumber}` : 'عرض السلة' }}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="rtl-flip" aria-hidden="true">
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
  bottom: calc(62px + var(--safe-bottom)); /* Float just above BottomNav */
  left: 0.75rem;
  right: 0.75rem;
  padding: 0.65rem 1rem;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 998;
  cursor: pointer;
  touch-action: manipulation;
  background: rgba(255, 253, 249, 0.90);
  backdrop-filter: blur(24px) saturate(1.8);
  -webkit-backdrop-filter: blur(24px) saturate(1.8);
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-top: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 30px rgba(44, 37, 32, 0.12), 0 2px 8px rgba(var(--primary-color-rgb), 0.1);
  transition: transform 0.12s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
}

.floating-cart-bar:active {
  transform: scale(0.98);
  transition: transform 80ms ease-out;
  box-shadow: 0 4px 14px rgba(44, 37, 32, 0.1);
}

.cart-summary {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cart-icon-group {
  position: relative;
  color: var(--primary-color);
}

.item-count-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #e63946;
  color: #fff;
  border-radius: 50%;
  font-size: 0.65rem;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  border: 1px solid #000;
}

.price-info {
  font-weight: 700;
  font-size: 1.05rem;
}

.price-unit {
  font-size: 0.8rem;
  margin-right: 2px;
  color: var(--text-muted);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--primary-color);
  font-weight: 700;
  font-size: 0.95rem;
}

/* Animations - Apple Settle Spring (Response 0.35s, Damping 1.0) */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(24px) scale(0.97);
}

@media (prefers-reduced-transparency: reduce) {
  .floating-cart-bar {
    background: #fffdf9 !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
}
</style>
