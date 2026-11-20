'use strict';

const { UpstreamError } = require('../errors/AppError');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Determine whether an error represents a transient infrastructure/upstream failure
 * rather than a deterministic 4xx client error or explicit caller abort.
 * @param {any} err
 * @returns {boolean}
 */
function defaultIsTransientError(err) {
  if (!err) return false;
  if (err.retryable === false) return false;
  if (err.name === 'AbortError') return false;

  const status = err.statusCode ?? err.status;
  if (typeof status === 'number') {
    if (status === 408 || status === 429 || status >= 500) {
      return true;
    }
    if (status >= 400 && status < 500) {
      return false;
    }
  }

  return true;
}

/**
 * Execute `fetch()` bounded by a hard timeout using `AbortSignal.timeout`
 * and combining any caller-provided `options.signal` via `AbortSignal.any`.
 * @param {string | URL} url
 * @param {RequestInit} [options]
 * @param {number} [timeoutMs=8000]
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const effectiveTimeoutMs =
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 8000;
  const timeoutSignal = AbortSignal.timeout(effectiveTimeoutMs);

  const callerSignal = options && options.signal ? options.signal : null;
  const combinedSignal = callerSignal
    ? AbortSignal.any([callerSignal, timeoutSignal])
    : timeoutSignal;

  return fetch(url, {
    ...options,
    signal: combinedSignal,
  });
}

/**
 * Retry transient failures with capped exponential backoff + jitter.
 * Never retries deterministic 4xx errors.
 * @template T
 * @param {(attempt: number) => Promise<T>} fn
 * @param {{ maxAttempts?: number, baseDelayMs?: number, isRetryable?: (err: any, attempt: number) => boolean }} [options]
 * @returns {Promise<T>}
 */
async function retryTransient(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 250,
    isRetryable = defaultIsTransientError,
  } = options || {};

  const attemptsLimit = Math.max(1, Number.isInteger(maxAttempts) ? maxAttempts : Number(maxAttempts) || 3);
  const safeBaseDelay = Number.isFinite(baseDelayMs) && baseDelayMs >= 0 ? baseDelayMs : 250;

  let lastError;
  for (let attempt = 1; attempt <= attemptsLimit; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const status = err && (err.statusCode ?? err.status);
      const isDeterministic4xx =
        typeof status === 'number' && status >= 400 && status < 500 && status !== 408 && status !== 429;

      if (attempt >= attemptsLimit || isDeterministic4xx || !isRetryable(err, attempt)) {
        throw err;
      }

      if (safeBaseDelay > 0) {
        const expDelay = safeBaseDelay * Math.pow(2, attempt - 1);
        const jitterFactor = 0.5 + Math.random() * 0.5;
        const delayMs = Math.max(1, Math.round(expDelay * jitterFactor));
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}

/**
 * Circuit breaker supporting `closed`, `open`, and `half-open` states.
 * Works both with `new CircuitBreaker(...)` and `CircuitBreaker(...)`.
 * @param {{ failureThreshold?: number, cooldownMs?: number, isFailure?: (err: any) => boolean }} [options]
 */
function CircuitBreaker(options = {}) {
  if (!(this instanceof CircuitBreaker)) {
    return new CircuitBreaker(options);
  }

  const {
    failureThreshold = 5,
    cooldownMs = 30000,
    isFailure = defaultIsTransientError,
  } = options || {};

  this.failureThreshold =
    Number.isInteger(failureThreshold) && failureThreshold > 0 ? failureThreshold : 5;
  this.cooldownMs =
    Number.isFinite(cooldownMs) && cooldownMs >= 0 ? cooldownMs : 30000;
  this.isFailure = typeof isFailure === 'function' ? isFailure : defaultIsTransientError;

  this._state = 'closed';
  this.failureCount = 0;
  this.openedAt = null;
  this._halfOpenInFlight = false;
}

Object.defineProperty(CircuitBreaker.prototype, 'state', {
  get() {
    if (this._state === 'open' && this.openedAt !== null) {
      if (Date.now() - this.openedAt >= this.cooldownMs) {
        this._state = 'half-open';
      }
    }
    return this._state;
  },
});

CircuitBreaker.prototype.getState = function getState() {
  return this.state;
};

CircuitBreaker.prototype.reset = function reset() {
  this._state = 'closed';
  this.failureCount = 0;
  this.openedAt = null;
  this._halfOpenInFlight = false;
};

CircuitBreaker.prototype.exec = async function exec(fn) {
  const currentState = this.state;

  if (currentState === 'open') {
    throw new UpstreamError('الخدمة الخارجية متوقفة مؤقتاً بسبب تكرار الأعطال', {
      statusCode: 503,
      code: 'CIRCUIT_OPEN',
      retryable: true,
    });
  }

  if (currentState === 'half-open') {
    if (this._halfOpenInFlight) {
      throw new UpstreamError('الخدمة الخارجية قيد اختبار الجاهزية حالياً', {
        statusCode: 503,
        code: 'CIRCUIT_OPEN',
        retryable: true,
      });
    }

    this._halfOpenInFlight = true;
    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (err) {
      if (this.isFailure(err)) {
        this._state = 'open';
        this.openedAt = Date.now();
        this.failureCount = this.failureThreshold;
      }
      throw err;
    } finally {
      this._halfOpenInFlight = false;
    }
  }

  try {
    const result = await fn();
    this.failureCount = 0;
    return result;
  } catch (err) {
    if (this.isFailure(err)) {
      this.failureCount += 1;
      if (this.failureCount >= this.failureThreshold) {
        this._state = 'open';
        this.openedAt = Date.now();
      }
    }
    throw err;
  }
};

module.exports = {
  fetchWithTimeout,
  retryTransient,
  CircuitBreaker,
  defaultIsTransientError,
};
