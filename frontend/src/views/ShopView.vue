<script setup>
import { computed, ref, onMounted, watch, onUnmounted, nextTick } from 'vue';
import { useShopStore } from '../stores/shop';
import ProductCard from '../components/ProductCard.vue';
import CategoryIcon from '../components/CategoryIcon.vue';
import { gsap } from 'gsap';
import { triggerHaptic } from '../utils/haptics';
import { bindSheetGesture } from '../utils/sheetGesture';
import { isImageCached, warmImageUrls } from '../utils/imageCache';
import { telemetry } from '../utils/telemetry';

const shopStore = useShopStore();

// Search and filtering state
const searchQuery = ref('');
const activeCategory = ref('');
const activeSubCategory = ref('');

const carouselItems = ref([]);
const carouselTrack = ref(null);
const loadedBannerIds = ref(new Set());

const markBannerLoaded = (id) => {
  loadedBannerIds.value.add(id);
  loadedBannerIds.value = new Set(loadedBannerIds.value);
};

const categoriesContainer = ref(null);
const hasInteractedWithCats = ref(false);
const showScrollHint = ref(false);
let hintInterval = null;

const fetchCarousel = async () => {
  try {
    const res = await fetch(`/api/marketing-carousel?shop=${shopStore.activeShop || 'shop1'}`);
    if (res.ok) {
      carouselItems.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch marketing carousel:', err);
  }
};


// Ensure activeCategory is set immediately when categories are loaded
watch(() => shopStore.categories, (cats) => {
  if (cats.length > 0 && !activeCategory.value) {
    activeCategory.value = cats[0].name;
  }
}, { immediate: true });

onMounted(async () => {
  telemetry.track('page_view', { path: '/shop', shop: shopStore.activeShop });

  if (shopStore.categories.length > 0 && !activeCategory.value) {
    activeCategory.value = shopStore.categories[0].name;
  }
  await Promise.all([shopStore.fetchMenu(), fetchCarousel()]);
  if (shopStore.categories.length > 0 && !activeCategory.value) {
    activeCategory.value = shopStore.categories[0].name;
  }

  // Setup repeating scroll hint if not interacted
  const categoriesEl = categoriesContainer.value;
  if (categoriesEl) {
    const markInteracted = () => {
      hasInteractedWithCats.value = true;
      if (hintInterval) {
        clearInterval(hintInterval);
        hintInterval = null;
      }
      showScrollHint.value = false;
      categoriesEl.removeEventListener('scroll', markInteracted);
      categoriesEl.removeEventListener('touchstart', markInteracted);
      categoriesEl.removeEventListener('mousedown', markInteracted);
      categoriesEl.removeEventListener('wheel', markInteracted);
    };

    categoriesEl.addEventListener('scroll', markInteracted, { passive: true });
    categoriesEl.addEventListener('touchstart', markInteracted, { passive: true });
    categoriesEl.addEventListener('mousedown', markInteracted, { passive: true });
    categoriesEl.addEventListener('wheel', markInteracted, { passive: true });

    // Trigger initial hint shortly after load
    setTimeout(() => {
      if (!hasInteractedWithCats.value) {
        showScrollHint.value = true;
        setTimeout(() => { showScrollHint.value = false; }, 1500);
      }
    }, 1000);

    // Repeating interval every 4 seconds
    hintInterval = setInterval(() => {
      if (hasInteractedWithCats.value) {
        if (hintInterval) {
          clearInterval(hintInterval);
          hintInterval = null;
        }
        return;
      }
      showScrollHint.value = true;
      setTimeout(() => { showScrollHint.value = false; }, 1500);
    }, 4000);
  }
});

// Watch shop parameter change to refetch items
watch(() => shopStore.activeShop, async () => {
  await Promise.all([shopStore.fetchMenu(), fetchCarousel()]);
  if (shopStore.categories.length > 0) {
    activeCategory.value = shopStore.categories[0].name;
  }
  activeSubCategory.value = '';
  searchQuery.value = '';
});

// Category properties
const currentCategoryObj = computed(() => {
  return shopStore.categories.find(c => c.name === activeCategory.value);
});

const subCategories = computed(() => {
  return currentCategoryObj.value?.subCategories || [];
});

const selectCategory = (catName) => {
  if (dragMoved.value) {
    dragMoved.value = false;
    return;
  }
  triggerHaptic('light');
  activeCategory.value = catName;
  activeSubCategory.value = ''; // Reset subcategory filter
  telemetry.track('category_select', { categoryName: catName, shop: shopStore.activeShop });
};

// Subtle GSAP Product Grid Stagger (Design Guide Section 3)
const animateProductCards = () => {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  nextTick(() => {
    gsap.from('.product-card', {
      opacity: 0,
      y: 8,
      duration: 0.3,
      stagger: 0.03,
      ease: 'power1.out'
    });
  });
};

watch(activeCategory, () => {
  animateProductCards();
});

// Helper comparator: Available products first, tagged products second, unavailable products LAST
const sortProducts = (a, b) => {
  const aAvail = a.available !== false ? 1 : 0;
  const bAvail = b.available !== false ? 1 : 0;
  if (aAvail !== bAvail) {
    return bAvail - aAvail; // 1 (available) before 0 (unavailable)
  }

  const aHasTags = a.tags && Array.isArray(a.tags) && a.tags.length > 0 ? 1 : 0;
  const bHasTags = b.tags && Array.isArray(b.tags) && b.tags.length > 0 ? 1 : 0;
  if (aHasTags !== bHasTags) {
    return bHasTags - aHasTags;
  }

  return 0;
};

// Arabic text normalization helper for robust search matching
const normalizeArabic = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove Arabic tashkeel / diacritics
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ةه]/g, 'ه')
    .replace(/[ىي]/g, 'ي');
};

