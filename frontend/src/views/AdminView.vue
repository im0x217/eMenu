<template>
  <div class="admin-layout" :class="'shop-theme-' + activeShop">
    <!-- Spinner overlay -->
    <div v-if="loading" class="spinner-overlay">
      <div class="spinner"></div>
      <p class="spinner-text">جاري تحميل البيانات...</p>
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
            <label>اسم المستخدم</label>
            <input v-model="loginForm.username" type="text" required placeholder="أدخل اسم المستخدم" class="form-control" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="username" />
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
          <button class="menu-item" :class="{ active: activeTab === 'orders' }" @click="setTab('orders')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <span>إدارة الطلبات</span>
          </button>
          <button class="menu-item" :class="{ active: activeTab === 'customers' }" @click="setTab('customers')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>العملاء والمفضلات</span>
          </button>
          <button class="menu-item" :class="{ active: activeTab === 'images' }" @click="setTab('images')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <span>إصلاح الصور التالفة</span>
          </button>
          <button class="menu-item" :class="{ active: activeTab === 'carousel' }" @click="setTab('carousel')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="21" y1="12" x2="3" y2="12"></line><line x1="12" y1="3" x2="12" y2="21"></line></svg>
            <span>البنرات التسويقية</span>
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

        <!-- Custom Date Range Form -->
        <div v-if="activeTab === 'analytics' && analyticsPeriod === 'custom'" class="custom-date-container glass-panel no-print mb-4 animate-fade-in">
          <div class="date-picker-row">
            <div class="date-input-group">
              <label>تاريخ البدء:</label>
              <input v-model="analyticsStartDate" type="date" class="form-control" />
            </div>
            <div class="date-input-group">
              <label>تاريخ الانتهاء:</label>
              <input v-model="analyticsEndDate" type="date" class="form-control" />
            </div>
            <button @click="fetchAnalytics" class="btn btn-primary btn-apply">تطبيق الفلتر</button>
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
                  <span class="kpi-value">{{ analyticsData.kpi.orderCount }} طلب</span>
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
                  <span class="kpi-value">{{ analyticsData.kpi.activeCustomers }} عميل</span>
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
                      <span class="val">{{ formatCurrency(analyticsData.priceModeSplit.regular.revenue) }} ({{ analyticsData.priceModeSplit.regular.count }} طلب)</span>
                    </div>
                    <div class="legend-row mt-2">
                      <span class="dot dot-bulk"></span>
                      <span class="label">بيع بالجملة:</span>
                      <span class="val">{{ formatCurrency(analyticsData.priceModeSplit.bulk.revenue) }} ({{ analyticsData.priceModeSplit.bulk.count }} طلب)</span>
                    </div>
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
                      <span class="cat-val">{{ formatCurrency(cat.revenue) }} ({{ cat.count }} مبيعات)</span>
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
                  <div v-if="analyticsData.topFavorites.length === 0" class="empty-list">لا توجد تفضيلات بعد.</div>
                  <div v-for="(fav, idx) in analyticsData.topFavorites" :key="idx" class="list-item-row">
                    <div class="list-badge">{{ idx + 1 }}</div>
                    <div class="list-item-info">
                      <span class="title">{{ fav.name }}</span>
                      <span class="subtitle">تم التفضيل بواسطة {{ fav.count }} عميل</span>
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
                      <tr v-if="analyticsData.topProducts.length === 0">
                        <td colspan="3" class="text-center">لا توجد منتجات مباعة.</td>
                      </tr>
                      <tr v-for="prod in analyticsData.topProducts" :key="prod.productId">
                        <td>{{ prod.name }}</td>
                        <td>{{ prod.quantity }} وحدة</td>
                        <td>{{ formatCurrency(prod.revenue) }}</td>
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
                        <td>{{ cust.phone }}</td>
                        <td class="text-semibold">{{ formatCurrency(cust.totalSpent) }}</td>
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
                      <tr v-if="analyticsData.lowPerformingProducts.length === 0">
                        <td colspan="3" class="text-center">لا توجد منتجات خاملة، كل المنتجات تحقق مبيعات!</td>
                      </tr>
                      <tr v-for="prod in analyticsData.lowPerformingProducts" :key="prod.productId">
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
            <!-- Filter Bar -->
            <div class="filter-actions-bar glass-panel mb-3">
              <div class="filters-group">
                <input v-model="filters.search" type="text" placeholder="البحث عن منتج..." class="form-control" />
                <select v-model="filters.category" class="form-control">
                  <option value="">كل الأصناف</option>
                  <option v-for="cat in categories" :key="cat._id" :value="cat.name">{{ cat.name }}</option>
                </select>
                <select v-if="availableSubcategories.length > 0" v-model="filters.subCategory" class="form-control animate-fade-in">
                  <option value="">كل الأصناف الفرعية</option>
                  <option v-for="sub in availableSubcategories" :key="sub" :value="sub">{{ sub }}</option>
                </select>
              </div>
              <button @click="openProductModal()" class="btn btn-primary">إضافة منتج جديد</button>
            </div>

            <!-- Products Table -->
            <div class="table-card glass-panel">
              <div class="table-container">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>الصورة</th>
                      <th>الاسم</th>
                      <th>الصنف</th>
                      <th>السعر مفرد</th>
                      <th>السعر جملة</th>
                      <th>نوع البيع</th>
                      <th>حالة التوفر</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="filteredProducts.length === 0">
                      <td colspan="8" class="text-center">لا توجد منتجات مطابقة لخيارات التصفية.</td>
                    </tr>
                    <tr v-for="prod in filteredProducts" :key="prod._id">
                      <td>
                        <img :src="prod.img || (activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg')" class="table-prod-img" @click="zoomImage(prod.img)" />
                      </td>
                      <td class="text-bold">{{ prod.name }}</td>
                      <td>
                        {{ prod.category }}
                        <span v-if="prod.subCategory" class="badge-sub">{{ prod.subCategory }}</span>
                      </td>
                      <td>{{ prod.price_regular ? formatCurrency(prod.price_regular) : '-' }}</td>
                      <td>{{ prod.price_bulk ? formatCurrency(prod.price_bulk) : '-' }}</td>
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
              </div>
            </div>
          </div>

          <!-- CATEGORIES CRUD TAB -->
          <div v-if="activeTab === 'categories'" class="categories-tab-content">
            <div class="filter-actions-bar glass-panel mb-3 text-left">
              <button @click="openCategoryModal()" class="btn btn-primary">إضافة صنف جديد</button>
            </div>

            <div class="table-card glass-panel">
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
                      <td class="text-center text-large">{{ cat.emoji || '📂' }}</td>
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

          <!-- IMAGE RECOVERY TAB -->
          <div v-if="activeTab === 'images'" class="images-tab-content">
            <div class="glass-panel text-center p-5 animate-fade-in">
              <div class="recovery-box">
                <svg class="recovery-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <h2>أداة إصلاح الصور التالفة أو المفقودة</h2>
                <p class="text-muted">إذا تم حذف الصور القديمة، يمكنك إرفاق صور جديدة للمنتجات مباشرة هنا.</p>
                
                <div class="recovery-form mt-4">
                  <div class="form-group">
                    <label>اختر المنتج المراد إصلاح صورته</label>
                    <select v-model="recoveryProductId" class="form-control max-w-md mx-auto">
                      <option value="">اختر المنتج...</option>
                      <option v-for="prod in products" :key="prod._id" :value="prod._id">
                        {{ prod.name }} ({{ prod.category }}) {{ !prod.img ? '[مفقودة]' : '' }}
                      </option>
                    </select>
                  </div>

                  <div class="image-dropzone max-w-md mx-auto mt-3" 
                       :class="{ active: dragActive }" 
                       @dragover.prevent="dragActive = true"
                       @dragleave.prevent="dragActive = false"
                       @drop.prevent="handleImageDrop($event)"
                       @click="triggerImageSelect">
                    <input type="file" ref="recoveryFileInput" class="hidden-file-input" accept="image/*" @change="handleImageFileSelect" />
                    
                    <div v-if="!recoveryFile" class="dropzone-prompt">
                      <svg class="cloud-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      <span>اسحب الصورة هنا أو اضغط للتصفح</span>
                    </div>
                    <div v-else class="dropzone-preview">
                      <img :src="recoveryFilePreview" alt="Preview" />
                      <span class="file-name">{{ recoveryFile.name }}</span>
                    </div>
                  </div>

                  <button @click="uploadRecoveryImage" :disabled="!recoveryProductId || !recoveryFile" class="btn btn-primary mt-4">
                    رفع وحفظ الصورة الجديدة
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- MARKETING CAROUSEL TAB -->
          <div v-if="activeTab === 'carousel'" class="carousel-tab-content animate-fade-in">
            <div class="filter-actions-bar glass-panel mb-3">
              <div class="filters-group">
                <span class="text-bold text-primary">إجمالي البنرات المضافة: {{ carouselItems.length }}</span>
              </div>
              <button @click="openCarouselModal()" class="btn btn-primary">إضافة بنر جديد</button>
            </div>

            <!-- Carousel Items Grid -->
            <div v-if="carouselItems.length > 0" class="carousel-grid mt-3">
              <div v-for="item in carouselItems" :key="item._id" class="carousel-admin-card glass-panel animate-scale-in">
                <div class="card-image-wrapper">
                  <img :src="item.image" alt="Banner Preview" class="card-image" />
                </div>
                <div class="card-info-bar">
                  <span class="card-date">تاريخ الإضافة: {{ new Date(item.createdAt).toLocaleDateString('ar-LY') }}</span>
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
            <div v-else class="glass-panel text-center p-5 text-muted">
              لا توجد بنرات عروض تسويقية مضافة حالياً. اضغط على زر "إضافة بنر جديد" للبدء.
            </div>
          </div>

          <!-- ORDERS MANAGEMENT TAB -->
          <div v-if="activeTab === 'orders'" class="orders-tab-content animate-fade-in">
            <div class="filter-actions-bar glass-panel mb-3">
              <div class="filters-group">
                <input v-model="orderFilters.search" type="text" placeholder="البحث برقم الهاتف أو الاسم..." class="form-control" />
                <select v-model="orderFilters.status" class="form-control">
                  <option value="">كل الحالات</option>
                  <option value="pending">قيد الانتظار (Pending)</option>
                  <option value="processing">جاري المعالجة (Processing)</option>
                  <option value="completed">مكتمل (Completed)</option>
                  <option value="cancelled">ملغي (Cancelled)</option>
                </select>
                <select v-model="orderFilters.dateRange" class="form-control">
                  <option value="all">كل الأوقات</option>
                  <option value="today">اليوم</option>
                  <option value="yesterday">أمس</option>
                  <option value="7d">آخر 7 أيام</option>
                  <option value="30d">آخر 30 يوم</option>
                </select>
              </div>
            </div>

            <div class="glass-panel p-0 table-card overflow-hidden">
              <div class="table-container">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>رقم الطلب</th>
                      <th>تاريخ الطلب</th>
                      <th>العميل</th>
                      <th>المنتجات المطلوبة</th>
                      <th>المجموع</th>
                      <th>نوع السعر</th>
                      <th>الحالة</th>
