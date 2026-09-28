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

        <!-- KPI 5: Reserved Units for Waiting Orders -->
        <div class="inv-stat-card is-reserved">
          <div class="inv-stat-header">
            <div class="inv-stat-info">
              <div class="inv-stat-label text-reserved-deep">محجوز بالطلبات</div>
              <div class="inv-stat-number text-mono text-reserved-deep">{{ stats.totalReserved.toLocaleString('ar-LY') }}</div>
            </div>
            <div class="inv-stat-icon-wrap icon-reserved">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
          </div>
          <div class="inv-stat-subtext text-reserved-deep">{{ stats.itemsWithReserved }} صنف بطلبات معلقة</div>
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
              v-if="stats.totalReserved > 0"
              type="button"
              class="inv-segment-btn is-reserved"
              :class="{ active: statusFilter === 'reserved' }"
              @click="statusFilter = 'reserved'"
              title="تصفية الأصناف التي تحتوي على كميات محجوزة بالطلبات المعلقة"
            >
              محجوز ({{ stats.itemsWithReserved }})
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
                <th @click="toggleSort('name')" style="cursor: pointer;" title="انقر للترتيب أبجدياً">
                  <span>اسم الصنف بالمستودع</span>
                  <span class="inv-sort-indicator" v-if="sortField === 'name'">{{ sortAsc ? '↑' : '↓' }}</span>
                </th>
                <th style="width: 130px;">الفئة</th>
                <th v-if="hasAnyLinkedProducts" style="width: 150px;">المنتج المرتبط</th>
                <th class="col-center" style="width: 160px; cursor: pointer;" @click="toggleSort('quantity')" title="انقر للترتيب حسب الرصيد الكلي بالمستودع">
                  <span>الرصيد الكلي</span>
                  <span class="inv-sort-indicator" v-if="sortField === 'quantity'">{{ sortAsc ? '↑' : '↓' }}</span>
                </th>
                <th class="col-center" style="width: 130px; cursor: pointer;" @click="toggleSort('reserved')" title="انقر للترتيب حسب المحجوز للطلبات المعلقة">
                  <span>محجوز (طلبات)</span>
                  <span class="inv-sort-indicator" v-if="sortField === 'reserved'">{{ sortAsc ? '↑' : '↓' }}</span>
                </th>
                <th class="col-center" style="width: 105px; cursor: pointer;" @click="toggleSort('available')" title="انقر للترتيب حسب المتاح الصافي">
                  <span>المتاح الصافي</span>
                  <span class="inv-sort-indicator" v-if="sortField === 'available'">{{ sortAsc ? '↑' : '↓' }}</span>
                </th>
                <th class="col-center" style="width: 85px;">الحد الأدنى</th>
                <th class="col-center" style="width: 95px;">الحالة</th>
                <th class="col-center" style="width: 85px;">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in filteredItems"
                :key="item.id"
                :class="{
                  'is-row-out': item.available_qty === 0,
                  'is-row-low': item.available_qty > 0 && item.available_qty <= item.min_stock,
                  'is-row-has-reserved': item.reserved_qty > 0
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

                <!-- Total Physical Quantity Stepper [- 1 +] -->
                <td class="col-center">
                  <div class="inv-stepper" dir="ltr">
                    <button
                      type="button"
                      class="inv-stepper-btn"
                      :disabled="item.quantity <= 0"
                      @click="adjustStock(item, -1)"
                      aria-label="إنقاص وحدة"
                      title="إنقاص وحدة واحدة من المستودع"
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
                      @click="adjustStock(item, 1)"
                      aria-label="زيادة وحدة"
                      title="زيادة وحدة واحدة إلى المستودع"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                  </div>
                </td>

                <!-- Reserved Quantity for Waiting Orders -->
                <td class="col-center">
                  <div
                    v-if="item.reserved_qty > 0"
                    class="inv-reserved-chip"
                    :title="`محجوز ${item.reserved_qty} وحدة بواسطة ${item.waiting_orders_count || 1} طلب معلق`"
                  >
                    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span class="text-mono font-bold">{{ item.reserved_qty }}</span>
                    <span class="inv-res-sub" v-if="(item.waiting_orders_count || 0) > 1">({{ item.waiting_orders_count }} طلب)</span>
                  </div>
                  <span v-else class="inv-text-muted text-mono">—</span>
                </td>

                <!-- Net Available Quantity -->
                <td class="col-center">
                  <span
                    class="text-mono font-bold inv-avail-val"
                    :class="{
                      'text-danger-deep': item.available_qty === 0,
                      'text-warning-deep': item.available_qty > 0 && item.available_qty <= item.min_stock,
                      'text-success-deep': item.available_qty > item.min_stock
                    }"
                    :title="`المتاح الصافي للبيع: ${item.available_qty} وحدة (من إجمالي ${item.quantity} - ${item.reserved_qty} محجوز)`"
                  >
                    {{ item.available_qty }}
                  </span>
                </td>

                <!-- Min Stock -->
                <td class="col-center text-mono inv-min-stock">
                  {{ item.min_stock }}
                </td>

                <!-- Status Badge -->
                <td class="col-center">
                  <span v-if="item.available_qty === 0" class="inv-state-badge is-danger">
                    <span class="badge-dot"></span>
                    نفد
                  </span>
                  <span v-else-if="item.available_qty <= item.min_stock" class="inv-state-badge is-warning">
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
                      type="button"
                      class="inv-btn inv-btn-outline inv-btn-sm"
                      @click="openStockAdjustModal(item)"
                      :aria-label="`ضبط كمية ${item.name}`"
                      title="ضبط الكمية والحد الأدنى"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                      <span>ضبط</span>
                    </button>
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
              'is-card-out': item.available_qty === 0,
              'is-card-low': item.available_qty > 0 && item.available_qty <= item.min_stock,
              'is-card-has-reserved': item.reserved_qty > 0
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
                <span v-if="item.available_qty === 0" class="inv-state-badge is-danger">نفد</span>
                <span v-else-if="item.available_qty <= item.min_stock" class="inv-state-badge is-warning">منخفض</span>
                <span v-else class="inv-state-badge is-success">متوفر</span>
              </div>
            </div>

            <!-- Reserved by Waiting Orders Alert Strip (when reserved_qty > 0) -->
            <div v-if="item.reserved_qty > 0" class="inv-mob-reserved-strip">
              <div class="inv-mob-res-pill">
                <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>محجوز بطلبات معلقة:</span>
                <strong class="text-mono font-bold">{{ item.reserved_qty }}</strong>
                <span class="inv-res-sub" v-if="(item.waiting_orders_count || 0) > 1">({{ item.waiting_orders_count }} طلب)</span>
              </div>
              <div class="inv-mob-avail-pill">
                <span>المتاح الصافي:</span>
                <strong class="text-mono" :class="item.available_qty === 0 ? 'text-danger-deep' : 'text-success-deep'">{{ item.available_qty }}</strong>
              </div>
            </div>

            <!-- Stock Progress Bar -->
            <div class="inv-mob-progress-track">
              <div
                class="inv-mob-progress-fill"
                :class="{
                  'is-fill-out': item.available_qty === 0,
                  'is-fill-low': item.available_qty > 0 && item.available_qty <= item.min_stock,
                  'is-fill-ok': item.available_qty > item.min_stock
                }"
                :style="{ width: calcStockRatio(item) + '%' }"
              ></div>
            </div>

            <!-- Card Bottom Bar: Stepper & Limits -->
            <div class="inv-mob-card-footer">
              <!-- Stepper (Total physical quantity in warehouse) -->
              <div class="inv-mob-stepper-wrap">
                <span class="inv-mob-foot-label">الرصيد الكلي:</span>
                <div class="inv-stepper" dir="ltr">
                  <button
                    type="button"
                    class="inv-stepper-btn"
                    :disabled="item.quantity <= 0"
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
                    @click="adjustStock(item, 1)"
                    aria-label="زيادة وحدة"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Min Stock & Adjust Action -->
              <div class="inv-mob-threshold-actions">
                <div class="inv-mob-threshold">
                  <span class="inv-thresh-label">الحد الأدنى:</span>
                  <span class="inv-thresh-val text-mono">{{ item.min_stock }}</span>
                  <span v-if="item.reserved_qty === 0" class="inv-mob-plain-avail">| المتاح: <strong class="text-mono">{{ item.available_qty }}</strong></span>
                </div>
                <button
                  type="button"
                  class="inv-btn inv-btn-outline inv-btn-sm"
                  @click="openStockAdjustModal(item)"
                  title="ضبط الكمية والحد الأدنى"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  <span>ضبط</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->

    <!-- Modal: Stock & Alert Adjustment Modal -->
    <Teleport to="body">
      <div v-if="isAdjustModalOpen && adjustingItem" class="inv-modal-overlay" @click.self="isAdjustModalOpen = false">
        <div class="inv-modal-dialog animate-scale-in" dir="rtl">
          <div class="inv-modal-header">
            <div class="inv-modal-icon-wrap icon-info">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </div>
            <div>
              <h3 class="inv-modal-title">ضبط كمية المخزون والحد الأدنى</h3>
              <p class="inv-modal-desc mb-1 font-bold">{{ adjustingItem.name }}</p>
            </div>
          </div>

          <div class="inv-modal-body">
            <!-- Stock Breakdown Strip -->
            <div class="inv-adjust-stock-strip mb-3">
              <div class="inv-adj-box">
                <span class="adj-label">الرصيد الكلي</span>
                <span class="adj-val text-mono font-bold">{{ adjustingItem.quantity }}</span>
              </div>
              <div class="inv-adj-box is-res">
                <span class="adj-label">محجوز بطلبات</span>
                <span class="adj-val text-mono font-bold text-warning-deep">
                  {{ adjustingItem.reserved_qty }}
                  <small v-if="(adjustingItem.waiting_orders_count || 0) > 0">({{ adjustingItem.waiting_orders_count }} طلب)</small>
                </span>
              </div>
              <div class="inv-adj-box is-avail">
                <span class="adj-label">المتاح الصافي</span>
                <span class="adj-val text-mono font-bold" :class="adjustingItem.available_qty === 0 ? 'text-danger-deep' : 'text-success-deep'">{{ adjustingItem.available_qty }}</span>
              </div>
            </div>
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

            <!-- Set Exact Quantity and Min Stock -->
            <div class="inv-form-group mt-3">
              <div class="d-flex gap-3">
                <div class="flex-1">
                  <label class="inv-form-label">الكمية المتوفرة بالمستودع:</label>
                  <input
                    type="number"
                    v-model.number="adjustExactQty"
                    min="0"
                    class="inv-form-input text-mono text-center font-bold"
                    style="font-size: 1.15rem;"
                  />
                </div>
                <div class="flex-1">
                  <label class="inv-form-label">حد التنبيه (الحد الأدنى):</label>
                  <input
                    type="number"
                    v-model.number="adjustMinStock"
                    min="0"
                    class="inv-form-input text-mono text-center font-bold"
                    style="font-size: 1.15rem;"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="inv-modal-footer">
            <button
              type="button"
              class="inv-btn inv-btn-primary flex-1"
              @click="saveExactQuantity"
            >
              حفظ التعديلات
            </button>
            <button type="button" class="inv-btn inv-btn-outline" @click="isAdjustModalOpen = false">
              إلغاء
            </button>
          </div>
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
          <div class="pkpi-label">إجمالي الدفتري</div>
          <div class="pkpi-val text-mono">{{ printTotalUnits.toLocaleString('ar-LY') }}</div>
        </div>
        <div class="inv-print-kpi-box" v-if="printTotalReserved > 0">
          <div class="pkpi-label">محجوز بالطلبات</div>
          <div class="pkpi-val text-mono text-warning-deep">{{ printTotalReserved.toLocaleString('ar-LY') }}</div>
        </div>
      </div>

      <!-- Print Audit Table -->
      <table class="inv-print-table">
        <thead>
          <tr>
            <th style="width: 35px;" class="col-center">#</th>
            <th>اسم الصنف في المستودع</th>
            <th style="width: 85px;" class="col-center">الفئة</th>
            <th style="width: 70px;" class="col-center">الرصيد الدفتري</th>
            <th style="width: 70px;" class="col-center">محجوز (طلبات)</th>
            <th style="width: 70px;" class="col-center">المتاح الصافي</th>
            <th style="width: 65px;" class="col-center">حد التنبيه</th>
            <th style="width: 75px;" class="col-center">الجرد الفعلي</th>
            <th style="width: 65px;" class="col-center">المطابقة</th>
            <th>ملاحظات أمين المستودع</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in printItems" :key="'prt-' + item.id">
            <td class="col-center text-mono">{{ item.legacy_id || (idx + 1) }}</td>
            <td class="font-bold">{{ item.name }}</td>
            <td class="col-center">{{ item.category || 'عام' }}</td>
            <td class="col-center text-mono font-bold">{{ item.quantity }}</td>
            <td class="col-center text-mono text-warning-deep">{{ item.reserved_qty || 0 }}</td>
            <td class="col-center text-mono font-bold">{{ item.available_qty }}</td>
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
  setup(props) {
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

    // Stock & Alert Adjust Modal
    const isAdjustModalOpen = ref(false);
    const adjustingItem = ref(null);
    const adjustExactQty = ref(0);
    const adjustMinStock = ref(0);

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
        const shopParam = encodeURIComponent(props.activeShop || 'shop2');
        const res = await adminFetch(`/api/admin/inventory/items?shop=${shopParam}`);
        if (res.ok) {
          const data = await res.json();
          items.value = (data.items || []).map((r) => {
            const qty = typeof r.quantity === 'number' ? r.quantity : 0;
            const resQty = typeof r.reserved_qty === 'number' ? r.reserved_qty : 0;
            const availQty = typeof r.available_qty === 'number' ? r.available_qty : Math.max(0, qty - resQty);
            return {
              id: r.id,
              recordId: r.id,
              legacy_id: r.legacy_id || '',
              name: r.name || '',
              category: r.category || '',
              quantity: qty,
              min_stock: typeof r.min_stock === 'number' ? r.min_stock : 5,
              reserved_qty: resQty,
              waiting_orders_count: typeof r.waiting_orders_count === 'number' ? r.waiting_orders_count : (resQty > 0 ? 1 : 0),
              available_qty: availQty,
              linkedProduct: r.linkedProduct || null,
              updated: r.updated || ''
            };
          });
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
            waiting_orders_count: 0,
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
            waiting_orders_count: 0,
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
      let totalReserved = 0;
      let itemsWithReserved = 0;
      for (const item of all) {
        const qty = item.quantity || 0;
        const res = item.reserved_qty || 0;
        const avail = typeof item.available_qty === 'number' ? item.available_qty : Math.max(0, qty - res);
        totalUnits += qty;
        if (res > 0) {
          totalReserved += res;
          itemsWithReserved++;
        }
        if (avail === 0) out++;
        else if (avail <= item.min_stock) low++;
      }
      return {
        totalItems: all.length,
        lowStock: low,
        outOfStock: out,
        inStock: all.length - low - out,
        totalUnits,
        totalReserved,
        itemsWithReserved
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
        list = list.filter((i) => i.available_qty > 0 && i.available_qty <= i.min_stock);
      } else if (statusFilter.value === 'out') {
        list = list.filter((i) => i.available_qty === 0);
      } else if (statusFilter.value === 'in_stock') {
        list = list.filter((i) => i.available_qty > i.min_stock);
      } else if (statusFilter.value === 'reserved') {
        list = list.filter((i) => (i.reserved_qty || 0) > 0);
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
        if (sortField.value === 'reserved') {
          const aRes = a.reserved_qty || 0;
          const bRes = b.reserved_qty || 0;
          return sortAsc.value ? aRes - bRes : bRes - aRes;
        }
        if (sortField.value === 'available') {
          const aAvail = typeof a.available_qty === 'number' ? a.available_qty : (a.quantity || 0);
          const bAvail = typeof b.available_qty === 'number' ? b.available_qty : (b.quantity || 0);
          return sortAsc.value ? aAvail - bAvail : bAvail - aAvail;
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
      return printItems.value.filter((i) => i.available_qty > 0 && i.available_qty <= i.min_stock).length;
    });

    const printOutOfStockCount = computed(() => {
      return printItems.value.filter((i) => i.available_qty === 0).length;
    });

    const printTotalUnits = computed(() => {
      return printItems.value.reduce((sum, i) => sum + (i.quantity || 0), 0);
    });

    const printTotalReserved = computed(() => {
      return printItems.value.reduce((sum, i) => sum + (i.reserved_qty || 0), 0);
    });

    // Stock ratio calculation for progress bar
    const calcStockRatio = (item) => {
      const target = Math.max((item.min_stock || 5) * 2, 10);
      const val = typeof item.available_qty === 'number' ? item.available_qty : (item.quantity || 0);
      return Math.min(100, Math.round((val / target) * 100));
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

    // Stock Adjustment Handlers
    const adjustStock = async (item, delta) => {
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
      adjustMinStock.value = typeof item.min_stock === 'number' ? item.min_stock : 5;
      isAdjustModalOpen.value = true;
    };

    const saveExactQuantity = async () => {
      if (!adjustingItem.value) return;
      const item = adjustingItem.value;
      const newQty = Math.max(0, Math.round(Number(adjustExactQty.value) || 0));
      const newMinStock = Math.max(0, Math.round(Number(adjustMinStock.value) || 0));
      item.quantity = newQty;
      item.min_stock = newMinStock;
      item.available_qty = Math.max(0, newQty - (item.reserved_qty || 0));

      try {
        const res = await adminFetch(`/api/admin/inventory/items/${item.id}`, {
          method: 'PUT',
          body: JSON.stringify({ quantity: newQty, min_stock: newMinStock })
        });
        if (!res.ok) {
          await pb.collection('inventory').update(item.id, {
            quantity: newQty,
            min_stock: newMinStock,
            last_updated_legacy: new Date().toISOString()
          });
        }
        toast.show(`تم ضبط صنف "${item.name}" (الكمية: ${newQty}، الحد الأدنى: ${newMinStock})`, 'success');
        isAdjustModalOpen.value = false;
      } catch (err) {
        console.error('Save exact quantity error:', err);
        toast.show('فشل حفظ التعديلات', 'danger');
        fetchInventory(false);
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
      printTotalReserved,
      printDate,
      isAdjustModalOpen,
      adjustingItem,
      adjustExactQty,
      adjustMinStock,
      isPrintDialogOpen,
      fetchInventory,
      calcStockRatio,
      toggleSort,
      resetFilters,
      adjustStock,
      openStockAdjustModal,
      saveExactQuantity,
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
  font-family: 'Cairo', sans-serif !important;
  color: #0f172a;
  direction: rtl;
  text-align: right;
  width: 100%;
}

/* Enforce Unified Cairo Across All Module Elements & Form Controls */
.inventory-module-root,
.inventory-module-root *,
.inventory-module-root button,
.inventory-module-root input,
.inventory-module-root select,
.inventory-module-root textarea,
.inv-modal-overlay,
.inv-modal-overlay *,
.inv-modal-dialog,
.inv-modal-dialog *,
.inv-modal-dialog button,
.inv-modal-dialog input,
.inv-modal-dialog select,
.inv-modal-dialog textarea,
.inv-print-sheet,
.inv-print-sheet * {
  font-family: 'Cairo', sans-serif !important;
}

/* Tabular Numerics for Numbers, Quantities, Codes, and Balances */
.text-mono {
  font-family: 'Cairo', -apple-system, sans-serif !important;
  font-variant-numeric: tabular-nums !important;
  letter-spacing: -0.2px;
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
  font-size: 0.85rem;
  font-weight: 800;
  font-family: 'Cairo', sans-serif !important;
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
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

@media (max-width: 1024px) {
  .inv-stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }
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
.inv-stat-card.is-reserved {
  background: rgba(254, 243, 199, 0.45);
  border-color: rgba(217, 119, 6, 0.45);
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

.icon-neutral  { background: #f1f5f9; color: #475569; }
.icon-warning  { background: #fef3c7; color: #d97706; }
.icon-danger   { background: #fee2e2; color: #dc2626; }
.icon-info     { background: #e0e7ff; color: #4338ca; }
.icon-reserved { background: #fef3c7; color: #b45309; }

.inv-stat-subtext {
  font-size: 0.7rem;
  font-weight: 700;
  color: #94a3b8;
  margin-top: 6px;
}

.text-warning-deep  { color: #b45309 !important; }
.text-danger-deep   { color: #b91c1c !important; }
.text-reserved-deep { color: #b45309 !important; }
.text-success-deep  { color: #047857 !important; }

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
  font-size: 0.9rem !important;
  font-family: 'Cairo', sans-serif !important;
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
  font-size: 0.82rem;
  font-weight: 800;
  font-family: 'Cairo', sans-serif !important;
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
.inv-segment-btn.is-reserved.active {
  background: #d97706;
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
  font-size: 0.8rem;
  font-weight: 800;
  font-family: 'Cairo', sans-serif !important;
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
  font-size: 0.72rem;
  padding: 1px 6px;
  border-radius: 6px;
  background: #e2e8f0;
  color: #334155;
  font-family: 'Cairo', -apple-system, sans-serif !important;
  font-variant-numeric: tabular-nums !important;
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
  font-size: 0.82rem;
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
  font-family: 'Cairo', sans-serif !important;
  font-size: 0.8rem;
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
  font-size: 0.9rem;
  font-family: 'Cairo', sans-serif !important;
}

.inv-table thead th {
  background: #f8fafc;
  color: #334155;
  font-weight: 850;
  font-size: 0.85rem;
  font-family: 'Cairo', sans-serif !important;
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
}

.inv-table tbody td {
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  font-size: 0.9rem;
  font-family: 'Cairo', sans-serif !important;
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
.inv-table tbody tr.is-row-has-reserved {
  background: rgba(254, 243, 199, 0.08);
}

.inv-sort-indicator {
  display: inline-block;
  margin-right: 4px;
  font-size: 0.78rem;
  color: #d97706;
  font-weight: 900;
}

.inv-reserved-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 800;
}
.inv-res-sub {
  font-size: 0.65rem;
  color: #b45309;
  font-weight: 700;
}
.inv-avail-val {
  font-size: 0.95rem;
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
  font-family: 'Cairo', sans-serif !important;
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
  font-family: 'Cairo', -apple-system, sans-serif !important;
  font-variant-numeric: tabular-nums !important;
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
.inv-mob-card.is-card-has-reserved {
  border-color: rgba(245, 158, 11, 0.4);
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

.inv-mob-reserved-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 10px;
  padding: 7px 10px;
  margin: 8px 0 10px;
  font-size: 0.74rem;
  flex-wrap: wrap;
}

.inv-mob-res-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #92400e;
  font-weight: 700;
}

.inv-mob-avail-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  color: #334155;
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

.inv-mob-stepper-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.inv-mob-foot-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
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
  font-family: 'Cairo', sans-serif !important;
  direction: rtl;
  text-align: right;
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
  font-family: 'Cairo', sans-serif !important;
  font-size: 0.9rem !important;
  font-weight: 600;
  color: #0f172a;
  outline: none;
  background: #ffffff;
}
.inv-form-input:focus {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
}

@media (max-width: 768px) {
  .inv-search-input,
  .inv-form-input {
    font-size: 16px !important;
  }
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

/* Stock Adjustment Modal Breakdown Strip */
.inv-adjust-stock-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px;
}

.inv-adj-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 6px 4px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}
.inv-adj-box.is-res {
  background: #fffbeb;
  border-color: #fde68a;
}
.inv-adj-box.is-avail {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.inv-adj-label {
  font-size: 0.68rem;
  color: #64748b;
  font-weight: 700;
  margin-bottom: 2px;
}

.inv-adj-val {
  font-size: 1.05rem;
  font-weight: 900;
  color: #0f172a;
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
  font-family: 'Cairo', -apple-system, sans-serif !important;
  font-variant-numeric: tabular-nums !important;
  font-weight: 800;
  font-size: 0.9rem;
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
    grid-template-columns: repeat(auto-fit, minmax(95px, 1fr));
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