// Filtered products list
const filteredProducts = computed(() => {
  let list = shopStore.products;

  // 1. Search Query filter (global across all categories)
  if (searchQuery.value.trim()) {
    const q = normalizeArabic(searchQuery.value);
    list = list.filter(p => {
      const nameNorm = normalizeArabic(p.name);
      const descNorm = normalizeArabic(p.desc);
      return nameNorm.includes(q) || descNorm.includes(q);
    });
  } else {
    // 2. Main Category filter (applied only when NOT searching)
    if (activeCategory.value) {
      list = list.filter(p => p.category === activeCategory.value);
    }

    // 3. Sub Category filter (applied only when NOT searching)
    if (activeSubCategory.value) {
      list = list.filter(p => p.subCategory === activeSubCategory.value);
    }
  }

  // 4. In Shop2, respect bulk view configurations
  if (shopStore.activeShop === 'shop2') {
    if (!shopStore.isBulkVerified) {
      list = list.filter(p => p.purchaseType !== 'bulk');
    }
  }

  // 5. Sort: Available products first, tagged products next, unavailable products LAST
  return list.slice().sort(sortProducts);
});

// Subcategory grouped products section list
const subCategorySections = computed(() => {
  if (searchQuery.value.trim()) {
    return [{ name: 'نتائج البحث', products: filteredProducts.value }];
  }

  // Guard: Do not render unassigned products before active category is set
  if (!activeCategory.value) {
    return [];
  }

  let list = shopStore.products;
  if (activeCategory.value) {
    const activeNorm = normalizeArabic(activeCategory.value);
    list = list.filter(p => normalizeArabic(p.category) === activeNorm);
  }
  if (shopStore.activeShop === 'shop2' && !shopStore.isBulkVerified) {
    list = list.filter(p => p.purchaseType !== 'bulk');
  }

  // Sort available products first, unavailable products last
  list = list.slice().sort(sortProducts);

  const subs = currentCategoryObj.value?.subCategories || [];
  const sections = [];

  if (subs.length > 0) {
    subs.forEach(subName => {
      const normSub = normalizeArabic(subName);
      const subProds = list.filter(p => normalizeArabic(p.subCategory) === normSub);
      if (subProds.length > 0) {
        sections.push({ name: subName, products: subProds });
      }
    });

    const normSubs = subs.map(s => normalizeArabic(s));
    const unassignedProds = list.filter(p => !p.subCategory || !normSubs.includes(normalizeArabic(p.subCategory)));
    if (unassignedProds.length > 0) {
      sections.push({ name: 'تشكيلة أخرى', products: unassignedProds });
    }
  } else {
    sections.push({ name: activeCategory.value || 'الكل', products: list });
  }

  return sections;
});

// Pre-warm visible product images (first 6 per row) to ensure instantaneous rendering
watch(subCategorySections, (sections) => {
  if (!sections || !sections.length) return;
  const urlsToWarm = [];
  for (const section of sections) {
    if (Array.isArray(section.products)) {
      const topItems = section.products.slice(0, 6);
      for (const item of topItems) {
        if (item && item.img) {
          urlsToWarm.push(item.img);
        }
      }
    }
  }
  if (urlsToWarm.length > 0) {
    warmImageUrls(urlsToWarm, 4);
  }
}, { immediate: true });

// Bulk price verification modal state
const showBulkModal = ref(false);
const bulkCodeInput = ref('');
const bulkError = ref(false);
const showDisableConfirm = ref(false);

const handleOpenBulkModal = () => {
  triggerHaptic('medium');
  if (shopStore.isBulkVerified) {
    showDisableConfirm.value = true;
  } else {
    showBulkModal.value = true;
    bulkCodeInput.value = '';
    bulkError.value = false;
  }
};

const handleVerifyBulk = async () => {
  const success = await shopStore.verifyBulkCode(bulkCodeInput.value);
  if (success) {
    triggerHaptic('success');
    showBulkModal.value = false;
  } else {
    triggerHaptic('warning');
    bulkError.value = true;
  }
};

// Image zoom state
const zoomedImgUrl = ref('');
const isZoomImgLoaded = ref(false);

const openZoomModal = (url) => {
  triggerHaptic('light');
  isZoomImgLoaded.value = isImageCached(url);
  zoomedImgUrl.value = url;
};

const closeZoomModal = () => {
  triggerHaptic('light');
  zoomedImgUrl.value = '';
  isZoomImgLoaded.value = false;
};

