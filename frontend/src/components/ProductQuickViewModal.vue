<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useShopStore } from '../stores/shop';
import { useCartStore } from '../stores/cart';
import { useFavoritesStore } from '../stores/favorites';
import { useToastStore } from '../stores/toast';
import { useAuthStore } from '../stores/auth';
import CategoryIcon from './CategoryIcon.vue';
import { triggerHaptic } from '../utils/haptics';
import { flyToCart } from '../utils/flyToCart';
import { bindSheetGesture } from '../utils/sheetGesture';
import { normalizeImageUrl, isImageCached, markImageLoaded } from '../utils/imageCache';
import { telemetry } from '../utils/telemetry';
import { lockBodyScroll, unlockBodyScroll, trapTabKey, restoreElementFocus } from '../utils/modalA11y';

const props = defineProps({
  product: {
    type: Object,
    default: null
  },
  imageUrl: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'filter-tag']);

const shopStore = useShopStore();
const cartStore = useCartStore();
const favoritesStore = useFavoritesStore();
const toastStore = useToastStore();
const authStore = useAuthStore();

const sheetRef = ref(null);
const backdropRef = ref(null);
const closeBtnRef = ref(null);
const heroImgRef = ref(null);
const isFullscreenZoom = ref(false);
const isImgLoaded = ref(false);
let cleanupGesture = null;
let triggerElement = null;
let hasScrollLock = false;

const isOpen = computed(() => !!(props.product || props.imageUrl));
const activeShop = computed(() => shopStore.activeShop || 'shop1');
const isBulkMode = computed(() => shopStore.isBulkVerified);

const resolvedImageUrl = computed(() => {
  if (props.imageUrl) return normalizeImageUrl(props.imageUrl);
  if (props.product) {
    const raw = props.product.imgSigned || props.product.img || '/res/logo.jpg';
    return normalizeImageUrl(raw);
  }
  return '/res/logo.jpg';
});

const handleClose = () => {
  triggerHaptic('light');
  isFullscreenZoom.value = false;
  emit('close');
};

const toggleFullscreenZoom = () => {
  triggerHaptic('light');
  isFullscreenZoom.value = !isFullscreenZoom.value;
};

const handleModalKeydown = (e) => {
  if (!isOpen.value) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    if (isFullscreenZoom.value && props.product) {
      triggerHaptic('light');
      isFullscreenZoom.value = false;
    } else {
      handleClose();
    }
    return;
  }
  if (e.key === 'Tab' && backdropRef.value) {
    trapTabKey(e, backdropRef.value);
  }
};

watch(isOpen, (open) => {
  if (open) {
    triggerElement = typeof document !== 'undefined' ? document.activeElement : null;
    if (!hasScrollLock) {
      lockBodyScroll(true);
      hasScrollLock = true;
    }
    isFullscreenZoom.value = !props.product && !!props.imageUrl;
    isImgLoaded.value = isImageCached(resolvedImageUrl.value);
    nextTick(() => {
      if (sheetRef.value) {
        if (cleanupGesture) cleanupGesture();
        cleanupGesture = bindSheetGesture(sheetRef.value, () => {
          handleClose();
        });
      }
      if (closeBtnRef.value) {
        closeBtnRef.value.focus({ preventScroll: true });
      }
    });
  } else {
    isFullscreenZoom.value = false;
    if (cleanupGesture) {
      cleanupGesture();
      cleanupGesture = null;
    }
    if (hasScrollLock) {
      unlockBodyScroll(true);
      hasScrollLock = false;
    }
    const prev = triggerElement;
    triggerElement = null;
    nextTick(() => restoreElementFocus(prev));
  }
}, { immediate: true });

onMounted(() => {
  window.addEventListener('keydown', handleModalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleModalKeydown);
  if (cleanupGesture) {
    cleanupGesture();
    cleanupGesture = null;
  }
  if (hasScrollLock) {
    unlockBodyScroll(true);
    hasScrollLock = false;
  }
});

const handleImgLoad = () => {
  markImageLoaded(resolvedImageUrl.value);
  isImgLoaded.value = true;
};

const handleImgError = (e) => {
  isImgLoaded.value = true;
  if (e && e.target && !e.target.src.endsWith('/res/logo.jpg')) {
    e.target.src = '/res/logo.jpg';
  }
};

