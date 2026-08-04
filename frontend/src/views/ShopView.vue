<script setup>
import { computed, ref, onMounted, watch, onUnmounted, nextTick } from 'vue';
import { useShopStore } from '../stores/shop';
import ProductCard from '../components/ProductCard.vue';
import CategoryIcon from '../components/CategoryIcon.vue';
import { gsap } from 'gsap';

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


onMounted(async () => {
  await Promise.all([shopStore.fetchMenu(), fetchCarousel()]);
  if (shopStore.categories.length > 0) {
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
  activeCategory.value = catName;
  activeSubCategory.value = ''; // Reset subcategory filter
};

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

// Filtered products list
const filteredProducts = computed(() => {
  let list = shopStore.products;

  // 1. Search Query filter (global)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.desc && p.desc.toLowerCase().includes(q))
    );
  }

  // 2. Main Category filter
  if (activeCategory.value) {
    list = list.filter(p => p.category === activeCategory.value);
  }

  // 3. Sub Category filter
  if (activeSubCategory.value) {
    list = list.filter(p => p.subCategory === activeSubCategory.value);
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

  let list = shopStore.products;
  if (activeCategory.value) {
    list = list.filter(p => p.category === activeCategory.value);
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
      const subProds = list.filter(p => p.subCategory === subName);
      if (subProds.length > 0) {
        sections.push({ name: subName, products: subProds });
      }
    });

    const unassignedProds = list.filter(p => !p.subCategory || !subs.includes(p.subCategory));
    if (unassignedProds.length > 0) {
      sections.push({ name: 'تشكيلة أخرى', products: unassignedProds });
    }
  } else {
    sections.push({ name: activeCategory.value || 'الكل', products: list });
  }

  return sections;
});

// GSAP entrance stagger animation for product grid
watch(filteredProducts, () => {
  nextTick(() => {
    const cards = document.querySelectorAll('.product-card');
    if (cards.length > 0) {
      gsap.fromTo(cards, 
        { opacity: 0, y: 12, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, stagger: 0.03, ease: 'power1.out', overwrite: 'auto' }
      );
    }
  });
}, { immediate: true });

// Bulk price verification modal state
const showBulkModal = ref(false);
const bulkCodeInput = ref('');
const bulkError = ref(false);
const showDisableConfirm = ref(false);

const handleOpenBulkModal = () => {
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
    showBulkModal.value = false;
  } else {
    bulkError.value = true;
  }
};

// Image zoom state
const zoomedImgUrl = ref('');
const isZoomImgLoaded = ref(false);

const openZoomModal = (url) => {
  isZoomImgLoaded.value = false;
  zoomedImgUrl.value = url;
};

const closeZoomModal = () => {
  zoomedImgUrl.value = '';
  isZoomImgLoaded.value = false;
};

// Header information
const shopTitle = computed(() => {
  return shopStore.activeShop === 'shop2' ? 'قسم النواشف' : 'المتجر الرئيسي';
});

