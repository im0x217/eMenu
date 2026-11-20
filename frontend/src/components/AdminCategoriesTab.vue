<template>
<div class="categories-tab-content">
  
  <!-- 1. Executive KPI Summary Cards Grid -->
  <div class="cat-kpi-grid">
    <!-- Total Categories -->
    <div class="cat-kpi-card glass-panel">
      <div class="cat-kpi-icon cat-kpi-gold" aria-hidden="true">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
      </div>
      <div class="cat-kpi-info">
        <span class="cat-kpi-label">إجمالي الأصناف الرئيسية</span>
        <div class="cat-kpi-value text-mono">{{ categories.length }}</div>
        <span class="cat-kpi-desc">تصنيف رئيسي في القائمة</span>
      </div>
    </div>

    <!-- Total Subcategories -->
    <div class="cat-kpi-card glass-panel">
      <div class="cat-kpi-icon cat-kpi-sky" aria-hidden="true">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
      </div>
      <div class="cat-kpi-info">
        <span class="cat-kpi-label">الأصناف الفرعية</span>
        <div class="cat-kpi-value text-mono">{{ totalSubcategoriesCount }}</div>
        <span class="cat-kpi-desc">قسم فرعي مفعل</span>
      </div>
    </div>

    <!-- Total Categorized Products -->
    <div class="cat-kpi-card glass-panel">
      <div class="cat-kpi-icon cat-kpi-emerald" aria-hidden="true">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      </div>
      <div class="cat-kpi-info">
        <span class="cat-kpi-label">المنتجات المصنفة</span>
        <div class="cat-kpi-value text-mono">{{ categorizedProductsCount }}</div>
        <span class="cat-kpi-desc">من إجمالي {{ products.length }} منتج</span>
      </div>
    </div>

    <!-- Avg Products per Category -->
    <div class="cat-kpi-card glass-panel">
      <div class="cat-kpi-icon cat-kpi-purple" aria-hidden="true">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10h-10z"/></svg>
      </div>
      <div class="cat-kpi-info">
        <span class="cat-kpi-label">متوسط التوزيع</span>
        <div class="cat-kpi-value text-mono">{{ categories.length ? Math.round(categorizedProductsCount / categories.length) : 0 }}</div>
        <span class="cat-kpi-desc">منتج / صنف رئيسي</span>
      </div>
    </div>
  </div>

  <!-- 2. Main Section Card -->
  <div class="table-card glass-panel overflow-hidden">
    <!-- Toolbar -->
    <div class="card-toolbar card-toolbar-unified">
      <div class="toolbar-search-filter-group">
        <div class="search-input-wrapper flex-grow-1">
          <svg class="search-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input 
            v-model="localSearchQuery" 
            type="text" 
            placeholder="بحث في الأصناف…" 
            class="form-control search-input"
          />
          <button 
            v-if="localSearchQuery" 
            type="button" 
            class="btn-clear-search" 
            @click="localSearchQuery = ''"
            aria-label="مسح البحث"
          >&times;</button>
        </div>
      </div>

      <div class="toolbar-actions-group">
        <!-- View Mode Toggle (Desktop Only) -->
        <div class="view-mode-toggle d-none d-md-inline-flex" v-if="!isMobileScreen">
          <button 
            type="button" 
            class="btn-toggle-mode" 
            :class="{ active: viewMode === 'cards' }" 
            @click="$emit('update:viewMode', 'cards')"
            title="عرض البطاقات البصرية"
          >
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span>بطاقات</span>
          </button>
          <button 
            type="button" 
            class="btn-toggle-mode" 
            :class="{ active: viewMode === 'table' }" 
            @click="$emit('update:viewMode', 'table')"
            title="عرض الجدول المنظم"
          >
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            <span>جدول</span>
          </button>
        </div>

        <!-- Add Category Button -->
        <button @click="$emit('open-modal')" class="btn btn-primary btn-add-highlight">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>إضافة صنف جديد</span>
        </button>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="categoriesLoading" class="categories-skeleton-grid">
      <div v-for="i in 6" :key="'cat-skel-' + i" class="cat-skeleton-card glass-panel">
        <div class="cat-skel-top">
          <div class="skeleton-shimmer cat-skel-icon"></div>
          <div class="cat-skel-meta">
            <div class="skeleton-shimmer cat-skel-title"></div>
            <div class="skeleton-shimmer cat-skel-badge"></div>
          </div>
        </div>
        <div class="cat-skel-chips">
          <div class="skeleton-shimmer cat-skel-chip" v-for="j in 3" :key="j"></div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredCategories.length === 0" class="mgmt-empty-state glass-panel">
      <div class="empty-icon-wrap" aria-hidden="true">
        <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
      </div>
      <h4 class="empty-title">{{ localSearchQuery ? 'لا توجد نتائج تطابق بحثك' : 'لا توجد أصناف مدخلة حتى الآن' }}</h4>
      <p class="empty-desc">{{ localSearchQuery ? 'جرب البحث بكلمة أخرى أو امسح شريط البحث' : 'ابدأ بإضافة أول صنف رئيسي لقائمتك لتنظيم المنتجات' }}</p>
      <button v-if="!localSearchQuery" @click="$emit('open-modal')" class="btn btn-primary mt-2">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>إضافة أول صنف الآن</span>
      </button>
      <button v-else @click="localSearchQuery = ''" class="btn btn-outline mt-2">مسح البحث</button>
    </div>

    <!-- 3. Cards Showcase Grid (Default on mobile and when viewMode === 'cards') -->
    <div v-else-if="isMobileScreen || viewMode === 'cards'" class="categories-showcase-grid">
      <div 
        v-for="cat in filteredCategories" 
        :key="cat._id" 
        class="category-showcase-card glass-panel"
      >
        <!-- Card Top Row: Icon, Title, Product Count, Actions -->
        <div class="cat-card-header">
          <div class="cat-card-visual">
            <div class="cat-icon-container">
              <CategoryIcon :icon="cat.icon" :name="cat.name" :emoji="cat.emoji" size="28" />
            </div>
            <div class="cat-title-stack">
              <h4 class="cat-card-title">{{ cat.name }}</h4>
              <button 
                type="button" 
                class="cat-product-count-badge" 
                @click="$emit('filter-products', cat.name)"
                :title="'عرض منتجات ' + cat.name + ' في القائمة'"
              >
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
                <span>{{ getCategoryProductCount(cat.name) }} منتج</span>
              </button>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div class="cat-actions-cluster">
            <button 
              type="button" 
              class="btn-cat-action btn-cat-edit" 
              @click="$emit('open-modal', cat)" 
              title="تعديل الصنف"
              aria-label="تعديل الصنف"
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <span class="btn-text-label">تعديل</span>
            </button>
            <button 
              type="button" 
              class="btn-cat-action btn-cat-delete" 
              @click="$emit('delete-category', cat._id)" 
              title="حذف الصنف"
              aria-label="حذف الصنف"
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span class="btn-text-label">حذف</span>
            </button>
          </div>
        </div>

        <!-- Subcategories Section -->
        <div class="cat-card-subcats">
          <div class="subcats-header">
            <span class="subcats-label">الأقسام الفرعية</span>
            <span class="subcats-count-badge">{{ cat.subCategories?.length || 0 }}</span>
          </div>
          <div v-if="cat.subCategories && cat.subCategories.length" class="subcats-cloud">
            <span v-for="sub in cat.subCategories" :key="sub" class="subcat-pill">
              <span class="subcat-dot" aria-hidden="true"></span>
              <span>{{ sub }}</span>
            </span>
          </div>
          <div v-else class="subcats-empty">
            <span class="subcats-empty-text">صنف مباشر (بدون أقسام فرعية)</span>
          </div>
        </div>

        <!-- Card Footer Link -->
        <div class="cat-card-footer">
          <button 
            type="button" 
            class="btn-cat-view-products" 
            @click="$emit('filter-products', cat.name)"
          >
            <span>استعراض منتجات الصنف ({{ getCategoryProductCount(cat.name) }})</span>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 4. Table View (Desktop Only when viewMode === 'table') -->
    <div v-else class="table-container">
      <table class="admin-table desktop-categories-table">
        <thead>
          <tr>
            <th style="width: 70px;">الرمز</th>
            <th>اسم الصنف الرئيسي</th>
            <th style="width: 140px;">المنتجات المرتبطة</th>
            <th>الأقسام الفرعية</th>
            <th style="width: 160px; text-align: center;">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(cat, idx) in filteredCategories" :key="cat._id" :class="{ 'keyboard-selected-row': !isMobileScreen && selectedTableRowIndex === idx }">
            <td class="text-center">
              <div class="cat-icon-container cat-icon-table">
                <CategoryIcon :icon="cat.icon" :name="cat.name" :emoji="cat.emoji" size="22" />
              </div>
            </td>
            <td class="text-bold text-dark">{{ cat.name }}</td>
            <td>
              <button 
                type="button" 
                class="cat-product-count-badge" 
                @click="$emit('filter-products', cat.name)"
                :title="'عرض منتجات ' + cat.name"
              >
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
                <span>{{ getCategoryProductCount(cat.name) }} منتج</span>
              </button>
            </td>
            <td>
              <div class="chips-list">
                <span v-if="!cat.subCategories || cat.subCategories.length === 0" class="text-muted text-small">بدون أقسام فرعية</span>
                <span v-for="sub in cat.subCategories" :key="sub" class="subcat-pill">
                  <span class="subcat-dot" aria-hidden="true"></span>
                  {{ sub }}
                </span>
              </div>
            </td>
            <td>
              <div class="btn-group-row justify-center">
                <button @click="$emit('open-modal', cat)" class="btn-table-action btn-action-edit" title="تعديل الصنف">
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  <span>تعديل</span>
                </button>
                <button @click="$emit('delete-category', cat._id)" class="btn-table-action btn-action-delete" title="حذف الصنف">
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>حذف</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
</template>

