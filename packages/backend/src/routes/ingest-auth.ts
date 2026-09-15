import { timingSafeEqual } from 'crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Result of an ingest API key check.
 * - 'ok'           — key present and matches INGEST_API_KEY
 * - 'unauthorized'  — key missing or does not match
 * - 'disabled'      — INGEST_API_KEY is not configured on the server (endpoint unusable)
 */
export type IngestKeyCheckResult = 'ok' | 'unauthorized' | 'disabled';

type HeaderValue = string | string[] | undefined;
export type IngestHeaders = Record<string, HeaderValue>;

function firstValue(value: HeaderValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Timing-safe string comparison. Returns false (without throwing) when the
 * lengths differ, instead of leaking length information via an exception.
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function extractProvidedKey(headers: IngestHeaders): string | null {
  const authHeader = firstValue(headers['authorization']);
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token) {
      return token;
    }
  }

  const ingestKeyHeader = firstValue(headers['x-ingest-key']);
  if (ingestKeyHeader && ingestKeyHeader.trim()) {
    return ingestKeyHeader.trim();
  }

  return null;
}

/**
 * Pure decision function for ingest API key validation — no I/O, safe to
 * unit test directly. See requireIngestKey() for the Fastify preHandler
 * wired to this logic.
 */
export function checkIngestKey(headers: IngestHeaders, configuredKey: string | undefined): IngestKeyCheckResult {
  if (!configuredKey) {
    return 'disabled';
  }

  const providedKey = extractProvidedKey(headers);
  if (!providedKey) {
    return 'unauthorized';
  }

  return safeCompare(providedKey, configuredKey) ? 'ok' : 'unauthorized';
}

/**
 * Fastify preHandler enforcing the ingest API key. Never logs the key value.
 */
export async function requireIngestKey(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const result = checkIngestKey(request.headers as IngestHeaders, process.env.INGEST_API_KEY);

  if (result === 'disabled') {
    reply.status(503).send({ error: 'Ingest endpoint disabled' });
    return;
  }

  if (result === 'unauthorized') {
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
}