const showRegularPrice = computed(() => {
  const p = props.product;
  if (!p || p.purchaseType === 'bulk') return false;
  const hasReg = p.price_regular !== null && p.price_regular !== undefined && p.price_regular !== '' && !isNaN(Number(p.price_regular));
  const hasPrice = p.price !== null && p.price !== undefined && p.price !== '' && !isNaN(Number(p.price));
  return (p.purchaseType === 'regular' || p.purchaseType === 'both' || !p.purchaseType) && (hasReg || hasPrice);
});

const showBulkPrice = computed(() => {
  const p = props.product;
  if (!p) return false;
  const hasBulkValue = p.price_bulk !== null && p.price_bulk !== undefined && p.price_bulk !== '' && !isNaN(Number(p.price_bulk));
  if (!hasBulkValue) return false;
  if (p.purchaseType === 'bulk') return true;
  if (p.purchaseType === 'both') {
    if (!showRegularPrice.value) return true;
    return isBulkMode.value;
  }
  return false;
});

const isSaved = computed(() => {
  if (!props.product) return false;
  return favoritesStore.isFavorite(activeShop.value, props.product._id);
});

const toggleSave = () => {
  if (!props.product) return;
  triggerHaptic('light');
  favoritesStore.toggleFavorite(activeShop.value, props.product._id);
  const isNowFav = favoritesStore.isFavorite(activeShop.value, props.product._id);
  if (!authStore.isIdentified()) {
    toastStore.show(isNowFav ? 'تم الحفظ محلياً. سجّل دخولك من صفحة "حسابي" للمزامنة السحابية' : 'تم إزالة المنتج من المفضلة');
  } else {
    toastStore.show(isNowFav ? 'تم إضافة المنتج إلى المفضلة' : 'تم إزالة المنتج من المفضلة');
  }
};

const cartItemQuantity = computed(() => {
  if (!props.product) return 0;
  return cartStore.getItemQty(props.product._id);
});

const handleAddToCart = () => {
  const p = props.product;
  if (!p || p.available === false) return;
  triggerHaptic('medium');
  let mode = 'regular';
  if (isBulkMode.value && showBulkPrice.value) {
    mode = 'bulk';
  } else if (p.purchaseType === 'bulk' || !showRegularPrice.value) {
    mode = 'bulk';
  }
  try {
    cartStore.addToCart(p, activeShop.value, mode, 1);
    flyToCart(heroImgRef.value || sheetRef.value, resolvedImageUrl.value);
    toastStore.show('تم إضافة المنتج إلى السلة بنجاح!');
    telemetry.track('cart_add', {
      productId: p._id,
      productName: p.name,
      shop: activeShop.value,
      price: mode === 'bulk' ? (p.price_bulk || p.price) : (p.price_regular || p.price || p.price_bulk),
      mode,
      source: 'quick_view'
    });
  } catch (err) {
    toastStore.show(err.message, 'error');
  }
};

const qtyDirection = ref('qty-up');

const incrementQuantity = () => {
  if (!props.product) return;
  qtyDirection.value = 'qty-up';
  triggerHaptic('light');
  const newQty = Math.round((cartItemQuantity.value + 1) * 100) / 100;
  cartStore.updateQty(props.product._id, newQty);
  flyToCart(heroImgRef.value || sheetRef.value, resolvedImageUrl.value);
};

const decrementQuantity = () => {
  if (!props.product) return;
  qtyDirection.value = 'qty-down';
  const newQty = Math.max(0, Math.round((cartItemQuantity.value - 1) * 100) / 100);
  if (newQty === 0) {
    triggerHaptic('warning');
    cartStore.removeFromCart(props.product._id);
  } else {
    triggerHaptic('light');
    cartStore.updateQty(props.product._id, newQty);
  }
};

const productTags = computed(() => {
  if (!props.product || !Array.isArray(props.product.tags) || props.product.tags.length === 0) return [];
  return props.product.tags.map(tagName => {
    const found = shopStore.tags.find(t => t.name === tagName);
    return found || { name: tagName, icon: 'trophy' };
  });
});

const handleTagClick = (tagName) => {
  triggerHaptic('light');
  emit('filter-tag', tagName);
  emit('close');
};
</script>

