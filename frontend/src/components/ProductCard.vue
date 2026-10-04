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

const activeTagsList = computed(() => {
  if (!props.product.tags || !Array.isArray(props.product.tags) || props.product.tags.length === 0) return [];
  return props.product.tags.map(tagName => {
    const found = shopStore.tags.find(t => t.name === tagName);
    return found || { 
      name: tagName, 
      color: 'default', 
      icon: 'trophy',
      badgeStyle: 'gradient',
      placement: 'both' 
    };
  });
});

// Floating badge on product card image (top-right corner in RTL)
const floatingTags = computed(() => {
  return activeTagsList.value.filter(t => t.placement !== 'inline').slice(0, 2);
});

// Inline tags in product body details
const inlineTags = computed(() => {
  return activeTagsList.value.filter(t => t.placement !== 'floating');
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

    <!-- Floating Tag Badge(s) on Image (Top Right in RTL) -->
    <div v-if="floatingTags.length > 0" class="product-floating-tags-container">
      <div 
        v-for="(tagItem, fIdx) in floatingTags" 
        :key="'float-' + fIdx"
        class="product-floating-tag-pill animate-fade-in"
        :class="[
          'tag-' + (tagItem.color || 'default'),
          'tag-style-' + (tagItem.badgeStyle || 'gradient')
        ]"
      >
        <span class="floating-tag-icon-wrap" aria-hidden="true">
          <CategoryIcon :icon="tagItem.icon" :name="tagItem.name" size="12" stroke-width="2.4" />
        </span>
        <span class="floating-tag-label">{{ tagItem.name }}</span>
      </div>
    </div>

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

        <!-- Modern Inline Tags Row -->
        <div v-if="inlineTags.length > 0" class="product-inline-tags">
          <div 
            v-for="(tagItem, tIdx) in inlineTags" 
            :key="'inline-' + tIdx" 
            class="product-tag-inline-pill animate-fade-in" 
            :class="[
              'tag-' + (tagItem.color || 'default'),
              'tag-style-' + (tagItem.badgeStyle || 'gradient')
            ]"
          >
            <span class="tag-icon-badge" aria-hidden="true">
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
          <div v-if="showBulkPrice" class="price-pill bulk-price" :class="{ active: isBulkMode || !showRegularPrice }">
            <span v-if="showRegularPrice" class="price-label">جملة:</span>
            <span class="price-val">{{ product.price_bulk }}</span>
            <span class="price-unit">د.ل</span>
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
   FLOATING IMAGE TAGS (TOP-RIGHT CORNER IN RTL)
   ========================================================================== */
.product-floating-tags-container {
  position: absolute;
  top: 9px;
  right: 9px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  pointer-events: none;
}

.product-floating-tag-pill {
  direction: rtl;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px 4px 5px;
  border-radius: 999px;
  font-family: 'Cairo', sans-serif;
  font-weight: 800;
  font-size: 0.72rem;
  line-height: 1.25;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.3) inset;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
  pointer-events: auto;
  user-select: none;
}

.floating-tag-icon-wrap {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.45);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  line-height: 0;
  color: inherit;
}

.floating-tag-label {
  display: inline-block;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.card-hover-effect:hover .product-floating-tag-pill {
  transform: scale(1.04) translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.45) inset;
}

/* ==========================================================================
   INLINE PRODUCT TAGS (AFTER DESCRIPTION IN BODY)
   ========================================================================== */
.product-inline-tags {
  direction: rtl;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  margin-bottom: 6px;
}

.product-tag-inline-pill {
  direction: rtl;
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 3.5px 11px 3.5px 5px;
  border-radius: 999px;
  font-family: 'Cairo', sans-serif;
  font-weight: 750;
  font-size: 0.74rem;
  line-height: 1.25;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
  vertical-align: middle;
  touch-action: manipulation;
}

.product-tag-inline-pill:active {
  transform: scale(0.95);
}

.tag-icon-badge {
  order: 1;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.45);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  line-height: 0;
  color: inherit;
}

.tag-text {
  order: 2;
  display: inline-flex;
  align-items: center;
  height: 18px;
  line-height: 1;
  text-align: right;
  padding: 0 2px 0 0;
  margin: 0;
  color: inherit;
  font-weight: 750;
  white-space: nowrap;
}

.card-hover-effect:hover .product-tag-inline-pill {
  transform: translateY(-1.5px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
}

.card-hover-effect:hover .tag-icon-badge {
  transform: scale(1.1) rotate(-6deg);
}

/* ==========================================================================
   TAG THEME PALETTES (10 LUXURY COLOR GRADIENTS)
   ========================================================================== */
/* Gold / Amber Royal */
.tag-gold {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
  color: #ffffff !important;
  border-color: rgba(253, 230, 138, 0.5) !important;
}

/* Fire / Flame Orange */
.tag-fire {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%) !important;
  color: #ffffff !important;
  border-color: rgba(254, 215, 170, 0.5) !important;
}

/* Velvet Rose / Ruby */
.tag-rose {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%) !important;
  color: #ffffff !important;
  border-color: rgba(254, 205, 211, 0.5) !important;
}

/* Fresh Leaf / Emerald */
.tag-leaf {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
  color: #ffffff !important;
  border-color: rgba(167, 243, 208, 0.5) !important;
}

/* Electric Sky / Sapphire */
.tag-sky {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%) !important;
  color: #ffffff !important;
  border-color: rgba(186, 230, 253, 0.5) !important;
}

/* Imperial Royal / Amethyst */
.tag-royal {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important;
  color: #ffffff !important;
  border-color: rgba(221, 214, 254, 0.5) !important;
}

