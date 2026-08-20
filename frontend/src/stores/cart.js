import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from './auth';
import { trackEvent } from '../utils/analytics';

export const useCartStore = defineStore('cart', () => {
  const authStore = useAuthStore();
  const items = ref(JSON.parse(localStorage.getItem('cart_items') || '[]'));
  
  // Order Editing Mode State
  const isEditingOrder = ref(localStorage.getItem('cart_is_editing_order') === 'true');
  const editingOrderId = ref(localStorage.getItem('cart_editing_order_id') || '');
  const editingOrderNumber = ref(localStorage.getItem('cart_editing_order_number') || '');
  const editingOrderShop = ref(localStorage.getItem('cart_editing_order_shop') || 'shop1');

  // Default to tomorrow's date if no saved date exists or if saved date is in the past
  const getDefaultDeliveryDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const savedDate = localStorage.getItem('cart_delivery_date');
  const minDefaultDate = getDefaultDeliveryDate();
  const isDateValid = savedDate && savedDate.length > 0 && savedDate >= minDefaultDate;
  const deliveryDate = ref(isDateValid ? savedDate : minDefaultDate);
  const orderNotes = ref(localStorage.getItem('cart_notes') || '');

  const persist = () => {
    localStorage.setItem('cart_items', JSON.stringify(items.value));
    localStorage.setItem('cart_delivery_date', deliveryDate.value);
    localStorage.setItem('cart_notes', orderNotes.value);
    localStorage.setItem('cart_is_editing_order', isEditingOrder.value ? 'true' : 'false');
    localStorage.setItem('cart_editing_order_id', editingOrderId.value);
    localStorage.setItem('cart_editing_order_number', editingOrderNumber.value);
    localStorage.setItem('cart_editing_order_shop', editingOrderShop.value);
  };

  const getShopType = computed(() => {
    if (isEditingOrder.value && editingOrderShop.value) {
      return editingOrderShop.value;
    }
    if (items.value.length === 0) return null;
    return items.value[0].shop; // "shop1" or "shop2"
  });

  const getPriceMode = computed(() => {
    if (items.value.length === 0) return 'regular';
    return items.value[0].priceMode || 'regular';
  });

  const cartTotal = computed(() => {
    return items.value.reduce((total, item) => {
      const price = item.priceMode === 'bulk' ? (item.price_bulk || item.price) : (item.price_regular || item.price);
      return total + (price * item.quantity);
    }, 0);
  });

  const addToCart = (product, shopId, priceMode = 'regular', qty = 1, notes = '') => {
    // 1. Check shop consistency
    if (getShopType.value && getShopType.value !== shopId) {
      throw new Error('لا يمكن خلط منتجات من المتجر الرئيسي وقسم النواشف في نفس السلة. يرجى إتمام الطلب الحالي أو إفراغ السلة.');
    }

    // 2. Check price mode consistency (bulk vs regular)
    if (getPriceMode.value && getPriceMode.value !== priceMode && items.value.length > 0) {
      throw new Error('لا يمكن خلط طلب الجملة والطلب العادي في نفس السلة. يرجى مطابقة نوع السعر لجميع المنتجات.');
    }

    const existingIndex = items.value.findIndex(i => i._id === product._id);
    if (existingIndex > -1) {
      items.value[existingIndex].quantity += qty;
    } else {
      items.value.push({
        ...product,
        shop: shopId,
        priceMode: priceMode || 'regular',
        quantity: qty,
        itemNotes: notes
      });
    }
    persist();

    // Track GA4 Add to Cart Event
    const price = priceMode === 'bulk' ? (product.price_bulk || product.price) : (product.price_regular || product.price);
    trackEvent('add_to_cart', {
      currency: 'LYD',
      value: price * qty,
      items: [{
        item_id: product._id,
        item_name: product.name,
        price: price,
        quantity: qty,
        item_category: product.category || '',
        item_list_name: shopId
      }]
    });
  };

  const updateQty = (productId, qty) => {
    const item = items.value.find(i => i._id === productId);
    if (item) {
      item.quantity = qty;
      if (item.quantity <= 0) {
        removeFromCart(productId);
      } else {
        persist();
      }
    }
  };

  const removeFromCart = (productId) => {
    const item = items.value.find(i => i._id === productId);
    if (item) {
      const price = item.priceMode === 'bulk' ? (item.price_bulk || item.price) : (item.price_regular || item.price);
      trackEvent('remove_from_cart', {
        currency: 'LYD',
        value: price * item.quantity,
        items: [{
          item_id: item._id,
          item_name: item.name,
          price: price,
          quantity: item.quantity,
          item_category: item.category || '',
          item_list_name: item.shop
        }]
      });
    }
    items.value = items.value.filter(i => i._id !== productId);
    persist();
  };

  const clearCart = () => {
    items.value = [];
    deliveryDate.value = getDefaultDeliveryDate();
    orderNotes.value = '';
    isEditingOrder.value = false;
    editingOrderId.value = '';
    editingOrderNumber.value = '';
    editingOrderShop.value = 'shop1';
    persist();
  };

  // Import existing order into cart for editing
  const importOrderForEditing = (order) => {
    isEditingOrder.value = true;
    editingOrderId.value = order._id;
    editingOrderNumber.value = order.orderNumber || order._id.slice(-6);
    editingOrderShop.value = order.shop || 'shop1';

    const orderPriceMode = order.priceMode || 'regular';

    items.value = (order.items || []).map((item, idx) => ({
      _id: item.productId ? item.productId.toString() : `item_${idx}_${Date.now()}`,
      name: item.name,
      price: item.price,
      price_regular: item.price,
      price_bulk: item.price,
      quantity: item.quantity,
      allowFloat: item.allowFloat || false,
      itemNotes: item.notes || '',
      shop: order.shop || 'shop1',
      priceMode: orderPriceMode
    }));

    deliveryDate.value = order.deliveryDate || getDefaultDeliveryDate();
    orderNotes.value = order.notes || '';
    persist();
  };

  const cancelOrderEditing = () => {
    clearCart();
  };

  const constructWhatsAppMessage = (orderNumber = null, isEdit = false) => {
    const shopName = getShopType.value === 'shop1' ? 'المتجر الرئيسي (حلويات)' : 'قسم النواشف';
    const priceLabel = getPriceMode.value === 'bulk' ? 'سعر جملة' : 'سعر عادي';
    
    let text = isEdit 
      ? `*تعديل على الطلب في تطبيق المنيو الإلكتروني*\n`
      : `*طلب جديد من تطبيق المنيو الإلكتروني*\n`;
      
    if (orderNumber) {
      text += `*رقم الطلب:* #${orderNumber}\n`;
    }
    text += `*المحل:* ${shopName} (${priceLabel})\n`;
    text += `--------------------------------\n`;
    text += `*العميل:* ${authStore.customerName}\n`;
    text += `*الهاتف:* ${authStore.customerPhone}\n`;
    if (deliveryDate.value) {
      text += `*تاريخ الاستلام:* ${deliveryDate.value}\n`;
    }
    text += `--------------------------------\n`;
    
    items.value.forEach((item) => {
      const price = item.priceMode === 'bulk' ? (item.price_bulk || item.price) : (item.price_regular || item.price);
      text += `• *${item.name}* (${item.quantity} × ${price} د.ل)\n`;
      if (item.itemNotes) {
        text += `  ملاحظة: ${item.itemNotes}\n`;
      }
    });
    
    text += `--------------------------------\n`;
    text += `*الإجمالي الكلي:* ${cartTotal.value} د.ل\n`;
    if (orderNotes.value) {
      text += `*ملاحظات إضافية:* ${orderNotes.value}\n`;
    }
    return encodeURIComponent(text);
  };

  const getWhatsAppNumber = () => {
    const isBulk = getPriceMode.value === 'bulk';
    if (getShopType.value === 'shop2') {
      return isBulk ? '+218921717902' : '+218921717901';
    } else {
      return isBulk ? '+218916688800' : '+218921717901';
    }
  };

  // Submit new order OR update existing edited order
  const submitOrder = async () => {
    if (!authStore.isIdentified()) {
      throw new Error('يرجى ملء بيانات الاسم والهاتف أولاً لإرسال الطلب.');
    }

    if (items.value.length === 0) {
      throw new Error('السلة فارغة.');
    }

    // IF IN EDIT ORDER MODE:
    if (isEditingOrder.value && editingOrderId.value) {
      const editBody = {
        phone: authStore.customerPhone,
        shop: editingOrderShop.value,
        items: items.value.map(item => ({
          productId: item._id && !item._id.startsWith('item_') ? item._id : null,
          name: item.name,
          price: item.priceMode === 'bulk' ? (item.price_bulk || item.price) : (item.price_regular || item.price),
          quantity: item.quantity,
          allowFloat: item.allowFloat || false,
          notes: item.itemNotes || ''
        })),
        deliveryDate: deliveryDate.value,
        notes: orderNotes.value
      };

      const res = await fetch(`/api/customer/orders/${editingOrderId.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editBody)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حفظ التعديلات على الطلب');
      }

      const assignedNum = editingOrderNumber.value;
      const number = getWhatsAppNumber();
      const message = constructWhatsAppMessage(assignedNum, true);
      const url = `https://wa.me/${number.replace('+', '')}?text=${message}`;

      clearCart();
      window.location.href = url;
      return { success: true, isEdit: true, orderNumber: assignedNum };
    }

    // NORMAL NEW ORDER SUBMISSION:
    const shopId = getShopType.value || 'shop1';
    const body = {
      customer: {
        name: authStore.customerName,
        phone: authStore.customerPhone
      },
      items: items.value.map(item => ({
        productId: item._id,
        name: item.name,
        price: item.priceMode === 'bulk' ? (item.price_bulk || item.price) : (item.price_regular || item.price),
        quantity: item.quantity,
        allowFloat: item.allowFloat || false,
        notes: item.itemNotes || ''
      })),
      totalPrice: cartTotal.value,
      deliveryDate: deliveryDate.value,
      notes: orderNotes.value,
      priceMode: getPriceMode.value
    };

    const endpoint = shopId === 'shop2' ? '/api/shop2/orders' : '/api/orders';
    let assignedOrderNumber = null;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        throw new Error('Server returned an error');
      }
      const data = await res.json();
      assignedOrderNumber = data.orderNumber || null;
    } catch (e) {
      console.error('Order submission failed:', e);
      throw new Error('عذراً، فشل إرسال الطلب بسبب مشكلة في الخادم. يرجى المحاولة مرة أخرى.');
    }

    // Track GA4 Purchase Event
    trackEvent('purchase', {
      transaction_id: assignedOrderNumber ? `order_${assignedOrderNumber}` : `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      value: cartTotal.value,
      currency: 'LYD',
      items: items.value.map(item => ({
        item_id: item._id,
        item_name: item.name,
        price: item.priceMode === 'bulk' ? (item.price_bulk || item.price) : (item.price_regular || item.price),
        quantity: item.quantity,
        item_category: item.category || ''
      }))
    });

    const number = getWhatsAppNumber();
    const message = constructWhatsAppMessage(assignedOrderNumber, false);
    const url = `https://wa.me/${number.replace('+', '')}?text=${message}`;
    
    clearCart();
    window.location.href = url;
    return { success: true, isEdit: false, orderNumber: assignedOrderNumber };
  };

  return {
    items,
    deliveryDate,
    orderNotes,
    cartTotal,
    getShopType,
    getPriceMode,
    isEditingOrder,
    editingOrderId,
    editingOrderNumber,
    editingOrderShop,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    importOrderForEditing,
    cancelOrderEditing,
    submitOrder
  };
});
