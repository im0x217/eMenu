<template>
<div v-else-if="activeTab === 'customers'" class="customers-tab-content">
            <div class="table-card glass-panel overflow-hidden">
              <div class="card-toolbar card-toolbar-split">
                <div class="card-toolbar-top">
                  <div class="toolbar-title-group">
                    <h3 class="toolbar-title">دليل وقائمة العملاء</h3>
                    <span class="toolbar-badge">{{ formatArabicPlural(filteredCustomers.length, 'customer') }}</span>
                  </div>
                  <div class="customer-toolbar-actions">
                    <button @click="printCustomerDebtReport" class="btn btn-outline btn-sm flex-center cust-debt-print-btn" title="طباعة كشف مديونيات وحسابات العملاء">
                      <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                      <span>كشف المديونيات</span>
                    </button>
                  </div>
                </div>
                <div class="card-toolbar-bottom customer-toolbar-filters">
                  <div class="search-input-wrapper flex-grow-1">
                    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" class="search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input 
                      v-model="customerFilters.search" 
                      type="text" 
                      name="search" 
                      autocomplete="off" 
                      placeholder="بحث باسم العميل أو رقم الهاتف…" 
                      class="form-control search-input" 
                      @keydown.enter="handleSearchEnter('customers', $event)"
                      @keydown.down="handleSearchArrowDown($event)"
                      @keydown.esc="customerFilters.search = ''; $event.target.blur();"
                    />
                  </div>

                  <!-- Custom Date Filter Component Group (Standardized with Order Management Design) -->
                  <div class="date-filter-group">
                    <!-- From Date Trigger -->
                    <div class="position-relative">
                      <button 
                        type="button" 
                        class="btn-datepicker-trigger" 
                        :class="{ active: custDateFromOpen || customerFilters.dateFrom }"
                        @click.stop="openCustDateFromPicker"
                        title="تاريخ البداية (من)"
                      >
                        <span>{{ customerFilters.dateFrom ? ('من: ' + formatArabicDate(customerFilters.dateFrom)) : 'من تاريخ' }}</span>
                        <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      </button>

                      <!-- From Date Popover -->
                      <div v-if="custDateFromOpen" class="datepicker-popover glass-panel animate-fade-in" @click.stop>
                        <div class="datepicker-header">
                          <button type="button" class="dp-nav-btn" @click="custFromPrevMonth" title="الشهر السابق" aria-label="الشهر السابق">
                            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                          </button>
                          <span class="dp-month-title">{{ custFromMonthYearLabel }}</span>
                          <button type="button" class="dp-nav-btn" @click="custFromNextMonth" title="الشهر التالي" aria-label="الشهر التالي">
                            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                          </button>
                        </div>

                        <div class="dp-weekdays">
                          <span>أح</span><span>إث</span><span>ثلا</span><span>أرب</span><span>خم</span><span>جم</span><span>سب</span>
                        </div>

                        <div class="dp-days-grid">
                          <button 
                            type="button"
                            v-for="(dayObj, idx) in custFromCalendarDays" 
                            :key="idx"
                            class="dp-day-cell"
                            :class="{ 
                              'other-month': !dayObj.inMonth,
                              'is-today': dayObj.isToday,
                              'is-selected': customerFilters.dateFrom === dayObj.dateStr
                            }"
                            @click="selectCustDateFrom(dayObj.dateStr)"
                          >
                            {{ dayObj.dayNum }}
                          </button>
                        </div>

                        <div class="datepicker-footer">
                          <button type="button" class="btn-dp-show-all" @click="selectCustDateFrom(getTodayStr())">تحديد تاريخ اليوم</button>
                        </div>
                      </div>
                    </div>

                    <!-- To Date Trigger -->
                    <div class="position-relative">
                      <button 
                        type="button" 
                        class="btn-datepicker-trigger" 
                        :class="{ active: custDateToOpen || customerFilters.dateTo }"
                        @click.stop="openCustDateToPicker"
                        title="تاريخ النهاية (إلى)"
                      >
                        <span>{{ customerFilters.dateTo ? ('إلى: ' + formatArabicDate(customerFilters.dateTo)) : 'إلى تاريخ' }}</span>
                        <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      </button>

                      <!-- To Date Popover -->
                      <div v-if="custDateToOpen" class="datepicker-popover glass-panel animate-fade-in" @click.stop>
                        <div class="datepicker-header">
                          <button type="button" class="dp-nav-btn" @click="custToPrevMonth" title="الشهر السابق" aria-label="الشهر السابق">
                            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                          </button>
                          <span class="dp-month-title">{{ custToMonthYearLabel }}</span>
                          <button type="button" class="dp-nav-btn" @click="custToNextMonth" title="الشهر التالي" aria-label="الشهر التالي">
                            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                          </button>
                        </div>

                        <div class="dp-weekdays">
                          <span>أح</span><span>إث</span><span>ثلا</span><span>أرب</span><span>خم</span><span>جم</span><span>سب</span>
                        </div>

                        <div class="dp-days-grid">
                          <button 
                            type="button"
                            v-for="(dayObj, idx) in custToCalendarDays" 
                            :key="idx"
                            class="dp-day-cell"
                            :class="{ 
                              'other-month': !dayObj.inMonth,
                              'is-today': dayObj.isToday,
                              'is-selected': customerFilters.dateTo === dayObj.dateStr
                            }"
                            @click="selectCustDateTo(dayObj.dateStr)"
                          >
                            {{ dayObj.dayNum }}
                          </button>
                        </div>

                        <div class="datepicker-footer">
                          <button type="button" class="btn-dp-show-all" @click="selectCustDateTo(getTodayStr())">تحديد تاريخ اليوم</button>
                        </div>
                      </div>
                    </div>

                    <!-- Today Shortcut Button (Order Management Style) -->
                    <button 
                      type="button" 
                      class="btn-today-shortcut" 
                      :class="{ active: isCustRangeToday }" 
                      @click="setCustRangeShortcut('today')"
                      title="عرض عملاء وطلبات اليوم"
                    >اليوم</button>

                    <!-- Last 7 Days Shortcut Button (Order Management Style) -->
                    <button 
                      type="button" 
                      class="btn-today-shortcut" 
                      :class="{ active: isCustRange7d }" 
                      @click="setCustRangeShortcut('7d')"
                      title="عرض عملاء وطلبات آخر 7 أيام"
                    >آخر 7 أيام</button>

                    <!-- This Month Shortcut Button (Order Management Style) -->
                    <button 
                      type="button" 
                      class="btn-today-shortcut" 
                      :class="{ active: isCustRangeMonth }" 
                      @click="setCustRangeShortcut('month')"
                      title="عرض عملاء وطلبات هذا الشهر"
                    >هذا الشهر</button>

                    <!-- Selected Date Range Display Badge -->
                    <div v-if="customerFilters.dateFrom || customerFilters.dateTo" class="selected-date-badge animate-fade-in">
                      <span class="date-text">{{ customerFilters.dateFrom && customerFilters.dateTo ? (formatArabicDate(customerFilters.dateFrom) + ' ← ' + formatArabicDate(customerFilters.dateTo)) : formatArabicDate(customerFilters.dateFrom || customerFilters.dateTo) }}</span>
                      <button type="button" class="btn-remove-date" @click="clearCustDateRange" title="إلغاء التصفية بالتاريخ">&times;</button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="table-container">
                <table class="admin-table desktop-customers-table">
                  <thead>
                    <tr>
                      <th>العميل</th>
                      <th>كلمة المرور</th>
                      <th>إجمالي الطلبات</th>
                      <th>إجمالي المشتريات</th>
                      <th>الرصيد المستحق</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    <!-- SKELETON ROWS (Customers Loading) -->
                    <template v-if="customersLoading">
                      <tr v-for="i in 6" :key="'cust-skel-' + i" class="skeleton-table-row-wrapper">
                        <td>
                          <div class="d-flex align-items-center gap-3">
                            <div class="skeleton-shimmer" style="width: 40px; height: 40px; border-radius: 50%;"></div>
                            <div class="d-flex flex-column gap-1">
                              <div class="skeleton-shimmer" style="width: 120px; height: 16px;"></div>
                              <div class="skeleton-shimmer" style="width: 90px; height: 12px;"></div>
                            </div>
                          </div>
                        </td>
                        <td><div class="skeleton-shimmer" style="width: 75px; height: 22px; border-radius: 12px;"></div></td>
                        <td><div class="skeleton-shimmer" style="width: 65px; height: 24px; border-radius: 20px;"></div></td>
                        <td><div class="skeleton-shimmer" style="width: 80px; height: 20px;"></div></td>
                        <td><div class="skeleton-shimmer" style="width: 85px; height: 20px;"></div></td>
                        <td><div class="skeleton-shimmer" style="width: 90px; height: 32px; border-radius: 8px;"></div></td>
                      </tr>
                    </template>

                    <tr v-else-if="filteredCustomers.length === 0">
                      <td colspan="6" class="text-center p-4">لا توجد سجلات عملاء متطابقة.</td>
                    </tr>
                    <tr v-else v-for="(cust, idx) in paginatedCustomers" :key="cust._id" :class="{ 'keyboard-selected-row': !isMobileScreen && selectedTableRowIndex === idx }">
                      <td>
                        <div class="customer-profile-cell" @click="openCustomerDetails(cust)" title="انقر لعرض الملف التعريفي الكامل">
                          <div class="customer-avatar-badge">{{ (cust.name || 'ع').charAt(0) }}</div>
                          <div class="customer-names-group">
                            <span class="customer-name-text">{{ cust.name }}</span>
                            <span class="customer-phone-subtext text-mono">{{ cust.phone }}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span v-if="cust.password" class="cust-password-pill" :title="'كلمة المرور: ' + cust.password" @click="openCustomerDetails(cust)">
                          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                          <span class="text-mono">{{ cust.password }}</span>
                        </span>
                        <span v-else class="cust-password-pill empty" @click="openCustomerEditModal(cust)" title="انقر لتعيين كلمة مرور">
                          <span>غير معينة</span>
                        </span>
                      </td>
                      <td>
                        <span class="orders-count-badge">{{ formatArabicPlural(cust.orderCount, 'order') }}</span>
                      </td>
                      <td class="text-bold text-primary text-mono">{{ formatCurrency(cust.totalSpent) }}</td>
                      <td>
                        <span class="customer-balance-cell" :style="{ color: (cust.outstandingBalance || 0) > 0 ? '#ef4444' : '#10b981' }">
                          {{ (cust.outstandingBalance || 0) > 0 ? formatCurrency(cust.outstandingBalance) : 'مُسدد بالكامل' }}
                        </span>
                      </td>
                      <td>
                        <div class="customer-table-actions">
                          <button 
                            type="button" 
                            @click="openPaymentModal(cust)" 
                            class="cust-btn btn-pay" 
                            title="تسجيل دفعة جديدة"
                          >
                            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                            <span>دفعة</span>
                          </button>
                          
                          <button 
                            type="button" 
                            @click="openCustomerDetails(cust)" 
                            class="cust-btn btn-details" 
                            title="عرض الملف التعريفي والخيارات"
                          >
                            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            <span>التفاصيل</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- Mobile Customers Cards Grid (Active on screens <= 768px) -->
                <div class="mobile-customers-cards-grid">
                  <div v-if="filteredCustomers.length === 0" class="mobile-empty-card glass-panel">
                    <span>لا توجد سجلات عملاء متطابقة.</span>
                  </div>
                  <div 
                    v-for="cust in paginatedCustomers" 
                    :key="'mob-cust-' + cust._id"
                    class="mobile-customer-card glass-panel"
                  >
                    <div class="mob-cust-card-header" @click="openCustomerDetails(cust)">
                      <div class="customer-avatar-badge">{{ (cust.name || 'ع').charAt(0) }}</div>
                      <div class="mob-cust-card-info">
                        <div class="d-flex align-items-center gap-2">
                          <span class="customer-name-text font-bold">{{ cust.name }}</span>
                          <span v-if="cust.password" class="cust-pass-dot-badge" :title="'كلمة السر: ' + cust.password">
                            <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                          </span>
                        </div>
                        <span class="customer-phone-subtext text-mono" dir="ltr">{{ cust.phone }}</span>
                      </div>
                      <span class="customer-balance-cell font-bold" :style="{ color: (cust.outstandingBalance || 0) > 0 ? '#ef4444' : '#10b981' }">
                        {{ (cust.outstandingBalance || 0) > 0 ? formatCurrency(cust.outstandingBalance) : 'مُسدد بالكامل' }}
                      </span>
                    </div>

                    <div class="mob-cust-stats-row">
                      <div class="mob-cust-stat">
                        <span class="stat-lbl">الطلبات:</span>
                        <span class="stat-val font-bold">{{ cust.orderCount || 0 }}</span>
                      </div>
                      <div class="mob-cust-stat">
                        <span class="stat-lbl">المشتريات:</span>
                        <span class="stat-val font-bold text-mono">{{ formatCurrency(cust.totalSpent || 0) }}</span>
                      </div>
                    </div>

                    <div class="mob-cust-card-actions">
                      <button 
                        type="button" 
                        @click="openPaymentModal(cust)" 
                        class="cust-btn btn-pay" 
                        title="تسجيل دفعة جديدة"
                      >
                        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                        <span>تسجيل دفعة</span>
                      </button>
                      
                      <button 
                        type="button" 
                        @click="openCustomerDetails(cust)" 
                        class="cust-btn btn-details" 
                        title="عرض الملف التعريفي والخيارات"
                      >
                        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <span>الملف والتفاصيل</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Customers Table Numbered Pagination Bar -->
              <div v-if="customersTotalPages > 1" class="admin-pagination-bar" :class="{ 'keyboard-selected-pagination': !isMobileScreen && paginationFocused }">
                <div class="pagination-info">
                  <span>عرض <strong>{{ (customersPage - 1) * customersPerPage + 1 }}</strong> - <strong>{{ Math.min(customersPage * customersPerPage, filteredCustomers.length) }}</strong> من أصل <strong>{{ filteredCustomers.length }}</strong> عميل</span>
                </div>

                <div class="pagination-controls-group">
                  <button 
                    class="pagination-btn prev-btn" 
                    :disabled="customersPage === 1" 
                    @click="customersPage--" 
                    title="الصفحة السابقة"
                  >
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    <span class="btn-text-desktop">السابق</span>
                  </button>

                  <div class="pagination-pills">
                    <button 
                      v-for="(p, pIdx) in customersVisiblePages" 
                      :key="'cust-page-'+pIdx" 
                      class="page-num-pill" 
                      :class="{ active: customersPage === p, ellipsis: p === '…' }" 
                      :disabled="p === '…'"
                      @click="typeof p === 'number' && (customersPage = p)"
                    >
                      {{ p }}
                    </button>
                  </div>

                  <button 
                    class="pagination-btn next-btn" 
                    :disabled="customersPage >= customersTotalPages" 
                    @click="customersPage++" 
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
defineProps(['filteredCustomers', 'customersFilter', 'formatArabicPlural', 'formatCurrency', 'formatArabicDate', 'customersPagination', 'paginatedCustomers']);
defineEmits(['print-customer-debt-report', 'view-customer-details', 'view-customer-history', 'open-payment-modal', 'change-page']);
</script>