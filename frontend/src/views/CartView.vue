<script setup>
import { computed, ref } from 'vue';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';

const cartStore = useCartStore();
const authStore = useAuthStore();

// Guest checkout details (Name and Phone)
const nameInput = ref(authStore.customerName);
const phoneInput = ref(authStore.customerPhone);
const showIdentityForm = computed(() => !authStore.isIdentified());

// Checkout processing
const isSubmitting = ref(false);
const errorMsg = ref('');

const handleSaveIdentity = () => {
  if (!nameInput.value.trim() || !phoneInput.value.trim()) {
    errorMsg.value = 'يرجى كتابة الاسم ورقم الهاتف بشكل صحيح لتتمكن من الطلب.';
    return;
  }
  
  // Basic Libyan phone validation or general validation
  const phone = phoneInput.value.trim();
  if (phone.length < 9) {
    errorMsg.value = 'يرجى إدخال رقم هاتف صحيح.';
    return;
  }
  
  errorMsg.value = '';
  authStore.setIdentity(nameInput.value, phoneInput.value);
};

const handleCheckout = async () => {
  if (!authStore.isIdentified()) {
    handleSaveIdentity();
    if (errorMsg.value) return;
  }

  isSubmitting.value = true;
  try {
    await cartStore.submitOrder();
  } catch (err) {
    alert(err.message);
  } finally {
    isSubmitting.value = false;
  }
};

const getItemPrice = (item) => {
  return item.priceMode === 'bulk' ? item.price_bulk : (item.price_regular || item.price);
};

const handleUpdateNote = (itemId, note) => {
  const item = cartStore.items.find(i => i._id === itemId);
  if (item) {
    item.itemNotes = note;
    cartStore.persist();
  }
};
</script>

<template>
  <div class="cart-view-container">
    <header class="view-header glass-panel">
      <h1 class="view-title">🛒 سلة المشتريات</h1>
      <p class="view-desc">قم بمراجعة طلبك وإدخال بيانات الاستلام لإتمام الطلب</p>
    </header>

    <!-- Empty State -->
    <div v-if="cartStore.items.length === 0" class="empty-state glass-panel">
      <div class="empty-icon-wrapper">🛍️</div>
      <h2 class="empty-title">السلة فارغة حالياً</h2>
      <p class="empty-desc">اذهب لقسم المنتجات وأضف ما ترغب به لتجده هنا.</p>
    </div>

    <!-- Active Cart Content -->
    <div v-else class="cart-content-wrapper">
      
      <!-- Cart Items List -->
      <div class="cart-items-section glass-panel">
        <h3 class="section-title">الأصناف المختارة</h3>
        
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
                <span class="qty-val">{{ item.quantity }}</span>
                <button class="qty-btn" @click="cartStore.updateQty(item._id, item.quantity + (item.allowFloat ? 0.5 : 1))">+</button>
              </div>
            </div>

            <!-- Notes per item -->
            <div class="item-note-wrapper">
              <input 
                type="text" 
                :value="item.itemNotes" 
                @input="handleUpdateNote(item._id, $event.target.value)" 
                placeholder="إضافة ملاحظة خاصة بهذا المنتج (مثال: بدون مكسرات)..." 
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
          <label class="form-label">الاسم بالكامل</label>
          <input type="text" v-model="nameInput" placeholder="أدخل اسمك الكريم..." class="form-input" />
        </div>
        
        <div class="form-group">
          <label class="form-label">رقم الهاتف</label>
          <input type="tel" v-model="phoneInput" placeholder="09XXXXXXXX" class="form-input" />
        </div>
        
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        
        <button class="btn-primary" @click="handleSaveIdentity">حفظ وتأكيد البيانات</button>
      </div>

      <!-- Logged-in info preview -->
      <div v-else class="identity-preview glass-panel">
        <div class="preview-text">
          <p class="name">الاسم: <strong>{{ authStore.customerName }}</strong></p>
          <p class="phone">رقم الهاتف: <strong>{{ authStore.customerPhone }}</strong></p>
        </div>
        <button class="change-btn" @click="authStore.clearIdentity()">تعديل البيانات</button>
      </div>

      <!-- Checkout Options -->
      <div class="checkout-details-section glass-panel">
        <h3 class="section-title">بيانات الاستلام والملاحظات</h3>

        <div class="form-group">
          <label class="form-label">تاريخ استلام الطلب</label>
          <input type="date" v-model="cartStore.deliveryDate" @change="cartStore.persist" class="form-input" />
        </div>

        <div class="form-group">
          <label class="form-label">ملاحظات عامة حول الطلب</label>
          <textarea 
            v-model="cartStore.orderNotes" 
            @input="cartStore.persist" 
            placeholder="أضف أي ملاحظات عامة حول الاستلام والتغليف هنا..." 
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
        <button 
          class="checkout-btn btn-primary pulse-animation" 
          @click="handleCheckout"
          :disabled="isSubmitting"
        >
          <span>إرسال الطلب عبر الواتساب</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.977 0c3.222.001 6.252 1.256 8.529 3.536 2.277 2.278 3.53 5.31 3.528 8.53-.005 6.655-5.33 11.98-11.979 11.98-2.002-.001-3.97-.497-5.714-1.442L0 24zm6.59-4.846c1.666.988 3.311 1.485 5.32 1.488 5.626 0 10.201-4.576 10.205-10.2.002-2.724-1.056-5.285-2.977-7.208C17.279 1.312 14.72 .253 12 .25c-5.631 0-10.21 4.579-10.213 10.21-.002 1.902.485 3.759 1.411 5.389l-1.017 3.72 3.823-1.002zM17.065 14.1c-.277-.139-1.64-.81-1.895-.902-.255-.092-.441-.139-.626.139-.185.277-.718.902-.88 1.088-.163.186-.325.208-.602.069-.277-.14-1.17-.431-2.228-1.376-.824-.735-1.38-1.644-1.542-1.922-.163-.277-.018-.427.121-.566.125-.125.277-.324.417-.486.139-.162.186-.277.277-.462.093-.185.047-.348-.023-.487-.07-.139-.626-1.507-.858-2.064-.226-.543-.454-.47-.626-.478-.162-.007-.347-.007-.532-.007-.185 0-.486.07-.74.348-.255.277-.973.95-973 2.315 0 1.365.992 2.68 1.13 2.865.139.186 1.953 2.982 4.73 4.181.66.285 1.176.455 1.579.583.664.211 1.269.181 1.748.11.534-.08 1.64-.67 1.872-1.318.232-.647.232-1.203.163-1.318-.07-.115-.255-.162-.532-.3z"/>
          </svg>
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

