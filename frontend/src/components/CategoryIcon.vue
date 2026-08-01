<script setup>
import { computed } from 'vue';
import { HugeiconsIcon } from '@hugeicons/vue';
import { 
  Sun01Icon, 
  BirthdayCakeIcon, 
  HeartIcon, 
  GiftIcon, 
  Coffee01Icon, 
  IceCream01Icon, 
  CookieIcon, 
  StarIcon, 
  Store01Icon, 
  CupSodaIcon, 
  ConciergeBellIcon, 
  Dish01Icon 
} from '@hugeicons/core-free-icons';

const props = defineProps({
  name: {
    type: String,
    default: ''
  },
  emoji: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  size: {
    type: [Number, String],
    default: 18
  },
  color: {
    type: String,
    default: 'currentColor'
  },
  strokeWidth: {
    type: [Number, String],
    default: 2
  }
});

const iconComponent = computed(() => {
  const iconKey = props.icon || '';
  const n = (props.name || '').trim();
  const e = (props.emoji || '').trim();

  if (iconKey === 'oriental' || n.includes('شرقي') || e.includes('🍯')) return Sun01Icon;
  if (iconKey === 'cake' || n.includes('غربي') || e.includes('🍰')) return BirthdayCakeIcon;
  if (iconKey === 'heart' || n.includes('عبمبر') || e.includes('💖')) return HeartIcon;
  if (iconKey === 'birthday-cake' || n.includes('تورت') || e.includes('🎂')) return BirthdayCakeIcon;
  if (iconKey === 'juice' || n.includes('عصائر') || n.includes('مشروب') || e.includes('🥤')) return CupSodaIcon;
  if (iconKey === 'bakery' || n.includes('نواشف') || n.includes('معجن') || e.includes('🥐')) return Store01Icon;
  if (iconKey === 'cookie' || n.includes('لوزيات') || n.includes('شكلاط') || e.includes('🥜')) return CookieIcon;
  if (iconKey === 'coffee' || n.includes('قهوة') || e.includes('☕')) return Coffee01Icon;
  if (iconKey === 'ice-cream' || n.includes('مثلجات') || e.includes('🍦')) return IceCream01Icon;
  if (iconKey === 'service' || n.includes('خدمات') || e.includes('🛎️')) return ConciergeBellIcon;
  if (iconKey === 'gift' || e.includes('🎁')) return GiftIcon;
  if (iconKey === 'star' || e.includes('⭐') || e.includes('🌟')) return StarIcon;

  return Dish01Icon;
});
</script>

<template>
  <span class="cat-svg-icon-wrapper">
    <HugeiconsIcon 
      :icon="iconComponent" 
      :size="size" 
      :color="color" 
      :stroke-width="strokeWidth" 
    />
  </span>
</template>

<style scoped>
.cat-svg-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.cat-btn.active .cat-svg-icon-wrapper {
  transform: scale(1.1);
}
</style>
