/**
 * Resilient Frontend API Client Utilities
 * Provides timeout-bounded fetch requests and safe, user-friendly Arabic error normalization
 * without leaking raw English stack traces or technical internals.
 */

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_API_ERROR_MESSAGE = 'تعذر إتمام الطلب، يرجى المحاولة مرة أخرى';
const DEFAULT_NETWORK_ERROR_MESSAGE = 'تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى';
const TIMEOUT_ERROR_MESSAGE = 'انتهت مهلة الاتصال بالخادم، يرجى المحاولة مرة أخرى';
const OFFLINE_ERROR_MESSAGE = 'لا يوجد اتصال بالإنترنت، يرجى التحقق من الشبكة والمحاولة مرة أخرى';

const STATUS_MESSAGES = Object.freeze({
  401: 'انتهت صلاحية الجلسة أو بيانات الدخول غير صحيحة، يرجى تسجيل الدخول مرة أخرى',
  403: 'ليس لديك صلاحية لتنفيذ هذا الإجراء',
  429: 'تم إرسال طلبات كثيرة جداً، يرجى الانتظار قليلاً ثم المحاولة مرة أخرى',
  500: 'حدث خطأ مؤقت في الخادم، يرجى المحاولة لاحقاً',
  502: 'الخادم غير متاح مؤقتاً، يرجى المحاولة لاحقاً',
  503: 'الخدمة غير متوفرة حالياً للصيانة أو الضغط، يرجى المحاولة لاحقاً',
  504: 'انتهت مهلة استجابة الخادم، يرجى المحاولة لاحقاً'
});

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF]/;
const TECHNICAL_LEAK_REGEX = /(\bat\s+\S+\s*\(|\bstack\b|\/node_modules\/|\/src\/|[A-Za-z]:\\|\b(?:TypeError|ReferenceError|SyntaxError|RangeError|EvalError|URIError|Mongo\w*Error|Mongoose\w*|CastError|ValidationError|ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|ERR_[A-Z0-9_]+|SQLITE|POSTGRES)\b|<(?:html|body|head|title|script|pre|div)\b)/i;

/**
 * Determine whether a raw error message is safe, concise Arabic suitable for end-user display.
 * @param {unknown} value
 * @returns {string} Sanitized user-facing Arabic string, or empty string if unsafe/technical.
 */
function sanitizeUserMessage(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 300) return '';
  if (!ARABIC_CHAR_REGEX.test(trimmed)) return '';
  if (TECHNICAL_LEAK_REGEX.test(trimmed)) return '';
  return trimmed;
}

/**
 * Map an HTTP status code to a friendly Arabic message when appropriate.
 * @param {number} status
 * @returns {string}
 */
function getStatusFallbackMessage(status) {
  if (typeof status !== 'number') return '';
  if (STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];
  if (status >= 500) return STATUS_MESSAGES[500];
  return '';
}

/**
 * Execute `fetch` with an automatic timeout enforced via `AbortController`.
 * Preserves and chains an optional caller-supplied `options.signal`.
 * @param {RequestInfo | URL} url
 * @param {RequestInit} [options={}]
 * @param {number} [timeoutMs=15000]
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const externalSignal = options && options.signal ? options.signal : null;
  let timerId;
  let timedOut = false;

  const onExternalAbort = () => {
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timerId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  }

  try {
    const fetchOptions = {
      ...options,
      signal: controller.signal
    };
    return await fetch(url, fetchOptions);
  } catch (err) {
    if (timedOut && (!err || err.name !== 'AbortError')) {
      const abortErr = new Error('Request timed out');
      abortErr.name = 'AbortError';
      abortErr.cause = err;
      throw abortErr;
    }
    throw err;
  } finally {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

/**
 * Safely extract a user-friendly Arabic error message from a failed Fetch `Response`.
 * Reads `{ message, error }` JSON fields safely without leaking English stack traces or internals.
 * @param {Response | null | undefined} res
 * @param {string} [fallbackMessage]
 * @returns {Promise<string>}
 */
export async function parseApiError(res, fallbackMessage = DEFAULT_API_ERROR_MESSAGE) {
  const safeFallback = sanitizeUserMessage(fallbackMessage) || fallbackMessage || DEFAULT_API_ERROR_MESSAGE;
  if (!res) return safeFallback;

  const status = typeof res.status === 'number' ? res.status : 0;
  const statusFallback = getStatusFallbackMessage(status);

  let payload = null;
  try {
    if (!res.bodyUsed) {
      const readable = typeof res.clone === 'function' ? res.clone() : res;
      const contentType = readable.headers && typeof readable.headers.get === 'function'
        ? String(readable.headers.get('content-type') || '').toLowerCase()
        : '';

      if (typeof readable.text === 'function') {
        const rawText = (await readable.text()).trim();
        const looksLikeJson = rawText.startsWith('{') || rawText.startsWith('[');
        if (rawText && (contentType.includes('json') || looksLikeJson)) {
          payload = JSON.parse(rawText);
        }
      } else if (typeof readable.json === 'function') {
        payload = await readable.json();
      }
    }
  } catch (err) {
    console.warn('[apiClient] Failed to parse error response body:', err);
  }

  if (payload && typeof payload === 'object') {
    const candidate = payload.message ?? payload.error;
    const safeCandidate = sanitizeUserMessage(candidate);
    if (safeCandidate && status < 500) {
      return safeCandidate;
    }
  }

  if (statusFallback) {
    return statusFallback;
  }

  return safeFallback;
}

/**
 * Normalize a thrown fetch/network/timeout error into a friendly Arabic message.
 * @param {unknown} err
 * @param {string} [fallbackMessage]
 * @returns {string}
 */
export function normalizeFetchError(err, fallbackMessage = DEFAULT_NETWORK_ERROR_MESSAGE) {
  const safeFallback = sanitizeUserMessage(fallbackMessage) || fallbackMessage || DEFAULT_NETWORK_ERROR_MESSAGE;

  if (!err) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return OFFLINE_ERROR_MESSAGE;
    }
    return safeFallback;
  }

  if (typeof err === 'string') {
    return sanitizeUserMessage(err) || safeFallback;
  }

  const name = typeof err.name === 'string' ? err.name : '';
  const code = typeof err.code === 'string' ? err.code : '';
  const message = typeof err.message === 'string' ? err.message : '';

  if (
    name === 'AbortError' ||
    name === 'TimeoutError' ||
    code === 'ABORT_ERR' ||
    /\b(?:timed?\s*out|timeout|aborted)\b/i.test(message)
  ) {
    return TIMEOUT_ERROR_MESSAGE;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return OFFLINE_ERROR_MESSAGE;
  }

  if (
    err instanceof TypeError ||
    /\b(?:failed to fetch|networkerror|network request failed|load failed|fetch failed|net::err|econnrefused|econnreset|enotfound|etimedout)\b/i.test(message)
  ) {
    return DEFAULT_NETWORK_ERROR_MESSAGE;
  }

  const safeMsg = sanitizeUserMessage(message);
  if (safeMsg) {
    return safeMsg;
  }

  return safeFallback;
}
