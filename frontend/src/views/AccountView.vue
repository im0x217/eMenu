<script setup>
import { formatLibyanWhatsappNumber, getLibyanWhatsAppUrl } from '../utils/phone';
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useFavoritesStore } from '../stores/favorites';
import { useCartStore } from '../stores/cart';
import { useToastStore } from '../stores/toast';

const router = useRouter();
const authStore = useAuthStore();
const favoritesStore = useFavoritesStore();
const cartStore = useCartStore();
const toastStore = useToastStore();

// Auth form tabs: 'login' | 'register'
const activeAuthTab = ref('login');

// Form inputs
const loginPhone = ref('');
const loginPassword = ref('');
const registerName = ref('');
const registerPhone = ref('');
const registerPassword = ref('');

const showLoginPassword = ref(false);
const showRegisterPassword = ref(false);
const authLoading = ref(false);
const authError = ref('');

// Balance & Order History State
const orders = ref([]);
const isLoadingOrders = ref(false);
const balanceData = ref({
  outstandingBalance: 0,
  unpaidOrdersCount: 0,
  lifetimeTotal: 0
});
const isLoadingBalance = ref(false);

const isUserIdentified = computed(() => {
  return authStore.isIdentified();
});

const displayedOrders = computed(() => {
  return orders.value.slice(0, 5);
});

const loadCustomerData = async () => {
  if (!authStore.customerPhone) {
    orders.value = [];
    balanceData.value = { outstandingBalance: 0, unpaidOrdersCount: 0, lifetimeTotal: 0 };
    return;
  }
  
  isLoadingOrders.value = true;
  isLoadingBalance.value = true;

  try {
    const [ordersRes, balanceRes] = await Promise.all([
      fetch(`/api/customer/orders?phone=${encodeURIComponent(authStore.customerPhone)}`),
      fetch(`/api/customer/balance?phone=${encodeURIComponent(authStore.customerPhone)}`)
    ]);

    if (ordersRes.ok) {
      orders.value = await ordersRes.json();
    }
    if (balanceRes.ok) {
      balanceData.value = await balanceRes.json();
    }
  } catch (e) {
    console.error('Failed to load customer orders/balance', e);
  } finally {
    isLoadingOrders.value = false;
    isLoadingBalance.value = false;
  }
};

onMounted(() => {
  loadCustomerData();
  if (authStore.customerPhone) {
    authStore.checkProfileStatus();
  }
});

// Watch phone number changes to refetch history & balance
watch(() => authStore.customerPhone, () => {
  loadCustomerData();
});

const handleLogin = async () => {
  if (!loginPhone.value.trim() || !loginPassword.value) {
    authError.value = 'يرجى كتابة رقم الهاتف وكلمة المرور';
    return;
  }

  authLoading.value = true;
  authError.value = '';

  try {
    const res = await authStore.login(loginPhone.value.trim(), loginPassword.value);
    if (res.requiresPasswordSetup) {
      toastStore.show('يرجى تعيين كلمة مرور لحسابك للمتابعة', 'warning');
    } else {
      toastStore.show('مرحباً بك مجدداً!', 'success');
      loginPhone.value = '';
      loginPassword.value = '';
      await favoritesStore.loadFavoritesFromBackend();
      loadCustomerData();
    }
  } catch (err) {
    authError.value = err.message || 'فشل تسجيل الدخول';
  } finally {
    authLoading.value = false;
  }
};

