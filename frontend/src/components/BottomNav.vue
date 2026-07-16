<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useShopStore } from '../stores/shop';
import { useCartStore } from '../stores/cart';
import { useFavoritesStore } from '../stores/favorites';

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

const navToShop = () => {
  router.push(`/shop/${activeShop.value}`);
};
</script>

<template>
  <nav class="bottom-nav-bar">
    <!-- Home/Shop Tab -->
    <button 
      class="nav-tab-btn" 
      :class="{ active: route.path.startsWith('/shop/') }" 
      @click="navToShop"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      <span class="tab-label">الرئيسية</span>
    </button>

    <!-- Favorites Tab -->
    <button 
      class="nav-tab-btn" 
      :class="{ active: route.path === '/favorites' }" 
      @click="router.push('/favorites')"
    >
      <div class="icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        </svg>
        <span v-if="totalFavorites > 0" class="badge-count">{{ totalFavorites }}</span>
      </div>
      <span class="tab-label">المفضلة</span>
    </button>

    <!-- Cart Tab -->
    <button 
      class="nav-tab-btn" 
      :class="{ active: route.path === '/cart' }" 
      @click="router.push('/cart')"
    >
      <div class="icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="8" cy="21" r="1"/>
          <circle cx="19" cy="21" r="1"/>
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
        </svg>
        <span v-if="totalCartItems > 0" class="badge-count">{{ totalCartItems }}</span>
      </div>
      <span class="tab-label">السلة</span>
    </button>

    <!-- Account Tab -->
    <button 
      class="nav-tab-btn" 
      :class="{ active: route.path === '/account' }" 
      @click="router.push('/account')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
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
  height: calc(64px + constant(safe-area-inset-bottom, 0px));
  height: calc(64px + env(safe-area-inset-bottom, 0px));
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 999;
  padding-bottom: constant(safe-area-inset-bottom, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  transform: translate3d(0, 0, 0);
  -webkit-transform: translate3d(0, 0, 0);
  will-change: transform;
}

.nav-tab-btn {
  background: transparent;
  border: none;
  color: rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  width: 25%;
  height: 100%;
  transition: color 0.2s, transform 0.2s;
  padding: 8px 0;
}

.nav-tab-btn svg {
  transition: transform 0.2s;
}

.nav-tab-btn.active {
  color: var(--primary-color);
}

.nav-tab-btn.active svg {
  transform: scale(1.1);
  fill: rgba(var(--primary-color-rgb), 0.12);
}

.tab-label {
  font-size: 0.72rem;
  font-weight: 600;
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
  border-radius: 50%;
  font-size: 0.65rem;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  border: 1.5px solid #ffffff;
}
</style>
