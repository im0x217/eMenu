import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from './auth';
import { trackEvent } from '../utils/analytics';

export const useCartStore = defineStore('cart', () => {
  const authStore = useAuthStore();
  const items = ref(JSON.parse(localStorage.getItem('cart_items') || '[]'));
  // Default to tomorrow's date if no saved date exists
  const getDefaultDeliveryDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
  };
  const savedDate = localStorage.getItem('cart_delivery_date');
  const deliveryDate = ref(savedDate && savedDate.length > 0 ? savedDate : getDefaultDeliveryDate());
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
      throw new Error('لا يمكن خلط منتجات من المتجر الرئيسي وقسم النواشف في نفس السلة. يرجى إتمام الطلب الحالي أو إفراغ السلة.');
    }

    // 2. Check price mode consistency (bulk vs regular)
    if (getPriceMode.value && getPriceMode.value !== priceMode) {
      throw new Error('لا يمكن خلط طلب الجملة والطلب العادي في نفس السلة. يرجى مطابقة نوع السعر لجميع المنتجات.');
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
    persist();
  };

  const constructWhatsAppMessage = () => {
    const shopName = getShopType.value === 'shop1' ? 'المتجر الرئيسي (حلويات)' : 'قسم النواشف';
    const priceLabel = getPriceMode.value === 'bulk' ? 'سعر جملة' : 'سعر عادي';
    
    let text = `*طلب جديد من تطبيق المنيو الإلكتروني*\n`;
    text += `*المحل:* ${shopName} (${priceLabel})\n`;
    text += `--------------------------------\n`;
    text += `*العميل:* ${authStore.customerName}\n`;
    text += `*الهاتف:* ${authStore.customerPhone}\n`;
    if (deliveryDate.value) {
      text += `*تاريخ الاستلام:* ${deliveryDate.value}\n`;
    }
    text += `--------------------------------\n`;
    
    items.value.forEach((item, index) => {
      const price = item.priceMode === 'bulk' ? item.price_bulk : (item.price_regular || item.price);
      text += `${index + 1}. *${item.name}*\n`;
      text += `   الكمية: ${item.quantity} | السعر: ${price} د.ل | الإجمالي: ${price * item.quantity} د.ل\n`;
      if (item.itemNotes) {
        text += `   ملاحظة: ${item.itemNotes}\n`;
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
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        throw new Error('Server returned an error');
      }
    } catch (e) {
      console.error('Order submission failed:', e);
      throw new Error('عذراً، فشل إرسال الطلب بسبب مشكلة في الخادم. يرجى المحاولة مرة أخرى.');
    }

    // Track GA4 Purchase Event
    trackEvent('purchase', {
      transaction_id: `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
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
    const message = constructWhatsAppMessage();
    const url = `https://wa.me/${number.replace('+', '')}?text=${message}`;
    
    // Clear cart on success
    clearCart();
    
    window.open(url, '_blank');
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
