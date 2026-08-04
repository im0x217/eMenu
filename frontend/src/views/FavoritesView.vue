<script setup>
import { computed, ref, onMounted } from 'vue';
import { useShopStore } from '../stores/shop';
import { useFavoritesStore } from '../stores/favorites';
import { useAuthStore } from '../stores/auth';
import ProductCard from '../components/ProductCard.vue';

const shopStore = useShopStore();
const favoritesStore = useFavoritesStore();
const authStore = useAuthStore();

const activeShop = computed(() => shopStore.activeShop || 'shop1');
const isLoggedIn = computed(() => authStore.isIdentified());

onMounted(async () => {
  if (shopStore.products.length === 0) {
    await shopStore.fetchMenu();
  }
});

const favoriteProducts = computed(() => {
  const favIds = favoritesStore.getFavoritesList(activeShop.value);
  return shopStore.products.filter(p => favIds.includes(p._id));
});

// Image zoom state
const zoomedImgUrl = ref('');

const openZoomModal = (url) => {
  zoomedImgUrl.value = url;
};

const closeZoomModal = () => {
  zoomedImgUrl.value = '';
};
</script>

<template>
  <div class="favorites-view-container">
    <!-- View Header -->
    <header class="favorites-header glass-panel">
      <div class="header-main">
        <router-link to="/" class="back-home-btn" aria-label="الرجوع للمتجر">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 19 12 12 5"></polyline>
          </svg>
        </router-link>
        <h1 class="header-title">المنتجات المفضلة</h1>
        <span class="favorites-count-badge">{{ favoriteProducts.length }}</span>
      </div>
    </header>

    <!-- Warning Notice if not logged in -->
    <div v-if="!isLoggedIn" class="login-notice-banner glass-panel">
      <svg class="notice-icon-svg" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <div class="notice-text">
        <h3 class="notice-title">المفضلة السحابية غير نشطة</h3>
        <p class="notice-desc">
          يرجى الانتقال إلى صفحة <router-link to="/account" class="notice-link">حسابي</router-link> وتدوين <strong>اسمك ورقم هاتفك</strong> لمزامنة مفضلتك سحابياً والوصول إليها من أي جهاز.
        </p>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="shopStore.isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>جاري تحميل المفضلة…</p>
    </div>

    <!-- Favorites Product Grid -->
    <div v-else-if="favoriteProducts.length > 0" class="favorites-product-grid">
      <ProductCard 
        v-for="(product, idx) in favoriteProducts" 
        :key="product._id" 
        :product="product" 
        :priority="idx < 4 ? 'high' : 'auto'"
        @zoom="openZoomModal"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state glass-panel">
      <div class="empty-icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.7;">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          <line x1="2" y1="2" x2="22" y2="22"/>
        </svg>
      </div>
      <h2 class="empty-title">المفضلة فارغة</h2>
      <p class="empty-desc">اضغط على زر القلب في بطاقات المنتجات لإضافتها هنا والوصول إليها بسرعة لاحقاً.</p>
    </div>

    <!-- Image Zoom Modal -->
    <div v-if="zoomedImgUrl" class="zoom-backdrop" @click="closeZoomModal">
      <div class="zoom-content">
        <img :src="zoomedImgUrl" alt="Zoomed image" class="zoom-image" />
        <button class="zoom-close-btn" @click="closeZoomModal">✕</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.favorites-view-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.favorites-header {
  padding: 0.85rem 1rem;
  background: rgba(255, 253, 249, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-home-btn {
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;
}

.back-home-btn:hover {
  transform: translateX(4px);
}

.header-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-color, #2c2520);
  margin: 0;
}

.favorites-count-badge {
  font-family: 'Cairo', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--primary-color);
  background: rgba(var(--primary-color-rgb), 0.1);
  padding: 3px 10px;
  border-radius: 12px;
}

/* Notice Banner */
.login-notice-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 1rem;
  background: rgba(220, 53, 69, 0.06);
  border: 1px solid rgba(220, 53, 69, 0.25);
  border-radius: 14px;
  color: var(--text-color, #2c2520);
  text-align: right;
}

.notice-icon-svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.notice-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notice-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--primary-color);
  margin: 0;
}

.notice-desc {
  font-size: 0.8rem;
  color: var(--text-muted, #64748b);
  line-height: 1.45;
  margin: 0;
}

.notice-link {
  color: var(--primary-color);
  text-decoration: underline;
  font-weight: 700;
}

.favorites-product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.85rem;
  margin-top: 0.5rem;
}

@media (min-width: 640px) {
  .favorites-product-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.1rem;
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  gap: 12px;
  color: var(--text-muted);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0,0,0,0.1);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3.5rem 1.5rem;
  gap: 10px;
  color: var(--text-muted, #64748b);
  border-radius: 20px;
}

.empty-icon-wrapper {
  margin-bottom: 4px;
}

.empty-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-color, #2c2520);
  margin: 0;
}

.empty-desc {
  font-size: 0.85rem;
  line-height: 1.5;
  max-width: 280px;
  margin: 0;
}

/* Zoom Image Modal */
.zoom-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.95);
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.zoom-image {
  max-width: 100%;
  max-height: 85vh;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  background: #fff;
}

.zoom-close-btn {
  position: absolute;
  top: -40px;
  left: 0;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.8rem;
  cursor: pointer;
}
</style>
