/**
 * Sliding active-item indicator (segmented-control / sidebar "liquid" highlight).
 *
 * Measures the active child inside a positioned container and exposes a transform-only
 * style, so the highlight glides between items on the compositor (Apple Design §11:
 * animate only `transform`). The very first placement is applied without animation so
 * the indicator never sweeps in from the top on initial load.
 */
import { reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';

/**
 * @param {import('vue').Ref<HTMLElement|null>} containerRef - Positioned container (offsetParent of items).
 * @param {string} activeSelector - Selector for the active item inside the container.
 * @param {() => any} trigger - Reactive getter; any change re-measures (active key, visibility, item set).
 */
export function useSlidingIndicator(containerRef, activeSelector, trigger) {
  const state = reactive({ y: 0, height: 0, visible: false, animate: false });
  let resizeObserver = null;
  let observedEl = null;
  let rafId = 0;

  const measure = () => {
    const container = containerRef.value;
    const active = container ? container.querySelector(activeSelector) : null;
    if (!active || active.offsetHeight === 0) {
      state.visible = false;
      return;
    }
    state.y = active.offsetTop;
    state.height = active.offsetHeight;
    if (!state.visible) {
      // First placement: snap into position, enable gliding from the next frame on.
      state.visible = true;
      state.animate = false;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(() => { state.animate = true; });
      });
    }
  };

  const observe = () => {
    const container = containerRef.value;
    if (container === observedEl) return;
    if (resizeObserver && observedEl) resizeObserver.unobserve(observedEl);
    observedEl = container || null;
    if (resizeObserver && observedEl) resizeObserver.observe(observedEl);
  };

  watch(trigger, () => nextTick(() => { observe(); measure(); }), { flush: 'post' });
  watch(containerRef, () => nextTick(() => { observe(); measure(); }), { flush: 'post' });

  onMounted(() => {
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => measure());
    }
    nextTick(() => { observe(); measure(); });
  });

  onUnmounted(() => {
    cancelAnimationFrame(rafId);
    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = null;
    observedEl = null;
  });

  const style = computed(() => ({
    height: `${state.height}px`,
    transform: `translate3d(0, ${state.y}px, 0)`,
    opacity: state.visible ? 1 : 0
  }));

  return { indicatorState: state, indicatorStyle: style, remeasureIndicator: measure };
}
