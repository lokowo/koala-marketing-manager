// In-memory singleton store. Initialized from mock data on first access.
// Replace this file's internals with Supabase calls in Phase 2 — service layer stays unchanged.

import type { Professor, Grant, Topic, PublishingItem, ContentCard, Task, DiscoveryCandidate } from './types';
import { mockProfessors, mockGrants, mockTopics, mockPublishing, mockContentCards, mockTasks } from './mockData';
import { generateMockCandidates } from './discoveryMockData';

interface KoalaStore {
  professors: Professor[];
  grants: Grant[];
  topics: Topic[];
  publishing: PublishingItem[];
  contentCards: ContentCard[];
  tasks: Task[];
  discoveryCandidates: DiscoveryCandidate[];
}

const g = globalThis as unknown as { __koalaStore?: KoalaStore };

if (!g.__koalaStore) {
  g.__koalaStore = {
    professors: mockProfessors as Professor[],
    grants: mockGrants as Grant[],
    topics: mockTopics as Topic[],
    publishing: mockPublishing as PublishingItem[],
    contentCards: mockContentCards as ContentCard[],
    tasks: mockTasks as Task[],
    discoveryCandidates: generateMockCandidates('All', 'All', 'All', 100) as DiscoveryCandidate[],
  };
}

export const store = g.__koalaStore!;
