/**
 * Self-Hosted Interaction Telemetry & Conversion Engine
 * Grounded in the UX Datasets standard (03_interaction_telemetry)
 * 100% anonymous, privacy-first, zero third-party dependencies.
 */

// Generate or retrieve anonymous session ID (lives only for browser session)
function getSessionId() {
  if (typeof window === 'undefined') return 'server';
  try {
    let sid = window.sessionStorage.getItem('emenu_telemetry_sid');
    if (!sid) {
      sid = 'sid_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      window.sessionStorage.setItem('emenu_telemetry_sid', sid);
    }
    return sid;
  } catch (e) {
    return 'sid_ephemeral_' + Math.random().toString(36).substring(2, 8);
  }
}

function getDeviceType() {
  if (typeof window === 'undefined') return 'unknown';
  const width = window.innerWidth || 1024;
  if (width <= 768) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

class TelemetryEngine {
  constructor() {
    this.queue = [];
    this.sessionId = getSessionId();
    this.deviceType = getDeviceType();
    this.flushIntervalMs = 15000; // 15s batch interval
    this.timer = null;
    this.activeDwellMap = new Map(); // For tracking dwell times
    this.initialized = false;
  }

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // Start background flush loop
    this.timer = setInterval(() => this.flush(), this.flushIntervalMs);

    // Flush on page exit / backgrounding using sendBeacon
    const handleExit = () => this.flush(true);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handleExit();
      }
    });
    window.addEventListener('pagehide', handleExit);
    window.addEventListener('beforeunload', handleExit);
  }

  /**
   * Log an interaction event
   * @param {string} eventName - e.g. 'page_view', 'category_select', 'cart_add', 'order_complete'
   * @param {Object} metadata - Contextual data (shop, productId, categoryId, etc.)
   */
  track(eventName, metadata = {}) {
    if (typeof window === 'undefined') return;
    try {
      const event = {
        sessionId: this.sessionId,
        event: eventName,
        device: this.deviceType,
        shop: metadata.shop || 'shop1',
        timestamp: new Date().toISOString(),
        viewportWidth: window.innerWidth,
        metadata: { ...metadata }
      };

      this.queue.push(event);

      // Eager flush if queue accumulates 10+ events
      if (this.queue.length >= 10) {
        this.flush();
      }
    } catch (err) {
      // Defensive: Telemetry must never crash client applications
      console.debug('[Telemetry] track muted:', err);
    }
  }

  /**
   * Start measuring dwell time for a specific element / product
   */
  startDwell(key, metadata = {}) {
    this.activeDwellMap.set(key, {
      startTime: performance.now(),
      metadata
    });
  }

  /**
   * Stop measuring dwell time and record event if duration >= 1.5s
   */
  endDwell(key, eventName = 'product_dwell') {
    const entry = this.activeDwellMap.get(key);
    if (!entry) return;
    this.activeDwellMap.delete(key);

    const durationMs = Math.round(performance.now() - entry.startTime);
    if (durationMs >= 1500) { // Only log meaningful dwell (> 1.5s)
      this.track(eventName, {
        ...entry.metadata,
        dwellMs: durationMs
      });
    }
  }

  /**
   * Flush pending events to server
   * @param {boolean} isBeacon - Use sendBeacon for reliable unload transmission
   */
  flush(isBeacon = false) {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, 50);
    const payload = JSON.stringify({
      sessionId: this.sessionId,
      events: batch
    });

    if (isBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/telemetry/batch', blob);
      return;
    }

    // Standard async dispatch
    fetch('/api/telemetry/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(err => {
      // If dispatch fails, silently put back into queue (capped to 50)
      if (this.queue.length < 50) {
        this.queue.unshift(...batch);
      }
    });
  }
}

export const telemetry = new TelemetryEngine();

// Auto-initialize in browser environments
if (typeof window !== 'undefined') {
  telemetry.init();
}
