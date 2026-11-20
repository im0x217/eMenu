<template>
<div class="production-tab-content">
  <!-- Navigation Sub-Tab Pills Switcher -->
  <div class="production-subnav-bar glass-panel mb-3">
    <div class="production-tabs-pills">
      <button 
        type="button"
        class="prod-tab-pill" 
        :class="{ active: subTab === 'chefs' }"
        @click="$emit('update:subTab', 'chefs')"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
        <span>دليل الشيفات والأصناف</span>
        <span class="pill-badge">{{ chefs.length }}</span>
      </button>

      <button 
        type="button"
        class="prod-tab-pill" 
        :class="{ active: subTab === 'report' }"
        @click="switchToReportTab"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
        <span>تقرير مبيعات وإنتاج الشيفات</span>
      </button>
    </div>
  </div>

  <!-- SUB-TAB 1: CHEFS MANAGEMENT (INSIDE UNIFIED CONTAINER CARD) -->
  <div v-if="subTab === 'chefs'" class="chefs-view-section animate-fade-in">
    <div class="table-card glass-panel overflow-hidden">
      <!-- Toolbar Header -->
      <div class="card-toolbar card-toolbar-unified justify-content-end">
        <button @click="$emit('open-add-chef')" class="btn btn-primary">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" class="me-1" style="display:inline-block; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>إضافة شيف جديد</span>
        </button>
      </div>

      <!-- Card Content Body -->
      <div class="p-4">
        <div v-if="chefs.length === 0" class="empty-chefs-placeholder text-center py-5">
          <div class="empty-icon-circle mx-auto mb-3">
            <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
          </div>
          <h4 class="text-bold mb-2">لا يوجد شيفات مسجلين حتى الآن</h4>
          <p class="text-muted mb-3" style="max-width: 420px; margin: 0 auto 16px auto;">أضف شيفات لتوزيع منتجات القائمة عليهم ومتابعة إنتاج ومبيعات كل شيف بدقة متناهية.</p>
          <button @click="$emit('open-add-chef')" class="btn btn-primary">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" class="me-1"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            إضافة الشيف الأول
          </button>
        </div>

        <!-- SKELETON CHEFS GRID -->
        <div v-if="chefsLoading" class="chefs-cards-grid">
          <div v-for="i in 3" :key="'chef-skel-' + i" class="chef-card glass-panel skeleton-card p-3">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div class="skeleton-shimmer" style="width: 48px; height: 48px; border-radius: 50%;"></div>
              <div class="d-flex flex-column gap-1 flex-grow-1">
                <div class="skeleton-shimmer" style="width: 110px; height: 18px;"></div>
                <div class="skeleton-shimmer" style="width: 80px; height: 14px;"></div>
              </div>
            </div>
            <div class="skeleton-shimmer mb-2" style="width: 40%; height: 14px;"></div>
            <div class="d-flex gap-1 mb-3 flex-wrap">
              <div class="skeleton-shimmer" style="width: 60px; height: 22px; border-radius: 12px;"></div>
              <div class="skeleton-shimmer" style="width: 75px; height: 22px; border-radius: 12px;"></div>
            </div>
            <div class="d-flex gap-2">
              <div class="skeleton-shimmer flex-grow-1" style="height: 32px; border-radius: 8px;"></div>
              <div class="skeleton-shimmer flex-grow-1" style="height: 32px; border-radius: 8px;"></div>
            </div>
          </div>
        </div>

        <!-- Chefs Grid -->
        <div v-else-if="chefs.length > 0" class="chefs-cards-grid">
          <div v-for="chef in chefs" :key="chef._id" class="chef-card glass-panel animate-scale-in">
            <div class="chef-card-header">
              <div class="chef-avatar">{{ (chef.name || 'ش').charAt(0) }}</div>
              <div class="chef-details">
                <h4 class="chef-name font-bold">{{ chef.name }}</h4>
                <div class="chef-phone-row" v-if="chef.phone">
                  <span class="chef-phone text-mono" dir="ltr">{{ formatLibyanPhone(chef.phone) }}</span>
                  <div class="chef-quick-actions">
                    <a :href="getLibyanWhatsAppUrl(chef.phone)" target="_blank" class="chef-icon-btn whatsapp" title="واتساب" aria-label="مراسلة الشيف عبر واتساب">
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    </a>
                    <a :href="'tel:' + chef.phone" class="chef-icon-btn call" title="اتصال" aria-label="الاتصال بالشيف">
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </a>
                  </div>
                </div>
              </div>
              <span class="chef-status-badge" :class="chef.active !== false ? 'active' : 'inactive'">
                {{ chef.active !== false ? 'نشط' : 'متوقف' }}
              </span>
            </div>

            <!-- Assigned Products Summary Box -->
            <div class="chef-assigned-products-box">
              <div class="assigned-box-header">
                <span class="assigned-title font-bold">الأصناف المسندة ({{ getChefAssignedProducts(chef._id).length }}):</span>
              </div>

              <div v-if="getChefAssignedProducts(chef._id).length > 0" class="assigned-chips-list">
                <span 
                  v-for="p in getChefAssignedProducts(chef._id)" 
                  :key="p._id" 
                  class="assigned-chip"
                >
                  {{ p.name }}
                </span>
              </div>
              <div v-else class="assigned-chips-empty">
                <span class="text-muted text-small">لم يتم تخصيص أي أصناف لهذا الشيف بعد.</span>
              </div>
            </div>

            <!-- Chef Card Actions -->
            <div class="chef-card-footer">
              <button 
                type="button" 
                @click="$emit('open-assign-products', chef)" 
                class="btn-chef-action btn-chef-assign"
                title="تخصيص وإضافة أصناف للشيف"
              >
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                <span>تخصيص الأصناف</span>
              </button>

              <button 
                type="button" 
                @click="$emit('open-edit-chef', chef)" 
                class="btn-chef-action btn-chef-edit"
                title="تعديل بيانات الشيف"
              >
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>تعديل</span>
              </button>

              <button 
                type="button" 
                @click="$emit('delete-chef', chef._id)" 
                class="btn-chef-action btn-chef-delete"
                title="حذف الشيف"
                aria-label="حذف الشيف"
              >
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                <span>حذف</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- SUB-TAB 2: PRODUCTION & SALES REPORT (STANDARDIZED DATE PICKER, MATCHED BUTTONS & SKELETON LOADER) -->
  <div v-else-if="subTab === 'report'" class="production-report-section animate-fade-in">
    <div class="table-card glass-panel" style="overflow: visible;">
      <!-- Toolbar Header with Title & Matched Action Buttons -->
      <div class="card-toolbar card-toolbar-split">
        <div class="card-toolbar-top justify-content-end">
          <!-- Matched Action Buttons -->
          <div class="report-header-actions-row">
            <button @click="$emit('print-report')" class="btn btn-outline btn-report-action" title="طباعة كشف الإنتاج الرسمي بصيغة A4">
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              <span>طباعة التقرير</span>
            </button>
            <button @click="$emit('load-report')" class="btn btn-primary btn-report-action" :disabled="isLoadingReport" title="تحديث بيانات التقرير">
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
              <span>تحديث البيانات</span>
            </button>
          </div>
        </div>

        <!-- Standardized Arabic Date Picker & Filter Controls Bar (Habit 6) -->
        <div class="card-toolbar-bottom report-filter-bar">
          <div class="report-standard-filters-row">
            <!-- Chef Selector Dropdown -->
            <div class="report-chef-select-box">
              <label for="prod-report-chef-select" class="filter-field-label">الشيف:</label>
              <select id="prod-report-chef-select" aria-label="تصفية التقرير حسب الشيف" :value="chefId" @change="onChefFilterChange($event.target.value)" class="form-control form-control-sm select-chef-control">
                <option value="">جميع الشيفات المسجلين</option>
                <option v-for="c in chefs" :key="c._id" :value="c._id">{{ c.name }}</option>
              </select>
            </div>

            <!-- Standard Date Filter Component Group -->
            <div class="date-filter-group">
              <!-- From Date Trigger -->
              <div class="position-relative">
                <button 
                  type="button" 
                  class="btn-datepicker-trigger" 
                  :class="{ active: dateFromOpen || dateFrom }"
                  @click.stop="openProdDateFromPicker"
                  title="تاريخ البداية (من)"
                >
                  <span class="dp-trigger-main">
                    <span class="dp-icon-wrap" aria-hidden="true">
                      <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </span>
                    <span class="dp-text-label">{{ dateFrom ? ('من: ' + formatArabicDate(dateFrom)) : 'من تاريخ' }}</span>
                  </span>
                  <svg class="dp-chevron-icon" aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>

                <!-- From Date Popover -->
                <Teleport to="body" :disabled="!isMobileScreen">
                  <div v-if="dateFromOpen" class="datepicker-modal-wrapper" :class="['shop-theme-' + activeShop, { 'is-mobile': isMobileScreen }]" @click="isMobileScreen ? $emit('update:dateFromOpen', false) : null">
                    <div class="datepicker-popover glass-panel animate-fade-in" @click.stop>
                      <div class="datepicker-header">
                        <button type="button" class="dp-nav-btn" @click="prodFromPrevMonth" title="الشهر السابق" aria-label="الشهر السابق">
                          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                        <span class="dp-month-title">{{ prodFromMonthYearLabel }}</span>
                        <button type="button" class="dp-nav-btn" @click="prodFromNextMonth" title="الشهر التالي" aria-label="الشهر التالي">
                          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                      </div>

                      <div class="dp-weekdays">
                        <span>أح</span><span>إث</span><span>ثلا</span><span>أرب</span><span>خم</span><span>جم</span><span>سب</span>
                      </div>

                      <div class="dp-days-grid">
                        <button 
                          type="button"
                          v-for="(dayObj, idx) in prodFromCalendarDays" 
                          :key="idx" 
                          class="dp-day-cell"
                          :class="{ 
                            'other-month': !dayObj.inMonth,
                            'is-today': dayObj.isToday,
                            'is-selected': dateFrom === dayObj.dateStr
                          }"
                          @click="selectProdDateFrom(dayObj.dateStr)"
                        >
                          {{ dayObj.dayNum }}
                        </button>
                      </div>

                      <div class="datepicker-footer">
                        <button type="button" class="btn-dp-show-all" @click="selectProdDateFrom(getTodayStr())">تحديد تاريخ اليوم</button>
                      </div>
                    </div>
                  </div>
                </Teleport>
              </div>

              <!-- To Date Trigger -->
              <div class="position-relative">
                <button 
                  type="button" 
                  class="btn-datepicker-trigger" 
                  :class="{ active: dateToOpen || dateTo }"
                  @click.stop="openProdDateToPicker"
                  title="تاريخ النهاية (إلى)"
                >
                  <span class="dp-trigger-main">
                    <span class="dp-icon-wrap" aria-hidden="true">
                      <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </span>
                    <span class="dp-text-label">{{ dateTo ? ('إلى: ' + formatArabicDate(dateTo)) : 'إلى تاريخ' }}</span>
                  </span>
                  <svg class="dp-chevron-icon" aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>

                <!-- To Date Popover -->
                <Teleport to="body" :disabled="!isMobileScreen">
                  <div v-if="dateToOpen" class="datepicker-modal-wrapper" :class="['shop-theme-' + activeShop, { 'is-mobile': isMobileScreen }]" @click="isMobileScreen ? $emit('update:dateToOpen', false) : null">
                    <div class="datepicker-popover glass-panel animate-fade-in" @click.stop>
                      <div class="datepicker-header">
                        <button type="button" class="dp-nav-btn" @click="prodToPrevMonth" title="الشهر السابق" aria-label="الشهر السابق">
                          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                        <span class="dp-month-title">{{ prodToMonthYearLabel }}</span>
                        <button type="button" class="dp-nav-btn" @click="prodToNextMonth" title="الشهر التالي" aria-label="الشهر التالي">
                          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                      </div>

                      <div class="dp-weekdays">
                        <span>أح</span><span>إث</span><span>ثلا</span><span>أرب</span><span>خم</span><span>جم</span><span>سب</span>
                      </div>

                      <div class="dp-days-grid">
                        <button 
                          type="button"
                          v-for="(dayObj, idx) in prodToCalendarDays" 
                          :key="idx" 
                          class="dp-day-cell"
                          :class="{ 
                            'other-month': !dayObj.inMonth,
                            'is-today': dayObj.isToday,
                            'is-selected': dateTo === dayObj.dateStr
                          }"
                          @click="selectProdDateTo(dayObj.dateStr)"
                        >
                          {{ dayObj.dayNum }}
                        </button>
                      </div>

                      <div class="datepicker-footer">
                        <button type="button" class="btn-dp-show-all" @click="selectProdDateTo(getTodayStr())">تحديد تاريخ اليوم</button>
                      </div>
                    </div>
                  </div>
                </Teleport>
              </div>

              <!-- Date Shortcuts -->
              <button 
                type="button" 
                class="btn-today-shortcut" 
                :class="{ active: isProdRangeToday }" 
                @click="onSetDateShortcut('today')"
                title="عرض مبيعات وإنتاج اليوم"
              >اليوم</button>

              <button 
                type="button" 
                class="btn-today-shortcut" 
                :class="{ active: isProdRange7d }" 
                @click="onSetDateShortcut('7d')"
                title="عرض آخر 7 أيام"
              >آخر 7 أيام</button>

              <button 
                type="button" 
                class="btn-today-shortcut" 
                :class="{ active: isProdRangeMonth }" 
                @click="onSetDateShortcut('month')"
                title="عرض هذا الشهر"
              >هذا الشهر</button>

              <!-- Selected Date Range Display Badge -->
              <div v-if="dateFrom || dateTo" class="selected-date-badge animate-fade-in">
                <span class="date-text">{{ dateFrom && dateTo ? (formatArabicDate(dateFrom) + ' ← ' + formatArabicDate(dateTo)) : formatArabicDate(dateFrom || dateTo) }}</span>
                <button type="button" class="btn-remove-date" @click="$emit('clear-date-range')" title="إلغاء التصفية بالتاريخ" aria-label="إلغاء التصفية بالتاريخ">&times;</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Report Content Body -->
      <div class="p-4">
        <!-- Shimmering Skeleton Loader State -->
        <div v-if="isLoadingReport" class="report-skeleton-container animate-fade-in">
          <!-- Skeleton KPI Cards -->
          <div class="report-kpi-cards-grid mb-4">
            <div v-for="i in 4" :key="'sk-kpi-' + i" class="report-kpi-box skeleton-box">
              <div class="skeleton-shimmer-circle"></div>
              <div class="kpi-box-content flex-grow-1">
                <div class="skeleton-shimmer-line sm mb-2" style="width: 55%;"></div>
                <div class="skeleton-shimmer-line lg" style="width: 40%;"></div>
              </div>
            </div>
          </div>

          <!-- Skeleton Breakdown Tables -->
          <div v-for="i in 2" :key="'sk-card-' + i" class="chef-breakdown-card skeleton-box mb-4">
            <div class="chef-breakdown-header">
              <div class="d-flex align-items-center gap-3">
                <div class="skeleton-shimmer-circle sm"></div>
                <div>
                  <div class="skeleton-shimmer-line md mb-2" style="width: 140px;"></div>
                  <div class="skeleton-shimmer-line sm" style="width: 90px;"></div>
                </div>
              </div>
              <div class="d-flex gap-2">
                <div class="skeleton-shimmer-pill" style="width: 70px;"></div>
                <div class="skeleton-shimmer-pill" style="width: 90px;"></div>
              </div>
            </div>
            <div class="p-3">
              <div class="skeleton-shimmer-line sm mb-3"></div>
              <div class="skeleton-shimmer-line sm mb-3"></div>
              <div class="skeleton-shimmer-line sm"></div>
            </div>
          </div>
        </div>

        <div v-else>
          <!-- Summary KPI Cards Grid (Organized & Spaced) -->
          <div class="report-kpi-cards-grid mb-4">
            <div class="report-kpi-box primary">
              <div class="kpi-box-icon">
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              </div>
              <div class="kpi-box-content">
                <span class="kpi-box-title">إجمالي القطع المباعة</span>
                <span class="kpi-box-number text-mono text-primary">{{ reportData.grandTotalQty || 0 }}</span>
              </div>
            </div>

            <div class="report-kpi-box success">
              <div class="kpi-box-icon">
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              </div>
              <div class="kpi-box-content">
                <span class="kpi-box-title">إجمالي الإيرادات</span>
                <span class="kpi-box-number text-mono text-success">{{ formatCurrency(reportData.grandTotalRevenue || 0) }}</span>
              </div>
            </div>

            <div class="report-kpi-box danger">
              <div class="kpi-box-icon">
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
              </div>
              <div class="kpi-box-content">
                <span class="kpi-box-title">إجمالي تكلفة الإنتاج</span>
                <span class="kpi-box-number text-mono text-danger">{{ formatCurrency(reportData.grandTotalCost || 0) }}</span>
              </div>
            </div>

            <div class="report-kpi-box info">
              <div class="kpi-box-icon">
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
              </div>
              <div class="kpi-box-content">
                <span class="kpi-box-title">صافي الأرباح التقديرية</span>
                <span class="kpi-box-number text-mono text-dark">{{ formatCurrency(Math.max(0, (reportData.grandTotalRevenue || 0) - (reportData.grandTotalCost || 0))) }}</span>
              </div>
            </div>
          </div>

          <!-- Per-Chef Breakdown Cards -->
          <div v-if="reportData.chefReport && reportData.chefReport.length > 0" class="chef-report-list">
            <div v-for="cReport in reportData.chefReport" :key="cReport.chefId" class="chef-breakdown-card mb-4">
              <div class="chef-breakdown-header">
                <div class="chef-header-profile">
                  <div class="chef-avatar sm">{{ (cReport.chefName || 'ش').charAt(0) }}</div>
                  <div>
                    <h4 class="font-bold mb-0 text-dark" style="font-size: 1.05rem;">الشيف: {{ cReport.chefName }}</h4>
                    <span class="text-small text-muted">{{ cReport.products.length }} صنف تم إنتاجه وبيعه</span>
                  </div>
                </div>

                <div class="chef-header-pills">
                  <div class="header-stat-tag">
                    <span class="lbl">القطع:</span>
                    <strong class="val text-mono">{{ cReport.totalQty }}</strong>
                  </div>
                  <div class="header-stat-tag">
                    <span class="lbl">المبيعات:</span>
                    <strong class="val text-mono text-success">{{ formatCurrency(cReport.totalRevenue) }}</strong>
                  </div>
                  <div class="header-stat-tag">
                    <span class="lbl">التكلفة:</span>
                    <strong class="val text-mono text-danger">{{ formatCurrency(cReport.totalCost) }}</strong>
                  </div>
                  <div class="header-stat-tag highlight">
                    <span class="lbl">الربح:</span>
                    <strong class="val text-mono text-primary">{{ formatCurrency(Math.max(0, cReport.totalRevenue - cReport.totalCost)) }}</strong>
                  </div>
                </div>
              </div>

              <!-- Products Table for this Chef -->
              <div class="table-container">
                <table class="admin-table desktop-production-table">
                  <thead>
                    <tr>
                      <th>اسم الصنف</th>
                      <th>التصنيف</th>
                      <th>الكمية المباعة</th>
                      <th>تكلفة الإنتاج</th>
                      <th>إجمالي المبيعات</th>
                      <th>هامش الربح</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="p in cReport.products" 
                      :key="p.name" 
                      class="clickable-product-row"
                      @click="$emit('open-product-customers', p, cReport)"
                      title="تفاصيل العملاء والطلبات لهذا الصنف"
                    >
                      <td class="font-bold product-cell-interactive">
                        <span class="product-name-text">{{ p.name }}</span>
                        <svg class="row-hover-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      </td>
                      <td><span class="category-pill">{{ p.category || '-' }}</span></td>
                      <td class="text-mono text-bold">{{ p.qty }}</td>
                      <td class="text-mono text-danger">{{ formatCurrency(p.cost) }}</td>
                      <td class="text-mono text-success text-bold">{{ formatCurrency(p.revenue) }}</td>
                      <td class="text-mono text-primary text-bold">{{ formatCurrency(Math.max(0, p.revenue - p.cost)) }}</td>
                    </tr>
                  </tbody>
                </table>

                <!-- Mobile Chef Products Cards Grid (Active on screens <= 768px) -->
                <div class="mobile-production-cards-grid">
                  <div 
                    v-for="p in cReport.products" 
                    :key="'mob-prod-rep-' + p.name"
                    class="mobile-production-card glass-panel"
                    @click="$emit('open-product-customers', p, cReport)"
                  >
                    <div class="mob-prod-rep-header">
                      <div class="mob-prod-rep-title">
                        <span class="font-bold">{{ p.name }}</span>
                        <span class="category-pill">{{ p.category || '-' }}</span>
                      </div>
                      <span class="mob-qty-badge text-mono">{{ p.qty }} مبيع</span>
                    </div>
                    <div class="mob-prod-rep-metrics">
                      <div class="mob-metric-item">
                        <span class="lbl">التكلفة:</span>
                        <span class="val text-mono text-danger">{{ formatCurrency(p.cost) }}</span>
                      </div>
                      <div class="mob-metric-item">
                        <span class="lbl">المبيعات:</span>
                        <span class="val text-mono text-success font-bold">{{ formatCurrency(p.revenue) }}</span>
                      </div>
                      <div class="mob-metric-item highlight">
                        <span class="lbl">الربح:</span>
                        <span class="val text-mono text-primary font-bold">{{ formatCurrency(Math.max(0, p.revenue - p.cost)) }}</span>
                      </div>
                    </div>
                    <div class="mob-prod-rep-hint">
                      <span>تفاصيل الطلبات والعملاء</span>
                      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Unassigned Products (if any) -->
          <div v-if="reportData.unassigned && reportData.unassigned.length > 0" class="unassigned-breakdown-card mb-4">
            <div class="unassigned-header-box">
              <div class="d-flex align-items-center gap-2">
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="text-warning"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                <div>
                  <h4 class="font-bold mb-0 text-dark">أصناف مباعة بدون شيف مخصص ({{ reportData.unassigned.length }})</h4>
                  <span class="text-small text-muted">يمكنك تخصيص هذه الأصناف لشيف من تبويب "دليل الشيفات والأصناف" لتندرج تحت تقريره</span>
                </div>
              </div>
            </div>

            <div class="table-container">
              <table class="admin-table desktop-production-table">
                <thead>
                  <tr>
                    <th>اسم الصنف</th>
                    <th>الكمية المباعة</th>
                    <th>إجمالي المبيعات</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="u in reportData.unassigned" 
                    :key="u.name" 
                    class="clickable-product-row"
                    @click="$emit('open-product-customers', u, null)"
                    title="تفاصيل العملاء والطلبات لهذا الصنف"
                  >
                    <td class="font-bold product-cell-interactive">
                      <span class="product-name-text">{{ u.name }}</span>
                      <svg class="row-hover-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    </td>
                    <td class="text-mono text-bold">{{ u.qty }}</td>
                    <td class="text-mono text-success text-bold">{{ formatCurrency(u.revenue) }}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Mobile Unassigned Cards Grid (Active on screens <= 768px) -->
              <div class="mobile-production-cards-grid">
                <div 
                  v-for="u in reportData.unassigned"
                  :key="'mob-unassigned-' + u.name"
                  class="mobile-production-card glass-panel"
                  @click="$emit('open-product-customers', u, null)"
                >
                  <div class="mob-prod-rep-header">
                    <div class="mob-prod-rep-title">
                      <span class="font-bold">{{ u.name }}</span>
                      <span class="badge badge-warning text-small">غير مخصص لشيف</span>
                    </div>
                    <span class="mob-qty-badge text-mono">{{ u.qty }} مبيع</span>
                  </div>
                  <div class="mob-prod-rep-metrics">
                    <div class="mob-metric-item highlight">
                      <span class="lbl">إجمالي المبيعات:</span>
                      <span class="val text-mono text-success font-bold">{{ formatCurrency(u.revenue) }}</span>
                    </div>
                  </div>
                  <div class="mob-prod-rep-hint">
                    <span>تفاصيل الطلبات والعملاء</span>
                    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="(!reportData.chefReport || reportData.chefReport.length === 0) && (!reportData.unassigned || reportData.unassigned.length === 0)" class="text-center py-5">
            <div class="empty-icon-circle mx-auto mb-3">
              <svg aria-hidden="true" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h4 class="text-bold mb-1">لا توجد مبيعات مسجلة في هذه الفترة</h4>
            <p class="text-muted mb-0">جرّب تغيير نطاق التاريخ أو تحديد شيف آخر لعرض البيانات.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script>
