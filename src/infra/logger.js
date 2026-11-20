'use strict';

const LEVEL_WEIGHTS = Object.freeze({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
});

const SENSITIVE_KEYS = Object.freeze([
  'password',
  'passwordHash',
  'plainPassword',
  'token',
  'secret',
  'authorization',
  'cookie',
  'accessKeyId',
  'secretAccessKey',
]);

const NORMALIZED_SENSITIVE_KEY_SET = new Set([
  'password',
  'passwordhash',
  'plainpassword',
  'newpassword',
  'oldpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'customertoken',
  'authtoken',
  'bearertoken',
  'xcustomertoken',
  'secret',
  'adminsessionsecret',
  'sessionsecret',
  'authorization',
  'cookie',
  'setcookie',
  'accesskeyid',
  'awsaccesskeyid',
  'secretaccesskey',
  'awssecretaccesskey',
  'mongouri',
]);

const REDACTED_VALUE = '[REDACTED]';

function normalizeKeyForRedaction(key) {
  return String(key).toLowerCase().replace(/[-_]/g, '');
}

function isSensitiveKey(key) {
  if (typeof key !== 'string' || !key) return false;
  return NORMALIZED_SENSITIVE_KEY_SET.has(normalizeKeyForRedaction(key));
}

function redactSensitive(value, seen = new WeakSet(), depth = 0) {
  if (value === null || value === undefined) return value;

  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return value;
  }
  if (valueType === 'bigint') {
    return value.toString();
  }
  if (valueType === 'symbol' || valueType === 'function') {
    return String(value);
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return `[Buffer length=${value.length}]`;
  }

  if (depth > 12) {
    return '[MaxDepth]';
  }

  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  try {
    if (value instanceof Error) {
      const serialized = {
        name: value.name,
        message: value.message,
      };
      if (value.code !== undefined) serialized.code = value.code;
      if (value.statusCode !== undefined) serialized.statusCode = value.statusCode;
      if (value.stack) serialized.stack = value.stack;
      for (const propKey of Object.keys(value)) {
        if (isSensitiveKey(propKey)) {
          serialized[propKey] = REDACTED_VALUE;
        } else if (serialized[propKey] === undefined) {
          serialized[propKey] = redactSensitive(value[propKey], seen, depth + 1);
        }
      }
      if (value.cause !== undefined) {
        serialized.cause = redactSensitive(value.cause, seen, depth + 1);
      }
      return serialized;
    }

    if (Array.isArray(value)) {
      return value.map((item) => redactSensitive(item, seen, depth + 1));
    }

    if (value instanceof Map) {
      const out = {};
      for (const [k, v] of value.entries()) {
        const strKey = String(k);
        out[strKey] = isSensitiveKey(strKey)
          ? REDACTED_VALUE
          : redactSensitive(v, seen, depth + 1);
      }
      return out;
    }

    if (value instanceof Set) {
      return Array.from(value, (item) => redactSensitive(item, seen, depth + 1));
    }

    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (isSensitiveKey(k)) {
        out[k] = REDACTED_VALUE;
      } else {
        out[k] = redactSensitive(v, seen, depth + 1);
      }
    }
    return out;
  } finally {
    seen.delete(value);
  }
}

function resolveDefaultLevel() {
  const envLevel = String(process.env.LOG_LEVEL || '').trim().toLowerCase();
  if (envLevel && Object.prototype.hasOwnProperty.call(LEVEL_WEIGHTS, envLevel)) {
    return envLevel;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function normalizeMeta(meta) {
  if (meta === undefined || meta === null) return {};
  if (meta instanceof Error) {
    return { err: meta };
  }
  if (typeof meta === 'object' && !Array.isArray(meta)) {
    return meta;
  }
  return { detail: meta };
}

function defaultEmitLine(level, line) {
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else if (level === 'debug' && typeof console.debug === 'function') {
    console.debug(line);
  } else {
    console.log(line);
  }
}

/**
 * Create a zero-dependency structured JSON logger with deep redaction and child contexts.
 * @param {{ level?: string, context?: Record<string, any>, write?: (line: string, entry: Record<string, any>) => void }} [options]
 */
function createLogger(options = {}) {
  const {
    level = resolveDefaultLevel(),
    context = {},
    write = null,
  } = options || {};

  const activeLevel = Object.prototype.hasOwnProperty.call(LEVEL_WEIGHTS, String(level).toLowerCase())
    ? String(level).toLowerCase()
    : resolveDefaultLevel();
  const minWeight = LEVEL_WEIGHTS[activeLevel];
  const baseContext = redactSensitive(normalizeMeta(context));

  const log = (msgLevel, msg, meta) => {
    const weight = LEVEL_WEIGHTS[msgLevel] ?? LEVEL_WEIGHTS.info;
    if (weight < minWeight) return;

    const safeMeta = redactSensitive(normalizeMeta(meta));
    const mergedMeta = { ...baseContext, ...safeMeta };

    const { ts: _ts, level: _lvl, msg: _msg, requestId, ...restMeta } = mergedMeta;

    const entry = {
      ts: new Date().toISOString(),
      level: msgLevel,
      msg: msg instanceof Error ? msg.message : String(msg ?? ''),
      ...(requestId !== undefined ? { requestId } : {}),
      ...restMeta,
    };

    if (msg instanceof Error && entry.err === undefined) {
      entry.err = redactSensitive(msg);
    }

    const line = JSON.stringify(entry);
    if (typeof write === 'function') {
      write(line, entry);
    } else {
      defaultEmitLine(msgLevel, line);
    }
  };

  return {
    level: activeLevel,
    debug(msg, meta) {
      log('debug', msg, meta);
    },
    info(msg, meta) {
      log('info', msg, meta);
    },
    warn(msg, meta) {
      log('warn', msg, meta);
    },
    error(msg, meta) {
      log('error', msg, meta);
    },
    child(childContext = {}) {
      const nextContext = {
        ...baseContext,
        ...redactSensitive(normalizeMeta(childContext)),
      };
      return createLogger({
        level: activeLevel,
        context: nextContext,
        write,
      });
    },
  };
}

const logger = createLogger();

module.exports = {
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  debug: logger.debug.bind(logger),
  child: logger.child.bind(logger),
  logger,
  createLogger,
  redactSensitive,
  isSensitiveKey,
  SENSITIVE_KEYS,
  REDACTED_VALUE,
};
