<template>
  <div class="employees-tab-content" dir="rtl">
    <!-- Top Control Bar: Sub-Tabs, Month Navigator, Branch Filter & Quick Actions -->
    <div class="emp-controls-card glass-panel mb-4 no-print">
      <div class="emp-top-row">
        <!-- Segmented Sub-Tabs -->
        <div class="emp-subtabs" role="tablist" aria-label="أقسام إدارة الموظفين">
          <button
            type="button"
            class="emp-subtab-btn"
            :class="{ active: subTab === 'payroll' }"
            role="tab"
            :aria-selected="subTab === 'payroll'"
            @click="subTab = 'payroll'"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>{{ isAdmin ? 'الموظفون ومسير الشهر' : 'الموظفون والسلف والمكافآت' }}</span>
          </button>

          <button
            type="button"
            class="emp-subtab-btn"
            :class="{ active: subTab === 'transactions' }"
            role="tab"
            :aria-selected="subTab === 'transactions'"
            @click="switchToTransactionsTab()"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span>سجل الإيصالات والعمليات</span>
            <span class="subtab-count-pill text-mono">{{ transactions.length }}</span>
          </button>

          <button
            v-if="isAdmin"
            type="button"
            class="emp-subtab-btn"
            :class="{ active: subTab === 'jobs' }"
            role="tab"
            :aria-selected="subTab === 'jobs'"
            @click="subTab = 'jobs'"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            <span>إدارة الوظائف</span>
            <span class="subtab-count-pill text-mono">{{ jobs.length }}</span>
          </button>
        </div>

        <!-- Primary Action Buttons -->
        <div class="emp-primary-actions">
          <button
            type="button"
            class="btn emp-btn-tx"
            @click="openTransactionModal(null, 'bonus')"
            title="تسجيل مكافأة أو سلفة أو خصم مع طباعة إيصال"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg>
            <span>تسجيل مكافأة / سلفة / خصم</span>
          </button>

          <button
            v-if="isAdmin && subTab !== 'jobs'"
            type="button"
            class="btn btn-primary"
            @click="openEmployeeModal()"
            title="إضافة موظف جديد"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            <span>إضافة موظف</span>
          </button>

          <button
            v-if="isAdmin && subTab === 'jobs'"
            type="button"
            class="btn btn-primary"
            @click="openJobModal()"
            title="إضافة وظيفة جديدة"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>إضافة وظيفة</span>
          </button>

          <button
            v-if="isAdmin && subTab === 'payroll'"
            type="button"
            class="btn btn-outline emp-btn-print"
            @click="printMonthlyPayroll"
            title="طباعة مسير الرواتب الشهري (A4)"
            aria-label="طباعة مسير الرواتب الشهري"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            <span class="d-none d-sm-inline">طباعة المسير</span>
          </button>
        </div>
      </div>

      <!-- Filters & Month Navigation Row -->
      <div v-if="subTab !== 'jobs'" class="emp-filters-row">
        <!-- Month Navigator -->
        <div class="emp-month-nav" role="group" aria-label="اختيار الشهر">
          <button
            type="button"
            class="emp-month-arrow"
            @click="shiftMonth(-1)"
            title="الشهر السابق"
            aria-label="الشهر السابق"
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <span class="emp-month-label">{{ selectedMonthLabel }}</span>
          <button
            type="button"
            class="emp-month-arrow"
            @click="shiftMonth(1)"
            title="الشهر التالي"
            aria-label="الشهر التالي"
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button
            v-if="!isCurrentMonth"
            type="button"
            class="emp-today-month-btn"
            @click="resetToCurrentMonth"
          >
            الشهر الحالي
          </button>
        </div>

        <!-- Branch Filter Pills (Global Admin/Staff) -->
        <div v-if="userShopAccess === 'all'" class="emp-branch-pills" role="group" aria-label="تصفية حسب الفرع">
          <button
            type="button"
            class="emp-filter-pill"
            :class="{ active: branchFilter === 'all' }"
            @click="setBranchFilter('all')"
          >كل الفروع</button>
          <button
            type="button"
            class="emp-filter-pill"
            :class="{ active: branchFilter === 'shop1' }"
            @click="setBranchFilter('shop1')"
          >المتجر الرئيسي</button>
          <button
            type="button"
            class="emp-filter-pill"
            :class="{ active: branchFilter === 'shop2' }"
            @click="setBranchFilter('shop2')"
          >قسم النواشف</button>
        </div>

        <!-- Search Input -->
        <div class="emp-search-wrap">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" class="emp-search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            v-model="searchQuery"
            type="text"
            class="form-control emp-search-input"
            :placeholder="subTab === 'transactions' ? 'بحث بالموظف أو السبب أو رقم الإيصال…' : 'بحث بالاسم أو الهاتف أو الوظيفة…'"
            autocomplete="off"
          />
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- SUB-TAB 1: EMPLOYEES & MONTHLY PAYROLL                              -->
    <!-- ================================================================== -->
    <div v-if="subTab === 'payroll'" class="emp-payroll-view">
      <!-- Admin Financial KPI Strip -->
      <div v-if="isAdmin" class="emp-kpi-grid mb-4 no-print">
        <div class="emp-kpi-card">
          <div class="emp-kpi-info">
            <span class="emp-kpi-label">الموظفون النشطون</span>
            <span class="emp-kpi-val text-mono">{{ kpis.activeCount }} <small>/ {{ kpis.totalEmployees }}</small></span>
          </div>
          <div class="emp-kpi-icon icon-slate" aria-hidden="true">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
        </div>

        <div class="emp-kpi-card">
          <div class="emp-kpi-info">
            <span class="emp-kpi-label">الرواتب الثابتة</span>
            <span class="emp-kpi-val text-mono">{{ formatCurrency(kpis.totalFixedSalaries) }}</span>
          </div>
          <div class="emp-kpi-icon icon-blue" aria-hidden="true">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          </div>
        </div>

        <div class="emp-kpi-card">
          <div class="emp-kpi-info">
            <span class="emp-kpi-label">مستحقات الإنتاج (الشيفات)</span>
            <span class="emp-kpi-val text-mono text-primary">{{ formatCurrency(kpis.totalProductionPay) }}</span>
          </div>
          <div class="emp-kpi-icon icon-gold" aria-hidden="true">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
          </div>
        </div>

        <div class="emp-kpi-card">
          <div class="emp-kpi-info">
            <span class="emp-kpi-label">المكافآت (+) / السلف والخصم (−)</span>
            <span class="emp-kpi-val text-mono emp-kpi-adj">
              <span class="text-success">+{{ formatNum(kpis.totalBonuses) }}</span>
              <span class="adj-sep">/</span>
              <span class="text-danger">−{{ formatNum(kpis.totalDeductions) }}</span>
            </span>
          </div>
          <div class="emp-kpi-icon icon-green" aria-hidden="true">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
        </div>

        <div class="emp-kpi-card highlight-net">
          <div class="emp-kpi-info">
            <span class="emp-kpi-label">صافي مسير الشهر المستحق</span>
            <span class="emp-kpi-val text-mono">{{ formatCurrency(kpis.totalNetPay) }}</span>
            <small v-if="kpis.totalPaidOut > 0" class="text-small text-success font-bold">
              تم صرف: <span class="text-mono">{{ formatCurrency(kpis.totalPaidOut) }}</span>
            </small>
          </div>
          <div class="emp-kpi-icon icon-emerald" aria-hidden="true">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
        </div>
      </div>

      <!-- Desktop Employees Table & Mobile Cards Container -->
      <div class="table-card glass-panel overflow-hidden">
        <!-- Desktop Table -->
        <div class="table-container desktop-emp-table-wrap">
          <table class="admin-table desktop-emp-table">
            <thead>
              <tr>
                <th>الموظف</th>
                <th>الفرع</th>
                <th>الوظيفة</th>
                <th>تاريخ المباشرة</th>
                <th>الشهادة الصحية</th>
                <th v-if="isAdmin">الأساسي / الإنتاج ({{ selectedMonthShort }})</th>
                <th>المكافآت (+)</th>
                <th>السلف (−)</th>
                <th>الخصومات (−)</th>
                <th v-if="isAdmin">صافي المستحق</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading && employees.length === 0">
                <td :colspan="isAdmin ? 11 : 9" class="text-center p-5 text-muted">جاري تحميل بيانات الموظفين…</td>
              </tr>
              <tr v-else-if="filteredEmployees.length === 0">
                <td :colspan="isAdmin ? 11 : 9" class="text-center p-5 text-muted">
                  لا يوجد موظفون مطابقون للبحث.
                  <span v-if="isAdmin"> يمكنك إضافة موظف جديد من الزر أعلاه.</span>
                </td>
              </tr>
              <tr
                v-else
                v-for="emp in filteredEmployees"
                :key="emp._id"
                :class="{ 'emp-row-inactive': emp.active === false }"
              >
                <td>
                  <div class="emp-name-cell">
                    <div class="emp-avatar" :class="emp.payType === 'production' ? 'is-chef' : 'is-fixed'">
                      {{ (emp.name || 'م').charAt(0) }}
                    </div>
                    <div class="emp-identity">
                      <div class="d-flex align-items-center gap-1 flex-wrap">
                        <span class="font-bold text-dark">{{ emp.name }}</span>
                        <span v-if="emp.active === false" class="emp-status-tag inactive">موقوف</span>
                      </div>
                      <div class="d-flex align-items-center gap-1 mt-1" v-if="emp.phone">
                        <span class="text-mono text-small text-muted" dir="ltr">{{ emp.phone }}</span>
                        <a
                          :href="`tel:${cleanPhone(emp.phone)}`"
                          class="emp-contact-circle call"
                          title="اتصال هاتفي"
                          :aria-label="`اتصال بالموظف ${emp.name}`"
                        >
                          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </a>
                        <a
                          v-if="whatsappUrl(emp.phone)"
                          :href="whatsappUrl(emp.phone)"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="emp-contact-circle whatsapp"
                          title="مراسلة عبر واتساب"
                          :aria-label="`واتساب للموظف ${emp.name}`"
                        >
                          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                        </a>
                      </div>
                    </div>
                  </div>
                </td>

                <td>
                  <span class="branch-badge" :class="'branch-' + emp.branch">{{ branchLabel(emp.branch) }}</span>
                </td>

                <td>
                  <div class="d-flex flex-column gap-1">
                    <span class="job-badge" :class="emp.payType === 'production' ? 'is-prod' : 'is-fixed'">
                      {{ emp.jobName || 'غير محدد' }}
                    </span>
                    <span class="text-small text-muted" v-if="emp.payType === 'production'">
                      إنتاج ومبيعات الأصناف
                    </span>
                  </div>
                </td>

                <td>
                  <span v-if="emp.startDate" class="emp-start-date-pill text-mono" dir="ltr">{{ emp.startDate }}</span>
                  <span v-else class="text-muted text-small">—</span>
                </td>

                <td>
                  <div
                    class="hc-badge"
                    :class="getHealthCertInfo(emp.healthCertExpiry).className"
                    :title="getHealthCertInfo(emp.healthCertExpiry).tooltip"
                  >
                    <span class="hc-dot" aria-hidden="true"></span>
                    <div class="hc-text">
                      <span class="hc-label">{{ getHealthCertInfo(emp.healthCertExpiry).label }}</span>
                      <span v-if="emp.healthCertExpiry" class="hc-date text-mono" dir="ltr">{{ emp.healthCertExpiry }}</span>
                      <span v-if="getHealthCertInfo(emp.healthCertExpiry).subLabel" class="hc-sub">{{ getHealthCertInfo(emp.healthCertExpiry).subLabel }}</span>
                    </div>
                  </div>
                </td>

                <td v-if="isAdmin">
                  <div v-if="emp.payType === 'production'" class="d-flex flex-column gap-1 align-items-start">
                    <span class="text-mono font-bold text-primary">{{ formatCurrency(emp.effectiveGrossPay ?? emp.productionGrossPay ?? 0) }}</span>
                    <button
                      type="button"
                      class="btn-coeff-chip"
                      @click="openChefBreakdownModal(emp)"
                      title="عرض وضبط معاملات أصناف الشيف"
                    >
                      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
                      <span>معاملات ({{ (emp.productBreakdown || []).length }})</span>
                    </button>
                  </div>
                  <div v-else class="d-flex flex-column gap-1 align-items-start">
                    <span class="text-mono font-bold">{{ formatCurrency(emp.effectiveGrossPay ?? emp.salary ?? 0) }}</span>
                    <span v-if="emp.hasBaseSalarySettled" class="text-small text-success font-bold">
                      تم صرف الأساسي ({{ formatNum(emp.salary) }})
                    </span>
                  </div>
                </td>

                <td class="text-mono font-bold text-success">
                  {{ emp.bonusesTotal > 0 ? '+' + formatNum(emp.bonusesTotal) : '0' }}
                </td>

                <td class="text-mono font-bold text-amber">
                  {{ emp.borrowingsTotal > 0 ? '−' + formatNum(emp.borrowingsTotal) : '0' }}
                </td>

                <td class="text-mono font-bold text-danger">
                  {{ emp.penaltiesTotal > 0 ? '−' + formatNum(emp.penaltiesTotal) : '0' }}
                </td>

                <td v-if="isAdmin">
                  <div class="d-flex flex-column gap-1 align-items-start">
                    <span
                      class="net-pay-pill text-mono font-bold"
                      :class="emp.netPay < 0 ? 'is-negative' : 'is-positive'"
                    >
                      {{ formatCurrency(emp.netPay || 0) }}
                    </span>
                    <span v-if="emp.paidTotalThisMonth > 0" class="emp-paid-chip text-mono">
                      تم الصرف: {{ formatCurrency(emp.paidTotalThisMonth) }}
                    </span>
                  </div>
                </td>

                <td>
                  <div class="order-actions-btns flex-wrap">
                    <button
                      v-if="canSettleEmployee(emp)"
                      type="button"
                      class="btn-table-action emp-action-pay"
                      @click="openPayoutModal(emp)"
                      title="صرف مستحق الشهر وتصفير الحساب وطباعة فاتورة"
                      :aria-label="`صرف مستحق الموظف ${emp.name}`"
                    >
                      <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      <span>صرف المستحق</span>
                    </button>

                    <button
                      v-else-if="isAdmin && emp.latestPayout"
                      type="button"
                      class="btn-table-action emp-action-pay-done"
                      @click="printTransactionReceipt(emp.latestPayout)"
                      title="إعادة طباعة فاتورة الصرف الشهرية"
                      :aria-label="`طباعة فاتورة صرف ${emp.name}`"
                    >
                      <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                      <span>فاتورة الصرف</span>
                    </button>

                    <button
                      type="button"
                      class="btn-table-action emp-action-tx"
                      @click="openTransactionModal(emp, 'bonus')"
                      title="تسجيل مكافأة أو سلفة أو خصم"
                      :aria-label="`تسجيل عملية مالية للموظف ${emp.name}`"
                    >
                      <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      <span>عملية</span>
                    </button>

                    <button
                      v-if="isAdmin && emp.payType === 'production'"
                      type="button"
                      class="btn-table-action emp-action-coeff"
                      @click="openChefBreakdownModal(emp)"
                      title="معاملات وحسابات الإنتاج"
                      :aria-label="`معاملات إنتاج ${emp.name}`"
                    >
                      <span>المعاملات</span>
                    </button>

                    <button
                      type="button"
                      class="btn-table-action btn-action-edit"
                      @click="openEmployeeLedgerModal(emp)"
                      title="عرض السجل وإعادة طباعة الإيصالات"
                      :aria-label="`سجل عمليات ${emp.name}`"
                    >
                      <span>الإيصالات ({{ emp.txCount || 0 }})</span>
                    </button>

                    <button
                      v-if="isAdmin"
                      type="button"
                      class="btn-table-action btn-action-edit"
                      @click="openEmployeeModal(emp)"
                      title="تعديل بيانات الموظف"
                      :aria-label="`تعديل الموظف ${emp.name}`"
                    >
                      <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      <span>تعديل</span>
                    </button>

                    <button
                      v-if="isAdmin"
                      type="button"
                      class="btn-table-action btn-action-delete"
                      @click="deleteEmployee(emp)"
                      title="حذف الموظف"
                      :aria-label="`حذف الموظف ${emp.name}`"
                    >
                      <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      <span>حذف</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Employees Cards Grid -->
        <div class="mobile-emp-cards-grid">
          <div v-if="loading && employees.length === 0" class="p-4 text-center text-muted">
            جاري تحميل بيانات الموظفين…
          </div>
          <div v-else-if="filteredEmployees.length === 0" class="p-4 text-center text-muted">
            لا يوجد موظفون مطابقون للبحث.
          </div>
          <div
            v-else
            v-for="emp in filteredEmployees"
            :key="'mob-emp-' + emp._id"
            class="mobile-emp-card glass-panel"
            :class="{ 'emp-row-inactive': emp.active === false }"
          >
            <div class="mob-emp-header">
              <div class="emp-name-cell">
                <div class="emp-avatar" :class="emp.payType === 'production' ? 'is-chef' : 'is-fixed'">
                  {{ (emp.name || 'م').charAt(0) }}
                </div>
                <div>
                  <div class="d-flex align-items-center gap-1 flex-wrap">
                    <span class="font-bold text-dark">{{ emp.name }}</span>
                    <span v-if="emp.active === false" class="emp-status-tag inactive">موقوف</span>
                  </div>
                  <div class="d-flex align-items-center gap-1 mt-1 flex-wrap">
                    <span class="job-badge" :class="emp.payType === 'production' ? 'is-prod' : 'is-fixed'">{{ emp.jobName }}</span>
                    <span class="branch-badge" :class="'branch-' + emp.branch">{{ branchLabel(emp.branch) }}</span>
                  </div>
                </div>
              </div>

              <div v-if="emp.phone" class="d-flex align-items-center gap-2">
                <a :href="`tel:${cleanPhone(emp.phone)}`" class="emp-contact-circle lg call" :aria-label="`اتصال بالموظف ${emp.name}`">
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </a>
                <a v-if="whatsappUrl(emp.phone)" :href="whatsappUrl(emp.phone)" target="_blank" rel="noopener noreferrer" class="emp-contact-circle lg whatsapp" :aria-label="`واتساب للموظف ${emp.name}`">
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                </a>
              </div>
            </div>

            <div class="mob-emp-dates-strip">
              <div class="mob-date-item">
                <span class="lbl">تاريخ المباشرة</span>
                <span class="val text-mono" dir="ltr">{{ emp.startDate || 'غير محدد' }}</span>
              </div>
              <div class="mob-date-item">
                <span class="lbl">الشهادة الصحية</span>
                <span
                  class="hc-badge compact"
                  :class="getHealthCertInfo(emp.healthCertExpiry).className"
                  :title="getHealthCertInfo(emp.healthCertExpiry).tooltip"
                >
                  <span class="hc-dot" aria-hidden="true"></span>
                  <span class="hc-label">{{ getHealthCertInfo(emp.healthCertExpiry).label }}</span>
                  <span v-if="emp.healthCertExpiry" class="hc-date text-mono" dir="ltr">{{ emp.healthCertExpiry }}</span>
                  <span v-if="getHealthCertInfo(emp.healthCertExpiry).subLabel" class="hc-sub">{{ getHealthCertInfo(emp.healthCertExpiry).subLabel }}</span>
                </span>
              </div>
            </div>

            <div class="mob-emp-metrics">
              <div v-if="isAdmin" class="mob-metric">
                <span class="lbl">{{ emp.payType === 'production' ? 'مستحق الإنتاج' : 'الراتب الأساسي' }}</span>
                <span class="val text-mono font-bold">{{ formatCurrency(emp.effectiveGrossPay ?? (emp.payType === 'production' ? emp.productionGrossPay : emp.salary) ?? 0) }}</span>
              </div>
              <div class="mob-metric">
                <span class="lbl">المكافآت</span>
                <span class="val text-mono font-bold text-success">+{{ formatNum(emp.bonusesTotal) }}</span>
              </div>
              <div class="mob-metric">
                <span class="lbl">السلف والخصومات</span>
                <span class="val text-mono font-bold text-danger">−{{ formatNum((emp.borrowingsTotal || 0) + (emp.penaltiesTotal || 0)) }}</span>
              </div>
              <div v-if="isAdmin" class="mob-metric net">
                <span class="lbl">صافي المستحق</span>
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-1">
                  <span class="val text-mono font-bold text-primary">{{ formatCurrency(emp.netPay || 0) }}</span>
                  <span v-if="emp.paidTotalThisMonth > 0" class="emp-paid-chip text-mono">
                    تم الصرف: {{ formatCurrency(emp.paidTotalThisMonth) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="mob-emp-actions">
              <button
                v-if="canSettleEmployee(emp)"
                type="button"
                class="btn-table-action emp-action-pay"
                @click="openPayoutModal(emp)"
              >
                <span>صرف المستحق</span>
              </button>
              <button
                v-else-if="isAdmin && emp.latestPayout"
                type="button"
                class="btn-table-action emp-action-pay-done"
                @click="printTransactionReceipt(emp.latestPayout)"
              >
                <span>فاتورة الصرف</span>
              </button>
              <button type="button" class="btn-table-action emp-action-tx" @click="openTransactionModal(emp, 'bonus')">
                <span>+ مكافأة / سلفة / خصم</span>
              </button>
              <button v-if="isAdmin && emp.payType === 'production'" type="button" class="btn-table-action emp-action-coeff" @click="openChefBreakdownModal(emp)">
                <span>معاملات الأصناف</span>
              </button>
              <button type="button" class="btn-table-action btn-action-edit" @click="openEmployeeLedgerModal(emp)">
                <span>الإيصالات ({{ emp.txCount || 0 }})</span>
              </button>
              <button v-if="isAdmin" type="button" class="btn-table-action btn-action-edit" @click="openEmployeeModal(emp)">
                <span>تعديل</span>
              </button>
              <button v-if="isAdmin" type="button" class="btn-table-action btn-action-delete" @click="deleteEmployee(emp)">
                <span>حذف</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- SUB-TAB 2: TRANSACTIONS & RECEIPTS LOG (ADMIN & CASHIER)            -->
    <!-- ================================================================== -->
    <div v-else-if="subTab === 'transactions'" class="emp-transactions-view">
      <div class="table-card glass-panel overflow-hidden">
        <div class="card-toolbar-split">
          <div class="card-toolbar-top">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <h3 class="toolbar-title m-0">سجل المكافآت والسلف والخصومات والإيصالات</h3>
              <span class="toolbar-badge text-mono">{{ filteredTransactions.length }} عملية</span>
            </div>

            <div class="d-flex align-items-center gap-2 flex-wrap">
              <div class="emp-branch-pills">
                <button type="button" class="emp-filter-pill" :class="{ active: txScope === 'month' }" @click="setTxScope('month')">الشهر المحدد</button>
                <button type="button" class="emp-filter-pill" :class="{ active: txScope === 'all' }" @click="setTxScope('all')">كل السجل</button>
              </div>
              <div class="emp-branch-pills">
                <button type="button" class="emp-filter-pill" :class="{ active: txTypeFilter === '' }" @click="txTypeFilter = ''">الكل</button>
                <button type="button" class="emp-filter-pill" :class="{ active: txTypeFilter === 'bonus' }" @click="txTypeFilter = 'bonus'">مكافأة</button>
                <button type="button" class="emp-filter-pill" :class="{ active: txTypeFilter === 'borrowing' }" @click="txTypeFilter = 'borrowing'">سلفة</button>
                <button type="button" class="emp-filter-pill" :class="{ active: txTypeFilter === 'penalty' }" @click="txTypeFilter = 'penalty'">خصم</button>
                <button v-if="isAdmin" type="button" class="emp-filter-pill" :class="{ active: txTypeFilter === 'payout' }" @click="txTypeFilter = 'payout'">فواتير الصرف</button>
              </div>
            </div>
          </div>
        </div>

        <div class="table-container desktop-emp-table-wrap">
          <table class="admin-table desktop-emp-table">
            <thead>
              <tr>
                <th>رقم الإيصال</th>
                <th>التاريخ</th>
                <th>الموظف</th>
                <th>نوع العملية</th>
                <th>المبلغ</th>
                <th>السبب / البيان</th>
                <th>المسجل بواسطة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="txLoading">
                <td colspan="8" class="text-center p-4 text-muted">جاري تحميل السجل…</td>
              </tr>
              <tr v-else-if="filteredTransactions.length === 0">
                <td colspan="8" class="text-center p-4 text-muted">لا توجد عمليات مسجلة في هذا النطاق.</td>
              </tr>
              <tr v-else v-for="tx in filteredTransactions" :key="tx._id">
                <td class="text-mono font-bold">
                  #{{ tx.type === 'payout' ? 'PAY' : 'EMP' }}-{{ tx.txNumber || String(tx._id).slice(-5) }}
                </td>
                <td class="text-mono text-small">{{ formatArabicDate(tx.date) }}</td>
                <td>
                  <div class="d-flex flex-column">
                    <span class="font-bold">{{ tx.employeeName }}</span>
                    <span class="text-small text-muted">{{ tx.employeeJobName }} — {{ branchLabel(tx.branch) }}</span>
                  </div>
                </td>
                <td>
                  <div class="d-flex align-items-center gap-1 flex-wrap">
                    <span class="tx-type-badge" :class="'tx-' + tx.type">{{ txTypeLabel(tx.type) }}</span>
                    <span v-if="tx.settledByPayoutId" class="tx-settled-tag">مسوّى</span>
                  </div>
                </td>
                <td
                  class="text-mono font-bold"
                  :class="tx.type === 'payout' ? 'text-primary' : (tx.type === 'bonus' ? 'text-success' : 'text-danger')"
                >
                  {{ tx.type === 'payout' ? '' : (tx.type === 'bonus' ? '+' : '−') }}{{ formatCurrency(tx.amount) }}
                </td>
                <td class="tx-reason-cell">{{ tx.reason }}</td>
                <td>
                  <span class="text-small">{{ tx.recordedBy?.name || 'إدارة' }}</span>
                </td>
                <td>
                  <div class="order-actions-btns">
                    <button
                      type="button"
                      class="btn-table-action btn-action-edit"
                      @click="printTransactionReceipt(tx)"
                      :title="tx.type === 'payout' ? 'طباعة فاتورة الصرف' : 'طباعة أو إعادة طباعة الإيصال'"
                      :aria-label="`طباعة ${tx.type === 'payout' ? 'فاتورة #PAY-' : 'إيصال #EMP-'}${tx.txNumber || ''}`"
                    >
                      <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                      <span>{{ tx.type === 'payout' ? 'طباعة الفاتورة' : 'طباعة الإيصال' }}</span>
                    </button>
                    <button
                      v-if="isAdmin"
                      type="button"
                      class="btn-table-action btn-action-delete"
                      @click="deleteTransaction(tx)"
                      title="حذف السجل"
                      :aria-label="`حذف السجل #${tx.type === 'payout' ? 'PAY' : 'EMP'}-${tx.txNumber || ''}`"
                    >
                      <span>حذف</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Transactions Cards -->
        <div class="mobile-emp-cards-grid">
          <div v-if="txLoading" class="p-4 text-center text-muted">جاري تحميل السجل…</div>
          <div v-else-if="filteredTransactions.length === 0" class="p-4 text-center text-muted">لا توجد عمليات مسجلة في هذا النطاق.</div>
          <div v-else v-for="tx in filteredTransactions" :key="'mob-tx-' + tx._id" class="mobile-emp-card glass-panel">
            <div class="mob-emp-header">
              <div>
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <span class="text-mono font-bold">#{{ tx.type === 'payout' ? 'PAY' : 'EMP' }}-{{ tx.txNumber || String(tx._id).slice(-5) }}</span>
                  <span class="tx-type-badge" :class="'tx-' + tx.type">{{ txTypeLabel(tx.type) }}</span>
                  <span v-if="tx.settledByPayoutId" class="tx-settled-tag">مسوّى</span>
                </div>
                <div class="font-bold mt-1">{{ tx.employeeName }}</div>
                <div class="text-small text-muted">{{ formatArabicDate(tx.date) }} • {{ branchLabel(tx.branch) }}</div>
              </div>
              <div
                class="text-mono font-bold"
                :class="tx.type === 'payout' ? 'text-primary' : (tx.type === 'bonus' ? 'text-success' : 'text-danger')"
              >
                {{ tx.type === 'payout' ? '' : (tx.type === 'bonus' ? '+' : '−') }}{{ formatCurrency(tx.amount) }}
              </div>
            </div>
            <div class="tx-reason-box">
              <span class="text-muted text-small">السبب / البيان:</span>
              <p class="m-0 font-semibold">{{ tx.reason }}</p>
            </div>
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <span class="text-small text-muted">بواسطة: {{ tx.recordedBy?.name || 'إدارة' }}</span>
              <div class="d-flex gap-2">
                <button type="button" class="btn-table-action btn-action-edit" @click="printTransactionReceipt(tx)">
                  <span>{{ tx.type === 'payout' ? 'طباعة الفاتورة' : 'طباعة الإيصال' }}</span>
                </button>
                <button v-if="isAdmin" type="button" class="btn-table-action btn-action-delete" @click="deleteTransaction(tx)">
                  <span>حذف</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- SUB-TAB 3: JOBS CRUD (ADMIN ONLY)                                   -->
    <!-- ================================================================== -->
    <div v-else-if="subTab === 'jobs' && isAdmin" class="emp-jobs-view">
      <div class="table-card glass-panel overflow-hidden">
        <div class="table-container desktop-emp-table-wrap">
          <table class="admin-table desktop-emp-table">
            <thead>
              <tr>
                <th>المسمى الوظيفي</th>
                <th>نظام الاحتساب المالي</th>
                <th>الوصف</th>
                <th>عدد الموظفين</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="jobs.length === 0">
                <td colspan="5" class="text-center p-4 text-muted">لا توجد وظائف معرفة بعد.</td>
              </tr>
              <tr v-else v-for="j in jobs" :key="j._id">
                <td class="font-bold">{{ j.name }}</td>
                <td>
                  <span class="job-badge" :class="j.payType === 'production' ? 'is-prod' : 'is-fixed'">
                    {{ j.payType === 'production' ? 'نسبة إنتاج ومبيعات الأصناف (بدون راتب أساسي)' : 'راتب شهري ثابت' }}
                  </span>
                </td>
                <td class="text-muted text-small">{{ j.description || '-' }}</td>
                <td class="text-mono font-bold">{{ j.employeeCount || 0 }}</td>
                <td>
                  <div class="order-actions-btns">
                    <button type="button" class="btn-table-action btn-action-edit" @click="openJobModal(j)">
                      <span>تعديل</span>
                    </button>
                    <button type="button" class="btn-table-action btn-action-delete" @click="deleteJob(j)">
                      <span>حذف</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mobile-emp-cards-grid">
          <div v-for="j in jobs" :key="'mob-job-' + j._id" class="mobile-emp-card glass-panel">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div class="font-bold">{{ j.name }}</div>
                <span class="job-badge mt-1" :class="j.payType === 'production' ? 'is-prod' : 'is-fixed'">
                  {{ j.payType === 'production' ? 'إنتاج ومبيعات (بدون راتب ثابت)' : 'راتب شهري ثابت' }}
                </span>
              </div>
              <span class="toolbar-badge text-mono">{{ j.employeeCount || 0 }} موظف</span>
            </div>
            <p v-if="j.description" class="text-small text-muted m-0">{{ j.description }}</p>
            <div class="mob-emp-actions">
              <button type="button" class="btn-table-action btn-action-edit" @click="openJobModal(j)">تعديل</button>
              <button type="button" class="btn-table-action btn-action-delete" @click="deleteJob(j)">حذف</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- MODAL 1: ADD / EDIT EMPLOYEE (ADMIN ONLY)                           -->
    <!-- ================================================================== -->
    <Transition name="modal-spring-fade">
      <div v-if="employeeModalOpen" class="modal-overlay" @click.self="closeAllModals">
        <div
          ref="empModalRef"
          class="modal-box glass-panel max-w-lg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="emp-modal-title"
          v-sheet-gesture="closeAllModals"
        >
          <div class="sheet-grab-handle" aria-hidden="true"></div>
          <div class="modal-header">
            <div class="modal-title-group">
              <div class="modal-title-icon" aria-hidden="true">
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <h3 id="emp-modal-title">{{ empForm._id ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد' }}</h3>
            </div>
            <button type="button" @click="closeAllModals" class="modal-close-btn" aria-label="إغلاق">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <form @submit.prevent="saveEmployee" class="modal-form">
            <div class="form-row">
              <div class="form-group">
                <label for="emp-form-name" class="form-label">اسم الموظف *</label>
                <input id="emp-form-name" ref="empFirstInputRef" v-model="empForm.name" type="text" class="form-control" placeholder="الاسم الكامل للموظف…" required />
              </div>
              <div class="form-group">
                <label for="emp-form-phone" class="form-label">رقم الهاتف</label>
                <input id="emp-form-phone" v-model="empForm.phone" type="tel" class="form-control" dir="ltr" placeholder="09x-xxxxxxx…" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="emp-form-branch" class="form-label">الفرع *</label>
                <select id="emp-form-branch" v-model="empForm.branch" class="form-control" :disabled="userShopAccess !== 'all'">
                  <option value="shop1">المتجر الرئيسي</option>
                  <option value="shop2">قسم النواشف</option>
                  <option value="all" v-if="userShopAccess === 'all'">كلا الفرعين</option>
                </select>
              </div>
              <div class="form-group">
                <label for="emp-form-job" class="form-label">الوظيفة *</label>
                <select id="emp-form-job" v-model="empForm.jobId" class="form-control" required>
                  <option value="" disabled>اختر الوظيفة…</option>
                  <option v-for="j in jobs" :key="j._id" :value="String(j._id)">
                    {{ j.name }} ({{ j.payType === 'production' ? 'نسبة إنتاج' : 'راتب ثابت' }})
                  </option>
                </select>
              </div>
            </div>

            <div class="form-row emp-dates-form-row">
              <div class="form-group">
                <label class="form-label">تاريخ مباشرة العمل</label>
                <RtlDatePicker
                  v-model="empForm.startDate"
                  placeholder="تاريخ مباشرة العمل…"
                  ariaLabel="تاريخ مباشرة العمل"
                  :clearable="true"
                  :allowYearSelect="true"
                  popoverAlign="start"
                  :theme="activeShop"
                />
              </div>
              <div class="form-group">
                <div class="d-flex justify-content-between align-items-center mb-1 gap-2 flex-wrap">
                  <label class="form-label mb-0">انتهاء الشهادة الصحية</label>
                  <span
                    v-if="empForm.healthCertExpiry"
                    class="hc-inline-preview"
                    :class="getHealthCertInfo(empForm.healthCertExpiry).className"
                  >
                    <span class="hc-dot" aria-hidden="true"></span>
                    <span>{{ getHealthCertInfo(empForm.healthCertExpiry).label }}</span>
                  </span>
                </div>
                <RtlDatePicker
                  v-model="empForm.healthCertExpiry"
                  placeholder="تاريخ انتهاء الشهادة…"
                  ariaLabel="تاريخ انتهاء الشهادة الصحية"
                  :clearable="true"
                  :allowYearSelect="true"
                  popoverAlign="end"
                  :theme="activeShop"
                />
              </div>
            </div>

            <!-- Dynamic Pay Basis Section -->
            <div v-if="selectedFormJob?.payType === 'production'" class="emp-production-link-box mb-3">
              <div class="font-bold text-primary mb-1">نظام احتساب الشيف / المنتج (بدون راتب أساسي)</div>
              <p class="text-small text-muted mb-2">
                يتم احتساب الراتب تلقائياً من مجموع: <strong>(الكمية المباعة من كل صنف ينتجه الشيف × القيمة الثابتة للوحدة)</strong>. اختر ملف الشيف المرتبط من قسم الإنتاج:
              </p>

              <div v-if="chefsOptions.shop1.length === 0 && chefsOptions.shop2.length === 0" class="text-small text-muted">
                لا توجد ملفات شيفات مسجلة في قسم الإنتاج حالياً.
              </div>

              <div class="chef-link-groups" v-else>
                <div v-if="chefsOptions.shop1.length > 0 && (empForm.branch === 'shop1' || empForm.branch === 'all')" class="chef-link-group">
                  <div class="text-small font-bold mb-1">شيفات المتجر الرئيسي:</div>
                  <div class="chef-link-grid">
                    <label
                      v-for="ch in chefsOptions.shop1"
                      :key="'s1-' + ch.chefId"
                      class="chef-link-pill"
                      :class="{ selected: isChefLinked('shop1', ch.chefId) }"
                    >
                      <input type="checkbox" :checked="isChefLinked('shop1', ch.chefId)" :aria-label="'ربط الشيف ' + (ch.chefName || ch.name || '')" @change="toggleLinkedChef(ch)" />
                      <span>{{ ch.chefName }}</span>
                    </label>
                  </div>
                </div>

                <div v-if="chefsOptions.shop2.length > 0 && (empForm.branch === 'shop2' || empForm.branch === 'all')" class="chef-link-group mt-2">
                  <div class="text-small font-bold mb-1">شيفات قسم النواشف:</div>
                  <div class="chef-link-grid">
                    <label
                      v-for="ch in chefsOptions.shop2"
                      :key="'s2-' + ch.chefId"
                      class="chef-link-pill"
                      :class="{ selected: isChefLinked('shop2', ch.chefId) }"
                    >
                      <input type="checkbox" :checked="isChefLinked('shop2', ch.chefId)" :aria-label="'ربط الشيف ' + (ch.chefName || ch.name || '')" @change="toggleLinkedChef(ch)" />
                      <span>{{ ch.chefName }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="form-group">
              <label for="emp-form-salary" class="form-label">الراتب الشهري الأساسي (د.ل) *</label>
              <input id="emp-form-salary" v-model.number="empForm.salary" type="number" step="0.01" min="0" class="form-control" placeholder="0.00" required />
            </div>

            <div class="form-group">
              <label for="emp-form-notes" class="form-label">ملاحظات إضافية</label>
              <input id="emp-form-notes" v-model="empForm.notes" type="text" class="form-control" placeholder="ملاحظات اختيارية حول الموظف…" />
            </div>

            <div class="d-flex align-items-center gap-2 mb-2">
              <input id="emp-form-active" type="checkbox" v-model="empForm.active" />
              <label for="emp-form-active" class="font-bold m-0" style="cursor: pointer;">الموظف نشط حالياً ضمن مسير الرواتب</label>
            </div>

            <div class="modal-footer">
              <button type="submit" class="btn btn-primary btn-modal-save" :disabled="saving">
                <span>{{ saving ? 'جاري الحفظ…' : (empForm._id ? 'حفظ التعديلات' : 'إضافة الموظف') }}</span>
              </button>
              <button type="button" class="btn btn-outline" @click="closeAllModals">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ================================================================== -->
    <!-- MODAL 2: RECORD BONUS / BORROWING / PENALTY + PRINT RECEIPT         -->
    <!-- ================================================================== -->
    <Transition name="modal-spring-fade">
      <div v-if="txModalOpen" class="modal-overlay" @click.self="closeAllModals">
        <div
          ref="txModalRef"
          class="modal-box glass-panel max-w-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="emp-tx-modal-title"
          v-sheet-gesture="closeAllModals"
        >
          <div class="sheet-grab-handle" aria-hidden="true"></div>
          <div class="modal-header">
            <div class="modal-title-group">
              <div class="modal-title-icon" aria-hidden="true">
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </div>
              <h3 id="emp-tx-modal-title">تسجيل مكافأة أو سلفة أو خصم</h3>
            </div>
            <button type="button" @click="closeAllModals" class="modal-close-btn" aria-label="إغلاق">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <form @submit.prevent="saveTransaction" class="modal-form">
            <div class="form-group">
              <label class="form-label">نوع العملية المالية *</label>
              <div class="tx-type-selector">
                <button
                  type="button"
                  class="tx-sel-pill bonus"
                  :class="{ active: txForm.type === 'bonus' }"
                  @click="txForm.type = 'bonus'"
                >مكافأة (+)</button>
                <button
                  type="button"
                  class="tx-sel-pill borrowing"
                  :class="{ active: txForm.type === 'borrowing' }"
                  @click="txForm.type = 'borrowing'"
                >سلفة (−)</button>
                <button
                  type="button"
                  class="tx-sel-pill penalty"
                  :class="{ active: txForm.type === 'penalty' }"
                  @click="txForm.type = 'penalty'"
                >خصم (−)</button>
              </div>
            </div>

            <div class="form-group">
              <label for="tx-emp-select" class="form-label">الموظف *</label>
              <select id="tx-emp-select" v-model="txForm.employeeId" class="form-control" required>
                <option value="" disabled>اختر الموظف…</option>
                <option v-for="e in employees" :key="e._id" :value="String(e._id)">
                  {{ e.name }} — {{ e.jobName }} ({{ branchLabel(e.branch) }})
                </option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="tx-amount-input" class="form-label">المبلغ (د.ل) *</label>
                <input id="tx-amount-input" ref="txFirstInputRef" v-model.number="txForm.amount" type="number" step="0.01" min="0.01" class="form-control" placeholder="0.00" required />
              </div>
              <div class="form-group">
                <label class="form-label">تاريخ العملية *</label>
                <RtlDatePicker
                  v-model="txForm.date"
                  placeholder="تاريخ العملية…"
                  ariaLabel="اختيار تاريخ العملية"
                  :theme="activeShop"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="tx-reason-input" class="form-label">السبب / البيان الإلزامي *</label>
              <textarea
                id="tx-reason-input"
                v-model="txForm.reason"
                rows="3"
                class="form-control tx-reason-textarea"
                placeholder="سبب المكافأة أو السلفة أو الخصم ليُطبع في الإيصال ويُحفظ في السجل…"
                required
              ></textarea>
            </div>

            <div class="d-flex align-items-center gap-2 mb-2">
              <input id="tx-autoprint" type="checkbox" v-model="txAutoPrint" />
              <label for="tx-autoprint" class="font-bold m-0" style="cursor: pointer;">طباعة إيصال العملية تلقائياً فور الحفظ</label>
            </div>

            <div class="modal-footer">
              <button type="submit" class="btn btn-primary btn-modal-save" :disabled="saving">
                <span>{{ saving ? 'جاري التسجيل…' : (txAutoPrint ? 'حفظ وطباعة الإيصال' : 'حفظ العملية') }}</span>
              </button>
              <button type="button" class="btn btn-outline" @click="closeAllModals">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ================================================================== -->
    <!-- MODAL 3: CHEF PER-PRODUCT COEFFICIENTS & SALES BREAKDOWN (ADMIN)    -->
    <!-- ================================================================== -->
    <Transition name="modal-spring-fade">
      <div v-if="chefModalOpen && selectedChefEmp" class="modal-overlay" @click.self="closeAllModals">
        <div
          ref="chefModalRef"
          class="modal-box glass-panel modal-wide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chef-coeff-modal-title"
          v-sheet-gesture="closeAllModals"
        >
          <div class="sheet-grab-handle" aria-hidden="true"></div>
          <div class="modal-header">
            <div class="modal-title-group">
              <div class="modal-title-icon" aria-hidden="true">
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
              </div>
              <div>
                <h3 id="chef-coeff-modal-title">قيمة الوحدة وأرباح إنتاج الشيف: {{ selectedChefEmp.name }}</h3>
                <p class="text-small text-muted m-0">الفترة: {{ selectedMonthLabel }} — بدون راتب أساسي (مجموع الكمية المباعة لكل صنف × القيمة الثابتة للوحدة)</p>
              </div>
            </div>
            <button type="button" @click="closeAllModals" class="modal-close-btn" aria-label="إغلاق">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="chef-coeff-batch-bar mb-3">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <label for="uniform-coeff-input" class="font-bold text-small m-0">تطبيق قيمة ثابتة موحّدة للوحدة على كل الأصناف:</label>
              <div class="d-flex align-items-center gap-1">
                <input id="uniform-coeff-input" v-model.number="uniformCoeffValue" type="number" step="any" min="0" dir="ltr" class="form-control coeff-mini-input text-mono" placeholder="مثال: 5…" />
                <span class="coeff-pct-hint text-mono">د.ل</span>
              </div>
              <button type="button" class="btn btn-outline btn-xs" @click="applyUniformCoeff">تطبيق على الكل</button>
            </div>
            <span class="text-small text-muted">مثال: إدخال <code dir="ltr">5</code> يعني <strong dir="ltr">5 د.ل</strong> عن كل وحدة مباعة من الصنف</span>
          </div>

          <div v-if="editableBreakdown.length === 0" class="p-4 text-center text-muted">
            لا توجد أصناف مربوطة بهذا الشيف حالياً. تأكد من ربط الشيف في نافذة تعديل الموظف وتعيين الأصناف له في تبويب "إدارة الإنتاج".
          </div>

          <div v-else class="chef-coeff-table-scroll">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>الفرع</th>
                  <th>الكمية المباعة</th>
                  <th>إجمالي المبيعات</th>
                  <th>قيمة الوحدة (د.ل)</th>
                  <th>المستحق (الكمية × قيمة الوحدة)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in editableBreakdown" :key="row.shop + '-' + row.productId">
                  <td>
                    <div class="font-bold">{{ row.productName }}</div>
                    <span class="text-small text-muted">{{ row.category || '-' }}</span>
                  </td>
                  <td><span class="branch-badge" :class="'branch-' + row.shop">{{ branchLabel(row.shop) }}</span></td>
                  <td class="text-mono font-bold">{{ row.soldQty }}</td>
                  <td class="text-mono font-bold">{{ formatCurrency(row.totalSales) }}</td>
                  <td>
                    <div class="d-flex align-items-center gap-1">
                      <input
                        v-model.number="row.chefCoefficient"
                        type="number"
                        step="any"
                        min="0"
                        dir="ltr"
                        class="form-control coeff-cell-input text-mono"
                        :aria-label="`قيمة الوحدة لصنف ${row.productName}`"
                      />
                      <span class="coeff-pct-hint text-mono">د.ل</span>
                    </div>
                  </td>
                  <td class="text-mono font-bold text-primary">
                    {{ formatCurrency(round2((Number(row.soldQty) || 0) * Math.max(0, Number(row.chefCoefficient) || 0))) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="chef-coeff-summary mt-3">
            <div class="summary-chip">
              <span>مستحق الإنتاج:</span>
              <strong class="text-mono text-primary">{{ formatCurrency(liveChefGrossPay) }}</strong>
            </div>
            <div class="summary-chip">
              <span>المكافآت (+):</span>
              <strong class="text-mono text-success">+{{ formatNum(selectedChefEmp.bonusesTotal) }}</strong>
            </div>
            <div class="summary-chip">
              <span>السلف والخصم (−):</span>
              <strong class="text-mono text-danger">−{{ formatNum((selectedChefEmp.borrowingsTotal || 0) + (selectedChefEmp.penaltiesTotal || 0)) }}</strong>
            </div>
            <div class="summary-chip total">
              <span>صافي المستحق:</span>
              <strong class="text-mono">{{ formatCurrency(liveChefNetPay) }}</strong>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-primary btn-modal-save" :disabled="saving || editableBreakdown.length === 0" @click="saveChefCoefficients">
              <span>{{ saving ? 'جاري الحفظ…' : 'حفظ قيم الوحدات وتحديث المستحق' }}</span>
            </button>
            <button type="button" class="btn btn-outline" @click="closeAllModals">إغلاق</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ================================================================== -->
    <!-- MODAL 4: ADD / EDIT JOB (ADMIN ONLY)                                -->
    <!-- ================================================================== -->
    <Transition name="modal-spring-fade">
      <div v-if="jobModalOpen" class="modal-overlay" @click.self="closeAllModals">
        <div
          ref="jobModalRef"
          class="modal-box glass-panel max-w-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="job-modal-title"
          v-sheet-gesture="closeAllModals"
        >
          <div class="sheet-grab-handle" aria-hidden="true"></div>
          <div class="modal-header">
            <div class="modal-title-group">
              <div class="modal-title-icon" aria-hidden="true">
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </div>
              <h3 id="job-modal-title">{{ jobForm._id ? 'تعديل الوظيفة' : 'إضافة وظيفة جديدة' }}</h3>
            </div>
            <button type="button" @click="closeAllModals" class="modal-close-btn" aria-label="إغلاق">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <form @submit.prevent="saveJob" class="modal-form">
            <div class="form-group">
              <label for="job-name-input" class="form-label">اسم الوظيفة *</label>
              <input id="job-name-input" ref="jobFirstInputRef" v-model="jobForm.name" type="text" class="form-control" placeholder="مثال: شيف حلويات غربية…" required />
            </div>

            <div class="form-group">
              <label for="job-paytype-select" class="form-label">طريقة احتساب الراتب *</label>
              <select id="job-paytype-select" v-model="jobForm.payType" class="form-control">
                <option value="fixed">راتب شهري ثابت</option>
                <option value="production">إنتاج الأصناف (قيمة ثابتة لكل وحدة — بدون راتب أساسي)</option>
              </select>
            </div>

            <div class="form-group">
              <label for="job-desc-input" class="form-label">وصف مختصر</label>
              <input id="job-desc-input" v-model="jobForm.description" type="text" class="form-control" placeholder="مهام الوظيفة أو ملاحظات…" />
            </div>

            <div class="modal-footer">
              <button type="submit" class="btn btn-primary btn-modal-save" :disabled="saving">
                <span>{{ saving ? 'جاري الحفظ…' : 'حفظ الوظيفة' }}</span>
              </button>
              <button type="button" class="btn btn-outline" @click="closeAllModals">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ================================================================== -->
    <!-- MODAL 5: EMPLOYEE LEDGER & RECEIPT RE-ACCESS                        -->
    <!-- ================================================================== -->
    <Transition name="modal-spring-fade">
      <div v-if="ledgerModalOpen && ledgerEmp" class="modal-overlay" @click.self="closeAllModals">
        <div
          ref="ledgerModalRef"
          class="modal-box glass-panel modal-wide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="emp-ledger-modal-title"
          v-sheet-gesture="closeAllModals"
        >
          <div class="sheet-grab-handle" aria-hidden="true"></div>
          <div class="modal-header">
            <div class="modal-title-group">
              <div class="modal-title-icon" aria-hidden="true">
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div>
                <h3 id="emp-ledger-modal-title">سجل وإيصالات الموظف: {{ ledgerEmp.name }}</h3>
                <p class="text-small text-muted m-0">{{ ledgerEmp.jobName }} — {{ branchLabel(ledgerEmp.branch) }}</p>
              </div>
            </div>
            <button type="button" @click="closeAllModals" class="modal-close-btn" aria-label="إغلاق">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <span class="toolbar-badge text-mono">{{ ledgerTxs.length }} إيصال مسجل</span>
            <button type="button" class="btn btn-primary btn-xs" @click="openTransactionModal(ledgerEmp, 'bonus')">
              + تسجيل عملية جديدة
            </button>
          </div>

          <div v-if="ledgerLoading" class="p-4 text-center text-muted">جاري تحميل الإيصالات…</div>
          <div v-else-if="ledgerTxs.length === 0" class="p-4 text-center text-muted">لا توجد مكافآت أو سلف أو خصومات مسجلة لهذا الموظف بعد.</div>
          <div v-else class="chef-coeff-table-scroll">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>الإيصال</th>
                  <th>التاريخ</th>
                  <th>النوع</th>
                  <th>المبلغ</th>
                  <th>السبب / البيان</th>
                  <th>بواسطة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tx in ledgerTxs" :key="'led-' + tx._id">
                  <td class="text-mono font-bold">#{{ tx.type === 'payout' ? 'PAY' : 'EMP' }}-{{ tx.txNumber || String(tx._id).slice(-5) }}</td>
                  <td class="text-mono text-small">{{ formatArabicDate(tx.date) }}</td>
                  <td>
                    <div class="d-flex align-items-center gap-1 flex-wrap">
                      <span class="tx-type-badge" :class="'tx-' + tx.type">{{ txTypeLabel(tx.type) }}</span>
                      <span v-if="tx.settledByPayoutId" class="tx-settled-tag">مسوّى</span>
                    </div>
                  </td>
                  <td
                    class="text-mono font-bold"
                    :class="tx.type === 'payout' ? 'text-primary' : (tx.type === 'bonus' ? 'text-success' : 'text-danger')"
                  >
                    {{ tx.type === 'payout' ? '' : (tx.type === 'bonus' ? '+' : '−') }}{{ formatCurrency(tx.amount) }}
                  </td>
                  <td>{{ tx.reason }}</td>
                  <td class="text-small">{{ tx.recordedBy?.name || 'إدارة' }}</td>
                  <td>
                    <button type="button" class="btn-table-action btn-action-edit" @click="printTransactionReceipt(tx)">
                      {{ tx.type === 'payout' ? 'طباعة الفاتورة' : 'طباعة الإيصال' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ================================================================== -->
    <!-- MODAL 6: PAY EMPLOYEE & RESET MONTHLY DUES (ADMIN ONLY)            -->
    <!-- ================================================================== -->
    <Transition name="modal-spring-fade">
      <div v-if="payoutModalOpen && payoutEmp && isAdmin" class="modal-overlay" @click.self="closeAllModals">
        <div
          ref="payoutModalRef"
          class="modal-box glass-panel modal-wide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="emp-payout-modal-title"
          v-sheet-gesture="closeAllModals"
        >
          <div class="sheet-grab-handle" aria-hidden="true"></div>
          <div class="modal-header">
            <div class="modal-title-group">
              <div class="modal-title-icon payout" aria-hidden="true">
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div>
                <h3 id="emp-payout-modal-title">صرف وتصفية مستحقات: {{ payoutEmp.name }}</h3>
                <p class="text-small text-muted m-0">
                  {{ payoutEmp.jobName }} — {{ branchLabel(payoutEmp.branch) }} | شهر التصفية: {{ selectedMonthLabel }}
                </p>
              </div>
            </div>
            <button type="button" @click="closeAllModals" class="modal-close-btn" aria-label="إغلاق">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <form @submit.prevent="confirmEmployeePayout" class="modal-form">
            <!-- Summary Breakdown Chips -->
            <div class="emp-payout-breakdown-grid mb-3">
              <div class="payout-stat-chip">
                <span class="lbl">{{ payoutEmp.payType === 'production' ? 'مستحق الإنتاج غير المدفوع' : 'الراتب الأساسي المتبقي' }}</span>
                <strong class="val text-mono text-primary">{{ formatCurrency(payoutEmp.effectiveGrossPay ?? 0) }}</strong>
              </div>
              <div class="payout-stat-chip is-bonus">
                <span class="lbl">المكافآت (+)</span>
                <strong class="val text-mono text-success">+{{ formatNum(payoutEmp.bonusesTotal) }}</strong>
              </div>
              <div class="payout-stat-chip is-borrowing">
                <span class="lbl">السلف (−)</span>
                <strong class="val text-mono text-amber">−{{ formatNum(payoutEmp.borrowingsTotal) }}</strong>
              </div>
              <div class="payout-stat-chip is-penalty">
                <span class="lbl">الخصومات (−)</span>
                <strong class="val text-mono text-danger">−{{ formatNum(payoutEmp.penaltiesTotal) }}</strong>
              </div>
            </div>

            <!-- Itemized Unsettled Bonuses & Deductions -->
            <div class="mb-3">
              <div class="font-bold text-small mb-2">
                تفاصيل المكافآت والخصومات المشمولة في هذه الفاتورة ({{ (payoutEmp.unsettledItems || []).length }}):
              </div>
              <div v-if="!payoutEmp.unsettledItems || payoutEmp.unsettledItems.length === 0" class="p-3 text-center text-muted emp-payout-empty-items">
                لا توجد مكافآت أو سلف أو خصومات غير مسوّاة لهذا الشهر — سيتم صرف الراتب/الإنتاج المستحق فقط.
              </div>
              <div v-else class="chef-coeff-table-scroll emp-payout-items-scroll">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>الإيصال</th>
                      <th>التاريخ</th>
                      <th>النوع</th>
                      <th>البيان</th>
                      <th>المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in payoutEmp.unsettledItems" :key="'pi-' + item._id">
                      <td class="text-mono font-bold">#EMP-{{ item.txNumber || String(item._id).slice(-5) }}</td>
                      <td class="text-mono text-small">{{ formatArabicDate(item.date) }}</td>
                      <td><span class="tx-type-badge" :class="'tx-' + item.type">{{ txTypeLabel(item.type) }}</span></td>
                      <td>{{ item.reason }}</td>
                      <td class="text-mono font-bold" :class="item.type === 'bonus' ? 'text-success' : 'text-danger'">
                        {{ item.type === 'bonus' ? '+' : '−' }}{{ formatCurrency(item.amount) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Prominent Total Pay to Receive Box -->
            <div class="emp-payout-total-banner mb-3" :class="{ 'is-negative': payoutEmp.netPay < 0 }">
              <div class="d-flex flex-column gap-1">
                <span class="font-extrabold">صافي المبلغ المستلم (الإجمالي الواجب دفعه)</span>
                <small class="text-small">سيتم تصفير رصيد هذا الشهر إلى 0 د.ل وإغلاق البنود أعلاه فور الاعتماد.</small>
              </div>
              <span class="emp-payout-total-val text-mono">{{ formatCurrency(payoutEmp.netPay || 0) }}</span>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">تاريخ الصرف *</label>
                <RtlDatePicker
                  v-model="payoutForm.date"
                  placeholder="تاريخ الصرف…"
                  ariaLabel="تاريخ الصرف"
                  :theme="activeShop"
                />
              </div>
              <div class="form-group">
                <label for="payout-note-input" class="form-label">ملاحظة الفاتورة (اختياري)</label>
                <input
                  id="payout-note-input"
                  v-model="payoutForm.note"
                  type="text"
                  class="form-control"
                  :placeholder="`تصفية وصرف مستحقات ${selectedMonthLabel}…`"
                />
              </div>
            </div>

            <div class="d-flex align-items-center gap-2 mb-2">
              <input id="payout-autoprint" type="checkbox" v-model="payoutAutoPrint" />
              <label for="payout-autoprint" class="font-bold m-0" style="cursor: pointer;">طباعة فاتورة الصرف المفصّلة تلقائياً فور الاعتماد</label>
            </div>

            <div class="modal-footer">
              <button
                type="submit"
                class="btn btn-emerald btn-modal-save"
                :disabled="saving || (payoutEmp.netPay || 0) < 0"
              >
                <span>{{ saving ? 'جاري اعتماد الصرف…' : 'اعتماد الصرف وتصفير مستحق الشهر' }}</span>
              </button>
              <button type="button" class="btn btn-outline" @click="closeAllModals">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ================================================================== -->
    <!-- PRINT VIEW 1: A5 EMPLOYEE TRANSACTION OR PAYOUT INVOICE (BODY)     -->
    <!-- ================================================================== -->
    <Teleport to="body">
      <div v-if="printingTxReceipt && activePrintTx" class="emp-tx-receipt-print-wrapper" dir="rtl">
        <div class="emp-tx-receipt-page" :class="{ 'is-payout-invoice': activePrintTx.type === 'payout' }">
          <div class="emp-receipt-header">
            <img :src="activePrintTx.branch === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'" alt="Logo" class="emp-receipt-logo" />
            <div>
              <h1 class="emp-receipt-shop">{{ activePrintTx.branch === 'shop2' ? 'قسم النواشف — حلويات عبمبر الزروق' : 'حلويات عبمبر الزروق' }}</h1>
              <p class="emp-receipt-sub">إدارة شؤون الموظفين والحسابات الداخلية</p>
            </div>
            <div class="emp-receipt-badge">
              {{ txReceiptTitle(activePrintTx.type) }}
            </div>
          </div>

          <div class="emp-receipt-divider"></div>

          <div class="emp-receipt-meta-grid">
            <div class="meta-item">
              <span class="meta-lbl">{{ activePrintTx.type === 'payout' ? 'رقم الفاتورة:' : 'رقم الإيصال:' }}</span>
              <span class="meta-val text-mono">#{{ activePrintTx.type === 'payout' ? 'PAY' : 'EMP' }}-{{ activePrintTx.txNumber || String(activePrintTx._id).slice(-6) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-lbl">{{ activePrintTx.type === 'payout' ? 'تاريخ الصرف:' : 'تاريخ العملية:' }}</span>
              <span class="meta-val">{{ formatArabicDate(activePrintTx.date) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-lbl">اسم الموظف:</span>
              <span class="meta-val">{{ activePrintTx.employeeName }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-lbl">الوظيفة / الفرع:</span>
              <span class="meta-val">{{ activePrintTx.employeeJobName || '-' }} — {{ branchLabel(activePrintTx.branch) }}</span>
            </div>
            <div class="meta-item" v-if="activePrintTx.type === 'payout'">
              <span class="meta-lbl">شهر التسوية:</span>
              <span class="meta-val text-mono" dir="ltr">{{ activePrintTx.monthKey }}</span>
            </div>
            <div class="meta-item" v-else-if="activePrintTx.employeePhone">
              <span class="meta-lbl">رقم الهاتف:</span>
              <span class="meta-val text-mono" dir="ltr">{{ activePrintTx.employeePhone }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-lbl">{{ activePrintTx.type === 'payout' ? 'معتمد الصرف:' : 'المسجل بواسطة:' }}</span>
              <span class="meta-val">{{ activePrintTx.recordedBy?.name || 'الإدارة' }}</span>
            </div>
          </div>

          <!-- PAYOUT INVOICE BODY (WITH ALL BONUSES, DEDUCTIONS & TOTAL RECEIVED) -->
          <template v-if="activePrintTx.type === 'payout' && activePrintTx.payoutDetails">
            <div class="emp-payout-summary-grid">
              <div class="ps-cell">
                <span class="ps-lbl">{{ activePrintTx.payoutDetails.payType === 'production' ? 'مستحق الإنتاج' : 'الراتب الأساسي' }}</span>
                <strong class="ps-val text-mono">{{ formatCurrency(activePrintTx.payoutDetails.grossPaySettled || 0) }}</strong>
              </div>
              <div class="ps-cell">
                <span class="ps-lbl">إجمالي المكافآت (+)</span>
                <strong class="ps-val text-mono">+{{ formatNum(activePrintTx.payoutDetails.bonusesTotal || 0) }}</strong>
              </div>
              <div class="ps-cell">
                <span class="ps-lbl">إجمالي السلف (−)</span>
                <strong class="ps-val text-mono">−{{ formatNum(activePrintTx.payoutDetails.borrowingsTotal || 0) }}</strong>
              </div>
              <div class="ps-cell">
                <span class="ps-lbl">إجمالي الخصومات (−)</span>
                <strong class="ps-val text-mono">−{{ formatNum(activePrintTx.payoutDetails.penaltiesTotal || 0) }}</strong>
              </div>
            </div>

            <div class="emp-payout-items-section" v-if="activePrintTx.payoutDetails.settledTransactions && activePrintTx.payoutDetails.settledTransactions.length > 0">
              <div class="reason-card-title">بيان المكافآت والسلف والخصومات المسوّاة:</div>
              <table class="emp-payout-items-table">
                <thead>
                  <tr>
                    <th>الإيصال</th>
                    <th>التاريخ</th>
                    <th>النوع</th>
                    <th>البيان</th>
                    <th>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="st in activePrintTx.payoutDetails.settledTransactions" :key="'pst-' + st._id">
                    <td class="text-mono">#EMP-{{ st.txNumber }}</td>
                    <td class="text-mono">{{ st.date }}</td>
                    <td>{{ txTypeLabel(st.type) }}</td>
                    <td>{{ st.reason }}</td>
                    <td class="text-mono font-bold">{{ st.type === 'bonus' ? '+' : '−' }}{{ formatCurrency(st.amount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="emp-receipt-amount-box is-payout">
              <span class="amount-box-label">صافي المبلغ المستلم (الإجمالي المدفوع)</span>
              <span class="amount-box-value text-mono">{{ formatCurrency(activePrintTx.amount) }}</span>
            </div>

            <div v-if="activePrintTx.reason" class="emp-payout-note-line">
              <span class="font-bold">بيان الصرف:</span> {{ activePrintTx.reason }}
            </div>
          </template>

          <!-- SINGLE TRANSACTION RECEIPT BODY -->
          <template v-else>
            <div class="emp-receipt-amount-box" :class="'is-' + activePrintTx.type">
              <span class="amount-box-label">المبلغ المعتمد ({{ txTypeLabel(activePrintTx.type) }})</span>
              <span class="amount-box-value text-mono">{{ formatCurrency(activePrintTx.amount) }}</span>
            </div>

            <div class="emp-receipt-reason-card">
              <div class="reason-card-title">السبب والبيان:</div>
              <p class="reason-card-text">{{ activePrintTx.reason }}</p>
            </div>
          </template>

          <div class="emp-receipt-barcode-box">
            <svg id="barcode-emp-tx" aria-hidden="true" class="emp-receipt-barcode-svg"></svg>
          </div>

          <div class="emp-receipt-signatures">
            <div class="sig-col">
              <span class="sig-title">{{ activePrintTx.type === 'payout' ? 'توقيع الموظف باستلام كامل المستحق وتصفية الشهر' : 'توقيع المستلم / الموظف' }}</span>
              <span class="sig-line">...................................</span>
            </div>
            <div class="sig-col">
              <span class="sig-title">{{ activePrintTx.type === 'payout' ? 'اعتماد الإدارة / المحاسب' : 'توقيع المسؤول / المحاسب' }}</span>
              <span class="sig-line">...................................</span>
            </div>
          </div>

          <div class="emp-receipt-footer">
            <span>طُبع بتاريخ: {{ new Date(activePrintTx.createdAt || Date.now()).toLocaleString('ar-LY') }}</span>
            <span>نظام إدارة المنيو والموظفين — عبمبر الزروق</span>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ================================================================== -->
    <!-- PRINT VIEW 2: A4 MONTHLY PAYROLL REPORT (ADMIN ONLY)                -->
    <!-- ================================================================== -->
    <Teleport to="body">
      <div v-if="printingPayroll && isAdmin" class="emp-payroll-print-wrapper" dir="rtl">
        <div class="emp-payroll-page">
          <div class="emp-receipt-header">
            <img :src="activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'" alt="Logo" class="emp-receipt-logo" />
            <div>
              <h1 class="emp-receipt-shop">كشف مسير رواتب ومستحقات الموظفين</h1>
              <p class="emp-receipt-sub">الشهر: {{ selectedMonthLabel }} — النطاق: {{ branchLabel(branchFilter) }}</p>
            </div>
            <div class="emp-receipt-badge">تقرير مالي معتمد</div>
          </div>

          <div class="emp-receipt-divider"></div>

          <div class="emp-payroll-kpis">
            <div class="p-kpi"><span>الرواتب الثابتة:</span><strong>{{ formatCurrency(kpis.totalFixedSalaries) }}</strong></div>
            <div class="p-kpi"><span>إنتاج الشيفات:</span><strong>{{ formatCurrency(kpis.totalProductionPay) }}</strong></div>
            <div class="p-kpi"><span>المكافآت (+):</span><strong>+{{ formatNum(kpis.totalBonuses) }}</strong></div>
            <div class="p-kpi"><span>السلف والخصم (−):</span><strong>−{{ formatNum(kpis.totalDeductions) }}</strong></div>
            <div class="p-kpi total"><span>صافي المستحق:</span><strong>{{ formatCurrency(kpis.totalNetPay) }}</strong></div>
          </div>

          <table class="emp-payroll-table">
            <thead>
              <tr>
                <th>#</th>
                <th>الموظف</th>
                <th>الفرع</th>
                <th>الوظيفة</th>
                <th>الأساسي / الإنتاج</th>
                <th>المكافآت</th>
                <th>السلف</th>
                <th>الخصم</th>
                <th>صافي المستحق</th>
                <th>التوقيع</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(emp, idx) in sortedPrintEmployees" :key="'pr-' + emp._id">
                <td>{{ idx + 1 }}</td>
                <td>{{ emp.name }}</td>
                <td>{{ branchLabel(emp.branch) }}</td>
                <td>{{ emp.jobName }}</td>
                <td class="text-mono">{{ formatNum(emp.effectiveGrossPay ?? (emp.payType === 'production' ? emp.productionGrossPay : emp.salary) ?? 0) }}</td>
                <td class="text-mono">{{ emp.bonusesTotal > 0 ? '+' + formatNum(emp.bonusesTotal) : '0' }}</td>
                <td class="text-mono">{{ emp.borrowingsTotal > 0 ? '−' + formatNum(emp.borrowingsTotal) : '0' }}</td>
                <td class="text-mono">{{ emp.penaltiesTotal > 0 ? '−' + formatNum(emp.penaltiesTotal) : '0' }}</td>
                <td class="text-mono font-bold">{{ formatCurrency(emp.netPay) }}</td>
                <td>............</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" class="font-bold">الإجمالي العام</td>
                <td class="text-mono font-bold">{{ formatNum(round2(kpis.totalFixedSalaries + kpis.totalProductionPay)) }}</td>
                <td class="text-mono font-bold">+{{ formatNum(kpis.totalBonuses) }}</td>
                <td class="text-mono font-bold">−{{ formatNum(kpis.totalBorrowings) }}</td>
                <td class="text-mono font-bold">−{{ formatNum(kpis.totalPenalties) }}</td>
                <td class="text-mono font-bold">{{ formatCurrency(kpis.totalNetPay) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <div class="emp-receipt-signatures mt-4">
            <div class="sig-col">
              <span class="sig-title">إعداد المحاسب:</span>
              <span class="sig-line">...................................</span>
            </div>
            <div class="sig-col">
              <span class="sig-title">اعتماد الإدارة العامة:</span>
              <span class="sig-line">...................................</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import JsBarcode from 'jsbarcode';
import RtlDatePicker from './RtlDatePicker.vue';
import { vSheetGesture } from '../utils/sheetGesture';
import { useToastStore } from '../stores/toast';
import { useConfirmStore } from '../stores/confirm';
import { formatLibyanWhatsappNumber, cleanPhoneDigits } from '../utils/phone';
import { lockBodyScroll, unlockBodyScroll, trapTabKey, restoreElementFocus } from '../utils/modalA11y';

export default {
  name: 'AdminEmployeesTab',
  components: { RtlDatePicker },
  directives: { sheetGesture: vSheetGesture },
  props: {
    activeShop: { type: String, default: 'shop1' },
    userRole: { type: String, default: 'admin' },
    userShopAccess: { type: String, default: 'all' },
    isMobileScreen: { type: Boolean, default: false },
    adminFetch: { type: Function, required: true }
  },
  emits: ['count-change'],
  setup(props, { emit }) {
    const toast = useToastStore();
    const confirmStore = useConfirmStore();

    const isAdmin = computed(() => props.userRole === 'admin');
    const loading = ref(false);
    const saving = ref(false);
    const txLoading = ref(false);
    const ledgerLoading = ref(false);

    const subTab = ref('payroll');
    const searchQuery = ref('');
    const branchFilter = ref(props.userShopAccess !== 'all' ? props.userShopAccess : 'all');

    const getCurrentMonthKey = () => new Date().toLocaleDateString('en-CA').slice(0, 7);
    const selectedMonth = ref(getCurrentMonthKey());
    const txScope = ref('month'); // 'month' | 'all'
    const txTypeFilter = ref('');

    const employees = ref([]);
    const jobs = ref([]);
    const transactions = ref([]);
    const chefsOptions = reactive({ shop1: [], shop2: [] });
    const kpis = reactive({
      totalEmployees: 0,
      activeCount: 0,
      totalFixedSalaries: 0,
      totalProductionPay: 0,
      totalBonuses: 0,
      totalBorrowings: 0,
      totalPenalties: 0,
      totalDeductions: 0,
      totalPaidOut: 0,
      totalNetPay: 0
    });

    // Modals state & A11y refs
    const employeeModalOpen = ref(false);
    const txModalOpen = ref(false);
    const chefModalOpen = ref(false);
    const jobModalOpen = ref(false);
    const ledgerModalOpen = ref(false);
    const payoutModalOpen = ref(false);

    const empModalRef = ref(null);
    const txModalRef = ref(null);
    const chefModalRef = ref(null);
    const jobModalRef = ref(null);
    const ledgerModalRef = ref(null);
    const payoutModalRef = ref(null);
    const empFirstInputRef = ref(null);
    const txFirstInputRef = ref(null);
    const jobFirstInputRef = ref(null);

    let lastFocusedBeforeModal = null;
    let scrollLockActive = false;

    const anyModalOpen = computed(() =>
      employeeModalOpen.value || txModalOpen.value || chefModalOpen.value || jobModalOpen.value || ledgerModalOpen.value || payoutModalOpen.value
    );

    watch(anyModalOpen, (open) => {
      if (open) {
        if (!scrollLockActive) {
          lastFocusedBeforeModal = document.activeElement;
          lockBodyScroll(true);
          scrollLockActive = true;
        }
      } else if (scrollLockActive) {
        unlockBodyScroll(true);
        scrollLockActive = false;
        const prev = lastFocusedBeforeModal;
        lastFocusedBeforeModal = null;
        nextTick(() => restoreElementFocus(prev));
      }
    });

    const closeTopModal = () => {
      if (payoutModalOpen.value) { payoutModalOpen.value = false; return; }
      if (ledgerModalOpen.value && !txModalOpen.value) {
        ledgerModalOpen.value = false;
        return;
      }
      if (txModalOpen.value) { txModalOpen.value = false; return; }
      if (jobModalOpen.value) { jobModalOpen.value = false; return; }
      if (chefModalOpen.value) { chefModalOpen.value = false; return; }
      if (employeeModalOpen.value) { employeeModalOpen.value = false; return; }
      if (ledgerModalOpen.value) { ledgerModalOpen.value = false; }
    };

    const closeAllModals = () => {
      closeTopModal();
    };

    const getTopDialogEl = () => {
      const candidates = [txModalRef.value, payoutModalRef.value, jobModalRef.value, chefModalRef.value, empModalRef.value, ledgerModalRef.value].filter(Boolean);
      return candidates[0] || null;
    };

    const handleGlobalModalKey = (e) => {
      if (!anyModalOpen.value || confirmStore.isOpen || e.defaultPrevented) return;
      if (document.querySelector('.datepicker-popover')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeTopModal();
        return;
      }
      if (e.key === 'Tab') {
        const dialog = getTopDialogEl();
        if (dialog) trapTabKey(e, dialog);
      }
    };

    // Forms
    const empForm = reactive({
      _id: '',
      name: '',
      phone: '',
      branch: props.userShopAccess !== 'all' ? props.userShopAccess : 'shop1',
      jobId: '',
      salary: 0,
      linkedChefs: [],
      active: true,
      startDate: '',
      healthCertExpiry: '',
      notes: ''
    });

    const txForm = reactive({
      employeeId: '',
      type: 'bonus',
      amount: null,
      date: new Date().toLocaleDateString('en-CA'),
      reason: ''
    });
    const txAutoPrint = ref(true);

    const payoutEmp = ref(null);
    const payoutAutoPrint = ref(true);
    const payoutForm = reactive({
      date: new Date().toLocaleDateString('en-CA'),
      note: ''
    });

    const jobForm = reactive({
      _id: '',
      name: '',
      payType: 'fixed',
      description: ''
    });

    const selectedChefEmp = ref(null);
    const editableBreakdown = ref([]);
    const uniformCoeffValue = ref(1);

    const ledgerEmp = ref(null);
    const ledgerTxs = ref([]);

    // Print state
    const printingTxReceipt = ref(false);
    const activePrintTx = ref(null);
    const printingPayroll = ref(false);

    // Formatters & Helpers
    const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
    const formatNum = (val) => {
      const n = round2(val);
      return Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(2);
    };
    const formatCurrency = (val) => `${formatNum(val)} د.ل`;
    const formatArabicDate = (isoStr) => {
      if (!isoStr) return '-';
      const d = new Date(isoStr.length === 10 ? `${isoStr}T12:00:00` : isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('ar-LY', { year: 'numeric', month: 'short', day: 'numeric' });
    };
    const branchLabel = (b) => {
      if (b === 'shop1') return 'المتجر الرئيسي';
      if (b === 'shop2') return 'قسم النواشف';
      return 'جميع الفروع';
    };
    const txTypeLabel = (t) => {
      if (t === 'bonus') return 'مكافأة';
      if (t === 'borrowing') return 'سلفة';
      if (t === 'penalty') return 'خصم';
      if (t === 'payout') return 'صرف مستحقات';
      return t;
    };
    const txReceiptTitle = (t) => {
      if (t === 'bonus') return 'إيصال صرف مكافأة';
      if (t === 'borrowing') return 'إيصال استلام سلفة';
      if (t === 'penalty') return 'إشعار خصم إداري';
      if (t === 'payout') return 'فاتورة صرف راتب ومستحقات';
      return 'إيصال مالي';
    };
    const cleanPhone = (p) => cleanPhoneDigits(p || '');
    const whatsappUrl = (p) => {
      const cleaned = formatLibyanWhatsappNumber(p || '');
      return cleaned ? `https://wa.me/${cleaned}` : '';
    };

    const selectedMonthLabel = computed(() => {
      const [y, m] = selectedMonth.value.split('-').map(Number);
      const d = new Date(y || new Date().getFullYear(), (m || 1) - 1, 1);
      return d.toLocaleDateString('ar-LY', { month: 'long', year: 'numeric' });
    });
    const selectedMonthShort = computed(() => {
      const [y, m] = selectedMonth.value.split('-').map(Number);
      const d = new Date(y || new Date().getFullYear(), (m || 1) - 1, 1);
      return d.toLocaleDateString('ar-LY', { month: 'short' });
    });
    const isCurrentMonth = computed(() => selectedMonth.value === getCurrentMonthKey());

    const shiftMonth = (delta) => {
      const [y, m] = selectedMonth.value.split('-').map(Number);
      const d = new Date(y, (m - 1) + delta, 1);
      const nextKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      selectedMonth.value = nextKey;
    };
    const resetToCurrentMonth = () => {
      selectedMonth.value = getCurrentMonthKey();
    };
    const setBranchFilter = (b) => {
      branchFilter.value = b;
    };

    const getHealthCertInfo = (isoStr) => {
      if (!isoStr || !/^\d{4}-\d{2}-\d{2}$/.test(String(isoStr).trim())) {
        return {
          status: 'unset',
          className: 'is-unset',
          label: 'غير مسجلة',
          subLabel: '',
          tooltip: 'لم يتم تسجيل تاريخ انتهاء الشهادة الصحية'
        };
      }
      const cleanStr = String(isoStr).trim();
      const [y, m, d] = cleanStr.split('-').map(Number);
      const expDate = new Date(y, m - 1, d);
      if (isNaN(expDate.getTime()) || expDate.getFullYear() !== y || expDate.getMonth() !== m - 1 || expDate.getDate() !== d) {
        return {
          status: 'unset',
          className: 'is-unset',
          label: 'غير مسجلة',
          subLabel: '',
          tooltip: 'لم يتم تسجيل تاريخ انتهاء الشهادة الصحية'
        };
      }
      const now = new Date();
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const daysRemaining = Math.round((expDate.getTime() - todayDate.getTime()) / 86400000);
      if (daysRemaining < 0) {
        const overdue = Math.abs(daysRemaining);
        return {
          status: 'expired',
          className: 'is-expired',
          label: 'منتهية',
          subLabel: `منذ ${overdue} يوم`,
          tooltip: `منتهية الصلاحية منذ ${overdue} يوم (${cleanStr})`
        };
      }
      if (daysRemaining <= 30) {
        const sub = daysRemaining === 0 ? 'تنتهي اليوم' : `باقي ${daysRemaining} يوم`;
        return {
          status: 'approaching',
          className: 'is-approaching',
          label: 'قرب الانتهاء',
          subLabel: sub,
          tooltip: `تقترب من الانتهاء (${daysRemaining === 0 ? 'اليوم' : 'باقي ' + daysRemaining + ' يوم'}) — ${cleanStr}`
        };
      }
      return {
        status: 'valid',
        className: 'is-valid',
        label: 'سارية',
        subLabel: '',
        tooltip: `سارية الصلاحية حتى ${cleanStr} (باقي ${daysRemaining} يوم)`
      };
    };

    // Computed filters
    const filteredEmployees = computed(() => {
      const q = searchQuery.value.trim().toLowerCase();
      if (!q) return employees.value;
      return employees.value.filter(e =>
        (e.name && e.name.toLowerCase().includes(q)) ||
        (e.phone && e.phone.toLowerCase().includes(q)) ||
        (e.jobName && e.jobName.toLowerCase().includes(q)) ||
        (e.startDate && e.startDate.includes(q)) ||
        (e.healthCertExpiry && e.healthCertExpiry.includes(q)) ||
        getHealthCertInfo(e.healthCertExpiry).label.includes(q)
      );
    });

    const sortedPrintEmployees = computed(() => {
      return [...filteredEmployees.value].sort((a, b) => {
        const jobA = (a.jobName || '').trim();
        const jobB = (b.jobName || '').trim();
        if (jobA && !jobB) return -1;
        if (!jobA && jobB) return 1;
        const jobCmp = jobA.localeCompare(jobB, 'ar', { sensitivity: 'base', numeric: true });
        if (jobCmp !== 0) return jobCmp;
        return (a.name || '').trim().localeCompare((b.name || '').trim(), 'ar', { sensitivity: 'base', numeric: true });
      });
    });

    const filteredTransactions = computed(() => {
      const q = searchQuery.value.trim().toLowerCase().replace(/^#?emp-?/i, '');
      return transactions.value.filter(tx => {
        if (txTypeFilter.value && tx.type !== txTypeFilter.value) return false;
        if (!q) return true;
        return (
          String(tx.txNumber || '').includes(q) ||
          (tx.employeeName && tx.employeeName.toLowerCase().includes(q)) ||
          (tx.reason && tx.reason.toLowerCase().includes(q)) ||
          (tx.recordedBy?.name && tx.recordedBy.name.toLowerCase().includes(q))
        );
      });
    });

    watch(filteredEmployees, (list) => {
      emit('count-change', list.length);
    }, { immediate: true });

    const selectedFormJob = computed(() => jobs.value.find(j => String(j._id) === String(empForm.jobId)) || null);

    // Live totals in Chef Breakdown Modal
    const liveChefGrossPay = computed(() =>
      round2(editableBreakdown.value.reduce((s, r) => s + round2((Number(r.soldQty) || 0) * Math.max(0, Number(r.chefCoefficient) || 0)), 0))
    );
    const liveChefNetPay = computed(() => {
      if (!selectedChefEmp.value) return 0;
      return round2(
        liveChefGrossPay.value +
        (Number(selectedChefEmp.value.bonusesTotal) || 0) -
        (Number(selectedChefEmp.value.borrowingsTotal) || 0) -
        (Number(selectedChefEmp.value.penaltiesTotal) || 0)
      );
    });

    // Data Fetching
    const fetchJobs = async () => {
      try {
        const res = await props.adminFetch('/api/admin/employee-jobs');
        if (res.ok) {
          jobs.value = await res.json();
        }
      } catch (e) {
        console.error('Fetch employee jobs error:', e);
      }
    };

    const fetchChefsOptions = async () => {
      if (!isAdmin.value) return;
      try {
        const res = await props.adminFetch('/api/admin/employees/chefs-options');
        if (res.ok) {
          const data = await res.json();
          chefsOptions.shop1 = data.shop1 || [];
          chefsOptions.shop2 = data.shop2 || [];
        }
      } catch (e) {
        console.error('Fetch chefs options error:', e);
      }
    };

    const fetchSummary = async () => {
      loading.value = true;
      try {
        const params = new URLSearchParams({
          month: selectedMonth.value,
          branch: props.userShopAccess !== 'all' ? props.userShopAccess : branchFilter.value
        });
        const res = await props.adminFetch(`/api/admin/employees/summary?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          employees.value = data.employees || [];
          if (data.kpis) {
            Object.assign(kpis, data.kpis);
          }
        }
      } catch (e) {
        console.error('Fetch employees summary error:', e);
        toast.show('فشل في جلب بيانات الموظفين', 'danger');
      } finally {
        loading.value = false;
      }
    };

    const fetchTransactions = async () => {
      txLoading.value = true;
      try {
        const params = new URLSearchParams({
          month: txScope.value === 'all' ? 'all' : selectedMonth.value,
          branch: props.userShopAccess !== 'all' ? props.userShopAccess : branchFilter.value
        });
        const res = await props.adminFetch(`/api/admin/employees/transactions?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          transactions.value = data.transactions || [];
        }
      } catch (e) {
        console.error('Fetch employee transactions error:', e);
      } finally {
        txLoading.value = false;
      }
    };

    const refreshAll = async () => {
      await Promise.all([fetchJobs(), fetchSummary(), fetchTransactions(), fetchChefsOptions()]);
    };

    watch([selectedMonth, branchFilter], () => {
      fetchSummary();
      fetchTransactions();
    });

    const switchToTransactionsTab = () => {
      subTab.value = 'transactions';
      fetchTransactions();
    };
    const setTxScope = (sc) => {
      txScope.value = sc;
      fetchTransactions();
    };

    // Employee CRUD Modal Actions
    const isChefLinked = (shop, chefId) =>
      empForm.linkedChefs.some(c => c.shop === shop && String(c.chefId) === String(chefId));

    const toggleLinkedChef = (ch) => {
      const idx = empForm.linkedChefs.findIndex(c => c.shop === ch.shop && String(c.chefId) === String(ch.chefId));
      if (idx > -1) {
        empForm.linkedChefs.splice(idx, 1);
      } else {
        empForm.linkedChefs.push({ shop: ch.shop, chefId: ch.chefId, chefName: ch.chefName });
      }
    };

    const openEmployeeModal = async (emp = null) => {
      if (!isAdmin.value) return;
      if (jobs.value.length === 0) await fetchJobs();
      if (chefsOptions.shop1.length === 0 && chefsOptions.shop2.length === 0) await fetchChefsOptions();

      if (emp) {
        empForm._id = String(emp._id);
        empForm.name = emp.name || '';
        empForm.phone = emp.phone || '';
        empForm.branch = emp.branch || 'shop1';
        empForm.jobId = emp.jobId ? String(emp.jobId) : '';
        empForm.salary = emp.salary !== null && emp.salary !== undefined ? Number(emp.salary) : 0;
        empForm.linkedChefs = Array.isArray(emp.linkedChefs) ? emp.linkedChefs.map(c => ({ ...c })) : [];
        empForm.active = emp.active !== false;
        empForm.startDate = emp.startDate || '';
        empForm.healthCertExpiry = emp.healthCertExpiry || '';
        empForm.notes = emp.notes || '';
      } else {
        empForm._id = '';
        empForm.name = '';
        empForm.phone = '';
        empForm.branch = props.userShopAccess !== 'all' ? props.userShopAccess : (branchFilter.value !== 'all' ? branchFilter.value : 'shop1');
        empForm.jobId = jobs.value[0] ? String(jobs.value[0]._id) : '';
        empForm.salary = 0;
        empForm.linkedChefs = [];
        empForm.active = true;
        empForm.startDate = '';
        empForm.healthCertExpiry = '';
        empForm.notes = '';
      }
      employeeModalOpen.value = true;
      nextTick(() => {
        if (!props.isMobileScreen && empFirstInputRef.value) empFirstInputRef.value.focus();
      });
    };

    const saveEmployee = async () => {
      if (!empForm.name.trim() || !empForm.jobId) {
        toast.show('اسم الموظف والوظيفة مطلوبان', 'danger');
        return;
      }
      saving.value = true;
      try {
        const isEdit = !!empForm._id;
        const url = isEdit ? `/api/admin/employees/${empForm._id}` : '/api/admin/employees';
        const res = await props.adminFetch(url, {
          method: isEdit ? 'PUT' : 'POST',
          body: JSON.stringify({
            name: empForm.name.trim(),
            phone: empForm.phone.trim(),
            branch: empForm.branch,
            jobId: empForm.jobId,
            salary: selectedFormJob.value?.payType === 'production' ? null : Number(empForm.salary) || 0,
            linkedChefs: selectedFormJob.value?.payType === 'production' ? empForm.linkedChefs : [],
            active: empForm.active,
            startDate: empForm.startDate || '',
            healthCertExpiry: empForm.healthCertExpiry || '',
            notes: empForm.notes.trim()
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          toast.show(isEdit ? 'تم تحديث بيانات الموظف بنجاح' : 'تمت إضافة الموظف بنجاح', 'success');
          employeeModalOpen.value = false;
          await Promise.all([fetchSummary(), fetchJobs()]);
        } else {
          toast.show(data.error || 'فشل في حفظ بيانات الموظف', 'danger');
        }
      } catch (e) {
        console.error('Save employee error:', e);
        toast.show('حدث خطأ في الاتصال بالخادم', 'danger');
      } finally {
        saving.value = false;
      }
    };

    const deleteEmployee = async (emp) => {
      const ok = await confirmStore.ask({
        title: 'حذف الموظف',
        message: `هل تريد بالتأكيد حذف الموظف "${emp.name}"؟ ستبقى إيصالات العمليات المسجلة سابقاً محفوظة في الأرشيف المالي.`,
        confirmText: 'حذف الموظف',
        variant: 'danger'
      });
      if (!ok) return;
      try {
        const res = await props.adminFetch(`/api/admin/employees/${emp._id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.show('تم حذف الموظف بنجاح', 'success');
          await Promise.all([fetchSummary(), fetchJobs()]);
        } else {
          const d = await res.json().catch(() => ({}));
          toast.show(d.error || 'فشل في حذف الموظف', 'danger');
        }
      } catch (e) {
        toast.show('خطأ في الاتصال بالخادم', 'danger');
      }
    };

    // Transaction Modal Actions (Admin & Cashier)
    const openTransactionModal = (emp = null, defaultType = 'bonus') => {
      txForm.employeeId = emp ? String(emp._id) : (employees.value[0] ? String(employees.value[0]._id) : '');
      txForm.type = defaultType;
      txForm.amount = null;
      txForm.date = new Date().toLocaleDateString('en-CA');
      txForm.reason = '';
      txAutoPrint.value = true;
      txModalOpen.value = true;
      nextTick(() => {
        if (!props.isMobileScreen && txFirstInputRef.value) txFirstInputRef.value.focus();
      });
    };

    const saveTransaction = async () => {
      if (!txForm.employeeId) {
        toast.show('يرجى اختيار الموظف', 'danger');
        return;
      }
      if (!txForm.amount || Number(txForm.amount) <= 0) {
        toast.show('يرجى إدخال مبلغ صحيح أكبر من صفر', 'danger');
        return;
      }
      if (!txForm.reason || !txForm.reason.trim()) {
        toast.show('يرجى كتابة سبب المكافأة أو السلفة أو الخصم', 'danger');
        return;
      }

      saving.value = true;
      try {
        const res = await props.adminFetch('/api/admin/employees/transactions', {
          method: 'POST',
          body: JSON.stringify({
            employeeId: txForm.employeeId,
            type: txForm.type,
            amount: Number(txForm.amount),
            date: txForm.date,
            reason: txForm.reason.trim()
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.transaction) {
          toast.show(`تم تسجيل ${txTypeLabel(txForm.type)} وإصدار الإيصال #EMP-${data.transaction.txNumber}`, 'success');
          const shouldPrint = txAutoPrint.value;
          const createdTx = data.transaction;
          txModalOpen.value = false;
          await Promise.all([fetchSummary(), fetchTransactions()]);
          if (ledgerModalOpen.value && ledgerEmp.value && String(ledgerEmp.value._id) === String(createdTx.employeeId)) {
            await openEmployeeLedgerModal(ledgerEmp.value);
          }
          if (shouldPrint) {
            await printTransactionReceipt(createdTx);
          }
        } else {
          toast.show(data.error || 'فشل في تسجيل العملية', 'danger');
        }
      } catch (e) {
        console.error('Save transaction error:', e);
        toast.show('حدث خطأ في الاتصال بالخادم', 'danger');
      } finally {
        saving.value = false;
      }
    };

    const deleteTransaction = async (tx) => {
      if (!isAdmin.value) return;
      const ok = await confirmStore.ask({
        title: 'حذف سجل العملية',
        message: `هل تريد حذف إيصال ${txTypeLabel(tx.type)} (#EMP-${tx.txNumber}) للموظف "${tx.employeeName}" بقيمة ${formatCurrency(tx.amount)}؟`,
        confirmText: 'حذف السجل',
        variant: 'danger'
      });
      if (!ok) return;
      try {
        const res = await props.adminFetch(`/api/admin/employees/transactions/${tx._id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.show('تم حذف العملية وتحديث المسير', 'success');
          await Promise.all([fetchSummary(), fetchTransactions()]);
        } else {
          const d = await res.json().catch(() => ({}));
          toast.show(d.error || 'فشل في حذف العملية', 'danger');
        }
      } catch (e) {
        toast.show('خطأ في الاتصال بالخادم', 'danger');
      }
    };

    // Chef Per-Product Unit Rates Modal
    const openChefBreakdownModal = (emp) => {
      selectedChefEmp.value = emp;
      editableBreakdown.value = (emp.productBreakdown || []).map(p => ({
        ...p,
        chefCoefficient: Math.max(0, Number(p.chefCoefficient) || 0)
      }));
      chefModalOpen.value = true;
    };

    const applyUniformCoeff = () => {
      const val = Math.max(0, Math.round((Number(uniformCoeffValue.value) || 0) * 10000) / 10000);
      editableBreakdown.value.forEach(r => {
        r.chefCoefficient = val;
      });
    };

    const saveChefCoefficients = async () => {
      if (!selectedChefEmp.value) return;
      saving.value = true;
      try {
        const updates = editableBreakdown.value.map(r => ({
          shop: r.shop,
          productId: r.productId,
          chefCoefficient: Math.max(0, Math.round((Number(r.chefCoefficient) || 0) * 10000) / 10000)
        }));
        const res = await props.adminFetch('/api/admin/employees/chef-coefficients', {
          method: 'PUT',
          body: JSON.stringify({ updates })
        });
        if (res.ok) {
          toast.show('تم حفظ قيم الوحدات وتحديث حسابات الشيف', 'success');
          chefModalOpen.value = false;
          await fetchSummary();
        } else {
          const d = await res.json().catch(() => ({}));
          toast.show(d.error || 'فشل في حفظ المعاملات', 'danger');
        }
      } catch (e) {
        toast.show('خطأ في الاتصال بالخادم', 'danger');
      } finally {
        saving.value = false;
      }
    };

    // Jobs CRUD Modal
    const openJobModal = (job = null) => {
      if (!isAdmin.value) return;
      if (job) {
        jobForm._id = String(job._id);
        jobForm.name = job.name || '';
        jobForm.payType = job.payType || 'fixed';
        jobForm.description = job.description || '';
      } else {
        jobForm._id = '';
        jobForm.name = '';
        jobForm.payType = 'fixed';
        jobForm.description = '';
      }
      jobModalOpen.value = true;
      nextTick(() => {
        if (!props.isMobileScreen && jobFirstInputRef.value) jobFirstInputRef.value.focus();
      });
    };

    const saveJob = async () => {
      if (!jobForm.name.trim()) {
        toast.show('اسم الوظيفة مطلوب', 'danger');
        return;
      }
      saving.value = true;
      try {
        const isEdit = !!jobForm._id;
        const url = isEdit ? `/api/admin/employee-jobs/${jobForm._id}` : '/api/admin/employee-jobs';
        const res = await props.adminFetch(url, {
          method: isEdit ? 'PUT' : 'POST',
          body: JSON.stringify({
            name: jobForm.name.trim(),
            payType: jobForm.payType,
            description: jobForm.description.trim()
          })
        });
        const d = await res.json().catch(() => ({}));
        if (res.ok) {
          toast.show(isEdit ? 'تم تحديث الوظيفة' : 'تمت إضافة الوظيفة بنجاح', 'success');
          jobModalOpen.value = false;
          await Promise.all([fetchJobs(), fetchSummary()]);
        } else {
          toast.show(d.error || 'فشل حفظ الوظيفة', 'danger');
        }
      } catch (e) {
        toast.show('خطأ في الاتصال بالخادم', 'danger');
      } finally {
        saving.value = false;
      }
    };

    const deleteJob = async (job) => {
      const ok = await confirmStore.ask({
        title: 'حذف الوظيفة',
        message: `هل تريد حذف الوظيفة "${job.name}"؟`,
        confirmText: 'حذف',
        variant: 'danger'
      });
      if (!ok) return;
      try {
        const res = await props.adminFetch(`/api/admin/employee-jobs/${job._id}`, { method: 'DELETE' });
        const d = await res.json().catch(() => ({}));
        if (res.ok) {
          toast.show('تم حذف الوظيفة', 'success');
          await fetchJobs();
        } else {
          toast.show(d.error || 'فشل في حذف الوظيفة', 'danger');
        }
      } catch (e) {
        toast.show('خطأ في الاتصال بالخادم', 'danger');
      }
    };

    // Employee Ledger Modal (re-access receipts)
    const openEmployeeLedgerModal = async (emp) => {
      ledgerEmp.value = emp;
      ledgerModalOpen.value = true;
      ledgerLoading.value = true;
      try {
        const params = new URLSearchParams({ employeeId: String(emp._id), month: 'all' });
        const res = await props.adminFetch(`/api/admin/employees/transactions?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          ledgerTxs.value = data.transactions || [];
        }
      } catch (e) {
        console.error('Fetch employee ledger error:', e);
      } finally {
        ledgerLoading.value = false;
      }
    };

    // Print Page Size Injection (matches AdminView / InventoryTab @page styling)
    const injectPrintPageStyle = (isA4 = false) => {
      let styleTag = document.getElementById('forced-print-page-size-style');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'forced-print-page-size-style';
      }
      document.head.appendChild(styleTag);
      const size = isA4 ? '210mm 297mm' : '148mm 210mm';
      const paperWidth = isA4 ? '210mm' : '100%';
      styleTag.textContent = `
@page { size: ${size} !important; margin: 0 !important; }
@media print {
  *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body {
    width: ${paperWidth} !important;
    max-width: ${paperWidth} !important;
    min-width: 0 !important;
    margin: 0 auto !important;
    padding: 0 !important;
    overflow-x: hidden !important;
    box-sizing: border-box !important;
  }
}`;
      if (document.body) void document.body.offsetHeight;
    };

    const clearInjectedPrintStyle = () => {
      const styleTag = document.getElementById('forced-print-page-size-style');
      if (styleTag) styleTag.textContent = '';
    };

    const canSettleEmployee = (emp) => {
      if (!isAdmin.value || !emp) return false;
      const gross = emp.effectiveGrossPay !== undefined
        ? (Number(emp.effectiveGrossPay) || 0)
        : (emp.payType === 'production' ? (Number(emp.productionGrossPay) || 0) : (Number(emp.salary) || 0));
      const hasUnsettled = Array.isArray(emp.unsettledItems) && emp.unsettledItems.length > 0;
      return gross > 0 || hasUnsettled;
    };

    const openPayoutModal = (emp) => {
      if (!isAdmin.value || !emp) return;
      payoutEmp.value = emp;
      payoutForm.date = new Date().toLocaleDateString('en-CA');
      payoutForm.note = '';
      payoutAutoPrint.value = true;
      payoutModalOpen.value = true;
    };

    const confirmEmployeePayout = async () => {
      if (!isAdmin.value || !payoutEmp.value) return;
      if ((Number(payoutEmp.value.netPay) || 0) < 0) {
        toast.show('إجمالي السلف والخصومات يتجاوز المستحق؛ يرجى مراجعة الحساب قبل الصرف', 'danger');
        return;
      }
      const targetEmpId = String(payoutEmp.value._id);
      const shouldPrint = payoutAutoPrint.value;
      saving.value = true;
      try {
        const res = await props.adminFetch(`/api/admin/employees/${targetEmpId}/payout`, {
          method: 'POST',
          body: JSON.stringify({
            monthKey: selectedMonth.value,
            date: payoutForm.date,
            note: payoutForm.note.trim()
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          toast.show('تم اعتماد صرف المستحقات وتصفير حساب الشهر', 'success');
          payoutModalOpen.value = false;
          await Promise.all([fetchSummary(), fetchTransactions()]);
          if (shouldPrint && data.payout) {
            await printTransactionReceipt(data.payout);
          }
        } else {
          toast.show(data.error || 'فشل في اعتماد وصرف المستحقات', 'danger');
        }
      } catch (e) {
        console.error('Employee payout error:', e);
        toast.show('حدث خطأ في الاتصال بالخادم', 'danger');
      } finally {
        saving.value = false;
      }
    };

    const printTransactionReceipt = async (tx) => {
      activePrintTx.value = tx;
      injectPrintPageStyle(false); // A5 Portrait
      printingTxReceipt.value = true;
      await nextTick();
      await new Promise(r => setTimeout(r, 80));

      try {
        const el = document.querySelector('#barcode-emp-tx');
        if (el) {
          const prefix = tx.type === 'payout' ? 'PAY' : 'EMP';
          const codeVal = `${prefix}-${tx.txNumber || String(tx._id).slice(-6)}`;
          JsBarcode(el, codeVal, {
            format: 'CODE128',
            width: 1.5,
            height: 36,
            displayValue: true,
            fontSize: 11,
            margin: 2
          });
        }
      } catch (e) {
        console.warn('Barcode render warning:', e);
      }

      const cleanup = () => {
        printingTxReceipt.value = false;
        activePrintTx.value = null;
        clearInjectedPrintStyle();
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      window.print();
    };

    const printMonthlyPayroll = async () => {
      if (!isAdmin.value) return;
      injectPrintPageStyle(true); // A4 Portrait
      printingPayroll.value = true;
      await nextTick();
      await new Promise(r => setTimeout(r, 80));

      const cleanup = () => {
        printingPayroll.value = false;
        clearInjectedPrintStyle();
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      window.print();
    };

    onMounted(() => {
      window.addEventListener('keydown', handleGlobalModalKey, true);
      refreshAll();
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', handleGlobalModalKey, true);
      if (scrollLockActive) {
        unlockBodyScroll(false);
        scrollLockActive = false;
      }
    });

    return {
      isAdmin,
      loading,
      saving,
      txLoading,
      ledgerLoading,
      subTab,
      searchQuery,
      branchFilter,
      selectedMonth,
      selectedMonthLabel,
      selectedMonthShort,
      isCurrentMonth,
      txScope,
      txTypeFilter,
      employees,
      filteredEmployees,
      jobs,
      transactions,
      filteredTransactions,
      chefsOptions,
      kpis,
      employeeModalOpen,
      txModalOpen,
      chefModalOpen,
      jobModalOpen,
      ledgerModalOpen,
      payoutModalOpen,
      empModalRef,
      txModalRef,
      chefModalRef,
      jobModalRef,
      ledgerModalRef,
      payoutModalRef,
      empFirstInputRef,
      txFirstInputRef,
      jobFirstInputRef,
      empForm,
      selectedFormJob,
      txForm,
      txAutoPrint,
      payoutEmp,
      payoutAutoPrint,
      payoutForm,
      jobForm,
      selectedChefEmp,
      editableBreakdown,
      uniformCoeffValue,
      liveChefGrossPay,
      liveChefNetPay,
      ledgerEmp,
      ledgerTxs,
      printingTxReceipt,
      activePrintTx,
      printingPayroll,
      round2,
      sortedPrintEmployees,
      formatNum,
      formatCurrency,
      formatArabicDate,
      getHealthCertInfo,
      branchLabel,
      txTypeLabel,
      txReceiptTitle,
      cleanPhone,
      whatsappUrl,
      shiftMonth,
      resetToCurrentMonth,
      setBranchFilter,
      switchToTransactionsTab,
      setTxScope,
      closeAllModals,
      isChefLinked,
      toggleLinkedChef,
      openEmployeeModal,
      saveEmployee,
      deleteEmployee,
      openTransactionModal,
      saveTransaction,
      deleteTransaction,
      openChefBreakdownModal,
      applyUniformCoeff,
      saveChefCoefficients,
      openJobModal,
      saveJob,
      deleteJob,
      openEmployeeLedgerModal,
      canSettleEmployee,
      openPayoutModal,
      confirmEmployeePayout,
      printTransactionReceipt,
      printMonthlyPayroll
    };
  }
};
</script>

<style scoped>
@import '../assets/admin-tabs-shared.css';

.employees-tab-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.emp-controls-card {
  padding: 16px 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: var(--admin-card-elevation);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.emp-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.emp-subtabs {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 14px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-default);
  flex-wrap: wrap;
}

.emp-subtab-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  min-height: 44px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: var(--color-slate-600);
  font-family: 'Cairo', sans-serif;
  font-weight: 750;
  font-size: 0.88rem;
  cursor: pointer;
  transition: transform 0.12s ease, background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.emp-subtab-btn:active {
  transform: scale(0.97);
}

.emp-subtab-btn.active {
  background: var(--surface-elevated);
  color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}

.subtab-count-pill {
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 0.76rem;
  background: var(--primary-glow);
  color: var(--primary-color);
  font-weight: 800;
}

.shop-theme-shop2 .subtab-count-pill {
  background: rgba(var(--shop2-ink-rgb), 0.12);
  color: var(--shop2-ink);
}

.emp-primary-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.emp-btn-tx {
  background: var(--status-valid-fg);
  color: var(--text-inverse);
  border: 1px solid var(--status-valid-fg);
  box-shadow: 0 4px 12px rgba(22, 101, 52, 0.22);
  gap: 6px;
}

.emp-btn-tx:hover {
  background: var(--status-valid-fg);
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.emp-filters-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-default);
}

.emp-month-nav {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-canvas);
  border: 1.5px solid var(--border-default);
  border-radius: 12px;
  padding: 4px 8px;
}

.emp-month-arrow {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-strong);
  background: var(--surface-elevated);
  color: var(--color-slate-700);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.1s ease, border-color 0.15s ease;
}

.emp-month-arrow::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 44px;
  min-height: 44px;
}

.emp-month-arrow:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.emp-month-arrow:active {
  transform: scale(0.94);
}

.emp-month-label {
  font-weight: 800;
  font-size: 0.92rem;
  color: var(--color-slate-900);
  min-width: 110px;
  text-align: center;
}

.emp-today-month-btn {
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid var(--status-approaching-border);
  background: var(--status-approaching-bg);
  color: var(--status-approaching-fg);
  font-family: 'Cairo', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
}

.emp-branch-pills {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--surface-canvas);
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--border-default);
  flex-wrap: wrap;
}

.emp-filter-pill {
  position: relative;
  padding: 6px 12px;
  min-height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--color-slate-600);
  font-family: 'Cairo', sans-serif;
  font-weight: 750;
  font-size: 0.82rem;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.emp-filter-pill::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  min-width: 44px;
  min-height: 44px;
}

.emp-filter-pill.active {
  background: var(--primary-gradient, var(--primary-color));
  color: var(--theme-text-color, var(--primary-on-color));
}

.shop-theme-shop2 .emp-filter-pill.active {
  background: var(--primary-gradient, linear-gradient(135deg, var(--shop2-ink-strong), var(--shop2-ink)));
  color: var(--theme-text-color, var(--text-inverse));
}

.emp-search-wrap {
  position: relative;
  flex: 1 1 240px;
  max-width: 340px;
}

.emp-search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.emp-search-input {
  padding-right: 36px !important;
}

/* KPI Grid */
.emp-kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.emp-kpi-card {
  background: var(--surface-elevated);
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: var(--admin-card-elevation);
}

.emp-kpi-card.highlight-net {
  border-color: var(--status-approaching-border);
  background: linear-gradient(135deg, var(--status-approaching-bg), var(--surface-elevated));
}

.emp-kpi-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.emp-kpi-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-slate-600);
}

.emp-kpi-val {
  font-size: 1.15rem;
  font-weight: 900;
  color: var(--color-slate-900);
}

.emp-kpi-adj {
  font-size: 0.95rem;
}

.adj-sep {
  margin: 0 4px;
  color: var(--text-muted);
}

.emp-kpi-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.emp-kpi-icon.icon-slate { background: var(--surface-subtle); color: var(--color-slate-700); }
.emp-kpi-icon.icon-blue { background: rgba(var(--shop2-ink-rgb), 0.1); color: var(--shop2-ink); }
.emp-kpi-icon.icon-gold { background: var(--status-approaching-bg); color: var(--status-approaching-fg); }
.emp-kpi-icon.icon-green { background: var(--status-valid-bg); color: var(--status-valid-fg); }
.emp-kpi-icon.icon-emerald { background: var(--status-valid-bg); color: var(--status-valid-fg); }

/* Badges, Contacts & Cells */
.emp-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.emp-avatar {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  color: var(--text-inverse);
  flex-shrink: 0;
}

.emp-avatar.is-chef {
  background: var(--status-approaching-fg);
}

.emp-avatar.is-fixed {
  background: linear-gradient(135deg, var(--shop2-ink-strong), var(--shop2-ink));
}

.emp-contact-circle {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-default);
  background: var(--surface-canvas);
}

.emp-contact-circle.lg {
  width: 44px;
  height: 44px;
  border-radius: 12px;
}

.emp-contact-circle.call { color: var(--shop2-ink); }
.emp-contact-circle.whatsapp { color: var(--status-valid-fg); }

.emp-status-tag.inactive {
  font-size: 0.72rem;
  padding: 1px 7px;
  border-radius: 6px;
  background: var(--status-expired-bg);
  color: var(--status-expired-fg);
  font-weight: 800;
}

.emp-row-inactive {
  opacity: 0.68;
}

.branch-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 800;
}

.branch-shop1 { background: var(--status-approaching-bg); color: var(--status-approaching-fg); }
.branch-shop2 { background: rgba(var(--shop2-ink-rgb), 0.1); color: var(--shop2-ink); }
.branch-all { background: var(--surface-subtle); color: var(--color-slate-700); }

.job-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 800;
  width: fit-content;
}

.job-badge.is-prod { background: var(--status-approaching-bg); color: var(--status-approaching-fg); border: 1px solid var(--status-approaching-border); }
.job-badge.is-fixed { background: rgba(var(--shop2-ink-rgb), 0.08); color: var(--shop2-ink); border: 1px solid rgba(var(--shop2-ink-rgb), 0.22); }

.btn-coeff-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 8px;
  border: 1px solid var(--status-approaching-border);
  background: var(--status-approaching-bg);
  color: var(--status-approaching-fg);
  font-family: 'Cairo', sans-serif;
  font-size: 0.76rem;
  font-weight: 800;
  cursor: pointer;
}

.net-pay-pill {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 0.9rem;
}

.net-pay-pill.is-positive { background: var(--status-valid-bg); color: var(--status-valid-fg); border: 1px solid var(--status-valid-border); }
.net-pay-pill.is-negative { background: var(--status-expired-bg); color: var(--status-expired-fg); border: 1px solid var(--status-expired-border); }

.emp-action-tx {
  background: var(--status-valid-bg);
  color: var(--status-valid-fg);
  border-color: var(--status-valid-border);
}

.emp-action-coeff {
  background: var(--status-approaching-bg);
  color: var(--status-approaching-fg);
  border-color: var(--status-approaching-border);
}

.text-success { color: var(--status-valid-fg) !important; }
.text-amber { color: var(--status-approaching-fg) !important; }

.tx-type-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 800;
}

.tx-bonus { background: var(--status-valid-bg); color: var(--status-valid-fg); border: 1px solid var(--status-valid-border); }
.tx-borrowing { background: var(--status-approaching-bg); color: var(--status-approaching-fg); border: 1px solid var(--status-approaching-border); }
.tx-penalty { background: var(--status-expired-bg); color: var(--status-expired-fg); border: 1px solid var(--status-expired-border); }

.tx-reason-cell {
  max-width: 280px;
  white-space: pre-wrap;
  line-height: 1.45;
  font-size: 0.86rem;
}

.tx-reason-box {
  background: var(--surface-canvas);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 8px 12px;
}

/* Modal Forms & Sub-panels */
.modal-box.modal-wide {
  max-width: 820px;
}

.emp-production-link-box {
  padding: 14px;
  border-radius: 12px;
  background: var(--status-approaching-bg);
  border: 1px solid var(--status-approaching-border);
}

.chef-link-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chef-link-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  min-height: 40px;
  border-radius: 10px;
  background: var(--surface-elevated);
  border: 1.5px solid var(--border-default);
  font-weight: 700;
  font-size: 0.86rem;
  cursor: pointer;
}

.chef-link-pill.selected {
  border-color: var(--status-approaching-fg);
  background: var(--status-approaching-bg);
  color: var(--status-approaching-fg);
}

.tx-type-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.tx-sel-pill {
  min-height: 44px;
  border-radius: 10px;
  border: 1.5px solid var(--border-strong);
  background: var(--surface-canvas);
  color: var(--color-slate-700);
  font-family: 'Cairo', sans-serif;
  font-weight: 800;
  cursor: pointer;
}

.tx-sel-pill.bonus.active { background: var(--status-valid-fg); border-color: var(--status-valid-fg); color: var(--text-inverse); }
.tx-sel-pill.borrowing.active { background: var(--status-approaching-fg); border-color: var(--status-approaching-fg); color: var(--text-inverse); }
.tx-sel-pill.penalty.active { background: var(--color-danger-badge); border-color: var(--color-danger-badge); color: var(--text-inverse); }

.tx-reason-textarea {
  min-height: 84px;
  resize: vertical;
  line-height: 1.5;
}

.chef-coeff-batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 14px;
  background: var(--surface-canvas);
  border: 1px solid var(--border-default);
  border-radius: 12px;
}

.coeff-mini-input {
  width: 110px !important;
  min-height: 36px !important;
  padding: 4px 10px !important;
}

.coeff-cell-input {
  width: 90px !important;
  min-height: 38px !important;
  padding: 4px 8px !important;
  text-align: center !important;
}

.coeff-pct-hint {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--color-slate-600);
  min-width: 26px;
}

.chef-coeff-table-scroll {
  max-height: 46vh;
  overflow-y: auto;
  border: 1px solid var(--border-default);
  border-radius: 12px;
}

.chef-coeff-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px;
  background: var(--surface-canvas);
  border: 1px solid var(--border-default);
  border-radius: 12px;
}

.summary-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--surface-elevated);
  border: 1px solid var(--border-default);
  font-size: 0.86rem;
}

.summary-chip.total {
  margin-right: auto;
  border-color: var(--status-approaching-border);
  background: var(--status-approaching-bg);
  color: var(--status-approaching-fg);
  font-weight: 800;
}

/* Job Start Date & Health Certificate Status Badges */
.emp-start-date-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 8px;
  background: var(--surface-canvas);
  border: 1px solid var(--border-default);
  color: var(--color-slate-700);
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.hc-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1.5px solid transparent;
  font-size: 0.8rem;
  line-height: 1.3;
  min-width: 112px;
}

.hc-badge.compact {
  padding: 4px 8px;
  border-radius: 8px;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
}

.hc-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.hc-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.hc-label {
  font-weight: 800;
}

.hc-date {
  font-size: 0.76rem;
  font-weight: 700;
  opacity: 0.92;
}

.hc-sub {
  font-size: 0.72rem;
  font-weight: 700;
  opacity: 0.88;
}

.hc-inline-preview {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 800;
  border: 1.5px solid transparent;
}

.hc-badge.is-valid,
.hc-inline-preview.is-valid {
  background: var(--status-valid-bg);
  border-color: var(--status-valid-border);
  color: var(--status-valid-fg);
}
.is-valid .hc-dot { background: var(--status-valid-fg); }

.hc-badge.is-approaching,
.hc-inline-preview.is-approaching {
  background: var(--status-approaching-bg);
  border-color: var(--status-approaching-border);
  color: var(--status-approaching-fg);
}
.is-approaching .hc-dot { background: var(--status-approaching-fg); }

.hc-badge.is-expired,
.hc-inline-preview.is-expired {
  background: var(--status-expired-bg);
  border-color: var(--status-expired-border);
  color: var(--status-expired-fg);
}
.is-expired .hc-dot { background: var(--color-danger-badge); }

.hc-badge.is-unset,
.hc-inline-preview.is-unset {
  background: var(--surface-subtle);
  border: 1px dashed var(--border-strong);
  color: var(--text-muted);
}
.is-unset .hc-dot { background: var(--text-muted); }

.emp-dates-form-row :deep(.btn-datepicker-trigger) {
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--surface-elevated);
  border: 1.5px solid var(--border-default);
  font-size: 0.88rem;
}

/* Mobile Cards (Hidden on desktop) */
.mobile-emp-cards-grid {
  display: none;
}

@media (max-width: 1180px) {
  .emp-kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .desktop-emp-table-wrap {
    display: none !important;
  }

  .mobile-emp-cards-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }

  .mobile-emp-card {
    padding: 14px;
    border-radius: 16px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--surface-elevated);
  }

  .mob-emp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
  }

  .mob-emp-dates-strip {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .mob-date-item {
    background: var(--surface-canvas);
    border: 1px solid var(--border-default);
    border-radius: 10px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
  }

  .mob-date-item .lbl {
    font-size: 0.74rem;
    color: var(--color-slate-600);
    font-weight: 700;
  }

  .mob-date-item .val {
    font-size: 0.84rem;
    font-weight: 700;
    color: var(--color-slate-900);
  }

  .mob-emp-metrics {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .mob-metric {
    background: var(--surface-canvas);
    border-radius: 10px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    border: 1px solid var(--border-default);
  }

  .mob-metric.net {
    grid-column: span 2;
    background: var(--status-valid-bg);
    border-color: var(--status-valid-border);
  }

  .mob-metric .lbl {
    font-size: 0.75rem;
    color: var(--color-slate-600);
    font-weight: 700;
  }

  .emp-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .emp-kpi-card.highlight-net {
    grid-column: span 2;
  }

  .mob-emp-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .mob-emp-actions .btn-table-action {
    flex: 1 1 auto;
    min-height: 44px;
  }

  textarea.form-control {
    font-size: 16px !important;
  }

  .coeff-mini-input,
  .coeff-cell-input {
    font-size: 16px !important;
    min-height: 44px !important;
  }

  .modal-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .modal-box {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    max-height: 92vh;
  }
}

/* Payout & Settlement Badges / Modal */
.emp-action-pay {
  background: var(--status-valid-fg) !important;
  color: var(--text-inverse) !important;
  border-color: var(--status-valid-fg) !important;
}

.emp-action-pay-done {
  background: rgba(var(--shop2-ink-rgb), 0.08);
  color: var(--shop2-ink);
  border-color: rgba(var(--shop2-ink-rgb), 0.22);
}

.emp-paid-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  background: var(--status-valid-bg);
  color: var(--status-valid-fg);
  border: 1px solid var(--status-valid-border);
}

.tx-payout {
  background: rgba(var(--shop2-ink-rgb), 0.08);
  color: var(--shop2-ink);
  border: 1px solid rgba(var(--shop2-ink-rgb), 0.22);
}

.tx-settled-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 800;
  background: var(--surface-subtle);
  color: var(--color-slate-600);
  border: 1px solid var(--border-strong);
}

.modal-title-icon.payout {
  background: var(--status-valid-bg);
  color: var(--status-valid-fg);
}

.emp-payout-breakdown-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.payout-stat-chip {
  background: var(--surface-canvas);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.payout-stat-chip .lbl {
  font-size: 0.76rem;
  color: var(--color-slate-600);
  font-weight: 700;
}

.payout-stat-chip .val {
  font-size: 0.98rem;
  font-weight: 900;
}

.emp-payout-empty-items {
  background: var(--surface-canvas);
  border: 1px dashed var(--border-strong);
  border-radius: 10px;
  font-size: 0.86rem;
}

.emp-payout-items-scroll {
  max-height: 28vh;
}

.emp-payout-total-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--status-valid-bg);
  border: 1.5px solid var(--status-valid-border);
  color: var(--status-valid-fg);
}

.emp-payout-total-banner.is-negative {
  background: var(--status-expired-bg);
  border-color: var(--status-expired-border);
  color: var(--status-expired-fg);
}

.emp-payout-total-val {
  font-size: 1.35rem;
  font-weight: 900;
}

.btn-emerald {
  background: var(--status-valid-fg);
  color: var(--text-inverse);
  border: none;
  font-weight: 800;
}

.btn-emerald:hover:not(:disabled) {
  background: var(--status-valid-fg);
  filter: brightness(0.92);
}

@media (max-width: 768px) {
  .emp-payout-breakdown-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Teleported Print Views */
.emp-tx-receipt-print-wrapper,
.emp-payroll-print-wrapper {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .emp-subtab-btn,
  .emp-month-arrow,
  .btn-table-action {
    transition: none !important;
  }
}
</style>

<!-- Unscoped @media print styles because print wrappers teleport directly to <body> -->
<style>
@media print {
  .emp-tx-receipt-print-wrapper,
  .emp-tx-receipt-print-wrapper *,
  .emp-payroll-print-wrapper,
  .emp-payroll-print-wrapper * {
    visibility: visible !important;
  }

  .emp-tx-receipt-print-wrapper {
    display: block !important;
    width: 148mm;
    max-width: 100%;
    margin: 0 auto;
    background: var(--surface-elevated);
    color: #000000;
    font-family: 'Cairo', sans-serif;
  }

  .emp-tx-receipt-page {
    padding: 8mm 9mm;
    box-sizing: border-box;
    border: 1.5px solid var(--color-slate-900);
    border-radius: 8px;
    margin: 4mm;
  }

  .emp-payroll-print-wrapper {
    display: block !important;
    width: 210mm;
    max-width: 210mm;
    margin: 0 auto;
    background: var(--surface-elevated);
    color: #000000;
    font-family: 'Cairo', sans-serif;
  }

  .emp-payroll-page {
    padding: 8mm 10mm;
    box-sizing: border-box;
  }

  .emp-receipt-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .emp-receipt-logo {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    object-fit: cover;
  }

  .emp-receipt-shop {
    font-size: 13pt;
    font-weight: 900;
    margin: 0;
    color: var(--color-slate-900);
  }

  .emp-receipt-sub {
    font-size: 8.5pt;
    margin: 2px 0 0 0;
    color: var(--color-slate-600);
  }

  .emp-receipt-badge {
    margin-right: auto;
    padding: 4px 10px;
    border: 1.5px solid var(--color-slate-900);
    border-radius: 6px;
    font-size: 9pt;
    font-weight: 800;
  }

  .emp-receipt-divider {
    height: 1.5px;
    background: var(--color-slate-900);
    margin: 8px 0;
  }

  .emp-receipt-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 12px;
    font-size: 9pt;
    margin-bottom: 10px;
  }

  .emp-receipt-meta-grid .meta-lbl {
    color: var(--color-slate-600);
    font-weight: 700;
    margin-left: 5px;
  }

  .emp-receipt-meta-grid .meta-val {
    font-weight: 800;
    color: var(--color-slate-900);
  }

  .emp-receipt-amount-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    border-radius: 8px;
    border: 2px solid var(--color-slate-900);
    background: var(--surface-canvas);
    margin-bottom: 10px;
  }

  .amount-box-label {
    font-size: 10pt;
    font-weight: 800;
  }

  .amount-box-value {
    font-size: 14pt;
    font-weight: 900;
  }

  .emp-receipt-reason-card {
    border: 1px dashed var(--text-muted);
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 12px;
    min-height: 20mm;
  }

  .reason-card-title {
    font-size: 8.5pt;
    font-weight: 800;
    color: var(--color-slate-600);
    margin-bottom: 4px;
  }

  .reason-card-text {
    margin: 0;
    font-size: 10pt;
    font-weight: 700;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .emp-receipt-barcode-box {
    text-align: center;
    margin: 8px 0 12px;
  }

  .emp-receipt-signatures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 14px;
    font-size: 8.5pt;
    font-weight: 700;
  }

  .emp-receipt-signatures .sig-col {
    display: flex;
    flex-direction: column;
    gap: 14px;
    text-align: center;
  }

  .emp-receipt-footer {
    margin-top: 10px;
    padding-top: 6px;
    border-top: 1px solid var(--border-strong);
    display: flex;
    justify-content: space-between;
    font-size: 7.5pt;
    color: var(--text-muted);
  }

  .emp-payroll-kpis {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    margin-bottom: 10px;
    font-size: 8.5pt;
  }

  .emp-payroll-kpis .p-kpi {
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .emp-payroll-kpis .p-kpi.total {
    border-color: var(--color-slate-900);
    background: var(--surface-canvas);
  }

  .emp-payroll-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
  }

  .emp-payroll-table thead {
    display: table-header-group;
  }

  .emp-payroll-table tfoot {
    display: table-row-group;
  }

  .emp-payroll-table tr,
  .emp-receipt-signatures {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .emp-payroll-table th,
  .emp-payroll-table td {
    border: 1px solid var(--border-strong);
    padding: 4px 6px;
    text-align: right;
  }

  .emp-payroll-table th {
    background: var(--surface-subtle);
    font-weight: 800;
  }

  .emp-payroll-table tfoot td {
    background: var(--surface-canvas);
    border-top: 2px solid var(--color-slate-900);
  }

  .emp-payout-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 5px;
    margin-bottom: 8px;
  }

  .emp-payout-summary-grid .ps-cell {
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    padding: 5px 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: var(--surface-canvas);
  }

  .emp-payout-summary-grid .ps-lbl {
    font-size: 7.2pt;
    color: var(--color-slate-600);
    font-weight: 700;
  }

  .emp-payout-summary-grid .ps-val {
    font-size: 9pt;
    font-weight: 900;
    color: var(--color-slate-900);
  }

  .emp-payout-items-section {
    margin-bottom: 8px;
  }

  .emp-payout-items-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 7.6pt;
    margin-top: 3px;
  }

  .emp-payout-items-table th,
  .emp-payout-items-table td {
    border: 1px solid var(--border-strong);
    padding: 3px 5px;
    text-align: right;
  }

  .emp-payout-items-table th {
    background: var(--surface-subtle);
    font-weight: 800;
  }

  .emp-receipt-amount-box.is-payout {
    background: var(--status-valid-bg);
    border-color: var(--status-valid-fg);
    color: var(--status-valid-fg);
  }

  .emp-payout-note-line {
    font-size: 8.2pt;
    color: var(--color-slate-700);
    margin-bottom: 6px;
  }
}
</style>
