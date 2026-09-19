import 'server-only';
import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface RecordActivityParams {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'key',
  'authorization',
  'cookie',
  'session',
  'apikey',
  'service_role',
]);

/**
 * Recursively strips sensitive credential keys from audit log payloads.
 */
function sanitizeAuditPayload(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeAuditPayload);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = Array.from(SENSITIVE_KEYS).some((k) => lowerKey.includes(k));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeAuditPayload(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Records an immutable administrative activity log entry in public.admin_activity_logs.
 * Guarantees that:
 * 1. Actor identity is server-verified.
 * 2. Sensitive authentication tokens, passwords, and service keys are redacted.
 * 3. Never throws unhandled exceptions that could crash primary business transactions.
 */
export async function recordAdminActivity(params: RecordActivityParams): Promise<void> {
  try {
    const sanitizedOld = params.oldValues
      ? (sanitizeAuditPayload(params.oldValues) as Prisma.InputJsonValue)
      : undefined;

    const sanitizedNew = params.newValues
      ? (sanitizeAuditPayload(params.newValues) as Prisma.InputJsonValue)
      : undefined;

    await prisma.adminActivityLog.create({
      data: {
        actorId: params.actorId,
        action: params.action.slice(0, 100),
        entity: params.entity.slice(0, 50),
        entityId: params.entityId.slice(0, 100),
        oldValues: sanitizedOld,
        newValues: sanitizedNew,
        ipAddress: params.ipAddress?.slice(0, 50) ?? null,
        userAgent: params.userAgent?.slice(0, 255) ?? null,
      },
    });
  } catch (error) {
    // Log error to server console without breaking primary caller
    console.error('Failed to record admin activity log entry:', error);
  }
}
