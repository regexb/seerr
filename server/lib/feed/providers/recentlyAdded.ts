import { MediaStatus, MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import feedManager from '@server/lib/feed';
import type {
  FeedProviderResult,
  IFeedProvider,
} from '@server/lib/feed/providers/provider';

const parseNumberOption = (
  value: unknown,
  fallback: number,
  min = 1
): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.floor(parsed));
};

const parseBooleanOption = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }

    if (value.toLowerCase() === 'false') {
      return false;
    }
  }

  return fallback;
};

export default class RecentlyAddedProvider implements IFeedProvider {
  public readonly id = 'recently_added';
  public readonly name = 'Recently Added';
  public readonly sourceType = 'in_library' as const;

  public async fetchFeedItems(): Promise<FeedProviderResult[]> {
    const options = feedManager.getProviderOptions(this.id);
    const resultLimit = parseNumberOption(options.resultLimit, 60);
    const windowDays = parseNumberOption(options.windowDays, 30);
    const includeMovies = parseBooleanOption(options.includeMovies, true);
    const includeTv = parseBooleanOption(options.includeTv, true);

    const mediaTypes: MediaType[] = [];
    if (includeMovies) {
      mediaTypes.push(MediaType.MOVIE);
    }

    if (includeTv) {
      mediaTypes.push(MediaType.TV);
    }

    if (mediaTypes.length === 0) {
      return [];
    }

    const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const mediaRepository = getRepository(Media);
    const media = await mediaRepository
      .createQueryBuilder('media')
      .where('media.status IN (:...statuses)', {
        statuses: [MediaStatus.AVAILABLE, MediaStatus.PARTIALLY_AVAILABLE],
      })
      .andWhere('media.mediaType IN (:...mediaTypes)', { mediaTypes })
      .andWhere(
        '(media.mediaAddedAt IS NOT NULL OR media.lastSeasonChange IS NOT NULL)'
      )
      .andWhere(
        '(media.mediaAddedAt >= :cutoff OR media.lastSeasonChange >= :cutoff)',
        { cutoff }
      )
      .orderBy('COALESCE(media.lastSeasonChange, media.mediaAddedAt)', 'DESC')
      .take(resultLimit)
      .getMany();

    const now = Date.now();
    return media.map((item) => {
      // For TV shows, lastSeasonChange reflects newly added episodes.
      // For movies, mediaAddedAt is the primary signal.
      const effectiveDate =
        item.mediaType === MediaType.TV
          ? (item.lastSeasonChange ?? item.mediaAddedAt)
          : (item.mediaAddedAt ?? item.lastSeasonChange);

      const ageDays =
        effectiveDate instanceof Date
          ? (now - effectiveDate.getTime()) / (24 * 60 * 60 * 1000)
          : windowDays;
      const providerScore = Math.max(0, windowDays - ageDays);

      return {
        providerId: this.id,
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        providerScore,
        sourceType: this.sourceType,
      };
    });
  }
}
