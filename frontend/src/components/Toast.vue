<script setup>
import { ref } from 'vue';
import { useToastStore } from '../stores/toast';

const toastStore = useToastStore();

// Swipe-up to dismiss touch handling
let touchStartY = 0;
let isSwiping = false;
const toastCardRef = ref(null);

const onTouchStart = (e) => {
  toastStore.pause();
  if (e.touches && e.touches[0]) {
    touchStartY = e.touches[0].clientY;
    isSwiping = true;
  }
};

const onTouchMove = (e) => {
  if (!isSwiping || !e.touches || !e.touches[0] || !toastCardRef.value) return;
  const deltaY = e.touches[0].clientY - touchStartY;
  if (deltaY < 0) {
    // Direct upward manipulation with resistance
    toastCardRef.value.style.transform = `translate(-50%, ${deltaY}px)`;
    toastCardRef.value.style.opacity = `${Math.max(0.2, 1 + deltaY / 80)}`;
  }
};

const onTouchEnd = (e) => {
  toastStore.resume();
  if (!isSwiping) return;
  isSwiping = false;
  if (e.changedTouches && e.changedTouches[0]) {
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    if (deltaY < -24) {
      toastStore.dismiss();
      return;
    }
  }
  if (toastCardRef.value) {
    toastCardRef.value.style.transform = '';
    toastCardRef.value.style.opacity = '';
  }
};
</script>

<template>
  <div class="toast-portal-wrapper" aria-live="polite" aria-atomic="true">
    <transition name="toast-spring">
      <div
        v-if="toastStore.visible"
        :key="toastStore.toastId"
        ref="toastCardRef"
        class="toast-notification glass-panel"
        :class="toastStore.type"
        role="status"
        @mouseenter="toastStore.pause"
        @mouseleave="toastStore.resume"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
        @touchcancel.passive="onTouchEnd"
      >
        <div class="toast-content">
          <!-- Type-Specific Semantic Icon Badge -->
          <div class="toast-icon-badge" aria-hidden="true">
            <!-- Success Checkmark -->
            <svg v-if="toastStore.type === 'success'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>

            <!-- Error / Danger Cross -->
            <svg v-else-if="toastStore.type === 'error'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>

            <!-- Warning Triangle -->
            <svg v-else-if="toastStore.type === 'warning'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>

            <!-- Info Circle -->
            <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>

          <!-- Message Text -->
          <span class="toast-text">{{ toastStore.message }}</span>

          <!-- Direct Dismiss Button -->
          <button
            type="button"
            class="toast-close-btn"
            @click.stop="toastStore.dismiss"
            aria-label="إغلاق التنبيه"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Subtle Duration Progress Bar -->
        <div class="toast-progress-track" aria-hidden="true">
          <div
            class="toast-progress-bar"
            :style="{
              animationDuration: `${toastStore.duration}ms`,
              animationPlayState: toastStore.isPaused ? 'paused' : 'running'
            }"
          ></div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.toast-portal-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 99999;
  pointer-events: none;
  display: flex;
  justify-content: center;
}

.toast-notification {
  position: fixed;
  top: calc(14px + env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translate(-50%, 0);
  pointer-events: auto;
  user-select: none;
  -webkit-user-select: none;
  touch-action: pan-y;
  cursor: default;

  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  overflow: hidden;

  min-width: 240px;
  max-width: min(92vw, 440px);
  padding: 8px 10px 8px 12px;
  border-radius: 9999px;

  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(24px) saturate(190%);
  -webkit-backdrop-filter: blur(24px) saturate(190%);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow:
    0 10px 30px -5px rgba(15, 23, 42, 0.16),
    0 4px 12px -2px rgba(15, 23, 42, 0.08),
    0 0 0 1px rgba(255, 255, 255, 0.8) inset;

  will-change: transform, opacity;
  transition: box-shadow 0.2s ease;
}

.toast-notification:hover {
  box-shadow:
    0 14px 34px -4px rgba(15, 23, 42, 0.2),
    0 6px 16px -2px rgba(15, 23, 42, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.9) inset;
}

.toast-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  direction: rtl;
  width: 100%;
}