</tr>
                  </thead>
                  <tbody>
                    <tr v-if="filteredOrders.length === 0">
                      <td colspan="8" class="text-center p-4">لا توجد طلبات متطابقة.</td>
                    </tr>
                    <tr v-for="order in filteredOrders" :key="order._id">
                      <td class="text-bold">#{{ order._id.toString().slice(-6) }}</td>
                      <td>{{ new Date(order.createdAt).toLocaleString('ar-LY') }}</td>
                      <td>
                        <div class="customer-info-cell">
                          <span class="name block text-bold">{{ order.customerInfo.name }}</span>
                          <span class="phone text-muted block">{{ order.customerInfo.phone }}</span>
                        </div>
                      </td>
                      <td>
                        <div class="items-list-cell">
                          <div v-for="(item, idx) in order.items" :key="idx" class="item-line">
                            {{ item.name }} × {{ item.quantity }}
                            <span v-if="item.notes" class="item-note">({{ item.notes }})</span>
                          </div>
                        </div>
                      </td>
                      <td class="text-bold text-primary">{{ formatCurrency(order.totalPrice) }}</td>
                      <td>
                        <span class="price-mode-badge" :class="order.priceMode">
                          {{ order.priceMode === 'bulk' ? 'جملة' : 'مفرد' }}
                        </span>
                      </td>
                      <td>
                        <select :value="order.status" @change="updateOrderStatus(order._id, $event.target.value)" class="form-control status-select" :class="'status-' + order.status">
                          <option value="pending">قيد الانتظار</option>
                          <option value="processing">جاري المعالجة</option>
                          <option value="completed">مكتمل</option>
                          <option value="cancelled">ملغي</option>
                        </select>
                      </td>
                      <td>
                        <button @click="openOrderEditModal(order)" class="btn btn-outline btn-xs">تعديل</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

    <!-- Order Edit Modal -->
    <div v-if="orderEditModalOpen" class="modal-overlay animate-fade-in">
      <div class="modal-content glass-panel" style="width: 95%; max-width: 950px; padding: 30px;">
        <div class="modal-header">
          <h3>تعديل محتويات الطلب #{{ editingOrder._id.toString().slice(-6) }}</h3>
          <button @click="orderEditModalOpen = false" class="modal-close-btn">✕</button>
        </div>
        <form @submit.prevent="saveOrder">
          <div v-if="editingOrder.notes" class="order-notes-static-display mb-3">
            <strong>ملاحظات العميل:</strong> {{ editingOrder.notes }}
          </div>

          <div class="form-group">
            <div class="order-items-header mb-3">
              <span class="section-title">إدارة محتويات الطلب</span>
              <div class="product-search-autocomplete-container">
                <input 
                  v-model="productSearchQuery" 
                  type="text" 
                  class="form-control product-search-input" 
                  placeholder="🔍 ابحث باسم منتج لإضافته مباشرة للطلب..." 
                  @focus="showSuggestions = productSearchQuery.length > 0"
                  @blur="closeSuggestionsWithDelay"
                  @keydown.down.prevent="navigateSuggestions(1)"
                  @keydown.up.prevent="navigateSuggestions(-1)"
                  @keydown.enter.prevent="selectHighlightedSuggestion"
                />
                <div v-if="showSuggestions" class="autocomplete-suggestions-dropdown">
                  <div 
                    v-for="(prod, index) in filteredSuggestions" 
                    :key="prod._id" 
                    class="suggestion-item"
                    :class="{ highlighted: index === highlightedSuggestionIndex }"
                    @mousedown="addSelectedProduct(prod)"
                  >
                    <img :src="prod.img" alt="" class="suggestion-img" v-if="prod.img" />
                    <div class="suggestion-info">
                      <span class="suggestion-name">{{ prod.name }}</span>
                      <span class="suggestion-category">{{ prod.category }}</span>
                    </div>
                    <span class="suggestion-price">
                      {{ editingOrder.priceMode === 'bulk' ? (prod.price_bulk || prod.price) : (prod.price_regular || prod.price) }} د.ل
                    </span>
                  </div>
                  <div v-if="filteredSuggestions.length === 0" class="suggestion-no-results">
                    لا توجد نتائج مطابقة
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
                        <span v-if="item.productId" class="db-product-name" title="منتج مسجل بالمنظومة">✓ {{ item.name }}</span>
                        <input v-else v-model="item.name" type="text" class="form-control edit-custom-name-input" placeholder="اسم منتج مخصص" required />
                        <div v-if="item.notes" class="order-item-static-note" title="ملاحظة الزبون">
                          * {{ item.notes }}
                        </div>
                      </div>
                    </td>
                    <td style="max-width: 120px;">
                      <div class="edit-qty-input-wrapper">
                        <input v-model.number="item.quantity" type="number" step="0.01" min="0.01" class="form-control edit-qty-input" placeholder="الكمية" required @input="recalcOrderTotal" />
                      </div>
                    </td>
                    <td style="max-width: 140px;">
                      <div class="edit-price-input-wrapper">
                        <input v-model.number="item.price" type="number" step="0.01" min="0" class="form-control edit-price-input" placeholder="السعر" required @input="recalcOrderTotal" />
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
            <button type="submit" class="btn btn-primary">حفظ التعديلات</button>
            <button type="button" @click="orderEditModalOpen = false" class="btn btn-outline">إلغاء</button>
          </div>
        </form>
      </div>
    </div>

          <!-- CUSTOMERS MANAGEMENT TAB -->
          <div v-if="activeTab === 'customers'" class="customers-tab-content animate-fade-in">
            <div class="filter-actions-bar glass-panel mb-3">
              <div class="filters-group">
                <input v-model="customerFilters.search" type="text" placeholder="البحث عن اسم أو رقم هاتف..." class="form-control" />
              </div>
            </div>

            <div class="glass-panel p-0 table-card overflow-hidden">
              <div class="table-container">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>الاسم</th>
                      <th>رقم الهاتف</th>
                      <th>تاريخ التسجيل</th>
                      <th>آخر نشاط</th>
                      <th>إجمالي الطلبات</th>
                      <th>إجمالي الإنفاق</th>
                      <th>خيارات</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="filteredCustomers.length === 0">
                      <td colspan="7" class="text-center p-4">لا توجد سجلات عملاء متطابقة.</td>
                    </tr>
                    <tr v-for="cust in filteredCustomers" :key="cust._id">
                      <td class="text-bold">{{ cust.name }}</td>
                      <td>{{ cust.phone }}</td>
                      <td>{{ cust.createdAt ? new Date(cust.createdAt).toLocaleDateString('ar-LY') : 'غير متوفر' }}</td>
                      <td>{{ cust.lastActive ? new Date(cust.lastActive).toLocaleString('ar-LY') : 'غير متوفر' }}</td>
                      <td>{{ cust.orderCount }} طلبات</td>
                      <td class="text-bold text-primary">{{ formatCurrency(cust.totalSpent) }}</td>
                      <td>
                        <div class="actions-buttons-cell">
                          <button @click="openCustomerEditModal(cust)" class="btn btn-outline btn-xs ml-1">تعديل</button>
                          <button @click="deleteCustomer(cust._id)" class="btn btn-outline btn-xs ml-1" style="color: #ef4444; border-color: #fca5a5;">حذف كلي</button>
                          <button @click="openCustomerFavsModal(cust)" class="btn btn-outline btn-xs" :disabled="!cust.favorites || !cust.favorites.length">المفضلة</button>
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

    <!-- Product Modal Form -->
    <div v-if="productModalOpen" class="modal-overlay animate-fade-in">
      <div class="modal-box glass-panel max-w-lg">
        <div class="modal-header">
          <h3>{{ editingProduct._id ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد' }}</h3>
          <button @click="productModalOpen = false" class="modal-close-btn">&times;</button>
        </div>
        <form @submit.prevent="saveProduct" class="modal-form">
          <div class="form-group">
            <label>اسم المنتج *</label>
            <input v-model="editingProduct.name" type="text" required class="form-control" />
          </div>

          <div class="form-group">
            <label>الوصف</label>
            <textarea v-model="editingProduct.desc" rows="2" class="form-control"></textarea>
          </div>

          <div class="form-group-row">
            <div class="form-group">
              <label>الصنف الرئيسي *</label>
              <select v-model="editingProduct.category" @change="onProductCategoryChange" required class="form-control">
                <option value="">اختر الصنف...</option>
                <option v-for="cat in categories" :key="cat._id" :value="cat.name">{{ cat.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>الصنف الفرعي</label>
              <select v-model="editingProduct.subCategory" :disabled="!subCategoriesForEditing.length" class="form-control">
                <option value="">لا يوجد صنف فرعي</option>
                <option v-for="sub in subCategoriesForEditing" :key="sub" :value="sub">{{ sub }}</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>طريقة البيع والتسعير</label>
            <div class="purchase-type-radios">
              <label class="radio-label">
                <input type="radio" value="both" v-model="editingProduct.purchaseType" />
                <span>كلاهما (مفرد + جملة)</span>
              </label>
              <label class="radio-label">
                <input type="radio" value="regular" v-model="editingProduct.purchaseType" />
                <span>مفرد فقط</span>
              </label>
              <label class="radio-label">
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
          </div>

          <div class="form-group checkbox-group">
            <input type="checkbox" id="modal-allow-float" v-model="editingProduct.allowFloat" />
            <label for="modal-allow-float">يسمح بالكميات الكسرية (مثل: 0.5 كجم)</label>
          </div>

          <div class="form-group">
            <label>صورة المنتج</label>
            <div class="image-dropzone" 
                 :class="{ active: modalDragActive }" 
                 @dragover.prevent="modalDragActive = true"
                 @dragleave.prevent="modalDragActive = false"
                 @drop.prevent="handleModalImageDrop($event)"
                 @click="triggerModalImageSelect">
              <input type="file" ref="modalFileInput" class="hidden-file-input" accept="image/*" @change="handleModalImageFileSelect" />
              
              <div v-if="!modalFile && !editingProduct.img" class="dropzone-prompt">
                <svg viewBox="0 0 24 24" class="cloud-icon" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <span>اسحب الصورة هنا أو اضغط للتصفح</span>
              </div>
              <div v-else class="dropzone-preview">
                <img :src="modalFilePreview || editingProduct.img" alt="Product" />
                <span class="file-name">{{ modalFile ? modalFile.name : 'الصورة الحالية' }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer mt-4">
            <button type="submit" class="btn btn-primary">حفظ المنتج</button>
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

          <div class="form-group">
            <label>الرمز التعبيري (Emoji) *</label>
            <input v-model="editingCategory.emoji" type="text" required placeholder="مثال: 🍰" class="form-control" />
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

    <!-- Customer Modal Form -->
    <div v-if="customerModalOpen" class="modal-overlay animate-fade-in">
      <div class="modal-box glass-panel max-w-md">
        <div class="modal-header">
          <h3>تعديل بيانات العميل</h3>
          <button @click="customerModalOpen = false" class="modal-close-btn">&times;</button>
        </div>
        <form @submit.prevent="saveCustomerDetails" class="modal-form">
          <div class="form-group">
            <label>اسم العميل *</label>
            <input v-model="editingCustomer.name" type="text" required class="form-control" />
          </div>

          <div class="form-group">
            <label>رقم الهاتف *</label>
            <input v-model="editingCustomer.phone" type="text" required class="form-control" />
          </div>

          <div class="modal-footer mt-4">
            <button type="submit" class="btn btn-primary" :disabled="loading">حفظ التغييرات</button>
            <button type="button" @click="customerModalOpen = false" class="btn btn-outline">إلغاء</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Customer Favorites Modal -->
    <div v-if="customerFavsModalOpen" class="modal-overlay animate-fade-in">
      <div class="modal-box glass-panel max-w-4xl">
        <div class="modal-header">
          <h3>المنتجات المفضلة للعميل</h3>
          <button @click="customerFavsModalOpen = false" class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body py-3">
          <div v-if="viewingCustomer" class="customer-favs-meta mb-3 pb-2" style="border-bottom: 1px dashed #dee2e6;">
            <span class="text-bold text-dark">العميل:</span> {{ viewingCustomer.name }}
            <span class="mx-2">|</span>
            <span class="text-bold text-dark">الهاتف:</span> <span style="direction: ltr; display: inline-block;">{{ viewingCustomer.phone }}</span>
            <span class="mx-2">|</span>
            <span class="text-bold text-dark">إجمالي المنتجات المفضلة:</span> {{ viewingCustomerFavs.length }}
          </div>
          
          <div v-if="viewingCustomerFavs.length > 0" class="fav-grid-brows">
            <div v-for="prod in viewingCustomerFavs" :key="prod._id" class="fav-grid-card glass-panel animate-scale-in">
              <div class="fav-card-image-wrapper">
                <img :src="prod.img || (activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg')" class="fav-card-image" />
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
              </div>
            </div>
          </div>
          <p v-else class="text-center text-muted py-5">لا توجد تفضيلات مسجلة لهذا العميل.</p>
        </div>
        <div class="modal-footer mt-2">
          <button type="button" @click="customerFavsModalOpen = false" class="btn btn-outline w-100">إغلاق</button>
        </div>
      </div>
    </div>

    <!-- Marketing Carousel Modal Form -->
    <div v-if="carouselModalOpen" class="modal-overlay animate-fade-in">
      <div class="modal-box glass-panel max-w-md">
        <div class="modal-header">
          <h3>إضافة بنر إعلاني جديد</h3>
          <button @click="carouselModalOpen = false" class="modal-close-btn">&times;</button>
        </div>
        <form @submit.prevent="saveCarouselItem" class="modal-form">
          <p class="modal-subtitle text-muted text-small mb-3">اختر صورة البنر الإعلاني ليتم عرضها مباشرة في أعلى صفحة المنيو للزبائن.</p>
          
          <!-- S3 Image Upload Dropzone -->
          <div class="form-group animate-fade-in">
            <div class="image-dropzone" 
                 :class="{ active: carouselDragActive }" 
                 @dragover.prevent="carouselDragActive = true"
                 @dragleave.prevent="carouselDragActive = false"
                 @drop.prevent="handleCarouselDrop($event)"
                 @click="triggerCarouselImageSelect">
              <input type="file" ref="carouselFileInput" class="hidden-file-input" accept="image/*" @change="handleCarouselImageFileSelect" />
              
              <div v-if="!newCarouselItem.file" class="dropzone-prompt">
                <svg class="cloud-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <span>اسحب صورة البنر هنا أو اضغط للتصفح</span>
              </div>
              <div v-else class="dropzone-preview" @click.stop>
                <img :src="newCarouselItem.filePreview" alt="Preview" style="max-height: 160px; width: 100%; object-fit: contain; border-radius: 8px; margin-bottom: 8px;" />
                <span class="file-name">{{ newCarouselItem.file.name }}</span>
                <span v-if="newCarouselItem.dimensions" class="file-dimensions block text-muted text-small mt-1" style="font-size: 0.75rem; color: #868e96; font-weight: 500;">
                  المقاسات: {{ newCarouselItem.dimensions }}
                </span>
                <button type="button" @click="clearCarouselFile" class="btn btn-outline btn-xs mt-2" style="color: #fa5252; border-color: #ffc9c9;">إزالة الصورة</button>
              </div>
            </div>
          </div>

          <div class="modal-footer mt-4">
            <button type="submit" class="btn btn-primary" :disabled="loading">
              {{ loading ? 'جاري الرفع...' : 'رفع ونشر البنر الإعلاني' }}
            </button>
            <button type="button" @click="carouselModalOpen = false" class="btn btn-outline" :disabled="loading">إلغاء</button>
          </div>
        </form>
      </div>
    </div>



    <!-- Image Zoom View -->
    <div v-if="zoomedImageSrc" class="modal-overlay zoom-overlay animate-fade-in" @click="zoomedImageSrc = null">
      <div class="zoom-box">
        <img :src="zoomedImageSrc" alt="Zoomed" />
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
</template>

<script>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import { useToastStore } from '../stores/toast';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

export default {
  name: 'AdminView',
  setup() {
    const toast = useToastStore();
    const loading = ref(false);
    const isAuthenticated = ref(false);
    const sidebarOpen = ref(false);
    const activeTab = ref('analytics');
    const activeShop = ref('shop1');
    const loginShop = ref('shop1');

    // Login Data
    const loginForm = reactive({ username: '', password: '' });
    const loginError = ref('');

    // Cropper Data (Missing Refs)
    const cropperModalOpen = ref(false);
    const cropperImageElement = ref(null);
    const cropperImageSrc = ref('');
    const activeAspectRatio = ref(3/1);
    let cropperInstance = null;

    // Tabs Titles
    const tabTitles = {
      analytics: 'لوحة الإحصائيات والتقارير المالية',
      products: 'إدارة المنتجات وقائمة الأسعار',
      categories: 'تصنيف وتقسيم الأصناف الرئيسية',
      orders: 'سجل وإدارة طلبات العملاء',
      customers: 'قائمة العملاء والمنتجات المفضلة',
      images: 'إصلاح ورفع صور المنتجات التالفة',
      carousel: 'إدارة بنرات العروض التسويقية'
    };

    // Analytics Data
    const analyticsPeriod = ref('30d');
    const analyticsStartDate = ref('');
    const analyticsEndDate = ref('');
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
    const orders = ref([]);
    const customers = ref([]);

    const filters = reactive({ search: '', category: '', subCategory: '' });
    const orderFilters = reactive({ search: '', status: '', dateRange: 'all' });
    const customerFilters = reactive({ search: '' });

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
    const customerModalOpen = ref(false);
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
    const editingCustomer = reactive({
      _id: '',
      name: '',
      phone: ''
    });
    const viewingCustomerFavs = ref([]);
    const viewingCustomer = ref(null);
    const zoomedImageSrc = ref(null);

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
      allowFloat: false,
      img: ''
    });

    const modalFileInput = ref(null);
    const modalFile = ref(null);
    const modalFilePreview = ref('');
    const modalDragActive = ref(false);

    // Marketing Carousel Ref State
    const carouselItems = ref([]);
    const carouselModalOpen = ref(false);
    const carouselDragActive = ref(false);
    const carouselFileInput = ref(null);
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

    // Image Recovery bindings
    const recoveryProductId = ref('');
    const recoveryFileInput = ref(null);
    const recoveryFile = ref(null);
    const recoveryFilePreview = ref('');
    const dragActive = ref(false);

    // Helper functions


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
        editingProduct.allowFloat = !!prod.allowFloat;
        editingProduct.img = prod.img || '';
        
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
        editingProduct.allowFloat = false;
        editingProduct.img = '';
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

    const setModalFile = (file) => {
      modalFile.value = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        modalFilePreview.value = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    // Zoom Image Preview
    const zoomImage = (src) => {
      if (src) zoomedImageSrc.value = src;
    };

    // CATEGORIES CRUD LOGIC
    const openCategoryModal = (cat = null) => {
      if (cat) {
        editingCategory._id = cat._id;
        editingCategory.name = cat.name;
        editingCategory.emoji = cat.emoji || '';
        editingCategory.subCategories = cat.subCategories || [];
        categorySubcategoriesString.value = (cat.subCategories || []).join(', ');
      } else {
        editingCategory._id = '';
        editingCategory.name = '';
        editingCategory.emoji = '📂';
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
        emoji: editingCategory.emoji,
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

    // IMAGE RECOVERY TAB LOGIC
    const triggerImageSelect = () => {
      recoveryFileInput.value.click();
    };

    const handleImageFileSelect = (e) => {
      const file = e.target.files[0];
      if (file) setRecoveryFile(file);
    };

    const handleImageDrop = (e) => {
      dragActive.value = false;
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) setRecoveryFile(file);
    };

    const setRecoveryFile = (file) => {
      recoveryFile.value = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        recoveryFilePreview.value = e.target.result;
      };
      reader.readAsDataURL(file);
    };

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

    const openCarouselModal = () => {
      newCarouselItem.title = '';
      newCarouselItem.subtitle = '';
      newCarouselItem.link = '';
      newCarouselItem.file = null;
      newCarouselItem.filePreview = '';
      newCarouselItem.dimensions = '';
      carouselModalOpen.value = true;
    };

    const saveCarouselItem = async () => {
      if (!newCarouselItem.file) {
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
        formData.append('img', newCarouselItem.file);
        
        const res = await adminFetch(`/api/admin/marketing-carousel`, {
          method: 'POST',
          body: formData
        });
        
        if (res.ok) {
          toast.show('تمت إضافة البنر الإعلاني بنجاح', 'success');
          carouselModalOpen.value = false;
          await fetchCarousel();
        } else {
          const errData = await res.json();
          toast.show(errData.error || 'فشل إضافة البنر الإعلاني', 'danger');
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
        maxWidth: 2400,
        maxHeight: 1200,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        
        const croppedFile = new File([blob], 'cropped_banner.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        
        newCarouselItem.file = croppedFile;
        newCarouselItem.filePreview = canvas.toDataURL('image/jpeg');
        newCarouselItem.dimensions = `${canvas.width} × ${canvas.height} بكسل`;
        
        cropperModalOpen.value = false;
        cropperInstance.destroy();
        cropperInstance = null;
        toast.show('تم ضبط وقص الصورة بنجاح', 'success');
      }, 'image/jpeg', 0.9);
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
      return (Number(val) || 0).toLocaleString('ar-LY', { minimumFractionDigits: 2 }) + ' د.ل';
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
      isAuthenticated.value = false;
      toast.show('تم تسجيل الخروج بنجاح', 'success');
    };

    // Switch shops context in dashboard
    const switchShop = async (shop) => {
      activeShop.value = shop;
      sidebarOpen.value = false;
      await checkAuthentication();
    };

    // Tab switcher
    const setTab = (tab) => {
      activeTab.value = tab;
      sidebarOpen.value = false;
    };

    // Load Data
    const loadAllData = async () => {
      loading.value = true;
      try {
        await Promise.all([
          fetchAnalytics(),
          fetchProducts(),
          fetchCategories(),
          fetchOrders(),
          fetchCustomers(),
          fetchCarousel()
        ]);
      } catch (err) {
        toast.show('خطأ في تحميل بيانات لوحة الإدارة', 'danger');
      } finally {
        loading.value = false;
      }
    };

    const fetchAnalytics = async () => {
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
          analyticsData.topProducts = data.topProducts || [];
          analyticsData.topCustomers = data.topCustomers || [];
          analyticsData.categorySales = data.categorySales || [];
          analyticsData.topFavorites = data.topFavorites || [];
          analyticsData.inactiveCustomers = data.inactiveCustomers || [];
          analyticsData.lowPerformingProducts = data.lowPerformingProducts || [];
        }
      } catch (err) {
        console.error(err);
      }
    };

    const changePeriod = async (p) => {
      analyticsPeriod.value = p;
      if (p !== 'custom') {
        analyticsStartDate.value = '';
        analyticsEndDate.value = '';
      }
      loading.value = true;
      await fetchAnalytics();
      loading.value = false;
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

    const printReport = () => {
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

    const fetchCustomers = async () => {
      try {
        const url = `/api/admin/customers?shop=${activeShop.value}`;
        const res = await adminFetch(url);
        if (res.ok) {
          customers.value = await res.json();
        }
      } catch (err) {
        console.error(err);
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

    const navigateSuggestions = (dir) => {
      const len = filteredSuggestions.value.length;
      if (len === 0) return;
      highlightedSuggestionIndex.value = (highlightedSuggestionIndex.value + dir + len) % len;
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
          await Promise.all([fetchOrders(), fetchAnalytics()]);
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

    const openCustomerEditModal = (cust) => {
      editingCustomer._id = cust._id;
      editingCustomer.name = cust.name;
      editingCustomer.phone = cust.phone;
      customerModalOpen.value = true;
    };

    const saveCustomerDetails = async () => {
      loading.value = true;
      try {
        const url = `/api/admin/customers/${editingCustomer._id}`;
        const res = await adminFetch(url, {
          method: 'PUT',
          body: JSON.stringify({
            name: editingCustomer.name,
            phone: editingCustomer.phone
          })
        });
        if (res.ok) {
          toast.show('تم تحديث بيانات العميل بنجاح', 'success');
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
      return orders.value.filter(o => {
        const matchesSearch = o.customerInfo.name.toLowerCase().includes(orderFilters.search.toLowerCase()) || 
                             o.customerInfo.phone.includes(orderFilters.search);
        const matchesStatus = !orderFilters.status || o.status === orderFilters.status;
        
        let matchesDate = true;
        if (orderFilters.dateRange && orderFilters.dateRange !== 'all') {
          const orderDate = new Date(o.createdAt);
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          
          if (orderFilters.dateRange === 'today') {
            matchesDate = orderDate >= todayStart;
          } else if (orderFilters.dateRange === 'yesterday') {
            const yesterdayStart = new Date(todayStart);
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            matchesDate = orderDate >= yesterdayStart && orderDate < todayStart;
          } else if (orderFilters.dateRange === '7d') {
            const sevenDaysAgo = new Date(todayStart);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            matchesDate = orderDate >= sevenDaysAgo;
          } else if (orderFilters.dateRange === '30d') {
            const thirtyDaysAgo = new Date(todayStart);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            matchesDate = orderDate >= thirtyDaysAgo;
          }
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

    const uploadRecoveryImage = async () => {
      if (!recoveryProductId.value || !recoveryFile.value) return;
      loading.value = true;
      
      const url = activeShop.value === 'shop2'
        ? `/api/shop2/products/${recoveryProductId.value}`
        : `/api/products/${recoveryProductId.value}`;

      // Get existing product info
      const prod = products.value.find(p => p._id === recoveryProductId.value);
      if (!prod) return;

      const formData = new FormData();
      formData.append('name', prod.name);
      formData.append('category', prod.category);
      if (prod.desc) formData.append('desc', prod.desc);
      if (prod.subCategory) formData.append('subCategory', prod.subCategory);
      if (prod.purchaseType) formData.append('purchaseType', prod.purchaseType);
      if (prod.price_regular) formData.append('price_regular', prod.price_regular);
      if (prod.price_bulk) formData.append('price_bulk', prod.price_bulk);
      formData.append('allowFloat', prod.allowFloat ? 'true' : 'false');
      formData.append('img', recoveryFile.value);

      try {
        const res = await adminFetch(url, {
          method: 'PUT',
          body: formData
        });
        if (res.ok) {
          toast.show('تم رفع وحفظ الصورة وإصلاح المنتج بنجاح', 'success');
          recoveryProductId.value = '';
          recoveryFile.value = null;
          recoveryFilePreview.value = '';
          await fetchProducts(); // Reload lists
        } else {
          toast.show('فشل في رفع وحفظ الصورة التالفة', 'danger');
        }
      } catch (err) {
        toast.show('حدث خطأ بالاتصال بالخادم', 'danger');
      } finally {
        loading.value = false;
      }
    };

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
      checkAuthentication();
    });

    return {
      loading,
      isAuthenticated,
      sidebarOpen,
      activeTab,
      activeShop,
      loginShop,
      loginForm,
      loginError,
      tabTitles,
      analyticsPeriod,
      analyticsStartDate,
      analyticsEndDate,
      periods,
      analyticsData,
      products,
      categories,
      filters,
      availableSubcategories,
      filteredProducts,
      productModalOpen,
      categoryModalOpen,
      zoomedImageSrc,
      editingProduct,
      subCategoriesForEditing,
      modalFileInput,
      modalFile,
      modalFilePreview,
      modalDragActive,
      editingCategory,
      categorySubcategoriesString,
      recoveryProductId,
      recoveryFileInput,
      recoveryFile,
      recoveryFilePreview,
      dragActive,
      formatCurrency,
      handleLogin,
      handleLogout,
      switchShop,
      setTab,
      changePeriod,
      fetchAnalytics,
      exportReport,
      printReport,
      toggleProductAvailability,
      deleteProduct,
      openProductModal,
      onProductCategoryChange,
      saveProduct,
      triggerModalImageSelect,
      handleModalImageFileSelect,
      handleModalImageDrop,
      zoomImage,
      openCategoryModal,
      saveCategory,
      deleteCategory,
      triggerImageSelect,
      handleImageFileSelect,
      handleImageDrop,
      uploadRecoveryImage,
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
      customerFilters,
      filteredOrders,
      filteredCustomers,
      editingCustomer,
      customerModalOpen,
      customerFavsModalOpen,
      viewingCustomerFavs,
      viewingCustomer,
      updateOrderStatus,
      orderEditModalOpen,
      editingOrder,
      openOrderEditModal,
      saveOrder,
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
      carouselModalOpen,
      carouselDragActive,
      carouselFileInput,
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
    };
  }
};
</script>

<style scoped>
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
  transition: all 0.2s;
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
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(15px);
  border-left: 1px solid rgba(0, 0, 0, 0.06);
  padding: 25px 20px;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  position: sticky;
  top: 0;
  z-index: 100;
  transition: transform 0.3s ease;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 30px;
}

.sidebar-logo {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  object-fit: cover;
}

.sidebar-brand h3 {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1e3a5f;
  margin: 0;
}

.badge {
  background: var(--chart-primary);
  color: var(--theme-text-color);
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
}

.shop-switcher {
  background: rgba(0, 0, 0, 0.03);
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 25px;
}

.switch-label {
  font-size: 0.8rem;
  color: #6c757d;
  display: block;
  margin-bottom: 8px;
}

.shop-select-pills {
  display: flex;
  gap: 8px;
}

.shop-select-pills.compact .shop-pill {
  flex: 1;
  padding: 6px 10px;
  font-size: 0.8rem;
}

.shop-pill {
  flex: 1;
  padding: 10px 12px;
  background: #f1f3f5;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  color: #495057;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.shop-pill.active {
  background: var(--chart-primary);
  border-color: var(--chart-primary);
  color: var(--theme-text-color);
}

.sidebar-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 12px;
  color: #212529;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: right;
  font-weight: 700;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.menu-item:hover, .menu-item.active {
  background: rgba(0, 0, 0, 0.05);
  color: var(--chart-primary);
}

.menu-icon {
  width: 22px;
  height: 22px;
}

.sidebar-footer {
  margin-top: auto;
  border-top: 1px solid #dee2e6;
  padding-top: 15px;
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
  padding: 30px;
  overflow-y: auto;
  height: 100dvh;
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
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  text-align: right;
  font-size: 0.92rem;
}

.admin-table th {
  padding: 16px 14px;
  background: #f8f9fa;
  color: #343a40;
  font-weight: 800;
  border-bottom: 2px solid #e9ecef;
}

.admin-table td {
  padding: 16px 14px;
  border-bottom: 1px solid #f1f3f5;
  color: #495057;
  vertical-align: middle;
}

.admin-table tr {
  transition: background-color 0.2s ease;
}
.admin-table tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.015);
}

.text-bold { font-weight: 700; }
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
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-box {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  padding: 25px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #f1f3f5;
  padding-bottom: 12px;
}

.modal-header h3 {
  font-size: 1.15rem;
  font-weight: 700;
  color: #1e3a5f;
  margin: 0;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #868e96;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 15px;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #495057;
  text-align: right;
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

/* Drag drop upload zones styles */
.image-dropzone {
  border: 2px dashed #ced4da;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  background: #f8f9fa;
  transition: all 0.2s ease;
}

.image-dropzone.active, .image-dropzone:hover {
  border-color: var(--chart-primary);
  background: rgba(var(--chart-primary), 0.02);
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

/* Image Recovery specific styling */
.recovery-box {
  max-width: 500px;
  margin: 0 auto;
}

.recovery-icon {
  width: 55px;
  height: 55px;
  color: var(--chart-primary);
  margin-bottom: 15px;
}

.recovery-box h2 {
  font-size: 1.35rem;
  font-weight: 700;
  color: #1e3a5f;
  margin-bottom: 10px;
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
  .admin-container {
    grid-template-columns: 1fr;
  }

  .admin-sidebar {
    position: fixed;
    top: 60px;
    right: 0;
    width: 280px;
    height: calc(100vh - 60px);
    transform: translateX(100%);
    box-shadow: -4px 0 15px rgba(0, 0, 0, 0.05);
  }

  .admin-sidebar.open {
    transform: translateX(0);
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

.status-select {
  padding: 6px 12px;
  font-size: 0.85rem;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  cursor: pointer;
  outline: none;
  font-weight: 600;
  transition: all 0.2s ease;
  width: auto;
  display: inline-block;
}
.status-select.status-pending {
  background: #fff9db;
  color: #f08c00;
  border-color: #ffe066;
}
.status-select.status-processing {
  background: #e7f5ff;
  color: #228be6;
  border-color: #a5d8ff;
}
.status-select.status-completed {
  background: #ebfbee;
  color: #40c057;
  border-color: #b2f2bb;
}
.status-select.status-cancelled {
  background: #fff5f5;
  color: #fa5252;
  border-color: #ffc9c9;
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
  margin-bottom: 2px;
  color: #495057;
}
.item-note {
  font-size: 0.75rem;
  color: #868e96;
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
  border-radius: 8px;
  font-size: 1.05rem;
  border: 1px solid rgba(30, 58, 95, 0.15);
  color: #1e3a5f;
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
  padding-top: 75%; /* 4:3 aspect ratio */
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

/* Custom Date Inputs */
.custom-date-container {
  padding: 1.25rem;
  margin-top: 0;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
}
.date-picker-row {
  display: flex;
  gap: 1.5rem;
  align-items: flex-end;
  flex-wrap: wrap;
}
.date-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.date-input-group label {
  font-size: 0.85rem;
  color: #495057;
  font-weight: 500;
}
.date-input-group input {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #ced4da;
  outline: none;
  font-size: 0.9rem;
}
.btn-apply {
  padding: 0.5rem 1.5rem;
  height: fit-content;
}

/* Actionable Insights Styles */
.card-header-with-badge {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.card-header-with-badge .chart-title {
  margin-bottom: 0;
}
.badge-warning {
  background-color: #ffe8cc;
  color: #d9480f;
}
.badge-danger {
  background-color: #ffe3e3;
  color: #c92a2a;
}
.me-1 {
  margin-left: 4px;
}

/* Print Styling */
@media print {
  body {
    background: #ffffff !important;
    color: #000000 !important;
  }
  .no-print,
  .admin-sidebar,
  .main-header,
  .custom-date-container,
  .toast-container {
    display: none !important;
  }
  .admin-container {
    display: block !important;
    padding: 0 !important;
  }
  .admin-main {
    padding: 0 !important;
    margin: 0 !important;
    background: transparent !important;
  }
  .glass-panel {
    background: #ffffff !important;
    border: 1px solid #dee2e6 !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
  }
  .charts-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 20px !important;
  }
  .span-2 {
    grid-column: span 2 !important;
  }
  .chart-card {
    page-break-inside: avoid !important;
    border: 1px solid #dee2e6 !important;
  }
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
  padding-top: 50%; /* 2:1 aspect ratio */
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
</style>
