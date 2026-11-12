import type { z } from 'zod';
import type { createCampaignSchema, updateCampaignSchema } from './schemas.js';

/** Responses retain new v1 fields and enum values for forward compatibility. */
export interface Envelope<T> {
  data: T;
  meta: { workspaceId: string; count?: number; [key: string]: unknown };
  [key: string]: unknown;
}
export interface Variation {
  id: string;
  name: string | null;
  type: string;
  previewUrl: string | null;
  editUrl?: string;
  generatedAt?: string;
  expiresAt?: string;
  [key: string]: unknown;
}
export interface Campaign {
  id: string;
  externalId: string | null;
  name: string;
  status: string;
  domain: string | null;
  script: { status: string; checkedAt: string | null; [key: string]: unknown };
  createdAt: string;
  updatedAt: string;
  type: string;
  pageTargeting: string;
  segmentId: string | null;
  segmentValue: string | null;
  variations: Variation[];
  url?: string;
  slug?: string;
  condition?: string;
  list?: string[];
  trafficSplit?: Record<string, number>;
  [key: string]: unknown;
}
export interface EditLink {
  editUrl: string;
  variationId: string;
  previewUrl: string | null;
  generatedAt: string;
  expiresAt: string;
  [key: string]: unknown;
}
export interface ValidatedEditLink {
  valid: boolean;
  refreshed: boolean;
  editUrl: string;
  variationId: string;
  generatedAt: string;
  expiresAt: string;
  [key: string]: unknown;
}
export interface ScriptVerification {
  url: string;
  script: { status: string; checkedAt: string; [key: string]: unknown };
  [key: string]: unknown;
}
export type CreateCampaignRequest = z.input<typeof createCampaignSchema>;
export type UpdateCampaignRequest = z.input<typeof updateCampaignSchema>;
export interface GronaConfig {
  apiKey?: string;
  mobileApiKey?: string;
  baseUrl: string;
  mobileBaseUrl: string;
  authMode: 'bearer' | 'header';
  timeoutMs: number;
  verifyTimeoutMs: number;
  maxRetries: number;
  maxRetryDelayMs: number;
}
