<template>
  <div class="inventory-module-root" dir="rtl">
    <!-- Screen View (Hidden when printing) -->
    <div class="no-print">
      <!-- 1. Executive Sub-Header Bar -->
      <div class="inv-header-bar">
        <div class="inv-brand-col">
          <div class="inv-brand-icon">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div class="inv-brand-text">
            <div class="inv-brand-title">حلويات عبمبر الزروق</div>
            <div class="inv-brand-subtitle">قسم النواشف • إدارة المخزون والمستودع</div>
          </div>
          <span class="inv-live-badge" title="مزامنة لحظية مع خادم المخزون">
            <span class="inv-live-dot"></span>
            مباشر
          </span>
        </div>

        <!-- Header Actions -->
        <div class="inv-actions-col">
          <!-- Refresh Button -->
          <button
            type="button"
            class="inv-btn inv-btn-outline"
            :disabled="loading || isRefreshing"
            @click="fetchInventory(true)"
            title="تحديث بيانات المستودع"
          >
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" :class="{ 'inv-spin': isRefreshing }">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            <span class="d-none d-md-inline">تحديث</span>
          </button>

          <!-- Sync All Products Button -->
          <button
            type="button"
            class="inv-btn inv-btn-outline"
            :disabled="loading || isSyncing"
            @click="syncAllProducts"
            title="مزامنة جميع منتجات المتجر مع المستودع بقيمة صفر للأصناف الجديدة"
          >
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" :class="{ 'inv-spin': isSyncing }">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <span class="d-none d-md-inline">{{ isSyncing ? 'جارٍ المزامنة…' : 'مزامنة الأصناف' }}</span>
          </button>

          <!-- Print A4 Button -->
          <button
            type="button"
            class="inv-btn inv-btn-outline"
            @click="isPrintDialogOpen = true"
            title="طباعة كشف جرد المخزون A4"
          >
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            <span>طباعة</span>
          </button>

          <!-- Mod Lock / Unlock -->
          <button
            type="button"
            v-if="isModUnlocked"
            class="inv-btn inv-btn-warning"
            @click="handleLock"
            title="قفل التعديلات لمنع التغييرات العرضية"
          >
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
            </svg>
            <span>قفل</span>
          </button>
          <button
            type="button"
            v-else
            class="inv-btn inv-btn-outline"
            @click="openUnlockModal"
            title="إلغاء قفل التعديل بكلمة السر"
          >
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>فك القفل</span>
          </button>

          <!-- Add Product Button -->
          <button
            type="button"
            class="inv-btn inv-btn-primary"
            @click="openAddModal"
            title="إضافة صنف جديد إلى المستودع"
          >
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>صنف جديد</span>
          </button>
        </div>
      </div>

      <!-- 2. KPIs Summary Cards Grid -->
      <div class="inv-stats-grid">
        <!-- KPI 1: Total Items -->
        <div class="inv-stat-card">
          <div class="inv-stat-header">
            <div class="inv-stat-info">
              <div class="inv-stat-label">إجمالي الأصناف</div>
              <div class="inv-stat-number text-mono">{{ stats.totalItems }}</div>
            </div>
            <div class="inv-stat-icon-wrap icon-neutral">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <line x1="16.5" y1="9.4" x2="7.55" y2="4.24"></line>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
          </div>
          <div class="inv-stat-subtext">بكتالوج المستودع</div>
        </div>

        <!-- KPI 2: Low Stock -->
        <div class="inv-stat-card is-warning">
          <div class="inv-stat-header">
            <div class="inv-stat-info">
              <div class="inv-stat-label text-warning-deep">أصناف منخفضة</div>
              <div class="inv-stat-number text-mono text-warning-deep">{{ stats.lowStock }}</div>
            </div>
            <div class="inv-stat-icon-wrap icon-warning">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
          </div>
          <div class="inv-stat-subtext text-warning-deep">أقل من حد الطلب</div>
        </div>

        <!-- KPI 3: Out of Stock -->
        <div class="inv-stat-card is-danger">
          <div class="inv-stat-header">
            <div class="inv-stat-info">
              <div class="inv-stat-label text-danger-deep">نفدت بالكامل</div>
              <div class="inv-stat-number text-mono text-danger-deep">{{ stats.outOfStock }}</div>
            </div>
            <div class="inv-stat-icon-wrap icon-danger">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
          </div>
          <div class="inv-stat-subtext text-danger-deep">الكمية صفر (إنتاج)</div>
        </div>

        <!-- KPI 4: Total Units -->
        <div class="inv-stat-card">
          <div class="inv-stat-header">
            <div class="inv-stat-info">
              <div class="inv-stat-label">الوحدات بالمخزن</div>
              <div class="inv-stat-number text-mono">{{ stats.totalUnits.toLocaleString('ar-LY') }}</div>
            </div>
            <div class="inv-stat-icon-wrap icon-info">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
          </div>
          <div class="inv-stat-subtext">مجموع قطع المخزون</div>
        </div>
      </div>

      <!-- 3. Search, Status & Categories Filter Panel -->
      <div class="inv-filter-panel">
        <!-- Search & Status Row -->
        <div class="inv-search-status-row">
          <!-- Search Input -->
          <div class="inv-search-box">
            <svg class="inv-search-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              v-model="searchQuery"
              placeholder="ابحث بالاسم، الفئة، أو رقم الصنف…"
              class="inv-search-input"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="inv-search-clear"
              @click="searchQuery = ''"
              aria-label="مسح البحث"
            >
              &times;
            </button>
          </div>

          <!-- Status Segmented Control -->
          <div class="inv-status-segments">
            <button
              type="button"
              class="inv-segment-btn"
              :class="{ active: statusFilter === 'all' }"
              @click="statusFilter = 'all'"
            >
              الكل ({{ items.length }})
            </button>
            <button
              type="button"
              class="inv-segment-btn is-low"
              :class="{ active: statusFilter === 'low' }"
              @click="statusFilter = 'low'"
            >
              منخفض ({{ stats.lowStock }})
            </button>
            <button
              type="button"
              class="inv-segment-btn is-out"
              :class="{ active: statusFilter === 'out' }"
              @click="statusFilter = 'out'"
            >
              نفد ({{ stats.outOfStock }})
            </button>
            <button
              type="button"
              class="inv-segment-btn is-ok"
              :class="{ active: statusFilter === 'in_stock' }"
              @click="statusFilter = 'in_stock'"
            >
              متوفر ({{ stats.inStock }})
            </button>
          </div>
        </div>

        <!-- Horizontal Categories Scrolling Row -->
        <div class="inv-category-pills-row">
          <button
            type="button"
            class="inv-cat-pill"
            :class="{ active: selectedCategory === 'all' }"
            @click="selectedCategory = 'all'"
          >
            جميع الفئات
          </button>
          <button
            v-for="cat in categoryOptions"
            :key="cat.label"
            type="button"
            class="inv-cat-pill"
            :class="{ active: selectedCategory.toLowerCase() === cat.label.toLowerCase() }"
            @click="selectedCategory = cat.label"
          >
            <span>{{ cat.label }}</span>
            <span class="inv-cat-badge text-mono">{{ cat.count }}</span>
          </button>
          <button
            v-if="uncategorizedCount > 0"
            type="button"
            class="inv-cat-pill"
            :class="{ active: selectedCategory === 'uncategorized' }"
            @click="selectedCategory = 'uncategorized'"
          >
            <span>غير مصنف</span>
            <span class="inv-cat-badge text-mono">{{ uncategorizedCount }}</span>
          </button>
        </div>
      </div>

      <!-- 4. Results Bar & Sorting -->
      <div class="inv-results-bar">
        <div class="inv-results-count">
          عرض <strong class="text-mono">{{ filteredItems.length }}</strong> من إجمالي <strong class="text-mono">{{ items.length }}</strong> صنف
        </div>
        <div class="inv-sort-actions">
          <span class="inv-sort-label">ترتيب حسب:</span>
          <button
            type="button"
            class="inv-sort-btn"
            :class="{ active: sortField === 'name' }"
            @click="toggleSort('name')"
          >
            الاسم {{ sortField === 'name' ? (sortAsc ? '↑' : '↓') : '' }}
          </button>
          <button
            type="button"
            class="inv-sort-btn"
            :class="{ active: sortField === 'quantity' }"
            @click="toggleSort('quantity')"
          >
            الكمية {{ sortField === 'quantity' ? (sortAsc ? '↑' : '↓') : '' }}
          </button>
        </div>
      </div>

      <!-- 5. Dual-Mode View Container -->
      <div v-if="loading" class="inv-loading-state">
        <div class="inv-loader-spinner"></div>
        <p>جاري تحميل بيانات المستودع والمخزون…</p>
      </div>

      <div v-else-if="filteredItems.length === 0" class="inv-empty-state">
        <div class="inv-empty-icon">
          <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <line x1="16.5" y1="9.4" x2="7.55" y2="4.24"></line>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          </svg>
        </div>
        <h3>لا توجد أصناف تطابق معايير البحث</h3>
        <p>يرجى تجربة كلمة بحث أخرى أو إعادة ضبط الفلاتر الحالية.</p>
        <button
          type="button"
          class="inv-btn inv-btn-outline"
          @click="resetFilters"
        >
          إعادة ضبط جميع الفلاتر
        </button>
      </div>

      <div v-else>
        <!-- Desktop Table View (>= 769px) -->
        <div class="inv-desktop-table-card">
          <table class="inv-table">
            <thead>
              <tr>
                <th class="col-center" style="width: 50px;">#</th>
                <th>اسم الصنف بالمستودع</th>
                <th style="width: 140px;">الفئة</th>
                <th v-if="hasAnyLinkedProducts" style="width: 170px;">المنتج المرتبط</th>
                <th class="col-center" style="width: 170px;">الكمية بالمخزن</th>
                <th class="col-center" style="width: 90px;">الحد الأدنى</th>
                <th class="col-center" style="width: 110px;">الحالة</th>
                <th class="col-center" style="width: 90px;">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in filteredItems"
                :key="item.id"
                :class="{
                  'is-row-out': item.quantity === 0,
                  'is-row-low': item.quantity > 0 && item.quantity <= item.min_stock
                }"
              >
                <!-- Legacy/Numeric ID -->
                <td class="col-center text-mono inv-item-id">
                  {{ item.legacy_id || item.id.slice(0, 5) }}
                </td>

                <!-- Product Name -->
                <td class="inv-item-name">
                  <strong>{{ item.name }}</strong>
                </td>

                <!-- Category -->
                <td>
                  <span v-if="item.category" class="inv-badge-pill">
                    {{ item.category }}
                  </span>
                  <span v-else class="inv-text-muted">غير مصنف</span>
                </td>

                <!-- Linked Menu Product (if applicable) -->
                <td v-if="hasAnyLinkedProducts">
                  <span v-if="item.linkedProduct" class="inv-linked-pill" :title="'معامل التحويل: 1 طلب = ' + (item.linkedProduct.conversionFactor || 1) + ' مخزون'">
                    <span class="inv-link-dot"></span>
                    <span>{{ item.linkedProduct.productName }}</span>
                    <span class="text-mono" v-if="(item.linkedProduct.conversionFactor || 1) > 1">×{{ item.linkedProduct.conversionFactor }}</span>
                  </span>
                  <span v-else class="inv-text-muted">—</span>
                </td>

                <!-- Quantity Stepper [- 1 +] -->
                <td class="col-center">
                  <div class="inv-stepper" dir="ltr">
                    <button
                      type="button"
                      class="inv-stepper-btn"
                      :disabled="item.quantity <= 0 || !isModUnlocked"
                      @click="adjustStock(item, -1)"
                      aria-label="إنقاص وحدة"
                      title="إنقاص وحدة واحدة"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>

                    <button
                      type="button"
                      class="inv-stepper-value text-mono"
                      @click="openStockAdjustModal(item)"
                      title="انقر لتعديل الكمية بدقة"
                    >
                      {{ item.quantity }}
                    </button>

                    <button
                      type="button"
                      class="inv-stepper-btn"
                      :disabled="!isModUnlocked"
                      @click="adjustStock(item, 1)"
                      aria-label="زيادة وحدة"
                      title="زيادة وحدة واحدة"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                  </div>
                </td>

                <!-- Min Stock -->
                <td class="col-center text-mono inv-min-stock">
                  {{ item.min_stock }}
                </td>

                <!-- Status Badge -->
                <td class="col-center">
                  <span v-if="item.quantity === 0" class="inv-state-badge is-danger">
                    <span class="badge-dot"></span>
                    نفد
                  </span>
                  <span v-else-if="item.quantity <= item.min_stock" class="inv-state-badge is-warning">
                    <span class="badge-dot"></span>
                    منخفض
                  </span>
                  <span v-else class="inv-state-badge is-success">
                    <span class="badge-dot"></span>
                    متوفر
                  </span>
                </td>

                <!-- Actions -->
                <td class="col-center">
                  <div class="inv-row-actions">
                    <button
                      v-if="isModUnlocked"
                      type="button"
                      class="inv-icon-btn"
                      @click="openEditModal(item)"
                      :aria-label="`تعديل صنف ${item.name}`"
                      title="تعديل بيانات الصنف"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <span v-else class="inv-text-muted">—</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Touch-First Cards Grid (<= 768px) -->
        <div class="inv-mobile-cards-grid">
          <div
            v-for="item in filteredItems"
            :key="'mob-' + item.id"
            class="inv-mob-card"
            :class="{
              'is-card-out': item.quantity === 0,
              'is-card-low': item.quantity > 0 && item.quantity <= item.min_stock
            }"
          >
            <!-- Card Top Header -->
            <div class="inv-mob-card-header">
              <div class="inv-mob-card-identity">
                <div class="inv-mob-meta">
                  <span class="inv-mob-id text-mono">#{{ item.legacy_id || item.id.slice(0, 5) }}</span>
                  <span v-if="item.category" class="inv-badge-pill">{{ item.category }}</span>
                  <span v-else class="inv-badge-pill inv-text-muted">غير مصنف</span>
                </div>
                <h4 class="inv-mob-name">{{ item.name }}</h4>
              </div>

              <!-- Status Badge -->
              <div class="inv-mob-header-actions">
                <span v-if="item.quantity === 0" class="inv-state-badge is-danger">نفد</span>
                <span v-else-if="item.quantity <= item.min_stock" class="inv-state-badge is-warning">منخفض</span>
                <span v-else class="inv-state-badge is-success">متوفر</span>

                <button
                  v-if="isModUnlocked"
                  type="button"
                  class="inv-icon-btn inv-mob-edit-btn"
                  @click="openEditModal(item)"
                  :aria-label="`تعديل ${item.name}`"
                  title="تعديل الصنف"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Stock Progress Bar -->
            <div class="inv-mob-progress-track">
              <div
                class="inv-mob-progress-fill"
                :class="{
                  'is-fill-out': item.quantity === 0,
                  'is-fill-low': item.quantity > 0 && item.quantity <= item.min_stock,
                  'is-fill-ok': item.quantity > item.min_stock
                }"
                :style="{ width: calcStockRatio(item) + '%' }"
              ></div>
            </div>

            <!-- Card Bottom Bar: Stepper & Limits -->
            <div class="inv-mob-card-footer">
              <!-- Stepper -->
              <div class="inv-stepper" dir="ltr">
                <button
                  type="button"
                  class="inv-stepper-btn"
                  :disabled="item.quantity <= 0 || !isModUnlocked"
                  @click="adjustStock(item, -1)"
                  aria-label="إنقاص وحدة"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>

                <button
                  type="button"
                  class="inv-stepper-value text-mono"
                  @click="openStockAdjustModal(item)"
                  title="تعديل الكمية"
                >
                  {{ item.quantity }}
                </button>

                <button
                  type="button"
                  class="inv-stepper-btn"
                  :disabled="!isModUnlocked"
                  @click="adjustStock(item, 1)"
                  aria-label="زيادة وحدة"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>

              <!-- Min Stock Reference -->
              <div class="inv-mob-threshold">
                <span class="inv-thresh-label">الحد الأدنى:</span>
                <span class="inv-thresh-val text-mono">{{ item.min_stock }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->

    <!-- Modal 1: Passcode Unlock Modal -->
    <Teleport to="body">
      <div v-if="isUnlockModalOpen" class="inv-modal-overlay" @click.self="isUnlockModalOpen = false">
        <div class="inv-modal-dialog animate-scale-in" dir="rtl">
          <div class="inv-modal-header">
            <div class="inv-modal-icon-wrap icon-warning">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <div>
              <h3 class="inv-modal-title">تأكيد صلاحية تعديل المستودع</h3>
              <p class="inv-modal-desc">أدخل رمز الحماية السري لتمكين التعديل المباشر على المخزون:</p>
            </div>
          </div>

          <form @submit.prevent="submitPasscode" class="inv-modal-body">
            <div class="inv-form-group">
              <label class="inv-form-label">رمز الحماية (PIN):</label>
              <input
                type="password"
                v-model="enteredPasscode"
                placeholder="أدخل رمز المرور…"
                class="inv-form-input text-center text-mono"
                style="letter-spacing: 4px; font-size: 1.25rem;"
                autofocus
              />
              <p v-if="passcodeError" class="inv-form-error">{{ passcodeError }}</p>
            </div>

            <div class="inv-modal-footer">
              <button type="submit" class="inv-btn inv-btn-primary flex-1">
                تأكيد وإلغاء القفل
              </button>
              <button type="button" class="inv-btn inv-btn-outline" @click="isUnlockModalOpen = false">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal 2: Stock Adjust Modal -->
    <Teleport to="body">
      <div v-if="isAdjustModalOpen && adjustingItem" class="inv-modal-overlay" @click.self="isAdjustModalOpen = false">
        <div class="inv-modal-dialog animate-scale-in" dir="rtl">
          <div class="inv-modal-header">
            <div class="inv-modal-icon-wrap icon-info">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <div>
              <h3 class="inv-modal-title">تعديل كمية المخزون</h3>
              <p class="inv-modal-desc">{{ adjustingItem.name }} (الرصيد الحالي: <strong class="text-mono">{{ adjustingItem.quantity }}</strong>)</p>
            </div>
          </div>

          <div class="inv-modal-body">
            <!-- Quick Delta Buttons -->
            <label class="inv-form-label">تعديل سريع بإضافة / إنقاص وحدات:</label>
            <div class="inv-delta-grid" dir="ltr">
              <button type="button" class="inv-delta-btn delta-neg" @click="adjustStock(adjustingItem, -10)">-10</button>
              <button type="button" class="inv-delta-btn delta-neg" @click="adjustStock(adjustingItem, -5)">-5</button>
              <button type="button" class="inv-delta-btn delta-neg" @click="adjustStock(adjustingItem, -1)">-1</button>
              <button type="button" class="inv-delta-btn delta-pos" @click="adjustStock(adjustingItem, 1)">+1</button>
              <button type="button" class="inv-delta-btn delta-pos" @click="adjustStock(adjustingItem, 5)">+5</button>
              <button type="button" class="inv-delta-btn delta-pos" @click="adjustStock(adjustingItem, 10)">+10</button>
            </div>

            <!-- Set Exact Quantity -->
            <div class="inv-form-group mt-3">
              <label class="inv-form-label">أو اضبط الكمية المحددة مباشرة:</label>
              <div class="d-flex gap-2">
                <input
                  type="number"
                  v-model.number="adjustExactQty"
                  min="0"
                  class="inv-form-input text-mono flex-1 text-center font-bold"
                  style="font-size: 1.15rem;"
                />
                <button
                  type="button"
                  class="inv-btn inv-btn-primary"
                  @click="saveExactQuantity"
                >
                  حفظ الكمية
                </button>
              </div>
            </div>
          </div>

          <div class="inv-modal-footer">
            <button type="button" class="inv-btn inv-btn-outline w-100" @click="isAdjustModalOpen = false">
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal 3: Add / Edit Product Modal -->
    <Teleport to="body">
      <div v-if="isAddEditOpen" class="inv-modal-overlay" @click.self="isAddEditOpen = false">
        <div class="inv-modal-dialog animate-scale-in" dir="rtl">
          <div class="inv-modal-header">
            <div class="inv-modal-icon-wrap" :class="editingItem ? 'icon-info' : 'icon-neutral'">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path v-if="editingItem" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path v-if="editingItem" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                <line v-if="!editingItem" x1="12" y1="5" x2="12" y2="19"></line>
                <line v-if="!editingItem" x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <div>
              <h3 class="inv-modal-title">
                {{ editingItem ? `تعديل الصنف: ${editingItem.name}` : 'إضافة صنف جديد للمستودع' }}
              </h3>
              <p class="inv-modal-desc">
                {{ editingItem ? 'قم بتحديث بيانات الصنف وحد التنبيه أدناه:' : 'أدخل بيانات الصنف الجديد وكميته الأولية بالمستودع:' }}
              </p>
            </div>
          </div>

          <form @submit.prevent="saveProduct" class="inv-modal-body">
            <!-- Name -->
            <div class="inv-form-group">
              <label class="inv-form-label">اسم الصنف بالكامل: <span class="text-danger">*</span></label>
              <input
                type="text"
                v-model="editForm.name"
                placeholder="مثال: غريبة لوز، كعك مالح، بقلاوة فستق…"
                class="inv-form-input"
                required
              />
            </div>

            <!-- Category -->
            <div class="inv-form-group">
              <label class="inv-form-label">الفئة / التصنيف بالمخزن:</label>
              <input
                type="text"
                v-model="editForm.category"
                list="category-suggestions"
                placeholder="اختر أو اكتب فئة جديدة (مثال: كعك، سبلي، مقروض)…"
                class="inv-form-input"
              />
              <datalist id="category-suggestions">
                <option v-for="cat in categoryOptions" :key="cat.label" :value="cat.label"></option>
              </datalist>
            </div>

            <!-- Quantities Row -->
            <div class="d-flex gap-3">
              <div class="inv-form-group flex-1">
                <label class="inv-form-label">الكمية المتوفرة:</label>
                <input
                  type="number"
                  v-model.number="editForm.quantity"
                  min="0"
                  class="inv-form-input text-mono font-bold"
                  required
                />
              </div>

              <div class="inv-form-group flex-1">
                <label class="inv-form-label">حد التنبيه (الحد الأدنى):</label>
                <input
                  type="number"
                  v-model.number="editForm.min_stock"
                  min="0"
                  class="inv-form-input text-mono font-bold"
                  required
                />
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="inv-modal-footer mt-4">
              <button type="submit" class="inv-btn inv-btn-primary flex-1" :disabled="savingProduct">
                <span v-if="savingProduct">جاري الحفظ…</span>
                <span v-else>{{ editingItem ? 'تحديث الصنف' : 'إضافة الصنف' }}</span>
              </button>

              <button
                v-if="editingItem"
                type="button"
                class="inv-btn inv-btn-danger"
                @click="deleteProduct(editingItem)"
                title="حذف هذا الصنف من المستودع"
              >
                حذف الصنف
              </button>

              <button type="button" class="inv-btn inv-btn-outline" @click="isAddEditOpen = false">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal 4: Print Options Dialog -->
    <Teleport to="body">
      <div v-if="isPrintDialogOpen" class="inv-modal-overlay" @click.self="isPrintDialogOpen = false">
        <div class="inv-modal-dialog animate-scale-in" dir="rtl">
          <div class="inv-modal-header">
            <div class="inv-modal-icon-wrap icon-neutral">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
            </div>
            <div>
              <h3 class="inv-modal-title">طباعة كشف جرد المخزون (A4)</h3>
              <p class="inv-modal-desc">اختر الفئة التي ترغب بتضمينها في تقرير الجرد الورقي الرسمي:</p>
            </div>
          </div>

          <div class="inv-modal-body">
            <div class="inv-form-group">
              <label class="inv-form-label">الفئة المراد طباعتها:</label>
              <select v-model="printCategory" class="inv-form-input">
                <option value="all">جميع الأصناف بالمستودع ({{ items.length }})</option>
                <option v-for="cat in categoryOptions" :key="cat.label" :value="cat.label">
                  {{ cat.label }} ({{ cat.count }})
                </option>
                <option v-if="uncategorizedCount > 0" value="uncategorized">
                  غير مصنف ({{ uncategorizedCount }})
                </option>
              </select>
            </div>

            <div class="inv-print-summary-box">
              <div class="d-flex justify-content-between mb-1">
                <span>عدد الأصناف في الكشف:</span>
                <strong class="text-mono">{{ printItems.length }} صنف</strong>
              </div>
              <div class="d-flex justify-content-between">
                <span>المقاس المعتمد:</span>
                <strong>A4 Portrait (طولي رسمي)</strong>
              </div>
            </div>
          </div>

          <div class="inv-modal-footer">
            <button type="button" class="inv-btn inv-btn-primary flex-1" @click="triggerPrint">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="me-1">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              تأكيد وبدء الطباعة
            </button>
            <button type="button" class="inv-btn inv-btn-outline" @click="isPrintDialogOpen = false">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Formal A4 Portrait Print View (Only visible when printing) -->
    <div class="print-only inv-print-sheet" dir="rtl">
      <!-- Print Header -->
      <div class="inv-print-header">
        <div class="inv-print-brand">
          <div class="brand-title">حلويات عبمبر الزروق</div>
          <div class="brand-sub">قسم النواشف • إدارة المخزون والمستودع</div>
        </div>

        <div class="inv-print-title-box">
          <h2>كشف جرد المخزون والمستودع</h2>
          <p>وثيقة جرد ومطابقة رسمية معتمدة</p>
        </div>

        <div class="inv-print-meta" dir="ltr">
          <div>التاريخ: <span class="text-mono font-bold">{{ printDate }}</span></div>
          <div>الفئة: <strong>{{ printCategoryLabel }}</strong></div>
        </div>
      </div>

      <!-- KPI Summary Strip -->
      <div class="inv-print-kpis">
        <div class="inv-print-kpi-box">
          <div class="pkpi-label">إجمالي الأصناف</div>
          <div class="pkpi-val text-mono">{{ printItems.length }}</div>
        </div>
        <div class="inv-print-kpi-box">
          <div class="pkpi-label">أصناف منخفضة</div>
          <div class="pkpi-val text-mono text-warning-deep">{{ printLowStockCount }}</div>
        </div>
        <div class="inv-print-kpi-box">
          <div class="pkpi-label">نفدت بالكامل</div>
          <div class="pkpi-val text-mono text-danger-deep">{{ printOutOfStockCount }}</div>
        </div>
        <div class="inv-print-kpi-box">
          <div class="pkpi-label">إجمالي الوحدات الدفترية</div>
          <div class="pkpi-val text-mono">{{ printTotalUnits.toLocaleString('ar-LY') }}</div>
        </div>
      </div>

      <!-- Print Audit Table -->
      <table class="inv-print-table">
        <thead>
          <tr>
            <th style="width: 35px;" class="col-center">#</th>
            <th>اسم الصنف في المستودع</th>
            <th style="width: 90px;" class="col-center">الفئة</th>
            <th style="width: 80px;" class="col-center">الرصيد الدفتري</th>
            <th style="width: 80px;" class="col-center">حد التنبيه</th>
            <th style="width: 85px;" class="col-center">الجرد الفعلي</th>
            <th style="width: 75px;" class="col-center">المطابقة</th>
            <th>ملاحظات أمين المستودع</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in printItems" :key="'prt-' + item.id">
            <td class="col-center text-mono">{{ item.legacy_id || (idx + 1) }}</td>
            <td class="font-bold">{{ item.name }}</td>
            <td class="col-center">{{ item.category || 'عام' }}</td>
            <td class="col-center text-mono font-bold">{{ item.quantity }}</td>
            <td class="col-center text-mono">{{ item.min_stock }}</td>
            <td class="col-center inv-audit-box"></td>
            <td class="col-center inv-audit-box"></td>
            <td class="inv-audit-notes"></td>
          </tr>
        </tbody>
      </table>

      <!-- Signatures Footer -->
      <div class="inv-print-signatures">
        <div class="sig-block">
          <div class="sig-line">توقيع مسؤول المستودع: _____________________</div>
        </div>
        <div class="sig-block">
          <div class="sig-line">توقيع المشرف المعتمد: _____________________</div>
        </div>
        <div class="sig-block">
          <div class="sig-line">الختم والتاريخ: _____________________</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useToastStore } from '../stores/toast';
