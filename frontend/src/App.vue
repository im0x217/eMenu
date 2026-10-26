<script setup>
import { onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import BottomNav from './components/BottomNav.vue';
import BottomCartBar from './components/BottomCartBar.vue';
import Toast from './components/Toast.vue';
import SetPasswordModal from './components/SetPasswordModal.vue';
import { useFavoritesStore } from './stores/favorites';
import { useAuthStore } from './stores/auth';

const favoritesStore = useFavoritesStore();
const authStore = useAuthStore();
const route = useRoute();

const showCustomerNav = computed(() => {
  return route.path !== '/admin';
});

onMounted(() => {
  // Silent load of synced customer favorites and profile password verification
  favoritesStore.loadFavoritesFromBackend();
  authStore.checkProfileStatus();
});
</script>

<template>
  <div class="app-layout">
    <!-- For customer routes, wrap in app-container -->
    <main v-if="showCustomerNav" class="app-container">
      <router-view v-slot="{ Component }">
        <transition name="view-spring" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- For admin route, render raw full-screen without app-container layout limits -->
    <main v-else class="admin-main-wrapper">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Floating checkout helper pill on mobile viewports -->
    <BottomCartBar v-if="showCustomerNav" />
    
    <!-- Persistent bottom bar navigation -->
    <BottomNav v-if="showCustomerNav" />

    <!-- Global non-blocking Toast Notifications -->
    <Toast />

    <!-- Global Modern Set Password Popup Alert Modal -->
    <SetPasswordModal v-if="showCustomerNav" />
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
  background-color: var(--bg-dark);
}

.admin-main-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Argon 4 Spatial View Spring Transitions (Apple Design §4 & §7) */
.view-spring-enter-active {
  transition:
    opacity 0.26s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}

.view-spring-leave-active {
  transition:
    opacity 0.16s cubic-bezier(0.4, 0, 1, 1),
    transform 0.18s cubic-bezier(0.4, 0, 1, 1);
  will-change: opacity, transform;
}

.view-spring-enter-from {
  opacity: 0;
  transform: translate3d(0, 10px, 0) scale(0.992);
}

.view-spring-leave-to {
  opacity: 0;
  transform: translate3d(0, -6px, 0) scale(0.994);
}

/* Fallback fade for admin wrapper */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
