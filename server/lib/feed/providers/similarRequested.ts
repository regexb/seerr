import { MediaRequestStatus, MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import { MediaRequest } from '@server/entity/MediaRequest';
import feedManager from '@server/lib/feed';
import type {
  FeedProviderResult,
  IFeedProvider,
} from '@server/lib/feed/providers/provider';
import logger from '@server/logger';
import { createTmdbWithRegionLanguage } from '@server/routes/discover';

interface SeedItem {
  tmdbId: number;
  mediaType: MediaType;
  score: number;
  budget: number;
}

const parseNumberOption = (
  value: unknown,
  fallback: number,
  min = 1
): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.floor(parsed)) : fallback;
};

const LN2 = Math.LN2;

export default class SimilarRequestedProvider implements IFeedProvider {
  public readonly id = 'similar_requested';
  public readonly name = 'Similar to Requested';
  public readonly sourceType = 'external' as const;

  public async fetchFeedItems(): Promise<FeedProviderResult[]> {
    const options = feedManager.getProviderOptions(this.id);
    const resultLimit = parseNumberOption(options.resultLimit, 150);
    const windowDays = parseNumberOption(options.windowDays, 90);
    const maxSeeds = parseNumberOption(options.maxSeeds, 20);
    const maxSimilarPerSeed = parseNumberOption(options.maxSimilarPerSeed, 20);
    const minSimilarPerSeed = parseNumberOption(options.minSimilarPerSeed, 5);
    const recencyHalfLifeDays = parseNumberOption(
      options.recencyHalfLifeDays,
      30
    );

    const seeds = await this.buildSeeds(
      windowDays,
      maxSeeds,
      recencyHalfLifeDays
    );

    if (seeds.length === 0) {
      return [];
    }

    this.allocateBudgets(
      seeds,
      resultLimit,
      minSimilarPerSeed,
      maxSimilarPerSeed
    );

    const tmdb = createTmdbWithRegionLanguage();
    const deduped = new Map<string, FeedProviderResult>();

    for (const seed of seeds) {
      if (seed.budget <= 0) continue;

      try {
        const results = await this.fetchRecommendations(tmdb, seed);

        for (let i = 0; i < results.length && i < seed.budget; i++) {
          const rec = results[i];
          const key = `${rec.mediaType}:${rec.tmdbId}`;
          const totalResults = results.length;
          const providerScore =
            seed.score * (1 - i / Math.max(1, totalResults));

          const existing = deduped.get(key);
          if (!existing || providerScore > existing.providerScore) {
            deduped.set(key, {
              providerId: this.id,
              tmdbId: rec.tmdbId,
              mediaType: rec.mediaType,
              providerScore,
              sourceType: this.sourceType,
            });
          }
        }
      } catch (error) {
        logger.warn('Failed to fetch recommendations for requested seed.', {
          label: 'Feed',
          providerId: this.id,
          seedTmdbId: seed.tmdbId,
          seedMediaType: seed.mediaType,
          errorMessage: error instanceof Error ? error.message : undefined,
        });
      }
    }

    return Array.from(deduped.values()).slice(0, resultLimit);
  }

  /**
   * Query non-rejected requests within the time window (includes auto-approved
   * and manually approved: APPROVED, COMPLETED, and PENDING), aggregate by
   * media, and score each seed using: requestCount * exp(-ln2 * daysSinceNewest / halfLife).
   */
  private async buildSeeds(
    windowDays: number,
    maxSeeds: number,
    recencyHalfLifeDays: number
  ): Promise<SeedItem[]> {
    const requestRepository = getRepository(MediaRequest);
    const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const rows: {
      tmdbId: number;
      mediaType: MediaType;
      cnt: string;
      newestRequest: string;
    }[] = await requestRepository
      .createQueryBuilder('request')
      .innerJoin('request.media', 'media')
      .select('media.tmdbId', 'tmdbId')
      .addSelect('request.type', 'mediaType')
      .addSelect('COUNT(*)', 'cnt')
      .addSelect('MAX(request.createdAt)', 'newestRequest')
      .where('request.status IN (:...statuses)', {
        statuses: [
          MediaRequestStatus.APPROVED,
          MediaRequestStatus.COMPLETED,
          MediaRequestStatus.PENDING,
        ],
      })
      .andWhere('request.createdAt >= :cutoff', { cutoff })
      .groupBy('media.tmdbId')
      .addGroupBy('request.type')
      .orderBy('cnt', 'DESC')
      .addOrderBy('newestRequest', 'DESC')
      .limit(maxSeeds * 2)
      .getRawMany();

    const now = Date.now();

    const scored: SeedItem[] = rows.map((row) => {
      const requestCount = parseInt(row.cnt, 10) || 1;
      const newestMs = new Date(row.newestRequest).getTime();
      const daysSinceNewest = Math.max(
        0,
        (now - newestMs) / (24 * 60 * 60 * 1000)
      );
      const decayFactor = Math.exp(
        (-LN2 * daysSinceNewest) / Math.max(1, recencyHalfLifeDays)
      );

      return {
        tmdbId: row.tmdbId,
        mediaType: row.mediaType as MediaType,
        score: requestCount * decayFactor,
        budget: 0,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxSeeds);
  }

  /**
   * Distribute the result budget across seeds proportionally to their score,
   * clamped to [minPerSeed, maxPerSeed]. Overflow is trimmed from the weakest
   * seeds; deficit is topped up on the strongest.
   */
  private allocateBudgets(
    seeds: SeedItem[],
    totalBudget: number,
    minPerSeed: number,
    maxPerSeed: number
  ): void {
    if (seeds.length === 0) return;

    const totalScore = seeds.reduce((sum, s) => sum + s.score, 0);
    if (totalScore <= 0) {
      const even = Math.min(
        maxPerSeed,
        Math.max(minPerSeed, Math.floor(totalBudget / seeds.length))
      );
      for (const seed of seeds) seed.budget = even;
      return;
    }

    for (const seed of seeds) {
      const raw = Math.floor(totalBudget * (seed.score / totalScore));
      seed.budget = Math.min(maxPerSeed, Math.max(minPerSeed, raw));
    }

    let allocated = seeds.reduce((sum, s) => sum + s.budget, 0);

    for (let i = seeds.length - 1; i >= 0 && allocated > totalBudget; i--) {
      const trim = Math.min(
        seeds[i].budget - minPerSeed,
        allocated - totalBudget
      );
      if (trim > 0) {
        seeds[i].budget -= trim;
        allocated -= trim;
      }
    }

    for (let i = 0; i < seeds.length && allocated < totalBudget; i++) {
      const add = Math.min(
        maxPerSeed - seeds[i].budget,
        totalBudget - allocated
      );
      if (add > 0) {
        seeds[i].budget += add;
        allocated += add;
      }
    }
  }

  private async fetchRecommendations(
    tmdb: ReturnType<typeof createTmdbWithRegionLanguage>,
    seed: SeedItem
  ): Promise<{ tmdbId: number; mediaType: MediaType }[]> {
    if (seed.mediaType === MediaType.MOVIE) {
      const data = await tmdb.getMovieRecommendations({
        movieId: seed.tmdbId,
      });
      return data.results.map((r) => ({
        tmdbId: r.id,
        mediaType: MediaType.MOVIE,
      }));
    }

    const data = await tmdb.getTvRecommendations({ tvId: seed.tmdbId });
    return data.results.map((r) => ({
      tmdbId: r.id,
      mediaType: MediaType.TV,
    }));
  }
}
