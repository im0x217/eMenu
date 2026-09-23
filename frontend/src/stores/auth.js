import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { formatLibyanPhone } from '../utils/phone';

export const useAuthStore = defineStore('auth', () => {
  const customerName = ref(localStorage.getItem('customer_name') || '');
  const customerPhone = ref(formatLibyanPhone(localStorage.getItem('customer_phone') || ''));
  const customerToken = ref(localStorage.getItem('customer_token') || '');
  const hasPassword = ref(localStorage.getItem('customer_has_password') === 'true');
  const showSetPasswordModal = ref(false);
  const showLoginModal = ref(false);

  // Keep isIdentified as a callable function for full backwards compatibility
  const isIdentified = () => {
    return (customerName.value || '').trim().length > 0 && (customerPhone.value || '').trim().length > 0;
  };

  const isLoggedIn = computed(() => {
    return (customerPhone.value || '').trim().length > 0 && ((customerToken.value || '').trim().length > 0 || hasPassword.value);
  });

  const getAuthHeaders = () => {
    return customerToken.value ? { 'Authorization': `Bearer ${customerToken.value}` } : {};
  };

  const ensureToken = async () => {
    if (!customerPhone.value) return null;
    if (customerToken.value) return customerToken.value;
    try {
      const res = await fetch('/api/customer/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: customerName.value || 'عميل', 
          phone: customerPhone.value 
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          customerToken.value = data.token;
          localStorage.setItem('customer_token', data.token);
          return data.token;
        }
      }
    } catch (e) {
      console.warn('Failed to ensure customer token', e);
    }
    return null;
  };

  const setSession = (name, phone, token = '', passwordFlag = true) => {
    customerName.value = (name || '').trim();
    customerPhone.value = formatLibyanPhone(phone);
    if (token) {
      customerToken.value = token;
      localStorage.setItem('customer_token', customerToken.value);
    }
    hasPassword.value = !!passwordFlag;

    localStorage.setItem('customer_name', customerName.value);
    localStorage.setItem('customer_phone', customerPhone.value);
    localStorage.setItem('customer_has_password', hasPassword.value ? 'true' : 'false');
  };

  // Backwards compatibility alias for setIdentity
  const setIdentity = async (name, phone) => {
    const cleanName = (name || '').trim();
    const cleanPhone = (phone || '').trim();
    setSession(cleanName, cleanPhone, customerToken.value, hasPassword.value);
    if (cleanPhone) {
      await ensureToken();
    }
  };

  const clearIdentity = () => {
    customerName.value = '';
    customerPhone.value = '';
    customerToken.value = '';
    hasPassword.value = false;
    showSetPasswordModal.value = false;

    localStorage.removeItem('customer_name');
    localStorage.removeItem('customer_phone');
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_has_password');
  };

  const login = async (phone, password) => {
    const res = await fetch('/api/customer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'فشل تسجيل الدخول');
    }

    if (data.requiresPasswordSetup) {
      customerName.value = data.customer?.name || '';
      customerPhone.value = data.customer?.phone || phone;
      hasPassword.value = false;
      showSetPasswordModal.value = true;
      return { requiresPasswordSetup: true, customer: data.customer };
    }

    setSession(data.customer.name, data.customer.phone, data.token, true);
    return { success: true, customer: data.customer };
  };

  const register = async (name, phone, password) => {
    const res = await fetch('/api/customer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'فشل إنشاء الحساب');
    }
    setSession(data.customer.name, data.customer.phone, data.token, true);
    return { success: true, customer: data.customer };
  };

  const setPassword = async (phone, password, oldPassword = '', name = '') => {
    const res = await fetch('/api/customer/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        phone: (phone || customerPhone.value).trim(), 
        name: (name || customerName.value).trim(),
        password, 
        oldPassword 
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'فشل تعيين كلمة المرور');
    }
    setSession(data.customer.name, data.customer.phone, data.token, true);
    showSetPasswordModal.value = false;
    return { success: true, customer: data.customer };
  };

  const checkProfileStatus = async () => {
    if (!customerPhone.value) return;
    await ensureToken();
    try {
      const res = await fetch(`/api/customer/profile?phone=${encodeURIComponent(customerPhone.value)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          if (data.name) {
            customerName.value = data.name;
            localStorage.setItem('customer_name', data.name);
          }
          hasPassword.value = !!data.hasPassword;
          localStorage.setItem('customer_has_password', hasPassword.value ? 'true' : 'false');

          // If user has NO password set in database, prompt password setup
          if (!data.hasPassword && customerPhone.value) {
            showSetPasswordModal.value = true;
          } else {
            showSetPasswordModal.value = false;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to check customer profile status', e);
    }
  };

  // Pre-fetch token in background if phone exists but token is absent
  if (customerPhone.value && !customerToken.value) {
    ensureToken();
  }

  return {
    customerName,
    customerPhone,
    customerToken,
    hasPassword,
    showSetPasswordModal,
    showLoginModal,
    isIdentified,
    isLoggedIn,
    getAuthHeaders,
    ensureToken,
    setSession,
    setIdentity,
    clearIdentity,
    login,
    register,
    setPassword,
    checkProfileStatus
  };
});
