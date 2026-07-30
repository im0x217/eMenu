<script setup>
import { computed } from 'vue';

const props = defineProps({
  name: {
    type: String,
    default: ''
  },
  emoji: {
    type: String,
    default: ''
  }
});

const iconType = computed(() => {
  const n = (props.name || '').trim();
  const e = (props.emoji || '').trim();

  if (n.includes('شرقي') || e.includes('🍯')) return 'oriental';
  if (n.includes('غربي') || e.includes('🍰')) return 'cake';
  if (n.includes('عبمبر') || e.includes('💖')) return 'heart';
  if (n.includes('تورت') || e.includes('🎂')) return 'birthday-cake';
  if (n.includes('عصائر') || n.includes('مشروب') || e.includes('🥤')) return 'juice';
  if (n.includes('نواشف') || n.includes('معجن') || e.includes('🥐')) return 'bakery';
  if (n.includes('لوزيات') || n.includes('شكلاط') || e.includes('🥜')) return 'cookie';
  if (n.includes('خدمات') || e.includes('🛎️')) return 'service';
  if (e.includes('🎁')) return 'gift';
  if (e.includes('⭐') || e.includes('🌟')) return 'star';

  return 'utensils';
});
</script>

<template>
  <span class="cat-svg-icon-wrapper">
    <!-- Oriental / Honey Sweets -->
    <svg v-if="iconType === 'oriental'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      <circle cx="12" cy="12" r="4"/>
    </svg>

    <!-- Western Cake / Desserts -->
    <svg v-else-if="iconType === 'cake'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/>
      <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/>
      <path d="M2 21h20"/>
      <line x1="12" y1="7" x2="12" y2="11"/>
    </svg>

    <!-- Signature / Heart -->
    <svg v-else-if="iconType === 'heart'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    </svg>

    <!-- Birthday / Large Cake -->
    <svg v-else-if="iconType === 'birthday-cake'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/>
      <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/>
      <path d="M2 21h20"/>
      <path d="M7 8v3M12 8v3M17 8v3"/>
      <path d="M7 4h.01M12 4h.01M17 4h.01"/>
    </svg>

    <!-- Juice / Cold Drinks -->
    <svg v-else-if="iconType === 'juice'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 8h12l-1.5 13h-9L6 8Z"/>
      <path d="M5 5h14"/>
      <path d="M12 2v3"/>
    </svg>

    <!-- Bakery / Pastries / Dry Sweets (نواشف / كعك) -->
    <svg v-else-if="iconType === 'bakery'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5Z"/>
      <circle cx="8.5" cy="8.5" r="0.75" fill="currentColor"/>
      <circle cx="15.5" cy="13.5" r="0.75" fill="currentColor"/>
      <circle cx="11" cy="13" r="0.75" fill="currentColor"/>
    </svg>

    <!-- Nuts / Confectionery -->
    <svg v-else-if="iconType === 'cookie'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M8.5 8.5v.01M15.5 9.5v.01M12 14v.01M9.5 16.5v.01M14.5 15.5v.01"/>
    </svg>

    <!-- Services / Concierge Bell -->
    <svg v-else-if="iconType === 'service'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 20a6 6 0 0 0-12 0"/>
      <line x1="12" y1="4" x2="12" y2="8"/>
      <line x1="4" y1="20" x2="20" y2="20"/>
    </svg>

    <!-- Gift / Tier 1 -->
    <svg v-else-if="iconType === 'gift'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="8" width="18" height="14" rx="2"/>
      <path d="M12 8v14"/>
      <path d="M12 8H7.5a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8Z"/>
      <path d="M12 8h4.5a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8Z"/>
    </svg>

    <!-- Star / Tier 2 & 3 -->
    <svg v-else-if="iconType === 'star'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>

    <!-- Default Food Utensils Fallback -->
    <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 2v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V2"/>
      <path d="M12 2v20"/>
      <path d="M12 10H4"/>
    </svg>
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
