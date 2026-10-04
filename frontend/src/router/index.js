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
      if (shopParam === 'shop2') return '/shop/shop2';
      if (shopParam === 'shop1') return '/shop/shop1';
      try {
        const saved = window.sessionStorage?.getItem('emenu_view');
        if (saved === 'admin') return '/admin';
        if (saved === 'shop2') return '/shop/shop2';
        if (saved === 'shop1') return '/shop/shop1';
      } catch (e) {}
      return '/shop/shop1'; // Default
    }
  },
  {
    path: '/shop/:id',
    name: 'shop',
    component: ShopView,
    beforeEnter: (to, from, next) => {
      const shopStore = useShopStore();
      const urlParams = new URLSearchParams(window.location.search);
      const shopParam = urlParams.get('shop');

      // Explicit URL query param (?shop=shop1 or ?shop=shop2) strictly overrides route param if mismatched
      let targetId = to.params.id;
      if (shopParam === 'shop1' || shopParam === 'shop2') {
        if (targetId !== shopParam) {
          shopStore.setShop(shopParam);
          return next(`/shop/${shopParam}`);
        }
      }

      if (targetId === 'shop1' || targetId === 'shop2') {
        shopStore.setShop(targetId);
        next();
      } else {
        let target = shopParam;
        if (!target) {
          try {
            target = window.sessionStorage?.getItem('emenu_view');
          } catch (e) {}
        }
        const resolved = target === 'shop2' ? 'shop2' : 'shop1';
        shopStore.setShop(resolved);
        next(`/shop/${resolved}`);
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
    redirect: () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('view') === 'admin' || urlParams.get('mode') === 'admin' || window.location.pathname.startsWith('/admin')) {
        return '/admin';
      }
      const shopParam = urlParams.get('shop');
      if (shopParam === 'shop2') return '/shop/shop2';
      if (shopParam === 'shop1') return '/shop/shop1';
      try {
        const saved = window.sessionStorage?.getItem('emenu_view');
        if (saved === 'admin') return '/admin';
        if (saved === 'shop2') return '/shop/shop2';
        if (saved === 'shop1') return '/shop/shop1';
      } catch (e) {}
      return '/shop/shop1';
    }
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

import { trackPageView } from '../utils/analytics';

router.beforeEach((to, from, next) => {
  const shopStore = useShopStore();
  const urlParams = new URLSearchParams(window.location.search);
  const shopParam = urlParams.get('shop');

  // Handle query-param-driven routing override (?shop=shop1, ?shop=shop2, ?view=admin)
  const isAdminIntent = urlParams.get('view') === 'admin' || 
                        urlParams.get('mode') === 'admin' || 
                        urlParams.has('admin') || 
                        window.location.pathname.startsWith('/admin');
  if (isAdminIntent && to.path !== '/admin') {
    return next('/admin');
  }

  // If user entered via ?shop=shop1 or ?shop=shop2, enforce match even if hash resolved to another shop
  if (shopParam === 'shop1' && to.path === '/shop/shop2') {
    shopStore.setShop('shop1');
    return next('/shop/shop1');
  }
  if (shopParam === 'shop2' && to.path === '/shop/shop1') {
    shopStore.setShop('shop2');
    return next('/shop/shop2');
  }

  // Sync store activeShop whenever entering or switching shop route
  if (to.name === 'shop' && (to.params.id === 'shop1' || to.params.id === 'shop2')) {
    if (shopStore.activeShop !== to.params.id) {
      shopStore.setShop(to.params.id);
    }
  }

  // Ensure activeShop is initialized if null on customer routes
  if (!shopStore.activeShop && !to.path.startsWith('/admin')) {
    let fallback = 'shop1';
    if (shopParam === 'shop1' || shopParam === 'shop2') {
      fallback = shopParam;
    } else {
      try {
        const saved = window.sessionStorage?.getItem('emenu_view');
        if (saved === 'shop2' || saved === 'shop1') fallback = saved;
      } catch (e) {}
    }
    shopStore.setShop(fallback);
  }

  next();
});

// Auto-track page views and update dynamic PWA manifest, icon & title on route change
router.afterEach((to) => {
  trackPageView(to.fullPath, to.name ? String(to.name) : '');

  // Dynamic PWA Manifest, Apple Touch Icon & App Title for iOS Safari & WebApp Installation
  try {
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.setAttribute('rel', 'manifest');
      document.head.appendChild(manifestLink);
    }

    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.setAttribute('rel', 'apple-touch-icon');
      document.head.appendChild(appleIcon);
    }

    let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!appleTitle) {
      appleTitle = document.createElement('meta');
      appleTitle.setAttribute('name', 'apple-mobile-web-app-title');
      document.head.appendChild(appleTitle);
    }

    let themeColor = document.querySelector('meta[name="theme-color"]');
    if (!themeColor) {
      themeColor = document.createElement('meta');
      themeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(themeColor);
    }

    const shopStore = useShopStore();
    const isAdmin = to.name === 'admin' || to.path.includes('/admin');
    const isShop2 = !isAdmin && (to.path.includes('shop2') || (!to.path.includes('shop1') && shopStore.activeShop === 'shop2'));

    if (isAdmin) {
      document.title = 'لوحة إدارة عبمبر الزروق | POS & Dashboard';
      appleTitle.setAttribute('content', 'إدارة الزروق');
      appleIcon.setAttribute('href', '/apple-touch-icon-admin.png');
      manifestLink.setAttribute('href', '/manifest-admin.json');
      themeColor.setAttribute('content', '#0f172a');
    } else if (isShop2) {
      document.title = 'قسم النواشف - حلويات عبمبر الزروق';
      appleTitle.setAttribute('content', 'قسم النواشف');
      appleIcon.setAttribute('href', '/apple-touch-icon-shop2.png');
      manifestLink.setAttribute('href', '/manifest-shop2.json');
      themeColor.setAttribute('content', '#f7f3ec');
    } else {
      document.title = 'منيو حلويات عبمبر الزروق';
      appleTitle.setAttribute('content', 'عبمبر الزروق');
      appleIcon.setAttribute('href', '/apple-touch-icon-shop1.png');
      manifestLink.setAttribute('href', '/manifest.json');
      themeColor.setAttribute('content', '#f7f3ec');
    }
  } catch (e) {
    console.error('PWA manifest/icon switch error:', e);
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
