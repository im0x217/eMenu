/**
 * Google Analytics 4 (GA4) Custom Utility
 * Designed for lightweight, native tracking in Vue 3 single page applications.
 */

// Initialize GA4 Script
export const initGA = () => {
  const gaId = import.meta.env.VITE_GA_ID;
  if (!gaId) {
    console.warn("⚠️ VITE_GA_ID is not defined. Google Analytics will not be initialized.");
    return;
  }

  // Ensure script is only added once
  if (document.getElementById('google-tag-manager-script')) return;

  const script = document.createElement('script');
  script.id = 'google-tag-manager-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  
  window.gtag('js', new Date());
  
  // Disable automatic Page Views config (handled manually via Vue Router)
  window.gtag('config', gaId, { send_page_view: false });
  console.log(`✓ Google Analytics 4 initialized successfully with ID: ${gaId}`);
};

// Track SPA Page View
export const trackPageView = (path, title = '') => {
  const gaId = import.meta.env.VITE_GA_ID;
  if (!gaId || !window.gtag) return;

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || path,
    send_to: gaId
  });
};

// Track Custom Event
export const trackEvent = (eventName, params = {}) => {
  if (!window.gtag) return;
  window.gtag('event', eventName, params);
};
