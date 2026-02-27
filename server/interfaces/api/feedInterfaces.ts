import { MediaType } from '@server/constants/media';
import { z } from 'zod';
import type { PaginatedResponse } from './common';

export const feedQuery = z.object({
  take: z.coerce.number().min(1).max(100).optional().default(20),
  skip: z.coerce.number().min(0).optional().default(0),
  mediaType: z
    .enum(['all', MediaType.MOVIE, MediaType.TV])
    .optional()
    .default('all'),
});

export interface FeedItemResponse {
  tmdbId: number;
  mediaType: MediaType;
  score: number;
  position: number;
  providerId: string;
}

export interface FeedResponse extends PaginatedResponse {
  results: FeedItemResponse[];
}
