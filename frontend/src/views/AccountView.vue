<script setup>
import { formatLibyanWhatsappNumber, getLibyanWhatsAppUrl, formatLibyanPhone, formatPhoneInput } from '../utils/phone';
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import JsBarcode from 'jsbarcode';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useFavoritesStore } from '../stores/favorites';
import { useCartStore } from '../stores/cart';
import { useToastStore } from '../stores/toast';
import { vSheetGesture } from '../utils/sheetGesture';

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
    if (!authStore.customerToken) {
      await authStore.ensureToken();
    }
    const headers = authStore.getAuthHeaders();
    const [ordersRes, balanceRes] = await Promise.all([
      fetch(`/api/customer/orders?phone=${encodeURIComponent(authStore.customerPhone)}`, { headers }),
      fetch(`/api/customer/balance?phone=${encodeURIComponent(authStore.customerPhone)}`, { headers })
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
    nextTick(() => {
      renderOrderBarcodes();
    });
  }
};

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    if (isModalOpen.value) {
      e.preventDefault();
      closeModal();
    }
  }
};

onMounted(() => {
  loadCustomerData();
  renderOrderBarcodes();
  if (authStore.customerPhone) {
    authStore.checkProfileStatus();
  }
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

// Watch phone number changes to refetch history & balance
watch(() => authStore.customerPhone, () => {
  loadCustomerData();
});

const handleLogin = async () => {
  if (!loginPhone.value.trim() || !loginPassword.value) {
    authError.value = 'رقم الهاتف وكلمة المرور مطلوبان';
    return;
  }

  authLoading.value = true;
  authError.value = '';

  try {
    const res = await authStore.login(loginPhone.value.trim(), loginPassword.value);
    if (res.requiresPasswordSetup) {
      toastStore.show('عيّن كلمة مرور لحسابك للمتابعة', 'warning');
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
    authError.value = 'الاسم بالكامل مطلوب';
    return;
  }
  const digits = registerPhone.value.replace(/\D/g, '');
  if (!registerPhone.value.trim() || digits.length < 9) {
    authError.value = 'رقم الهاتف غير صحيح (يجب أن يتكون من 10 أرقام ليبية، مثل: 091-XXXXXXX)';
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
    if (!authStore.customerToken) {
      await authStore.ensureToken();
    }
    const res = await fetch(`/api/customer/orders/${order._id}/received`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...authStore.getAuthHeaders()
      },
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

// Collapsible items breakdown
const expandedOrders = ref({});
const toggleOrderItems = (orderId) => {
  expandedOrders.value[orderId] = !expandedOrders.value[orderId];
};

const getItemsPreview = (items) => {
  if (!items || !items.length) return '';
  const names = items.map(i => i.name).filter(Boolean);
  if (names.length <= 2) return names.join('، ');
  return names.slice(0, 2).join('، ') + `، و${names.length - 2} آخر…`;
};

// Render high-contrast wide barcodes on SVG elements using JsBarcode
const renderOrderBarcodes = () => {
  nextTick(() => {
    displayedOrders.value.forEach(order => {
      const el = document.getElementById('order-barcode-' + order._id);
      if (!el) return;

      const codeVal = order.orderNumber ? String(order.orderNumber) : String(order._id).slice(-8);

      try {
        JsBarcode(el, codeVal, {
          format: 'CODE128',
          width: 2.2,
          height: 48,
          displayValue: false,
          flat: true,
          margin: 4,
          background: '#ffffff',
          lineColor: '#0f172a'
        });
        el.setAttribute('preserveAspectRatio', 'none');
      } catch (err) {
        console.error('Barcode render error for order:', order._id, err);
      }
    });
  });
};

watch(displayedOrders, () => {
  renderOrderBarcodes();
}, { immediate: true, deep: true });

watch(isLoadingOrders, (loading) => {
  if (!loading) {
    nextTick(() => {
      renderOrderBarcodes();
    });
  }
});

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
  text += `*الهاتف:* ${formatLibyanPhone(order.customerInfo?.phone || authStore.customerPhone)}\n`;
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
  text += `*الإجمالي الكلي:* ${Math.round(Number(order.totalPrice) || 0)} د.ل\n`;
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
    toastStore.show('فشل نسخ النص، حاول يدوياً', 'error');
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
    <h1 class="sr-only">حساب العميل والطلبات</h1>
    
    <!-- 1. VERIFIED PROFILE CARD (WHEN LOGGED IN) -->
    <div v-if="isUserIdentified" class="verified-profile-card glass-panel animate-fade-in">
      <div class="profile-card-header">
        <div class="profile-avatar-badge">
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div class="profile-header-info">
          <div class="profile-name-row">
            <h2 class="profile-name">{{ authStore.customerName }}</h2>
            <span class="verified-badge">
              <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>حساب موثق</span>
            </span>
          </div>
          <span class="profile-phone text-mono" dir="ltr">{{ formatLibyanPhone(authStore.customerPhone) }}</span>
        </div>
      </div>

      <!-- Password Security Warning if not set yet -->
      <div v-if="!authStore.hasPassword" class="password-warning-banner animate-fade-in">
        <div class="warning-text">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>حسابك غير مؤمن بكلمة مرور خاصة بك حتى الآن.</span>
        </div>
        <button type="button" class="btn-set-pwd-quick" @click="authStore.showSetPasswordModal = true">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>تعيين كلمة مرور الآن</span>
        </button>
      </div>

      <div class="profile-security-notice">
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>البيانات مؤمنة برقم الهاتف. لتعديل البيانات تواصل مع الإدارة.</span>
      </div>

      <!-- Account Actions (Sign Out & Switch Account) -->
      <div class="profile-actions-grid">
        <button type="button" class="btn-profile-action btn-signout" @click="handleSignOut">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>تسجيل الخروج</span>
        </button>
        <button type="button" class="btn-profile-action btn-switch" @click="handleSwitchAccount">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
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
            @input="loginPhone = formatPhoneInput($event.target.value)"
            type="tel" 
            placeholder="09X-XXXXXXX" 
            class="form-input text-mono" 
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
              placeholder="كلمة المرور…" 
              class="form-input" 
              autocomplete="current-password"
              required
            />
            <button type="button" class="btn-pwd-eye" @click="showLoginPassword = !showLoginPassword" tabindex="-1" aria-label="إظهار أو إخفاء كلمة المرور">
              <svg v-if="!showLoginPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
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
            placeholder="الاسم الثلاثي…" 
            class="form-input" 
            autocomplete="name"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">رقم الهاتف</label>
          <input 
            v-model="registerPhone" 
            @input="registerPhone = formatPhoneInput($event.target.value)"
            type="tel" 
            placeholder="09X-XXXXXXX" 
            class="form-input text-mono" 
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
              placeholder="كلمة المرور…" 
              class="form-input" 
              autocomplete="new-password"
              required
            />
            <button type="button" class="btn-pwd-eye" @click="showRegisterPassword = !showRegisterPassword" tabindex="-1" aria-label="إظهار أو إخفاء كلمة المرور">
              <svg v-if="!showRegisterPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>

        <div v-if="authError" class="alert-msg danger animate-fade-in">
          {{ authError }}
        </div>

        <button type="submit" class="btn-auth-submit" :disabled="authLoading">
          <span v-if="!authLoading" style="display: inline-flex; align-items: center; gap: 6px;">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
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
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="balance-icon">
            <rect x="2" y="5" width="20" height="14" rx="2"/>
            <line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
          <h2 class="section-title">كشف الرصيد والمستحقات</h2>
        </div>
        <span class="balance-status-badge" :class="balanceData.outstandingBalance > 0 ? 'has-debt' : 'paid-up'">
          {{ balanceData.outstandingBalance > 0 ? 'مبالغ غير مسددة' : 'الحساب مسدد بالكامل' }}
        </span>
      </div>

      <div class="balance-hero-card" :class="balanceData.outstandingBalance > 0 ? 'is-debt' : 'is-clear'">
        <div class="balance-main-amount">
          <span class="balance-amount-label">الرصيد المستحق الحالي:</span>
          <div class="balance-amount-val text-mono">
            <span class="num font-bold">{{ Math.round(balanceData.outstandingBalance || 0) }}</span>
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
            <span class="sub-stat-val text-mono font-bold">{{ Math.round(balanceData.lifetimeTotal || 0) }} د.ل</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. ORDERS HISTORY SECTION (RESTORED ORIGINAL DESIGN & LIMITED TO LAST 5) -->
    <div class="orders-history-section glass-panel">
      <div class="orders-header-row">
        <h2 class="section-title">الطلبات السابقة</h2>
        <span v-if="orders.length" class="orders-count-badge">آخر {{ displayedOrders.length }} طلبات</span>
      </div>

      <!-- SKELETON LOADER (Orders Loading - 1:1 Layout Parity) -->
      <div v-if="isLoadingOrders" class="orders-list animate-fade-in">
        <div v-for="i in 3" :key="'acc-ord-skel-' + i" class="order-card modern-order-card skeleton-card">
          <!-- Top Bar skeleton -->
          <div class="order-top-bar">
            <div class="d-flex align-items-center gap-2">
              <div class="skeleton-shimmer" style="width: 70px; height: 26px; border-radius: 8px;"></div>
              <div class="skeleton-shimmer" style="width: 85px; height: 24px; border-radius: 8px;"></div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <div class="skeleton-shimmer" style="width: 75px; height: 24px; border-radius: 8px;"></div>
              <div class="skeleton-shimmer" style="width: 85px; height: 26px; border-radius: 8px;"></div>
            </div>
          </div>
          <!-- Date skeleton -->
          <div class="skeleton-shimmer" style="width: 100%; height: 38px; border-radius: 12px;"></div>
          <!-- Wide Barcode box skeleton -->
          <div class="skeleton-shimmer" style="width: 100%; height: 82px; border-radius: 14px;"></div>
          <!-- Summary row skeleton -->
          <div class="skeleton-shimmer" style="width: 100%; height: 42px; border-radius: 12px;"></div>
          <!-- WhatsApp button skeleton -->
          <div class="skeleton-shimmer" style="width: 100%; height: 44px; border-radius: 12px;"></div>
        </div>
      </div>

      <!-- No Phone State -->
      <div v-else-if="!authStore.customerPhone" class="empty-orders">
        <p>سجل الدخول أو أنشئ حساباً لعرض سجل طلباتك.</p>
      </div>

      <!-- Empty Orders State -->
      <div v-else-if="orders.length === 0" class="empty-orders">
        <p>لا توجد طلبات مسجلة برقم هاتفك حتى الآن.</p>
      </div>

      <!-- Modern Minimal Orders Cards List (Last 5) -->
      <div v-else class="orders-list">
        <div v-for="order in displayedOrders" :key="order._id" class="order-card modern-order-card">
          <!-- 1. Card Top Bar: Order ID, Shop Badge, Print State, Order State -->
          <div class="order-top-bar">
            <div class="order-top-left">
              <span class="order-num-pill">#{{ order.orderNumber || order._id.slice(-6) }}</span>
              <span class="order-shop-pill" :class="order.shop || 'shop1'">
                {{ order.shop === 'shop2' ? 'قسم النواشف' : 'المتجر الرئيسي' }}
              </span>
              <span v-if="order.priceMode === 'bulk'" class="order-mode-pill">جملة</span>
            </div>
            
            <div class="order-top-right">
              <!-- Print State -->
              <span v-if="order.printed" class="order-print-pill is-printed" title="تمت طباعة الطلب بالمحل">
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                <span>تمت الطباعة</span>
              </span>
              <span v-else class="order-print-pill not-printed" title="قيد التجهيز - لم يُطبع بعد">
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>غير مطبوع</span>
              </span>

              <!-- Order State -->
              <span class="order-state-pill" :class="order.status || 'pending'">
                <span v-if="!order.status || order.status === 'pending'" class="state-dot-pulse" aria-hidden="true"></span>
                <svg v-else-if="order.status === 'ready'" aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h24s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <svg v-else-if="order.status === 'received' || order.status === 'completed'" aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <svg v-else-if="order.status === 'cancelled'" aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                <span>{{ getStatusLabel(order.status) }}</span>
              </span>
            </div>
          </div>

          <!-- 2. Order Dates (Reception / Delivery Date & Order Timestamp) -->
          <div class="order-dates-banner">
            <div class="order-rec-date-wrap" :class="{ 'has-delivery-date': !!order.deliveryDate }">
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="calendar-icon">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span class="date-title">موعد الاستلام:</span>
              <span class="date-highlight text-mono">{{ order.deliveryDate || formatDate(order.createdAt) }}</span>
            </div>
            <div v-if="order.deliveryDate" class="order-created-timestamp">
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>تاريخ الطلب: {{ formatDate(order.createdAt) }}</span>
            </div>
          </div>

          <!-- 3. Wide Order Barcode -->
          <div class="order-wide-barcode-card">
            <div class="barcode-svg-wrapper">
              <svg 
                :id="'order-barcode-' + order._id" 
                class="wide-order-barcode-svg" 
                role="img" 
                :aria-label="'باركود الطلب رقم ' + (order.orderNumber || order._id.slice(-6))"
              ></svg>
            </div>
            <div class="barcode-footer-info">
              <span class="barcode-id-text text-mono">#{{ order.orderNumber || order._id.slice(-6) }}</span>
              <span class="barcode-scan-hint">
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
                <span>امسح الباركود عند الاستلام في المحل</span>
              </span>
            </div>
          </div>

          <!-- 4. Items Summary & Order Total -->
          <div class="order-compact-summary">
            <!-- Items count / toggle -->
            <button 
              type="button" 
              class="items-toggle-btn" 
              @click="toggleOrderItems(order._id)" 
              :aria-expanded="!!expandedOrders[order._id]"
              aria-label="عرض أو إخفاء أصناف الطلب"
            >
              <span class="items-count-chip">{{ order.items?.length || 0 }} أصناف</span>
              <span class="items-names-preview">{{ getItemsPreview(order.items) }}</span>
              <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="toggle-chevron" :class="{ 'is-open': !!expandedOrders[order._id] }"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            <!-- Order Total -->
            <div class="order-total-display">
              <span class="total-label-text">الإجمالي:</span>
              <span class="total-price-val text-mono">{{ Math.round(Number(order.totalPrice) || 0) }} <span class="curr-symbol">د.ل</span></span>
            </div>
          </div>

          <!-- 5. Collapsible Items Breakdown -->
          <Transition name="expand-items">
            <div v-if="expandedOrders[order._id]" class="order-expanded-breakdown">
              <div v-for="(item, idx) in order.items" :key="idx" class="expanded-item-row">
                <div class="item-name-group">
                  <span class="item-title font-bold">{{ item.name }}</span>
                  <span v-if="item.notes" class="item-note-tag">{{ item.notes }}</span>
                </div>
                <div class="item-calc-group text-mono">
                  <span class="item-calc-qty">{{ item.quantity }}×</span>
                  <span class="item-calc-price">{{ Math.round((Number(item.price) || 0) * (Number(item.quantity) || 0)) }} د.ل</span>
                </div>
              </div>
            </div>
          </Transition>

          <!-- 6. Actions: WhatsApp Details Button & Secondary Actions -->
          <div class="order-card-actions-group">
            <!-- Primary WhatsApp Details Button -->
            <button type="button" class="btn-order-whatsapp-details" @click="openResendModal(order)">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.772.82 2.79.82 3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.806-5.767-5.806zm0 10.371c-.88 0-1.637-.24-2.311-.64l-.165-.1-1.722.451.46-1.677-.11-.177c-.45-.72-.689-1.55-.689-2.463 0-2.43 1.979-4.409 4.41-4.409 2.43 0 4.409 1.979 4.409 4.409 0 2.43-1.979 4.41-4.41 4.41zm3.178-3.308c-.174-.087-1.03-.509-1.19-.567-.16-.058-.277-.087-.393.087-.116.174-.45.567-.552.684-.102.116-.203.13-.377.043-.174-.087-.735-.271-1.4-.864-.518-.462-.868-1.033-.97-1.207-.101-.174-.011-.268.076-.355.078-.078.174-.203.261-.305.087-.102.116-.174.174-.29.058-.116.029-.218-.015-.305-.043-.087-.393-.946-.538-1.296-.142-.34-.286-.294-.393-.299l-.335-.005c-.116 0-.305.043-.465.218-.16.174-.61.596-.61 1.454 0 .858.625 1.687.712 1.803.087.116 1.23 1.878 2.98 2.634.416.18.741.287.994.368.418.133.798.114 1.099.069.335-.05 1.03-.421 1.175-.828.145-.407.145-.756.102-.828-.043-.073-.16-.116-.334-.203z"/>
              </svg>
              <span>تفاصيل ورسالة الواتساب</span>
            </button>

            <!-- Secondary Actions Row -->
            <div v-if="order.status === 'ready' || (!order.printed && order.status !== 'received' && order.status !== 'completed' && order.status !== 'cancelled')" class="order-secondary-actions-row">
              <!-- Confirm Received Button -->
              <button 
                v-if="order.status === 'ready'" 
                type="button" 
                class="btn-confirm-received-subtle" 
                @click="confirmReceived(order)" 
                :disabled="confirmingOrderId === order._id"
              >
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>{{ confirmingOrderId === order._id ? 'جاري التأكيد…' : 'تأكيد الاستلام' }}</span>
              </button>

              <!-- Edit in Cart Button -->
              <button 
                v-if="!order.printed && order.status !== 'received' && order.status !== 'completed' && order.status !== 'cancelled'" 
                type="button" 
                class="btn-edit-order-subtle" 
                @click="handleEditOrderInCart(order)" 
                title="استيراد وتعديل الطلب في السلة"
              >
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span>تعديل في السلة</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- WhatsApp Details Modal -->
    <Teleport to="body">
      <Transition name="modal-spring-fade">
        <div v-if="isModalOpen" class="modal-backdrop" @click="closeModal">
          <div class="modal-content glass-panel" role="dialog" aria-modal="true" aria-labelledby="order-details-title" @click.stop v-sheet-gesture="closeModal">
            <div class="sheet-grab-handle" aria-hidden="true"></div>
            <div class="modal-header">
              <div class="modal-title-group">
                <h4 id="order-details-title" class="modal-title">تفاصيل الطلب</h4>
                <span class="modal-subtitle">رسالة جاهزة لإعادة الإرسال عبر واتساب</span>
              </div>
              <button type="button" class="btn-close" @click="closeModal" aria-label="إغلاق">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div class="modal-body">
              <textarea 
                aria-label="نص رسالة الواتساب"
                class="whatsapp-textarea" 
                readonly 
                v-model="whatsappMessageText"
                rows="9"
              ></textarea>
            </div>

            <div class="modal-footer">
              <button class="btn-modal-action btn-copy" @click="handleCopyMessage">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                نسخ الرسالة
              </button>
              <button class="btn-modal-action btn-send-wa" @click="handleResendWhatsApp">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                إعادة الإرسال عبر واتساب
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

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
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  color: #94a3b8;
  margin-bottom: 14px;
}

.profile-security-notice svg {
  flex-shrink: 0;
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
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #475569;
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
  min-height: 44px;
  height: 44px;
  padding: 8px 12px;
  border: 1.5px solid #cbd5e1;
  border-radius: 10px;
  font-family: inherit;
  font-size: 16px;
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
  left: 6px;
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  background: transparent;
  border: none;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.btn-pwd-eye::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 44px;
  min-height: 44px;
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

/* Modern Minimal Order Card */
.modern-order-card {
  padding: 16px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.02), 0 1px 3px rgba(15, 23, 42, 0.03);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modern-order-card:hover {
  border-color: rgba(15, 23, 42, 0.14);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
}

.order-card.skeleton-card .skeleton-shimmer {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: skeletonShimmer 1.5s infinite ease-in-out;
}

/* 1. Top Bar: Order ID, Shop Badge, Print State, Order State */
.order-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.order-top-left,
.order-top-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.order-num-pill {
  font-family: 'Cairo', 'Fira Code', monospace;
  font-size: 0.82rem;
  font-weight: 800;
  color: #0f172a;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 3px 8px;
  border-radius: 8px;
  letter-spacing: -0.2px;
}

.order-shop-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #f1f5f9;
}

.order-shop-pill.shop2 {
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.2);
}

.order-mode-pill {
  font-size: 0.7rem;
  font-weight: 750;
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(147, 51, 234, 0.08);
  color: #7e22ce;
  border: 1px solid rgba(147, 51, 234, 0.2);
}

/* Print State Pill */
.order-print-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 750;
  padding: 3px 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.order-print-pill.is-printed {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #334155;
}

.order-print-pill.not-printed {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

/* Order State Pill */
.order-state-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.74rem;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 8px;
  letter-spacing: -0.1px;
}

.order-state-pill.pending {
  background: #fffbeb;
  color: #b45309;
  border: 1px solid #fde68a;
}

.order-state-pill.ready {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.order-state-pill.received,
.order-state-pill.completed {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.order-state-pill.cancelled {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.state-dot-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d97706;
  box-shadow: 0 0 6px rgba(217, 119, 6, 0.6);
  animation: statePulse 1.6s ease-in-out infinite;
}

@keyframes statePulse {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.25); }
}

/* 2. Order Dates */
.order-dates-banner {
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  padding: 9px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.order-rec-date-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #334155;
}

.order-rec-date-wrap.has-delivery-date .calendar-icon {
  color: #d97706;
}

.order-rec-date-wrap.has-delivery-date .date-title {
  font-weight: 750;
  color: #0f172a;
}

.order-rec-date-wrap.has-delivery-date .date-highlight {
  font-weight: 800;
  color: #b45309;
  background: rgba(245, 158, 11, 0.12);
  padding: 2px 7px;
  border-radius: 6px;
}

.order-created-timestamp {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.74rem;
  color: #94a3b8;
}

/* 3. Wide Order Barcode */
.order-wide-barcode-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 10px 14px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02);
  position: relative;
}

.barcode-svg-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  padding: 2px 0;
}

