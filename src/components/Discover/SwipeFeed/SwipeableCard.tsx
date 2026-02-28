import CachedImage from '@app/components/Common/CachedImage';
import StatusBadge from '@app/components/StatusBadge';
import {
  ArrowDownTrayIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
} from '@heroicons/react/24/solid';
import type { MovieDetails } from '@server/models/Movie';
import type { TvDetails } from '@server/models/Tv';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

export interface SwipeableCardHandle {
  triggerSwipe: (direction: 'left' | 'right' | 'up') => void;
  resetCard: () => void;
}

type MediaData = MovieDetails | TvDetails | null;

export interface SwipeCardItem {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  score: number;
  position: number;
  tmdbData: MediaData;
}

interface SwipeableCardProps {
  item: SwipeCardItem;
  isTop: boolean;
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  onTapDetails: () => void;
  canRequest?: boolean;
  isRequestHolding?: boolean;
}

const SWIPE_THRESHOLD = 120;
const SWIPE_UP_THRESHOLD = 95;

const SwipeableCard = forwardRef<SwipeableCardHandle, SwipeableCardProps>(
  (
    {
      item,
      isTop,
      onSwipe,
      onTapDetails,
      canRequest = false,
      isRequestHolding,
    },
    ref
  ) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const dragState = useRef({
      isDragging: false,
      startX: 0,
      startY: 0,
      currX: 0,
      currY: 0,
    });
    const [, setRenderTick] = useState(0);

    const setOverlayOpacity = useCallback(
      (direction: 'left' | 'right' | 'up' | null, opacity: number) => {
        if (!cardRef.current) return;
        const oLike =
          cardRef.current.querySelector<HTMLElement>('.overlay-like');
        const oNope =
          cardRef.current.querySelector<HTMLElement>('.overlay-nope');
        const oRequest =
          cardRef.current.querySelector<HTMLElement>('.overlay-request');
        if (oLike)
          oLike.style.opacity = direction === 'right' ? `${opacity}` : '0';
        if (oNope)
          oNope.style.opacity = direction === 'left' ? `${opacity}` : '0';
        if (oRequest)
          oRequest.style.opacity = direction === 'up' ? `${opacity}` : '0';
      },
      []
    );

    const animateOut = useCallback(
      (direction: 'left' | 'right' | 'up') => {
        if (!cardRef.current) return;
        cardRef.current.style.transition =
          'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s';
        if (direction === 'right') {
          cardRef.current.style.transform = 'translateX(150%) rotate(15deg)';
        } else if (direction === 'left') {
          cardRef.current.style.transform = 'translateX(-150%) rotate(-15deg)';
        } else {
          cardRef.current.style.transform = 'translateY(-145%) scale(0.95)';
        }
        cardRef.current.style.opacity = '0';
        setTimeout(() => onSwipe(direction), 250);
      },
      [onSwipe]
    );

    useImperativeHandle(ref, () => ({
      triggerSwipe: (direction: 'left' | 'right' | 'up') => {
        if (cardRef.current) {
          const overlays =
            cardRef.current.querySelectorAll<HTMLElement>('.card-overlay');
          overlays.forEach((o) => (o.style.transition = 'opacity 0.15s'));
        }
        setOverlayOpacity(direction, 0.9);
        animateOut(direction);
      },
      resetCard: () => {
        if (!cardRef.current) return;
        dragState.current.isDragging = false;
        cardRef.current.style.transition =
          'transform 0.2s ease, opacity 0.2s ease';
        cardRef.current.style.transform = '';
        cardRef.current.style.opacity = '1';
        setOverlayOpacity(null, 0);
      },
    }));

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isTop) return;
      if ((e.target as HTMLElement).closest('button')) return;
      if (isRequestHolding) return;

      const drag = dragState.current;
      drag.isDragging = true;
      drag.startX = e.clientX;
      drag.startY = e.clientY;
      drag.currX = e.clientX;
      drag.currY = e.clientY;

      if (cardRef.current) {
        cardRef.current.style.transition = 'none';
        const overlays =
          cardRef.current.querySelectorAll<HTMLElement>('.card-overlay');
        overlays.forEach((o) => (o.style.transition = 'none'));
      }

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragState.current;
      if (!drag.isDragging || !cardRef.current) return;

      drag.currX = e.clientX;
      drag.currY = e.clientY;

      const dX = drag.currX - drag.startX;
      const dY = drag.currY - drag.startY;
      const rotate = dX * 0.05;

      cardRef.current.style.transform = `translate(${dX}px, ${dY}px) rotate(${rotate}deg)`;

      const isUpwardIntent = dY < 0 && Math.abs(dY) > Math.abs(dX);
      if (isUpwardIntent && canRequest) {
        setOverlayOpacity('up', Math.min(Math.abs(dY) / 120, 0.9));
      } else if (dX > 0) {
        setOverlayOpacity('right', Math.min(dX / 100, 0.9));
      } else if (dX < 0) {
        setOverlayOpacity('left', Math.min(Math.abs(dX) / 100, 0.9));
      } else {
        setOverlayOpacity(null, 0);
      }

      setRenderTick((t) => t + 1);
    };

    const handlePointerUp = () => {
      const drag = dragState.current;
      if (!drag.isDragging || !cardRef.current) return;
      drag.isDragging = false;

      const dX = drag.currX - drag.startX;
      const dY = drag.currY - drag.startY;

      cardRef.current.style.transition =
        'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s';
      const overlays =
        cardRef.current.querySelectorAll<HTMLElement>('.card-overlay');
      overlays.forEach((o) => (o.style.transition = 'opacity 0.3s'));

      if (Math.abs(dX) < 10 && Math.abs(dY) < 10) {
        cardRef.current.style.transform = '';
        setOverlayOpacity(null, 0);
        return;
      }

      if (
        canRequest &&
        dY < -SWIPE_UP_THRESHOLD &&
        Math.abs(dX) < SWIPE_THRESHOLD
      ) {
        onSwipe('up');
        cardRef.current.style.transform = '';
        setOverlayOpacity(null, 0);
      } else if (Math.abs(dX) > SWIPE_THRESHOLD) {
        const direction = dX > 0 ? 'right' : 'left';
        animateOut(direction);
      } else {
        cardRef.current.style.transform = '';
        setOverlayOpacity(null, 0);
      }
    };

    useEffect(() => {
      if (!cardRef.current || dragState.current.isDragging) {
        return;
      }

      cardRef.current.style.transition =
        'transform 0.25s ease, opacity 0.25s ease';

      if (isRequestHolding) {
        cardRef.current.style.transform = 'translateX(-14px) rotate(-3deg)';
        setOverlayOpacity('up', 0.9);
      } else {
        cardRef.current.style.transform = '';
        setOverlayOpacity(null, 0);
      }
    }, [isRequestHolding, setOverlayOpacity]);

    const data = item.tmdbData;
    const title =
      item.mediaType === 'movie'
        ? (data as MovieDetails)?.title
        : (data as TvDetails)?.name;
    const releaseDate =
      item.mediaType === 'movie'
        ? (data as MovieDetails)?.releaseDate
        : (data as TvDetails)?.firstAirDate;
    const year = (releaseDate || '').slice(0, 4);
    const posterUrl = data?.posterPath
      ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${data.posterPath}`
      : '/images/overseerr_poster_not_found_logo_top.png';

    const mediaInfo = data && 'mediaInfo' in data ? data.mediaInfo : undefined;

    const positionClasses = isTop
      ? 'z-30 translate-y-0 scale-100'
      : 'z-20 translate-y-3 scale-[0.95] pointer-events-none';

    return (
      <div
        ref={cardRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`absolute inset-x-4 bottom-0 top-0 mx-auto max-w-[420px] select-none overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 shadow-2xl transition-[transform,opacity] duration-300 ${positionClasses} ${
          isTop ? 'cursor-grab touch-none active:cursor-grabbing' : ''
        }`}
        style={{
          touchAction: isTop ? 'none' : undefined,
          willChange: 'transform, opacity',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
        }}
      >
        {/* Poster Image */}
        <div
          className="absolute inset-0 z-0"
          style={{
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
          }}
        >
          <CachedImage
            type="tmdb"
            src={posterUrl}
            alt={title || ''}
            fill
            className="object-cover"
            style={{ objectFit: 'cover' }}
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/40 to-transparent" />
        </div>

        {/* Media Type Badge */}
        <div className="absolute left-4 top-4 z-40">
          <span
            className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg backdrop-blur-md ${
              item.mediaType === 'movie'
                ? 'border-blue-400/50 bg-blue-600/80'
                : 'border-purple-400/50 bg-purple-600/80'
            }`}
          >
            {item.mediaType === 'movie' ? 'Movie' : 'Series'}
          </span>
        </div>

        {/* Status Badge */}
        <div className="pointer-events-auto absolute right-4 top-4 z-40">
          <StatusBadge
            status={mediaInfo?.status}
            downloadItem={mediaInfo?.downloadStatus}
            is4k={false}
            inProgress={(mediaInfo?.downloadStatus ?? []).length > 0}
            tmdbId={mediaInfo?.tmdbId}
            mediaType={item.mediaType}
          />
        </div>

        {/* Bottom Info — Tappable for Details */}
        <div
          role="button"
          tabIndex={0}
          className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start px-6 pb-6 pt-6 text-left outline-none"
          onClick={(e) => {
            e.stopPropagation();
            const { startX, startY, currX, currY, isDragging } =
              dragState.current;
            const diffX = currX - startX;
            const diffY = currY - startY;
            if (isDragging || Math.abs(diffX) > 5 || Math.abs(diffY) > 5)
              return;
            onTapDetails();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              onTapDetails();
            }
          }}
        >
          {year && (
            <span className="mb-2 inline-flex rounded-lg border border-white/10 bg-black/50 px-3 py-1 text-xs font-bold text-gray-200 shadow-sm backdrop-blur-xl">
              {year}
              {data?.voteAverage != null && data.voteAverage > 0 && (
                <span className="ml-2 text-amber-400">
                  ★ {data.voteAverage.toFixed(1)}
                </span>
              )}
            </span>
          )}
          <h3 className="line-clamp-2 text-2xl font-extrabold leading-tight text-white drop-shadow-lg sm:text-3xl">
            {title}
          </h3>
          {data?.overview && (
            <p className="mt-2 line-clamp-2 text-sm leading-snug text-gray-300 drop-shadow-md">
              {data.overview}
            </p>
          )}
        </div>

        {/* Swipe Overlays */}
        <div className="card-overlay overlay-like pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-[2rem] bg-emerald-500/30 opacity-0 backdrop-blur-md">
          <div className="flex h-32 w-32 rotate-12 items-center justify-center rounded-full border-4 border-emerald-400 bg-emerald-500 shadow-2xl">
            <HandThumbUpIcon className="h-16 w-16 text-white" />
          </div>
        </div>
        <div className="card-overlay overlay-nope pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-[2rem] bg-rose-500/30 opacity-0 backdrop-blur-md">
          <div className="flex h-32 w-32 -rotate-12 items-center justify-center rounded-full border-4 border-rose-400 bg-rose-500 shadow-2xl">
            <HandThumbDownIcon className="h-16 w-16 text-white" />
          </div>
        </div>
        <div className="card-overlay overlay-request pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-[2rem] bg-indigo-500/30 opacity-0 backdrop-blur-md">
          <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-indigo-400 bg-indigo-500 shadow-2xl">
            <ArrowDownTrayIcon className="h-16 w-16 text-white" />
          </div>
        </div>
      </div>
    );
  }
);

SwipeableCard.displayName = 'SwipeableCard';

export default SwipeableCard;
