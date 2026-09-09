<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import { triggerHaptic } from '../utils/haptics';

const router = useRouter();
const cartStore = useCartStore();
const authStore = useAuthStore();
const toastStore = useToastStore();

// Guest checkout details (Name and Phone)
const nameInput = ref(authStore.customerName);
const phoneInput = ref(authStore.customerPhone);
const showIdentityForm = computed(() => !authStore.isIdentified());

// Minimum delivery date is today
const minDeliveryDate = computed(() => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
});

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const setDeliveryDateShortcut = (type) => {
  triggerHaptic('light');
  if (type === 'today') {
    cartStore.deliveryDate = getTodayDateString();
  } else if (type === 'tomorrow') {
    cartStore.deliveryDate = getTomorrowDateString();
  }
  cartStore.persist();
};

const isTodayActive = computed(() => cartStore.deliveryDate === getTodayDateString());
const isTomorrowActive = computed(() => cartStore.deliveryDate === getTomorrowDateString());

// Checkout processing & Confirmation Modal state
const isSubmitting = ref(false);
const errorMsg = ref('');
const showOrderConfirmModal = ref(false);

const handleSaveIdentity = () => {
  if (!nameInput.value.trim() || !phoneInput.value.trim()) {
    errorMsg.value = 'يرجى كتابة الاسم ورقم الهاتف بشكل صحيح لتتمكن من الطلب.';
    return;
  }
  
  const phone = phoneInput.value.trim();
  if (phone.length < 9) {
    errorMsg.value = 'يرجى إدخال رقم هاتف صحيح.';
    return;
  }
  
  errorMsg.value = '';
  authStore.setSession(nameInput.value.trim(), phone, '', false);
  authStore.showSetPasswordModal = true;
};

// Open the confirmation modal instead of immediate dispatch
const handleCheckout = () => {
  if (!authStore.isIdentified()) {
    handleSaveIdentity();
    if (errorMsg.value) return;
  }

  if (cartStore.items.length === 0) {
    triggerHaptic('warning');
    toastStore.show('السلة فارغة!', 'warning');
    return;
  }

  triggerHaptic('medium');
  showOrderConfirmModal.value = true;
};

// Explicit order submission confirmed by user
const handleConfirmSubmit = async () => {
  isSubmitting.value = true;
  try {
    const result = await cartStore.submitOrder();
    triggerHaptic('success');
    showOrderConfirmModal.value = false;
    if (result && result.isEdit) {
      toastStore.show('تم حفظ وتحديث طلبك بنجاح!', 'success');
    }
  } catch (err) {
    triggerHaptic('warning');
    toastStore.show(err.message || 'عذراً، فشل إرسال الطلب. يرجى المحاولة مرة أخرى.', 'error');
  } finally {
    isSubmitting.value = false;
  }
};

const handleCloseConfirmation = () => {
  if (isSubmitting.value) return;
  triggerHaptic('light');
  showOrderConfirmModal.value = false;
};

const onKeydown = (e) => {
  if (e.key === 'Escape' && showOrderConfirmModal.value && !isSubmitting.value) {
    handleCloseConfirmation();
    return;
  }

  // Focus trap inside confirmation modal
  if (e.key === 'Tab' && showOrderConfirmModal.value) {
    const modalEl = document.querySelector('.confirm-modal-backdrop[role="dialog"]');
    if (modalEl) {
      const focusableEls = modalEl.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (focusableEls.length > 0) {
        const firstEl = focusableEls[0];
        const lastEl = focusableEls[focusableEls.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    }
  }
};

// Lock body scroll and dismiss background navs while confirmation modal is active
watch(showOrderConfirmModal, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
  } else {
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  }
});

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.body.style.overflow = '';
  document.body.classList.remove('modal-open');
  window.removeEventListener('keydown', onKeydown);
});

const storeDisplayName = computed(() => {
  return cartStore.getShopType === 'shop2' ? 'قسم النواشف' : 'المتجر الرئيسي (حلويات)';
});

const priceModeDisplayName = computed(() => {
  return cartStore.getPriceMode === 'bulk' ? 'سعر جملة' : 'سعر عادي';
});

const totalItemsCount = computed(() => {
  return cartStore.items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
});

const handleCancelEditMode = () => {
  if (confirm('هل أنت متأكد من إلغاء وضع تعديل الطلب؟ سيتم تفريغ التغييرات غير المحفوظة.')) {
    cartStore.cancelOrderEditing();
    toastStore.show('تم إلغاء وضع تعديل الطلب', 'info');
    router.push('/account');
  }
};

const getItemPrice = (item) => {
  return item.priceMode === 'bulk' ? (item.price_bulk || item.price) : (item.price_regular || item.price);
};

const handleUpdateNote = (itemId, note) => {
  const item = cartStore.items.find(i => i._id === itemId);
  if (item) {
    item.itemNotes = note;
    cartStore.persist();
  }
};