<script>
import { computed } from 'vue';
import CategoryIcon from './CategoryIcon.vue';

export default {
  name: 'AdminCategoriesTab',
  components: { CategoryIcon },
  props: {
    categories: { type: Array, default: () => [] },
    products: { type: Array, default: () => [] },
    categoriesLoading: { type: Boolean, default: false },
    isMobileScreen: { type: Boolean, default: false },
    selectedTableRowIndex: { type: Number, default: 0 },
    searchQuery: { type: String, default: '' },
    viewMode: { type: String, default: 'cards' }
  },
  emits: ['update:searchQuery', 'update:viewMode', 'open-modal', 'delete-category', 'filter-products'],
  setup(props, { emit }) {
    const localSearchQuery = computed({
      get: () => props.searchQuery,
      set: (val) => emit('update:searchQuery', val)
    });

    const filteredCategories = computed(() => {
      const q = (props.searchQuery || '').trim().toLowerCase();
      if (!q) return props.categories || [];
      return (props.categories || []).filter(c => {
        const matchName = (c.name || '').toLowerCase().includes(q);
        const matchSubs = (c.subCategories || []).some(s => s.toLowerCase().includes(q));
        return matchName || matchSubs;
      });
    });

    const totalSubcategoriesCount = computed(() => {
      return (props.categories || []).reduce((acc, c) => acc + (c.subCategories?.length || 0), 0);
    });

    const categorizedProductsCount = computed(() => {
      return (props.products || []).filter(p => p.category).length;
    });

    const getCategoryProductCount = (catName) => {
      if (!catName) return 0;
      return (props.products || []).filter(p => p.category === catName).length;
    };

    return {
      localSearchQuery,
      filteredCategories,
      totalSubcategoriesCount,
      categorizedProductsCount,
      getCategoryProductCount
    };
  }
};
</script>

