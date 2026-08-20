<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useShopStore } from '../stores/shop';
import { useCartStore } from '../stores/cart';
import { useFavoritesStore } from '../stores/favorites';
import { useToastStore } from '../stores/toast';
import { useAuthStore } from '../stores/auth';
import CategoryIcon from './CategoryIcon.vue';
import { gsap } from 'gsap';

const heartBtnRef = ref(null);
const addBtnRef = ref(null);
const cardRef = ref(null);
const imgRef = ref(null);

const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  priority: {
    type: String,
    default: 'auto' // 'high' | 'auto' | 'low'
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

// View-Aware Image Prioritization & Blur-Up State
const isIntersecting = ref(props.priority === 'high');
const isLoaded = ref(false);
const hasError = ref(false);
let observer = null;

const checkCachedImage = () => {
  if (imgRef.value && imgRef.value.complete && imgRef.value.naturalWidth !== 0) {
    isLoaded.value = true;
  }
};

watch(() => props.product._id, () => {
  isLoaded.value = false;
  hasError.value = false;
  nextTick(() => {
    checkCachedImage();
  });
});

watch(isIntersecting, (val) => {
  if (val) {
    nextTick(() => {
      checkCachedImage();
    });
  }
});

onMounted(() => {
  if (props.priority === 'high') {
    isIntersecting.value = true;
    nextTick(() => {
      checkCachedImage();
    });
    return;
  }
  
  if ('IntersectionObserver' in window && cardRef.value) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isIntersecting.value = true;
            nextTick(() => {
              checkCachedImage();
            });
            if (observer && cardRef.value) {
              observer.unobserve(cardRef.value);
            }
          }
        });
      },
      {
        rootMargin: '250px 120px 250px 120px',
        threshold: 0.01
      }
    );
    observer.observe(cardRef.value);
  } else {
    isIntersecting.value = true;
    nextTick(() => {
      checkCachedImage();
    });
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});

const shouldRenderImage = computed(() => {
  return props.priority === 'high' || isIntersecting.value;
});

const fetchPriorityAttr = computed(() => {
  return props.priority === 'high' ? 'high' : 'auto';
});

const handleImageLoad = () => {
  isLoaded.value = true;
};

const handleImageError = (e) => {
  hasError.value = true;
  isLoaded.value = true;
  e.target.src = '/res/logo.jpg';
};

// Check if we should show regular/bulk prices based on purchaseType & shop settings
const showRegularPrice = computed(() => {
  return props.product.purchaseType === 'regular' || props.product.purchaseType === 'both' || !props.product.purchaseType;
});

const showBulkPrice = computed(() => {
  return props.product.purchaseType === 'bulk' || props.product.purchaseType === 'both';
});

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

const activeTagsList = computed(() => {
  if (!props.product.tags || !Array.isArray(props.product.tags) || props.product.tags.length === 0) return [];
  return props.product.tags.map(tagName => {
    const found = shopStore.tags.find(t => t.name === tagName);
    return found || { name: tagName, color: 'default', icon: 'trophy' };
  });
});
</script>

<template>
  <div 
    ref="cardRef"
    class="product-card glass-panel card-hover-effect" 
    :class="['shop-theme-' + activeShop, { 'not-available': product.available === false }]"
  >
    <!-- Favorite Heart Toggle -->
    <button ref="heartBtnRef" class="favorite-btn" @click.stop="toggleSave" aria-label="أضف للمفضلة">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="18" 
        height="18" 
        viewBox="0 0 24 24" 
        :fill="isSaved ? 'var(--primary-color)' : 'none'" 
        :stroke="isSaved ? 'var(--primary-color)' : 'rgba(255,255,255,0.85)'"
        stroke-width="2.2" 
        stroke-linecap="round" 
        stroke-linejoin="round"
        class="heart-icon"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>
    </button>

    <!-- Product Image (Bigger Image: 75% aspect ratio) -->
    <div class="img-wrapper" @click="emit('zoom', getImageUrl())">
      <!-- Pulsing Glass Shimmer Placeholder (Fades out smoothly when image loads) -->
      <div class="img-skeleton-shimmer" :class="{ 'hidden-skeleton': isLoaded }">
        <div class="shimmer-wave"></div>
      </div>

      <img 
        v-if="shouldRenderImage"
        ref="imgRef"
        :src="getImageUrl()" 
        :alt="product.name" 
        class="product-image"
        :class="{ 'loaded': isLoaded }"
        :fetchpriority="fetchPriorityAttr"
        decoding="async"
        @load="handleImageLoad"
        @error="handleImageError"
      />
      <div v-if="product.available === false" class="not-available-overlay">
        <span>غير متوفر</span>
      </div>
    </div>

    <!-- Product Details Content -->
    <div class="product-info">
      <div class="info-body">
        <h3 class="product-title" :title="product.name">{{ product.name }}</h3>
        <p class="product-desc" v-if="product.desc">{{ product.desc }}</p>

        <!-- Inline Tags Row -->
        <div v-if="activeTagsList.length > 0" class="product-inline-tags">
          <div 
            v-for="(tagItem, tIdx) in activeTagsList" 
            :key="tIdx" 
            class="product-tag-inline-pill animate-fade-in" 
            :class="'tag-' + (tagItem.color || 'default')"
          >
            <span class="tag-icon-badge">
              <CategoryIcon :icon="tagItem.icon" :name="tagItem.name" size="12" stroke-width="2.3" />
            </span>
            <span class="tag-text">{{ tagItem.name }}</span>
          </div>
        </div>

        <!-- Prices Row (Horizontal flex row) -->
        <div class="prices-row">
          <!-- Regular Price -->
          <div v-if="showRegularPrice" class="price-pill regular-price" :class="{ active: !isBulkMode }">
            <span class="price-val">{{ product.price_regular || product.price }}</span>
            <span class="price-unit">د.ل</span>
          </div>

          <!-- Bulk Price -->
          <div v-if="showBulkPrice" class="price-pill bulk-price" :class="{ active: isBulkMode }">
            <span class="price-label">جملة:</span>
            <span class="price-val">{{ product.price_bulk }}</span>
            <span class="price-unit">د.ل</span>
          </div>
        </div>
      </div>

      <!-- Restored Full-Width Add To Cart Button at bottom -->
      <div class="actions-row">
        <button 
          ref="addBtnRef"
          class="add-btn-wide" 
          @click.stop="handleAddToCart"
          :disabled="product.available === false"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
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
  border-radius: 16px;
  overflow: hidden;
  height: 100%;
  background: var(--bg-card, rgba(255, 253, 249, 0.95));
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;
}

