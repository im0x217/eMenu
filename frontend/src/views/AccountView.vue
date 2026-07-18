<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useFavoritesStore } from '../stores/favorites';
import { useToastStore } from '../stores/toast';

const authStore = useAuthStore();
const favoritesStore = useFavoritesStore();
const toastStore = useToastStore();

// Form inputs
const nameInput = ref(authStore.customerName);
const phoneInput = ref(authStore.customerPhone);
const message = ref('');
const messageType = ref('success');

// Order History State
const orders = ref([]);
const isLoadingOrders = ref(false);

const loadOrderHistory = async () => {
  if (!authStore.customerPhone) {
    orders.value = [];
    return;
  }
  isLoadingOrders.value = true;
  try {
    const res = await fetch(`/api/customer/orders?phone=${encodeURIComponent(authStore.customerPhone)}`);
    if (res.ok) {
      orders.value = await res.json();
    }
  } catch (e) {
    console.error('Failed to load customer orders', e);
  } finally {
    isLoadingOrders.value = false;
  }
};

onMounted(() => {
  loadOrderHistory();
});

// Watch phone number changes to refetch history
watch(() => authStore.customerPhone, () => {
  loadOrderHistory();
});

const handleSaveProfile = async () => {
  if (!nameInput.value.trim() || !phoneInput.value.trim()) {
    message.value = 'يرجى كتابة الاسم ورقم الهاتف بشكل صحيح.';
    messageType.value = 'danger';
    return;
  }

  authStore.setIdentity(nameInput.value, phoneInput.value);

  // Sync and load favorites immediately upon login/profile save
  try {
    await favoritesStore.loadFavoritesFromBackend();
    await Promise.all([
      favoritesStore.syncFavoritesWithBackend('shop1'),
      favoritesStore.syncFavoritesWithBackend('shop2')
    ]);
  } catch (e) {
    console.warn('Failed to sync favorites on profile save', e);
  }

  message.value = 'تم حفظ بياناتك بنجاح!';
  messageType.value = 'success';

  // Load history for the updated phone number
  loadOrderHistory();
  
  setTimeout(() => {
    message.value = '';
  }, 3000);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-LY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'completed': return 'مكتمل';
    case 'cancelled': return 'ملغي';
    case 'pending':
    default: return 'قيد الانتظار';
  }
};

// Resend Modal State
const isModalOpen = ref(false);
const selectedOrder = ref(null);
const whatsappMessageText = ref('');

const generateWhatsAppMessage = (order) => {
  const shopName = order.shop === 'shop2' ? 'قسم النواشف' : 'المتجر الرئيسي (حلويات)';
  const priceLabel = order.priceMode === 'bulk' ? 'سعر جملة' : 'سعر عادي';
  
  let text = `*طلب جديد من تطبيق المنيو الإلكتروني*\n`;
  text += `*المحل:* ${shopName} (${priceLabel})\n`;
  text += `--------------------------------\n`;
  text += `*العميل:* ${order.customerInfo?.name || authStore.customerName}\n`;
  text += `*الهاتف:* ${order.customerInfo?.phone || authStore.customerPhone}\n`;
  if (order.deliveryDate) {
    text += `*تاريخ الاستلام:* ${order.deliveryDate}\n`;
  }
  text += `--------------------------------\n`;
  
  order.items.forEach((item, index) => {
    text += `${index + 1}. *${item.name}*\n`;
    text += `   الكمية: ${item.quantity} | السعر: ${item.price} د.ل | الإجمالي: ${item.price * item.quantity} د.ل\n`;
    if (item.notes) {
      text += `   ملاحظة: ${item.notes}\n`;
    }
  });
  
  text += `--------------------------------\n`;
  text += `*الإجمالي الكلي:* ${order.totalPrice} د.ل\n`;
  if (order.notes) {
    text += `*ملاحظات إضافية:* ${order.notes}\n`;
  }
  return text;
};