// Keyboard Escape dismiss & Tab focus trapping support for modals
const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (zoomedImgUrl.value) {
      closeZoomModal();
    } else if (showDisableConfirm.value) {
      showDisableConfirm.value = false;
    } else if (showBulkModal.value) {
      showBulkModal.value = false;
    }
    return;
  }

  // Focus trapping inside active modal
  if (e.key === 'Tab') {
    const activeModal = document.querySelector('.modal-backdrop[role="dialog"]');
    if (activeModal) {
      const focusableEls = activeModal.querySelectorAll('input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (focusableEls.length > 0) {
        const firstEl = focusableEls[0];
        const lastEl = focusableEls[focusableEls.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    }
  }
};

let cleanupBulkGesture = null;
let cleanupDisableGesture = null;

// Body scroll lock, background nav dismissal and gesture-dismissible binding
watch([showBulkModal, showDisableConfirm, zoomedImgUrl], ([bulk, disable, zoom]) => {
  if (bulk || disable || zoom) {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
  } else {
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  }

  if (bulk) {
    nextTick(() => {
      const sheet = document.querySelector('.bulk-sheet-card');
      if (sheet) {
        cleanupBulkGesture = bindSheetGesture(sheet, () => {
          showBulkModal.value = false;
        });
      }
    });
  } else if (cleanupBulkGesture) {
    cleanupBulkGesture();
    cleanupBulkGesture = null;
  }

  if (disable) {
    nextTick(() => {
      const sheet = document.querySelector('.disable-sheet-card');
      if (sheet) {
        cleanupDisableGesture = bindSheetGesture(sheet, () => {
          showDisableConfirm.value = false;
        });
      }
    });
  } else if (cleanupDisableGesture) {
    cleanupDisableGesture();
    cleanupDisableGesture = null;
  }
});

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

// Header information
const shopTitle = computed(() => {
  return shopStore.activeShop === 'shop2' ? 'قسم النواشف' : 'المتجر الرئيسي';
});

const hasBulkProducts = computed(() => {
  // Check if any product in shop catalog offers bulk pricing with a valid bulk price
  return shopStore.products.some(p => 
    (p.purchaseType === 'bulk' || p.purchaseType === 'both') &&
    p.price_bulk !== null && p.price_bulk !== undefined && p.price_bulk !== ''
  );
});

// Horizontal scrolling for mouse users on PC views
const handleHorizontalScroll = (event) => {
  const container = event.currentTarget;
  if (container) {
    container.scrollLeft += event.deltaY;
  }
};

// Hold & Drag scrolling for mouse users on PC views
const isDragging = ref(false);
const startX = ref(0);
const scrollLeftStart = ref(0);
const activeContainer = ref(null);
const dragMoved = ref(false);
const currentAdIndex = ref(0);
const isPaused = ref(false);

const startDrag = (event) => {
  isDragging.value = true;
  isPaused.value = true;
  dragMoved.value = false;
  activeContainer.value = event.currentTarget;
  startX.value = event.pageX - activeContainer.value.offsetLeft;
  scrollLeftStart.value = activeContainer.value.scrollLeft;
  activeContainer.value.style.cursor = 'grabbing';
  window.addEventListener('mousemove', drag, { passive: false });
  window.addEventListener('mouseup', endDrag);
};

const drag = (event) => {
  if (!isDragging.value || !activeContainer.value) return;
  const x = event.pageX - activeContainer.value.offsetLeft;
  const walk = (x - startX.value) * 1.5;
  if (Math.abs(walk) > 5) {
    dragMoved.value = true;
    event.preventDefault();
  }
  activeContainer.value.scrollLeft = scrollLeftStart.value - walk;
};

const endDrag = () => {
  if (activeContainer.value) {
    activeContainer.value.style.cursor = 'default';
  }
  isDragging.value = false;
  isPaused.value = false;
  activeContainer.value = null;
  window.removeEventListener('mousemove', drag);
  window.removeEventListener('mouseup', endDrag);
};

const selectSubCategory = (subName) => {
  if (dragMoved.value) {
    dragMoved.value = false;
    return;
  }
  activeSubCategory.value = subName;
};

const handleCarouselClick = (event) => {
  if (dragMoved.value) {
    event.preventDefault();
    event.stopPropagation();
    dragMoved.value = false;
  }
};

let autoplayTimer = null;

const startAutoplay = () => {
  stopAutoplay();
  autoplayTimer = setInterval(() => {
    if (carouselItems.value.length <= 1 || isDragging.value || isPaused.value || !carouselTrack.value) return;
    
    if (currentAdIndex.value >= carouselItems.value.length - 1) {
      currentAdIndex.value = 0;
    } else {
      currentAdIndex.value++;
    }
    
    const cardW = carouselTrack.value.clientWidth;
    const targetLeft = -currentAdIndex.value * (cardW + 12);
    carouselTrack.value.scrollTo({
      left: targetLeft,
      behavior: 'smooth'
    });
  }, 6000); // 6s step interval
};

const stopAutoplay = () => {
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
};

onUnmounted(() => {
  document.body.style.overflow = '';
  document.body.classList.remove('modal-open');
  if (cleanupBulkGesture) cleanupBulkGesture();
  if (cleanupDisableGesture) cleanupDisableGesture();
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('mousemove', drag);
  window.removeEventListener('mouseup', endDrag);
  stopAutoplay();
  if (carouselTrack.value) {
    carouselTrack.value.removeEventListener('scroll', handleCarouselScroll);
  }
  if (hintInterval) {
    clearInterval(hintInterval);
    hintInterval = null;
  }
});

const handleCarouselScroll = () => {
  const el = carouselTrack.value;
  if (!el) return;
  const cardW = el.clientWidth;
  if (cardW > 0) {
    const scrollPos = Math.abs(el.scrollLeft);
    currentAdIndex.value = Math.round(scrollPos / (cardW + 12));
  }
};

// Watch carouselTrack reference to bind standard scroll listener for active index syncing
watch(carouselTrack, (el, oldEl) => {
  if (oldEl) oldEl.removeEventListener('scroll', handleCarouselScroll);
  if (el) el.addEventListener('scroll', handleCarouselScroll);
});

watch(carouselItems, (newItems) => {
  if (newItems.length > 0) {
    startAutoplay();
  } else {
    stopAutoplay();
  }
}, { immediate: true });
</script>

<template>
  <div class="shop-view-container">
    <!-- Header -->
    <header class="shop-header glass-panel">
      <div class="header-main">
        <a href="/" class="back-home-btn" aria-label="الرجوع للرئيسية">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 19 12 12 5"></polyline>
          </svg>
        </a>
        <h1 class="shop-title">{{ shopTitle }}</h1>
        <div class="logo-placeholder">
          <img :src="shopStore.activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'" alt="Logo" class="shop-logo" />
        </div>
      </div>
      
      <!-- Wholesale toggle button (only shown if bulk prices are offered) -->
      <button 
        v-if="hasBulkProducts"
        type="button"
        class="bulk-toggle-btn"
        :class="{ active: shopStore.isBulkVerified, disabled: !shopStore.isBulkVerified }"
        @click="handleOpenBulkModal"
        :aria-label="shopStore.isBulkVerified ? 'أسعار الجملة مفعّلة، انقر لإلغاء التفعيل' : 'تفعيل أسعار الجملة'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
        <span>{{ shopStore.isBulkVerified ? 'أسعار الجملة: مفعّلة' : 'أسعار الجملة' }}</span>
        <svg v-if="shopStore.isBulkVerified" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </button>
    </header>

    <!-- Marketing Carousel -->
    <div v-if="!searchQuery && carouselItems.length > 0" class="carousel-wrapper">
      <div 
        ref="carouselTrack"
        class="carousel-track" 
        @wheel.prevent="handleHorizontalScroll"
        @mousedown="startDrag"
        @mousemove="drag"
        @mouseup="endDrag"
        @mouseleave="endDrag"
        @mouseenter="isPaused = true"
        @touchstart="isPaused = true"
        @touchend="isPaused = false"
        @touchcancel="isPaused = false"
      >
        <component
          :is="item.link ? 'a' : 'div'"
          v-for="(item, idx) in carouselItems"
          :key="item._id"
          :href="item.link || undefined"
          :aria-label="item.link ? (item.title || 'إعلان ترويجي') : undefined"
          class="carousel-card"
          @click="handleCarouselClick"
          draggable="false"
        >
          <!-- Shimmer Placeholder until banner is loaded -->
          <div v-if="!loadedBannerIds.has(item._id)" class="carousel-skeleton-shimmer">
            <div class="shimmer-wave"></div>
          </div>

          <!-- Banner Image with View-Aware Prioritization & Smooth Fade-in -->
          <img 
            :src="item.image"
            :alt="item.title || 'Banner'"
            class="carousel-banner-img"
            :class="{ 'loaded': loadedBannerIds.has(item._id) }"
            :fetchpriority="idx === 0 ? 'high' : 'auto'"
            :loading="idx === 0 ? 'eager' : 'lazy'"
            decoding="async"
            @load="markBannerLoaded(item._id)"
            @error="markBannerLoaded(item._id)"
          />
        </component>
      </div>
    </div>

    <!-- Search Input -->
    <div class="search-box-wrapper glass-panel">
      <div class="search-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>
      <input 
        type="text" 
        name="search"
        autocomplete="off"
        inputmode="search"
        aria-label="البحث عن منتج"
        v-model="searchQuery" 
        placeholder="بحث عن منتج…" 
        class="search-input" 
      />
      <button 
        v-if="searchQuery" 
        type="button"
        class="clear-search-btn" 
        aria-label="مسح البحث"
        @click="searchQuery = ''"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <!-- Category Selector (hidden when searching or loading) -->
    <div v-if="!searchQuery && !shopStore.isLoading" class="categories-row">
      <div 
        ref="categoriesContainer"
        class="scroll-container" 
        :class="{ 'scroll-hint-bounce': showScrollHint }"
        @wheel.prevent="handleHorizontalScroll"
        @mousedown="startDrag"
        @mousemove="drag"
        @mouseup="endDrag"
        @mouseleave="endDrag"
      >
        <button 
          v-for="cat in shopStore.categories" 
          :key="cat._id" 
          class="cat-btn glass-panel"
          :class="{ active: activeCategory === cat.name }"
          @click="selectCategory(cat.name)"
        >
          <CategoryIcon :icon="cat.icon" :name="cat.name" :emoji="cat.emoji" />
          <span class="cat-name">{{ cat.name }}</span>
        </button>
      </div>
    </div>

    <!-- Shop Skeleton Loader (while shopStore.isLoading) -->
    <div v-if="shopStore.isLoading" class="shop-skeleton-wrapper" aria-busy="true" aria-label="جاري تحميل المنتجات">
      <!-- Category Pills Skeleton Row -->
      <div class="skeleton-categories-row" aria-hidden="true">
        <div v-for="i in 6" :key="'skel-cat-' + i" class="skeleton-cat-pill glass-panel">
          <div class="skeleton-shimmer skeleton-cat-icon"></div>
          <div class="skeleton-shimmer skeleton-cat-name"></div>
        </div>
      </div>

      <!-- Sub-Category Sections Skeleton (2 stacked rows matching real shop layout) -->
      <div class="subcat-sections-wrapper skeleton-sections-wrapper" aria-hidden="true">
        <div v-for="s in 2" :key="'skel-sec-' + s" class="subcat-plain-section">
          <!-- Section Header Skeleton -->
          <div class="subcat-plain-header">
            <div class="skeleton-shimmer skeleton-sec-title"></div>
            <div class="skeleton-shimmer skeleton-sec-badge"></div>
          </div>

          <!-- Horizontal 1-Row Products Grid Skeleton -->
          <div class="subcat-products-grid-1row skeleton-products-grid">
            <div v-for="c in 4" :key="'skel-card-' + s + '-' + c" class="product-card skeleton-card glass-panel">
              <!-- Card Image Skeleton -->
              <div class="img-wrapper skeleton-card-img">
                <div class="skeleton-shimmer skeleton-shimmer-fill"></div>
              </div>
              <!-- Card Info Skeleton -->
              <div class="product-info skeleton-card-info">
                <div class="info-body">
                  <div class="skeleton-shimmer skeleton-title-bar"></div>
                  <div class="skeleton-shimmer skeleton-desc-bar"></div>
                  <div class="prices-row skeleton-prices-row">
                    <div class="skeleton-shimmer skeleton-pill-bar"></div>
                  </div>
                </div>
                <div class="actions-row skeleton-actions-row">
                  <div class="skeleton-shimmer skeleton-btn-bar"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sub-Category Product Sections (1 Horizontal Scrollable Row Per Sub-Category) -->
    <div v-else-if="subCategorySections.length > 0" class="subcat-sections-wrapper">
      <div 
        v-for="group in subCategorySections" 
        :key="group.name" 
        class="subcat-plain-section animate-fade-in"
      >
        <!-- Subcategory Section Plain Header -->
        <div class="subcat-plain-header">
          <h2 class="subcat-plain-title">{{ group.name }}</h2>
          <span class="subcat-plain-badge">{{ group.products.length }}</span>
        </div>

        <!-- 1 Horizontal Scrollable Product Row Per Sub-Category -->
        <div 
          class="subcat-products-grid-1row" 
          @wheel.prevent="handleHorizontalScroll"
          @mousedown="startDrag"
          @mousemove="drag"
          @mouseup="endDrag"
          @mouseleave="endDrag"
        >
          <ProductCard 
            v-for="(product, pIdx) in group.products" 
            :key="product._id" 
            :product="product" 
            :priority="pIdx < 6 ? 'high' : 'auto'"
            @zoom="openZoomModal"
          />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state glass-panel">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="empty-icon" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
      <p>لا توجد منتجات مطابقة لخيارات التصفية الحالية.</p>
    </div>

    <!-- Bulk code validation Modal -->
    <Teleport to="body">
      <Transition name="modal-sheet">
        <div 
          v-if="showBulkModal" 
          class="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="التحقق من رمز الجملة"
          @click.self="showBulkModal = false"
        >
          <div class="modal-content bulk-sheet-card glass-panel" @click.stop>
            <div class="sheet-grab-handle" aria-hidden="true"></div>
            <h3 class="modal-title">تفعيل أسعار الجملة</h3>
            <p class="modal-desc">رمز التحقق المكون من 4 أرقام لتفعيل أسعار الجملة:</p>
            
            <input 
              type="password" 
              v-model="bulkCodeInput" 
              placeholder="رمز التحقق (4 أرقام)…" 
              maxlength="4"
              inputmode="numeric"
              autocomplete="one-time-code"
              aria-label="رمز التحقق المكون من 4 أرقام"
              class="form-input text-center font-bold"
              @keyup.enter="handleVerifyBulk"
            />
            
            <p v-if="bulkError" class="error-msg">رمز التحقق غير صحيح، أعد المحاولة.</p>

            <div class="modal-actions">
              <button type="button" class="modal-btn confirm" @click="handleVerifyBulk">تأكيد الرمز</button>
              <button type="button" class="modal-btn cancel" @click="showBulkModal = false">إلغاء</button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Disable Bulk Confirmation Modal -->
      <Transition name="modal-sheet">
        <div 
          v-if="showDisableConfirm" 
          class="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="تأكيد تعطيل الجملة"
          @click.self="showDisableConfirm = false"
        >
          <div class="modal-content disable-sheet-card glass-panel" @click.stop>
            <div class="sheet-grab-handle" aria-hidden="true"></div>
            <h3 class="modal-title">تعطيل أسعار الجملة</h3>
            <p class="modal-desc">هل أنت متأكد من تعطيل أسعار الجملة؟</p>
            <div class="modal-actions">
              <button type="button" class="modal-btn confirm" style="background:#ff4d4f" @click="shopStore.disableBulk(); showDisableConfirm = false">نعم، تعطيل</button>
              <button type="button" class="modal-btn cancel" @click="showDisableConfirm = false">إلغاء</button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Image Zoom Modal -->
      <Transition name="zoom-fade">
        <div 
          v-if="zoomedImgUrl" 
          class="zoom-backdrop" 
          role="dialog"
          aria-modal="true"
          aria-label="عرض الصورة بالدقة الكاملة"
          @click.self="closeZoomModal"
        >
          <!-- Fixed Top-Left Close Button -->
          <button type="button" class="zoom-close-btn" @click.stop="closeZoomModal" aria-label="إغلاق">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div class="zoom-content" @click.stop>
            <!-- Shimmer & Spinner Loader while full-size image downloads -->
            <div v-if="!isZoomImgLoaded" class="zoom-skeleton-loader">
              <div class="spinner"></div>
              <p class="zoom-loading-text">جاري عرض الصورة بالدقة الكاملة…</p>
            </div>

            <img 
              :src="zoomedImgUrl" 
              alt="صورة المنتج الكاملة" 
              class="zoom-image"
              :class="{ 'loaded': isZoomImgLoaded }"
              fetchpriority="high"
              loading="eager"
              decoding="async"
              @load="isZoomImgLoaded = true"
              @error="isZoomImgLoaded = true"
            />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.shop-view-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.shop-header {
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: linear-gradient(180deg, var(--bg-card) 0%, rgba(255, 253, 249, 0.6) 100%);
  border-bottom: 1px solid rgba(44, 37, 32, 0.04);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
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

.shop-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #2c2520;
}

.logo-placeholder {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--primary-color);
}

