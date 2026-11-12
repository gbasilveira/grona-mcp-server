import { z } from 'zod';
import type { GronaConfig } from './types.js';
export type { GronaConfig } from './types.js';

const endpointSchema = z.string().url().refine(value => {
  let url: URL;
  try { url = new URL(value); } catch { return false; }
  return !url.username && !url.password && !url.search && !url.hash &&
    (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)));
}, 'API base URL must use HTTPS (HTTP allowed for localhost tests), without credentials, query or fragment.');
const configSchema = z.object({
  apiKey: z.string().min(1).refine(v => !/[\r\n]/.test(v)).optional(),
  mobileApiKey: z.string().min(1).refine(v => !/[\r\n]/.test(v)).optional(),
  baseUrl: endpointSchema,
  mobileBaseUrl: endpointSchema,
  authMode: z.enum(['bearer', 'header']),
  timeoutMs: z.number().int().min(1).max(600_000),
  verifyTimeoutMs: z.number().int().min(1).max(600_000),
  maxRetries: z.number().int().min(0).max(10),
  maxRetryDelayMs: z.number().int().min(0).max(600_000),
});
export function validateConfig(config: GronaConfig): GronaConfig {
  const result = configSchema.safeParse(config);
  if (!result.success) throw new Error(`Invalid Grona configuration: ${result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  return { ...result.data, baseUrl: result.data.baseUrl.replace(/\/+$/, ''), mobileBaseUrl: result.data.mobileBaseUrl.replace(/\/+$/, '') };
}
export function loadConfig(env: NodeJS.ProcessEnv = process.env): GronaConfig {
  const integer = (key: string, fallback: number) => env[key] === undefined ? fallback : /^\d+$/.test(env[key]!) ? Number(env[key]) : NaN;
  return validateConfig({
    apiKey: env.GRONA_API_KEY?.trim() || undefined,
    mobileApiKey: env.GRONA_MOBILE_API_KEY?.trim() || undefined,
    baseUrl: env.GRONA_BASE_URL ?? 'https://services.grona.ai/api/public/v1',
    mobileBaseUrl: env.GRONA_MOBILE_BASE_URL ?? 'https://api.grona.ai',
    authMode: (env.GRONA_AUTH_MODE ?? 'bearer') as GronaConfig['authMode'],
    timeoutMs: integer('GRONA_TIMEOUT_MS', 30_000),
    verifyTimeoutMs: integer('GRONA_VERIFY_TIMEOUT_MS', 90_000),
    maxRetries: integer('GRONA_MAX_RETRIES', 2),
    maxRetryDelayMs: integer('GRONA_MAX_RETRY_DELAY_MS', 60_000),
  });
}
