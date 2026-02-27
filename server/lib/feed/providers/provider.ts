import type { MediaType } from '@server/constants/media';
import type { FeedSourceType } from '@server/entity/FeedItem';

export interface FeedProviderResult {
  providerId: string;
  tmdbId: number;
  mediaType: MediaType;
  providerScore: number;
  sourceType: FeedSourceType;
  data?: Record<string, unknown>;
}

export interface IFeedProvider {
  readonly id: string;
  readonly name: string;
  readonly sourceType: FeedSourceType;

  fetchFeedItems(): Promise<FeedProviderResult[]>;
}
