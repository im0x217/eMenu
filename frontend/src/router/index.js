import { createRouter, createWebHashHistory } from 'vue-router';
import ShopView from '../views/ShopView.vue';
import FavoritesView from '../views/FavoritesView.vue';
import CartView from '../views/CartView.vue';
import AccountView from '../views/AccountView.vue';

import { useShopStore } from '../stores/shop';

const routes = [
  {
    path: '/',
    redirect: () => {
      // Parse query params to detect active shop from index.html links
      const urlParams = new URLSearchParams(window.location.search);
      const shopParam = urlParams.get('shop');
      if (shopParam === 'shop2') {
        return '/shop/shop2';
      }
      return '/shop/shop1'; // Default
    }
  },
  {
    path: '/shop/:id',
    name: 'shop',
    component: ShopView,
    beforeEnter: (to, from, next) => {
      const shopStore = useShopStore();
      const id = to.params.id;
      if (id === 'shop1' || id === 'shop2') {
        shopStore.setShop(id);
        next();
      } else {
        next('/shop/shop1');
      }
    }
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: FavoritesView
  },
  {
    path: '/cart',
    name: 'cart',
    component: CartView
  },
  {
    path: '/account',
    name: 'account',
    component: AccountView
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminView.vue')
  },
  {
    path: '/:catchAll(.*)',
    redirect: '/shop/shop1'
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
