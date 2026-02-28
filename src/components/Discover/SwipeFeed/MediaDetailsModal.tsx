import RTAudFresh from '@app/assets/rt_aud_fresh.svg';
import RTAudRotten from '@app/assets/rt_aud_rotten.svg';
import RTFresh from '@app/assets/rt_fresh.svg';
import RTRotten from '@app/assets/rt_rotten.svg';
import ImdbLogo from '@app/assets/services/imdb.svg';
import TmdbLogo from '@app/assets/tmdb_logo.svg';
import CachedImage from '@app/components/Common/CachedImage';
import Tooltip from '@app/components/Common/Tooltip';
import VoteButtons from '@app/components/Discover/SwipeFeed/VoteButtons';
import MediaSlider from '@app/components/MediaSlider';
import PersonCard from '@app/components/PersonCard';
import Slider from '@app/components/Slider';
import useLocale from '@app/hooks/useLocale';
import { Transition } from '@headlessui/react';
import { ArrowRightCircleIcon } from '@heroicons/react/24/outline';
import { ArrowTopRightOnSquareIcon, StarIcon } from '@heroicons/react/24/solid';
import type { RTRating } from '@server/api/rating/rottentomatoes';
import { type RatingResponse } from '@server/api/ratings';
import type { MovieDetails } from '@server/models/Movie';
import type { TvDetails } from '@server/models/Tv';
import Link from 'next/link';
import { Fragment, useState } from 'react';
import useSWR from 'swr';

type MediaData = MovieDetails | TvDetails | null;

interface MediaDetailsModalProps {
  open: boolean;
  onClose: () => void;
  onPass: () => void;
  onInterested: () => void;
  onRequest?: () => void;
  showRequestAction?: boolean;
  canRequest?: boolean;
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  data: MediaData;
  currentVote?: 'interested' | 'not_interested' | null;
}