/* --- Type-Specific Visual Badges & Accents --- */
.toast-icon-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-notification.success {
  border-color: rgba(16, 185, 129, 0.3);
}
.toast-notification.success .toast-icon-badge {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.25);
}
.toast-notification.success .toast-progress-bar {
  background: linear-gradient(90deg, #10b981, #059669);
}

.toast-notification.error {
  border-color: rgba(239, 68, 68, 0.3);
}
.toast-notification.error .toast-icon-badge {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.25);
}
.toast-notification.error .toast-progress-bar {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.toast-notification.warning {
  border-color: rgba(245, 158, 11, 0.35);
}
.toast-notification.warning .toast-icon-badge {
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.toast-notification.warning .toast-progress-bar {
  background: linear-gradient(90deg, #fbbf24, #d97706);
}

.toast-notification.info {
  border-color: rgba(14, 165, 233, 0.3);
}
.toast-notification.info .toast-icon-badge {
  background: rgba(14, 165, 233, 0.14);
  color: #0284c7;
  border: 1px solid rgba(14, 165, 233, 0.25);
}
.toast-notification.info .toast-progress-bar {
  background: linear-gradient(90deg, #38bdf8, #0284c7);
}

/* --- Typography --- */
.toast-text {
  flex: 1;
  min-width: 0;
  font-family: 'Cairo', sans-serif;
  font-size: 0.84rem;
  font-weight: 750;
  line-height: 1.45;
  color: #0f172a;
  text-align: right;
  word-break: break-word;
}

/* --- Close Button --- */
.toast-close-btn {
  position: relative;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(148, 163, 184, 0.12);
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.12s ease;
  margin-left: 2px;
}

/* Expanded Touch Bounding Box (WCAG 2.5.5 / RICO Ergonomics) */
.toast-close-btn::before {
  content: '';
  position: absolute;
  top: -10px;
  bottom: -10px;
  left: -10px;
  right: -10px;
}

.toast-close-btn:hover {
  background: rgba(148, 163, 184, 0.25);
  color: #0f172a;
  transform: scale(1.08);
}

.toast-close-btn:active {
  transform: scale(0.94);
}

.toast-close-btn:focus-visible {
  outline: 2px solid var(--primary-color, #d97706);
  outline-offset: 1px;
}

/* --- Duration Progress Bar --- */
.toast-progress-track {
  position: absolute;
  bottom: 0;
  left: 18px;
  right: 18px;
  height: 2.5px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.toast-progress-bar {
  height: 100%;
  width: 100%;
  border-radius: 2px;
  animation: toastProgress linear forwards;
}

@keyframes toastProgress {
  from {
    transform: scaleX(1);
    transform-origin: right;
  }
  to {
    transform: scaleX(0);
    transform-origin: right;
  }
}

/* --- Fluid Spring Transitions (Apple Design) --- */
.toast-spring-enter-active {
  transition:
    transform 0.38s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-spring-leave-active {
  transition:
    transform 0.24s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-spring-enter-from {
  transform: translate(-50%, -24px) scale(0.92);
  opacity: 0;
}

.toast-spring-leave-to {
  transform: translate(-50%, -18px) scale(0.94);
  opacity: 0;
}

/* --- Dark Theme Support --- */
:global(.dark-mode) .toast-notification,
:global(.shop-theme-shop2) .toast-notification {
  background: rgba(30, 41, 59, 0.92);
  border-color: rgba(71, 85, 105, 0.6);
  box-shadow:
    0 12px 32px -4px rgba(0, 0, 0, 0.35),
    0 4px 12px -2px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.08) inset;
}

:global(.dark-mode) .toast-text,
:global(.shop-theme-shop2) .toast-text {
  color: #f8fafc;
}

:global(.dark-mode) .toast-close-btn,
:global(.shop-theme-shop2) .toast-close-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #94a3b8;
}

:global(.dark-mode) .toast-close-btn:hover,
:global(.shop-theme-shop2) .toast-close-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

/* --- Accessible Reduced Motion --- */
@media (prefers-reduced-motion: reduce) {
  .toast-spring-enter-active,
  .toast-spring-leave-active {
    transition: opacity 0.15s ease !important;
  }
  .toast-spring-enter-from,
  .toast-spring-leave-to {
    transform: translate(-50%, 0) !important;
    opacity: 0 !important;
  }
  .toast-progress-bar {
    display: none !important;
  }
}
</style>
