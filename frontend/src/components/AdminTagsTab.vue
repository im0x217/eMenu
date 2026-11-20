<template>
<div class="tags-tab-content">
  
  <!-- 1. Executive KPI Summary Cards Grid -->
  <div class="tag-kpi-grid">
    <!-- Total Tags -->
    <div class="tag-kpi-card glass-panel">
      <div class="tag-kpi-icon tag-kpi-gold" aria-hidden="true">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
      </div>
      <div class="tag-kpi-info">
        <span class="tag-kpi-label">إجمالي العلامات المميزة</span>
        <div class="tag-kpi-value text-mono">{{ tags.length }}</div>
        <span class="tag-kpi-desc">وسم ترويجي نشط</span>
      </div>
    </div>

    <!-- Tagged Products Count -->
    <div class="tag-kpi-card glass-panel">
      <div class="tag-kpi-icon tag-kpi-amber" aria-hidden="true">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </div>
      <div class="tag-kpi-info">
        <span class="tag-kpi-label">المنتجات الموسومة</span>
        <div class="tag-kpi-value text-mono">{{ taggedProductsCount }}</div>
        <span class="tag-kpi-desc">منتج يحمل شارة في المنيو</span>
      </div>
    </div>


    <!-- Most Used Tag -->
    <div class="tag-kpi-card glass-panel">
      <div class="tag-kpi-icon tag-kpi-sky" aria-hidden="true">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
      </div>
      <div class="tag-kpi-info">
        <span class="tag-kpi-label">الوسم الأكثر استخداماً</span>
        <div class="tag-kpi-value text-mono" style="font-size: 1.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          {{ mostUsedTag ? mostUsedTag.name : '—' }}
        </div>
        <span class="tag-kpi-desc">
          {{ mostUsedTag ? mostUsedTag.count + ' منتج مرتبط' : 'لا توجد منتجات بعد' }}
        </span>
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
            placeholder="بحث في العلامات المميزة والشارات…" 
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

        <!-- Add Tag Button -->
        <button @click="$emit('open-modal')" class="btn btn-primary btn-add-highlight">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>إضافة علامة مميزة</span>
        </button>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="tagsLoading" class="tags-skeleton-grid">
      <div v-for="i in 6" :key="'tag-skel-' + i" class="tag-skeleton-card glass-panel">
        <div class="skeleton-shimmer tag-skel-pill"></div>
        <div class="skeleton-shimmer tag-skel-line"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredTags.length === 0" class="mgmt-empty-state glass-panel">
      <div class="empty-icon-wrap" aria-hidden="true">
        <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
      </div>
      <h4 class="empty-title">{{ localSearchQuery ? 'لا توجد علامات تطابق بحثك' : 'لا توجد علامات مميزة حتى الآن' }}</h4>
      <p class="empty-desc">{{ localSearchQuery ? 'جرب البحث بكلمة أخرى أو امسح شريط البحث' : 'أضف شارات ترويجية مثل الأكثر طلباً أو جديد لتظهر على منتجاتك في المنيو' }}</p>
      <button v-if="!localSearchQuery" @click="$emit('open-modal')" class="btn btn-primary mt-2">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>إضافة أول علامة مميزة</span>
      </button>
      <button v-else @click="localSearchQuery = ''" class="btn btn-outline mt-2">مسح البحث</button>
    </div>

    <!-- 3. Tags Showcase Cards Grid (Default on mobile and when viewMode === 'cards') -->
    <div v-else-if="isMobileScreen || viewMode === 'cards'" class="tags-showcase-grid">
      <div 
        v-for="t in filteredTags" 
        :key="t._id" 
        class="tag-showcase-card glass-panel"
      >
        <!-- Top: Live Badge Preview + Actions -->
        <div class="tag-card-header">
          <!-- Live Storefront Tag Pill Preview (Singular Unified Theme) -->
          <span class="product-tag-chip tag-showcase-chip">
            <span class="tag-chip-icon">
              <CategoryIcon :icon="t.icon || 'trophy'" :name="t.name" size="14" />
            </span>
            <span class="tag-chip-text">{{ t.name }}</span>
          </span>

          <div class="cat-actions-cluster">
            <button 
              type="button" 
              class="btn-cat-action btn-cat-edit" 
              @click="$emit('open-modal', t)" 
              title="تعديل العلامة"
              aria-label="تعديل العلامة"
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <span class="btn-text-label">تعديل</span>
            </button>
            <button 
              type="button" 
              class="btn-cat-action btn-cat-delete" 
              @click="$emit('delete-tag', t._id)" 
              title="حذف العلامة"
              aria-label="حذف العلامة"
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span class="btn-text-label">حذف</span>
            </button>
          </div>
        </div>

        <!-- Tag Details -->
        <div class="tag-card-body">
          <p v-if="t.description" class="tag-desc-text">{{ t.description }}</p>

          <!-- Linked Products Avatar Stack -->
          <div class="tag-products-preview-box">
            <div class="tag-products-preview-header">
              <span class="tag-meta-label">المنتجات المرتبطة ({{ getTagProductCount(t.name) }}):</span>
              <button 
                type="button" 
                class="btn-quick-manage-prod" 
                @click="$emit('open-assign-modal', t)"
                title="تخصيص منتجات الوسم"
              >
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
                <span>تخصيص</span>
              </button>
            </div>

            <div class="tag-product-avatar-stack">
              <div 
                v-for="(p, pIdx) in getTagProducts(t.name).slice(0, 4)" 
                :key="p._id || pIdx" 
                class="tag-avatar-item" 
                :title="p.name"
              >
                <img v-if="p.image" :src="p.image" :alt="p.name" loading="lazy" />
                <span v-else class="tag-avatar-placeholder">{{ p.name ? p.name.charAt(0) : 'م' }}</span>
              </div>
              <span v-if="getTagProducts(t.name).length > 4" class="tag-avatar-overflow">
                +{{ getTagProducts(t.name).length - 4 }}
              </span>
              <span v-if="getTagProducts(t.name).length === 0" class="tag-no-products-hint">
                لا توجد منتجات معينة حتى الآن
              </span>
            </div>
          </div>
        </div>

        <!-- Card Action Footer -->
        <div class="tag-card-footer">
          <button 
            type="button" 
            class="btn-tag-action-primary" 
            @click="$emit('open-assign-modal', t)"
          >
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="m9 14 2 2 4-4"></path></svg>
            <span>إدارة منتجات الوسم ({{ getTagProductCount(t.name) }})</span>
          </button>
          <button 
            type="button" 
            class="btn-tag-action-secondary" 
            @click="$emit('filter-products', t.name)"
            title="عرض المنتجات في جدول الأصناف" aria-label="عرض المنتجات في جدول الأصناف"
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 4. Table View (Desktop Only when viewMode === 'table') -->
    <div v-else class="table-container">
      <table class="admin-table desktop-tags-table">
        <thead>
          <tr>
            <th>اسم العلامة</th>
            <th>معاينة المظهر في المنيو (Live Preview)</th>
            <th style="width: 170px;">المنتجات المرتبطة</th>
            <th style="width: 140px; text-align: center;">إدارة المنتجات</th>
            <th style="width: 140px; text-align: center;">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(t, idx) in filteredTags" :key="t._id" :class="{ 'keyboard-selected-row': !isMobileScreen && selectedTableRowIndex === idx }">
            <td>
              <div class="text-bold text-dark">{{ t.name }}</div>
              <div v-if="t.description" class="text-muted text-small">{{ t.description }}</div>
            </td>
            <td>
              <span class="product-tag-chip tag-showcase-chip">
                <span class="tag-chip-icon">
                  <CategoryIcon :icon="t.icon || 'trophy'" :name="t.name" size="14" />
                </span>
                <span class="tag-chip-text">{{ t.name }}</span>
              </span>
            </td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <div class="tag-product-avatar-stack mini">
                  <div 
                    v-for="(p, pIdx) in getTagProducts(t.name).slice(0, 3)" 
                    :key="p._id || pIdx" 
                    class="tag-avatar-item" 
                    :title="p.name"
                  >
                    <img v-if="p.image" :src="p.image" :alt="p.name" loading="lazy" />
                    <span v-else class="tag-avatar-placeholder">{{ p.name ? p.name.charAt(0) : 'م' }}</span>
                  </div>
                  <span v-if="getTagProducts(t.name).length > 3" class="tag-avatar-overflow">
                    +{{ getTagProducts(t.name).length - 3 }}
                  </span>
                </div>
                <span class="text-mono font-bold" style="font-size: 0.85rem; color: #0284c7;">
                  ({{ getTagProductCount(t.name) }})
                </span>
              </div>
            </td>
            <td class="text-center">
              <button 
                type="button" 
                class="btn-table-action btn-action-assign" 
                @click="$emit('open-assign-modal', t)"
                title="تعيين المنتجات لهذا الوسم"
              >
                <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="m9 14 2 2 4-4"></path></svg>
                <span>تعيين المنتجات</span>
              </button>
            </td>
            <td>
              <div class="btn-group-row justify-center">
                <button @click="$emit('open-modal', t)" class="btn-table-action btn-action-edit" title="تعديل العلامة">
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  <span>تعديل</span>
                </button>
                <button @click="$emit('delete-tag', t._id)" class="btn-table-action btn-action-delete" title="حذف العلامة">
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
  name: 'AdminTagsTab',
  components: { CategoryIcon },
  props: {
    tags: { type: Array, default: () => [] },
    products: { type: Array, default: () => [] },
    tagsLoading: { type: Boolean, default: false },
    isMobileScreen: { type: Boolean, default: false },
    selectedTableRowIndex: { type: Number, default: 0 },
    searchQuery: { type: String, default: '' },
    viewMode: { type: String, default: 'cards' }
  },
  emits: ['update:searchQuery', 'update:viewMode', 'open-modal', 'delete-tag', 'open-assign-modal', 'filter-products'],
  setup(props, { emit }) {
    const localSearchQuery = computed({
      get: () => props.searchQuery,
      set: (val) => emit('update:searchQuery', val)
    });

    const filteredTags = computed(() => {
      const q = (props.searchQuery || '').trim().toLowerCase();
      if (!q) return props.tags || [];
      return (props.tags || []).filter(t => (t.name || '').toLowerCase().includes(q));
    });

    const taggedProductsCount = computed(() => {
      return (props.products || []).filter(p => p.tags && p.tags.length > 0).length;
    });

    const getTagProductCount = (tagName) => {
      if (!tagName) return 0;
      return (props.products || []).filter(p => (p.tags || []).includes(tagName)).length;
    };

    const getTagProducts = (tagName) => {
      if (!tagName) return [];
      return (props.products || []).filter(p => p.tags && Array.isArray(p.tags) && p.tags.includes(tagName));
    };

    const mostUsedTag = computed(() => {
      if (!props.tags || props.tags.length === 0) return null;
      let maxCount = -1;
      let bestTag = null;
      for (const t of props.tags) {
        const count = getTagProductCount(t.name);
        if (count > maxCount) {
          maxCount = count;
          bestTag = { ...t, count };
        }
      }
      return bestTag;
    });

    return {
      localSearchQuery,
      filteredTags,
      taggedProductsCount,
      getTagProductCount,
      getTagProducts,
      mostUsedTag
    };
  }
};
</script>

