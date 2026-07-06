import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useToastStore = defineStore('toast', () => {
  const visible = ref(false);
  const message = ref('');
  const type = ref('success'); // 'success' | 'error'
  let timer = null;

  const show = (msg, toastType = 'success') => {
    if (timer) clearTimeout(timer);
    message.value = msg;
    type.value = toastType;
    visible.value = true;

    timer = setTimeout(() => {
      visible.value = false;
    }, 2200);
  };

  return {
    visible,
    message,
    type,
    show
  };
});