import { ref, computed } from 'vue';
import { formatLibyanPhone, getLibyanWhatsAppUrl } from '../utils/phone';

export default {
  name: 'AdminProductionTab',
  props: {
    subTab: { type: String, default: 'chefs' },
    chefs: { type: Array, default: () => [] },
    chefsLoading: { type: Boolean, default: false },
    products: { type: Array, default: () => [] },
    isMobileScreen: { type: Boolean, default: false },
    reportData: { type: Object, required: true },
    isLoadingReport: { type: Boolean, default: false },
    chefId: { type: String, default: '' },
    dateFrom: { type: String, default: '' },
    dateTo: { type: String, default: '' },
    dateFromOpen: { type: Boolean, default: false },
    dateToOpen: { type: Boolean, default: false },
    activeShop: { type: String, default: 'shop1' },
    formatCurrency: { type: Function, required: true },
    formatArabicDate: { type: Function, required: true },
    buildCalendarMatrix: { type: Function, required: true }
  },
  emits: [
    'update:subTab',
    'update:chefId',
    'update:dateFromOpen',
    'update:dateToOpen',
    'change-chef',
    'load-report',
    'print-report',
    'open-add-chef',
    'open-edit-chef',
    'delete-chef',
    'open-assign-products',
    'select-date-from',
    'select-date-to',
    'set-date-shortcut',
    'clear-date-range',
    'open-product-customers'
  ],
  setup(props, { emit }) {
    const getTodayStr = () => new Date().toLocaleDateString('en-CA');

    const prodFromYear = ref(new Date().getFullYear());
    const prodFromMonth = ref(new Date().getMonth());
    const prodToYear = ref(new Date().getFullYear());
    const prodToMonth = ref(new Date().getMonth());

    const switchToReportTab = () => {
      emit('update:subTab', 'report');
      emit('load-report');
    };

    const onChefFilterChange = (val) => {
      emit('update:chefId', val);
      emit('change-chef', val);
    };

    const getChefAssignedProducts = (chefIdVal) => {
      if (!chefIdVal) return [];
      const idStr = String(chefIdVal);
      return (props.products || []).filter(p => String(p.chefId) === idStr);
    };

    const openProdDateFromPicker = () => {
      emit('update:dateToOpen', false);
      const nextOpen = !props.dateFromOpen;
      if (nextOpen && props.dateFrom) {
        const parts = props.dateFrom.split('-').map(Number);
        if (parts[0] && parts[1]) {
          prodFromYear.value = parts[0];
          prodFromMonth.value = parts[1] - 1;
        }
      }
      emit('update:dateFromOpen', nextOpen);
    };

    const openProdDateToPicker = () => {
      emit('update:dateFromOpen', false);
      const nextOpen = !props.dateToOpen;
      if (nextOpen && props.dateTo) {
        const parts = props.dateTo.split('-').map(Number);
        if (parts[0] && parts[1]) {
          prodToYear.value = parts[0];
          prodToMonth.value = parts[1] - 1;
        }
      }
      emit('update:dateToOpen', nextOpen);
    };

    const prodFromPrevMonth = () => {
      if (prodFromMonth.value === 0) { prodFromMonth.value = 11; prodFromYear.value--; }
      else { prodFromMonth.value--; }
    };
    const prodFromNextMonth = () => {
      if (prodFromMonth.value === 11) { prodFromMonth.value = 0; prodFromYear.value++; }
      else { prodFromMonth.value++; }
    };
    const prodToPrevMonth = () => {
      if (prodToMonth.value === 0) { prodToMonth.value = 11; prodToYear.value--; }
      else { prodToMonth.value--; }
    };
    const prodToNextMonth = () => {
      if (prodToMonth.value === 11) { prodToMonth.value = 0; prodToYear.value++; }
      else { prodToMonth.value++; }
    };

    const prodFromMonthYearLabel = computed(() => {
      const d = new Date(prodFromYear.value, prodFromMonth.value, 1);
      return d.toLocaleDateString('ar-LY', { month: 'long', year: 'numeric' });
    });

    const prodToMonthYearLabel = computed(() => {
      const d = new Date(prodToYear.value, prodToMonth.value, 1);
      return d.toLocaleDateString('ar-LY', { month: 'long', year: 'numeric' });
    });

    const prodFromCalendarDays = computed(() => props.buildCalendarMatrix(prodFromYear.value, prodFromMonth.value));
    const prodToCalendarDays = computed(() => props.buildCalendarMatrix(prodToYear.value, prodToMonth.value));

    const selectProdDateFrom = (dateStr) => {
      emit('update:dateFromOpen', false);
      emit('select-date-from', dateStr);
    };

    const selectProdDateTo = (dateStr) => {
      emit('update:dateToOpen', false);
      emit('select-date-to', dateStr);
    };

    const onSetDateShortcut = (type) => {
      emit('update:dateFromOpen', false);
      emit('update:dateToOpen', false);
      emit('set-date-shortcut', type);
    };

    const isProdRangeToday = computed(() => {
      const today = getTodayStr();
      return props.dateFrom === today && props.dateTo === today;
    });

    const isProdRange7d = computed(() => {
      const today = getTodayStr();
      const d = new Date();
      d.setDate(d.getDate() - 6);
      const start7d = d.toLocaleDateString('en-CA');
      return props.dateFrom === start7d && props.dateTo === today;
    });

    const isProdRangeMonth = computed(() => {
      const today = getTodayStr();
      const d = new Date();
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      const startMonth = firstDay.toLocaleDateString('en-CA');
      return props.dateFrom === startMonth && props.dateTo === today;
    });

    return {
      formatLibyanPhone,
      getLibyanWhatsAppUrl,
      getTodayStr,
      switchToReportTab,
      onChefFilterChange,
      getChefAssignedProducts,
      openProdDateFromPicker,
      openProdDateToPicker,
      prodFromPrevMonth,
      prodFromNextMonth,
      prodToPrevMonth,
      prodToNextMonth,
      prodFromMonthYearLabel,
      prodToMonthYearLabel,
      prodFromCalendarDays,
      prodToCalendarDays,
      selectProdDateFrom,
      selectProdDateTo,
      onSetDateShortcut,
      isProdRangeToday,
      isProdRange7d,
      isProdRangeMonth
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

.badge {
  background: var(--primary-glow);
  color: var(--primary-color);
  font-size: 0.78rem;
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: 800;
  display: inline-block;
  margin-top: 2px;
}

.clickable-product-row:hover {
  background-color: rgba(0, 0, 0, 0.02);
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

.date-filter-group {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
  z-index: 120;
}

.btn-datepicker-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  direction: rtl;
  text-align: center;
  gap: 8px;
  padding: 6px 14px;
  height: 38px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  color: #475569;
  font-size: 0.88rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  flex-shrink: 0;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.08s ease, box-shadow 0.15s ease;
}

.dp-trigger-main {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
}

.dp-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: rgba(30, 58, 95, 0.06);
  color: var(--primary-color, #1e3a5f);
  flex-shrink: 0;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.dp-icon-wrap svg {
  stroke: currentColor;
}

.dp-text-label {
  text-align: center;
  direction: rtl;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 700;
}

.dp-chevron-icon {
  flex-shrink: 0;
  stroke: currentColor;
  opacity: 0.55;
  margin-inline-start: 2px;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s ease;
}

.btn-datepicker-trigger:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--primary-glow);
}

.btn-datepicker-trigger:hover .dp-icon-wrap {
  background: rgba(30, 58, 95, 0.12);
}

.btn-datepicker-trigger:hover .dp-chevron-icon {
  opacity: 0.9;
}

.btn-datepicker-trigger.active {
  border-color: var(--primary-color);
  background: var(--primary-glow);
  color: var(--primary-color);
  box-shadow: 0 2px 8px var(--primary-glow);
}

.btn-datepicker-trigger.active .dp-icon-wrap {
  background: var(--primary-color);
  color: #ffffff;
}

.btn-datepicker-trigger.active .dp-chevron-icon {
  transform: rotate(180deg);
  opacity: 1;
}

.btn-datepicker-trigger:active {
  transform: scale(0.97) !important;
  transition: transform 60ms ease-out !important;
}

.selected-date-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  height: 38px;
  flex-shrink: 0;
  white-space: nowrap;
  background: linear-gradient(135deg, rgba(253, 181, 24, 0.18) 0%, rgba(253, 181, 24, 0.08) 100%);
  border: 1px solid rgba(253, 181, 24, 0.35);
  border-radius: 10px;
  color: #0f172a;
  font-size: 0.86rem;
  font-weight: 800;
  font-family: inherit;
  box-shadow: 0 2px 8px rgba(253, 181, 24, 0.12);
}

.btn-remove-date {
  background: rgba(15, 23, 42, 0.1);
  color: #334155;
  border: none;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.08s ease, box-shadow 0.12s ease;
}

.btn-remove-date:hover {
  background: #ef4444;
  color: #ffffff;
}

.position-relative {
  position: relative !important;
}

.datepicker-modal-wrapper {
  display: contents;
}

.datepicker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  direction: rtl !important;
  width: 100% !important;
  margin-bottom: 10px;
}