const getWhatsAppNumber = (order) => {
  const isBulk = order.priceMode === 'bulk';
  if (order.shop === 'shop2') {
    return isBulk ? '+218921717902' : '+218921717901';
  } else {
    return isBulk ? '+218916688800' : '+218921717901';
  }
};

const openResendModal = (order) => {
  selectedOrder.value = order;
  whatsappMessageText.value = generateWhatsAppMessage(order);
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  selectedOrder.value = null;
  whatsappMessageText.value = '';
};

const handleCopyMessage = async () => {
  try {
    await navigator.clipboard.writeText(whatsappMessageText.value);
    toastStore.show('تم نسخ نص الرسالة بنجاح! 📋');
  } catch (err) {
    toastStore.show('فشل نسخ النص، يرجى المحاولة يدوياً', 'error');
  }
};

const handleResendWhatsApp = () => {
  if (!selectedOrder.value) return;
  const number = getWhatsAppNumber(selectedOrder.value);
  const url = `https://wa.me/${number.replace('+', '')}?text=${encodeURIComponent(whatsappMessageText.value)}`;
  window.location.href = url;
};
</script>

<template>
  <div class="account-view-container">
    <!-- Profile Management -->
    <div class="profile-section glass-panel">
      <h3 class="section-title">بيانات الحساب</h3>
      
      <div class="form-group">
        <label class="form-label">الاسم بالكامل</label>
        <input type="text" v-model="nameInput" placeholder="اكتب اسمك هنا..." class="form-input" />
      </div>

      <div class="form-group">
        <label class="form-label">رقم الهاتف</label>
        <input type="tel" v-model="phoneInput" placeholder="09XXXXXXXX" class="form-input" />
      </div>

      <div v-if="message" class="alert-msg" :class="messageType">
        {{ message }}
      </div>

      <button class="btn-primary" @click="handleSaveProfile">حفظ التغييرات</button>
    </div>

    <!-- Order History -->
    <div class="orders-history-section glass-panel">
      <h3 class="section-title">الطلبات السابقة</h3>
      <p class="section-desc">ملاحظة: تظهر هنا الطلبات المرتبطة برقم هاتفك الحالي والمحفوظة في قاعدة البيانات.</p>

      <!-- Loading State -->
      <div v-if="isLoadingOrders" class="loading-orders">
        <div class="mini-spinner"></div>
        <p>جاري جلب الطلبات...</p>
      </div>

      <!-- No Phone State -->
      <div v-else-if="!authStore.customerPhone" class="empty-orders">
        <p>يرجى إدخال وحفظ رقم هاتفك أعلاه لعرض سجل طلباتك.</p>
      </div>

      <!-- Empty History State -->
      <div v-else-if="orders.length === 0" class="empty-orders">
        <p>لا توجد طلبات سابقة مسجلة بهذا الرقم بعد.</p>
      </div>

      <!-- Orders List -->
      <div v-else class="orders-list">
        <div v-for="order in orders" :key="order._id" class="order-card">
          <!-- Order Header -->
          <div class="order-header">
            <span class="order-date">{{ formatDate(order.createdAt) }}</span>
            <span class="order-status" :class="order.status || 'pending'">
              {{ getStatusLabel(order.status) }}
            </span>
          </div>

          <!-- Order Summary -->
          <div class="order-summary-details">
            <div class="shop-badge" :class="order.shop || 'shop1'">
              {{ order.shop === 'shop2' ? 'قسم النواشف' : 'المتجر الرئيسي' }}
            </div>
            <div class="price-mode-badge" :class="order.priceMode">
              {{ order.priceMode === 'bulk' ? 'جملة' : 'عادي' }}
            </div>
          </div>

          <!-- Order Items -->
          <div class="order-items-list">
            <div v-for="item in order.items" :key="item.productId" class="order-item-row">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-qty">×{{ item.quantity }}</span>
            </div>
          </div>

          <!-- Total price row -->
          <div class="order-total-row">
            <span class="total-label">إجمالي الحساب:</span>
            <span class="total-value">{{ order.totalPrice }} د.ل</span>
          </div>

          <!-- Modern Action Button -->
          <div class="order-actions-row">
            <button class="btn-resend-whatsapp" @click="openResendModal(order)">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              تفاصيل ورسالة الواتساب
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- WhatsApp Message Preview Modal -->
    <div v-if="isModalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-content glass-panel message-preview-modal">
        <div class="modal-header">
          <h3 class="modal-title">تفاصيل رسالة الطلب</h3>
          <button class="close-btn" @click="closeModal">✕</button>
        </div>
        
        <p class="modal-desc">صورة الشاشة (Screenshot) لهذه الرسالة ممتازة كإثبات إضافي لطلبك.</p>
        
        <!-- Screenshot Area -->
        <div class="screenshot-area" id="whatsapp-screenshot-card">
          <div class="chat-bubble-header">
            <div class="app-logo-small">
              <img :src="selectedOrder?.shop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'" alt="Logo" />
            </div>
            <div class="chat-title-info">
              <span class="chat-sender-name">{{ selectedOrder?.shop === 'shop2' ? 'قسم النواشف' : 'حلويات عبمبر الزروق' }}</span>
              <span class="chat-sender-status">رسالة الطلب الإلكتروني</span>
            </div>
          </div>
          <div class="message-body-wrapper">
            <pre class="message-text-preview">{{ whatsappMessageText }}</pre>
          </div>
          <div class="screenshot-watermark">
            <span>تم الإنشاء عبر المنيو الإلكتروني</span>
          </div>
        </div>

        <div class="modal-actions-row">
          <button class="action-btn copy-btn" @click="handleCopyMessage">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            نسخ النص
          </button>
          
          <button class="action-btn whatsapp-send-btn" @click="handleResendWhatsApp">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.977 0c3.222.001 6.252 1.256 8.529 3.536 2.277 2.278 3.53 5.31 3.528 8.53-.005 6.655-5.33 11.98-11.979 11.98-2.002-.001-3.97-.497-5.714-1.442L0 24zm6.59-4.846c1.666.988 3.311 1.485 5.32 1.488 5.626 0 10.201-4.576 10.205-10.2.002-2.724-1.056-5.285-2.977-7.208C17.279 1.312 14.72 .253 12 .25c-5.631 0-10.21 4.579-10.213 10.21-.002 1.902.485 3.759 1.411 5.389l-1.017 3.72 3.823-1.002zM17.065 14.1c-.277-.139-1.64-.81-1.895-.902-.255-.092-.441-.139-.626.139-.185.277-.718.902-.88 1.088-.163.186-.325.208-.602.069-.277-.14-1.17-.431-2.228-1.376-.824-.735-1.38-1.644-1.542-1.922-.163-.277-.018-.427.121-.566.125-.125.277-.324.417-.486.139-.162.186-.277.277-.462.093-.185.047-.348-.023-.487-.07-.139-.626-1.507-.858-2.064-.226-.543-.454-.47-.626-.478-.162-.007-.347-.007-.532-.007-.185 0-.486.07-.74.348-.255.277-.973.95-973 2.315 0 1.365.992 2.68 1.13 2.865.139.186 1.953 2.982 4.73 4.181.66.285 1.176.455 1.579.583.664.211 1.269.181 1.748.11.534-.08 1.64-.67 1.872-1.318.232-.647.232-1.203.163-1.318-.07-.115-.255-.162-.532-.3z"/>
            </svg>
            إعادة إرسال على الواتساب
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-view-container {
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
  color: #2c2520;
  margin-bottom: 2px;
}

