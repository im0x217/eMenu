<template>
  <div class="analytics-tab-content">
  <div class="analytics-header-actions no-print">
    <!-- Period Selector -->
    <div class="segmented-control">
      <button v-for="p in periods" :key="p.val" class="control-pill" :class="{ active: analyticsPeriod === p.val }" @click="$emit('change-period', p.val)">
        {{ p.label }}
      </button>
    </div>
  </div>

  <div v-if="analyticsPeriod === 'custom'" class="date-range-bar no-print animate-fade-in">
    <div class="date-filter-group">
      <!-- From Date Trigger -->
      <div class="position-relative">
        <button 
          type="button" 
          class="btn-datepicker-trigger" 
          :class="{ active: fromOpen || analyticsStartDate }"
          @click.stop="openAnalyticsFromPicker"
          title="تاريخ البداية (من)"
        >
          <span class="dp-trigger-main">
            <span class="dp-icon-wrap" aria-hidden="true">
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </span>
            <span class="dp-text-label">{{ analyticsStartDate ? ('من: ' + formatArabicDate(analyticsStartDate)) : 'من تاريخ' }}</span>
          </span>
          <svg class="dp-chevron-icon" aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>

        <!-- From Date Popover -->
        <Teleport to="body" :disabled="!isMobileScreen">
          <div v-if="fromOpen" class="datepicker-modal-wrapper" :class="['shop-theme-' + activeShop, { 'is-mobile': isMobileScreen }]" @click="isMobileScreen ? $emit('update:fromOpen', false) : null">
            <div class="datepicker-popover glass-panel animate-fade-in" @click.stop>
              <div class="datepicker-header">
                <button type="button" class="dp-nav-btn" @click="analyticsFromPrevMonth" title="الشهر السابق" aria-label="الشهر السابق">
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
                <span class="dp-month-title">{{ analyticsFromMonthYearLabel }}</span>
                <button type="button" class="dp-nav-btn" @click="analyticsFromNextMonth" title="الشهر التالي" aria-label="الشهر التالي">
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
              </div>

              <div class="dp-weekdays">
                <span>أح</span><span>إث</span><span>ثلا</span><span>أرب</span><span>خم</span><span>جم</span><span>سب</span>
              </div>

              <div class="dp-days-grid">
                <button 
                  type="button"
                  v-for="(dayObj, idx) in analyticsFromCalendarDays" 
                  :key="idx" 
                  class="dp-day-cell"
                  :class="{ 
                    'other-month': !dayObj.inMonth,
                    'is-today': dayObj.isToday,
                    'is-selected': analyticsStartDate === dayObj.dateStr
                  }"
                  @click="selectAnalyticsFrom(dayObj.dateStr)"
                >
                  {{ dayObj.dayNum }}
                </button>
              </div>

              <div class="datepicker-footer">
                <button type="button" class="btn-dp-show-all" @click="selectAnalyticsFrom(getTodayStr())">تحديد تاريخ اليوم</button>
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
          :class="{ active: toOpen || analyticsEndDate }"
          @click.stop="openAnalyticsToPicker"
          title="تاريخ النهاية (إلى)"
        >
          <span class="dp-trigger-main">
            <span class="dp-icon-wrap" aria-hidden="true">
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </span>
            <span class="dp-text-label">{{ analyticsEndDate ? ('إلى: ' + formatArabicDate(analyticsEndDate)) : 'إلى تاريخ' }}</span>
          </span>
          <svg class="dp-chevron-icon" aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>

        <!-- To Date Popover -->
        <Teleport to="body" :disabled="!isMobileScreen">
          <div v-if="toOpen" class="datepicker-modal-wrapper" :class="['shop-theme-' + activeShop, { 'is-mobile': isMobileScreen }]" @click="isMobileScreen ? $emit('update:toOpen', false) : null">
            <div class="datepicker-popover glass-panel animate-fade-in" @click.stop>
              <div class="datepicker-header">
                <button type="button" class="dp-nav-btn" @click="analyticsToPrevMonth" title="الشهر السابق" aria-label="الشهر السابق">
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
                <span class="dp-month-title">{{ analyticsToMonthYearLabel }}</span>
                <button type="button" class="dp-nav-btn" @click="analyticsToNextMonth" title="الشهر التالي" aria-label="الشهر التالي">
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
              </div>

              <div class="dp-weekdays">
                <span>أح</span><span>إث</span><span>ثلا</span><span>أرب</span><span>خم</span><span>جم</span><span>سب</span>
              </div>

              <div class="dp-days-grid">
                <button 
                  type="button"
                  v-for="(dayObj, idx) in analyticsToCalendarDays" 
                  :key="idx" 
                  class="dp-day-cell"
                  :class="{ 
                    'other-month': !dayObj.inMonth,
                    'is-today': dayObj.isToday,
                    'is-selected': analyticsEndDate === dayObj.dateStr
                  }"
                  @click="selectAnalyticsTo(dayObj.dateStr)"
                >
                  {{ dayObj.dayNum }}
                </button>
              </div>

              <div class="datepicker-footer">
                <button type="button" class="btn-dp-show-all" @click="selectAnalyticsTo(getTodayStr())">تحديد تاريخ اليوم</button>
              </div>
            </div>
          </div>
        </Teleport>
      </div>

      <!-- Quick Preset Shortcuts -->
      <button 
        type="button" 
        class="btn-today-shortcut" 
        :class="{ active: isAnalyticsToday }" 
        @click="setAnalyticsShortcut('today')"
        title="تحليلات اليوم فقط"
      >اليوم</button>

      <button 
        type="button" 
        class="btn-today-shortcut" 
        :class="{ active: isAnalytics7d }" 
        @click="setAnalyticsShortcut('7d')"
        title="تحليلات آخر 7 أيام"
      >آخر 7 أيام</button>

      <button 
        type="button" 
        class="btn-today-shortcut" 
        :class="{ active: isAnalyticsMonth }" 
        @click="setAnalyticsShortcut('month')"
        title="تحليلات هذا الشهر"
      >هذا الشهر</button>

      <!-- Selected Date Range Display Badge -->
      <div v-if="analyticsStartDate && analyticsEndDate" class="selected-date-badge animate-fade-in">
        <span class="date-text">{{ formatArabicDate(analyticsStartDate) + ' ← ' + formatArabicDate(analyticsEndDate) }}</span>
      </div>
    </div>
  </div>

  <!-- SKELETON LOADER (Displayed during date filter, period loading, and initial fetch) -->
  <div v-if="analyticsLoading" class="analytics-skeleton-view animate-fade-in">
    <!-- KPI Cards Skeleton (Single row on desktop, 2-col on mobile) -->
    <div class="kpi-grid">
      <div v-for="i in 6" :key="'kpi-skel-' + i" class="kpi-card skeleton-card">
        <div class="kpi-info" style="flex: 1 1 auto; min-width: 0;">
          <div class="skeleton-shimmer skeleton-title-line"></div>
          <div class="skeleton-shimmer skeleton-val-line"></div>
        </div>
        <div class="skeleton-shimmer skeleton-icon-wrap"></div>
      </div>
    </div>

    <!-- Charts & Metrics Grid Skeleton -->
    <div class="charts-grid">
      <!-- 1. Daily Revenue Line Chart Skeleton (Hero Span-3) -->
      <div class="chart-card span-3 skeleton-card">
        <div class="skeleton-shimmer skeleton-line" style="width: 140px; height: 18px; margin-bottom: 20px;"></div>
        <div class="skeleton-shimmer skeleton-chart-box"></div>
      </div>

      <!-- 2. Sales Split Skeleton (Dual-Segment Bar) -->
      <div class="chart-card skeleton-card">
        <div class="skeleton-shimmer skeleton-line" style="width: 120px; height: 18px; margin-bottom: 20px;"></div>
        <div class="split-display-clean">
          <div class="skeleton-shimmer skeleton-line" style="width: 100%; height: 8px; border-radius: 999px; margin-bottom: 16px;"></div>
          <div class="d-flex flex-column gap-3">
            <div class="d-flex justify-content-between align-items-center">
              <div class="skeleton-shimmer skeleton-line" style="width: 90px; height: 14px;"></div>
              <div class="skeleton-shimmer skeleton-line" style="width: 80px; height: 14px;"></div>
            </div>
            <div class="d-flex justify-content-between align-items-center">
              <div class="skeleton-shimmer skeleton-line" style="width: 85px; height: 14px;"></div>
              <div class="skeleton-shimmer skeleton-line" style="width: 75px; height: 14px;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Payment Methods Skeleton -->
      <div class="chart-card skeleton-card">
        <div class="skeleton-shimmer skeleton-line" style="width: 100px; height: 18px; margin-bottom: 20px;"></div>
        <div class="pm-clean-list">
          <div v-for="i in 3" :key="'pm-skel-' + i" class="pm-clean-item">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <div class="skeleton-shimmer skeleton-line" style="width: 60px; height: 14px;"></div>
              <div class="skeleton-shimmer skeleton-line" style="width: 90px; height: 14px;"></div>
            </div>
            <div class="skeleton-shimmer skeleton-line" style="width: 100%; height: 4px; border-radius: 999px;"></div>
          </div>
        </div>
      </div>

      <!-- 4. Top Favorites Skeleton -->
      <div class="chart-card skeleton-card">
        <div class="skeleton-shimmer skeleton-line" style="width: 120px; height: 18px; margin-bottom: 20px;"></div>
        <div class="list-cards">
          <div v-for="i in 5" :key="'fav-skel-' + i" class="d-flex justify-content-between align-items-center py-2 border-bottom">
            <div class="skeleton-shimmer skeleton-line" style="width: 120px; height: 14px;"></div>
            <div class="skeleton-shimmer skeleton-line" style="width: 45px; height: 14px;"></div>
          </div>
        </div>
      </div>

      <!-- 5. Category Sales Skeleton -->
      <div class="chart-card span-2 skeleton-card">
        <div class="skeleton-shimmer skeleton-line" style="width: 130px; height: 18px; margin-bottom: 20px;"></div>
        <div class="bar-chart-list">
          <div v-for="i in 5" :key="'cat-skel-' + i" class="category-bar-row">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <div class="skeleton-shimmer skeleton-line" style="width: 100px; height: 14px;"></div>
              <div class="skeleton-shimmer skeleton-line" style="width: 70px; height: 14px;"></div>
            </div>
            <div class="skeleton-shimmer skeleton-line" style="width: 100%; height: 4px; border-radius: 999px;"></div>
          </div>
        </div>
      </div>

      <!-- 6. Top Customers Skeleton -->
      <div class="chart-card skeleton-card">
        <div class="skeleton-shimmer skeleton-line" style="width: 130px; height: 18px; margin-bottom: 16px;"></div>
        <div class="desktop-analytics-table">
          <div class="skeleton-shimmer skeleton-table-row" v-for="i in 5" :key="'cust-skel-' + i"></div>
        </div>
        <div class="mobile-analytics-cards-grid">
          <div class="skeleton-shimmer skeleton-table-row" style="height: 52px;" v-for="i in 4" :key="'mob-cust-skel-' + i"></div>
        </div>
      </div>

      <!-- 7. Top Products Skeleton -->
      <div class="chart-card span-2 skeleton-card">
        <div class="skeleton-shimmer skeleton-line" style="width: 160px; height: 18px; margin-bottom: 16px;"></div>
        <div class="desktop-analytics-table">
          <div class="skeleton-shimmer skeleton-table-row" v-for="i in 5" :key="'prod-skel-' + i"></div>
        </div>
        <div class="mobile-analytics-cards-grid">
          <div class="skeleton-shimmer skeleton-table-row" style="height: 52px;" v-for="i in 4" :key="'mob-prod-skel-' + i"></div>
        </div>
      </div>

      <!-- 8. Inactive Customers Skeleton -->
      <div class="chart-card skeleton-card">
        <div class="skeleton-shimmer skeleton-line" style="width: 140px; height: 18px; margin-bottom: 16px;"></div>
        <div class="desktop-analytics-table">
          <div class="skeleton-shimmer skeleton-table-row" v-for="i in 4" :key="'inact-skel-' + i"></div>
        </div>
        <div class="mobile-analytics-cards-grid">
          <div class="skeleton-shimmer skeleton-table-row" style="height: 52px;" v-for="i in 3" :key="'mob-inact-skel-' + i"></div>
        </div>
      </div>

      <!-- 9. Stagnant Products Skeleton -->
      <div class="chart-card skeleton-card">
        <div class="skeleton-shimmer skeleton-line" style="width: 150px; height: 18px; margin-bottom: 16px;"></div>
        <div class="desktop-analytics-table">
          <div class="skeleton-shimmer skeleton-table-row" v-for="i in 4" :key="'stag-skel-' + i"></div>
        </div>
        <div class="mobile-analytics-cards-grid">
          <div class="skeleton-shimmer skeleton-table-row" style="height: 52px;" v-for="i in 3" :key="'mob-stag-skel-' + i"></div>
        </div>
      </div>

      <!-- 10. UX Funnel & Telemetry Skeleton -->
      <div class="chart-card span-2 skeleton-card">
        <div class="skeleton-shimmer skeleton-line" style="width: 160px; height: 18px; margin-bottom: 16px;"></div>
        <div class="ux-clean-wrapper">
          <div class="skeleton-shimmer" style="height: 70px; border-radius: 12px; margin-bottom: 8px;"></div>
          <div class="d-flex gap-4 pb-2 border-bottom">
            <div class="skeleton-shimmer skeleton-line" style="width: 120px; height: 16px;"></div>
            <div class="skeleton-shimmer skeleton-line" style="width: 120px; height: 16px;"></div>
            <div class="skeleton-shimmer skeleton-line" style="width: 140px; height: 16px;"></div>
          </div>
          <div class="d-flex gap-4">
            <div class="skeleton-shimmer skeleton-line" style="width: 80px; height: 14px;"></div>
            <div class="skeleton-shimmer skeleton-line" style="width: 80px; height: 14px;"></div>
            <div class="skeleton-shimmer skeleton-line" style="width: 80px; height: 14px;"></div>
          </div>
          <!-- Top Engaged Categories Shimmer -->
          <div class="mt-4 pt-3 border-top">
            <div class="d-flex justify-content-between mb-3">
              <div class="skeleton-shimmer skeleton-line" style="width: 140px; height: 16px;"></div>
              <div class="skeleton-shimmer skeleton-line" style="width: 65px; height: 14px;"></div>
            </div>
            <div class="d-flex flex-column gap-3">
              <div v-for="i in 5" :key="'ux-cat-skel-' + i">
                <div class="d-flex justify-content-between mb-1">
                  <div class="skeleton-shimmer skeleton-line" :style="{ width: (80 + (i * 10)) + 'px', height: '14px' }"></div>
                  <div class="skeleton-shimmer skeleton-line" style="width: 28px; height: 14px;"></div>
                </div>
                <div class="skeleton-shimmer" :style="{ width: (100 - (i * 12)) + '%', height: '6px', borderRadius: '999px' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- REAL ANALYTICS DATA CONTENT -->
  <div v-else class="analytics-real-content animate-fade-in">
  <!-- KPI Cards Grid -->
  <div class="kpi-grid" ref="kpiGridRef" :class="{ 'in-view': isKpiInView }">
    <!-- KPI 1: Revenue -->
    <div class="kpi-card" style="--kpi-delay: 0ms;">
      <div class="kpi-info">
        <span class="kpi-title">المبيعات</span>
        <span class="kpi-value text-mono">{{ formatCurrency(animatedKpi.totalRevenue) }}</span>
      </div>
      <div class="kpi-icon-wrap">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
      </div>
    </div>

    <!-- KPI 2: Paid -->
    <div class="kpi-card" style="--kpi-delay: 40ms;">
      <div class="kpi-info">
        <span class="kpi-title">المدفوع</span>
        <span class="kpi-value text-mono">{{ formatCurrency(animatedKpi.totalPaid) }}</span>
      </div>
      <div class="kpi-icon-wrap">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      </div>
    </div>

    <!-- KPI 3: Remaining (Debt) -->
    <div class="kpi-card" style="--kpi-delay: 80ms;">
      <div class="kpi-info">
        <span class="kpi-title">المتبقي</span>
        <span class="kpi-value text-mono">{{ formatCurrency(animatedKpi.totalRemaining) }}</span>
      </div>
      <div class="kpi-icon-wrap">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      </div>
    </div>

    <!-- KPI 4: Orders -->
    <div class="kpi-card" style="--kpi-delay: 120ms;">
      <div class="kpi-info">
        <span class="kpi-title">الطلبات</span>
        <span class="kpi-value text-mono">{{ formatArabicPlural(animatedKpi.orderCount, 'order') }}</span>
      </div>
      <div class="kpi-icon-wrap">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
      </div>
    </div>

    <!-- KPI 5: AOV -->
    <div class="kpi-card" style="--kpi-delay: 160ms;">
      <div class="kpi-info">
        <span class="kpi-title">متوسط الطلب</span>
        <span class="kpi-value text-mono">{{ formatCurrency(animatedKpi.avgOrderValue) }}</span>
      </div>
      <div class="kpi-icon-wrap">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
      </div>
    </div>

    <!-- KPI 6: Customers -->
    <div class="kpi-card" style="--kpi-delay: 200ms;">
      <div class="kpi-info">
        <span class="kpi-title">العملاء النشطون</span>
        <span class="kpi-value text-mono">{{ formatArabicPlural(animatedKpi.activeCustomers, 'customer') }}</span>
      </div>
      <div class="kpi-icon-wrap">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
      </div>
    </div>
  </div>

  <!-- Charts & Metrics Grid -->
  <div class="charts-grid">
    <!-- 1. Sales Trend Hero Chart Card (Span-3 / Full Width) -->
    <div class="chart-card span-3 trend-chart-card" ref="trendChartCardRef" :class="{ 'in-view': isTrendChartInView }">
      <div class="chart-card-header">
        <h3 class="chart-title">الإيرادات اليومية</h3>
        <Transition name="badge-pop" mode="out-in">
          <span v-if="hoveredTrendIndex !== null && trendCoordinates[hoveredTrendIndex]" :key="'hov-' + hoveredTrendIndex" class="chart-live-hover-pill text-mono">
            <span class="hover-pill-date">{{ trendCoordinates[hoveredTrendIndex].date }}</span>
            <span class="hover-pill-sep">•</span>
            <strong class="hover-pill-val">{{ formatCurrency(trendCoordinates[hoveredTrendIndex].val) }}</strong>
          </span>
          <span v-else-if="trendMaxVal > 0" key="peak" class="chart-peak-pill text-mono">
            أعلى إيراد يومي: <strong>{{ formatCurrency(trendMaxVal) }}</strong>
          </span>
        </Transition>
      </div>
      <div class="svg-chart-container">
        <div v-if="analyticsData.revenueTrend.length === 0" class="empty-chart">
          لا توجد بيانات كافية لرسم المخطط البياني في هذه الفترة.
        </div>
        <svg aria-hidden="true" v-else class="svg-line-chart" viewBox="0 0 900 220" @mouseleave="hoveredTrendIndex = null">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--chart-primary, #d97706)" stop-opacity="0.22"/>
              <stop offset="100%" stop-color="var(--chart-primary, #d97706)" stop-opacity="0.0"/>
            </linearGradient>
          </defs>
          <!-- Horizontal Grid Lines -->
          <line x1="45" y1="35" x2="855" y2="35" stroke="#f1f5f9" stroke-dasharray="4"/>
          <line x1="45" y1="80" x2="855" y2="80" stroke="#f1f5f9" stroke-dasharray="4"/>
          <line x1="45" y1="125" x2="855" y2="125" stroke="#f1f5f9" stroke-dasharray="4"/>
          <line x1="45" y1="170" x2="855" y2="170" stroke="#e2e8f0" stroke-width="1.2"/>
          
          <!-- Y-Axis Value Labels -->
          <text v-if="trendMaxVal > 0" x="855" y="27" class="chart-text label-y" text-anchor="end">{{ formatCurrency(trendMaxVal) }}</text>
          <text x="855" y="164" class="chart-text label-y" text-anchor="end">0 د.ل</text>

          <!-- Gradient Area -->
          <path :d="svgTrendAreaPath" class="svg-trend-area" :class="{ 'show-area': isTrendChartInView }" fill="url(#chartGradient)"/>

          <!-- Animated Line -->
          <path :d="svgTrendLinePath" pathLength="100" class="svg-trend-line" :class="{ 'draw-line': isTrendChartInView }" fill="none" stroke="var(--chart-primary, #d97706)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          
          <!-- Interactive Hover Crosshair Line -->
          <line
            v-if="hoveredTrendIndex !== null && trendCoordinates[hoveredTrendIndex]"
            :x1="trendCoordinates[hoveredTrendIndex].x"
            y1="30"
            :x2="trendCoordinates[hoveredTrendIndex].x"
            y2="170"
            stroke="var(--chart-primary, #d97706)"
            stroke-width="1.5"
            stroke-dasharray="4 3"
            opacity="0.6"
            class="chart-crosshair-line"
          />

          <!-- Animated Dots -->
          <g
            v-for="(dot, idx) in trendCoordinates"
            :key="idx"
            class="chart-dot-group"
            :class="{ 'show-dot': isTrendChartInView, 'is-hovered': hoveredTrendIndex === idx }"
            :style="{ '--dot-delay': `${Math.min(idx * 30 + 150, 950)}ms` }"
            @mouseenter="hoveredTrendIndex = idx"
            @touchstart.passive="hoveredTrendIndex = idx"
          >
            <circle v-if="hoveredTrendIndex === idx" :cx="dot.x" :cy="dot.y" r="10" fill="var(--chart-primary, #d97706)" opacity="0.18" class="dot-halo-pulse" />
            <circle :cx="dot.x" :cy="dot.y" :r="hoveredTrendIndex === idx ? 6 : 4.5" fill="#fff" stroke="var(--chart-primary, #d97706)" :stroke-width="hoveredTrendIndex === idx ? 3 : 2.5" />
            <circle :cx="dot.x" :cy="dot.y" r="18" fill="transparent" class="dot-hover-trigger">
              <title>{{ dot.date }}: {{ formatCurrency(dot.val) }}</title>
            </circle>
          </g>
          <!-- X-Axis Date Labels with generous clearance preventing dot overlap -->
          <text v-for="(label, idx) in trendXLabels" :key="'lbl-'+idx" :x="label.x" y="202" class="chart-text label-x" text-anchor="middle">
            {{ label.text }}
          </text>
        </svg>
      </div>
    </div>

    <!-- 2. Price Mode Split Chart Card -->
    <div class="chart-card price-mode-card" ref="priceModeCardRef" :class="{ 'in-view': isPriceModeInView }">
      <div class="chart-card-header">
        <h3 class="chart-title">توزيع المبيعات</h3>
      </div>
      <div class="split-display-clean">
        <div class="split-dual-bar">
          <div class="split-dual-segment segment-bulk" :style="{ width: (isPriceModeInView ? priceModePercentages.bulk : 0) + '%' }"></div>
          <div class="split-dual-segment segment-regular" :style="{ width: (isPriceModeInView ? priceModePercentages.regular : 0) + '%' }"></div>
        </div>
        <div class="split-clean-list">
          <div class="split-clean-row">
            <div class="split-clean-left">
              <span class="split-clean-dot dot-bulk"></span>
              <span class="split-clean-name font-bold">بيع بالجملة</span>
            </div>
            <div class="split-clean-right text-mono">
              <span class="split-clean-val font-bold">{{ formatCurrency(analyticsData.priceModeSplit.bulk.revenue) }}</span>
              <span class="split-clean-pct text-muted">({{ Math.round(priceModePercentages.bulk) }}%)</span>
            </div>
          </div>
          <div class="split-clean-row">
            <div class="split-clean-left">
              <span class="split-clean-dot dot-regular"></span>
              <span class="split-clean-name font-bold">بيع بالمفرد</span>
            </div>
            <div class="split-clean-right text-mono">
              <span class="split-clean-val font-bold">{{ formatCurrency(analyticsData.priceModeSplit.regular.revenue) }}</span>
              <span class="split-clean-pct text-muted">({{ Math.round(priceModePercentages.regular) }}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Payment Methods Distribution Card -->
    <div class="chart-card payment-methods-card" ref="paymentMethodsCardRef" :class="{ 'in-view': isPaymentMethodsInView }">
      <div class="chart-card-header">
        <h3 class="chart-title">طرق الدفع</h3>
      </div>
      <div class="pm-clean-list">
        <!-- Cash -->
        <div class="pm-clean-item">
          <div class="pm-clean-header">
            <span class="pm-clean-name font-bold">نقدي</span>
            <div class="pm-clean-meta text-mono">
              <span class="font-bold">{{ formatCurrency(analyticsData.paymentMethodsSplit.cash.revenue) }}</span>
              <span class="text-muted">({{ getPaymentMethodPct('cash') }}%)</span>
            </div>
          </div>
          <div class="pm-clean-bar">
            <div class="pm-clean-fill fill-cash" :style="{ width: (isPaymentMethodsInView ? getPaymentMethodPct('cash') : 0) + '%', transitionDelay: '50ms' }"></div>
          </div>
        </div>

        <!-- Card -->
        <div class="pm-clean-item">
          <div class="pm-clean-header">
            <span class="pm-clean-name font-bold">بطاقة مصرفية</span>
            <div class="pm-clean-meta text-mono">
              <span class="font-bold">{{ formatCurrency(analyticsData.paymentMethodsSplit.card.revenue) }}</span>
              <span class="text-muted">({{ getPaymentMethodPct('card') }}%)</span>
            </div>
          </div>
          <div class="pm-clean-bar">
            <div class="pm-clean-fill fill-card" :style="{ width: (isPaymentMethodsInView ? getPaymentMethodPct('card') : 0) + '%', transitionDelay: '150ms' }"></div>
          </div>
        </div>

        <!-- Bank Transfer -->
        <div class="pm-clean-item">
          <div class="pm-clean-header">
            <span class="pm-clean-name font-bold">تحويل بنكي</span>
            <div class="pm-clean-meta text-mono">
              <span class="font-bold">{{ formatCurrency(analyticsData.paymentMethodsSplit.bank_transfer.revenue) }}</span>
              <span class="text-muted">({{ getPaymentMethodPct('bank_transfer') }}%)</span>
            </div>
          </div>
          <div class="pm-clean-bar">
            <div class="pm-clean-fill fill-bank" :style="{ width: (isPaymentMethodsInView ? getPaymentMethodPct('bank_transfer') : 0) + '%', transitionDelay: '250ms' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. Top Favorites Card -->
    <div class="chart-card top-favorites-card" ref="topFavoritesCardRef" :class="{ 'in-view': isTopFavoritesInView }">
      <div class="chart-card-header">
        <h3 class="chart-title">الأكثر تفضيلاً</h3>
      </div>
      <div class="list-cards">
        <div v-if="activeTopFavorites.length === 0" class="empty-list py-3 text-center text-muted">
          لا توجد تفضيلات مسجلة بعد.
        </div>
        <div 
          v-for="(fav, idx) in activeTopFavorites" 
          :key="idx" 
          class="fav-clean-row"
        >
          <span class="fav-clean-rank text-mono text-muted">{{ idx + 1 }}.</span>
          <span class="fav-clean-name font-bold">{{ fav.name }}</span>
          <span class="fav-clean-count text-mono text-muted">{{ formatArabicPlural(fav.count, 'customer') }}</span>
        </div>
      </div>
    </div>

    <!-- 5. Category Sales Share Card -->
    <div class="chart-card span-2 category-sales-card" ref="categorySalesCardRef" :class="{ 'in-view': isCategorySalesInView }">
      <div class="chart-card-header">
        <h3 class="chart-title">مبيعات الفئات</h3>
      </div>
      <div class="bar-chart-list">
        <div v-if="analyticsData.categorySales.length === 0" class="empty-list py-3 text-center text-muted">
          لا توجد أصناف مبيعات في هذه الفترة.
        </div>
        <div 
          v-for="(cat, cIdx) in analyticsData.categorySales" 
          :key="cat.category" 
          class="category-bar-row"
        >
          <div class="bar-info">
            <div class="d-flex align-items-center gap-2">
              <span class="cat-rank-num text-muted text-mono">{{ cIdx + 1 }}.</span>
              <span class="cat-name font-bold">{{ cat.category }}</span>
            </div>
            <span class="cat-val text-mono font-bold">{{ formatCurrency(cat.revenue) }}</span>
          </div>
          <div class="bar-gauge">
            <div 
              class="bar-fill" 
              :style="{ width: (isCategorySalesInView ? getCategoryBarWidth(cat.revenue) : 0) + '%', transitionDelay: `${Math.min(cIdx * 50 + 60, 600)}ms` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 6. Top Customers Card -->
    <div class="chart-card top-customers-card" ref="topCustomersCardRef" :class="{ 'in-view': isTopCustomersInView }">
      <div class="chart-card-header">
        <h3 class="chart-title">كبار العملاء</h3>
      </div>
      <div class="table-container">
        <table class="admin-table desktop-analytics-table top-customers-interactive-table">
          <thead>
            <tr>
              <th class="col-center" style="width: 40px;">#</th>
              <th>العميل</th>
              <th style="width: 140px;">الهاتف</th>
              <th class="col-center" style="width: 130px;">الإنفاق</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="analyticsData.topCustomers.length === 0">
              <td colspan="4" class="text-center py-4 text-muted">لا توجد بيانات عملاء في هذه الفترة.</td>
            </tr>
            <tr 
              v-for="(cust, cIdx) in analyticsData.topCustomers" 
              :key="cust.phone"
              class="top-cust-row"
              :class="{ 'in-view': isTopCustomersInView }"
              :style="{ '--row-delay': `${Math.min(cIdx * 35 + 50, 450)}ms` }"
            >
              <td class="col-center text-mono text-muted">{{ cIdx + 1 }}</td>
              <td class="font-bold">{{ cust.name }}</td>
              <td class="text-mono" dir="ltr">
                <a :href="'tel:' + cust.phone" class="phone-clean-link">{{ formatLibyanPhone(cust.phone) }}</a>
              </td>
              <td class="col-center text-mono font-bold">{{ formatCurrency(cust.totalSpent) }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Mobile Top Customers Cards -->
        <div class="mobile-analytics-cards-grid">
          <div v-if="analyticsData.topCustomers.length === 0" class="empty-state-card p-3 text-center">
            <p class="text-muted mb-0">لا توجد بيانات عملاء.</p>
          </div>
          <div
            v-for="(cust, idx) in analyticsData.topCustomers"
            :key="'mob-top-cust-' + cust.phone"
            class="mob-clean-item"
          >
            <div class="mob-clean-line">
              <span class="mob-clean-title font-bold">{{ idx + 1 }}. {{ cust.name }}</span>
              <span class="mob-clean-rev text-mono font-bold">{{ formatCurrency(cust.totalSpent) }}</span>
            </div>
            <div class="mob-clean-sub">
              <a :href="'tel:' + cust.phone" class="phone-clean-link text-mono" dir="ltr">{{ formatLibyanPhone(cust.phone) }}</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 7. Top Products Card -->
    <div class="chart-card span-2 top-products-card" ref="topProductsCardRef" :class="{ 'in-view': isTopProductsInView }">
      <div class="chart-card-header">
        <h3 class="chart-title">المنتجات الأكثر مبيعاً</h3>
      </div>

      <div class="table-container">
        <table class="admin-table desktop-analytics-table top-products-interactive-table">
          <thead>
            <tr>
              <th class="col-center" style="width: 50px;">#</th>
              <th class="th-sortable" @click="toggleTopProductsSort('name')">اسم المنتج</th>
              <th style="width: 140px;">الفئة</th>
              <th class="col-center th-sortable" @click="toggleTopProductsSort('quantity')" style="width: 130px;">الكمية</th>
              <th class="col-center th-sortable" @click="toggleTopProductsSort('revenue')" style="width: 150px;">الإيراد</th>
              <th style="width: 120px;">الحصة</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="sortedTopProducts.length === 0">
              <td colspan="6" class="text-center py-4 text-muted">
                لا توجد منتجات مباعة في هذه الفترة.
              </td>
            </tr>
            <tr 
              v-for="prod in sortedTopProducts" 
              :key="prod.productId"
              class="clickable-product-row"
              :class="{ 'in-view': isTopProductsInView }"
              :style="{ '--row-delay': `${Math.min(prod.originalRank * 35 + 50, 450)}ms` }"
              @click="$emit('open-product-customers', prod)"
            >
              <td class="col-center text-mono text-muted">{{ prod.originalRank }}</td>
              <td class="font-bold">{{ prod.name }}</td>
              <td class="text-muted">{{ prod.category || '—' }}</td>
              <td class="col-center text-mono font-bold">{{ formatArabicPlural(prod.quantity, 'unit') }}</td>
              <td class="col-center text-mono font-bold">{{ formatCurrency(prod.revenue) }}</td>
              <td>
                <div class="share-mini-cell">
                  <span class="text-mono font-bold text-muted">{{ getSalesSharePct(prod.revenue) }}%</span>
                  <div class="share-mini-bar">
                    <div class="share-mini-fill" :style="{ width: (isTopProductsInView ? Math.min(100, Math.max(4, getSalesSharePct(prod.revenue))) : 0) + '%', transitionDelay: `${Math.min(prod.originalRank * 35 + 60, 500)}ms` }"></div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Mobile Top Products Cards -->
        <div class="mobile-analytics-cards-grid">
          <div v-if="sortedTopProducts.length === 0" class="empty-state-card p-3 text-center">
            <p class="text-muted mb-0">لا توجد منتجات مباعة في هذه الفترة.</p>
          </div>
          <div
            v-for="prod in sortedTopProducts"
            :key="'mob-top-prod-' + prod.productId"
            class="mob-clean-item"
            @click="$emit('open-product-customers', prod)"
          >
            <div class="mob-clean-line">
              <span class="mob-clean-title font-bold">{{ prod.originalRank }}. {{ prod.name }}</span>
              <span class="mob-clean-rev text-mono font-bold">{{ formatCurrency(prod.revenue) }}</span>
            </div>
            <div class="mob-clean-sub">
              <span>{{ prod.category || '—' }}</span>
              <span>•</span>
              <span class="text-mono">{{ formatArabicPlural(prod.quantity, 'unit') }}</span>
              <span>•</span>
              <span class="text-mono text-muted">{{ getSalesSharePct(prod.revenue) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 8. Inactive Customers Card -->
    <div class="chart-card inactive-customers-card" ref="inactiveCustomersCardRef" :class="{ 'in-view': isInactiveCustomersInView }">
      <div class="chart-card-header">
        <h3 class="chart-title">عملاء غير نشطين</h3>
      </div>
      <div class="table-container">
        <table class="admin-table desktop-analytics-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th style="width: 140px;">الهاتف</th>
              <th style="width: 120px;">آخر نشاط</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="analyticsData.inactiveCustomers.length === 0">
              <td colspan="3" class="text-center py-4 text-muted">جميع العملاء نشطون في هذه الفترة!</td>
            </tr>
            <tr 
              v-for="cust in analyticsData.inactiveCustomers" 
              :key="cust.phone"
            >
              <td class="font-bold">{{ cust.name }}</td>
              <td class="text-mono" dir="ltr">
                <a :href="'tel:' + cust.phone" class="phone-clean-link">{{ formatLibyanPhone(cust.phone) }}</a>
              </td>
              <td class="text-muted text-mono">{{ new Date(cust.lastActive).toLocaleDateString('ar-LY') }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Mobile Inactive Customers Cards -->
        <div class="mobile-analytics-cards-grid">
          <div v-if="analyticsData.inactiveCustomers.length === 0" class="empty-state-card p-3 text-center">
            <p class="text-muted mb-0">جميع العملاء نشطون!</p>
          </div>
          <div
            v-for="cust in analyticsData.inactiveCustomers"
            :key="'mob-inact-cust-' + cust.phone"
            class="mob-clean-item"
          >
            <div class="mob-clean-line">
              <span class="mob-clean-title font-bold">{{ cust.name }}</span>
              <span class="text-muted text-mono">{{ new Date(cust.lastActive).toLocaleDateString('ar-LY') }}</span>
            </div>
            <div class="mob-clean-sub">
              <a :href="'tel:' + cust.phone" class="phone-clean-link text-mono" dir="ltr">{{ formatLibyanPhone(cust.phone) }}</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 9. Low Performing Products Card -->
    <div class="chart-card low-products-card" ref="lowProductsCardRef" :class="{ 'in-view': isLowProductsInView }">
      <div class="chart-card-header">
        <h3 class="chart-title">منتجات بدون مبيعات</h3>
      </div>
      <div class="table-container">
        <table class="admin-table desktop-analytics-table">
          <thead>
            <tr>
              <th>اسم المنتج</th>
              <th style="width: 140px;">الفئة</th>
              <th class="col-center" style="width: 130px;">السعر</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="activeLowPerformingProducts.length === 0">
              <td colspan="3" class="text-center py-4 text-muted">كل المنتجات تحقق مبيعات!</td>
            </tr>
            <tr 
              v-for="prod in activeLowPerformingProducts" 
              :key="prod.productId"
            >
              <td class="font-bold">{{ prod.name }}</td>
              <td class="text-muted">{{ prod.category || '—' }}</td>
              <td class="col-center text-mono font-bold">{{ formatCurrency(prod.price) }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Mobile Low Performing Cards -->
        <div class="mobile-analytics-cards-grid">
          <div v-if="activeLowPerformingProducts.length === 0" class="empty-state-card p-3 text-center">
            <p class="text-muted mb-0">كل المنتجات تحقق مبيعات!</p>
          </div>
          <div
            v-for="prod in activeLowPerformingProducts"
            :key="'mob-low-prod-' + prod.productId"
            class="mob-clean-item"
          >
            <div class="mob-clean-line">
              <span class="mob-clean-title font-bold">{{ prod.name }}</span>
              <span class="text-mono font-bold">{{ formatCurrency(prod.price) }}</span>
            </div>
            <div class="mob-clean-sub">
              <span>{{ prod.category || '—' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 10. UX Insights & Conversion Funnel Card -->
    <div class="chart-card span-2 ux-insights-card" ref="uxInsightsCardRef" :class="{ 'in-view': isUxInsightsInView }">
      <div class="chart-card-header">
        <h3 class="chart-title">الزيارات ومسار التحويل</h3>
      </div>

      <div class="ux-clean-wrapper">
        <!-- Clean 4-Metric Funnel Strip -->
        <div class="ux-funnel-strip">
          <div class="funnel-metric">
            <span class="funnel-metric-label">جلسات التصفح</span>
            <span class="funnel-metric-val text-mono">{{ telemetryInsights.funnel?.totalSessions || 0 }}</span>
          </div>
          <div class="funnel-metric">
            <span class="funnel-metric-label">إضافة للسلة</span>
            <span class="funnel-metric-val text-mono">{{ telemetryInsights.funnel?.cartSessions || 0 }}</span>
          </div>
          <div class="funnel-metric">
            <span class="funnel-metric-label">مراجعة الطلب</span>
            <span class="funnel-metric-val text-mono">{{ telemetryInsights.funnel?.checkoutSessions || 0 }}</span>
          </div>
          <div class="funnel-metric highlight">
            <span class="funnel-metric-label">الطلبات المكتملة</span>
            <span class="funnel-metric-val text-mono">{{ telemetryInsights.funnel?.orderSessions || 0 }}</span>
          </div>
        </div>

        <!-- Clean Performance Rates -->
        <div class="ux-rates-row">
          <div class="ux-rate-item">
            <span class="ux-rate-label">معدل التحويل:</span>
            <span class="ux-rate-val text-mono font-bold">{{ telemetryInsights.funnel?.conversionRate || 0 }}%</span>
          </div>
          <div class="ux-rate-item">
            <span class="ux-rate-label">معدل ترك السلة:</span>
            <span class="ux-rate-val text-mono font-bold">{{ telemetryInsights.funnel?.cartAbandonmentRate || 0 }}%</span>
          </div>
          <div class="ux-rate-item">
            <span class="ux-rate-label">متوسط وقت المعاينة:</span>
            <span class="ux-rate-val text-mono font-bold">{{ telemetryInsights.avgDwellSeconds || 0 }} ثانية</span>
          </div>
        </div>

        <!-- Clean Device Breakdown Strip -->
        <div class="device-clean-strip">
          <div class="device-clean-item">
            <span>هاتف:</span>
            <span class="text-mono font-bold">{{ getDevicePct('mobile') }}%</span>
          </div>
          <div class="device-clean-item">
            <span>حاسوب:</span>
            <span class="text-mono font-bold">{{ getDevicePct('desktop') }}%</span>
          </div>
          <div class="device-clean-item">
            <span>لوحي:</span>
            <span class="text-mono font-bold">{{ getDevicePct('tablet') }}%</span>
          </div>
        </div>

        <!-- Top Engaged Categories by Visitor Interactions -->
        <div v-if="telemetryInsights.topCategories && telemetryInsights.topCategories.length" class="ux-categories-section mt-4 pt-3 border-top">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="font-bold text-slate-800" style="font-size: 0.88rem;">الفئات الأكثر تفاعلاً وزيارة</span>
            <span class="text-muted text-mono" style="font-size: 0.78rem;">مرات التفاعل</span>
          </div>
          <div class="ux-cat-list d-flex flex-column gap-3">
            <div v-for="(cat, cIdx) in telemetryInsights.topCategories" :key="cat.name" class="ux-cat-row">
              <div class="d-flex justify-content-between align-items-center mb-1" style="font-size: 0.82rem;">
                <span class="font-semibold text-slate-700">{{ cat.name }}</span>
                <span class="text-mono font-bold text-slate-600">{{ cat.interactions }}</span>
              </div>
              <div class="ux-cat-bar-bg" style="height: 6px; background: #f1f5f9; border-radius: 999px; overflow: hidden; position: relative; width: 100%;">
                <div class="ux-cat-bar-fill" :style="{ width: (isUxInsightsInView ? Math.min(100, Math.round((cat.interactions / (telemetryInsights.topCategories[0]?.interactions || 1)) * 100)) : 0) + '%', transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)', transitionDelay: `${Math.min(cIdx * 50 + 80, 500)}ms`, background: '#3b82f6', height: '100%', borderRadius: '999px', float: 'right' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>
  </div>
</template>

<script>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { gsap } from 'gsap';
import { formatLibyanPhone } from '../utils/phone';

const ANALYTICS_PERIODS = [
  { val: '7d', label: 'آخر 7 أيام' },
  { val: '30d', label: 'آخر 30 يوم' },
  { val: 'all', label: 'كل الأوقات' },
  { val: 'custom', label: 'فترة مخصصة' }
];

export default {
  name: 'AdminAnalyticsTab',
  props: {
    analyticsPeriod: { type: String, required: true },
    analyticsStartDate: { type: String, default: '' },
    analyticsEndDate: { type: String, default: '' },
    analyticsLoading: { type: Boolean, default: false },
    fromOpen: { type: Boolean, default: false },
    toOpen: { type: Boolean, default: false },
    isMobileScreen: { type: Boolean, default: false },
    analyticsData: { type: Object, required: true },
    telemetryInsights: { type: Object, required: true },
    products: { type: Array, default: () => [] },
    activeShop: { type: String, default: 'shop1' },
    formatCurrency: { type: Function, required: true },
    formatArabicPlural: { type: Function, required: true },
    formatArabicDate: { type: Function, required: true },
    buildCalendarMatrix: { type: Function, required: true }
  },
  emits: [
    'change-period',
    'update:fromOpen',
    'update:toOpen',
    'select-from',
    'select-to',
    'set-shortcut',
    'open-product-customers'
  ],
  setup(props, { emit }) {
    const getTodayStr = () => new Date().toLocaleDateString('en-CA');

    const analyticsFromYear = ref(new Date().getFullYear());
    const analyticsFromMonth = ref(new Date().getMonth());
    const analyticsToYear = ref(new Date().getFullYear());
    const analyticsToMonth = ref(new Date().getMonth());

    const analyticsFromMonthYearLabel = computed(() => {
      const d = new Date(analyticsFromYear.value, analyticsFromMonth.value, 1);
      return d.toLocaleDateString('ar-LY', { month: 'long', year: 'numeric' });
    });

    const analyticsToMonthYearLabel = computed(() => {
      const d = new Date(analyticsToYear.value, analyticsToMonth.value, 1);
      return d.toLocaleDateString('ar-LY', { month: 'long', year: 'numeric' });
    });

    const analyticsFromPrevMonth = () => {
      if (analyticsFromMonth.value === 0) { analyticsFromMonth.value = 11; analyticsFromYear.value--; }
      else { analyticsFromMonth.value--; }
    };
    const analyticsFromNextMonth = () => {
      if (analyticsFromMonth.value === 11) { analyticsFromMonth.value = 0; analyticsFromYear.value++; }
      else { analyticsFromMonth.value++; }
    };

    const analyticsToPrevMonth = () => {
      if (analyticsToMonth.value === 0) { analyticsToMonth.value = 11; analyticsToYear.value--; }
      else { analyticsToMonth.value--; }
    };
    const analyticsToNextMonth = () => {
      if (analyticsToMonth.value === 11) { analyticsToMonth.value = 0; analyticsToYear.value++; }
      else { analyticsToMonth.value++; }
    };

    const analyticsFromCalendarDays = computed(() => props.buildCalendarMatrix(analyticsFromYear.value, analyticsFromMonth.value));
    const analyticsToCalendarDays = computed(() => props.buildCalendarMatrix(analyticsToYear.value, analyticsToMonth.value));

    const openAnalyticsFromPicker = () => {
      emit('update:toOpen', false);
      const nextOpen = !props.fromOpen;
      if (nextOpen && props.analyticsStartDate) {
        const parts = props.analyticsStartDate.split('-').map(Number);
        if (parts[0] && parts[1]) {
          analyticsFromYear.value = parts[0];
          analyticsFromMonth.value = parts[1] - 1;
        }
      }
      emit('update:fromOpen', nextOpen);
    };

    const openAnalyticsToPicker = () => {
      emit('update:fromOpen', false);
      const nextOpen = !props.toOpen;
      if (nextOpen && props.analyticsEndDate) {
        const parts = props.analyticsEndDate.split('-').map(Number);
        if (parts[0] && parts[1]) {
          analyticsToYear.value = parts[0];
          analyticsToMonth.value = parts[1] - 1;
        }
      }
      emit('update:toOpen', nextOpen);
    };

    const selectAnalyticsFrom = (dateStr) => {
      emit('update:fromOpen', false);
      emit('select-from', dateStr);
    };

    const selectAnalyticsTo = (dateStr) => {
      emit('update:toOpen', false);
      emit('select-to', dateStr);
    };

    const setAnalyticsShortcut = (type) => {
      emit('update:fromOpen', false);
      emit('update:toOpen', false);
      emit('set-shortcut', type);
    };

    const isAnalyticsToday = computed(() => {
      const todayStr = getTodayStr();
      return props.analyticsStartDate === todayStr && props.analyticsEndDate === todayStr;
    });

    const isAnalytics7d = computed(() => {
      const todayStr = getTodayStr();
      const past = new Date();
      past.setDate(past.getDate() - 6);
      return props.analyticsStartDate === past.toLocaleDateString('en-CA') && props.analyticsEndDate === todayStr;
    });

    const isAnalyticsMonth = computed(() => {
      const today = new Date();
      const firstDayStr = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA');
      return props.analyticsStartDate === firstDayStr && props.analyticsEndDate === today.toLocaleDateString('en-CA');
    });

    // Scroll Reveal & GSAP KPI Odometer Counters
    const kpiGridRef = ref(null);
    const isKpiInView = ref(false);
    const trendChartCardRef = ref(null);
    const isTrendChartInView = ref(false);
    const priceModeCardRef = ref(null);
    const isPriceModeInView = ref(false);
    const paymentMethodsCardRef = ref(null);
    const isPaymentMethodsInView = ref(false);
    const categorySalesCardRef = ref(null);
    const isCategorySalesInView = ref(false);
    const topFavoritesCardRef = ref(null);
    const isTopFavoritesInView = ref(false);
    const topProductsCardRef = ref(null);
    const isTopProductsInView = ref(false);
    const topCustomersCardRef = ref(null);
    const isTopCustomersInView = ref(false);
    const inactiveCustomersCardRef = ref(null);
    const isInactiveCustomersInView = ref(false);
    const lowProductsCardRef = ref(null);
    const isLowProductsInView = ref(false);
    const uxInsightsCardRef = ref(null);
    const isUxInsightsInView = ref(false);

    const resetAnalyticsScrollStates = () => {
      isKpiInView.value = false;
      isTrendChartInView.value = false;
      isPriceModeInView.value = false;
      isPaymentMethodsInView.value = false;
      isCategorySalesInView.value = false;
      isTopFavoritesInView.value = false;
      isTopProductsInView.value = false;
      isTopCustomersInView.value = false;
      isInactiveCustomersInView.value = false;
      isLowProductsInView.value = false;
      isUxInsightsInView.value = false;
    };

    let scrollRafId = null;
    const handleScrollCheck = () => {
      if (typeof window === 'undefined') return;
      if (scrollRafId) return;
      scrollRafId = requestAnimationFrame(() => {
        scrollRafId = null;
        const vH = window.innerHeight || document.documentElement.clientHeight || 800;
        const checkInView = (elRef, targetRef) => {
          if (!elRef || !elRef.value || targetRef.value) return;
          const r = elRef.value.getBoundingClientRect();
          if (r.top <= vH * 0.94 && r.bottom >= 20) {
            targetRef.value = true;
          }
        };
        checkInView(kpiGridRef, isKpiInView);
        checkInView(trendChartCardRef, isTrendChartInView);
        checkInView(priceModeCardRef, isPriceModeInView);
        checkInView(paymentMethodsCardRef, isPaymentMethodsInView);
        checkInView(categorySalesCardRef, isCategorySalesInView);
        checkInView(topFavoritesCardRef, isTopFavoritesInView);
        checkInView(topProductsCardRef, isTopProductsInView);
        checkInView(topCustomersCardRef, isTopCustomersInView);
        checkInView(inactiveCustomersCardRef, isInactiveCustomersInView);
        checkInView(lowProductsCardRef, isLowProductsInView);
        checkInView(uxInsightsCardRef, isUxInsightsInView);
      });
    };

    let analyticsObserver = null;
    const attachScrollListeners = () => {
      if (typeof window === 'undefined') return;
      const adminMain = document.querySelector('.admin-main');
      if (adminMain) {
        adminMain.removeEventListener('scroll', handleScrollCheck);
        adminMain.addEventListener('scroll', handleScrollCheck, { passive: true });
      }
      window.removeEventListener('scroll', handleScrollCheck);
      window.addEventListener('scroll', handleScrollCheck, { passive: true });
      window.removeEventListener('resize', handleScrollCheck);
      window.addEventListener('resize', handleScrollCheck, { passive: true });
      handleScrollCheck();
    };

    const detachScrollListeners = () => {
      if (typeof window === 'undefined') return;
      if (analyticsObserver) {
        analyticsObserver.disconnect();
        analyticsObserver = null;
      }
      const adminMain = document.querySelector('.admin-main');
      if (adminMain) adminMain.removeEventListener('scroll', handleScrollCheck);
      window.removeEventListener('scroll', handleScrollCheck);
      window.removeEventListener('resize', handleScrollCheck);
      if (scrollRafId) {
        cancelAnimationFrame(scrollRafId);
        scrollRafId = null;
      }
    };

    const setupAnalyticsObserver = () => {
      if (typeof window === 'undefined') return;
      if (typeof IntersectionObserver !== 'undefined') {
        if (analyticsObserver) {
          analyticsObserver.disconnect();
          analyticsObserver = null;
        }
        const adminMain = document.querySelector('.admin-main');
        analyticsObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const el = entry.target;
              if (el === kpiGridRef.value) isKpiInView.value = true;
              else if (el === trendChartCardRef.value) isTrendChartInView.value = true;
              else if (el === priceModeCardRef.value) isPriceModeInView.value = true;
              else if (el === paymentMethodsCardRef.value) isPaymentMethodsInView.value = true;
              else if (el === topFavoritesCardRef.value) isTopFavoritesInView.value = true;
              else if (el === categorySalesCardRef.value) isCategorySalesInView.value = true;
              else if (el === topProductsCardRef.value) isTopProductsInView.value = true;
              else if (el === topCustomersCardRef.value) isTopCustomersInView.value = true;
              else if (el === inactiveCustomersCardRef.value) isInactiveCustomersInView.value = true;
              else if (el === lowProductsCardRef.value) isLowProductsInView.value = true;
              else if (el === uxInsightsCardRef.value) isUxInsightsInView.value = true;
            }
          });
        }, {
          root: adminMain || null,
          rootMargin: '120px 0px 50px 0px',
          threshold: [0, 0.05]
        });

        [
          kpiGridRef.value, trendChartCardRef.value, priceModeCardRef.value,
          paymentMethodsCardRef.value, topFavoritesCardRef.value, categorySalesCardRef.value,
          topProductsCardRef.value, topCustomersCardRef.value, inactiveCustomersCardRef.value,
          lowProductsCardRef.value, uxInsightsCardRef.value
        ].forEach(card => {
          if (card) analyticsObserver.observe(card);
        });
      }
      attachScrollListeners();
      handleScrollCheck();
    };

    const animatedKpi = reactive({
      totalRevenue: 0,
      totalPaid: 0,
      totalRemaining: 0,
      orderCount: 0,
      avgOrderValue: 0,
      activeCustomers: 0
    });

    const animateKpiCounters = () => {
      const kpi = props.analyticsData.kpi || {};
      const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        animatedKpi.totalRevenue = Number(kpi.totalRevenue) || 0;
        animatedKpi.totalPaid = Number(kpi.totalPaid) || 0;
        animatedKpi.totalRemaining = Number(kpi.totalRemaining) || 0;
        animatedKpi.orderCount = Number(kpi.orderCount) || 0;
        animatedKpi.avgOrderValue = Number(kpi.avgOrderValue) || 0;
        animatedKpi.activeCustomers = Number(kpi.activeCustomers) || 0;
        return;
      }
      gsap.to(animatedKpi, {
        totalRevenue: Number(kpi.totalRevenue) || 0,
        totalPaid: Number(kpi.totalPaid) || 0,
        totalRemaining: Number(kpi.totalRemaining) || 0,
        orderCount: Number(kpi.orderCount) || 0,
        avgOrderValue: Number(kpi.avgOrderValue) || 0,
        activeCustomers: Number(kpi.activeCustomers) || 0,
        duration: 0.72,
        ease: 'expo.out',
        overwrite: true,
        onUpdate: () => {
          animatedKpi.totalRevenue = Math.round(animatedKpi.totalRevenue);
          animatedKpi.totalPaid = Math.round(animatedKpi.totalPaid);
          animatedKpi.totalRemaining = Math.round(animatedKpi.totalRemaining);
          animatedKpi.orderCount = Math.round(animatedKpi.orderCount);
          animatedKpi.avgOrderValue = Math.round(animatedKpi.avgOrderValue);
          animatedKpi.activeCustomers = Math.round(animatedKpi.activeCustomers);
        }
      });
    };

    let analyticsLatchTimer = null;
    const triggerAnalyticsAnimations = () => {
      animateKpiCounters();
      resetAnalyticsScrollStates();
      if (analyticsLatchTimer) clearTimeout(analyticsLatchTimer);
      nextTick(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setupAnalyticsObserver();
            handleScrollCheck();
          });
        });
      });
      analyticsLatchTimer = setTimeout(() => {
        isKpiInView.value = true;
        isTrendChartInView.value = true;
        isPriceModeInView.value = true;
        isPaymentMethodsInView.value = true;
        isCategorySalesInView.value = true;
        isTopFavoritesInView.value = true;
        isTopProductsInView.value = true;
        isTopCustomersInView.value = true;
        isInactiveCustomersInView.value = true;
        isLowProductsInView.value = true;
        isUxInsightsInView.value = true;
      }, 500);
    };

    onMounted(() => {
      if (!props.analyticsLoading) {
        triggerAnalyticsAnimations();
      }
    });

    watch(() => props.analyticsLoading, (loading) => {
      if (!loading) triggerAnalyticsAnimations();
    });

    watch(
      () => [
        props.analyticsData.kpi?.totalRevenue,
        props.analyticsData.kpi?.orderCount,
        props.analyticsPeriod,
        props.activeShop
      ],
      () => {
        if (!props.analyticsLoading) triggerAnalyticsAnimations();
      }
    );

    onUnmounted(() => {
      gsap.killTweensOf(animatedKpi);
      if (analyticsLatchTimer) clearTimeout(analyticsLatchTimer);
      detachScrollListeners();
    });

    const isProdDisabled = (p) => {
      if (!p) return false;
      return p.available === false || p.available === 'false' || p.available === 0 || p.available === '0';
    };

    const activeLowPerformingProducts = computed(() => {
      const disabledMap = new Set((props.products || []).filter(isProdDisabled).map(p => p._id.toString()));
      const disabledNameSet = new Set((props.products || []).filter(isProdDisabled).map(p => p.name.trim().toLowerCase()));
      return (props.analyticsData.lowPerformingProducts || []).filter(p => {
        if (p.productId && disabledMap.has(p.productId.toString())) return false;
        if (p.name && disabledNameSet.has(p.name.trim().toLowerCase())) return false;
        return true;
      });
    });

    const activeTopProducts = computed(() => {
      const disabledMap = new Set((props.products || []).filter(isProdDisabled).map(p => p._id.toString()));
      const disabledNameSet = new Set((props.products || []).filter(isProdDisabled).map(p => p.name.trim().toLowerCase()));
      return (props.analyticsData.topProducts || []).filter(p => {
        if (p.productId && disabledMap.has(p.productId.toString())) return false;
        if (p.name && disabledNameSet.has(p.name.trim().toLowerCase())) return false;
        return true;
      });
    });

    const topProductsSortField = ref('rank');
    const topProductsSortAsc = ref(false);

    const toggleTopProductsSort = (field) => {
      if (topProductsSortField.value === field) {
        topProductsSortAsc.value = !topProductsSortAsc.value;
      } else {
        topProductsSortField.value = field;
        topProductsSortAsc.value = (field === 'name');
      }
    };

    const getSalesSharePct = (revenue) => {
      const total = Number(props.analyticsData.kpi?.totalRevenue) || 0;
      if (!total || total <= 0) return 0;
      const pct = ((Number(revenue) || 0) / total) * 100;
      return pct >= 10 ? Math.round(pct) : Number(pct.toFixed(1));
    };

    const sortedTopProducts = computed(() => {
      const withRank = activeTopProducts.value.map((item, idx) => {
        const found = (props.products || []).find(p => (item.productId && p._id.toString() === item.productId.toString()) || p.name === item.name);
        return {
          ...item,
          originalRank: idx + 1,
          category: item.category || (found ? found.category : '')
        };
      });

      return withRank.sort((a, b) => {
        let comparison = 0;
        if (topProductsSortField.value === 'name') {
          comparison = (a.name || '').localeCompare(b.name || '', 'ar', { sensitivity: 'base' });
        } else if (topProductsSortField.value === 'revenue') {
          comparison = (a.revenue || 0) - (b.revenue || 0);
        } else if (topProductsSortField.value === 'quantity') {
          comparison = (a.quantity || 0) - (b.quantity || 0);
        } else if (topProductsSortField.value === 'rank') {
          comparison = (b.originalRank || 0) - (a.originalRank || 0);
        }
        return topProductsSortAsc.value ? comparison : -comparison;
      });
    });

    const activeTopFavorites = computed(() => {
      const disabledNameSet = new Set((props.products || []).filter(isProdDisabled).map(p => p.name.trim().toLowerCase()));
      return (props.analyticsData.topFavorites || []).filter(fav => {
        if (fav.name && disabledNameSet.has(fav.name.trim().toLowerCase())) return false;
        return true;
      });
    });

    const hoveredTrendIndex = ref(null);
    const trendMaxVal = computed(() => {
      const trend = props.analyticsData.revenueTrend || [];
      if (!trend.length) return 0;
      return Math.max(...trend.map(t => t.revenue), 0);
    });

    const trendCoordinates = computed(() => {
      const trend = props.analyticsData.revenueTrend || [];
      if (!trend.length) return [];
      const maxVal = Math.max(...trend.map(t => t.revenue), 10);
      const pointsCount = trend.length;
      const startX = 45;
      const endX = 855;
      const width = endX - startX;
      const baseY = 170;
      const topY = 35;
      const height = baseY - topY;
      return trend.map((t, idx) => {
        const x = startX + (idx / (pointsCount - 1 || 1)) * width;
        const y = baseY - (t.revenue / maxVal) * height;
        return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, date: t.date, val: t.revenue };
      });
    });

    const svgTrendLinePath = computed(() => {
      const coords = trendCoordinates.value;
      if (coords.length === 0) return '';
      return coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
    });

    const svgTrendAreaPath = computed(() => {
      const coords = trendCoordinates.value;
      if (coords.length === 0) return '';
      const lineStr = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
      const startX = coords[0].x;
      const endX = coords[coords.length - 1].x;
      return `${lineStr} L ${endX} 170 L ${startX} 170 Z`;
    });

    const trendXLabels = computed(() => {
      const trend = props.analyticsData.revenueTrend || [];
      if (trend.length === 0) return [];
      const maxLabels = Math.min(trend.length, 6);
      const labels = [];
      const step = Math.floor(trend.length / maxLabels) || 1;
      const startX = 45;
      const endX = 855;
      const width = endX - startX;
      for (let i = 0; i < trend.length; i += step) {
        const x = startX + (i / (trend.length - 1 || 1)) * width;
        const rawDate = trend[i].date;
        const dateParts = rawDate.split('-');
        const text = dateParts.length > 2 ? `${dateParts[2]}/${dateParts[1]}` : rawDate;
        labels.push({ x: Math.round(x * 10) / 10, text });
      }
      return labels;
    });

    const priceModePercentages = computed(() => {
      const reg = props.analyticsData.priceModeSplit?.regular?.revenue || 0;
      const blk = props.analyticsData.priceModeSplit?.bulk?.revenue || 0;
      const total = reg + blk;
      if (total === 0) return { regular: 50, bulk: 50 };
      return {
        regular: (reg / total) * 100,
        bulk: (blk / total) * 100
      };
    });

    const getCategoryBarWidth = (revenue) => {
      const sales = props.analyticsData.categorySales || [];
      const maxRevenue = Math.max(...sales.map(c => c.revenue), 1);
      return Math.max((revenue / maxRevenue) * 100, 4);
    };

    const getPaymentMethodPct = (methodKey) => {
      const pms = props.analyticsData.paymentMethodsSplit;
      if (!pms) return 0;
      const total = (pms.cash?.revenue || 0) + (pms.card?.revenue || 0) + (pms.bank_transfer?.revenue || 0);
      if (total <= 0) return 0;
      const rev = pms[methodKey]?.revenue || 0;
      return Math.round((rev / total) * 100);
    };

    const getDevicePct = (deviceKey) => {
      const devs = props.telemetryInsights?.devices;
      if (!devs) return 0;
      const total = (devs.mobile || 0) + (devs.desktop || 0) + (devs.tablet || 0);
      if (total <= 0) return 0;
      return Math.round(((devs[deviceKey] || 0) / total) * 100);
    };

    return {
      periods: ANALYTICS_PERIODS,
      formatLibyanPhone,
      getTodayStr,
      analyticsFromMonthYearLabel,
      analyticsToMonthYearLabel,
      analyticsFromPrevMonth,
      analyticsFromNextMonth,
      analyticsToPrevMonth,
      analyticsToNextMonth,
      analyticsFromCalendarDays,
      analyticsToCalendarDays,
      openAnalyticsFromPicker,
      openAnalyticsToPicker,
      selectAnalyticsFrom,
      selectAnalyticsTo,
      setAnalyticsShortcut,
      isAnalyticsToday,
      isAnalytics7d,
      isAnalyticsMonth,
      kpiGridRef,
      isKpiInView,
      trendChartCardRef,
      isTrendChartInView,
      priceModeCardRef,
      isPriceModeInView,
      paymentMethodsCardRef,
      isPaymentMethodsInView,
      categorySalesCardRef,
      isCategorySalesInView,
      topFavoritesCardRef,
      isTopFavoritesInView,
      topProductsCardRef,
      isTopProductsInView,
      topCustomersCardRef,
      isTopCustomersInView,
      inactiveCustomersCardRef,
      isInactiveCustomersInView,
      lowProductsCardRef,
      isLowProductsInView,
      uxInsightsCardRef,
      isUxInsightsInView,
      animatedKpi,
      activeLowPerformingProducts,
      sortedTopProducts,
      activeTopFavorites,
      toggleTopProductsSort,
      getSalesSharePct,
      hoveredTrendIndex,
      trendMaxVal,
      trendCoordinates,
      svgTrendLinePath,
      svgTrendAreaPath,
      trendXLabels,
      priceModePercentages,
      getCategoryBarWidth,
      getPaymentMethodPct,
      getDevicePct
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

.segmented-control {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.02);
  gap: 2px;
}

