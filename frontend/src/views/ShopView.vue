<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { useShopStore } from '../stores/shop';
import ProductCard from '../components/ProductCard.vue';

const shopStore = useShopStore();

// Search and filtering state
const searchQuery = ref('');
const activeCategory = ref('');
const activeSubCategory = ref('');

onMounted(async () => {
  await shopStore.fetchMenu();
  // Set default active category to the first one available
  if (shopStore.categories.length > 0) {
    activeCategory.value = shopStore.categories[0].name;
  }
});

// Watch shop parameter change to refetch items
watch(() => shopStore.activeShop, async () => {
  await shopStore.fetchMenu();
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
  activeCategory.value = catName;
  activeSubCategory.value = ''; // Reset subcategory filter
};

// Filtered products list
const filteredProducts = computed(() => {
  let list = shopStore.products;

  // 1. Search Query filter (global)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    return list.filter(p => 
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
    // If not bulk verified, filter out bulk-only products
    if (!shopStore.isBulkVerified) {
      list = list.filter(p => p.purchaseType !== 'bulk');
    }
  }

  return list;
});

// Bulk price verification modal state
const showBulkModal = ref(false);
const bulkCodeInput = ref('');
const bulkError = ref(false);

const handleOpenBulkModal = () => {
  if (shopStore.isBulkVerified) {
    shopStore.disableBulk();
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

const openZoomModal = (url) => {
  zoomedImgUrl.value = url;
};

const closeZoomModal = () => {
  zoomedImgUrl.value = '';
};

// Header information
const shopTitle = computed(() => {
  return shopStore.activeShop === 'shop2' ? 'قسم النواشف' : 'المتجر الرئيسي';
});

const hasBulkProducts = computed(() => {
  // Check if any product in shop catalog offers bulk pricing
  return shopStore.products.some(p => p.purchaseType === 'bulk' || p.purchaseType === 'both');
});
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
        :class="{ active: shopStore.isBulkVerified }"
        @click="handleOpenBulkModal"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
        <span>{{ shopStore.isBulkVerified ? 'تعطيل أسعار الجملة' : 'تفعيل أسعار الجملة' }}</span>
      </button>
    </header>

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
        v-model="searchQuery" 
        placeholder="ابحث عن منتج..." 
        class="search-input" 
      />
      <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''">✕</button>
    </div>

    <!-- Category Selector (hidden when searching) -->
    <div v-if="!searchQuery" class="categories-row">
      <div class="scroll-container">
        <button 
          v-for="cat in shopStore.categories" 
          :key="cat._id" 
          class="cat-btn glass-panel"
          :class="{ active: activeCategory === cat.name }"
          @click="selectCategory(cat.name)"
        >
          <span class="cat-emoji">{{ cat.emoji }}</span>
          <span class="cat-name">{{ cat.name }}</span>
        </button>
      </div>
    </div>

    <!-- Subcategories filter (hidden when searching) -->
    <div v-if="!searchQuery && subCategories.length > 0" class="subcategories-row">
      <div class="scroll-container">
        <button 
          class="subcat-btn"
          :class="{ active: activeSubCategory === '' }"
          @click="activeSubCategory = ''"
        >
          الكل
        </button>
        <button 
          v-for="sub in subCategories" 
          :key="sub" 
          class="subcat-btn"
          :class="{ active: activeSubCategory === sub }"
          @click="activeSubCategory = sub"
        >
          {{ sub }}
        </button>
      </div>
    </div>

    <!-- Loading Spinner -->
    <div v-if="shopStore.isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>جاري تحميل المنيو...</p>
    </div>

    <!-- Product Grid -->
    <div v-else-if="filteredProducts.length > 0" class="product-grid">
      <ProductCard 
        v-for="product in filteredProducts" 
        :key="product._id" 
        :product="product" 
        @zoom="openZoomModal"
      />
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
  background: rgba(55, 178, 77, 0.1);
  border: 1px solid rgba(55, 178, 77, 0.2);
  color: #37b24d;
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

.bulk-toggle-btn.active {
  background: #37b24d;
  color: #fff;
}

.search-box-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  padding: 4px;
}

.search-icon {
  position: absolute;
  right: 12px;
  color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
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
  color: #495057;
  white-space: nowrap;
  cursor: pointer;
  border-color: rgba(0, 0, 0, 0.04);
  transition: background-color 0.2s, border-color 0.2s, transform 0.1s;
  flex-shrink: 0;
}

.cat-btn.active {
  background: var(--primary-color) !important;
  border-color: var(--primary-color) !important;
}

:global(.shop-theme-shop1) .cat-btn.active,
:global(.shop-theme-shop1) .cat-btn.active * {
  color: #0c0603 !important;
}

:global(.shop-theme-shop2) .cat-btn.active,
:global(.shop-theme-shop2) .cat-btn.active * {
  color: #ffffff !important;
}

.cat-emoji {
  font-size: 1.1rem;
}

.subcategories-row {
  margin-top: -4px;
}

.subcat-btn {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  color: #495057;
  padding: 4px 12px;
  border-radius: 20px;
  font-family: 'Cairo', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.subcat-btn.active {
  background: rgba(var(--primary-color-rgb), 0.12);
  border-color: rgba(var(--primary-color-rgb), 0.3);
  color: var(--primary-color);
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
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(8px);
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
