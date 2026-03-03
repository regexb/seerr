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

export default class TmdbHighFloorRandomProvider implements IFeedProvider {
  public readonly id = 'tmdb_high_floor_random';
  public readonly name = 'Serendipity (High Quality Randomizer)';
  public readonly sourceType = 'external' as const;

  public async fetchFeedItems(): Promise<FeedProviderResult[]> {
    const options = feedManager.getProviderOptions(this.id);
    const {
      resultLimit: resultLimitOption,
      minVoteCount: minVoteCountOption,
      minVoteAverage: minVoteAverageOption,
      minReleaseYear: minReleaseYearOption,
      maxReleaseYear: maxReleaseYearOption,
      maxPagesPoolMovies: maxPagesPoolMoviesOption,
      maxPagesPoolTv: maxPagesPoolTvOption,
      movieRatio: movieRatioOption,
    } = options;
    const parsedResultLimit =
      typeof resultLimitOption === 'number'
        ? resultLimitOption
        : Number(resultLimitOption ?? 60);
    const resultLimit = Number.isFinite(parsedResultLimit)
      ? Math.max(1, Math.floor(parsedResultLimit))
      : 60;

    const tmdb = createTmdbWithRegionLanguage();
    const aggregatedResults: FeedProviderResult[] = [];

    const maxPagesPoolMovies =
      typeof maxPagesPoolMoviesOption === 'number'
        ? maxPagesPoolMoviesOption
        : Number(maxPagesPoolMoviesOption ?? 50);
    const maxPagesPoolTv =
      typeof maxPagesPoolTvOption === 'number'
        ? maxPagesPoolTvOption
        : Number(maxPagesPoolTvOption ?? 20);
    const movieRatioOptionParsed =
      typeof movieRatioOption === 'number'
        ? movieRatioOption
        : Number(movieRatioOption);
    const movieRatio = Number.isFinite(movieRatioOptionParsed)
      ? Math.min(1, Math.max(0, movieRatioOptionParsed))
      : 0.5;

    const numPagesNeeded = Math.ceil(resultLimit / 20) + 1;

    // Create shuffled pools for movies and TV
    const availablePagesMovies = Array.from(
      { length: maxPagesPoolMovies },
      (_, i) => i + 1
    ).sort(() => Math.random() - 0.5);
    const availablePagesTv = Array.from(
      { length: maxPagesPoolTv },
      (_, i) => i + 1
    ).sort(() => Math.random() - 0.5);

    // Pick our target fetches
    const fetches: { isMovie: boolean; page: number }[] = [];

    while (
      fetches.length < numPagesNeeded &&
      (availablePagesMovies.length > 0 || availablePagesTv.length > 0)
    ) {
      // Randomly choose between movie and tv based on configured ratio, prioritizing remaining pools
      let isMovie = Math.random() < movieRatio;
      if (availablePagesMovies.length === 0) isMovie = false;
      if (availablePagesTv.length === 0) isMovie = true;

      const page = isMovie
        ? availablePagesMovies.pop()!
        : availablePagesTv.pop()!;
      fetches.push({ isMovie, page });
    }

    const fetchPromises = fetches.map(async ({ isMovie, page }) => {
      try {
        // "Slot Machine" baseline parameters
        const baseParams: Record<string, string | number> = {
          page,
          sortBy: 'popularity.desc' as const,
        };

        const minVoteAverage =
          typeof minVoteAverageOption === 'number'
            ? minVoteAverageOption
            : Number(minVoteAverageOption ?? 7.8);
        if (Number.isFinite(minVoteAverage)) {
          baseParams.voteAverageGte = minVoteAverage.toString();
        }

        const minVoteCount =
          typeof minVoteCountOption === 'number'
            ? minVoteCountOption
            : Number(minVoteCountOption ?? 500);
        if (Number.isFinite(minVoteCount)) {
          baseParams.voteCountGte = minVoteCount.toString();
        }

        const minReleaseYear =
          typeof minReleaseYearOption === 'number'
            ? minReleaseYearOption
            : Number(minReleaseYearOption ?? 1980);
        const maxReleaseYear =
          typeof maxReleaseYearOption === 'number'
            ? maxReleaseYearOption
            : Number(maxReleaseYearOption ?? new Date().getFullYear());

        const response = isMovie
          ? await tmdb.getDiscoverMovies({
              ...baseParams,
              ...(Number.isFinite(minReleaseYear) && {
                primaryReleaseDateGte: `${minReleaseYear}-01-01`,
              }),
              ...(Number.isFinite(maxReleaseYear) && {
                primaryReleaseDateLte: `${maxReleaseYear}-12-31`,
              }),
            })
          : await tmdb.getDiscoverTv({
              ...baseParams,
              ...(Number.isFinite(minReleaseYear) && {
                firstAirDateGte: `${minReleaseYear}-01-01`,
              }),
              ...(Number.isFinite(maxReleaseYear) && {
                firstAirDateLte: `${maxReleaseYear}-12-31`,
              }),
            });

        return (response.results || []).map((result) => {
          const mediaType = isMovie ? MediaType.MOVIE : MediaType.TV;
          return {
            ...result,
            media_type: mediaType,
          };
        });
      } catch (err) {
        return [];
      }
    });

    const pageResults = await Promise.all(fetchPromises);

    pageResults
      .flat()
      .filter(isMovieOrTvResult)
      .forEach((result) => {
        aggregatedResults.push({
          providerId: this.id,
          tmdbId: result.id,
          mediaType:
            result.media_type === MediaType.MOVIE
              ? MediaType.MOVIE
              : MediaType.TV,
          providerScore: Math.random() * 100,
          sourceType: this.sourceType,
        });
      });

    // Sort by the randomized score descending
    const sortedResults = aggregatedResults.sort(
      (a, b) => b.providerScore - a.providerScore
    );

    return sortedResults.slice(0, resultLimit);
  }
}