<style scoped>
@import '../assets/admin-tabs-shared.css';

:global(.admin-container) .glass-panel {
  background: #ffffff !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 1px solid transparent !important;
  box-shadow: var(--admin-card-elevation) !important;
}

.table-container {
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(203, 213, 225, 0.6) transparent;
}

.table-container::-webkit-scrollbar {
  height: 6px;
}

.table-container::-webkit-scrollbar-track {
  background: transparent;
}

.table-container::-webkit-scrollbar-thumb {
  background: rgba(203, 213, 225, 0.6);
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.8);
}

.admin-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  text-align: right;
  font-size: 0.9rem;
}

.admin-table th {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 12px 14px;
  background: #f8fafc;
  color: #334155;
  font-weight: 850;
  border-bottom: 2px solid #e2e8f0;
  font-size: 0.83rem;
  letter-spacing: -0.2px;
  white-space: nowrap;
}

.admin-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  vertical-align: middle;
  transition: background-color 0.15s ease;
}

.admin-table tbody tr {
  transition: background-color 0.15s ease;
}

.admin-table tbody tr:nth-child(even) {
  background-color: rgba(248, 250, 252, 0.4);
}

.admin-table tbody tr:hover {
  background-color: rgba(253, 181, 24, 0.06);
}

.text-bold {
  font-weight: 700;
}

