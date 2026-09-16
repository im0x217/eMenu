import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import './style.css';
import App from './App.vue';
import { initGA } from './utils/analytics';

const app = createApp(App);
const pinia = createPinia();

// Initialize Google Analytics 4
initGA();

app.use(pinia);
app.use(router);

// Global Resilience Error Boundary
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error Boundary]', err, info);
};

app.mount('#app');

// Central PWA Service Worker Registration for all SPA entry points
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] Service Worker registration failed:', err);
    });
  });
}