const handleDirectQtyInput = (itemId, value, allowFloat) => {
  let parsed = parseFloat(value);
  if (isNaN(parsed) || parsed <= 0) {
    parsed = allowFloat ? 0.5 : 1;
  }
  
  if (allowFloat) {
    parsed = Math.round(parsed * 10) / 10;
  } else {
    parsed = Math.round(parsed);
  }
  
  cartStore.updateQty(itemId, parsed);
};

const handleQtyChange = (itemId, newQty) => {
  triggerHaptic('light');
  cartStore.updateQty(itemId, newQty);
};

const isConfirmingClear = ref(false);
let confirmTimer = null;

const handleClearCart = () => {
  if (!isConfirmingClear.value) {
    triggerHaptic('warning');
    isConfirmingClear.value = true;
    if (confirmTimer) clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => {
      isConfirmingClear.value = false;
    }, 3000);
  } else {
    triggerHaptic('warning');
    if (confirmTimer) clearTimeout(confirmTimer);
    isConfirmingClear.value = false;
    cartStore.clearCart();
    toastStore.show('تم إفراغ السلة بالكامل!');
  }
};
</script>

<template>
  <div class="cart-view-container animate-fade-in">
    
    <!-- 1. ORDER EDIT MODE BANNER (WHEN IMPORTED FROM MY ACCOUNT) -->
    <div v-if="cartStore.isEditingOrder" class="order-edit-mode-banner glass-panel animate-fade-in">
      <div class="edit-banner-top">
        <div class="edit-badge-group">
          <span class="edit-pulse-dot"></span>
          <span class="edit-badge-title">وضع تعديل الطلب</span>
          <span class="edit-order-number-tag">#{{ cartStore.editingOrderNumber }}</span>
        </div>
        <button type="button" class="btn-cancel-edit-mode" @click="handleCancelEditMode" title="إلغاء وضع التعديل">
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          <span>إلغاء التعديل</span>
        </button>
      </div>
      <p class="edit-banner-instructions">
        يمكنك تعديل كميات الأصناف الحالية، أو تصفح المتجر وإضافة منتجات جديدة للسلة، ثم الضغط على "حفظ وتحديث الطلب" لتثبيت التغييرات.
      </p>
      <button type="button" class="btn-browse-store-add" @click="router.push(`/shop/${cartStore.editingOrderShop}`)">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
        <span>تصفح المتجر وإضافة أصناف جديدة للطلب</span>
      </button>
    </div>

    <!-- 2. EMPTY STATE -->
    <div v-if="cartStore.items.length === 0" class="empty-state glass-panel">
      <div class="empty-icon-wrapper">
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6;">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
      </div>
      <h2 class="empty-title">{{ cartStore.isEditingOrder ? 'تم حذف جميع الأصناف من الطلب' : 'السلة فارغة حالياً' }}</h2>
      <p class="empty-desc">
        {{ cartStore.isEditingOrder ? 'يرجى إضافة صنف واحد على الأقل من المتجر لإتمام التعديل أو إلغاء وضع التعديل.' : 'اذهب لقسم المنتجات وأضف ما ترغب به لتجده هنا.' }}
      </p>
      <button 
        type="button" 
        class="btn-primary" 
        style="margin-top: 10px; max-width: 260px;"
        @click="router.push(cartStore.isEditingOrder ? `/shop/${cartStore.editingOrderShop}` : '/shop/shop1')"
      >
        تصفح قائمة المنتجات
      </button>
    </div>

    <!-- 3. ACTIVE CART CONTENT -->
    <div v-else class="cart-content-wrapper">
      
      <!-- Cart Items List -->
      <div class="cart-items-section glass-panel">
        <div class="cart-section-header">
          <h3 class="section-title">{{ cartStore.isEditingOrder ? 'أصناف الطلب المعدلة' : 'الأصناف المختارة' }}</h3>
          <button type="button" class="clear-cart-btn" @click="handleClearCart" :class="{ confirming: isConfirmingClear }" title="إفراغ السلة" aria-label="إفراغ السلة">
            <span>{{ isConfirmingClear ? 'تأكيد الإفراغ؟' : 'إفراغ السلة' }}</span>
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
        
        <div class="cart-list">
          <div v-for="item in cartStore.items" :key="item._id" class="cart-item">
            <!-- Details -->
            <div class="item-main">
              <img :src="item.img || '/res/logo.jpg'" :alt="item.name" class="item-img" @error="$event.target.src = '/res/logo.jpg'" />
              <div class="item-details">
                <h4 class="item-title">{{ item.name }}</h4>
                <div class="item-price-info">
                  <span class="price-val">{{ getItemPrice(item) }} د.ل</span>
                  <span v-if="item.priceMode === 'bulk'" class="bulk-label">سعر جملة</span>
                </div>
              </div>
              
              <!-- Quantity adjuster -->
              <div class="qty-adjuster">
                <button type="button" class="qty-btn" @click="handleQtyChange(item._id, item.quantity - (item.allowFloat ? 0.5 : 1))" aria-label="تقليل الكمية">-</button>
                <input 
                  type="number" 
                  class="qty-input-field" 
                  aria-label="الكمية"
                  inputmode="decimal"
                  :value="item.quantity" 
                  :step="item.allowFloat ? '0.5' : '1'" 
                  min="0.5"
                  @change="e => handleDirectQtyInput(item._id, e.target.value, item.allowFloat)"
                  @blur="e => handleDirectQtyInput(item._id, e.target.value, item.allowFloat)"
                />
                <button type="button" class="qty-btn" @click="handleQtyChange(item._id, item.quantity + (item.allowFloat ? 0.5 : 1))" aria-label="زيادة الكمية">+</button>
              </div>
            </div>

            <!-- Notes per item -->
            <div class="item-note-wrapper">
              <input 
                type="text" 
                aria-label="ملاحظة خاصة بالمنتج"
                :value="item.itemNotes" 
                @input="handleUpdateNote(item._id, $event.target.value)" 
                placeholder="إضافة ملاحظة خاصة بهذا المنتج (مثال: بدون مكسرات)…" 
                class="item-note-input"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Identity Section (Guest Form) -->
      <div v-if="showIdentityForm" class="identity-section glass-panel">
        <h3 class="section-title">البيانات الشخصية للطلب</h3>
        <p class="section-desc">يرجى كتابة الاسم ورقم الهاتف لإكمال عملية إرسال الطلب.</p>
        
        <div class="form-group">
          <label for="cart-customer-name" class="form-label">الاسم بالكامل</label>
          <input 
            id="cart-customer-name" 
            type="text" 
            name="name" 
            autocomplete="name" 
            v-model="nameInput" 
            @blur="handleSaveIdentity" 
            placeholder="أدخل اسمك الكريم…" 
            class="form-input" 
          />
        </div>
        
        <div class="form-group">
          <label for="cart-customer-phone" class="form-label">رقم الهاتف</label>
          <input 
            id="cart-customer-phone" 
            type="tel" 
            name="phone" 
            autocomplete="tel" 
            v-model="phoneInput" 
            @blur="handleSaveIdentity" 
            placeholder="09XXXXXXXX" 
            class="form-input" 
          />
        </div>
        
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        
        <button type="button" class="btn-primary" @click="handleSaveIdentity">حفظ وتأكيد البيانات</button>
      </div>

      <!-- Logged-in info preview -->
      <div v-else class="identity-preview glass-panel">
        <div class="preview-text">
          <div class="preview-name-row">
            <p class="name">الاسم: <strong>{{ authStore.customerName }}</strong></p>
            <span class="preview-badge">
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>حساب موثق</span>
            </span>
          </div>
          <p class="phone" dir="ltr">الهاتف: <strong class="text-mono">{{ authStore.customerPhone }}</strong></p>
        </div>
        <button type="button" class="change-btn" @click="authStore.clearIdentity()" title="تسجيل الدخول بحساب آخر">تبديل الحساب</button>
      </div>

      <!-- Checkout Options -->
      <div class="checkout-details-section glass-panel">
        <h3 class="section-title">بيانات الاستلام والملاحظات</h3>

        <div class="form-group">
          <div class="date-header-row">
            <label for="cart-delivery-date" class="form-label">تاريخ استلام الطلب</label>
            <div class="date-shortcuts-pills">
              <button 
                type="button" 
                class="date-pill-btn" 
                :class="{ active: isTodayActive }"
                @click="setDeliveryDateShortcut('today')"
              >اليوم</button>
              <button 
                type="button" 
                class="date-pill-btn" 
                :class="{ active: isTomorrowActive }"
                @click="setDeliveryDateShortcut('tomorrow')"
              >غداً</button>
            </div>
          </div>
          <input id="cart-delivery-date" type="date" :min="minDeliveryDate" v-model="cartStore.deliveryDate" @change="cartStore.persist" class="form-input date-input" />
        </div>

        <div class="form-group">
          <label for="cart-order-notes" class="form-label">ملاحظات عامة حول الطلب</label>
          <textarea 
            id="cart-order-notes" 
            v-model="cartStore.orderNotes" 
            @input="cartStore.persist" 
            placeholder="أضف أي ملاحظات عامة حول الاستلام والتغليف هنا…" 
            class="form-input text-area"
            rows="3"
          ></textarea>
        </div>
      </div>

      <!-- Total Price and Submit -->
      <div class="checkout-footer glass-panel">
        <div class="total-row">
          <span class="label">إجمالي الحساب:</span>
          <div class="price-wrapper">
            <span class="value">{{ cartStore.cartTotal }}</span>
            <span class="unit">د.ل</span>
          </div>
        </div>

        <!-- Submit / Update Button -->
        <button 
          class="checkout-btn btn-primary pulse-animation" 
          :class="{ 'btn-update-order-mode': cartStore.isEditingOrder }"
          @click="handleCheckout"
          :disabled="isSubmitting"
        >
          <template v-if="cartStore.isEditingOrder">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>حفظ وتحديث الطلب</span>
          </template>
          <template v-else>
            <span>إرسال الطلب عبر الواتساب</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.977 0c3.222.001 6.252 1.256 8.529 3.536 2.277 2.278 3.53 5.31 3.528 8.53-.005 6.655-5.33 11.98-11.979 11.98-2.002-.001-3.97-.497-5.714-1.442L0 24zm6.59-4.846c1.666.988 3.311 1.485 5.32 1.488 5.626 0 10.201-4.576 10.205-10.2.002-2.724-1.056-5.285-2.977-7.208C17.279 1.312 14.72 .253 12 .25c-5.631 0-10.21 4.579-10.213 10.21-.002 1.902.485 3.759 1.411 5.389l-1.017 3.72 3.823-1.002zM17.065 14.1c-.277-.139-1.64-.81-1.895-.902-.255-.092-.441-.139-.626.139-.185.277-.718.902-.88 1.088-.163.186-.325.208-.602.069-.277-.14-1.17-.431-2.228-1.376-.824-.735-1.38-1.644-1.542-1.922-.163-.277-.018-.427.121-.566.125-.125.277-.324.417-.486.139-.162.186-.277.277-.462.093-.185.047-.348-.023-.487-.07-.139-.626-1.507-.858-2.064-.226-.543-.454-.47-.626-.478-.162-.007-.347-.007-.532-.007-.185 0-.486.07-.74.348-.255.277-.973.95-973 2.315 0 1.365.992 2.68 1.13 2.865.139.186 1.953 2.982 4.73 4.181.66.285 1.176.455 1.579.583.664.211 1.269.181 1.748.11.534-.08 1.64-.67 1.872-1.318.232-.647.232-1.203.163-1.318-.07-.115-.255-.162-.532-.3z"/>
            </svg>
          </template>
        </button>
      </div>
    </div>

    <!-- ORDER CONFIRMATION MODAL -->
    <Teleport to="body">
      <Transition name="confirm-modal-fade">
        <div 
          v-if="showOrderConfirmModal" 
          class="confirm-modal-backdrop" 
          @click.self="handleCloseConfirmation"
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="confirm-order-title"
        >
          <div class="confirm-modal-card glass-panel" @click.stop>
            <div class="sheet-grab-handle" aria-hidden="true"></div>
            <!-- Modal Header -->
            <div class="confirm-modal-header">
              <div class="confirm-header-icon-group">
                <div class="confirm-icon-badge">
                  <svg v-if="cartStore.isEditingOrder" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="8" cy="21" r="1"/>
                    <circle cx="19" cy="21" r="1"/>
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
                  </svg>
                </div>
                <div class="confirm-header-texts">
                  <h3 id="confirm-order-title" class="confirm-title">
                    {{ cartStore.isEditingOrder ? `تأكيد تحديث الطلب (#${cartStore.editingOrderNumber})` : 'تأكيد إرسال الطلب' }}
                  </h3>
                  <span class="confirm-subtitle">يرجى مراجعة تفاصيل طلبك قبل الإرسال النهائي عبر الواتساب</span>
                </div>
              </div>
              <button 
                type="button" 
                class="confirm-btn-close" 
                @click="handleCloseConfirmation" 
                :disabled="isSubmitting"
                aria-label="إلغاء وإغلاق النافذة"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <!-- Modal Scrollable Body -->
            <div class="confirm-modal-body">
              <!-- Customer Identity Pill -->
              <div class="confirm-identity-strip">
                <div class="confirm-identity-info">
                  <span class="confirm-customer-name">{{ authStore.customerName || 'عميل مسجل' }}</span>
                  <span class="confirm-customer-phone text-mono" dir="ltr">{{ authStore.customerPhone }}</span>
                </div>
                <span class="confirm-verified-tag">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>حساب موثق</span>
                </span>
              </div>

              <!-- Logistics & Store Metadata Row -->
              <div class="confirm-meta-grid">
                <div class="confirm-meta-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span class="confirm-meta-label">الاستلام:</span>
                  <span class="confirm-meta-val text-mono">{{ cartStore.deliveryDate || 'غداً' }}</span>
                </div>
                <div class="confirm-meta-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  <span class="confirm-meta-val">{{ storeDisplayName }}</span>
                  <span class="confirm-price-tier-tag">{{ priceModeDisplayName }}</span>
                </div>
              </div>

              <!-- Order Items Breakdown -->
              <div class="confirm-items-section">
                <div class="confirm-items-header">
                  <span class="confirm-items-title">قائمة الأصناف</span>
                  <span class="confirm-items-count text-mono">{{ totalItemsCount }} قطعة</span>
                </div>
                <div class="confirm-items-list">
                  <div v-for="item in cartStore.items" :key="item._id" class="confirm-item-row">
                    <div class="confirm-item-info">
                      <span class="confirm-item-name">{{ item.name }}</span>
                      <span v-if="item.itemNotes" class="confirm-item-note">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        {{ item.itemNotes }}
                      </span>
                    </div>
                    <div class="confirm-item-math">
                      <span class="confirm-item-qty-price text-mono">{{ item.quantity }} × {{ getItemPrice(item) }}</span>
                      <span class="confirm-item-subtotal text-mono">{{ Math.round(getItemPrice(item) * item.quantity) }} د.ل</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Order Notes (if any) -->
              <div v-if="cartStore.orderNotes" class="confirm-notes-box">
                <div class="confirm-notes-header">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <span>ملاحظات عامة:</span>
                </div>
                <p class="confirm-notes-content">{{ cartStore.orderNotes }}</p>
              </div>

              <!-- Grand Total Row -->
              <div class="confirm-total-card">
                <span class="confirm-total-label">الإجمالي الكلي المستحق:</span>
                <div class="confirm-total-amount">
                  <span class="confirm-total-number text-mono">{{ cartStore.cartTotal }}</span>
                  <span class="confirm-total-currency">د.ل</span>
                </div>
              </div>
            </div>

            <!-- Modal Action Buttons -->
            <div class="confirm-actions-bar">
              <button 
                type="button" 
                class="confirm-btn-primary pulse-animation" 
                :class="{ 'btn-update-mode': cartStore.isEditingOrder }"
                @click="handleConfirmSubmit"
                :disabled="isSubmitting"
              >
                <template v-if="isSubmitting">
                  <div class="confirm-mini-spinner" aria-hidden="true"></div>
                  <span>{{ cartStore.isEditingOrder ? 'جاري حفظ التعديل…' : 'جاري إرسال الطلب…' }}</span>
                </template>
                <template v-else-if="cartStore.isEditingOrder">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>تأكيد وحفظ الطلب</span>
                </template>
                <template v-else>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.977 0c3.222.001 6.252 1.256 8.529 3.536 2.277 2.278 3.53 5.31 3.528 8.53-.005 6.655-5.33 11.98-11.979 11.98-2.002-.001-3.97-.497-5.714-1.442L0 24zm6.59-4.846c1.666.988 3.311 1.485 5.32 1.488 5.626 0 10.201-4.576 10.205-10.2.002-2.724-1.056-5.285-2.977-7.208C17.279 1.312 14.72 .253 12 .25c-5.631 0-10.21 4.579-10.213 10.21-.002 1.902.485 3.759 1.411 5.389l-1.017 3.72 3.823-1.002zM17.065 14.1c-.277-.139-1.64-.81-1.895-.902-.255-.092-.441-.139-.626.139-.185.277-.718.902-.88 1.088-.163.186-.325.208-.602.069-.277-.14-1.17-.431-2.228-1.376-.824-.735-1.38-1.644-1.542-1.922-.163-.277-.018-.427.121-.566.125-.125.277-.324.417-.486.139-.162.186-.277.277-.462.093-.185.047-.348-.023-.487-.07-.139-.626-1.507-.858-2.064-.226-.543-.454-.47-.626-.478-.162-.007-.347-.007-.532-.007-.185 0-.486.07-.74.348-.255.277-.973.95-973 2.315 0 1.365.992 2.68 1.13 2.865.139.186 1.953 2.982 4.73 4.181.66.285 1.176.455 1.579.583.664.211 1.269.181 1.748.11.534-.08 1.64-.67 1.872-1.318.232-.647.232-1.203.163-1.318-.07-.115-.255-.162-.532-.3z"/>
                  </svg>
                  <span>تأكيد وإرسال عبر الواتساب</span>
                </template>
              </button>
              <button 
                type="button" 
                class="confirm-btn-secondary" 
                @click="handleCloseConfirmation" 
                :disabled="isSubmitting"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <span>مراجعة السلة / تعديل</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.cart-view-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Order Edit Mode Banner */
