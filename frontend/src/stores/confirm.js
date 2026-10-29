import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useConfirmStore = defineStore('confirm', () => {
  const isOpen = ref(false);
  const title = ref('تأكيد الإجراء');
  const message = ref('');
  const confirmText = ref('تأكيد');
  const cancelText = ref('إلغاء');
  const variant = ref('danger'); // 'danger' | 'warning' | 'primary'

  let pendingResolve = null;

  function ask(options) {
    if (pendingResolve) {
      pendingResolve(false);
      pendingResolve = null;
    }

    if (typeof options === 'string') {
      title.value = 'تأكيد الإجراء';
      message.value = options;
      confirmText.value = 'تأكيد';
      cancelText.value = 'إلغاء';
      variant.value = 'danger';
    } else if (options && typeof options === 'object') {
      title.value = options.title || 'تأكيد الإجراء';
      message.value = options.message || '';
      confirmText.value = options.confirmText || 'تأكيد';
      cancelText.value = options.cancelText || 'إلغاء';
      variant.value = options.variant || 'danger';
    }

    isOpen.value = true;

    return new Promise((resolve) => {
      pendingResolve = resolve;
    });
  }

  function resolveConfirm(accepted) {
    isOpen.value = false;
    if (pendingResolve) {
      const fn = pendingResolve;
      pendingResolve = null;
      fn(Boolean(accepted));
    }
  }

  return {
    isOpen,
    title,
    message,
    confirmText,
    cancelText,
    variant,
    ask,
    confirm: () => resolveConfirm(true),
    cancel: () => resolveConfirm(false)
  };
});
