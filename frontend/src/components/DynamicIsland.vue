<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { useToastStore } from '../stores/toast';
import { triggerHaptic } from '../utils/haptics';

const router = useRouter();
const cartStore = useCartStore();
const toastStore = useToastStore();

const isExpanded = ref(false);

const totalItems = computed(() => {
  return cartStore.items.reduce((total, item) => total + item.quantity, 0);
});

const totalPrice = computed(() => cartStore.cartTotal);
const isEditing = computed(() => cartStore.isEditingOrder);
const isToastActive = computed(() => toastStore.visible);

// Island is active if there is a toast, items in cart, or order is being edited
const isIslandActive = computed(() => {
  return isToastActive.value || totalItems.value > 0 || isEditing.value;
});

const toggleExpand = () => {
  triggerHaptic('light');
  if (isExpanded.value) {
    isExpanded.value = false;
  } else {
    // Only expand if there are items or editing
    if (totalItems.value > 0 || isEditing.value) {
      isExpanded.value = true;
    }
  }
};

const closeExpand = () => {
  triggerHaptic('light');
  isExpanded.value = false;
};

const goToCart = () => {
  triggerHaptic('medium');
  isExpanded.value = false;
  router.push('/cart');
};
</script>

<template>
  <!-- Dynamic Island Outer Wrapper -->
  <aside 
    v-if="isIslandActive" 
    class="dynamic-island-wrapper" 
    aria-label="الجزيرة التفاعلية - حالة الطلب والتنبيهات"
  >
    <!-- Tap-outside Backdrop for Expanded HUD -->
    <div 
      v-if="isExpanded" 
      class="island-backdrop" 
      @click="closeExpand"
      aria-hidden="true"
    ></div>

    <!-- Island Capsule Container -->
    <div 
      class="dynamic-island-capsule" 
      :class="{
        'is-expanded': isExpanded,
        'is-alert': isToastActive && !isExpanded,
        'is-editing': isEditing && !isToastActive && !isExpanded
      }"
      role="region"
      aria-live="polite"
      @click="!isExpanded && toggleExpand()"
    >
      <!-- STATE 1: ALERT / TOAST MORPH -->
      <div v-if="isToastActive && !isExpanded" class="island-alert-view">
        <div class="island-icon-box" :class="toastStore.type">
          <svg v-if="toastStore.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <span class="island-alert-text">{{ toastStore.message }}</span>
      </div>

      <!-- STATE 2: COMPACT LIVE ACTIVITY (CART / EDITING) -->
      <div v-else-if="!isExpanded" class="island-compact-view">
        <!-- Right Wing: Cart Icon & Item Count Badge -->
        <div class="island-wing-right">
          <div class="island-cart-badge">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="8" cy="21" r="1"/>
              <circle cx="19" cy="21" r="1"/>
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
            </svg>
            <span class="island-badge-count">{{ totalItems }}</span>
          </div>
        </div>

        <!-- Center Indicator (Breathing Pulse or Status) -->
        <div class="island-center-indicator">
          <span v-if="isEditing" class="pulse-dot-amber" aria-hidden="true"></span>
          <span v-else class="pulse-dot-green" aria-hidden="true"></span>
        </div>

        <!-- Left Wing: Price or Editing Order Number -->
        <div class="island-wing-left">
          <span v-if="isEditing" class="island-edit-label">#{{ cartStore.editingOrderNumber }}</span>
          <span v-else class="island-price-label">
            <span class="price-digits">{{ totalPrice }}</span>
            <span class="price-currency">د.ل</span>
          </span>
        </div>
      </div>

      <!-- STATE 3: EXPANDED HUD CONTROL CENTER -->
      <div v-else class="island-expanded-view">
        <!-- Expanded Header -->
        <div class="island-expanded-header">
          <div class="expanded-title-group">
            <div class="expanded-icon-pill">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="8" cy="21" r="1"/>
                <circle cx="19" cy="21" r="1"/>
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
              </svg>
            </div>
            <div>
              <h3 class="expanded-main-title">
                {{ isEditing ? `تعديل الطلب #${cartStore.editingOrderNumber}` : 'سلة المشتريات' }}
              </h3>
              <p class="expanded-sub-title">{{ totalItems }} أصناف مختارة</p>
            </div>
          </div>
          <button 
            type="button" 
            class="island-close-btn" 
            @click.stop="closeExpand" 
            aria-label="إغلاق الجزيرة التفاعلية"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Expanded Price / Items Row -->
        <div class="island-expanded-body">
          <div class="expanded-metric">
            <span class="metric-label">إجمالي القيمة:</span>
            <span class="metric-value">{{ totalPrice }} <span class="metric-curr">د.ل</span></span>
          </div>
          <div class="expanded-metric">
            <span class="metric-label">الحالة:</span>
            <span class="metric-status" :class="{ 'text-amber': isEditing }">
              {{ isEditing ? 'تعديل نشط' : 'جاهز للإرسال' }}
            </span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="island-expanded-actions">
          <button 
            type="button" 
            class="island-action-btn primary" 
            @click.stop="goToCart"
          >
            <span>{{ isEditing ? 'حفظ وتحديث الطلب' : 'الذهاب إلى السلة' }}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="rtl-flip" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.dynamic-island-wrapper {
  position: fixed;
  top: max(env(safe-area-inset-top, 0px), 8px);
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  z-index: 10005;
  pointer-events: none;
}

