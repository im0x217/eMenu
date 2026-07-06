import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useAuthStore } from './auth';

export const useFavoritesStore = defineStore('favorites', () => {
  const authStore = useAuthStore();
  
  // Per-shop local storage lists of favorited product IDs
  const shop1Favorites = ref(JSON.parse(localStorage.getItem('favorites_shop1') || '[]'));
  const shop2Favorites = ref(JSON.parse(localStorage.getItem('favorites_shop2') || '[]'));

  // Watch for local changes and persist to localStorage
  watch(shop1Favorites, (newVal) => {
    localStorage.setItem('favorites_shop1', JSON.stringify(newVal));
    syncFavoritesWithBackend('shop1');
  }, { deep: true });

  watch(shop2Favorites, (newVal) => {
    localStorage.setItem('favorites_shop2', JSON.stringify(newVal));
    syncFavoritesWithBackend('shop2');
  }, { deep: true });

  const getFavoritesList = (shopId) => {
    return shopId === 'shop1' ? shop1Favorites.value : shop2Favorites.value;
  };

  const isFavorite = (shopId, productId) => {
    const list = getFavoritesList(shopId);
    return list.includes(productId);
  };

  const toggleFavorite = (shopId, productId) => {
    const list = shopId === 'shop1' ? shop1Favorites : shop2Favorites;
    const index = list.value.indexOf(productId);
    if (index === -1) {
      list.value.push(productId);
    } else {
      list.value.splice(index, 1);
    }
  };

  const syncFavoritesWithBackend = async (shopId) => {
    if (!authStore.customerPhone) return;
    const list = getFavoritesList(shopId);
    try {
      await fetch('/api/customer/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: authStore.customerPhone,
          shop: shopId,
          favorites: list
        })
      });
    } catch (e) {
      console.warn('Silent sync of favorites failed', e);
    }
  };

  const loadFavoritesFromBackend = async () => {
    if (!authStore.customerPhone) return;
    try {
      const res = await fetch(`/api/customer/favorites?phone=${encodeURIComponent(authStore.customerPhone)}`);
      if (res.ok) {
        const data = await res.json();
        // Merging favorites back to local storage
        if (data.shop1) {
          shop1Favorites.value = Array.from(new Set([...shop1Favorites.value, ...data.shop1]));
        }
        if (data.shop2) {
          shop2Favorites.value = Array.from(new Set([...shop2Favorites.value, ...data.shop2]));
        }
      }
    } catch (e) {
      console.warn('Failed to load favorites from backend', e);
    }
  };

  return {
    shop1Favorites,
    shop2Favorites,
    isFavorite,
    toggleFavorite,
    getFavoritesList,
    loadFavoritesFromBackend
  };
});
