// In-memory singleton store. Initialized from mock data on first access.
// Replace this file's internals with Supabase calls in Phase 2 — service layer stays unchanged.

import type { Professor, Grant, Topic, PublishingItem } from './types';
import { mockProfessors, mockGrants, mockTopics, mockPublishing } from './mockData';

interface KoalaStore {
  professors: Professor[];
  grants: Grant[];
  topics: Topic[];
  publishing: PublishingItem[];
}

const g = globalThis as unknown as { __koalaStore?: KoalaStore };

if (!g.__koalaStore) {
  g.__koalaStore = {
    professors: mockProfessors as Professor[],
    grants: mockGrants as Grant[],
    topics: mockTopics as Topic[],
    publishing: mockPublishing as PublishingItem[],
  };
}

export const store = g.__koalaStore!;
