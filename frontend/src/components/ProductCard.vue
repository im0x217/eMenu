<script setup>
import { computed, ref } from 'vue';
import { useShopStore } from '../stores/shop';
import { useCartStore } from '../stores/cart';
import { useFavoritesStore } from '../stores/favorites';

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['zoom']);

const shopStore = useShopStore();
const cartStore = useCartStore();
const favoritesStore = useFavoritesStore();

const activeShop = computed(() => shopStore.activeShop || 'shop1');
const isBulkMode = computed(() => shopStore.isBulkVerified);

// Check if we should show regular/bulk prices based on purchaseType & shop settings
const showRegularPrice = computed(() => {
  return props.product.purchaseType === 'regular' || props.product.purchaseType === 'both' || !props.product.purchaseType;
});

const showBulkPrice = computed(() => {
  return props.product.purchaseType === 'bulk' || props.product.purchaseType === 'both';
});

// Quantity controls
const quantity = ref(1);
const quantityStep = computed(() => props.product.allowFloat ? 0.5 : 1);
const quantityMin = computed(() => props.product.allowFloat ? 0.5 : 1);

const adjustQuantity = (amount) => {
  const nextVal = quantity.value + amount;
  if (nextVal >= quantityMin.value) {
    quantity.value = Math.round(nextVal * 10) / 10; // Avoid floating point precision issues
  }
};

const isSaved = computed(() => favoritesStore.isFavorite(activeShop.value, props.product._id));

const toggleSave = () => {
  favoritesStore.toggleFavorite(activeShop.value, props.product._id);
};

const handleAddToCart = () => {
  // Determine pricing mode to add to cart
  let mode = 'regular';
  if (isBulkMode.value && showBulkPrice.value) {
    mode = 'bulk';
  } else if (props.product.purchaseType === 'bulk') {
    mode = 'bulk';
  }
  
  try {
    cartStore.addToCart(props.product, activeShop.value, mode, quantity.value);
    // Reset quantity back to default
    quantity.value = quantityMin.value;
    alert('تم إضافة المنتج إلى السلة بنجاح!');
  } catch (err) {
    alert(err.message);
  }
};

const getImageUrl = () => {
  return props.product.imgSigned || props.product.img || '/res/logo.jpg';
};
</script>

<template>
  <div class="product-card glass-panel card-hover-effect" :class="{ 'not-available': product.available === false }">
    <!-- Favorite Heart Toggle -->
    <button class="favorite-btn" @click.stop="toggleSave" aria-label="أضف للمفضلة">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        :fill="isSaved ? 'var(--primary-color)' : 'none'" 
        :stroke="isSaved ? 'var(--primary-color)' : 'rgba(255,255,255,0.6)'"
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round"
        class="heart-icon"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>
    </button>

    <!-- Product Image -->
    <div class="img-wrapper" @click="emit('zoom', getImageUrl())">
      <img 
        :src="getImageUrl()" 
        :alt="product.name" 
        loading="lazy"
        class="product-image"
        @error="$event.target.src = '/res/logo.jpg'"
      />
      <div v-if="product.available === false" class="not-available-overlay">
        <span>غير متوفر</span>
      </div>
    </div>

    <!-- Product Details -->
    <div class="product-info">
      <h3 class="product-title">{{ product.name }}</h3>
      <p class="product-desc" v-if="product.desc">{{ product.desc }}</p>
      
      <!-- Price displays -->
      <div class="prices-row">
        <!-- Regular Price -->
        <div v-if="showRegularPrice" class="price-pill regular-price" :class="{ active: !isBulkMode }">
          <span class="price-val">{{ product.price_regular || product.price }}</span>
          <span class="price-unit">د.ل</span>
        </div>

        <!-- Bulk Price -->
        <div v-if="showBulkPrice" class="price-pill bulk-price" :class="{ active: isBulkMode }">
          <span class="price-label">جملة: </span>
          <span class="price-val">{{ product.price_bulk }}</span>
          <span class="price-unit">د.ل</span>
        </div>
      </div>

      <!-- Quantity Adjuster and Add Button -->
      <div class="actions-row" v-if="product.available !== false">
        <div class="qty-adjuster">
          <button class="qty-btn" @click="adjustQuantity(-quantityStep)">-</button>
          <span class="qty-val">{{ quantity }}</span>
          <button class="qty-btn" @click="adjustQuantity(quantityStep)">+</button>
        </div>
        
        <button class="add-btn" @click="handleAddToCart" aria-label="إضافة إلى السلة">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-card {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
}

.product-card.not-available {
  opacity: 0.6;
}

.favorite-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.8);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s, background-color 0.2s;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.favorite-btn:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.95);
}

.heart-icon {
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), fill 0.3s;
}

.favorite-btn:active .heart-icon {
  transform: scale(0.8);
}

.img-wrapper {
  position: relative;
  width: 100%;
  padding-top: 80%; /* 5:4 aspect ratio */
  overflow: hidden;
  background: rgba(0, 0, 0, 0.02);
  cursor: zoom-in;
}

.product-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.product-card:hover .product-image {
  transform: scale(1.05);
}

.not-available-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
}

.product-info {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.product-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #2c2520;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-desc {
  font-size: 0.75rem;
  color: #6c757d;
  margin-bottom: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 2.2em;
  line-height: 1.15;
}

.prices-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 0.75rem;
}

.price-pill {
  font-size: 0.85rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  width: max-content;
}

.regular-price {
  background: rgba(253, 181, 24, 0.08);
  color: #d98000;
}

.regular-price.active {
  background: #fdb518;
  color: #0c0603;
}

.bulk-price {
  background: rgba(55, 178, 77, 0.1);
  color: #2b8a3e;
}

.bulk-price.active {
  background: #2b8a3e;
  color: #fff;
}

.actions-row {
  display: flex;
  gap: 8px;
  margin-top: auto;
  align-items: center;
}

.qty-adjuster {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  overflow: hidden;
  flex-grow: 1;
  justify-content: space-between;
}

.qty-btn {
  background: transparent;
  border: none;
  color: #2c2520;
  font-size: 1.1rem;
  font-weight: 700;
  width: 28px;
  height: 28px;
  cursor: pointer;
}

.qty-btn:active {
  background: rgba(0, 0, 0, 0.05);
}

.qty-val {
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0 4px;
  color: #2c2520;
}

.add-btn {
  background: var(--primary-color);
  border: none;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.shop-theme-shop1 .add-btn {
  color: #0c0603; /* Dark text/icon for gold button */
}

.shop-theme-shop2 .add-btn {
  color: #ffffff; /* White text/icon for blue button */
}

.add-btn:active {
  transform: scale(0.95);
}
</style>
