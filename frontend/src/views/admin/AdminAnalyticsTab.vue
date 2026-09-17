<template>
          <div v-if="activeTab === 'analytics' && userRole === 'admin'" class="analytics-tab-content">
            
            <!-- SKELETON LOADER (Displayed during date filter and period loading) -->
            <div v-if="analyticsLoading" class="analytics-skeleton-view animate-fade-in">
              <!-- KPI Cards Skeleton -->
              <div class="kpi-grid">
                <div v-for="i in 6" :key="'kpi-skel-' + i" class="kpi-card glass-panel skeleton-card">
                  <div class="skeleton-shimmer skeleton-icon"></div>
                  <div class="kpi-info" style="width: 100%;">
                    <div class="skeleton-shimmer skeleton-line skeleton-title-line"></div>
                    <div class="skeleton-shimmer skeleton-line skeleton-val-line"></div>
                  </div>
                </div>
              </div>

              <!-- Charts & Metrics Grid Skeleton -->
              <div class="charts-grid mt-4">
                <!-- Sales Trend Skeleton -->
                <div class="chart-card glass-panel span-2 skeleton-card">
                  <div class="skeleton-shimmer skeleton-line" style="width: 180px; height: 18px; margin-bottom: 20px;"></div>
                  <div class="skeleton-shimmer skeleton-chart-box"></div>
                </div>

                <!-- Price Mode Split Skeleton -->
                <div class="chart-card glass-panel skeleton-card">
                  <div class="skeleton-shimmer skeleton-line" style="width: 160px; height: 18px; margin-bottom: 20px;"></div>
                  <div class="d-flex flex-column align-items-center justify-content-center" style="min-height: 180px; gap: 16px;">
                    <div class="skeleton-shimmer skeleton-circle"></div>
                    <div class="skeleton-shimmer skeleton-line" style="width: 140px; height: 14px;"></div>
                  </div>
                </div>

                <!-- Payment Methods Skeleton -->
                <div class="chart-card glass-panel skeleton-card">
                  <div class="skeleton-shimmer skeleton-line" style="width: 180px; height: 18px; margin-bottom: 20px;"></div>
                  <div class="skeleton-shimmer skeleton-row-bar" v-for="i in 3" :key="'pm-skel-' + i"></div>
                </div>

                <!-- Category Sales Skeleton -->
                <div class="chart-card glass-panel span-2 skeleton-card">
                  <div class="skeleton-shimmer skeleton-line" style="width: 150px; height: 18px; margin-bottom: 20px;"></div>
                  <div class="skeleton-shimmer skeleton-row-bar" v-for="i in 4" :key="'cat-skel-' + i"></div>
                </div>

                <!-- Top Favorites Skeleton -->
                <div class="chart-card glass-panel skeleton-card">
                  <div class="skeleton-shimmer skeleton-line" style="width: 140px; height: 18px; margin-bottom: 20px;"></div>
                  <div class="skeleton-shimmer skeleton-row-bar" v-for="i in 4" :key="'fav-skel-' + i"></div>
                </div>

                <!-- Top Products Skeleton -->
                <div class="chart-card glass-panel span-2 skeleton-card">
                  <div class="skeleton-shimmer skeleton-line" style="width: 160px; height: 18px; margin-bottom: 16px;"></div>
                  <div class="skeleton-shimmer skeleton-table-row" v-for="i in 5" :key="'prod-skel-' + i"></div>
                </div>

                <!-- Top Customers Skeleton -->
                <div class="chart-card glass-panel skeleton-card">
                  <div class="skeleton-shimmer skeleton-line" style="width: 140px; height: 18px; margin-bottom: 16px;"></div>
                  <div class="skeleton-shimmer skeleton-table-row" v-for="i in 5" :key="'cust-skel-' + i"></div>
                </div>
              </div>
            </div>

            <!-- REAL ANALYTICS DATA CONTENT -->
            <div v-else class="analytics-real-content animate-fade-in">
            <!-- KPI Cards Grid -->
            <div class="kpi-grid">
              <div class="kpi-card glass-panel">
                <div class="kpi-icon-wrapper sales-icon">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                </div>
                <div class="kpi-info">
                  <span class="kpi-title">إجمالي المبيعات</span>
                  <span class="kpi-value text-mono">{{ formatCurrency(analyticsData.kpi.totalRevenue) }}</span>
                </div>
              </div>
              <div class="kpi-card glass-panel kpi-card-paid">
                <div class="kpi-icon-wrapper paid-icon">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <div class="kpi-info">
                  <span class="kpi-title">إجمالي المدفوع</span>
                  <span class="kpi-value text-mono text-success">{{ formatCurrency(analyticsData.kpi.totalPaid) }}</span>
                </div>
              </div>
              <div class="kpi-card glass-panel kpi-card-remaining">
                <div class="kpi-icon-wrapper remaining-icon">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <div class="kpi-info">
                  <span class="kpi-title">إجمالي المتبقي</span>
                  <span class="kpi-value text-mono text-danger">{{ formatCurrency(analyticsData.kpi.totalRemaining) }}</span>
                </div>
              </div>
              <div class="kpi-card glass-panel">
                <div class="kpi-icon-wrapper orders-icon">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                </div>
                <div class="kpi-info">
                  <span class="kpi-title">إجمالي الطلبات</span>
                  <span class="kpi-value text-mono">{{ formatArabicPlural(analyticsData.kpi.orderCount, 'order') }}</span>
                </div>
              </div>
              <div class="kpi-card glass-panel">
                <div class="kpi-icon-wrapper aov-icon">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                </div>
                <div class="kpi-info">
                  <span class="kpi-title">متوسط الطلب</span>
                  <span class="kpi-value text-mono">{{ formatCurrency(analyticsData.kpi.avgOrderValue) }}</span>
                </div>
              </div>
              <div class="kpi-card glass-panel">
                <div class="kpi-icon-wrapper customers-icon">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v-2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <div class="kpi-info">
                  <span class="kpi-title">العملاء النشطون</span>
                  <span class="kpi-value text-mono">{{ formatArabicPlural(analyticsData.kpi.activeCustomers, 'customer') }}</span>
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
                  <svg aria-hidden="true" v-else class="svg-line-chart" viewBox="0 0 600 240">
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
                    <svg aria-hidden="true" viewBox="0 0 120 120" width="120" height="120">
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
                <div class="chart-title d-flex justify-content-between align-items-center">
                  <span>توزيع طرق الدفع (نقدي / بطاقة / تحويل)</span>
                  <span class="chart-rec-badge">حسب تاريخ الاستلام</span>
                </div>
                <div class="payment-methods-breakdown">
                  <!-- Cash Row -->
                  <div class="pm-breakdown-row pm-cash">
                    <div class="pm-icon-title">
                      <div class="pm-badge cash-badge">
                        <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
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
                        <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
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
                        <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"></path></svg>
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

              <!-- UX Insights & Conversion Funnel Card (UX Datasets 03_interaction_telemetry) -->
              <div class="chart-card glass-panel span-2 ux-insights-card">
                <div class="card-header-with-badge">
                  <div class="d-flex align-items-center gap-2">
                    <h3 class="chart-title">إحصائيات تجربة المستخدم والتحويل (UX Insights)</h3>
                    <span class="badge badge-primary">سلوك التسوق والتفاعل</span>
                  </div>
                  <span class="text-muted fs-xs">مبنية على معايير UX Datasets</span>
                </div>

                <div class="ux-insights-content mt-3">
                  <!-- Conversion Funnel Row -->
                  <div class="ux-funnel-grid">
                    <div class="funnel-step">
                      <div class="funnel-step-header">
                        <span class="step-num">1</span>
                        <span class="step-title">جلسات التصفح</span>
                      </div>
                      <div class="step-value text-mono">{{ telemetryInsights.funnel?.totalSessions || 0 }}</div>
                      <div class="step-desc">إجمالي الجلسات</div>
                    </div>

                    <div class="funnel-connector" aria-hidden="true">
                      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>

                    <div class="funnel-step">
                      <div class="funnel-step-header">
                        <span class="step-num">2</span>
                        <span class="step-title">إضافة للسلة</span>
                      </div>
                      <div class="step-value text-mono">{{ telemetryInsights.funnel?.cartSessions || 0 }}</div>
                      <div class="step-desc">اهتمام بالشراء</div>
                    </div>

                    <div class="funnel-connector" aria-hidden="true">
                      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>

                    <div class="funnel-step">
                      <div class="funnel-step-header">
                        <span class="step-num">3</span>
                        <span class="step-title">مراجعة الطلب</span>
                      </div>
                      <div class="step-value text-mono">{{ telemetryInsights.funnel?.checkoutSessions || 0 }}</div>
                      <div class="step-desc">فتح نافذة التأكيد</div>
                    </div>

                    <div class="funnel-connector" aria-hidden="true">
                      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>

                    <div class="funnel-step highlight">
                      <div class="funnel-step-header">
                        <span class="step-num">4</span>
                        <span class="step-title">إتمام الطلب</span>
                      </div>
                      <div class="step-value text-mono text-success">{{ telemetryInsights.funnel?.orderSessions || 0 }}</div>
                      <div class="step-desc">تحويل مكتمل</div>
                    </div>
                  </div>

                  <!-- Key UX Conversion Metrics -->
                  <div class="ux-kpi-subgrid mt-3">
                    <div class="ux-stat-box">
                      <div class="ux-stat-label">معدل التحويل الكلي (Session Conversion)</div>
                      <div class="ux-stat-value text-success text-mono">{{ telemetryInsights.funnel?.conversionRate || 0 }}%</div>
                      <div class="ux-stat-sub">من زيارة المتجر إلى تقديم طلب</div>
                    </div>

                    <div class="ux-stat-box">
                      <div class="ux-stat-label">معدل التراجع عن السلة (Cart Abandonment)</div>
                      <div class="ux-stat-value text-warning text-mono">{{ telemetryInsights.funnel?.cartAbandonmentRate || 0 }}%</div>
                      <div class="ux-stat-sub">أضافوا للسلة ولم يؤكدوا الطلب</div>
                    </div>

                    <div class="ux-stat-box">
                      <div class="ux-stat-label">متوسط زمن معاينة المنتج (Product Dwell Time)</div>
                      <div class="ux-stat-value text-primary text-mono">{{ telemetryInsights.avgDwellSeconds || 0 }} ثانية</div>
                      <div class="ux-stat-sub">تفاعل نشط مع تفاصيل المنتج</div>
                    </div>
                  </div>

                  <!-- Details Row -->
                  <div class="ux-details-split mt-3">
                    <div class="ux-subpanel">
                      <h4 class="subpanel-title">توزيع الأجهزة (Device Breakdown)</h4>
                      <div class="device-bars">
                        <div class="device-row">
                          <span class="device-name">📱 الهاتف المحمول</span>
                          <span class="device-count text-mono">{{ telemetryInsights.devices?.mobile || 0 }}</span>
                        </div>
                        <div class="device-row">
                          <span class="device-name">💻 الحاسوب المكتبي</span>
                          <span class="device-count text-mono">{{ telemetryInsights.devices?.desktop || 0 }}</span>
                        </div>
                        <div class="device-row">
                          <span class="device-name">📟 الأجهزة اللوحية</span>
                          <span class="device-count text-mono">{{ telemetryInsights.devices?.tablet || 0 }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="ux-subpanel">
                      <h4 class="subpanel-title">الأصناف الأكثر تفاعلاً وزيارة</h4>
                      <div v-if="!telemetryInsights.topCategories || telemetryInsights.topCategories.length === 0" class="text-muted fs-xs text-center py-2">
                        لا توجد بيانات تفاعل بعد في هذه الفترة.
                      </div>
                      <div v-else class="cat-engagement-list">
                        <div v-for="cat in telemetryInsights.topCategories" :key="cat.name" class="cat-engage-item">
                          <span class="cat-name">{{ cat.name }}</span>
                          <span class="cat-interactions text-mono">{{ cat.interactions }} تفاعل</span>
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
<script setup>
defineProps([
  'analyticsLoading',
  'analyticsData',
  'formatCurrency',
  'formatArabicPlural',
  'svgTrendAreaPath',
  'svgTrendLinePath',
  'trendCoordinates',
  'trendXLabels',
  'priceModePercentages',
  'donutDashArray',
  'donutDashOffset',
  'getCategoryBarWidth',
  'activeTopFavorites',
  'activeTopProducts',
  'activeLowPerformingProducts',
  'telemetryInsights',
  'formatArabicDate'
]);
</script>