.view-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.profile-section {
  padding: 1.25rem 1rem;
}

.form-group {
  margin-bottom: 0.85rem;
}

.form-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 700;
  color: #495057;
  margin-bottom: 4px;
}

.alert-msg {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  margin-bottom: 12px;
  text-align: center;
}

.alert-msg.success {
  background: rgba(55, 178, 77, 0.15);
  color: #37b24d;
  border: 1px solid rgba(55, 178, 77, 0.2);
}

.alert-msg.danger {
  background: rgba(230, 57, 70, 0.15);
  color: #e63946;
  border: 1px solid rgba(230, 57, 70, 0.2);
}

.orders-history-section {
  padding: 1.25rem 1rem;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: #2c2520;
  margin-bottom: 0.25rem;
}

.section-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin-bottom: 1rem;
}

.loading-orders {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 2rem 1rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.mini-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-orders {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-card {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  padding: 0.85rem;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px dashed rgba(255,255,255,0.05);
  padding-bottom: 6px;
  margin-bottom: 6px;
}

.order-date {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.order-status {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
}

.order-status.pending {
  background: rgba(253, 181, 24, 0.15);
  color: #fdb518;
}

.order-status.completed {
  background: rgba(55, 178, 77, 0.15);
  color: #37b24d;
}

.order-status.cancelled {
  background: rgba(230, 57, 70, 0.15);
  color: #e63946;
}

.order-summary-details {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.shop-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
}

.shop-badge.shop1 {
  background: #fdb518;
  color: #000;
}

.shop-badge.shop2 {
  background: #1e3a5f;
  color: #fff;
}

.price-mode-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
}

.order-items-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.order-item-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #495057;
}

.order-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed rgba(255,255,255,0.05);
  padding-top: 6px;
  font-size: 0.88rem;
  font-weight: 700;
}