const MediaDetailsModal = ({
  open,
  onClose,
  onPass,
  onInterested,
  onRequest,
  showRequestAction = false,
  canRequest = false,
  mediaType,
  tmdbId,
  data,
  currentVote,
}: MediaDetailsModalProps) => {
  const { locale } = useLocale();

  // For swipe-down-to-close
  const [startY, setStartY] = useState<number | null>(null);

  const isMovie = mediaType === 'movie';

  // Fetch ratings (RT, IMDB, etc.)
  const { data: ratingData } = useSWR<RatingResponse>(
    open && tmdbId
      ? `/api/v1/${mediaType}/${tmdbId}/ratings${isMovie ? 'combined' : ''}`
      : null
  );

  if (!data) return null;

  const movieData = isMovie ? (data as MovieDetails) : null;
  const tvData = !isMovie ? (data as TvDetails) : null;

  const rtData = isMovie ? ratingData?.rt : (ratingData as unknown as RTRating);
  const imdbData = isMovie ? ratingData?.imdb : undefined;

  const title = isMovie ? movieData?.title : tvData?.name;
  const releaseDate = isMovie ? movieData?.releaseDate : tvData?.firstAirDate;
  const year = (releaseDate || '').slice(0, 4);
  const overview = data.overview;
  const tagline = isMovie ? movieData?.tagline : tvData?.tagline;
  const runtime = isMovie ? movieData?.runtime : tvData?.episodeRunTime?.[0];
  const posterUrl = data.posterPath
    ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${data.posterPath}`
    : '/images/overseerr_poster_not_found_logo_top.png';

  const detailsUrl = isMovie ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
  const cast = isMovie ? movieData?.credits?.cast : tvData?.credits?.cast;

  return (
    <Transition show={open} as={Fragment}>
      <div className="fixed inset-0 top-16 z-10 flex flex-col justify-end lg:left-64">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm"
            role="button"
            tabIndex={0}
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') onClose();
            }}
            aria-label="Close details"
          />
        </Transition.Child>

        {/* Sheet */}
        <Transition.Child
          as={Fragment}
          enter="transition-transform duration-300 ease-out"
          enterFrom="translate-y-full"
          enterTo="translate-y-0"
          leave="transition-transform duration-200 ease-in"
          leaveFrom="translate-y-0"
          leaveTo="translate-y-full"
        >
          <div className="relative flex h-[92%] w-full flex-col rounded-t-3xl border-t border-white/10 bg-gray-950 shadow-2xl">
            {/* Drag Handle */}
            <div
              className="flex justify-center py-3"
              onTouchStart={(e) => {
                setStartY(e.touches[0].clientY);
              }}
              onTouchMove={(e) => {
                if (startY !== null) {
                  const currentY = e.touches[0].clientY;
                  if (currentY - startY > 50) {
                    onClose();
                    setStartY(null);
                  }
                }
              }}
              onTouchEnd={() => setStartY(null)}
            >
              <div className="h-1.5 w-16 rounded-full bg-gray-700" />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden pb-48">
              <div className="px-6">
                {/* Poster Hero Background */}
                <div className="-mx-6 mb-5">
                  <div className="relative h-[46vh] min-h-[360px] w-full overflow-hidden">
                    <CachedImage
                      type="tmdb"
                      src={posterUrl}
                      alt={title || ''}
                      fill
                      className="object-cover object-top"
                      style={{ objectFit: 'cover' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-gray-950/10 via-gray-950/45 to-gray-950" />
                    <div className="absolute inset-x-0 bottom-0 px-6 pb-6 pt-28">
                      <h2 className="mb-1 text-3xl font-extrabold leading-tight text-white">
                        {title}
                        {year && (
                          <span className="ml-2 text-lg font-normal text-gray-300">
                            ({year})
                          </span>
                        )}
                      </h2>
                      {tagline && (
                        <p className="mb-3 text-sm italic text-gray-300">
                          &ldquo;{tagline}&rdquo;
                        </p>
                      )}

                      {/* Meta + Ratings */}
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-200">
                        <span className="rounded-lg border border-white/10 bg-black/45 px-3 py-1 capitalize shadow-sm backdrop-blur-sm">
                          {isMovie ? 'Movie' : 'Series'}
                        </span>
                        {runtime != null && runtime > 0 && (
                          <span className="rounded-lg border border-white/10 bg-black/45 px-3 py-1 shadow-sm backdrop-blur-sm">
                            {runtime} min
                          </span>
                        )}
                        {!isMovie && tvData?.numberOfSeasons != null && (
                          <span className="rounded-lg border border-white/10 bg-black/45 px-3 py-1 shadow-sm backdrop-blur-sm">
                            {tvData.numberOfSeasons} Season
                            {tvData.numberOfSeasons > 1 ? 's' : ''}
                          </span>
                        )}
                        {data.voteAverage != null && data.voteAverage > 0 && (
                          <span className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/45 px-3 py-1 font-bold text-amber-300 shadow-sm backdrop-blur-sm">
                            <StarIcon className="h-3.5 w-3.5 fill-current" />
                            {data.voteAverage.toFixed(1)}
                          </span>
                        )}
                        {rtData?.criticsRating &&
                          typeof rtData?.criticsScore === 'number' && (
                            <Tooltip content="Rotten Tomatoes Tomatometer">
                              <a
                                href={rtData.url}
                                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/45 px-3 py-1 text-sm font-semibold text-white shadow-sm transition hover:bg-black/60"
                                target="_blank"
                                rel="noreferrer"
                              >
                                {rtData.criticsRating === 'Rotten' ? (
                                  <RTRotten className="w-5" />
                                ) : (
                                  <RTFresh className="w-5" />
                                )}
                                <span>{rtData.criticsScore}%</span>
                              </a>
                            </Tooltip>
                          )}
                        {rtData?.audienceRating && !!rtData?.audienceScore && (
                          <Tooltip content="RT Audience Score">
                            <a
                              href={rtData.url}
                              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/45 px-3 py-1 text-sm font-semibold text-white shadow-sm transition hover:bg-black/60"
                              target="_blank"
                              rel="noreferrer"
                            >
                              {rtData.audienceRating === 'Spilled' ? (
                                <RTAudRotten className="w-5" />
                              ) : (
                                <RTAudFresh className="w-5" />
                              )}
                              <span>{rtData.audienceScore}%</span>
                            </a>
                          </Tooltip>
                        )}
                        {imdbData?.criticsScore && (
                          <Tooltip content="IMDB User Score">
                            <a
                              href={imdbData.url}
                              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/45 px-3 py-1 text-sm font-semibold text-white shadow-sm transition hover:bg-black/60"
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ImdbLogo className="mr-0.5 w-5" />
                              <span>{imdbData.criticsScore}</span>
                            </a>
                          </Tooltip>
                        )}
                        {!!data.voteCount && (
                          <Tooltip content="TMDB User Score">
                            <a
                              href={`https://www.themoviedb.org/${mediaType}/${tmdbId}?language=${locale}`}
                              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/45 px-3 py-1 text-sm font-semibold text-white shadow-sm transition hover:bg-black/60"
                              target="_blank"
                              rel="noreferrer"
                            >
                              <TmdbLogo className="mr-0.5 w-5" />
                              <span>{Math.round(data.voteAverage * 10)}%</span>
                            </a>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Genres */}
                {data.genres && data.genres.length > 0 && (
                  <div className="mb-5 flex flex-wrap gap-2">
                    {data.genres.map((g) => (
                      <span
                        key={g.id}
                        className="rounded-full border border-white/10 bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Overview */}
                {overview && (
                  <div className="mb-6">
                    <h4 className="mb-2 text-xs font-black uppercase tracking-widest text-gray-500">
                      Overview
                    </h4>
                    <p className="text-[15px] leading-relaxed text-gray-200">
                      {overview}
                    </p>
                  </div>
                )}

                {/* All Details Link */}
                <Link
                  href={detailsUrl}
                  className="mb-8 flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm font-bold text-indigo-300 transition hover:bg-indigo-500/20"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  <span>View All Details</span>
                </Link>
              </div>

              {/* Cast Slider */}
              {cast && cast.length > 0 && (
                <div className="mb-8 px-6">
                  <div className="slider-header px-0">
                    <Link
                      href={
                        isMovie ? `/movie/${tmdbId}/cast` : `/tv/${tmdbId}/cast`
                      }
                      className="slider-title"
                    >
                      <span>Cast</span>
                      <ArrowRightCircleIcon />
                    </Link>
                  </div>
                  <Slider
                    sliderKey="modal-cast"
                    isLoading={false}
                    isEmpty={false}
                    items={cast.slice(0, 20).map((person) => (
                      <PersonCard
                        key={`modal-cast-${person.id}`}
                        personId={person.id}
                        name={person.name}
                        subName={person.character}
                        profilePath={person.profilePath}
                      />
                    ))}
                  />
                </div>
              )}

              {/* Similar Slider */}
              <div className="mb-4 px-6">
                <MediaSlider
                  sliderKey="modal-similar"
                  title="Similar"
                  url={`/api/v1/${mediaType}/${tmdbId}/similar`}
                  linkUrl={`/${mediaType}/${tmdbId}/similar`}
                  hideWhenEmpty
                />
              </div>
            </div>

            {/* Fixed Action Bar */}
            <div className="absolute bottom-0 left-0 right-0 rounded-b-3xl">
              <div className="h-16 w-full bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent" />
              <div className="flex items-center justify-center bg-gray-950 px-6 pb-24 pt-2 sm:pb-10">
                <VoteButtons
                  onPass={onPass}
                  onInterested={onInterested}
                  onRequest={onRequest}
                  showRequestAction={showRequestAction}
                  canRequest={canRequest}
                  mediaStatus={(data as any)?.mediaInfo?.status}
                  currentVote={currentVote}
                />
              </div>
            </div>
          </div>
        </Transition.Child>
      </div>
    </Transition>
  );
};

export default MediaDetailsModal;
