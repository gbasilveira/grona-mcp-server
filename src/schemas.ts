import { z } from 'zod';

export const httpUrlSchema = z.string().url().refine(value => {
  let url: URL;
  try { url = new URL(value); } catch { return false; }
  return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
}, 'Use an absolute http(s) URL without embedded credentials.').describe('Absolute http(s) page URL.');
export const externalIdSchema = z.string().regex(/^[A-Za-z0-9_.:-]{1,128}$/, 'Use 1–128 letters, digits, underscore, dot, colon or hyphen.').describe('Unique campaign identifier in your workspace; optional on create.');
export const customerIdSchema = z.string().regex(/^[A-Za-z0-9._:-]{1,128}$/).describe('Opaque shopper id from an authenticated session, never an email, phone or national id.');
const reservedWindowNames = new Set(['name', 'location', 'status', 'top', 'parent', 'history', 'window', 'self', 'document', 'frames', 'opener', 'navigator', 'screen', 'length', 'closed', 'origin', 'localStorage', 'sessionStorage', 'console', 'performance', 'crypto']);
export const segmentIdSchema = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,127}$/).refine(value => !reservedWindowNames.has(value), 'Choose a custom page variable; browser global names are reserved.').describe('Custom window variable name, up to 128 characters.');
export const segmentValueSchema = z.string().regex(/^[A-Za-z0-9_.:-]{1,128}$/).describe('Exact page-variable string match.');
export const campaignIdSchema = z.string().min(1).refine(value => value !== '.' && value !== '..', 'Dot-only identifiers cannot be represented safely in an HTTP path; list campaigns and use the Grona id.').describe('Opaque Grona campaign id or externalId.');
export const campaignStatusSchema = z.enum(['live', 'paused']);
const percentageSchema = z.number().int().min(0).max(100);
export const pageListSchema = z.array(z.string().trim().min(1).max(200)).min(1).max(50).transform(values => [...new Set(values)]);
export const trafficSplitByRoleSchema = z.object({ Control: percentageSchema, Test: percentageSchema }).strict().refine(value => value.Control + value.Test === 100, 'Control and Test percentages must total 100.');
export const trafficSplitByIdSchema = z.record(z.string().min(1), percentageSchema).refine(value => Object.keys(value).length > 0 && Object.values(value).reduce((a, b) => a + b, 0) === 100, 'Include every variation id with percentages totaling 100.');

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1),
  url: httpUrlSchema,
  externalId: externalIdSchema.optional(),
  segmentId: segmentIdSchema,
  segmentValue: segmentValueSchema,
  type: z.enum(['general', 'abTest']).optional(),
  pageTargeting: z.enum(['specific', 'multiple']).optional(),
  trafficSplit: trafficSplitByRoleSchema.optional(),
  slug: z.string().min(1).optional(),
  condition: z.enum(['included', 'not_included']).optional(),
  list: pageListSchema.optional(),
}).strict().superRefine((value, ctx) => {
  if ((value.type ?? 'general') !== 'abTest' && value.trafficSplit !== undefined) ctx.addIssue({code: 'custom', path: ['trafficSplit'], message: 'trafficSplit is only valid for abTest campaigns.'});
  if ((value.pageTargeting ?? 'specific') === 'multiple') {
    if (!value.slug) ctx.addIssue({code: 'custom', path: ['slug'], message: 'Multiple-page targeting requires slug.'});
    if (!value.list) ctx.addIssue({code: 'custom', path: ['list'], message: 'Multiple-page targeting requires list.'});
    let path: string;
    try { path = new URL(value.url).pathname; } catch { return; }
    if (/[;"'\\]/.test(decodePath(path)) || /[;"'\\]/.test(value.url.split(/[?#]/)[0]!)) ctx.addIssue({code: 'custom', path: ['url'], message: 'Multi-page URL path cannot contain semicolons, quotes or backslashes.'});
    if (value.slug && !path.split('/').filter(Boolean).includes(value.slug)) ctx.addIssue({code: 'custom', path: ['slug'], message: 'slug must exactly match a segment in the sample URL path.'});
  } else {
    for (const field of ['slug', 'condition', 'list'] as const) if (value[field] !== undefined) ctx.addIssue({code:'custom',path:[field],message:`${field} is only valid for multiple-page targeting.`});
  }
});
function decodePath(value: string): string { try { return decodeURIComponent(value); } catch { return value; } }

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(1).optional(),
  status: campaignStatusSchema.optional(),
  externalId: externalIdSchema.nullable().optional(),
  segmentId: segmentIdSchema.optional(),
  segmentValue: segmentValueSchema.optional(),
  trafficSplit: trafficSplitByIdSchema.optional(),
  slug: z.string().min(1).optional(),
  condition: z.enum(['included', 'not_included']).optional(),
  list: pageListSchema.optional(),
  // Upstream accepts type but ignores it; expose this documented behavior faithfully.
  type: z.string().optional().describe('Ignored by Grona; campaign type is immutable.'),
}).strict().refine(value => Object.values(value).some(v => v !== undefined), 'Send at least one update field.');
export const editLinkSchema = z.object({
  variationId: z.string().min(1).optional(),
  url: httpUrlSchema.optional(),
}).strict().refine(value => value.variationId !== undefined || value.url !== undefined, 'Send variationId (preferred) or url.');
