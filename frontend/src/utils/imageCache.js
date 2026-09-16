/**
 * High-Performance Global In-Memory Image Cache & Decoding Engine
 * 
 * Provides:
 * 1. Synchronous 0ms cache-hit check (isImageCached) to eliminate shimmer/flicker on category switch.
 * 2. Off-main-thread bitmap decoding via native HTMLImageElement.prototype.decode() for 60 FPS scrolling.
 * 3. Centralized URL normalization with idempotent URI encoding for Arabic filenames.
 * 4. Background category pre-warming queue.
 */

// In-memory registry of fully downloaded and decoded image URLs
const memoryCache = new Set();

/**
 * Normalizes an image URL defensively, handling local fallbacks and
 * preventing double-encoding of Arabic characters.
 */
export function normalizeImageUrl(raw) {
  if (!raw || typeof raw !== 'string') return '/res/logo.jpg';
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return '/res/logo.jpg';
  try {
    return encodeURI(decodeURI(trimmed));
  } catch (e) {
    return trimmed;
  }
}

/**
 * Synchronous check whether an image has already been loaded and decoded in the current session.
 * Used during component initialization to set isLoaded = true on tick 0.
 */
export function isImageCached(rawUrl) {
  const normalized = normalizeImageUrl(rawUrl);
  // Local static fallbacks are always considered cached
  if (normalized === '/res/logo.jpg' || normalized === '/res/logo2.jpg.jpeg') {
    return true;
  }
  return memoryCache.has(normalized);
}

/**
 * Marks a URL as loaded and ready in the memory cache.
 */
export function markImageLoaded(rawUrl) {
  const normalized = normalizeImageUrl(rawUrl);
  memoryCache.add(normalized);
}

/**
 * Preloads and decodes an image off the main thread using browser-native decode().
 * Returns a Promise that resolves when the bitmap is ready to paint with 0 jank.
 */
export function preloadAndDecode(rawUrl) {
  const normalized = normalizeImageUrl(rawUrl);
  
  if (memoryCache.has(normalized)) {
    return Promise.resolve(normalized);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';

    const onComplete = () => {
      memoryCache.add(normalized);
      resolve(normalized);
    };

    img.src = normalized;

    if (img.complete && img.naturalWidth !== 0) {
      onComplete();
      return;
    }

    if (typeof img.decode === 'function') {
      img.decode()
        .then(onComplete)
        .catch(() => {
          // Fallback to standard load if decode fails
          img.onload = onComplete;
          img.onerror = () => resolve(normalized);
        });
    } else {
      img.onload = onComplete;
      img.onerror = () => resolve(normalized);
    }
  });
}

/**
 * Pre-warms an array of image URLs in the background.
 * Limits concurrency to 4 simultaneous downloads to prevent socket contention.
 */
export async function warmImageUrls(urls = [], maxConcurrency = 4) {
  if (!Array.isArray(urls) || urls.length === 0) return;

  const validUrls = urls
    .map(normalizeImageUrl)
    .filter(url => !memoryCache.has(url));

  if (validUrls.length === 0) return;

  const queue = [...validUrls];
  const workers = Array(Math.min(maxConcurrency, queue.length)).fill(null).map(async () => {
    while (queue.length > 0) {
      const url = queue.shift();
      if (url) {
        await preloadAndDecode(url);
      }
    }
  });

  await Promise.all(workers);
}
