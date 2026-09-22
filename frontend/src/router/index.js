import { createRouter, createWebHashHistory } from 'vue-router';
import { useShopStore } from '../stores/shop';

// Dynamic route-level code splitting for lean mobile bundles
const ShopView = () => import('../views/ShopView.vue');
const FavoritesView = () => import('../views/FavoritesView.vue');
const CartView = () => import('../views/CartView.vue');
const AccountView = () => import('../views/AccountView.vue');
const AdminView = () => import('../views/AdminView.vue');
const AdminPreviewView = () => import('../views/AdminPreviewView.vue');

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
      if (urlParams.get('view') === 'admin-preview' || urlParams.has('admin-preview')) {
        return '/admin-preview';
      }
      const shopParam = urlParams.get('shop');
      if (shopParam === 'shop2') {
        return '/shop/shop2';
      }
      try {
        const saved = window.sessionStorage?.getItem('emenu_view');
        if (saved === 'admin') return '/admin';
        if (saved === 'shop2') return '/shop/shop2';
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
      const id = to.params.id;
      if (id === 'shop1' || id === 'shop2') {
        shopStore.setShop(id);
        next();
      } else {
        const urlParams = new URLSearchParams(window.location.search);
        let target = urlParams.get('shop');
        if (!target) {
          try {
            target = window.sessionStorage?.getItem('emenu_view');
          } catch (e) {}
        }
        next(target === 'shop2' ? '/shop/shop2' : '/shop/shop1');
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
    path: '/admin-preview',
    name: 'admin-preview',
    component: AdminPreviewView
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
      try {
        const saved = window.sessionStorage?.getItem('emenu_view');
        if (saved === 'admin') return '/admin';
        if (saved === 'shop2') return '/shop/shop2';
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

// Handle initial launch navigation without intercepting subsequent customer route changes
let isInitialNavigation = true;

router.beforeEach((to, from, next) => {
  const shopStore = useShopStore();
  const urlParams = new URLSearchParams(window.location.search);

  // Handle cold-start landing from PWA start_url or external links
  if (isInitialNavigation) {
    isInitialNavigation = false;

    // Admin PWA launch (?view=admin or /admin pathname)
    const isAdminIntent = urlParams.get('view') === 'admin' || 
                          urlParams.get('mode') === 'admin' || 
                          urlParams.has('admin') || 
                          window.location.pathname.startsWith('/admin');
    if (isAdminIntent && to.path !== '/admin') {
      return next('/admin');
    }

    // Preview sandbox launch (?view=preview or ?preview)
    const isPreviewIntent = urlParams.get('view') === 'preview' || urlParams.has('preview');
    if (isPreviewIntent && to.path !== '/preview') {
      return next('/preview');
    }

    // Shop 2 PWA launch (?shop=shop2) - if hash resolved to shop1 on cold start, redirect to shop2
    const isShop2Intent = urlParams.get('shop') === 'shop2';
    if (isShop2Intent && to.path === '/shop/shop1') {
      return next('/shop/shop2');
    }
  }

  // Ensure activeShop is initialized if null on customer routes
  if (!shopStore.activeShop && !to.path.startsWith('/admin')) {
    let fallback = 'shop1';
    try {
      const saved = window.sessionStorage?.getItem('emenu_view');
      if (saved === 'shop2') fallback = 'shop2';
    } catch (e) {}
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
    const isShop2 = !isAdmin && (to.path.includes('shop2') || shopStore.activeShop === 'shop2');

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
