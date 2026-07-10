<script setup>
import { computed, ref } from 'vue';
import { useShopStore } from '../stores/shop';
import { useFavoritesStore } from '../stores/favorites';
import { useAuthStore } from '../stores/auth';
import ProductCard from '../components/ProductCard.vue';

const shopStore = useShopStore();
const favoritesStore = useFavoritesStore();
const authStore = useAuthStore();

const activeShop = computed(() => shopStore.activeShop || 'shop1');
const isLoggedIn = computed(() => authStore.isIdentified());

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
    <!-- Warning Notice if not logged in -->
    <div v-if="!isLoggedIn" class="login-notice-banner glass-panel">
      <span class="notice-icon">⚠️</span>
      <div class="notice-text">
        <h3 class="notice-title">المفضلة السحابية غير نشطة</h3>
        <p class="notice-desc">
          يرجى الانتقال إلى صفحة <router-link to="/account" class="notice-link">حسابي</router-link> وتدوين <strong>اسمك ورقم هاتفك/نشاطك التجاري</strong> لحفظ ومزامنة تفضيلاتك سحابياً والوصول إليها من أي جهاز.
        </p>
      </div>
    </div>

    <!-- Product Grid -->
    <div v-if="favoriteProducts.length > 0" class="product-grid">
      <ProductCard 
        v-for="product in favoriteProducts" 
        :key="product._id" 
        :product="product" 
        @zoom="openZoomModal"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state glass-panel">
      <div class="empty-icon-wrapper">💔</div>
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

.view-header {
  padding: 1.25rem 1rem;
  text-align: center;
}

.view-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 2px;
}

.view-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Notice Banner */
.login-notice-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 1rem;
  background: rgba(220, 53, 69, 0.05);
  border: 1px solid rgba(220, 53, 69, 0.2);
  border-radius: 12px;
  color: #fff;
  text-align: right;
  margin-bottom: 0.5rem;
}

.notice-icon {
  font-size: 1.4rem;
  line-height: 1;
}

.notice-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notice-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--primary-color);
  margin: 0;
}

.notice-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin: 0;
}

.notice-link {
  color: var(--primary-color);
  text-decoration: underline;
  font-weight: 700;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3.5rem 1.5rem;
  gap: 10px;
  color: var(--text-muted);
}

.empty-icon-wrapper {
  font-size: 3rem;
  line-height: 1;
}

.empty-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
}

.empty-desc {
  font-size: 0.85rem;
  line-height: 1.5;
  max-width: 280px;
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