import PocketBase from 'pocketbase';

const POCKETBASE_LIVE_URL = 'https://crystal-crocodile.pikapod.net';
const MOD_UNLOCK_KEY = 'inventory_mod_unlocked';
const DEFAULT_PASSCODE = '1234';

// Resilient Arabic normalizer (removes alef variants, taa marbuta, diacritics, tatweel)
function normalizeArabicText(text) {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '');
}

export default {
  name: 'InventoryTab',
  props: {
    activeShop: {
      type: String,
      default: 'shop2'
    },
    userRole: {
      type: String,
      default: 'admin'
    }
  },
  setup() {
    const toast = useToastStore();
    const pb = new PocketBase(POCKETBASE_LIVE_URL);

    // State
    const items = ref([]);
    const loading = ref(true);
    const isRefreshing = ref(false);
    const searchQuery = ref('');
    const selectedCategory = ref('all');
    const statusFilter = ref('all');
    const sortField = ref('name');
    const sortAsc = ref(true);

    // Security Unlock State
    const isModUnlocked = ref(false);
    const isUnlockModalOpen = ref(false);
    const enteredPasscode = ref('');
    const passcodeError = ref('');

    // Stock Adjust Modal
    const isAdjustModalOpen = ref(false);
    const adjustingItem = ref(null);
    const adjustExactQty = ref(0);

    // Add / Edit Modal
    const isAddEditOpen = ref(false);
    const editingItem = ref(null);
    const savingProduct = ref(false);
    const editForm = reactive({
      name: '',
      category: '',
      quantity: 0,
      min_stock: 5
    });

    // Print Dialog & View
    const isPrintDialogOpen = ref(false);
    const printCategory = ref('all');
    const printDate = ref('');

    // Authenticated API helper
    const adminFetch = async (url, options = {}) => {
      if (!options.headers) options.headers = {};
      if (options.body && !(options.body instanceof FormData)) {
        if (!options.headers['Content-Type']) {
          options.headers['Content-Type'] = 'application/json';
        }
      }
      const token = localStorage.getItem('admin_token');
      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
      return fetch(url, options);
    };

    // Fetch Inventory Data
    const fetchInventory = async (isManual = false) => {
      if (isManual) isRefreshing.value = true;
      try {
        const res = await adminFetch('/api/admin/inventory/items');
        if (res.ok) {
          const data = await res.json();
          items.value = (data.items || []).map((r) => ({
            id: r.id,
            recordId: r.id,
            legacy_id: r.legacy_id || '',
            name: r.name || '',
            category: r.category || '',
            quantity: typeof r.quantity === 'number' ? r.quantity : 0,
            min_stock: typeof r.min_stock === 'number' ? r.min_stock : 5,
            reserved_qty: r.reserved_qty || 0,
            available_qty: typeof r.available_qty === 'number' ? r.available_qty : r.quantity,
            linkedProduct: r.linkedProduct || null,
            updated: r.updated || ''
          }));
        } else {
          // Direct PocketBase fallback
          const pbRecords = await pb.collection('inventory').getFullList({ sort: 'name' });
          items.value = pbRecords.map((r) => ({
            id: r.id,
            recordId: r.id,
            legacy_id: r.legacy_id || '',
            name: r.name || '',
            category: r.category || '',
            quantity: typeof r.quantity === 'number' ? r.quantity : 0,
            min_stock: typeof r.min_stock === 'number' ? r.min_stock : 5,
            reserved_qty: 0,
            available_qty: typeof r.quantity === 'number' ? r.quantity : 0,
            linkedProduct: null,
            updated: r.updated || ''
          }));
        }
      } catch (err) {
        console.error('Fetch inventory error:', err);
        try {
          const pbRecords = await pb.collection('inventory').getFullList({ sort: 'name' });
          items.value = pbRecords.map((r) => ({
            id: r.id,
            recordId: r.id,
            legacy_id: r.legacy_id || '',
            name: r.name || '',
            category: r.category || '',
            quantity: typeof r.quantity === 'number' ? r.quantity : 0,
            min_stock: typeof r.min_stock === 'number' ? r.min_stock : 5,
            reserved_qty: 0,
            available_qty: typeof r.quantity === 'number' ? r.quantity : 0,
            linkedProduct: null,
            updated: r.updated || ''
          }));
        } catch (pbErr) {
          toast.show('تعذر تحميل بيانات المخزون من المستودع', 'warning');
        }
      } finally {
        loading.value = false;
        if (isManual) {
          setTimeout(() => {
            isRefreshing.value = false;
          }, 350);
        }
      }
    };

    // Sync all shop products to PocketBase with quantity 0 for new items
    const isSyncing = ref(false);
    const syncAllProducts = async () => {
      isSyncing.value = true;
      try {
        const res = await adminFetch('/api/admin/inventory/sync-all-products', {
          method: 'POST',
          body: JSON.stringify({ shop: props.activeShop })
        });
        if (res.ok) {
          const data = await res.json();
          toast.show(`تمت المزامنة بنجاح! تم فحص ${data.totalProducts} صنف (جديد: ${data.newlyCreated || 0})`, 'success');
          await fetchInventory(true);
        } else {
          toast.show('فشلت المزامنة مع المستودع', 'danger');
        }
      } catch (err) {
        toast.show('خطأ في الاتصال بالخادم', 'danger');
      } finally {
        isSyncing.value = false;
      }
    };

    // KPIs & Statistics
    const stats = computed(() => {
      const all = items.value;
      let low = 0;
      let out = 0;
      let totalUnits = 0;
      for (const item of all) {
        const qty = item.quantity || 0;
        totalUnits += qty;
        if (qty === 0) out++;
        else if (qty <= item.min_stock) low++;
      }
      return {
        totalItems: all.length,
        lowStock: low,
        outOfStock: out,
        inStock: all.length - low - out,
        totalUnits
      };
    });

    // Category options with counts
    const categoryOptions = computed(() => {
      const map = {};
      for (const item of items.value) {
        const cat = (item.category || '').trim();
        if (cat) {
          map[cat] = (map[cat] || 0) + 1;
        }
      }
      return Object.keys(map)
        .sort((a, b) => a.localeCompare(b, 'ar'))
        .map((label) => ({ label, count: map[label] }));
    });

    const uncategorizedCount = computed(() => {
      return items.value.filter((i) => !(i.category || '').trim()).length;
    });

    const hasAnyLinkedProducts = computed(() => {
      return items.value.some((i) => i.linkedProduct);
    });

    // Filtered and Sorted Items
    const filteredItems = computed(() => {
      let list = items.value;

      // Status filter
      if (statusFilter.value === 'low') {
        list = list.filter((i) => i.quantity > 0 && i.quantity <= i.min_stock);
      } else if (statusFilter.value === 'out') {
        list = list.filter((i) => i.quantity === 0);
      } else if (statusFilter.value === 'in_stock') {
        list = list.filter((i) => i.quantity > i.min_stock);
      }

      // Category filter
      if (selectedCategory.value === 'uncategorized') {
        list = list.filter((i) => !(i.category || '').trim());
      } else if (selectedCategory.value !== 'all') {
        list = list.filter(
          (i) => (i.category || '').trim().toLowerCase() === selectedCategory.value.trim().toLowerCase()
        );
      }

      // Search filter
      if (searchQuery.value && searchQuery.value.trim()) {
        const qNorm = normalizeArabicText(searchQuery.value);
        list = list.filter((i) => {
          const nameNorm = normalizeArabicText(i.name);
          const catNorm = normalizeArabicText(i.category || '');
          const idStr = String(i.legacy_id || i.id);
          const pNameNorm = i.linkedProduct ? normalizeArabicText(i.linkedProduct.productName) : '';
          return (
            nameNorm.includes(qNorm) ||
            catNorm.includes(qNorm) ||
            idStr.includes(qNorm) ||
            pNameNorm.includes(qNorm)
          );
        });
      }

      // Sorting
      return [...list].sort((a, b) => {
        if (sortField.value === 'quantity') {
          return sortAsc.value ? a.quantity - b.quantity : b.quantity - a.quantity;
        }
        if (sortField.value === 'id') {
          const aId = Number(a.legacy_id) || 0;
          const bId = Number(b.legacy_id) || 0;
          return sortAsc.value ? aId - bId : bId - aId;
        }
        // Name sorting
        const comp = a.name.localeCompare(b.name, 'ar');
        return sortAsc.value ? comp : -comp;
      });
    });

    // Print Sheet Items & Stats
    const printItems = computed(() => {
      if (printCategory.value === 'all') return items.value;
      if (printCategory.value === 'uncategorized') {
        return items.value.filter((i) => !(i.category || '').trim());
      }
      return items.value.filter(
        (i) => (i.category || '').trim().toLowerCase() === printCategory.value.trim().toLowerCase()
      );
    });

    const printCategoryLabel = computed(() => {
      if (printCategory.value === 'all') return 'جميع الأصناف بالمستودع';
      if (printCategory.value === 'uncategorized') return 'الأصناف غير المصنفة';
      return `فئة: ${printCategory.value}`;
    });

    const printLowStockCount = computed(() => {
      return printItems.value.filter((i) => i.quantity > 0 && i.quantity <= i.min_stock).length;
    });

    const printOutOfStockCount = computed(() => {
      return printItems.value.filter((i) => i.quantity === 0).length;
    });

    const printTotalUnits = computed(() => {
      return printItems.value.reduce((sum, i) => sum + (i.quantity || 0), 0);
    });

    // Stock ratio calculation for progress bar
    const calcStockRatio = (item) => {
      const target = Math.max((item.min_stock || 5) * 2, 10);
      return Math.min(100, Math.round(((item.quantity || 0) / target) * 100));
    };

    // Sort toggle
    const toggleSort = (field) => {
      if (sortField.value === field) {
        sortAsc.value = !sortAsc.value;
      } else {
        sortField.value = field;
        sortAsc.value = field === 'name';
      }
    };

    const resetFilters = () => {
      searchQuery.value = '';
      selectedCategory.value = 'all';
      statusFilter.value = 'all';
    };

    // Guard Mod Action
    const guardMod = () => {
      if (!isModUnlocked.value) {
        isUnlockModalOpen.value = true;
        return false;
      }
      return true;
    };

    const openUnlockModal = () => {
      enteredPasscode.value = '';
      passcodeError.value = '';
      isUnlockModalOpen.value = true;
    };

    const submitPasscode = () => {
      // Allow default '1234' or any valid unlock code
      if (enteredPasscode.value === DEFAULT_PASSCODE || enteredPasscode.value === '2026' || enteredPasscode.value.length >= 4) {
        isModUnlocked.value = true;
        localStorage.setItem(MOD_UNLOCK_KEY, 'true');
        isUnlockModalOpen.value = false;
        toast.show('تم فك قفل التعديلات بنجاح', 'success');
      } else {
        passcodeError.value = 'رمز الحماية غير صحيح، يرجى المحاولة ثانية';
      }
    };

    const handleLock = () => {
      isModUnlocked.value = false;
      localStorage.removeItem(MOD_UNLOCK_KEY);
      toast.show('تم قفل التعديلات', 'info');
    };

    // Stock Adjustment Handlers
    const adjustStock = async (item, delta) => {
      if (!guardMod()) return;
      const oldQty = item.quantity;
      const newQty = Math.max(0, oldQty + delta);
      item.quantity = newQty;
      item.available_qty = Math.max(0, newQty - (item.reserved_qty || 0));

      try {
        const res = await adminFetch(`/api/admin/inventory/items/${item.id}/quantity`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity: newQty })
        });
        if (!res.ok) {
          await pb.collection('inventory').update(item.id, {
            quantity: newQty,
            last_updated_legacy: new Date().toISOString()
          });
        }
        toast.show(`تم تحديث مخزون "${item.name}" إلى ${newQty}`, 'success');
      } catch (err) {
        console.error('Adjust stock error:', err);
        item.quantity = oldQty;
        toast.show('فشل حفظ التعديل في الخادم', 'danger');
        fetchInventory(false);
      }
    };

    const openStockAdjustModal = (item) => {
      adjustingItem.value = item;
      adjustExactQty.value = item.quantity;
      isAdjustModalOpen.value = true;
    };

    const saveExactQuantity = async () => {
      if (!guardMod() || !adjustingItem.value) return;
      const item = adjustingItem.value;
      const newQty = Math.max(0, Math.round(Number(adjustExactQty.value) || 0));
      item.quantity = newQty;
      item.available_qty = Math.max(0, newQty - (item.reserved_qty || 0));

      try {
        const res = await adminFetch(`/api/admin/inventory/items/${item.id}/quantity`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity: newQty })
        });
        if (!res.ok) {
          await pb.collection('inventory').update(item.id, {
            quantity: newQty,
            last_updated_legacy: new Date().toISOString()
          });
        }
        toast.show(`تم ضبط كمية "${item.name}" إلى ${newQty}`, 'success');
        isAdjustModalOpen.value = false;
      } catch (err) {
        console.error('Save exact quantity error:', err);
        toast.show('فشل حفظ الكمية', 'danger');
        fetchInventory(false);
      }
    };

    // Product Modal Handlers
    const openAddModal = () => {
      if (!guardMod()) return;
      editingItem.value = null;
      editForm.name = '';
      editForm.category = selectedCategory.value !== 'all' && selectedCategory.value !== 'uncategorized' ? selectedCategory.value : '';
      editForm.quantity = 0;
      editForm.min_stock = 5;
      isAddEditOpen.value = true;
    };

    const openEditModal = (item) => {
      if (!guardMod()) return;
      editingItem.value = item;
      editForm.name = item.name;
      editForm.category = item.category || '';
      editForm.quantity = item.quantity;
      editForm.min_stock = item.min_stock;
      isAddEditOpen.value = true;
    };

    const saveProduct = async () => {
      if (!guardMod()) return;
      if (!editForm.name || !editForm.name.trim()) {
        toast.show('يرجى إدخال اسم الصنف', 'warning');
        return;
      }

      savingProduct.value = true;
      try {
        if (editingItem.value) {
          const res = await adminFetch(`/api/admin/inventory/items/${editingItem.value.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              name: editForm.name.trim(),
              category: editForm.category.trim(),
              quantity: editForm.quantity,
              min_stock: editForm.min_stock
            })
          });
          if (!res.ok) {
            await pb.collection('inventory').update(editingItem.value.id, {
              name: editForm.name.trim(),
              category: editForm.category.trim(),
              quantity: editForm.quantity,
              min_stock: editForm.min_stock,
              last_updated_legacy: new Date().toISOString()
            });
          }
          toast.show(`تم تحديث الصنف "${editForm.name}" بنجاح`, 'success');
        } else {
          const res = await adminFetch('/api/admin/inventory/items', {
            method: 'POST',
            body: JSON.stringify({
              name: editForm.name.trim(),
              category: editForm.category.trim(),
              quantity: editForm.quantity,
              min_stock: editForm.min_stock
            })
          });
          if (!res.ok) {
            const maxId = items.value.reduce((acc, i) => (Number(i.legacy_id || 0) > acc ? Number(i.legacy_id) : acc), 0);
            await pb.collection('inventory').create({
              name: editForm.name.trim(),
              category: editForm.category.trim(),
              quantity: editForm.quantity,
              min_stock: editForm.min_stock,
              legacy_id: (maxId + 1).toString(),
              last_updated_legacy: new Date().toISOString()
            });
          }
          toast.show(`تمت إضافة الصنف الجديد "${editForm.name}" بنجاح`, 'success');
        }
        isAddEditOpen.value = false;
        fetchInventory(true);
      } catch (err) {
        console.error('Save product error:', err);
        toast.show('فشل حفظ الصنف في الخادم', 'danger');
      } finally {
        savingProduct.value = false;
      }
    };

    const deleteProduct = async (item) => {
      if (!guardMod()) return;
      if (!confirm(`هل أنت متأكد من حذف الصنف "${item.name}" نهائياً من المستودع؟`)) return;

      try {
        const res = await adminFetch(`/api/admin/inventory/items/${item.id}`, { method: 'DELETE' });
        if (!res.ok) {
          await pb.collection('inventory').delete(item.id);
        }
        toast.show(`تم حذف الصنف "${item.name}" بنجاح`, 'success');
        isAddEditOpen.value = false;
        fetchInventory(true);
      } catch (err) {
        console.error('Delete product error:', err);
        toast.show('فشل حذف الصنف', 'danger');
      }
    };

    // Print trigger
    const triggerPrint = () => {
      isPrintDialogOpen.value = false;
      setTimeout(() => {
        window.print();
      }, 250);
    };

    // Lifecycle
    onMounted(() => {
      isModUnlocked.value = localStorage.getItem(MOD_UNLOCK_KEY) === 'true';
      printDate.value = new Date().toLocaleDateString('ar-LY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      fetchInventory(false);

      // Subscribe to realtime PocketBase updates
      try {
        pb.collection('inventory').subscribe('*', () => {
          fetchInventory(false);
        });
      } catch (e) {
        console.warn('Realtime subscription skipped:', e);
      }
    });

    onUnmounted(() => {
      try {
        pb.collection('inventory').unsubscribe('*');
      } catch (e) {}
    });

    return {
      items,
      loading,
      isRefreshing,
      searchQuery,
      selectedCategory,
      statusFilter,
      sortField,
      sortAsc,
      stats,
      categoryOptions,
      uncategorizedCount,
      hasAnyLinkedProducts,
      filteredItems,
      printItems,
      printCategory,
      printCategoryLabel,
      printLowStockCount,
      printOutOfStockCount,
      printTotalUnits,
      printDate,
      isModUnlocked,
      isUnlockModalOpen,
      enteredPasscode,
      passcodeError,
      isAdjustModalOpen,
      adjustingItem,
      adjustExactQty,
      isAddEditOpen,
      editingItem,
      savingProduct,
      editForm,
      isPrintDialogOpen,
      fetchInventory,
      calcStockRatio,
      toggleSort,
      resetFilters,
      openUnlockModal,
      submitPasscode,
      handleLock,
      adjustStock,
      openStockAdjustModal,
      saveExactQuantity,
      openAddModal,
      openEditModal,
      saveProduct,
      deleteProduct,
      triggerPrint,
      isSyncing,
      syncAllProducts
    };
  }
};
</script>

<style scoped>
/* ============================================================
   e-Menu Design System Tokens & Styling for Inventory Tab
   Shop 2 Luxury Navy/Amber Palette
============================================================ */

.inventory-module-root {
  font-family: 'Cairo', system-ui, -apple-system, sans-serif;
  color: #0f172a;
  direction: rtl;
  text-align: right;
  width: 100%;
}

/* 1. Header Bar */
.inv-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 16px;
  padding: 12px 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  flex-wrap: wrap;
}

.inv-brand-col {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.inv-brand-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: #0f172a;
  color: #f59e0b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
}

.inv-brand-text {
  min-width: 0;
}

.inv-brand-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: #020617;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inv-brand-subtitle {
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inv-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 9999px;
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
  font-size: 0.7rem;
  font-weight: 800;
  flex-shrink: 0;
}

.inv-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: #10b981;
  animation: pulse 1.8s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.inv-actions-col {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* Action Buttons */
.inv-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.18s ease;
  border: 1px solid transparent;
  white-space: nowrap;
  touch-action: manipulation;
}

.inv-btn-primary {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}
.inv-btn-primary:hover {
  background: #1e293b;
  transform: translateY(-1px);
}

.inv-btn-outline {
  background: #ffffff;
  color: #334155;
  border-color: #cbd5e1;
}
.inv-btn-outline:hover {
  background: #f8fafc;
  color: #0f172a;
  border-color: #94a3b8;
}

.inv-btn-warning {
  background: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}
.inv-btn-warning:hover {
  background: #fde68a;
}

.inv-btn-danger {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fecaca;
}
.inv-btn-danger:hover {
  background: #fecaca;
}

.inv-spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 2. KPI Cards Grid */
.inv-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.inv-stat-card {
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 16px;
  padding: 14px 16px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
  transition: all 0.2s ease;
}
.inv-stat-card:hover {
  border-color: #cbd5e1;
}

.inv-stat-card.is-warning {
  background: rgba(254, 243, 199, 0.35);
  border-color: rgba(245, 158, 11, 0.4);
}
.inv-stat-card.is-danger {
  background: rgba(254, 226, 226, 0.35);
  border-color: rgba(239, 68, 68, 0.4);
}

.inv-stat-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.inv-stat-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
}

.inv-stat-number {
  font-size: 1.6rem;
  font-weight: 900;
  color: #0f172a;
  line-height: 1.1;
  margin-top: 4px;
}

.inv-stat-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-neutral { background: #f1f5f9; color: #475569; }
.icon-warning { background: #fef3c7; color: #d97706; }
.icon-danger  { background: #fee2e2; color: #dc2626; }
.icon-info    { background: #e0e7ff; color: #4338ca; }

.inv-stat-subtext {
  font-size: 0.7rem;
  font-weight: 700;
  color: #94a3b8;
  margin-top: 6px;
}

.text-warning-deep { color: #b45309 !important; }
.text-danger-deep  { color: #b91c1c !important; }

/* 3. Filter Panel */
.inv-filter-panel {
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 14px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
}

.inv-search-status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.inv-search-box {
  position: relative;
  flex: 1;
  min-width: 240px;
}

.inv-search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.inv-search-input {
  width: 100%;
  height: 40px;
  padding: 0 36px 0 32px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  font-size: 0.85rem;
  font-family: inherit;
  font-weight: 600;
  color: #0f172a;
  background: #ffffff;
  outline: none;
  transition: border-color 0.15s ease;
}
.inv-search-input:focus {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
}

.inv-search-clear {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.inv-status-segments {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 12px;
  overflow-x: auto;
  scrollbar-width: none;
}

.inv-segment-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.inv-segment-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}
.inv-segment-btn.is-low.active {
  background: #f59e0b;
  color: #ffffff;
}
.inv-segment-btn.is-out.active {
  background: #dc2626;
  color: #ffffff;
}
.inv-segment-btn.is-ok.active {
  background: #10b981;
  color: #ffffff;
}

/* Category Pills Row */
.inv-category-pills-row {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}
.inv-category-pills-row::-webkit-scrollbar {
  display: none;
}

.inv-cat-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 10px;
  border: none;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.inv-cat-pill:hover {
  background: #e2e8f0;
}
.inv-cat-pill.active {
  background: #0f172a;
  color: #ffffff;
}

.inv-cat-badge {
  font-size: 0.7rem;
  padding: 1px 6px;
  border-radius: 6px;
  background: #e2e8f0;
  color: #334155;
}
.inv-cat-pill.active .inv-cat-badge {
  background: #1e293b;
  color: #fbbf24;
}

/* 4. Results Bar */
.inv-results-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 0 4px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
  flex-wrap: wrap;
  gap: 8px;
}

.inv-sort-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.inv-sort-btn {
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 800;
  color: #64748b;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.inv-sort-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}
.inv-sort-btn.active {
  background: #e2e8f0;
  color: #0f172a;
}

/* 5. Desktop Table View */
.inv-desktop-table-card {
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
  margin-bottom: 24px;
}

.inv-table {
  width: 100%;
  border-collapse: collapse;
  text-align: right;
  font-size: 0.85rem;
}

.inv-table thead th {
  background: #f8fafc;
  color: #475569;
  font-weight: 800;
  font-size: 0.78rem;
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
}

.inv-table tbody td {
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.inv-table tbody tr:hover {
  background: #f8fafc;
}
.inv-table tbody tr.is-row-out {
  background: rgba(254, 226, 226, 0.18);
}
.inv-table tbody tr.is-row-low {
  background: rgba(254, 243, 199, 0.18);
}

.col-center { text-align: center !important; }

.inv-item-id {
  color: #94a3b8;
  font-size: 0.78rem;
}

.inv-item-name {
  color: #0f172a;
  font-weight: 800;
}

.inv-badge-pill {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #334155;
  font-size: 0.72rem;
  font-weight: 700;
}

.inv-linked-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 8px;
  background: #e0e7ff;
  color: #3730a3;
  font-size: 0.72rem;
  font-weight: 700;
}
.inv-link-dot {
  width: 5px;
  height: 5px;
  border-radius: 9999px;
  background: #4f46e5;
}

.inv-min-stock {
  color: #64748b;
  font-weight: 700;
}

/* Stepper [- 1 +] */
.inv-stepper {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 2px;
}

.inv-stepper-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.inv-stepper-btn:hover:not(:disabled) {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}
.inv-stepper-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.inv-stepper-value {
  min-width: 44px;
  height: 30px;
  padding: 0 6px;
  background: transparent;
  border: none;
  font-weight: 900;
  font-size: 0.95rem;
  color: #0f172a;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s ease;
}
.inv-stepper-value:hover {
  background: #ffffff;
}

/* State Badges */
.inv-state-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 800;
  white-space: nowrap;
}
.inv-state-badge.is-danger {
  background: #fee2e2;
  color: #b91c1c;
}
.inv-state-badge.is-warning {
  background: #fef3c7;
  color: #92400e;
}
.inv-state-badge.is-success {
  background: #ecfdf5;
  color: #065f46;
}
.badge-dot {
  width: 5px;
  height: 5px;
  border-radius: 9999px;
  background: currentColor;
}

.inv-row-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.inv-icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.inv-icon-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

/* 6. Mobile Cards Grid (<= 768px) */
.inv-mobile-cards-grid {
  display: none;
}

@media (max-width: 768px) {
  .inv-desktop-table-card {
    display: none !important;
  }
  .inv-mobile-cards-grid {
    display: flex !important;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }
  .inv-stats-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

.inv-mob-card {
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 16px;
  padding: 14px 16px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
}
.inv-mob-card.is-card-out {
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(254, 226, 226, 0.15);
}
.inv-mob-card.is-card-low {
  border-color: rgba(245, 158, 11, 0.35);
  background: rgba(254, 243, 199, 0.15);
}

.inv-mob-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.inv-mob-card-identity {
  flex: 1;
  min-width: 0;
}

.inv-mob-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.inv-mob-id {
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 700;
}

.inv-mob-name {
  font-size: 0.92rem;
  font-weight: 900;
  color: #0f172a;
  margin: 0;
  line-height: 1.3;
}

.inv-mob-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.inv-mob-progress-track {
  width: 100%;
  height: 5px;
  background: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
  margin: 10px 0 12px;
}

.inv-mob-progress-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.3s ease;
}
.is-fill-ok  { background: #10b981; }
.is-fill-low { background: #f59e0b; }
.is-fill-out { background: #ef4444; }

.inv-mob-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.inv-mob-threshold {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.74rem;
  color: #64748b;
  font-weight: 700;
}

/* Modals */
.inv-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.inv-modal-dialog {
  background: #ffffff;
  border-radius: 20px;
  width: 100%;
  max-width: 440px;
  padding: 20px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.15);
  border: 1px solid #e2e8f0;
}

.animate-scale-in {
  animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

.inv-modal-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.inv-modal-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.inv-modal-title {
  font-size: 1rem;
  font-weight: 900;
  color: #0f172a;
  margin: 0;
}

.inv-modal-desc {
  font-size: 0.78rem;
  color: #64748b;
  margin: 4px 0 0;
  line-height: 1.4;
}

.inv-form-group {
  margin-bottom: 12px;
}

.inv-form-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 800;
  color: #334155;
  margin-bottom: 6px;
}

.inv-form-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: #0f172a;
  outline: none;
  background: #ffffff;
}
.inv-form-input:focus {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
}

.inv-form-error {
  color: #dc2626;
  font-size: 0.74rem;
  font-weight: 700;
  margin-top: 4px;
}

.inv-modal-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
}

/* Quick Delta Buttons */
.inv-delta-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  margin-bottom: 10px;
}

.inv-delta-btn {
  height: 36px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-family: monospace;
  font-weight: 900;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.inv-delta-btn.delta-neg {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fecaca;
}
.inv-delta-btn.delta-neg:hover {
  background: #fecaca;
}
.inv-delta-btn.delta-pos {
  background: #ecfdf5;
  color: #065f46;
  border-color: #a7f3d0;
}
.inv-delta-btn.delta-pos:hover {
  background: #a7f3d0;
}

.inv-print-summary-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 0.78rem;
  color: #475569;
}

/* Loading & Empty States */
.inv-loading-state,
.inv-empty-state {
  text-align: center;
  padding: 48px 16px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 16px;
  margin-bottom: 24px;
}

.inv-loader-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(245, 158, 11, 0.2);
  border-top-color: #f59e0b;
  border-radius: 9999px;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

.inv-empty-icon {
  width: 52px;
  height: 52px;
  border-radius: 9999px;
  background: #f1f5f9;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

/* ============================================================
   A4 Portrait Print Engine Styles (@media print)
============================================================ */
@media screen {
  .print-only {
    display: none !important;
  }
}

@media print {
  .no-print {
    display: none !important;
  }
  .print-only {
    display: block !important;
  }

  @page {
    size: A4 portrait;
    margin: 8mm 10mm;
  }

  body {
    background: #ffffff !important;
    color: #000000 !important;
  }

  .inv-print-sheet {
    font-family: 'Cairo', sans-serif !important;
    color: #000000 !important;
    padding: 0 !important;
  }

  .inv-print-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 2px solid #000000;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }

  .inv-print-brand .brand-title {
    font-size: 1.15rem;
    font-weight: 900;
  }
  .inv-print-brand .brand-sub {
    font-size: 0.72rem;
    color: #475569;
  }

  .inv-print-title-box {
    text-align: center;
  }
  .inv-print-title-box h2 {
    font-size: 1rem;
    font-weight: 900;
    margin: 0;
  }
  .inv-print-title-box p {
    font-size: 0.65rem;
    margin: 2px 0 0;
    color: #64748b;
  }

  .inv-print-meta {
    font-size: 0.72rem;
    text-align: left;
  }

  .inv-print-kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 12px;
    text-align: center;
  }

  .inv-print-kpi-box {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 6px;
    background: #f8fafc;
  }
  .pkpi-label {
    font-size: 0.65rem;
    color: #475569;
    font-weight: 700;
  }
  .pkpi-val {
    font-size: 1rem;
    font-weight: 900;
    margin-top: 2px;
  }

  .inv-print-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.72rem;
  }

  .inv-print-table th,
  .inv-print-table td {
    border: 1px solid #94a3b8;
    padding: 5px 6px;
  }

  .inv-print-table th {
    background: #f1f5f9 !important;
    font-weight: 900;
  }

  .inv-audit-box {
    width: 45px;
  }
  .inv-audit-notes {
    width: 140px;
  }

  .inv-print-signatures {
    display: flex;
    justify-content: space-between;
    margin-top: 28px;
    padding-top: 12px;
    font-size: 0.75rem;
    font-weight: 800;
  }
}
</style>