const handleRegister = async () => {
  if (!registerName.value.trim()) {
    authError.value = 'يرجى كتابة الاسم بالكامل';
    return;
  }
  if (!registerPhone.value.trim() || registerPhone.value.trim().length < 9) {
    authError.value = 'يرجى كتابة رقم هاتف صحيح';
    return;
  }
  if (!registerPassword.value || registerPassword.value.length < 4) {
    authError.value = 'كلمة المرور يجب أن لا تقل عن 4 خانات';
    return;
  }

  authLoading.value = true;
  authError.value = '';

  try {
    await authStore.register(registerName.value.trim(), registerPhone.value.trim(), registerPassword.value);
    toastStore.show('تم إنشاء الحساب وتأمينه بنجاح!', 'success');
    registerName.value = '';
    registerPhone.value = '';
    registerPassword.value = '';
    await favoritesStore.loadFavoritesFromBackend();
    loadCustomerData();
  } catch (err) {
    authError.value = err.message || 'فشل إنشاء الحساب';
  } finally {
    authLoading.value = false;
  }
};

const handleSignOut = () => {
  if (confirm('هل أنت متأكد من تسجيل الخروج من هذا الحساب؟')) {
    authStore.clearIdentity();
    orders.value = [];
    balanceData.value = { outstandingBalance: 0, unpaidOrdersCount: 0, lifetimeTotal: 0 };
    activeAuthTab.value = 'login';
    toastStore.show('تم تسجيل الخروج بنجاح', 'info');
  }
};

const handleSwitchAccount = () => {
  authStore.clearIdentity();
  orders.value = [];
  balanceData.value = { outstandingBalance: 0, unpaidOrdersCount: 0, lifetimeTotal: 0 };
  activeAuthTab.value = 'login';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-LY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'ready': return 'جاهز للاستلام';
    case 'received': return 'تم الاستلام';
    case 'completed': return 'تم الاستلام'; // legacy
    case 'cancelled': return 'ملغي';
    case 'pending':
    default: return 'قيد الانتظار';
  }
};

const confirmingOrderId = ref(null);

const confirmReceived = async (order) => {
  if (confirmingOrderId.value === order._id) return;
  confirmingOrderId.value = order._id;
  try {
    const res = await fetch(`/api/customer/orders/${order._id}/received`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: authStore.customerPhone, shop: order.shop })
    });
    if (res.ok) {
      order.status = 'received';
      toastStore.show('تم تأكيد استلام الطلب بنجاح', 'success');
    } else {
      const data = await res.json();
      toastStore.show(data.error || 'فشل تأكيد الاستلام', 'danger');
    }
  } catch (e) {
    console.error('Confirm received error', e);
    toastStore.show('حدث خطأ بالاتصال', 'danger');
  } finally {
    confirmingOrderId.value = null;
  }
};

// Import order into Cart for editing
const handleEditOrderInCart = (order) => {
  if (order.printed) {
    toastStore.show('تمت طباعة هذا الطلب في المحل ولا يمكن تعديله', 'warning');
    return;
  }

  cartStore.importOrderForEditing(order);
  toastStore.show(`تم استيراد الطلب #${order.orderNumber || ''} إلى السلة للتعديل`, 'info');
  router.push('/cart');
};

// Resend Modal State
const isModalOpen = ref(false);
const selectedOrder = ref(null);
const whatsappMessageText = ref('');

const generateWhatsAppMessage = (order) => {
  const shopName = order.shop === 'shop2' ? 'قسم النواشف' : 'المتجر الرئيسي (حلويات)';
  const priceLabel = order.priceMode === 'bulk' ? 'سعر جملة' : 'سعر عادي';
  
  let text = `*طلب جديد من تطبيق المنيو الإلكتروني*\n`;
  text += `*رقم الطلب:* #${order.orderNumber || order._id.slice(-6)}\n`;
  text += `*المحل:* ${shopName} (${priceLabel})\n`;
  text += `--------------------------------\n`;
  text += `*العميل:* ${order.customerInfo?.name || authStore.customerName}\n`;
  text += `*الهاتف:* ${order.customerInfo?.phone || authStore.customerPhone}\n`;
  if (order.deliveryDate) {
    text += `*تاريخ الاستلام:* ${order.deliveryDate}\n`;
  }
  text += `--------------------------------\n`;
  
  const sortedItems = [...(order.items || [])].sort((a, b) => 
    (a.name || '').localeCompare(b.name || '', 'ar', { sensitivity: 'base' })
  );

  sortedItems.forEach((item) => {
    text += `• *${item.name}* (${item.quantity} × ${item.price} د.ل)\n`;
    if (item.notes) {
      text += `  ملاحظة: ${item.notes}\n`;
    }
  });
  
  text += `--------------------------------\n`;
  text += `*الإجمالي الكلي:* ${order.totalPrice} د.ل\n`;
  if (order.notes) {
    text += `*ملاحظات إضافية:* ${order.notes}\n`;
  }
  return text;
};

