import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import MediaDetailsModal from '@app/components/Discover/SwipeFeed/MediaDetailsModal';
import type {
  SwipeableCardHandle,
  SwipeCardItem,
} from '@app/components/Discover/SwipeFeed/SwipeableCard';
import SwipeableCard from '@app/components/Discover/SwipeFeed/SwipeableCard';
import VoteButtons from '@app/components/Discover/SwipeFeed/VoteButtons';
import RequestModal from '@app/components/RequestModal';
import { Permission, useUser } from '@app/hooks/useUser';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { MediaRequestStatus, MediaStatus } from '@server/constants/media';
import type { FeedItemResponse } from '@server/interfaces/api/feedInterfaces';
import type { MovieDetails } from '@server/models/Movie';
import type { TvDetails } from '@server/models/Tv';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToasts } from 'react-toast-notifications';
import useSWR from 'swr';

interface FeedApiResponse {
  pageInfo: {
    pages: number;
    pageSize: number;
    results: number;
    page: number;
  };
  results: FeedItemResponse[];
}

interface VoteLookupResponse {
  vote: {
    actionType: 'interested' | 'not_interested';
  } | null;
}

type SwipeDirection = 'left' | 'right' | 'up';

const BATCH_SIZE = 10;
const PREFETCH_THRESHOLD = 6;

/** Unique key for deduplication in case of timing issues. */
const itemKey = (mediaType: string, tmdbId: number) => `${mediaType}-${tmdbId}`;

const getPendingRequestOwner = (requests: unknown[]): number | undefined => {
  const pendingRequest = requests.find((request) => {
    if (!request || typeof request !== 'object') return false;
    return (
      (request as { status?: MediaRequestStatus }).status ===
        MediaRequestStatus.PENDING && !(request as { is4k?: boolean }).is4k
    );
  }) as { requestedBy?: { id?: number } } | undefined;

  return pendingRequest?.requestedBy?.id;
};

