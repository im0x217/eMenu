import { describe, it, expect, afterEach, vi } from 'vitest';
import { fetchWithTimeout, parseApiError, normalizeFetchError } from '@/utils/apiClient';

function createMockResponse({
  status = 400,
  body = null,
  contentType = 'application/json',
  bodyUsed = false
} = {}) {
  const rawText =
    body === null ? '' : typeof body === 'string' ? body : JSON.stringify(body);

  const makeReadable = () => ({
    status,
    bodyUsed,
    headers: {
      get: (name) => (String(name).toLowerCase() === 'content-type' ? contentType : null)
    },
    text: async () => rawText,
    json: async () => JSON.parse(rawText),
    clone: () => makeReadable()
  });

  return makeReadable();
}

describe('apiClient utilities', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('fetchWithTimeout', () => {
    it('resolves when fetch completes before timeout and passes an AbortSignal', async () => {
      const mockRes = createMockResponse({ status: 200, body: { ok: true } });
      const fetchSpy = vi.fn().mockResolvedValue(mockRes);
      vi.stubGlobal('fetch', fetchSpy);

      const res = await fetchWithTimeout('/api/health', { method: 'GET' }, 5000);

      expect(res).toBe(mockRes);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [calledUrl, calledOptions] = fetchSpy.mock.calls[0];
      expect(calledUrl).toBe('/api/health');
      expect(calledOptions.method).toBe('GET');
      expect(calledOptions.signal).toBeInstanceOf(AbortSignal);
      expect(calledOptions.signal.aborted).toBe(false);
    });

    it('aborts and rejects with AbortError when timeout expires', async () => {
      vi.useFakeTimers();

      const fetchSpy = vi.fn((_url, opts) => new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        }, { once: true });
      }));
      vi.stubGlobal('fetch', fetchSpy);

      const pending = fetchWithTimeout('/api/slow', {}, 100);
      const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' });

      await vi.advanceTimersByTimeAsync(110);
      await assertion;
    });

    it('normalizes non-AbortError thrown after timeout into AbortError', async () => {
      vi.useFakeTimers();

      const fetchSpy = vi.fn((_url, opts) => new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          reject(new TypeError('stream interrupted'));
        }, { once: true });
      }));
      vi.stubGlobal('fetch', fetchSpy);

      const pending = fetchWithTimeout('/api/slow-wrap', {}, 50);
      const assertion = expect(pending).rejects.toMatchObject({
        name: 'AbortError',
        message: 'Request timed out'
      });

      await vi.advanceTimersByTimeAsync(60);
      await assertion;
    });

    it('forwards already-aborted external AbortSignal immediately', async () => {
      const external = new AbortController();
      external.abort('cancelled');

      const fetchSpy = vi.fn((_url, opts) => {
        expect(opts.signal.aborted).toBe(true);
        const err = new Error('Aborted');
        err.name = 'AbortError';
        return Promise.reject(err);
      });
      vi.stubGlobal('fetch', fetchSpy);

      await expect(
        fetchWithTimeout('/api/cancelled', { signal: external.signal }, 5000)
      ).rejects.toMatchObject({ name: 'AbortError' });
    });
  });

  describe('parseApiError', () => {
    it('prefers sanitized Arabic message and falls back from empty message to error', async () => {
      const msgRes = createMockResponse({
        status: 400,
        body: { message: 'رقم الهاتف غير صالح' }
      });
      expect(await parseApiError(msgRes)).toBe('رقم الهاتف غير صالح');

      const emptyMsgRes = createMockResponse({
        status: 400,
        body: { message: '', error: 'بيانات الطلب غير مكتملة' }
      });
      expect(await parseApiError(emptyMsgRes)).toBe('بيانات الطلب غير مكتملة');

      const whitespaceMsgRes = createMockResponse({
        status: 422,
        body: { message: '   ', error: 'الكمية غير متوفرة' }
      });
      expect(await parseApiError(whitespaceMsgRes)).toBe('الكمية غير متوفرة');
    });

    it('filters English stack traces, technical errors, and HTML payloads', async () => {
      const stackRes = createMockResponse({
        status: 400,
        body: {
          message: 'TypeError: Cannot read properties of undefined at Object.<anonymous> (/src/server.js:42:10)',
          error: 'MongoServerError: ECONNREFUSED 127.0.0.1:27017'
        }
      });
      expect(await parseApiError(stackRes)).toBe('تعذر إتمام الطلب، يرجى المحاولة مرة أخرى');

      const mixedLeakRes = createMockResponse({
        status: 400,
        body: { message: 'حدث خطأ TypeError: bad input (/src/routes.js:12)' }
      });
      expect(await parseApiError(mixedLeakRes)).toBe('تعذر إتمام الطلب، يرجى المحاولة مرة أخرى');

      const htmlRes = createMockResponse({
        status: 400,
        contentType: 'text/html',
        body: '<html><body><h1>Bad Gateway</h1></body></html>'
      });
      expect(await parseApiError(htmlRes)).toBe('تعذر إتمام الطلب، يرجى المحاولة مرة أخرى');
    });

    it('returns appropriate Arabic fallbacks for 401, 403, 429, and 5xx statuses', async () => {
      const res401 = createMockResponse({ status: 401, body: { error: 'Unauthorized' } });
      expect(await parseApiError(res401)).toBe(
        'انتهت صلاحية الجلسة أو بيانات الدخول غير صحيحة، يرجى تسجيل الدخول مرة أخرى'
      );

      const res403 = createMockResponse({ status: 403, body: { message: 'Forbidden' } });
      expect(await parseApiError(res403)).toBe('ليس لديك صلاحية لتنفيذ هذا الإجراء');

      const res429 = createMockResponse({ status: 429, body: { message: 'Too Many Requests' } });
      expect(await parseApiError(res429)).toBe(
        'تم إرسال طلبات كثيرة جداً، يرجى الانتظار قليلاً ثم المحاولة مرة أخرى'
      );

      const res500 = createMockResponse({
        status: 500,
        body: { message: 'رسالة خام من الخادم لا ينبغي تمريرها في 500' }
      });
      expect(await parseApiError(res500)).toBe('حدث خطأ مؤقت في الخادم، يرجى المحاولة لاحقاً');

      const res503 = createMockResponse({ status: 503, body: null });
      expect(await parseApiError(res503)).toBe(
        'الخدمة غير متوفرة حالياً للصيانة أو الضغط، يرجى المحاولة لاحقاً'
      );

      const res599 = createMockResponse({ status: 599, body: null });
      expect(await parseApiError(res599)).toBe('حدث خطأ مؤقت في الخادم، يرجى المحاولة لاحقاً');
    });

    it('returns custom Arabic fallback when response is missing or already consumed', async () => {
      expect(await parseApiError(null, 'فشل التحقق')).toBe('فشل التحقق');

      const consumed = createMockResponse({
        status: 400,
        body: { message: 'لن يُقرأ' },
        bodyUsed: true
      });
      expect(await parseApiError(consumed, 'فشل الحفظ')).toBe('فشل الحفظ');
    });
  });

  describe('normalizeFetchError', () => {
    it('maps AbortError and timeout errors to friendly Arabic timeout message', () => {
      const abortErr = new Error('The user aborted a request.');
      abortErr.name = 'AbortError';
      expect(normalizeFetchError(abortErr)).toBe('انتهت مهلة الاتصال بالخادم، يرجى المحاولة مرة أخرى');

      const timeoutErr = new Error('Request timed out');
      expect(normalizeFetchError(timeoutErr)).toBe('انتهت مهلة الاتصال بالخادم، يرجى المحاولة مرة أخرى');
    });

    it('maps offline browser state to offline Arabic message', () => {
      globalThis.navigator.onLine = false;
      expect(normalizeFetchError(new TypeError('Failed to fetch'))).toBe(
        'لا يوجد اتصال بالإنترنت، يرجى التحقق من الشبكة والمحاولة مرة أخرى'
      );
      expect(normalizeFetchError(null)).toBe(
        'لا يوجد اتصال بالإنترنت، يرجى التحقق من الشبكة والمحاولة مرة أخرى'
      );
    });

    it('maps network failures while online and strips unsafe English error strings', () => {
      globalThis.navigator.onLine = true;
      expect(normalizeFetchError(new TypeError('Failed to fetch'))).toBe(
        'تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى'
      );
      expect(normalizeFetchError(new Error('ECONNREFUSED 127.0.0.1:3000'))).toBe(
        'تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى'
      );
      expect(normalizeFetchError(new Error('SyntaxError: Unexpected token < in JSON'))).toBe(
        'تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى'
      );
      expect(normalizeFetchError(new Error('رصيد البطاقة غير كافٍ'))).toBe('رصيد البطاقة غير كافٍ');
    });
  });
});