<template>
  <Teleport to="body">
    <Transition name="qv-modal-fade">
      <div
        v-if="isOpen"
        ref="backdropRef"
        class="qv-backdrop"
        :class="['shop-theme-' + activeShop, { 'is-fullscreen-lightbox': isFullscreenZoom || !product }]"
        role="dialog"
        aria-modal="true"
        :aria-label="product ? ('تفاصيل المنتج: ' + product.name) : 'عرض الصورة بالدقة الكاملة'"
        @click.self="handleClose"
      >
        <!-- Fullscreen Lightbox View -->
        <template v-if="isFullscreenZoom || !product">
          <button
            type="button"
            class="qv-lightbox-close-btn"
            @click.stop="product ? (isFullscreenZoom = false) : handleClose()"
            :aria-label="product ? 'العودة لتفاصيل المنتج' : 'إغلاق'"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div class="qv-lightbox-stage" @click.stop="product ? (isFullscreenZoom = false) : handleClose()">
            <div v-if="!isImgLoaded" class="qv-spinner-wrap">
              <div class="qv-spinner"></div>
              <p>جاري عرض الصورة بالدقة الكاملة…</p>
            </div>
            <img
              :src="resolvedImageUrl"
              :alt="product ? product.name : 'صورة المنتج الكاملة'"
              class="qv-lightbox-img"
              :class="{ loaded: isImgLoaded }"
              fetchpriority="high"
              loading="eager"
              decoding="async"
              @load="handleImgLoad"
              @error="handleImgError"
              @click.stop
            />
          </div>
        </template>

        <!-- Rich Product Quick-View Card / Mobile Bottom Sheet -->
        <div
          v-else
          ref="sheetRef"
          class="qv-sheet-card glass-panel"
          @click.stop
        >
          <div class="sheet-grab-handle" aria-hidden="true"></div>

          <!-- Hero Product Image Stage -->
          <div class="qv-hero-stage">
            <div v-if="!isImgLoaded" class="qv-hero-shimmer">
              <div class="shimmer-wave"></div>
            </div>

            <img
              ref="heroImgRef"
              :src="resolvedImageUrl"
              :alt="product.name"
              class="qv-hero-img"
              :class="{ loaded: isImgLoaded }"
              fetchpriority="high"
              loading="eager"
              decoding="async"
              @load="handleImgLoad"
              @error="handleImgError"
              @click="toggleFullscreenZoom"
            />

            <!-- Top Controls Overlay -->
            <button
              ref="closeBtnRef"
              type="button"
              class="qv-overlay-btn qv-close-btn"
              @click="handleClose"
              aria-label="إغلاق نافذة المنتج"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <button
              type="button"
              class="qv-overlay-btn qv-fav-btn"
              :class="{ active: isSaved }"
              @click="toggleSave"
              aria-label="أضف للمفضلة"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" :fill="isSaved ? 'var(--primary-color)' : 'none'" :stroke="isSaved ? 'var(--primary-color)' : 'currentColor'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </button>

            <button
              type="button"
              class="qv-expand-img-pill"
              @click="toggleFullscreenZoom"
              aria-label="تكبير الصورة بالحجم الكامل"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
              <span>تكبير الصورة</span>
            </button>
          </div>

          <!-- Product Details Body -->
          <div class="qv-body">
            <!-- Category / Subcategory Breadcrumb -->
            <div v-if="product.category" class="qv-category-breadcrumb">
              <span class="qv-cat-pill">{{ product.category }}</span>
              <template v-if="product.subCategory">
                <span class="qv-cat-sep" aria-hidden="true">•</span>
                <span class="qv-subcat-label">{{ product.subCategory }}</span>
              </template>
            </div>

            <h2 class="qv-title">{{ product.name }}</h2>
            <p v-if="product.desc" class="qv-desc">{{ product.desc }}</p>

            <!-- Unified Design Theme Tags (Clickable to Filter) -->
            <div v-if="productTags.length > 0" class="qv-tags-row">
              <button
                v-for="(tagItem, tIdx) in productTags"
                :key="'qv-tag-' + tIdx"
                type="button"
                class="product-tag-chip qv-tag-interactive"
                :title="'تصفية حسب وسم: ' + tagItem.name"
                @click="handleTagClick(tagItem.name)"
              >
                <span class="tag-chip-icon" aria-hidden="true" v-if="tagItem.icon">
                  <CategoryIcon :icon="tagItem.icon" :name="tagItem.name" size="12" stroke-width="2.3" />
                </span>
                <span class="tag-chip-text">{{ tagItem.name }}</span>
              </button>
            </div>

            <!-- Elevated Price Row -->
            <div class="qv-price-section">
              <span class="qv-price-label">السعر</span>
              <div class="product-price-row qv-price-row">
                <div
                  v-if="showRegularPrice"
                  class="price-item regular-price-item"
                  :class="{ 'is-muted-secondary': isBulkMode && showBulkPrice }"
                >
                  <span class="price-figure text-mono">{{ product.price_regular || product.price }}</span>
                  <span class="price-curr">د.ل</span>
                </div>

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
          </div>

          <!-- Thumb-Zone Action Footer -->
          <div class="qv-footer">
            <Transition name="stepper-morph" mode="out-in">
            <div v-if="cartItemQuantity > 0" key="qv-stepper" class="qv-stepper-row">
              <div class="qv-stepper-control">
                <button
                  type="button"
                  class="qv-step-btn minus"
                  @click="decrementQuantity"
                  aria-label="إنقاص الكمية"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <Transition :name="qtyDirection" mode="out-in">
                  <span :key="cartItemQuantity" class="qv-step-val text-mono">{{ cartItemQuantity }}</span>
                </Transition>
                <button
                  type="button"
                  class="qv-step-btn plus"
                  @click="incrementQuantity"
                  aria-label="زيادة الكمية"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>
              <button type="button" class="qv-done-btn" @click="handleClose">
                متابعة التسوق
              </button>
            </div>

            <button
              v-else
              key="qv-add"
              type="button"
              class="qv-add-btn"
              :disabled="product.available === false"
              @click="handleAddToCart"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <span>{{ product.available === false ? 'غير متوفر حالياً' : 'أضف للسلة' }}</span>
            </button>
            </Transition>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.qv-backdrop {
  position: fixed;
  inset: 0;
  z-index: 3200;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.qv-backdrop.is-fullscreen-lightbox {
  background: rgba(10, 15, 28, 0.92);
}

.qv-sheet-card {
  width: 100%;
  max-width: 430px;
  max-height: 90vh;
  background: #fffdf9;
  border-radius: 24px;
  border: 1px solid rgba(44, 37, 32, 0.08);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

@media (max-width: 768px) {
  .qv-backdrop:not(.is-fullscreen-lightbox) {
    align-items: flex-end;
    padding: 0;
  }

  .qv-sheet-card {
    max-width: 100%;
    max-height: 88vh;
    border-radius: 24px 24px 0 0;
    padding-bottom: env(safe-area-inset-bottom, 12px);
  }
}

.qv-hero-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #f3ede2;
  overflow: hidden;
  flex-shrink: 0;
}

.qv-hero-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #f3ede2 0%, #e8dfd1 100%);
}

