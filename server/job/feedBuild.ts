import { getRepository } from '@server/datasource';
import { FeedItem } from '@server/entity/FeedItem';
import feedManager from '@server/lib/feed';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';

interface FetchedItem {
  tmdbId: number;
  mediaType: string;
  providerScore: number;
  providerId: string;
  sourceType: 'external' | 'in_library';
}

interface ReconciledCandidate {
  tmdbId: number;
  mediaType: string;
  providerIdUsed: string;
  sourceType: 'external' | 'in_library';
  score: number;
}

class FeedBuildJob {
  private running = false;

  public status(): { running: boolean; progress: number; total: number } {
    return {
      running: this.running,
      progress: 0,
      total: 0,
    };
  }

  public cancel(): void {
    this.running = false;
  }

  public async run(): Promise<void> {
    if (this.running) {
      logger.debug('Skipping feed build run: job already running.', {
        label: 'Feed',
      });
      return;
    }

    this.running = true;
    const feedItemRepository = getRepository(FeedItem);
    const providers = feedManager.getActiveProviders();
    const { runConcurrency, maxItemsPerProvider } = getSettings().feed;
    const concurrency = Math.max(1, runConcurrency);

    try {
      logger.info('Starting feed build run.', {
        label: 'Feed',
        providerCount: providers.length,
      });

      const fetchedByProvider = new Map<string, FetchedItem[]>();
      let cursor = 0;
      const workers = Array.from({
        length: Math.min(concurrency, providers.length),
      }).map(async () => {
        while (this.running) {
          const provider = providers[cursor++];
          if (!provider) {
            return;
          }

          try {
            const fetchedItems = await provider.fetchFeedItems();
            const deduped = new Map<string, (typeof fetchedItems)[number]>();
            for (const item of fetchedItems) {
              const key = `${item.mediaType}:${item.tmdbId}`;
              const existing = deduped.get(key);

              if (!existing || item.providerScore > existing.providerScore) {
                deduped.set(key, item);
              }
            }

            const items: FetchedItem[] = Array.from(deduped.values())
              .slice(0, maxItemsPerProvider)
              .map((item) => ({
                ...item,
                providerId: provider.id,
                sourceType: provider.sourceType,
              }));

            fetchedByProvider.set(provider.id, items);

            logger.info('Feed provider sync complete.', {
              label: 'Feed',
              providerId: provider.id,
              itemCount: items.length,
            });
          } catch (error) {
            logger.error('Feed provider sync failed.', {
              label: 'Feed',
              providerId: provider.id,
              errorMessage: error instanceof Error ? error.message : undefined,
            });
          }
        }
      });

      await Promise.all(workers);

      // Normalize and reconcile
      const normalizedScores = this.normalizeProviderScores(fetchedByProvider);
      const reconciled = this.reconcileProviderScores(
        fetchedByProvider,
        normalizedScores
      );

      const rankedRows = reconciled.map((candidate) => {
        const weight = feedManager.getProviderWeight(candidate.providerIdUsed);
        const sortJitter = -Math.log(Math.random() || 1e-10);
        return new FeedItem({
          tmdbId: candidate.tmdbId,
          mediaType: candidate.mediaType as any,
          score: candidate.score,
          providerId: candidate.providerIdUsed,
          sourceType: candidate.sourceType,
          weight,
          sortJitter,
        });
      });

      await feedItemRepository.clear();
      if (rankedRows.length > 0) {
        await feedItemRepository.save(rankedRows);
      }

      logger.info('Feed build run complete.', {
        label: 'Feed',
        rankedCount: rankedRows.length,
      });
    } finally {
      this.running = false;
    }
  }

  private normalizeProviderScores(
    fetchedByProvider: Map<string, FetchedItem[]>
  ): Map<FetchedItem, number> {
    const normalized = new Map<FetchedItem, number>();

    for (const items of fetchedByProvider.values()) {
      if (items.length === 1) {
        normalized.set(items[0], 0.5);
        continue;
      }

      let min = Infinity;
      let max = -Infinity;
      for (const item of items) {
        if (item.providerScore < min) min = item.providerScore;
        if (item.providerScore > max) max = item.providerScore;
      }

      const spread = max - min;
      if (spread <= 0) {
        // All scores identical: treat them as neutral.
        for (const item of items) {
          normalized.set(item, 0.5);
        }
        continue;
      }

      // Rank items by providerScore (ascending) to compute percentiles.
      const sorted = [...items].sort(
        (a, b) => a.providerScore - b.providerScore
      );
      const n = sorted.length;

      // Log-range-based shrink factor, capped at 0.9 to limit gaming.
      const shrink = Math.min(0.9, Math.log10(1 + spread) / 5);

      for (let index = 0; index < n; index++) {
        const item = sorted[index];
        const percentile = n > 1 ? index / (n - 1) : 0.5;
        const centered = percentile - 0.5;
        const value = 0.5 + centered * shrink;
        normalized.set(item, value);
      }
    }

    return normalized;
  }

  private reconcileProviderScores(
    fetchedByProvider: Map<string, FetchedItem[]>,
    normalizedScores: Map<FetchedItem, number>
  ): ReconciledCandidate[] {
    const byMediaKey = new Map<string, ReconciledCandidate>();

    for (const items of fetchedByProvider.values()) {
      for (const item of items) {
        const mediaKey = `${item.mediaType}:${item.tmdbId}`;
        const normalizedScore = normalizedScores.get(item) ?? 0;
        const weight = feedManager.getProviderWeight(item.providerId);
        const weightedScore = normalizedScore * weight;
        const existing = byMediaKey.get(mediaKey);

        if (!existing) {
          byMediaKey.set(mediaKey, {
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            providerIdUsed: item.providerId,
            sourceType: item.sourceType,
            score: weightedScore,
          });
          continue;
        }

        if (weightedScore > existing.score) {
          existing.score = weightedScore;
          existing.providerIdUsed = item.providerId;
          existing.sourceType = item.sourceType;
        }
      }
    }

    return Array.from(byMediaKey.values());
  }
}

const feedBuildJob = new FeedBuildJob();

export default feedBuildJob;