const SwipeFeed = () => {
  const { addToast } = useToasts();
  const { hasPermission, user } = useUser();
  const [queue, setQueue] = useState<SwipeCardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExhausted, setIsExhausted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [detailsIndex, setDetailsIndex] = useState<number | null>(null);
  const [requestItem, setRequestItem] = useState<SwipeCardItem | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isRequestHolding, setIsRequestHolding] = useState(false);
  const [currentVote, setCurrentVote] = useState<
    'interested' | 'not_interested' | null
  >(null);
  const cardRef = useRef<SwipeableCardHandle>(null);
  const hasInitialized = useRef(false);
  const isFetching = useRef(false);
  const seenIds = useRef<Set<string>>(new Set());
  /** Unique per mount so we don't reuse cached feed when navigating back. */
  const mountKey = useRef(Date.now());
  const [refreshId, setRefreshId] = useState(0);
  const isCompletingRequest = useRef(false);

  // Cache key includes mountKey + refreshId so back-navigation/Refresh get fresh data; fetcher only sends take/skip to API.
  const initialFeedKey = [
    'feed-initial',
    BATCH_SIZE,
    0,
    mountKey.current,
    refreshId,
  ] as const;
  const { data, isLoading } = useSWR<FeedApiResponse>(
    initialFeedKey,
    async ([, take, skip]) => {
      const res = await fetch(`/api/v1/feed?take=${take}&skip=${skip}`);
      if (!res.ok) throw new Error('Feed request failed');
      return res.json();
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // Fetch TMDB details for a batch of feed items
  const enrichBatch = useCallback(
    async (items: FeedItemResponse[]): Promise<SwipeCardItem[]> => {
      const enriched: SwipeCardItem[] = await Promise.all(
        items.map(async (item) => {
          try {
            const endpoint =
              item.mediaType === 'movie'
                ? `/api/v1/movie/${item.tmdbId}`
                : `/api/v1/tv/${item.tmdbId}`;
            const res = await axios.get<MovieDetails | TvDetails>(endpoint);
            return {
              tmdbId: item.tmdbId,
              mediaType: item.mediaType as 'movie' | 'tv',
              score: item.score,
              position: item.position,
              tmdbData: res.data,
            };
          } catch {
            return {
              tmdbId: item.tmdbId,
              mediaType: item.mediaType as 'movie' | 'tv',
              score: item.score,
              position: item.position,
              tmdbData: null,
            };
          }
        })
      );
      return enriched;
    },
    []
  );

  // Initialize queue from first page; dedupe and track seen ids
  useEffect(() => {
    if (data?.results && !hasInitialized.current) {
      hasInitialized.current = true;
      const doInit = async () => {
        const newItems = data.results.filter(
          (r) => !seenIds.current.has(itemKey(r.mediaType, r.tmdbId))
        );
        newItems.forEach((r) =>
          seenIds.current.add(itemKey(r.mediaType, r.tmdbId))
        );
        const enriched = await enrichBatch(newItems);
        setQueue(enriched);
        // Feed API returns pageInfo.pages: 1 always; treat exhausted only when we got fewer than requested
        if (data.results.length < BATCH_SIZE) {
          setIsExhausted(true);
        }
      };
      doInit();
    }
  }, [data, enrichBatch]);

  // Fetch vote state for current card
  useEffect(() => {
    const item = queue[currentIndex];
    if (!item) {
      setCurrentVote(null);
      return;
    }

    const fetchVote = async () => {
      try {
        const res = await axios.get<VoteLookupResponse>(
          `/api/v1/vote/${item.mediaType}/${item.tmdbId}`
        );
        setCurrentVote(res.data.vote?.actionType ?? null);
      } catch {
        setCurrentVote(null);
      }
    };

    fetchVote();
  }, [currentIndex, queue]);

  // Prefetch when stack is low: skip = unvoted items we already have so API returns the next page
  const fetchNextPage = useCallback(async () => {
    if (isExhausted || isFetching.current) return;
    isFetching.current = true;
    try {
      const skip = queue.length - currentIndex; // items still on stack (unvoted in memory)
      const res = await axios.get<FeedApiResponse>(
        `/api/v1/feed?take=${BATCH_SIZE}&skip=${skip}`
      );
      const newResults = (res.data.results ?? []).filter(
        (r) => !seenIds.current.has(itemKey(r.mediaType, r.tmdbId))
      );
      newResults.forEach((r) =>
        seenIds.current.add(itemKey(r.mediaType, r.tmdbId))
      );
      if (newResults.length > 0) {
        const enriched = await enrichBatch(newResults);
        setQueue((prev) => [...prev, ...enriched]);
      }
      if (res.data.results.length < BATCH_SIZE) {
        setIsExhausted(true);
      }
    } catch {
      // Silently fail
    } finally {
      isFetching.current = false;
    }
  }, [currentIndex, queue.length, isExhausted, enrichBatch]);

  // Auto-prefetch when within threshold of running out
  useEffect(() => {
    const remaining = queue.length - currentIndex;
    if (remaining <= PREFETCH_THRESHOLD && !isExhausted) {
      fetchNextPage();
    }
  }, [currentIndex, queue.length, isExhausted, fetchNextPage]);

  const canRequestMedia = useCallback(
    (item?: SwipeCardItem | null) => {
      if (!item) return false;

      const hasRequestPermission = hasPermission(
        [
          Permission.REQUEST,
          item.mediaType === 'movie'
            ? Permission.REQUEST_MOVIE
            : Permission.REQUEST_TV,
        ],
        { type: 'or' }
      );

      if (!hasRequestPermission) {
        return false;
      }

      const mediaInfo = (
        item.tmdbData as { mediaInfo?: Record<string, unknown> }
      )?.mediaInfo;
      if (!mediaInfo) {
        return true;
      }

      const status = mediaInfo.status as MediaStatus | undefined;
      const requests = Array.isArray(mediaInfo.requests)
        ? (mediaInfo.requests as unknown[])
        : [];
      const activeRequestOwnerId = getPendingRequestOwner(requests);

      if (
        status === MediaStatus.UNKNOWN ||
        (status === MediaStatus.DELETED && activeRequestOwnerId === undefined)
      ) {
        return true;
      }

      if (
        item.mediaType === 'tv' &&
        status !== MediaStatus.BLOCKLISTED &&
        status !== MediaStatus.AVAILABLE &&
        status !== MediaStatus.PARTIALLY_AVAILABLE &&
        activeRequestOwnerId !== user?.id
      ) {
        return true;
      }

      return false;
    },
    [hasPermission, user?.id]
  );

  const submitVote = useCallback(
    async (
      item: SwipeCardItem,
      actionType: 'interested' | 'not_interested'
    ) => {
      setIsVoting(true);
      try {
        await axios.post('/api/v1/vote', {
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
          actionType,
        });
      } catch {
        addToast('Failed to record vote.', {
          appearance: 'error',
          autoDismiss: true,
        });
      } finally {
        setIsVoting(false);
      }
    },
    [addToast]
  );

  const openRequestFlow = useCallback(() => {
    const item = queue[currentIndex];
    if (!item || !canRequestMedia(item)) {
      return;
    }

    setDetailsIndex(null);
    setRequestItem(item);
    setIsRequestHolding(true);
    setIsRequestModalOpen(true);
  }, [canRequestMedia, currentIndex, queue]);

  const handleSwipe = useCallback(
    async (direction: SwipeDirection) => {
      const item = queue[currentIndex];
      if (!item) return;

      if (direction === 'up') {
        if (isCompletingRequest.current) {
          isCompletingRequest.current = false;
          setRequestItem(null);
          setIsRequestHolding(false);
          setCurrentIndex((i) => i + 1);
          setCurrentVote(null);
          return;
        }

        openRequestFlow();
        return;
      }

      const actionType =
        direction === 'right' ? 'interested' : 'not_interested';
      submitVote(item, actionType);
      setCurrentIndex((i) => i + 1);
      setDetailsIndex(null);
      setCurrentVote(null);
    },
    [currentIndex, openRequestFlow, queue, submitVote]
  );

  const handleButtonPass = useCallback(() => {
    cardRef.current?.triggerSwipe('left');
  }, []);

  const handleButtonInterested = useCallback(() => {
    cardRef.current?.triggerSwipe('right');
  }, []);

  const handleButtonRequest = useCallback(() => {
    openRequestFlow();
  }, [openRequestFlow]);

  const handleRefresh = useCallback(() => {
    hasInitialized.current = false;
    isCompletingRequest.current = false;
    seenIds.current = new Set();
    setRefreshId((r) => r + 1);
    setQueue([]);
    setCurrentIndex(0);
    setIsExhausted(false);
    setRequestItem(null);
    setIsRequestModalOpen(false);
    setIsRequestHolding(false);
    setCurrentVote(null);
  }, []);

  // Loading state
  if (isLoading || (data && queue.length === 0 && !isExhausted)) {
    return (
      <div className="flex h-[calc(100dvh-64px)] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const currentItem = queue[currentIndex];
  const nextItem = queue[currentIndex + 1];
  const isFinished = currentIndex >= queue.length && queue.length > 0;
  const isEmpty = queue.length === 0 && !isLoading;
  const detailsItem = detailsIndex !== null ? queue[detailsIndex] : null;
  const hasRequestPermissionForType = (mediaType: 'movie' | 'tv') =>
    hasPermission(
      [
        Permission.REQUEST,
        mediaType === 'movie'
          ? Permission.REQUEST_MOVIE
          : Permission.REQUEST_TV,
      ],
      { type: 'or' }
    );
  const canCurrentItemRequest = canRequestMedia(currentItem);
  const canDetailsItemRequest = canRequestMedia(detailsItem);
  const showRequestAction =
    !!currentItem && hasRequestPermissionForType(currentItem.mediaType);
  const showDetailsRequestAction =
    !!detailsItem && hasRequestPermissionForType(detailsItem.mediaType);

  // Backdrop image
  const backdropUrl = currentItem?.tmdbData?.backdropPath
    ? `https://image.tmdb.org/t/p/w1280${currentItem.tmdbData.backdropPath}`
    : null;

  return (
    <div className="fixed inset-0 top-16 z-0 flex flex-col overflow-hidden lg:left-64">
      {/* Dynamic Backdrop */}
      {backdropUrl && (
        <div
          className="absolute inset-[-10%] z-0 h-[120%] w-[120%] bg-cover bg-center opacity-30 blur-2xl brightness-75 transition-all duration-1000"
          style={{ backgroundImage: `url(${backdropUrl})` }}
        />
      )}
      <div className="absolute inset-0 z-[1] bg-gray-900/50" />

      {/* Header */}
      <div className="relative z-10 flex-shrink-0 pb-1 pt-4 text-center">
        <h2 className="text-xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-2xl">
          Would you watch this?
        </h2>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-300 drop-shadow-md">
          Swipe to vote
        </p>
      </div>

      {/* Card Stack */}
      <div className="relative z-10 mx-auto w-full max-w-lg flex-1 px-4 py-2">
        {isFinished || isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-white/10 bg-gray-800/80 p-8 text-center shadow-2xl backdrop-blur-lg">
            <span className="mb-4 text-6xl">🎉</span>
            <h3 className="mb-2 text-2xl font-bold text-white">
              {isEmpty ? 'No Items Yet' : "You're Caught Up!"}
            </h3>
            <p className="mb-6 text-sm text-gray-400">
              {isEmpty
                ? 'The feed is empty. Check back later or add more media.'
                : "You've curated everything in the feed."}
            </p>
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 rounded-xl border border-indigo-500/30 bg-indigo-500/20 px-6 py-3 font-bold text-indigo-300 transition active:scale-95"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span>Refresh Feed</span>
            </button>
          </div>
        ) : (
          <>
            {nextItem && (
              <SwipeableCard
                key={`${nextItem.mediaType}-${nextItem.tmdbId}`}
                item={nextItem}
                isTop={false}
                onSwipe={() => {}}
                onTapDetails={() => {}}
                canRequest={false}
                isRequestHolding={false}
              />
            )}
            {currentItem && (
              <SwipeableCard
                ref={cardRef}
                key={`${currentItem.mediaType}-${currentItem.tmdbId}`}
                item={currentItem}
                isTop={true}
                onSwipe={handleSwipe}
                onTapDetails={() => setDetailsIndex(currentIndex)}
                canRequest={canCurrentItemRequest}
                isRequestHolding={isRequestHolding}
              />
            )}
          </>
        )}
      </div>

      {/* Vote Buttons — extra bottom padding for mobile nav bar */}
      {!isFinished && !isEmpty && (
        <div className="relative z-10 flex-shrink-0 pb-24 pt-2 sm:pb-10">
          <VoteButtons
            onPass={handleButtonPass}
            onInterested={handleButtonInterested}
            onRequest={handleButtonRequest}
            disabled={isVoting || !currentItem}
            showRequestAction={showRequestAction}
            canRequest={canCurrentItemRequest}
            mediaStatus={(currentItem?.tmdbData as any)?.mediaInfo?.status}
            currentVote={currentVote}
          />
        </div>
      )}

      {/* Details Modal */}
      <MediaDetailsModal
        open={!!detailsItem}
        onClose={() => setDetailsIndex(null)}
        mediaType={detailsItem?.mediaType || 'movie'}
        tmdbId={detailsItem?.tmdbId || 0}
        data={detailsItem?.tmdbData || null}
        currentVote={currentVote}
        onRequest={openRequestFlow}
        showRequestAction={showDetailsRequestAction}
        canRequest={canDetailsItemRequest}
        onPass={() => {
          setDetailsIndex(null);
          setTimeout(() => cardRef.current?.triggerSwipe('left'), 100);
        }}
        onInterested={() => {
          setDetailsIndex(null);
          setTimeout(() => cardRef.current?.triggerSwipe('right'), 100);
        }}
      />
      {requestItem && (
        <RequestModal
          show={isRequestModalOpen}
          type={requestItem.mediaType}
          tmdbId={requestItem.tmdbId}
          onComplete={() => {
            setIsRequestModalOpen(false);
            isCompletingRequest.current = true;
            cardRef.current?.triggerSwipe('up');
          }}
          onCancel={() => {
            setIsRequestModalOpen(false);
            setIsRequestHolding(false);
            setRequestItem(null);
            cardRef.current?.resetCard();
          }}
        />
      )}
    </div>
  );
};

export default SwipeFeed;