const getWhatsAppNumber = (order) => {
  const isBulk = order.priceMode === 'bulk';
  if (order.shop === 'shop2') {
    return isBulk ? '+218921717902' : '+218921717901';
  } else {
    return isBulk ? '+218916688800' : '+218921717901';
  }
};

const openResendModal = (order) => {
  selectedOrder.value = order;
  whatsappMessageText.value = generateWhatsAppMessage(order);
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  selectedOrder.value = null;
  whatsappMessageText.value = '';
};

const handleCopyMessage = async () => {
  try {
    await navigator.clipboard.writeText(whatsappMessageText.value);
    toastStore.show('تم نسخ نص الرسالة بنجاح!');
  } catch (err) {
    toastStore.show('فشل نسخ النص، يرجى المحاولة يدوياً', 'error');
  }
};

const handleResendWhatsApp = () => {
  if (!selectedOrder.value) return;
  const number = getWhatsAppNumber(selectedOrder.value);
  const url = `https://wa.me/${formatLibyanWhatsappNumber(number)}?text=${encodeURIComponent(whatsappMessageText.value)}`
  window.location.href = url;
};
</script>

<template>
  <div class="account-view-container animate-fade-in">
    
    <!-- 1. VERIFIED PROFILE CARD (WHEN LOGGED IN) -->
    <div v-if="isUserIdentified" class="verified-profile-card glass-panel animate-fade-in">
      <div class="profile-card-header">
        <div class="profile-avatar-badge">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div class="profile-header-info">
          <div class="profile-name-row">
            <h3 class="profile-name">{{ authStore.customerName }}</h3>
            <span class="verified-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>حساب موثق</span>
            </span>
          </div>
          <span class="profile-phone text-mono" dir="ltr">{{ authStore.customerPhone }}</span>
        </div>
      </div>

      <!-- Password Security Warning if not set yet -->
      <div v-if="!authStore.hasPassword" class="password-warning-banner animate-fade-in">
        <div class="warning-text">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>حسابك غير مؤمن بكلمة مرور خاصة بك حتى الآن.</span>
        </div>
        <button type="button" class="btn-set-pwd-quick" @click="authStore.showSetPasswordModal = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>تعيين كلمة مرور الآن</span>
        </button>
      </div>

      <div class="profile-security-notice">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>البيانات مؤمنة ومربوطة برقم هاتفك. لتعديل الاسم أو رقم الهاتف، يرجى التواصل مع إدارة المحل.</span>
      </div>

      <!-- Account Actions (Sign Out & Switch Account) -->
      <div class="profile-actions-grid">
        <button type="button" class="btn-profile-action btn-signout" @click="handleSignOut">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>تسجيل الخروج</span>
        </button>
        <button type="button" class="btn-profile-action btn-switch" @click="handleSwitchAccount">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
          <span>تبديل الحساب</span>
        </button>
      </div>
    </div>

    <!-- 2. LOGIN & REGISTRATION SECTION (WHEN LOGGED OUT) -->
    <div v-else class="auth-section glass-panel animate-fade-in">
      <div class="auth-tabs-nav">
        <button 
          type="button" 
          class="auth-tab-btn" 
          :class="{ active: activeAuthTab === 'login' }"
          @click="activeAuthTab = 'login'; authError = '';"
        >
          تسجيل الدخول
        </button>
        <button 
          type="button" 
          class="auth-tab-btn" 
          :class="{ active: activeAuthTab === 'register' }"
          @click="activeAuthTab = 'register'; authError = '';"
        >
          حساب جديد
        </button>
      </div>

      <!-- Login Form -->
      <form v-if="activeAuthTab === 'login'" @submit.prevent="handleLogin" class="auth-form animate-fade-in">
        <div class="form-group">
          <label class="form-label">رقم الهاتف</label>
          <input 
            v-model="loginPhone" 
            type="tel" 
            placeholder="09XXXXXXXX" 
            class="form-input" 
            dir="ltr"
            autocomplete="username tel"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">كلمة المرور</label>
          <div class="pwd-input-wrapper">
            <input 
              v-model="loginPassword" 
              :type="showLoginPassword ? 'text' : 'password'" 
              placeholder="اكتب كلمة المرور…" 
              class="form-input" 
              autocomplete="current-password"
              required
            />
            <button type="button" class="btn-pwd-eye" @click="showLoginPassword = !showLoginPassword" tabindex="-1">
              <svg v-if="!showLoginPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>

        <div v-if="authError" class="alert-msg danger animate-fade-in">
          {{ authError }}
        </div>

        <button type="submit" class="btn-auth-submit" :disabled="authLoading">
          <span v-if="!authLoading">تسجيل الدخول</span>
          <span v-else>جاري التحقق…</span>
        </button>
      </form>

      <!-- Register Form -->
      <form v-else @submit.prevent="handleRegister" class="auth-form animate-fade-in">
        <div class="form-group">
          <label class="form-label">الاسم بالكامل</label>
          <input 
            v-model="registerName" 
            type="text" 
            placeholder="اكتب اسمك الثلاثي…" 
            class="form-input" 
            autocomplete="name"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">رقم الهاتف</label>
          <input 
            v-model="registerPhone" 
            type="tel" 
            placeholder="09XXXXXXXX" 
            class="form-input" 
            dir="ltr"
            autocomplete="tel"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">تعيين كلمة المرور</label>
          <div class="pwd-input-wrapper">
            <input 
              v-model="registerPassword" 
              :type="showRegisterPassword ? 'text' : 'password'" 
              placeholder="اكتب كلمة مرور خاصة بك…" 
              class="form-input" 
              autocomplete="new-password"
              required
            />
            <button type="button" class="btn-pwd-eye" @click="showRegisterPassword = !showRegisterPassword" tabindex="-1">
              <svg v-if="!showRegisterPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>

        <div v-if="authError" class="alert-msg danger animate-fade-in">
          {{ authError }}
        </div>

        <button type="submit" class="btn-auth-submit" :disabled="authLoading">
          <span v-if="!authLoading" style="display: inline-flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>إنشاء الحساب وتأمينه</span>
          </span>
          <span v-else>جاري الإنشاء…</span>
        </button>
      </form>
    </div>

    <!-- 3. CUSTOMER CURRENT BALANCE SECTION (WHEN LOGGED IN) -->
    <div v-if="isUserIdentified" class="customer-balance-section glass-panel animate-fade-in">
      <div class="balance-header-row">
        <div class="balance-title-group">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="balance-icon">
            <rect x="2" y="5" width="20" height="14" rx="2"/>
            <line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
          <h3 class="section-title">كشف الرصيد والمستحقات</h3>
        </div>
        <span class="balance-status-badge" :class="balanceData.outstandingBalance > 0 ? 'has-debt' : 'paid-up'">
          {{ balanceData.outstandingBalance > 0 ? 'مبالغ غير مسددة' : 'الحساب مسدد بالكامل' }}
        </span>
      </div>

      <div class="balance-hero-card" :class="balanceData.outstandingBalance > 0 ? 'is-debt' : 'is-clear'">
        <div class="balance-main-amount">
          <span class="balance-amount-label">الرصيد المستحق الحالي:</span>
          <div class="balance-amount-val text-mono">
            <span class="num font-bold">{{ balanceData.outstandingBalance.toFixed(2) }}</span>
            <span class="curr">د.ل</span>
          </div>
        </div>
        <div class="balance-sub-stats">
          <div class="sub-stat-item">
            <span class="sub-stat-label">فواتير معلقة:</span>
            <span class="sub-stat-val text-mono font-bold">{{ balanceData.unpaidOrdersCount }}</span>
          </div>
          <div class="sub-stat-item">
            <span class="sub-stat-label">إجمالي المشتريات:</span>
            <span class="sub-stat-val text-mono font-bold">{{ balanceData.lifetimeTotal.toFixed(2) }} د.ل</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. ORDERS HISTORY SECTION (RESTORED ORIGINAL DESIGN & LIMITED TO LAST 5) -->
    <div class="orders-history-section glass-panel">
      <div class="orders-header-row">
        <h3 class="section-title">الطلبات السابقة</h3>
        <span v-if="orders.length" class="orders-count-badge">آخر {{ displayedOrders.length }} طلبات</span>
      </div>
      <p class="section-desc">ملاحظة: تظهر هنا الطلبات المرتبطة برقم هاتفك الحالي والمحفوظة في قاعدة البيانات.</p>

      <!-- SKELETON LOADER (Orders Loading) -->
      <div v-if="isLoadingOrders" class="orders-list animate-fade-in">
        <div v-for="i in 3" :key="'acc-ord-skel-' + i" class="order-card glass-panel skeleton-card p-3 mb-3">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="skeleton-shimmer" style="width: 90px; height: 22px; border-radius: 12px;"></div>
            <div class="skeleton-shimmer" style="width: 80px; height: 14px; border-radius: 4px;"></div>
          </div>
          <div class="skeleton-shimmer mb-2" style="width: 85%; height: 16px; border-radius: 4px;"></div>
          <div class="skeleton-shimmer mb-3" style="width: 60%; height: 14px; border-radius: 4px;"></div>
          <div class="d-flex justify-content-between align-items-center pt-2" style="border-top: 1px dashed rgba(255,255,255,0.08);">
            <div class="skeleton-shimmer" style="width: 70px; height: 20px; border-radius: 4px;"></div>
            <div class="skeleton-shimmer" style="width: 100px; height: 32px; border-radius: 8px;"></div>
          </div>
        </div>
      </div>

      <!-- No Phone State -->
      <div v-else-if="!authStore.customerPhone" class="empty-orders">
        <p>يرجى تسجيل الدخول أو إنشاء حساب لعرض سجل طلباتك.</p>
      </div>

      <!-- Empty Orders State -->
      <div v-else-if="orders.length === 0" class="empty-orders">
        <p>لا توجد طلبات مسجلة برقم هاتفك حتى الآن.</p>
      </div>

      <!-- Restored Original Orders Cards List (Last 5) -->
      <div v-else class="orders-list">
        <div v-for="order in displayedOrders" :key="order._id" class="order-card glass-panel">
          <!-- Order Header -->
          <div class="order-header">
            <div class="order-header-left">
              <span class="order-num-badge">#{{ order.orderNumber || order._id.slice(-6) }}</span>
              <span class="order-shop-badge" :class="order.shop || 'shop1'">
                {{ order.shop === 'shop2' ? 'قسم النواشف' : 'المتجر الرئيسي' }}
              </span>
              <span class="order-date">{{ formatDate(order.createdAt) }}</span>
            </div>
            <div class="order-header-right">
              <span v-if="order.printed" class="order-printed-tag" title="تمت طباعة الطلب في المحل">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                <span>تمت الطباعة</span>
              </span>
              <span class="order-status" :class="order.status || 'pending'">
                {{ getStatusLabel(order.status) }}
              </span>
            </div>
          </div>

          <!-- Order Summary Details -->
          <div class="order-summary-details">
            <span class="items-count">{{ order.items ? order.items.length : 0 }} أصناف</span>
            <span v-if="order.deliveryDate" class="delivery-badge">استلام: {{ order.deliveryDate }}</span>
            <span v-if="order.priceMode === 'bulk'" class="price-mode-badge">سعر جملة</span>
          </div>

          <!-- Order Items List -->
          <div class="order-items-list">
            <div v-for="(item, idx) in order.items" :key="idx" class="order-item-row">
              <div class="item-main-info">
                <span class="item-name">{{ item.name }}</span>
                <span v-if="item.notes" class="item-note-pill">ملاحظة: {{ item.notes }}</span>
              </div>
              <div class="item-pricing">
                <span class="item-qty">× {{ item.quantity }}</span>
                <span class="item-total-price">{{ item.price * item.quantity }} د.ل</span>
              </div>
            </div>
          </div>

          <!-- Order Total Row -->
          <div class="order-total-row">
            <span class="total-label">الإجمالي الكلي:</span>
            <span class="total-value">{{ order.totalPrice }} د.ل</span>
          </div>

          <!-- Order Actions Grid (Edit / Confirm Received / WhatsApp) -->
          <div class="order-action-buttons-stack">
            <!-- Edit Order Button (Imports to Cart) -->
            <div v-if="!order.printed && order.status !== 'received' && order.status !== 'completed' && order.status !== 'cancelled'" class="order-edit-action-row">
              <button class="btn-customer-edit-order" @click="handleEditOrderInCart(order)" title="استيراد وتعديل الطلب في السلة">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>تعديل الطلب في السلة</span>
              </button>
            </div>
            <div v-else-if="order.printed && order.status !== 'received' && order.status !== 'completed' && order.status !== 'cancelled'" class="order-locked-notice">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>تمت طباعة الطلب في المحل ولا يمكن تعديله</span>
            </div>

            <!-- Confirm Received Button -->
            <div v-if="order.status === 'ready'" class="confirm-received-row">
              <button class="btn-confirm-received" @click="confirmReceived(order)" :disabled="confirmingOrderId === order._id">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {{ confirmingOrderId === order._id ? 'جاري التأكيد…' : 'تأكيد الاستلام' }}
              </button>
            </div>

            <!-- Modern WhatsApp Action Button -->
            <div class="order-actions-row">
              <button class="btn-resend-whatsapp" @click="openResendModal(order)">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                تفاصيل ورسالة الواتساب
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- WhatsApp Details Modal -->
    <div v-if="isModalOpen" class="modal-backdrop" @click="closeModal">
      <div class="modal-content glass-panel" @click.stop>
        <div class="modal-header">
          <div class="modal-title-group">
            <h4 class="modal-title">تفاصيل الطلب</h4>
            <span class="modal-subtitle">رسالة جاهزة لإعادة الإرسال عبر واتساب</span>
          </div>
          <button class="btn-close" @click="closeModal">✕</button>
        </div>

        <div class="modal-body">
          <textarea 
            class="whatsapp-textarea" 
            readonly 
            v-model="whatsappMessageText"
            rows="9"
          ></textarea>
        </div>

        <div class="modal-footer">
          <button class="btn-modal-action btn-copy" @click="handleCopyMessage">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            نسخ الرسالة
          </button>
          <button class="btn-modal-action btn-send-wa" @click="handleResendWhatsApp">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            إعادة الإرسال عبر واتساب
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.account-view-container {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 90px;
  font-family: 'Cairo', sans-serif;
  direction: rtl;
}