.qv-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.35s ease;
  cursor: zoom-in;
}

.qv-hero-img.loaded {
  opacity: 1;
}

.qv-overlay-btn {
  position: absolute;
  top: 12px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5;
  transition: transform 0.15s ease, background-color 0.2s ease;
}

.qv-overlay-btn:active {
  transform: scale(0.92);
}

.qv-close-btn {
  right: 12px;
}

.qv-fav-btn {
  left: 12px;
}

.qv-expand-img-pill {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 44px;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.76);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.24);
  color: #ffffff;
  font-family: 'Cairo', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  z-index: 5;
}

.qv-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  text-align: right;
}

.qv-category-breadcrumb {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Cairo', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  color: #685f58;
}

.qv-cat-pill {
  padding: 2px 10px;
  border-radius: 9999px;
  background: rgba(245, 158, 11, 0.14);
  color: #92400e;
  font-weight: 800;
}

.shop-theme-shop2 .qv-cat-pill {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
}

.qv-title {
  margin: 0;
  font-family: 'Cairo', sans-serif;
  font-size: 1.2rem;
  font-weight: 800;
  color: #2c2520;
  line-height: 1.35;
}

.qv-desc {
  margin: 0;
  font-family: 'Cairo', sans-serif;
  font-size: 0.9rem;
  color: #5c534a;
  line-height: 1.55;
}

.qv-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
}

.product-tag-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(217, 119, 6, 0.22);
  color: #92400e;
  font-family: 'Cairo', sans-serif;
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1.25;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.15s ease;
}

.product-tag-chip::after {
  content: '';
  position: absolute;
  top: -11px;
  bottom: -11px;
  left: 0;
  right: 0;
}

.product-tag-chip:hover {
  background: rgba(245, 158, 11, 0.18);
}