.wide-order-barcode-svg {
  width: 100%;
  max-width: 340px;
  height: 52px;
  display: block;
}

.barcode-footer-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-top: 6px;
  border-top: 1px dashed #f1f5f9;
  margin-top: 4px;
}

.barcode-id-text {
  font-size: 0.84rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 0.5px;
}

.barcode-scan-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 600;
}

/* 4. Compact Summary & Order Total */
.order-compact-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  gap: 12px;
}

.items-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  font-family: inherit;
  text-align: right;
  min-width: 0;
  flex: 1;
}

.items-count-chip {
  font-size: 0.72rem;
  font-weight: 750;
  padding: 2px 7px;
  border-radius: 6px;
  background: #e2e8f0;
  color: #334155;
  white-space: nowrap;
  flex-shrink: 0;
}

.items-names-preview {
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toggle-chevron {
  color: #94a3b8;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
}

.toggle-chevron.is-open {
  transform: rotate(180deg);
}

.order-total-display {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}

.total-label-text {
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 700;
}

.total-price-val {
  font-family: 'Cairo', 'Fira Code', sans-serif !important;
  font-size: 1.15rem;
  font-weight: 850;
  color: #0f172a;
}

.curr-symbol {
  font-size: 0.8rem;
  font-weight: 750;
  color: #64748b;
}

/* 5. Collapsible Items Breakdown */
.order-expanded-breakdown {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.expanded-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.82rem;
  gap: 8px;
  padding: 4px 0;
}

.expanded-item-row:not(:last-child) {
  border-bottom: 1px dashed #f1f5f9;
}

.item-name-group {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.item-title {
  color: #1e293b;
}

.item-note-tag {
  font-size: 0.7rem;
  color: #d97706;
  background: rgba(245, 158, 11, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
}

.item-calc-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.item-calc-qty {
  color: #64748b;
  font-size: 0.78rem;
}

.item-calc-price {
  color: #0f172a;
  font-weight: 800;
}

/* Transitions */
.expand-items-enter-active,
.expand-items-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.expand-items-enter-from,
.expand-items-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-4px);
}

.expand-items-enter-to,
.expand-items-leave-from {
  opacity: 1;
  max-height: 500px;
  transform: translateY(0);
}

/* 6. Card Actions */
.order-card-actions-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 2px;
}

