import 'server-only';

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /auth/i,
  /cookie/i,
  /credit[-_]?card/i,
  /cvv/i,
  /ssn/i,
  /credential/i,
];

/**
 * Recursively redacts sensitive keys from log objects before serialization.
 */
function sanitizeData(data: unknown, depth = 0): unknown {
  if (depth > 5 || data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
}

function writeLog(level: LogLevel, context: string, message: string, data?: unknown) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    ...(data !== undefined ? { data: sanitizeData(data) } : {}),
  };

  if (process.env.NODE_ENV === 'production') {
    // Structured single-line JSON output for log aggregators (e.g. Datadog, CloudWatch, Papertrail)
    const jsonStr = JSON.stringify(entry);
    if (level === 'error') {
      console.error(jsonStr);
    } else if (level === 'warn') {
      console.warn(jsonStr);
    } else {
      console.info(jsonStr);
    }
  } else {
    // Human-readable output in local development
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${context}]`;
    if (level === 'error') {
      console.error(prefix, message, entry.data ?? '');
    } else if (level === 'warn') {
      console.warn(prefix, message, entry.data ?? '');
    } else {
      console.info(prefix, message, entry.data ?? '');
    }
  }
}

export const logger = {
  info: (context: string, message: string, data?: unknown) => writeLog('info', context, message, data),
  warn: (context: string, message: string, data?: unknown) => writeLog('warn', context, message, data),
  error: (context: string, message: string, data?: unknown) => writeLog('error', context, message, data),
};