.text-mono {
  font-family: 'Cairo', -apple-system, sans-serif !important;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.2px;
}

.form-control {
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #ced4da;
  border-radius: 8px;
  color: #334155;
  font-weight: 500;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s ease;
  text-align: right;
}

.table-card.glass-panel {
  padding: 0;
  overflow: visible !important;
  border-radius: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  box-shadow: var(--shadow-md);
  position: relative;
  z-index: 5;
}

.search-input-wrapper .search-icon {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
  width: 18px;
  height: 18px;
  z-index: 5;
}

.search-input-wrapper .search-input,
.search-input-wrapper input.form-control {
  height: 40px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  padding-right: 44px !important;
  padding-left: 38px !important;
  background: #ffffff !important;
  border: 1.5px solid #cbd5e1 !important;
  border-radius: 10px !important;
  font-size: 0.9rem !important;
  width: 100% !important;
  box-sizing: border-box !important;
  color: #0f172a !important;
  font-family: inherit !important;
}

select.form-control {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: left 14px center !important;
  background-size: 14px 14px !important;
  padding-left: 40px !important;
  padding-right: 14px !important;
  text-align: right !important;
  direction: rtl !important;
  height: 40px !important;
  min-height: 40px !important;
  border: 1.5px solid #cbd5e1 !important;
  border-radius: 10px !important;
  font-size: 0.88rem !important;
  font-family: inherit !important;
  line-height: 1.5 !important;
  box-sizing: border-box !important;
}

select.form-control:focus {
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.12) !important;
  outline: none !important;
}

.form-control:focus {
  border-color: var(--chart-primary);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.92rem;
  cursor: pointer;
  border: none;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.08s ease, box-shadow 0.12s ease;
  font-family: inherit;
  letter-spacing: 0.2px;
}

.btn:active:not(:disabled) {
  transform: scale(0.97) !important;
  transition: transform 60ms ease-out !important;
}

.btn-group-row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: nowrap;
}

.btn-primary {
  background: var(--theme-btn-bg);
  color: var(--theme-text-color);
}

.btn-primary:hover {
  background: var(--theme-btn-hover);
}

.btn-outline {
  background: transparent;
  border: 1.5px solid #d1d5db;
  color: #374151;
}

.btn-outline:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

:global(.tab-content-wrapper) .table-card {
  contain: content;
}

@media (max-width: 768px) {
  .categories-tab-content {
    padding-bottom: 12px !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
    box-sizing: border-box !important;
  }

  .table-container {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: auto !important;
    overscroll-behavior-x: contain !important;
    -webkit-overflow-scrolling: touch !important;
  }
}

.btn-table-action:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--primary-glow);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.btn-table-action:active {
  transform: scale(0.97);
}

.text-center {
  text-align: center !important;
}

@media (min-width: 769px) {
  .table-container::-webkit-scrollbar {
    display: block !important;
    width: 8px !important;
    height: 8px !important;
  }

  .table-container::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.04) !important;
    border-radius: 6px !important;
  }

  .table-container::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.22) !important;
    border-radius: 6px !important;
    border: 2px solid transparent !important;
    background-clip: content-box !important;
    transition: background 0.2s ease !important;
  }

  .table-container::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.4) !important;
    background-clip: content-box !important;
  }

  .table-container::-webkit-scrollbar-corner {
    background: transparent !important;
  }

  .table-container {
    -ms-overflow-style: auto !important;
    scrollbar-width: thin !important;
    scrollbar-color: rgba(0, 0, 0, 0.25) rgba(0, 0, 0, 0.04) !important;
  }
}

