<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { triggerHaptic } from '../utils/haptics';
import { trapTabKey, restoreElementFocus } from '../utils/modalA11y';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  minDate: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'تاريخ الاستلام…'
  },
  ariaLabel: {
    type: String,
    default: 'اختيار تاريخ الاستلام'
  },
  theme: {
    type: String,
    default: 'shop1'
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const isMobileScreen = ref(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
const rootRef = ref(null);
const triggerBtnRef = ref(null);
const popoverRef = ref(null);

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const ARABIC_WEEKDAYS = ['أح', 'إث', 'ثلا', 'أرب', 'خم', 'جم', 'سب'];
const FULL_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function parseIsoDate(str) {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const todayIso = toIsoDate(new Date());

const viewYear = ref(new Date().getFullYear());
const viewMonth = ref(new Date().getMonth());

function syncViewToValue(val) {
  const parsed = parseIsoDate(val) || parseIsoDate(props.minDate) || new Date();
  viewYear.value = parsed.getFullYear();
  viewMonth.value = parsed.getMonth();
}

watch(() => props.modelValue, (val) => {
  if (val) syncViewToValue(val);
}, { immediate: true });

const formattedLabel = computed(() => {
  const d = parseIsoDate(props.modelValue);
  if (!d) return props.placeholder;
  const dayName = FULL_WEEKDAYS[d.getDay()];
  const monthName = ARABIC_MONTHS[d.getMonth()];
  return `${dayName}، ${d.getDate()} ${monthName} ${d.getFullYear()}`;
});

const monthYearLabel = computed(() => `${ARABIC_MONTHS[viewMonth.value]} ${viewYear.value}`);

const calendarDays = computed(() => {
  const year = viewYear.value;
  const month = viewMonth.value;
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i);
    const iso = toIsoDate(d);
    cells.push({
      day: d.getDate(),
      iso,
      isOtherMonth: true,
      isDisabled: Boolean(props.minDate && iso < props.minDate),
      isSelected: iso === props.modelValue,
      isToday: iso === todayIso
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const iso = toIsoDate(d);
    cells.push({
      day,
      iso,
      isOtherMonth: false,
      isDisabled: Boolean(props.minDate && iso < props.minDate),
      isSelected: iso === props.modelValue,
      isToday: iso === todayIso
    });
  }

  const remaining = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= remaining; day++) {
    const d = new Date(year, month + 1, day);
    const iso = toIsoDate(d);
    cells.push({
      day,
      iso,
      isOtherMonth: true,
      isDisabled: Boolean(props.minDate && iso < props.minDate),
      isSelected: iso === props.modelValue,
      isToday: iso === todayIso
    });
  }

  return cells;
});

const toggleOpen = () => {
  triggerHaptic('light');
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    syncViewToValue(props.modelValue);
    nextTick(() => {
      const selectedBtn = popoverRef.value?.querySelector('.dp-day-cell.is-selected, .dp-day-cell:not(:disabled)');
      if (selectedBtn && isMobileScreen.value) {
        selectedBtn.focus({ preventScroll: true });
      }
    });
  }
};

const closePopover = (restoreFocus = false) => {
  if (!isOpen.value) return;
  isOpen.value = false;
  if (restoreFocus) {
    nextTick(() => restoreElementFocus(triggerBtnRef.value));
  }
};

const prevMonth = () => {
  triggerHaptic('light');
  if (viewMonth.value === 0) {
    viewMonth.value = 11;
    viewYear.value -= 1;
  } else {
    viewMonth.value -= 1;
  }
};

const nextMonth = () => {
  triggerHaptic('light');
  if (viewMonth.value === 11) {
    viewMonth.value = 0;
    viewYear.value += 1;
  } else {
    viewMonth.value += 1;
  }
};

const selectDate = (cell) => {
  if (cell.isDisabled) return;
  triggerHaptic('light');
  emit('update:modelValue', cell.iso);
  emit('change', cell.iso);
  closePopover(true);
};

const handleResize = () => {
  isMobileScreen.value = window.innerWidth <= 768;
};

const handleDocumentClick = (e) => {
  if (!isOpen.value || isMobileScreen.value) return;
  if (rootRef.value && !rootRef.value.contains(e.target)) {
    closePopover(false);
  }
};

const handleKeydown = (e) => {
  if (!isOpen.value) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    closePopover(true);
    return;
  }
  if (e.key === 'Tab' && isMobileScreen.value && popoverRef.value) {
    trapTabKey(e, popoverRef.value);
  }
};