/* Verified Profile Card */
.verified-profile-card {
  padding: 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.profile-card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.profile-avatar-badge {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.25));
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #d97706;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-header-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex-grow: 1;
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.profile-name {
  font-size: 1.15rem;
  font-weight: 850;
  color: #0f172a;
  margin: 0;
  word-break: break-word;
}

.verified-badge {
  font-size: 0.74rem;
  font-weight: 800;
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  padding: 2px 8px;
  border-radius: 6px;
  white-space: nowrap;
}

.profile-phone {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 700;
}

.password-warning-banner {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;
  padding: 10px 14px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.warning-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  font-weight: 750;
  color: #b45309;
}

.btn-set-pwd-quick {
  background: #f59e0b;
  color: #ffffff;
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
  align-self: flex-start;
  transition: all 0.15s ease;
}

.btn-set-pwd-quick:hover {
  background: #d97706;
}

.profile-security-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.78rem;
  color: #64748b;
  line-height: 1.4;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px 12px;
  margin-bottom: 16px;
}

.profile-security-notice svg {
  flex-shrink: 0;
  margin-top: 2px;
  color: #94a3b8;
}

.profile-actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.btn-profile-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
}

.btn-signout {
  background: #fef2f2;
  border: 1.5px solid #fecaca;
  color: #dc2626;
}

