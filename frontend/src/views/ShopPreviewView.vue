<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useShopStore } from '../stores/shop';
import { useCartStore } from '../stores/cart';
import { useFavoritesStore } from '../stores/favorites';
import { useToastStore } from '../stores/toast';
import CategoryIcon from '../components/CategoryIcon.vue';
import { triggerHaptic } from '../utils/haptics';
import { flyToCart } from '../utils/flyToCart';
import { normalizeImageUrl } from '../utils/imageCache';

const router = useRouter();
const shopStore = useShopStore();
const cartStore = useCartStore();
const favoritesStore = useFavoritesStore();
const toastStore = useToastStore();

// View Controls
const viewMode = ref('grid'); // 'grid' (2-column touch grid) | 'scroll' (horizontal category rows)
const searchQuery = ref('');
const activeCategory = ref('');

// Switch shops
const toggleShop = async (shopKey) => {
  triggerHaptic('selection');
  shopStore.setShop(shopKey);
  await shopStore.fetchMenu();
  if (shopStore.categories.length > 0) {
    activeCategory.value = shopStore.categories[0].name;
  }
};

onMounted(async () => {
  await shopStore.fetchMenu();
  if (shopStore.categories.length > 0 && !activeCategory.value) {
    activeCategory.value = shopStore.categories[0].name;
  }
});

watch(() => shopStore.categories, (cats) => {
  if (cats.length > 0 && !activeCategory.value) {
    activeCategory.value = cats[0].name;
  }
});

// Format Currency
const formatPrice = (val) => {
  const num = Number(val) || 0;
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
};

// Filtered products for active category / search
const filteredProducts = computed(() => {
  let list = shopStore.products || [];
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    return list.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.description?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  }
  if (activeCategory.value) {
    return list.filter(p => p.category === activeCategory.value);
  }
  return list;
});

// Group by subcategory if in scroll mode
const subCategoryGroups = computed(() => {
  const map = {};
  filteredProducts.value.forEach(p => {
    const sub = p.subCategory || 'الأصناف العامة';
    if (!map[sub]) map[sub] = [];
    map[sub].push(p);
  });
  return Object.keys(map).map(name => ({ name, products: map[name] }));
});

// Add to Cart with Spring Animation
const handleAddToCart = (product, event) => {
  triggerHaptic('medium');
  cartStore.addToCart(product);
  
  if (event?.currentTarget) {
    flyToCart(event.currentTarget, {
      imageUrl: normalizeImageUrl(product.imgSigned || product.img),
      startScale: 0.9,
      duration: 0.65
    });
  }
  toastStore.show(`تمت إضافة "${product.name}" إلى السلة`, 'success', 2200);
};

// Toggle Favorite
const handleToggleFav = (product) => {
  triggerHaptic('light');
  favoritesStore.toggleFavorite(product);
};

const isFav = (id) => favoritesStore.isFavorite(id);

const getItemQuantity = (id) => {
  const item = cartStore.items.find(i => i.product._id === id);
  return item ? item.quantity : 0;
};
</script>

