export interface ProviderScoreCandidate {
  raw: number;
  normalized: number;
  weighted: number;
}

export interface FeedScoreMetadata {
  providerIdUsed: string;
  baseScore: number;
  providerScoreCandidates?: Record<string, ProviderScoreCandidate>;
  finalScore: number;
  sortJitter?: number;
}
