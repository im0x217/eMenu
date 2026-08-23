<template>
  <div class="admin-layout" :class="'shop-theme-' + activeShop">
    <!-- Spinner overlay -->
    <div v-if="loading" class="spinner-overlay">
      <div class="spinner"></div>
      <p class="spinner-text">جاري تحميل البيانات…</p>
    </div>

    <!-- Login Container -->
    <div v-if="!isAuthenticated" class="login-container animate-fade-in">
      <div class="login-card glass-panel">
        <div class="login-header">
          <img :src="loginShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'" alt="Logo" class="login-logo" />
          <h2>لوحة الإدارة الذكية</h2>
          <p>يرجى تسجيل الدخول للوصول إلى لوحة التحكم</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label>حساب المستخدم</label>
            <div class="login-select-wrapper">
              <select v-model="loginForm.username" required class="form-control login-user-select">
                <option value="" disabled>اختر حساب المستخدم…</option>
                <option v-for="u in publicAdminUsers" :key="u.username" :value="u.username">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-left: 4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> {{ u.name }} ({{ u.role === 'admin' ? 'مدير عام' : u.role === 'order_manager' ? 'مدير الطلبات' : 'مستخدم' }})
                </option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>كلمة المرور</label>
            <input v-model="loginForm.password" type="password" required placeholder="أدخل كلمة المرور" class="form-control" />
          </div>

          <div class="form-group">
            <label>المتجر المستهدف</label>
            <div class="shop-select-pills">
              <button type="button" class="shop-pill" :class="{ active: loginShop === 'shop1' }" @click="loginShop = 'shop1'">
                المتجر الرئيسي
              </button>
              <button type="button" class="shop-pill" :class="{ active: loginShop === 'shop2' }" @click="loginShop = 'shop2'">
                قسم النواشف
              </button>
            </div>
          </div>

          <div v-if="loginError" class="alert alert-danger">
            {{ loginError }}
          </div>

          <button type="submit" class="btn btn-primary w-100">تسجيل الدخول</button>
        </form>
      </div>
    </div>



    <!-- Admin Panel Container -->
    <div v-else class="admin-container">
      <!-- Mobile Sidebar Backdrop Overlay -->
      <div v-if="sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false"></div>

      <!-- Sidebar -->
      <aside class="admin-sidebar" :class="{ open: sidebarOpen }">
        <div class="sidebar-brand">
          <img :src="activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'" alt="Logo" class="sidebar-logo" />
          <div>
            <h3>لوحة التحكم</h3>
            <span class="badge">{{ activeShop === 'shop2' ? 'قسم النواشف' : 'المتجر الرئيسي' }}</span>
          </div>
        </div>

        <div class="shop-switcher">
          <label class="switch-label">المتجر الحالي:</label>
          <div class="shop-select-pills compact">
            <button class="shop-pill" :class="{ active: activeShop === 'shop1' }" @click="switchShop('shop1')">رئيسي</button>
            <button class="shop-pill" :class="{ active: activeShop === 'shop2' }" @click="switchShop('shop2')">نواشف</button>
          </div>
        </div>

        <nav class="sidebar-menu">
          <button class="menu-item" :class="{ active: activeTab === 'analytics' }" @click="setTab('analytics')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            <span>الإحصائيات والتقارير</span>
          </button>
          <button class="menu-item" :class="{ active: activeTab === 'products' }" @click="setTab('products')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            <span>إدارة المنتجات</span>
          </button>
          <button class="menu-item" :class="{ active: activeTab === 'categories' }" @click="setTab('categories')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>إدارة الأصناف</span>
          </button>
          <button class="menu-item" :class="{ active: activeTab === 'tags' }" @click="setTab('tags')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
            <span>العلامات المميزة</span>
          </button>
          <button class="menu-item" :class="{ active: activeTab === 'orders' }" @click="setTab('orders')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <span>إدارة الطلبات</span>
          </button>
          <button class="menu-item" :class="{ active: activeTab === 'customers' }" @click="setTab('customers')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>العملاء والمفضلات</span>
          </button>
          <button class="menu-item" :class="{ active: activeTab === 'production' }" @click="setTab('production')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
            <span>إدارة الإنتاج</span>
          </button>
          <button class="menu-item" :class="{ active: activeTab === 'carousel' }" @click="setTab('carousel')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="21" y1="12" x2="3" y2="12"></line><line x1="12" y1="3" x2="12" y2="21"></line></svg>
            <span>البنرات التسويقية</span>
          </button>
          <button v-if="userRole === 'admin'" class="menu-item" :class="{ active: activeTab === 'users' }" @click="setTab('users')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            <span>إدارة المستخدمين</span>
          </button>
        </nav>

        <div class="sidebar-footer">
          <a href="/" class="btn btn-outline w-100 mb-2">معاينة المتجر</a>
          <button @click="handleLogout" class="btn btn-danger w-100">تسجيل الخروج</button>
        </div>
      </aside>

      <!-- Mobile Header -->
      <header class="admin-mobile-header">
        <button class="menu-toggle-btn" @click="sidebarOpen = !sidebarOpen">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <h2>لوحة إدارة e-Menu</h2>
        <img :src="activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'" alt="Logo" class="mobile-logo" />
      </header>

      <!-- Main Content -->
      <main class="admin-main">
        <div class="main-header no-print">
          <h1>{{ tabTitles[activeTab] }}</h1>
          <!-- Period & Actions for Analytics -->
          <div v-if="activeTab === 'analytics'" class="analytics-header-actions">
            <!-- Period Selector -->
            <div class="segmented-control">
              <button v-for="p in periods" :key="p.val" class="control-pill" :class="{ active: analyticsPeriod === p.val }" @click="changePeriod(p.val)">
                {{ p.label }}
              </button>
            </div>
            
            <!-- Quick Action Buttons -->
            <div class="report-actions">
              <button @click="printReport" class="btn btn-sm btn-outline">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="me-1" style="display:inline-block; vertical-align:middle;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                طباعة التقرير
              </button>
              <div class="dropdown-export">
                <button class="btn btn-sm btn-primary">
                  تصدير البيانات CSV
                </button>
                <div class="dropdown-content">
                  <a href="#" @click.prevent="exportReport('orders')">تقرير الطلبات</a>
                  <a href="#" @click.prevent="exportReport('products')">أداء المنتجات</a>
                  <a href="#" @click.prevent="exportReport('customers')">تفاعل العملاء</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Custom Date Range Bar (Standardized Order Management Design) -->
        <div v-if="activeTab === 'analytics' && analyticsPeriod === 'custom'" class="date-range-bar no-print animate-fade-in">
          <div class="date-filter-group">
            <!-- From Date Trigger -->
            <div class="position-relative">
              <button 
                type="button" 
                class="btn-datepicker-trigger" 
                :class="{ active: analyticsFromOpen || analyticsStartDate }"
                @click.stop="openAnalyticsFromPicker"
                title="تاريخ البداية (من)"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span>{{ analyticsStartDate ? ('من: ' + formatArabicDate(analyticsStartDate)) : 'من تاريخ' }}</span>
              </button>

              <!-- From Date Popover -->
              <div v-if="analyticsFromOpen" class="datepicker-popover glass-panel animate-fade-in" @click.stop style="top: calc(100% + 6px); right: 0; z-index: 1200;">
                <div class="datepicker-header">
                  <button type="button" class="dp-nav-btn" @click="analyticsFromPrevMonth" title="الشهر السابق">&lsaquo;</button>
                  <span class="dp-month-title">{{ analyticsFromMonthYearLabel }}</span>
                  <button type="button" class="dp-nav-btn" @click="analyticsFromNextMonth" title="الشهر التالي">&rsaquo;</button>
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

            <!-- To Date Trigger -->
            <div class="position-relative">
              <button 
                type="button" 
                class="btn-datepicker-trigger" 
                :class="{ active: analyticsToOpen || analyticsEndDate }"
                @click.stop="openAnalyticsToPicker"
                title="تاريخ النهاية (إلى)"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span>{{ analyticsEndDate ? ('إلى: ' + formatArabicDate(analyticsEndDate)) : 'إلى تاريخ' }}</span>
              </button>

              <!-- To Date Popover -->
              <div v-if="analyticsToOpen" class="datepicker-popover glass-panel animate-fade-in" @click.stop style="top: calc(100% + 6px); right: 0; z-index: 1200;">
                <div class="datepicker-header">
                  <button type="button" class="dp-nav-btn" @click="analyticsToPrevMonth" title="الشهر السابق">&lsaquo;</button>
                  <span class="dp-month-title">{{ analyticsToMonthYearLabel }}</span>
                  <button type="button" class="dp-nav-btn" @click="analyticsToNextMonth" title="الشهر التالي">&rsaquo;</button>
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

        <!-- Tab Content -->
        <div class="tab-content-wrapper animate-fade-in" :key="activeTab">
          
          <!-- ANALYTICS TAB -->
          <div v-if="activeTab === 'analytics'" class="analytics-tab-content">
            <!-- KPI Cards Grid -->
            <div class="kpi-grid">
              <div class="kpi-card glass-panel">
                <div class="kpi-icon-wrapper sales-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                </div>
                <div class="kpi-info">
                  <span class="kpi-title">إجمالي المبيعات</span>
                  <span class="kpi-value">{{ formatCurrency(analyticsData.kpi.totalRevenue) }}</span>
                </div>
              </div>
              <div class="kpi-card glass-panel">
                <div class="kpi-icon-wrapper orders-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                </div>
                <div class="kpi-info">
                  <span class="kpi-title">إجمالي الطلبات</span>
                  <span class="kpi-value">{{ formatArabicPlural(analyticsData.kpi.orderCount, 'order') }}</span>
                </div>
              </div>
              <div class="kpi-card glass-panel">
                <div class="kpi-icon-wrapper aov-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                </div>
                <div class="kpi-info">
                  <span class="kpi-title">متوسط الطلب</span>
                  <span class="kpi-value">{{ formatCurrency(analyticsData.kpi.avgOrderValue) }}</span>
                </div>
              </div>
              <div class="kpi-card glass-panel">
                <div class="kpi-icon-wrapper customers-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v-2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <div class="kpi-info">
                  <span class="kpi-title">العملاء النشطون</span>
                  <span class="kpi-value">{{ formatArabicPlural(analyticsData.kpi.activeCustomers, 'customer') }}</span>
                </div>
              </div>
            </div>

            <!-- Charts & Metrics Grid -->
            <div class="charts-grid">
              <!-- Sales Trend Chart Card -->
              <div class="chart-card glass-panel span-2">
                <h3 class="chart-title">مؤشر مبيعات الإيرادات (د.ل)</h3>
                <div class="svg-chart-container">
                  <div v-if="analyticsData.revenueTrend.length === 0" class="empty-chart">
                    لا توجد بيانات كافية لرسم المخطط البياني في هذه الفترة.
                  </div>
                  <svg v-else class="svg-line-chart" viewBox="0 0 600 240">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="var(--chart-primary)" stop-opacity="0.4"/>
                        <stop offset="100%" stop-color="var(--chart-primary)" stop-opacity="0.0"/>
                      </linearGradient>
                    </defs>
                    <!-- Grid Lines -->
                    <line x1="40" y1="40" x2="560" y2="40" stroke="#f1f3f5" stroke-dasharray="4"/>
                    <line x1="40" y1="100" x2="560" y2="100" stroke="#f1f3f5" stroke-dasharray="4"/>
                    <line x1="40" y1="160" x2="560" y2="160" stroke="#f1f3f5" stroke-dasharray="4"/>
                    <line x1="40" y1="210" x2="560" y2="210" stroke="#ced4da"/>
                    
                    <!-- Line & Area Paths -->
                    <path :d="svgTrendAreaPath" fill="url(#chartGradient)"/>
                    <path :d="svgTrendLinePath" fill="none" stroke="var(--chart-primary)" stroke-width="3"/>
                    
                    <!-- Dots & Tooltips -->
                    <g v-for="(dot, idx) in trendCoordinates" :key="idx" class="chart-dot-group">
                      <circle :cx="dot.x" :cy="dot.y" r="5" fill="#fff" stroke="var(--chart-primary)" stroke-width="2" />
                      <!-- Hover interaction area -->
                      <circle :cx="dot.x" :cy="dot.y" r="14" fill="transparent" class="dot-hover-trigger">
                        <title>{{ dot.date }}: {{ formatCurrency(dot.val) }}</title>
                      </circle>
                    </g>
                    <!-- X labels -->
                    <text v-for="(label, idx) in trendXLabels" :key="'lbl-'+idx" :x="label.x" y="232" class="chart-text label-x" text-anchor="middle">
                      {{ label.text }}
                    </text>
                  </svg>
                </div>
              </div>

              <!-- Price Mode Split Chart Card -->
              <div class="chart-card glass-panel">
                <h3 class="chart-title">توزيع المبيعات (جملة / مفرد)</h3>
                <div class="split-display">
                  <div class="donut-display">
                    <!-- Custom SVG Donut -->
                    <svg viewBox="0 0 120 120" width="120" height="120">
                      <circle cx="60" cy="60" r="45" fill="none" stroke="#e9ecef" stroke-width="12"/>
                      <circle cx="60" cy="60" r="45" fill="none" stroke="var(--chart-primary)" stroke-width="12" 
                              :stroke-dasharray="donutDashArray" :stroke-dashoffset="donutDashOffset"
                              transform="rotate(-90 60 60)"/>
                    </svg>
                    <div class="donut-center">
                      <span class="donut-percentage">{{ Math.round(priceModePercentages.regular) }}%</span>
                      <span class="donut-sub">مفرد</span>
                    </div>
                  </div>
                  <div class="split-legend">
                    <div class="legend-row">
                      <span class="dot dot-regular"></span>
                      <span class="label">بيع بالمفرد:</span>
                      <span class="val">{{ formatCurrency(analyticsData.priceModeSplit.regular.revenue) }} ({{ formatArabicPlural(analyticsData.priceModeSplit.regular.count, 'order') }})</span>
                    </div>
                    <div class="legend-row mt-2">
                      <span class="dot dot-bulk"></span>
                      <span class="label">بيع بالجملة:</span>
                      <span class="val">{{ formatCurrency(analyticsData.priceModeSplit.bulk.revenue) }} ({{ formatArabicPlural(analyticsData.priceModeSplit.bulk.count, 'order') }})</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Payment Methods Distribution Card -->
              <div class="chart-card glass-panel">
                <h3 class="chart-title">توزيع طرق الدفع (نقدي / بطاقة / تحويل)</h3>
                <div class="payment-methods-breakdown">
                  <!-- Cash Row -->
                  <div class="pm-breakdown-row pm-cash">
                    <div class="pm-icon-title">
                      <div class="pm-badge cash-badge">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                      </div>
                      <div class="pm-details">
                        <span class="pm-name">نقدي (Cash)</span>
                        <span class="pm-count">{{ formatArabicPlural(analyticsData.paymentMethodsSplit.cash.count, 'order') }}</span>
                      </div>
                    </div>
                    <div class="pm-amount">{{ formatCurrency(analyticsData.paymentMethodsSplit.cash.revenue) }}</div>
                  </div>

                  <!-- Card Row -->
                  <div class="pm-breakdown-row pm-card">
                    <div class="pm-icon-title">
                      <div class="pm-badge card-badge">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                      </div>
                      <div class="pm-details">
                        <span class="pm-name">بطاقة مصرفية (Card)</span>
                        <span class="pm-count">{{ formatArabicPlural(analyticsData.paymentMethodsSplit.card.count, 'order') }}</span>
                      </div>
                    </div>
                    <div class="pm-amount">{{ formatCurrency(analyticsData.paymentMethodsSplit.card.revenue) }}</div>
                  </div>

                  <!-- Bank Transfer Row -->
                  <div class="pm-breakdown-row pm-bank">
                    <div class="pm-icon-title">
                      <div class="pm-badge bank-badge">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"></path></svg>
                      </div>
                      <div class="pm-details">
                        <span class="pm-name">تحويل بنكي (Bank)</span>
                        <span class="pm-count">{{ formatArabicPlural(analyticsData.paymentMethodsSplit.bank_transfer.count, 'order') }}</span>
                      </div>
                    </div>
                    <div class="pm-amount">{{ formatCurrency(analyticsData.paymentMethodsSplit.bank_transfer.revenue) }}</div>
                  </div>
                </div>
              </div>

              <!-- Category Sales Share Card -->
              <div class="chart-card glass-panel span-2">
                <h3 class="chart-title">أداء الفئات والأصناف</h3>
                <div class="bar-chart-list">
                  <div v-if="analyticsData.categorySales.length === 0" class="empty-list">لا توجد أصناف مبيعات.</div>
                  <div v-for="cat in analyticsData.categorySales" :key="cat.category" class="category-bar-row">
                    <div class="bar-info">
                      <span class="cat-name">{{ cat.category }}</span>
                      <span class="cat-val">{{ formatCurrency(cat.revenue) }} ({{ formatArabicPlural(cat.count, 'order') }})</span>
                    </div>
                    <div class="bar-gauge">
                      <div class="bar-fill" :style="{ width: getCategoryBarWidth(cat.revenue) + '%' }"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Top Favorites Snapshot Card -->
              <div class="chart-card glass-panel">
                <h3 class="chart-title">أكثر المنتجات تفضيلاً</h3>
                <div class="list-cards">
                  <div v-if="activeTopFavorites.length === 0" class="empty-list">لا توجد تفضيلات بعد.</div>
                  <div v-for="(fav, idx) in activeTopFavorites" :key="idx" class="list-item-row">
                    <div class="list-badge">{{ idx + 1 }}</div>
                    <div class="list-item-info">
                      <span class="title">{{ fav.name }}</span>
                      <span class="subtitle">تم التفضيل بواسطة {{ formatArabicPlural(fav.count, 'customer') }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Top Products Card -->
              <div class="chart-card glass-panel span-2">
                <h3 class="chart-title">المنتجات الأكثر مبيعاً</h3>
                <div class="table-container">
                  <table class="admin-table">
                    <thead>
                      <tr>
                        <th>اسم المنتج</th>
                        <th>الكمية المباعة</th>
                        <th>إجمالي الإيراد</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="activeTopProducts.length === 0">
                        <td colspan="3" class="text-center">لا توجد منتجات مباعة.</td>
                      </tr>
                      <tr v-for="prod in activeTopProducts" :key="prod.productId">
                        <td>{{ prod.name }}</td>
                        <td class="text-mono text-bold">{{ formatArabicPlural(prod.quantity, 'unit') }}</td>
                        <td class="text-mono text-bold text-primary">{{ formatCurrency(prod.revenue) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Top Customers Card -->
              <div class="chart-card glass-panel">
                <h3 class="chart-title">كبار العملاء (إنفاقاً)</h3>
                <div class="table-container">
                  <table class="admin-table">
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>رقم الهاتف</th>
                        <th>الإنفاق</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="analyticsData.topCustomers.length === 0">
                        <td colspan="3" class="text-center">لا توجد بيانات عملاء.</td>
                      </tr>
                      <tr v-for="cust in analyticsData.topCustomers" :key="cust.phone">
                        <td>{{ cust.name }}</td>
                        <td class="text-mono">{{ cust.phone }}</td>
                        <td class="text-semibold text-mono text-primary">{{ formatCurrency(cust.totalSpent) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            <!-- Actionable Insights Grid -->
            <!-- Inactive Customers Card -->
              <div class="chart-card glass-panel">
                <div class="card-header-with-badge">
                  <h3 class="chart-title">عملاء غائبون (بحاجة لتنشيط)</h3>
                  <span class="badge badge-warning">آخر ظهور قديم</span>
                </div>
                <div class="table-container">
                  <table class="admin-table">
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>رقم الهاتف</th>
                        <th>آخر نشاط</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="analyticsData.inactiveCustomers.length === 0">
                        <td colspan="3" class="text-center">جميع العملاء نشطون في هذه الفترة!</td>
                      </tr>
                      <tr v-for="cust in analyticsData.inactiveCustomers" :key="cust.phone">
                        <td>{{ cust.name }}</td>
                        <td>{{ cust.phone }}</td>
                        <td class="text-muted">{{ new Date(cust.lastActive).toLocaleDateString('ar-LY') }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Low Performing Products Card -->
              <div class="chart-card glass-panel span-2">
                <div class="card-header-with-badge">
                  <h3 class="chart-title">منتجات خاملة (0 مبيعات في هذه الفترة)</h3>
                  <span class="badge badge-danger">مبيعات منخفضة</span>
                </div>
                <div class="table-container">
                  <table class="admin-table">
                    <thead>
                      <tr>
                        <th>اسم المنتج</th>
                        <th>الفئة</th>
                        <th>السعر</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="activeLowPerformingProducts.length === 0">
                        <td colspan="3" class="text-center">لا توجد منتجات خاملة، كل المنتجات تحقق مبيعات!</td>
                      </tr>
                      <tr v-for="prod in activeLowPerformingProducts" :key="prod.productId">
                        <td>{{ prod.name }}</td>
                        <td>{{ prod.category }}</td>
                        <td class="text-semibold">{{ formatCurrency(prod.price) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- PRODUCTS CRUD TAB -->
          <div v-if="activeTab === 'products'" class="products-tab-content">
            <div class="table-card glass-panel overflow-hidden">
              <div class="card-toolbar card-toolbar-split">
                <div class="card-toolbar-top">
                  <div class="toolbar-title-group">
                    <h3 class="toolbar-title">إدارة قائمة المنتجات</h3>
                    <span class="toolbar-badge">{{ formatArabicPlural(filteredProducts.length, 'product') }}</span>
                  </div>
                  <button @click="openProductModal()" class="btn btn-primary">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" class="me-1" style="display:inline-block; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    إضافة منتج جديد
                  </button>
                </div>
                <div class="card-toolbar-bottom">
                  <div class="search-input-wrapper">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" class="search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input v-model="filters.search" type="text" name="search" autocomplete="off" placeholder="البحث بالاسم أو الوصف…" class="form-control search-input" />
                  </div>
                  <div class="filters-inline">
                    <select v-model="filters.category" class="form-control select-pill">
                      <option value="">كل الأصناف</option>
                      <option v-for="cat in categories" :key="cat._id" :value="cat.name">{{ cat.name }}</option>
                    </select>
                    <select v-if="availableSubcategories.length > 0" v-model="filters.subCategory" class="form-control select-pill animate-fade-in">
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
                    <tr v-if="filteredProducts.length === 0">
                      <td colspan="10" class="text-center">لا توجد منتجات مطابقة لخيارات التصفية.</td>
                    </tr>
                    <tr v-for="prod in paginatedProducts" :key="prod._id">
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
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                          </div>
                        </div>
                      </td>
                      <td class="text-bold">{{ prod.name }}</td>
                      <td>
                        {{ prod.category }}
                        <span v-if="prod.subCategory" class="badge-sub">{{ prod.subCategory }}</span>
                      </td>
                      <td class="text-mono text-bold">{{ prod.price_regular ? formatCurrency(prod.price_regular) : '-' }}</td>
                      <td class="text-mono text-bold">{{ prod.price_bulk ? formatCurrency(prod.price_bulk) : '-' }}</td>
                      <td class="text-mono text-bold text-muted">{{ prod.makingCost !== undefined && prod.makingCost !== null ? formatCurrency(prod.makingCost) : formatCurrency(0) }}</td>
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
                          <span class="mob-price-pill regular text-mono">مفرد: {{ prod.price_regular ? formatCurrency(prod.price_regular) : '-' }}</span>
                          <span v-if="prod.price_bulk" class="mob-price-pill bulk text-mono">جملة: {{ formatCurrency(prod.price_bulk) }}</span>
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
              <div v-if="productsTotalPages > 1" class="admin-pagination-bar">
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    <span class="btn-text-desktop">السابق</span>
                  </button>

                  <div class="pagination-pills">
                    <button 
                      v-for="(p, pIdx) in productsVisiblePages" 
                      :key="'prod-page-'+pIdx" 
                      class="page-num-pill" 
                      :class="{ active: productsPage === p, ellipsis: p === '...' }" 
                      :disabled="p === '...'"
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- CATEGORIES CRUD TAB -->
          <div v-if="activeTab === 'categories'" class="categories-tab-content">
            <div class="table-card glass-panel overflow-hidden">
              <div class="card-toolbar card-toolbar-split">
                <div class="card-toolbar-top">
                  <div class="toolbar-title-group">
                    <h3 class="toolbar-title">إدارة أصناف المنيو</h3>
                    <span class="toolbar-badge">{{ formatArabicPlural(categories.length, 'category') }}</span>
                  </div>
                  <button @click="openCategoryModal()" class="btn btn-primary">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" class="me-1" style="display:inline-block; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    إضافة صنف جديد
                  </button>
                </div>
              </div>

              <div class="table-container">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th style="width: 80px;">الرمز</th>
                      <th>اسم الصنف</th>
                      <th>الأصناف الفرعية</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="categories.length === 0">
                      <td colspan="4" class="text-center">لا توجد أصناف مدخلة.</td>
                    </tr>
                    <tr v-for="cat in categories" :key="cat._id">
                      <td class="text-center">
                        <div class="cat-icon-badge">
                          <CategoryIcon :icon="cat.icon" :name="cat.name" :emoji="cat.emoji" />
                        </div>
                      </td>
                      <td class="text-bold">{{ cat.name }}</td>
                      <td>
                        <div class="chips-list">
                          <span v-if="!cat.subCategories || cat.subCategories.length === 0" class="text-muted text-small">لا يوجد أصناف فرعية</span>
                          <span v-for="sub in cat.subCategories" :key="sub" class="sub-chip">{{ sub }}</span>
                        </div>
                      </td>
                      <td>
                        <div class="btn-group-row">
                          <button @click="openCategoryModal(cat)" class="btn btn-sm btn-outline">تعديل</button>
                          <button @click="deleteCategory(cat._id)" class="btn btn-sm btn-danger">حذف</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAGS MANAGEMENT TAB -->
          <div v-if="activeTab === 'tags'" class="tags-tab-content animate-fade-in">
            <div class="table-card glass-panel overflow-hidden">
              <div class="card-toolbar card-toolbar-split">
                <div class="card-toolbar-top">
                  <div class="toolbar-title-group">
                    <h3 class="toolbar-title">إدارة العلامات المميزة (Tags)</h3>
                    <span class="toolbar-badge">{{ formatArabicPlural(tags.length, 'tag') }}</span>
                  </div>
                  <button @click="openTagModal()" class="btn btn-primary">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" class="me-1" style="display:inline-block; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    إضافة علامة مميزة
                  </button>
                </div>
              </div>

              <div class="table-container">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>اسم العلامة</th>
                      <th>معاينة الشكل واللون (Hugeicons SVG)</th>
                      <th style="width: 150px; text-align: center;">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="tags.length === 0">
                      <td colspan="3" class="text-center p-4">لا توجد علامات مميزة مدخلة.</td>
                    </tr>
                    <tr v-for="t in tags" :key="t._id">
                      <td class="text-bold">{{ t.name }}</td>
                      <td>
                        <span class="tag-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg" :class="'tag-' + (t.color || 'default')">
                          <CategoryIcon :icon="t.icon" :name="t.name" size="16" />
                          <span>{{ t.name }}</span>
                        </span>
                      </td>
                      <td>
                        <div class="order-actions-btns" style="justify-content: center;">
                          <button @click="openTagModal(t)" class="btn-table-action btn-action-edit" title="تعديل العلامة">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            <span>تعديل</span>
                          </button>
                          <button @click="deleteTag(t._id)" class="btn-table-action" style="color: #ef4444; border-color: #fca5a5;" title="حذف العلامة">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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



          <!-- MARKETING CAROUSEL TAB -->
          <div v-if="activeTab === 'carousel'" class="carousel-tab-content animate-fade-in">
            <div class="table-card glass-panel overflow-hidden p-0">
              <div class="card-toolbar card-toolbar-split">
                <div class="card-toolbar-top">
                  <div class="toolbar-title-group">
                    <h3 class="toolbar-title">بنرات العروض التسويقية</h3>
                    <span class="toolbar-badge">{{ carouselItems.length }} بنر</span>
                  </div>
                  <button @click="openCarouselModal()" class="btn btn-primary">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" class="me-1" style="display:inline-block; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    إضافة بنر جديد
                  </button>
                </div>
              </div>

              <div class="p-3">
                <div v-if="carouselItems.length > 0" class="carousel-grid">
                  <div v-for="item in carouselItems" :key="item._id" class="carousel-admin-card glass-panel animate-scale-in">
                    <div class="card-image-wrapper">
                      <div class="admin-banner-shimmer"></div>
                      <img :src="item.image" alt="Banner Preview" class="card-image" loading="lazy" decoding="async" @click="zoomImage(item.image)" title="انقر لتكبير المعاينة" />
                    </div>
                    <div class="card-info-bar">
                      <span class="card-date">تاريخ الإضافة: {{ new Date(item.createdAt).toLocaleDateString('ar-LY') }}</span>
                      <div style="display: flex; gap: 8px;">
                        <button @click="openCarouselModal(item)" class="btn btn-outline btn-sm flex-center" style="border-color: #ced4da; color: #495057;">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-1">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path>
                          </svg>
                          <span>تعديل</span>
                        </button>
                        <button @click="deleteCarouselItem(item._id)" class="btn btn-danger btn-sm flex-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-1">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="text-center p-5 text-muted">
                  لا توجد بنرات عروض تسويقية مضافة حالياً. اضغط على زر "إضافة بنر جديد" للبدء.
                </div>
              </div>
            </div>
          </div>

          <!-- ORDERS MANAGEMENT TAB -->
          <div v-if="activeTab === 'orders'" class="orders-tab-content animate-fade-in">
            <div class="table-card glass-panel overflow-hidden">
              <div class="card-toolbar card-toolbar-split orders-toolbar-container">
                <div class="card-toolbar-top">
                  <div class="toolbar-title-group">
                    <h3 class="toolbar-title">سجل الطلبات الواردة</h3>
                    <span class="toolbar-badge">{{ formatArabicPlural(filteredOrders.length, 'order') }}</span>
                  </div>
                  <button @click="openNewOrderModal" class="btn btn-primary btn-make-order" title="إنشاء طلب جديد للعميل">
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.5" class="me-1" style="display:inline-block; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>إنشاء طلب جديد</span>
                  </button>
                </div>

                <!-- Row 1: Search Bar aligned with Print Button -->
                <div class="orders-search-print-row">
                  <div class="search-input-wrapper">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" class="search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input id="order-search-input" v-model="orderFilters.search" type="text" name="search" autocomplete="off" placeholder="البحث برقم الطلب، رقم الهاتف أو اسم العميل…" class="form-control search-input" />
                  </div>
                  <button @click="printReconciliation" class="btn btn-outline btn-sm flex-center reconciliation-print-btn" title="طباعة كشف تسوية المبيعات للتاريخ المحدد">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    <span>كشف التسوية</span>
                  </button>
                </div>

                <!-- Row 2: Status Filter (under search bar) aligned with Date Buttons -->
                <div class="orders-filters-row">
                  <div class="filters-inline">
                    <select v-model="orderFilters.status" class="form-control select-pill order-status-select">
                      <option value="">كل الحالات</option>
                      <option value="pending">قيد الانتظار (Pending)</option>
                      <option value="ready">جاهز للاستلام (Ready)</option>
                      <option value="received">تم الاستلام (Received)</option>
                      <option value="cancelled">ملغي (Cancelled)</option>
                    </select>

                    <!-- Custom Date Filter Component Group -->
                    <div class="date-filter-group">
                      <!-- Date Picker Trigger Button -->
                      <button 
                        type="button" 
                        class="btn-datepicker-trigger" 
                        :class="{ active: datePickerOpen || orderFilters.selectedDate }"
                        @click.stop="datePickerOpen = !datePickerOpen"
                        title="التصفية بحسب تاريخ الاستلام"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span>تاريخ الاستلام</span>
                      </button>

                      <!-- Today Shortcut Button -->
                      <button 
                        type="button" 
                        class="btn-today-shortcut" 
                        :class="{ active: isTodaySelected }" 
                        @click="setOrderTodayDate"
                        title="عرض طلبات اليوم فقط"
                      >اليوم</button>

                      <!-- Selected Date Display Badge (Displayed after Today button in RTL reading order) -->
                      <div v-if="orderFilters.selectedDate" class="selected-date-badge animate-fade-in">
                        <span class="date-text">{{ formatArabicDate(orderFilters.selectedDate) }}</span>
                        <button type="button" class="btn-remove-date" @click="orderFilters.selectedDate = ''" title="إلغاء التصفية بالتاريخ">&times;</button>
                      </div>

                      <!-- Custom Date Picker Popover Panel -->
                      <div v-if="datePickerOpen" class="datepicker-popover glass-panel animate-fade-in" @click.stop>
                        <div class="datepicker-header">
                          <button type="button" class="dp-nav-btn" @click="prevMonth" title="الشهر السابق">&lsaquo;</button>
                          <span class="dp-month-title">{{ currentMonthYearLabel }}</span>
                          <button type="button" class="dp-nav-btn" @click="nextMonth" title="الشهر التالي">&rsaquo;</button>
                        </div>

                        <div class="dp-weekdays">
                          <span>أح</span><span>إث</span><span>ثلا</span><span>أرب</span><span>خم</span><span>جم</span><span>سب</span>
                        </div>

                        <div class="dp-days-grid">
                          <button 
                            type="button"
                            v-for="(dayObj, idx) in calendarDays" 
                            :key="idx"
                            class="dp-day-cell"
                            :class="{ 
                              'other-month': !dayObj.inMonth,
                              'is-today': dayObj.isToday,
                              'is-selected': orderFilters.selectedDate === dayObj.dateStr
                            }"
                            @click="selectDateFromPicker(dayObj.dateStr)"
                          >
                            {{ dayObj.dayNum }}
                          </button>
                        </div>

                        <div class="datepicker-footer">
                          <button type="button" class="btn-dp-show-all" @click="orderFilters.selectedDate = ''; datePickerOpen = false;">عرض جميع التواريخ</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="table-container">
                <table class="admin-table desktop-orders-table">
                  <thead>
                    <tr>
                      <th>رقم الطلب</th>
                      <th>تاريخ الطلب</th>
                      <th>العميل</th>
                      <th>المنتجات المطلوبة</th>
                      <th>المجموع</th>
                      <th>حالة الدفع</th>
                      <th>نوع السعر</th>
                      <th>الحالة</th>
                      <th>إجراءات</th>
</tr>
                  </thead>
                  <tbody>
                    <tr v-if="filteredOrders.length === 0">
                      <td colspan="9" class="text-center p-4">لا توجد طلبات متطابقة.</td>
                    </tr>
                    <tr v-for="order in paginatedOrders" :key="order._id">
                      <td class="text-bold text-mono">
                        <span class="order-id-pill">#{{ order.orderNumber || order._id.toString().slice(-6) }}</span>
                      </td>
                      <td class="text-mono text-small">{{ new Date(order.createdAt).toLocaleString('ar-LY') }}</td>
                      <td>
                        <div class="customer-info-cell">
                          <span class="name block text-bold">{{ order.customerInfo.name }}</span>
                          <span class="phone text-muted block text-mono" style="direction: ltr; display: inline-block;">{{ order.customerInfo.phone }}</span>
                        </div>
                      </td>
                      <td>
                        <div class="items-list-cell">
                          <div v-for="(item, idx) in order.items" :key="idx" class="item-line">
                            <span class="item-name">{{ item.name }}</span>
                            <span class="item-qty-badge">× {{ item.quantity }}</span>
                            <span v-if="item.notes" class="item-note">({{ item.notes }})</span>
                          </div>
                        </div>
                      </td>
                      <td class="text-bold text-primary text-mono">{{ formatCurrency(order.totalPrice) }}</td>
                      <td class="text-nowrap">
                        <button 
                          type="button" 
                          class="payment-status-badge" 
                          :class="[order.paymentStatus || 'unpaid', { 'is-cancelled': order.status === 'cancelled' }]" 
                          @click="order.status !== 'cancelled' && openPaymentModal(order.customerInfo, order)"
                          :title="order.status === 'cancelled' ? 'الطلب ملغي' : (order.paymentStatus === 'paid' ? 'تم دفع الطلب بالكامل — انقر لعرض رصيد العميل' : 'انقر لتسجيل دفع لهذا الطلب')"
                        >
                          <span class="badge-icon">
                            <svg v-if="order.paymentStatus === 'paid'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <svg v-else-if="order.paymentStatus === 'partial'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                          </span>
                          <span class="badge-text">
                            <template v-if="order.paymentStatus === 'paid'">خالص</template>
                            <template v-else-if="order.paymentStatus === 'partial'">جزئي {{ formatCurrency(order.paidAmount || 0) }}</template>
                            <template v-else>غير خالص</template>
                          </span>
                        </button>
                      </td>
                      <td>
                        <span class="price-mode-badge" :class="order.priceMode">
                          {{ order.priceMode === 'bulk' ? 'جملة' : 'مفرد' }}
                        </span>
                      </td>
                      <td>
                        <select :value="order.status" @change="updateOrderStatus(order._id, $event.target.value)" class="form-control status-select" :class="'status-' + order.status">
                          <option value="pending">قيد الانتظار</option>
                          <option value="ready">جاهز للاستلام</option>
                          <option value="received">تم الاستلام</option>
                          <option value="cancelled">ملغي</option>
                        </select>
                      </td>
                      <td>
                        <div class="order-actions-btns">
                          <button @click="openOrderEditModal(order)" class="btn-table-action btn-action-edit" title="تعديل محتويات الطلب">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            <span>تعديل</span>
                          </button>
                          <button @click="printOrder(order)" class="btn-table-action btn-action-print" title="طباعة فاتورة الطلب">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            <span>طباعة</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- Mobile Orders Cards Grid (Active on screens <= 768px) -->
                <div class="mobile-orders-cards-grid">
                  <div v-if="filteredOrders.length === 0" class="mobile-empty-card glass-panel">
                    <span>لا توجد طلبات متطابقة.</span>
                  </div>
                  <div 
                    v-for="order in paginatedOrders" 
                    :key="'mob-ord-' + order._id"
                    class="mobile-order-card glass-panel"
                    :class="'border-status-' + order.status"
                  >
                    <!-- Card Top Header -->
                    <div class="mob-card-header">
                      <div class="mob-card-id-group">
                        <span class="order-id-pill">#{{ order.orderNumber || order._id.toString().slice(-6) }}</span>
                        <span class="price-mode-badge" :class="order.priceMode">
                          {{ order.priceMode === 'bulk' ? 'جملة' : 'مفرد' }}
                        </span>
                        <span v-if="order.printed" class="order-printed-tag" title="تمت الطباعة">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                          <span>مطبوع</span>
                        </span>
                      </div>
                      <span class="mob-card-time text-mono">{{ new Date(order.createdAt).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' }) }}</span>
                    </div>

                    <!-- Customer Row with Fast Actions -->
                    <div class="mob-card-customer-row">
                      <div class="mob-cust-details">
                        <span class="mob-cust-name font-bold">{{ order.customerInfo.name }}</span>
                        <span class="mob-cust-phone text-mono" dir="ltr">{{ order.customerInfo.phone }}</span>
                      </div>
                      <div class="mob-cust-quick-actions">
                        <a :href="getLibyanWhatsAppUrl(order.customerInfo.phone)" target="_blank" class="mob-action-circle whatsapp-circle" title="مراسلة عبر واتساب">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                        </a>
                        <a :href="'tel:' + order.customerInfo.phone" class="mob-action-circle call-circle" title="اتصال">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </a>
                      </div>
                    </div>

                    <!-- Items List Summary -->
                    <div class="mob-card-items-list">
                      <div v-for="(item, idx) in order.items" :key="idx" class="mob-item-chip">
                        <span class="mob-item-name">{{ item.name }}</span>
                        <span class="mob-item-qty">× {{ item.quantity }}</span>
                        <span v-if="item.notes" class="mob-item-note">({{ item.notes }})</span>
                      </div>
                    </div>

                    <!-- Delivery Date & Notes if exists -->
                    <div v-if="order.deliveryDate || order.notes" class="mob-card-meta-row">
                      <span v-if="order.deliveryDate" class="mob-meta-delivery">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span>استلام: {{ formatArabicDate(order.deliveryDate) }}</span>
                      </span>
                      <span v-if="order.notes" class="mob-meta-note">
                        <span>ملاحظة: {{ order.notes }}</span>
                      </span>
                    </div>

                    <!-- Price & Payment Summary Row -->
                    <div class="mob-card-price-row">
                      <div class="mob-price-group">
                        <span class="mob-price-label">المجموع:</span>
                        <span class="mob-price-val text-mono font-bold">{{ formatCurrency(order.totalPrice) }}</span>
                      </div>
                      <button 
                        type="button" 
                        class="payment-status-badge" 
                        :class="[order.paymentStatus || 'unpaid', { 'is-cancelled': order.status === 'cancelled' }]" 
                        @click="order.status !== 'cancelled' && openPaymentModal(order.customerInfo, order)"
                      >
                        <span class="badge-icon">
                          <svg v-if="order.paymentStatus === 'paid'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          <svg v-else-if="order.paymentStatus === 'partial'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        </span>
                        <span class="badge-text">
                          <template v-if="order.paymentStatus === 'paid'">خالص</template>
                          <template v-else-if="order.paymentStatus === 'partial'">جزئي {{ formatCurrency(order.paidAmount || 0) }}</template>
                          <template v-else>غير خالص</template>
                        </span>
                      </button>
                    </div>

                    <!-- Card Action Buttons & Status Selector -->
                    <div class="mob-card-footer-actions">
                      <select :value="order.status" @change="updateOrderStatus(order._id, $event.target.value)" class="form-control status-select mob-status-select" :class="'status-' + order.status">
                        <option value="pending">قيد الانتظار</option>
                        <option value="ready">جاهز للاستلام</option>
                        <option value="received">تم الاستلام</option>
                        <option value="cancelled">ملغي</option>
                      </select>

                      <div class="mob-action-buttons-group">
                        <button @click="openOrderEditModal(order)" class="btn-table-action btn-action-edit" title="تعديل">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          <span>تعديل</span>
                        </button>
                        <button @click="printOrder(order)" class="btn-table-action btn-action-print" title="طباعة">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                          <span>طباعة</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Orders Table Numbered Pagination Bar -->
              <div v-if="ordersTotalPages > 1" class="admin-pagination-bar">
                <div class="pagination-info">
                  <span>عرض <strong>{{ (ordersPage - 1) * ordersPerPage + 1 }}</strong> - <strong>{{ Math.min(ordersPage * ordersPerPage, filteredOrders.length) }}</strong> من أصل <strong>{{ filteredOrders.length }}</strong> طلب</span>
                </div>

                <div class="pagination-controls-group">
                  <button 
                    class="pagination-btn prev-btn" 
                    :disabled="ordersPage === 1" 
                    @click="ordersPage--" 
                    title="الصفحة السابقة"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    <span class="btn-text-desktop">السابق</span>
                  </button>

                  <div class="pagination-pills">
                    <button 
                      v-for="(p, pIdx) in ordersVisiblePages" 
                      :key="'ord-page-'+pIdx" 
                      class="page-num-pill" 
                      :class="{ active: ordersPage === p, ellipsis: p === '...' }" 
                      :disabled="p === '...'"
                      @click="typeof p === 'number' && (ordersPage = p)"
                    >
                      {{ p }}
                    </button>
                  </div>

                  <button 
                    class="pagination-btn next-btn" 
                    :disabled="ordersPage >= ordersTotalPages" 
                    @click="ordersPage++" 
                    title="الصفحة التالية"
                  >
                    <span class="btn-text-desktop">التالي</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

    <!-- New Fast Order Modal (POS Mode) -->
    <div v-if="newOrderModalOpen" class="modal-overlay animate-fade-in" @click.self="newOrderModalOpen = false">
      <div class="modal-content glass-panel fast-order-modal">
        
        <!-- Modal Header -->
        <div class="fast-order-header">
          <div class="fast-order-title-group">
            <div class="new-order-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            </div>
            <div>
              <div class="fast-order-title-row">
                <h3>إنشاء طلب جديد</h3>
                <span class="shop-badge-indicator" :class="activeShop === 'shop2' ? 'shop2-badge' : 'shop1-badge'">
                  {{ activeShop === 'shop2' ? 'قسم النواشف' : 'المتجر الرئيسي' }}
                </span>
              </div>
              <p class="fast-order-subtitle">إدخال سريع لطلبات الزبائن مع تسعير فوري وخيارات تسليم ودفع مرنة</p>
            </div>
          </div>

          <!-- Price Mode Segmented Switch -->
          <div class="fast-order-price-mode-switch">
            <button 
              type="button" 
              class="price-mode-pill" 
              :class="{ active: newOrder.priceMode === 'regular' }" 
              @click="onNewOrderPriceModeChange('regular')"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              <span>تسعير مفرد</span>
            </button>
            <button 
              type="button" 
              class="price-mode-pill" 
              :class="{ active: newOrder.priceMode === 'bulk' }" 
              @click="onNewOrderPriceModeChange('bulk')"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              <span>تسعير جملة</span>
            </button>
          </div>

          <button @click="newOrderModalOpen = false" class="modal-close-btn" aria-label="إغلاق">✕</button>
        </div>

        <form @submit.prevent="submitNewOrder" class="fast-order-form-body">
          <div class="fast-order-grid-layout">
            
            <!-- RIGHT COLUMN: Customer & Order Details (RTL First) -->
            <div class="fast-order-side-col">
              
              <!-- Customer Section -->
              <div class="pos-section-card">
                <div class="pos-card-header">
                  <div class="pos-card-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span>بيانات العميل</span>
                  </div>
                  <span v-if="newOrder.customerPhone" class="pos-cust-status-badge" :class="customers.find(c => c.phone === newOrder.customerPhone) ? 'is-registered' : 'is-new'">
                    {{ customers.find(c => c.phone === newOrder.customerPhone) ? 'عميل مسجل' : 'عميل جديد' }}
                  </span>
                </div>

                <!-- Customer Quick Search -->
                <div class="customer-search-autocomplete-wrapper position-relative">
                  <div class="search-input-wrapper">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" class="search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input 
                      ref="newOrderCustomerInputRef"
                      v-model="newOrderCustomerSearch" 
                      type="text" 
                      class="form-control search-input" 
                      placeholder="البحث برقم الهاتف أو اسم العميل…" 
                      @focus="showNewOrderCustomerSuggestions = true" @click="showNewOrderCustomerSuggestions = true"
                      @blur="closeNewOrderCustomerSuggestionsWithDelay" @input="showNewOrderCustomerSuggestions = true; highlightedCustomerIndex = 0" @keydown.esc.prevent="showNewOrderCustomerSuggestions = false" @keydown.tab="showNewOrderCustomerSuggestions = false" @keydown.down.prevent="navigateCustomerSuggestions(1)"
                      @keydown.up.prevent="navigateCustomerSuggestions(-1)"
                      @keydown.enter.prevent="selectHighlightedCustomerOrNext"
                    />
                    <button v-if="newOrderCustomerSearch" type="button" @click="clearSelectedCustomerForNewOrder" class="btn-clear-search" tabindex="-1">&times;</button>
                  </div>

                  <!-- Dropdown Suggestions -->
                  <div v-if="showNewOrderCustomerSuggestions && filteredNewOrderCustomers.length > 0" class="autocomplete-suggestions-dropdown customer-suggestions-dropdown animate-fade-in">
                    <div 
                      v-for="(cust, cIdx) in filteredNewOrderCustomers" 
                      :key="cust._id" 
                      class="suggestion-item customer-suggestion-item"
                      :class="{ highlighted: cIdx === highlightedCustomerIndex }"
                      @mousedown="selectCustomerForNewOrder(cust); focusProductSearch();"
                      @mouseenter="highlightedCustomerIndex = cIdx"
                    >
                      <div class="cust-avatar-sm">{{ (cust.name || 'ع').charAt(0) }}</div>
                      <div class="cust-info-group">
                        <span class="cust-sugg-name">{{ cust.name }}</span>
                        <span class="cust-sugg-phone text-mono">{{ cust.phone }}</span>
                      </div>
                      <div class="cust-badge-stats">
                        <span class="badge-orders">{{ formatArabicPlural(cust.orderCount || 0, 'order') }}</span>
                        <span v-if="cust.outstandingBalance > 0" class="badge-balance-debt">{{ formatCurrency(cust.outstandingBalance) }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Inputs Row -->
                <div class="pos-input-grid">
                  <div class="pos-field">
                    <label class="pos-label">اسم العميل *</label>
                    <input v-model="newOrder.customerName" type="text" class="form-control pos-control" placeholder="محمد علي" required />
                  </div>
                  <div class="pos-field">
                    <label class="pos-label">رقم الهاتف *</label>
                    <input v-model="newOrder.customerPhone" type="tel" dir="ltr" class="form-control pos-control text-mono text-center" placeholder="09xxxxxxxx" required />
                  </div>
                </div>
              </div>

              <!-- Delivery & Payment Card (Clean & Minimized) -->
              <div class="pos-section-card pos-delivery-payment-card">
                <div class="pos-card-header">
                  <div class="pos-card-title">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    <span>التسليم والحالة والسداد</span>
                  </div>
                </div>

                <div class="pos-fields-stack">
                  <!-- Row 1: Delivery Date & Order Status -->
                  <div class="pos-input-grid">
                    <div class="pos-field">
                      <label class="pos-label">تاريخ الاستلام</label>
                      <div class="position-relative">
                        <button 
                          type="button" 
                          class="form-control pos-control btn-standard-datepicker-trigger" 
                          :class="{ active: posDatePickerOpen }"
                          @click.stop="posDatePickerOpen = !posDatePickerOpen"
                        >
                          <span class="font-bold">{{ newOrder.deliveryDate ? formatArabicDate(newOrder.deliveryDate) : 'اختر تاريخ الاستلام…' }}</span>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </button>

                        <!-- Standardized Popover Calendar for POS Modal -->
                        <div v-if="posDatePickerOpen" class="datepicker-popover glass-panel animate-fade-in" @click.stop style="top: calc(100% + 4px); right: 0; z-index: 1200;">
                          <div class="datepicker-header">
                            <button type="button" class="dp-nav-btn" @click="posPrevMonth" title="الشهر السابق">&lsaquo;</button>
                            <span class="dp-month-title">{{ posCurrentMonthYearLabel }}</span>
                            <button type="button" class="dp-nav-btn" @click="posNextMonth" title="الشهر التالي">&rsaquo;</button>
                          </div>

                          <div class="dp-weekdays">
                            <span>أح</span><span>إث</span><span>ثلا</span><span>أرب</span><span>خم</span><span>جم</span><span>سب</span>
                          </div>

                          <div class="dp-days-grid">
                            <button 
                              type="button"
                              v-for="(dayObj, idx) in posCalendarDays" 
                              :key="idx"
                              class="dp-day-cell"
                              :class="{ 
                                'other-month': !dayObj.inMonth,
                                'is-today': dayObj.isToday,
                                'is-selected': newOrder.deliveryDate === dayObj.dateStr
                              }"
                              @click="selectPosDateFromPicker(dayObj.dateStr)"
                            >
                              {{ dayObj.dayNum }}
                            </button>
                          </div>

                          <div class="datepicker-footer">
                            <button type="button" class="btn-dp-show-all" @click="setNewOrderDateShortcut(0); posDatePickerOpen = false;">تحديد تاريخ اليوم</button>
                          </div>
                        </div>
                      </div>

                      <!-- Touch-Friendly 50/50 Dual Shortcut Buttons (Under the Date Picker) -->
                      <div class="pos-date-shortcuts-split">
                        <button 
                          type="button" 
                          class="pos-date-shortcut-btn" 
                          :class="{ active: isPosDateRelative(0) }" 
                          @click="setNewOrderDateShortcut(0)" 
                          title="تحديد تاريخ اليوم"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          <span>اليوم</span>
                        </button>
                        <button 
                          type="button" 
                          class="pos-date-shortcut-btn" 
                          :class="{ active: isPosDateRelative(1) }" 
                          @click="setNewOrderDateShortcut(1)" 
                          title="تحديد تاريخ الغد"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                          <span>غداً</span>
                        </button>
                      </div>
                    </div>

                    <div class="pos-field">
                      <label class="pos-label">حالة الطلب</label>
                      <select v-model="newOrder.status" class="form-control pos-control">
                        <option value="pending">قيد الانتظار</option>
                        <option value="ready">جاهز للاستلام</option>
                        <option value="received">تم الاستلام</option>
                      </select>
                    </div>
                  </div>

                  <!-- Row 2: Payment Status & Method / Notes -->
                  <div class="pos-input-grid">
                    <div class="pos-field">
                      <label class="pos-label">حالة السداد</label>
                      <select v-model="newOrder.paymentStatus" class="form-control pos-control" @change="onNewOrderPaymentStatusChange">
                        <option value="unpaid">غير مسدد (آجل)</option>
                        <option value="paid">مسدد بالكامل</option>
                        <option value="partial">دفعة جزئية</option>
                      </select>
                    </div>

                    <div class="pos-field" v-if="newOrder.paymentStatus !== 'unpaid'">
                      <label class="pos-label">طريقة الدفع</label>
                      <select v-model="newOrder.paymentMethod" class="form-control pos-control">
                        <option value="cash">نقداً</option>
                        <option value="card">بطاقة مصرفية</option>
                        <option value="bank_transfer">تحويل بنكي</option>
                      </select>
                    </div>

                    <div v-if="newOrder.paymentStatus === 'unpaid'" class="pos-field">
                      <label class="pos-label">ملاحظات إضافية</label>
                      <input v-model="newOrder.notes" type="text" class="form-control pos-control" placeholder="تعليمات التغليف، العنوان…" />
                    </div>
                  </div>

                  <!-- Row 3 (Conditional Partial Amount or Notes when paid) -->
                  <div v-if="newOrder.paymentStatus !== 'unpaid'" class="pos-input-grid">
                    <div v-if="newOrder.paymentStatus === 'partial'" class="pos-field">
                      <label class="pos-label">المبلغ المسدد (د.ل)</label>
                      <input v-model.number="newOrder.paidAmount" type="number" step="0.01" min="0" placeholder="0.00" class="form-control pos-control text-mono" />
                    </div>
                    <div class="pos-field" :style="newOrder.paymentStatus !== 'partial' ? 'grid-column: 1 / -1;' : ''">
                      <label class="pos-label">ملاحظات إضافية</label>
                      <input v-model="newOrder.notes" type="text" class="form-control pos-control" placeholder="تعليمات التغليف، العنوان…" />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <!-- LEFT COLUMN: Product Catalog & Selected Items (RTL Second) -->
            <div class="fast-order-main-col">
              
              <!-- Product Search & Category Filters -->
              <div class="pos-section-card pos-catalog-card">
                <div class="product-picker-toolbar">
                  <div class="product-search-autocomplete-container position-relative flex-grow-1">
                    <div class="search-input-wrapper">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" class="search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                      <input 
                        ref="newOrderProductInputRef"
                        v-model="newOrderProductSearch" 
                        type="text" 
                        class="form-control search-input" 
                        placeholder="ابحث باسم المنتج أو التصنيف لإضافته فوراً…" 
                        @focus="showNewOrderProductSuggestions = true" @click="showNewOrderProductSuggestions = true"
                        @blur="closeNewOrderProductSuggestionsWithDelay" @input="showNewOrderProductSuggestions = true; highlightedProductIndex = 0" @keydown="handleProductSearchKeydown"
                      />
                      <button v-if="newOrderProductSearch" type="button" @click="newOrderProductSearch = ''" class="btn-clear-search" tabindex="-1">&times;</button>
                    </div>

                    <!-- Autocomplete Dropdown (Live Initial Suggestions) -->
                    <div v-if="showNewOrderProductSuggestions && newOrderProductSearch.trim() && filteredNewOrderProducts.length > 0" class="autocomplete-suggestions-dropdown animate-fade-in">
                      <div 
                        v-for="(prod, pIdx) in filteredNewOrderProducts" 
                        :key="prod._id" 
                        class="suggestion-item"
                        :class="{ 
                          highlighted: pIdx === highlightedProductIndex,
                          'is-in-cart': getItemQtyInCart(prod._id) > 0 
                        }"
                        @mousedown="addProductToNewOrder(prod, false); focusProductSearch();"
                        @mouseenter="highlightedProductIndex = pIdx"
                      >
                        <img :src="prod.img || (activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg')" alt="" class="suggestion-img" />
                        <div class="suggestion-info">
                          <div class="suggestion-name-row">
                            <span class="suggestion-name">{{ prod.name }}</span>
                            <span v-if="getItemQtyInCart(prod._id) > 0" class="sugg-in-cart-badge">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                              في السلة ×{{ getItemQtyInCart(prod._id) }}
                            </span>
                          </div>
                          <span class="suggestion-category">{{ prod.category }} {{ prod.subCategory ? '› ' + prod.subCategory : '' }}</span>
                        </div>
                        <div class="suggestion-pricing">
                          <span class="suggestion-price text-mono font-bold">
                            {{ formatCurrency(newOrder.priceMode === 'bulk' ? (prod.price_bulk || prod.price) : (prod.price_regular || prod.price)) }}
                          </span>
                          <div class="suggestion-item-btns" @click.stop>
                            <button 
                              v-if="getItemQtyInCart(prod._id) > 0" 
                              type="button" 
                              class="btn-sugg-qty-minus" 
                              @click="decrementProductInCart(prod)" 
                              title="إنقاص الكمية (-)"
                              tabindex="-1"
                            >-</button>
                            <button 
                              type="button" 
                              class="btn-quick-add" 
                              :class="{ 'btn-quick-add-active': getItemQtyInCart(prod._id) > 0 }"
                              @click="toggleProductInNewOrder(prod)"
                              title="إضافة / زيادة الكمية (Space / +)"
                              tabindex="-1"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              <span>{{ getItemQtyInCart(prod._id) > 0 ? '+1' : 'إضافة' }}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div v-if="filteredNewOrderProducts.length === 0" class="suggestion-no-results">
                        لا توجد منتجات مطابقة لـ "{{ newOrderProductSearch }}"
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Category Chips -->
                <div class="category-quick-chips-row">
                  <button 
                    type="button" 
                    class="cat-chip-btn" 
                    :class="{ active: !newOrderCategoryFilter }" 
                    @click="newOrderCategoryFilter = ''"
                  >الكل</button>
                  <button 
                    type="button" 
                    v-for="cat in categories" 
                    :key="cat._id" 
                    class="cat-chip-btn" 
                    :class="{ active: newOrderCategoryFilter === cat.name }" 
                    @click="newOrderCategoryFilter = (newOrderCategoryFilter === cat.name ? '' : cat.name)"
                  >
                    {{ cat.name }}
                  </button>
                </div>

                <!-- Quick Products Grid (Visual Product Catalog Browsing with Progressive Scroll Loading) -->
                <div 
                  v-if="filteredNewOrderProducts.length > 0" 
                  class="quick-products-grid"
                  @scroll.passive="onPosProductsScroll"
                >
                  <div 
                    v-for="prod in displayedNewOrderProducts" 
                    :key="'grid-'+prod._id" 
                    class="quick-prod-card" 
                    :class="{ 'is-in-cart': getItemQtyInCart(prod._id) > 0 }"
                    @click="addProductToNewOrder(prod)"
                    title="انقر للإضافة للطلب"
                  >
                    <img 
                      :src="prod.img || (activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg')" 
                      class="quick-prod-thumb" 
                      loading="lazy" 
                    />
                    <div class="quick-prod-meta">
                      <div class="quick-prod-header-row">
                        <span class="quick-prod-name">{{ prod.name }}</span>
                        <span v-if="getItemQtyInCart(prod._id) > 0" class="sugg-in-cart-badge">×{{ getItemQtyInCart(prod._id) }}</span>
                      </div>
                      <span class="quick-prod-price text-mono">
                        {{ formatCurrency(newOrder.priceMode === 'bulk' ? (prod.price_bulk || prod.price) : (prod.price_regular || prod.price)) }}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      class="quick-prod-add-btn" 
                      :class="{ 'btn-quick-add-active': getItemQtyInCart(prod._id) > 0 }"
                      aria-label="إضافة"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                  </div>

                  <!-- Scroll Loading Indicator -->
                  <div v-if="displayedNewOrderProducts.length < filteredNewOrderProducts.length" class="pos-scroll-loader-hint">
                    <span class="pos-scroll-loader-dots">•••</span>
                    <span>عرض {{ displayedNewOrderProducts.length }} من {{ filteredNewOrderProducts.length }} (مرر للأسفل للمزيد)</span>
                  </div>
                </div>
                <div v-else class="pos-catalog-empty">
                  <span>لا توجد منتجات مطابقة في هذا التصنيف</span>
                </div>
              </div>

              <!-- Order Items Cart Table -->
              <div class="pos-section-card pos-items-card">
                <div class="pos-card-header">
                  <div class="pos-card-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    <span>أصناف الطلب</span>
                  </div>
                  <span class="toolbar-badge">{{ formatArabicPlural(newOrder.items.length, 'product') }}</span>
                </div>

                <div class="edit-order-table-container">
                  <table class="edit-order-table">
                    <thead>
                      <tr>
                        <th>المنتج</th>
                        <th style="width: 130px; text-align: center;">الكمية</th>
                        <th style="width: 120px; text-align: center;">سعر الوحدة</th>
                        <th style="width: 110px; text-align: center;">المجموع</th>
                        <th style="width: 44px; text-align: center;"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="newOrder.items.length === 0">
                        <td colspan="5" class="pos-empty-cart-msg">
                          <div class="pos-empty-cart-inner">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                            <span>لم يتم إضافة أصناف بعد. ابحث عن المنتجات أو انقر عليها أعلاه لإضافتها للطلب.</span>
                          </div>
                        </td>
                      </tr>
                      <tr v-for="(item, idx) in newOrder.items" :key="'item-'+idx">
                        <td>
                          <div class="edit-item-name-cell">
                            <span class="db-product-name font-bold">{{ item.name }}</span>
                            <input v-model="item.notes" type="text" class="form-control form-control-sm item-note-input" placeholder="ملاحظة للصنف…" />
                          </div>
                        </td>
                        <td style="width: 130px;">
                          <div class="qty-stepper-control">
                            <button type="button" class="stepper-btn btn-minus" @click="adjustNewOrderItemQty(item, -1)" tabindex="-1">-</button>
                            <input 
                              v-model.number="item.quantity" 
                              type="number" 
                              :step="item.allowFloat ? 0.25 : 1" 
                              min="0.1" 
                              class="form-control stepper-input text-mono text-center" 
                              @input="recalcNewOrderTotal" 
                              @change="recalcNewOrderTotal" 
                              @keydown.up.prevent="adjustNewOrderItemQty(item, 1)"
                              @keydown.down.prevent="adjustNewOrderItemQty(item, -1)"
                              @keydown.delete.prevent="removeNewOrderItem(idx)"
                              @keydown.esc.prevent="focusProductSearch"
                              required 
                            />
                            <button type="button" class="stepper-btn btn-plus" @click="adjustNewOrderItemQty(item, 1)" tabindex="-1">+</button>
                          </div>
                        </td>
                        <td style="width: 120px;">
                          <div class="edit-price-input-wrapper">
                            <input v-model.number="item.price" type="number" step="0.01" min="0" class="form-control edit-price-input text-mono" @input="recalcNewOrderTotal" @change="recalcNewOrderTotal" required />
                            <span class="currency-label">د.ل</span>
                          </div>
                        </td>
                        <td class="font-bold text-dark text-center text-mono">
                          {{ formatCurrency(item.quantity * item.price) }}
                        </td>
                        <td style="width: 44px; text-align: center;">
                          <button type="button" @click="removeNewOrderItem(idx)" class="btn-item-delete" title="حذف الصنف">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        </form>

        <!-- Modal Footer: Summary & Submission Bar -->
        <div class="fast-order-modal-footer">
          <div class="fast-order-totals-summary">
            <div class="total-summary-label">إجمالي قيمة الطلب</div>
            <div class="total-summary-val-group">
              <span class="total-summary-val text-mono">{{ formatCurrency(newOrder.totalPrice) }}</span>
              <span class="total-summary-count text-muted">({{ newOrder.items.length }} أصناف • الكمية: {{ newOrder.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0) }})</span>
            </div>
          </div>

          <div class="fast-order-footer-actions">
            <label class="auto-print-checkbox-label" :class="{ 'is-checked': newOrderAutoPrint }" title="طباعة إيصال الطلب تلقائياً بعد الحفظ">
              <input type="checkbox" v-model="newOrderAutoPrint" class="auto-print-checkbox-input" />
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="auto-print-icon"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              <span class="auto-print-text">طباعة الإيصال فوراً</span>
            </label>

            <button type="button" @click="newOrderModalOpen = false" class="btn btn-outline pos-btn-cancel" :disabled="newOrderLoading">إلغاء</button>
            <button type="button" @click="submitNewOrder" class="btn btn-primary pos-btn-submit" :disabled="newOrderLoading || newOrder.items.length === 0 || !newOrder.customerName || !newOrder.customerPhone" title="تأكيد وإنشاء الطلب">
              <svg v-if="!newOrderLoading" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="me-1"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <svg v-else class="btn-spinner me-1" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"></circle></svg>
              <span>{{ newOrderLoading ? 'جاري الحفظ…' : 'تأكيد وإنشاء الطلب' }}</span>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- Order Edit Modal -->
    <div v-if="orderEditModalOpen" class="modal-overlay animate-fade-in">
      <div class="modal-content glass-panel" style="width: 95%; max-width: 950px; padding: 30px;">
        <div class="modal-header">
          <h3>تعديل محتويات الطلب #{{ editingOrder.orderNumber || (editingOrder._id ? editingOrder._id.toString().slice(-6) : '') }}</h3>
          <button @click="orderEditModalOpen = false" class="modal-close-btn">✕</button>
        </div>
        <form @submit.prevent="saveOrder">
          <div v-if="editingOrder.notes" class="order-notes-static-display mb-3">
            <strong>ملاحظات العميل:</strong> {{ editingOrder.notes }}
          </div>

          <div class="form-group">
            <div class="order-items-header mb-3">
              <span class="section-title">إدارة محتويات الطلب</span>
              <div class="product-search-autocomplete-container position-relative flex-grow-1">
                <div class="search-input-wrapper">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" class="search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input 
                    v-model="productSearchQuery" 
                    type="text" 
                    class="form-control search-input" 
                    placeholder="ابحث باسم المنتج لإضافته مباشرة للطلب…" 
                    @focus="showSuggestions = true" @click="showSuggestions = true" @keydown.esc.prevent="showSuggestions = false" @keydown.tab="showSuggestions = false"
                    @blur="closeSuggestionsWithDelay"
                    @keydown.down.prevent="navigateSuggestions(1)"
                    @keydown.up.prevent="navigateSuggestions(-1)"
                    @keydown.enter.prevent="selectHighlightedSuggestion"
                  />
                  <button v-if="productSearchQuery" type="button" @click="productSearchQuery = ''" class="btn-clear-search" tabindex="-1">&times;</button>
                </div>
                <div v-if="showSuggestions" class="autocomplete-suggestions-dropdown animate-fade-in">
                  <div 
                    v-for="(prod, index) in filteredSuggestions" 
                    :key="prod._id" 
                    class="suggestion-item"
                    :class="{ highlighted: index === highlightedSuggestionIndex }"
                    @mousedown="addSelectedProduct(prod)"
                  >
                    <img :src="prod.img || (activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg')" alt="" class="suggestion-img" />
                    <div class="suggestion-info">
                      <span class="suggestion-name">{{ prod.name }}</span>
                      <span class="suggestion-category">{{ prod.category }}</span>
                    </div>
                    <div class="suggestion-pricing">
                      <span class="suggestion-price text-mono font-bold">
                        {{ formatCurrency(editingOrder.priceMode === 'bulk' ? (prod.price_bulk || prod.price) : (prod.price_regular || prod.price)) }}
                      </span>
                      <span class="btn-quick-add">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        إضافة
                      </span>
                    </div>
                  </div>
                  <div v-if="filteredSuggestions.length === 0" class="suggestion-no-results">
                    لا توجد نتائج مطابقة لـ "{{ productSearchQuery }}"
                  </div>
                </div>
              </div>
            </div>

            <div class="edit-order-table-container">
              <table class="edit-order-table">
                <thead>
                  <tr>
                    <th>اسم المنتج</th>
                    <th style="max-width: 120px;">الكمية</th>
                    <th style="max-width: 140px;">سعر الوحدة</th>
                    <th>إجمالي المنتج</th>
                    <th style="width: 60px; text-align: center;">حذف</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in editingOrder.items" :key="idx">
                    <td>
                      <div class="edit-item-name-cell">
                        <span v-if="item.productId" class="db-product-name" title="منتج مسجل بالمنظومة"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display: inline-block; vertical-align: middle; margin-left: 2px;"><polyline points="20 6 9 17 4 12"/></svg> {{ item.name }}</span>
                        <input v-else v-model="item.name" type="text" class="form-control edit-custom-name-input" placeholder="اسم منتج مخصص" required />
                        <div v-if="item.notes" class="order-item-static-note" title="ملاحظة الزبون">
                          * {{ item.notes }}
                        </div>
                      </div>
                    </td>
                    <td style="max-width: 120px;">
                      <div class="edit-qty-input-wrapper">
                        <input v-model.number="item.quantity" type="number" step="0.01" min="0.01" class="form-control edit-qty-input" placeholder="الكمية" required @input="recalcOrderTotal" @change="recalcOrderTotal" />
                      </div>
                    </td>
                    <td style="max-width: 140px;">
                      <div class="edit-price-input-wrapper">
                        <input v-model.number="item.price" type="number" step="0.01" min="0" class="form-control edit-price-input" placeholder="السعر" required @input="recalcOrderTotal" @change="recalcOrderTotal" />
                        <span class="currency-label">د.ل</span>
                      </div>
                    </td>
                    <td class="text-bold text-dark">
                      {{ formatCurrency(item.quantity * item.price) }}
                    </td>
                    <td style="width: 60px; text-align: center;">
                      <button type="button" @click="removeOrderItem(idx)" class="btn btn-danger btn-xs btn-remove-item" :disabled="editingOrder.items.length <= 1" title="حذف المنتج">✕</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="order-total-display mb-3">
            <span>إجمالي قيمة الطلب:</span>
            <strong>{{ formatCurrency(editingOrder.totalPrice) }}</strong>
          </div>

          <div class="modal-footer mt-4">
            <button type="submit" class="btn btn-primary btn-modal-save">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="me-1"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>حفظ التعديلات</span>
            </button>
            <button type="button" @click="orderEditModalOpen = false" class="btn btn-outline btn-modal-cancel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="me-1"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              <span>إلغاء</span>
            </button>
          </div>
        </form>
      </div>
    </div>

          <!-- CUSTOMERS MANAGEMENT TAB -->
          <div v-if="activeTab === 'customers'" class="customers-tab-content animate-fade-in">
            <div class="table-card glass-panel overflow-hidden">
              <div class="card-toolbar card-toolbar-split">
                <div class="card-toolbar-top">
                  <div class="toolbar-title-group">
                    <h3 class="toolbar-title">دليل وقائمة العملاء</h3>
                    <span class="toolbar-badge">{{ formatArabicPlural(filteredCustomers.length, 'customer') }}</span>
                  </div>
                  <div class="customer-toolbar-actions">
                    <button @click="printCustomerDebtReport" class="btn btn-outline btn-sm flex-center cust-debt-print-btn" title="طباعة كشف مديونيات وحسابات العملاء">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                      <span>كشف المديونيات</span>
                    </button>
                  </div>
                </div>
                <div class="card-toolbar-bottom customer-toolbar-filters">
                  <div class="search-input-wrapper flex-grow-1">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" class="search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input v-model="customerFilters.search" type="text" name="search" autocomplete="off" placeholder="البحث باسم العميل أو رقم الهاتف…" class="form-control search-input" />
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
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span>{{ customerFilters.dateFrom ? ('من: ' + formatArabicDate(customerFilters.dateFrom)) : 'من تاريخ' }}</span>
                      </button>

                      <!-- From Date Popover -->
                      <div v-if="custDateFromOpen" class="datepicker-popover glass-panel animate-fade-in" @click.stop>
                        <div class="datepicker-header">
                          <button type="button" class="dp-nav-btn" @click="custFromPrevMonth" title="الشهر السابق">&lsaquo;</button>
                          <span class="dp-month-title">{{ custFromMonthYearLabel }}</span>
                          <button type="button" class="dp-nav-btn" @click="custFromNextMonth" title="الشهر التالي">&rsaquo;</button>
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
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span>{{ customerFilters.dateTo ? ('إلى: ' + formatArabicDate(customerFilters.dateTo)) : 'إلى تاريخ' }}</span>
                      </button>

                      <!-- To Date Popover -->
                      <div v-if="custDateToOpen" class="datepicker-popover glass-panel animate-fade-in" @click.stop>
                        <div class="datepicker-header">
                          <button type="button" class="dp-nav-btn" @click="custToPrevMonth" title="الشهر السابق">&lsaquo;</button>
                          <span class="dp-month-title">{{ custToMonthYearLabel }}</span>
                          <button type="button" class="dp-nav-btn" @click="custToNextMonth" title="الشهر التالي">&rsaquo;</button>
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
                    <tr v-if="filteredCustomers.length === 0">
                      <td colspan="6" class="text-center p-4">لا توجد سجلات عملاء متطابقة.</td>
                    </tr>
                    <tr v-for="cust in paginatedCustomers" :key="cust._id">
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
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
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
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                            <span>دفعة</span>
                          </button>
                          
                          <button 
                            type="button" 
                            @click="openCustomerDetails(cust)" 
                            class="cust-btn btn-details" 
                            title="عرض الملف التعريفي والخيارات"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
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
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                        <span>تسجيل دفعة</span>
                      </button>
                      
                      <button 
                        type="button" 
                        @click="openCustomerDetails(cust)" 
                        class="cust-btn btn-details" 
                        title="عرض الملف التعريفي والخيارات"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <span>الملف والتفاصيل</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Customers Table Numbered Pagination Bar -->
              <div v-if="customersTotalPages > 1" class="admin-pagination-bar">
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    <span class="btn-text-desktop">السابق</span>
                  </button>

                  <div class="pagination-pills">
                    <button 
                      v-for="(p, pIdx) in customersVisiblePages" 
                      :key="'cust-page-'+pIdx" 
                      class="page-num-pill" 
                      :class="{ active: customersPage === p, ellipsis: p === '...' }" 
                      :disabled="p === '...'"
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- PRODUCTION MANAGEMENT TAB -->
          <div v-if="activeTab === 'production'" class="production-tab-content animate-fade-in">
            <!-- Production Sub-Tab Switcher -->
            <div class="production-nav-header glass-panel mb-4">
              <div class="production-tabs-pills">
                <button 
                  type="button"
                  class="prod-tab-pill" 
                  :class="{ active: productionSubTab === 'chefs' }"
                  @click="productionSubTab = 'chefs'"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
                  <span>الشيفات وتوزيع الأصناف</span>
                  <span class="pill-badge">{{ chefs.length }}</span>
                </button>

                <button 
                  type="button"
                  class="prod-tab-pill" 
                  :class="{ active: productionSubTab === 'report' }"
                  @click="productionSubTab = 'report'; loadProductionReport();"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                  <span>تقرير الإنتاج والمبيعات</span>
                </button>
              </div>

              <div class="production-header-actions" v-if="productionSubTab === 'chefs'">
                <button @click="openAddChefModal" class="btn btn-primary btn-sm flex-center">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" class="me-1"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  <span>إضافة شيف جديد</span>
                </button>
              </div>

              <div class="production-header-actions" v-else-if="productionSubTab === 'report'">
                <button @click="printProductionReport" class="btn btn-outline btn-sm flex-center" title="طباعة تقرير الإنتاج الرسمي">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  <span>طباعة التقرير (A4)</span>
                </button>
              </div>
            </div>

            <!-- SUB-TAB 1: CHEFS & ASSIGNMENTS VIEW -->
            <div v-if="productionSubTab === 'chefs'" class="chefs-view-section animate-fade-in">
              <div v-if="chefs.length === 0" class="empty-chefs-placeholder glass-panel text-center py-5">
                <div class="empty-icon-circle mx-auto mb-3">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
                </div>
                <h4 class="text-bold mb-2">لا يوجد شيفات مسجلين حتى الآن</h4>
                <p class="text-muted mb-3">أضف شيفات لتوزيع منتجات القائمة عليهم ومتابعة إنتاج ومبيعات كل شيف بدقة.</p>
                <button @click="openAddChefModal" class="btn btn-primary">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" class="me-1"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  إضافة الشيف الأول
                </button>
              </div>

              <!-- Chefs Grid -->
              <div v-else class="chefs-cards-grid">
                <div v-for="chef in chefs" :key="chef._id" class="chef-card glass-panel animate-scale-in">
                  <div class="chef-card-header">
                    <div class="chef-avatar">{{ (chef.name || 'ش').charAt(0) }}</div>
                    <div class="chef-details">
                      <h4 class="chef-name font-bold">{{ chef.name }}</h4>
                      <div class="chef-phone-row" v-if="chef.phone">
                        <span class="chef-phone text-mono" dir="ltr">{{ chef.phone }}</span>
                        <div class="chef-quick-actions">
                          <a :href="getLibyanWhatsAppUrl(chef.phone)" target="_blank" class="chef-icon-btn whatsapp" title="واتساب">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                          </a>
                          <a :href="'tel:' + chef.phone" class="chef-icon-btn call" title="اتصال">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          </a>
                        </div>
                      </div>
                    </div>
                    <span class="chef-status-badge" :class="chef.active !== false ? 'active' : 'inactive'">
                      {{ chef.active !== false ? 'نشط' : 'متوقف' }}
                    </span>
                  </div>

                  <!-- Assigned Products Summary Section -->
                  <div class="chef-assigned-products-box">
                    <div class="assigned-box-header">
                      <span class="assigned-title font-bold">الأصناف المسندة للشيف:</span>
                      <span class="assigned-count-pill">{{ getChefAssignedProducts(chef._id).length }} صنف</span>
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
                      @click="openAssignProductsModal(chef)" 
                      class="btn-chef-action btn-chef-assign"
                      title="تخصيص وإضافة أصناف للشيف"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                      <span>تخصيص الأصناف</span>
                    </button>

                    <button 
                      type="button" 
                      @click="openEditChefModal(chef)" 
                      class="btn-chef-action btn-chef-edit"
                      title="تعديل بيانات الشيف"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      <span>تعديل</span>
                    </button>

                    <button 
                      type="button" 
                      @click="deleteChef(chef._id)" 
                      class="btn-chef-action btn-chef-delete"
                      title="حذف الشيف"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- SUB-TAB 2: PRODUCTION & SALES REPORT VIEW -->
            <div v-else-if="productionSubTab === 'report'" class="production-report-section animate-fade-in">
              <!-- Report Filters Bar -->
              <div class="report-filters-card glass-panel mb-4 p-3">
                <div class="row g-3 align-items-center">
                  <!-- Date From -->
                  <div class="col-md-3 col-sm-6">
                    <label class="form-label text-bold text-small mb-1">من تاريخ:</label>
                    <input type="date" v-model="productionReportFilters.dateFrom" @change="loadProductionReport" class="form-control" />
                  </div>

                  <!-- Date To -->
                  <div class="col-md-3 col-sm-6">
                    <label class="form-label text-bold text-small mb-1">إلى تاريخ:</label>
                    <input type="date" v-model="productionReportFilters.dateTo" @change="loadProductionReport" class="form-control" />
                  </div>

                  <!-- Chef Selector -->
                  <div class="col-md-3 col-sm-6">
                    <label class="form-label text-bold text-small mb-1">الشيف:</label>
                    <select v-model="productionReportFilters.chefId" @change="loadProductionReport" class="form-control">
                      <option value="">جميع الشيفات المسجلين</option>
                      <option v-for="c in chefs" :key="c._id" :value="c._id">{{ c.name }}</option>
                    </select>
                  </div>

                  <!-- Quick Shortcuts & Refresh -->
                  <div class="col-md-3 col-sm-6 d-flex gap-2 align-items-end" style="padding-top: 22px;">
                    <button type="button" @click="setProductionDateShortcut('today')" class="btn btn-outline btn-sm flex-fill">اليوم</button>
                    <button type="button" @click="setProductionDateShortcut('7d')" class="btn btn-outline btn-sm flex-fill">7 أيام</button>
                    <button type="button" @click="setProductionDateShortcut('month')" class="btn btn-outline btn-sm flex-fill">هذا الشهر</button>
                    <button type="button" @click="loadProductionReport" class="btn btn-primary btn-sm flex-center" :disabled="isLoadingReport">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Loading State -->
              <div v-if="isLoadingReport" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2 text-muted">جاري تحليل بيانات الإنتاج والمبيعات…</p>
              </div>

              <div v-else>
                <!-- Summary KPI Cards -->
                <div class="row g-3 mb-4">
                  <div class="col-md-3 col-sm-6">
                    <div class="kpi-card glass-panel">
                      <span class="kpi-label">إجمالي القطع المباعة</span>
                      <span class="kpi-value text-mono text-primary">{{ productionReportData.grandTotalQty || 0 }}</span>
                    </div>
                  </div>

                  <div class="col-md-3 col-sm-6">
                    <div class="kpi-card glass-panel">
                      <span class="kpi-label">إجمالي الإيرادات</span>
                      <span class="kpi-value text-mono text-success">{{ formatCurrency(productionReportData.grandTotalRevenue || 0) }}</span>
                    </div>
                  </div>

                  <div class="col-md-3 col-sm-6">
                    <div class="kpi-card glass-panel">
                      <span class="kpi-label">إجمالي تكلفة الإنتاج</span>
                      <span class="kpi-value text-mono text-danger">{{ formatCurrency(productionReportData.grandTotalCost || 0) }}</span>
                    </div>
                  </div>

                  <div class="col-md-3 col-sm-6">
                    <div class="kpi-card glass-panel">
                      <span class="kpi-label">صافي الأرباح التقديرية</span>
                      <span class="kpi-value text-mono text-dark">{{ formatCurrency(Math.max(0, (productionReportData.grandTotalRevenue || 0) - (productionReportData.grandTotalCost || 0))) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Per-Chef Breakdown Sections -->
                <div v-if="productionReportData.chefReport && productionReportData.chefReport.length > 0" class="chef-report-list mb-4">
                  <div v-for="cReport in productionReportData.chefReport" :key="cReport.chefId" class="chef-report-card glass-panel mb-3">
                    <div class="chef-report-header">
                      <div class="chef-header-info">
                        <div class="chef-avatar sm">{{ (cReport.chefName || 'ش').charAt(0) }}</div>
                        <div>
                          <h4 class="font-bold mb-0">{{ cReport.chefName }}</h4>
                          <span class="text-small text-muted">{{ cReport.products.length }} صنف تم إنتاجه وبيعه</span>
                        </div>
                      </div>

                      <div class="chef-header-stats">
                        <div class="stat-pill">
                          <span class="label">إجمالي القطع:</span>
                          <strong class="text-mono">{{ cReport.totalQty }}</strong>
                        </div>
                        <div class="stat-pill">
                          <span class="label">الإيرادات:</span>
                          <strong class="text-mono text-success">{{ formatCurrency(cReport.totalRevenue) }}</strong>
                        </div>
                        <div class="stat-pill">
                          <span class="label">التكلفة:</span>
                          <strong class="text-mono text-danger">{{ formatCurrency(cReport.totalCost) }}</strong>
                        </div>
                      </div>
                    </div>

                    <!-- Products Table for this Chef -->
                    <div class="table-responsive">
                      <table class="admin-table sub-table">
                        <thead>
                          <tr>
                            <th>اسم الصنف</th>
                            <th>التصنيف</th>
                            <th>الكمية المباعة</th>
                            <th>تكلفة الإنتاج</th>
                            <th>إجمالي المبيعات</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="p in cReport.products" :key="p.name">
                            <td class="font-bold">{{ p.name }}</td>
                            <td><span class="category-pill">{{ p.category || '-' }}</span></td>
                            <td class="text-mono text-bold">{{ p.qty }}</td>
                            <td class="text-mono text-danger">{{ formatCurrency(p.cost) }}</td>
                            <td class="text-mono text-success text-bold">{{ formatCurrency(p.revenue) }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <!-- Unassigned Products (if any) -->
                <div v-if="productionReportData.unassigned && productionReportData.unassigned.length > 0" class="unassigned-report-card glass-panel mb-3">
                  <div class="unassigned-header p-3 border-bottom d-flex justify-content-between align-items-center">
                    <div>
                      <h4 class="font-bold mb-0 text-warning">أصناف مباعة بدون شيف مخصص</h4>
                      <span class="text-small text-muted">يمكنك تخصيص هذه الأصناف لشيف لتظهر في تقريره</span>
                    </div>
                    <span class="badge bg-warning text-dark">{{ productionReportData.unassigned.length }} صنف</span>
                  </div>
                  <div class="table-responsive">
                    <table class="admin-table sub-table">
                      <thead>
                        <tr>
                          <th>اسم الصنف</th>
                          <th>الكمية المباعة</th>
                          <th>إجمالي المبيعات</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="u in productionReportData.unassigned" :key="u.name">
                          <td class="font-bold">{{ u.name }}</td>
                          <td class="text-mono text-bold">{{ u.qty }}</td>
                          <td class="text-mono text-success text-bold">{{ formatCurrency(u.revenue) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div v-if="(!productionReportData.chefReport || productionReportData.chefReport.length === 0) && (!productionReportData.unassigned || productionReportData.unassigned.length === 0)" class="glass-panel text-center py-5">
                  <p class="text-muted mb-0">لا توجد مبيعات مسجلة في نطاق التاريخ المحدد.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- USERS MANAGEMENT TAB -->
          <div v-if="activeTab === 'users' && userRole === 'admin'" class="users-tab-content animate-fade-in">
            <div class="table-card glass-panel overflow-hidden">
              <div class="card-toolbar card-toolbar-split">
                <div class="card-toolbar-top">
                  <div class="toolbar-title-group">
                    <h3 class="toolbar-title">إدارة حسابات ومستخدمي النظام</h3>
                    <span class="toolbar-badge">{{ formatArabicPlural(adminUsers.length, 'customer') }}</span>
                  </div>
                  <button @click="openUserModal()" class="btn btn-primary">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" class="me-1" style="display:inline-block; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    إضافة مستخدم جديد
                  </button>
                </div>
              </div>

              <div class="table-container">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>الاسم / حساب الدخول</th>
                      <th>الدور / الصلاحية</th>
                      <th>نطاق المتجر</th>
                      <th>تاريخ الإضافة</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="adminUsers.length === 0">
                      <td colspan="5" class="text-center p-4">لا يوجد مستخدمون مدخلون بعد.</td>
                    </tr>
                    <tr v-for="u in adminUsers" :key="u._id">
                      <td class="text-bold">{{ u.name }}</td>
                      <td>
                        <span class="price-mode-badge" :class="u.role === 'admin' ? 'regular' : 'bulk'">
                          {{ u.role === 'admin' ? 'مدير النظام (Admin)' : 'موظف إدارة الطلبات (Order Manager)' }}
                        </span>
                      </td>
                      <td>
                        <span class="text-small text-muted">
                          {{ u.shopAccess === 'shop1' ? 'المتجر الرئيسي' : u.shopAccess === 'shop2' ? 'قسم النواشف' : 'جميع المتاجر' }}
                        </span>
                      </td>
                      <td class="text-mono text-small">{{ u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-LY') : '-' }}</td>
                      <td>
                        <div class="order-actions-btns">
                          <button @click="openUserModal(u)" class="btn-table-action btn-action-edit" title="تعديل المستخدم">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            <span>تعديل</span>
                          </button>
                          <button @click="deleteUser(u._id)" class="btn-table-action" style="color: #ef4444; border-color: #fca5a5;" title="حذف حساب المستخدم">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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

        </div>
      </main>
    </div>

    <!-- Chef Create/Edit Modal -->
    <div v-if="chefModalOpen" class="modal-overlay animate-fade-in" @click.self="chefModalOpen = false">
      <div class="modal-content modal-md chef-form-modal">
        <div class="modal-header">
          <div class="modal-title-group">
            <div class="d-flex align-items-center gap-3">
              <div class="modal-title-icon-chef">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
              </div>
              <div>
                <h2 class="modal-title">{{ editingChef._id ? 'تعديل بيانات الشيف' : 'إضافة شيف جديد' }}</h2>
                <span class="modal-subtitle">إدارة وتعيين بيانات الشيف ومتابعة أصنافه المسندة</span>
              </div>
            </div>
          </div>
          <button @click="chefModalOpen = false" class="modal-close-btn" aria-label="إغلاق">✕</button>
        </div>
        <form @submit.prevent="saveChef" class="modal-form">
          <div class="modal-body py-2">
            <div class="form-group mb-3">
              <label class="form-label font-bold">اسم الشيف *</label>
              <input v-model="editingChef.name" type="text" required class="form-control" placeholder="مثال: الشيف أحمد..." />
              <small class="form-text text-muted mt-1 d-block">الاسم الذي سيظهر في بطاقات المنتجات وتقارير الإنتاج.</small>
            </div>

            <div class="form-group mb-3">
              <label class="form-label font-bold">رقم الهاتف (اختياري)</label>
              <input v-model="editingChef.phone" type="text" class="form-control text-mono" placeholder="0910000000..." />
              <small class="form-text text-muted mt-1 d-block">للتواصل السريع والمباشر مع الشيف عبر واتساب أو الاتصال.</small>
            </div>

            <div class="chef-status-switch-card mb-2" v-if="editingChef._id">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <span class="font-bold text-dark d-block">حالة عمل الشيف</span>
                  <small class="text-muted">عند الإيقاف، يظل سجل إنتاجه محفوظاً دون ظهوره كشيف نشط</small>
                </div>
                <div class="form-check form-switch m-0">
                  <input class="form-check-input" type="checkbox" id="chefActiveSwitch" v-model="editingChef.active" style="cursor: pointer; transform: scale(1.2);">
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer mt-3">
            <button type="submit" class="btn btn-primary btn-modal-save" :disabled="loading">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="me-1"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>{{ editingChef._id ? 'حفظ التعديلات' : 'إضافة الشيف' }}</span>
            </button>
            <button type="button" @click="chefModalOpen = false" class="btn btn-outline btn-modal-cancel">
              <span>إلغاء</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Assign Products to Chef Modal (Spacious Card Picker) -->
    <div v-if="assignProductsModalOpen && selectedChefForAssign" class="modal-overlay animate-fade-in" @click.self="assignProductsModalOpen = false">
      <div class="modal-content modal-lg assign-products-modal-box">
        <div class="modal-header">
          <div class="modal-title-group">
            <div class="d-flex align-items-center gap-3">
              <div class="modal-title-icon-chef">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              </div>
              <div>
                <h2 class="modal-title">تخصيص وإسناد الأصناف للشيف</h2>
                <span class="modal-subtitle">اختر الأصناف التي يتولى إنتاجها الشيف <strong class="text-primary">{{ selectedChefForAssign.name }}</strong></span>
              </div>
            </div>
          </div>
          <button @click="assignProductsModalOpen = false" class="modal-close-btn" aria-label="إغلاق">✕</button>
        </div>

        <div class="modal-body py-2">
          <!-- Filter & Bulk Actions Toolbar -->
          <div class="assign-toolbar-container mb-3">
            <div class="search-input-wrapper flex-grow-1">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" class="search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input v-model="assignProductSearch" type="text" placeholder="البحث باسم الصنف أو التصنيف..." class="form-control search-input" />
            </div>

            <div class="assign-toolbar-actions">
              <button type="button" @click="selectAllProductsForChef" class="btn-bulk-pick" title="تحديد جميع الأصناف المعروضة">
                تحديد الكل
              </button>
              <button type="button" @click="deselectAllProductsForChef" class="btn-bulk-pick" title="إلغاء تحديد الكل">
                إلغاء التحديد
              </button>
              <div class="selected-counter-badge">
                <span>المحدد: <strong class="text-primary text-mono">{{ selectedProductIdsForChef.length }}</strong> / {{ products.length }}</span>
              </div>
            </div>
          </div>

          <!-- Product Card Picker Grid -->
          <div class="assign-products-picker-grid">
            <div 
              v-for="prod in filteredProductsForAssign" 
              :key="prod._id"
              class="assign-product-card"
              :class="{ 'is-selected': selectedProductIdsForChef.includes(prod._id) }"
              @click="toggleProductAssignment(prod._id)"
            >
              <div class="card-selection-check">
                <svg v-if="selectedProductIdsForChef.includes(prod._id)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <img :src="prod.img || '/res/logo.jpg'" :alt="prod.name" class="assign-prod-img" />
              <div class="assign-prod-info">
                <h5 class="assign-prod-title font-bold">{{ prod.name }}</h5>
                <span class="assign-prod-cat-pill">{{ prod.category }}</span>
                <span class="assign-prod-price text-mono font-bold">{{ formatCurrency(prod.price_regular || prod.price || 0) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer mt-3">
          <button type="button" @click="saveProductAssignments" class="btn btn-primary btn-modal-save" :disabled="loading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="me-1"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>حفظ تخصيص الأصناف ({{ selectedProductIdsForChef.length }} صنف)</span>
          </button>
          <button type="button" @click="assignProductsModalOpen = false" class="btn btn-outline btn-modal-cancel">
            <span>إلغاء</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Product Modal Form -->
    <div v-if="productModalOpen" class="modal-overlay animate-fade-in" @click.self="productModalOpen = false">
      <div class="modal-box glass-panel max-w-lg product-form-modal">
        <div class="modal-header">
          <div class="modal-title-group">
            <div class="modal-title-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <h3>{{ editingProduct._id ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد' }}</h3>
          </div>
          <button @click="productModalOpen = false" class="modal-close-btn" aria-label="إغلاق">&times;</button>
        </div>

        <form @submit.prevent="saveProduct" class="modal-form">
          
          <!-- Product Image Upload Dropzone -->
          <div class="form-group mb-4">
            <label class="form-label text-bold mb-2 block" style="font-size: 0.9rem;">صورة المنتج</label>
            <div 
              class="image-upload-dropzone"
              :class="{ 'has-preview': modalFilePreview || editingProduct.img, 'is-dragging': modalDragActive }"
              @click="triggerModalImageSelect"
              @dragover.prevent="modalDragActive = true"
              @dragleave.prevent="modalDragActive = false"
              @drop.prevent="handleModalImageDrop"
            >
              <input 
                type="file" 
                ref="modalFileInput" 
                accept="image/*" 
                style="display: none;" 
                @change="handleModalImageFileSelect" 
              />
              
              <div v-if="modalFilePreview || editingProduct.img" class="image-preview-container">
                <div class="admin-preview-shimmer"></div>
                <img :src="modalFilePreview || editingProduct.img" alt="Product Preview" class="upload-preview-img" decoding="async" loading="eager" />
                <div class="image-preview-overlay">
                  <span class="preview-change-btn">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    تغيير الصورة
                  </span>
                  <button type="button" class="preview-remove-btn" @click.stop="removeModalImage" title="حذف الصورة">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              </div>

              <div v-else class="dropzone-placeholder">
                <div class="dropzone-icon">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                </div>
                <div class="dropzone-text">
                  <span class="dropzone-title">انقر هنا أو اسحب صورة المنتج لوضعها</span>
                  <span class="dropzone-sub">يدعم JPG, PNG, WEBP (حجم أقصى 5 ميجابايت)</span>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>اسم المنتج *</label>
            <input v-model="editingProduct.name" type="text" required placeholder="مثال: غريبة باللوز" class="form-control" />
          </div>

          <div class="form-group">
            <label>الوصف</label>
            <textarea v-model="editingProduct.desc" rows="2" placeholder="أدخل وصفاً مشوقاً للمنتج..." class="form-control"></textarea>
          </div>

          <div class="form-group-row">
            <div class="form-group">
              <label class="form-label font-bold">الصنف الرئيسي *</label>
              <select v-model="editingProduct.category" @change="onProductCategoryChange" required class="form-control">
                <option value="">اختر الصنف...</option>
                <option v-for="cat in categories" :key="cat._id" :value="cat.name">{{ cat.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label font-bold">الصنف الفرعي</label>
              <select v-model="editingProduct.subCategory" :disabled="!subCategoriesForEditing.length" class="form-control">
                <option value="">لا يوجد صنف فرعي</option>
                <option v-for="sub in subCategoriesForEditing" :key="sub" :value="sub">{{ sub }}</option>
              </select>
            </div>
          </div>

          <div class="form-group-row">
            <div class="form-group">
              <label class="form-label font-bold">الشيف المسؤول عن الإنتاج</label>
              <select v-model="editingProduct.chefId" class="form-control">
                <option value="">-- بدون شيف محدد --</option>
                <option v-for="c in chefs" :key="c._id" :value="c._id">{{ c.name }} {{ c.phone ? ('(' + c.phone + ')') : '' }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label font-bold">نوع البيع المتاح</label>
              <select v-model="editingProduct.purchaseType" class="form-control">
                <option value="both">مفرد وجملة معاً</option>
                <option value="regular">مفرد فقط</option>
                <option value="bulk">جملة فقط</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label text-bold mb-2 block" style="font-size: 0.9rem;">العلامات المميزة (Tags)</label>
            <div class="tags-picker-grid">
              <div 
                v-for="tag in tags" 
                :key="tag._id" 
                class="tag-picker-chip"
                :class="[
                  'tag-' + (tag.color || 'default'),
                  { 'is-selected': editingProduct.tags && editingProduct.tags.includes(tag.name) }
                ]"
                @click="toggleProductTag(tag.name)"
              >
                <div class="tag-chip-checkbox">
                  <svg v-if="editingProduct.tags && editingProduct.tags.includes(tag.name)" viewBox="0 0 24 24" class="check-svg" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <CategoryIcon :icon="tag.icon" :name="tag.name" size="16" />
                <span class="tag-chip-name">{{ tag.name }}</span>
              </div>
              <div v-if="tags.length === 0" class="text-muted text-small mt-2">لا توجد علامات مميزة مسجلة في النظام. أضفها من تبويب (إدارة العلامات المميزة).</div>
            </div>
          </div>

          <div class="form-group">
            <label>طريقة البيع والتسعير</label>
            <div class="purchase-type-radios">
              <label class="radio-label" :class="{ active: editingProduct.purchaseType === 'both' }">
                <input type="radio" value="both" v-model="editingProduct.purchaseType" />
                <span>كلاهما (مفرد + جملة)</span>
              </label>
              <label class="radio-label" :class="{ active: editingProduct.purchaseType === 'regular' }">
                <input type="radio" value="regular" v-model="editingProduct.purchaseType" />
                <span>مفرد فقط</span>
              </label>
              <label class="radio-label" :class="{ active: editingProduct.purchaseType === 'bulk' }">
                <input type="radio" value="bulk" v-model="editingProduct.purchaseType" />
                <span>جملة فقط</span>
              </label>
            </div>
          </div>

          <div class="form-group-row">
            <div class="form-group">
              <label>سعر البيع بالمفرد (د.ل) *</label>
              <input v-model.number="editingProduct.price_regular" type="number" step="0.01" :disabled="editingProduct.purchaseType === 'bulk'" :required="editingProduct.purchaseType !== 'bulk'" class="form-control" />
            </div>
            <div class="form-group">
              <label>سعر البيع بالجملة (د.ل) *</label>
              <input v-model.number="editingProduct.price_bulk" type="number" step="0.01" :disabled="editingProduct.purchaseType === 'regular'" :required="editingProduct.purchaseType !== 'regular'" class="form-control" />
            </div>
            <div class="form-group">
              <label>سعر التكلفة / التصنيع (د.ل)</label>
              <input v-model.number="editingProduct.makingCost" type="number" step="0.01" min="0" placeholder="0.00" class="form-control" />
            </div>
          </div>

          <div class="form-group checkbox-group mt-2">
            <input type="checkbox" id="modal-allow-float" v-model="editingProduct.allowFloat" />
            <label for="modal-allow-float">يسمح بالكميات الكسرية (مثل: 0.5 كجم)</label>
          </div>

          <div class="modal-footer mt-4">
            <button type="submit" class="btn btn-primary premium-submit-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              حفظ المنتج
            </button>
            <button type="button" @click="productModalOpen = false" class="btn btn-outline">إلغاء</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Category Modal Form -->
    <div v-if="categoryModalOpen" class="modal-overlay animate-fade-in">
      <div class="modal-box glass-panel max-w-md">
        <div class="modal-header">
          <h3>{{ editingCategory._id ? 'تعديل الصنف' : 'إضافة صنف جديد' }}</h3>
          <button @click="categoryModalOpen = false" class="modal-close-btn">&times;</button>
        </div>
        <form @submit.prevent="saveCategory" class="modal-form">
          <div class="form-group">
            <label>اسم الصنف *</label>
            <input v-model="editingCategory.name" type="text" required class="form-control" />
          </div>

          <div class="form-group mb-3">
            <label class="form-label text-bold block mb-1" style="font-size: 0.85rem; color: #475569;">اختر أيقونة من مكتبة الـ SVG (Hugeicons):</label>
            <div class="svg-icon-pool-grid">
              <button 
                type="button" 
                v-for="item in svgIconPool" 
                :key="item.key" 
                class="svg-pool-item" 
                :class="{ active: editingCategory.icon === item.key || (editingCategory.emoji || '').includes(item.emoji) }"
                @click="selectCategoryIcon(item)"
                :title="item.label"
              >
                <CategoryIcon :icon="item.key" :name="item.keyword" :emoji="item.emoji" />
                <span class="pool-item-label">{{ item.label }}</span>
              </button>
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label text-bold mb-1 block" style="font-size: 0.85rem; color: #475569;">الأيقونة المختارة للصنف:</label>
            <div class="category-icon-preview-row">
              <div class="icon-preview-box" title="معاينة أيقونة SVG">
                <CategoryIcon :icon="editingCategory.icon" :name="editingCategory.name" :emoji="editingCategory.emoji" size="22" />
              </div>
              <span class="text-semibold text-dark" style="font-size: 0.88rem;">{{ editingCategory.name || 'اسم الصنف' }}</span>
            </div>
          </div>

          <div class="form-group">
            <label>الأصناف الفرعية (تفصل بينها بفواصل ",")</label>
            <input v-model="categorySubcategoriesString" type="text" placeholder="مثال: صنف 1, صنف 2, صنف 3" class="form-control" />
          </div>

          <div class="modal-footer mt-4">
            <button type="submit" class="btn btn-primary">حفظ الصنف</button>
            <button type="button" @click="categoryModalOpen = false" class="btn btn-outline">إلغاء</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Tag Modal Form -->
    <div v-if="tagModalOpen" class="modal-overlay animate-fade-in" @click.self="tagModalOpen = false">
      <div class="modal-box glass-panel max-w-md">
        <div class="modal-header">
          <div class="modal-title-group">
            <div class="modal-title-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
            </div>
            <h3>{{ editingTag._id ? 'تعديل العلامة المميزة' : 'إضافة علامة مميزة جديدة' }}</h3>
          </div>
          <button @click="tagModalOpen = false" class="modal-close-btn" aria-label="إغلاق">&times;</button>
        </div>

        <form @submit.prevent="saveTag" class="modal-form">
          <div class="form-group mb-3">
            <label class="form-label text-bold mb-1 block">اسم العلامة *</label>
            <input v-model="editingTag.name" type="text" placeholder="مثال: الأكثر مبيعاً، جديد، تخفيضات" required class="form-input" />
          </div>

          <!-- Tag Color Selector -->
          <div class="form-group mb-3">
            <label class="form-label text-bold mb-1 block" style="font-size: 0.85rem;">اختر لون العلامة *</label>
            <div class="tag-color-swatch-grid">
              <button 
                type="button" 
                v-for="c in tagColors" 
                :key="c.key" 
                class="color-swatch-btn" 
                :class="['tag-' + c.key, { active: editingTag.color === c.key }]"
                @click="editingTag.color = c.key"
                :title="c.label"
              >
                <span class="swatch-circle"></span>
                <span class="swatch-name">{{ c.label.split(' ')[0] }}</span>
              </button>
            </div>
          </div>

          <!-- Tag SVG Icon Pool Grid -->
          <div class="form-group mb-3">
            <label class="form-label text-bold mb-1 block" style="font-size: 0.85rem;">اختر أيقونة من مكتبة الـ SVG (Hugeicons):</label>
            <div class="svg-icon-pool-grid">
              <button 
                type="button" 
                v-for="item in tagIcons" 
                :key="item.key" 
                class="svg-pool-item" 
                :class="{ active: editingTag.icon === item.key }"
                @click="editingTag.icon = item.key"
                :title="item.label"
              >
                <CategoryIcon :icon="item.key" size="20" />
                <span class="pool-item-label">{{ item.label }}</span>
              </button>
            </div>
          </div>

          <!-- Live Tag Preview Banner -->
          <div class="form-group mb-3">
            <label class="form-label text-bold mb-1 block" style="font-size: 0.85rem;">معاينة شكل العلامة على كارت المنتج:</label>
            <div class="tag-live-preview-container p-3 flex items-center justify-center">
              <span class="tag-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-bold" :class="'tag-' + (editingTag.color || 'default')">
                <CategoryIcon :icon="editingTag.icon" :name="editingTag.name" size="16" />
                <span>{{ editingTag.name || 'اسم العلامة' }}</span>
              </span>
            </div>
          </div>

          <div class="modal-actions">
            <button type="submit" class="btn btn-primary btn-modal-save" :disabled="loading">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
              {{ loading ? 'جاري الحفظ…' : 'حفظ العلامة' }}
            </button>
            <button type="button" @click="tagModalOpen = false" class="btn btn-outline btn-modal-cancel">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Customer Profile Details Modal Hub -->
    <div v-if="customerDetailsModalOpen && selectedCustomer" class="modal-overlay animate-fade-in" @click.self="customerDetailsModalOpen = false">
      <div class="modal-content modal-md customer-profile-modal">
        <div class="modal-header">
          <div class="modal-title-group">
            <h2 class="modal-title">الملف التعريفي للعميل</h2>
            <span class="modal-subtitle text-mono" style="direction: ltr; display: inline-block;">{{ selectedCustomer.phone }}</span>
          </div>
          <button @click="customerDetailsModalOpen = false" class="modal-close-btn" aria-label="إغلاق">✕</button>
        </div>

        <div class="modal-body">
          <!-- Profile Hero Card -->
          <div class="profile-hero-card">
            <div class="profile-avatar">{{ (selectedCustomer.name || 'ع').charAt(0) }}</div>
            <div class="profile-info">
              <h3 class="profile-name">{{ selectedCustomer.name }}</h3>
              <div class="profile-phone-row">
                <span class="profile-phone-text text-mono">{{ selectedCustomer.phone }}</span>
                <div class="profile-quick-actions">
                  <a :href="getLibyanWhatsAppUrl(selectedCustomer.phone)" target="_blank" class="profile-action-icon whatsapp-icon" title="مراسلة عبر واتساب">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                  </a>
                  <a :href="'tel:' + selectedCustomer.phone" class="profile-action-icon call-icon" title="اتصال بالعميل">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Key Metrics Stats Grid -->
          <div class="profile-stats-grid">
            <div class="profile-stat-box" :class="(selectedCustomer.outstandingBalance || 0) > 0 ? 'balance-due-box' : 'balance-clear-box'">
              <span class="stat-label">الرصيد المستحق</span>
              <span class="stat-value text-mono">
                {{ (selectedCustomer.outstandingBalance || 0) > 0 ? formatCurrency(selectedCustomer.outstandingBalance) : 'مُسدد بالكامل' }}
              </span>
            </div>

            <div class="profile-stat-box primary-stat-box">
              <span class="stat-label">إجمالي المشتريات</span>
              <span class="stat-value text-mono text-primary">{{ formatCurrency(selectedCustomer.totalSpent) }}</span>
            </div>

            <div class="profile-stat-box">
              <span class="stat-label">إجمالي الطلبات</span>
              <span class="stat-value text-mono text-dark">{{ formatArabicPlural(selectedCustomer.orderCount, 'order') }}</span>
            </div>

            <div class="profile-stat-box">
              <span class="stat-label">تاريخ التسجيل</span>
              <span class="stat-value-sub text-mono">{{ selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString('ar-LY') : 'غير متوفر' }}</span>
            </div>
          </div>

          <!-- Customer Password & Security Card -->
          <div class="profile-security-card">
            <div class="security-card-header">
              <div class="security-title-group">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span class="security-title font-bold">كلمة مرور الحساب:</span>
              </div>
              <span v-if="selectedCustomer.password" class="badge-status-active">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                مفعّلة
              </span>
              <span v-else class="badge-status-inactive">
                غير معينة
              </span>
            </div>

            <div class="security-password-body">
              <div v-if="selectedCustomer.password" class="password-display-box">
                <span class="password-value text-mono font-bold">
                  {{ showProfilePassword ? selectedCustomer.password : '••••••••' }}
                </span>
                <div class="password-actions-inline">
                  <button 
                    type="button" 
                    @click="showProfilePassword = !showProfilePassword" 
                    class="btn-pass-action btn-pass-toggle" 
                    :title="showProfilePassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'"
                  >
                    <svg v-if="showProfilePassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  </button>
                  <button 
                    type="button" 
                    @click="copyCustomerPassword(selectedCustomer.password)" 
                    class="btn-pass-action btn-pass-copy" 
                    title="نسخ كلمة المرور"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    <span>نسخ</span>
                  </button>
                </div>
              </div>
              <div v-else class="password-empty-box">
                <span class="text-muted">العميل لم يقم بتعيين كلمة مرور. يمكنك تعيين كلمة مرور له بالضغط على زر تعديل البيانات أدناه.</span>
              </div>
            </div>
          </div>

          <div class="profile-meta-bar">
            <span class="meta-label">آخر نشاط مسجل:</span>
            <span class="meta-val text-mono">{{ selectedCustomer.lastActive ? new Date(selectedCustomer.lastActive).toLocaleString('ar-LY') : 'غير متوفر' }}</span>
          </div>

          <!-- Quick Action Buttons Hub -->
          <div class="profile-actions-hub">
            <button 
              type="button" 
              @click="openPaymentModal(selectedCustomer); customerDetailsModalOpen = false;" 
              class="btn-hub-action btn-hub-pay"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              <span>تسجيل دفعة نقدية / تحصيل</span>
            </button>

            <button 
              type="button" 
              @click="openPaymentHistory(selectedCustomer); customerDetailsModalOpen = false;" 
              class="btn-hub-action btn-hub-history"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>سجل المدفوعات والإيصالات</span>
            </button>

            <button 
              type="button" 
              @click="openCustomerFavsModal(selectedCustomer); customerDetailsModalOpen = false;" 
              class="btn-hub-action btn-hub-favs"
              :disabled="!selectedCustomer.favorites || !selectedCustomer.favorites.length"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              <span>المنتجات المفضلة ({{ selectedCustomer.favorites ? selectedCustomer.favorites.length : 0 }})</span>
            </button>

            <button 
              type="button" 
              @click="openCustomerEditModal(selectedCustomer); customerDetailsModalOpen = false;" 
              class="btn-hub-action btn-hub-edit"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <span>تعديل بيانات العميل</span>
            </button>

            <button 
              type="button" 
              @click="deleteCustomer(selectedCustomer._id); customerDetailsModalOpen = false;" 
              class="btn-hub-action btn-hub-delete"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>حذف العميل نهائياً</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Customer Modal Form -->
    <div v-if="customerModalOpen" class="modal-overlay animate-fade-in" @click.self="customerModalOpen = false">
      <div class="modal-content modal-md">
        <div class="modal-header">
          <div class="modal-title-group">
            <h2 class="modal-title">تعديل بيانات العميل</h2>
            <span v-if="editingCustomer.phone" class="modal-subtitle text-mono" style="direction: ltr; display: inline-block;">{{ editingCustomer.phone }}</span>
          </div>
          <button @click="customerModalOpen = false" class="modal-close-btn">✕</button>
        </div>
        <form @submit.prevent="saveCustomerDetails" class="modal-form">
          <div class="modal-body">
            <div class="form-group mb-3">
              <label class="form-label">اسم العميل *</label>
              <input v-model="editingCustomer.name" type="text" required class="form-control" placeholder="اسم العميل الكامل..." />
            </div>

            <div class="form-group mb-3">
              <label class="form-label">رقم الهاتف *</label>
              <input v-model="editingCustomer.phone" type="text" required class="form-control text-mono" placeholder="0910000000..." />
            </div>

            <div class="form-group mb-3">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <label class="form-label mb-0">كلمة مرور الحساب</label>
                <span v-if="editingCustomer.password" class="text-small text-muted font-bold">({{ editingCustomer.password.length }} خانات)</span>
              </div>
              <div class="input-with-action-wrapper">
                <input 
                  v-model="editingCustomer.password" 
                  :type="editingCustomer.showPassword ? 'text' : 'password'" 
                  class="form-control text-mono" 
                  placeholder="أدخل كلمة المرور (4 خانات على الأقل)..." 
                />
                <button 
                  type="button" 
                  @click="editingCustomer.showPassword = !editingCustomer.showPassword" 
                  class="input-action-btn"
                  :title="editingCustomer.showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'"
                >
                  <svg v-if="editingCustomer.showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
              </div>
              <small class="form-text text-muted mt-1 d-block">
                يمكن للمدير تعيين أو تعديل كلمة مرور العميل مباشرة لتمكينه من تسجيل الدخول بحسابه.
              </small>
            </div>
          </div>

          <div class="modal-footer mt-4">
            <button type="submit" class="btn btn-primary btn-modal-save" :disabled="loading">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="me-1"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>حفظ التغييرات</span>
            </button>
            <button type="button" @click="customerModalOpen = false" class="btn btn-outline btn-modal-cancel">
              <span>إلغاء</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Customer Favorites Modal -->
    <div v-if="customerFavsModalOpen" class="modal-overlay animate-fade-in" @click.self="customerFavsModalOpen = false">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <div class="modal-title-group">
            <h2 class="modal-title">المنتجات المفضلة للعميل</h2>
            <span v-if="viewingCustomer" class="modal-subtitle">
              {{ viewingCustomer.name }} — <span class="text-mono" style="direction: ltr; display: inline-block;">{{ viewingCustomer.phone }}</span>
            </span>
          </div>
          <button @click="customerFavsModalOpen = false" class="modal-close-btn">✕</button>
        </div>
        <div class="modal-body py-3">
          <div v-if="viewingCustomer" class="customer-favs-meta mb-3 pb-2" style="border-bottom: 1px dashed rgba(255,255,255,0.1);">
            <span class="text-bold text-muted">إجمالي المفضلة:</span>
            <span class="toolbar-badge ms-2" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">{{ formatArabicPlural(viewingCustomerFavs.length, 'product') }}</span>
          </div>
          
          <div v-if="viewingCustomerFavs.length > 0" class="fav-grid-brows">
            <div v-for="prod in viewingCustomerFavs" :key="prod._id" class="fav-grid-card glass-panel animate-scale-in">
              <div class="fav-card-image-wrapper">
                <div class="admin-fav-shimmer"></div>
                <img 
                  :src="prod.img || (activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg')" 
                  class="fav-card-image" 
                  loading="lazy" 
                  decoding="async" 
                  @click="zoomImage(prod.img)"
                  @error="$event.target.src = activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'"
                />
              </div>
              <div class="fav-card-info">
                <span class="fav-card-name">{{ prod.name }}</span>
                <span class="fav-card-cat">{{ prod.category }}</span>
                <div class="fav-card-prices mt-2">
                  <div v-if="prod.price_regular" class="price-pill regular">
                    <span class="price-lbl">مفرد:</span>
                    <span class="price-val">{{ formatCurrency(prod.price_regular) }}</span>
                  </div>
                  <div v-if="prod.price_bulk" class="price-pill bulk">
                    <span class="price-lbl">جملة:</span>
                    <span class="price-val">{{ formatCurrency(prod.price_bulk) }}</span>
                  </div>
                </div>
                <button @click="removeCustomerFavorite(prod._id)" class="btn btn-outline btn-xs w-100 mt-2" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);" title="إزالة من قائمة مفضلة العميل">
                  إزالة من المفضلة
                </button>
              </div>
            </div>
          </div>
          <p v-else class="text-center text-muted py-5">لا توجد تفضيلات مسجلة لهذا العميل.</p>
        </div>
        <div class="modal-footer mt-2">
          <button type="button" @click="customerFavsModalOpen = false" class="btn btn-outline btn-modal-cancel w-100">إغلاق</button>
        </div>
      </div>
    </div>

    <!-- Marketing Carousel Modal Form -->
    <div v-if="carouselModalOpen" class="modal-overlay animate-fade-in">
      <div class="modal-box glass-panel max-w-md">
        <div class="modal-header">
          <h3>{{ editingCarouselId ? 'تعديل البنر الإعلاني' : 'إضافة بنر إعلاني جديد' }}</h3>
          <button @click="carouselModalOpen = false" class="modal-close-btn">&times;</button>
        </div>
        <form @submit.prevent="saveCarouselItem" class="modal-form">
          <p class="modal-subtitle text-muted text-small mb-3">اختر صورة البنر الإعلاني ورابط التوجيه ليتم تحديثها وعرضها مباشرة للزبائن.</p>
          
          <!-- S3 Image Upload Dropzone -->
          <div class="form-group animate-fade-in">
            <div class="image-dropzone" 
                 :class="{ active: carouselDragActive }" 
                 @dragover.prevent="carouselDragActive = true"
                 @dragleave.prevent="carouselDragActive = false"
                 @drop.prevent="handleCarouselDrop($event)"
                 @click="triggerCarouselImageSelect">
              <input type="file" ref="carouselFileInput" class="hidden-file-input" accept="image/*" @change="handleCarouselImageFileSelect" />
              
              <div v-if="!newCarouselItem.filePreview" class="dropzone-prompt">
                <svg class="cloud-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <span>اسحب صورة البنر هنا أو اضغط للتصفح</span>
              </div>
              <div v-else class="dropzone-preview" @click.stop>
                <img :src="newCarouselItem.filePreview" alt="Preview" style="max-height: 160px; width: 100%; object-fit: contain; border-radius: 8px; margin-bottom: 8px;" />
                <span class="file-name">{{ newCarouselItem.file ? newCarouselItem.file.name : 'البنر الحالي (اضغط للتغيير)' }}</span>
                <span v-if="newCarouselItem.dimensions" class="file-dimensions block text-muted text-small mt-1" style="font-size: 0.75rem; color: #868e96; font-weight: 500;">
                  المقاسات: {{ newCarouselItem.dimensions }}
                </span>
                <button type="button" @click="clearCarouselFile" class="btn btn-outline btn-xs mt-2" style="color: #fa5252; border-color: #ffc9c9;">إزالة الصورة</button>
              </div>
            </div>
          </div>

          <!-- Link input field -->
          <div class="form-group mt-3">
            <label class="form-label text-bold" style="font-size: 0.9rem;">رابط التوجيه عند الضغط على البنر (اختياري)</label>
            <input v-model="newCarouselItem.link" type="text" placeholder="مثال: /app/#/category/وجبات أو رابط خارجي" class="form-control" />
            <p class="text-muted" style="font-size: 0.72rem; margin-top: 4px; line-height: 1.3;">عندما ينقر الزبون على هذا البنر، سيتم نقله تلقائياً إلى هذا الرابط.</p>
          </div>

          <div class="modal-footer mt-4">
            <button type="submit" class="btn btn-primary" :disabled="loading">
              {{ loading ? 'جاري الحفظ…' : (editingCarouselId ? 'حفظ التعديلات' : 'رفع ونشر البنر الإعلاني') }}
            </button>
            <button type="button" @click="carouselModalOpen = false" class="btn btn-outline" :disabled="loading">إلغاء</button>
          </div>
        </form>
      </div>
    </div>



    <!-- Modern Admin Image Zoom View -->
    <div v-if="zoomedImageSrc" class="zoom-backdrop" @click="closeAdminZoom">
      <!-- Fixed Top-Left Close Button -->
      <button class="zoom-close-btn" @click.stop="closeAdminZoom" aria-label="إغلاق">✕</button>

      <div class="zoom-content" @click.stop>
        <!-- Shimmer & Spinner Loader while full-size image downloads -->
        <div v-if="!isAdminZoomLoaded" class="zoom-skeleton-loader">
          <div class="spinner"></div>
          <p class="zoom-loading-text">جاري عرض الصورة بالدقة الكاملة…</p>
        </div>

        <img 
          ref="adminZoomImgRef"
          :src="zoomedImageSrc" 
          alt="معاينة الصورة" 
          class="zoom-image"
          :class="{ 'loaded': isAdminZoomLoaded }"
          fetchpriority="high"
          loading="eager"
          decoding="async"
          @load="isAdminZoomLoaded = true"
          @error="isAdminZoomLoaded = true"
        />
      </div>
    </div>
    <!-- Premium Image Cropper Modal -->
    <div v-if="cropperModalOpen" class="premium-cropper-overlay animate-fade-in">
      <div class="premium-cropper-content">
        <div class="premium-cropper-header">
          <div>
            <h2 class="text-xl text-bold" style="margin: 0; color: #1f2937;">تخصيص أبعاد البنر</h2>
            <p class="text-muted text-small" style="margin: 0; margin-top: 4px;">قم بتعديل الصورة لتتناسب مع واجهة المتجر</p>
          </div>
          <button @click="cropperModalOpen = false" class="premium-close-btn">&times;</button>
        </div>
        
        <div class="premium-cropper-body">
          <div class="cropper-canvas-container">
            <img ref="cropperImageElement" :src="cropperImageSrc" style="display: block; max-width: 100%;" />
          </div>
          
          <div class="cropper-toolbar">
            <div class="toolbar-section">
              <span class="toolbar-label">نسبة العرض: ثابتة (3:1)</span>
            </div>
            
            <div class="toolbar-actions">
              <button @click="rotateCropperImage(90)" class="tool-btn" title="تدوير يمين">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M21 13a9 9 0 1 1-3-7.7L21 8"></path></svg>
              </button>
              <button @click="rotateCropperImage(-90)" class="tool-btn" title="تدوير يسار">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"></path><path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path></svg>
              </button>
              <div class="tool-divider"></div>
              <button @click="zoomCropperImage(0.1)" class="tool-btn" title="تكبير">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
              </button>
              <button @click="zoomCropperImage(-0.1)" class="tool-btn" title="تصغير">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
              </button>
              <div class="tool-divider"></div>
              <button @click="resetCropperImage" class="tool-btn" title="إعادة ضبط">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
              </button>
            </div>
          </div>
        </div>
        
        <div class="premium-cropper-footer">
          <button @click="cropperModalOpen = false" class="btn premium-btn-outline">إلغاء</button>
          <button @click="cropAndSaveImage" class="btn premium-btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
            تأكيد القص
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- User Modal Form -->
  <div v-if="userModalOpen" class="modal-overlay animate-fade-in" @click.self="userModalOpen = false">
    <div class="modal-box glass-panel max-w-lg user-form-modal">
      <div class="modal-header">
        <div class="modal-title-group">
          <div class="modal-title-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
          </div>
          <h3>{{ editingUser._id ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد' }}</h3>
        </div>
        <button @click="userModalOpen = false" class="modal-close-btn" aria-label="إغلاق">&times;</button>
      </div>

      <form @submit.prevent="saveUser" class="modal-form">
        <div class="form-group mb-3">
          <label class="form-label">الاسم / اسم الحساب للدخول</label>
          <input type="text" v-model="editingUser.name" class="form-input" placeholder="مثال: علي محمد أو موظف1" required />
        </div>

        <div class="form-group mb-3">
          <label class="form-label">{{ editingUser._id ? 'كلمة المرور الجديدة (اتركه فارغاً للإبقاء على الحالية)' : 'كلمة المرور' }}</label>
          <input type="password" v-model="editingUser.password" class="form-input" :placeholder="editingUser._id ? 'اتركه فارغاً للإبقاء' : 'كلمة السر'" :required="!editingUser._id" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">الدور وصلاحيات الوصول</label>
            <select v-model="editingUser.role" class="form-select user-form-select">
              <option value="order_manager">موظف إدارة الطلبات (Order Manager - مقفل للطلبات)</option>
              <option value="admin">مدير النظام (Admin - وصول كامل)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">نطاق المتجر</label>
            <select v-model="editingUser.shopAccess" class="form-select user-form-select">
              <option value="all">جميع المتاجر</option>
              <option value="shop1">المتجر الرئيسي فقط</option>
              <option value="shop2">قسم النواشف فقط</option>
            </select>
          </div>
        </div>

        <div class="modal-actions">
          <button type="submit" class="btn btn-primary btn-modal-save" :disabled="loading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
            {{ loading ? 'جاري الحفظ…' : 'حفظ البيانات' }}
          </button>
          <button type="button" @click="userModalOpen = false" class="btn btn-outline btn-modal-cancel">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Hidden Print Production & Chef Report (A4 Portrait) -->
  <div class="print-production-report-wrapper" v-if="printingProductionReport">
    <div class="production-report-page">
      <!-- Header Banner -->
      <div class="debt-header">
        <div class="debt-brand">
          <img :src="activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'" alt="Logo" class="debt-logo" />
          <div class="debt-brand-text">
            <h1 class="debt-shop-name">{{ activeShop === 'shop2' ? 'قسم النواشف' : 'حلويات عبمبر الزروق' }}</h1>
            <p class="debt-subtitle">تقرير الإنتاج والمبيعات التفصيلي حسب الشيفات</p>
          </div>
        </div>
        <div class="debt-header-badge">تقرير إنتاج معتمد</div>
      </div>

      <div class="debt-divider"></div>

      <!-- Meta Info Bar -->
      <div class="debt-meta">
        <div class="debt-meta-row">
          <span class="debt-meta-label">الفترة:</span>
          <span class="debt-meta-val debt-date-pill">
            {{ productionReportFilters.dateFrom && productionReportFilters.dateTo ? ('من ' + formatArabicDate(productionReportFilters.dateFrom) + ' إلى ' + formatArabicDate(productionReportFilters.dateTo)) : 'جميع المبيعات المسجلة' }}
          </span>
        </div>
        <div class="debt-meta-row">
          <span class="debt-meta-label">تاريخ الإصدار:</span>
          <span class="debt-meta-val text-mono">{{ new Date().toLocaleString('ar-LY') }}</span>
        </div>
      </div>

      <!-- Summary KPI Cards -->
      <div class="debt-kpi-grid">
        <div class="debt-kpi-card">
          <span class="debt-kpi-label">إجمالي القطع المباعة</span>
          <span class="debt-kpi-val text-mono text-primary">{{ productionReportData.grandTotalQty || 0 }}</span>
        </div>
        <div class="debt-kpi-card highlight-green">
          <span class="debt-kpi-label">إجمالي الإيرادات</span>
          <span class="debt-kpi-val text-mono text-success">{{ formatCurrency(productionReportData.grandTotalRevenue || 0) }}</span>
        </div>
        <div class="debt-kpi-card highlight-debt">
          <span class="debt-kpi-label">إجمالي تكلفة الإنتاج</span>
          <span class="debt-kpi-val text-mono text-danger">{{ formatCurrency(productionReportData.grandTotalCost || 0) }}</span>
        </div>
        <div class="debt-kpi-card">
          <span class="debt-kpi-label">صافي الأرباح التقديرية</span>
          <span class="debt-kpi-val text-mono">{{ formatCurrency(Math.max(0, (productionReportData.grandTotalRevenue || 0) - (productionReportData.grandTotalCost || 0))) }}</span>
        </div>
      </div>

      <!-- Chef Breakdown Tables -->
      <div v-for="cReport in productionReportData.chefReport" :key="cReport.chefId" class="mb-4" style="page-break-inside: avoid;">
        <div class="d-flex justify-content-between align-items-center mb-2 pb-1" style="border-bottom: 2px solid #1e293b;">
          <h3 class="font-bold mb-0" style="font-size: 11pt;">👨‍🍳 الشيف: {{ cReport.chefName }}</h3>
          <span class="text-mono font-bold" style="font-size: 9pt;">إجمالي القطع: {{ cReport.totalQty }} | الإيراد: {{ formatCurrency(cReport.totalRevenue) }} | التكلفة: {{ formatCurrency(cReport.totalCost) }}</span>
        </div>

        <table class="debt-report-table">
          <thead>
            <tr>
              <th style="width: 5%;">ت</th>
              <th style="width: 45%;">اسم الصنف</th>
              <th style="width: 15%;">الكمية المباعة</th>
              <th style="width: 15%;">التكلفة الإجمالية</th>
              <th style="width: 20%;">إجمالي المبيعات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, pIdx) in cReport.products" :key="p.name">
              <td class="text-center text-mono text-muted">{{ pIdx + 1 }}</td>
              <td class="font-bold">{{ p.name }}</td>
              <td class="text-mono text-bold">{{ p.qty }}</td>
              <td class="text-mono text-danger">{{ formatCurrency(p.cost) }}</td>
              <td class="text-mono text-success text-bold">{{ formatCurrency(p.revenue) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Official Report Footer & Signatures -->
      <div class="debt-report-footer">
        <div class="debt-signature-block">
          <span class="sig-label">المسؤول عن الإنتاج:</span>
          <span class="sig-line">.....................................</span>
        </div>
        <div class="debt-stamp-block">
          <span class="sig-label">خاتم وتوقيع الإدارة:</span>
          <span class="sig-line">.....................................</span>
        </div>
      </div>
      
      <div class="debt-watermark-row">
        <span>تم استخراج هذا التقرير المالي آلياً عبر نظام المنيو الإلكتروني — تقرير إنتاج الشيفات</span>
      </div>
    </div>
  </div>

  <!-- Hidden Print Customer Debt Report (A4 Portrait) -->
  <div class="print-debt-report-wrapper" v-if="printingCustomerDebtReport">
    <div class="debt-report-page">
      <!-- Header Banner -->
      <div class="debt-header">
        <div class="debt-brand">
          <img :src="activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'" alt="Logo" class="debt-logo" />
          <div class="debt-brand-text">
            <h1 class="debt-shop-name">{{ activeShop === 'shop2' ? 'قسم النواشف' : 'حلويات عبمبر الزروق' }}</h1>
            <p class="debt-subtitle">كشف حساب ومديونيات العملاء التفصيلي</p>
          </div>
        </div>
        <div class="debt-header-badge">تقرير مالي معتمد</div>
      </div>

      <div class="debt-divider"></div>

      <!-- Meta Info Bar -->
      <div class="debt-meta">
        <div class="debt-meta-row">
          <span class="debt-meta-label">نطاق التقرير:</span>
          <span class="debt-meta-val debt-date-pill">{{ customerDebtReportData.filterLabel }}</span>
        </div>
        <div class="debt-meta-row">
          <span class="debt-meta-label">تاريخ الإصدار:</span>
          <span class="debt-meta-val text-mono">{{ customerDebtReportData.generatedAt }}</span>
        </div>
      </div>

      <!-- Summary KPI Cards -->
      <div class="debt-kpi-grid">
        <div class="debt-kpi-card">
          <span class="debt-kpi-label">إجمالي المشتريات</span>
          <span class="debt-kpi-val text-mono text-primary">{{ customerDebtReportData.totalPurchasesFormatted }}</span>
        </div>
        <div class="debt-kpi-card highlight-green">
          <span class="debt-kpi-label">إجمالي المسدد</span>
          <span class="debt-kpi-val text-mono text-success">{{ customerDebtReportData.totalPaidFormatted }}</span>
        </div>
        <div class="debt-kpi-card highlight-debt">
          <span class="debt-kpi-label">إجمالي الديون المتبقية</span>
          <span class="debt-kpi-val text-mono text-danger">{{ customerDebtReportData.totalDebtFormatted }}</span>
        </div>
        <div class="debt-kpi-card">
          <span class="debt-kpi-label">العملاء المدينين</span>
          <span class="debt-kpi-val text-mono">{{ customerDebtReportData.indebtedCount }} / {{ customerDebtReportData.totalCustomers }}</span>
        </div>
      </div>

      <!-- Main Customers Debt Table with requested columns [العميل, إجمالي المشتريات, المدفوع, الديون] -->
      <div class="debt-table-container">
        <table class="debt-report-table">
          <thead>
            <tr>
              <th style="width: 5%;">ت</th>
              <th style="width: 35%;">العميل</th>
              <th style="width: 20%;">إجمالي المشتريات</th>
              <th style="width: 20%;">المدفوع</th>
              <th style="width: 20%;">الديون المتبقية</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!customerDebtReportData.customers || customerDebtReportData.customers.length === 0">
              <td colspan="5" class="text-center py-4 text-muted">لا توجد سجلات عملاء متطابقة في هذا النطاق.</td>
            </tr>
            <tr 
              v-for="(cust, idx) in customerDebtReportData.customers" 
              :key="cust._id"
              :class="{ 'has-debt-row': (cust.outstandingBalance || 0) > 0 }"
            >
              <td class="text-center text-mono text-muted">{{ idx + 1 }}</td>
              <td>
                <div class="debt-cust-cell">
                  <span class="debt-cust-name font-bold">{{ cust.name }}</span>
                  <span class="debt-cust-phone text-mono text-muted" dir="ltr">{{ cust.phone }}</span>
                </div>
              </td>
              <td class="text-bold text-mono">{{ formatCurrency(cust.totalSpent || 0) }}</td>
              <td class="text-bold text-mono text-success">
                {{ formatCurrency(Math.max(0, (cust.totalSpent || 0) - (cust.outstandingBalance || 0))) }}
              </td>
              <td>
                <span 
                  class="debt-val-pill text-mono font-bold" 
                  :class="(cust.outstandingBalance || 0) > 0 ? 'is-debt' : 'is-clear'"
                >
                  {{ (cust.outstandingBalance || 0) > 0 ? formatCurrency(cust.outstandingBalance) : '0.00 د.ل (خالص)' }}
                </span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="debt-grand-total-row">
              <td colspan="2" class="text-bold text-end">الإجمالي العام (Grand Total):</td>
              <td class="text-bold text-mono text-primary">{{ customerDebtReportData.totalPurchasesFormatted }}</td>
              <td class="text-bold text-mono text-success">{{ customerDebtReportData.totalPaidFormatted }}</td>
              <td class="text-bold text-mono text-danger">{{ customerDebtReportData.totalDebtFormatted }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Official Report Footer & Signatures -->
      <div class="debt-report-footer">
        <div class="debt-signature-block">
          <span class="sig-label">المحاسب المسؤول:</span>
          <span class="sig-line">.....................................</span>
        </div>
        <div class="debt-stamp-block">
          <span class="sig-label">خاتم وتوقيع الإدارة:</span>
          <span class="sig-line">.....................................</span>
        </div>
      </div>
      
      <div class="debt-watermark-row">
        <span>تم استخراج هذا التقرير المالي آلياً عبر نظام المنيو الإلكتروني — كشف مديونيات العملاء</span>
      </div>
    </div>
  </div>

  <!-- Hidden Print Sales Reconciliation Report (A4 Portrait) -->
  <div class="print-reconciliation-wrapper" v-if="printingReconciliation">
    <div class="reconciliation-page" :class="['recon-density-' + reconDensity]">
      <!-- Header Banner -->
      <div class="recon-header">
        <div class="recon-brand">
          <img :src="activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'" alt="Logo" class="recon-logo" />
          <div class="recon-brand-text">
            <h1 class="recon-shop-name">{{ activeShop === 'shop2' ? 'قسم النواشف' : 'حلويات عبمبر الزروق' }}</h1>
            <p class="recon-subtitle">تقرير تسوية المبيعات اليومية والشاملة</p>
          </div>
        </div>
        <div class="recon-header-badge">كشف تسوية رسمي</div>
      </div>

      <div class="recon-divider"></div>

      <!-- Meta Info Bar -->
      <div class="recon-meta">
        <div class="recon-meta-row">
          <span class="recon-label">التاريخ المحدد:</span>
          <span class="recon-value recon-date-pill">{{ reconciliationData.dateLabel }}</span>
        </div>
        <div class="recon-meta-row">
          <span class="recon-label">تاريخ الإصدار:</span>
          <span class="recon-value">{{ new Date().toLocaleString('ar-LY') }}</span>
        </div>
      </div>

      <!-- Summary KPIs -->
      <div class="recon-kpi-grid">
        <div class="recon-kpi-card">
          <span class="recon-kpi-label">عدد الطلبات الكلي</span>
          <span class="recon-kpi-value recon-mono">{{ reconciliationData.totalOrders }}</span>
        </div>
        <div class="recon-kpi-card highlight">
          <span class="recon-kpi-label">إجمالي الإيرادات</span>
          <span class="recon-kpi-value recon-kpi-money">{{ reconciliationData.totalRevenueFormatted }}</span>
        </div>
      </div>

      <!-- Aggregated Products Breakdown Sectioned by Main & Sub Category -->
      <div class="recon-section">
        <div class="recon-section-header">
          <h3 class="recon-section-title">إجمالي المنتجات المباعة (مقسمة حسب التصنيف الرئيسي والفرعي)</h3>
        </div>

        <div v-if="!reconciliationData.categoryProductBreakdown || reconciliationData.categoryProductBreakdown.length === 0" class="recon-empty-text">
          لا توجد منتجات مباعة في الطلبات المحددة.
        </div>

        <div v-for="mainCat in reconciliationData.categoryProductBreakdown" :key="mainCat.name" class="recon-cat-block">
          <!-- Main Category Header (Centered) -->
          <div class="recon-cat-header">
            <span class="recon-cat-title">{{ mainCat.name }}</span>
            <span class="recon-cat-stats">
              (إجمالي القطع: <strong class="recon-mono">{{ mainCat.totalQty }}</strong> | الإيراد: <strong class="recon-mono">{{ mainCat.totalRevenueFormatted }}</strong>)
            </span>
          </div>

          <!-- Subcategories -->
          <div v-for="subCat in mainCat.subCategories" :key="subCat.name" class="recon-subcat-block">
            <div class="recon-subcat-title-container" v-if="mainCat.subCategories.length > 1 && subCat.name !== 'عام'">
              <span class="recon-subcat-title">{{ subCat.name }}</span>
            </div>

            <table class="recon-detail-table">
              <thead>
                <tr class="recon-col-header-row">
                  <th style="width: 36%; text-align: right; padding: 7px 8px 5px 8px;">اسم المنتج</th>
                  <th style="width: 14%; text-align: center; padding: 7px 6px 5px 6px;">الكمية المباعة</th>
                  <th style="width: 22%; text-align: center; padding: 7px 8px 5px 8px;">سعر الوحدة</th>
                  <th style="width: 28%; text-align: left; padding: 7px 10px 5px 10px;">إجمالي المبيعات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="prod in subCat.products" :key="prod.name">
                  <td style="width: 36%; text-align: right; padding: 5px 8px;" class="recon-bold">{{ prod.name }}</td>
                  <td style="width: 14%; text-align: center; padding: 5px 6px;" class="recon-mono recon-bold">{{ prod.quantity }}</td>
                  <td style="width: 22%; text-align: center; padding: 5px 8px;" class="recon-mono">{{ prod.unitPriceFormatted }}</td>
                  <td style="width: 28%; text-align: left; padding: 5px 10px;" class="recon-mono recon-bold">{{ prod.totalRevenueFormatted }}</td>
                </tr>
              </tbody>
              <tfoot v-if="mainCat.subCategories.length > 1 && subCat.products.length > 1">
                <tr class="recon-subtotal-row">
                  <td style="width: 36%; text-align: right; padding: 5px 8px;">مجموع فرعي ({{ subCat.name }})</td>
                  <td style="width: 14%; text-align: center; padding: 5px 6px;" class="recon-mono recon-bold">{{ subCat.totalQty }}</td>
                  <td style="width: 22%; text-align: center; padding: 5px 8px;" class="recon-mono">—</td>
                  <td style="width: 28%; text-align: left; padding: 5px 10px;" class="recon-mono recon-bold">{{ subCat.totalRevenueFormatted }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Grand Total Summary Card -->
        <div class="recon-grand-total-card">
          <div class="recon-gt-title">الإجمالي الكلي لجميع المبيعات والمنتجات</div>
          <div class="recon-gt-metrics">
            <span class="gt-metric">إجمالي القطع: <strong class="recon-mono">{{ reconciliationData.grandTotalItemsQty }} قطعة</strong></span>
            <span class="gt-metric highlight">الإيراد الكلي: <strong class="recon-mono">{{ reconciliationData.totalRevenueFormatted }}</strong></span>
          </div>
        </div>
      </div>

      <div class="recon-footer">
        <p>كشف تسوية مبيعات رسمية — {{ activeShop === 'shop2' ? 'قسم النواشف' : 'حلويات عبمبر الزروق' }} — طرابلس، ليبيا</p>
        <p class="recon-footer-sub">تم إنشاؤه واستخراجه من لوحة التحكم الذكية e-Menu</p>
      </div>
    </div>
  </div>

  <!-- Hidden Print Receipt (A5) -->
  <div class="print-receipt-wrapper" v-if="printingOrder">
    <div v-for="(pageChunk, pageIndex) in paginatedOrderPages" :key="pageIndex" class="print-receipt">
      <div class="receipt-header">
        <img :src="activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'" alt="Logo" class="receipt-logo" />
        <div class="receipt-brand">
          <h1 class="receipt-shop-name">{{ activeShop === 'shop2' ? 'قسم النواشف' : 'حلويات عبمبر الزروق' }}</h1>
          <p class="receipt-tagline">الجودة في كل قطعة</p>
        </div>
      </div>

      <div class="receipt-divider"></div>

      <div class="receipt-meta">
        <div class="receipt-meta-row">
          <span class="receipt-label">رقم الطلب:</span>
          <span class="receipt-value">#{{ printingOrder.orderNumber || printingOrder._id.toString().slice(-6) }}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-label">التاريخ:</span>
          <span class="receipt-value">{{ new Date(printingOrder.createdAt).toLocaleString('ar-LY') }}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-label">العميل:</span>
          <span class="receipt-value">{{ printingOrder.customerInfo.name }}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-label">الهاتف:</span>
          <span class="receipt-value receipt-phone">{{ printingOrder.customerInfo.phone }}</span>
        </div>
        <div class="receipt-meta-row" v-if="printingOrder.deliveryDate">
          <span class="receipt-label">تاريخ التسليم:</span>
          <span class="receipt-value">{{ printingOrder.deliveryDate }}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-label">نوع السعر:</span>
          <span class="receipt-value">{{ printingOrder.priceMode === 'bulk' ? 'جملة' : 'مفرد' }}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-label">حالة الدفع:</span>
          <span class="receipt-value" :class="printingOrder.paymentStatus === 'paid' ? 'paid' : 'unpaid'">
            {{ printingOrder.paymentStatus === 'paid' ? 'خالص' : 'غير خالص' }}
          </span>
        </div>
        <div class="receipt-meta-row" v-if="printingOrder.paymentMethod">
          <span class="receipt-label">طريقة الدفع:</span>
          <span class="receipt-value">
            {{ printingOrder.paymentMethod === 'card' ? 'بطاقة مصرفية' : printingOrder.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'نقدي' }}
          </span>
        </div>
      </div>

      <div class="receipt-divider"></div>

      <table class="receipt-items-table">
        <thead>
          <tr>
            <th class="receipt-th-name">المنتج</th>
            <th class="receipt-th-qty">الكمية</th>
            <th class="receipt-th-price">السعر</th>
            <th class="receipt-th-total">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in pageChunk" :key="idx">
            <td class="receipt-td-name">
              {{ item.name }}
              <span v-if="item.notes" class="receipt-item-note">{{ item.notes }}</span>
            </td>
            <td class="receipt-td-qty">{{ item.quantity }}</td>
            <td class="receipt-td-price">{{ Number(item.price).toFixed(2) }}</td>
            <td class="receipt-td-total">{{ (Number(item.price) * Number(item.quantity)).toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Footer elements only on last page -->
      <template v-if="pageIndex === paginatedOrderPages.length - 1">
        <div class="receipt-divider"></div>

        <div class="receipt-total-section">
          <div class="receipt-grand-total">
            <span>إجمالي الطلب</span>
            <span class="receipt-grand-value">{{ Number(printingOrder.totalPrice).toFixed(2) }} د.ل</span>
          </div>
          <div v-if="printingOrderCustomerBalance !== null" class="receipt-customer-balance-row">
            <span>إجمالي رصيد العميل (المستحق)</span>
            <span class="receipt-balance-value">{{ formatCurrency(printingOrderCustomerBalance) }}</span>
          </div>
        </div>

        <div v-if="printingOrder.notes" class="receipt-notes">
          <span class="receipt-label">ملاحظات:</span>
          <p>{{ printingOrder.notes }}</p>
        </div>
      </template>

      <!-- Barcode Container -->
      <div class="receipt-barcode-container">
        <svg :id="'barcode-order-' + pageIndex" class="receipt-barcode-svg"></svg>
      </div>

      <div class="receipt-footer">
        <p v-if="paginatedOrderPages.length > 1" class="receipt-page-num">صفحة {{ pageIndex + 1 }} من {{ paginatedOrderPages.length }}</p>
        <p>شكراً لتعاملكم معنا</p>
        <p class="receipt-footer-sub">حلويات عبمبر الزروق — طرابلس، ليبيا</p>
      </div>
    </div>
  </div>

  <!-- ============ PAYMENT RECORDING MODAL ============ -->
  <div v-if="paymentModalOpen" class="modal-overlay animate-fade-in" @click.self="paymentModalOpen = false">
    <div class="modal-content modal-lg">
      <div class="modal-header">
        <div class="modal-title-group">
          <h2 class="modal-title">تسجيل دفعة نقدية</h2>
          <span class="modal-subtitle">
            {{ paymentTarget.customerName }} — <span class="text-mono" style="direction: ltr; display: inline-block;">{{ paymentTarget.customerPhone }}</span>
          </span>
        </div>
        <button @click="paymentModalOpen = false" class="modal-close-btn">✕</button>
      </div>

      <div v-if="paymentLoading" class="modal-body text-center p-4">
        <div class="spinner"></div>
        <p class="text-muted mt-2">جاري تحميل البيانات...</p>
      </div>

      <div v-else class="modal-body">
        <!-- Customer Balance Summary -->
        <div class="payment-balance-summary">
          <div class="balance-card balance-outstanding">
            <span class="balance-label">الرصيد المستحق الحالي</span>
            <span class="balance-value">{{ formatCurrency(paymentTarget.outstandingBalance) }}</span>
          </div>
          <div class="balance-card balance-after">
            <span class="balance-label">المتبقي بعد الدفع</span>
            <span class="balance-value">{{ formatCurrency(paymentRemainingAfter) }}</span>
          </div>
        </div>

        <!-- Unpaid Orders List with Scroll Lights & Shadows -->
        <div v-if="paymentTarget.unpaidOrders.length" class="payment-unpaid-orders">
          <h4 class="payment-section-title">الطلبات غير المسددة ({{ paymentTarget.unpaidOrders.length }})</h4>
          <div class="unpaid-orders-scroll-wrapper">
            <div class="unpaid-orders-list">
              <div v-for="order in paymentTarget.unpaidOrders" :key="order._id" class="unpaid-order-item">
                <div class="unpaid-order-id">#{{ order.orderNumber || order._id.toString().slice(-6) }}</div>
                <div class="unpaid-order-date">{{ new Date(order.createdAt).toLocaleDateString('ar-LY') }}</div>
                <div class="unpaid-order-total">{{ formatCurrency(order.totalPrice) }}</div>
                <div class="unpaid-order-paid">مدفوع: {{ formatCurrency(order.paidAmount) }}</div>
                <div class="unpaid-order-remaining text-bold" style="color: #ef4444;">متبقي: {{ formatCurrency(order.remaining) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="payment-no-debt">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <p>لا توجد مستحقات على هذا العميل</p>
        </div>

        <!-- Payment Input Section -->
        <div v-if="paymentTarget.outstandingBalance > 0" class="payment-input-section">
          <!-- Allocation Mode Selector -->
          <div class="payment-mode-selector">
            <label class="form-label">طريقة تخصيص الدفعة:</label>
            <div class="payment-mode-pills">
              <button 
                v-if="paymentTarget.targetOrderId" 
                type="button" 
                class="mode-pill" 
                :class="{ active: paymentTarget.mode === 'target' }" 
                @click="setPaymentMode('target')"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="me-1"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span>مخصص للطلب #{{ paymentTarget.targetOrderShort }}</span>
              </button>
              <button 
                type="button" 
                class="mode-pill" 
                :class="{ active: paymentTarget.mode === 'fifo' }" 
                @click="setPaymentMode('fifo')"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="me-1"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>الأقدم فأحدث (توزيع تلقائي)</span>
              </button>
              <button 
                type="button" 
                class="mode-pill" 
                :class="{ active: paymentTarget.mode === 'full' }" 
                @click="setPaymentMode('full')"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="me-1"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                <span>كامل المستحقات ({{ formatCurrency(paymentTarget.outstandingBalance) }})</span>
              </button>
            </div>
          </div>

          <div class="payment-form-grid">
            <div class="form-group">
              <label class="form-label">المبلغ (د.ل)</label>
              <input v-model="paymentTarget.amount" type="number" step="0.01" min="0.01" :max="paymentTarget.outstandingBalance" class="form-control payment-amount-input" placeholder="0.00" autofocus />
            </div>

            <div class="form-group">
              <label class="form-label">طريقة الدفع</label>
              <select v-model="paymentTarget.method" class="form-control">
                <option value="cash">نقدي</option>
                <option value="card">بطاقة مصرفية</option>
                <option value="bank_transfer">تحويل بنكي</option>
              </select>
            </div>

            <div class="form-group form-group-full">
              <label class="form-label">ملاحظة (اختياري)</label>
              <input v-model="paymentTarget.note" type="text" class="form-control" placeholder="ملاحظة على الدفعة..." />
            </div>
          </div>

          <!-- Distribution Preview Table -->
          <div v-if="paymentFifoPreview.length" class="fifo-preview">
            <h4 class="payment-section-title">
              <template v-if="paymentTarget.mode === 'target'">معاينة تخصيص الدفعة للطلب #{{ paymentTarget.targetOrderShort }}</template>
              <template v-else-if="paymentTarget.mode === 'full'">معاينة تسديد كامل المستحقات</template>
              <template v-else>معاينة التوزيع التلقائي (من الأقدم للأحدث)</template>
            </h4>
            
            <div class="fifo-preview-table-wrapper">
              <table class="fifo-preview-table">
                <thead>
                  <tr>
                    <th>رقم الطلب</th>
                    <th>المبلغ المخصص</th>
                    <th>حالة الطلب بعد الدفع</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in paymentFifoPreview" :key="item.orderId" :class="{ 'target-row': item.isTarget }">
                    <td class="text-mono text-bold">
                      #{{ item.orderIdShort }}
                      <span v-if="item.isTarget" class="target-tag ms-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-left: 2px;"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> مخصص</span>
                    </td>
                    <td class="text-bold text-success text-mono">{{ formatCurrency(item.applied) }}</td>
                    <td>
                      <span class="allocation-badge" :class="item.fullyPaid ? 'badge-paid' : 'badge-partial'">
                        {{ item.fullyPaid ? 'مسدد بالكامل' : 'تسديد جزئي' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!paymentLoading && paymentTarget.outstandingBalance > 0" class="modal-footer mt-4">
        <button type="button" @click="recordPayment" class="btn btn-primary btn-modal-save" :disabled="paymentLoading || !Number(paymentTarget.amount)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="me-1"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>تأكيد وطباعة إيصال</span>
        </button>
        <button type="button" @click="paymentModalOpen = false" class="btn btn-outline btn-modal-cancel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="me-1"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          <span>إلغاء</span>
        </button>
      </div>
    </div>
  </div>

  <!-- ============ PAYMENT HISTORY MODAL ============ -->
  <div v-if="paymentHistoryModalOpen" class="modal-overlay animate-fade-in" @click.self="paymentHistoryModalOpen = false">
    <div class="modal-content modal-lg">
      <div class="modal-header">
        <div class="modal-title-group">
          <h2 class="modal-title">سجل المدفوعات والتحصيلات</h2>
          <span class="modal-subtitle">
            {{ paymentTarget.customerName }} — <span class="text-mono" style="direction: ltr; display: inline-block;">{{ paymentTarget.customerPhone }}</span>
          </span>
        </div>
        <button @click="paymentHistoryModalOpen = false" class="modal-close-btn">✕</button>
      </div>

      <div v-if="paymentLoading" class="modal-body text-center p-4">
        <div class="spinner"></div>
        <p class="text-muted mt-2">جاري التحميل...</p>
      </div>

      <div v-else class="modal-body">
        <div class="payment-balance-summary" style="margin-bottom: 20px;">
          <div class="balance-card balance-outstanding">
            <span class="balance-label">الرصيد المستحق الحالي</span>
            <span class="balance-value">{{ formatCurrency(paymentTarget.outstandingBalance) }}</span>
          </div>
        </div>

        <div v-if="paymentTarget.recentPayments.length" class="payment-history-list">
          <div v-for="payment in paymentTarget.recentPayments" :key="payment._id" class="payment-history-item">
            <div class="payment-history-header">
              <span class="payment-history-amount">{{ formatCurrency(payment.amount) }}</span>
              <span class="payment-history-method">{{ payment.method === 'cash' ? 'نقدي' : payment.method === 'card' ? 'بطاقة مصرفية' : payment.method === 'bank_transfer' ? 'تحويل بنكي' : 'نقدي' }}</span>
              <span class="payment-history-date">{{ new Date(payment.createdAt).toLocaleString('ar-LY') }}</span>
            </div>
            <div v-if="payment.note" class="payment-history-note">{{ payment.note }}</div>
            <div class="payment-history-distribution">
              <span v-for="d in payment.distributedTo" :key="d.orderId" class="payment-dist-chip">
                #{{ d.orderNumber || (d.orderId ? d.orderId.toString().slice(-6) : '') }}: {{ formatCurrency(d.applied) }}
              </span>
            </div>
            <div class="payment-history-footer mt-2">
              <button @click="printPaymentReceipt(payment)" class="btn btn-outline btn-xs btn-payment-print" title="طباعة الإيصال">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                <span>طباعة الإيصال</span>
              </button>
            </div>
          </div>
        </div>

        <div v-else class="payment-no-debt">
          <p>لا توجد مدفوعات مسجلة لهذا العميل</p>
        </div>
      </div>

      <div class="modal-footer mt-4">
        <button type="button" @click="paymentHistoryModalOpen = false" class="btn btn-outline btn-modal-cancel">
          <span>إغلاق</span>
        </button>
      </div>
    </div>
  </div>

  <!-- ============ CASH-IN RECEIPT PRINT TEMPLATE ============ -->
  <div class="print-payment-receipt-wrapper" v-if="printingPaymentReceipt && printingPayment">
    <div class="print-payment-receipt">
      <div class="receipt-header">
        <img :src="activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'" alt="Logo" class="receipt-logo" />
        <div class="receipt-brand">
          <h1 class="receipt-shop-name">{{ activeShop === 'shop2' ? 'قسم النواشف' : 'حلويات عبمبر الزروق' }}</h1>
          <p class="receipt-tagline">إيصال تحصيل نقدي</p>
        </div>
      </div>

      <div class="receipt-divider"></div>

      <div class="receipt-meta">
        <div class="receipt-meta-row">
          <span class="receipt-label">رقم الإيصال:</span>
          <span class="receipt-value">#{{ printingPayment._id.toString().slice(-8) }}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-label">التاريخ:</span>
          <span class="receipt-value">{{ new Date(printingPayment.createdAt).toLocaleString('ar-LY') }}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-label">العميل:</span>
          <span class="receipt-value">{{ printingPayment.customerName }}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-label">الهاتف:</span>
          <span class="receipt-value receipt-phone">{{ printingPayment.customerPhone }}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-label">طريقة الدفع:</span>
          <span class="receipt-value">{{ printingPayment.method === 'cash' ? 'نقدي' : printingPayment.method === 'card' ? 'بطاقة مصرفية' : printingPayment.method === 'bank_transfer' ? 'تحويل بنكي' : 'نقدي' }}</span>
        </div>
      </div>

      <div class="receipt-divider"></div>

      <!-- Payment Amount -->
      <div class="payment-receipt-amount-section">
        <div class="payment-receipt-row">
          <span>الرصيد السابق</span>
          <span>{{ Number(printingPayment.balanceBefore).toFixed(2) }} د.ل</span>
        </div>
        <div class="payment-receipt-row payment-receipt-highlight">
          <span>المبلغ المدفوع</span>
          <span>{{ Number(printingPayment.amount).toFixed(2) }} د.ل</span>
        </div>
        <div class="payment-receipt-row">
          <span>الرصيد المتبقي</span>
          <span>{{ Number(printingPayment.remainingBalanceAfter).toFixed(2) }} د.ل</span>
        </div>
      </div>

      <div class="receipt-divider"></div>

      <!-- Distribution Breakdown -->
      <div v-if="printingPayment.distributedTo && printingPayment.distributedTo.length" class="payment-receipt-distribution">
        <h4 style="font-size: 11px; margin: 0 0 6px 0; font-weight: 700;">تفصيل التوزيع على الطلبات:</h4>
        <table class="receipt-items-table">
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>المبلغ المطبق</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in printingPayment.distributedTo" :key="d.orderId">
              <td>#{{ d.orderNumber || (d.orderId ? d.orderId.toString().slice(-6) : '') }}</td>
              <td>{{ Number(d.applied).toFixed(2) }} د.ل</td>
              <td>{{ d.newStatus === 'paid' ? 'مسدد' : 'جزئي' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="printingPayment.note" class="receipt-notes">
        <span class="receipt-label">ملاحظة:</span>
        <p>{{ printingPayment.note }}</p>
      </div>

      <!-- Barcode Container -->
      <div class="receipt-barcode-container">
        <svg id="barcode-payment" class="receipt-barcode-svg"></svg>
      </div>

      <div class="receipt-footer">
        <p>شكراً لتعاملكم معنا</p>
        <p class="receipt-footer-sub">حلويات عبمبر الزروق — طرابلس، ليبيا</p>
      </div>
    </div>
  </div>

</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToastStore } from '../stores/toast';
import CategoryIcon from '../components/CategoryIcon.vue';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import JsBarcode from 'jsbarcode';
import { formatLibyanWhatsappNumber, getLibyanWhatsAppUrl } from '../utils/phone';

export default {
  name: 'AdminView',
  components: {
    CategoryIcon
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const toast = useToastStore();
    const loading = ref(false);
    const isAuthenticated = ref(false);
    const sidebarOpen = ref(false);

    // Persistent Active Tab Management across page reloads
    const VALID_TABS = ['analytics', 'products', 'categories', 'tags', 'orders', 'customers', 'production', 'carousel', 'users'];
    const getInitialTab = () => {
      try {
        const queryTab = route.query && route.query.tab ? String(route.query.tab) : '';
        if (VALID_TABS.includes(queryTab)) return queryTab;
        const saved = localStorage.getItem('emenu_admin_active_tab');
        if (VALID_TABS.includes(saved)) return saved;
      } catch (e) {}
      return 'analytics';
    };

    const activeTab = ref(getInitialTab());
    const activeShop = ref('shop1');
    const loginShop = ref('shop1');

    watch(activeTab, (newTab) => {
      if (newTab && VALID_TABS.includes(newTab)) {
        try {
          localStorage.setItem('emenu_admin_active_tab', newTab);
          if (route.query?.tab !== newTab) {
            router.replace({ query: { ...route.query, tab: newTab } }).catch(() => {});
          }
        } catch (e) {}
      }
    });

    // Also watch route.query.tab if user clicks browser back/forward
    watch(() => route.query.tab, (qTab) => {
      if (qTab && VALID_TABS.includes(String(qTab)) && activeTab.value !== qTab) {
        if (userRole.value === 'order_manager' && qTab !== 'orders') {
          activeTab.value = 'orders';
        } else {
          activeTab.value = String(qTab);
        }
      }
    });

    // Login Data
    const loginForm = reactive({ username: '', password: '' });
    const loginError = ref('');
    const publicAdminUsers = ref([{ username: 'admin', name: 'المدير العام', role: 'admin' }]);

    const fetchPublicAdminUsers = async () => {
      try {
        const res = await fetch('/api/public/admin-users');
        if (res.ok) {
          const data = await res.json();
          if (data.users && data.users.length > 0) {
            publicAdminUsers.value = data.users;
            // Auto select first user if not set
            if (!loginForm.username && data.users.length > 0) {
              loginForm.username = data.users[0].username;
            }
          }
        }
      } catch (err) {
        console.error('Failed to load public admin users for dropdown:', err);
      }
    };

    // Cropper Data (Missing Refs)
    const cropperModalOpen = ref(false);
    const cropperImageElement = ref(null);
    const cropperImageSrc = ref('');
    const activeAspectRatio = ref(3/1);
    let cropperInstance = null;

    // User Roles & Authentication State
    const userRole = ref(localStorage.getItem('admin_role') || 'admin');
    const userDisplayName = ref(localStorage.getItem('admin_name') || 'المدير العام');
    const adminUsers = ref([]);
    const userModalOpen = ref(false);
    const editingUser = reactive({
      _id: null,
      name: '',
      password: '',
      role: 'order_manager',
      shopAccess: 'all'
    });

    // Tabs Titles
    const tabTitles = {
      analytics: 'لوحة الإحصائيات والتقارير المالية',
      products: 'إدارة المنتجات وقائمة الأسعار',
      categories: 'تصنيف وتقسيم الأصناف الرئيسية',
      tags: 'إدارة العلامات المميزة (Tags)',
      orders: 'سجل وإدارة طلبات العملاء',
      customers: 'قائمة العملاء والمنتجات المفضلة',
      production: 'إدارة الإنتاج وتقارير الشيفات',
      carousel: 'إدارة بنرات العروض التسويقية',
      users: 'إدارة المستخدمين وصلاحيات النظام'
    };

    // Analytics Data
    const analyticsPeriod = ref('30d');
    const analyticsStartDate = ref('');
    const analyticsEndDate = ref('');
    const analyticsLoading = ref(false);

    // Standardized Analytics Date Range Popover Logic
    const analyticsFromOpen = ref(false);
    const analyticsToOpen = ref(false);
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

    const analyticsFromCalendarDays = computed(() => buildCalendarMatrix(analyticsFromYear.value, analyticsFromMonth.value));
    const analyticsToCalendarDays = computed(() => buildCalendarMatrix(analyticsToYear.value, analyticsToMonth.value));

    const openAnalyticsFromPicker = () => {
      analyticsToOpen.value = false;
      analyticsFromOpen.value = !analyticsFromOpen.value;
    };
    const openAnalyticsToPicker = () => {
      analyticsFromOpen.value = false;
      analyticsToOpen.value = !analyticsToOpen.value;
    };

    const selectAnalyticsFrom = async (dateStr) => {
      analyticsStartDate.value = dateStr;
      analyticsFromOpen.value = false;
      if (!analyticsEndDate.value || analyticsEndDate.value < dateStr) {
        analyticsEndDate.value = dateStr;
      }
      await fetchAnalytics();
    };

    const selectAnalyticsTo = async (dateStr) => {
      analyticsEndDate.value = dateStr;
      analyticsToOpen.value = false;
      if (!analyticsStartDate.value || analyticsStartDate.value > dateStr) {
        analyticsStartDate.value = dateStr;
      }
      await fetchAnalytics();
    };

    const setAnalyticsShortcut = async (type) => {
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-CA');
      analyticsFromOpen.value = false;
      analyticsToOpen.value = false;

      if (type === 'today') {
        analyticsStartDate.value = todayStr;
        analyticsEndDate.value = todayStr;
      } else if (type === '7d') {
        const past = new Date();
        past.setDate(past.getDate() - 6);
        analyticsStartDate.value = past.toLocaleDateString('en-CA');
        analyticsEndDate.value = todayStr;
      } else if (type === 'month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        analyticsStartDate.value = firstDay.toLocaleDateString('en-CA');
        analyticsEndDate.value = todayStr;
      }
      await fetchAnalytics();
    };

    const isAnalyticsToday = computed(() => {
      const todayStr = getTodayStr();
      return analyticsStartDate.value === todayStr && analyticsEndDate.value === todayStr;
    });

    const isAnalytics7d = computed(() => {
      const todayStr = getTodayStr();
      const past = new Date();
      past.setDate(past.getDate() - 6);
      return analyticsStartDate.value === past.toLocaleDateString('en-CA') && analyticsEndDate.value === todayStr;
    });

    const isAnalyticsMonth = computed(() => {
      const today = new Date();
      const firstDayStr = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA');
      return analyticsStartDate.value === firstDayStr && analyticsEndDate.value === today.toLocaleDateString('en-CA');
    });

    // POS Modal Standardized DatePicker State & Logic
    const posDatePickerOpen = ref(false);
    const posPickerYear = ref(new Date().getFullYear());
    const posPickerMonth = ref(new Date().getMonth());

    const posCurrentMonthYearLabel = computed(() => {
      const d = new Date(posPickerYear.value, posPickerMonth.value, 1);
      return d.toLocaleDateString('ar-LY', { month: 'long', year: 'numeric' });
    });

    const posPrevMonth = () => {
      if (posPickerMonth.value === 0) { posPickerMonth.value = 11; posPickerYear.value--; }
      else { posPickerMonth.value--; }
    };
    const posNextMonth = () => {
      if (posPickerMonth.value === 11) { posPickerMonth.value = 0; posPickerYear.value++; }
      else { posPickerMonth.value++; }
    };

    const posCalendarDays = computed(() => buildCalendarMatrix(posPickerYear.value, posPickerMonth.value));

    const selectPosDateFromPicker = (dateStr) => {
      newOrder.deliveryDate = dateStr;
      posDatePickerOpen.value = false;
    };

    const isPosDateRelative = (offsetDays) => {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      return newOrder.deliveryDate === d.toLocaleDateString('en-CA');
    };
    const periods = [
      { val: '7d', label: 'آخر 7 أيام' },
      { val: '30d', label: 'آخر 30 يوم' },
      { val: 'all', label: 'كل الأوقات' },
      { val: 'custom', label: 'فترة مخصصة' }
    ];

    const analyticsData = reactive({
      kpi: { totalRevenue: 0, orderCount: 0, avgOrderValue: 0, activeCustomers: 0 },
      revenueTrend: [],
      priceModeSplit: { regular: { revenue: 0, count: 0 }, bulk: { revenue: 0, count: 0 } },
      paymentMethodsSplit: { cash: { revenue: 0, count: 0 }, card: { revenue: 0, count: 0 }, bank_transfer: { revenue: 0, count: 0 } },
      topProducts: [],
      topCustomers: [],
      categorySales: [],
      topFavorites: [],
      inactiveCustomers: [],
      lowPerformingProducts: []
    });

    // Product & Categories datasets
    const products = ref([]);
    const categories = ref([]);
    const tags = ref([]);
    const orders = ref([]);
    const customers = ref([]);

    const filters = reactive({ search: '', category: '', subCategory: '' });
    const orderFilters = reactive({ search: '', status: '', selectedDate: '' });
    const customerFilters = reactive({ search: '', dateFrom: '', dateTo: '' });

    // Custom DatePicker State & Calendar Logic
    const datePickerOpen = ref(false);
    const today = new Date();
    const pickerYear = ref(today.getFullYear());
    const pickerMonth = ref(today.getMonth());

    const currentMonthYearLabel = computed(() => {
      const d = new Date(pickerYear.value, pickerMonth.value, 1);
      return d.toLocaleDateString('ar-LY', { month: 'long', year: 'numeric' });
    });

    const prevMonth = () => {
      if (pickerMonth.value === 0) {
        pickerMonth.value = 11;
        pickerYear.value--;
      } else {
        pickerMonth.value--;
      }
    };

    const nextMonth = () => {
      if (pickerMonth.value === 11) {
        pickerMonth.value = 0;
        pickerYear.value++;
      } else {
        pickerMonth.value++;
      }
    };

    const calendarDays = computed(() => {
      const year = pickerYear.value;
      const month = pickerMonth.value;
      
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      
      const daysInMonth = lastDayOfMonth.getDate();
      const startDayOfWeek = firstDayOfMonth.getDay();
      
      const days = [];
      const prevMonthLastDay = new Date(year, month, 0).getDate();
      
      for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const pDay = prevMonthLastDay - i;
        const pDate = new Date(year, month - 1, pDay);
        const dateStr = pDate.toLocaleDateString('en-CA');
        days.push({ dayNum: pDay, dateStr, inMonth: false, isToday: false });
      }
      
      const todayStr = new Date().toLocaleDateString('en-CA');
      for (let d = 1; d <= daysInMonth; d++) {
        const cDate = new Date(year, month, d);
        const dateStr = cDate.toLocaleDateString('en-CA');
        days.push({ 
          dayNum: d, 
          dateStr, 
          inMonth: true, 
          isToday: dateStr === todayStr 
        });
      }
      
      const remaining = (7 - (days.length % 7)) % 7;
      for (let n = 1; n <= remaining; n++) {
        const nDate = new Date(year, month + 1, n);
        const dateStr = nDate.toLocaleDateString('en-CA');
        days.push({ dayNum: n, dateStr, inMonth: false, isToday: false });
      }
      
      return days;
    });

    const selectDateFromPicker = (dateStr) => {
      orderFilters.selectedDate = dateStr;
      datePickerOpen.value = false;
    };

    const formatArabicDate = (dateStr) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('ar-LY', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const isTodaySelected = computed(() => {
      const todayStr = new Date().toLocaleDateString('en-CA');
      return orderFilters.selectedDate === todayStr;
    });

    const setOrderTodayDate = () => {
      const todayStr = new Date().toLocaleDateString('en-CA');
      orderFilters.selectedDate = orderFilters.selectedDate === todayStr ? '' : todayStr;
    };

    watch(() => filters.category, () => {
      filters.subCategory = '';
    });

    const availableSubcategories = computed(() => {
      if (!filters.category) return [];
      const catObj = categories.value.find(c => c.name === filters.category);
      return catObj ? (catObj.subCategories || []) : [];
    });

    // Modals control
    const productModalOpen = ref(false);
    const categoryModalOpen = ref(false);
    const tagModalOpen = ref(false);
    const customerModalOpen = ref(false);
    const customerDetailsModalOpen = ref(false);
    const selectedCustomer = ref(null);
    const customerFavsModalOpen = ref(false);
    const orderEditModalOpen = ref(false);

    // Order edit form bindings
    const editingOrder = reactive({
      _id: '',
      customerName: '',
      customerPhone: '',
      items: [],
      totalPrice: 0,
      priceMode: 'regular',
      status: 'pending',
      deliveryDate: '',
      notes: ''
    });
    
    // Customer form bindings
    const showProfilePassword = ref(false);
    const editingCustomer = reactive({
      _id: '',
      name: '',
      phone: '',
      password: '',
      showPassword: false
    });
    const viewingCustomerFavs = ref([]);
    const viewingCustomer = ref(null);
    const zoomedImageSrc = ref(null);
    const isAdminZoomLoaded = ref(false);

    // Chef and Production State
    const chefs = ref([]);
    const productionSubTab = ref('chefs');
    const chefModalOpen = ref(false);
    const editingChef = reactive({
      _id: '',
      name: '',
      phone: '',
      active: true
    });
    const assignProductsModalOpen = ref(false);
    const selectedChefForAssign = ref(null);
    const selectedProductIdsForChef = ref([]);
    const assignProductSearch = ref('');
    const productionReportFilters = reactive({
      dateFrom: '',
      dateTo: '',
      chefId: ''
    });
    const productionReportData = ref({
      chefReport: [],
      unassigned: [],
      totalOrders: 0,
      grandTotalQty: 0,
      grandTotalRevenue: 0,
      grandTotalCost: 0
    });
    const isLoadingReport = ref(false);
    const printingProductionReport = ref(false);

    // Product form bindings
    const editingProduct = reactive({
      _id: '',
      name: '',
      desc: '',
      category: '',
      subCategory: '',
      purchaseType: 'both',
      price_regular: null,
      price_bulk: null,
      makingCost: 0,
      allowFloat: false,
      img: '',
      tags: [],
      chefId: '',
      chefName: ''
    });

    const toggleProductTag = (tagName) => {
      if (!editingProduct.tags) editingProduct.tags = [];
      const index = editingProduct.tags.indexOf(tagName);
      if (index > -1) {
        editingProduct.tags.splice(index, 1);
      } else {
        editingProduct.tags.push(tagName);
      }
    };

    const modalFileInput = ref(null);
    const modalFile = ref(null);
    const modalFilePreview = ref('');
    const modalDragActive = ref(false);

    // Marketing Carousel Ref State
    const carouselItems = ref([]);
    const editingCarouselId = ref(null);
    const carouselModalOpen = ref(false);
    const carouselDragActive = ref(false);
    const carouselFileInput = ref(null);
    const recompressingBanners = ref(false);
    const recompressProgress = ref(0);
    const recompressingProducts = ref(false);
    const recompressProductsProgress = ref(0);
    const newCarouselItem = reactive({
      title: '',
      subtitle: '',
      link: '',
      file: null,
      filePreview: '',
      dimensions: ''
    });

    // Category form bindings
    const editingCategory = reactive({
      _id: '',
      name: '',
      emoji: '',
      subCategories: []
    });
    const categorySubcategoriesString = ref('');

    // Tag form bindings
    const editingTag = reactive({
      _id: '',
      name: '',
      color: 'default',
      icon: 'trophy'
    });

    const tagColors = [
      { key: 'default', label: 'اللون الافتراضي (رئيسي)' },
      { key: 'rose', label: 'وردي (Rose)' },
      { key: 'gold', label: 'ذهبي (Gold)' },
      { key: 'fire', label: 'برتقالي/ناري (Fire)' },
      { key: 'leaf', label: 'أخضر (Green)' },
      { key: 'sky', label: 'أزرق (Blue)' },
      { key: 'royal', label: 'بنفسجي (Purple)' }
    ];

    const tagIcons = [
      { key: 'new', label: 'جديد (NEW)' },
      { key: 'new_badge', label: 'إضافة جديدة' },
      { key: 'trophy', label: 'كأس' },
      { key: 'badge_check', label: 'جودة' },
      { key: 'star_award', label: 'جائزة' },
      { key: 'gift', label: 'هدية' },
      { key: 'sprout', label: 'طازج' },
      { key: 'tag_pct', label: 'خصم' },
      { key: 'fire', label: 'عروض' },
      { key: 'flash', label: 'فلاش' },
      { key: 'bag_pct', label: 'حقيبة' },
      { key: 'crown', label: 'تاج' },
      { key: 'diamond', label: 'ألماسة' },
      { key: 'sparkles', label: 'بريق' },
      { key: 'heart', label: 'مميز' },
      { key: 'star', label: 'نجمة' }
    ];



    // Helper functions
    const formatArabicPlural = (count, nounType = 'order') => {
      const n = Math.abs(Number(count) || 0);
      const mod100 = n % 100;
      
      const dictionaries = {
        order: { s: 'طلب', d: 'طلبان', p: 'طلبات', a: 'طلباً' },
        customer: { s: 'عميل', d: 'عميلان', p: 'عملاء', a: 'عميلاً' },
        product: { s: 'منتج', d: 'منتجان', p: 'منتجات', a: 'منتجاً' },
        category: { s: 'صنف', d: 'صنفان', p: 'أصناف', a: 'صنفاً' },
        tag: { s: 'علامة', d: 'علامتان', p: 'علامات', a: 'علامةً' },
        unit: { s: 'وحدة', d: 'وحدتان', p: 'وحدات', a: 'وحدةً' },
        sale: { s: 'عملية بيع', d: 'عمليتا بيع', p: 'عمليات بيع', a: 'عملية بيع' }
      };
      
      const dict = dictionaries[nounType] || dictionaries.order;
      
      if (n === 0) return `0 ${dict.p}`;
      if (n === 1) return `1 ${dict.s}`;
      if (n === 2) return `2 ${dict.d}`;
      if (mod100 >= 3 && mod100 <= 10) return `${n} ${dict.p}`;
      if (mod100 >= 11 && mod100 <= 99) return `${n} ${dict.a}`;
      return `${n} ${dict.s}`;
    };


    // Filter Products
    const filteredProducts = computed(() => {
      return products.value.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(filters.search.toLowerCase()) || 
                             (p.desc && p.desc.toLowerCase().includes(filters.search.toLowerCase()));
        const matchesCat = !filters.category || p.category === filters.category;
        const matchesSubCat = !filters.category || !filters.subCategory || p.subCategory === filters.subCategory;
        return matchesSearch && matchesCat && matchesSubCat;
      });
    });

    // Product Availability Toggle
    const toggleProductAvailability = async (product) => {
      const targetState = !product.available;
      const url = activeShop.value === 'shop2'
        ? `/api/shop2/products/${product._id}/availability`
        : `/api/products/${product._id}/availability`;
      
      try {
        const res = await adminFetch(url, {
          method: 'PATCH',
          body: JSON.stringify({ available: targetState })
        });
        if (res.ok) {
          product.available = targetState;
          toast.show('تم تحديث حالة توفر المنتج', 'success');
          fetchAnalytics();
        } else {
          toast.show('فشل تحديث حالة توفر المنتج', 'danger');
        }
      } catch (err) {
        toast.show('حدث خطأ بالاتصال بالخادم', 'danger');
      }
    };

    // Delete Product
    const deleteProduct = async (id) => {
      if (!confirm('هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً؟')) return;
      const url = activeShop.value === 'shop2'
        ? `/api/shop2/products/${id}`
        : `/api/products/${id}`;
        
      try {
        const res = await adminFetch(url, { method: 'DELETE' });
        if (res.ok) {
          products.value = products.value.filter(p => p._id !== id);
          toast.show('تم حذف المنتج بنجاح', 'success');
          fetchAnalytics(); // Refresh analytics
        } else {
          toast.show('فشل في حذف المنتج', 'danger');
        }
      } catch (err) {
        toast.show('خطأ بالخادم', 'danger');
      }
    };

    // Open Add/Edit Product Modal
    const subCategoriesForEditing = ref([]);
    const openProductModal = (prod = null) => {
      modalFile.value = null;
      modalFilePreview.value = '';
      
      if (prod) {
        // Edit Mode
        editingProduct._id = prod._id;
        editingProduct.name = prod.name;
        editingProduct.desc = prod.desc || '';
        editingProduct.category = prod.category;
        editingProduct.subCategory = prod.subCategory || '';
        editingProduct.purchaseType = prod.purchaseType || 'both';
        editingProduct.price_regular = prod.price_regular || null;
        editingProduct.price_bulk = prod.price_bulk || null;
        editingProduct.makingCost = prod.makingCost !== undefined && prod.makingCost !== null ? prod.makingCost : 0;
        editingProduct.allowFloat = !!prod.allowFloat;
        editingProduct.img = prod.img || '';
        modalFilePreview.value = prod.img || '';
        editingProduct.tags = Array.isArray(prod.tags) ? [...prod.tags] : [];
        
        // Load subcategories for this category
        const cat = categories.value.find(c => c.name === prod.category);
        subCategoriesForEditing.value = cat ? (cat.subCategories || []) : [];
      } else {
        // Create Mode
        editingProduct._id = '';
        editingProduct.name = '';
        editingProduct.desc = '';
        editingProduct.category = '';
        editingProduct.subCategory = '';
        editingProduct.purchaseType = 'both';
        editingProduct.price_regular = null;
        editingProduct.price_bulk = null;
        editingProduct.makingCost = 0;
        editingProduct.allowFloat = false;
        editingProduct.img = '';
        modalFilePreview.value = '';
        editingProduct.tags = [];
        subCategoriesForEditing.value = [];
      }
      productModalOpen.value = true;
    };

    const onProductCategoryChange = () => {
      const cat = categories.value.find(c => c.name === editingProduct.category);
      subCategoriesForEditing.value = cat ? (cat.subCategories || []) : [];
      editingProduct.subCategory = '';
    };

    // Save Product Form Action (FormData for MultiPart S3 images)
    const saveProduct = async () => {
      loading.value = true;
      const url = editingProduct._id 
        ? (activeShop.value === 'shop2' ? `/api/shop2/products/${editingProduct._id}` : `/api/products/${editingProduct._id}`)
        : (activeShop.value === 'shop2' ? '/api/shop2/products' : '/api/products');

      const formData = new FormData();
      formData.append('name', editingProduct.name);
      formData.append('desc', editingProduct.desc);
      formData.append('category', editingProduct.category);
      formData.append('subCategory', editingProduct.subCategory);
      formData.append('purchaseType', editingProduct.purchaseType);
      formData.append('allowFloat', editingProduct.allowFloat ? 'true' : 'false');
      formData.append('tags', JSON.stringify(editingProduct.tags));
      formData.append('makingCost', editingProduct.makingCost !== null && editingProduct.makingCost !== undefined ? editingProduct.makingCost : 0);
      formData.append('chefId', editingProduct.chefId || '');
      const matchedChef = chefs.value.find(c => c._id === editingProduct.chefId);
      formData.append('chefName', matchedChef ? matchedChef.name : '');
      
      if (editingProduct.purchaseType !== 'bulk' && editingProduct.price_regular) {
        formData.append('price_regular', editingProduct.price_regular);
      }
      if (editingProduct.purchaseType !== 'regular' && editingProduct.price_bulk) {
        formData.append('price_bulk', editingProduct.price_bulk);
      }

      if (modalFile.value) {
        formData.append('img', modalFile.value);
      } else if (editingProduct._id && editingProduct.img) {
        // Keep existing image info for edits without a file change
        formData.append('existingImg', editingProduct.img);
      }

      try {
        const method = editingProduct._id ? 'PUT' : 'POST';
        const res = await adminFetch(url, {
          method,
          body: formData
        });
        
        if (res.ok) {
          toast.show(editingProduct._id ? 'تم تعديل المنتج بنجاح' : 'تم إضافة المنتج بنجاح', 'success');
          productModalOpen.value = false;
          await fetchProducts();
          fetchAnalytics(); // Refresh analytics
        } else {
          const errData = await res.json();
          toast.show(errData.error || 'فشل في حفظ المنتج', 'danger');
        }
      } catch (err) {
        toast.show('حدث خطأ بالاتصال بالخادم', 'danger');
      } finally {
        loading.value = false;
      }
    };

    // Product Modal Image Handling
    const triggerModalImageSelect = () => {
      modalFileInput.value.click();
    };

    const handleModalImageFileSelect = (e) => {
      const file = e.target.files[0];
      if (file) setModalFile(file);
    };

    const handleModalImageDrop = (e) => {
      modalDragActive.value = false;
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) setModalFile(file);
    };

    const compressProductFileToWebp = (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.src = e.target.result;
          img.onload = () => {
            const maxW = 800;
            const maxH = 800;
            let width = img.width;
            let height = img.height;
            
            if (width > maxW) {
              height = Math.round((height * maxW) / width);
              width = maxW;
            }
            if (height > maxH) {
              width = Math.round((width * maxH) / height);
              height = maxH;
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((webpBlob) => {
              if (webpBlob) {
                const compressedFile = new File([webpBlob], 'product_compressed.webp', {
                  type: 'image/webp',
                  lastModified: Date.now()
                });
                const sizeKb = (webpBlob.size / 1024).toFixed(1);
                resolve({
                  file: compressedFile,
                  preview: canvas.toDataURL('image/webp', 0.82),
                  sizeKb
                });
              } else {
                resolve({ file, preview: e.target.result, sizeKb: (file.size / 1024).toFixed(1) });
              }
            }, 'image/webp', 0.82);
          };
          img.onerror = () => resolve({ file, preview: e.target.result, sizeKb: (file.size / 1024).toFixed(1) });
        };
        reader.readAsDataURL(file);
      });
    };

    const setModalFile = async (file) => {
      if (file.size > 100 * 1024 * 1024) {
        toast.show('حجم الصورة كبير جداً. يجب أن تكون أقل من 100 ميجابايت.', 'danger');
        return;
      }
      
      const { file: compressedFile, preview, sizeKb } = await compressProductFileToWebp(file);
      modalFile.value = compressedFile;
      modalFilePreview.value = preview;
      toast.show(`تم ضغط وتسريع صورة المنتج بنجاح (${sizeKb} KB)`, 'success');
    };

    // Helper: compress any product image URL to high-efficiency WebP
    const compressProductUrlToWebp = async (imageUrl) => {
      return new Promise(async (resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Image fetch timeout'));
        }, 12000); // 12 second timeout protection per image

        try {
          const response = await fetch(imageUrl);
          if (!response.ok) {
            clearTimeout(timeout);
            throw new Error(`HTTP error ${response.status}`);
          }
          const blob = await response.blob();
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = URL.createObjectURL(blob);
          
          img.onload = () => {
            clearTimeout(timeout);
            const maxW = 800;
            const maxH = 800;
            let width = img.width;
            let height = img.height;
            
            if (width > maxW) {
              height = Math.round((height * maxW) / width);
              width = maxW;
            }
            if (height > maxH) {
              width = Math.round((width * maxH) / height);
              height = maxH;
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((webpBlob) => {
              URL.revokeObjectURL(img.src);
              if (webpBlob) {
                const compressedFile = new File([webpBlob], 'product_recompressed.webp', {
                  type: 'image/webp',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Canvas WebP compression failed'));
              }
            }, 'image/webp', 0.82);
          };
          
          img.onerror = (err) => {
            clearTimeout(timeout);
            URL.revokeObjectURL(img.src);
            reject(err);
          };
        } catch (e) {
          clearTimeout(timeout);
          reject(e);
        }
      });
    };

    // Batch re-compress and re-upload all current product images across ALL shops
    const recompressAllProductImages = async () => {
      recompressingProducts.value = true;
      recompressProductsProgress.value = 0;
      let updatedCount = 0;

      try {
        // Fetch products from BOTH shops to process all 250+ products
        const [resShop1, resShop2] = await Promise.all([
          adminFetch('/api/products').catch(() => null),
          adminFetch('/api/shop2/products').catch(() => null)
        ]);

        let allProducts = [];
        if (resShop1 && resShop1.ok) {
          const prods1 = await resShop1.json();
          allProducts.push(...prods1.map(p => ({ ...p, _shop: 'shop1' })));
        }
        if (resShop2 && resShop2.ok) {
          const prods2 = await resShop2.json();
          allProducts.push(...prods2.map(p => ({ ...p, _shop: 'shop2' })));
        }

        // Filter products with valid image URLs
        const items = allProducts.filter(p => p.img && typeof p.img === 'string' && !p.img.includes('/res/logo.jpg'));
        
        if (items.length === 0) {
          toast.show('لا توجد صور منتجات لإعادة ضغطها حالياً', 'warning');
          return;
        }

        toast.show(`بدء ضغط وتسريع ${items.length} صورة منتج…`, 'info');

        for (let i = 0; i < items.length; i++) {
          const prod = items[i];
          recompressProductsProgress.value = i + 1;
          
          try {
            const compressedFile = await compressProductUrlToWebp(prod.img);
            const formData = new FormData();
            formData.append('name', prod.name);
            formData.append('desc', prod.desc || '');
            formData.append('category', prod.category || '');
            formData.append('subCategory', prod.subCategory || '');
            formData.append('purchaseType', prod.purchaseType || 'regular');
            formData.append('allowFloat', prod.allowFloat ? 'true' : 'false');
            formData.append('tags', JSON.stringify(prod.tags || []));
            if (prod.price_regular) formData.append('price_regular', prod.price_regular);
            if (prod.price_bulk) formData.append('price_bulk', prod.price_bulk);
            formData.append('img', compressedFile);

            const url = prod._shop === 'shop2' 
              ? `/api/shop2/products/${prod._id}` 
              : `/api/products/${prod._id}`;

            const res = await adminFetch(url, {
              method: 'PUT',
              body: formData
            });

            if (res.ok) {
              updatedCount++;
            }
          } catch (prodErr) {
            console.error(`Failed to recompress product image ${prod._id} (${prod.name}):`, prodErr);
          }
        }

        toast.show(`تمت إعادة ضغط وتحديث ${updatedCount} من أصل ${items.length} صورة منتج بنجاح عبر جميع المتاجر!`, 'success');
        await fetchProducts();
      } catch (err) {
        console.error('Batch product image recompression error:', err);
        toast.show('حدث خطأ أثناء الضغط المجمع لصور المنتجات', 'danger');
      } finally {
        recompressingProducts.value = false;
        recompressProductsProgress.value = 0;
      }
    };

    const removeModalImage = () => {
      modalFile.value = null;
      modalFilePreview.value = '';
      editingProduct.img = '';
    };

    // Zoom Image Preview
    const adminZoomImgRef = ref(null);

    const checkAdminZoomCached = () => {
      if (adminZoomImgRef.value && adminZoomImgRef.value.complete && adminZoomImgRef.value.naturalWidth !== 0) {
        isAdminZoomLoaded.value = true;
      }
    };

    watch(zoomedImageSrc, (val) => {
      if (val) {
        isAdminZoomLoaded.value = false;
        nextTick(() => {
          checkAdminZoomCached();
        });
      }
    });

    const zoomImage = (src) => {
      if (src) {
        isAdminZoomLoaded.value = false;
        zoomedImageSrc.value = src;
        nextTick(() => {
          checkAdminZoomCached();
        });
      }
    };

    const closeAdminZoom = () => {
      zoomedImageSrc.value = null;
      isAdminZoomLoaded.value = false;
    };

    // SVG ICON POOL FOR CATEGORIES (HUGEICONS)
    const svgIconPool = [
      { key: 'cheesecake02', label: 'حلويات غربية', emoji: '🍰', keyword: 'غربي' },
      { key: 'cheesecake01', label: 'تورت كيك', emoji: '🎂', keyword: 'تورت' },
      { key: 'bread04', label: 'نواشف ماكرون', emoji: '🥐', keyword: 'نواشف' },
      { key: 'biscuit', label: 'بيتي فور ولوزيات', emoji: '🍪', keyword: 'بيتي فور' },
      { key: 'oriental', label: 'شرقي', emoji: '🍯', keyword: 'شرقي' },
      { key: 'heart', label: 'عبمبر', emoji: '💖', keyword: 'عبمبر' },
      { key: 'juice', label: 'عصائر', emoji: '🥤', keyword: 'عصائر' },
      { key: 'coffee', label: 'قهوة', emoji: '☕', keyword: 'قهوة' },
      { key: 'ice-cream', label: 'آيس كريم', emoji: '🍦', keyword: 'مثلجات' },
      { key: 'service', label: 'خدمات', emoji: '🛎️', keyword: 'خدمات' },
      { key: 'gift', label: 'هدايا', emoji: '🎁', keyword: 'هدايا' },
      { key: 'star', label: 'مميز', emoji: '⭐', keyword: 'مميز' },
      { key: 'utensils', label: 'عام', emoji: '🍽️', keyword: 'عام' },
    ];

    const selectCategoryIcon = (item) => {
      editingCategory.emoji = item.emoji;
      editingCategory.icon = item.key;
    };

    // CATEGORIES CRUD LOGIC
    const openCategoryModal = (cat = null) => {
      if (cat) {
        editingCategory._id = cat._id;
        editingCategory.name = cat.name;
        editingCategory.emoji = cat.emoji || '';
        editingCategory.icon = cat.icon || '';
        editingCategory.subCategories = cat.subCategories || [];
        categorySubcategoriesString.value = (cat.subCategories || []).join(', ');
      } else {
        editingCategory._id = '';
        editingCategory.name = '';
        editingCategory.emoji = '';
        editingCategory.icon = '';
        editingCategory.subCategories = [];
        categorySubcategoriesString.value = '';
      }
      categoryModalOpen.value = true;
    };

    const saveCategory = async () => {
      loading.value = true;
      const subCats = categorySubcategoriesString.value
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
        
      const body = {
        name: editingCategory.name,
        icon: editingCategory.icon || '',
        emoji: editingCategory.emoji || '',
        subCategories: subCats
      };

      const url = editingCategory._id
        ? (activeShop.value === 'shop2' ? `/api/shop2/categories/${editingCategory._id}` : `/api/categories/${editingCategory._id}`)
        : (activeShop.value === 'shop2' ? '/api/shop2/categories' : '/api/categories');

      try {
        const method = editingCategory._id ? 'PUT' : 'POST';
        const res = await adminFetch(url, {
          method,
          body: JSON.stringify(body)
        });
        
        if (res.ok) {
          toast.show('تم حفظ الصنف بنجاح', 'success');
          categoryModalOpen.value = false;
          await fetchCategories();
        } else {
          const errData = await res.json();
          toast.show(errData.error || 'فشل في حفظ الصنف', 'danger');
        }
      } catch (err) {
        toast.show('حدث خطأ بالاتصال بالخادم', 'danger');
      } finally {
        loading.value = false;
      }
    };

    const deleteCategory = async (id) => {
      if (!confirm('هل أنت متأكد من حذف الصنف؟ ستبقى المنتجات تابعة له إلا إذا قمت بنقلها.')) return;
      const url = activeShop.value === 'shop2'
        ? `/api/shop2/categories/${id}`
        : `/api/categories/${id}`;

      try {
        const res = await adminFetch(url, { method: 'DELETE' });
        if (res.ok) {
          categories.value = categories.value.filter(c => c._id !== id);
          toast.show('تم حذف الصنف', 'success');
        } else {
          toast.show('فشل في حذف الصنف', 'danger');
        }
      } catch (err) {
        toast.show('حدث خطأ بالاتصال بالخادم', 'danger');
      }
    };

    // --- TAGS CRUD ---
    const openTagModal = (tag = null) => {
      if (tag) {
        editingTag._id = tag._id;
        editingTag.name = tag.name;
        editingTag.color = tag.color || 'default';
        editingTag.icon = tag.icon || 'trophy';
      } else {
        editingTag._id = '';
        editingTag.name = '';
        editingTag.color = 'default';
        editingTag.icon = 'trophy';
      }
      tagModalOpen.value = true;
    };

    const saveTag = async () => {
      loading.value = true;
      const body = { 
        name: editingTag.name,
        color: editingTag.color,
        icon: editingTag.icon
      };
      const url = editingTag._id
        ? (activeShop.value === 'shop2' ? `/api/shop2/tags/${editingTag._id}` : `/api/tags/${editingTag._id}`)
        : (activeShop.value === 'shop2' ? '/api/shop2/tags' : '/api/tags');

      try {
        const method = editingTag._id ? 'PUT' : 'POST';
        const res = await adminFetch(url, {
          method,
          body: JSON.stringify(body)
        });
        
        if (res.ok) {
          toast.show('تم حفظ العلامة بنجاح', 'success');
          tagModalOpen.value = false;
          await fetchTags();
        } else {
          const errData = await res.json();
          toast.show(errData.error || 'فشل في حفظ العلامة', 'danger');
        }
      } catch (err) {
        toast.show('حدث خطأ بالاتصال بالخادم', 'danger');
      } finally {
        loading.value = false;
      }
    };

    const getTagDetails = (tagName) => {
      const found = tags.value.find(t => t.name === tagName);
      return found || { name: tagName, color: 'default', icon: 'trophy' };
    };

    const getIconUrl = (iconKey) => {
      const map = {
        heart: 'sprout',
        star: 'medal',
        sparkles: 'diamond',
        fire: 'starburst_pct',
        tag: 'tag_pct',
        gift: 'gift'
      };
      const key = map[iconKey] || iconKey || 'trophy';
      return `/res/tags/${key}.png`;
    };

    const deleteTag = async (id) => {
      if (!confirm('هل أنت متأكد من حذف العلامة؟')) return;
      const url = activeShop.value === 'shop2'
        ? `/api/shop2/tags/${id}`
        : `/api/tags/${id}`;

      try {
        const res = await adminFetch(url, { method: 'DELETE' });
        if (res.ok) {
          tags.value = tags.value.filter(t => t._id !== id);
          toast.show('تم حذف العلامة', 'success');
        } else {
          toast.show('فشل في حذف العلامة', 'danger');
        }
      } catch (err) {
        toast.show('حدث خطأ بالاتصال بالخادم', 'danger');
      }
    };


    // IMAGE RECOVERY TAB LOGIC
    // MARKETING CAROUSEL LOGIC
    const fetchCarousel = async () => {
      try {
        const res = await adminFetch(`/api/admin/marketing-carousel?shop=${activeShop.value}`);
        if (res.ok) {
          carouselItems.value = await res.json();
        }
      } catch (err) {
        console.error(err);
      }
    };

    const deleteCarouselItem = async (itemId) => {
      if (!confirm('هل أنت متأكد من رغبتك في حذف هذا البنر الإعلاني؟')) return;
      try {
        const res = await adminFetch(`/api/admin/marketing-carousel/${itemId}`, { method: 'DELETE' });
        if (res.ok) {
          toast.show('تم حذف البنر الإعلاني بنجاح', 'success');
          await fetchCarousel();
        } else {
          toast.show('فشل حذف البنر الإعلاني', 'danger');
        }
      } catch (err) {
        console.error(err);
      }
    };

    const openCarouselModal = (item = null) => {
      if (item) {
        editingCarouselId.value = item._id;
        newCarouselItem.title = item.title || '';
        newCarouselItem.subtitle = item.subtitle || '';
        newCarouselItem.link = item.link || '';
        newCarouselItem.file = null;
        newCarouselItem.filePreview = item.image || '';
        newCarouselItem.dimensions = '';
      } else {
        editingCarouselId.value = null;
        newCarouselItem.title = '';
        newCarouselItem.subtitle = '';
        newCarouselItem.link = '';
        newCarouselItem.file = null;
        newCarouselItem.filePreview = '';
        newCarouselItem.dimensions = '';
      }
      carouselModalOpen.value = true;
    };

    const saveCarouselItem = async () => {
      if (!editingCarouselId.value && !newCarouselItem.file) {
        toast.show('يرجى تحديد صورة للبنر الإعلاني', 'danger');
        return;
      }
      
      loading.value = true;
      try {
        const formData = new FormData();
        formData.append('shop', activeShop.value);
        formData.append('title', newCarouselItem.title);
        formData.append('subtitle', newCarouselItem.subtitle);
        formData.append('link', newCarouselItem.link);
        if (newCarouselItem.file) {
          formData.append('img', newCarouselItem.file);
        }
        
        const url = editingCarouselId.value 
          ? `/api/admin/marketing-carousel/${editingCarouselId.value}`
          : `/api/admin/marketing-carousel`;
          
        const res = await adminFetch(url, {
          method: editingCarouselId.value ? 'PUT' : 'POST',
          body: formData
        });
        
        if (res.ok) {
          toast.show(editingCarouselId.value ? 'تم تعديل البنر الإعلاني بنجاح' : 'تمت إضافة البنر الإعلاني بنجاح', 'success');
          carouselModalOpen.value = false;
          await fetchCarousel();
        } else {
          const errData = await res.json();
          toast.show(errData.error || (editingCarouselId.value ? 'فشل تعديل البنر الإعلاني' : 'فشل إضافة البنر الإعلاني'), 'danger');
        }
      } catch (err) {
        console.error(err);
        toast.show('حدث خطأ أثناء حفظ البنر', 'danger');
      } finally {
        loading.value = false;
      }
    };

    const triggerCarouselImageSelect = () => {
      carouselFileInput.value.click();
    };

    const handleCarouselImageFileSelect = (e) => {
      const file = e.target.files[0];
      if (file) setCarouselFile(file);
    };

    const handleCarouselDrop = (e) => {
      carouselDragActive.value = false;
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) setCarouselFile(file);
    };

    const setCarouselFile = (file) => {
      // Limit to 100MB
      if (file.size > 100 * 1024 * 1024) {
        toast.show('حجم الصورة كبير جداً. يجب أن تكون أقل من 100 ميجابايت.', 'danger');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        cropperImageSrc.value = e.target.result;
        cropperModalOpen.value = true;
        
        nextTick(() => {
          if (cropperInstance) {
            cropperInstance.destroy();
          }
          if (cropperImageElement.value) {
            cropperInstance = new Cropper(cropperImageElement.value, {
              aspectRatio: activeAspectRatio.value,
              viewMode: 1,
              autoCropArea: 1,
              background: false,
            });
          }
        });
      };
      reader.readAsDataURL(file);
    };

    const setAspectRatio = (ratio) => {
      activeAspectRatio.value = ratio;
      if (cropperInstance) {
        cropperInstance.setAspectRatio(ratio);
      }
    };

    const cropAndSaveImage = () => {
      if (!cropperInstance) return;
      
      const canvas = cropperInstance.getCroppedCanvas({
        maxWidth: 1600,
        maxHeight: 900,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });
      
      // Heavy high-efficiency WebP compression preserving quality (0.78)
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.show('حدث خطأ أثناء معالجة وقص الصورة', 'danger');
          return;
        }
        
        const sizeKb = (blob.size / 1024).toFixed(1);
        const croppedFile = new File([blob], 'banner_compressed.webp', {
          type: blob.type || 'image/webp',
          lastModified: Date.now()
        });
        
        newCarouselItem.file = croppedFile;
        newCarouselItem.filePreview = canvas.toDataURL('image/webp', 0.78);
        newCarouselItem.dimensions = `${canvas.width} × ${canvas.height} بكسل (حجم مضغوط: ${sizeKb} KB)`;
        
        cropperModalOpen.value = false;
        cropperInstance.destroy();
        cropperInstance = null;
        toast.show(`تم ضغط البنر وقصه بنجاح (${sizeKb} KB)`, 'success');
      }, 'image/webp', 0.78);
    };

    // Helper: compress any image URL to high-efficiency WebP
    const compressImageUrlToWebp = async (imageUrl) => {
      return new Promise(async (resolve, reject) => {
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) throw new Error(`HTTP error ${response.status}`);
          const blob = await response.blob();
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = URL.createObjectURL(blob);
          
          img.onload = () => {
            const maxW = 1600;
            const maxH = 900;
            let width = img.width;
            let height = img.height;
            
            if (width > maxW) {
              height = Math.round((height * maxW) / width);
              width = maxW;
            }
            if (height > maxH) {
              width = Math.round((width * maxH) / height);
              height = maxH;
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((webpBlob) => {
              URL.revokeObjectURL(img.src);
              if (webpBlob) {
                const compressedFile = new File([webpBlob], 'banner_recompressed.webp', {
                  type: 'image/webp',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Canvas WebP compression failed'));
              }
            }, 'image/webp', 0.78);
          };
          
          img.onerror = (err) => {
            URL.revokeObjectURL(img.src);
            reject(err);
          };
        } catch (e) {
          reject(e);
        }
      });
    };

    // Batch re-compress and re-upload all current banners
    const recompressAllBanners = async () => {
      if (carouselItems.value.length === 0) {
        toast.show('لا توجد بنرات لإعادة ضغطها حالياً', 'warning');
        return;
      }

      recompressingBanners.value = true;
      recompressProgress.value = 0;
      let updatedCount = 0;

      try {
        for (let i = 0; i < carouselItems.value.length; i++) {
          const item = carouselItems.value[i];
          recompressProgress.value = i + 1;
          
          try {
            const compressedFile = await compressImageUrlToWebp(item.image);
            const formData = new FormData();
            formData.append('shop', activeShop.value);
            formData.append('title', item.title || '');
            formData.append('subtitle', item.subtitle || '');
            formData.append('link', item.link || '');
            formData.append('img', compressedFile);

            const res = await adminFetch(`/api/admin/marketing-carousel/${item._id}`, {
              method: 'PUT',
              body: formData
            });

            if (res.ok) {
              updatedCount++;
            }
          } catch (itemErr) {
            console.error(`Failed to recompress banner ${item._id}:`, itemErr);
          }
        }

        toast.show(`تمت إعادة ضغط وتحديث ${updatedCount} من أصل ${carouselItems.value.length} بنر بنجاح!`, 'success');
        await fetchCarousel();
      } catch (err) {
        console.error('Batch recompression error:', err);
        toast.show('حدث خطأ أثناء الضغط المجمع للبنرات', 'danger');
      } finally {
        recompressingBanners.value = false;
        recompressProgress.value = 0;
      }
    };

    const rotateCropperImage = (degree) => {
      if (cropperInstance) {
        cropperInstance.rotate(degree);
      }
    };

    const zoomCropperImage = (ratio) => {
      if (cropperInstance) {
        cropperInstance.zoom(ratio);
      }
    };

    const resetCropperImage = () => {
      if (cropperInstance) {
        cropperInstance.reset();
      }
    };

    const clearCarouselFile = () => {
      newCarouselItem.file = null;
      newCarouselItem.filePreview = '';
      newCarouselItem.dimensions = '';
      if (carouselFileInput.value) carouselFileInput.value.value = '';
    };

    const formatCurrency = (val) => {
      const formatted = (Number(val) || 0).toLocaleString('ar-LY', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      return formatted.replace(/[,.٬٫]/g, m => (m === ',' || m === '٬' ? '.' : ',')) + ' د.ل';
    };

    const adminFetch = async (url, options = {}) => {
      if (!options.headers) options.headers = {};
      if (options.body && !(options.body instanceof FormData)) {
        if (!options.headers['Content-Type'] && !options.headers['content-type']) {
          options.headers['Content-Type'] = 'application/json';
        }
      }

      const token = localStorage.getItem('admin_token');
      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(url, options);
      if (res.status === 401 || res.status === 403) {
        isAuthenticated.value = false;
        localStorage.removeItem('admin_token');
      }
      return res;
    };

    // Authentication Checks
    const checkAuthentication = async () => {
      loading.value = true;
      try {
        const checkUrl = activeShop.value === 'shop2' ? '/api/shop2/admin-check' : '/api/admin-check';
        const res = await adminFetch(checkUrl);
        if (res.ok) {
          isAuthenticated.value = true;
          await loadAllData();
        } else {
          isAuthenticated.value = false;
        }
      } catch (err) {
        console.error(err);
        isAuthenticated.value = false;
      } finally {
        loading.value = false;
      }
    };

    const handleLogin = async () => {
      loading.value = true;
      loginError.value = '';
      try {
        const loginUrl = loginShop.value === 'shop2' ? '/api/shop2/login' : '/api/login';
        const res = await fetch(loginUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginForm)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          activeShop.value = loginShop.value;
          localStorage.setItem('admin_token', data.token); // Save token for mobile compatibility
          localStorage.setItem('admin_role', data.role || 'admin');
          localStorage.setItem('admin_name', data.name || 'المدير العام');
          userRole.value = data.role || 'admin';
          userDisplayName.value = data.name || 'المدير العام';

          if (userRole.value === 'order_manager') {
            activeTab.value = 'orders';
          }

          isAuthenticated.value = true;
          toast.show('تم تسجيل الدخول بنجاح', 'success');
          await loadAllData();
        } else {
          loginError.value = data.message || 'بيانات الدخول غير صحيحة';
        }
      } catch (err) {
        loginError.value = 'حدث خطأ بالاتصال بالخادم';
      } finally {
        loading.value = false;
      }
    };

    const handleLogout = async () => {
      document.cookie = activeShop.value === 'shop2' ? 'admin_shop2=; Max-Age=0; path=/;' : 'admin=; Max-Age=0; path=/;';
      localStorage.removeItem('admin_token'); // Clear token
      localStorage.removeItem('admin_role');
      localStorage.removeItem('admin_name');
      userRole.value = 'admin';
      userDisplayName.value = 'المدير العام';
      isAuthenticated.value = false;
      toast.show('تم تسجيل الخروج بنجاح', 'success');
    };

    // Switch shops context in dashboard
    const switchShop = async (shop) => {
      activeShop.value = shop;
      sidebarOpen.value = false;
      await checkAuthentication();
    };

    // Tab switcher with locked routing for secondary order_manager role
    const setTab = (tab) => {
      if (userRole.value === 'order_manager' && tab !== 'orders') {
        toast.show('حسابك مخصص لمتابعة وإدارة الطلبات فقط', 'warning');
        activeTab.value = 'orders';
        sidebarOpen.value = false;
        return;
      }
      activeTab.value = tab;
      sidebarOpen.value = false;
    };

    // User Management Methods
    const fetchUsers = async () => {
      if (userRole.value !== 'admin') return;
      try {
        const res = await adminFetch('/api/admin/users');
        if (res.ok) {
          const data = await res.json();
          adminUsers.value = data.users || [];
        }
      } catch (e) {
        console.error('Fetch users error', e);
      }
    };

    const openUserModal = (user = null) => {
      if (user) {
        editingUser._id = user._id;
        editingUser.name = user.name || '';
        editingUser.password = '';
        editingUser.role = user.role || 'order_manager';
        editingUser.shopAccess = user.shopAccess || 'all';
      } else {
        editingUser._id = null;
        editingUser.name = '';
        editingUser.password = '';
        editingUser.role = 'order_manager';
        editingUser.shopAccess = 'all';
      }
      userModalOpen.value = true;
    };

    const saveUser = async () => {
      if (!editingUser.name || (!editingUser._id && !editingUser.password)) {
        toast.show('يرجى تعبئة جميع الحقول المطلوبة', 'danger');
        return;
      }
      loading.value = true;
      try {
        const isEdit = !!editingUser._id;
        const url = isEdit ? `/api/admin/users/${editingUser._id}` : '/api/admin/users';
        const method = isEdit ? 'PUT' : 'POST';
        const res = await adminFetch(url, {
          method,
          body: JSON.stringify(editingUser)
        });
        if (res.ok) {
          toast.show(isEdit ? 'تم تحديث بيانات المستخدم بنجاح' : 'تم إضافة المستخدم بنجاح', 'success');
          userModalOpen.value = false;
          await fetchUsers();
        } else {
          const data = await res.json();
          toast.show(data.error || 'فشل حفظ بيانات المستخدم', 'danger');
        }
      } catch (e) {
        toast.show('حدث خطأ بالاتصال بالخادم', 'danger');
      } finally {
        loading.value = false;
      }
    };

    const deleteUser = async (id) => {
      if (!confirm('هل أنت متأكد من حذف هذا المستخدم نهائياً؟')) return;
      try {
        const res = await adminFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.show('تم حذف المستخدم بنجاح', 'success');
          await fetchUsers();
        } else {
          toast.show('فشل حذف المستخدم', 'danger');
        }
      } catch (e) {
        toast.show('حدث خطأ بالاتصال بالخادم', 'danger');
      }
    };

    // Load Data
    const loadAllData = async () => {
      loading.value = true;
      try {
        await Promise.all([
          fetchAnalytics(),
          fetchProducts(),
          fetchChefs(),
          fetchCategories(),
          fetchTags(),
          fetchOrders(),
          fetchCustomers(),
          fetchCarousel(),
          fetchUsers()
        ]);
      } catch (err) {
        toast.show('خطأ في تحميل بيانات لوحة الإدارة', 'danger');
      } finally {
        loading.value = false;
      }
    };

    const fetchAnalytics = async () => {
      analyticsLoading.value = true;
      try {
        let url = `/api/admin/analytics?shop=${activeShop.value}`;
        if (analyticsPeriod.value === 'custom') {
          if (analyticsStartDate.value && analyticsEndDate.value) {
            url += `&startDate=${analyticsStartDate.value}&endDate=${analyticsEndDate.value}`;
          } else {
            url += `&period=30d`;
          }
        } else {
          url += `&period=${analyticsPeriod.value}`;
        }
        const res = await adminFetch(url);
        if (res.ok) {
          const data = await res.json();
          analyticsData.kpi = data.kpi || { totalRevenue: 0, orderCount: 0, avgOrderValue: 0, activeCustomers: 0 };
          analyticsData.revenueTrend = data.revenueTrend || [];
          analyticsData.priceModeSplit = data.priceModeSplit || { regular: { revenue: 0, count: 0 }, bulk: { revenue: 0, count: 0 } };
          analyticsData.paymentMethodsSplit = data.paymentMethodsSplit || { cash: { revenue: 0, count: 0 }, card: { revenue: 0, count: 0 }, bank_transfer: { revenue: 0, count: 0 } };
          analyticsData.topProducts = data.topProducts || [];
          analyticsData.topCustomers = data.topCustomers || [];
          analyticsData.categorySales = data.categorySales || [];
          analyticsData.topFavorites = data.topFavorites || [];
          analyticsData.inactiveCustomers = data.inactiveCustomers || [];
          analyticsData.lowPerformingProducts = data.lowPerformingProducts || [];
        }
      } catch (err) {
        console.error(err);
      } finally {
        analyticsLoading.value = false;
      }
    };

    const changePeriod = async (p) => {
      analyticsPeriod.value = p;
      if (p !== 'custom') {
        analyticsStartDate.value = '';
        analyticsEndDate.value = '';
        await fetchAnalytics();
      }
    };

    const exportReport = (type) => {
      let url = `/api/admin/reports/export?shop=${activeShop.value}&type=${type}`;
      if (analyticsPeriod.value === 'custom') {
        if (analyticsStartDate.value && analyticsEndDate.value) {
          url += `&startDate=${analyticsStartDate.value}&endDate=${analyticsEndDate.value}`;
        } else {
          url += `&period=30d`;
        }
      } else {
        url += `&period=${analyticsPeriod.value}`;
      }
      window.open(url, '_blank');
    };

    const setPrintPageSize = (size = 'A5 portrait', margin = '4mm 6mm') => {
      let styleTag = document.getElementById('forced-print-page-size-style');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'forced-print-page-size-style';
        document.head.appendChild(styleTag);
      }
      styleTag.innerHTML = `@media print { @page { size: ${size} !important; margin: ${margin} !important; } }`;
    };

    const printReport = () => {
      setPrintPageSize('A4 portrait', '8mm 10mm');
      window.print();
    };

    const printingOrder = ref(null);
    const printingReconciliation = ref(false);
    const printingCustomerDebtReport = ref(false);

    const customerDebtReportData = computed(() => {
      const list = filteredCustomers.value || [];
      const totalPurchases = list.reduce((sum, c) => sum + (Number(c.totalSpent) || 0), 0);
      const totalDebt = list.reduce((sum, c) => sum + (Number(c.outstandingBalance) || 0), 0);
      const totalPaid = Math.max(0, totalPurchases - totalDebt);
      const indebtedCount = list.filter(c => (Number(c.outstandingBalance) || 0) > 0).length;
      const collectionRate = totalPurchases > 0 ? ((totalPaid / totalPurchases) * 100).toFixed(1) : '100.0';

      let filterLabel = 'جميع التواريخ المسجلة';
      if (customerFilters.dateFrom && customerFilters.dateTo) {
        filterLabel = `من ${formatArabicDate(customerFilters.dateFrom)} إلى ${formatArabicDate(customerFilters.dateTo)}`;
      } else if (customerFilters.dateFrom) {
        filterLabel = `من تاريخ ${formatArabicDate(customerFilters.dateFrom)}`;
      } else if (customerFilters.dateTo) {
        filterLabel = `حتى تاريخ ${formatArabicDate(customerFilters.dateTo)}`;
      }

      if (customerFilters.search && customerFilters.search.trim()) {
        filterLabel += ` (بحث: "${customerFilters.search.trim()}")`;
      }

      return {
        customers: list,
        totalCustomers: list.length,
        indebtedCount,
        clearCount: list.length - indebtedCount,
        totalPurchases,
        totalPurchasesFormatted: formatCurrency(totalPurchases),
        totalPaid,
        totalPaidFormatted: formatCurrency(totalPaid),
        totalDebt,
        totalDebtFormatted: formatCurrency(totalDebt),
        collectionRate,
        filterLabel,
        generatedAt: new Date().toLocaleString('ar-LY', { dateStyle: 'full', timeStyle: 'short' })
      };
    });

    const printCustomerDebtReport = async () => {
      setPrintPageSize('A4 portrait', '6mm 8mm');
      printingCustomerDebtReport.value = true;
      await nextTick();

      const cleanup = () => {
        printingCustomerDebtReport.value = false;
        window.removeEventListener('afterprint', cleanup);
      };

      window.addEventListener('afterprint', cleanup);
      window.print();
    };
    const printingPaymentReceipt = ref(false);
    const printingPayment = ref(null);
    const ITEMS_PER_PAGE = 16; // 16 items per page for ultra-dense A5 layout

    // ============ CUSTOMER PAYMENTS & BALANCES ============
    const paymentModalOpen = ref(false);
    const paymentHistoryModalOpen = ref(false);
    const paymentLoading = ref(false);
    const paymentTarget = reactive({
      customerPhone: '',
      customerName: '',
      outstandingBalance: 0,
      unpaidOrders: [],
      recentPayments: [],
      amount: '',
      note: '',
      method: 'cash',
      targetOrderId: null,
      targetOrderShort: '',
      mode: 'fifo' // 'target' | 'fifo' | 'full'
    });

    const setPaymentMode = (mode) => {
      paymentTarget.mode = mode;
      if (mode === 'target' && paymentTarget.targetOrderId) {
        const targetOrder = paymentTarget.unpaidOrders.find(o => o._id.toString() === paymentTarget.targetOrderId.toString());
        if (targetOrder) {
          const rem = targetOrder.remaining !== undefined ? targetOrder.remaining : (targetOrder.totalPrice - targetOrder.paidAmount);
          paymentTarget.amount = Math.max(0, rem);
        }
      } else if (mode === 'full') {
        paymentTarget.amount = paymentTarget.outstandingBalance;
      } else if (mode === 'fifo') {
        if (paymentTarget.unpaidOrders.length && paymentTarget.unpaidOrders[0].remaining > 0) {
          paymentTarget.amount = paymentTarget.unpaidOrders[0].remaining;
        }
      }
    };

    const paymentFifoPreview = computed(() => {
      const amount = Number(paymentTarget.amount) || 0;
      if (amount <= 0 || !paymentTarget.unpaidOrders.length) return [];
      
      let ordersList = [...paymentTarget.unpaidOrders];
      if (paymentTarget.mode === 'target' && paymentTarget.targetOrderId) {
        const targetIdx = ordersList.findIndex(o => o._id.toString() === paymentTarget.targetOrderId.toString());
        if (targetIdx > 0) {
          const targetOrder = ordersList.splice(targetIdx, 1)[0];
          ordersList.unshift(targetOrder);
        }
      }

      let remaining = amount;
      const preview = [];
      for (const order of ordersList) {
        if (remaining <= 0) break;
        const orderRemaining = order.remaining !== undefined ? order.remaining : ((order.totalPrice || 0) - (order.paidAmount || 0));
        if (orderRemaining <= 0) continue;
        const applied = Math.round(Math.min(remaining, orderRemaining) * 100) / 100;
        const newPaid = Math.round(((order.paidAmount || 0) + applied) * 100) / 100;
        const fullyPaid = (order.totalPrice - newPaid) <= 0.009;
        preview.push({
          orderId: order._id,
          orderNumber: order.orderNumber || null,
          orderIdShort: order.orderNumber ? order.orderNumber.toString() : (order._id ? order._id.toString().slice(-6) : ''),
          orderTotal: order.totalPrice,
          previousPaid: order.paidAmount,
          applied,
          newPaidAmount: newPaid,
          fullyPaid,
          isTarget: paymentTarget.targetOrderId && order._id.toString() === paymentTarget.targetOrderId.toString()
        });
        remaining = Math.round((remaining - applied) * 100) / 100;
      }
      return preview;
    });

    const paymentRemainingAfter = computed(() => {
      const amount = Number(paymentTarget.amount) || 0;
      return Math.max(0, paymentTarget.outstandingBalance - amount);
    });

    const fetchCustomerBalance = async (phone) => {
      try {
        const res = await adminFetch(`/api/admin/customers/${encodeURIComponent(phone)}/balance?shop=${activeShop.value}`);
        if (!res.ok) throw new Error('Failed to fetch balance');
        const data = await res.json();
        return data;
      } catch (err) {
        console.error('fetchCustomerBalance error:', err);
        return null;
      }
    };

    const openPaymentModal = async (cust, targetOrder = null) => {
      if (!cust || !cust.phone) return;
      paymentTarget.customerPhone = cust.phone;
      paymentTarget.customerName = cust.name || cust.phone;
      paymentTarget.amount = '';
      paymentTarget.note = '';
      paymentTarget.method = 'cash';
      paymentTarget.outstandingBalance = 0;
      paymentTarget.unpaidOrders = [];
      paymentTarget.recentPayments = [];

      if (targetOrder) {
        paymentTarget.targetOrderId = targetOrder._id ? targetOrder._id.toString() : null;
        paymentTarget.targetOrderShort = targetOrder.orderNumber ? targetOrder.orderNumber.toString() : (targetOrder._id ? targetOrder._id.toString().slice(-6) : '');
        paymentTarget.mode = 'target';
      } else {
        paymentTarget.targetOrderId = null;
        paymentTarget.targetOrderShort = '';
        paymentTarget.mode = 'fifo';
      }

      paymentModalOpen.value = true;
      paymentLoading.value = true;

      const data = await fetchCustomerBalance(cust.phone);
      if (data) {
        paymentTarget.outstandingBalance = data.outstandingBalance;
        paymentTarget.unpaidOrders = data.unpaidOrders;
        paymentTarget.recentPayments = data.recentPayments;

        // If opened from a specific order, pre-fill remaining balance for that order
        if (targetOrder) {
          const matchingOrder = data.unpaidOrders.find(o => o._id.toString() === targetOrder._id.toString());
          const remaining = matchingOrder ? matchingOrder.remaining : ((targetOrder.totalPrice || 0) - (targetOrder.paidAmount || 0));
          if (remaining > 0) {
            paymentTarget.amount = remaining;
          }
        }
      }
      paymentLoading.value = false;
    };

    const recordPayment = async () => {
      const amount = Number(paymentTarget.amount);
      if (!amount || amount <= 0) {
        toast.show('أدخل مبلغ صحيح', 'error');
        return;
      }
      if (amount > paymentTarget.outstandingBalance + 0.01) {
        toast.show('المبلغ يتجاوز الرصيد المستحق', 'error');
        return;
      }

      paymentLoading.value = true;
      try {
        const res = await adminFetch('/api/admin/payments', {
          method: 'POST',
          body: JSON.stringify({
            customerPhone: paymentTarget.customerPhone,
            customerName: paymentTarget.customerName,
            amount,
            shop: activeShop.value,
            note: paymentTarget.note,
            method: paymentTarget.method,
            targetOrderId: paymentTarget.mode === 'target' ? paymentTarget.targetOrderId : null
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed');
        }

        const result = await res.json();
        toast.show(`تم تسجيل دفعة ${formatCurrency(amount)} بنجاح`, 'success');
        paymentModalOpen.value = false;

        // Auto-print receipt
        const paymentDoc = {
          _id: result.paymentId,
          customerPhone: paymentTarget.customerPhone,
          customerName: paymentTarget.customerName,
          amount,
          method: paymentTarget.method,
          note: paymentTarget.note,
          distributedTo: result.distributedTo,
          balanceBefore: paymentTarget.outstandingBalance,
          remainingBalanceAfter: result.remainingBalanceAfter,
          createdAt: new Date().toISOString()
        };
        await printPaymentReceipt(paymentDoc);

        // Refresh data
        fetchOrders();
        fetchCustomers();
      } catch (err) {
        toast.show(err.message || 'فشل تسجيل الدفعة', 'error');
      } finally {
        paymentLoading.value = false;
      }
    };

    // Convert order or payment ID to a valid 13-digit EAN-13 barcode string with Modulo 10 check digit
    const toEan13 = (val) => {
      const str = (val || '0').toString();
      let digits = str.replace(/\D/g, '');
      
      if (!digits || digits.length < 12) {
        let numStr = '';
        for (let i = 0; i < str.length; i++) {
          numStr += (str.charCodeAt(i) % 10).toString();
        }
        digits = numStr;
      }

      digits = digits.slice(-12).padStart(12, '0');

      let oddSum = 0;
      let evenSum = 0;
      for (let i = 0; i < 12; i++) {
        const d = parseInt(digits[i], 10);
        if (i % 2 === 0) oddSum += d;
        else evenSum += d;
      }
      const checkDigit = (10 - ((oddSum + (evenSum * 3)) % 10)) % 10;

      return digits + checkDigit;
    };

    const renderBarcode = (selector, val, options = {}) => {
      try {
        const el = document.querySelector(selector);
        if (!el) return;

        const eanCode = toEan13(val);

        JsBarcode(selector, eanCode, {
          format: 'EAN13',
          width: 1.3,
          height: 28,
          displayValue: false,
          flat: true,
          margin: 2,
          background: '#ffffff',
          lineColor: '#000000',
          ...options
        });
      } catch (e) {
        console.error('Render EAN-13 barcode error:', e);
      }
    };

    const openPaymentHistory = async (cust) => {
      paymentTarget.customerPhone = cust.phone;
      paymentTarget.customerName = cust.name;
      paymentTarget.recentPayments = [];
      paymentTarget.outstandingBalance = 0;
      paymentHistoryModalOpen.value = true;
      paymentLoading.value = true;

      const data = await fetchCustomerBalance(cust.phone);
      if (data) {
        paymentTarget.outstandingBalance = data.outstandingBalance;
        paymentTarget.recentPayments = data.recentPayments;
      }
      paymentLoading.value = false;
    };

    const printPaymentReceipt = async (payment) => {
      setPrintPageSize('A5 portrait', '4mm 6mm');
      printingPayment.value = payment;
      printingPaymentReceipt.value = true;
      await nextTick();

      const payIdStr = payment._id ? payment._id.toString() : '';
      const payShortNum = payIdStr.slice(-8);
      renderBarcode('#barcode-payment', payIdStr || 'PAYMENT', {
        text: `إيصال: #PAY-${payShortNum}`
      });

      const cleanup = () => {
        printingPaymentReceipt.value = false;
        printingPayment.value = null;
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      window.print();
    };

    const paginatedOrderPages = computed(() => {
      if (!printingOrder.value || !printingOrder.value.items) return [];
      const items = printingOrder.value.items;
      const pages = [];
      for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
        pages.push(items.slice(i, i + ITEMS_PER_PAGE));
      }
      return pages;
    });

    // Sales Reconciliation Report Data (Aggregated Products sectioned by Main & Sub Category)
    const reconciliationData = computed(() => {
      const ordersList = filteredOrders.value;
      const dateLabel = orderFilters.selectedDate
        ? formatArabicDate(orderFilters.selectedDate)
        : 'جميع التواريخ';

      const totalOrders = ordersList.length;
      const totalRevenue = ordersList.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Status breakdown
      const statusMap = {
        pending: { label: 'قيد الانتظار', count: 0, total: 0 },
        ready: { label: 'جاهز للاستلام', count: 0, total: 0 },
        received: { label: 'تم الاستلام', count: 0, total: 0 },
        cancelled: { label: 'ملغي', count: 0, total: 0 },
      };
      ordersList.forEach(o => {
        const key = o.status || 'pending';
        if (statusMap[key]) {
          statusMap[key].count++;
          statusMap[key].total += Number(o.totalPrice) || 0;
        }
      });
      const statusBreakdown = Object.entries(statusMap)
        .filter(([, v]) => v.count > 0)
        .map(([key, v]) => ({
          key,
          label: v.label,
          count: v.count,
          totalFormatted: formatCurrency(v.total),
        }));

      // Price mode breakdown
      const pmMap = {
        regular: { label: 'مفرد', count: 0, total: 0 },
        bulk: { label: 'جملة', count: 0, total: 0 },
      };
      ordersList.forEach(o => {
        const key = o.priceMode === 'bulk' ? 'bulk' : 'regular';
        pmMap[key].count++;
        pmMap[key].total += Number(o.totalPrice) || 0;
      });
      const priceModeBreakdown = Object.entries(pmMap)
        .filter(([, v]) => v.count > 0)
        .map(([key, v]) => ({
          key,
          label: v.label,
          count: v.count,
          totalFormatted: formatCurrency(v.total),
        }));

      // Product Aggregation sectioned by Main Category and Sub-Category
      const productLookupById = {};
      const productLookupByName = {};
      (products.value || []).forEach(p => {
        if (p._id) productLookupById[p._id.toString()] = p;
        if (p.name) productLookupByName[p.name.trim().toLowerCase()] = p;
      });

      const catMap = {};
      let grandTotalItemsQty = 0;

      ordersList.forEach(o => {
        (o.items || []).forEach(item => {
          const qty = Number(item.quantity) || 0;
          const price = Number(item.price) || 0;
          const itemTotal = qty * price;
          grandTotalItemsQty += qty;

          let matchedProd = null;
          if (item.productId) {
            matchedProd = productLookupById[item.productId.toString()];
          }
          if (!matchedProd && item.name) {
            matchedProd = productLookupByName[item.name.trim().toLowerCase()];
          }

          const mainCat = (matchedProd && matchedProd.category && matchedProd.category.trim()) ? matchedProd.category.trim() : 'تصنيفات أخرى';
          const subCat = (matchedProd && matchedProd.subCategory && matchedProd.subCategory.trim()) ? matchedProd.subCategory.trim() : 'عام';
          const prodName = item.name ? item.name.trim() : (matchedProd ? matchedProd.name : 'منتج غير معروف');

          if (!catMap[mainCat]) {
            catMap[mainCat] = {
              name: mainCat,
              totalQty: 0,
              totalRevenue: 0,
              subCats: {}
            };
          }
          catMap[mainCat].totalQty += qty;
          catMap[mainCat].totalRevenue += itemTotal;

          if (!catMap[mainCat].subCats[subCat]) {
            catMap[mainCat].subCats[subCat] = {
              name: subCat,
              totalQty: 0,
              totalRevenue: 0,
              products: {}
            };
          }
          catMap[mainCat].subCats[subCat].totalQty += qty;
          catMap[mainCat].subCats[subCat].totalRevenue += itemTotal;

          const pKey = prodName.toLowerCase();
          if (!catMap[mainCat].subCats[subCat].products[pKey]) {
            catMap[mainCat].subCats[subCat].products[pKey] = {
              name: prodName,
              unitPrice: price,
              quantity: 0,
              totalRevenue: 0
            };
          }
          catMap[mainCat].subCats[subCat].products[pKey].quantity += qty;
          catMap[mainCat].subCats[subCat].products[pKey].totalRevenue += itemTotal;
        });
      });

      const categoryProductBreakdown = Object.values(catMap).map(c => ({
        name: c.name,
        totalQty: c.totalQty,
        totalRevenueFormatted: formatCurrency(c.totalRevenue),
        subCategories: Object.values(c.subCats).map(sub => ({
          name: sub.name,
          totalQty: sub.totalQty,
          totalRevenueFormatted: formatCurrency(sub.totalRevenue),
          products: Object.values(sub.products).map(p => ({
            name: p.name,
            unitPriceFormatted: formatCurrency(p.unitPrice),
            quantity: p.quantity,
            totalRevenueFormatted: formatCurrency(p.totalRevenue)
          }))
        }))
      }));

      return {
        dateLabel,
        totalOrders,
        totalRevenueFormatted: formatCurrency(totalRevenue),
        totalRevenueRaw: totalRevenue.toFixed(2),
        avgOrderValueFormatted: formatCurrency(avgOrderValue),
        statusBreakdown,
        priceModeBreakdown,
        categoryProductBreakdown,
        grandTotalItemsQty
      };
    });

    // Dynamic Adaptive Density Engine for A4 Space Optimization
    const reconDensity = computed(() => {
      if (!reconciliationData.value || !reconciliationData.value.categoryProductBreakdown) {
        return 'spacious';
      }
      
      const cats = reconciliationData.value.categoryProductBreakdown;
      const catCount = cats.length;
      let subcatCount = 0;
      let totalProdRows = 0;
      
      cats.forEach(c => {
        subcatCount += (c.subCategories || []).length;
        (c.subCategories || []).forEach(sub => {
          totalProdRows += (sub.products || []).length;
        });
      });
      
      // Compute total visual units score
      const visualScore = totalProdRows + (subcatCount * 1.5) + (catCount * 2.5);
      
      if (visualScore <= 12) {
        return 'spacious'; // 1-12 rows: spacious luxury single-page layout
      } else if (visualScore <= 28) {
        return 'balanced'; // 13-28 rows: clean 1-page / tight 2-page layout
      } else if (visualScore <= 52) {
        return 'dense'; // 29-52 rows: dense 2-page layout
      } else {
        return 'ultra-dense'; // 52+ rows: max compressed multi-page layout
      }
    });

    const printReconciliation = async () => {
      setPrintPageSize('A4 portrait', '6mm 8mm');
      printingReconciliation.value = true;
      await nextTick();

      const cleanup = () => {
        printingReconciliation.value = false;
        window.removeEventListener('afterprint', cleanup);
      };

      window.addEventListener('afterprint', cleanup);
      window.print();
    };

    const printingOrderCustomerBalance = ref(null);

    const printOrder = async (order) => {
      setPrintPageSize('A5 portrait', '4mm 6mm');
      printingOrder.value = order;

      // Mark order as printed on backend
      if (order && order._id) {
        try {
          adminFetch(`/api/admin/orders/${order._id}/printed`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shop: activeShop.value })
          });
          order.printed = true;
        } catch (err) {
          console.warn('Failed to mark order as printed', err);
        }
      }

      const phone = (order?.customerInfo?.phone || order?.customerPhone || order?.phone || '').trim();
      let balance = null;

      const custMatch = customers.value.find(c => c.phone === phone);
      if (custMatch && custMatch.outstandingBalance !== undefined) {
        balance = custMatch.outstandingBalance;
      }
      printingOrderCustomerBalance.value = balance;

      if (phone) {
        try {
          const data = await fetchCustomerBalance(phone);
          if (data && data.outstandingBalance !== undefined) {
            printingOrderCustomerBalance.value = data.outstandingBalance;
          }
        } catch (err) {
          console.error('Fetch balance error during print:', err);
        }
      }

      await nextTick();
      await new Promise(r => setTimeout(r, 100));

      const orderIdStr = order._id ? order._id.toString() : '';
      const orderShortNum = order.orderNumber ? order.orderNumber.toString() : orderIdStr.slice(-6);
      paginatedOrderPages.value.forEach((_, idx) => {
        renderBarcode(`#barcode-order-${idx}`, orderIdStr || 'ORDER', {
          text: `طلب: #${orderShortNum}`
        });
      });

      const cleanup = () => {
        printingOrder.value = null;
        printingOrderCustomerBalance.value = null;
        window.removeEventListener('afterprint', cleanup);
      };

      window.addEventListener('afterprint', cleanup);
      window.print();
    };

    // ============ CHEFS & PRODUCTION LOGIC ============
    const fetchChefs = async () => {
      try {
        const res = await adminFetch(`/api/admin/chefs?shop=${activeShop.value}`);
        if (res.ok) {
          chefs.value = await res.json();
        }
      } catch (err) {
        console.error('Fetch chefs error:', err);
      }
    };

    const openAddChefModal = () => {
      editingChef._id = '';
      editingChef.name = '';
      editingChef.phone = '';
      editingChef.active = true;
      chefModalOpen.value = true;
    };

    const openEditChefModal = (chef) => {
      editingChef._id = chef._id;
      editingChef.name = chef.name;
      editingChef.phone = chef.phone || '';
      editingChef.active = chef.active !== false;
      chefModalOpen.value = true;
    };

    const saveChef = async () => {
      if (!editingChef.name.trim()) {
        toast.show('يرجى إدخال اسم الشيف', 'warning');
        return;
      }
      loading.value = true;
      try {
        const url = editingChef._id ? `/api/admin/chefs/${editingChef._id}` : '/api/admin/chefs';
        const method = editingChef._id ? 'PUT' : 'POST';
        const res = await adminFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editingChef.name.trim(),
            phone: editingChef.phone.trim(),
            active: editingChef.active,
            shop: activeShop.value
          })
        });
        if (res.ok) {
          toast.show(editingChef._id ? 'تم تعديل بيانات الشيف بنجاح' : 'تم إضافة الشيف بنجاح', 'success');
          chefModalOpen.value = false;
          await Promise.all([fetchChefs(), fetchProducts()]);
        } else {
          const data = await res.json();
          toast.show(data.error || 'فشل حفظ الشيف', 'danger');
        }
      } catch (err) {
        toast.show('حدث خطأ بالاتصال بالخادم', 'danger');
      } finally {
        loading.value = false;
      }
    };

    const deleteChef = async (id) => {
      if (!confirm('هل أنت متأكد من حذف هذا الشيف؟ سيتم إلغاء ربط جميع الأصناف المخصصة له.')) return;
      loading.value = true;
      try {
        const res = await adminFetch(`/api/admin/chefs/${id}?shop=${activeShop.value}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          toast.show('تم حذف الشيف بنجاح', 'success');
          await Promise.all([fetchChefs(), fetchProducts()]);
        } else {
          toast.show('فشل حذف الشيف', 'danger');
        }
      } catch (err) {
        toast.show('حدث خطأ بالاتصال', 'danger');
      } finally {
        loading.value = false;
      }
    };

    const getChefAssignedProducts = (chefId) => {
      return products.value.filter(p => p.chefId === chefId);
    };

    const openAssignProductsModal = (chef) => {
      selectedChefForAssign.value = chef;
      selectedProductIdsForChef.value = products.value.filter(p => p.chefId === chef._id).map(p => p._id);
      assignProductSearch.value = '';
      assignProductsModalOpen.value = true;
    };

    const selectAllProductsForChef = () => {
      const currentIds = filteredProductsForAssign.value.map(p => p._id);
      const union = Array.from(new Set([...selectedProductIdsForChef.value, ...currentIds]));
      selectedProductIdsForChef.value = union;
    };

    const deselectAllProductsForChef = () => {
      selectedProductIdsForChef.value = [];
    };

        const toggleProductAssignment = (prodId) => {
      const idx = selectedProductIdsForChef.value.indexOf(prodId);
      if (idx > -1) {
        selectedProductIdsForChef.value.splice(idx, 1);
      } else {
        selectedProductIdsForChef.value.push(prodId);
      }
    };

    const filteredProductsForAssign = computed(() => {
      if (!assignProductSearch.value.trim()) return products.value;
      const q = assignProductSearch.value.trim().toLowerCase();
      return products.value.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) || 
        (p.category && p.category.toLowerCase().includes(q))
      );
    });

    const saveProductAssignments = async () => {
      if (!selectedChefForAssign.value) return;
      loading.value = true;
      try {
        const res = await adminFetch(`/api/admin/chefs/${selectedChefForAssign.value._id}/assign-products`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productIds: selectedProductIdsForChef.value,
            shop: activeShop.value
          })
        });
        if (res.ok) {
          toast.show('تم تحديث إسناد الأصناف للشيف بنجاح', 'success');
          assignProductsModalOpen.value = false;
          await fetchProducts();
        } else {
          toast.show('فشل إسناد الأصناف', 'danger');
        }
      } catch (err) {
        toast.show('حدث خطأ بالاتصال', 'danger');
      } finally {
        loading.value = false;
      }
    };

    const loadProductionReport = async () => {
      isLoadingReport.value = true;
      try {
        const params = new URLSearchParams({
          shop: activeShop.value
        });
        if (productionReportFilters.dateFrom) params.append('startDate', productionReportFilters.dateFrom);
        if (productionReportFilters.dateTo) params.append('endDate', productionReportFilters.dateTo);
        if (productionReportFilters.chefId) params.append('chefId', productionReportFilters.chefId);

        const res = await adminFetch(`/api/admin/production/report?${params.toString()}`);
        if (res.ok) {
          productionReportData.value = await res.json();
        }
      } catch (err) {
        console.error('Failed to load production report:', err);
      } finally {
        isLoadingReport.value = false;
      }
    };

    const setProductionDateShortcut = (type) => {
      const today = getTodayStr();
      if (type === 'today') {
        productionReportFilters.dateFrom = today;
        productionReportFilters.dateTo = today;
      } else if (type === '7d') {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        productionReportFilters.dateFrom = d.toISOString().split('T')[0];
        productionReportFilters.dateTo = today;
      } else if (type === 'month') {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        productionReportFilters.dateFrom = `${y}-${m}-01`;
        productionReportFilters.dateTo = today;
      }
      loadProductionReport();
    };

    const printProductionReport = async () => {
      setPrintPageSize('A4 portrait', '6mm 8mm');
      printingProductionReport.value = true;
      await nextTick();

      const cleanup = () => {
        printingProductionReport.value = false;
        window.removeEventListener('afterprint', cleanup);
      };

      window.addEventListener('afterprint', cleanup);
      window.print();
    };

        const fetchProducts = async () => {
      const url = activeShop.value === 'shop2' ? '/api/shop2/products' : '/api/products';
      const res = await adminFetch(url);
      if (res.ok) {
        products.value = await res.json();
      }
    };

    const fetchCategories = async () => {
      const url = activeShop.value === 'shop2' ? '/api/shop2/categories' : '/api/categories';
      const res = await adminFetch(url);
      if (res.ok) {
        categories.value = await res.json();
      }
    };

    const fetchTags = async () => {
      const url = activeShop.value === 'shop2' ? '/api/shop2/tags' : '/api/tags';
      const res = await adminFetch(url);
      if (res.ok) {
        tags.value = await res.json();
      }
    };

    const fetchOrders = async () => {
      try {
        const url = `/api/admin/orders?shop=${activeShop.value}`;
        const res = await adminFetch(url);
        if (res.ok) {
          orders.value = await res.json();
        }
      } catch (err) {
        console.error(err);
      }
    };

    // Modern From/To Date Range State & Calendar Logic for Customers Tab
    const custDateFromOpen = ref(false);
    const custDateToOpen = ref(false);

    const todayDate = new Date();
    const custFromPickerYear = ref(todayDate.getFullYear());
    const custFromPickerMonth = ref(todayDate.getMonth());
    const custToPickerYear = ref(todayDate.getFullYear());
    const custToPickerMonth = ref(todayDate.getMonth());

    const getTodayStr = () => new Date().toLocaleDateString('en-CA');

    const custFromMonthYearLabel = computed(() => {
      const d = new Date(custFromPickerYear.value, custFromPickerMonth.value, 1);
      return d.toLocaleDateString('ar-LY', { month: 'long', year: 'numeric' });
    });

    const custToMonthYearLabel = computed(() => {
      const d = new Date(custToPickerYear.value, custToPickerMonth.value, 1);
      return d.toLocaleDateString('ar-LY', { month: 'long', year: 'numeric' });
    });

    const custFromPrevMonth = () => {
      if (custFromPickerMonth.value === 0) { custFromPickerMonth.value = 11; custFromPickerYear.value--; }
      else { custFromPickerMonth.value--; }
    };
    const custFromNextMonth = () => {
      if (custFromPickerMonth.value === 11) { custFromPickerMonth.value = 0; custFromPickerYear.value++; }
      else { custFromPickerMonth.value++; }
    };

    const custToPrevMonth = () => {
      if (custToPickerMonth.value === 0) { custToPickerMonth.value = 11; custToPickerYear.value--; }
      else { custToPickerMonth.value--; }
    };
    const custToNextMonth = () => {
      if (custToPickerMonth.value === 11) { custToPickerMonth.value = 0; custToPickerYear.value++; }
      else { custToPickerMonth.value++; }
    };

    const buildCalendarMatrix = (yearVal, monthVal) => {
      const firstDayOfMonth = new Date(yearVal, monthVal, 1);
      const lastDayOfMonth = new Date(yearVal, monthVal + 1, 0);
      const daysInMonth = lastDayOfMonth.getDate();
      const startDayOfWeek = firstDayOfMonth.getDay();
      
      const days = [];
      const prevMonthLastDay = new Date(yearVal, monthVal, 0).getDate();
      for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const pDay = prevMonthLastDay - i;
        const pDate = new Date(yearVal, monthVal - 1, pDay);
        days.push({ dayNum: pDay, dateStr: pDate.toLocaleDateString('en-CA'), inMonth: false, isToday: false });
      }
      const todayStr = getTodayStr();
      for (let d = 1; d <= daysInMonth; d++) {
        const cDate = new Date(yearVal, monthVal, d);
        const dateStr = cDate.toLocaleDateString('en-CA');
        days.push({ dayNum: d, dateStr, inMonth: true, isToday: dateStr === todayStr });
      }
      const remaining = (7 - (days.length % 7)) % 7;
      for (let n = 1; n <= remaining; n++) {
        const nDate = new Date(yearVal, monthVal + 1, n);
        days.push({ dayNum: n, dateStr: nDate.toLocaleDateString('en-CA'), inMonth: false, isToday: false });
      }
      return days;
    };

    const custFromCalendarDays = computed(() => buildCalendarMatrix(custFromPickerYear.value, custFromPickerMonth.value));
    const custToCalendarDays = computed(() => buildCalendarMatrix(custToPickerYear.value, custToPickerMonth.value));

    const openCustDateFromPicker = () => {
      custDateToOpen.value = false;
      custDateFromOpen.value = !custDateFromOpen.value;
    };

    const openCustDateToPicker = () => {
      custDateFromOpen.value = false;
      custDateToOpen.value = !custDateToOpen.value;
    };

    const selectCustDateFrom = async (dateStr) => {
      customerFilters.dateFrom = dateStr;
      custDateFromOpen.value = false;
      if (!customerFilters.dateTo || customerFilters.dateTo < dateStr) {
        customerFilters.dateTo = dateStr;
      }
      await fetchCustomers();
    };

    const selectCustDateTo = async (dateStr) => {
      customerFilters.dateTo = dateStr;
      custDateToOpen.value = false;
      if (!customerFilters.dateFrom || customerFilters.dateFrom > dateStr) {
        customerFilters.dateFrom = dateStr;
      }
      await fetchCustomers();
    };

    const setCustRangeShortcut = async (type) => {
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-CA');
      custDateFromOpen.value = false;
      custDateToOpen.value = false;

      if (type === 'today') {
        if (customerFilters.dateFrom === todayStr && customerFilters.dateTo === todayStr) {
          customerFilters.dateFrom = '';
          customerFilters.dateTo = '';
        } else {
          customerFilters.dateFrom = todayStr;
          customerFilters.dateTo = todayStr;
        }
      } else if (type === '7d') {
        const past = new Date();
        past.setDate(past.getDate() - 6);
        const pastStr = past.toLocaleDateString('en-CA');
        if (customerFilters.dateFrom === pastStr && customerFilters.dateTo === todayStr) {
          customerFilters.dateFrom = '';
          customerFilters.dateTo = '';
        } else {
          customerFilters.dateFrom = pastStr;
          customerFilters.dateTo = todayStr;
        }
      } else if (type === 'month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const firstDayStr = firstDay.toLocaleDateString('en-CA');
        if (customerFilters.dateFrom === firstDayStr && customerFilters.dateTo === todayStr) {
          customerFilters.dateFrom = '';
          customerFilters.dateTo = '';
        } else {
          customerFilters.dateFrom = firstDayStr;
          customerFilters.dateTo = todayStr;
        }
      }
      await fetchCustomers();
    };

    const clearCustDateRange = async () => {
      customerFilters.dateFrom = '';
      customerFilters.dateTo = '';
      custDateFromOpen.value = false;
      custDateToOpen.value = false;
      await fetchCustomers();
    };

    const isCustRangeToday = computed(() => {
      const todayStr = getTodayStr();
      return customerFilters.dateFrom === todayStr && customerFilters.dateTo === todayStr;
    });

    const isCustRange7d = computed(() => {
      const todayStr = getTodayStr();
      const past = new Date();
      past.setDate(past.getDate() - 6);
      return customerFilters.dateFrom === past.toLocaleDateString('en-CA') && customerFilters.dateTo === todayStr;
    });

    const isCustRangeMonth = computed(() => {
      const today = new Date();
      const firstDayStr = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA');
      return customerFilters.dateFrom === firstDayStr && customerFilters.dateTo === today.toLocaleDateString('en-CA');
    });

    const fetchCustomers = async () => {
      try {
        let url = `/api/admin/customers?shop=${activeShop.value}`;
        if (customerFilters.dateFrom && customerFilters.dateTo) {
          url += `&startDate=${customerFilters.dateFrom}&endDate=${customerFilters.dateTo}`;
        } else if (customerFilters.dateFrom) {
          url += `&selectedDate=${customerFilters.dateFrom}`;
        }
        const res = await adminFetch(url);
        if (res.ok) {
          customers.value = await res.json();
        }
      } catch (err) {
        console.error('Fetch customers error:', err);
      }
    };

    const deleteCustomer = async (id) => {
      if (!confirm('تحذير: سيتم حذف العميل، وجميع مفضلاته، وجميع طلباته السابقة بشكل نهائي. هل أنت متأكد؟')) return;
      
      loading.value = true;
      try {
        const res = await adminFetch(`/api/admin/customers/${id}`, {
          method: 'DELETE'
        });
        
        if (res.ok) {
          toast.show('تم حذف العميل وجميع بياناته بنجاح', 'success');
          await fetchCustomers();
        } else {
          toast.show('فشل حذف العميل', 'danger');
        }
      } catch (err) {
        console.error(err);
        toast.show('حدث خطأ أثناء الاتصال بالخادم', 'danger');
      } finally {
        loading.value = false;
      }
    };

    const updateOrderStatus = async (orderId, status) => {
      try {
        const url = `/api/admin/orders/${orderId}/status?shop=${activeShop.value}`;
        const res = await adminFetch(url, {
          method: 'PUT',
          body: JSON.stringify({ status })
        });
        if (res.ok) {
          toast.show('تم تحديث حالة الطلب بنجاح', 'success');
          await Promise.all([fetchOrders(), fetchAnalytics()]);
        } else {
          toast.show('فشل تحديث حالة الطلب', 'danger');
        }
      } catch (err) {
        toast.show('حدث خطأ بالاتصال بالخادم', 'danger');
      }
    };

    const productSearchQuery = ref('');
    const highlightedSuggestionIndex = ref(-1);
    const showSuggestions = ref(false);

    const filteredSuggestions = computed(() => {
      const q = productSearchQuery.value.trim().toLowerCase();
      if (!q) return [];
      return products.value.filter(p => p.name.toLowerCase().includes(q)).slice(0, 8);
    });

    watch(productSearchQuery, (newVal) => {
      showSuggestions.value = newVal.trim().length > 0;
      highlightedSuggestionIndex.value = -1;
    });

        const scrollDropdownItemIntoView = (containerSelector, itemIndex) => {
      nextTick(() => {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        const items = container.querySelectorAll('.suggestion-item');
        if (itemIndex >= 0 && itemIndex < items.length) {
          const item = items[itemIndex];
          const containerTop = container.scrollTop;
          const containerBottom = containerTop + container.clientHeight;
          const itemTop = item.offsetTop;
          const itemBottom = itemTop + item.offsetHeight;

          if (itemTop < containerTop) {
            container.scrollTop = itemTop;
          } else if (itemBottom > containerBottom) {
            container.scrollTop = itemBottom - container.clientHeight;
          }
        }
      });
    };

const navigateSuggestions = (dir) => {
      const len = filteredSuggestions.value.length;
      if (len === 0) return;
      highlightedSuggestionIndex.value = (highlightedSuggestionIndex.value + dir + len) % len;
      scrollDropdownItemIntoView('.product-search-autocomplete-container .autocomplete-suggestions-dropdown', highlightedSuggestionIndex.value);
    };

    const selectHighlightedSuggestion = () => {
      const index = highlightedSuggestionIndex.value;
      if (index >= 0 && index < filteredSuggestions.value.length) {
        addSelectedProduct(filteredSuggestions.value[index]);
      }
    };

    const addSelectedProduct = (prod) => {
      const price = editingOrder.priceMode === 'bulk' 
        ? (prod.price_bulk !== undefined && prod.price_bulk !== null ? prod.price_bulk : prod.price) 
        : (prod.price_regular !== undefined && prod.price_regular !== null ? prod.price_regular : prod.price);
      
      const existingItem = editingOrder.items.find(item => item.productId && item.productId.toString() === prod._id.toString());
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        editingOrder.items.push({
          productId: prod._id,
          name: prod.name,
          price: Number(price) || 0,
          quantity: 1,
          notes: '',
          allowFloat: !!prod.allowFloat
        });
      }
      recalcOrderTotal();
      productSearchQuery.value = '';
      showSuggestions.value = false;
    };

        const closeNewOrderCustomerSuggestionsWithDelay = () => {
      setTimeout(() => {
        showNewOrderCustomerSuggestions.value = false;
      }, 200);
    };

    const closeNewOrderProductSuggestionsWithDelay = () => {
      setTimeout(() => {
        showNewOrderProductSuggestions.value = false;
      }, 200);
    };

const closeSuggestionsWithDelay = () => {
      setTimeout(() => {
        showSuggestions.value = false;
      }, 200);
    };

    const openOrderEditModal = (order) => {
      editingOrder._id = order._id;
      editingOrder.customerName = order.customerInfo?.name || '';
      editingOrder.customerPhone = order.customerInfo?.phone || '';
      editingOrder.items = (order.items || []).map(item => ({ ...item }));
      editingOrder.totalPrice = order.totalPrice || 0;
      editingOrder.priceMode = order.priceMode || 'regular';
      editingOrder.status = order.status || 'pending';
      editingOrder.deliveryDate = order.deliveryDate || '';
      editingOrder.notes = order.notes || '';
      productSearchQuery.value = '';
      showSuggestions.value = false;
      orderEditModalOpen.value = true;
      recalcOrderTotal();
    };

    const recalcOrderTotal = () => {
      editingOrder.totalPrice = editingOrder.items.reduce((sum, item) => {
        return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
      }, 0);
    };

    const onPriceModeChange = () => {
      editingOrder.items.forEach(item => {
        if (item.productId) {
          const prod = products.value.find(p => p._id.toString() === item.productId.toString());
          if (prod) {
            item.price = editingOrder.priceMode === 'bulk' 
              ? (prod.price_bulk !== undefined && prod.price_bulk !== null ? prod.price_bulk : prod.price) 
              : (prod.price_regular !== undefined && prod.price_regular !== null ? prod.price_regular : prod.price);
          }
        }
      });
      recalcOrderTotal();
    };

    const removeOrderItem = (idx) => {
      if (editingOrder.items.length > 1) {
        editingOrder.items.splice(idx, 1);
        recalcOrderTotal();
      }
    };

    const saveOrder = async () => {
      try {
        loading.value = true;
        recalcOrderTotal();
        const url = `/api/admin/orders/${editingOrder._id}?shop=${activeShop.value}`;
        const payload = {
          customerInfo: {
            name: editingOrder.customerName,
            phone: editingOrder.customerPhone
          },
          items: editingOrder.items.map(item => ({
            productId: item.productId || undefined,
            name: item.name,
            price: Number(item.price),
            quantity: Number(item.quantity),
            allowFloat: item.allowFloat || false,
            notes: item.notes || ''
          })),
          totalPrice: Number(editingOrder.totalPrice),
          priceMode: editingOrder.priceMode,
          status: editingOrder.status,
          deliveryDate: editingOrder.deliveryDate,
          notes: editingOrder.notes
        };
        const res = await adminFetch(url, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          toast.show('تم تعديل الطلب بنجاح', 'success');
          orderEditModalOpen.value = false;
          await Promise.all([fetchOrders(), fetchCustomers(), fetchAnalytics()]);
        } else {
          const data = await res.json();
          toast.show(data.error || 'فشل تعديل الطلب', 'danger');
        }
      } catch (err) {
        toast.show('حدث خطأ بالاتصال بالخادم', 'danger');
      } finally {
        loading.value = false;
      }
    };

    // ============ FAST NEW ORDER CREATION (POS / ADMIN ORDER) ============
    const newOrderModalOpen = ref(false);
    const newOrderLoading = ref(false);
    const newOrderAutoPrint = ref(true);
    const newOrderCustomerSearch = ref('');
    const newOrderProductSearch = ref('');
    const newOrderCategoryFilter = ref('');
    const showNewOrderCustomerSuggestions = ref(false);
    const showNewOrderProductSuggestions = ref(false);
    const highlightedCustomerIndex = ref(0);
    const highlightedProductIndex = ref(0);
    const newOrderCustomerInputRef = ref(null);
    const newOrderProductInputRef = ref(null);

    const newOrder = reactive({
      customerName: '',
      customerPhone: '',
      items: [],
      priceMode: 'regular',
      status: 'pending',
      deliveryDate: '',
      notes: '',
      paymentStatus: 'unpaid',
      paymentMethod: 'cash',
      paidAmount: 0,
      totalPrice: 0
    });

    const filteredNewOrderCustomers = computed(() => {
      const q = newOrderCustomerSearch.value.trim().toLowerCase();
      const list = customers.value || [];
      if (!q) {
        if (list.length > 0) return list.slice(0, 8);
        const fromOrders = [];
        const seenPhones = new Set();
        for (const o of (orders.value || [])) {
          if (o.customerInfo && o.customerInfo.phone && !seenPhones.has(o.customerInfo.phone)) {
            seenPhones.add(o.customerInfo.phone);
            fromOrders.push({
              _id: o._id,
              name: o.customerInfo.name || 'عميل',
              phone: o.customerInfo.phone,
              orderCount: 1,
              outstandingBalance: 0
            });
            if (fromOrders.length >= 8) break;
          }
        }
        return fromOrders;
      }
      return list.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) || 
        (c.phone && c.phone.includes(q))
      ).slice(0, 8);
    });

    const filteredNewOrderProducts = computed(() => {
      const q = newOrderProductSearch.value.trim().toLowerCase();
      const cat = newOrderCategoryFilter.value;
      let list = products.value || [];
      if (cat) {
        list = list.filter(p => p.category === cat);
      }
      if (q) {
        list = list.filter(p => 
          (p.name && p.name.toLowerCase().includes(q)) || 
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.subCategory && p.subCategory.toLowerCase().includes(q))
        );
      }
      return list;
    });

    // Progressive Chunked Scroll-Loading for Smooth Rendering
    const posProductDisplayLimit = ref(24);
    const displayedNewOrderProducts = computed(() => {
      return filteredNewOrderProducts.value.slice(0, posProductDisplayLimit.value);
    });

    const onPosProductsScroll = (e) => {
      const target = e.target;
      if (!target) return;
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - 70) {
        if (posProductDisplayLimit.value < filteredNewOrderProducts.value.length) {
          posProductDisplayLimit.value += 24;
        }
      }
    };

    watch([newOrderProductSearch, newOrderCategoryFilter], () => {
      posProductDisplayLimit.value = 24;
    });

    const getItemQtyInCart = (productId) => {
      if (!productId) return 0;
      const item = newOrder.items.find(i => i.productId && i.productId.toString() === productId.toString());
      return item ? item.quantity : 0;
    };

    const focusProductSearch = () => {
      nextTick(() => {
        if (newOrderProductInputRef.value) {
          newOrderProductInputRef.value.focus();
        }
      });
    };

    const openNewOrderModal = () => {
      newOrder.customerName = '';
      newOrder.customerPhone = '';
      newOrder.items = [];
      newOrder.priceMode = 'regular';
      newOrder.status = 'pending';
      newOrder.deliveryDate = new Date().toISOString().split('T')[0];
      newOrder.notes = '';
      newOrder.paymentStatus = 'unpaid';
      newOrder.paymentMethod = 'cash';
      newOrder.paidAmount = 0;
      newOrder.totalPrice = 0;

      newOrderCustomerSearch.value = '';
      newOrderProductSearch.value = '';
      newOrderCategoryFilter.value = '';
      showNewOrderCustomerSuggestions.value = false;
      showNewOrderProductSuggestions.value = false;
      highlightedCustomerIndex.value = 0;
      highlightedProductIndex.value = 0;
      posProductDisplayLimit.value = 24;

      newOrderModalOpen.value = true;

      nextTick(() => {
        if (newOrderCustomerInputRef.value) {
          newOrderCustomerInputRef.value.focus();
        }
      });
    };

    const navigateCustomerSuggestions = (delta) => {
      const max = filteredNewOrderCustomers.value.length;
      if (max === 0) return;
      showNewOrderCustomerSuggestions.value = true;
      let next = highlightedCustomerIndex.value + delta;
      if (next < 0) next = max - 1;
      if (next >= max) next = 0;
      highlightedCustomerIndex.value = next;
      scrollDropdownItemIntoView('.customer-suggestions-dropdown', next);
    };

    const selectHighlightedCustomerOrNext = () => {
      if (showNewOrderCustomerSuggestions.value && filteredNewOrderCustomers.value.length > 0) {
        const idx = (highlightedCustomerIndex.value >= 0 && highlightedCustomerIndex.value < filteredNewOrderCustomers.value.length) 
          ? highlightedCustomerIndex.value 
          : 0;
        selectCustomerForNewOrder(filteredNewOrderCustomers.value[idx]);
      }
      showNewOrderProductSuggestions.value = true;
      focusProductSearch();
    };

    const selectCustomerForNewOrder = (cust) => {
      newOrder.customerName = cust.name || '';
      newOrder.customerPhone = cust.phone || '';
      newOrderCustomerSearch.value = cust.name ? `${cust.name} (${cust.phone})` : cust.phone;
      showNewOrderCustomerSuggestions.value = false;
    };

    const clearSelectedCustomerForNewOrder = () => {
      newOrder.customerName = '';
      newOrder.customerPhone = '';
      newOrderCustomerSearch.value = '';
    };

    const navigateProductSuggestions = (delta) => {
      const max = filteredNewOrderProducts.value.length;
      if (max === 0) return;
      showNewOrderProductSuggestions.value = true;
      let next = highlightedProductIndex.value + delta;
      if (next < 0) next = max - 1;
      if (next >= max) next = 0;
      highlightedProductIndex.value = next;
      scrollDropdownItemIntoView('.pos-catalog-card .autocomplete-suggestions-dropdown', next);
    };

    const addHighlightedProductToNewOrder = () => {
      if (filteredNewOrderProducts.value && filteredNewOrderProducts.value.length > 0) {
        const idx = (highlightedProductIndex.value >= 0 && highlightedProductIndex.value < filteredNewOrderProducts.value.length)
          ? highlightedProductIndex.value
          : 0;
        addProductToNewOrder(filteredNewOrderProducts.value[idx], true);
        highlightedProductIndex.value = 0;
      }
      focusProductSearch();
    };

    const decrementProductInCart = (prod) => {
      if (!prod) return;
      const idx = newOrder.items.findIndex(i => i.productId && i.productId.toString() === prod._id.toString());
      if (idx !== -1) {
        const item = newOrder.items[idx];
        if (item.quantity <= (item.allowFloat ? 0.25 : 1)) {
          removeNewOrderItem(idx);
        } else {
          adjustNewOrderItemQty(item, -1);
        }
      }
    };

    const toggleProductInNewOrder = (prod) => {
      if (!prod) return;
      addProductToNewOrder(prod, false);
    };

    const handleProductSearchKeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        showNewOrderProductSuggestions.value = false;
        if (newOrderProductInputRef.value) {
          newOrderProductInputRef.value.blur();
        }
        return;
      }
      if (e.key === 'Tab') {
        showNewOrderProductSuggestions.value = false;
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateProductSuggestions(1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateProductSuggestions(-1);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredNewOrderProducts.value.length > 0) {
          const idx = (highlightedProductIndex.value >= 0 && highlightedProductIndex.value < filteredNewOrderProducts.value.length)
            ? highlightedProductIndex.value
            : 0;
          const prod = filteredNewOrderProducts.value[idx];
          if (prod) {
            addProductToNewOrder(prod, true);
          }
        }
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        if (showNewOrderProductSuggestions.value && filteredNewOrderProducts.value.length > 0 && newOrderProductSearch.value.trim() !== '') {
          e.preventDefault();
          const idx = (highlightedProductIndex.value >= 0 && highlightedProductIndex.value < filteredNewOrderProducts.value.length) 
            ? highlightedProductIndex.value 
            : 0;
          const prod = filteredNewOrderProducts.value[idx];
          if (prod) {
            addProductToNewOrder(prod, false);
          }
          return;
        }
      }
      if (e.key === '+' || e.key === 'ArrowRight') {
        if (showNewOrderProductSuggestions.value && filteredNewOrderProducts.value.length > 0) {
          const idx = (highlightedProductIndex.value >= 0 && highlightedProductIndex.value < filteredNewOrderProducts.value.length) 
            ? highlightedProductIndex.value 
            : 0;
          const prod = filteredNewOrderProducts.value[idx];
          if (prod && getItemQtyInCart(prod._id) > 0) {
            e.preventDefault();
            addProductToNewOrder(prod, false);
            return;
          }
        }
      }
      if (e.key === '-' || e.key === 'ArrowLeft') {
        if (showNewOrderProductSuggestions.value && filteredNewOrderProducts.value.length > 0) {
          const idx = (highlightedProductIndex.value >= 0 && highlightedProductIndex.value < filteredNewOrderProducts.value.length) 
            ? highlightedProductIndex.value 
            : 0;
          const prod = filteredNewOrderProducts.value[idx];
          if (prod && getItemQtyInCart(prod._id) > 0) {
            e.preventDefault();
            decrementProductInCart(prod);
            return;
          }
        }
      }
    };

    const cycleNewOrderCategory = () => {
      const allCats = [{ name: '' }, ...(categories.value || [])];
      const curIdx = allCats.findIndex(c => c.name === newOrderCategoryFilter.value);
      const nextIdx = (curIdx + 1) % allCats.length;
      newOrderCategoryFilter.value = allCats[nextIdx].name;
    };

    const focusFirstCartItem = () => {
      nextTick(() => {
        const firstStepper = document.querySelector('.fast-order-modal .stepper-input');
        if (firstStepper) {
          firstStepper.focus();
          firstStepper.select();
        }
      });
    };

    const addProductToNewOrder = (prod, resetSearch = true) => {
      const price = newOrder.priceMode === 'bulk'
        ? (prod.price_bulk !== undefined && prod.price_bulk !== null ? prod.price_bulk : (prod.price_regular || prod.price || 0))
        : (prod.price_regular !== undefined && prod.price_regular !== null ? prod.price_regular : (prod.price || 0));
      
      const existing = newOrder.items.find(item => item.productId && item.productId.toString() === prod._id.toString());
      if (existing) {
        existing.quantity = Math.round((existing.quantity + 1) * 100) / 100;
      } else {
        newOrder.items.push({
          productId: prod._id,
          name: prod.name,
          img: prod.img || '',
          price: Number(price) || 0,
          quantity: 1,
          allowFloat: !!prod.allowFloat,
          notes: ''
        });
      }
      recalcNewOrderTotal();
      if (resetSearch) {
        newOrderProductSearch.value = '';
      }
    };

    const addFirstFilteredProductToNewOrder = () => {
      if (filteredNewOrderProducts.value && filteredNewOrderProducts.value.length > 0) {
        addProductToNewOrder(filteredNewOrderProducts.value[0]);
      }
    };

    const removeNewOrderItem = (index) => {
      newOrder.items.splice(index, 1);
      recalcNewOrderTotal();
    };

    const adjustNewOrderItemQty = (item, delta) => {
      const step = item.allowFloat ? (item.quantity <= 1 && delta < 0 ? 0.25 : (delta > 0 && item.quantity < 1 ? 0.25 : 1)) : 1;
      const newQty = Math.max(item.allowFloat ? 0.25 : 1, Math.round((item.quantity + delta * step) * 100) / 100);
      item.quantity = newQty;
      recalcNewOrderTotal();
    };

    const recalcNewOrderTotal = () => {
      newOrder.totalPrice = newOrder.items.reduce((sum, item) => {
        return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
      }, 0);
      newOrder.totalPrice = Math.round(newOrder.totalPrice * 100) / 100;
      if (newOrder.paymentStatus === 'paid') {
        newOrder.paidAmount = newOrder.totalPrice;
      }
    };

    const onNewOrderPriceModeChange = (mode) => {
      newOrder.priceMode = mode;
      newOrder.items.forEach(item => {
        if (item.productId) {
          const prod = (products.value || []).find(p => p._id.toString() === item.productId.toString());
          if (prod) {
            item.price = mode === 'bulk'
              ? (prod.price_bulk !== undefined && prod.price_bulk !== null ? prod.price_bulk : (prod.price_regular || prod.price || 0))
              : (prod.price_regular !== undefined && prod.price_regular !== null ? prod.price_regular : (prod.price || 0));
          }
        }
      });
      recalcNewOrderTotal();
    };

    const setNewOrderDateShortcut = (daysFromToday) => {
      const d = new Date();
      d.setDate(d.getDate() + daysFromToday);
      newOrder.deliveryDate = d.toISOString().split('T')[0];
    };

    const onNewOrderPaymentStatusChange = () => {
      if (newOrder.paymentStatus === 'paid') {
        newOrder.paidAmount = newOrder.totalPrice;
      } else if (newOrder.paymentStatus === 'unpaid') {
        newOrder.paidAmount = 0;
      }
    };

    const submitNewOrder = async () => {
      if (!newOrder.customerName.trim() || !newOrder.customerPhone.trim()) {
        toast.show('يرجى إدخال اسم العميل ورقم هاتفه', 'danger');
        return;
      }
      if (newOrder.items.length === 0) {
        toast.show('يرجى إضافة صنف واحد على الأقل للطلب', 'danger');
        return;
      }

      newOrderLoading.value = true;
      try {
        recalcNewOrderTotal();
        const url = activeShop.value === 'shop2' ? '/api/shop2/orders' : '/api/orders';
        const payload = {
          customer: {
            name: newOrder.customerName.trim(),
            phone: newOrder.customerPhone.trim()
          },
          items: newOrder.items.map(item => ({
            productId: item.productId,
            name: item.name,
            price: Number(item.price),
            quantity: Number(item.quantity),
            allowFloat: !!item.allowFloat,
            notes: item.notes || ''
          })),
          totalPrice: newOrder.totalPrice,
          priceMode: newOrder.priceMode,
          status: newOrder.status,
          deliveryDate: newOrder.deliveryDate,
          notes: newOrder.notes,
          paidAmount: newOrder.paymentStatus === 'paid' ? newOrder.totalPrice : (newOrder.paymentStatus === 'partial' ? Number(newOrder.paidAmount) || 0 : 0),
          paymentStatus: newOrder.paymentStatus,
          paymentMethod: newOrder.paymentMethod
        };

        const res = await adminFetch(url, {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          toast.show(`تم إنشاء الطلب #${data.orderNumber || ''} بنجاح`, 'success');
          newOrderModalOpen.value = false;
          await Promise.all([fetchOrders(), fetchCustomers(), fetchAnalytics()]);

          if (newOrderAutoPrint.value && data.order) {
            printOrder(data.order);
          }
        } else {
          const err = await res.json();
          toast.show(err.error || 'فشل في إنشاء الطلب', 'danger');
        }
      } catch (err) {
        console.error("Create order error:", err);
        toast.show('حدث خطأ أثناء الاتصال بالخادم', 'danger');
      } finally {
        newOrderLoading.value = false;
      }
    };

    const openCustomerDetails = (cust) => {
      selectedCustomer.value = cust;
      showProfilePassword.value = false;
      customerDetailsModalOpen.value = true;
    };

    const openCustomerEditModal = (cust) => {
      editingCustomer._id = cust._id;
      editingCustomer.name = cust.name;
      editingCustomer.phone = cust.phone;
      editingCustomer.password = cust.password || '';
      editingCustomer.showPassword = false;
      customerModalOpen.value = true;
    };

    const copyCustomerPassword = async (pass) => {
      if (!pass) return;
      try {
        await navigator.clipboard.writeText(pass);
        toast.show('تم نسخ كلمة المرور إلى الحافظة بنجاح', 'success');
      } catch (e) {
        toast.show('فشل نسخ كلمة المرور', 'danger');
      }
    };

    const saveCustomerDetails = async () => {
      loading.value = true;
      try {
        const url = `/api/admin/customers/${editingCustomer._id}`;
        const res = await adminFetch(url, {
          method: 'PUT',
          body: JSON.stringify({
            name: editingCustomer.name,
            phone: editingCustomer.phone,
            password: editingCustomer.password
          })
        });
        if (res.ok) {
          const data = await res.json();
          toast.show('تم تحديث بيانات وكلمة مرور العميل بنجاح', 'success');
          if (selectedCustomer.value && selectedCustomer.value._id === editingCustomer._id) {
            selectedCustomer.value.name = editingCustomer.name;
            selectedCustomer.value.phone = editingCustomer.phone;
            selectedCustomer.value.password = editingCustomer.password;
            selectedCustomer.value.hasPassword = !!editingCustomer.password;
          }
          customerModalOpen.value = false;
          await Promise.all([fetchCustomers(), fetchOrders(), fetchAnalytics()]);
        } else {
          const errData = await res.json();
          toast.show(errData.error || 'فشل تحديث العميل', 'danger');
        }
      } catch (err) {
        toast.show('حدث خطأ بالاتصال بالخادم', 'danger');
      } finally {
        loading.value = false;
      }
    };

    const openCustomerFavsModal = (cust) => {
      console.log("[FAVORITES] Opening modal for customer:", cust);
      console.log("[FAVORITES] Customer favorites IDs:", cust.favorites);
      console.log("[FAVORITES] Total products list loaded:", products.value.length);
      
      viewingCustomer.value = cust;
      const favs = cust.favorites || [];
      viewingCustomerFavs.value = favs.map(id => {
        const prod = products.value.find(p => p._id === id);
        if (!prod) {
          console.warn(`[FAVORITES] Product not found in active list for ID: ${id}`);
        }
        return prod ? prod : { _id: id, name: 'منتج غير معروف', category: 'غير معروف', img: '' };
      }).filter(Boolean);
      
      console.log("[FAVORITES] Mapped products for display:", viewingCustomerFavs.value);
      customerFavsModalOpen.value = true;
    };

    const removeCustomerFavorite = async (productId) => {
      if (!viewingCustomer.value) return;
      
      const updatedFavs = viewingCustomer.value.favorites.filter(id => id !== productId);
      
      loading.value = true;
      try {
        const res = await adminFetch('/api/customer/favorites', {
          method: 'POST',
          body: JSON.stringify({
            phone: viewingCustomer.value.phone,
            shop: activeShop.value,
            favorites: updatedFavs
          })
        });
        
        if (res.ok) {
          viewingCustomer.value.favorites = updatedFavs;
          viewingCustomerFavs.value = viewingCustomerFavs.value.filter(p => p._id !== productId);
          toast.show('تمت إزالة المنتج من المفضلة للعميل', 'success');
          await fetchCustomers();
        } else {
          toast.show('فشل في إزالة المنتج من المفضلة', 'danger');
        }
      } catch (err) {
        toast.show('حدث خطأ بالاتصال بالخادم', 'danger');
      } finally {
        loading.value = false;
      }
    };

    const filteredOrders = computed(() => {
      const query = orderFilters.search ? orderFilters.search.trim().toLowerCase().replace(/^#/, '') : '';
      return orders.value.filter(o => {
        const orderIdStr = o._id ? o._id.toString().toLowerCase() : '';
        const orderIdShort = orderIdStr.slice(-6);

        const matchesSearch = !query || 
                              (o.orderNumber && o.orderNumber.toString().includes(query)) ||
                              orderIdStr.includes(query) ||
                              orderIdShort.includes(query) ||
                              toEan13(o._id).includes(query) ||
                              (o.customerInfo && o.customerInfo.name && o.customerInfo.name.toLowerCase().includes(query)) || 
                              (o.customerInfo && o.customerInfo.phone && o.customerInfo.phone.includes(query));
        const matchesStatus = !orderFilters.status || o.status === orderFilters.status;
        
        let matchesDate = true;
        if (orderFilters.selectedDate) {
          let receiveDateStr = '';
          if (o.deliveryDate) {
            const d = new Date(o.deliveryDate);
            if (!isNaN(d.getTime())) {
              receiveDateStr = d.toLocaleDateString('en-CA');
            } else if (typeof o.deliveryDate === 'string') {
              receiveDateStr = o.deliveryDate.trim().slice(0, 10);
            }
          } else if (o.receivedAt) {
            const d = new Date(o.receivedAt);
            if (!isNaN(d.getTime())) {
              receiveDateStr = d.toLocaleDateString('en-CA');
            }
          } else if (o.createdAt) {
            const d = new Date(o.createdAt);
            if (!isNaN(d.getTime())) {
              receiveDateStr = d.toLocaleDateString('en-CA');
            }
          }
          matchesDate = receiveDateStr === orderFilters.selectedDate;
        }
        
        return matchesSearch && matchesStatus && matchesDate;
      });
    });

    const filteredCustomers = computed(() => {
      return customers.value.filter(c => {
        return c.name.toLowerCase().includes(customerFilters.search.toLowerCase()) || 
               c.phone.includes(customerFilters.search);
      });
    });

    // Responsive Mobile Viewport Tracking for Pagination
    const isMobileScreen = ref(typeof window !== 'undefined' ? window.innerWidth <= 640 : false);
    const handleResize = () => {
      isMobileScreen.value = window.innerWidth <= 640;
    };

    let scanBuffer = '';
    let scanTimeout = null;

    const handleGlobalKeydown = (e) => {
      // 1. Modal Close / Cancel with Escape
      if (e.key === 'Escape') {
        if (newOrderModalOpen.value) {
          if (showNewOrderCustomerSuggestions.value || showNewOrderProductSuggestions.value) {
            showNewOrderCustomerSuggestions.value = false;
            showNewOrderProductSuggestions.value = false;
            return;
          }
          newOrderModalOpen.value = false;
          return;
        }
        if (paymentModalOpen.value) { paymentModalOpen.value = false; return; }
        if (paymentHistoryModalOpen.value) { paymentHistoryModalOpen.value = false; return; }
        if (customerModalOpen.value) { customerModalOpen.value = false; return; }
        if (customerFavsModalOpen.value) { customerFavsModalOpen.value = false; return; }
        if (customerDetailsModalOpen.value) { customerDetailsModalOpen.value = false; return; }
        if (orderEditModalOpen.value) { orderEditModalOpen.value = false; return; }
        if (productModalOpen.value) { productModalOpen.value = false; return; }
        if (categoryModalOpen.value) { categoryModalOpen.value = false; return; }
        if (tagModalOpen.value) { tagModalOpen.value = false; return; }
        if (custDatePickerOpen.value) { custDatePickerOpen.value = false; return; }
        if (cropperModalOpen.value) { cropperModalOpen.value = false; return; }
        return;
      }

      // 2. F2 or Ctrl+N / Alt+N: Open Fast Order Modal (POS Mode)
      if ((e.key === 'F2' || ((e.ctrlKey || e.altKey) && (e.key === 'n' || e.key === 'N' || e.key === 'ى'))) && !newOrderModalOpen.value) {
        e.preventDefault();
        openNewOrderModal();
        return;
      }

      // 3. Inside Fast Order Modal Keyboards Flow
      if (newOrderModalOpen.value) {
        // Ctrl+Enter or F9 or Alt+S: Submit Order
        if ((e.ctrlKey && e.key === 'Enter') || e.key === 'F9' || (e.altKey && (e.key === 's' || e.key === 'S' || e.key === 'س'))) {
          e.preventDefault();
          if (!newOrderLoading.value && newOrder.items.length > 0 && newOrder.customerName && newOrder.customerPhone) {
            submitNewOrder();
          } else if (newOrder.items.length === 0) {
            toast.show('يرجى إضافة صنف واحد على الأقل للطلب قبل الحفظ', 'warning');
          } else if (!newOrder.customerName || !newOrder.customerPhone) {
            toast.show('يرجى إدخال اسم العميل ورقم هاتفه', 'warning');
          }
          return;
        }

        // Alt+W: Toggle Wholesale / Retail price mode
        if (e.altKey && (e.key === 'w' || e.key === 'W' || e.key === 'ص')) {
          e.preventDefault();
          onNewOrderPriceModeChange(newOrder.priceMode === 'regular' ? 'bulk' : 'regular');
          toast.show(`تم التحويل إلى: ${newOrder.priceMode === 'bulk' ? 'تسعير جملة' : 'تسعير مفرد'}`, 'info');
          return;
        }

        // Alt+P: Toggle Auto Print
        if (e.altKey && (e.key === 'p' || e.key === 'P' || e.key === 'ح')) {
          e.preventDefault();
          newOrderAutoPrint.value = !newOrderAutoPrint.value;
          toast.show(`الطباعة التلقائية: ${newOrderAutoPrint.value ? 'مفعلة' : 'معطلة'}`, 'info');
          return;
        }

        // Alt+1 / Alt+2 / Alt+3: Date Shortcuts
        if (e.altKey && e.key === '1') {
          e.preventDefault();
          setNewOrderDateShortcut(0);
          return;
        }
        if (e.altKey && e.key === '2') {
          e.preventDefault();
          setNewOrderDateShortcut(1);
          return;
        }
        if (e.altKey && e.key === '3') {
          e.preventDefault();
          setNewOrderDateShortcut(2);
          return;
        }

        // F4 or Alt+C: Cycle Categories
        if (e.key === 'F4' || (e.altKey && (e.key === 'c' || e.key === 'C' || e.key === 'ؤ'))) {
          e.preventDefault();
          cycleNewOrderCategory();
          return;
        }

        // F8 or Alt+K: Focus Cart Items
        if (e.key === 'F8' || (e.altKey && (e.key === 'k' || e.key === 'K' || e.key === 'ن'))) {
          e.preventDefault();
          focusFirstCartItem();
          return;
        }
      }

      // Check if user is typing into modal inputs or form inputs
      const activeEl = document.activeElement;
      const activeTag = activeEl ? activeEl.tagName : '';
      const isInputFocused = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

      // If user is focused on normal inputs OTHER than the order search input, ignore global scan buffer
      if (isInputFocused && activeEl.id !== 'order-search-input') {
        return;
      }

      // Hardware Barcode Scanners send 'Enter' at the end of a rapid scan
      if (e.key === 'Enter') {
        if (scanBuffer.length >= 4) {
          const scannedVal = scanBuffer.trim();
          scanBuffer = '';
          
          // Switch to orders tab automatically
          activeTab.value = 'orders';
          orderFilters.search = scannedVal;

          // Focus search input
          nextTick(() => {
            const searchInput = document.getElementById('order-search-input');
            if (searchInput) searchInput.focus();
          });

          // Show feedback toast
          const cleanNum = scannedVal.replace(/^#/, '').slice(-6);
          toast.show(`تم المسح الضوئي بنجاح والبحث عن الطلب #${cleanNum}`, 'success');
        }
        scanBuffer = '';
        return;
      }

      // Buffer single printable characters
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        scanBuffer += e.key;
        clearTimeout(scanTimeout);
        scanTimeout = setTimeout(() => {
          scanBuffer = '';
        }, 150); // Reset buffer if typing pauses > 150ms
      }
    };

    onMounted(() => {
      window.addEventListener('resize', handleResize);
      window.addEventListener('keydown', handleGlobalKeydown);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleGlobalKeydown);
    });

    // =========================================================================
    // PAGINATION ENGINE FOR TABLES (Products, Orders, Customers)
    // =========================================================================
    const getPageNumbers = (current, total) => {
      const isMobile = isMobileScreen.value;
      const maxPills = isMobile ? 5 : 7;
      if (total <= maxPills) {
        const pages = [];
        for (let i = 1; i <= total; i++) pages.push(i);
        return pages;
      }
      if (isMobile) {
        if (current <= 3) {
          return [1, 2, 3, '...', total];
        }
        if (current >= total - 2) {
          return [1, '...', total - 2, total - 1, total];
        }
        return [1, '...', current, '...', total];
      }
      if (current <= 4) {
        return [1, 2, 3, 4, 5, '...', total];
      }
      if (current >= total - 3) {
        return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
      }
      return [1, '...', current - 1, current, current + 1, '...', total];
    };

    // Products Pagination
    const productsPage = ref(1);
    const productsPerPage = ref(12);
    const paginatedProducts = computed(() => {
      const start = (productsPage.value - 1) * productsPerPage.value;
      return filteredProducts.value.slice(start, start + productsPerPage.value);
    });
    const productsTotalPages = computed(() => Math.ceil(filteredProducts.value.length / productsPerPage.value) || 1);
    const productsVisiblePages = computed(() => getPageNumbers(productsPage.value, productsTotalPages.value));

    // Orders Pagination
    const ordersPage = ref(1);
    const ordersPerPage = ref(10);
    const paginatedOrders = computed(() => {
      const start = (ordersPage.value - 1) * ordersPerPage.value;
      return filteredOrders.value.slice(start, start + ordersPerPage.value);
    });
    const ordersTotalPages = computed(() => Math.ceil(filteredOrders.value.length / ordersPerPage.value) || 1);
    const ordersVisiblePages = computed(() => getPageNumbers(ordersPage.value, ordersTotalPages.value));

    // Customers Pagination
    const customersPage = ref(1);
    const customersPerPage = ref(10);
    const paginatedCustomers = computed(() => {
      const start = (customersPage.value - 1) * customersPerPage.value;
      return filteredCustomers.value.slice(start, start + customersPerPage.value);
    });
    const customersTotalPages = computed(() => Math.ceil(filteredCustomers.value.length / customersPerPage.value) || 1);
    const customersVisiblePages = computed(() => getPageNumbers(customersPage.value, customersTotalPages.value));

    // Reset pagination to Page 1 on filter/search or shop context change
    watch([() => filters.search, () => filters.category, () => filters.subCategory], () => {
      productsPage.value = 1;
    });
    watch([() => orderFilters.search, () => orderFilters.status, () => orderFilters.selectedDate], () => {
      ordersPage.value = 1;
    });
    watch(() => customerFilters.search, () => {
      customersPage.value = 1;
    });
    watch(activeShop, () => {
      productsPage.value = 1;
      ordersPage.value = 1;
      customersPage.value = 1;
    });

    const isProdDisabled = (p) => {
      if (!p) return false;
      return p.available === false || p.available === 'false' || p.available === 0 || p.available === '0';
    };

    const activeLowPerformingProducts = computed(() => {
      const disabledMap = new Set(
        products.value.filter(isProdDisabled).map(p => p._id.toString())
      );
      const disabledNameSet = new Set(
        products.value.filter(isProdDisabled).map(p => p.name.trim().toLowerCase())
      );
      return analyticsData.lowPerformingProducts.filter(p => {
        if (p.productId && disabledMap.has(p.productId.toString())) return false;
        if (p.name && disabledNameSet.has(p.name.trim().toLowerCase())) return false;
        return true;
      });
    });

    const activeTopProducts = computed(() => {
      const disabledMap = new Set(
        products.value.filter(isProdDisabled).map(p => p._id.toString())
      );
      const disabledNameSet = new Set(
        products.value.filter(isProdDisabled).map(p => p.name.trim().toLowerCase())
      );
      return analyticsData.topProducts.filter(p => {
        if (p.productId && disabledMap.has(p.productId.toString())) return false;
        if (p.name && disabledNameSet.has(p.name.trim().toLowerCase())) return false;
        return true;
      });
    });

    const activeTopFavorites = computed(() => {
      const disabledNameSet = new Set(
        products.value.filter(isProdDisabled).map(p => p.name.trim().toLowerCase())
      );
      return analyticsData.topFavorites.filter(fav => {
        if (fav.name && disabledNameSet.has(fav.name.trim().toLowerCase())) return false;
        return true;
      });
    });



    // SVG Line Chart coordinates math calculations
    const trendCoordinates = computed(() => {
      if (!analyticsData.revenueTrend.length) return [];
      
      const maxVal = Math.max(...analyticsData.revenueTrend.map(t => t.revenue), 100);
      const pointsCount = analyticsData.revenueTrend.length;
      
      // Map points onto 600x240 view box:
      // X from 40 to 560
      // Y from 210 to 40
      return analyticsData.revenueTrend.map((t, idx) => {
        const x = 40 + (idx / (pointsCount - 1 || 1)) * 520;
        const y = 210 - (t.revenue / maxVal) * 170;
        return { x, y, date: t.date, val: t.revenue };
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
      return `${lineStr} L ${endX} 210 L ${startX} 210 Z`;
    });

    const trendXLabels = computed(() => {
      const trend = analyticsData.revenueTrend;
      if (trend.length === 0) return [];
      
      // Determine how many labels to display
      const maxLabels = Math.min(trend.length, 5);
      const labels = [];
      const step = Math.floor(trend.length / maxLabels) || 1;
      
      for (let i = 0; i < trend.length; i += step) {
        const x = 40 + (i / (trend.length - 1 || 1)) * 520;
        // Format YYYY-MM-DD to DD/MM
        const rawDate = trend[i].date;
        const dateParts = rawDate.split('-');
        const text = dateParts.length > 2 ? `${dateParts[2]}/${dateParts[1]}` : rawDate;
        labels.push({ x, text });
      }
      return labels;
    });

    // Donut chart math for Bulk vs Regular sales split
    const priceModePercentages = computed(() => {
      const reg = analyticsData.priceModeSplit.regular.revenue;
      const blk = analyticsData.priceModeSplit.bulk.revenue;
      const total = reg + blk;
      if (total === 0) return { regular: 50, bulk: 50 };
      return {
        regular: (reg / total) * 100,
        bulk: (blk / total) * 100
      };
    });

    const donutDashArray = computed(() => {
      // 2 * PI * R where R = 45 => 282.74
      return '282.74';
    });

    const donutDashOffset = computed(() => {
      const regPercent = priceModePercentages.value.regular;
      // dashoffset = circum - (percent * circum)
      return (282.74 - (regPercent / 100) * 282.74).toFixed(2);
    });

    const getCategoryBarWidth = (revenue) => {
      const maxRevenue = Math.max(...analyticsData.categorySales.map(c => c.revenue), 1);
      return Math.max((revenue / maxRevenue) * 100, 4); // Minimal width of 4% for design aesthetics
    };

    onMounted(() => {
      fetchPublicAdminUsers();
      checkAuthentication();
    });

    return {
      formatLibyanWhatsappNumber,
      getLibyanWhatsAppUrl,
      loading,
      isAuthenticated,
      sidebarOpen,
      activeTab,
      activeShop,
      loginShop,
      loginForm,
      loginError,
      publicAdminUsers,
      fetchPublicAdminUsers,
      tabTitles,
      analyticsPeriod,
      analyticsStartDate,
      analyticsEndDate,
      analyticsLoading,
      analyticsFromOpen,
      analyticsToOpen,
      analyticsFromYear,
      analyticsFromMonth,
      analyticsToYear,
      analyticsToMonth,
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
      posDatePickerOpen,
      posPickerYear,
      posPickerMonth,
      posCurrentMonthYearLabel,
      posPrevMonth,
      posNextMonth,
      posCalendarDays,
      selectPosDateFromPicker,
      isPosDateRelative,
      periods,
      analyticsData,
      products,
      categories,
      tags,
      filters,
      availableSubcategories,
      filteredProducts,
      productModalOpen,
      categoryModalOpen,
      tagModalOpen,
      zoomedImageSrc,
      editingProduct,
      subCategoriesForEditing,
      modalFileInput,
      modalFile,
      modalFilePreview,
      modalDragActive,
      removeModalImage,
      editingCategory,
      categorySubcategoriesString,
      editingTag,
      tagColors,
      tagIcons,
      getTagDetails,
      getIconUrl,
      openTagModal,
      saveTag,
      deleteTag,
      toggleProductTag,

      formatCurrency,
      formatArabicPlural,
      handleLogin,
      handleLogout,
      switchShop,
      setTab,
      changePeriod,
      fetchAnalytics,
      exportReport,
      printReport,
      printingOrder,
      printingOrderCustomerBalance,
      printingReconciliation,
      reconciliationData,
      reconDensity,
      printReconciliation,
      printingCustomerDebtReport,
      customerDebtReportData,
      printCustomerDebtReport,
      paginatedOrderPages,
      printOrder,
      toggleProductAvailability,
      deleteProduct,
      openProductModal,
      onProductCategoryChange,
      saveProduct,
      triggerModalImageSelect,
      handleModalImageFileSelect,
      handleModalImageDrop,
      zoomImage,
      svgIconPool,
      selectCategoryIcon,
      openCategoryModal,
      saveCategory,
      deleteCategory,
      trendCoordinates,
      svgTrendLinePath,
      svgTrendAreaPath,
      trendXLabels,
      priceModePercentages,
      donutDashArray,
      donutDashOffset,
      getCategoryBarWidth,
      orders,
      customers,
      orderFilters,
      datePickerOpen,
      pickerYear,
      pickerMonth,
      currentMonthYearLabel,
      calendarDays,
      prevMonth,
      nextMonth,
      selectDateFromPicker,
      formatArabicDate,
      isTodaySelected,
      setOrderTodayDate,
      customerFilters,
      custDateFromOpen,
      custDateToOpen,
      custFromPickerYear,
      custFromPickerMonth,
      custToPickerYear,
      custToPickerMonth,
      custFromMonthYearLabel,
      custToMonthYearLabel,
      custFromPrevMonth,
      custFromNextMonth,
      custToPrevMonth,
      custToNextMonth,
      custFromCalendarDays,
      custToCalendarDays,
      openCustDateFromPicker,
      openCustDateToPicker,
      selectCustDateFrom,
      selectCustDateTo,
      setCustRangeShortcut,
      clearCustDateRange,
      isCustRangeToday,
      isCustRange7d,
      isCustRangeMonth,
      getTodayStr,
      filteredOrders,
      filteredCustomers,
      activeLowPerformingProducts,
      activeTopProducts,
      activeTopFavorites,
      userRole,
      userDisplayName,
      adminUsers,
      userModalOpen,
      editingUser,
      openUserModal,
      saveUser,
      deleteUser,
      chefs,
      productionSubTab,
      chefModalOpen,
      editingChef,
      assignProductsModalOpen,
      selectedChefForAssign,
      selectedProductIdsForChef,
      assignProductSearch,
      filteredProductsForAssign,
      productionReportFilters,
      productionReportData,
      isLoadingReport,
      printingProductionReport,
      openAddChefModal,
      openEditChefModal,
      saveChef,
      deleteChef,
      getChefAssignedProducts,
      openAssignProductsModal,
      toggleProductAssignment,
      selectAllProductsForChef,
      deselectAllProductsForChef,
      saveProductAssignments,
      loadProductionReport,
      setProductionDateShortcut,
      printProductionReport,
      editingCustomer,
      customerModalOpen,
      customerDetailsModalOpen,
      selectedCustomer,
      openCustomerDetails,
      customerFavsModalOpen,
      viewingCustomerFavs,
      viewingCustomer,
      updateOrderStatus,
      orderEditModalOpen,
      editingOrder,
      openOrderEditModal,
      saveOrder,
      newOrderModalOpen,
      newOrderLoading,
      newOrderAutoPrint,
      newOrderCustomerSearch,
      newOrderProductSearch,
      newOrderCategoryFilter,
      showNewOrderCustomerSuggestions,
      showNewOrderProductSuggestions,
      closeNewOrderCustomerSuggestionsWithDelay,
      closeNewOrderProductSuggestionsWithDelay,
      highlightedCustomerIndex,
      highlightedProductIndex,
      newOrderCustomerInputRef,
      newOrderProductInputRef,
      newOrder,
      filteredNewOrderCustomers,
      filteredNewOrderProducts,
      displayedNewOrderProducts,
      posProductDisplayLimit,
      onPosProductsScroll,
      getItemQtyInCart,
      decrementProductInCart,
      toggleProductInNewOrder,
      handleProductSearchKeydown,
      openNewOrderModal,
      focusProductSearch,
      focusFirstCartItem,
      navigateCustomerSuggestions,
      selectHighlightedCustomerOrNext,
      navigateProductSuggestions,
      addHighlightedProductToNewOrder,
      cycleNewOrderCategory,
      selectCustomerForNewOrder,
      clearSelectedCustomerForNewOrder,
      addProductToNewOrder,
      addFirstFilteredProductToNewOrder,
      removeNewOrderItem,
      adjustNewOrderItemQty,
      recalcNewOrderTotal,
      onNewOrderPriceModeChange,
      setNewOrderDateShortcut,
      onNewOrderPaymentStatusChange,
      submitNewOrder,
      productSearchQuery,
      highlightedSuggestionIndex,
      showSuggestions,
      filteredSuggestions,
      navigateSuggestions,
      selectHighlightedSuggestion,
      addSelectedProduct,
      closeSuggestionsWithDelay,
      removeOrderItem,
      openCustomerEditModal,
      deleteCustomer,
      saveCustomerDetails,
      openCustomerFavsModal,
      removeCustomerFavorite,
      carouselItems,
      editingCarouselId,
      carouselModalOpen,
      carouselDragActive,
      carouselFileInput,
      recompressingBanners,
      recompressProgress,
      recompressAllBanners,
      recompressingProducts,
      recompressProductsProgress,
      recompressAllProductImages,
      newCarouselItem,
      openCarouselModal,
      deleteCarouselItem,
      saveCarouselItem,
      triggerCarouselImageSelect,
      handleCarouselImageFileSelect,
      handleCarouselDrop,
      clearCarouselFile,
      cropperModalOpen,
      cropperImageElement,
      cropperImageSrc,
      activeAspectRatio,
      cropperInstance,
      setAspectRatio,
      cropAndSaveImage,
      rotateCropperImage,
      zoomCropperImage,
      resetCropperImage,
      isAdminZoomLoaded,
      closeAdminZoom,
      adminZoomImgRef,
      productsPage,
      productsPerPage,
      paginatedProducts,
      productsTotalPages,
      productsVisiblePages,
      ordersPage,
      ordersPerPage,
      paginatedOrders,
      ordersTotalPages,
      ordersVisiblePages,
      customersPage,
      customersPerPage,
      paginatedCustomers,
      customersTotalPages,
      customersVisiblePages,
      paymentModalOpen,
      paymentHistoryModalOpen,
      paymentLoading,
      paymentTarget,
      paymentFifoPreview,
      paymentRemainingAfter,
      setPaymentMode,
      openPaymentModal,
      recordPayment,
      openPaymentHistory,
      printPaymentReceipt,
      printingPaymentReceipt,
      printingPayment,
    };
  }
};
</script>

<style scoped>
/* SVG Tag Swatches & Live Preview */
.tag-color-swatch-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-swatch-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 10px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
  font-family: 'Cairo', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-swatch-btn .swatch-circle {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #64748b;
}

.color-swatch-btn.tag-rose .swatch-circle { background: #f43f5e; }
.color-swatch-btn.tag-gold .swatch-circle { background: #eab308; }
.color-swatch-btn.tag-fire .swatch-circle { background: #f97316; }
.color-swatch-btn.tag-leaf .swatch-circle { background: #10b981; }
.color-swatch-btn.tag-sky .swatch-circle { background: #06b6d4; }
.color-swatch-btn.tag-royal .swatch-circle { background: #8b5cf6; }

.color-swatch-btn.active {
  border-color: #d97706;
  background: rgba(217, 119, 6, 0.15);
  color: #fbbf24;
  transform: translateY(-1px);
}

.tag-live-preview-container {
  background: rgba(15, 23, 42, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 14px;
}

/* User Modal Popup Select Box Styling ONLY */
.user-form-modal select,
.user-form-select {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  width: 100% !important;
  box-sizing: border-box !important;
  background-color: #1e293b !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: left 14px center !important;
  background-size: 16px 16px !important;
  padding: 10px 14px 10px 38px !important;
  border: 1px solid rgba(255, 255, 255, 0.16) !important;
  border-radius: 12px !important;
  color: #f8fafc !important;
  font-family: 'Cairo', sans-serif !important;
  font-size: 0.92rem !important;
  font-weight: 600 !important;
  outline: none !important;
  direction: rtl !important;
  text-align: right !important;
  cursor: pointer !important;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease !important;
}

.user-form-modal select:focus,
.user-form-select:focus {
  border-color: #d97706 !important;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.25) !important;
  background-color: #0f172a !important;
}

.user-form-modal select option,
.user-form-select option {
  background-color: #0f172a !important;
  color: #f8fafc !important;
  font-family: 'Cairo', sans-serif !important;
  font-size: 0.92rem !important;
  padding: 10px 14px !important;
}

.premium-cropper-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.premium-cropper-content {
  background: #ffffff;
  border-radius: 24px;
  width: 100%;
  max-width: 1000px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.premium-cropper-header {
  padding: 24px 32px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
}

.premium-close-btn {
  background: white;
  border: 1px solid #e2e8f0;
  color: #64748b;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.premium-close-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
  transform: scale(1.05);
}

.premium-cropper-body {
  background: #1e293b;
  display: flex;
  flex-direction: column;
}

.cropper-canvas-container {
  height: 60vh;
  min-height: 400px;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.cropper-toolbar {
  background: rgba(15, 23, 42, 0.95);
  border-top: 1px solid #334155;
  padding: 16px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.toolbar-label {
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 500;
  background: #334155;
  padding: 6px 12px;
  border-radius: 20px;
  letter-spacing: 0.5px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1e293b;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid #334155;
}

.tool-btn {
  background: transparent;
  border: none;
  color: #cbd5e1;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.tool-btn:hover {
  background: #334155;
  color: #ffffff;
}

.tool-divider {
  width: 1px;
  height: 24px;
  background: #334155;
  margin: 0 4px;
}

.premium-cropper-footer {
  padding: 24px 32px;
  background: #ffffff;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  border-top: 1px solid #e2e8f0;
}

.premium-btn-outline {
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  color: #475569;
  border: 1px solid #cbd5e1;
  background: transparent;
  transition: all 0.2s;
}
.premium-btn-outline:hover {
  background: #f8fafc;
  color: #0f172a;
}

.premium-btn-primary {
  padding: 12px 32px;
  border-radius: 12px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  display: flex;
  align-items: center;
  transition: all 0.2s;
}
.premium-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
}

/* Glassmorphism dashboard styles using custom HSL/CSS tokens */
.admin-layout {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at 10% 20%, rgba(246, 248, 252, 0.95) 0%, rgba(230, 237, 246, 0.95) 90%);
  font-family: 'Outfit', 'Inter', 'Cairo', sans-serif;
  direction: rtl;
}

/* Define chart/theme palettes based on selected shop context */
.shop-theme-shop1 {
  --chart-primary: #fdb518;
  --theme-btn-bg: #fdb518;
  --theme-btn-hover: #e09e0a;
  --theme-text-color: #0c0603;
}

.shop-theme-shop2 {
  --chart-primary: #1e3a5f;
  --theme-btn-bg: #1e3a5f;
  --theme-btn-hover: #152943;
  --theme-text-color: #ffffff;
}

/* Spinner Overlay */
.spinner-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e9ecef;
  border-top-color: var(--chart-primary);
  border-radius: 50%;
  animation: spin 1s infinite linear;
}

.spinner-text {
  margin-top: 15px;
  font-size: 1.1rem;
  color: #495057;
  font-weight: 500;
}

/* Login Page styles */
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 20px;
}

.login-card {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.4);
  width: 100%;
  max-width: 450px;
  padding: 40px 30px;
}

.login-select-wrapper {
  position: relative;
  width: 100%;
}

.login-user-select {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%231e3a5f' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: left 14px center;
  padding-left: 38px;
  font-weight: 700;
  color: #1e3a5f;
  border-radius: 12px;
  border: 1.5px solid rgba(30, 58, 95, 0.2);
  transition: all 0.25s ease;
  cursor: pointer;
}

.login-user-select:focus {
  border-color: #1e3a5f;
  box-shadow: 0 0 0 4px rgba(30, 58, 95, 0.12);
  outline: none;
}

.login-user-select option {
  background: #ffffff;
  color: #1e3a5f;
  padding: 10px;
  font-weight: 600;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-logo {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.login-header h2 {
  font-size: 1.5rem;
  color: #1e3a5f;
  margin-bottom: 8px;
  font-weight: 700;
}

.login-header p {
  color: #6c757d;
  font-size: 0.9rem;
}

/* Admin Dashboard layout Grid */
.admin-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 100dvh;
}

/* Sidebar Navigation */
.admin-sidebar {
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(16px);
  border-left: 1px solid rgba(0, 0, 0, 0.06);
  padding: 24px 18px;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  position: sticky;
  top: 0;
  z-index: 100;
  grid-column: 1;
  grid-row: 1;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 26px;
  padding: 4px 6px;
  flex-shrink: 0;
}

.sidebar-logo {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.sidebar-brand h3 {
  font-size: 1.15rem;
  font-weight: 850;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.2px;
  font-family: inherit;
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

.shop-switcher {
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid #e2e8f0;
  padding: 12px;
  border-radius: 14px;
  margin-bottom: 22px;
  flex-shrink: 0;
}

.switch-label {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 700;
  display: block;
  margin-bottom: 8px;
}

.shop-select-pills {
  display: flex;
  gap: 8px;
}

.shop-select-pills.compact .shop-pill {
  flex: 1;
  padding: 7px 10px;
  font-size: 0.82rem;
  min-height: 38px;
}

.shop-pill {
  flex: 1;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  color: #475569;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
}

.shop-pill.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #ffffff;
  box-shadow: 0 3px 10px var(--primary-glow);
}

.sidebar-menu {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-top: 4px;
  padding-bottom: 4px;
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  min-height: 48px;
  border-radius: 12px;
  color: #334155;
  background: transparent;
  border: none;
  border-right: 4px solid transparent;
  cursor: pointer;
  text-align: right;
  font-weight: 700;
  font-size: 0.95rem;
  font-family: inherit;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-item:hover {
  background: rgba(253, 181, 24, 0.08);
  color: var(--primary-color);
  transform: translateX(-3px);
}

.menu-item.active {
  background: linear-gradient(135deg, rgba(253, 181, 24, 0.16) 0%, rgba(253, 181, 24, 0.06) 100%);
  color: var(--primary-color);
  border-right: 4px solid var(--primary-color);
  font-weight: 800;
  box-shadow: 0 4px 12px rgba(253, 181, 24, 0.1);
}

.menu-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  transition: transform 0.2s ease, color 0.2s ease;
}

.menu-item.active .menu-icon {
  color: var(--primary-color);
  transform: scale(1.08);
}

.sidebar-footer {
  margin-top: auto;
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}

/* Mobile header styling */
.admin-mobile-header {
  display: none;
  background: #fff;
  border-bottom: 1px solid #dee2e6;
  padding: 12px 20px;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 99;
}

.admin-mobile-header h2 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e3a5f;
  margin: 0;
}

.menu-toggle-btn {
  background: none;
  border: none;
  color: #1e3a5f;
  cursor: pointer;
}

.mobile-logo {
  width: 35px;
  height: 35px;
  border-radius: 8px;
  object-fit: cover;
}

/* Main Content Area */
.admin-main {
  grid-column: 2;
  grid-row: 1;
  padding: 30px 30px calc(80px + env(safe-area-inset-bottom)) 30px;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100dvh;
  max-width: 100%;
  box-sizing: border-box;
  overscroll-behavior-x: none;
}

.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.main-header h1 {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1e3a5f;
  margin: 0;
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
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
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

/* KPI Cards Layout */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.5);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.05);
}

.kpi-icon-wrapper {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.kpi-icon-wrapper svg {
  width: 24px;
  height: 24px;
}

.sales-icon { background: linear-gradient(135deg, #2ecc71, #27ae60); }
.orders-icon { background: linear-gradient(135deg, #f1c40f, #f39c12); }
.aov-icon { background: linear-gradient(135deg, #9b59b6, #8e44ad); }
.customers-icon { background: linear-gradient(135deg, #3498db, #2980b9); }

.kpi-info {
  display: flex;
  flex-direction: column;
}

.kpi-title {
  font-size: 0.85rem;
  color: #6c757d;
  font-weight: 500;
}

.kpi-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1e3a5f;
}

/* Charts Grid */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px 20px;
  margin-bottom: 30px;
}

.chart-card {
  background: rgba(255, 255, 255, 0.75);
  border-radius: 16px;
  padding: 22px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.chart-card.span-2 {
  grid-column: span 2;
}

.chart-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1e3a5f;
  margin-bottom: 20px;
  border-bottom: 1px solid #f1f3f5;
  padding-bottom: 10px;
}

/* SVG Line Chart Style */
.svg-chart-container {
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.svg-line-chart {
  width: 100%;
  height: 100%;
}

.chart-text {
  font-size: 10px;
  fill: #868e96;
}

.chart-dot-group:hover circle {
  r: 7px;
  stroke-width: 3px;
}

.dot-hover-trigger {
  cursor: pointer;
}

.empty-chart {
  color: #868e96;
  font-size: 0.9rem;
}

/* Donut & Split Display */
.split-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  height: 240px;
}

.donut-display {
  position: relative;
  width: 120px;
  height: 120px;
}

.donut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.donut-percentage {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--chart-primary);
}

.donut-sub {
  font-size: 0.75rem;
  color: #868e96;
}

.split-legend {
  width: 100%;
  font-size: 0.8rem;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.dot-regular { background-color: var(--chart-primary); }
.dot-bulk { background-color: #ced4da; }

.legend-row .label { color: #6c757d; }
.legend-row .val { font-weight: 600; color: #1e3a5f; margin-right: auto; }

/* Category bar gauges */
.bar-chart-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.category-bar-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bar-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.bar-info .cat-name { font-weight: 600; color: #495057; }
.bar-info .cat-val { color: #868e96; }

.bar-gauge {
  height: 8px;
  background: #f1f3f5;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--chart-primary);
  border-radius: 4px;
  transition: width 0.8s cubic-bezier(0.1, 1, 0.1, 1);
}

/* List details */
.list-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.list-badge {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: var(--chart-primary);
  color: var(--theme-text-color);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
}

.list-item-info {
  display: flex;
  flex-direction: column;
}

.list-item-info .title { font-weight: 600; font-size: 0.9rem; color: #495057; }
.list-item-info .subtitle { font-size: 0.75rem; color: #868e96; }

/* Tables Layout inside dashboard */
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
  background: rgba(248, 250, 252, 0.95);
  backdrop-filter: blur(8px);
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

/* Table Row Entrance Fade Animation */
@keyframes rowFadeIn {
  0% {
    opacity: 0;
    transform: translateY(6px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.admin-table tbody tr {
  animation: rowFadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: opacity, transform;
  transition: background-color 0.15s ease;
}

.admin-table tbody tr:nth-child(1) { animation-delay: 0.02s; }
.admin-table tbody tr:nth-child(2) { animation-delay: 0.04s; }
.admin-table tbody tr:nth-child(3) { animation-delay: 0.06s; }
.admin-table tbody tr:nth-child(4) { animation-delay: 0.08s; }
.admin-table tbody tr:nth-child(5) { animation-delay: 0.10s; }
.admin-table tbody tr:nth-child(6) { animation-delay: 0.12s; }
.admin-table tbody tr:nth-child(7) { animation-delay: 0.14s; }
.admin-table tbody tr:nth-child(8) { animation-delay: 0.16s; }
.admin-table tbody tr:nth-child(9) { animation-delay: 0.18s; }
.admin-table tbody tr:nth-child(10) { animation-delay: 0.20s; }
.admin-table tbody tr:nth-child(11) { animation-delay: 0.22s; }
.admin-table tbody tr:nth-child(12) { animation-delay: 0.24s; }
.admin-table tbody tr:nth-child(13) { animation-delay: 0.26s; }
.admin-table tbody tr:nth-child(14) { animation-delay: 0.28s; }
.admin-table tbody tr:nth-child(15) { animation-delay: 0.30s; }
.admin-table tbody tr:nth-child(n+16) { animation-delay: 0.32s; }

.admin-table tbody tr:nth-child(even) {
  background-color: rgba(248, 250, 252, 0.4);
}

.admin-table tbody tr:hover {
  background-color: rgba(253, 181, 24, 0.06);
}

/* Category SVG Icon Badges in Table & Modal */
.cat-icon-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--primary-glow);
  color: var(--primary-color);
  border: 1px solid rgba(253, 181, 24, 0.25);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.admin-table tbody tr:hover .cat-icon-badge {
  transform: scale(1.1);
  background: var(--primary-color);
  color: #ffffff;
  box-shadow: 0 4px 12px var(--primary-glow);
}

.category-icon-input-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-icon-preview-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.category-icon-input-group .icon-preview-box {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--primary-glow);
  color: var(--primary-color);
  border: 1px solid rgba(253, 181, 24, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* SVG Icon Pool Grid in Category Modal */
.svg-icon-pool-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-height: 170px;
  overflow-y: auto;
  padding: 8px;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  scrollbar-width: thin;
}

.svg-pool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 4px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  cursor: pointer;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: inherit;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.svg-pool-item:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--primary-glow);
  transform: translateY(-2px);
}

.svg-pool-item.active {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: #ffffff;
  box-shadow: 0 3px 10px var(--primary-glow);
}

.svg-pool-item.active .cat-svg-icon-wrapper {
  color: #ffffff;
}

.pool-item-label {
  font-size: 0.72rem;
  line-height: 1;
}

.text-bold {
  font-weight: 700;
}

.text-mono, .customer-info-cell .phone, .order-date, .kpi-value {
  font-family: 'Fira Code', 'Courier New', monospace !important;
  letter-spacing: -0.3px;
}

.text-semibold { font-weight: 600; }
.text-center { text-align: center; }

/* Filters actions bar */
.filter-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 15px 20px;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 12px;
  flex-wrap: wrap;
}

.filters-group {
  display: flex;
  gap: 12px;
  flex: 1 1 300px;
  flex-wrap: wrap;
}

.filters-group .form-control {
  flex: 1 1 180px;
}

.filter-actions-bar .btn {
  flex: 0 0 auto;
  white-space: nowrap;
}

.form-control {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #ced4da;
  border-radius: 8px;
  color: #495057;
  font-weight: 500;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s ease;
  text-align: right;
}

/* Option 1: Split-Level Pill Bar Toolbar Styles */
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

.card-toolbar-split {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 24px;
  background: rgba(255, 255, 255, 0.65);
  border-bottom: 1px solid rgba(44, 37, 32, 0.08);
  backdrop-filter: blur(12px);
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  position: relative;
  z-index: 100;
}

.card-toolbar-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-title {
  font-size: 1.3rem;
  font-weight: 850;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.2px;
}

.toolbar-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 20px;
  background: var(--primary-glow);
  color: var(--primary-color);
  font-size: 0.85rem;
  font-weight: 800;
}

.card-toolbar-bottom {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.orders-toolbar-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.orders-search-print-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.orders-search-print-row .search-input-wrapper {
  flex: 1 1 240px;
  min-width: 200px;
}

.orders-search-print-row .reconciliation-print-btn {
  height: 38px !important;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.orders-filters-row {
  display: flex;
  align-items: center;
  width: 100%;
}

.order-status-select {
  height: 40px !important;
  min-width: 185px !important;
}

.search-input-wrapper {
  position: relative;
  flex: 1 1 240px;
  min-width: 200px;
  height: 40px;
  display: flex;
  align-items: center;
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

.filters-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
  position: relative;
  z-index: 100;
}

.select-pill {
  background: #ffffff;
  border: 1.5px solid #cbd5e1 !important;
  border-radius: 10px;
  padding: 0 14px;
  height: 40px !important;
  font-size: 0.88rem;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
}

select,
select.form-control,
select.select-pill {
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

.select-pill:focus,
select:focus,
select.form-control:focus {
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.12) !important;
  outline: none !important;
}

/* Custom Date Filter Component & Popover Panel */
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
  gap: 8px;
  padding: 8px 14px;
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
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-datepicker-trigger:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--primary-glow);
}

.btn-datepicker-trigger.active {
  border-color: var(--primary-color);
  background: var(--primary-glow);
  color: var(--primary-color);
  box-shadow: 0 2px 8px var(--primary-glow);
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
  will-change: transform, opacity;
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
  transition: all 0.15s ease;
}

.btn-remove-date:hover {
  background: #ef4444;
  color: #ffffff;
}

/* DatePicker Popover Panel */
.datepicker-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 1200;
  width: 280px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(44, 37, 32, 0.1);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.15);
}

.datepicker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.dp-month-title {
  font-weight: 850;
  font-size: 0.95rem;
  color: #0f172a;
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
  transition: all 0.15s ease;
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
  font-family: 'Fira Code', 'Courier New', monospace, inherit;
  transition: all 0.15s ease;
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
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
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
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
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
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
  letter-spacing: 0.2px;
}

.btn-group-row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: nowrap;
}

.w-100 {
  width: 100% !important;
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

.btn-danger {
  background: #dc2626;
  color: #fff;
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.08);
}

.btn-danger:hover {
  background: #b91c1c;
  box-shadow: 0 4px 8px rgba(220, 38, 38, 0.15);
}

.btn-sm {
  padding: 8px 14px;
  font-size: 0.85rem;
}

.table-prod-img {
  width: 108px;
  height: 108px;
  border-radius: 16px;
  object-fit: cover;
  cursor: zoom-in;
  border: 2px solid #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease;
}

.table-prod-img:hover {
  transform: scale(1.15);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.badge-sub {
  background: #e3faf2;
  color: #0ca678;
  font-size: 0.75rem;
  padding: 1px 6px;
  border-radius: 4px;
  margin-right: 6px;
}

.chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sub-chip {
  background: rgba(0, 0, 0, 0.04);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #495057;
  font-weight: 500;
}

/* Modals overlays styling */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.45) !important;
  backdrop-filter: blur(6px) !important;
  -webkit-backdrop-filter: blur(6px) !important;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-box,
.modal-content {
  background: #ffffff !important;
  color: #0f172a !important;
  font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 18px !important;
  width: 100%;
  max-width: 550px;
  max-height: 90vh;
  padding: 24px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.15) !important;
  overflow-y: auto;
  position: relative;
  z-index: 1001;
  display: flex;
  flex-direction: column;
}

.modal-box.max-w-md,
.modal-content.modal-md {
  max-width: 500px;
}

.modal-box.max-w-lg,
.modal-content.modal-lg,
.modal-box.max-w-2xl {
  max-width: 720px;
}

.modal-box.max-w-4xl {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  border-bottom: 1px solid #f1f3f5 !important;
  padding-bottom: 14px;
}

.modal-header h3,
.modal-title {
  font-family: 'Cairo', sans-serif !important;
  font-size: 1.22rem;
  font-weight: 800;
  color: #0f172a !important;
  margin: 0;
  line-height: 1.45;
}

.modal-subtitle {
  display: block;
  font-family: 'Cairo', sans-serif !important;
  font-size: 0.86rem;
  color: #64748b !important;
  margin-top: 4px;
  font-weight: 500;
  line-height: 1.45;
}

.modal-close-btn {
  background: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  cursor: pointer;
  color: #64748b !important;
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  background: #fef2f2 !important;
  color: #ef4444 !important;
  border-color: #fca5a5 !important;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 15px;
}

.form-group label {
  font-family: 'Cairo', sans-serif !important;
  font-size: 0.86rem;
  font-weight: 700;
  color: #1e293b;
  text-align: right;
  line-height: 1.45;
}

/* Modal Form Labels & Inputs Clean Light Theme */
.modal-box .form-group label,
.modal-content .form-group label,
.modal-box label,
.modal-content label,
.modal-box .form-label,
.modal-content .form-label {
  font-family: 'Cairo', sans-serif !important;
  font-size: 0.88rem !important;
  font-weight: 700 !important;
  color: #1e293b !important;
  text-align: right !important;
  margin-bottom: 6px !important;
  line-height: 1.45 !important;
}

.modal-box .form-control,
.modal-content .form-control {
  background: #ffffff !important;
  border: 1.5px solid #cbd5e1 !important;
  color: #0f172a !important;
  border-radius: 10px !important;
  padding: 10px 14px !important;
  font-size: 0.92rem !important;
  font-family: 'Cairo', sans-serif !important;
  line-height: 1.45 !important;
}

.modal-box .search-input-wrapper .form-control,
.modal-content .search-input-wrapper .form-control,
.modal-box .search-input-wrapper .search-input,
.modal-content .search-input-wrapper .search-input {
  padding-right: 44px !important;
  padding-left: 38px !important;
}

.modal-box .form-control::placeholder,
.modal-content .form-control::placeholder {
  color: #94a3b8 !important;
  font-family: 'Cairo', sans-serif !important;
}

.modal-box .form-control:focus,
.modal-content .form-control:focus {
  background: #ffffff !important;
  border-color: var(--primary-color, #1e3a5f) !important;
  box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.12) !important;
  outline: none !important;
}

.modal-box select.form-control,
.modal-content select.form-control,
.modal-box select,
.modal-content select {
  color: #0f172a !important;
  background-color: #ffffff !important;
  padding-left: 40px !important;
  padding-right: 14px !important;
  font-family: 'Cairo', sans-serif !important;
}

.modal-box select.form-control option,
.modal-content select.form-control option {
  background-color: #ffffff !important;
  color: #0f172a !important;
  padding: 10px 14px !important;
  font-family: 'Cairo', sans-serif !important;
}

/* Modal Footer & Buttons Placement Fixes (RTL Order) */
.modal-box .modal-footer,
.modal-content .modal-footer {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 12px !important;
  margin-top: 24px !important;
  padding-top: 16px !important;
  border-top: 1px solid #f1f3f5 !important;
}

.modal-box .btn-modal-save,
.modal-content .btn-modal-save,
.modal-box .btn-primary,
.modal-content .btn-primary {
  background: linear-gradient(135deg, var(--primary-color, #1e3a5f), #0f172a) !important;
  color: #ffffff !important;
  border: none !important;
  font-family: 'Cairo', sans-serif !important;
  font-weight: 700 !important;
  padding: 10px 22px !important;
  border-radius: 10px !important;
  cursor: pointer !important;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2) !important;
  transition: all 0.2s ease !important;
}

.modal-box .btn-modal-save:hover,
.modal-content .btn-modal-save:hover,
.modal-box .btn-primary:hover,
.modal-content .btn-primary:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.3) !important;
}

.modal-box .btn-modal-cancel,
.modal-content .btn-modal-cancel,
.modal-box .btn-outline,
.modal-content .btn-outline {
  background: #ffffff !important;
  color: #374151 !important;
  border: 1.5px solid #cbd5e1 !important;
  font-family: 'Cairo', sans-serif !important;
  font-weight: 600 !important;
  padding: 10px 18px !important;
  border-radius: 10px !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}

.modal-box .btn-modal-cancel:hover,
.modal-content .btn-modal-cancel:hover,
.modal-box .btn-outline:hover,
.modal-content .btn-outline:hover {
  background: #f8fafc !important;
  color: #0f172a !important;
  border-color: #94a3b8 !important;
}

.form-group-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.purchase-type-radios {
  display: flex;
  gap: 15px;
  padding: 8px 0;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  cursor: pointer;
}

.checkbox-group {
  flex-direction: row !important;
  align-items: center;
  gap: 8px !important;
  cursor: pointer;
}

/* Polished Product Form Modal & Dropzone Styling */
.product-form-modal {
  max-height: 90vh;
  overflow-y: auto;
  scrollbar-width: thin;
}

.modal-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-title-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--primary-glow);
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-upload-dropzone {
  border: 2px dashed #cbd5e1;
  border-radius: 14px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  background: #f8fafc;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-upload-dropzone:hover,
.image-upload-dropzone.is-dragging {
  border-color: var(--primary-color);
  background: var(--primary-glow);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
}

.image-upload-dropzone.has-preview {
  padding: 0;
  border-style: solid;
  border-color: #e2e8f0;
  background: #0f172a;
}

.image-preview-container {
  position: relative;
  width: 100%;
  height: 160px;
  overflow: hidden;
  border-radius: 12px;
}

.upload-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.image-preview-container:hover .upload-preview-img {
  transform: scale(1.04);
}

.image-preview-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.image-preview-container:hover .image-preview-overlay {
  opacity: 1;
}

.preview-change-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #ffffff;
  color: #0f172a;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.preview-remove-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #ef4444;
  color: #ffffff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.preview-remove-btn:hover {
  transform: scale(1.1);
  background: #dc2626;
}

.dropzone-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.dropzone-icon {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: rgba(241, 245, 249, 0.8);
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropzone-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
}

.dropzone-sub {
  font-size: 0.75rem;
  color: #64748b;
}

/* Polished Radio Label Pills */
.purchase-type-radios {
  display: flex;
  gap: 10px;
  padding: 4px 0;
}

.radio-label {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}

.radio-label:hover {
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.radio-label.active {
  background: rgba(var(--primary-color-rgb), 0.1);
  border-color: var(--primary-color);
  color: var(--primary-color);
  font-weight: 700;
}

.cloud-icon {
  width: 32px;
  height: 32px;
  color: #adb5bd;
  margin-bottom: 8px;
}

.dropzone-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.8rem;
  color: #868e96;
}

.dropzone-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.dropzone-preview img {
  max-height: 80px;
  object-fit: contain;
  border-radius: 6px;
}

.file-name {
  font-size: 0.75rem;
  color: #495057;
  font-weight: 500;
}

.hidden-file-input {
  display: none;
}



/* Zoom screen view */
.zoom-overlay {
  background: rgba(0, 0, 0, 0.85);
  cursor: zoom-out;
}

.zoom-box img {
  max-width: 90vw;
  max-height: 90vh;
  border-radius: 12px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
}

/* Toggle Switch check input */
.toggle-switch {
  position: relative;
  width: 50px;
  height: 26px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #dee2e6;
  transition: .3s;
  border-radius: 34px;
}

.toggle-switch label:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
}

.toggle-switch input:checked + label {
  background-color: #2ecc71;
}

.toggle-switch input:checked + label:before {
  transform: translateX(24px);
}

/* Animations */
.animate-fade-in {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive breakdowns */
@media (max-width: 1024px) {
  .charts-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .chart-card.span-2 {
    grid-column: span 2;
  }
  .main-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
    margin-bottom: 20px;
  }
  .analytics-header-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 12px;
  }
}

@media (max-width: 768px) {
  html, body, .admin-layout, .admin-container {
    max-width: 100vw !important;
    overflow-x: hidden !important;
    overscroll-behavior-x: none !important;
  }

  .admin-container {
    grid-template-columns: 1fr;
    max-width: 100vw !important;
    overflow-x: hidden !important;
  }

  .admin-main {
    grid-column: 1;
    grid-row: auto;
    padding: 16px 12px calc(150px + env(safe-area-inset-bottom)) 12px !important;
    overflow-x: hidden !important;
    max-width: 100vw !important;
    overscroll-behavior-x: none !important;
  }

  .products-tab-content,
  .orders-tab-content,
  .customers-tab-content,
  .categories-tab-content,
  .tags-tab-content,
  .carousel-tab-content,
  .users-tab-content,
  .analytics-tab-content {
    padding-bottom: calc(100px + env(safe-area-inset-bottom)) !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
    box-sizing: border-box !important;
  }

  .table-card {
    max-width: 100% !important;
    overflow-x: hidden !important;
  }

  .table-container {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: auto !important;
    overscroll-behavior-x: contain !important;
    -webkit-overflow-scrolling: touch !important;
  }

  .admin-sidebar {
    position: fixed;
    top: 60px;
    right: 0;
    width: 280px;
    height: calc(100dvh - 60px);
    transform: translateX(100%);
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.12);
    z-index: 1000;
  }

  .admin-sidebar.open {
    transform: translateX(0);
  }

  .sidebar-backdrop {
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(4px);
    z-index: 999;
    animation: fadeIn 0.2s ease;
  }

  .admin-mobile-header {
    display: flex;
  }

  .admin-main {
    padding: 20px;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .chart-card.span-2 {
    grid-column: span 1;
  }

  .filter-actions-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filters-group {
    flex-direction: column;
  }
}

/* Orders & Customers Tab Specific Styles */
.price-mode-badge {
  display: inline-block;
  padding: 4px 8px;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 6px;
}
.price-mode-badge.regular {
  background: #e7f5ff;
  color: #228be6;
}
.price-mode-badge.bulk {
  background: #fff4e6;
  color: #fd7e14;
}

.order-id-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #1e293b;
  font-weight: 800;
  font-size: 0.86rem;
  font-family: inherit;
  letter-spacing: 0.3px;
}

.status-select {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: left 10px center !important;
  background-size: 13px 13px !important;
  padding-left: 34px !important;
  padding-right: 14px !important;
  height: 38px !important;
  min-width: 155px;
  font-size: 0.86rem;
  border-radius: 8px;
  cursor: pointer;
  outline: none;
  font-weight: 800;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  font-family: inherit;
  direction: rtl;
  text-align: right;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.status-select.status-pending {
  background-color: rgba(253, 181, 24, 0.15);
  color: #b45309;
  border: 1px solid rgba(253, 181, 24, 0.4);
}
.status-select.status-ready {
  background-color: rgba(59, 130, 246, 0.14);
  color: #1d4ed8;
  border: 1px solid rgba(59, 130, 246, 0.35);
}
.status-select.status-received,
.status-select.status-completed {
  background-color: rgba(34, 197, 94, 0.14);
  color: #15803d;
  border: 1px solid rgba(34, 197, 94, 0.35);
}
.status-select.status-cancelled {
  background-color: rgba(239, 68, 68, 0.14);
  color: #b91c1c;
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.order-actions-btns {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-table-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 34px;
  border-radius: 8px;
  font-size: 0.84rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #334155;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  touch-action: manipulation;
  white-space: nowrap;
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

.btn-action-print:hover {
  border-color: #0284c7;
  color: #0284c7;
  background: rgba(2, 132, 199, 0.08);
}

.customer-info-cell .block {
  display: block;
}
.customer-info-cell .phone {
  font-size: 0.8rem;
  margin-top: 2px;
}

.items-list-cell {
  max-width: 300px;
}
.item-line {
  font-size: 0.85rem;
  margin-bottom: 3px;
  color: #334155;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
.item-qty-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  background: #f1f5f9;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
}
.item-note {
  font-size: 0.75rem;
  color: #64748b;
  font-style: italic;
}

.btn-xs {
  padding: 4px 8px;
  font-size: 0.75rem;
  border-radius: 6px;
}
.ml-1 {
  margin-left: 4px;
}

/* Order Edit Modal Styles */
.order-items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}
.section-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #1e3a5f;
}
.product-search-autocomplete-container {
  position: relative;
  flex: 1;
  max-width: 480px;
}
.product-search-input {
  height: 40px;
  font-size: 0.9rem;
  border-radius: 8px;
  padding: 8px 16px;
  border: 1px solid #ced4da;
  width: 100%;
}
.autocomplete-suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #ced4da;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  z-index: 100;
  max-height: 280px;
  overflow-y: auto;
  margin-top: 4px;
}
.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #f1f3f5;
}
.suggestion-item:last-child {
  border-bottom: none;
}
.suggestion-item:hover, .suggestion-item.highlighted {
  background: #e7f5ff;
}
.suggestion-img {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid #dee2e6;
}
.suggestion-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  text-align: right;
}
.suggestion-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: #212529;
}
.suggestion-category {
  font-size: 0.7rem;
  color: #868e96;
}
.suggestion-price {
  font-weight: 700;
  color: #228be6;
  font-size: 0.85rem;
  margin-right: auto;
}
.suggestion-no-results {
  padding: 12px;
  text-align: center;
  color: #868e96;
  font-size: 0.85rem;
}
.edit-order-table-container {
  max-height: 380px;
  overflow-y: auto;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  background: #ffffff;
  margin-bottom: 20px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
}
.edit-order-table {
  width: 100%;
  border-collapse: collapse;
}
.edit-order-table th {
  background-color: #f8f9fa;
  color: #495057;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 12px 16px;
  text-align: right;
  border-bottom: 2px solid #dee2e6;
  position: sticky;
  top: 0;
  z-index: 10;
}
.edit-order-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
  vertical-align: middle;
  font-size: 0.9rem;
}
.edit-item-name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.db-product-name {
  display: inline-block;
  padding: 4px 8px;
  background-color: #e7f5ff;
  color: #1c7ed6;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  border: 1px solid #a5d8ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 250px;
}
.edit-custom-name-input {
  max-width: 250px;
  height: 36px;
  padding: 6px 12px;
  font-size: 0.85rem;
  border-radius: 8px;
}
.edit-qty-input-wrapper, .edit-price-input-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}
.edit-qty-input {
  max-width: 90px;
  height: 36px;
  text-align: center;
  padding: 6px;
  font-size: 0.9rem;
  border-radius: 8px;
}
.edit-price-input {
  max-width: 100px;
  height: 36px;
  text-align: center;
  padding: 6px;
  font-size: 0.9rem;
  border-radius: 8px;
}
.currency-label {
  font-size: 0.8rem;
  color: #868e96;
}
.btn-remove-item {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 !important;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}
.btn-remove-item:hover {
  transform: scale(1.1);
}
.order-item-static-note {
  font-size: 0.75rem;
  color: #e03131;
  font-style: italic;
  margin-top: 4px;
}
.order-notes-static-display {
  background: #fff9db;
  border: 1px solid #ffe066;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.85rem;
  color: #f08c00;
}
.order-total-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(30, 58, 95, 0.06);
  border-radius: 10px;
  font-size: 1.05rem;
  border: 1px solid rgba(30, 58, 95, 0.15);
  color: #1e3a5f;
  font-weight: 700;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
}

.btn-modal-save {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 10px;
  font-weight: 800;
  font-size: 0.92rem;
  background: linear-gradient(135deg, var(--primary-color), #e5a00d);
  color: #ffffff;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px var(--primary-glow);
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-modal-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px var(--primary-glow);
}

.btn-modal-cancel {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.92rem;
  background: #ffffff;
  color: #64748b;
  border: 1px solid #cbd5e1;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-modal-cancel:hover {
  background: #f8fafc;
  color: #334155;
  border-color: #94a3b8;
}
.btn-danger {
  background: #fa5252;
  color: #fff;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-danger:hover {
  background: #e03131;
}
.btn-danger:disabled {
  background: #dee2e6;
  cursor: not-allowed;
}
@media (max-width: 640px) {
  .edit-order-table th, .edit-order-table td {
    padding: 8px 10px;
  }
  .product-search-autocomplete-container {
    max-width: 100%;
  }
}

/* Favorites Grid Browser in Modal */
.fav-grid-brows {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
  padding: 8px 4px;
}

.fav-grid-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e9ecef;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.fav-grid-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
}

.fav-card-image-wrapper {
  width: 100%;
  padding-top: 75%;
  position: relative;
  background: #f8f9fa;
}

.fav-card-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-bottom: 1px solid #f1f3f5;
}

.fav-card-info {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: right;
}

.fav-card-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: #343a40;
}

.fav-card-cat {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.fav-card-prices {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.price-pill {
  display: inline-flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
}

.price-pill.regular {
  background: #e7f5ff;
  color: #228be6;
}

.price-pill.bulk {
  background: #fff4e6;
  color: #fd7e14;
}

.price-lbl {
  font-size: 0.75rem;
  opacity: 0.8;
}

.price-val {
  font-weight: 700;
}

/* Analytics Header Actions */
.analytics-header-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  flex: 1;
}

.report-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.dropdown-export {
  position: relative;
  display: inline-block;
}

.dropdown-content {
  display: none;
  position: absolute;
  left: 0;
  top: 100%;
  background-color: #ffffff;
  min-width: 140px;
  box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.1);
  z-index: 100;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e9ecef;
}

.dropdown-content a {
  color: #212529;
  padding: 10px 14px;
  text-decoration: none;
  display: block;
  font-size: 0.85rem;
  text-align: right;
  transition: background-color 0.2s;
}

.dropdown-content a:hover {
  background-color: #f8f9fa;
}

.dropdown-export:hover .dropdown-content {
  display: block;
}

/* Screen: hide print-only wrappers */
.print-receipt-wrapper,
.print-reconciliation-wrapper {
  display: none;
}

/* Custom Date Range Bar */
.date-range-bar {
  margin-bottom: 20px;
}

.date-range-inner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 6px 10px;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.date-field {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-field-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #6c757d;
  white-space: nowrap;
}

.date-field-input {
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 0.85rem;
  font-family: inherit;
  color: #212529;
  background: #fff;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.date-field-input:focus {
  border-color: var(--primary-color, #1e3a5f);
  box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.1);
}

.date-range-sep {
  font-size: 0.9rem;
  color: #adb5bd;
  padding: 0 2px;
  user-select: none;
}

.date-apply-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--primary-color, #1e3a5f);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
  white-space: nowrap;
}

.date-apply-btn:hover:not(:disabled) {
  opacity: 0.88;
  transform: translateY(-1px);
}

.date-apply-btn:active:not(:disabled) {
  transform: translateY(0);
  opacity: 1;
}

.date-apply-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.date-reset-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 8px;
  width: 30px;
  height: 30px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.date-reset-btn:hover:not(:disabled) {
  background: #ef4444;
  color: #fff;
  transform: scale(1.05);
}

.date-reset-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-spinner {
  animation: admin-spin 0.75s linear infinite;
}

@keyframes admin-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.customer-toolbar-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
}

.customer-date-filter {
  flex-shrink: 0;
  box-shadow: none;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #fff;
}

/* Reconciliation print button styling */
.reconciliation-print-btn {
  gap: 6px;
  border-color: rgba(30, 58, 95, 0.2);
  color: #1e3a5f;
  font-weight: 600;
  transition: all 0.2s ease;
}

.reconciliation-print-btn:hover {
  background: rgba(30, 58, 95, 0.08);
  border-color: rgba(30, 58, 95, 0.35);
}

@media print {
  /* Hide all dashboard layout, modal pop-ups, backdrops, and web view elements */
  .admin-layout,
  .modal-overlay,
  .modal-box,
  .modal-content,
  .admin-header,
  .admin-sidebar,
  .toast-container {
    display: none !important;
  }

  /* Suppress browser print headers & footers (URL link in bottom-left corner, page numbers, date) */
  @page {
    size: A5 portrait;
    margin: 0 !important;
  }

  /* Named page for reconciliation — A4 portrait layout without browser headers/footers */
  @page reconciliation {
    size: A4 portrait;
    margin: 0 !important;
  }

  /* Suppress link URL text insertion when printing */
  a[href]:after {
    content: none !important;
  }
  a[href] {
    text-decoration: none !important;
    color: inherit !important;
  }

  .reconciliation-page {
    page: reconciliation;
    padding: 8mm 10mm;
    box-sizing: border-box;
  }

  /* Order Receipt Print Styles (A5) */
  .print-receipt-wrapper, .print-receipt-wrapper * {
    visibility: visible;
  }

  .print-receipt-wrapper {
    display: block !important;
    position: relative;
    width: 100%;
    padding: 0;
    margin: 0;
    background: transparent;
  }

  .print-receipt {
    display: block !important;
    width: 100%;
    box-sizing: border-box;
    padding: 5mm 7mm;
    margin: 0;
    background: #ffffff !important;
    color: #111111 !important;
    font-family: 'Cairo', 'Fira Code', sans-serif;
    direction: rtl;
    font-size: 11pt;
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .print-receipt:last-child {
    page-break-after: avoid;
    break-after: avoid;
  }

  .receipt-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .receipt-logo {
    width: 48px;
    height: 48px;
    object-fit: cover;
    border-radius: 8px;
  }

  .receipt-shop-name {
    font-size: 14pt;
    font-weight: 800;
    margin: 0;
    color: #0f172a;
  }

  .receipt-tagline {
    font-size: 8pt;
    color: #64748b;
    margin: 0;
  }

  .receipt-divider {
    border-bottom: 1px dashed #cbd5e1;
    margin: 8px 0;
  }

  .receipt-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 12px;
    font-size: 9.5pt;
  }

  .receipt-meta-row {
    display: flex;
    justify-content: space-between;
  }

  .receipt-label {
    color: #64748b;
    font-weight: 600;
  }

  .receipt-value {
    font-weight: 700;
    color: #0f172a;
  }

  .receipt-phone {
    font-family: 'Fira Code', monospace;
  }

  .receipt-items-table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 9.5pt;
  }

  .receipt-items-table th {
    background: #f8fafc;
    padding: 4px 6px;
    text-align: right;
    border-bottom: 1.5px solid #cbd5e1;
    font-weight: 700;
    font-size: 9pt;
  }

  .receipt-items-table td {
    padding: 2.5px 6px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
  }

  .receipt-td-qty, .receipt-td-price, .receipt-td-total {
    font-family: 'Fira Code', monospace;
    text-align: center;
  }

  .receipt-td-total {
    text-align: left;
    font-weight: 700;
  }

  .receipt-item-note {
    display: block;
    font-size: 8pt;
    color: #64748b;
  }

  .receipt-total-section {
    margin-top: 6px;
  }

  .receipt-grand-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8fafc;
    padding: 8px 12px;
    border-radius: 6px;
    font-weight: 800;
    font-size: 12pt;
    border: 1px solid #e2e8f0;
  }

  .receipt-grand-value {
    font-family: 'Fira Code', monospace;
    color: #0f172a;
  }

  .receipt-customer-balance-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 12px;
    margin-top: 4px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    font-weight: 700;
    font-size: 10.5pt;
    color: #991b1b;
  }

  .receipt-balance-value {
    font-family: 'Fira Code', monospace;
    font-weight: 800;
    color: #dc2626;
  }

  .receipt-notes {
    margin-top: 6px;
    padding: 6px 8px;
    background: #fffbeb;
    border-radius: 4px;
    font-size: 8.5pt;
  }

  .receipt-footer {
    text-align: center;
    margin-top: 6px;
    margin-bottom: 5px;
    padding-top: 6px;
    border-top: 1px dashed #cbd5e1;
    font-size: 9pt;
    font-weight: 700;
  }

  .receipt-page-num {
    font-size: 8pt;
    color: #64748b;
    margin-bottom: 2px;
  }

  .receipt-footer-sub {
    font-size: 7.5pt;
    color: #64748b;
    font-weight: 400;
    margin-top: 2px;
  }

  /* === Sales Reconciliation Report Print Styles (Compact & Zero-Gap A4) === */
  .print-reconciliation-wrapper, .print-reconciliation-wrapper * {
    visibility: visible;
  }

  .print-reconciliation-wrapper {
    display: block !important;
    position: relative;
    width: 100%;
    padding: 0;
    margin: 0;
    background: transparent;
  }

  .reconciliation-page {
    display: block !important;
    width: 100%;
    max-width: 210mm;
    padding: 6mm 8mm;
    box-sizing: border-box;
    margin: 0 auto;
    background: #ffffff !important;
    color: #000000 !important;
    font-family: 'Cairo', 'Fira Code', sans-serif;
    direction: rtl;
    font-size: 8.5pt;
    line-height: 1.3;
  }

  .recon-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 4px;
    margin-bottom: 4px;
  }

  .recon-brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .recon-logo {
    width: 36px;
    height: 36px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid #000000;
  }

  .recon-brand-text {
    display: flex;
    flex-direction: column;
  }

  .recon-shop-name {
    font-size: 13pt;
    font-weight: 800;
    margin: 0;
    color: #000000 !important;
    line-height: 1.1;
  }

  .recon-subtitle {
    font-size: 8pt;
    font-weight: 700;
    color: #333333 !important;
    margin: 1px 0 0 0;
  }

  .recon-header-badge {
    background: #ffffff;
    color: #000000 !important;
    border: 1.5px solid #000000;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 8pt;
    font-weight: 800;
  }

  .recon-divider {
    border-bottom: 1.5px solid #000000;
    margin: 3px 0 5px 0;
  }

  .recon-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 12px;
    background: #ffffff;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #000000;
    font-size: 8pt;
    margin-bottom: 4px;
  }

  .recon-meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .recon-label {
    color: #333333 !important;
    font-weight: 700;
  }

  .recon-value {
    font-weight: 800;
    color: #000000 !important;
  }

  .recon-date-pill {
    background: #f2f2f2;
    padding: 1px 6px;
    border-radius: 3px;
    border: 1px solid #000000;
  }

  .recon-kpi-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin: 4px 0 6px 0;
  }

  .recon-kpi-card {
    text-align: center;
    padding: 4px 6px;
    border: 1.5px solid #000000 !important;
    border-radius: 6px;
    background: #ffffff !important;
  }

  .recon-kpi-card.highlight {
    background: #f2f2f2 !important;
    border-color: #000000 !important;
  }

  .recon-kpi-label {
    display: block;
    font-size: 7.5pt;
    color: #333333 !important;
    font-weight: 700;
    margin-bottom: 1px;
  }

  .recon-kpi-value {
    display: block;
    font-size: 11pt;
    font-weight: 800;
    color: #000000 !important;
    line-height: 1.1;
  }

  .recon-kpi-money {
    font-family: 'Fira Code', monospace;
    font-weight: 800;
  }

  .recon-section {
    margin: 4px 0 0 0;
    page-break-inside: auto !important;
    break-inside: auto !important;
  }

  .recon-section-header {
    background: #000000 !important;
    color: #ffffff !important;
    padding: 4px 10px;
    border-radius: 4px 4px 0 0;
    margin-bottom: 0;
  }

  .recon-section-title {
    font-size: 8.5pt;
    font-weight: 800;
    margin: 0;
    color: #ffffff !important;
  }

  /* Level 1: Main Category Block (Seamless Continuous Flow) */
  .recon-cat-block {
    margin-top: 4px;
    margin-bottom: 4px;
    border: 1px solid #000000 !important;
    border-radius: 4px;
    background: #ffffff !important;
    page-break-inside: auto !important;
    break-inside: auto !important;
  }

  .recon-cat-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    background: #e6e6e6 !important;
    color: #000000 !important;
    padding: 3px 8px;
    border-bottom: 1px solid #000000;
    page-break-after: avoid;
    break-after: avoid;
  }

  .recon-cat-title {
    font-weight: 800;
    font-size: 9pt;
    color: #000000 !important;
  }

  .recon-cat-stats {
    font-size: 7.5pt;
    color: #222222 !important;
    font-weight: 700;
  }

  /* Level 2: Sub-Category Block */
  .recon-subcat-block {
    padding: 2px 4px;
    border-bottom: 1px solid #e0e0e0;
    page-break-inside: auto !important;
    break-inside: auto !important;
  }

  .recon-subcat-block:last-child {
    border-bottom: none;
  }

  .recon-subcat-title-container {
    text-align: right;
    margin: 2px 0;
    page-break-after: avoid;
    break-after: avoid;
  }

  .recon-subcat-title {
    display: inline-block;
    font-weight: 800;
    font-size: 8pt;
    color: #000000 !important;
    padding: 1px 6px;
    background: #f1f5f9;
    border-radius: 3px;
    border: 1px solid #cbd5e1;
  }

  /* Level 3: Products Table */
  .recon-detail-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8pt;
    margin-bottom: 2px;
    page-break-inside: auto !important;
    break-inside: auto !important;
  }

  .recon-detail-table thead {
    display: table-header-group;
  }

  .recon-detail-table tfoot {
    display: table-row-group !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .recon-col-header-row th {
    background: #f0f0f0 !important;
    padding: 4px 6px;
    font-weight: 800;
    font-size: 7.5pt;
    color: #000000 !important;
    border-bottom: 1px solid #000000;
    text-align: right;
  }

  .recon-detail-table tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .recon-detail-table tr:nth-child(even) {
    background: #f8f8f8 !important;
  }

  .recon-detail-table td {
    padding: 3px 6px;
    border-bottom: 1px solid #e0e0e0;
    vertical-align: middle;
    color: #000000 !important;
  }

  .recon-detail-table tbody tr:last-child td {
    border-bottom: 1px solid #e0e0e0;
  }

  .recon-subtotal-row {
    background: #e6e6e6 !important;
    font-size: 8pt;
    font-weight: 800;
    border-top: 1px solid #000000;
    border-bottom: 1px solid #000000;
    color: #000000 !important;
  }

  .recon-subtotal-row td {
    padding: 3px 6px;
  }

  .recon-grand-total-card {
    margin-top: 6px;
    background: #f2f2f2 !important;
    border: 1.5px solid #000000 !important;
    border-radius: 6px;
    padding: 6px 10px;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .recon-gt-title {
    font-size: 8.5pt;
    font-weight: 800;
    color: #000000 !important;
    margin-bottom: 3px;
    text-align: center;
  }

  .recon-gt-metrics {
    display: flex;
    justify-content: space-around;
    align-items: center;
    font-size: 9.5pt;
  }

  .gt-metric {
    font-weight: 800;
    color: #000000 !important;
  }

  .gt-metric.highlight {
    color: #000000 !important;
  }

  .recon-bold {
    font-weight: 700;
  }

  .recon-mono {
    font-family: 'Fira Code', monospace;
    font-weight: 700;
  }

  .recon-empty-text {
    text-align: center;
    padding: 14px;
    color: #555555 !important;
    font-size: 8pt;
  }

  .recon-footer {
    text-align: center;
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid #cccccc;
    font-size: 7.5pt;
    color: #333333 !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .recon-footer-sub {
    font-size: 7pt;
    color: #555555 !important;
    margin-top: 1px;
  }
}

  .recon-header-badge {
    background: #f1f5f9;
    color: #1e3a5f;
    border: 1.5px solid #cbd5e1;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 8.5pt;
    font-weight: 700;
  }

  .recon-divider {
    border-bottom: 1.5px solid #e2e8f0;
    margin: 10px 0;
  }

  .recon-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
    background: #f8fafc;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    font-size: 9pt;
  }

  .recon-meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .recon-label {
    color: #64748b;
    font-weight: 600;
  }

  .recon-value {
    font-weight: 700;
    color: #0f172a;
  }

  .recon-date-pill {
    background: #ffffff;
    padding: 2px 8px;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
  }

  .recon-kpi-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 6px 0 8px 0;
  }

  .recon-kpi-card {
    text-align: center;
    padding: 8px 6px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: #ffffff;
  }

  .recon-kpi-card.highlight {
    background: #f8fafc;
    border-color: #1e3a5f;
  }

  .recon-kpi-label {
    display: block;
    font-size: 8.5pt;
    color: #64748b;
    font-weight: 600;
    margin-bottom: 2px;
  }

  .recon-kpi-value {
    display: block;
    font-size: 13pt;
    font-weight: 800;
    color: #1e3a5f;
  }

  .recon-kpi-money {
    font-family: 'Fira Code', monospace;
  }

  .recon-section {
    margin: 4px 0 0 0;
  }

  .recon-section-header {
    background: #1e3a5f;
    color: #ffffff;
    padding: 6px 12px;
    border-radius: 6px 6px 0 0;
    margin-bottom: 0;
  }

  .recon-section-title {
    font-size: 9.5pt;
    font-weight: 800;
    margin: 0;
    color: #ffffff;
  }

  .recon-master-header-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    background: #e2e8f0;
    border-left: 1.5px solid #cbd5e1;
    border-right: 1.5px solid #cbd5e1;
    border-bottom: 2px solid #1e3a5f;
    margin-bottom: 6px;
  }

  .recon-master-header-table th {
    padding: 6px 8px;
    font-weight: 800;
    font-size: 8.5pt;
    color: #0f172a;
    text-align: right;
  }

  .recon-cat-block {
    margin-top: 6px;
    margin-bottom: 10px;
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
    overflow: hidden;
  }

  .recon-cat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f1f5f9;
    padding: 8px 12px;
    border-bottom: 1.5px solid #cbd5e1;
    page-break-after: avoid;
    break-after: avoid;
  }

  .recon-cat-title {
    font-weight: 800;
    font-size: 10pt;
    color: #0f172a;
  }

  .recon-cat-stats {
    font-size: 9pt;
    color: #334155;
  }

  .recon-subcat-block {
    padding: 8px 10px;
    border-bottom: 1px dashed #e2e8f0;
  }

  .recon-subcat-block:last-child {
    border-bottom: none;
  }

  .recon-subcat-title {
    font-weight: 700;
    font-size: 9pt;
    color: #1e3a5f;
    margin-bottom: 6px;
    padding-bottom: 3px;
    border-bottom: 1px solid #e2e8f0;
    page-break-after: avoid;
    break-after: avoid;
  }

  .recon-detail-table tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .recon-detail-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
  }

  .recon-detail-table th {
    background: #f8fafc;
    padding: 4px 6px;
    text-align: right;
    font-weight: 700;
    font-size: 8pt;
    border-bottom: 1.5px solid #cbd5e1;
    color: #475569;
  }

  .recon-detail-table td {
    padding: 4px 6px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }

  .recon-subtotal-row {
    background: #f8fafc;
    font-size: 8.5pt;
    font-weight: 700;
    border-top: 1.5px solid #cbd5e1;
  }

  .recon-subtotal-row td {
    padding: 4px 6px;
  }

  .recon-grand-total-card {
    margin-top: 14px;
    background: #f8fafc;
    border: 2px solid #1e3a5f;
    border-radius: 10px;
    padding: 10px 14px;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .recon-gt-title {
    font-size: 9.5pt;
    font-weight: 800;
    color: #1e3a5f;
    margin-bottom: 6px;
    text-align: center;
  }

  .recon-gt-metrics {
    display: flex;
    justify-content: space-around;
    align-items: center;
    font-size: 11pt;
  }

  .gt-metric {
    font-weight: 700;
    color: #0f172a;
  }

  .gt-metric.highlight {
    color: #1e3a5f;
    font-size: 12pt;
  }

  .recon-mono {
    font-family: 'Fira Code', monospace;
  }

  .recon-bold {
    font-weight: 700;
  }

  .recon-empty-text {
    text-align: center;
    padding: 16px;
    color: #64748b;
    font-style: italic;
  }

  .text-center {
    text-align: center !important;
  }

  .text-left {
    text-align: left !important;
  }

  .recon-footer {
    text-align: center;
    margin-top: 14px;
    padding-top: 8px;
    border-top: 1px dashed #cbd5e1;
    font-size: 8.5pt;
    font-weight: 700;
    color: #475569;
  }

  .recon-footer-sub {
    font-size: 7.5pt;
    color: #94a3b8;
    font-weight: 400;
    margin-top: 2px;
  }

/* Carousel Admin Grid Layout */
.carousel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.carousel-admin-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.card-image-wrapper {
  width: 100%;
  padding-top: 33.33%; /* 3:1 aspect ratio */
  position: relative;
  background: rgba(0, 0, 0, 0.03);
}

.card-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.card-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.5);
}

.card-date {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.flex-center {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

/* Tags Styles */
.tags-input-wrapper {
  display: flex;
  flex-direction: column;
}
.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag-pill {
  background: var(--primary-color);
  color: #fff;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}
.tag-remove-btn {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}
.tags-container-small {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.badge-tag-small {
  background: rgba(var(--primary-color-rgb), 0.15);
  color: #d98000;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Tag Color Presets */
.tag-default {
  background: rgba(var(--primary-color-rgb), 0.12) !important;
  color: var(--primary-color) !important;
}
.tag-rose {
  background: #F7A3AD !important;
  color: #8C172E !important;
}
.tag-gold {
  background: #FCE6B1 !important;
  color: #9E742C !important;
}
.tag-fire {
  background: #F66601 !important;
  color: #FFF !important;
}
.tag-leaf {
  background: #9CB795 !important;
  color: #1D3D1F !important;
}
.tag-sky {
  background: #BEE3F8 !important;
  color: #2B6CB0 !important;
}
.tag-royal {
  background: #E9D8FD !important;
  color: #553C9A !important;
}

.tag-custom-icon-admin {
  width: 14px;
  height: 14px;
  object-fit: contain;
  margin-right: 4px;
}

/* Tag Selection Picker in Product Modal */
.tags-picker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
  background: rgba(0, 0, 0, 0.02);
  padding: 12px;
  border-radius: 12px;
  border: 1px dashed rgba(0, 0, 0, 0.1);
}

.tag-picker-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
  font-weight: 600;
  font-size: 0.85rem;
  opacity: 0.55;
  filter: grayscale(35%);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.tag-picker-chip:hover {
  opacity: 0.85;
  filter: grayscale(0%);
  transform: translateY(-1px);
}

.tag-picker-chip.is-selected {
  opacity: 1;
  filter: grayscale(0%);
  border-color: currentColor;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

.tag-chip-checkbox {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  border: 1.5px solid currentColor;
  transition: all 0.15s ease;
}

.tag-picker-chip.is-selected .tag-chip-checkbox {
  background: currentColor;
  border-color: currentColor;
}

.tag-chip-checkbox .check-svg {
  width: 12px;
  height: 12px;
  stroke: #ffffff;
}

.tag-chip-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.tag-chip-name {
  line-height: 1;
}

/* Icon Select Preview Box in Tag Modal */
.icon-select-preview-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.selected-icon-preview-box {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.selected-icon-preview-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.tag-pill-table {
  padding: 3px 8px;
  font-size: 0.78rem;
  border-radius: 12px;
}

/* Restore and style scrollbars for AdminView on Laptop & Desktop screens */
@media (min-width: 769px) {
  .admin-main::-webkit-scrollbar,
  .table-container::-webkit-scrollbar,
  .edit-order-table-container::-webkit-scrollbar,
  .modal-box::-webkit-scrollbar {
    display: block !important;
    width: 8px !important;
    height: 8px !important;
  }

  .admin-main::-webkit-scrollbar-track,
  .table-container::-webkit-scrollbar-track,
  .edit-order-table-container::-webkit-scrollbar-track,
  .modal-box::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.04) !important;
    border-radius: 6px !important;
  }

  .admin-main::-webkit-scrollbar-thumb,
  .table-container::-webkit-scrollbar-thumb,
  .edit-order-table-container::-webkit-scrollbar-thumb,
  .modal-box::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.22) !important;
    border-radius: 6px !important;
    border: 2px solid transparent !important;
    background-clip: content-box !important;
    transition: background 0.2s ease !important;
  }

  .admin-main::-webkit-scrollbar-thumb:hover,
  .table-container::-webkit-scrollbar-thumb:hover,
  .edit-order-table-container::-webkit-scrollbar-thumb:hover,
  .modal-box::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.4) !important;
    background-clip: content-box !important;
  }

  .admin-main::-webkit-scrollbar-corner,
  .table-container::-webkit-scrollbar-corner {
    background: transparent !important;
  }

  .admin-main,
  .admin-main *,
  .table-container {
    -ms-overflow-style: auto !important;
    scrollbar-width: thin !important;
    scrollbar-color: rgba(0, 0, 0, 0.25) rgba(0, 0, 0, 0.04) !important;
  }
}

/* Strictly hide scrollbar for admin sidebar and all its children across all viewports */
.admin-sidebar::-webkit-scrollbar,
.admin-sidebar *::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

.admin-sidebar,
.admin-sidebar * {
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
}

/* ==========================================================================
   MODERN IMAGE LOADERS & SHIMMER PLACEHOLDERS (Admin View)
   ========================================================================== */

.admin-table-img-wrapper {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.08);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
}

.admin-table-img-wrapper:hover {
  transform: scale(1.12);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
  z-index: 10;
}

.admin-table-img-shimmer,
.admin-banner-shimmer,
.admin-fav-shimmer,
.admin-preview-shimmer {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.12), rgba(15, 23, 42, 0.05));
  z-index: 1;
  pointer-events: none;
}

.admin-img-zoom-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: rgba(15, 23, 42, 0.75);
  color: #fff;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 3;
}

.admin-table-img-wrapper:hover .admin-img-zoom-badge {
  opacity: 1;
}

.table-prod-img {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover;
  z-index: 2;
  transition: opacity 0.3s ease;
}

.card-image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 1;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.1);
  border-radius: 12px 12px 0 0;
}

.card-image {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover;
  z-index: 2;
  transition: transform 0.4s ease;
  cursor: pointer;
}

.card-image-wrapper:hover .card-image {
  transform: scale(1.04);
}

.fav-card-image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.1);
  border-radius: 12px 12px 0 0;
  cursor: pointer;
}

.fav-card-image {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover;
  z-index: 2;
  transition: transform 0.4s ease;
}

.fav-card-image-wrapper:hover .fav-card-image {
  transform: scale(1.05);
}

/* Admin Full-Screen Image Zoom Modal */
.zoom-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(10, 15, 26, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  direction: ltr;
  padding: 16px;
  box-sizing: border-box;
  animation: fadeIn 0.2s ease;
}

.zoom-content {
  position: relative;
  width: 100%;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.zoom-skeleton-loader {
  width: 280px;
  max-width: 85vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 2rem 1.5rem;
  color: #f8fafc;
  background: rgba(30, 41, 59, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  direction: rtl;
}

.zoom-loading-text {
  font-family: 'Cairo', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: #cbd5e1;
  margin: 0;
}

.zoom-image {
  max-width: 100%;
  max-height: 80vh;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  background: rgba(15, 23, 42, 0.8);
}

.zoom-image.loaded {
  opacity: 1;
  transform: scale(1);
}

.zoom-close-btn {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 10000;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.3rem;
  font-weight: bold;
  cursor: pointer;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
  transition: transform 0.2s, background 0.2s;
}

.zoom-close-btn:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.25);
}

.zoom-close-btn:active {
  transform: scale(0.9);
}

/* ==========================================================================
   MODERN NUMBERED PAGINATION TABS BAR
   ========================================================================== */

.admin-pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-info {
  font-family: 'Cairo', sans-serif;
  font-size: 0.88rem;
  color: #64748b;
}

.pagination-info strong {
  color: #0f172a;
  font-weight: 700;
}

.pagination-controls-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-pills {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-num-pill {
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #ffffff;
  color: #334155;
  font-family: 'Cairo', sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  touch-action: manipulation;
}

.page-num-pill:hover:not(.active):not(:disabled) {
  background: rgba(200, 149, 81, 0.12);
  color: #c89551;
  border-color: rgba(200, 149, 81, 0.3);
  transform: translateY(-1px);
}

.page-num-pill.active {
  background: #c89551;
  color: #ffffff;
  border-color: #c89551;
  box-shadow: 0 4px 12px rgba(200, 149, 81, 0.35);
  transform: scale(1.05);
}

.page-num-pill.ellipsis {
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: default;
  min-width: 24px;
}

.pagination-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #ffffff;
  color: #1e293b;
  font-family: 'Cairo', sans-serif;
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  touch-action: manipulation;
}

.pagination-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: rgba(0, 0, 0, 0.25);
  color: #0f172a;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.pagination-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.pagination-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Mobile Responsive Adjustments for Numbered Pagination Engine */
@media (max-width: 640px) {
  .admin-pagination-bar {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px 14px;
    gap: 10px;
  }

  .pagination-info {
    font-size: 0.82rem;
    text-align: center;
    width: 100%;
    order: 1;
  }

  .pagination-controls-group {
    width: 100%;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
    order: 2;
  }

  .pagination-pills {
    flex: 1;
    justify-content: center;
    overflow-x: auto;
    flex-wrap: nowrap;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding: 2px 0;
  }

  .pagination-pills::-webkit-scrollbar {
    display: none;
  }

  .page-num-pill {
    min-width: 38px;
    height: 38px;
    font-size: 0.88rem;
    flex-shrink: 0;
  }

  .pagination-btn {
    height: 38px;
    padding: 0 12px;
    font-size: 0.84rem;
    flex-shrink: 0;
  }
}

@media (max-width: 440px) {
  .btn-text-desktop {
    display: none;
  }

  .pagination-btn {
    padding: 0 10px;
    min-width: 38px;
    justify-content: center;
  }

  .page-num-pill {
    min-width: 34px;
    height: 36px;
    padding: 0 4px;
    font-size: 0.84rem;
  }
}

/* ==========================================================================
   CUSTOMER BALANCES & PAYMENTS STYLES
   ========================================================================== */

/* Payment Status Badges */
.payment-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 11px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 700;
  font-family: 'Cairo', sans-serif;
  line-height: 1.2;
  white-space: nowrap !important;
  word-break: keep-all !important;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  outline: none;
  user-select: none;
}

.payment-status-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
  filter: brightness(1.06);
}

.payment-status-badge:active {
  transform: scale(0.97);
}

.payment-status-badge.is-cancelled {
  opacity: 0.55;
  cursor: not-allowed !important;
  pointer-events: none;
}

.payment-status-badge.unpaid {
  background: #fef2f2 !important;
  color: #dc2626 !important;
  border: 1px solid #fecaca !important;
}

.payment-status-badge.partial {
  background: #fffbeb !important;
  color: #d97706 !important;
  border: 1px solid #fde68a !important;
}

.payment-status-badge.paid {
  background: #ecfdf5 !important;
  color: #059669 !important;
  border: 1px solid #a7f3d0 !important;
}

.payment-status-badge .badge-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.customer-balance-cell {
  font-weight: 700;
  font-family: 'Fira Code', 'Cairo', monospace;
  font-size: 0.9rem;
}

/* Balance Summary Cards */
.payment-balance-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.balance-card {
  padding: 14px 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.balance-outstanding {
  background: #fef2f2 !important;
  border: 1px solid #fecaca !important;
}

.balance-outstanding .balance-label {
  font-size: 0.8rem;
  color: #dc2626 !important;
  font-weight: 600;
}

.balance-outstanding .balance-value {
  font-size: 1.3rem;
  font-weight: 800;
  color: #b91c1c !important;
  font-family: 'Fira Code', 'Cairo', monospace;
}

.balance-after {
  background: #ecfdf5 !important;
  border: 1px solid #a7f3d0 !important;
}

.balance-after .balance-label {
  font-size: 0.8rem;
  color: #059669 !important;
  font-weight: 600;
}

.balance-after .balance-value {
  font-size: 1.3rem;
  font-weight: 800;
  color: #047857 !important;
  font-family: 'Fira Code', 'Cairo', monospace;
}

/* Section Title */
.payment-section-title {
  font-size: 0.92rem;
  font-weight: 700;
  margin: 0 0 10px 0;
  color: #1e3a5f !important;
}

/* Clean Minimal Unpaid Orders Container */
.payment-unpaid-orders {
  margin-bottom: 20px;
}

.unpaid-orders-scroll-wrapper {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  overflow: hidden;
}

.unpaid-orders-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 185px;
  overflow-y: auto;
  padding: 10px;
  scroll-behavior: smooth;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.03);
}

.unpaid-orders-list::-webkit-scrollbar {
  width: 5px;
}

.unpaid-orders-list::-webkit-scrollbar-track {
  background: transparent;
}

.unpaid-orders-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}

.unpaid-orders-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.unpaid-order-item {
  display: grid;
  grid-template-columns: 80px 100px 1fr 1fr 1fr;
  align-items: center;
  padding: 10px 14px;
  background: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px;
  font-size: 0.84rem;
  color: #1e293b !important;
}

.unpaid-order-id {
  font-weight: 700;
  font-family: monospace;
  color: #0284c7 !important;
}

.payment-no-debt {
  text-align: center;
  padding: 30px 16px;
  background: #ecfdf5 !important;
  border: 1px dashed #a7f3d0 !important;
  border-radius: 12px;
  margin-bottom: 20px;
  color: #059669 !important;
  font-weight: 600;
}

/* Payment Form Grid */
.payment-input-section {
  background: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 12px;
  padding: 16px;
}

.payment-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}

.form-group-full {
  grid-column: 1 / -1;
}

.payment-amount-input {
  font-size: 1.1rem !important;
  font-weight: 800 !important;
  color: #059669 !important;
}

/* Mode Selector Pills */
.payment-mode-selector {
  margin-bottom: 14px;
}

.payment-mode-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.mode-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  color: #334155;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.mode-pill:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.mode-pill.active {
  background: rgba(217, 119, 6, 0.1) !important;
  color: #b45309 !important;
  border-color: #d97706 !important;
  box-shadow: 0 2px 6px rgba(217, 119, 6, 0.15);
}

/* Allocation Preview Table */
.fifo-preview {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #e2e8f0;
}

.fifo-preview-table-wrapper {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  background: #ffffff;
}

.fifo-preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;
}

.fifo-preview-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 700;
  padding: 8px 12px;
  text-align: right;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.8rem;
}

.fifo-preview-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #f1f3f5;
  color: #1e293b;
}

.fifo-preview-table tr:last-child td {
  border-bottom: none;
}

.fifo-preview-table tr.target-row {
  background: #f0f9ff !important;
}

.target-tag {
  font-size: 0.72rem;
  padding: 1px 6px;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 4px;
  font-family: inherit;
  font-weight: 600;
}

.allocation-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 12px;
  font-size: 0.76rem;
  font-weight: 700;
}

.allocation-badge.badge-paid {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.allocation-badge.badge-partial {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fde68a;
}

/* Payment History */
.payment-history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 350px;
  overflow-y: auto;
}

.payment-history-item {
  padding: 12px 14px;
  background: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 10px;
  color: #1e293b !important;
}

.payment-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.88rem;
  margin-bottom: 6px;
}

.payment-history-amount {
  font-weight: 800;
  color: #059669 !important;
  font-family: monospace;
}

.payment-history-method {
  font-size: 0.76rem;
  padding: 2px 8px;
  background: #e2e8f0 !important;
  border-radius: 4px;
  color: #334155 !important;
  font-weight: 600;
}

/* ==========================================================================
   ANALYTICS PAYMENT METHODS BREAKDOWN STYLES
   ========================================================================== */

.payment-methods-breakdown {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.pm-breakdown-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.pm-breakdown-row:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.pm-icon-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pm-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
}

.pm-badge.cash-badge {
  background: #ecfdf5;
  color: #059669;
}

.pm-badge.card-badge {
  background: #eff6ff;
  color: #2563eb;
}

.pm-badge.bank-badge {
  background: #f5f3ff;
  color: #7c3aed;
}

.pm-details {
  display: flex;
  flex-direction: column;
}

.pm-name {
  font-family: 'Cairo', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e293b;
}

.pm-count {
  font-family: 'Cairo', sans-serif;
  font-size: 0.74rem;
  color: #64748b;
}

.pm-amount {
  font-family: 'Cairo', 'Fira Code', sans-serif;
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
}

.payment-history-date {
  font-size: 0.76rem;
  color: #64748b !important;
}

.payment-history-note {
  font-size: 0.8rem;
  color: #475569 !important;
  margin-bottom: 6px;
  font-style: italic;
}

.payment-history-distribution {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.payment-dist-chip {
  font-size: 0.72rem;
  padding: 2px 6px;
  background: #e0f2fe !important;
  color: #0284c7 !important;
  border-radius: 4px;
  font-family: monospace;
  font-weight: 600;
}

.payment-history-footer {
  display: flex;
  justify-content: flex-end; /* In Arabic RTL mode, flex-end aligns to the LEFT side of the container */
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed #e2e8f0;
}

.btn-payment-print {
  background: #ffffff !important;
  color: #1e3a5f !important;
  border: 1px solid #cbd5e1 !important;
  font-weight: 700 !important;
  border-radius: 8px !important;
  padding: 4px 12px !important;
  gap: 6px !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}

.btn-payment-print:hover {
  background: #e0f2fe !important;
  border-color: #0284c7 !important;
  color: #0284c7 !important;
}

/* ==========================================================================
   STREAMLINED CUSTOMER TABLE & PROFILE DETAILS MODAL
   ========================================================================== */

.customer-profile-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  transition: opacity 0.15s ease;
}

.customer-profile-cell:hover .customer-name-text {
  color: var(--primary);
  text-decoration: underline;
}

.customer-avatar-badge {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(253, 181, 24, 0.2), rgba(253, 181, 24, 0.4));
  color: #b45309;
  font-family: 'Cairo', sans-serif;
  font-weight: 800;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(253, 181, 24, 0.3);
}

.customer-names-group {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.customer-name-text {
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--text-dark, #1e293b);
  transition: color 0.15s ease;
}

.customer-phone-subtext {
  font-size: 0.76rem;
  color: var(--text-muted, #64748b);
  direction: ltr;
  display: inline-block;
  text-align: right;
}

.orders-count-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.04);
  color: var(--text-dark, #334155);
  font-weight: 700;
  font-size: 0.8rem;
  font-family: 'Cairo', 'Fira Code', monospace;
}

.customer-table-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.cust-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  height: 32px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  font-family: 'Cairo', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  outline: none;
  user-select: none;
}

.cust-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.cust-btn:active {
  transform: scale(0.96);
}

.cust-btn.btn-pay {
  background: #ecfdf5 !important;
  color: #059669 !important;
  border-color: #a7f3d0 !important;
}

.cust-btn.btn-pay:hover {
  background: #d1fae5 !important;
  color: #047857 !important;
}

.cust-btn.btn-details {
  background: #f1f5f9 !important;
  color: #334155 !important;
  border-color: #cbd5e1 !important;
}

.cust-btn.btn-details:hover {
  background: #e2e8f0 !important;
  color: #1e293b !important;
}

/* Customer Profile Modal Elements */
.customer-profile-modal {
  width: 95%;
  max-width: 520px;
  padding: 24px !important;
  font-family: 'Cairo', system-ui, -apple-system, sans-serif;
}

.profile-hero-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.profile-avatar {
  width: 52px;
  height: 52px;
  min-width: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #ffffff;
  font-size: 1.45rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25);
  user-select: none;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-name {
  margin: 0 0 4px 0;
  font-size: 1.2rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.3;
}

.profile-phone-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-phone-text {
  font-size: 0.92rem;
  font-weight: 700;
  color: #475569;
  direction: ltr;
  display: inline-block;
}

.profile-quick-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.profile-action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
}

.profile-action-icon.whatsapp-icon {
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.profile-action-icon.whatsapp-icon:hover {
  background: #16a34a;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(22, 163, 74, 0.25);
}

.profile-action-icon.call-icon {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.profile-action-icon.call-icon:hover {
  background: #0284c7;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);
}

.profile-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 14px;
}

.profile-stat-box {
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  transition: transform 0.15s ease;
}

.profile-stat-box.balance-due-box {
  background: #fef2f2;
  border-color: #fecaca;
}

.profile-stat-box.balance-due-box .stat-value {
  color: #dc2626;
}

.profile-stat-box.balance-clear-box {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.profile-stat-box.balance-clear-box .stat-value {
  color: #15803d;
  font-size: 1.05rem;
}

.profile-stat-box.primary-stat-box {
  background: #fefce8;
  border-color: #fef08a;
}

.profile-stat-box.primary-stat-box .stat-value {
  color: #b45309;
}

.profile-stat-box .stat-label {
  font-size: 0.78rem;
  color: #475569;
  font-weight: 700;
  margin-bottom: 6px;
  display: block;
}

.profile-stat-box .stat-value {
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.2;
}

.profile-stat-box .stat-value.text-dark {
  color: #0f172a;
}

.profile-stat-box .stat-value-sub {
  font-size: 0.95rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}

.profile-meta-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #f8fafc;
  border-radius: 10px;
  font-size: 0.82rem;
  margin-bottom: 18px;
  border: 1px solid #e2e8f0;
}

.profile-meta-bar .meta-label {
  color: #475569;
  font-weight: 600;
}

.profile-meta-bar .meta-val {
  font-weight: 800;
  color: #0f172a;
}

.profile-actions-hub {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.btn-hub-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 12px;
  font-family: 'Cairo', system-ui, sans-serif;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  touch-action: manipulation;
  user-select: none;
}

.btn-hub-action:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}

.btn-hub-action:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-hub-action.btn-hub-pay {
  background: linear-gradient(135deg, #059669, #047857);
  color: #ffffff;
  box-shadow: 0 3px 10px rgba(5, 150, 105, 0.28);
}

.btn-hub-action.btn-hub-pay:hover {
  background: linear-gradient(135deg, #047857, #065f46);
}

.btn-hub-action.btn-hub-history {
  background: #ffffff;
  color: #334155;
  border: 1px solid #cbd5e1;
}

.btn-hub-action.btn-hub-history:hover {
  background: #f8fafc;
  color: #0f172a;
  border-color: #94a3b8;
}

.btn-hub-action.btn-hub-favs {
  background: #fff1f2;
  color: #be123c;
  border: 1px solid #fecdd3;
}

.btn-hub-action.btn-hub-favs:hover:not(:disabled) {
  background: #ffe4e6;
}

.btn-hub-action.btn-hub-favs:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(80%);
}

.btn-hub-action.btn-hub-edit {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.btn-hub-action.btn-hub-edit:hover {
  background: #dbeafe;
}

.btn-hub-action.btn-hub-delete {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  margin-top: 4px;
}

.btn-hub-action.btn-hub-delete:hover {
  background: #fee2e2;
}

/* Print Payment Receipt Styles */
.print-payment-receipt-wrapper {
  display: none;
}

@media print {
  /* Ensure modal overlays and admin layout remain hidden */
  .modal-overlay,
  .modal-box,
  .modal-content,
  .admin-layout {
    display: none !important;
  }

  .print-payment-receipt-wrapper, .print-payment-receipt-wrapper * {
    visibility: visible;
  }

  .print-payment-receipt-wrapper {
    display: block !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    padding: 0;
    margin: 0;
    background: transparent;
  }

  /* Suppress browser print headers & footers for payment receipt */
  @page {
    size: A5 portrait;
    margin: 0 !important;
  }

  /* Suppress link URL text insertion */
  a[href]:after {
    content: none !important;
  }
  a[href] {
    text-decoration: none !important;
    color: inherit !important;
  }

  .print-payment-receipt {
    display: block !important;
    width: 100%;
    box-sizing: border-box;
    padding: 5mm 7mm;
    margin: 0;
    background: #ffffff !important;
    color: #111111 !important;
    font-family: 'Cairo', 'Fira Code', sans-serif;
    direction: rtl;
    font-size: 10pt;
  }

  .payment-receipt-amount-section {
    margin: 12px 0;
    padding: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
  }

  .payment-receipt-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 10pt;
  }

  .payment-receipt-highlight {
    font-weight: 800;
    font-size: 12pt;
    border-top: 1px solid #cbd5e1;
    border-bottom: 1px solid #cbd5e1;
    padding: 6px 0;
    margin: 4px 0;
  }

  .payment-receipt-distribution {
    margin-top: 10px;
  }

  .receipt-barcode-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 4px 0 2px 0;
    text-align: center;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .receipt-barcode-svg {
    max-width: 160px;
    height: auto;
    margin: 0 auto;
  }
}

/* ==========================================================================
   FAST ORDER CREATION (POS MODE) STYLES - EXPANDED ROOMY LAYOUT
   ========================================================================== */
.btn-make-order {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, var(--primary-color, #fdb518), #d97706);
  color: #111827;
  font-weight: 700;
  font-size: 0.9rem;
  border-radius: 12px;
  padding: 9px 18px;
  border: none;
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.25);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-make-order:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(217, 119, 6, 0.35);
  filter: brightness(1.05);
}

.fast-order-modal {
  width: 96% !important;
  max-width: 1420px !important;
  height: 93vh !important;
  max-height: 960px !important;
  padding: 26px 32px !important;
  display: flex !important;
  flex-direction: column !important;
  background: rgba(255, 255, 255, 0.98) !important;
  backdrop-filter: blur(28px) saturate(190%) !important;
  border: 1px solid rgba(226, 232, 240, 0.9) !important;
  box-shadow: 0 30px 70px rgba(15, 23, 42, 0.22) !important;
  border-radius: 24px !important;
  overflow: hidden !important;
}

.fast-order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.fast-order-title-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.new-order-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(253, 181, 24, 0.16);
  color: #b45309;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.fast-order-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fast-order-title-row h3 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.fast-order-subtitle {
  margin: 3px 0 0 0;
  font-size: 0.85rem;
  color: #64748b;
}

.shop-badge-indicator {
  font-size: 0.74rem;
  font-weight: 700;
  padding: 3px 12px;
  border-radius: 20px;
}

.shop1-badge {
  background: rgba(253, 181, 24, 0.15);
  color: #92400e;
  border: 1px solid rgba(253, 181, 24, 0.4);
}

.shop2-badge {
  background: rgba(30, 58, 95, 0.12);
  color: #1e3a5f;
  border: 1px solid rgba(30, 58, 95, 0.25);
}

.fast-order-price-mode-switch {
  display: inline-flex;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 12px;
  gap: 6px;
  border: 1px solid #e2e8f0;
}

.price-mode-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  padding: 8px 16px;
  font-size: 0.86rem;
  font-weight: 700;
  font-family: inherit;
  color: #64748b;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.price-mode-pill.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.fast-order-form-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 4px 10px 4px;
  min-height: 0;
}

.fast-order-grid-layout {
  display: grid;
  grid-template-columns: 430px 1fr;
  gap: 24px;
  align-items: start;
}

/* Side Column Cards */
.fast-order-side-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  z-index: 30;
}

.fast-order-side-col > .pos-section-card:first-child {
  position: relative;
  z-index: 40;
}

.fast-order-side-col > .pos-section-card:nth-child(2) {
  position: relative;
  z-index: 20;
}

.fast-order-side-col > .pos-section-card:nth-child(3) {
  position: relative;
  z-index: 10;
}

.fast-order-main-col {
  position: relative;
  z-index: 20;
}

.pos-catalog-card {
  position: relative;
  z-index: 40;
}

.pos-items-card {
  position: relative;
  z-index: 10;
}

.customer-search-autocomplete-wrapper,
.product-search-autocomplete-container {
  position: relative;
  z-index: 100;
}

.pos-section-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.04);
}

.pos-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.pos-card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.92rem;
  font-weight: 800;
  color: #1e293b;
}

.pos-card-title svg {
  color: var(--primary-color, #1e3a5f);
}

.pos-cust-status-badge {
  font-size: 0.74rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
}

.pos-cust-status-badge.is-registered {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.pos-cust-status-badge.is-new {
  background: rgba(100, 116, 139, 0.1);
  color: #64748b;
}

.pos-fields-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pos-input-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.pos-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pos-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #475569;
}

.pos-control {
  font-size: 0.88rem !important;
  padding: 8px 12px !important;
  border-radius: 10px !important;
  border: 1.5px solid #cbd5e1 !important;
  height: 40px !important;
  transition: all 0.2s ease;
  width: 100% !important;
  box-sizing: border-box !important;
}

select.pos-control {
  padding-left: 40px !important;
  padding-right: 14px !important;
}

.pos-control:focus {
  border-color: var(--primary-color, #1e3a5f) !important;
  box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.12) !important;
}

.btn-clear-search {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  font-size: 1.2rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.customer-suggestions-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  z-index: 120;
  max-height: 240px;
  overflow-y: auto;
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #cbd5e1;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.14);
}

.customer-suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s;
}

.customer-suggestion-item:hover {
  background: #f8fafc;
}

.cust-avatar-sm {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #1e293b;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.cust-info-group {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.cust-sugg-name {
  font-weight: 700;
  font-size: 0.88rem;
  color: #0f172a;
}

.cust-sugg-phone {
  font-size: 0.76rem;
  color: #64748b;
}

.cust-badge-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.badge-orders {
  font-size: 0.72rem;
  color: #475569;
  background: #f1f5f9;
  padding: 3px 8px;
  border-radius: 6px;
}

.badge-balance-debt {
  font-size: 0.72rem;
  color: #dc2626;
  font-weight: 700;
}

.pos-field-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.date-quick-shortcuts-inline {
  display: inline-flex;
  gap: 4px;
}
.date-quick-btn-mini {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  font-size: 0.7rem;
  font-weight: 700;
  font-family: inherit;
  color: #475569;
  padding: 1px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.3;
}
.date-quick-btn-mini:hover {
  background: #e2e8f0;
  color: #0f172a;
  border-color: #94a3b8;
}
.date-quick-shortcuts {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.date-quick-btn {
  flex: 1;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 0.76rem;
  font-weight: 700;
  font-family: inherit;
  color: #475569;
  padding: 5px 0;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s ease;
}

.date-quick-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

/* Main Column: Catalog & Cart */
.fast-order-main-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pos-catalog-card {
  padding-bottom: 16px;
}

.product-picker-toolbar {
  margin-bottom: 12px;
}

.category-quick-chips-row {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  -webkit-overflow-scrolling: touch;
}

.cat-chip-btn {
  white-space: nowrap;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  padding: 6px 14px;
  font-size: 0.82rem;
  font-weight: 700;
  font-family: inherit;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cat-chip-btn:hover {
  background: #e2e8f0;
}

.cat-chip-btn.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

.quick-products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
  gap: 10px;
  max-height: 200px;
  overflow-y: auto;
  padding-top: 6px;
}

.quick-prod-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-prod-card:hover {
  background: #ffffff;
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.quick-prod-thumb {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.quick-prod-meta {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.quick-prod-header-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pos-scroll-loader-hint {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 600;
  text-align: center;
  background: rgba(241, 245, 249, 0.6);
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
  margin-top: 4px;
}
.pos-scroll-loader-dots {
  letter-spacing: 4px;
  color: #3b82f6;
  font-size: 1rem;
  animation: pulseDots 1.5s infinite ease-in-out;
}
@keyframes pulseDots {
  0%, 100% { opacity: 0.4; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1.05); }
}
.pos-catalog-empty {
  padding: 24px;
  text-align: center;
  color: #94a3b8;
  font-size: 0.86rem;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px dashed #cbd5e1;
}
.quick-prod-card.is-in-cart {
  background: #f0fdf4;
  border-color: #86efac;
}
.quick-prod-name {
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #1e293b;
}

.quick-prod-price {
  font-size: 0.78rem;
  font-weight: 700;
  color: #047857;
}

.quick-prod-add-btn {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.quick-prod-card:hover .quick-prod-add-btn {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}

.btn-quick-add {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #fff;
  background: #0f172a;
  padding: 5px 10px;
  border-radius: 7px;
}

/* Cart Items Table */
.pos-items-card {
  flex: 1;
  min-height: 260px;
  display: flex;
  flex-direction: column;
}

.pos-empty-cart-msg {
  padding: 45px 16px !important;
  text-align: center;
  color: #94a3b8;
}

.pos-empty-cart-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  font-size: 0.88rem;
}

.qty-stepper-control {
  display: inline-flex;
  align-items: center;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
  height: 36px;
  width: 100%;
}

.stepper-btn {
  border: none;
  background: #f8fafc;
  width: 32px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  color: #334155;
  cursor: pointer;
  transition: background 0.15s;
}

.stepper-btn:hover {
  background: #e2e8f0;
}

.stepper-input {
  border: none !important;
  box-shadow: none !important;
  height: 36px !important;
  width: 100% !important;
  padding: 0 6px !important;
  font-size: 0.88rem !important;
  font-weight: 700 !important;
}

.item-note-input {
  font-size: 0.76rem !important;
  padding: 4px 8px !important;
  height: 28px !important;
  border-radius: 6px !important;
  margin-top: 5px;
}

.btn-item-delete {
  background: transparent;
  border: none;
  color: #94a3b8;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-item-delete:hover {
  background: #fef2f2;
  color: #ef4444;
}

/* Modal Footer */
.fast-order-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 18px;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.fast-order-totals-summary {
  display: flex;
  flex-direction: column;
}

.total-summary-label {
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 700;
}

.total-summary-val-group {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.total-summary-val {
  font-size: 1.65rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
}

.total-summary-count {
  font-size: 0.82rem;
}

.fast-order-footer-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.fast-order-footer-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
}

.auto-print-checkbox-label {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 8px 14px !important;
  background: #ffffff !important;
  border: 1.5px solid #e2e8f0 !important;
  border-radius: 10px !important;
  font-size: 0.88rem !important;
  font-weight: 800 !important;
  color: #475569 !important;
  cursor: pointer !important;
  user-select: none !important;
  white-space: nowrap !important;
  flex-shrink: 0 !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.auto-print-checkbox-label:hover {
  border-color: #f59e0b !important;
  background: rgba(245, 158, 11, 0.05) !important;
  color: #0f172a !important;
}

.auto-print-checkbox-label.is-checked {
  background: rgba(245, 158, 11, 0.1) !important;
  border-color: #f59e0b !important;
  color: #b45309 !important;
}

.auto-print-checkbox-input {
  width: 17px !important;
  height: 17px !important;
  accent-color: #d97706 !important;
  cursor: pointer !important;
  flex-shrink: 0 !important;
  margin: 0 !important;
}

.auto-print-icon {
  flex-shrink: 0 !important;
  stroke: currentColor !important;
  transition: transform 0.2s ease !important;
}

.auto-print-checkbox-label:hover .auto-print-icon {
  transform: scale(1.1) !important;
}

.auto-print-text {
  font-family: 'Cairo', sans-serif !important;
  white-space: nowrap !important;
  line-height: 1.2 !important;
}

.pos-btn-cancel {
  padding: 11px 22px !important;
  font-size: 0.9rem !important;
  font-weight: 700 !important;
  border-radius: 12px !important;
  background: #ffffff !important;
  border: 1.5px solid #cbd5e1 !important;
  color: #475569 !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  cursor: pointer !important;
}

.pos-btn-cancel:hover:not(:disabled) {
  background: #f1f5f9 !important;
  color: #0f172a !important;
  border-color: #94a3b8 !important;
}

.pos-btn-submit {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  padding: 11px 28px !important;
  font-size: 0.95rem !important;
  font-weight: 800 !important;
  border-radius: 12px !important;
  background: linear-gradient(135deg, #f59e0b, #d97706) !important;
  color: #ffffff !important;
  border: 1px solid #d97706 !important;
  box-shadow: 0 4px 16px rgba(217, 119, 6, 0.32) !important;
  cursor: pointer !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
  font-family: 'Cairo', sans-serif !important;
  user-select: none !important;
}

.pos-btn-submit svg {
  stroke: #ffffff !important;
}

.pos-btn-submit:hover:not(:disabled) {
  transform: translateY(-2px) !important;
  background: linear-gradient(135deg, #fbbf24, #ea580c) !important;
  box-shadow: 0 8px 24px rgba(217, 119, 6, 0.45) !important;
}

.pos-btn-submit:active:not(:disabled) {
  transform: scale(0.98) !important;
}

.pos-btn-submit:disabled {
  opacity: 0.45 !important;
  cursor: not-allowed !important;
  transform: none !important;
  box-shadow: none !important;
  background: #cbd5e1 !important;
  color: #64748b !important;
  border-color: #cbd5e1 !important;
}

.pos-btn-submit:disabled svg {
  stroke: #64748b !important;
}

.suggestion-item.highlighted,
.customer-suggestion-item.highlighted {
  background: rgba(30, 58, 95, 0.08) !important;
  outline: 1.5px solid var(--primary-color, #1e3a5f);
  border-radius: 8px;
}

.suggestion-item.is-in-cart {
  border-right: 3px solid #16a34a;
}

.suggestion-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sugg-in-cart-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #166534;
  background: #dcfce7;
  border: 1px solid #bbf7d0;
  padding: 1px 7px;
  border-radius: 20px;
}

.suggestion-item-btns {
  display: flex;
  align-items: center;
  gap: 5px;
}

.btn-sugg-qty-minus {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #ef4444;
  font-weight: 800;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-sugg-qty-minus:hover {
  background: #fee2e2;
  border-color: #fca5a5;
}

.btn-quick-add-active {
  background: #16a34a !important;
  color: #ffffff !important;
  border-color: #16a34a !important;
}

@media (max-width: 960px) {
  .fast-order-modal {
    width: 98% !important;
    height: 96vh !important;
    padding: 18px !important;
  }
  .fast-order-grid-layout {
    grid-template-columns: 1fr;
  }
  .fast-order-header {
    flex-wrap: wrap;
  }
  .fast-order-price-mode-switch {
    width: 100%;
    justify-content: center;
  }
  .fast-order-modal-footer {
    flex-direction: column;
    gap: 14px;
    align-items: stretch;
  }
  .fast-order-footer-actions {
    flex-direction: column;
  }
  .fast-order-footer-actions button,
  .fast-order-footer-actions .auto-print-checkbox-label {
    width: 100%;
    justify-content: center;
  }
}



  /* ==========================================================================
     ADAPTIVE A4 DENSITY TIERS (Dynamically Scaled Based on Items & Category Count)
     ========================================================================== */

  /* Tier 1: Spacious (Small Catalogs <= 12 visual units -> Fills 1 A4 page beautifully) */
  .reconciliation-page.recon-density-spacious {
    padding: 10mm 12mm;
    font-size: 9.5pt;
    line-height: 1.45;
  }
  .recon-density-spacious .recon-logo { width: 48px; height: 48px; }
  .recon-density-spacious .recon-shop-name { font-size: 15pt; }
  .recon-density-spacious .recon-subtitle { font-size: 9.5pt; }
  .recon-density-spacious .recon-header-badge { font-size: 9pt; padding: 4px 10px; }
  .recon-density-spacious .recon-meta { padding: 6px 12px; font-size: 9pt; gap: 6px 14px; margin-bottom: 6px; }
  .recon-density-spacious .recon-kpi-grid { gap: 8px; margin: 6px 0 8px 0; }
  .recon-density-spacious .recon-kpi-card { padding: 6px 8px; }
  .recon-density-spacious .recon-kpi-label { font-size: 8.5pt; }
  .recon-density-spacious .recon-kpi-value { font-size: 14pt; }
  .recon-density-spacious .recon-section-header { padding: 6px 12px; font-size: 9.5pt; }
  .recon-density-spacious .recon-cat-block { margin: 8px 0; border-width: 1.5px !important; }
  .recon-density-spacious .recon-cat-header { padding: 5px 12px; font-size: 10.5pt; }
  .recon-density-spacious .recon-cat-title { font-size: 10.5pt; }
  .recon-density-spacious .recon-cat-stats { font-size: 8.5pt; }
  .recon-density-spacious .recon-subcat-block { padding: 4px 8px; }
  .recon-density-spacious .recon-subcat-title { font-size: 9pt; padding: 2px 8px; }
  .recon-density-spacious .recon-detail-table { font-size: 9pt; }
  .recon-density-spacious .recon-col-header-row th { padding: 6px 8px; font-size: 8.5pt; }
  .recon-density-spacious .recon-detail-table td { padding: 5px 8px; }
  .recon-density-spacious .recon-subtotal-row { font-size: 9pt; }
  .recon-density-spacious .recon-subtotal-row td { padding: 5px 8px; }
  .recon-density-spacious .recon-grand-total-card { margin-top: 10px; padding: 8px 14px; font-size: 11pt; }
  .recon-density-spacious .recon-gt-metrics { font-size: 11pt; }

  /* Tier 2: Balanced (Medium Catalogs 13-28 visual units -> Compact & Balanced) */
  .reconciliation-page.recon-density-balanced {
    padding: 7mm 9mm;
    font-size: 8.5pt;
    line-height: 1.35;
  }
  .recon-density-balanced .recon-logo { width: 38px; height: 38px; }
  .recon-density-balanced .recon-shop-name { font-size: 13.5pt; }
  .recon-density-balanced .recon-subtitle { font-size: 8.2pt; }
  .recon-density-balanced .recon-header-badge { font-size: 8.2pt; padding: 3px 8px; }
  .recon-density-balanced .recon-meta { padding: 4px 8px; font-size: 8.2pt; gap: 4px 10px; margin-bottom: 4px; }
  .recon-density-balanced .recon-kpi-grid { gap: 6px; margin: 4px 0 6px 0; }
  .recon-density-balanced .recon-kpi-card { padding: 4px 6px; }
  .recon-density-balanced .recon-kpi-label { font-size: 7.8pt; }
  .recon-density-balanced .recon-kpi-value { font-size: 12pt; }
  .recon-density-balanced .recon-section-header { padding: 4px 10px; font-size: 8.8pt; }
  .recon-density-balanced .recon-cat-block { margin: 5px 0; border-width: 1px !important; }
  .recon-density-balanced .recon-cat-header { padding: 3.5px 8px; font-size: 9.5pt; }
  .recon-density-balanced .recon-cat-title { font-size: 9.5pt; }
  .recon-density-balanced .recon-cat-stats { font-size: 7.8pt; }
  .recon-density-balanced .recon-subcat-block { padding: 3px 6px; }
  .recon-density-balanced .recon-subcat-title { font-size: 8.2pt; padding: 1.5px 6px; }
  .recon-density-balanced .recon-detail-table { font-size: 8.2pt; }
  .recon-density-balanced .recon-col-header-row th { padding: 4.5px 6px; font-size: 7.8pt; }
  .recon-density-balanced .recon-detail-table td { padding: 3.5px 6px; }
  .recon-density-balanced .recon-subtotal-row { font-size: 8.2pt; }
  .recon-density-balanced .recon-subtotal-row td { padding: 3.5px 6px; }
  .recon-density-balanced .recon-grand-total-card { margin-top: 6px; padding: 6px 10px; }
  .recon-density-balanced .recon-gt-metrics { font-size: 9.5pt; }

  /* Tier 3: Dense (Large Catalogs 29-52 visual units -> High Space Compression) */
  .reconciliation-page.recon-density-dense {
    padding: 5mm 7mm;
    font-size: 7.8pt;
    line-height: 1.25;
  }
  .recon-density-dense .recon-logo { width: 32px; height: 32px; }
  .recon-density-dense .recon-shop-name { font-size: 12pt; }
  .recon-density-dense .recon-subtitle { font-size: 7.5pt; }
  .recon-density-dense .recon-header-badge { font-size: 7.5pt; padding: 2px 6px; }
  .recon-density-dense .recon-meta { padding: 3px 6px; font-size: 7.5pt; gap: 3px 8px; margin-bottom: 3px; }
  .recon-density-dense .recon-kpi-grid { gap: 5px; margin: 3px 0 5px 0; }
  .recon-density-dense .recon-kpi-card { padding: 3px 5px; }
  .recon-density-dense .recon-kpi-label { font-size: 7.2pt; }
  .recon-density-dense .recon-kpi-value { font-size: 10.5pt; }
  .recon-density-dense .recon-section-header { padding: 3px 8px; font-size: 8pt; }
  .recon-density-dense .recon-cat-block { margin: 3.5px 0; }
  .recon-density-dense .recon-cat-header { padding: 2.5px 6px; font-size: 8.5pt; }
  .recon-density-dense .recon-cat-title { font-size: 8.5pt; }
  .recon-density-dense .recon-cat-stats { font-size: 7.2pt; }
  .recon-density-dense .recon-subcat-block { padding: 2px 4px; }
  .recon-density-dense .recon-subcat-title { font-size: 7.5pt; padding: 1px 5px; }
  .recon-density-dense .recon-detail-table { font-size: 7.5pt; }
  .recon-density-dense .recon-col-header-row th { padding: 3px 5px; font-size: 7.2pt; }
  .recon-density-dense .recon-detail-table td { padding: 2.5px 5px; }
  .recon-density-dense .recon-subtotal-row td { padding: 2.5px 5px; font-size: 7.5pt; }
  .recon-density-dense .recon-grand-total-card { margin-top: 5px; padding: 5px 8px; }
  .recon-density-dense .recon-gt-metrics { font-size: 8.8pt; }

  /* Tier 4: Ultra-Dense (Massive Catalogs > 52 visual units -> Ultra Compact Multi-Page) */
  .reconciliation-page.recon-density-ultra-dense {
    padding: 4mm 6mm;
    font-size: 7.2pt;
    line-height: 1.2;
  }
  .recon-density-ultra-dense .recon-logo { width: 26px; height: 26px; }
  .recon-density-ultra-dense .recon-shop-name { font-size: 11pt; }
  .recon-density-ultra-dense .recon-subtitle { font-size: 7pt; }
  .recon-density-ultra-dense .recon-header-badge { font-size: 7pt; padding: 1.5px 5px; }
  .recon-density-ultra-dense .recon-meta { padding: 2px 5px; font-size: 7pt; gap: 2px 6px; margin-bottom: 2px; }
  .recon-density-ultra-dense .recon-kpi-grid { gap: 4px; margin: 2px 0 4px 0; }
  .recon-density-ultra-dense .recon-kpi-card { padding: 2px 4px; }
  .recon-density-ultra-dense .recon-kpi-label { font-size: 6.8pt; }
  .recon-density-ultra-dense .recon-kpi-value { font-size: 9.5pt; }
  .recon-density-ultra-dense .recon-section-header { padding: 2px 6px; font-size: 7.5pt; }
  .recon-density-ultra-dense .recon-cat-block { margin: 2.5px 0; }
  .recon-density-ultra-dense .recon-cat-header { padding: 2px 5px; font-size: 7.8pt; }
  .recon-density-ultra-dense .recon-cat-title { font-size: 7.8pt; }
  .recon-density-ultra-dense .recon-cat-stats { font-size: 6.8pt; }
  .recon-density-ultra-dense .recon-subcat-block { padding: 1.5px 3px; }
  .recon-density-ultra-dense .recon-subcat-title { font-size: 7pt; padding: 1px 4px; }
  .recon-density-ultra-dense .recon-detail-table { font-size: 7pt; }
  .recon-density-ultra-dense .recon-col-header-row th { padding: 2.5px 4px; font-size: 6.8pt; }
  .recon-density-ultra-dense .recon-detail-table td { padding: 2px 4px; }
  .recon-density-ultra-dense .recon-subtotal-row td { padding: 2px 4px; font-size: 7pt; }
  .recon-density-ultra-dense .recon-grand-total-card { margin-top: 4px; padding: 4px 6px; }
  .recon-density-ultra-dense .recon-gt-metrics { font-size: 8.2pt; }

.cust-date-range-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.btn-range-trigger {
  padding: 6px 12px !important;
  height: 38px !important;
  font-size: 0.84rem !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  white-space: nowrap !important;
}

.range-label-prefix {
  color: #64748b;
  font-weight: 700;
}

.range-date-val {
  color: #0f172a;
}

.range-arrow-separator {
  color: #94a3b8;
  font-weight: 800;
  font-size: 0.9rem;
  user-select: none;
}

.pos-field-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.date-quick-shortcuts-inline {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.date-quick-btn-mini {
  padding: 3px 10px;
  font-size: 0.78rem;
  font-weight: 800;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
  line-height: 1.2;
}

.date-quick-btn-mini:hover {
  background: var(--primary-glow, rgba(253, 181, 24, 0.15));
  color: #0f172a;
  border-color: var(--primary-color, #fdb518);
}

.date-quick-btn-mini.active {
  background: var(--primary-color, #fdb518) !important;
  color: #111827 !important;
  border-color: var(--primary-color, #fdb518) !important;
  font-weight: 900 !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.pos-date-shortcuts-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
  margin-top: 6px;
}

.pos-date-shortcut-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 38px;
  padding: 0 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  color: #475569;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
  user-select: none;
}

.pos-date-shortcut-btn:hover {
  border-color: var(--primary-color, #1e3a5f);
  color: var(--primary-color, #1e3a5f);
  background: var(--primary-glow, rgba(30, 58, 95, 0.08));
}

.pos-date-shortcut-btn.active {
  background: var(--primary-color, #1e3a5f) !important;
  border-color: var(--primary-color, #1e3a5f) !important;
  color: #ffffff !important;
  box-shadow: 0 3px 10px var(--primary-glow, rgba(30, 58, 95, 0.25)) !important;
}

.pos-date-shortcut-btn svg {
  flex-shrink: 0;
  stroke: currentColor;
}

.btn-standard-datepicker-trigger {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  background: #ffffff !important;
  cursor: pointer !important;
  padding: 8px 14px !important;
  color: #0f172a !important;
  height: 40px !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 10px !important;
  font-family: inherit !important;
  font-size: 0.88rem !important;
  text-align: right !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-sizing: border-box !important;
}

.btn-standard-datepicker-trigger:hover {
  border-color: var(--primary-color, #1e3a5f) !important;
  color: var(--primary-color, #1e3a5f) !important;
  background: var(--primary-glow, rgba(30, 58, 95, 0.08)) !important;
}

.btn-standard-datepicker-trigger.active {
  border-color: var(--primary-color, #1e3a5f) !important;
  box-shadow: 0 0 0 3px var(--primary-glow, rgba(30, 58, 95, 0.15)) !important;
}

/* ==========================================================================
   FAST ORDER (POS) DATE PICKER & 50/50 SHORTCUT BUTTONS STYLING (BRAND ORANGE)
   ========================================================================== */
.pos-date-shortcuts-split {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 8px !important;
  width: 100% !important;
  margin-top: 6px !important;
  box-sizing: border-box !important;
}

.pos-date-shortcut-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  height: 38px !important;
  width: 100% !important;
  padding: 0 10px !important;
  background: #ffffff !important;
  border: 1.5px solid #e2e8f0 !important;
  border-radius: 10px !important;
  color: #475569 !important;
  font-family: 'Cairo', sans-serif !important;
  font-size: 0.88rem !important;
  font-weight: 800 !important;
  cursor: pointer !important;
  touch-action: manipulation !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-sizing: border-box !important;
  user-select: none !important;
}

.pos-date-shortcut-btn svg {
  flex-shrink: 0 !important;
  stroke: currentColor !important;
}

.pos-date-shortcut-btn:hover {
  border-color: #f59e0b !important;
  color: #d97706 !important;
  background: rgba(245, 158, 11, 0.08) !important;
  transform: translateY(-1px) !important;
}

.pos-date-shortcut-btn:active {
  transform: scale(0.97) !important;
}

.pos-date-shortcut-btn.active {
  background: linear-gradient(135deg, #f59e0b, #d97706) !important;
  color: #ffffff !important;
  border-color: #d97706 !important;
  font-weight: 900 !important;
  box-shadow: 0 3px 12px rgba(217, 119, 6, 0.35) !important;
}

.pos-date-shortcut-btn.active svg {
  stroke: #ffffff !important;
}

.btn-standard-datepicker-trigger {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  background: #ffffff !important;
  cursor: pointer !important;
  padding: 8px 14px !important;
  color: #0f172a !important;
  height: 40px !important;
  width: 100% !important;
  border: 1.5px solid #e2e8f0 !important;
  border-radius: 10px !important;
  font-family: 'Cairo', sans-serif !important;
  font-size: 0.9rem !important;
  text-align: right !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-sizing: border-box !important;
}

.btn-standard-datepicker-trigger:hover {
  border-color: #f59e0b !important;
  color: #d97706 !important;
  background: rgba(245, 158, 11, 0.04) !important;
}

.btn-standard-datepicker-trigger.active {
  border-color: #f59e0b !important;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2) !important;
}

/* ==========================================================================
   MOBILE ADAPTIVE CARD-VIEW & POS ERGONOMICS (HABIT 15)
   ========================================================================== */

.mobile-orders-cards-grid,
.mobile-products-cards-grid,
.mobile-customers-cards-grid {
  display: none;
}

@media (max-width: 768px) {
  /* Hide heavy desktop multi-column tables on phone screens */
  .desktop-orders-table,
  .desktop-products-table,
  .desktop-customers-table {
    display: none !important;
  }

  /* Show touch-first mobile cards */
  .mobile-orders-cards-grid,
  .mobile-products-cards-grid,
  .mobile-customers-cards-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 10px 4px;
    width: 100%;
    box-sizing: border-box;
  }

  .mobile-empty-card {
    padding: 30px 16px;
    text-align: center;
    color: var(--text-muted, #64748b);
    font-size: 0.92rem;
    font-weight: 700;
  }

  /* --- Mobile Order Card --- */
  .mobile-order-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .mobile-order-card.border-status-pending { border-right: 4px solid #f59e0b; }
  .mobile-order-card.border-status-ready { border-right: 4px solid #3b82f6; }
  .mobile-order-card.border-status-received { border-right: 4px solid #10b981; }
  .mobile-order-card.border-status-cancelled { border-right: 4px solid #ef4444; }

  .mob-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mob-card-id-group {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .mob-card-time {
    font-size: 0.8rem;
    color: #64748b;
    font-weight: 700;
  }

  .mob-card-customer-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8fafc;
    border-radius: 10px;
    padding: 8px 10px;
  }

  .mob-cust-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .mob-cust-name {
    font-size: 0.95rem;
    color: #0f172a;
  }

  .mob-cust-phone {
    font-size: 0.82rem;
    color: #64748b;
  }

  .mob-cust-quick-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mob-action-circle {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    transition: transform 0.15s ease;
  }

  .mob-action-circle.whatsapp-circle {
    background: rgba(37, 211, 102, 0.12);
    color: #25d366;
    border: 1px solid rgba(37, 211, 102, 0.25);
  }

  .mob-action-circle.call-circle {
    background: rgba(59, 130, 246, 0.12);
    color: #2563eb;
    border: 1px solid rgba(59, 130, 246, 0.25);
  }

  .mob-card-items-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .mob-item-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #f1f5f9;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.8rem;
    color: #334155;
  }

  .mob-item-qty {
    font-weight: 800;
    color: #0f172a;
  }

  .mob-item-note {
    color: #d97706;
    font-size: 0.74rem;
  }

  .mob-card-meta-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.8rem;
    color: #64748b;
    border-top: 1px dashed #e2e8f0;
    padding-top: 6px;
  }

  .mob-meta-delivery {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #2563eb;
    font-weight: 700;
  }

  .mob-card-price-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #f1f5f9;
    padding-top: 8px;
  }

  .mob-price-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .mob-price-label {
    font-size: 0.86rem;
    color: #64748b;
    font-weight: 700;
  }

  .mob-price-val {
    font-size: 1.15rem;
    color: var(--primary-color, #d97706);
  }

  .mob-card-footer-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    border-top: 1px solid #f1f5f9;
    padding-top: 10px;
  }

  .mob-status-select {
    flex: 1;
    min-width: 0 !important;
    height: 40px !important;
    font-size: 0.84rem !important;
  }

  .mob-action-buttons-group {
    display: flex;
    gap: 6px;
  }

  .mob-action-buttons-group .btn-table-action {
    height: 40px;
    padding: 0 12px;
    font-size: 0.84rem;
    border-radius: 8px;
  }

  /* --- Mobile Product Card --- */
  .mobile-product-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .mob-prod-main {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .mob-prod-img-box {
    width: 60px;
    height: 60px;
    flex-shrink: 0;
  }

  .mob-prod-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .mob-prod-title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 6px;
  }

  .mob-prod-name {
    font-size: 0.95rem;
    color: #0f172a;
    line-height: 1.3;
  }

  .mob-prod-prices {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .mob-price-pill {
    font-size: 0.78rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 6px;
  }

  .mob-price-pill.regular {
    background: #e7f5ff;
    color: #228be6;
  }

  .mob-price-pill.bulk {
    background: #fff4e6;
    color: #fd7e14;
  }

  .mob-prod-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #f1f5f9;
    padding-top: 8px;
  }

  .mob-avail-switch {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .mob-avail-label {
    font-size: 0.8rem;
    font-weight: 700;
    color: #64748b;
  }

  /* --- Mobile Customer Card --- */
  .mobile-customer-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .mob-cust-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }

  .mob-cust-card-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .mob-cust-stats-row {
    display: flex;
    gap: 14px;
    background: #f8fafc;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 0.82rem;
  }

  .mob-cust-stat {
    display: flex;
    gap: 4px;
  }

  .mob-cust-stat .stat-lbl {
    color: #64748b;
  }

  .mob-cust-card-actions {
    display: flex;
    gap: 8px;
    border-top: 1px solid #f1f5f9;
    padding-top: 8px;
  }

  .mob-cust-card-actions .cust-btn {
    flex: 1;
    justify-content: center;
    height: 38px;
    font-size: 0.84rem;
  }

  /* Adaptive Bottom-Sheet Modals on Mobile */
  .modal-overlay {
    align-items: flex-end !important;
    padding: 0 !important;
  }

  .modal-box,
  .modal-content {
    width: 100% !important;
    max-width: 100% !important;
    max-height: 92vh !important;
    border-radius: 20px 20px 0 0 !important;
    padding: 20px 16px !important;
    margin: 0 !important;
    animation: slideUpMobile 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }

  @keyframes slideUpMobile {
    0% { transform: translateY(100%); }
    100% { transform: translateY(0); }
  }
}

/* ==========================================================================
   MOBILE CONTROLS & DATEPICKER OVERFLOW FIX
   ========================================================================== */

@media (max-width: 768px) {
  /* Prevent any toolbar or filter container from overflowing horizontally */
  .card-toolbar,
  .card-toolbar-split,
  .orders-toolbar-container,
  .card-toolbar-top,
  .card-toolbar-bottom,
  .orders-search-print-row,
  .orders-filters-row,
  .card-toolbar-split .card-toolbar-bottom,
  .filters-inline,
  .date-range-bar,
  .analytics-header-actions,
  .cust-date-range-group {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    width: 100% !important;
    max-width: 100% !important;
    gap: 8px !important;
    box-sizing: border-box !important;
  }

  .card-toolbar-top {
    flex-direction: row !important;
    justify-content: space-between !important;
    align-items: center !important;
    flex-wrap: wrap !important;
  }

  .toolbar-title-group {
    margin-bottom: 2px !important;
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
    box-sizing: border-box !important;
  }

  .order-status-select,
  .select-pill,
  select.form-control {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .btn-datepicker-trigger,
  .btn-standard-datepicker-trigger,
  .btn-range-trigger {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
    justify-content: space-between !important;
  }

  .btn-make-order,
  .reconciliation-print-btn,
  .card-toolbar-top .btn-primary {
    width: 100% !important;
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
    height: 38px !important;
    font-size: 0.85rem !important;
    box-sizing: border-box !important;
  }

  .selected-date-badge {
    width: 100% !important;
    max-width: 100% !important;
    justify-content: space-between !important;
    box-sizing: border-box !important;
    margin-top: 2px !important;
  }

  .table-card {
    padding: 12px 10px !important;
    border-radius: 14px !important;
    box-sizing: border-box !important;
    width: 100% !important;
    max-width: 100% !important;
    overflow: hidden !important;
  }
}

@media (max-width: 640px) {
  /* Center DatePicker Popover as a clean modal on mobile viewports */
  .datepicker-popover {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    right: auto !important;
    bottom: auto !important;
    transform: translate(-50%, -50%) !important;
    width: calc(100vw - 32px) !important;
    max-width: 320px !important;
    z-index: 99999 !important;
    box-shadow: 0 25px 60px rgba(15, 23, 42, 0.4) !important;
    border: 1px solid rgba(226, 232, 240, 0.9) !important;
    border-radius: 20px !important;
    box-sizing: border-box !important;
    animation: datePickerModalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }

  @keyframes datePickerModalPop {
    0% { transform: translate(-50%, -46%) scale(0.95); opacity: 0; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  }

  .autocomplete-suggestions-dropdown {
    width: 100% !important;
    max-width: 100% !important;
    left: 0 !important;
    right: 0 !important;
    box-sizing: border-box !important;
  }
}


/* ==========================================================================
   CUSTOMER PASSWORD & SECURITY CARD STYLES
   ========================================================================== */

.profile-security-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px 14px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.security-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.security-title-group {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #1e293b;
  font-size: 0.9rem;
}

.badge-status-active {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.25);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 800;
}

.badge-status-inactive {
  background: rgba(100, 116, 139, 0.12);
  color: #64748b;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 700;
}

.password-display-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 8px 12px;
}

.password-value {
  font-size: 1.05rem;
  color: #0f172a;
  letter-spacing: 1px;
}

.password-actions-inline {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-pass-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-pass-action:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #94a3b8;
}

.btn-pass-action.btn-pass-toggle {
  padding: 5px 8px;
}

.password-empty-box {
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.82rem;
  line-height: 1.4;
}

.input-with-action-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-action-wrapper .form-control {
  padding-left: 42px !important;
}

.input-action-btn {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: color 0.15s ease;
}

.input-action-btn:hover {
  color: #0f172a;
}

.cust-password-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(99, 102, 241, 0.08);
  color: #4f46e5;
  border: 1px solid rgba(99, 102, 241, 0.2);
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cust-password-pill:hover {
  background: rgba(99, 102, 241, 0.15);
  border-color: #4f46e5;
}

.cust-password-pill.empty {
  background: #f1f5f9;
  color: #94a3b8;
  border-color: #e2e8f0;
  font-size: 0.78rem;
  font-weight: 600;
}

.cust-pass-dot-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.15);
  color: #4f46e5;
}


/* ==========================================================================
   CUSTOMER DEBT REPORT PRINT STYLES (HABIT 17)
   ========================================================================== */

.cust-debt-print-btn {
  height: 38px !important;
  padding: 0 14px !important;
  border-radius: 10px !important;
  font-size: 0.88rem !important;
  font-weight: 700 !important;
  white-space: nowrap !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  border: 1.5px solid #cbd5e1 !important;
  background: #ffffff !important;
  color: #0f172a !important;
  transition: all 0.2s ease !important;
}

.cust-debt-print-btn:hover {
  border-color: #f59e0b !important;
  color: #d97706 !important;
  background: rgba(245, 158, 11, 0.05) !important;
}

.print-debt-report-wrapper {
  display: none;
}

@page debtReport {
  size: A4 portrait;
  margin: 0 !important;
}

@media print {
  .print-debt-report-wrapper, .print-debt-report-wrapper * {
    visibility: visible;
  }

  .print-debt-report-wrapper {
    display: block !important;
    position: relative;
    width: 100%;
    background: #ffffff;
  }

  .debt-report-page {
    page: debtReport;
    padding: 8mm 10mm;
    box-sizing: border-box;
    font-family: 'Cairo', sans-serif;
  }

  .debt-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .debt-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .debt-logo {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    object-fit: cover;
  }

  .debt-shop-name {
    font-size: 15pt;
    font-weight: 900;
    color: #0f172a;
    margin: 0;
  }

  .debt-subtitle {
    font-size: 9.5pt;
    font-weight: 700;
    color: #64748b;
    margin: 2px 0 0 0;
  }

  .debt-header-badge {
    font-size: 9.5pt;
    font-weight: 800;
    color: #0f172a;
    border: 1.5px solid #0f172a;
    padding: 4px 10px;
    border-radius: 8px;
  }

  .debt-divider {
    height: 2px;
    background: #0f172a;
    margin: 8px 0;
  }

  .debt-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 8.5pt;
    margin-bottom: 10px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .debt-meta-label {
    font-weight: 700;
    color: #64748b;
    margin-left: 6px;
  }

  .debt-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }

  .debt-kpi-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 6px 8px;
    text-align: center;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .debt-kpi-card.highlight-green {
    background: #f0fdf4 !important;
    border-color: #86efac !important;
  }

  .debt-kpi-card.highlight-debt {
    background: #fef2f2 !important;
    border-color: #fca5a5 !important;
  }

  .debt-kpi-label {
    font-size: 7.8pt;
    font-weight: 750;
    color: #475569;
    display: block;
    margin-bottom: 2px;
  }

  .debt-kpi-val {
    font-size: 11pt;
    font-weight: 900;
  }

  .debt-report-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.8pt;
    margin-bottom: 14px;
  }

  .debt-report-table th {
    background: #1e293b !important;
    color: #ffffff !important;
    font-weight: 800;
    padding: 6px 8px;
    text-align: right;
    border: 1px solid #0f172a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .debt-report-table td {
    padding: 5px 8px;
    border: 1px solid #cbd5e1;
    vertical-align: middle;
  }

  .debt-report-table tbody tr:nth-child(even) {
    background: #f8fafc;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .debt-report-table tr.has-debt-row {
    background: #fff5f5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .debt-cust-cell {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .debt-cust-name {
    font-size: 9pt;
    color: #0f172a;
  }

  .debt-cust-phone {
    font-size: 7.8pt;
  }

  .debt-val-pill {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 6px;
    font-size: 8.5pt;
  }

  .debt-val-pill.is-debt {
    color: #dc2626;
    background: rgba(220, 38, 38, 0.1);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .debt-val-pill.is-clear {
    color: #16a34a;
    background: rgba(22, 163, 74, 0.1);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .debt-grand-total-row td {
    background: #f1f5f9 !important;
    font-size: 9.5pt;
    padding: 8px;
    border-top: 2px solid #0f172a !important;
    border-bottom: 2px solid #0f172a !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .debt-report-footer {
    display: flex;
    justify-content: space-between;
    margin-top: 14px;
    padding-top: 10px;
    page-break-inside: avoid;
  }

  .debt-signature-block, .debt-stamp-block {
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-size: 9pt;
    font-weight: 750;
    color: #334155;
  }

  .debt-watermark-row {
    margin-top: 14px;
    text-align: center;
    font-size: 7.5pt;
    color: #94a3b8;
    border-top: 1px dashed #cbd5e1;
    padding-top: 6px;
    page-break-inside: avoid;
  }
}


/* ==========================================================================
   PRODUCTION MANAGEMENT & CHEFS TAB STYLES
   ========================================================================== */

.production-nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 14px;
  flex-wrap: wrap;
  gap: 12px;
}

.production-tabs-pills {
  display: flex;
  gap: 8px;
  background: rgba(15, 23, 42, 0.05);
  padding: 4px;
  border-radius: 10px;
}

.prod-tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #64748b;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.2s ease;
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

.chefs-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.chef-card {
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: all 0.2s ease;
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.chef-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
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
}

.chef-avatar.sm {
  width: 38px;
  height: 38px;
  font-size: 1rem;
  border-radius: 10px;
}

.chef-details {
  flex: 1;
}

.chef-name {
  font-size: 1.05rem;
  margin: 0 0 4px 0;
  color: #0f172a;
}

.chef-phone-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chef-phone {
  font-size: 0.82rem;
  color: #64748b;
}

.chef-quick-actions {
  display: flex;
  gap: 4px;
}

.chef-icon-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
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
  background: rgba(248, 250, 252, 0.8);
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

.assigned-count-pill {
  font-size: 0.75rem;
  font-weight: 800;
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
  padding: 2px 8px;
  border-radius: 8px;
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

.btn-chef-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.15s ease;
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
}

.btn-chef-action.btn-chef-edit:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.btn-chef-action.btn-chef-delete {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.btn-chef-action.btn-chef-delete:hover {
  background: #ef4444;
  color: #ffffff;
}

/* Assign Products Modal Grid */
.assign-products-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  max-height: 420px;
  overflow-y: auto;
  padding: 4px;
}

.assign-product-card {
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.assign-product-card:hover {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.04);
}

.assign-product-card.is-selected {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.assign-prod-img {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
}

.assign-prod-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.assign-prod-title {
  font-size: 0.86rem;
  color: #0f172a;
  line-height: 1.2;
}

.assign-prod-cat {
  font-size: 0.74rem;
}

.assign-prod-price {
  font-size: 0.8rem;
}

/* Chef Report Section */
.chef-report-card {
  border-radius: 14px;
  padding: 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.chef-report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
}

.chef-header-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chef-header-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stat-pill {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-pill .label {
  color: #64748b;
}

.sub-table {
  font-size: 0.88rem;
}

.sub-table th {
  background: #f8fafc;
  font-size: 0.82rem;
}

.print-production-report-wrapper {
  display: none;
}

@page productionReport {
  size: A4 portrait;
  margin: 0 !important;
}

@media print {
  .print-production-report-wrapper, .print-production-report-wrapper * {
    visibility: visible;
  }

  .print-production-report-wrapper {
    display: block !important;
    position: relative;
    width: 100%;
    background: #ffffff;
  }

  .production-report-page {
    page: productionReport;
    padding: 8mm 10mm;
    box-sizing: border-box;
    font-family: 'Cairo', sans-serif;
  }
}


/* ==========================================================================
   REFINED MODAL SPACING & CRAMMING ADJUSTMENTS (HABIT 15)
   ========================================================================== */

.modal-title-icon-chef {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.25));
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #d97706;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chef-status-switch-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 16px;
}

.assign-products-modal-box {
  max-width: 840px !important;
}

.assign-toolbar-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.assign-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-bulk-pick {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 6px 12px;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 750;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-bulk-pick:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #94a3b8;
}

.selected-counter-badge {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 0.82rem;
  font-weight: 750;
}

.assign-products-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
  max-height: 52vh;
  overflow-y: auto;
  padding: 6px;
}

.assign-product-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  user-select: none;
}

.assign-product-card:hover {
  border-color: #f59e0b;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
}

.assign-product-card.is-selected {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.07);
  box-shadow: 0 0 0 1px #f59e0b;
}

.card-selection-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid #cbd5e1;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  transition: all 0.15s ease;
}

.assign-product-card.is-selected .card-selection-check {
  background: #f59e0b;
  border-color: #f59e0b;
}

.assign-prod-img {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid #f1f5f9;
  flex-shrink: 0;
}

.assign-prod-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.assign-prod-title {
  font-size: 0.92rem;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.assign-prod-cat-pill {
  font-size: 0.74rem;
  color: #64748b;
  background: #f1f5f9;
  padding: 1px 6px;
  border-radius: 4px;
  width: fit-content;
}

.assign-prod-price {
  font-size: 0.84rem;
  color: #d97706;
}

@media (max-width: 640px) {
  .assign-products-picker-grid {
    grid-template-columns: 1fr;
    max-height: 48vh;
  }
}

</style>