.shop-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bulk-toggle-btn {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: var(--text-color, #2c2520);
  font-family: 'Cairo', sans-serif;
  font-weight: 750;
  font-size: 0.85rem;
  padding: 8px 12px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  width: 100%;
  margin-top: 4px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.bulk-toggle-btn.disabled {
  background: rgba(255, 253, 249, 0.9);
  border: 1px solid rgba(203, 213, 225, 0.8);
  color: #64748b;
}

.bulk-toggle-btn.disabled:hover {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.4);
  color: #d97706;
}

.bulk-toggle-btn.active {
  background: linear-gradient(135deg, #10b981, #059669);
  border-color: #059669;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.25);
}


.search-box-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  padding: 4px;
  background: rgba(255, 253, 249, 0.85);
  border-color: rgba(44, 37, 32, 0.05);
}

.search-icon {
  position: absolute;
  right: 12px;
  color: #8a8078;
  display: flex;
  align-items: center;
  transition: color 0.2s ease;
}

.search-input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 2rem;
  background: transparent;
  border: none;
  color: #2c2520;
  font-family: 'Cairo', sans-serif;
  font-size: 0.95rem;
}

.search-input:focus {
  outline: none;
}

.search-input:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.clear-search-btn {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: rgba(0, 0, 0, 0.45);
  font-size: 1.1rem;
  cursor: pointer;
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  touch-action: manipulation;
  transition: background-color 0.15s ease, color 0.15s ease;
}

