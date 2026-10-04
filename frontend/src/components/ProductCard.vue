<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useShopStore } from '../stores/shop';
import { useCartStore } from '../stores/cart';
import { useFavoritesStore } from '../stores/favorites';
import { useToastStore } from '../stores/toast';
import { useAuthStore } from '../stores/auth';
import CategoryIcon from './CategoryIcon.vue';
import { gsap } from 'gsap';
import { triggerHaptic } from '../utils/haptics';
import { flyToCart } from '../utils/flyToCart';
import { normalizeImageUrl, isImageCached, markImageLoaded } from '../utils/imageCache';
import { telemetry } from '../utils/telemetry';

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

const getImageUrl = () => {
  const raw = props.product.imgSigned || props.product.img || '/res/logo.jpg';
  return normalizeImageUrl(raw);
};

// Robust In-Memory Cache Aware State (0ms synchronous hit on previously seen images)
const isLoaded = ref(isImageCached(props.product.imgSigned || props.product.img));
const hasError = ref(false);

const checkCachedImage = () => {
  if (imgRef.value && imgRef.value.complete && imgRef.value.naturalWidth !== 0) {
    markImageLoaded(getImageUrl());
    isLoaded.value = true;
  }
};

const triggerOffThreadDecode = () => {
  if (imgRef.value && typeof imgRef.value.decode === 'function') {
    imgRef.value.decode().then(() => {
      markImageLoaded(getImageUrl());
      isLoaded.value = true;
    }).catch(() => {
      // Handled gracefully by standard @load / @error events
    });
  }
};

watch(() => props.product._id, () => {
  const url = getImageUrl();
  isLoaded.value = isImageCached(url);
  hasError.value = false;
  nextTick(() => {
    checkCachedImage();
    triggerOffThreadDecode();
  });
});

let dwellObserver = null;

onMounted(() => {
  checkCachedImage();
  triggerOffThreadDecode();
  nextTick(() => {
    checkCachedImage();
  });

  // Empirical Dwell Tracker (UX Datasets 03_interaction_telemetry benchmark)
  if (typeof IntersectionObserver !== 'undefined' && cardRef.value) {
    dwellObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          telemetry.startDwell(props.product._id, {
            productId: props.product._id,
            productName: props.product.name,
            shop: activeShop.value
          });
        } else {
          telemetry.endDwell(props.product._id);
        }
      }
    }, { threshold: 0.6 });
    dwellObserver.observe(cardRef.value);
  }
});

onUnmounted(() => {
  if (dwellObserver) {
    dwellObserver.disconnect();
    dwellObserver = null;
  }
  telemetry.endDwell(props.product._id);
});

const handleImageLoad = () => {
  markImageLoaded(getImageUrl());
  isLoaded.value = true;
};

const handleImageError = (e) => {
  if (hasError.value) return;
  hasError.value = true;
  isLoaded.value = true;
  e.target.src = '/res/logo.jpg';
};

// Check if we should show regular/bulk prices based on purchaseType & shop settings
const showRegularPrice = computed(() => {
  if (props.product.purchaseType === 'bulk') return false;
  const hasReg = props.product.price_regular !== null && 
                 props.product.price_regular !== undefined && 
                 props.product.price_regular !== '' &&
                 !isNaN(Number(props.product.price_regular));
  const hasPrice = props.product.price !== null && 
                   props.product.price !== undefined && 
                   props.product.price !== '' &&
                   !isNaN(Number(props.product.price));
  return (
    (props.product.purchaseType === 'regular' ||
    props.product.purchaseType === 'both' ||
    !props.product.purchaseType) && (hasReg || hasPrice)
  );
});

const showBulkPrice = computed(() => {
  const hasBulkValue = props.product.price_bulk !== null && 
                       props.product.price_bulk !== undefined && 
                       props.product.price_bulk !== '' &&
                       !isNaN(Number(props.product.price_bulk));
  if (!hasBulkValue) return false;
  if (props.product.purchaseType === 'bulk') return true;
  if (props.product.purchaseType === 'both') {
    if (!showRegularPrice.value) return true;
    return isBulkMode.value;
  }
  return false;
});

