<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { useLanguageStore } from '../stores/language';

const router = useRouter();
const route = useRoute();
const cartStore = useCartStore();
const langStore = useLanguageStore();

const showBar = computed(() => {
  // Don't show the bar if we are already on the cart page or if the cart is empty
  return route.path !== '/cart' && cartStore.items.length > 0;
});

const totalItems = computed(() => {
  return cartStore.items.reduce((total, item) => total + item.quantity, 0);
});

const totalPrice = computed(() => cartStore.cartTotal);
</script>

<template>
  <Transition name="slide-up">
    <div v-if="showBar" class="floating-cart-bar glass-panel pulse-animation" @click="router.push('/cart')">
      <div class="cart-summary">
        <div class="cart-icon-group">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="21" r="1"/>
            <circle cx="19" cy="21" r="1"/>
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
          </svg>
          <span class="item-count-badge">{{ totalItems }}</span>
        </div>
        <div class="price-info">
          <span class="price-val">{{ totalPrice }}</span>
          <span class="price-unit">{{ langStore.getCurrency() }}</span>
        </div>
      </div>
      <div class="action-btn">
        <span>{{ langStore.t('cart.title') }}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="rtl-flip">
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
  bottom: calc(74px + var(--safe-bottom)); /* Float just above BottomNav */
  left: 1rem;
  right: 1rem;
  padding: 0.85rem 1.2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 998;
  cursor: pointer;
  box-shadow: var(--shadow-xl), 0 0 12px rgba(var(--primary-color-rgb), 0.12);
  border-color: rgba(var(--primary-color-rgb), 0.15);
  background: rgba(255, 253, 249, 0.97);
  animation: floatPulse 3s infinite alternate;
}

@keyframes floatPulse {
  0% { transform: translateY(0); }
  100% { transform: translateY(-4px); }
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

/* Animations */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.165, 0.84, 0.44, 1), opacity 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>
