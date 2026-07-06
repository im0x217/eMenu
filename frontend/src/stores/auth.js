import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const customerName = ref(localStorage.getItem('customer_name') || '');
  const customerPhone = ref(localStorage.getItem('customer_phone') || '');

  const setIdentity = (name, phone) => {
    customerName.value = name.trim();
    customerPhone.value = phone.trim();
    localStorage.setItem('customer_name', customerName.value);
    localStorage.setItem('customer_phone', customerPhone.value);
    
    // Call API to sync guest profile silently on backend
    syncProfileToServer();
  };

  const clearIdentity = () => {
    customerName.value = '';
    customerPhone.value = '';
    localStorage.removeItem('customer_name');
    localStorage.removeItem('customer_phone');
  };

  const syncProfileToServer = async () => {
    if (!customerPhone.value) return;
    try {
      await fetch('/api/customer/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerName.value,
          phone: customerPhone.value
        })
      });
    } catch (e) {
      console.warn('Failed to sync guest profile with backend', e);
    }
  };

  const isIdentified = () => {
    return customerName.value.length > 0 && customerPhone.value.length > 0;
  };

  return {
    customerName,
    customerPhone,
    setIdentity,
    clearIdentity,
    isIdentified,
    syncProfileToServer
  };
});