const isSaved = computed(() => favoritesStore.isFavorite(activeShop.value, props.product._id));

const toggleSave = () => {
  triggerHaptic('light');
  if (heartBtnRef.value) {
    gsap.fromTo(heartBtnRef.value, 
      { scale: 0.75 }, 
      { scale: 1, duration: 0.35, ease: 'back.out(1.4)' }
    );
  }
  favoritesStore.toggleFavorite(activeShop.value, props.product._id);
  const isNowFav = favoritesStore.isFavorite(activeShop.value, props.product._id);
  
  if (!authStore.isIdentified()) {
    if (isNowFav) {
      toastStore.show('تم الحفظ محلياً. سجّل دخولك من صفحة "حسابي" للمزامنة السحابية');
    } else {
      toastStore.show('تم إزالة المنتج من المفضلة');
    }
  } else {
    if (isNowFav) {
      toastStore.show('تم إضافة المنتج إلى المفضلة');
    } else {
      toastStore.show('تم إزالة المنتج من المفضلة');
    }
  }
};

// Current quantity of this product in active cart
const cartItemQuantity = computed(() => {
  return cartStore.getItemQty(props.product._id);
});

const handleAddToCart = () => {
  triggerHaptic('medium');
  if (addBtnRef.value) {
    gsap.fromTo(addBtnRef.value,
      { scale: 0.94 },
      { scale: 1, duration: 0.28, ease: 'back.out(1.2)' }
    );
  }
  // Determine pricing mode to add to cart
  let mode = 'regular';
  if (isBulkMode.value && showBulkPrice.value) {
    mode = 'bulk';
  } else if (props.product.purchaseType === 'bulk' || !showRegularPrice.value) {
    mode = 'bulk';
  }
  
  try {
    const qtyStep = 1;
    cartStore.addToCart(props.product, activeShop.value, mode, qtyStep);
    flyToCart(imgRef.value || cardRef.value, getImageUrl());
    toastStore.show('تم إضافة المنتج إلى السلة بنجاح!');
    telemetry.track('cart_add', {
      productId: props.product._id,
      productName: props.product.name,
      shop: activeShop.value,
      price: mode === 'bulk' ? (props.product.price_bulk || props.product.price) : (props.product.price_regular || props.product.price || props.product.price_bulk),
      mode
    });
  } catch (err) {
    toastStore.show(err.message, 'error');
  }
};

const incrementQuantity = () => {
  triggerHaptic('light');
  const newQty = Math.round((cartItemQuantity.value + 1) * 100) / 100;
  cartStore.updateQty(props.product._id, newQty);
  flyToCart(imgRef.value || cardRef.value, getImageUrl());
  telemetry.track('cart_add', {
    productId: props.product._id,
    productName: props.product.name,
    shop: activeShop.value,
    qty: newQty
  });
};

const decrementQuantity = () => {
  const newQty = Math.max(0, Math.round((cartItemQuantity.value - 1) * 100) / 100);
  if (newQty === 0) {
    triggerHaptic('warning');
    cartStore.removeFromCart(props.product._id);
    telemetry.track('cart_remove', {
      productId: props.product._id,
      productName: props.product.name,
      shop: activeShop.value
    });
  } else {
    triggerHaptic('light');
    cartStore.updateQty(props.product._id, newQty);
  }
};

