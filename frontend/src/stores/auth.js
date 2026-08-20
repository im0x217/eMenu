import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const customerName = ref(localStorage.getItem('customer_name') || '');
  const customerPhone = ref(localStorage.getItem('customer_phone') || '');
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

  const setSession = (name, phone, token = '', passwordFlag = true) => {
    customerName.value = (name || '').trim();
    customerPhone.value = (phone || '').trim();
    customerToken.value = token || '';
    hasPassword.value = !!passwordFlag;

    localStorage.setItem('customer_name', customerName.value);
    localStorage.setItem('customer_phone', customerPhone.value);
    if (token) localStorage.setItem('customer_token', token);
    localStorage.setItem('customer_has_password', hasPassword.value ? 'true' : 'false');
  };

  // Backwards compatibility alias for setIdentity
  const setIdentity = (name, phone) => {
    setSession(name, phone, '', false);
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

  const setPassword = async (phone, password, oldPassword = '') => {
    const res = await fetch('/api/customer/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, oldPassword })
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
    try {
      const res = await fetch(`/api/customer/profile?phone=${encodeURIComponent(customerPhone.value)}`);
      if (res.ok) {
        const data = await res.json();
        customerName.value = data.name || customerName.value;
        hasPassword.value = !!data.hasPassword;
        localStorage.setItem('customer_name', customerName.value);
        localStorage.setItem('customer_has_password', hasPassword.value ? 'true' : 'false');

        // If user is currently identified in localStorage but has NO password set, prompt password setup
        if (!data.hasPassword && customerPhone.value) {
          showSetPasswordModal.value = true;
        }
      }
    } catch (e) {
      console.warn('Failed to check customer profile status', e);
    }
  };

  return {
    customerName,
    customerPhone,
    customerToken,
    hasPassword,
    showSetPasswordModal,
    showLoginModal,
    isIdentified,
    isLoggedIn,
    setSession,
    setIdentity,
    clearIdentity,
    login,
    register,
    setPassword,
    checkProfileStatus
  };
});