.control-pill {
  background: transparent;
  border: none;
  padding: 6px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #495057;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.08s ease, box-shadow 0.12s ease;
  font-family: inherit;
}

.control-pill:hover {
  color: #212529;
}

.control-pill.active {
  background: #ffffff;
  color: var(--chart-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

@media (max-width: 1599px) {
  .kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.kpi-grid.in-view .kpi-card {
  animation: kpiCardPopIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: var(--kpi-delay, 0ms);
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--admin-card-elevation-hover);
}

.kpi-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.kpi-title {
  font-size: 0.82rem;
  color: #64748b;
  font-weight: 600;
  line-height: 1.2;
}

.kpi-value {
  font-family: 'Cairo', sans-serif !important;
  font-size: 1.22rem;
  font-weight: 800;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  letter-spacing: -0.3px;
  white-space: nowrap;
}

.kpi-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 28px;
}

.chart-card:not(.skeleton-card) {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}

.chart-card:not(.skeleton-card).in-view {
  opacity: 1;
  transform: translateY(0);
}

.chart-card:not(.skeleton-card).in-view:hover {
  transform: translateY(-2px);
  box-shadow: var(--admin-card-elevation-hover);
}

.trend-chart-card {
  transition-delay: 50ms;
}

.price-mode-card {
  transition-delay: 100ms;
}

.payment-methods-card {
  transition-delay: 150ms;
}

.top-favorites-card {
  transition-delay: 200ms;
}

.category-sales-card {
  transition-delay: 80ms;
}

.top-customers-card {
  transition-delay: 120ms;
}

.top-products-card {
  transition-delay: 80ms;
}

.inactive-customers-card {
  transition-delay: 120ms;
}

.low-products-card {
  transition-delay: 80ms;
}

@media (prefers-reduced-motion: reduce) {
  .chart-card:not(.skeleton-card) {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}

.chart-card.span-2 {
  grid-column: span 2;
}

.chart-card.span-3 {
  grid-column: 1 / -1;
}

.chart-card-header {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-title {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.chart-card {
  position: relative;
  background: #ffffff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid transparent;
  box-shadow: var(--admin-card-elevation);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  color: #0f172a;
}

.chart-card .text-muted,
.chart-card .cat-rank-num,
.chart-card .split-clean-pct,
.chart-card .fav-clean-rank,
.chart-card .fav-clean-count {
  color: #64748b !important;
}

.chart-card .split-clean-name,
.chart-card .split-clean-val,
.chart-card .pm-clean-name,
.chart-card .pm-clean-meta,
.chart-card .cat-name,
.chart-card .cat-val,
.chart-card .fav-clean-name {
  color: #0f172a;
}

:global(.dark-mode .chart-card) {
  color: #f8fafc;
}

:global(.dark-mode .chart-card .text-muted),
:global(.dark-mode .chart-card .cat-rank-num),
:global(.dark-mode .chart-card .split-clean-pct),
:global(.dark-mode .chart-card .fav-clean-rank),
:global(.dark-mode .chart-card .fav-clean-count) {
  color: #94a3b8 !important;
}

:global(.dark-mode .chart-card .split-clean-name),
:global(.dark-mode .chart-card .split-clean-val),
:global(.dark-mode .chart-card .pm-clean-name),
:global(.dark-mode .chart-card .pm-clean-meta),
:global(.dark-mode .chart-card .cat-name),
:global(.dark-mode .chart-card .cat-val),
:global(.dark-mode .chart-card .fav-clean-name) {
  color: #f1f5f9;
}

.svg-chart-container {
  height: 230px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
}

.svg-line-chart {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.svg-trend-area {
  opacity: 0;
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s;
  will-change: opacity;
}

.svg-trend-area.show-area {
  opacity: 1;
}

.svg-trend-line {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  transition: stroke-dashoffset 1.3s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: stroke-dashoffset;
}

.svg-trend-line.draw-line {
  stroke-dashoffset: 0;
}

.chart-dot-group {
  opacity: 0;
  transform: scale(0);
  transform-box: fill-box;
  transform-origin: center;
  transition: opacity 0.35s ease, transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: transform, opacity;
}

.chart-dot-group.show-dot {
  opacity: 1;
  transform: scale(1);
  transition-delay: var(--dot-delay, 300ms);
}

.chart-dot-group:hover circle {
  r: 6.5px;
  stroke-width: 3px;
}

.chart-text {
  font-size: 11px;
  font-weight: 600;
  fill: #64748b;
  font-family: 'Cairo', sans-serif;
}

.chart-text.label-y {
  font-size: 10px;
  font-weight: 700;
  fill: #94a3b8;
  font-family: 'Cairo', monospace;
}

.dot-hover-trigger {
  cursor: pointer;
}

.empty-chart {
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 500;
}

.split-display-clean {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
  min-height: 180px;
}

.split-dual-bar {
  height: 8px;
  border-radius: 999px;
  background: #e2e8f0;
  display: flex;
  overflow: hidden;
}

.split-dual-segment {
  height: 100%;
  transition: width 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: width;
}

.segment-bulk {
  background: var(--chart-primary, #d97706);
}

.segment-regular {
  background: #94a3b8;
}

.split-clean-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.split-clean-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.88rem;
}

.split-clean-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.split-clean-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-bulk {
  background: var(--chart-primary, #d97706);
}

.dot-regular {
  background: #94a3b8;
}

.split-clean-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pm-clean-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: center;
  min-height: 180px;
}

.pm-clean-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pm-clean-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.88rem;
}

.pm-clean-name {
  color: #1e293b;
}

.pm-clean-meta {
  display: flex;
  gap: 6px;
  align-items: baseline;
}

.pm-clean-bar {
  height: 4px;
  background: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
}

.pm-clean-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: width;
}

.bar-chart-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-bar-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.bar-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.86rem;
}

.cat-rank-num {
  font-size: 0.8rem;
}

.bar-gauge {
  height: 4px;
  background: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--chart-primary, #d97706);
  border-radius: 999px;
  transition: width 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: width;
}

.list-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fav-clean-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f8fafc;
  font-size: 0.88rem;
}

.fav-clean-rank {
  font-size: 0.82rem;
  width: 20px;
}

.fav-clean-name {
  color: #1e293b;
  flex: 1;
}

.fav-clean-count {
  font-size: 0.8rem;
}

.share-mini-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.share-mini-bar {
  flex: 1;
  height: 4px;
  background: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
}

.share-mini-fill {
  height: 100%;
  background: var(--chart-primary, #d97706);
  border-radius: 999px;
  transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: width;
}

.phone-clean-link {
  color: #0f172a;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.85rem;
}

.phone-clean-link:hover {
  color: var(--primary-color, #d97706);
  text-decoration: underline;
}

.clickable-product-row:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.ux-clean-wrapper {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ux-funnel-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
}

.funnel-metric {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.funnel-metric-label {
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 600;
}

.funnel-metric-val {
  font-size: 1.35rem;
  font-weight: 800;
  color: #0f172a;
}

.funnel-metric.highlight .funnel-metric-val {
  color: #10b981;
}

.ux-rates-row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  font-size: 0.85rem;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.ux-rate-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ux-rate-label {
  color: #64748b;
  font-weight: 500;
}

.device-clean-strip {
  display: flex;
  gap: 28px;
  font-size: 0.85rem;
  color: #475569;
}

.device-clean-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mob-clean-item {
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
}

.mob-clean-item:last-child {
  border-bottom: none;
}

.mob-clean-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.mob-clean-title {
  color: #0f172a;
}

.mob-clean-rev {
  color: #0f172a;
  font-size: 0.9rem;
}

.mob-clean-sub {
  display: flex;
  gap: 8px;
  font-size: 0.78rem;
  color: #64748b;
  align-items: center;
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

.text-mono {
  font-family: 'Cairo', -apple-system, sans-serif !important;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.2px;
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

@media (max-width: 1024px) {
  .charts-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-card.span-2,
.chart-card.span-3 {
    grid-column: 1 / -1;
  }

  .analytics-header-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .analytics-tab-content {
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

  .chart-card.span-2,
.chart-card.span-3 {
    grid-column: span 1 !important;
  }

  .kpi-card .kpi-value {
    font-size: 1.05rem !important;
    white-space: nowrap !important;
    letter-spacing: -0.3px !important;
  }
}

.analytics-header-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  flex: 1;
}

.date-range-bar {
  margin-bottom: 20px;
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

.fill-cash {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.fill-card {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
}

.fill-bank {
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
}

.top-customers-interactive-table .top-cust-row {
  opacity: 1;
  will-change: opacity, transform;
}

.top-customers-interactive-table .top-cust-row.in-view {
  animation: rowFadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: var(--row-delay, 0ms);
}

@media (max-width: 768px) {
  .date-range-bar,
.analytics-header-actions {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    width: 100% !important;
    max-width: 100% !important;
    gap: 8px !important;
    box-sizing: border-box !important;
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

@media print {
  .admin-layout.is-printing-analytics .date-range-bar,
.admin-layout.is-printing-analytics .no-print,
.admin-layout.is-printing-analytics .mobile-analytics-cards-grid {
    display: none !important;
  }

  .admin-layout.is-printing-analytics .analytics-tab-content {
    display: block !important;
    width: 210mm !important;
    max-width: 210mm !important;
    margin: 0 auto !important;
    padding: 8mm 10mm !important;
    box-sizing: border-box !important;
    direction: rtl;
    background: #ffffff !important;
    overflow-x: hidden !important;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .admin-layout.is-printing-analytics .kpi-grid {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 8px !important;
    margin-bottom: 12px !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .admin-layout.is-printing-analytics .charts-grid {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
  }

  .admin-layout.is-printing-analytics .chart-card.span-3,
.admin-layout.is-printing-analytics .chart-card.span-2,
.admin-layout.is-printing-analytics .chart-card:has(table) {
    grid-column: 1 / -1 !important;
  }

  .admin-layout.is-printing-analytics .kpi-card,
.admin-layout.is-printing-analytics .chart-card {
    opacity: 1 !important;
    transform: none !important;
    animation: none !important;
    transition: none !important;
    box-shadow: none !important;
    /* On screen depth comes from shadows; paper has none, so restore a hairline outline. */
    border-color: rgba(15, 23, 42, 0.14) !important;
    min-width: 0 !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .admin-layout.is-printing-analytics .chart-card:has(table) {
    break-inside: auto !important;
    page-break-inside: auto !important;
  }

  .admin-layout.is-printing-analytics .chart-card-header {
    break-after: avoid;
    page-break-after: avoid;
  }

  .admin-layout.is-printing-analytics .table-container {
    overflow: visible !important;
    max-height: none !important;
    mask-image: none !important;
    -webkit-mask-image: none !important;
  }

  .admin-layout.is-printing-analytics .top-cust-row,
.admin-layout.is-printing-analytics .clickable-product-row,
.admin-layout.is-printing-analytics .analytics-tab-content tr {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
    animation: none !important;
  }

  .admin-layout.is-printing-analytics .svg-trend-line {
    stroke-dashoffset: 0 !important;
    animation: none !important;
  }

  .admin-layout.is-printing-analytics .svg-trend-area {
    opacity: 1 !important;
    animation: none !important;
  }

  .admin-layout.is-printing-analytics div.desktop-analytics-table {
    display: block !important;
    overflow: visible !important;
  }

  .admin-layout.is-printing-analytics table.desktop-analytics-table {
    display: table !important;
    width: 100% !important;
    table-layout: auto !important;
  }

  .admin-layout.is-printing-analytics table thead {
    display: table-header-group;
  }

  .admin-layout.is-printing-analytics table tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .admin-layout.is-printing-analytics th,
.admin-layout.is-printing-analytics td {
    overflow-wrap: break-word;
    word-break: normal;
  }
}

.shop-theme-shop2 .dp-day-cell.is-selected {
  background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3) !important;
}

.shop-theme-shop2 .dp-day-cell.is-today {
  border-color: #3b82f6 !important;
  color: #1d4ed8 !important;
}

.shop-theme-shop2 .dp-nav-btn:hover {
  background: rgba(37, 99, 235, 0.12) !important;
  border-color: #3b82f6 !important;
  color: #1d4ed8 !important;
}

.shop-theme-shop2 .btn-datepicker-trigger.active {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16) !important;
}

.shop-theme-shop2 .btn-dp-show-all {
  color: #2563eb !important;
  border-color: rgba(37, 99, 235, 0.25) !important;
}

.shop-theme-shop2 .btn-dp-show-all:hover {
  background: rgba(37, 99, 235, 0.08) !important;
  border-color: #2563eb !important;
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

.skeleton-card {
  pointer-events: none;
  user-select: none;
}

.skeleton-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  flex-shrink: 0;
}

.skeleton-line {
  border-radius: 6px;
}

.skeleton-title-line {
  width: 45%;
  height: 12px;
  margin-bottom: 8px;
}

.skeleton-val-line {
  width: 70%;
  height: 20px;
}

.skeleton-chart-box {
  width: 100%;
  height: 230px;
  border-radius: 12px;
}

.skeleton-table-row {
  width: 100%;
  height: 36px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.clickable-product-row {
  cursor: pointer !important;
  transition: background-color 0.18s ease;
}

.clickable-product-row:hover {
  background: rgba(253, 181, 24, 0.08) !important;
}

.shop-theme-shop2 .clickable-product-row:hover {
  background: rgba(30, 58, 95, 0.08) !important;
}

.ux-insights-card {
  transition-delay: 120ms;
  margin-top: 1.5rem;
  background: #ffffff;
}

.cat-name {
  font-weight: 750;
  color: #0f172a;
}

.top-products-interactive-table th.th-sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.top-products-interactive-table th.th-sortable:hover {
  background-color: rgba(245, 158, 11, 0.08);
  color: #0f172a;
}

.top-products-interactive-table th.th-sortable.active {
  color: #d97706;
}

.shop-theme-shop2 .top-products-interactive-table th.th-sortable:hover {
  background-color: rgba(30, 58, 95, 0.08);
}

.shop-theme-shop2 .top-products-interactive-table th.th-sortable.active {
  color: #1e3a5f;
}

.top-products-interactive-table .clickable-product-row {
  opacity: 1;
  will-change: opacity, transform;
}

.top-products-interactive-table .clickable-product-row.in-view {
  animation: rowFadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: var(--row-delay, 0ms);
}

@media (prefers-reduced-motion: reduce) {
  .bar-fill,
.top-products-interactive-table .clickable-product-row,
.top-customers-interactive-table .top-cust-row,
.kpi-grid .kpi-card,
.svg-trend-area,
.svg-trend-line,
.chart-dot-group {
    animation: none !important;
    transition: none !important;
    opacity: 1 !important;
    transform: none !important;
    stroke-dashoffset: 0 !important;
    width: var(--target-width, auto) !important;
  }
}

.desktop-analytics-table {
  display: table;
  width: 100%;
}

.mobile-analytics-cards-grid {
  display: none;
}

@media (max-width: 768px) {
  .analytics-tab-content,
.analytics-real-content {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 16px !important;
  }

  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
    margin-bottom: 8px !important;
    display: grid !important;
    width: 100% !important;
  }

  .kpi-card {
    padding: 12px 14px !important;
    border-radius: 12px !important;
    gap: 8px !important;
  }

  .kpi-title {
    font-size: 0.76rem !important;
  }

  .kpi-value {
    font-size: 1.18rem !important;
  }

  .kpi-icon-wrap {
    width: 34px !important;
    height: 34px !important;
  }

  .charts-grid {
    grid-template-columns: minmax(0, 1fr) !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 14px !important;
    margin-bottom: 16px !important;
  }

  .chart-card {
    min-width: 0 !important;
    max-width: 100% !important;
    width: 100% !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
    padding: 16px 14px !important;
    border-radius: 14px !important;
  }

  .chart-card.span-2,
.chart-card.span-3 {
    grid-column: span 1 !important;
  }

  .svg-chart-container {
    height: 160px !important;
  }

  .desktop-analytics-table {
    display: none !important;
  }

  .mobile-analytics-cards-grid {
    display: flex !important;
    flex-direction: column !important;
    gap: 0 !important;
    width: 100% !important;
    box-sizing: border-box !important;
    margin-top: 4px !important;
  }

  .mob-clean-item {
    padding: 12px 6px !important;
    border-bottom: 1px solid #f1f5f9 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 4px !important;
    box-sizing: border-box !important;
  }

  .mob-clean-item:last-child {
    border-bottom: none !important;
  }

  .mob-clean-line {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    font-size: 0.88rem !important;
  }

  .mob-clean-title {
    color: #0f172a !important;
    font-weight: 700 !important;
  }

  .mob-clean-rev {
    color: #0f172a !important;
    font-weight: 800 !important;
    font-size: 0.88rem !important;
  }

  .mob-clean-sub {
    display: flex !important;
    gap: 6px !important;
    font-size: 0.76rem !important;
    color: #64748b !important;
    align-items: center !important;
  }

  .ux-funnel-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 12px !important;
    padding: 12px !important;
  }

  .funnel-metric-val {
    font-size: 1.15rem !important;
  }

  .ux-rates-row {
    flex-direction: column !important;
    gap: 8px !important;
    padding-bottom: 8px !important;
  }

  .device-clean-strip {
    flex-direction: row !important;
    justify-content: space-between !important;
    gap: 8px !important;
  }

  .segmented-control {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    display: flex !important;
  }

  .segmented-control .control-pill {
    flex: 1 1 0 !important;
    min-height: 40px !important;
    min-width: 0 !important;
    padding: 6px 2px !important;
    font-size: 0.78rem !important;
    text-align: center !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-sizing: border-box !important;
  }
}

.chart-live-hover-pill,
.chart-peak-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(217, 119, 6, 0.28);
  color: #92400e;
  font-weight: 700;
}

.chart-peak-pill {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #475569;
}

.hover-pill-sep {
  opacity: 0.5;
}

.kpi-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 16px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid transparent;
  box-shadow: var(--admin-card-elevation);
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
  box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1),
  border-color 0.25s ease !important;
  opacity: 0;
  transform: translateY(12px);
  will-change: opacity, transform;
  min-width: 0;
}

.kpi-card:hover {
  transform: translate3d(0, -3px, 0) scale(1.01) !important;
  box-shadow: var(--admin-card-elevation-hover) !important;
}

@media (max-width: 768px) {
  .btn-datepicker-trigger,
.btn-today-shortcut,
.selected-date-badge,
.control-pill,
.segmented-control .control-pill {
    min-height: 44px !important;
    height: auto !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer,
.datepicker-popover {
    animation: none !important;
    transition: none !important;
  }

  .kpi-card,
.kpi-card:hover {
    transition: none !important;
    transform: none !important;
  }
}

@keyframes kpiCardPopIn {
  0% {
    opacity: 0;
    transform: translateY(12px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
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

@keyframes skeletonPulse {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@keyframes rowFadeSlideUp {
  0% {
    opacity: 0;
    transform: translateY(14px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.analytics-header-actions {
  margin-bottom: 16px;
}

.dp-nav-btn {
  position: relative;
}

.dp-nav-btn::after {
  content: '';
  position: absolute;
  inset: -8px;
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

  .control-pill {
    min-height: 44px !important;
    height: auto !important;
  }

  .dp-day-cell {
    min-height: 44px;
  }
}
</style>
