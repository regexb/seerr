import type {
  TmdbMovieResult,
  TmdbTvResult,
} from '@server/api/themoviedb/interfaces';
import { MediaType } from '@server/constants/media';
import feedManager from '@server/lib/feed';
import type {
  FeedProviderResult,
  IFeedProvider,
} from '@server/lib/feed/providers/provider';
import { createTmdbWithRegionLanguage } from '@server/routes/discover';

const isMovieOrTvResult = (
  result: TmdbMovieResult | TmdbTvResult | { media_type: string }
): result is TmdbMovieResult | TmdbTvResult =>
  result.media_type === MediaType.MOVIE || result.media_type === MediaType.TV;

export default class TmdbTrendingProvider implements IFeedProvider {
  public readonly id = 'tmdb_trending';
  public readonly name = 'TMDB Trending';
  public readonly sourceType = 'external' as const;

  public async fetchFeedItems(): Promise<FeedProviderResult[]> {
    const options = feedManager.getProviderOptions(this.id);
    const { timeWindow: timeWindowOption, resultLimit: resultLimitOption } =
      options;
    const timeWindow = timeWindowOption === 'week' ? 'week' : 'day';
    const parsedResultLimit =
      typeof resultLimitOption === 'number'
        ? resultLimitOption
        : Number(resultLimitOption ?? 60);
    const resultLimit = Number.isFinite(parsedResultLimit)
      ? Math.max(1, Math.floor(parsedResultLimit))
      : 60;

    const tmdb = createTmdbWithRegionLanguage();
    const aggregatedResults: FeedProviderResult[] = [];
    let page = 1;
    let totalPages = 1;

    while (aggregatedResults.length < resultLimit && page <= totalPages) {
      const response = await tmdb.getAllTrending({ timeWindow, page });
      totalPages = response.total_pages;

      const pageResults = response.results
        .filter(isMovieOrTvResult)
        .map((result) => ({
          providerId: this.id,
          tmdbId: result.id,
          mediaType:
            result.media_type === MediaType.MOVIE
              ? MediaType.MOVIE
              : MediaType.TV,
          providerScore: result.popularity ?? 0,
          sourceType: this.sourceType,
        }));

      aggregatedResults.push(...pageResults);
      page += 1;
    }

    return aggregatedResults.slice(0, resultLimit);
  }
}
