<script setup>
import { computed, ref } from 'vue';
import { useShopStore } from '../stores/shop';
import { useCartStore } from '../stores/cart';
import { useFavoritesStore } from '../stores/favorites';
import { useToastStore } from '../stores/toast';
import { useAuthStore } from '../stores/auth';
import CategoryIcon from './CategoryIcon.vue';
import { gsap } from 'gsap';

const heartBtnRef = ref(null);
const addBtnRef = ref(null);

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['zoom']);

const shopStore = useShopStore();
const cartStore = useCartStore();
const favoritesStore = useFavoritesStore();
const toastStore = useToastStore();
const authStore = useAuthStore();

const activeShop = computed(() => shopStore.activeShop || 'shop1');
const isBulkMode = computed(() => shopStore.isBulkVerified);

// Check if we should show regular/bulk prices based on purchaseType & shop settings
const showRegularPrice = computed(() => {
  return props.product.purchaseType === 'regular' || props.product.purchaseType === 'both' || !props.product.purchaseType;
});

const showBulkPrice = computed(() => {
  return props.product.purchaseType === 'bulk' || props.product.purchaseType === 'both';
});

// Quantity controls removed - products add with quantity 1 by default
const isSaved = computed(() => favoritesStore.isFavorite(activeShop.value, props.product._id));

const toggleSave = () => {
  if (heartBtnRef.value) {
    gsap.fromTo(heartBtnRef.value, 
      { scale: 0.7 }, 
      { scale: 1, duration: 0.45, ease: 'back.out(2.5)' }
    );
  }
  favoritesStore.toggleFavorite(activeShop.value, props.product._id);
  const isNowFav = favoritesStore.isFavorite(activeShop.value, props.product._id);
  
  if (!authStore.isIdentified()) {
    if (isNowFav) {
      toastStore.show('تم الحفظ محلياً! يرجى تسجيل الدخول باسمك ورقم نشاطك التجاري من صفحة "حسابي" لتفعيل وحفظ المفضلة سحابياً ⚠️');
    } else {
      toastStore.show('تم إزالة المنتج من المفضلة');
    }
  } else {
    if (isNowFav) {
      toastStore.show('تم إضافة المنتج إلى المفضلة ❤️');
    } else {
      toastStore.show('تم إزالة المنتج من المفضلة');
    }
  }
};

const handleAddToCart = () => {
  if (addBtnRef.value) {
    gsap.fromTo(addBtnRef.value,
      { scale: 0.93 },
      { scale: 1, duration: 0.3, ease: 'back.out(2)' }
    );
  }
  // Determine pricing mode to add to cart
  let mode = 'regular';
  if (isBulkMode.value && showBulkPrice.value) {
    mode = 'bulk';
  } else if (props.product.purchaseType === 'bulk') {
    mode = 'bulk';
  }
  
  try {
    cartStore.addToCart(props.product, activeShop.value, mode, 1);
    toastStore.show('تم إضافة المنتج إلى السلة بنجاح! 🛒');
  } catch (err) {
    toastStore.show(err.message, 'error');
  }
};

const getImageUrl = () => {
  return props.product.imgSigned || props.product.img || '/res/logo.jpg';
};

const activeTagDetails = computed(() => {
  if (!props.product.tags || props.product.tags.length === 0) return null;
  const tagName = props.product.tags[0];
  const found = shopStore.tags.find(t => t.name === tagName);
  return found || { name: tagName, color: 'default', icon: 'trophy' };
});

const getIconUrl = (iconKey) => {
  const map = {
    heart: 'sprout',
    star: 'medal',
    sparkles: 'diamond',
    fire: 'starburst_pct',
    tag: 'tag_pct',
    gift: 'gift'
  };
  const key = map[iconKey] || iconKey || 'trophy';
  return `/res/tags/${key}.png`;
};
</script>

