<template>
<div v-else-if="activeTab === 'products' && userRole === 'admin'" class="products-tab-content">
            <div class="table-card glass-panel overflow-hidden">
              <div class="card-toolbar card-toolbar-split">
                <div class="card-toolbar-top">
                  <div class="toolbar-title-group">
                    <h3 class="toolbar-title">إدارة قائمة المنتجات</h3>
                    <span class="toolbar-badge">{{ formatArabicPlural(filteredProducts.length, 'product') }}</span>
                  </div>
                  <button @click="openProductModal()" class="btn btn-primary">
                    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" class="me-1" style="display:inline-block; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    إضافة منتج جديد
                  </button>
                </div>
                <div class="card-toolbar-bottom">
                  <div class="search-input-wrapper">
                    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" class="search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input 
                      v-model="filters.search" 
                      type="text" 
                      name="search" 
                      autocomplete="off" 
                      placeholder="البحث بالاسم أو الوصف…" 
                      class="form-control search-input" 
                      @keydown.enter="handleSearchEnter('products', $event)"
                      @keydown.down="handleSearchArrowDown($event)"
                      @keydown.esc="filters.search = ''; $event.target.blur();"
                    />
                  </div>
                  <div class="filters-inline">
                    <select v-model="filters.category" aria-label="تصفية حسب التصنيف" class="form-control select-pill">
                      <option value="">كل الأصناف</option>
                      <option v-for="cat in categories" :key="cat._id" :value="cat.name">{{ cat.name }}</option>
                    </select>
                    <select v-if="availableSubcategories.length > 0" v-model="filters.subCategory" aria-label="تصفية حسب الصنف الفرعي" class="form-control select-pill animate-fade-in">
                      <option value="">كل الأصناف الفرعية</option>
                      <option v-for="sub in availableSubcategories" :key="sub" :value="sub">{{ sub }}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="table-container">
                <!-- Desktop Orders Table -->
                <table class="admin-table desktop-products-table">
                  <thead>
                    <tr>
                      <th>الصورة</th>
                      <th>الاسم</th>
                      <th>الصنف</th>
                      <th>السعر مفرد</th>
                      <th>السعر جملة</th>
                      <th>سعر التكلفة</th>
                      <th>العلامات</th>
                      <th>نوع البيع</th>
                      <th>حالة التوفر</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    <!-- SKELETON ROWS (Products Loading) -->
                    <template v-if="productsLoading">
                      <tr v-for="i in 6" :key="'prod-skel-' + i" class="skeleton-table-row-wrapper">
                        <td><div class="skeleton-shimmer" style="width: 44px; height: 44px; border-radius: 8px;"></div></td>
                        <td>
                          <div class="d-flex flex-column gap-1">
                            <div class="skeleton-shimmer" style="width: 130px; height: 16px;"></div>
                            <div class="skeleton-shimmer" style="width: 80px; height: 12px;"></div>
                          </div>
                        </td>
                        <td><div class="skeleton-shimmer" style="width: 75px; height: 22px; border-radius: 12px;"></div></td>
                        <td><div class="skeleton-shimmer" style="width: 70px; height: 18px;"></div></td>
                        <td><div class="skeleton-shimmer" style="width: 70px; height: 18px;"></div></td>
                        <td><div class="skeleton-shimmer" style="width: 70px; height: 18px;"></div></td>
                        <td><div class="skeleton-shimmer" style="width: 60px; height: 20px; border-radius: 6px;"></div></td>
                        <td><div class="skeleton-shimmer" style="width: 50px; height: 20px; border-radius: 6px;"></div></td>
                        <td><div class="skeleton-shimmer" style="width: 70px; height: 26px; border-radius: 20px;"></div></td>
                        <td><div class="skeleton-shimmer" style="width: 90px; height: 30px; border-radius: 8px;"></div></td>
                      </tr>
                    
  <!-- RESET ORDERS CONFIRMATION MODAL -->
  <div v-if="resetModalOpen" class="modal-overlay animate-fade-in" @click.self="resetModalOpen = false">
    <div class="modal-content reset-confirm-modal-box" role="dialog" aria-modal="true" aria-labelledby="reset-modal-title">
      <div class="modal-header reset-modal-header">
        <div class="d-flex align-items-center gap-3">
          <div class="reset-header-icon" aria-hidden="true">
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <h3 id="reset-modal-title" class="m-0 font-bold text-danger">تأكيد مسح وتصفير سجل الطلبات</h3>
            <p class="text-muted m-0 text-small">هذا الإجراء سيقوم بمسح بيانات الطلبات والمبيعات نهائياً</p>
          </div>
        </div>
        <button @click="resetModalOpen = false" class="modal-close-btn" aria-label="إغلاق">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div class="modal-body py-3">
        <div class="alert-reset-warning mb-3">
          <strong>تنبيه هام جداً:</strong> سيتم حذف جميع الطلبات وإعادة ضبط ترقيم الطلبات إلى <strong>#1001</strong>. تأكد من أنك قمت بأخذ نسخة احتياطية قبل المتابعة.
        </div>

        <div class="form-check mb-3">
          <input class="form-check-input" type="checkbox" id="resetCustBalanceCheck" v-model="resetCustomerBalances">
          <label class="form-check-label font-bold" for="resetCustBalanceCheck" style="cursor: pointer;">
            تصفير مديونيات ومشتريات العملاء أيضاً (تصفير مالي شامل)
          </label>
        </div>

        <div class="form-group mb-2">
          <label class="form-label font-bold">للتأكيد، يرجى كتابة العبارة التالية في الحقل أدناه: <span class="text-danger font-bold">مسح البيانات</span></label>
          <input 
            v-model="resetConfirmText" 
            type="text" 
            class="form-control text-center font-bold" 
            placeholder="مسح البيانات…"
            autocomplete="off"
            spellcheck="false"
          />
        </div>
      </div>

      <div class="modal-footer">
        <button 
          type="button" 
          @click="confirmResetOrders" 
          class="btn btn-danger d-flex align-items-center gap-2"
          :disabled="resetConfirmText.trim() !== 'مسح البيانات' || resetLoading"
        >
          <span v-if="resetLoading" class="spinner-border spinner-border-sm"></span>
          <span>{{ resetLoading ? 'جاري المسح…' : 'نعم، قم بالمسح النهائي' }}</span>
        </button>
        <button type="button" @click="resetModalOpen = false" class="btn btn-outline">
          <span>إلغاء</span>
        </button>
      </div>
    </div>
  </div>

