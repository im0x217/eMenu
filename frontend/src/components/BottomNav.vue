<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useShopStore } from '../stores/shop';
import { useCartStore } from '../stores/cart';
import { useFavoritesStore } from '../stores/favorites';
import { triggerHaptic } from '../utils/haptics';

const router = useRouter();
const route = useRoute();
const shopStore = useShopStore();
const cartStore = useCartStore();
const favoritesStore = useFavoritesStore();

const activeShop = computed(() => shopStore.activeShop || 'shop1');

const totalCartItems = computed(() => {
  return cartStore.items.reduce((total, item) => total + item.quantity, 0);
});

const totalFavorites = computed(() => {
  return favoritesStore.getFavoritesList(activeShop.value).length;
});

// Active tab index (0: Shop, 1: Favorites, 2: Cart, 3: Account) for sliding liquid glass pill
const activeTabIndex = computed(() => {
  const p = route.path;
  if (p.startsWith('/shop/')) return 0;
  if (p === '/favorites') return 1;
  if (p === '/cart') return 2;
  if (p === '/account') return 3;
  return 0;
});

const favPulse = ref(false);
const cartPulse = ref(false);

watch(totalFavorites, (nv, ov) => {
  if (nv > ov) {
    favPulse.value = true;
    setTimeout(() => { favPulse.value = false; }, 380);
  }
});

watch(totalCartItems, (nv, ov) => {
  if (nv > ov) {
    cartPulse.value = true;
    setTimeout(() => { cartPulse.value = false; }, 380);
  }
});

const navTo = (path) => {
  triggerHaptic('light');
  router.push(path);
};

const navToShop = () => {
  triggerHaptic('light');
  router.push(`/shop/${activeShop.value}`);
};
</script>

<template>
  <nav class="bottom-nav-bar" aria-label="شريط التنقل الرئيسي">
    <!-- Argon 4 Sliding Liquid Glass Active Indicator Pill (RTL 0..3) -->
    <div
      class="nav-active-pill"
      :style="{ transform: `translate3d(${activeTabIndex * -100}%, 0, 0)` }"
      aria-hidden="true"
    >
      <div class="nav-pill-inner"></div>
    </div>

    <!-- Home/Shop Tab -->
    <button 
      class="nav-tab-btn" 
      :class="{ active: activeTabIndex === 0 }" 
      :aria-current="activeTabIndex === 0 ? 'page' : undefined"
      @click="navToShop"
    >
      <div class="icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
      <span class="tab-label">الرئيسية</span>
    </button>

    <!-- Favorites Tab -->
    <button 
      class="nav-tab-btn" 
      :class="{ active: activeTabIndex === 1 }" 
      :aria-current="activeTabIndex === 1 ? 'page' : undefined"
      @click="navTo('/favorites')"
    >
      <div class="icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        </svg>
        <Transition name="badge-pop">
          <span v-if="totalFavorites > 0" class="badge-count" :class="{ 'is-pulsing': favPulse }">{{ totalFavorites }}</span>
        </Transition>
      </div>
      <span class="tab-label">المفضلة</span>
    </button>

    <!-- Cart Tab -->
    <button 
      class="nav-tab-btn" 
      :class="{ active: activeTabIndex === 2 }" 
      :aria-current="activeTabIndex === 2 ? 'page' : undefined"
      @click="navTo('/cart')"
    >
      <div class="icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="8" cy="21" r="1"/>
          <circle cx="19" cy="21" r="1"/>
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
        </svg>
        <Transition name="badge-pop">
          <span v-if="totalCartItems > 0" class="badge-count" :class="{ 'is-pulsing': cartPulse }">{{ totalCartItems }}</span>
        </Transition>
      </div>
      <span class="tab-label">السلة</span>
    </button>

    <!-- Account Tab -->
    <button 
      class="nav-tab-btn" 
      :class="{ active: activeTabIndex === 3 }" 
      :aria-current="activeTabIndex === 3 ? 'page' : undefined"
      @click="navTo('/account')"
    >
      <div class="icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <span class="tab-label">حسابي</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(56px + constant(safe-area-inset-bottom, 0px));
  height: calc(56px + env(safe-area-inset-bottom, 0px));
  background: rgba(255, 253, 249, 0.88);
  backdrop-filter: blur(24px) saturate(1.9);
  -webkit-backdrop-filter: blur(24px) saturate(1.9);
  border-top: 1px solid rgba(255, 255, 255, 0.65);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 999;
  padding-bottom: constant(safe-area-inset-bottom, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
  transform: translate3d(0, 0, 0);
  -webkit-transform: translate3d(0, 0, 0);
  will-change: transform;
  box-shadow: 0 -4px 24px rgba(44, 37, 32, 0.06);
}

