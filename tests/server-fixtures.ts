import { vi, type Mock } from 'vitest';
import type { Campaign } from '../src/types.js';
import type { WorkflowClient } from '../src/workflows.js';
export function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return { id:'campaign-grona-id', externalId:'CMP-1', name:'Breakfast', status:'paused', domain:'https://shop.example.com', script:{status:'present',checkedAt:'2026-11-12T10:00:00Z'},createdAt:'2026-11-12T10:00:00Z',updatedAt:'2026-11-12T10:00:00Z',type:'general',pageTargeting:'specific',segmentId:'audience_id',segmentValue:'returning',variations:[{id:'v1',name:'Variation',type:'variant',previewUrl:'https://shop.example.com/products?grona_preview=secret'}],...overrides };
}
const envelope = <T>(data: T) => ({ data, meta:{workspaceId:'workspace-1'} });
export function fakeClient(c = campaign()): { [K in keyof WorkflowClient]: Mock<WorkflowClient[K]> } {
  return {
    listCampaigns:vi.fn().mockResolvedValue(envelope([c])), createCampaign:vi.fn().mockResolvedValue(envelope(c)), getCampaign:vi.fn().mockResolvedValue(envelope(c)), updateCampaign:vi.fn().mockResolvedValue(envelope(c)), setCampaignStatus:vi.fn().mockResolvedValue(envelope({status:'live'})), createEditLink:vi.fn().mockResolvedValue(envelope({variationId:'v1',editUrl:'https://services.grona.ai/edit?token=secret',previewUrl:c.variations[0]?.previewUrl,generatedAt:'now',expiresAt:'later'})), verifyScript:vi.fn().mockResolvedValue(envelope({url:'https://shop.example.com/products',script:{status:'present',checkedAt:'now'}})),
  };
}