const hasBulkProducts = computed(() => {
  // Check if any product in shop catalog offers bulk pricing
  return shopStore.products.some(p => p.purchaseType === 'bulk' || p.purchaseType === 'both');
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
};

const drag = (event) => {
  if (!isDragging.value || !activeContainer.value) return;
  event.preventDefault();
  const x = event.pageX - activeContainer.value.offsetLeft;
  const walk = (x - startX.value) * 1.5;
  if (Math.abs(walk) > 5) {
    dragMoved.value = true;
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
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
        class="bulk-toggle-btn"
        :class="{ active: shopStore.isBulkVerified, disabled: !shopStore.isBulkVerified }"
        @click="handleOpenBulkModal"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
        <span>أسعار الجملة: {{ shopStore.isBulkVerified ? 'مفعّلة' : 'معطّلة' }}</span>
        <svg v-if="shopStore.isBulkVerified" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
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
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>
      <input 
        type="text" 
        name="search"
        autocomplete="off"
        v-model="searchQuery" 
        placeholder="ابحث عن منتج…" 
        class="search-input" 
      />
      <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''">✕</button>
    </div>

    <!-- Category Selector (hidden when searching) -->
    <div v-if="!searchQuery" class="categories-row">
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

    <!-- Loading Spinner -->
    <div v-if="shopStore.isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>جاري تحميل المنيو…</p>
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
            :priority="pIdx < 4 ? 'high' : 'auto'"
            @zoom="openZoomModal"
          />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state glass-panel">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="empty-icon">
        <circle cx="12" cy="12" r="10"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
      <p>لا توجد منتجات مطابقة لخيارات التصفية الحالية.</p>
    </div>

    <!-- Bulk code validation Modal -->
    <div v-if="showBulkModal" class="modal-backdrop">
      <div class="modal-content glass-panel">
        <h3 class="modal-title">تفعيل أسعار الجملة</h3>
        <p class="modal-desc">يرجى إدخال رمز التحقق المكون من 4 أرقام لتفعيل تسعير الجملة.</p>
        
        <input 
          type="password" 
          v-model="bulkCodeInput" 
          placeholder="رمز التحقق (4 أرقام)" 
          maxlength="4"
          class="form-input text-center font-bold"
          @keyup.enter="handleVerifyBulk"
        />
        
        <p v-if="bulkError" class="error-msg">الرمز غير صحيح! يرجى المحاولة مرة أخرى.</p>

        <div class="modal-actions">
          <button class="modal-btn confirm" @click="handleVerifyBulk">تأكيد الرمز</button>
          <button class="modal-btn cancel" @click="showBulkModal = false">إلغاء</button>
        </div>
      </div>
    </div>

    <!-- Disable Bulk Confirmation Modal -->
    <div v-if="showDisableConfirm" class="modal-backdrop">
      <div class="modal-content glass-panel">
        <h3 class="modal-title">تعطيل أسعار الجملة</h3>
        <p class="modal-desc">هل أنت متأكد من تعطيل أسعار الجملة؟</p>
        <div class="modal-actions">
          <button class="modal-btn confirm" style="background:#ff4d4f" @click="shopStore.disableBulk(); showDisableConfirm = false">نعم، تعطيل</button>
          <button class="modal-btn cancel" @click="showDisableConfirm = false">إلغاء</button>
        </div>
      </div>
    </div>

    <!-- Image Zoom Modal -->
    <div v-if="zoomedImgUrl" class="zoom-backdrop" @click="closeZoomModal">
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
        <button class="zoom-close-btn" @click="closeZoomModal" aria-label="إغلاق">✕</button>
      </div>
    </div>
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
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.2);
  color: #ff4d4f;
  font-family: 'Cairo', sans-serif;
  font-weight: 700;
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
  transition: background-color 0.2s, color 0.2s;
}

.bulk-toggle-btn.disabled {
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.2);
  color: #ff4d4f;
}
.bulk-toggle-btn.active {
  background: #37b24d;
  color: #fff;
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

.clear-search-btn {
  position: absolute;
  left: 12px;
  background: transparent;
  border: none;
  color: rgba(0, 0, 0, 0.4);
  font-size: 1rem;
  cursor: pointer;
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

/* Modals styling */
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(44, 37, 32, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
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
  border-radius: 8px;
  font-family: 'Cairo', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
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
  background: rgba(10, 15, 26, 0.92);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.25s ease;
}

.zoom-content {
  position: relative;
  max-width: 92vw;
  max-height: 88vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-skeleton-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 3rem 2rem;
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

.zoom-loading-text {
  font-family: 'Cairo', sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  color: #cbd5e1;
  margin: 0;
}

.zoom-image {
  max-width: 100%;
  max-height: 85vh;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  opacity: 0;
  transform: scale(0.94);
  transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  background: rgba(15, 23, 42, 0.8);
}

.zoom-image.loaded {
  opacity: 1;
  transform: scale(1);
}

.zoom-close-btn {
  position: absolute;
  top: -45px;
  left: 0;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: transform 0.2s, background 0.2s;
}

.zoom-close-btn:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.28);
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
</style>
