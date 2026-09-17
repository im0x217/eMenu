import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useShopStore = defineStore('shop', () => {
  // Read initial shop from sessionStorage or URL
  const getInitialShop = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('shop') === 'shop2') return 'shop2';
      const hash = window.location.hash || '';
      if (hash.indexOf('shop2') !== -1) return 'shop2';
      const saved = window.sessionStorage?.getItem('emenu_view');
      if (saved === 'shop2') return 'shop2';
      if (saved === 'shop1') return 'shop1';
    } catch (e) {}
    return null;
  };

  const activeShop = ref(getInitialShop()); // 'shop1' or 'shop2'
  const categories = ref([]);
  const products = ref([]);
  const tags = ref([]);
  const isLoading = ref(false);
  const isBulkVerified = ref(localStorage.getItem('bulk_verified') === 'true');

  const setShop = (shopId) => {
    if (shopId !== 'shop1' && shopId !== 'shop2') return;
    
    activeShop.value = shopId;
    
    try {
      if (window.sessionStorage) {
        window.sessionStorage.setItem('emenu_view', shopId);
      }
    } catch (e) {}
    
    // Apply styling class to body for theme transitions
    document.body.className = '';
    document.body.classList.add(`shop-theme-${shopId}`);
    
    // Reset data
    categories.value = [];
    products.value = [];
    tags.value = [];
  };

  const fetchMenu = async () => {
    if (!activeShop.value) {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash || '';
      const saved = window.sessionStorage?.getItem('emenu_view');
      const shopFromUrl = urlParams.get('shop') || (hash.indexOf('shop2') !== -1 ? 'shop2' : (saved === 'shop2' ? 'shop2' : 'shop1'));
      setShop(shopFromUrl);
    }
    const targetShop = activeShop.value || 'shop1';
    isLoading.value = true;
    try {
      const catEndpoint = targetShop === 'shop2' ? '/api/shop2/categories' : '/api/categories';
      const prodEndpoint = targetShop === 'shop2' ? '/api/shop2/products' : '/api/products';
      const tagEndpoint = targetShop === 'shop2' ? '/api/shop2/tags' : '/api/tags';

      const [catRes, prodRes, tagRes] = await Promise.all([
        fetch(catEndpoint),
        fetch(prodEndpoint),
        fetch(tagEndpoint)
      ]);

      if (catRes.ok) categories.value = await catRes.json();
      if (prodRes.ok) products.value = await prodRes.json();
      if (tagRes.ok) tags.value = await tagRes.json();
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
