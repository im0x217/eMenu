import { createRouter, createWebHashHistory } from 'vue-router';
import { useShopStore } from '../stores/shop';

// Dynamic route-level code splitting for lean mobile bundles
const ShopView = () => import('../views/ShopView.vue');
const FavoritesView = () => import('../views/FavoritesView.vue');
const CartView = () => import('../views/CartView.vue');
const AccountView = () => import('../views/AccountView.vue');
const AdminView = () => import('../views/AdminView.vue');

const routes = [
  {
    path: '/',
    redirect: () => {
      // Parse query params to detect active view or shop from links or PWA launch
      const urlParams = new URLSearchParams(window.location.search);
      if (
        urlParams.get('view') === 'admin' || 
        urlParams.get('mode') === 'admin' || 
        urlParams.has('admin') || 
        window.location.pathname.startsWith('/admin')
      ) {
        return '/admin';
      }
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

// Ensure activeShop is always initialized on all customer routes and handle PWA admin launch
router.beforeEach((to, from, next) => {
  const shopStore = useShopStore();
  const urlParams = new URLSearchParams(window.location.search);

  // If launched via PWA start_url with ?view=admin but router initially targeted a non-admin route
  if ((urlParams.get('view') === 'admin' || urlParams.get('mode') === 'admin' || urlParams.has('admin')) && to.path !== '/admin') {
    next('/admin');
    return;
  }

  if (!shopStore.activeShop && !to.path.startsWith('/admin')) {
    shopStore.setShop('shop1');
  }
  next();
});

// Auto-track page views and update dynamic PWA manifest on route change
router.afterEach((to) => {
  trackPageView(to.fullPath, to.name ? String(to.name) : '');

  // Dynamic PWA Manifest & App Title for iOS Safari, Edge & Chrome App Installation
  try {
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.setAttribute('rel', 'manifest');
      document.head.appendChild(manifestLink);
    }

    let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!appleTitle) {
      appleTitle = document.createElement('meta');
      appleTitle.setAttribute('name', 'apple-mobile-web-app-title');
      document.head.appendChild(appleTitle);
    }

    if (to.name === 'admin' || to.path.includes('/admin')) {
      document.title = 'لوحة إدارة عبمبر الزروق | POS & Dashboard';
      appleTitle.setAttribute('content', 'إدارة الزروق');
      manifestLink.setAttribute('href', '/manifest-admin.json');
    } else {
      document.title = 'منيو حلويات عبمبر الزروق';
      appleTitle.setAttribute('content', 'عبمبر الزروق');
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