/* Persian Teal */
.tag-teal {
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%) !important;
  color: #ffffff !important;
  border-color: rgba(153, 246, 228, 0.5) !important;
}

/* Warm Caramel Amber */
.tag-amber {
  background: linear-gradient(135deg, #d97706 0%, #92400e 100%) !important;
  color: #ffffff !important;
  border-color: rgba(254, 243, 199, 0.45) !important;
}

/* Berry Magenta */
.tag-berry {
  background: linear-gradient(135deg, #d946ef 0%, #c026d3 100%) !important;
  color: #ffffff !important;
  border-color: rgba(245, 208, 254, 0.5) !important;
}

/* Midnight Slate / Dark */
.tag-dark {
  background: linear-gradient(135deg, #334155 0%, #0f172a 100%) !important;
  color: #ffffff !important;
  border-color: rgba(148, 163, 184, 0.4) !important;
}

/* Default Minimal Slate */
.tag-default {
  background: linear-gradient(135deg, #475569 0%, #334155 100%) !important;
  color: #ffffff !important;
  border-color: rgba(203, 213, 225, 0.4) !important;
}

/* ==========================================================================
   STYLE VARIANTS (GLASS & MINIMAL OVERRIDES)
   ========================================================================== */
.tag-style-glass {
  background: rgba(15, 23, 42, 0.55) !important;
  backdrop-filter: blur(12px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(12px) saturate(180%) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.25) inset !important;
}

.tag-style-glass.tag-gold { border-color: rgba(245, 158, 11, 0.7) !important; color: #fef08a !important; }
.tag-style-glass.tag-fire { border-color: rgba(249, 115, 22, 0.7) !important; color: #fed7aa !important; }
.tag-style-glass.tag-rose { border-color: rgba(244, 63, 94, 0.7) !important; color: #fecdd3 !important; }
.tag-style-glass.tag-leaf { border-color: rgba(16, 185, 129, 0.7) !important; color: #a7f3d0 !important; }
.tag-style-glass.tag-sky { border-color: rgba(14, 165, 233, 0.7) !important; color: #bae6fd !important; }
.tag-style-glass.tag-royal { border-color: rgba(139, 92, 246, 0.7) !important; color: #ddd6fe !important; }
.tag-style-glass.tag-teal { border-color: rgba(20, 184, 166, 0.7) !important; color: #99f6e4 !important; }
.tag-style-glass.tag-amber { border-color: rgba(217, 119, 6, 0.7) !important; color: #fde68a !important; }
.tag-style-glass.tag-berry { border-color: rgba(217, 70, 239, 0.7) !important; color: #f5d0fe !important; }
.tag-style-glass.tag-dark { border-color: rgba(148, 163, 184, 0.5) !important; color: #f1f5f9 !important; }

.tag-style-minimal {
  background: rgba(255, 255, 255, 0.95) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
}

.tag-style-minimal.tag-gold { border-color: #d97706 !important; color: #b45309 !important; }
.tag-style-minimal.tag-fire { border-color: #ea580c !important; color: #c2410c !important; }
.tag-style-minimal.tag-rose { border-color: #e11d48 !important; color: #be123c !important; }
.tag-style-minimal.tag-leaf { border-color: #059669 !important; color: #047857 !important; }
.tag-style-minimal.tag-sky { border-color: #0284c7 !important; color: #0369a1 !important; }
.tag-style-minimal.tag-royal { border-color: #7c3aed !important; color: #6d28d9 !important; }
.tag-style-minimal.tag-teal { border-color: #0d9488 !important; color: #0f766e !important; }
.tag-style-minimal.tag-amber { border-color: #b45309 !important; color: #92400e !important; }
.tag-style-minimal.tag-berry { border-color: #c026d3 !important; color: #a21caf !important; }
.tag-style-minimal.tag-dark { border-color: #334155 !important; color: #0f172a !important; }
.tag-style-minimal.tag-default { border-color: #64748b !important; color: #334155 !important; }

.tag-style-minimal .tag-icon-badge,
.tag-style-minimal .floating-tag-icon-wrap {
  background: rgba(0, 0, 0, 0.06) !important;
  border-color: rgba(0, 0, 0, 0.1) !important;
}

:global(.dark-mode) .tag-style-minimal {
  background: rgba(30, 41, 59, 0.95) !important;
}
:global(.dark-mode) .tag-style-minimal.tag-gold { color: #fde68a !important; }
:global(.dark-mode) .tag-style-minimal.tag-fire { color: #fed7aa !important; }
:global(.dark-mode) .tag-style-minimal.tag-rose { color: #fecdd3 !important; }
:global(.dark-mode) .tag-style-minimal.tag-leaf { color: #a7f3d0 !important; }
:global(.dark-mode) .tag-style-minimal.tag-sky { color: #bae6fd !important; }
:global(.dark-mode) .tag-style-minimal.tag-royal { color: #ddd6fe !important; }
:global(.dark-mode) .tag-style-minimal.tag-teal { color: #99f6e4 !important; }
:global(.dark-mode) .tag-style-minimal.tag-amber { color: #fde68a !important; }
:global(.dark-mode) .tag-style-minimal.tag-berry { color: #f5d0fe !important; }
:global(.dark-mode) .tag-style-minimal.tag-dark { color: #f8fafc !important; }
:global(.dark-mode) .tag-style-minimal.tag-default { color: #cbd5e1 !important; }
:global(.dark-mode) .tag-style-minimal .tag-icon-badge,
:global(.dark-mode) .tag-style-minimal .floating-tag-icon-wrap {
  background: rgba(255, 255, 255, 0.12) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
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