/* 48x48px invisible hit pad for mobile ergonomics (WCAG 2.5.5) */
.clear-search-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  pointer-events: auto;
}

.clear-search-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #000;
}

.clear-search-btn:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.cat-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0.6rem 1rem;
  font-family: 'Cairo', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: #5c534a;
  white-space: nowrap;
  cursor: pointer;
  border-color: rgba(44, 37, 32, 0.06);
  background: rgba(255, 253, 249, 0.9);
  transition: background-color 0.25s ease, border-color 0.25s ease, transform 0.15s ease, box-shadow 0.25s ease;
  flex-shrink: 0;
}

.cat-btn.active {
  background: var(--primary-color) !important;
  border-color: var(--primary-color) !important;
}

.cat-emoji {
  font-size: 1.1rem;
}

/* Sub-Category Product Sections (2 Horizontal Scrollable Rows Stacked - No Box Container) */
.subcat-sections-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 0.5rem;
}

.subcat-plain-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.subcat-plain-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
}

.subcat-plain-title {
  font-family: 'Cairo', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  color: #2c2520;
  margin: 0;
}

.subcat-plain-badge {
  font-family: 'Cairo', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary-color);
  background: rgba(var(--primary-color-rgb), 0.1);
  padding: 2px 8px;
  border-radius: 12px;
}

