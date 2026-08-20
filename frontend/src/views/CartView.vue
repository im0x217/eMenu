<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';

const router = useRouter();
const cartStore = useCartStore();
const authStore = useAuthStore();
const toastStore = useToastStore();

// Guest checkout details (Name and Phone)
const nameInput = ref(authStore.customerName);
const phoneInput = ref(authStore.customerPhone);
const showIdentityForm = computed(() => !authStore.isIdentified());

// Minimum delivery date is always tomorrow
const minDeliveryDate = computed(() => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
});

// Checkout processing
const isSubmitting = ref(false);
const errorMsg = ref('');

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

const handleCheckout = async () => {
  if (!authStore.isIdentified()) {
    handleSaveIdentity();
    if (errorMsg.value) return;
  }

  isSubmitting.value = true;
  try {
    const result = await cartStore.submitOrder();
    if (result && result.isEdit) {
      toastStore.show('تم حفظ وتحديث طلبك بنجاح! ✓', 'success');
    }
  } catch (err) {
    toastStore.show(err.message, 'error');
  } finally {
    isSubmitting.value = false;
  }
};

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

const isConfirmingClear = ref(false);
let confirmTimer = null;

const handleClearCart = () => {
  if (!isConfirmingClear.value) {
    isConfirmingClear.value = true;
    if (confirmTimer) clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => {
      isConfirmingClear.value = false;
    }, 3000);
  } else {
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
          إلغاء التعديل ✕
        </button>
      </div>
      <p class="edit-banner-instructions">
        يمكنك تعديل كميات الأصناف الحالية، أو تصفح المتجر وإضافة منتجات جديدة للسلة، ثم الضغط على "حفظ وتحديث الطلب" لتثبيت التغييرات.
      </p>
      <button type="button" class="btn-browse-store-add" @click="router.push(`/shop/${cartStore.editingOrderShop}`)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
        <span>تصفح المتجر وإضافة أصناف جديدة للطلب</span>
      </button>
    </div>

    <!-- 2. EMPTY STATE -->
    <div v-if="cartStore.items.length === 0" class="empty-state glass-panel">
      <div class="empty-icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6;">
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
          <button class="clear-cart-btn" @click="handleClearCart" :class="{ confirming: isConfirmingClear }" title="إفراغ السلة">
            <span>{{ isConfirmingClear ? 'تأكيد الإفراغ؟' : 'إفراغ السلة' }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
                <button class="qty-btn" @click="cartStore.updateQty(item._id, item.quantity - (item.allowFloat ? 0.5 : 1))">-</button>
                <input 
                  type="number" 
                  class="qty-input-field" 
                  :value="item.quantity" 
                  :step="item.allowFloat ? '0.5' : '1'" 
                  min="0.5"
                  @change="e => handleDirectQtyInput(item._id, e.target.value, item.allowFloat)"
                  @blur="e => handleDirectQtyInput(item._id, e.target.value, item.allowFloat)"
                />
                <button class="qty-btn" @click="cartStore.updateQty(item._id, item.quantity + (item.allowFloat ? 0.5 : 1))">+</button>
              </div>
            </div>

            <!-- Notes per item -->
            <div class="item-note-wrapper">
              <input 
                type="text" 
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
        
        <button class="btn-primary" @click="handleSaveIdentity">حفظ وتأكيد البيانات</button>
      </div>

      <!-- Logged-in info preview -->
      <div v-else class="identity-preview glass-panel">
        <div class="preview-text">
          <div class="preview-name-row">
            <p class="name">الاسم: <strong>{{ authStore.customerName }}</strong></p>
            <span class="preview-badge">✓ حساب موثق</span>
          </div>
          <p class="phone" dir="ltr">الهاتف: <strong class="text-mono">{{ authStore.customerPhone }}</strong></p>
        </div>
        <button type="button" class="change-btn" @click="authStore.clearIdentity()" title="تسجيل الدخول بحساب آخر">تبديل الحساب</button>
      </div>

      <!-- Checkout Options -->
      <div class="checkout-details-section glass-panel">
        <h3 class="section-title">بيانات الاستلام والملاحظات</h3>

        <div class="form-group">
          <label for="cart-delivery-date" class="form-label">تاريخ استلام الطلب</label>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>{{ isSubmitting ? 'جاري حفظ التعديل…' : 'حفظ وتحديث الطلب ✓' }}</span>
          </template>
          <template v-else>
            <span>{{ isSubmitting ? 'جاري إرسال الطلب…' : 'إرسال الطلب عبر الواتساب' }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.977 0c3.222.001 6.252 1.256 8.529 3.536 2.277 2.278 3.53 5.31 3.528 8.53-.005 6.655-5.33 11.98-11.979 11.98-2.002-.001-3.97-.497-5.714-1.442L0 24zm6.59-4.846c1.666.988 3.311 1.485 5.32 1.488 5.626 0 10.201-4.576 10.205-10.2.002-2.724-1.056-5.285-2.977-7.208C17.279 1.312 14.72 .253 12 .25c-5.631 0-10.21 4.579-10.213 10.21-.002 1.902.485 3.759 1.411 5.389l-1.017 3.72 3.823-1.002zM17.065 14.1c-.277-.139-1.64-.81-1.895-.902-.255-.092-.441-.139-.626.139-.185.277-.718.902-.88 1.088-.163.186-.325.208-.602.069-.277-.14-1.17-.431-2.228-1.376-.824-.735-1.38-1.644-1.542-1.922-.163-.277-.018-.427.121-.566.125-.125.277-.324.417-.486.139-.162.186-.277.277-.462.093-.185.047-.348-.023-.487-.07-.139-.626-1.507-.858-2.064-.226-.543-.454-.47-.626-.478-.162-.007-.347-.007-.532-.007-.185 0-.486.07-.74.348-.255.277-.973.95-973 2.315 0 1.365.992 2.68 1.13 2.865.139.186 1.953 2.982 4.73 4.181.66.285 1.176.455 1.579.583.664.211 1.269.181 1.748.11.534-.08 1.64-.67 1.872-1.318.232-.647.232-1.203.163-1.318-.07-.115-.255-.162-.532-.3z"/>
            </svg>
          </template>
        </button>
      </div>
    </div>
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
  padding: 4px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
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
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
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
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
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
  width: 26px;
  height: 26px;
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
}

.qty-btn:active {
  background: #e2e8f0;
}

.qty-input-field {
  width: 38px;
  height: 24px;
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
  height: 30px;
  padding: 4px 8px;
  font-family: inherit;
  font-size: 0.76rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #334155;
  box-sizing: border-box;
}

.identity-section,
.checkout-details-section,
.identity-preview {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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
  padding: 5px 10px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 750;
  cursor: pointer;
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

.form-input {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  height: 42px;
  padding: 6px 10px;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.88rem;
  box-sizing: border-box;
  display: block;
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
</style>
