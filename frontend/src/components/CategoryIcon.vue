<script setup>
import { computed } from 'vue';
import { HugeiconsIcon } from '@hugeicons/vue';
import { 
  Sun01Icon, 
  CheeseCake02Icon,
  CheeseCake01Icon,
  Bread04Icon,
  BiscuitIcon,
  HeartIcon, 
  GiftIcon, 
  Coffee01Icon, 
  IceCream01Icon, 
  StarIcon, 
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
  const iconKey = (props.icon || '').toLowerCase().trim();
  const n = (props.name || '').toLowerCase().trim();
  const e = (props.emoji || '').trim();

  // Direct Key Matching
  if (iconKey === 'cheesecake02' || iconKey === 'western' || iconKey === 'cake') return CheeseCake02Icon;
  if (iconKey === 'cheesecake01' || iconKey === 'torte' || iconKey === 'birthday-cake') return CheeseCake01Icon;
  if (iconKey === 'bread04' || iconKey === 'bakery' || iconKey === 'dry' || iconKey === 'macaron') return Bread04Icon;
  if (iconKey === 'biscuit' || iconKey === 'cookie' || iconKey === 'bitifour') return BiscuitIcon;
  if (iconKey === 'oriental') return Sun01Icon;
  if (iconKey === 'heart') return HeartIcon;
  if (iconKey === 'juice') return CupSodaIcon;
  if (iconKey === 'coffee') return Coffee01Icon;
  if (iconKey === 'ice-cream') return IceCream01Icon;
  if (iconKey === 'service') return ConciergeBellIcon;
  if (iconKey === 'gift') return GiftIcon;
  if (iconKey === 'star') return StarIcon;

  // Keyword / Name / Emoji Fallback Matching
  if (n.includes('غربي') || e.includes('🍰')) return CheeseCake02Icon;
  if (n.includes('تورت') || n.includes('كيك') || e.includes('🎂')) return CheeseCake01Icon;
  if (n.includes('نواشف') || n.includes('معجن') || n.includes('ماكرون') || e.includes('🥐')) return Bread04Icon;
  if (n.includes('بيتي فور') || n.includes('بيتيفور') || n.includes('لوزيات') || n.includes('شكلاط') || n.includes('بسكويت') || e.includes('🥜') || e.includes('🍪')) return BiscuitIcon;
  if (n.includes('شرقي') || e.includes('🍯')) return Sun01Icon;
  if (n.includes('عبمبر') || e.includes('💖')) return HeartIcon;
  if (n.includes('عصائر') || n.includes('مشروب') || e.includes('🥤')) return CupSodaIcon;
  if (n.includes('قهوة') || e.includes('☕')) return Coffee01Icon;
  if (n.includes('مثلجات') || e.includes('🍦')) return IceCream01Icon;
  if (n.includes('خدمات') || e.includes('🛎️')) return ConciergeBellIcon;
  if (e.includes('🎁')) return GiftIcon;
  if (e.includes('⭐') || e.includes('🌟')) return StarIcon;

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
