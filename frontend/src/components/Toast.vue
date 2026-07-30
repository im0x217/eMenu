<script setup>
import { useToastStore } from '../stores/toast';

const toastStore = useToastStore();
</script>

<template>
  <transition name="toast-fade">
    <div v-if="toastStore.visible" class="toast-notification" :class="toastStore.type">
      <div class="toast-content">
        <span class="toast-icon" v-if="toastStore.type === 'success'">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#25d366" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
        <span class="toast-icon" v-else>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e63946" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </span>
        <span class="toast-text">{{ toastStore.message }}</span>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.toast-notification {
  position: fixed;
  top: calc(16px + env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 99999;
  background: rgba(255, 253, 249, 0.96);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(44, 37, 32, 0.08);
  border-radius: 12px;
  padding: 10px 18px;
  box-shadow: var(--shadow-lg);
  width: max-content;
  max-width: 90%;
  pointer-events: none;
}

/* Shop Theme specifics - adjust borders depending on active style */
.toast-notification.success {
  border-left: 4px solid #25d366;
}

.toast-notification.error {
  border-left: 4px solid #e63946;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toast-text {
  font-family: 'Cairo', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: #2c2520;
}

/* Animations */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toast-fade-enter-from {
  transform: translate(-50%, -20px);
  opacity: 0;
}

.toast-fade-leave-to {
  transform: translate(-50%, -20px);
  opacity: 0;
}
</style>