<template>
  <div class="product-card glass-panel card-hover-effect" :class="{ 'not-available': product.available === false }">
    <!-- Favorite Heart Toggle -->
    <button ref="heartBtnRef" class="favorite-btn" @click.stop="toggleSave" aria-label="أضف للمفضلة">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        :fill="isSaved ? 'var(--primary-color)' : 'none'" 
        :stroke="isSaved ? 'var(--primary-color)' : 'rgba(0,0,0,0.4)'"
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round"
        class="heart-icon"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>
    </button>

    <!-- Product Image -->
    <div class="img-wrapper" @click="emit('zoom', getImageUrl())">
      <!-- Tag Banner -->
      <div v-if="activeTagDetails" class="product-tag-banner" :class="'tag-' + activeTagDetails.color">
        <CategoryIcon :icon="activeTagDetails.icon" :name="activeTagDetails.name" size="14" />
        <span>{{ activeTagDetails.name }}</span>
      </div>

      <img 
        :src="getImageUrl()" 
        :alt="product.name" 
        loading="lazy"
        width="300"
        height="300"
        class="product-image"
        @error="$event.target.src = '/res/logo.jpg'"
      />
      <div v-if="product.available === false" class="not-available-overlay">
        <span>غير متوفر</span>
      </div>
    </div>

    <!-- Product Details -->
    <div class="product-info">
      <h3 class="product-title">{{ product.name }}</h3>
      <p class="product-desc" v-if="product.desc">{{ product.desc }}</p>
      
      <!-- Price displays -->
      <div class="prices-row">
        <!-- Regular Price -->
        <div v-if="showRegularPrice" class="price-pill regular-price" :class="{ active: !isBulkMode }">
          <span class="price-val">{{ product.price_regular || product.price }}</span>
          <span class="price-unit">د.ل</span>
        </div>

        <!-- Bulk Price -->
        <div v-if="showBulkPrice" class="price-pill bulk-price" :class="{ active: isBulkMode }">
          <span class="price-label">جملة: </span>
          <span class="price-val">{{ product.price_bulk }}</span>
          <span class="price-unit">د.ل</span>
        </div>
      </div>

      <!-- Add Button (Wide format) -->
      <div class="actions-row" v-if="product.available !== false">
        <button ref="addBtnRef" class="add-btn-wide" @click="handleAddToCart" aria-label="إضافة إلى السلة">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px;">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>أضف للسلة</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-card {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  background: var(--bg-card);
}

.product-card.not-available {
  opacity: 0.6;
}

.favorite-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  background: rgba(255, 253, 249, 0.85);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, background-color 0.2s ease;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 2px 8px rgba(44, 37, 32, 0.08);
}

.favorite-btn:hover {
  transform: scale(1.1);
  background: rgba(255, 253, 249, 0.95);
}

.heart-icon {
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), fill 0.3s;
}

.favorite-btn:active .heart-icon {
  transform: scale(0.8);
}

.img-wrapper {
  position: relative;
  width: 100%;
  padding-top: 80%; /* 5:4 aspect ratio */
  overflow: hidden;
  background: #f5f0ea;
  cursor: zoom-in;
}

.product-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.product-card:hover .product-image {
  transform: scale(1.05);
}

.not-available-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
}

/* Tag Banner Styles */
.product-tag-banner {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 5;
  padding: 6px 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Cairo', sans-serif;
  font-weight: 800;
  font-size: 0.85rem;
  border-bottom-right-radius: 14px;
  box-shadow: 2px 2px 8px rgba(0,0,0,0.06);
}

.tag-custom-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  display: inline-flex;
  align-items: center;
}

.tag-default {
  background: rgba(var(--primary-color-rgb), 0.15) !important;
  color: var(--primary-color) !important;
}

.tag-rose {
  background: #F7A3AD !important;
  color: #8C172E !important;
}

.tag-gold {
  background: #FCE6B1 !important;
  color: #9E742C !important;
}

.tag-fire {
  background: #F66601 !important;
  color: #FFF !important;
}

.tag-leaf {
  background: #9CB795 !important;
  color: #1D3D1F !important;
}

.tag-sky {
  background: #BEE3F8 !important;
  color: #2B6CB0 !important;
}

.tag-royal {
  background: #E9D8FD !important;
  color: #553C9A !important;
}


.product-info {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.product-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #2c2520;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-desc {
  font-size: 0.75rem;
  color: #6c757d;
  margin-bottom: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 3.4em;
  line-height: 1.15;
}

.prices-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 0.75rem;
}

.price-pill {
  font-size: 0.85rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  width: max-content;
}

.regular-price {
  background: rgba(253, 181, 24, 0.08);
  color: #d98000;
}

.regular-price.active {
  background: #fdb518;
  color: #0c0603;
}

.bulk-price {
  background: rgba(55, 178, 77, 0.1);
  color: #2b8a3e;
}

.bulk-price.active {
  background: #2b8a3e;
  color: #fff;
}

.actions-row {
  display: flex;
  margin-top: auto;
  align-items: center;
}

.add-btn-wide {
  width: 100%;
  background: var(--primary-color);
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Cairo', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}

.shop-theme-shop1 .add-btn-wide {
  color: #0c0603; /* Dark text/icon for gold button */
}

.shop-theme-shop2 .add-btn-wide {
  color: #ffffff; /* White text/icon for blue button */
}

.add-btn-wide:active {
  transform: scale(0.97);
}
</style>