.btn-signout:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  transform: translateY(-1px);
}

.btn-switch {
  background: #f8fafc;
  border: 1.5px solid #cbd5e1;
  color: #334155;
}

.btn-switch:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
  transform: translateY(-1px);
}

/* Customer Balance Section */
.customer-balance-section {
  padding: 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.balance-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.balance-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.balance-icon {
  color: #f59e0b;
}

.balance-status-badge {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 8px;
}

.balance-status-badge.paid-up {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.balance-status-badge.has-debt {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
}

.balance-hero-card {
  padding: 16px 18px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s ease;
}

.balance-hero-card.is-clear {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.04));
  border: 1.5px solid rgba(16, 185, 129, 0.25);
}

.balance-hero-card.is-debt {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.06));
  border: 1.5px solid rgba(245, 158, 11, 0.35);
}

.balance-main-amount {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.balance-amount-label {
  font-size: 0.9rem;
  font-weight: 750;
  color: #475569;
}

.balance-amount-val {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.balance-amount-val .num {
  font-size: 1.5rem;
  color: #0f172a;
}

.balance-hero-card.is-debt .balance-amount-val .num {
  color: #d97706;
}

.balance-hero-card.is-clear .balance-amount-val .num {
  color: #059669;
}

.balance-amount-val .curr {
  font-size: 0.9rem;
  font-weight: 800;
  color: #64748b;
}

.balance-sub-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px dashed rgba(0, 0, 0, 0.08);
}

.sub-stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
}