.view-header {
  padding: 1.25rem 1rem;
  text-align: center;
}

.view-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: #fff;
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
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
}

.empty-desc {
  font-size: 0.85rem;
  line-height: 1.5;
  max-width: 280px;
}

.cart-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 0.5rem;
}

.section-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
  line-height: 1.4;
}

.cart-items-section {
  padding: 1rem;
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cart-item {
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 12px;
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
  width: 50px;
  height: 50px;
  border-radius: 8px;
  object-fit: cover;
  background: #1a0f0a;
}

.item-details {
  flex-grow: 1;
  min-width: 0;
}

.item-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-price-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--primary-color);
  margin-top: 2px;
}

.bulk-label {
  font-size: 0.65rem;
  background: rgba(55,178,77,0.15);
  color: #37b24d;
  padding: 1px 4px;
  border-radius: 4px;
}

.qty-adjuster {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}

.qty-btn {
  background: transparent;
  border: none;
  color: #fff;
  width: 28px;
  height: 28px;
  font-weight: 700;
  cursor: pointer;
}

.qty-btn:active {
  background: rgba(255,255,255,0.06);
}

.qty-val {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0 4px;
}

.item-note-wrapper {
  margin-top: 8px;
}

.item-note-input {
  width: 100%;
  padding: 6px 10px;
  background: rgba(255,255,255,0.02);
  border: 1px dashed rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: rgba(255,255,255,0.8);
  font-family: 'Cairo', sans-serif;
  font-size: 0.75rem;
}

.item-note-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.identity-section {
  padding: 1.25rem 1rem;
}

.form-group {
  margin-bottom: 0.85rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 4px;
}

.text-area {
  resize: none;
}

.error-msg {
  color: #e63946;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.identity-preview {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-text {
  font-size: 0.88rem;
}

.preview-text p {
  margin: 2px 0;
}

.change-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.7);
  padding: 4px 10px;
  border-radius: 6px;
  font-family: 'Cairo', sans-serif;
  font-size: 0.75rem;
  cursor: pointer;
}

.checkout-details-section {
  padding: 1.25rem 1rem;
}

.checkout-footer {
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-row .label {
  font-weight: 700;
  font-size: 0.95rem;
}

.price-wrapper {
  color: var(--primary-color);
  font-weight: 800;
  font-size: 1.2rem;
}

.price-wrapper .unit {
  font-size: 0.85rem;
  margin-right: 2px;
  color: var(--text-muted);
}

.checkout-btn {
  background: #25d366;
  color: #fff;
  border-color: #25d366;
}

.checkout-btn:hover {
  background: #20ba59;
}
</style>