/* Sliding Liquid Glass Indicator Pill */
.nav-active-pill {
  position: absolute;
  top: 5px;
  right: env(safe-area-inset-right, 0px);
  width: calc((100% - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)) / 4);
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 0;
  transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.nav-pill-inner {
  width: 68%;
  max-width: 76px;
  height: 100%;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(253, 181, 24, 0.18) 0%, rgba(217, 119, 6, 0.10) 100%);
  border: 1px solid rgba(217, 119, 6, 0.22);
  box-shadow: 0 2px 10px rgba(217, 119, 6, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

:global(.shop-theme-shop2) .nav-pill-inner {
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.14) 0%, rgba(30, 58, 95, 0.08) 100%);
  border-color: rgba(37, 99, 235, 0.22);
  box-shadow: 0 2px 10px rgba(30, 58, 95, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.nav-tab-btn {
  position: relative;
  z-index: 1;
  background: transparent;
  border: none;
  color: #57534e;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  width: 25%;
  height: 100%;
  transition: color 0.25s ease, transform 0.12s cubic-bezier(0.16, 1, 0.3, 1);
  padding: 4px 0;
  touch-action: manipulation;
}

.nav-tab-btn:active {
  transform: scale(0.91);
  transition: transform 70ms ease-out;
}

.nav-tab-btn svg {
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), color 0.25s ease, fill 0.25s ease;
  color: #57534e;
}

.nav-tab-btn.active {
  color: #b45309;
}

:global(.shop-theme-shop2) .nav-tab-btn.active {
  color: #1d4ed8;
}

.nav-tab-btn.active svg {
  transform: translateY(-1.5px) scale(1.1);
  color: #b45309;
  fill: rgba(180, 83, 9, 0.14);
}

:global(.shop-theme-shop2) .nav-tab-btn.active svg {
  color: #1d4ed8;
  fill: rgba(29, 78, 216, 0.14);
}

.tab-label {
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), font-weight 0.2s ease;
}

.nav-tab-btn.active .tab-label {
  font-weight: 800;
  transform: translateY(-0.5px);
}

.icon-wrapper {
  position: relative;
  display: inline-flex;
}

.badge-count {
  position: absolute;
  top: -6px;
  right: -10px;
  background-color: #e63946;
  color: white;
  border-radius: 999px;
  font-size: 0.65rem;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  border: 1.5px solid #ffffff;
  box-shadow: 0 2px 6px rgba(230, 57, 70, 0.35);
}

.badge-count.is-pulsing {
  animation: navBadgePulse 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.35);
}

@keyframes navBadgePulse {
  0% { transform: scale(1); }
  45% { transform: scale(1.42); }
  100% { transform: scale(1); }
}

.badge-pop-enter-active {
  animation: navBadgePopIn 0.32s cubic-bezier(0.175, 0.885, 0.32, 1.35) both;
}

.badge-pop-leave-active {
  animation: navBadgePopOut 0.18s ease-in both;
}

@keyframes navBadgePopIn {
  from {
    opacity: 0;
    transform: scale(0.3);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes navBadgePopOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.3);
  }
}

@media (prefers-reduced-transparency: reduce) {
  .bottom-nav-bar {
    background: #fffdf9 !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
}
</style>