.sub-stat-label {
  color: #64748b;
}

.sub-stat-val {
  color: #0f172a;
}

/* Auth Section (Login / Register Tabs) */
.auth-section {
  padding: 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.auth-tabs-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 12px;
  margin-bottom: 18px;
  gap: 4px;
}

.auth-tab-btn {
  padding: 9px 12px;
  border: none;
  background: transparent;
  color: #64748b;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 800;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.auth-tab-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.84rem;
  font-weight: 750;
  color: #334155;
}

.form-input {
  width: 100%;
  height: 42px;
  padding: 8px 12px;
  border: 1.5px solid #cbd5e1;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.9rem;
  color: #0f172a;
  background: #ffffff;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #f59e0b;
  outline: none;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
}

.pwd-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.pwd-input-wrapper .form-input {
  padding-left: 38px;
}

.btn-pwd-eye {
  position: absolute;
  left: 10px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.btn-auth-submit {
  width: 100%;
  height: 44px;
  margin-top: 6px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: 1px solid #d97706;
  color: #ffffff;
  font-family: inherit;
  font-size: 0.94rem;
  font-weight: 850;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.3);
}

.btn-auth-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.4);
  background: linear-gradient(135deg, #fbbf24, #ea580c);
}

.btn-auth-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.alert-msg {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  text-align: center;
}

