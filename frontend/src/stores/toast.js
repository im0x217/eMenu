import { defineStore } from 'pinia';
import { ref } from 'vue';
import { triggerHaptic } from '../utils/haptics';

export const useToastStore = defineStore('toast', () => {
  const visible = ref(false);
  const message = ref('');
  const type = ref('success'); // 'success' | 'error' | 'warning' | 'info'
  const duration = ref(2800);
  const toastId = ref(0);
  const isPaused = ref(false);

  let timer = null;
  let remainingTime = 2800;
  let timerStartTime = 0;

  const normalizeType = (t) => {
    if (t === 'danger') return 'error';
    if (['success', 'error', 'warning', 'info'].includes(t)) return t;
    return 'info';
  };

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const dismiss = () => {
    clearTimer();
    visible.value = false;
    isPaused.value = false;
  };

  const pause = () => {
    if (!visible.value || isPaused.value || !timer) return;
    clearTimer();
    const elapsed = Date.now() - timerStartTime;
    remainingTime = Math.max(800, remainingTime - elapsed);
    isPaused.value = true;
  };

  const resume = () => {
    if (!visible.value || !isPaused.value) return;
    isPaused.value = false;
    timerStartTime = Date.now();
    timer = setTimeout(() => {
      dismiss();
    }, remainingTime);
  };

  const show = (msg, toastType = 'success', customDuration = null) => {
    if (!msg) return;

    clearTimer();
    const normalizedType = normalizeType(toastType);

    // Calculate adaptive reading duration (Arabic reading speed ~15-18 chars/sec)
    let calculatedDuration = typeof customDuration === 'number' && customDuration > 0
      ? customDuration
      : Math.min(6000, Math.max(2800, String(msg).length * 60));

    message.value = msg;
    type.value = normalizedType;
    duration.value = calculatedDuration;
    remainingTime = calculatedDuration;
    toastId.value++;
    isPaused.value = false;
    visible.value = true;
    timerStartTime = Date.now();

    // Haptic feedback matching toast emotion
    if (normalizedType === 'success') {
      triggerHaptic('success');
    } else if (normalizedType === 'error' || normalizedType === 'warning') {
      triggerHaptic('warning');
    } else {
      triggerHaptic('light');
    }

    timer = setTimeout(() => {
      dismiss();
    }, calculatedDuration);
  };

  return {
    visible,
    message,
    type,
    duration,
    toastId,
    isPaused,
    show,
    dismiss,
    pause,
    resume
  };
});
