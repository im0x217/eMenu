<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useConfirmStore } from '../stores/confirm';
import { triggerHaptic } from '../utils/haptics';
import { bindSheetGesture } from '../utils/sheetGesture';
import { lockBodyScroll, unlockBodyScroll, trapTabKey, restoreElementFocus } from '../utils/modalA11y';

const confirmStore = useConfirmStore();
const dialogRef = ref(null);
const confirmBtnRef = ref(null);
let triggerElement = null;
let cleanupGesture = null;
let hasScrollLock = false;

const handleConfirm = () => {
  triggerHaptic('medium');
  confirmStore.confirm();
};

const handleCancel = () => {
  triggerHaptic('light');
  confirmStore.cancel();
};

const handleCaptureKeydown = (e) => {
  if (!confirmStore.isOpen) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopImmediatePropagation();
    handleCancel();
    return;
  }
  if (e.key === 'Tab' && dialogRef.value) {
    trapTabKey(e, dialogRef.value);
  }
};

watch(
  () => confirmStore.isOpen,
  (open) => {
    if (open) {
      triggerElement = typeof document !== 'undefined' ? document.activeElement : null;
      if (!hasScrollLock) {
        lockBodyScroll(false);
        hasScrollLock = true;
      }
      nextTick(() => {
        if (dialogRef.value) {
          if (cleanupGesture) cleanupGesture();
          cleanupGesture = bindSheetGesture(dialogRef.value, () => {
            handleCancel();
          });
        }
        if (confirmBtnRef.value) {
          confirmBtnRef.value.focus({ preventScroll: true });
        }
      });
    } else {
      if (cleanupGesture) {
        cleanupGesture();
        cleanupGesture = null;
      }
      if (hasScrollLock) {
        unlockBodyScroll(false);
        hasScrollLock = false;
      }
      const prev = triggerElement;
      triggerElement = null;
      nextTick(() => restoreElementFocus(prev));
    }
  }
);

onMounted(() => {
  window.addEventListener('keydown', handleCaptureKeydown, true);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleCaptureKeydown, true);
  if (cleanupGesture) {
    cleanupGesture();
    cleanupGesture = null;
  }
  if (hasScrollLock) {
    unlockBodyScroll(false);
    hasScrollLock = false;
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm-dialog-fade">
      <div
        v-if="confirmStore.isOpen"
        class="global-confirm-overlay"
        @click.self="handleCancel"
      >
        <div
          ref="dialogRef"
          class="global-confirm-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="global-confirm-title"
          aria-describedby="global-confirm-desc"
          dir="rtl"
        >
          <div class="sheet-grab-pill" aria-hidden="true"></div>

          <div class="confirm-header-row">
            <div class="confirm-icon-badge" :class="'is-' + confirmStore.variant" aria-hidden="true">
              <svg v-if="confirmStore.variant === 'danger'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 id="global-confirm-title" class="confirm-dialog-title">
              {{ confirmStore.title }}
            </h3>
          </div>

          <p id="global-confirm-desc" class="confirm-dialog-message">{{ confirmStore.message }}</p>

          <div class="confirm-dialog-actions">
            <button
              ref="confirmBtnRef"
              type="button"
              class="confirm-action-btn is-confirm"
              :class="'is-' + confirmStore.variant"
              @click="handleConfirm"
            >
              {{ confirmStore.confirmText }}
            </button>
            <button
              type="button"
              class="confirm-action-btn is-cancel"
              @click="handleCancel"
            >
              {{ confirmStore.cancelText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.global-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 100050;
  background: rgba(15, 23, 42, 0.56);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.global-confirm-card {
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  color: #0f172a;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.24), 0 4px 12px rgba(15, 23, 42, 0.08);
  font-family: 'Cairo', sans-serif;
  text-align: right;
  contain: layout paint;
}

.sheet-grab-pill {
  display: none;
}

.confirm-header-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.confirm-icon-badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.confirm-icon-badge.is-danger {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.confirm-icon-badge.is-warning {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fde68a;
}

.confirm-icon-badge.is-primary {
  background: #eff6ff;
  color: #1e3a5f;
  border: 1px solid #bfdbfe;
}

.confirm-dialog-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.35;
}

.confirm-dialog-message {
  margin: 0 0 24px;
  font-size: 0.96rem;
  font-weight: 600;
  color: #334155;
  line-height: 1.6;
  white-space: pre-line;
}

.confirm-dialog-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.confirm-action-btn {
  flex: 1 1 0;
  min-height: 48px;
  padding: 10px 16px;
  border-radius: 12px;
  font-family: 'Cairo', sans-serif;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  border: 1.5px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease, background-color 0.16s ease, border-color 0.16s ease;
}

.confirm-action-btn.is-confirm.is-danger {
  background: #dc2626;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.24);
}

.confirm-action-btn.is-confirm.is-danger:hover {
  background: #b91c1c;
}

.confirm-action-btn.is-confirm.is-warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.24);
}

.confirm-action-btn.is-confirm.is-warning:hover {
  background: linear-gradient(135deg, #fbbf24, #ea580c);
}

.confirm-action-btn.is-confirm.is-primary {
  background: #1e3a5f;
  color: #ffffff;
}

.confirm-action-btn.is-cancel {
  background: #f8fafc;
  color: #1e293b;
  border-color: #cbd5e1;
}

.confirm-action-btn.is-cancel:hover {
  background: #f1f5f9;
}

.confirm-dialog-fade-enter-active,
.confirm-dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-dialog-fade-enter-active .global-confirm-card {
  transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
}

.confirm-dialog-fade-leave-active .global-confirm-card {
  transition: transform 0.18s cubic-bezier(0.4, 0, 1, 1), opacity 0.16s ease;
}

.confirm-dialog-fade-enter-from,
.confirm-dialog-fade-leave-to {
  opacity: 0;
}

.confirm-dialog-fade-enter-from .global-confirm-card,
.confirm-dialog-fade-leave-to .global-confirm-card {
  transform: translate3d(0, 14px, 0) scale(0.97);
}

@media (max-width: 768px) {
  .global-confirm-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .global-confirm-card {
    max-width: 100%;
    border-radius: 20px 20px 0 0;
    padding: 16px 20px calc(24px + env(safe-area-inset-bottom, 0px));
  }

  .sheet-grab-pill {
    display: block;
    width: 40px;
    height: 4px;
    border-radius: 999px;
    background: #cbd5e1;
    margin: 0 auto 16px;
  }

  .confirm-dialog-fade-enter-from .global-confirm-card,
  .confirm-dialog-fade-leave-to .global-confirm-card {
    transform: translate3d(0, 100%, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .confirm-dialog-fade-enter-active,
  .confirm-dialog-fade-leave-active,
  .confirm-dialog-fade-enter-active .global-confirm-card,
  .confirm-dialog-fade-leave-active .global-confirm-card,
  .confirm-action-btn {
    transition: none !important;
    animation: none !important;
  }
}
</style>