.dp-month-title {
  font-weight: 850;
  font-size: 0.95rem;
  color: #0f172a;
  text-align: center !important;
  flex: 1 1 auto !important;
}

.dp-nav-btn {
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: #475569;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.08s ease, box-shadow 0.12s ease;
}

.dp-nav-btn:hover {
  background: var(--primary-glow);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.dp-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 0.72rem;
  font-weight: 800;
  color: #94a3b8;
  margin-bottom: 6px;
}

.dp-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
  margin-bottom: 12px;
}

.dp-day-cell {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  color: #334155;
  cursor: pointer;
  font-family: 'Cairo', sans-serif !important;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.08s ease, box-shadow 0.12s ease;
}

.dp-day-cell:hover {
  background: var(--primary-glow);
  color: var(--primary-color);
}

.dp-day-cell.other-month {
  color: #cbd5e1;
}

.dp-day-cell.is-today {
  border-color: var(--primary-color);
  color: var(--primary-color);
  font-weight: 850;
}

.dp-day-cell.is-selected {
  background: var(--primary-color) !important;
  color: #ffffff !important;
  font-weight: 850;
  box-shadow: 0 3px 8px var(--primary-glow);
}

.datepicker-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid #f1f5f9;
  padding-top: 10px;
}

.btn-dp-show-all {
  width: 100%;
  padding: 7px 12px;
  font-size: 0.82rem;
  font-weight: 700;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.08s ease, box-shadow 0.12s ease;
  font-family: inherit;
  touch-action: manipulation;
}

