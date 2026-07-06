<script setup>
import { onMounted } from 'vue';
import BottomNav from './components/BottomNav.vue';
import BottomCartBar from './components/BottomCartBar.vue';
import { useFavoritesStore } from './stores/favorites';

const favoritesStore = useFavoritesStore();

onMounted(() => {
  // Silent load of synced customer favorites if identified
  favoritesStore.loadFavoritesFromBackend();
});
</script>

<template>
  <div class="app-layout">
    <main class="app-container">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Floating checkout helper pill on mobile viewports -->
    <BottomCartBar />
    
    <!-- Persistent bottom bar navigation -->
    <BottomNav />
  </div>
</template>

<style>
.app-layout {
  height: 100%;
  height: 100dvh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* Page transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