.shop-theme-shop2 .product-tag-chip {
  background: rgba(37, 99, 235, 0.08);
  border-color: rgba(37, 99, 235, 0.2);
  color: #1e40af;
}

.tag-chip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #d97706;
}

.shop-theme-shop2 .tag-chip-icon {
  color: #2563eb;
}

.qv-price-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  margin-top: 4px;
  border-top: 1px solid rgba(44, 37, 32, 0.08);
}

.qv-price-label {
  font-family: 'Cairo', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: #685f58;
}

.qv-price-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.price-item {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.price-figure {
  font-family: 'Cairo', sans-serif;
  font-size: 1.35rem;
  font-weight: 900;
  color: #2c2520;
  font-variant-numeric: tabular-nums;
}

.price-curr {
  font-family: 'Cairo', sans-serif;
  font-size: 0.8rem;
  font-weight: 800;
  color: #92400e;
}

.shop-theme-shop2 .price-curr {
  color: #1d4ed8;
}

.price-item.is-muted-secondary {
  opacity: 0.45;
  text-decoration: line-through;
}

.price-item.is-muted-secondary .price-figure {
  font-size: 0.95rem;
}

.bulk-mode-tag {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.14);
  color: #047857;
}

.qv-footer {
  padding: 12px 20px 16px;
  background: rgba(247, 243, 236, 0.65);
  border-top: 1px solid rgba(44, 37, 32, 0.06);
}

.qv-add-btn {
  width: 100%;
  min-height: 48px;
  border-radius: 14px;
  border: none;
  background: var(--primary-color, #ffbe0b);
  color: #1a1410;
  font-family: 'Cairo', sans-serif;
  font-size: 0.98rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.25);
  transition: transform 0.15s ease, opacity 0.2s ease;
}

.shop-theme-shop2 .qv-add-btn {
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
}

.qv-add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.qv-stepper-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.qv-stepper-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border: 1.5px solid rgba(44, 37, 32, 0.12);
  border-radius: 14px;
  padding: 4px;
  min-width: 140px;
}

.qv-step-btn {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: rgba(44, 37, 32, 0.06);
  color: #2c2520;
}

.qv-step-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
}

.qv-step-btn.plus {
  background: var(--primary-color, #ffbe0b);
  color: #1a1410;
}

.shop-theme-shop2 .qv-step-btn.plus {
  color: #ffffff;
}

.qv-step-val {
  font-family: 'Cairo', sans-serif;
  font-size: 1.05rem;
  font-weight: 900;
  color: #2c2520;
  padding: 0 12px;
}

.qv-done-btn {
  flex: 1;
  min-height: 48px;
  border-radius: 14px;
  border: 1px solid rgba(44, 37, 32, 0.12);
  background: #2c2520;
  color: #ffffff;
  font-family: 'Cairo', sans-serif;
  font-size: 0.92rem;
  font-weight: 800;
  cursor: pointer;
}

/* Fullscreen Lightbox Styles */
.qv-lightbox-close-btn {
  position: fixed;
  top: max(16px, env(safe-area-inset-top, 16px));
  left: 16px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 3300;
}

.qv-lightbox-stage {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qv-lightbox-img {
  max-width: 92vw;
  max-height: 86vh;
  border-radius: 16px;
  object-fit: contain;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.qv-spinner-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #ffffff;
  font-family: 'Cairo', sans-serif;
}

.qv-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: var(--primary-color, #ffbe0b);
  border-radius: 50%;
  animation: qvSpin 0.9s linear infinite;
}

@keyframes qvSpin {
  to { transform: rotate(360deg); }
}

.qv-modal-fade-enter-active,
.qv-modal-fade-leave-active {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.qv-modal-fade-enter-active .qv-sheet-card,
.qv-modal-fade-leave-active .qv-sheet-card {
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.qv-modal-fade-enter-from,
.qv-modal-fade-leave-to {
  opacity: 0;
}

.qv-modal-fade-enter-from .qv-sheet-card,
.qv-modal-fade-leave-to .qv-sheet-card {
  transform: translate3d(0, 28px, 0) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .qv-modal-fade-enter-active,
  .qv-modal-fade-leave-active,
  .qv-modal-fade-enter-active .qv-sheet-card,
  .qv-modal-fade-leave-active .qv-sheet-card,
  .product-tag-chip,
  .qv-add-btn {
    transition: none !important;
  }
  .qv-spinner {
    animation: none !important;
  }
}
</style>