const productTags = computed(() => {
  if (!props.product.tags || !Array.isArray(props.product.tags) || props.product.tags.length === 0) return [];
  return props.product.tags.map(tagName => {
    const found = shopStore.tags.find(t => t.name === tagName);
    return found || { name: tagName, icon: 'trophy' };
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
    <button 
      ref="heartBtnRef" 
      type="button"
      class="favorite-btn" 
      @click.stop="toggleSave" 
      @mousedown.stop 
      @touchstart.stop
      @pointerdown.stop
      aria-label="أضف للمفضلة"
    >
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
        aria-hidden="true"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>
    </button>

    <!-- Product Image (Bigger Image: 75% aspect ratio) -->
    <div 
      class="img-wrapper" 
      role="button"
      tabindex="0"
      :aria-label="'تكبير صورة ' + product.name"
      @click="emit('zoom', getImageUrl())"
      @keydown.enter="emit('zoom', getImageUrl())"
      @keydown.space.prevent="emit('zoom', getImageUrl())"
    >
      <!-- Pulsing Glass Shimmer Placeholder (Fades out smoothly when image loads) -->
      <div class="img-skeleton-shimmer" :class="{ 'hidden-skeleton': isLoaded }">
        <div class="shimmer-wave"></div>
      </div>

      <img 
        ref="imgRef"
        :src="getImageUrl()" 
        :alt="product.name" 
        class="product-image"
        :class="{ 'loaded': isLoaded }"
        :loading="priority === 'high' ? 'eager' : 'lazy'"
        :fetchpriority="priority === 'high' ? 'high' : 'auto'"
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

        <!-- Singular Unified Design Theme Tags (Details Only) -->
        <div v-if="productTags.length > 0" class="product-tags-wrapper">
          <div 
            v-for="(tagItem, tIdx) in productTags" 
            :key="'tag-' + tIdx" 
            class="product-tag-chip animate-fade-in"
          >
            <span class="tag-chip-icon" aria-hidden="true" v-if="tagItem.icon">
              <CategoryIcon :icon="tagItem.icon" :name="tagItem.name" size="11" stroke-width="2.3" />
            </span>
            <span class="tag-chip-text">{{ tagItem.name }}</span>
          </div>
        </div>

        <!-- Modern Elevated Price Row -->
        <div class="product-price-row">
          <!-- Retail / Regular Price -->
          <div 
            v-if="showRegularPrice" 
            class="price-item regular-price-item" 
            :class="{ 'is-muted-secondary': isBulkMode && showBulkPrice }"
          >
            <span class="price-figure text-mono">{{ product.price_regular || product.price }}</span>
            <span class="price-curr">د.ل</span>
          </div>

          <!-- Wholesale / Bulk Price -->
          <div 
            v-if="showBulkPrice" 
            class="price-item bulk-price-item" 
            :class="{ 'is-highlighted': isBulkMode || !showRegularPrice }"
          >
            <span v-if="showRegularPrice" class="bulk-mode-tag">جملة</span>
            <span class="price-figure text-mono">{{ product.price_bulk }}</span>
            <span class="price-curr">د.ل</span>
          </div>
        </div>
      </div>

      <!-- In-Card Direct Stepper or Full-Width Add To Cart Button -->
      <div class="actions-row" @mousedown.stop @touchstart.stop @pointerdown.stop>
        <!-- If already in cart: Show Direct Manipulation Stepper [- qty +] -->
        <div v-if="cartItemQuantity > 0" class="card-stepper-control animate-fade-in" @click.stop>
          <button 
            type="button" 
            class="card-stepper-btn minus" 
            @click.stop="decrementQuantity" 
            aria-label="إنقاص الكمية"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <div class="card-stepper-qty">
            <span class="card-stepper-val text-mono">{{ cartItemQuantity }}</span>
          </div>
          <button 
            type="button" 
            class="card-stepper-btn plus" 
            @click.stop="incrementQuantity" 
            aria-label="زيادة الكمية"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        <!-- If not in cart: Show Add To Cart Button -->
        <button 
          v-else
          ref="addBtnRef"
          type="button"
          class="add-btn-wide" 
          @click.stop="handleAddToCart"
          :disabled="product.available === false"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
  touch-action: manipulation;
}

/* Invisible 48x48px touch pad for mobile ergonomics (WCAG 2.1 & RICO) */
.favorite-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  pointer-events: auto;
}

.favorite-btn:hover {
  transform: scale(1.08);
  background: rgba(15, 23, 42, 0.85);
}

.heart-icon {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), fill 0.25s;
}

.favorite-btn:active {
  transform: scale(0.92);
  transition: transform 80ms ease-out;
}

.favorite-btn:active .heart-icon {
  transform: scale(0.85);
}

.img-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: #0f172a;
  contain: layout paint;
  cursor: zoom-in;
}

