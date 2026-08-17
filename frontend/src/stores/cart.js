import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from './auth';
import { useLanguageStore } from './language';
import { trackEvent } from '../utils/analytics';

export const useCartStore = defineStore('cart', () => {
  const authStore = useAuthStore();
  const langStore = useLanguageStore();
  const items = ref(JSON.parse(localStorage.getItem('cart_items') || '[]'));
  // Default to tomorrow's date if no saved date exists or if saved date is in the past
  const getDefaultDeliveryDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // YYYY-MM-DD in local time
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
  };

  const getShopType = computed(() => {
    if (items.value.length === 0) return null;
    return items.value[0].shop; // "shop1" or "shop2"
  });

  const getPriceMode = computed(() => {
    if (items.value.length === 0) return null;
    return items.value[0].priceMode; // "regular" or "bulk"
  });

  const cartTotal = computed(() => {
    return items.value.reduce((total, item) => {
      const price = item.priceMode === 'bulk' ? item.price_bulk : (item.price_regular || item.price);
      return total + (price * item.quantity);
    }, 0);
  });

  const addToCart = (product, shopId, priceMode, qty = 1, notes = '') => {
    // 1. Check shop consistency
    if (getShopType.value && getShopType.value !== shopId) {
      const msg = langStore.isEn
        ? 'Cannot mix items from Main Pastry and Dry Bakery in the same cart. Please complete or clear your current cart.'
        : 'لا يمكن خلط منتجات من المتجر الرئيسي وقسم النواشف في نفس السلة. يرجى إتمام الطلب الحالي أو إفراغ السلة.';
      throw new Error(msg);
    }

    // 2. Check price mode consistency (bulk vs regular)
    if (getPriceMode.value && getPriceMode.value !== priceMode) {
      const msg = langStore.isEn
        ? 'Cannot mix wholesale and regular items in the same cart. Please match the pricing type for all items.'
        : 'لا يمكن خلط طلب الجملة والطلب العادي في نفس السلة. يرجى مطابقة نوع السعر لجميع المنتجات.';
      throw new Error(msg);
    }

    const existingIndex = items.value.findIndex(i => i._id === product._id);
    if (existingIndex > -1) {
      items.value[existingIndex].quantity += qty;
    } else {
      items.value.push({
        ...product,
        shop: shopId,
        priceMode,
        quantity: qty,
        itemNotes: notes
      });
    }
    persist();

    // Track GA4 Add to Cart Event
    const price = priceMode === 'bulk' ? product.price_bulk : (product.price_regular || product.price);
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
      const price = item.priceMode === 'bulk' ? item.price_bulk : (item.price_regular || item.price);
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
    persist();
  };

  const constructWhatsAppMessage = (orderNumber = null) => {
    const isEn = langStore.isEn;
    const isShop2 = getShopType.value === 'shop2';
    const shopName = isShop2 
      ? (isEn ? 'Dry Bakery Division' : 'قسم النواشف') 
      : (isEn ? 'Main Pastry Store' : 'المتجر الرئيسي');
    const priceLabel = getPriceMode.value === 'bulk' 
      ? (isEn ? 'Wholesale' : 'سعر جملة') 
      : (isEn ? 'Regular' : 'سعر عادي');
    const currency = isEn ? 'LYD' : 'د.ل';
    
    let text = isEn ? `*New Order from e-Menu App*\n` : `*طلب جديد من تطبيق المنيو الإلكتروني*\n`;
    if (orderNumber) {
      text += isEn ? `*Order #:* #${orderNumber}\n` : `*رقم الطلب:* #${orderNumber}\n`;
    }
    text += isEn ? `*Store:* ${shopName} (${priceLabel})\n` : `*المحل:* ${shopName} (${priceLabel})\n`;
    text += `--------------------------------\n`;
    text += isEn ? `*Customer:* ${authStore.customerName}\n` : `*العميل:* ${authStore.customerName}\n`;
    text += isEn ? `*Phone:* ${authStore.customerPhone}\n` : `*الهاتف:* ${authStore.customerPhone}\n`;
    if (deliveryDate.value) {
      text += isEn ? `*Pickup Date:* ${deliveryDate.value}\n` : `*تاريخ الاستلام:* ${deliveryDate.value}\n`;
    }
    text += `--------------------------------\n`;
    
    items.value.forEach((item) => {
      const price = item.priceMode === 'bulk' ? item.price_bulk : (item.price_regular || item.price);
      const itemName = isEn && item.name_en ? item.name_en : item.name;
      text += `• *${itemName}* (${item.quantity} × ${price} ${currency})\n`;
      if (item.itemNotes) {
        text += isEn ? `  Note: ${item.itemNotes}\n` : `  ملاحظة: ${item.itemNotes}\n`;
      }
    });
    
    text += `--------------------------------\n`;
    text += isEn ? `*Total Amount:* ${cartTotal.value} ${currency}\n` : `*الإجمالي الكلي:* ${cartTotal.value} ${currency}\n`;
    if (orderNotes.value) {
      text += isEn ? `*Special Notes:* ${orderNotes.value}\n` : `*ملاحظات إضافية:* ${orderNotes.value}\n`;
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

  const submitOrder = async () => {
    if (!authStore.isIdentified()) {
      throw new Error('يرجى ملء بيانات الاسم والهاتف أولاً لإرسال الطلب.');
    }

    const shopId = getShopType.value;
    const body = {
      customer: {
        name: authStore.customerName,
        phone: authStore.customerPhone
      },
      items: items.value.map(item => ({
        productId: item._id,
        name: item.name,
        price: item.priceMode === 'bulk' ? item.price_bulk : (item.price_regular || item.price),
        quantity: item.quantity,
        allowFloat: item.allowFloat || false,
        notes: item.itemNotes || ''
      })),
      totalPrice: cartTotal.value,
      deliveryDate: deliveryDate.value,
      notes: orderNotes.value,
      priceMode: getPriceMode.value
    };

    // Save order to server database
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
        price: item.priceMode === 'bulk' ? item.price_bulk : (item.price_regular || item.price),
        quantity: item.quantity,
        item_category: item.category || ''
      }))
    });

    // Launch WhatsApp redirect
    const number = getWhatsAppNumber();
    const message = constructWhatsAppMessage(assignedOrderNumber);
    const url = `https://wa.me/${number.replace('+', '')}?text=${message}`;
    
    // Clear cart on success
    clearCart();
    
    window.location.href = url;
  };

  return {
    items,
    deliveryDate,
    orderNotes,
    cartTotal,
    getShopType,
    getPriceMode,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    submitOrder
  };
});