.btn-dp-show-all:hover {
  background: var(--primary-glow);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.btn-today-shortcut {
  padding: 7px 14px;
  font-size: 0.84rem;
  font-weight: 800;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #475569;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.08s ease, box-shadow 0.12s ease;
  height: 38px;
  touch-action: manipulation;
  font-family: inherit;
}

.btn-today-shortcut:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--primary-glow);
}

.btn-today-shortcut.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #ffffff;
  box-shadow: 0 3px 10px var(--primary-glow);
}

.btn-today-shortcut:active {
  transform: scale(0.96) !important;
  transition: transform 60ms ease-out !important;
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

.mb-2 {
  margin-bottom: 8px !important;
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

.datepicker-popover {
  position: absolute !important;
  top: calc(100% + 6px) !important;
  right: 0 !important;
  z-index: 3000 !important;
  width: 280px !important;
  padding: 14px !important;
  background: #ffffff !important;
  border: 1.5px solid #cbd5e1 !important;
  border-radius: 16px !important;
  box-shadow: 0 14px 35px rgba(15, 23, 42, 0.22) !important;
  display: block !important;
  animation: popoverMaterializeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both !important;
  will-change: transform, opacity;
  transform: translateZ(0);
}

.animate-fade-in {
  animation: fadeIn 0.3s ease;
}

:global(.tab-content-wrapper) .table-card {
  contain: content;
}

@media (max-width: 768px) {
  .table-container {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: auto !important;
    overscroll-behavior-x: contain !important;
    -webkit-overflow-scrolling: touch !important;
  }
}

@media print {
  .datepicker-modal-wrapper {
    display: none !important;
  }
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
  .card-toolbar,
.card-toolbar-split,
.card-toolbar-top,
.card-toolbar-bottom,
.card-toolbar-split .card-toolbar-bottom {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    width: 100% !important;
    max-width: 100% !important;
    gap: 8px !important;
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

  .btn-datepicker-trigger {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    height: 34px !important;
    font-size: 0.82rem !important;
    padding: 0 10px !important;
    box-sizing: border-box !important;
    justify-content: center !important;
    text-align: center !important;
    gap: 8px !important;
  }

  .dp-icon-wrap {
    width: 24px !important;
    height: 24px !important;
    border-radius: 6px !important;
  }

  .dp-icon-wrap svg {
    width: 13px !important;
    height: 13px !important;
  }

  .dp-text-label {
    font-size: 0.82rem !important;
  }

  .card-toolbar-top .btn-primary {
    width: 100% !important;
    height: 36px !important;
    font-size: 0.84rem !important;
    justify-content: center !important;
    box-sizing: border-box !important;
  }

  .date-filter-group {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    gap: 6px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }

  .date-filter-group > .position-relative {
    flex: 1 1 100% !important;
    width: 100% !important;
  }

  .btn-today-shortcut {
    flex: 1 1 auto !important;
    text-align: center !important;
    justify-content: center !important;
    height: 34px !important;
    font-size: 0.78rem !important;
    box-sizing: border-box !important;
  }

  .selected-date-badge {
    width: 100% !important;
    max-width: 100% !important;
    height: 34px !important;
    font-size: 0.78rem !important;
    justify-content: space-between !important;
    box-sizing: border-box !important;
    margin-top: 2px !important;
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

@media (max-width: 768px) {
  .datepicker-modal-wrapper.is-mobile {
    display: flex !important;
    position: fixed !important;
    inset: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;
    background: rgba(15, 23, 42, 0.55) !important;
    backdrop-filter: blur(5px) !important;
    -webkit-backdrop-filter: blur(5px) !important;
    z-index: 999999 !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 16px !important;
    box-sizing: border-box !important;
    animation: datePickerBackdropFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }

  .datepicker-modal-wrapper.is-mobile .datepicker-popover,
.datepicker-popover {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;
    transform: none !important;
    margin: auto !important;
    width: 100% !important;
    max-width: 320px !important;
    z-index: 999999 !important;
    box-shadow: 0 25px 60px rgba(15, 23, 42, 0.45) !important;
    border: 1px solid rgba(226, 232, 240, 0.9) !important;
    border-radius: 20px !important;
    box-sizing: border-box !important;
    animation: datePickerModalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }
}

.prod-tab-pill svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.prod-tab-pill.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.prod-tab-pill .pill-badge {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 10px;
}

.chef-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
}

.chef-avatar.sm {
  width: 38px;
  height: 38px;
  font-size: 1rem;
  border-radius: 10px;
}

.chef-icon-btn.whatsapp {
  background: rgba(37, 211, 102, 0.15);
  color: #25d366;
}

.chef-icon-btn.call {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.chef-status-badge.active {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.chef-status-badge.inactive {
  background: rgba(100, 116, 139, 0.12);
  color: #64748b;
}

.btn-chef-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 9px;
  border: 1.5px solid #cbd5e1;
  background: #ffffff;
  font-family: 'Cairo', sans-serif !important;
  font-size: 0.84rem;
  font-weight: 750;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.08s ease, box-shadow 0.12s ease;
  touch-action: manipulation;
}

.btn-chef-action:active {
  transform: scale(0.96);
  transition: transform 60ms ease-out;
}

.btn-chef-action.btn-chef-assign {
  flex: 1;
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.3);
  color: #d97706;
}

.btn-chef-action.btn-chef-assign:hover {
  background: #f59e0b;
  color: #ffffff;
  border-color: #f59e0b;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.25);
}

.btn-chef-action.btn-chef-edit {
  background: #f8fafc;
  color: #334155;
  border-color: #e2e8f0;
}

.btn-chef-action.btn-chef-edit:hover {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
}

.btn-chef-action.btn-chef-delete {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

.btn-chef-action.btn-chef-delete:hover {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #f87171;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.15);
}

@media print {
  :global(.admin-layout.is-printing-analytics) .table-container {
    overflow: visible !important;
    max-height: none !important;
    mask-image: none !important;
    -webkit-mask-image: none !important;
  }

  :global(.admin-layout.is-printing-analytics) .clickable-product-row {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
    animation: none !important;
  }
}

.production-tabs-pills {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  background: rgba(15, 23, 42, 0.05);
  padding: 4px;
  border-radius: 12px;
  width: 100%;
  box-sizing: border-box;
}

.prod-tab-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  min-height: 48px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: #64748b;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.15s ease;
  box-sizing: border-box;
  text-align: center;
}

.prod-tab-pill svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.prod-tab-pill.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.prod-tab-pill .pill-badge {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 10px;
}

.chef-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
  border-color: #cbd5e1;
}

.chef-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.chef-avatar {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 850;
  flex-shrink: 0;
}

.chef-avatar.sm {
  width: 40px;
  height: 40px;
  font-size: 1.05rem;
  border-radius: 10px;
}

.chef-details {
  flex: 1;
  min-width: 0;
}

.chef-name {
  font-size: 1.05rem;
  margin: 0 0 4px 0;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chef-phone {
  font-size: 0.82rem;
  color: #64748b;
}

.chef-icon-btn.whatsapp {
  background: rgba(37, 211, 102, 0.15);
  color: #25d366;
}

.chef-icon-btn.call {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.chef-status-badge {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 6px;
}

.chef-status-badge.active {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.chef-status-badge.inactive {
  background: rgba(100, 116, 139, 0.12);
  color: #64748b;
}

.chef-assigned-products-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 12px;
}

.assigned-box-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.assigned-title {
  font-size: 0.84rem;
  color: #334155;
}

.assigned-chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 100px;
  overflow-y: auto;
}

.assigned-chip {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #1e293b;
}

.chef-card-footer {
  display: flex;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
}

.report-filter-bar {
  padding: 12px 16px;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
}

.filter-field-label {
  font-size: 0.84rem;
  font-weight: 750;
  color: #475569;
  white-space: nowrap;
  margin: 0;
}

.report-kpi-box:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
}

.kpi-box-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.report-kpi-box.primary .kpi-box-icon {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.report-kpi-box.success .kpi-box-icon {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.report-kpi-box.danger .kpi-box-icon {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.report-kpi-box.info .kpi-box-icon {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.kpi-box-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.kpi-box-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #64748b;
}

.kpi-box-number {
  font-size: 1.25rem;
  font-weight: 900;
}

.chef-header-profile {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chef-header-pills {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.header-stat-tag {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-stat-tag.highlight {
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.3);
}

.header-stat-tag .lbl {
  color: #64748b;
  font-weight: 700;
}

.report-header-actions-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-report-action {
  height: 38px !important;
  padding: 0 16px !important;
  border-radius: 10px !important;
  font-size: 0.88rem !important;
  font-weight: 750 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  white-space: nowrap !important;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.08s ease, box-shadow 0.12s ease !important;
}

.report-standard-filters-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.report-chef-select-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.select-chef-control {
  min-width: 170px;
  height: 38px !important;
  border-radius: 10px !important;
  font-size: 0.85rem !important;
  font-weight: 700 !important;
  border: 1.5px solid #cbd5e1 !important;
  background: #ffffff !important;
}

.report-skeleton-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-box {
  position: relative;
  overflow: hidden;
  background: #f8fafc !important;
  border-color: #e2e8f0 !important;
}

.skeleton-shimmer-circle {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #e2e8f0;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.skeleton-shimmer-circle.sm {
  width: 38px;
  height: 38px;
  border-radius: 10px;
}

.skeleton-shimmer-line {
  background: #e2e8f0;
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}

.skeleton-shimmer-line.sm {
  height: 12px;
}

.skeleton-shimmer-line.md {
  height: 16px;
}

.skeleton-shimmer-line.lg {
  height: 22px;
}

.skeleton-shimmer-pill {
  height: 28px;
  background: #e2e8f0;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.skeleton-shimmer-circle::after,
.skeleton-shimmer-line::after,
.skeleton-shimmer-pill::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  transform: translateX(-100%);
  background-image: linear-gradient(
  90deg,
  rgba(255, 255, 255, 0) 0,
  rgba(255, 255, 255, 0.55) 20%,
  rgba(255, 255, 255, 0.7) 60%,
  rgba(255, 255, 255, 0)
  );
  animation: skeletonShimmer 1.5s infinite;
}

.production-tab-content {
  margin-bottom: 36px;
}

.production-subnav-bar {
  padding: 10px 14px;
  border-radius: 14px;
  margin-bottom: 24px !important;
}

.production-tab-content .table-card {
  margin-bottom: 32px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.production-tab-content .card-toolbar {
  padding: 18px 24px;
  margin-bottom: 0;
  border-bottom: 1px solid #e2e8f0;
}

.production-tab-content .card-toolbar-bottom.report-filter-bar {
  padding: 16px 24px;
  margin-top: 0;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
}

.production-tab-content .p-4 {
  padding: 28px !important;
}

.chefs-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px !important;
}

.chef-card {
  border-radius: 18px !important;
  padding: 22px !important;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.08s ease, box-shadow 0.12s ease;
  border: 1.5px solid #e2e8f0 !important;
  background: #ffffff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
}

.chef-card:hover {
  transform: translateY(-2px);
  border-color: #cbd5e1 !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
}

.report-kpi-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px !important;
  margin-bottom: 32px !important;
}

.report-kpi-box {
  background: #ffffff;
  border: 1.5px solid #e2e8f0 !important;
  border-radius: 16px !important;
  padding: 20px 22px !important;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.08s ease, box-shadow 0.12s ease;
}

.chef-breakdown-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0 !important;
  border-radius: 18px !important;
  overflow: hidden;
  margin-bottom: 32px !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
}

.chef-breakdown-header {
  padding: 18px 24px !important;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.unassigned-breakdown-card {
  background: #ffffff;
  border: 1.5px solid #fed7aa !important;
  border-radius: 18px !important;
  overflow: hidden;
  margin-top: 36px !important;
  margin-bottom: 32px !important;
}

.unassigned-header-box {
  padding: 18px 24px !important;
  background: #fffaf5;
  border-bottom: 1px solid #fed7aa;
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

:global(.shop-theme-shop2) .dp-day-cell.is-selected {
  background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3) !important;
}

:global(.shop-theme-shop2) .dp-day-cell.is-today {
  border-color: #3b82f6 !important;
  color: #1d4ed8 !important;
}

:global(.shop-theme-shop2) .dp-nav-btn:hover {
  background: rgba(37, 99, 235, 0.12) !important;
  border-color: #3b82f6 !important;
  color: #1d4ed8 !important;
}

:global(.shop-theme-shop2) .btn-datepicker-trigger.active {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16) !important;
}

:global(.shop-theme-shop2) .btn-dp-show-all {
  color: #2563eb !important;
  border-color: rgba(37, 99, 235, 0.25) !important;
}

:global(.shop-theme-shop2) .btn-dp-show-all:hover {
  background: rgba(37, 99, 235, 0.08) !important;
  border-color: #2563eb !important;
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

.skeleton-card {
  pointer-events: none;
  user-select: none;
}

.clickable-product-row {
  cursor: pointer !important;
  transition: background-color 0.18s ease;
}

.clickable-product-row:hover {
  background: rgba(253, 181, 24, 0.08) !important;
}

:global(.shop-theme-shop2) .clickable-product-row:hover {
  background: rgba(30, 58, 95, 0.08) !important;
}

.product-cell-interactive {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.row-hover-icon {
  opacity: 0;
  color: #f59e0b;
  transform: translateX(4px);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

:global(.shop-theme-shop2) .row-hover-icon {
  color: #1e3a5f;
}

.clickable-product-row:hover .row-hover-icon {
  opacity: 1;
  transform: translateX(0);
}

.desktop-production-table {
  display: table;
  width: 100%;
}

.mobile-production-cards-grid {
  display: none;
}

.card-toolbar-split {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
  background: rgba(255, 255, 255, 0.6);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  position: relative;
  z-index: 100;
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

@media (max-width: 768px) {
  .card-toolbar-unified {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 10px !important;
    padding: 12px 14px !important;
  }
}

.card-toolbar-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.card-toolbar-bottom {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  width: 100%;
}

@media (max-width: 768px) {
  .card-toolbar-split {
    padding: 14px !important;
    gap: 12px !important;
  }

  .card-toolbar-top {
    flex-direction: column !important;
    justify-content: space-between !important;
    align-items: stretch !important;
    flex-wrap: wrap !important;
    gap: 10px !important;
  }

  .desktop-production-table {
    display: none !important;
  }

  .mobile-production-cards-grid {
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }

  .mobile-production-card {
    background: #ffffff !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 14px !important;
    padding: 14px 16px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 10px !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
    cursor: pointer !important;
    touch-action: manipulation !important;
    transition: transform 0.12s ease, box-shadow 0.12s ease !important;
    box-sizing: border-box !important;
  }

  .mobile-production-card:active {
    transform: scale(0.99) !important;
    background: #f8fafc !important;
  }

  .mob-prod-rep-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
  }

  .mob-prod-rep-title {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    min-width: 0 !important;
    flex: 1 !important;
    flex-wrap: wrap !important;
  }

  .mob-qty-badge {
    background: #f1f5f9 !important;
    color: #1e293b !important;
    font-size: 0.82rem !important;
    font-weight: 800 !important;
    padding: 3px 10px !important;
    border-radius: 20px !important;
    flex-shrink: 0 !important;
  }

  .mob-prod-rep-metrics {
    display: grid !important;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)) !important;
    gap: 8px !important;
    background: #f8fafc !important;
    padding: 10px 12px !important;
    border-radius: 10px !important;
    border: 1px solid #edf2f7 !important;
  }

  .mob-metric-item {
    display: flex !important;
    flex-direction: column !important;
    gap: 2px !important;
  }

  .mob-metric-item .lbl {
    font-size: 0.72rem !important;
    color: #64748b !important;
    font-weight: 700 !important;
  }

  .mob-metric-item .val {
    font-size: 0.88rem !important;
    font-weight: 800 !important;
  }

  .mob-metric-item.highlight .val {
    font-size: 0.95rem !important;
  }

  .mob-prod-rep-hint {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    font-size: 0.76rem !important;
    color: #64748b !important;
    padding-top: 6px !important;
    border-top: 1px dashed #f1f5f9 !important;
  }
}

.chef-status-badge.inactive,
.chef-phone {
  color: #475569;
}

.chef-status-badge.active {
  color: #047857 !important;
}

:global(.shop-theme-shop2) .prod-tab-pill .pill-badge,
:global(.shop-theme-shop2) .btn-chef-action.btn-chef-assign {
  color: #1d4ed8 !important;
}

:global(.shop-theme-shop2) .chef-avatar {
  background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
  color: #ffffff !important;
  border-color: #1d4ed8 !important;
}

.chef-icon-btn.whatsapp {
  color: #15803d !important;
}

.chef-icon-btn.call {
  color: #1d4ed8 !important;
}

.btn-chef-action.btn-chef-delete {
  color: #b91c1c !important;
}

.chef-phone-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.chef-quick-actions {
  display: flex;
  gap: 8px !important;
}

.chef-icon-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.08s ease, box-shadow 0.12s ease;
  min-width: 44px !important;
  min-height: 44px !important;
}

@media (max-width: 768px) {
  .btn-datepicker-trigger,
.btn-today-shortcut,
.selected-date-badge,
.btn-chef-action {
    min-height: 44px !important;
    height: auto !important;
  }

  .card-toolbar-top .btn-primary {
    min-height: 48px !important;
    height: auto !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer,
.datepicker-popover {
    animation: none !important;
    transition: none !important;
  }
}

@keyframes popoverMaterializeIn {
  0% {
    opacity: 0;
    transform: translateY(-8px) scale(0.97);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
@keyframes datePickerModalPop {
    0% { transform: scale(0.92); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

@keyframes datePickerBackdropFade {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
}

@keyframes skeletonShimmer {
  100% {
    transform: translateX(100%);
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

.dp-nav-btn {
  position: relative;
}

.dp-nav-btn::after {
  content: '';
  position: absolute;
  inset: -8px;
}

.btn-remove-date {
  position: relative;
}

.btn-remove-date::after {
  content: '';
  position: absolute;
  inset: -13px;
}

@media (max-width: 768px) {
  .btn-datepicker-trigger {
    min-height: 44px !important;
    height: auto !important;
  }

  .btn-today-shortcut {
    min-height: 44px !important;
    height: auto !important;
  }

  .btn-report-action {
    min-height: 44px !important;
    height: auto !important;
  }

  .dp-day-cell {
    min-height: 44px;
  }
}
</style>
