<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

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

const handleSaveProfile = () => {
  if (!nameInput.value.trim() || !phoneInput.value.trim()) {
    message.value = 'يرجى كتابة الاسم ورقم الهاتف بشكل صحيح.';
    messageType.value = 'danger';
    return;
  }

  authStore.setIdentity(nameInput.value, phoneInput.value);
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
</script>

<template>
  <div class="account-view-container">
    <header class="view-header glass-panel">
      <h1 class="view-title">👤 حسابي الشخصي</h1>
      <p class="view-desc">تعديل بياناتك وتصفح أرشيف طلباتك السابقة</p>
    </header>

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
  color: #fff;
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
  color: rgba(255, 255, 255, 0.8);
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
  color: #fff;
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
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
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
  color: rgba(255, 255, 255, 0.8);
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
</style>