</template>

                    <tr v-else-if="filteredProducts.length === 0">
                      <td colspan="10" class="text-center">لا توجد منتجات مطابقة لخيارات التصفية.</td>
                    </tr>
                    <tr v-else v-for="(prod, idx) in paginatedProducts" :key="prod._id" :class="{ 'keyboard-selected-row': !isMobileScreen && selectedTableRowIndex === idx }">
                      <td>
                        <div class="admin-table-img-wrapper" @click="zoomImage(prod.img)" title="تكبير الصورة">
                          <div class="admin-table-img-shimmer"></div>
                          <img 
                            :src="prod.img || (activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg')" 
                            class="table-prod-img" 
                            loading="lazy" 
                            decoding="async"
                            @error="$event.target.src = activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'"
                          />
                          <div class="admin-img-zoom-badge">
                            <svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                          </div>
                        </div>
                      </td>
                      <td class="text-bold">{{ prod.name }}</td>
                      <td>
                        {{ prod.category }}
                        <span v-if="prod.subCategory" class="badge-sub">{{ prod.subCategory }}</span>
                      </td>
                      <td class="text-mono text-bold">{{ prod.price_regular ? formatPrice(prod.price_regular) : '-' }}</td>
                      <td class="text-mono text-bold">{{ prod.price_bulk ? formatPrice(prod.price_bulk) : '-' }}</td>
                      <td class="text-mono text-bold text-muted">{{ prod.makingCost !== undefined && prod.makingCost !== null ? formatPrice(prod.makingCost) : formatPrice(0) }}</td>
                      <td>
                        <div class="tags-container-small">
                          <span 
                            v-for="(tagName, index) in prod.tags" 
                            :key="index" 
                            class="tag-pill tag-pill-table inline-flex items-center gap-1 px-2 py-1 rounded-md"
                            :class="'tag-' + (getTagDetails(tagName).color || 'default')"
                          >
                            <CategoryIcon :icon="getTagDetails(tagName).icon" :name="tagName" size="13" />
                            <span>{{ tagName }}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span v-if="prod.purchaseType === 'both'" class="badge">كلاهما</span>
                        <span v-else-if="prod.purchaseType === 'regular'" class="badge badge-gold">مفرد فقط</span>
                        <span v-else-if="prod.purchaseType === 'bulk'" class="badge badge-green">جملة فقط</span>
                      </td>
                      <td>
                        <div class="toggle-switch">
                          <input type="checkbox" :id="'avail-'+prod._id" :checked="prod.available" @change="toggleProductAvailability(prod)" />
                          <label :for="'avail-'+prod._id"></label>
                        </div>
                      </td>
                      <td>
                        <div class="btn-group-row">
                          <button @click="openProductModal(prod)" class="btn btn-sm btn-outline">تعديل</button>
                          <button @click="deleteProduct(prod._id)" class="btn btn-sm btn-danger">حذف</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- Mobile Products Cards Grid (Active on screens <= 768px) -->
                <div class="mobile-products-cards-grid">
                  <div v-if="filteredProducts.length === 0" class="mobile-empty-card glass-panel">
                    <span>لا توجد منتجات مطابقة لخيارات التصفية.</span>
                  </div>
                  <div 
                    v-for="prod in paginatedProducts" 
                    :key="'mob-prod-' + prod._id"
                    class="mobile-product-card glass-panel"
                  >
                    <div class="mob-prod-main">
                      <div class="admin-table-img-wrapper mob-prod-img-box" @click="zoomImage(prod.img)" title="تكبير الصورة">
                        <img 
                          :src="prod.img || (activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg')" 
                          class="table-prod-img" 
                          loading="lazy" 
                          decoding="async"
                          @error="$event.target.src = activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'"
                        />
                      </div>
                      <div class="mob-prod-info">
                        <div class="mob-prod-title-row">
                          <span class="mob-prod-name font-bold">{{ prod.name }}</span>
                          <span class="badge-sub">{{ prod.category }}</span>
                        </div>
                        <div class="mob-prod-prices">
                          <span class="mob-price-pill regular text-mono">مفرد: {{ prod.price_regular ? formatPrice(prod.price_regular) : '-' }}</span>
                          <span v-if="prod.price_bulk" class="mob-price-pill bulk text-mono">جملة: {{ formatPrice(prod.price_bulk) }}</span>
                        </div>
                        <div v-if="prod.tags && prod.tags.length" class="tags-container-small mt-1">
                          <span 
                            v-for="(tagName, index) in prod.tags.slice(0, 2)" 
                            :key="index" 
                            class="tag-pill tag-pill-table inline-flex items-center gap-1"
                            :class="'tag-' + (getTagDetails(tagName).color || 'default')"
                          >
                            <span>{{ tagName }}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="mob-prod-footer">
                      <div class="mob-avail-switch">
                        <span class="mob-avail-label">{{ prod.available ? 'متوفر' : 'غير متوفر' }}</span>
                        <div class="toggle-switch">
                          <input type="checkbox" :id="'mob-avail-'+prod._id" :checked="prod.available" @change="toggleProductAvailability(prod)" />
                          <label :for="'mob-avail-'+prod._id"></label>
                        </div>
                      </div>
                      <div class="btn-group-row">
                        <button @click="openProductModal(prod)" class="btn btn-sm btn-outline">تعديل</button>
                        <button @click="deleteProduct(prod._id)" class="btn btn-sm btn-danger">حذف</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Products Table Numbered Pagination Bar -->
              <div v-if="productsTotalPages > 1" class="admin-pagination-bar" :class="{ 'keyboard-selected-pagination': !isMobileScreen && paginationFocused }">
                <div class="pagination-info">
                  <span>عرض <strong>{{ (productsPage - 1) * productsPerPage + 1 }}</strong> - <strong>{{ Math.min(productsPage * productsPerPage, filteredProducts.length) }}</strong> من أصل <strong>{{ filteredProducts.length }}</strong> منتج</span>
                </div>

                <div class="pagination-controls-group">
                  <button 
                    class="pagination-btn prev-btn" 
                    :disabled="productsPage === 1" 
                    @click="productsPage--" 
                    title="الصفحة السابقة"
                  >
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    <span class="btn-text-desktop">السابق</span>
                  </button>

                  <div class="pagination-pills">
                    <button 
                      v-for="(p, pIdx) in productsVisiblePages" 
                      :key="'prod-page-'+pIdx" 
                      class="page-num-pill" 
                      :class="{ active: productsPage === p, ellipsis: p === '…' }" 
                      :disabled="p === '…'"
                      @click="typeof p === 'number' && (productsPage = p)"
                    >
                      {{ p }}
                    </button>
                  </div>

                  <button 
                    class="pagination-btn next-btn" 
                    :disabled="productsPage >= productsTotalPages" 
                    @click="productsPage++" 
                    title="الصفحة التالية"
                  >
                    <span class="btn-text-desktop">التالي</span>
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
</template>
<script setup>
defineProps(['filteredProducts', 'categories', 'filters', 'formatArabicPlural', 'formatCurrency', 'getCategoryName', 'productsPagination', 'paginatedProducts']);
defineEmits(['open-product-modal', 'open-crop-modal', 'quick-toggle-product', 'toggle-product-pause', 'edit-product', 'delete-product', 'change-page']);
</script>