.order-edit-mode-banner {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(217, 119, 6, 0.2));
  border: 1.5px solid rgba(245, 158, 11, 0.4);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.edit-banner-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.edit-badge-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
  animation: pulseDot 1.5s infinite;
}

@keyframes pulseDot {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
}

.edit-badge-title {
  font-weight: 850;
  font-size: 0.95rem;
  color: #92400e;
}

.edit-order-number-tag {
  font-family: 'Cairo', monospace;
  font-size: 0.82rem;
  font-weight: 850;
  background: #ffffff;
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #d97706;
  padding: 2px 8px;
  border-radius: 6px;
}

.btn-cancel-edit-mode {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #64748b;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 6px 12px;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.btn-cancel-edit-mode:focus-visible {
  outline: 2px solid #d97706;
  outline-offset: 2px;
}

.btn-cancel-edit-mode:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.edit-banner-instructions {
  font-size: 0.84rem;
  color: #78350f;
  line-height: 1.45;
  margin: 0;
}

.btn-browse-store-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #ffffff;
  border: 1.5px dashed #f59e0b;
  color: #b45309;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 800;
  padding: 10px 14px;
  min-height: 42px;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.btn-browse-store-add:focus-visible {
  outline: 2px solid #d97706;
  outline-offset: 2px;
}