/* Pulsing Shimmer Placeholder */
.img-skeleton-shimmer {
  position: absolute;
  top: 0; 
  left: 0; 
  width: 100%; 
  height: 100%;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95));
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
  top: 0; 
  left: -100%; 
  width: 100%; 
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.22) 50%,
    transparent 100%
  );
  animation: shimmer 1.6s infinite ease-in-out;
  will-change: transform;
}

@keyframes shimmer {
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(200%, 0, 0); }
}

.product-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transform: scale(1.03);
  transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s ease;
  z-index: 2;
  will-change: opacity, transform;
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

/* ==========================================================================
   SINGULAR UNIFIED PRODUCT TAGS (DETAILS ONLY)
   ========================================================================== */
.product-tags-wrapper {
  direction: rtl;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  margin-bottom: 6px;
}

.product-tag-chip {
  direction: rtl;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px 3px 5px;
  border-radius: 999px;
  font-family: 'Cairo', sans-serif;
  font-weight: 750;
  font-size: 0.73rem;
  line-height: 1.25;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(217, 119, 6, 0.22);
  color: #b45309;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, border-color 0.2s ease;
  user-select: none;
}

.product-card:hover .product-tag-chip {
  transform: translateY(-1px);
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(217, 119, 6, 0.32);
}

.tag-chip-icon {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 0;
  box-shadow: 0 1px 2px rgba(217, 119, 6, 0.12);
}

.tag-chip-text {
  display: inline-block;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

/* Shop 2 Royal Blue Variant for unified singular theme */
.shop-theme-shop2 .product-tag-chip {
  background: rgba(37, 99, 235, 0.08);
  border-color: rgba(37, 99, 235, 0.22);
  color: #1d4ed8;
}

.shop-theme-shop2 .product-card:hover .product-tag-chip {
  background: rgba(37, 99, 235, 0.12);
  border-color: rgba(37, 99, 235, 0.32);
}

.shop-theme-shop2 .tag-chip-icon {
  background: rgba(37, 99, 235, 0.16);
  color: #1d4ed8;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.12);
}

:global(.dark-mode) .product-tag-chip {
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.3);
  color: #fde68a;
}

:global(.dark-mode) .tag-chip-icon {
  background: rgba(245, 158, 11, 0.25);
  color: #fde68a;
}

:global(.dark-mode) .shop-theme-shop2 .product-tag-chip {
  background: rgba(59, 130, 246, 0.16);
  border-color: rgba(59, 130, 246, 0.32);
  color: #93c5fd;
}

:global(.dark-mode) .shop-theme-shop2 .tag-chip-icon {
  background: rgba(59, 130, 246, 0.25);
  color: #93c5fd;
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
  font-size: 0.8rem;
  color: #57534e;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  height: auto;
}

/* ==========================================================================
   ELEVATED PRICE DISPLAY (MODERN E-COMMERCE TYPOGRAPHY)
   ========================================================================== */
.product-price-row {
  direction: rtl;
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
  margin-bottom: 6px;
}

.price-item {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
}

.regular-price-item .price-figure {
  font-size: 1.15rem;
  font-weight: 900;
  line-height: 1;
  color: var(--text-color, #1c1917);
  letter-spacing: -0.02em;
}

.regular-price-item .price-curr {
  font-size: 0.74rem;
  font-weight: 700;
  color: #78716c;
}

/* Secondary muted state when wholesale mode is active */
.regular-price-item.is-muted-secondary .price-figure {
  font-size: 0.92rem;
  font-weight: 600;
  color: #a8a29e;
  text-decoration: line-through;
  text-decoration-color: rgba(168, 162, 158, 0.7);
}

.regular-price-item.is-muted-secondary .price-curr {
  font-size: 0.68rem;
  color: #a8a29e;
}

/* Bulk / Wholesale Badge & Price */
.bulk-price-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px 2px 6px;
  border-radius: 7px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.22);
}

