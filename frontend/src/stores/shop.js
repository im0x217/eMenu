import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useShopStore = defineStore('shop', () => {
  const activeShop = ref(null); // 'shop1' or 'shop2'
  const categories = ref([]);
  const products = ref([]);
  const tags = ref([]);
  const isLoading = ref(false);
  const isBulkVerified = ref(localStorage.getItem('bulk_verified') === 'true');

  const setShop = (shopId) => {
    if (shopId !== 'shop1' && shopId !== 'shop2') return;
    
    activeShop.value = shopId;
    
    // Apply styling class to body for theme transitions
    document.body.className = '';
    document.body.classList.add(`shop-theme-${shopId}`);
    
    // Reset data
    categories.value = [];
    products.value = [];
    tags.value = [];
  };

  const fetchMenu = async () => {
    if (!activeShop.value) return;
    isLoading.value = true;
    try {
      const catEndpoint = activeShop.value === 'shop2' ? '/api/shop2/categories' : '/api/categories';
      const catRes = await fetch(catEndpoint);
      if (catRes.ok) {
        categories.value = await catRes.json();
      }

      const prodEndpoint = activeShop.value === 'shop2' ? '/api/shop2/products' : '/api/products';
      const prodRes = await fetch(prodEndpoint);
      if (prodRes.ok) {
        products.value = await prodRes.json();
      }

      const tagEndpoint = activeShop.value === 'shop2' ? '/api/shop2/tags' : '/api/tags';
      const tagRes = await fetch(tagEndpoint);
      if (tagRes.ok) {
        tags.value = await tagRes.json();
      }
    } catch (e) {
      console.error('Failed to fetch menu items', e);
    } finally {
      isLoading.value = false;
    }
  };

  const verifyBulkCode = async (code) => {
    try {
      const res = await fetch('/api/verify-bulk-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          isBulkVerified.value = true;
          localStorage.setItem('bulk_verified', 'true');
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to verify bulk code', e);
    }
    return false;
  };

  const disableBulk = () => {
    isBulkVerified.value = false;
    localStorage.removeItem('bulk_verified');
  };

  return {
    activeShop,
    categories,
    products,
    tags,
    isLoading,
    isBulkVerified,
    setShop,
    fetchMenu,
    verifyBulkCode,
    disableBulk
  };
});