.subcat-products-grid-1row {
  display: grid;
  grid-template-rows: 1fr;
  grid-auto-flow: column;
  grid-auto-columns: minmax(220px, 260px);
  gap: 14px;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  padding: 6px 12px 14px 12px;
  scrollbar-width: none;
  
  /* Horizontal scrollability fade effect on edge boundaries */
  mask-image: linear-gradient(to right, transparent 0%, black 6px, black calc(100% - 6px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 6px, black calc(100% - 6px), transparent 100%);
}

.subcat-products-grid-1row::-webkit-scrollbar {
  display: none;
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
  border: 3px solid rgba(255,255,255,0.1);
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
  padding: 3rem 1.5rem;
  gap: 12px;
  color: var(--text-muted);
}

.empty-icon {
  opacity: 0.4;
}

/* ========================================================================= */
/* POPUP MODALS MATERIALIZATION & BACKDROP ENTRANCE                          */
/* ========================================================================= */
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(44, 37, 32, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 2500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  will-change: opacity;
}

.modal-content {
  width: 100%;
  max-width: 400px;
  padding: 2rem 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--shadow-xl);
  will-change: transform, opacity;
  transform: translateZ(0);
}

@media (max-width: 768px) {
  .modal-backdrop {
    align-items: flex-end !important;
    padding: 0 !important;
  }

  .modal-content {
    border-radius: 20px 20px 0 0 !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding-bottom: max(20px, env(safe-area-inset-bottom, 20px)) !important;
  }
}