.btn-browse-store-add:hover {
  background: #fffbeb;
  border-style: solid;
  transform: translateY(-1px);
}

.btn-update-order-mode {
  background: linear-gradient(135deg, #f59e0b, #d97706) !important;
  border: 1px solid #d97706 !important;
  box-shadow: 0 4px 16px rgba(217, 119, 6, 0.35) !important;
}

.btn-update-order-mode:hover:not(:disabled) {
  background: linear-gradient(135deg, #fbbf24, #ea580c) !important;
  box-shadow: 0 6px 20px rgba(217, 119, 6, 0.45) !important;
}

.view-header {
  padding: 1.25rem 1rem;
  text-align: center;
}

.view-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: #2c2520;
  margin-bottom: 2px;
}

.view-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3.5rem 1.5rem;
  gap: 10px;
  color: var(--text-muted);
}

.empty-icon-wrapper {
  font-size: 3rem;
  line-height: 1;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
}

.empty-desc {
  font-size: 0.88rem;
  line-height: 1.4;
  margin: 0;
  max-width: 280px;
}

.cart-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cart-items-section {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cart-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px dashed rgba(44, 37, 32, 0.08);
  padding-bottom: 0.5rem;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 800;
  margin: 0;
}

.clear-cart-btn {
  background: transparent;
  border: none;
  color: #dc2626;
  font-size: 0.78rem;
  font-weight: 750;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  min-height: 36px;
  border-radius: 6px;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.clear-cart-btn:focus-visible {
  outline: 2px solid #dc2626;
  outline-offset: 2px;
}

.clear-cart-btn.confirming {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #991b1b;
  font-weight: 800;
  animation: pulse 1s infinite alternate;
}

.clear-cart-btn:hover {
  background: #fee2e2;
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cart-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(44, 37, 32, 0.05);
}

.cart-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.item-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-img {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.item-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-title {
  font-size: 0.88rem;
  font-weight: 750;
  margin: 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-price-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.price-val {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--primary-color);
}

.bulk-label {
  font-size: 0.68rem;
  background: rgba(147, 51, 234, 0.1);
  color: #7e22ce;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 700;
}

.qty-adjuster {
  display: flex;
  align-items: center;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
  flex-shrink: 0;
}

.qty-btn {
  width: 28px;
  height: 28px;
  background: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #0f172a;
  position: relative;
  touch-action: manipulation;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.qty-btn::before {
  content: '';
  position: absolute;
  top: -8px;
  bottom: -8px;
  left: -8px;
  right: -8px;
}

.qty-btn:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 1px;
}

.qty-btn:active {
  background: #e2e8f0;
  transform: scale(0.94);
}

.qty-input-field {
  width: 38px;
  height: 26px;
  text-align: center;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 750;
  border: none;
  background: transparent;
  color: #0f172a;
}

.item-note-wrapper {
  width: 100%;
}

.item-note-input {
  width: 100%;
  min-height: 36px;
  height: 36px;
  padding: 6px 10px;
  font-family: inherit;
  font-size: 0.82rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #334155;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.item-note-input:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 1px;
  border-color: var(--primary-color);
}

.identity-section,
.checkout-details-section,
.identity-preview {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.identity-preview {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.preview-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.85rem;
}

.preview-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.preview-badge {
  font-size: 0.7rem;
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 4px;
}

.change-btn {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #475569;
  padding: 6px 12px;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 750;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.change-btn:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 750;
  color: #334155;
}

.date-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.date-shortcuts-pills {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-pill-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 800;
  padding: 4px 10px;
  min-height: 28px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1;
}

.date-pill-btn:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.date-pill-btn.active {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #ffffff;
  border-color: #d97706;
  box-shadow: 0 2px 8px rgba(217, 119, 6, 0.3);
}

.date-pill-btn:focus-visible {
  outline: 2px solid #d97706;
  outline-offset: 1px;
}

.form-input {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 44px;
  height: 44px;
  padding: 6px 10px;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.88rem;
  box-sizing: border-box;
  display: block;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-input:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
  border-color: var(--primary-color);
}

.date-input {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  background-color: #ffffff;
  color: #0f172a;
  direction: rtl;
  text-align: right;
}

.date-input::-webkit-date-and-time-value {
  text-align: right !important;
  direction: rtl !important;
  display: block !important;
  width: 100% !important;
  min-height: 1.4em !important;
}

.text-area {
  height: auto;
  resize: vertical;
}

.checkout-footer {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.total-row .label {
  font-weight: 800;
  font-size: 1rem;
  color: #0f172a;
}

.price-wrapper .value {
  font-size: 1.4rem;
  font-weight: 850;
  color: var(--primary-color);
}

.price-wrapper .unit {
  font-size: 0.85rem;
  margin-right: 4px;
  font-weight: 750;
}

.checkout-btn {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 850;
  border-radius: 12px;
}

/* ==========================================================================
   ORDER CONFIRMATION MODAL STYLES (Adhering to e-menu-design-guide.md)
   ========================================================================== */

.confirm-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  overscroll-behavior: contain;
}

.confirm-modal-card {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35);
  border: 1px solid rgba(226, 232, 240, 0.9);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Cairo', sans-serif;
  line-height: 1.45;
  text-align: right;
  direction: rtl;
}

/* Modal Header */
.confirm-modal-header {
  padding: 16px 18px 14px 18px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #f1f5f9;
  background: #ffffff;
}

.confirm-header-icon-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.confirm-icon-badge {
  width: 42px;
  height: 42px;
  min-width: 42px;
  min-height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(253, 181, 24, 0.2), rgba(217, 119, 6, 0.22));
  color: #d97706;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.confirm-header-texts {
  display: flex;
  flex-direction: column;
}

.confirm-title {
  font-size: 1.05rem;
  font-weight: 850;
  color: #0f172a;
  margin: 0 0 2px 0;
  line-height: 1.35;
}

.confirm-subtitle {
  font-size: 0.76rem;
  color: #64748b;
  line-height: 1.4;
}

.confirm-btn-close {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  position: relative;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  flex-shrink: 0;
}

.confirm-btn-close::before {
  content: '';
  position: absolute;
  top: -4px;
  bottom: -4px;
  left: -4px;
  right: -4px;
}

.confirm-btn-close:hover:not(:disabled) {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fca5a5;
}

.confirm-btn-close:focus-visible {
  outline: 2px solid #d97706;
  outline-offset: 2px;
}

.confirm-btn-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal Body */
.confirm-modal-body {
  padding: 14px 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.confirm-modal-body::-webkit-scrollbar {
  width: 5px;
}

.confirm-modal-body::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 4px;
}

/* Customer Identity Pill */
.confirm-identity-strip {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.confirm-identity-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.confirm-customer-name {
  font-weight: 850;
  font-size: 0.92rem;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.confirm-customer-phone {
  font-size: 0.82rem;
  font-weight: 700;
  color: #475569;
}

.confirm-verified-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #059669;
  font-size: 0.74rem;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Logistics & Store Metadata */
.confirm-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.confirm-meta-item {
  background: #fffdf9;
  border: 1px solid rgba(245, 158, 11, 0.22);
  border-radius: 10px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #334155;
}

.confirm-meta-item svg {
  color: #d97706;
  flex-shrink: 0;
}

.confirm-meta-label {
  color: #64748b;
  font-weight: 700;
}

.confirm-meta-val {
  font-weight: 850;
  color: #0f172a;
}

.confirm-price-tier-tag {
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: auto;
}

/* Items Section */
.confirm-items-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
}

.confirm-items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px dashed #cbd5e1;
}

.confirm-items-title {
  font-weight: 850;
  font-size: 0.86rem;
  color: #1e293b;
}

.confirm-items-count {
  font-size: 0.76rem;
  font-weight: 800;
  color: #64748b;
  background: #e2e8f0;
  padding: 1px 7px;
  border-radius: 10px;
}

.confirm-items-list {
  max-height: 140px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 4px;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.confirm-item-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.82rem;
  padding: 4px 0;
  border-bottom: 1px solid #f1f5f9;
}

.confirm-item-row:last-child {
  border-bottom: none;
}

.confirm-item-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.confirm-item-name {
  font-weight: 800;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.confirm-item-note {
  font-size: 0.72rem;
  color: #d97706;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.confirm-item-math {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  white-space: nowrap;
  flex-shrink: 0;
}

.confirm-item-qty-price {
  font-size: 0.74rem;
  color: #64748b;
}

.confirm-item-subtotal {
  font-weight: 850;
  color: #0f172a;
  font-size: 0.84rem;
}

/* Order Notes Box */
.confirm-notes-box {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.confirm-notes-header {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  font-weight: 800;
  color: #92400e;
}

.confirm-notes-content {
  font-size: 0.8rem;
  color: #78350f;
  margin: 0;
  line-height: 1.4;
  white-space: pre-wrap;
}

/* Grand Total Card */
.confirm-total-card {
  background: linear-gradient(135deg, rgba(253, 181, 24, 0.12), rgba(245, 158, 11, 0.18));
  border: 1.5px solid rgba(245, 158, 11, 0.4);
  border-radius: 14px;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.confirm-total-label {
  font-weight: 850;
  font-size: 0.92rem;
  color: #78350f;
}

.confirm-total-amount {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.confirm-total-number {
  font-size: 1.5rem;
  font-weight: 900;
  color: #b45309;
}

.confirm-total-currency {
  font-size: 0.88rem;
  font-weight: 800;
  color: #92400e;
}

/* Action Buttons Bar */
.confirm-actions-bar {
  padding: 14px 18px 18px 18px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #ffffff;
}

.confirm-btn-primary {
  min-height: 48px;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 850;
  cursor: pointer;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #ffffff;
  border: none;
  box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: inherit;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.confirm-btn-primary.btn-update-mode {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.35);
}

.confirm-btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(22, 163, 74, 0.45);
}

.confirm-btn-primary.btn-update-mode:hover:not(:disabled) {
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.45);
}

.confirm-btn-primary:focus-visible {
  outline: 2px solid #16a34a;
  outline-offset: 2px;
}

.confirm-btn-primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

.confirm-mini-spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: confirmSpin 0.75s linear infinite;
}

@keyframes confirmSpin {
  to { transform: rotate(360deg); }
}

.confirm-btn-secondary {
  min-height: 44px;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 800;
  background: #ffffff;
  color: #475569;
  border: 1.5px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.confirm-btn-secondary:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #1e293b;
}

.confirm-btn-secondary:focus-visible {
  outline: 2px solid #94a3b8;
  outline-offset: 2px;
}

.confirm-btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sheet-grab-handle {
  width: 38px;
  height: 4.5px;
  border-radius: 3px;
  background: rgba(148, 163, 184, 0.45);
  margin: 10px auto 4px auto;
  display: none;
}

/* Symmetrical Confirm Modal Transitions */
.confirm-modal-fade-enter-active,
.confirm-modal-fade-leave-active {
  transition: opacity 0.22s ease;
}

.confirm-modal-fade-enter-active .confirm-modal-card,
.confirm-modal-fade-leave-active .confirm-modal-card {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.confirm-modal-fade-enter-from,
.confirm-modal-fade-leave-to {
  opacity: 0;
}

.confirm-modal-fade-enter-from .confirm-modal-card,
.confirm-modal-fade-leave-to .confirm-modal-card {
  transform: translateY(100%);
}

@media (min-width: 641px) {
  .confirm-modal-fade-enter-from .confirm-modal-card,
  .confirm-modal-fade-leave-to .confirm-modal-card {
    transform: translateY(16px) scale(0.98);
  }
}

/* Mobile Bottom-Sheet (Habit 15) */
@media (max-width: 640px) {
  .sheet-grab-handle {
    display: block;
  }

  .confirm-modal-backdrop {
    align-items: flex-end;
    padding: 0;
  }

  .confirm-modal-card {
    border-radius: 24px 24px 0 0;
    max-height: 92vh;
    width: 100%;
    border-bottom: none;
    border-left: none;
    border-right: none;
  }

  .confirm-actions-bar {
    padding-bottom: calc(18px + env(safe-area-inset-bottom, 14px)) !important;
  }

  .confirm-meta-grid {
    grid-template-columns: 1fr;
  }
}

/* Button Instant Touch/Press Feedback */
.checkout-btn:active,
.confirm-btn-primary:active,
.confirm-btn-secondary:active,
.change-btn:active,
.btn-cancel-edit-mode:active,
.btn-browse-store-add:active,
.date-pill-btn:active {
  transform: scale(0.97) !important;
  transition: transform 0.08s ease-out;
}

/* Mobile Responsive 80% Scale (≤ 768px) */
@media (max-width: 768px) {
  .cart-view-container {
    gap: 0.75rem;
  }

  .cart-content-wrapper {
    gap: 0.75rem;
  }

  .cart-items-section {
    padding: 0.75rem;
    gap: 0.6rem;
  }

  .item-img {
    width: 46px;
    height: 46px;
    border-radius: 8px;
  }

  .item-title {
    font-size: 0.82rem;
  }

  .price-val {
    font-size: 0.78rem;
  }

  .qty-btn {
    width: 28px;
    height: 28px;
    font-size: 0.85rem;
    position: relative;
    touch-action: manipulation;
  }

  .qty-btn::before {
    content: '';
    position: absolute;
    top: -8px;
    bottom: -8px;
    left: -8px;
    right: -8px;
  }

  .qty-input-field {
    width: 34px;
    height: 26px;
    font-size: 0.85rem !important;
  }

  /* Proportional balanced typography on mobile inputs */
  .item-note-input {
    font-size: 0.8rem !important;
    min-height: 34px;
    height: 34px;
  }

  .form-input {
    font-size: 0.85rem !important;
    min-height: 40px;
    height: 40px;
  }

  .checkout-details-section {
    padding: 0.75rem;
  }

  .checkout-footer {
    padding: 0.75rem 0.85rem;
    gap: 0.6rem;
    margin-bottom: 1.25rem;
  }

  .price-wrapper .value {
    font-size: 1.25rem;
  }

  .checkout-btn {
    height: 44px;
    font-size: 0.88rem;
    border-radius: 10px;
  }
}
</style>