@media (max-width: 768px) {
  .search-input {
    min-height: 38px !important;
    font-size: 16px !important;
  }
}

@media (max-width: 768px) {
  .card-toolbar {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    width: 100% !important;
    max-width: 100% !important;
    gap: 8px !important;
    box-sizing: border-box !important;
  }

  .search-input-wrapper {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    flex: 1 1 100% !important;
    box-sizing: border-box !important;
  }

  .search-input-wrapper .search-input,
.search-input-wrapper input.form-control {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    height: 34px !important;
    font-size: 16px !important;
    box-sizing: border-box !important;
  }

  select.form-control {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    height: 38px !important;
    font-size: 16px !important;
    box-sizing: border-box !important;
    text-align: center !important;
    text-align-last: center !important;
  }

  .table-card {
    max-width: 100% !important;
    overflow-x: hidden !important;
    padding: 10px 8px !important;
    border-radius: 12px !important;
    box-sizing: border-box !important;
    width: 100% !important;
    overflow: hidden !important;
  }
}

@media print {
  :global(.admin-layout.is-printing-analytics) .table-container {
    overflow: visible !important;
    max-height: none !important;
    mask-image: none !important;
    -webkit-mask-image: none !important;
  }
}

.keyboard-selected-row {
  background: rgba(245, 158, 11, 0.12) !important;
  outline: 2px solid #f59e0b !important;
  outline-offset: -2px;
  position: relative;
  z-index: 2;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.25);
  transition: background 0.15s ease, outline 0.15s ease;
}

:global(.shop-theme-shop2) .btn-primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
  border-color: #1d4ed8 !important;
  color: #ffffff !important;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3) !important;
}

:global(.shop-theme-shop2) .btn-primary:hover {
  background: linear-gradient(135deg, #2563eb, #1e40af) !important;
  border-color: #1e40af !important;
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.4) !important;
}

:global(.shop-theme-shop2) .form-control:focus {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16) !important;
  outline: none !important;
}

.skeleton-shimmer {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: skeletonPulse 1.6s ease-in-out infinite;
  border-radius: 6px;
}

:global(.shop-theme-shop2) .skeleton-shimmer {
  background: linear-gradient(90deg, #eff6ff 25%, #dbeafe 50%, #eff6ff 75%);
  background-size: 200% 100%;
}

.desktop-categories-table {
  display: table;
  width: 100%;
}

.cat-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.cat-kpi-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid transparent;
  box-shadow: var(--admin-card-elevation);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease;
}

.cat-kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--admin-card-elevation-hover) !important;
}