.modal-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #2c2520;
}

.modal-desc {
  font-size: 0.85rem;
  color: #6c757d;
  line-height: 1.4;
}

.error-msg {
  color: #e63946;
  font-size: 0.8rem;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.modal-btn {
  flex: 1;
  padding: 0.65rem 1rem;
  min-height: 44px;
  border-radius: 8px;
  font-family: 'Cairo', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease, transform 0.15s ease;
}

.modal-btn:active {
  transform: scale(0.98);
}

.modal-btn.confirm {
  background: #37b24d;
  color: #fff;
}

.modal-btn.cancel {
  background: rgba(0, 0, 0, 0.05);
  color: #495057;
}

/* Zoom Image Modal */
.zoom-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(10, 15, 26, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 2500;
  display: flex;
  align-items: center;
  justify-content: center;
  direction: ltr;
  padding: 16px;
  box-sizing: border-box;
  will-change: opacity;
}

.zoom-content {
  position: relative;
  width: 100%;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  will-change: transform, opacity;
  transform: translateZ(0);
}

.zoom-skeleton-loader {
  width: 280px;
  max-width: 85vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 2rem 1.5rem;
  color: #f8fafc;
  background: rgba(30, 41, 59, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  direction: rtl;
}

.zoom-loading-text {
  font-family: 'Cairo', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: #cbd5e1;
  margin: 0;
}

.zoom-image {
  max-width: 100%;
  max-height: 80vh;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  background: rgba(15, 23, 42, 0.8);
}

.zoom-image.loaded {
  opacity: 1;
  transform: scale(1);
}

.zoom-close-btn {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 2600;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.25rem;
  font-weight: bold;
  cursor: pointer;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.zoom-close-btn:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 3px;
}

.zoom-close-btn:active {
  transform: scale(0.9);
}

/* Marketing Carousel */
.carousel-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
}

.carousel-track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  gap: 12px;
  padding: 4px 0;
  -webkit-overflow-scrolling: touch;
  width: 100%;
}

.carousel-track::-webkit-scrollbar {
  display: none;
}

.carousel-card {
  flex: 0 0 100%;
  scroll-snap-align: start;
  position: relative;
  aspect-ratio: 3 / 1;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.4);
  box-shadow: var(--shadow-md);
  display: block;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  user-drag: none;
  -webkit-user-drag: none;
  user-select: none;
  -webkit-user-select: none;
}

.carousel-skeleton-shimmer {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.75), rgba(15, 23, 42, 0.9));
  z-index: 1;
  overflow: hidden;
}

.carousel-banner-img {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover;
  opacity: 0;
  transform: scale(1.02);
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s ease;
  z-index: 2;
}

.carousel-banner-img.loaded {
  opacity: 1;
  transform: scale(1);
}

.carousel-card:active {
  transform: scale(0.98);
}

/* GPU-composited hardware accelerated skeleton shimmer */
.skeleton-shimmer {
  position: relative;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.18);
  contain: layout paint;
}

.skeleton-shimmer::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.35) 50%,
    transparent 100%
  );
  animation: skeletonTranslateShimmer 1.6s infinite ease-in-out;
  will-change: transform;
}