.product-card.not-available {
  opacity: 0.6;
}

.favorite-btn {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.favorite-btn:hover {
  transform: scale(1.1);
  background: rgba(15, 23, 42, 0.85);
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
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.4);
  cursor: zoom-in;
}

/* Pulsing Shimmer Placeholder */
.img-skeleton-shimmer {
  position: absolute;
  top: 0; 
  left: 0; 
  width: 100%; 
  height: 100%;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.75), rgba(15, 23, 42, 0.9));
  overflow: hidden;
  z-index: 1;
  opacity: 1;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.img-skeleton-shimmer.hidden-skeleton {
  opacity: 0;
  pointer-events: none;
}

.shimmer-wave {
  position: absolute;
  top: 0; left: -100%; width: 100%; height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.22) 50%,
    transparent 100%
  );
  animation: shimmer 1.6s infinite ease-in-out;
}

@keyframes shimmer {
  0% { transform: translateX(0); }
  100% { transform: translateX(200%); }
}

.product-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transform: scale(1.04);
  transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s ease;
  z-index: 2;
}

.product-image.loaded {
  opacity: 1;
  transform: scale(1);
}

.product-card:hover .product-image.loaded {
  transform: scale(1.06);
}

.not-available-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.88rem;
}

/* Inline Product Tag Styles (After Description) */
.product-inline-tags {
  direction: rtl;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  margin-bottom: 6px;
}

.product-tag-inline-pill {
  direction: rtl;
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 4px 12px 4px 5px;
  border-radius: 20px;
  font-family: 'Cairo', sans-serif;
  font-weight: 700;
  font-size: 0.76rem;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
  vertical-align: middle;
}

.tag-icon-badge {
  order: 1;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.45);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  line-height: 0;
}

.tag-text {
  order: 2;
  display: inline-flex;
  align-items: center;
  height: 20px;
  line-height: 1;
  text-align: right;
  padding: 0 2px 0 0;
  margin: 0;
  color: inherit;
  font-weight: 700;
  white-space: nowrap;
}

.card-hover-effect:hover .product-tag-inline-pill {
  transform: translateY(-1px);
}

.card-hover-effect:hover .tag-icon-badge {
  transform: scale(1.12) rotate(-6deg);
}

.tag-default {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.95), rgba(180, 83, 9, 0.95)) !important;
  color: #ffffff !important;
}

.tag-rose {
  background: linear-gradient(135deg, rgba(225, 29, 72, 0.95), rgba(190, 18, 60, 0.95)) !important;
  color: #ffffff !important;
}

.tag-gold {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.98), rgba(202, 138, 4, 0.98)) !important;
  color: #0f172a !important;
  border-color: rgba(255, 255, 255, 0.4) !important;
}

.tag-fire {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.95), rgba(234, 88, 12, 0.95)) !important;
  color: #ffffff !important;
}

.tag-leaf {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95)) !important;
  color: #ffffff !important;
}

.tag-sky {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.95), rgba(2, 132, 199, 0.95)) !important;
  color: #ffffff !important;
}

.tag-royal {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(124, 58, 237, 0.95)) !important;
  color: #ffffff !important;
}

.product-info {
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
}

.info-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-title {
  font-size: 0.98rem;
  font-weight: 800;
  color: var(--text-color, #2c2520);
  margin-bottom: 2px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-desc {
  font-size: 0.76rem;
  color: var(--text-muted, #64748b);
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.22;
  height: auto;
}

.prices-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
  margin-bottom: 2px;
}

.price-pill {
  font-size: 0.82rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  width: max-content;
}

.regular-price {
  background: rgba(253, 181, 24, 0.12);
  color: #fbbf24;
}

.regular-price.active {
  background: #fdb518;
  color: #0c0603;
}

.bulk-price {
  background: rgba(55, 178, 77, 0.15);
  color: #4ade80;
}

.bulk-price.active {
  background: #2b8a3e;
  color: #fff;
}

.actions-row {
  margin-top: auto;
  width: 100%;
}

.add-btn-wide {
  width: 100%;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--primary-color, #d97706);
  color: #ffffff;
  border: none;
  font-family: 'Cairo', sans-serif;
  font-weight: 800;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(var(--primary-color-rgb, 217, 119, 6), 0.35);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Shop 1 Theme: Warm Gold/Amber gradient with dark text */
.shop-theme-shop1 .add-btn-wide {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #0c0603;
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.4);
}

.shop-theme-shop1 .add-btn-wide:hover {
  transform: translateY(-1px);
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.55);
}

/* Shop 2 Theme: Deep Royal Blue gradient with white text */
.shop-theme-shop2 .add-btn-wide {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
}

.shop-theme-shop2 .add-btn-wide:hover {
  transform: translateY(-1px);
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.55);
}

.add-btn-wide:active {
  transform: scale(0.97);
}
</style>