<style scoped>
@import '../assets/admin-tabs-shared.css';

.admin-container .glass-panel {
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

.tab-content-wrapper .table-card {
  contain: content;
}

@media (max-width: 768px) {
  .tags-tab-content {
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
  .admin-layout.is-printing-analytics .table-container {
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

.shop-theme-shop2 .btn-primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
  border-color: #1d4ed8 !important;
  color: #ffffff !important;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3) !important;
}

.shop-theme-shop2 .btn-primary:hover {
  background: linear-gradient(135deg, #2563eb, #1e40af) !important;
  border-color: #1e40af !important;
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.4) !important;
}

.shop-theme-shop2 .form-control:focus {
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

.shop-theme-shop2 .skeleton-shimmer {
  background: linear-gradient(90deg, #eff6ff 25%, #dbeafe 50%, #eff6ff 75%);
  background-size: 200% 100%;
}

.desktop-tags-table {
  display: table;
  width: 100%;
}

.tag-kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.tag-kpi-card {
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

.tag-kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--admin-card-elevation-hover) !important;
}

.tag-kpi-icon {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.tag-kpi-card:hover .tag-kpi-icon {
  transform: scale(1.05);
}

.tag-kpi-gold {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.tag-kpi-amber {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
}

.tag-kpi-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tag-kpi-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 2px;
}

.tag-kpi-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.tag-kpi-desc {
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

.tag-skeleton-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

.tags-skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 20px;
}

.tag-skel-pill {
  height: 36px;
  width: 120px;
  border-radius: 20px;
  background: #e2e8f0;
  margin-bottom: 14px;
}

.tag-skel-line {
  height: 16px;
  width: 75%;
  border-radius: 6px;
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

.tags-showcase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
  padding: 20px;
}

.tag-showcase-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.tag-showcase-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.08);
  border-color: #cbd5e1;
}

.tag-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.product-tag-chip {
  direction: rtl;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px 3px 5px;
  border-radius: 999px;
  font-family: 'Cairo', sans-serif;
  font-weight: 750;
  font-size: 0.76rem;
  line-height: 1.25;
  background: rgba(245, 158, 11, 0.09);
  border: 1px solid rgba(217, 119, 6, 0.25);
  color: #b45309;
  user-select: none;
}

.tag-chip-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
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
}

.tag-showcase-chip {
  padding: 5px 12px 5px 8px;
  font-size: 0.88rem;
}

.tag-showcase-chip .tag-chip-icon {
  width: 22px;
  height: 22px;
}

.tag-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #f8fafc;
  border-radius: 14px;
  padding: 14px;
  border: 1px solid #f1f5f9;
}

.tag-products-preview-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
}