@keyframes skeletonTranslateShimmer {
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(200%, 0, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer::after {
    animation: none;
    display: none;
  }
}

@media (max-width: 640px) {
  .modal-backdrop {
    align-items: flex-end;
    padding: 0;
  }

  .modal-content {
    max-width: 100%;
    border-radius: 24px 24px 0 0;
    padding: 14px 20px calc(22px + env(safe-area-inset-bottom, 12px)) 20px !important;
    margin: 0;
    border-bottom: none;
    border-left: none;
    border-right: none;
  }
}

.sheet-grab-handle {
  width: 38px;
  height: 4.5px;
  border-radius: 3px;
  background: rgba(148, 163, 184, 0.45);
  margin: 0 auto 10px auto;
  display: none;
}

@media (max-width: 640px) {
  .sheet-grab-handle {
    display: block;
  }
}

/* Symmetrical Modal Sheet Transitions (Desktop Fade-Out / Mobile Spring-Down) */
.modal-sheet-enter-active {
  animation: modalBackdropFadeIn 0.22s ease-out both !important;
  will-change: opacity;
}

.modal-sheet-leave-active {
  animation: modalBackdropFadeOut 0.22s ease-in both !important;
  will-change: opacity;
}

.modal-sheet-enter-active .modal-content {
  animation: modalDesktopCardEnter 0.22s cubic-bezier(0.16, 1, 0.3, 1) both !important;
  will-change: transform, opacity;
}

.modal-sheet-leave-active .modal-content {
  animation: modalDesktopCardExit 0.22s cubic-bezier(0.4, 0, 0.2, 1) both !important;
  will-change: transform, opacity;
}

@media (max-width: 768px) {
  .modal-sheet-enter-active {
    animation: modalBackdropFadeIn 0.32s ease-out both !important;
  }

  .modal-sheet-leave-active {
    animation: modalBackdropFadeOut 0.28s ease-in both !important;
  }

  .modal-sheet-enter-active .modal-content {
    animation: modalMobileSheetEnter 0.32s cubic-bezier(0.16, 1, 0.3, 1) both !important;
    will-change: transform;
  }

  .modal-sheet-leave-active .modal-content {
    animation: modalMobileSpringDown 0.28s cubic-bezier(0.32, 1, 0.23, 1) both !important;
    will-change: transform;
  }
}


/* Button Instant Touch/Press Feedback */
.bulk-toggle-btn:active,
.cat-btn:active,
.back-home-btn:active {
  transform: scale(0.97) !important;
  transition: transform 0.08s ease-out;
}

/* Comprehensive Shop Skeleton Layout */
.shop-skeleton-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
  pointer-events: none;
  user-select: none;
}

.skeleton-categories-row {
  display: flex;
  gap: 10px;
  overflow-x: hidden;
  padding: 4px 4px 8px 4px;
}

.skeleton-cat-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  min-width: 105px;
  height: 42px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: var(--bg-card, rgba(255, 253, 249, 0.85));
}

.skeleton-cat-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-cat-name {
  width: 52px;
  height: 14px;
  border-radius: 4px;
}

.skeleton-sec-title {
  width: 120px;
  height: 20px;
  border-radius: 6px;
}

.skeleton-sec-badge {
  width: 28px;
  height: 18px;
  border-radius: 12px;
}

.skeleton-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  height: 100%;
  min-height: 290px;
  background: var(--bg-card, rgba(255, 253, 249, 0.95));
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.skeleton-card-img {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.08);
}

.skeleton-shimmer-fill {
  width: 100%;
  height: 100%;
}

.skeleton-card-info {
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
}

.skeleton-title-bar {
  width: 80%;
  height: 16px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.skeleton-desc-bar {
  width: 55%;
  height: 12px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.skeleton-pill-bar {
  width: 64px;
  height: 22px;
  border-radius: 6px;
}

.skeleton-btn-bar {
  width: 100%;
  height: 40px;
  border-radius: 10px;
}

/* Mobile Responsive 80% Scale (≤ 768px) */
@media (max-width: 768px) {
  .shop-header {
    padding: 0.65rem 0.75rem;
    gap: 6px;
  }
  
  .shop-title {
    font-size: 1.05rem;
  }
  
  .logo-placeholder {
    width: 34px;
    height: 34px;
  }
  
  .bulk-toggle-btn {
    padding: 6px 10px;
    font-size: 0.76rem;
    border-radius: 8px;
  }
  
  .search-box-wrapper {
    padding: 2px 4px;
    border-radius: 12px;
  }
  
  .search-input {
    padding: 0.55rem 2.2rem 0.55rem 1.8rem;
    font-size: 0.88rem !important;
  }
  
  .cat-btn {
    padding: 0.45rem 0.8rem;
    gap: 5px;
    font-size: 0.8rem;
    border-radius: 10px;
  }

  .subcat-sections-wrapper {
    gap: 1.1rem;
    margin-top: 0.35rem;
  }
  
  .subcat-plain-title {
    font-size: 0.96rem;
  }
  
  .subcat-plain-badge {
    font-size: 0.68rem;
    padding: 1px 6px;
  }

  /* Compact 1-row product grid matching 80% zoom scale */
  .subcat-products-grid-1row {
    grid-auto-columns: minmax(172px, 205px);
    gap: 10px;
    padding: 4px 6px 10px 6px;
  }
}
</style>