.cat-kpi-icon {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.cat-kpi-card:hover .cat-kpi-icon {
  transform: scale(1.05);
}

.cat-kpi-gold {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.cat-kpi-emerald {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.cat-kpi-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cat-kpi-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 2px;
}

.cat-kpi-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.cat-kpi-desc {
  font-size: 0.74rem;
  color: #94a3b8;
  font-weight: 600;
  margin-top: 2px;
}

.card-toolbar-unified {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  background: rgba(255, 255, 255, 0.6);
}

.toolbar-search-filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1 1 auto;
  min-width: 0;
}

@media (max-width: 768px) {
  .card-toolbar-unified {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 10px !important;
    padding: 12px 14px !important;
  }

  .card-toolbar-unified .toolbar-actions-group {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
    gap: 8px !important;
  }

  .card-toolbar-unified .toolbar-actions-group .btn-add-highlight,
.card-toolbar-unified .toolbar-actions-group .btn-primary {
    flex: 1 !important;
    justify-content: center !important;
  }

  .card-toolbar-unified .toolbar-search-filter-group {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    width: 100% !important;
    gap: 8px !important;
  }

  .card-toolbar-unified .search-input-wrapper {
    width: 100% !important;
  }
}

.toolbar-actions-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-mode-toggle {
  display: inline-flex;
  align-items: center;
  background: #f1f5f9;
  padding: 3px;
  border-radius: 10px;
  gap: 2px;
  border: 1px solid #e2e8f0;
}

.btn-toggle-mode {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  color: #64748b;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-toggle-mode:hover {
  color: #0f172a;
}

.btn-toggle-mode.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.btn-add-highlight {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.88rem;
  box-shadow: 0 2px 8px rgba(217, 119, 6, 0.2);
}

.search-input-wrapper {
  position: relative;
  flex: 1 1 240px;
  min-width: 200px;
  height: 40px;
  display: flex;
  align-items: center;
  width: 100%;
}

.search-icon {
  position: absolute;
  right: 14px;
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 42px 10px 40px !important;
  border-radius: 12px !important;
  border: 1.5px solid #e2e8f0 !important;
  background: #f8fafc !important;
  font-size: 0.9rem !important;
  font-family: 'Cairo', sans-serif !important;
  transition: all 0.2s ease !important;
  box-sizing: border-box;
}

.search-input:focus {
  background: #ffffff !important;
  border-color: var(--primary-color, #d97706) !important;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.12) !important;
  outline: none !important;
}

.btn-clear-search {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: #e2e8f0;
  border: none;
  font-size: 16px;
  color: #475569;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.btn-clear-search:hover {
  background: #cbd5e1;
  color: #0f172a;
}

.categories-skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  padding: 20px;
}

.cat-skeleton-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

.cat-skel-top {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 16px;
}

.cat-skel-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: #e2e8f0;
}

.cat-skel-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cat-skel-title {
  height: 18px;
  width: 60%;
  border-radius: 6px;
  background: #e2e8f0;
}

.cat-skel-badge {
  height: 14px;
  width: 35%;
  border-radius: 6px;
  background: #e2e8f0;
}

.cat-skel-chips {
  display: flex;
  gap: 8px;
}

.cat-skel-chip {
  height: 24px;
  width: 64px;
  border-radius: 8px;
  background: #e2e8f0;
}

.mgmt-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  border-radius: 16px;
  margin: 24px;
  background: rgba(248, 250, 252, 0.6);
  border: 1.5px dashed #cbd5e1;
}

.mgmt-empty-state .empty-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: rgba(241, 245, 249, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  margin-bottom: 16px;
}

.mgmt-empty-state .empty-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.mgmt-empty-state .empty-desc {
  font-size: 0.88rem;
  color: #64748b;
  max-width: 380px;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.categories-showcase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
  padding: 20px;
}

.category-showcase-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  position: relative;
  overflow: hidden;
}

.category-showcase-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.08);
  border-color: #cbd5e1;
}