.tag-products-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn-quick-manage-prod {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #0284c7;
  padding: 2px 7px;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-quick-manage-prod:hover {
  background: #e0f2fe;
  border-color: #7dd3fc;
  color: #0369a1;
}

.tag-product-avatar-stack {
  display: flex;
  align-items: center;
  direction: ltr;
}

.tag-avatar-item {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  overflow: hidden;
  background: #f1f5f9;
  margin-right: -8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.tag-avatar-item:hover {
  transform: translateY(-2px) scale(1.1);
  z-index: 5;
}

.tag-avatar-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tag-avatar-placeholder {
  font-size: 0.75rem;
  font-weight: 800;
  color: #475569;
}

.tag-avatar-overflow {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  background: #0284c7;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: -8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.tag-product-avatar-stack.mini .tag-avatar-item,
.tag-product-avatar-stack.mini .tag-avatar-overflow {
  width: 26px;
  height: 26px;
  font-size: 0.68rem;
  margin-right: -6px;
}

.tag-card-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-tag-action-primary {
  flex-grow: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  background: #f8fafc;
  color: #1e293b;
  border: 1px solid #cbd5e1;
  font-size: 0.82rem;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  min-height: 40px;
}

.btn-tag-action-primary:hover {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.btn-tag-action-secondary {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  border: 1px solid #cbd5e1;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.btn-tag-action-secondary:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #94a3b8;
}

.btn-action-assign {
  background: #f0fdf4;
  color: #15803d;
  border-color: #bbf7d0;
}

.btn-action-assign:hover {
  background: #dcfce7;
  color: #166534;
  border-color: #86efac;
  box-shadow: 0 2px 8px rgba(22, 101, 52, 0.15);
}

.desktop-tags-table th {
  padding: 12px 14px;
  font-weight: 700;
  color: #475569;
  background: #f8fafc;
}

.desktop-tags-table td {
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
  .tag-kpi-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10px !important;
    margin-bottom: 14px !important;
  }

  .tag-kpi-card {
    padding: 12px 14px !important;
    gap: 10px !important;
    border-radius: 12px !important;
  }

  .tag-kpi-icon {
    width: 40px !important;
    height: 40px !important;
    border-radius: 10px !important;
  }

  .tag-kpi-icon svg {
    width: 18px !important;
    height: 18px !important;
  }

  .tag-kpi-value {
    font-size: 1.25rem !important;
  }

  .tag-kpi-label {
    font-size: 0.74rem !important;
  }

  .tag-kpi-desc {
    display: none !important;
  }

  .tags-showcase-grid {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
    padding: 12px !important;
  }

  .tag-showcase-card {
    padding: 14px !important;
    border-radius: 14px !important;
    gap: 12px !important;
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

  .desktop-tags-table {
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

.tag-no-products-hint {
  font-size: 0.76rem;
  color: #526072 !important;
  font-style: italic;
}

.tag-desc-text {
  font-size: 0.82rem;
  color: #475569;
  margin: 0;
  line-height: 1.4;
  font-style: italic;
}

.btn-cat-delete,
.btn-action-delete {
  color: #b91c1c !important;
}

.btn-tag-action-secondary,
.btn-tag-action-primary {
  min-width: 44px !important;
  min-height: 44px !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
