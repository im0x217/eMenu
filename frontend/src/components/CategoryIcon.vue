<script setup>
import { computed } from 'vue';
import { 
  PhSun, 
  PhCake, 
  PhHeart, 
  PhGift, 
  PhCoffee, 
  PhIceCream, 
  PhCookie, 
  PhBellRinging, 
  PhStar, 
  PhForkKnife, 
  PhMartini, 
  PhStorefront 
} from '@phosphor-icons/vue';

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
  weight: {
    type: String,
    default: 'bold'
  }
});

const iconType = computed(() => {
  if (props.icon) return props.icon;

  const n = (props.name || '').trim();
  const e = (props.emoji || '').trim();

  if (n.includes('شرقي') || e.includes('🍯')) return 'oriental';
  if (n.includes('غربي') || e.includes('🍰')) return 'cake';
  if (n.includes('عبمبر') || e.includes('💖')) return 'heart';
  if (n.includes('تورت') || e.includes('🎂')) return 'birthday-cake';
  if (n.includes('عصائر') || n.includes('مشروب') || e.includes('🥤')) return 'juice';
  if (n.includes('نواشف') || n.includes('معجن') || e.includes('🥐')) return 'bakery';
  if (n.includes('لوزيات') || n.includes('شكلاط') || e.includes('🥜')) return 'cookie';
  if (n.includes('قهوة') || e.includes('☕')) return 'coffee';
  if (n.includes('مثلجات') || e.includes('🍦')) return 'ice-cream';
  if (n.includes('خدمات') || e.includes('🛎️')) return 'service';
  if (e.includes('🎁')) return 'gift';
  if (e.includes('⭐') || e.includes('🌟')) return 'star';

  return 'utensils';
});
</script>

<template>
  <span class="cat-svg-icon-wrapper">
    <PhSun v-if="iconType === 'oriental'" :size="size" :weight="weight" />
    <PhCake v-else-if="iconType === 'cake'" :size="size" :weight="weight" />
    <PhHeart v-else-if="iconType === 'heart'" :size="size" :weight="weight" />
    <PhGift v-else-if="iconType === 'birthday-cake' || iconType === 'gift'" :size="size" :weight="weight" />
    <PhMartini v-else-if="iconType === 'juice'" :size="size" :weight="weight" />
    <PhStorefront v-else-if="iconType === 'bakery'" :size="size" :weight="weight" />
    <PhCookie v-else-if="iconType === 'cookie'" :size="size" :weight="weight" />
    <PhCoffee v-else-if="iconType === 'coffee'" :size="size" :weight="weight" />
    <PhIceCream v-else-if="iconType === 'ice-cream'" :size="size" :weight="weight" />
    <PhBellRinging v-else-if="iconType === 'service'" :size="size" :weight="weight" />
    <PhStar v-else-if="iconType === 'star'" :size="size" :weight="weight" />
    <PhForkKnife v-else :size="size" :weight="weight" />
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