.cat-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.cat-card-visual {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.cat-icon-container {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(254, 243, 199, 0.85) 0%, rgba(253, 230, 138, 0.6) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.cat-icon-table {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  margin: 0 auto;
}

.cat-title-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.cat-card-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-product-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #f8fafc;
  color: #0284c7;
  border: 1px solid #e0f2fe;
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 0.76rem;
  font-weight: 700;
  width: fit-content;
  white-space: nowrap !important;
  line-height: 1;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.cat-product-count-badge:hover {
  background: #e0f2fe;
  color: #0369a1;
  border-color: #bae6fd;
}

.cat-actions-cluster {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.btn-cat-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 9px;
  font-size: 0.8rem;
  font-weight: 750;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.08s ease, box-shadow 0.12s ease;
  font-family: 'Cairo', sans-serif !important;
  touch-action: manipulation;
}

.btn-cat-action:active {
  transform: scale(0.96);
  transition: transform 60ms ease-out;
}

.btn-cat-edit {
  background: #f8fafc;
  color: #334155;
  border-color: #e2e8f0;
}

.btn-cat-edit:hover {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
}

.btn-cat-delete {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

.btn-cat-delete:hover {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #f87171;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.15);
}

.cat-card-subcats {
  background: #f8fafc;
  border-radius: 12px;
  padding: 12px;
  border: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subcats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.subcats-count-badge {
  background: #e2e8f0;
  color: #334155;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 1px 7px;
  border-radius: 9999px;
}

.subcats-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.subcat-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 0.78rem;
  color: #334155;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.subcat-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d97706;
  flex-shrink: 0;
}

.subcats-empty {
  padding: 4px 0;
}

.cat-card-footer {
  margin-top: auto;
  padding-top: 4px;
}

.btn-cat-view-products {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  color: #475569;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-cat-view-products:hover {
  background: #f1f5f9;
  color: var(--primary-color, #d97706);
  border-color: var(--primary-color, #d97706);
  border-style: solid;
}

.desktop-categories-table th {
  padding: 12px 14px;
  font-weight: 700;
  color: #475569;
  background: #f8fafc;
}

.desktop-categories-table td {
  padding: 12px 14px;
  vertical-align: middle;
}

.btn-table-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  height: 34px;
  border-radius: 9px;
  font-size: 0.8rem;
  font-weight: 750;
  font-family: 'Cairo', sans-serif !important;
  cursor: pointer;
  border: 1.5px solid transparent;
  background: #ffffff;
  color: #334155;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.08s ease, box-shadow 0.12s ease;
  touch-action: manipulation;
  white-space: nowrap;
  justify-content: center;
  line-height: 1.3;
}

.btn-table-action:active {
  transform: scale(0.96);
  transition: transform 60ms ease-out;
}

.btn-action-edit {
  background: #f8fafc;
  color: #334155;
  border-color: #e2e8f0;
}

.btn-action-edit:hover {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
}

.btn-action-delete {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

.btn-action-delete:hover {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #f87171;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.15);
}

@media (max-width: 768px) {
  .cat-kpi-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10px !important;
    margin-bottom: 14px !important;
  }

  .cat-kpi-card {
    padding: 12px 14px !important;
    gap: 10px !important;
    border-radius: 12px !important;
  }

  .cat-kpi-icon {
    width: 40px !important;
    height: 40px !important;
    border-radius: 10px !important;
  }

  .cat-kpi-icon svg {
    width: 18px !important;
    height: 18px !important;
  }

  .cat-kpi-value {
    font-size: 1.25rem !important;
  }

  .cat-kpi-label {
    font-size: 0.74rem !important;
  }

  .cat-kpi-desc {
    display: none !important;
  }

  .categories-showcase-grid {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
    padding: 12px !important;
  }

  .category-showcase-card {
    padding: 14px !important;
    border-radius: 14px !important;
    gap: 12px !important;
  }

  .cat-icon-container {
    width: 46px !important;
    height: 46px !important;
  }

  .toolbar-actions-group {
    width: 100% !important;
    justify-content: stretch !important;
  }

  .btn-add-highlight {
    width: 100% !important;
    justify-content: center !important;
    min-height: 48px !important;
  }

  .btn-cat-action {
    min-height: 40px !important;
    padding: 8px 12px !important;
  }

  .btn-cat-view-products {
    min-height: 44px !important;
    padding: 10px 14px !important;
  }

  .desktop-categories-table {
    display: none !important;
  }

  .keyboard-selected-row,
tr.keyboard-selected-row,
tr.keyboard-selected-row td,
tbody tr.keyboard-selected-row,
tbody tr.keyboard-selected-row td {
    background: transparent !important;
    background-color: transparent !important;
    outline: none !important;
    box-shadow: none !important;
    border-color: inherit !important;
  }
}

.subcats-empty-text {
  font-size: 0.78rem;
  color: #526072 !important;
  font-style: italic;
}

.subcats-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
}

.btn-cat-delete,
.btn-action-delete {
  color: #b91c1c !important;
}

@media (max-width: 768px) {
  .btn-cat-action,
.btn-table-action {
    min-height: 44px !important;
    height: auto !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer {
    animation: none !important;
    transition: none !important;
  }
}

@keyframes skeletonPulse {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}



.btn-clear-search::after {
  content: '';
  position: absolute;
  inset: -9px;
}

@media (max-width: 768px) {
  .btn-table-action {
    min-height: 44px !important;
    height: auto !important;
  }

  .btn-cat-action {
    min-height: 44px !important;
    height: auto !important;
  }
}
</style>