<template>
  <div class="shop-preview-page" dir="rtl">
    <!-- Top Prototype Banner -->
    <header class="prototype-banner">
      <div class="banner-inner">
        <div class="banner-badge">
          <span class="live-dot"></span>
          <span>نموذج التصميم المطور (V2 Concept)</span>
        </div>
        <button type="button" @click="router.push('/shop/' + shopStore.activeShop)" class="btn-return-live" title="العودة للمتجر الحالي">
          <span>المتجر الأصلي</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    </header>

    <!-- Header & Interactive Shop Switcher -->
    <section class="preview-header-section">
      <div class="header-main-row">
        <div class="brand-info">
          <h1 class="brand-title">{{ shopStore.activeShop === 'shop2' ? 'قسم النواشف الفاخرة' : 'متجر الحلويات الرئيسي' }}</h1>
          <p class="brand-sub">تصفح المنتجات بتصميم انسيابي مخصص للهاتف</p>
        </div>
        
        <!-- Segmented Shop Switcher -->
        <div class="preview-shop-switcher" role="radiogroup" aria-label="اختيار المتجر">
          <button 
            type="button" 
            class="switch-btn" 
            :class="{ active: shopStore.activeShop === 'shop1' }" 
            @click="toggleShop('shop1')"
          >
            الرئيسي
          </button>
          <button 
            type="button" 
            class="switch-btn" 
            :class="{ active: shopStore.activeShop === 'shop2' }" 
            @click="toggleShop('shop2')"
          >
            النواشف
          </button>
        </div>
      </div>

      <!-- Search & Layout Controls Row -->
      <div class="search-layout-row">
        <div class="preview-search-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" class="search-icon" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="search" 
            v-model="searchQuery" 
            placeholder="ابحث عن الحلويات، التورتات، البسكويت…" 
            class="search-input"
          />
          <button v-if="searchQuery" type="button" @click="searchQuery = ''" class="btn-clear-search" aria-label="مسح البحث">&times;</button>
        </div>

        <!-- Layout Mode Toggle (Grid vs Horizontal Scroll) -->
        <div class="layout-toggle-group" role="group" aria-label="تغيير طريقة العرض">
          <button 
            type="button" 
            class="layout-btn" 
            :class="{ active: viewMode === 'grid' }" 
            @click="viewMode = 'grid'; triggerHaptic('selection');" 
            title="عرض شبكي (عمودين)"
            aria-label="عرض شبكي"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect></svg>
          </button>
          <button 
            type="button" 
            class="layout-btn" 
            :class="{ active: viewMode === 'scroll' }" 
            @click="viewMode = 'scroll'; triggerHaptic('selection');" 
            title="عرض أفقي بالأصناف"
            aria-label="عرض أفقي"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <!-- Category Filter Pills (Carousel) -->
      <nav v-if="!searchQuery" class="categories-pill-carousel" aria-label="أقسام المنتجات">
        <button 
          v-for="cat in shopStore.categories" 
          :key="cat._id" 
          type="button"
          class="cat-pill-btn" 
          :class="{ active: activeCategory === cat.name }"
          @click="activeCategory = cat.name; triggerHaptic('selection');"
        >
          <CategoryIcon :icon="cat.icon" :name="cat.name" :emoji="cat.emoji" class="pill-icon" />
          <span class="pill-label">{{ cat.name }}</span>
        </button>
      </nav>
    </section>

    <!-- Main Content Area -->
    <main class="preview-content-area">
      <!-- Loading Skeleton -->
      <div v-if="shopStore.isLoading" class="preview-skeleton-grid" aria-busy="true">
        <div v-for="n in 6" :key="'skel-' + n" class="preview-skel-card">
          <div class="skel-img skeleton-shimmer"></div>
          <div class="skel-body">
            <div class="skel-line title skeleton-shimmer"></div>
            <div class="skel-line price skeleton-shimmer"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredProducts.length === 0" class="preview-empty-state">
        <div class="empty-icon-wrap">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        </div>
        <h3>لا توجد منتجات مطابقة</h3>
        <p>جرب البحث بكلمات أخرى أو اختر قسماً مختلفاً</p>
      </div>

      <!-- Mode 1: 2-Column Responsive Grid View -->
      <div v-else-if="viewMode === 'grid'" class="preview-product-grid">
        <article 
          v-for="product in filteredProducts" 
          :key="'pgrid-' + product._id"
          class="preview-card"
        >
          <!-- Card Image & Overlay Badges -->
          <div class="card-media-wrap">
            <img 
              :src="normalizeImageUrl(product.imgSigned || product.img)" 
              :alt="product.name" 
              loading="lazy" 
              class="card-img"
              @error="$event.target.src = shopStore.activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'"
            />
            
            <!-- Favorite Quick Heart -->
            <button 
              type="button" 
              class="card-fav-btn" 
              :class="{ 'is-active': isFav(product._id) }" 
              @click.stop="handleToggleFav(product)"
              :title="isFav(product._id) ? 'إزالة من المفضلة' : 'إضافة للمفضلة'"
              :aria-label="isFav(product._id) ? 'إزالة من المفضلة' : 'إضافة للمفضلة'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" :fill="isFav(product._id) ? '#ef4444' : 'none'" :stroke="isFav(product._id) ? '#ef4444' : '#ffffff'" stroke-width="2.2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </button>

            <!-- Floating Price Badge -->
            <div class="floating-price-badge">
              <span class="price-val">{{ formatPrice(product.price) }}</span>
              <span class="price-curr">د.ل</span>
            </div>

            <!-- In-Cart Quantity Indicator Badge -->
            <span v-if="getItemQuantity(product._id) > 0" class="cart-qty-chip animate-pop">
              {{ getItemQuantity(product._id) }} في السلة
            </span>
          </div>

          <!-- Card Content Info -->
          <div class="card-details">
            <h3 class="product-title">{{ product.name }}</h3>
            <p v-if="product.description" class="product-desc">{{ product.description }}</p>
            
            <!-- Footer Action Button -->
            <div class="card-bottom-row">
              <button 
                type="button" 
                class="btn-preview-add" 
                @click="handleAddToCart(product, $event)"
                :title="'إضافة ' + product.name + ' إلى السلة'"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>أضف للسلة</span>
              </button>
            </div>
          </div>
        </article>
      </div>

      <!-- Mode 2: Horizontal Scrollable Row per Sub-category -->
      <div v-else class="preview-scroll-sections">
        <section v-for="group in subCategoryGroups" :key="group.name" class="scroll-category-block">
          <div class="block-header">
            <h2 class="block-title">{{ group.name }}</h2>
            <span class="block-count">{{ group.products.length }} صنف</span>
          </div>

          <div class="horizontal-cards-row">
            <article 
              v-for="product in group.products" 
              :key="'pscroll-' + product._id"
              class="preview-card horizontal-card"
            >
              <div class="card-media-wrap">
                <img 
                  :src="normalizeImageUrl(product.imgSigned || product.img)" 
                  :alt="product.name" 
                  loading="lazy" 
                  class="card-img"
                  @error="$event.target.src = shopStore.activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'"
                />
                <button 
                  type="button" 
                  class="card-fav-btn" 
                  :class="{ 'is-active': isFav(product._id) }" 
                  @click.stop="handleToggleFav(product)"
                  :title="isFav(product._id) ? 'إزالة من المفضلة' : 'إضافة للمفضلة'"
                  :aria-label="isFav(product._id) ? 'إزالة من المفضلة' : 'إضافة للمفضلة'"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" :fill="isFav(product._id) ? '#ef4444' : 'none'" :stroke="isFav(product._id) ? '#ef4444' : '#ffffff'" stroke-width="2.2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
                <div class="floating-price-badge">
                  <span class="price-val">{{ formatPrice(product.price) }}</span>
                  <span class="price-curr">د.ل</span>
                </div>
              </div>
              <div class="card-details">
                <h3 class="product-title">{{ product.name }}</h3>
                <button 
                  type="button" 
                  class="btn-preview-add" 
                  @click="handleAddToCart(product, $event)"
                  :title="'إضافة ' + product.name + ' إلى السلة'"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  <span>أضف</span>
                </button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.shop-preview-page {
  min-height: 100vh;
  background: #f8fafc;
  font-family: 'Cairo', sans-serif;
  color: #0f172a;
  padding-bottom: 120px;
}