.bulk-price-item.is-highlighted {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.35);
  box-shadow: 0 1px 4px rgba(16, 185, 129, 0.12);
}

.bulk-mode-tag {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 4px;
  background: #059669;
  color: #ffffff;
  line-height: 1.2;
}

.bulk-price-item .price-figure {
  font-size: 1.05rem;
  font-weight: 900;
  line-height: 1;
  color: #047857;
  letter-spacing: -0.01em;
}

.bulk-price-item .price-curr {
  font-size: 0.72rem;
  font-weight: 700;
  color: #059669;
}

/* Dark Mode Harmonization */
:global(.dark-mode) .regular-price-item .price-figure {
  color: #f1f5f9;
}

:global(.dark-mode) .regular-price-item .price-curr {
  color: #94a3b8;
}

:global(.dark-mode) .regular-price-item.is-muted-secondary .price-figure,
:global(.dark-mode) .regular-price-item.is-muted-secondary .price-curr {
  color: #64748b;
  text-decoration-color: rgba(100, 116, 139, 0.7);
}

:global(.dark-mode) .bulk-price-item {
  background: rgba(16, 185, 129, 0.14);
  border-color: rgba(16, 185, 129, 0.3);
}

:global(.dark-mode) .bulk-price-item .price-figure {
  color: #34d399;
}

:global(.dark-mode) .bulk-price-item .price-curr {
  color: #10b981;
}

.actions-row {
  margin-top: auto;
  width: 100%;
}

/* In-Card Stepper Styling */
.card-stepper-control {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
  border: 1.5px solid #cbd5e1;
  border-radius: 12px;
  padding: 3px;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.card-stepper-btn {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  border: none;
  background: #ffffff;
  color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  touch-action: manipulation;
  transition: transform 0.1s ease, background-color 0.15s ease, color 0.15s ease;
}

/* Invisible 48x48px touch pad for effortless finger manipulation (WCAG 2.1 & RICO) */
.card-stepper-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  pointer-events: auto;
}

.card-stepper-btn:active {
  transform: scale(0.92);
}

.card-stepper-btn.minus {
  color: #dc2626;
  background: #fff;
}

.card-stepper-btn.minus:active {
  background: #fee2e2;
}

.card-stepper-btn.plus {
  color: #ffffff;
  background: var(--primary-color, #f59e0b);
}

.shop-theme-shop1 .card-stepper-btn.plus {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #0c0603;
}

.shop-theme-shop2 .card-stepper-btn.plus {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #ffffff;
}

.card-stepper-qty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  line-height: 1;
}

.card-stepper-val {
  font-size: 1rem;
  font-weight: 850;
  color: #0f172a;
}

.add-btn-wide {
  width: 100%;
  min-height: 42px;
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
  touch-action: manipulation;
  box-shadow: 0 4px 14px rgba(var(--primary-color-rgb, 217, 119, 6), 0.35);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Shop 1 Theme: Warm Gold/Amber gradient with white text */
.shop-theme-shop1 .add-btn-wide {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.4);
}

.shop-theme-shop1 .add-btn-wide:hover {
  transform: translateY(-1px);
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #ffffff;
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
  transform: scale(0.96);
  transition: transform 80ms ease-out;
}

@media (max-width: 768px) {
  .product-info {
    padding: 8px 10px;
    gap: 5px;
  }
  .product-title {
    font-size: 0.88rem;
    line-height: 1.25;
  }
  .product-desc {
    font-size: 0.78rem;
    line-height: 1.35;
    color: #57534e;
  }
  .price-pill {
    font-size: 0.8rem;
    padding: 2px 7px;
  }
  .add-btn-wide {
    padding: 8px 12px;
    font-size: 0.82rem;
    border-radius: 11px;
    min-height: 44px;
  }
  .card-stepper-control {
    border-radius: 10px;
    padding: 2px;
  }
  .card-stepper-btn {
    width: 30px;
    height: 30px;
    border-radius: 8px;
  }
  .card-stepper-val {
    font-size: 0.88rem;
  }
}
</style>
