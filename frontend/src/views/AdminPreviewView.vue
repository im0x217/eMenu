<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useShopStore } from '../stores/shop';
import { useToastStore } from '../stores/toast';
import { triggerHaptic } from '../utils/haptics';
import { normalizeImageUrl } from '../utils/imageCache';

const router = useRouter();
const shopStore = useShopStore();
const toastStore = useToastStore();

// State
const activeShop = ref('shop1'); // 'shop1' | 'shop2'
const currentTab = ref('orders'); // 'orders' | 'products' | 'insights'
const orders = ref([]);
const products = ref([]);
const categories = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');
const statusFilter = ref('all'); // 'all' | 'pending' | 'ready' | 'received' | 'cancelled'
const selectedOrder = ref(null);
const showDetailSheet = ref(false);

// Active Category for Products tab
const activeProductCategory = ref('all');
const productSearchQuery = ref('');

// Switch Active Shop
const switchShop = async (shopKey) => {
  if (activeShop.value === shopKey) return;
  triggerHaptic('selection');
  activeShop.value = shopKey;
  shopStore.setShop(shopKey);
  await loadAllData();
};

// Data Fetching with graceful fallback
const loadAllData = async () => {
  isLoading.value = true;
  try {
    const token = localStorage.getItem('admin_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    // 1. Fetch Orders
    const ordersUrl = `/api/admin/orders?shop=${activeShop.value}`;
    const ordersRes = await fetch(ordersUrl, { headers }).catch(() => null);
    if (ordersRes && ordersRes.ok) {
      const data = await ordersRes.json();
      orders.value = Array.isArray(data) ? data : (data.orders || []);
    } else {
      // Mock/Demo order data if API requires login so preview is immediately functional
      orders.value = [
        {
          _id: 'ord-101',
          orderNumber: 1042,
          createdAt: new Date().toISOString(),
          customerInfo: { name: 'طارق الزوي', phone: '0912345678', address: 'طرابلس - حي الأندلس' },
          priceMode: 'retail',
          status: 'pending',
          deliveryDate: 'اليوم - 06:30 مساءً',
          notes: 'يرجى كتابة "عيد ميلاد سعيد سارة" على الكعكة',
          totalPrice: 135,
          items: [
            { name: 'كعكة شوكولاتة فاخرة (وسط)', quantity: 1, price: 95 },
            { name: 'تارت فواكه مشكلة', quantity: 2, price: 20 }
          ]
        },
        {
          _id: 'ord-102',
          orderNumber: 1041,
          createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          customerInfo: { name: 'فاطمة بن علي', phone: '0925551234', address: 'مصراتة - شارع طرابلس' },
          priceMode: 'retail',
          status: 'ready',
          deliveryDate: 'استلام من المحل',
          notes: '',
          totalPrice: 85,
          items: [
            { name: 'تشكيلة بقلاوة فستق (1 كغ)', quantity: 1, price: 85 }
          ]
        },
        {
          _id: 'ord-103',
          orderNumber: 1040,
          createdAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
          customerInfo: { name: 'سالم الورفلي', phone: '0944449876', address: 'طرابلس - زاوية الدهماني' },
          priceMode: 'wholesale',
          status: 'received',
          deliveryDate: 'تم التوصيل',
          notes: 'طلبية كافيه ومطعم رويال',
          totalPrice: 420,
          items: [
            { name: 'كرواسون زبدة فرنسي (صندوق 24)', quantity: 2, price: 160 },
            { name: 'دونات نوتيلا ولوتس (صندوق 12)', quantity: 2, price: 50 }
          ]
        },
        {
          _id: 'ord-104',
          orderNumber: 1039,
          createdAt: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
          customerInfo: { name: 'عمر القرقني', phone: '0917774433', address: 'طرابلس - النوفليين' },
          priceMode: 'retail',
          status: 'cancelled',
          deliveryDate: 'تم الإلغاء',
          notes: 'العميل قام بالإلغاء لظروف خاصة',
          totalPrice: 65,
          items: [
            { name: 'تشيز كيك لوتس فاميلي', quantity: 1, price: 65 }
          ]
        }
      ];
    }

    // 2. Fetch Products & Categories
    const prodEndpoint = activeShop.value === 'shop2' ? '/api/shop2/products' : '/api/products';
    const catEndpoint = activeShop.value === 'shop2' ? '/api/shop2/categories' : '/api/categories';
    
    const [pRes, cRes] = await Promise.all([
      fetch(prodEndpoint).catch(() => null),
      fetch(catEndpoint).catch(() => null)
    ]);

    if (pRes && pRes.ok) {
      products.value = await pRes.json();
    }
    if (cRes && cRes.ok) {
      categories.value = await cRes.json();
    }
  } catch (err) {
    console.error('Error loading admin preview data:', err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadAllData();
});

// Format Price in Libyan Dinars
const formatPrice = (val) => {
  const num = Number(val) || 0;
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
};

// Format Relative Time in Arabic
const formatTimeAgo = (isoString) => {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
};

// KPI Metrics Computations
const kpis = computed(() => {
  const list = orders.value || [];
  
  // Total Revenue (Received or Ready orders)
  const revenue = list
    .filter(o => o.status === 'received' || o.status === 'ready')
    .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);

  // Active Queue (Pending + Ready)
  const activeQueue = list.filter(o => o.status === 'pending' || o.status === 'ready').length;

  // Average Ticket
  const validOrders = list.filter(o => o.status !== 'cancelled');
  const avgTicket = validOrders.length > 0 ? (revenue / validOrders.length) : 0;

  return {
    revenue,
    totalOrders: list.length,
    activeQueue,
    avgTicket
  };
});

// Filtered Orders
const filteredOrders = computed(() => {
  let list = orders.value || [];
  
  if (statusFilter.value !== 'all') {
    list = list.filter(o => o.status === statusFilter.value);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(o => 
      o.customerInfo?.name?.toLowerCase().includes(q) ||
      o.customerInfo?.phone?.includes(q) ||
      String(o.orderNumber || o._id).includes(q) ||
      o.items?.some(i => i.name?.toLowerCase().includes(q))
    );
  }

  return list;
});

// Orders Count by Status
const statusCounts = computed(() => {
  const counts = { all: 0, pending: 0, ready: 0, received: 0, cancelled: 0 };
  (orders.value || []).forEach(o => {
    counts.all++;
    if (counts[o.status] !== undefined) {
      counts[o.status]++;
    }
  });
  return counts;
});

// Update Order Status with Optimistic UI & Toast
const updateOrderStatus = async (order, newStatus) => {
  if (order.status === newStatus) return;
  triggerHaptic('medium');
  const prevStatus = order.status;
  order.status = newStatus;

  try {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`/api/admin/orders/${order._id}/status?shop=${activeShop.value}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ status: newStatus })
    }).catch(() => null);

    const statusLabels = {
      pending: 'قيد الانتظار',
      ready: 'جاهز للاستلام',
      received: 'تم الاستلام والتسليم',
      cancelled: 'تم الإلغاء'
    };

    toastStore.show(`تم تحديث الطلب #${order.orderNumber || ''} إلى: ${statusLabels[newStatus]}`, 'success', 2200);
  } catch (e) {
    console.error('Failed to update status:', e);
    order.status = prevStatus;
    toastStore.show('تعذر تحديث حالة الطلب في الخادم', 'danger', 2500);
  }
};

// Customer Action Helpers
const callCustomer = (phone) => {
  triggerHaptic('light');
  if (!phone) return;
  window.location.href = `tel:${phone}`;
};

const openWhatsApp = (phone, customerName, orderNumber) => {
  triggerHaptic('light');
  if (!phone) return;
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const international = cleanPhone.startsWith('0') 
    ? `218${cleanPhone.slice(1)}` 
    : (cleanPhone.startsWith('218') ? cleanPhone : `218${cleanPhone}`);
  
  const text = encodeURIComponent(`مرحباً أستاذ ${customerName || 'الكريم'}، بخصوص طلبك #${orderNumber || ''} من متجر e-Menu: `);
  window.open(`https://wa.me/${international}?text=${text}`, '_blank');
};

// Filtered Products
const filteredProducts = computed(() => {
  let list = products.value || [];
  if (activeProductCategory.value !== 'all') {
    list = list.filter(p => p.category === activeProductCategory.value);
  }
  if (productSearchQuery.value.trim()) {
    const q = productSearchQuery.value.trim().toLowerCase();
    list = list.filter(p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
  }
  return list;
});

// Toggle Product Availability
const toggleProductAvailability = (product) => {
  triggerHaptic('selection');
  product.isAvailable = product.isAvailable === false ? true : false;
  toastStore.show(
    `تم تعيين "${product.name}" كـ ${product.isAvailable ? 'متوفر' : 'غير متوفر'}`,
    product.isAvailable ? 'success' : 'warning',
    2000
  );
};

// Inspector Modal Details
const openOrderDetails = (order) => {
  triggerHaptic('light');
  selectedOrder.value = order;
  showDetailSheet.value = true;
};

const closeOrderDetails = () => {
  showDetailSheet.value = false;
  selectedOrder.value = null;
};
</script>

<template>
  <div class="admin-preview-page" dir="rtl">
    <!-- Top Executive Control Bar -->
    <header class="executive-topbar">
      <div class="topbar-inner">
        <div class="brand-cluster">
          <div class="brand-badge-pulse" aria-hidden="true">
            <span class="pulse-dot"></span>
          </div>
          <div>
            <div class="title-with-pill">
              <h1 class="brand-heading">مركز العمليات الذكي</h1>
              <span class="badge-v2">V2 Concept</span>
            </div>
            <p class="brand-subtext">إدارة سريعة ومتقدمة لطلبات ومبيعات المتجر</p>
          </div>
        </div>

        <!-- Segmented Shop Switcher -->
        <div class="shop-segmented-switch" role="radiogroup" aria-label="اختيار المتجر">
          <button 
            type="button" 
            class="switch-pill" 
            :class="{ active: activeShop === 'shop1' }" 
            @click="switchShop('shop1')"
          >
            المتجر الرئيسي
          </button>
          <button 
            type="button" 
            class="switch-pill" 
            :class="{ active: activeShop === 'shop2' }" 
            @click="switchShop('shop2')"
          >
            قسم النواشف
          </button>
        </div>

        <!-- Exit / Return to Original Admin Button -->
        <button 
          type="button" 
          @click="router.push('/admin')" 
          class="btn-exit-preview" 
          title="العودة للوحة الإدارة الحالية"
          aria-label="العودة للوحة الإدارة الحالية"
        >
          <span>لوحة التحكم الأصلية</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="executive-main-container">
      <!-- Executive KPI Cards -->
      <section class="kpi-grid-row" aria-label="مؤشرات الأداء اللحظية">
        <!-- KPI 1: Total Revenue -->
        <article class="kpi-card revenue-card">
          <div class="kpi-icon-wrap" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
          <div class="kpi-body">
            <span class="kpi-label">مبيعات اليوم النشطة</span>
            <div class="kpi-value-wrap">
              <span class="kpi-value">{{ formatPrice(kpis.revenue) }}</span>
              <span class="kpi-curr">د.ل</span>
            </div>
            <span class="kpi-sub-badge positive">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg>
              محدث لحظياً
            </span>
          </div>
        </article>

        <!-- KPI 2: Active Orders Queue -->
        <article class="kpi-card queue-card">
          <div class="kpi-icon-wrap" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <div class="kpi-body">
            <span class="kpi-label">قيد التجهيز بالمطبخ</span>
            <div class="kpi-value-wrap">
              <span class="kpi-value">{{ kpis.activeQueue }}</span>
              <span class="kpi-curr">طلبات</span>
            </div>
            <span class="kpi-sub-badge queue-badge">جاهزية فورية</span>
          </div>
        </article>

        <!-- KPI 3: Total Orders -->
        <article class="kpi-card orders-card">
          <div class="kpi-icon-wrap" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
          </div>
          <div class="kpi-body">
            <span class="kpi-label">إجمالي الطلبات الواردة</span>
            <div class="kpi-value-wrap">
              <span class="kpi-value">{{ kpis.totalOrders }}</span>
              <span class="kpi-curr">طلب</span>
            </div>
            <span class="kpi-sub-badge neutral">لكل الحالات</span>
          </div>
        </article>

        <!-- KPI 4: Average Ticket -->
        <article class="kpi-card ticket-card">
          <div class="kpi-icon-wrap" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
          </div>
          <div class="kpi-body">
            <span class="kpi-label">متوسط قيمة الطلب</span>
            <div class="kpi-value-wrap">
              <span class="kpi-value">{{ formatPrice(kpis.avgTicket) }}</span>
              <span class="kpi-curr">د.ل</span>
            </div>
            <span class="kpi-sub-badge neutral">معدل الفاتورة</span>
          </div>
        </article>
      </section>

      <!-- Desktop View Navigation Tabs -->
      <nav class="executive-nav-tabs" role="tablist" aria-label="أقسام العمليات">
        <button 
          type="button" 
          role="tab" 
          class="nav-tab-btn" 
          :class="{ active: currentTab === 'orders' }" 
          @click="currentTab = 'orders'; triggerHaptic('selection');"
          :aria-selected="currentTab === 'orders'"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span>إدارة الطلبات الحية</span>
          <span class="tab-badge">{{ statusCounts.all }}</span>
        </button>
        <button 
          type="button" 
          role="tab" 
          class="nav-tab-btn" 
          :class="{ active: currentTab === 'products' }" 
          @click="currentTab = 'products'; triggerHaptic('selection');"
          :aria-selected="currentTab === 'products'"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          <span>مصفوفة المنتجات</span>
          <span class="tab-badge">{{ products.length }}</span>
        </button>
      </nav>

      <!-- TAB 1: ORDERS OPERATIONS HUB -->
      <section v-if="currentTab === 'orders'" class="tab-content-section" aria-label="لوحة الطلبات">
        <!-- Filter Controls Bar -->
        <div class="orders-toolbar-bar">
          <!-- Search Bar -->
          <div class="search-input-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" class="search-icon" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="search" 
              v-model="searchQuery" 
              placeholder="ابحث برقم الطلب، اسم العميل، أو الهاتف…" 
              class="toolbar-search-input"
              aria-label="البحث في الطلبات"
            />
            <button v-if="searchQuery" type="button" @click="searchQuery = ''" class="clear-search-btn" aria-label="مسح البحث">&times;</button>
          </div>

          <!-- Status Segmented Filter Pills -->
          <div class="status-filter-pills" role="radiogroup" aria-label="تصفية الطلبات حسب الحالة">
            <button 
              type="button" 
              class="filter-pill" 
              :class="{ active: statusFilter === 'all' }" 
              @click="statusFilter = 'all'; triggerHaptic('selection');"
            >
              الكل ({{ statusCounts.all }})
            </button>
            <button 
              type="button" 
              class="filter-pill pending" 
              :class="{ active: statusFilter === 'pending' }" 
              @click="statusFilter = 'pending'; triggerHaptic('selection');"
            >
              ⏳ قيد الانتظار ({{ statusCounts.pending }})
            </button>
            <button 
              type="button" 
              class="filter-pill ready" 
              :class="{ active: statusFilter === 'ready' }" 
              @click="statusFilter = 'ready'; triggerHaptic('selection');"
            >
              📦 جاهز ({{ statusCounts.ready }})
            </button>
            <button 
              type="button" 
              class="filter-pill received" 
              :class="{ active: statusFilter === 'received' }" 
              @click="statusFilter = 'received'; triggerHaptic('selection');"
            >
              ✅ تم الاستلام ({{ statusCounts.received }})
            </button>
            <button 
              type="button" 
              class="filter-pill cancelled" 
              :class="{ active: statusFilter === 'cancelled' }" 
              @click="statusFilter = 'cancelled'; triggerHaptic('selection');"
            >
              ❌ ملغي ({{ statusCounts.cancelled }})
            </button>
          </div>
        </div>

        <!-- Orders Cards Grid -->
        <div v-if="isLoading" class="admin-skel-container" aria-busy="true">
          <div v-for="n in 3" :key="'skel-o-' + n" class="admin-skel-card skeleton-shimmer"></div>
        </div>

        <div v-else-if="filteredOrders.length === 0" class="admin-empty-state">
          <div class="empty-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
          </div>
          <h3>لا توجد طلبات مطابقة</h3>
          <p>لم يتم العثور على أي طلبات في هذه الحالة أو بكلمة البحث المدخلة</p>
        </div>

        <div v-else class="orders-cards-list">
          <article 
            v-for="order in filteredOrders" 
            :key="order._id" 
            class="order-v2-card"
            :class="'status-' + order.status"
            @click="openOrderDetails(order)"
          >
            <!-- Card Header: Number, Customer & Time -->
            <div class="order-card-header">
              <div class="order-id-group">
                <span class="order-hash-badge">#{{ order.orderNumber || order._id.slice(-4) }}</span>
                <h3 class="customer-name">{{ order.customerInfo?.name || 'عميل نقدي' }}</h3>
                <span v-if="order.priceMode === 'wholesale'" class="wholesale-tag">جملة</span>
              </div>
              <div class="order-time-group">
                <span class="order-time-label">{{ formatTimeAgo(order.createdAt) }}</span>
                <span class="delivery-status-tag" :class="order.status">
                  {{ order.status === 'pending' ? 'قيد التجهيز' : order.status === 'ready' ? 'جاهز للاستلام' : order.status === 'received' ? 'مكتمل ومسلّم' : 'ملغي' }}
                </span>
              </div>
            </div>

            <!-- Items Quick Summary -->
            <div class="order-items-snippet">
              <ul class="items-list">
                <li v-for="(item, idx) in (order.items || []).slice(0, 3)" :key="idx" class="item-row">
                  <span class="item-name">{{ item.name }}</span>
                  <span class="item-qty">×{{ item.quantity }}</span>
                </li>
              </ul>
              <span v-if="(order.items || []).length > 3" class="more-items-chip">
                + {{ order.items.length - 3 }} أصناف إضافية
              </span>
            </div>

            <!-- Card Note / Address if present -->
            <p v-if="order.notes" class="order-note-alert">
              <span class="note-icon" aria-hidden="true">💬</span>
              <span>{{ order.notes }}</span>
            </p>

            <!-- Card Bottom Row: Total Price, Segmented Status Selector & Quick Comms -->
            <div class="order-card-bottom" @click.stop>
              <div class="total-price-group">
                <span class="total-label">الإجمالي:</span>
                <span class="total-amount">{{ formatPrice(order.totalPrice) }}</span>
                <span class="total-curr">د.ل</span>
              </div>

              <!-- Unified 4-Button Segmented Icon Status Selector -->
              <div class="desktop-status-segmented" role="radiogroup" aria-label="تغيير حالة الطلب">
                <!-- Pending (⏳) -->
                <button 
                  type="button" 
                  class="desktop-status-btn pending" 
                  :class="{ active: order.status === 'pending' }" 
                  @click="updateOrderStatus(order, 'pending')" 
                  title="قيد الانتظار" 
                  aria-label="قيد الانتظار"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </button>
                <!-- Ready (📦) -->
                <button 
                  type="button" 
                  class="desktop-status-btn ready" 
                  :class="{ active: order.status === 'ready' }" 
                  @click="updateOrderStatus(order, 'ready')" 
                  title="جاهز للاستلام" 
                  aria-label="جاهز للاستلام"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </button>
                <!-- Received (✅) -->
                <button 
                  type="button" 
                  class="desktop-status-btn received" 
                  :class="{ active: order.status === 'received' }" 
                  @click="updateOrderStatus(order, 'received')" 
                  title="تم الاستلام والتسليم" 
                  aria-label="تم الاستلام والتسليم"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
                <!-- Cancelled (❌) -->
                <button 
                  type="button" 
                  class="desktop-status-btn cancelled" 
                  :class="{ active: order.status === 'cancelled' }" 
                  @click="updateOrderStatus(order, 'cancelled')" 
                  title="ملغي" 
                  aria-label="ملغي"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <!-- Quick Communication Action Buttons -->
              <div class="comms-actions-group">
                <button 
                  type="button" 
                  class="btn-action-circle call" 
                  @click="callCustomer(order.customerInfo?.phone)" 
                  title="اتصال هاتفي بالعميل" 
                  aria-label="اتصال بالعميل"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </button>
                <button 
                  type="button" 
                  class="btn-action-circle wa" 
                  @click="openWhatsApp(order.customerInfo?.phone, order.customerInfo?.name, order.orderNumber)" 
                  title="مراسلة العميل عبر واتساب" 
                  aria-label="مراسلة عبر واتساب"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- TAB 2: PRODUCT CATALOG MATRIX -->
      <section v-else-if="currentTab === 'products'" class="tab-content-section" aria-label="مصفوفة المنتجات">
        <!-- Products Toolbar -->
        <div class="orders-toolbar-bar">
          <div class="search-input-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" class="search-icon" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="search" 
              v-model="productSearchQuery" 
              placeholder="ابحث في أسماء الأصناف أو الوصف…" 
              class="toolbar-search-input"
              aria-label="البحث في المنتجات"
            />
          </div>

          <!-- Category Pills -->
          <div class="status-filter-pills" role="radiogroup" aria-label="تصفية حسب القسم">
            <button 
              type="button" 
              class="filter-pill" 
              :class="{ active: activeProductCategory === 'all' }" 
              @click="activeProductCategory = 'all'; triggerHaptic('selection');"
            >
              جميع الأقسام ({{ products.length }})
            </button>
            <button 
              v-for="cat in categories" 
              :key="cat._id" 
              type="button" 
              class="filter-pill" 
              :class="{ active: activeProductCategory === cat.name }" 
              @click="activeProductCategory = cat.name; triggerHaptic('selection');"
            >
              {{ cat.name }}
            </button>
          </div>
        </div>

        <!-- Products Visual Cards -->
        <div class="products-grid-container">
          <article 
            v-for="prod in filteredProducts" 
            :key="prod._id" 
            class="product-matrix-card"
            :class="{ 'is-disabled': prod.isAvailable === false }"
          >
            <div class="prod-img-wrap">
              <img 
                :src="normalizeImageUrl(prod.imgSigned || prod.img)" 
                :alt="prod.name" 
                loading="lazy" 
                class="prod-thumb" 
                @error="$event.target.src = activeShop === 'shop2' ? '/res/logo2.jpg.jpeg' : '/res/logo.jpg'"
              />
              <span class="category-badge">{{ prod.category }}</span>
            </div>

            <div class="prod-info-block">
              <h3 class="prod-name">{{ prod.name }}</h3>
              <p v-if="prod.description" class="prod-desc">{{ prod.description }}</p>

              <div class="prod-price-row">
                <div class="price-pill">
                  <span class="price-val">{{ formatPrice(prod.price) }}</span>
                  <span class="price-unit">د.ل</span>
                </div>
                <div v-if="prod.wholesalePrice" class="wholesale-price-pill" title="سعر الجملة">
                  <span class="ws-tag">جملة:</span>
                  <span class="ws-val">{{ formatPrice(prod.wholesalePrice) }}</span>
                  <span class="ws-curr">د.ل</span>
                </div>
              </div>

              <!-- Quick Stock Availability Toggle -->
              <div class="availability-toggle-row">
                <span class="avail-label">{{ prod.isAvailable === false ? 'غير متوفر حالياً' : 'متوفر للطلب' }}</span>
                <button 
                  type="button" 
                  class="toggle-switch-btn" 
                  :class="{ 'checked': prod.isAvailable !== false }" 
                  @click="toggleProductAvailability(prod)"
                  :aria-label="prod.isAvailable === false ? 'تفعيل توفر المنتج' : 'تعطيل توفر المنتج'"
                >
                  <span class="toggle-track">
                    <span class="toggle-handle"></span>
                  </span>
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>

    <!-- Mobile Bottom Navigation Dock -->
    <nav class="mobile-executive-dock" aria-label="التنقل الرئيسي للهاتف">
      <button 
        type="button" 
        class="dock-item" 
        :class="{ active: currentTab === 'orders' }" 
        @click="currentTab = 'orders'; triggerHaptic('selection');"
        aria-label="الطلبات الحية"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
        <span class="dock-label">الطلبات</span>
      </button>

      <button 
        type="button" 
        class="dock-item" 
        :class="{ active: currentTab === 'products' }" 
        @click="currentTab = 'products'; triggerHaptic('selection');"
        aria-label="المنتجات"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        <span class="dock-label">المنتجات</span>
      </button>

      <button 
        type="button" 
        class="dock-item" 
        @click="router.push('/admin')"
        aria-label="لوحة الإدارة الأصلية"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        <span class="dock-label">الإعدادات</span>
      </button>
    </nav>

    <!-- Slide-Up Bottom Sheet / Inspector Modal -->
    <Teleport to="body">
      <Transition name="modal-sheet">
        <div 
          v-if="showDetailSheet && selectedOrder" 
          class="sheet-backdrop" 
          role="dialog" 
          aria-modal="true" 
          :aria-label="'تفاصيل الطلب رقم ' + (selectedOrder.orderNumber || '')"
          @click.self="closeOrderDetails"
        >
          <div class="sheet-modal-content" @click.stop>
            <div class="sheet-drag-handle" aria-hidden="true"></div>
            
            <header class="sheet-header">
              <div class="sheet-title-wrap">
                <span class="sheet-badge">#{{ selectedOrder.orderNumber || selectedOrder._id.slice(-4) }}</span>
                <h2>تفاصيل الطلب</h2>
              </div>
              <button type="button" @click="closeOrderDetails" class="sheet-close-btn" aria-label="إغلاق">&times;</button>
            </header>

            <div class="sheet-body-scroll">
              <!-- Customer Profile Summary -->
              <section class="sheet-section customer-summary">
                <div class="summary-line">
                  <span class="label">اسم العميل:</span>
                  <span class="val font-bold">{{ selectedOrder.customerInfo?.name || 'عميل نقدي' }}</span>
                </div>
                <div class="summary-line">
                  <span class="label">رقم الهاتف:</span>
                  <a :href="'tel:' + selectedOrder.customerInfo?.phone" class="phone-link">{{ selectedOrder.customerInfo?.phone || 'غير مسجل' }}</a>
                </div>
                <div v-if="selectedOrder.customerInfo?.address" class="summary-line">
                  <span class="label">عنوان التوصيل:</span>
                  <span class="val">{{ selectedOrder.customerInfo?.address }}</span>
                </div>
                <div class="summary-line">
                  <span class="label">طريقة التسعير:</span>
                  <span class="price-mode-tag" :class="selectedOrder.priceMode">
                    {{ selectedOrder.priceMode === 'wholesale' ? 'أسعار الجملة' : 'قطاعي عادي' }}
                  </span>
                </div>
              </section>

              <!-- Order Items Breakdown -->
              <section class="sheet-section">
                <h3 class="section-heading">قائمة الأصناف المطلوبة</h3>
                <div class="sheet-items-table">
                  <div v-for="(item, idx) in selectedOrder.items" :key="idx" class="sheet-item-row">
                    <div class="item-main">
                      <span class="item-title">{{ item.name }}</span>
                      <span class="item-unit-price">{{ formatPrice(item.price) }} د.ل × {{ item.quantity }}</span>
                    </div>
                    <span class="item-subtotal">{{ formatPrice(Number(item.price) * Number(item.quantity)) }} د.ل</span>
                  </div>
                </div>
              </section>

              <!-- Notes Alert -->
              <div v-if="selectedOrder.notes" class="sheet-notes-box">
                <span class="notes-badge">ملاحظات العميل:</span>
                <p>{{ selectedOrder.notes }}</p>
              </div>

              <!-- Total Calculation -->
              <div class="sheet-total-block">
                <span>المبلغ الإجمالي النهائي</span>
                <div class="total-fig">
                  <span class="fig-val">{{ formatPrice(selectedOrder.totalPrice) }}</span>
                  <span class="fig-curr">دينار ليبي</span>
                </div>
              </div>
            </div>

            <!-- Sheet Bottom Action Buttons -->
            <footer class="sheet-footer">
              <button 
                type="button" 
                class="sheet-btn call-btn" 
                @click="callCustomer(selectedOrder.customerInfo?.phone)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <span>اتصال هاتفي</span>
              </button>
              <button 
                type="button" 
                class="sheet-btn wa-btn" 
                @click="openWhatsApp(selectedOrder.customerInfo?.phone, selectedOrder.customerInfo?.name, selectedOrder.orderNumber)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                <span>واتساب</span>
              </button>
            </footer>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.admin-preview-page {
  min-height: 100vh;
  background: #0b1120;
  color: #f8fafc;
  font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding-bottom: 84px;
}

/* ============================================================
   TOP EXECUTIVE CONTROL BAR
============================================================ */
.executive-topbar {
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  position: sticky;
  top: 0;
  z-index: 50;
}

.topbar-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.brand-cluster {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-badge-pulse {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 12px #10b981;
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.title-with-pill {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-heading {
  font-size: 1.15rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
  letter-spacing: -0.02em;
}

.badge-v2 {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: #ffffff;
}

.brand-subtext {
  font-size: 0.76rem;
  color: #94a3b8;
  margin: 0;
}

/* Shop Segmented Switcher */
.shop-segmented-switch {
  display: inline-flex;
  background: rgba(30, 41, 59, 0.7);
  padding: 4px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  gap: 4px;
}

.switch-pill {
  padding: 8px 16px;
  font-size: 0.82rem;
  font-weight: 700;
  border: none;
  background: transparent;
  color: #94a3b8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  min-height: 44px;
}

.switch-pill.active {
  background: #3b82f6;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.35);
}

.btn-exit-preview {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
}

.btn-exit-preview:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

/* ============================================================
   MAIN EXECUTIVE CONTAINER & KPIS
============================================================ */
.executive-main-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* KPI Cards Grid */
.kpi-grid-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.kpi-card {
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.2s, border-color 0.2s;
}

.kpi-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.18);
}

.kpi-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.revenue-card .kpi-icon-wrap {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.queue-card .kpi-icon-wrap {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.orders-card .kpi-icon-wrap {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.ticket-card .kpi-icon-wrap {
  background: rgba(168, 85, 247, 0.15);
  color: #a855f7;
}

.kpi-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kpi-label {
  font-size: 0.78rem;
  color: #94a3b8;
  font-weight: 600;
}

.kpi-value-wrap {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.kpi-value {
  font-size: 1.55rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.02em;
}

.kpi-curr {
  font-size: 0.85rem;
  font-weight: 700;
  color: #cbd5e1;
}

.kpi-sub-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
  width: fit-content;
}

.kpi-sub-badge.positive {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.kpi-sub-badge.queue-badge {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.kpi-sub-badge.neutral {
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
}

/* ============================================================
   NAVIGATION TABS (DESKTOP)
============================================================ */
.executive-nav-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 8px;
}

.nav-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 48px;
}

.nav-tab-btn.active {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.tab-badge {
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 0.75rem;
  color: #cbd5e1;
}

/* ============================================================
   ORDERS TOOLBAR & FILTER PILLS
============================================================ */
.orders-toolbar-bar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(30, 41, 59, 0.4);
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.search-input-wrap {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  pointer-events: none;
}

.toolbar-search-input {
  width: 100%;
  padding: 12px 42px 12px 36px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: #ffffff;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.toolbar-search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
}

.clear-search-btn {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
}

.status-filter-pills {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}

.filter-pill {
  padding: 8px 14px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.5);
  color: #94a3b8;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  min-height: 40px;
}

.filter-pill.active {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.3);
}

.filter-pill.pending.active {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border-color: #f59e0b;
}

.filter-pill.ready.active {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  border-color: #3b82f6;
}

.filter-pill.received.active {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border-color: #10b981;
}

.filter-pill.cancelled.active {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border-color: #ef4444;
}

/* ============================================================
   ORDERS CARDS LIST
============================================================ */
.orders-cards-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.order-v2-card {
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: transform 0.18s, border-color 0.18s, background 0.18s;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-v2-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(30, 41, 59, 0.85);
}

.order-v2-card.status-pending { border-right: 4px solid #f59e0b; }
.order-v2-card.status-ready { border-right: 4px solid #3b82f6; }
.order-v2-card.status-received { border-right: 4px solid #10b981; }
.order-v2-card.status-cancelled { border-right: 4px solid #ef4444; opacity: 0.75; }

.order-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.order-id-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.order-hash-badge {
  font-family: monospace;
  font-size: 0.92rem;
  font-weight: 800;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #38bdf8;
}

.customer-name {
  font-size: 1.05rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
}

.wholesale-tag {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(168, 85, 247, 0.2);
  color: #c084fc;
}

.order-time-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.order-time-label {
  font-size: 0.78rem;
  color: #94a3b8;
}

.delivery-status-tag {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
}

.delivery-status-tag.pending { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.delivery-status-tag.ready { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.delivery-status-tag.received { background: rgba(16, 185, 129, 0.2); color: #34d399; }
.delivery-status-tag.cancelled { background: rgba(239, 68, 68, 0.2); color: #f87171; }

.order-items-snippet {
  background: rgba(15, 23, 42, 0.5);
  padding: 10px 12px;
  border-radius: 10px;
}

.items-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #cbd5e1;
}

.item-qty {
  font-weight: 700;
  color: #38bdf8;
}

.more-items-chip {
  display: block;
  margin-top: 4px;
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 600;
}

.order-note-alert {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.8rem;
  color: #fde68a;
  margin: 0;
}

/* Card Bottom Row */
.order-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.total-price-group {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.total-label {
  font-size: 0.8rem;
  color: #94a3b8;
}

.total-amount {
  font-size: 1.25rem;
  font-weight: 800;
  color: #10b981;
}

.total-curr {
  font-size: 0.82rem;
  font-weight: 700;
  color: #cbd5e1;
}

/* Segmented 4-Button Status Selector */
.desktop-status-segmented {
  display: inline-flex;
  align-items: center;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 3px;
  gap: 4px;
}

.desktop-status-btn {
  width: 44px;
  height: 44px;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s ease;
  position: relative;
}

.desktop-status-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.desktop-status-btn.pending.active {
  background: #f59e0b;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
}

.desktop-status-btn.ready.active {
  background: #3b82f6;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.desktop-status-btn.received.active {
  background: #10b981;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
}

.desktop-status-btn.cancelled.active {
  background: #ef4444;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
}

/* Quick Comms Action Buttons */
.comms-actions-group {
  display: flex;
  gap: 8px;
}

.btn-action-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.18s, background 0.18s;
  position: relative;
}

.btn-action-circle.call {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.btn-action-circle.call:hover {
  background: #3b82f6;
  color: #ffffff;
  transform: scale(1.05);
}

.btn-action-circle.wa {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.btn-action-circle.wa:hover {
  background: #10b981;
  color: #ffffff;
  transform: scale(1.05);
}

/* ============================================================
   PRODUCT CATALOG MATRIX
============================================================ */
.products-grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 14px;
}

.product-matrix-card {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.2s;
}

.product-matrix-card.is-disabled {
  opacity: 0.6;
  filter: grayscale(40%);
}

.prod-img-wrap {
  position: relative;
  width: 100%;
  height: 160px;
  background: #1e293b;
  overflow: hidden;
}

.prod-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.category-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(8px);
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
}

.prod-info-block {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.prod-name {
  font-size: 1rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
}

.prod-desc {
  font-size: 0.78rem;
  color: #94a3b8;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.prod-price-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.price-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 4px 10px;
  border-radius: 8px;
}

.price-val {
  font-size: 1.1rem;
  font-weight: 800;
  color: #34d399;
}

.price-unit {
  font-size: 0.75rem;
  font-weight: 700;
  color: #a7f3d0;
}

.wholesale-price-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  background: rgba(168, 85, 247, 0.15);
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 0.76rem;
  color: #c084fc;
}

.availability-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.avail-label {
  font-size: 0.8rem;
  color: #cbd5e1;
  font-weight: 600;
}

.toggle-switch-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  min-width: 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-track {
  width: 44px;
  height: 24px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 9999px;
  position: relative;
  transition: background 0.2s;
}

.toggle-switch-btn.checked .toggle-track {
  background: #10b981;
}

.toggle-handle {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  position: absolute;
  top: 3px;
  right: 3px;
  transition: transform 0.2s;
}

.toggle-switch-btn.checked .toggle-handle {
  transform: translateX(-20px);
}

/* ============================================================
   MOBILE BOTTOM DOCK
============================================================ */
.mobile-executive-dock {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 16px env(safe-area-inset-bottom, 6px) 16px;
  z-index: 90;
  justify-content: space-around;
  align-items: center;
}

.dock-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  padding: 6px 12px;
  min-width: 48px;
  min-height: 48px;
}

.dock-item.active {
  color: #38bdf8;
}

@media (max-width: 768px) {
  .mobile-executive-dock {
    display: flex;
  }
  .executive-nav-tabs {
    display: none;
  }
}

/* ============================================================
   SLIDE-UP BOTTOM SHEET / MODAL
============================================================ */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(11, 17, 32, 0.7);
  backdrop-filter: blur(6px);
  z-index: 99999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet-modal-content {
  width: 100%;
  max-width: 580px;
  background: #1e293b;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.5);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  animation: sheetPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes sheetPop {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.sheet-drag-handle {
  width: 44px;
  height: 5px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.2);
  margin: 12px auto 6px auto;
}

.sheet-header {
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.sheet-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sheet-title-wrap h2 {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0;
  color: #ffffff;
}

.sheet-badge {
  background: #3b82f6;
  color: #ffffff;
  font-family: monospace;
  font-size: 0.85rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 6px;
}

.sheet-close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.8rem;
  cursor: pointer;
  line-height: 1;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sheet-body-scroll {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sheet-section {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 12px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.summary-line {
  display: flex;
  justify-content: space-between;
  font-size: 0.88rem;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.summary-line:last-child {
  border-bottom: none;
}

.summary-line .label {
  color: #94a3b8;
}

.summary-line .phone-link {
  color: #38bdf8;
  text-decoration: none;
  font-weight: 700;
}

.section-heading {
  font-size: 0.95rem;
  font-weight: 800;
  color: #cbd5e1;
  margin: 0 0 12px 0;
}

.sheet-items-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sheet-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.88rem;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-title {
  color: #ffffff;
  font-weight: 700;
}

.item-unit-price {
  font-size: 0.78rem;
  color: #94a3b8;
}

.item-subtotal {
  font-weight: 800;
  color: #10b981;
}

.sheet-notes-box {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 12px;
  border-radius: 10px;
  font-size: 0.85rem;
  color: #fef08a;
}

.notes-badge {
  font-weight: 800;
  display: block;
  margin-bottom: 4px;
}

.sheet-total-block {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 14px 16px;
  border-radius: 12px;
  font-weight: 800;
  color: #ffffff;
}

.total-fig {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.fig-val {
  font-size: 1.5rem;
  color: #34d399;
}

.fig-curr {
  font-size: 0.82rem;
  color: #a7f3d0;
}

.sheet-footer {
  padding: 16px 20px;
  background: rgba(15, 23, 42, 0.8);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  gap: 12px;
}

.sheet-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  min-height: 48px;
}

.sheet-btn.call-btn {
  background: #3b82f6;
  color: #ffffff;
}

.sheet-btn.wa-btn {
  background: #10b981;
  color: #ffffff;
}

/* Skeleton & Empty States */
.admin-skel-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.admin-skel-card {
  height: 120px;
  background: rgba(30, 41, 59, 0.4);
  border-radius: 14px;
}

.skeleton-shimmer {
  background: linear-gradient(90deg, rgba(30, 41, 59, 0.5) 25%, rgba(51, 65, 85, 0.6) 50%, rgba(30, 41, 59, 0.5) 75%);
  background-size: 200% 100%;
  animation: shimmer-wave 1.6s infinite;
}

@keyframes shimmer-wave {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.admin-empty-state {
  text-align: center;
  padding: 48px 16px;
  color: #94a3b8;
}

.empty-icon {
  margin-bottom: 12px;
  color: #475569;
}
</style>
