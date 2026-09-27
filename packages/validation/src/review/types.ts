// Blind realism review (brief §9 "Realism review protocol"): bundle → page → answers → score.
export type ReviewChannel = 'ecgII' | 'abp' | 'pleth' | 'co2';
export interface ReviewClip { id: string; channel: ReviewChannel; fs: number; unit: string; range: [number, number] | null; x: number[] }
export interface ReviewBundle { schema: 'pme-review-bundle/1'; session: string; createdAt: string; clips: ReviewClip[] }
export interface KeyEntry { kind: 'real' | 'synthetic'; source: string; record: string; fromS: number; seed?: number }
export interface ReviewKey { schema: 'pme-review-key/1'; session: string; entries: Record<string, KeyEntry> }
export interface Answer { id: string; guess: 'real' | 'synthetic'; realism: 1 | 2 | 3 | 4 | 5; comment: string; order: number }
export interface ReviewAnswers { schema: 'pme-review-answers/1'; session: string; rater: string; startedAt: string; finishedAt: string; answers: Answer[] }
