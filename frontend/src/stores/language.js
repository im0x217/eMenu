import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import ar from '../locales/ar.json';
import en from '../locales/en.json';

const dictionaries = { ar, en };

export const useLanguageStore = defineStore('language', () => {
  const savedLocale = localStorage.getItem('emenu_lang');
  const locale = ref(savedLocale === 'en' ? 'en' : 'ar');

  const isRtl = computed(() => locale.value === 'ar');
  const isEn = computed(() => locale.value === 'en');

  // Apply layout direction and document language
  const syncHtmlAttributes = (lang) => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  };

  syncHtmlAttributes(locale.value);

  const setLocale = (newLocale) => {
    if (newLocale !== 'ar' && newLocale !== 'en') return;
    locale.value = newLocale;
    localStorage.setItem('emenu_lang', newLocale);
    syncHtmlAttributes(newLocale);
  };

  const toggleLocale = () => {
    setLocale(locale.value === 'ar' ? 'en' : 'ar');
  };

  // Translation function with fallback
  const t = (path, fallback = '') => {
    const keys = path.split('.');
    let current = dictionaries[locale.value];
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        current = null;
        break;
      }
    }

    if (current !== null && current !== undefined) return current;

    // Fallback to Arabic dictionary
    let fallbackObj = dictionaries.ar;
    for (const key of keys) {
      if (fallbackObj && typeof fallbackObj === 'object' && key in fallbackObj) {
        fallbackObj = fallbackObj[key];
      } else {
        return fallback || path;
      }
    }
    return fallbackObj || fallback || path;
  };

  // Dynamic MongoDB dynamic content localization helpers
  const getLocalizedName = (item) => {
    if (!item) return '';
    if (locale.value === 'en' && item.name_en) {
      return item.name_en;
    }
    return item.name || '';
  };

  const getLocalizedDesc = (item) => {
    if (!item) return '';
    if (locale.value === 'en' && item.desc_en) {
      return item.desc_en;
    }
    return item.desc || '';
  };

  const getLocalizedCategory = (item) => {
    if (!item) return '';
    if (locale.value === 'en' && item.category_en) {
      return item.category_en;
    }
    return item.category || (typeof item === 'string' ? item : '');
  };

  const getCurrency = () => {
    return locale.value === 'en' ? 'LYD' : 'د.ل';
  };

  return {
    locale,
    isRtl,
    isEn,
    setLocale,
    toggleLocale,
    t,
    getLocalizedName,
    getLocalizedDesc,
    getLocalizedCategory,
    getCurrency
  };
});