.btn-order-whatsapp-details {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: #25d366;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 750;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(37, 211, 102, 0.25);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-order-whatsapp-details:hover {
  background: #20bd5a;
  box-shadow: 0 4px 14px rgba(37, 211, 102, 0.35);
  transform: translateY(-1px);
}

.btn-order-whatsapp-details:active {
  transform: translateY(0);
}

.order-secondary-actions-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-confirm-received-subtle {
  flex: 1;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-confirm-received-subtle:hover {
  background: #10b981;
  color: #ffffff;
  border-color: #10b981;
}

.btn-edit-order-subtle {
  flex: 1;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background: #fffbeb;
  color: #b45309;
  border: 1px solid #fde68a;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-edit-order-subtle:hover {
  background: #f59e0b;
  color: #ffffff;
  border-color: #f59e0b;
}

/* WhatsApp Details Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2500;
  padding: 16px;
  overscroll-behavior: contain;
}

.modal-content {
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.sheet-grab-handle {
  width: 38px;
  height: 4.5px;
  border-radius: 3px;
  background: rgba(148, 163, 184, 0.45);
  margin: 0 auto 12px auto;
  display: none;
  touch-action: none;
  cursor: grab;
}

@media (max-width: 768px) {
  .sheet-grab-handle {
    display: block;
  }

  .modal-backdrop {
    align-items: flex-end !important;
    padding: 0 !important;
  }

  .modal-backdrop .modal-content {
    border-radius: 20px 20px 0 0 !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding-bottom: max(20px, env(safe-area-inset-bottom, 20px)) !important;
  }
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
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  position: relative;
  touch-action: manipulation;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.btn-close::before {
  content: '';
  position: absolute;
  top: -4px;
  bottom: -4px;
  left: -4px;
  right: -4px;
}

.btn-close:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #0f172a;
}

.btn-close:focus-visible {
  outline: 2px solid var(--primary-color, #f59e0b);
  outline-offset: 2px;
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