.alert-msg.danger {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

/* Orders History Section */
.orders-history-section {
  padding: 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.orders-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 850;
  color: #0f172a;
  margin: 0;
}

.orders-count-badge {
  font-size: 0.78rem;
  font-weight: 800;
  background: #f1f5f9;
  color: #475569;
  padding: 3px 10px;
  border-radius: 12px;
}

.section-desc {
  font-size: 0.82rem;
  color: #64748b;
  margin: 4px 0 16px 0;
}

.loading-orders,
.empty-orders {
  text-align: center;
  padding: 24px 12px;
  color: #64748b;
  font-size: 0.88rem;
}

.mini-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e2e8f0;
  border-top-color: #f59e0b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 10px auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.order-card {
  padding: 16px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
}

.order-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
}

.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.order-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.order-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.order-printed-tag {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #475569;
}

.order-num-badge {
  font-family: 'Cairo', 'Fira Code', monospace;
  font-size: 0.78rem;
  font-weight: 850;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
}

.order-shop-badge {
  font-size: 0.72rem;
  font-weight: 750;
  padding: 2px 7px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #475569;
}

.order-date {
  font-size: 0.75rem;
  color: #94a3b8;
}

.order-status {
  font-size: 0.74rem;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 8px;
}

.order-status.pending {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.order-status.ready {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

.order-status.received,
.order-status.completed {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.order-status.cancelled {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.order-summary-details {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.items-count,
.delivery-badge,
.price-mode-badge {
  font-size: 0.74rem;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-weight: 700;
}

.delivery-badge {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.price-mode-badge {
  background: #faf5ff;
  border-color: #e9d5ff;
  color: #7e22ce;
}

.order-items-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0;
  border-top: 1px dashed #e2e8f0;
  border-bottom: 1px dashed #e2e8f0;
  margin-bottom: 10px;
}

.order-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.84rem;
  gap: 8px;
}

.item-main-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.item-name {
  color: #1e293b;
  font-weight: 700;
}

.item-note-pill {
  font-size: 0.72rem;
  color: #d97706;
  background: rgba(245, 158, 11, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
}

.item-pricing {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  white-space: nowrap;
}

.item-qty {
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 700;
}

.item-total-price {
  font-weight: 850;
  color: #0f172a;
}

.order-total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 850;
  font-size: 0.95rem;
  color: #0f172a;
  margin-bottom: 10px;
}

.order-action-buttons-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-customer-edit-order {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 14px;
  border: 1.5px solid #f59e0b;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.08);
  color: #d97706;
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-customer-edit-order:hover {
  background: #f59e0b;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.order-locked-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.76rem;
  color: #64748b;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px 10px;
}

.confirm-received-row {
  margin-top: 2px;
}

.btn-confirm-received {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 14px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #ffffff;
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-confirm-received:hover {
  background: linear-gradient(135deg, #059669, #047857);
}

.btn-resend-whatsapp {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #ffffff;
  color: #334155;
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-resend-whatsapp:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #0f172a;
}

/* WhatsApp Details Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 16px;
}

.modal-content {
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.modal-title {
  font-size: 1.05rem;
  font-weight: 850;
  color: #0f172a;
  margin: 0 0 2px 0;
}

.modal-subtitle {
  font-size: 0.78rem;
  color: #64748b;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.1rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
}

.whatsapp-textarea {
  width: 100%;
  border: 1.5px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px;
  font-family: inherit;
  font-size: 0.84rem;
  line-height: 1.5;
  resize: vertical;
  background: #f8fafc;
  box-sizing: border-box;
}

.modal-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

.btn-modal-action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-copy {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #334155;
}

.btn-copy:hover {
  background: #e2e8f0;
}

.btn-send-wa {
  background: #25d366;
  border: 1px solid #22c55e;
  color: #ffffff;
}

.btn-send-wa:hover {
  background: #20ba5a;
}

@keyframes skeletonShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-shimmer {
  background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.06) 75%);
  background-size: 200% 100%;
  animation: skeletonShimmer 1.5s infinite ease-in-out;
}

.skeleton-card {
  pointer-events: none;
}

</style>
