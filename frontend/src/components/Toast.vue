<script setup>
import { useToastStore } from '../stores/toast';

const toastStore = useToastStore();
</script>

<template>
  <transition name="toast-fade">
    <div v-if="toastStore.visible" class="toast-notification" :class="toastStore.type">
      <div class="toast-content">
        <span class="toast-icon" v-if="toastStore.type === 'success'">✅</span>
        <span class="toast-icon" v-else>⚠️</span>
        <span class="toast-text">{{ toastStore.message }}</span>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.toast-notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 99999;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 10px 18px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08), 0 3px 6px rgba(0, 0, 0, 0.04);
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
