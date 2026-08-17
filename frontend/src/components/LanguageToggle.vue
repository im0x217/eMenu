<script setup>
import { useLanguageStore } from '../stores/language';

const langStore = useLanguageStore();
</script>

<template>
  <button 
    type="button" 
    class="lang-toggle-btn" 
    @click="langStore.toggleLocale()" 
    :title="langStore.isEn ? 'التحويل إلى العربية' : 'Switch to English'"
    :aria-label="langStore.isEn ? 'التحويل إلى العربية' : 'Switch to English'"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="globe-icon">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
      <path d="M2 12h20"/>
    </svg>
    <span class="lang-text">{{ langStore.isEn ? 'عربي' : 'EN' }}</span>
  </button>
</template>

<style scoped>
.lang-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(44, 37, 32, 0.1);
  color: var(--text-dark, #2c2520);
  font-family: 'Cairo', system-ui, -apple-system, sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  touch-action: manipulation;
}

.lang-toggle-btn:hover {
  transform: translateY(-1px);
  background: #ffffff;
  border-color: var(--primary-color, #fdb518);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.lang-toggle-btn:active {
  transform: scale(0.96);
}

.globe-icon {
  color: var(--primary-color, #fdb518);
}

.lang-text {
  letter-spacing: 0.5px;
}
</style>