.island-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 10004;
  pointer-events: auto;
  animation: islandFadeIn 0.25s ease-out;
}

@keyframes islandFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Apple Dynamic Island Capsule */
.dynamic-island-capsule {
  pointer-events: auto;
  background: #000000;
  color: #ffffff;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  overflow: hidden;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  font-family: 'Cairo', sans-serif;
  transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1),
              height 0.35s cubic-bezier(0.16, 1, 0.3, 1),
              border-radius 0.35s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.12s ease-out,
              background-color 0.3s ease;
  transform: translateZ(0);
  will-change: transform, width, height, border-radius;
}

.dynamic-island-capsule:active:not(.is-expanded) {
  transform: scale(0.96);
  transition: transform 80ms ease-out;
}

/* STATE: COMPACT */
.island-compact-view {
  height: 36px;
  min-width: 195px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.island-wing-right {
  display: flex;
  align-items: center;
  color: #fdb518;
}

.island-cart-badge {
  display: flex;
  align-items: center;
  gap: 5px;
}

.island-badge-count {
  font-size: 0.75rem;
  font-weight: 800;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 9999px;
  padding: 1px 6px;
  line-height: 1.2;
}

.island-center-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-dot-green {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
  animation: islandPulse 2s infinite ease-in-out;
}

.pulse-dot-amber {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow: 0 0 8px #f59e0b;
  animation: islandPulse 1.5s infinite ease-in-out;
}

@keyframes islandPulse {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.3); opacity: 1; }
}

.island-wing-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.island-price-label {
  font-size: 0.82rem;
  font-weight: 800;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 3px;
}

.price-currency {
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
}

.island-edit-label {
  font-size: 0.78rem;
  font-weight: 800;
  color: #f59e0b;
}

/* STATE: ALERT / TOAST MORPH */
.dynamic-island-capsule.is-alert {
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 255, 255, 0.1);
}

.island-alert-view {
  height: 38px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 90vw;
  white-space: nowrap;
}

.island-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.island-alert-text {
  font-size: 0.82rem;
  font-weight: 700;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* STATE: EXPANDED HUD */
.dynamic-island-capsule.is-expanded {
  width: min(360px, 92vw);
  border-radius: 28px;
  cursor: default;
  padding: 16px 18px;
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.65), 0 0 1px rgba(255, 255, 255, 0.3);
}

.island-expanded-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.expanded-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.expanded-icon-pill {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(253, 181, 24, 0.15);
  color: #fdb518;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expanded-main-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.25;
}

.expanded-sub-title {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
}

.island-close-btn {
  position: relative;
  background: rgba(255, 255, 255, 0.12);
  border: none;
  color: rgba(255, 255, 255, 0.8);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  touch-action: manipulation;
  transition: background 0.15s ease, transform 0.1s ease;
}

/* 48x48px touch bounding box for WCAG 2.5.5 & RICO ergonomics */
.island-close-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  pointer-events: auto;
}

.island-close-btn:active {
  transform: scale(0.88);
  background: rgba(255, 255, 255, 0.22);
}

.island-expanded-body {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.expanded-metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
}

.metric-value {
  font-size: 0.95rem;
  font-weight: 800;
  color: #ffffff;
}

.metric-curr {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
}

.metric-status {
  font-size: 0.75rem;
  font-weight: 700;
  color: #22c55e;
}

.metric-status.text-amber {
  color: #f59e0b;
}

.island-expanded-actions {
  display: flex;
  gap: 8px;
}

.island-action-btn.primary {
  width: 100%;
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 14px;
  border: none;
  background: #fdb518;
  color: #0c0603;
  font-family: 'Cairo', sans-serif;
  font-weight: 800;
  font-size: 0.88rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.12s ease, background 0.15s ease;
}

.island-action-btn.primary:active {
  transform: scale(0.97);
  background: #e5a214;
}

.rtl-flip {
  transform: scaleX(-1);
}

/* Reduced motion compliance */
@media (prefers-reduced-motion: reduce) {
  .dynamic-island-capsule {
    transition: none !important;
  }
  .pulse-dot-green,
  .pulse-dot-amber {
    animation: none !important;
  }
}
</style>