/* Prototype Banner */
.prototype-banner {
  background: #1e293b;
  color: #ffffff;
  padding: 10px 16px;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.banner-inner {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.banner-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  font-weight: 700;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
  animation: pulse-dot 1.5s infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.2); }
}

.btn-return-live {
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: #ffffff;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-return-live:hover {
  background: rgba(255, 255, 255, 0.24);
}

/* Header & Switcher */
.preview-header-section {
  max-width: 1000px;
  margin: 0 auto;
  padding: 16px 16px 10px 16px;
}

.header-main-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.brand-title {
  font-size: 1.3rem;
  font-weight: 850;
  margin: 0 0 4px 0;
  color: #0f172a;
}

.brand-sub {
  font-size: 0.82rem;
  color: #64748b;
  margin: 0;
}

.preview-shop-switcher {
  display: inline-flex;
  background: #e2e8f0;
  padding: 3px;
  border-radius: 12px;
  gap: 3px;
}

.switch-btn {
  padding: 6px 14px;
  border-radius: 9px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 750;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.switch-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

/* Search & Layout Row */
.search-layout-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.preview-search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 0 14px;
  height: 46px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
}

.search-icon {
  color: #94a3b8;
  margin-inline-end: 10px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 0.92rem;
  color: #0f172a;
}