.total-value {
  color: var(--primary-color);
}

.order-actions-row {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.btn-resend-whatsapp {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(37, 211, 102, 0.08);
  border: 1px solid rgba(37, 211, 102, 0.25);
  color: #20ba59;
  font-family: 'Cairo', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-resend-whatsapp:hover {
  background: #25d366;
  color: #ffffff;
  border-color: #25d366;
}

.btn-resend-whatsapp svg {
  transition: transform 0.2s ease;
}

.btn-resend-whatsapp:hover svg {
  transform: scale(1.1);
}

/* Modal Styling */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2200;
  padding: 1rem;
}

.message-preview-modal {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding-bottom: 8px;
}

.modal-title {
  font-size: 1rem;
  font-weight: 800;
  color: #2c2520;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: #868e96;
}

.close-btn:hover {
  color: #212529;
}

.modal-desc {
  font-size: 0.78rem;
  color: #6c757d;
  line-height: 1.4;
  margin: 0;
}

/* Screenshot Card */
.screenshot-area {
  background: #f0f2f5;
  background-image: radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 0);
  background-size: 16px 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-grow: 1;
  min-height: 0;
}

.chat-bubble-header {
  background: #075e54;
  color: #ffffff;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.app-logo-small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.2);
}

.app-logo-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-title-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.chat-sender-name {
  font-size: 0.8rem;
  font-weight: 700;
}

.chat-sender-status {
  font-size: 0.65rem;
  opacity: 0.8;
}

.message-body-wrapper {
  padding: 12px;
  display: flex;
  justify-content: flex-start;
}

.message-text-preview {
  margin: 0;
  background: #ffffff;
  border-radius: 8px;
  padding: 10px 12px;
  font-family: 'Cairo', sans-serif;
  font-size: 0.82rem;
  line-height: 1.5;
  color: #111b21;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 90%;
  box-shadow: 0 1px 0.5px rgba(11,20,26,.13);
  text-align: right;
  direction: rtl;
}

.screenshot-watermark {
  background: #e1e3e6;
  padding: 6px;
  text-align: center;
  font-size: 0.65rem;
  color: #868e96;
  border-top: 1px solid rgba(0,0,0,0.05);
  font-weight: 600;
}

.modal-actions-row {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.action-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: 'Cairo', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.copy-btn {
  background: rgba(0, 0, 0, 0.05);
  color: #495057;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.copy-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.whatsapp-send-btn {
  background: #25d366;
  color: #ffffff;
}

.whatsapp-send-btn:hover {
  background: #20ba59;
}
</style>