onMounted(() => {
  window.addEventListener('resize', handleResize, { passive: true });
  document.addEventListener('mousedown', handleDocumentClick);
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('mousedown', handleDocumentClick);
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div ref="rootRef" class="rtl-datepicker-anchor" :class="'shop-theme-' + theme">
    <!-- Cohesive Centered Datepicker Trigger (Design System §5) -->
    <button
      ref="triggerBtnRef"
      type="button"
      class="btn-datepicker-trigger"
      :class="{ active: isOpen }"
      :aria-label="ariaLabel"
      :aria-expanded="isOpen ? 'true' : 'false'"
      aria-haspopup="dialog"
      @click="toggleOpen"
    >
      <span class="dp-trigger-main">
        <span class="dp-icon-wrap" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </span>
        <span class="dp-text-label">{{ formattedLabel }}</span>
      </span>
      <svg
        class="dp-chevron-icon"
        :class="{ 'is-open': isOpen }"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>

    <!-- Mobile Teleport & Desktop Inline Popover (Design System §5) -->
    <Teleport to="body" :disabled="!isMobileScreen">
      <div
        v-if="isOpen"
        class="datepicker-modal-wrapper"
        :class="['shop-theme-' + theme, { 'is-mobile': isMobileScreen }]"
        @click="isMobileScreen ? closePopover(true) : null"
      >
        <div
          ref="popoverRef"
          class="datepicker-popover glass-panel"
          role="dialog"
          :aria-modal="isMobileScreen ? 'true' : 'false'"
          :aria-label="ariaLabel"
          dir="rtl"
          @click.stop
        >
          <div class="datepicker-header">
            <button
              type="button"
              class="dp-nav-btn"
              title="الشهر السابق"
              aria-label="الشهر السابق"
              @click="prevMonth"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>

            <span class="dp-month-title">{{ monthYearLabel }}</span>

            <button
              type="button"
              class="dp-nav-btn"
              title="الشهر التالي"
              aria-label="الشهر التالي"
              @click="nextMonth"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          </div>

          <div class="dp-weekdays" aria-hidden="true">
            <span v-for="wd in ARABIC_WEEKDAYS" :key="wd">{{ wd }}</span>
          </div>

          <div class="dp-days-grid">
            <button
              v-for="(cell, idx) in calendarDays"
              :key="idx"
              type="button"
              class="dp-day-cell text-mono"
              :class="{
                'is-other-month': cell.isOtherMonth,
                'is-selected': cell.isSelected,
                'is-today': cell.isToday,
                'is-disabled': cell.isDisabled
              }"
              :disabled="cell.isDisabled"
              :aria-label="cell.iso"
              :aria-pressed="cell.isSelected ? 'true' : 'false'"
              @click="selectDate(cell)"
            >
              {{ cell.day }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.rtl-datepicker-anchor {
  position: relative;
  width: 100%;
}

.btn-datepicker-trigger {
  width: 100%;
  min-height: 48px;
  padding: 10px 16px;
  background: var(--bg-card, #fffdf9);
  border: 1.5px solid rgba(44, 37, 32, 0.14);
  border-radius: 12px;
  color: #2c2520;
  font-family: 'Cairo', sans-serif;
  font-size: 0.96rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.btn-datepicker-trigger:hover,
.btn-datepicker-trigger.active {
  border-color: var(--primary-color, #fdb518);
  box-shadow: 0 0 0 3px var(--primary-glow, rgba(253, 181, 24, 0.15));
}

.dp-trigger-main {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.dp-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-text-strong, #92400e);
}

.dp-text-label {
  line-height: 1.4;
}

.dp-chevron-icon {
  color: #685f58;
  flex-shrink: 0;
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.dp-chevron-icon.is-open {
  transform: rotate(180deg);
}

/* Desktop Wrapper Default */
.datepicker-modal-wrapper {
  display: contents;
}

.datepicker-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  left: 0;
  max-width: 340px;
  margin-inline: auto;
  z-index: 1200;
  background: #fffdf9;
  border: 1px solid rgba(44, 37, 32, 0.12);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 20px 40px rgba(44, 37, 32, 0.16), 0 4px 12px rgba(44, 37, 32, 0.06);
  animation: datePickerModalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.datepicker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.dp-month-title {
  flex: 1 1 auto;
  text-align: center;
  font-size: 1rem;
  font-weight: 800;
  color: #2c2520;
  line-height: 1.4;
}

.dp-nav-btn {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid rgba(44, 37, 32, 0.12);
  background: #ffffff;
  color: #2c2520;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.dp-nav-btn:hover {
  background: #f7f3ec;
  border-color: var(--primary-color, #fdb518);
}

.dp-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 8px;
  font-size: 0.8rem;
  font-weight: 800;
  color: #685f58;
}

.dp-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.dp-day-cell {
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: #2c2520;
  font-family: 'Cairo', sans-serif;
  font-size: 0.92rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease, transform 0.08s ease;
}

.dp-day-cell:hover:not(:disabled):not(.is-selected) {
  background: rgba(253, 181, 24, 0.14);
}

.dp-day-cell.is-other-month {
  color: #685f58;
  opacity: 0.72;
}

.dp-day-cell.is-today:not(.is-selected) {
  border-color: var(--primary-text-strong, #92400e);
  color: var(--primary-text-strong, #92400e);
  font-weight: 800;
}

.dp-day-cell.is-selected {
  background: var(--primary-color, #fdb518);
  color: var(--on-primary-color, #0c0603);
  font-weight: 800;
  box-shadow: 0 2px 8px rgba(44, 37, 32, 0.14);
}

.shop-theme-shop2 .dp-day-cell.is-selected {
  background: #1e3a5f;
  color: #ffffff;
}

.dp-day-cell.is-disabled,
.dp-day-cell:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  text-decoration: line-through;
}

/* Mobile Teleport Fullscreen Blurred Overlay (Design System §5) */
.datepicker-modal-wrapper.is-mobile {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.datepicker-modal-wrapper.is-mobile .datepicker-popover {
  position: relative !important;
  top: auto !important;
  right: auto !important;
  left: auto !important;
  margin: auto !important;
  transform: none !important;
  width: 100%;
  max-width: 348px;
  animation: datePickerModalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes datePickerModalPop {
  from {
    opacity: 0;
    transform: translate3d(0, 10px, 0) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .datepicker-popover,
  .datepicker-modal-wrapper.is-mobile .datepicker-popover,
  .dp-chevron-icon,
  .dp-day-cell,
  .btn-datepicker-trigger {
    animation: none !important;
    transition: none !important;
  }
}
</style>