.btn-clear-search {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 4px;
}

.layout-toggle-group {
  display: flex;
  background: #e2e8f0;
  padding: 3px;
  border-radius: 12px;
  gap: 3px;
}

.layout-btn {
  width: 40px;
  height: 40px;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.layout-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

/* Category Pills Carousel */
.categories-pill-carousel {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.categories-pill-carousel::-webkit-scrollbar {
  display: none;
}

.cat-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 16px;
  border-radius: 30px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 750;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.16s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.cat-pill-btn.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
  box-shadow: 0 3px 8px rgba(15, 23, 42, 0.2);
  transform: scale(1.02);
}

/* Content Area */
.preview-content-area {
  max-width: 1000px;
  margin: 0 auto;
  padding: 10px 16px;
}

/* 2-Column Responsive Product Grid */
.preview-product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

@media (min-width: 768px) {
  .preview-product-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
  }
}

@media (min-width: 1024px) {
  .preview-product-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Card Styling */
.preview-card {
  background: #ffffff;
  border-radius: 18px;
  border: 1.5px solid #edf2f7;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
}

.preview-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.card-media-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #f1f5f9;
  overflow: hidden;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.preview-card:hover .card-img {
  transform: scale(1.04);
}

.card-fav-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.card-fav-btn::before {
  content: '';
  position: absolute;
  top: -8px;
  bottom: -8px;
  left: -8px;
  right: -8px;
  min-width: 48px;
  min-height: 48px;
}

.card-fav-btn:active {
  transform: scale(0.9);
}

.floating-price-badge {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(15, 23, 42, 0.78);
  backdrop-filter: blur(8px);
  color: #ffffff;
  padding: 4px 10px;
  border-radius: 10px;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-weight: 800;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.floating-price-badge .price-val {
  font-size: 0.95rem;
}

.floating-price-badge .price-curr {
  font-size: 0.72rem;
  color: #cbd5e1;
}

.cart-qty-chip {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #10b981;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 20px;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4);
}

.card-details {
  padding: 12px;
  display: flex;
  flex-direction: column;
  flex: 1;
  justify-content: space-between;
}

.product-title {
  font-size: 0.96rem;
  font-weight: 800;
  margin: 0 0 4px 0;
  color: #0f172a;
  line-height: 1.35;
}

.product-desc {
  font-size: 0.76rem;
  color: #64748b;
  margin: 0 0 10px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-bottom-row {
  margin-top: auto;
  padding-top: 6px;
}

.btn-preview-add {
  width: 100%;
  height: 40px;
  border-radius: 12px;
  border: none;
  background: #0f172a;
  color: #ffffff;
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18);
}

.btn-preview-add:active {
  transform: scale(0.97);
  background: #334155;
}

/* Horizontal Scroll Mode */
.scroll-category-block {
  margin-bottom: 24px;
}

.block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.block-title {
  font-size: 1.15rem;
  font-weight: 850;
  margin: 0;
  color: #0f172a;
}

.block-count {
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  background: #e2e8f0;
  padding: 2px 10px;
  border-radius: 12px;
}

.horizontal-cards-row {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;
}

.horizontal-card {
  flex: 0 0 170px;
  scroll-snap-align: start;
}

/* Skeleton Loaders */
.preview-skeleton-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.preview-skel-card {
  background: #ffffff;
  border-radius: 18px;
  overflow: hidden;
  border: 1.5px solid #edf2f7;
}

.skel-img {
  width: 100%;
  aspect-ratio: 1 / 1;
}

.skel-body {
  padding: 12px;
}

.skel-line {
  height: 14px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.skel-line.title {
  width: 75%;
}

.skel-line.price {
  width: 40%;
}

.skeleton-shimmer {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.preview-empty-state {
  text-align: center;
  padding: 48px 20px;
  color: #64748b;
}

.empty-icon-wrap {
  width: 60px;
  height: 60px;
  margin: 0 auto 12px auto;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}
</style>
