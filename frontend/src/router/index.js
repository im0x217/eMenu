import { createRouter, createWebHashHistory } from 'vue-router';
import ShopView from '../views/ShopView.vue';
import FavoritesView from '../views/FavoritesView.vue';
import CartView from '../views/CartView.vue';
import AccountView from '../views/AccountView.vue';
import AdminView from '../views/AdminView.vue';

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
    component: AdminView
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

import { trackPageView } from '../utils/analytics';

// Auto-track page views and update dynamic PWA manifest on route change
router.afterEach((to) => {
  trackPageView(to.fullPath, to.name ? String(to.name) : '');

  // Dynamic PWA Manifest & App Title for Edge & Chrome App Installation
  try {
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.setAttribute('rel', 'manifest');
      document.head.appendChild(manifestLink);
    }

    if (to.name === 'admin' || to.path.includes('/admin')) {
      document.title = 'لوحة إدارة عبمبر الزروق | POS & Dashboard';
      manifestLink.setAttribute('href', '/manifest-admin.json');
    } else {
      document.title = 'منيو حلويات عبمبر الزروق';
      manifestLink.setAttribute('href', '/manifest.json');
    }
  } catch (e) {
    console.error('PWA manifest switch error:', e);
  }
});

// Auto-reload on chunk loading failure
router.onError((error) => {
  if (
    /loading chunk \d+ failed/i.test(error.message) || 
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Importing a module script failed')
  ) {
    window.location.reload();
  }
});

export default router;
