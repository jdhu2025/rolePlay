'use client';

/**
 * Photo carousel for character cards and detail pages.
 *
 * Behavior:
 * - 1 image: renders just the image, no controls.
 * - 2-5 images: dots always, arrows on hover (md+), horizontal swipe on touch,
 *   keyboard left/right when focused.
 * - Uses CSS scroll-snap to align each image and an IntersectionObserver
 *   inside the track to keep the active dot in sync with whichever image is
 *   centered. This works correctly for both swipe and arrow navigation.
 * - Images go through next/image so they get srcset, AVIF/WebP, and proper
 *   lazy loading. The first slide of the active loop window can be marked
 *   `priority` to hint the browser for early fetch.
 */

import Image from 'next/image';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useRef, useState } from 'react';

import { cn } from '@/shared/lib/utils';

type Props = {
  images: string[];
  alt: string;
  className?: string;
  /**
   * Aspect ratio class. Defaults to 3/4 portrait, which suits the character
   * photos. Pass a different ratio when embedding elsewhere.
   */
  aspectClassName?: string;
  /**
   * If set, marks the carousel as the visual hero of its page and gives the
   * first slide of the active loop window `priority` so next/image preloads
   * it.
   */
  priority?: boolean;
  /**
   * Click handler on the image area. Card-level navigation lives here.
   * Drag distance is measured against this so a swipe doesn't trigger click.
   */
  onImageClick?: () => void;
  /**
   * `sizes` attribute forwarded to next/image. Defaults to a card-friendly
   * value (1-col on mobile, 2-col tablet, 3-col desktop). Detail pages can
   * override with a tighter value to avoid downloading larger sources.
   */
  sizes?: string;
};

const SWIPE_THRESHOLD_PX = 24;

export function PhotoCarousel({
  images,
  alt,
  className,
  aspectClassName = 'aspect-[3/4]',
  priority = false,
  onImageClick,
  sizes = '(min-width: 1152px) 360px, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw',
}: Props) {
  const t = useTranslations('roleplay.carousel');
  const trackRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  // Whether the user has interacted with this carousel. Until they do, we
  // only mount the first slide. The picker grid renders 12 carousels at once;
  // mounting all photos eagerly would push next/image into ~36 IntersectionObserver
  // entries and equally many srcset evaluations even before any scroll happens.
  // Defer the secondary slides so the visible-but-idle carousels stay cheap.
  const [interacted, setInteracted] = useState(false);
  const dragStartRef = useRef<{ x: number; t: number } | null>(null);
  const activeRef = useRef(0);

  const safeImages = useMemo(
    () => images.filter((url) => typeof url === 'string' && url),
    [images]
  );
  const total = safeImages.length;

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const track = trackRef.current;
      const slide = slideRefs.current[index];
      if (!track || !slide) return;
      activeRef.current = index;
      track.scrollTo({ left: slide.offsetLeft, behavior });
    },
    []
  );

  const scrollBy = useCallback(
    (direction: -1 | 1) => {
      if (total <= 1) return;
      // Wrap so that going past either end loops back. The track is a finite
      // strip of `total` slides; we used to clone the source list 21x to fake
      // an infinite scroller, which inflated DOM weight on the picker grid.
      const current = activeRef.current;
      const nextIndex = (current + direction + total) % total;
      // Right-wrap (last -> first) and left-wrap (first -> last) jump across
      // the entire track; an animated scroll there would visibly slide
      // backwards through every intermediate slide. Snap instantly on wrap so
      // the carousel just lands on the new slide. Adjacent moves stay smooth.
      const isWrap =
        (direction === 1 && current === total - 1) ||
        (direction === -1 && current === 0);
      setInteracted(true);
      setActive(nextIndex);
      scrollToIndex(nextIndex, isWrap ? 'auto' : 'smooth');
    },
    [scrollToIndex, total]
  );

  // Keep active index in sync when the user scrolls the track directly via
  // touch swipe or trackpad. Also flips the `interacted` flag the first time
  // the user actually moves the carousel, which is the cue to mount the
  // remaining slides on-demand.
  const handleScroll = () => {
    const track = trackRef.current;
    if (!track || total <= 1) return;

    const index = Math.round(track.scrollLeft / track.clientWidth);
    activeRef.current = index;
    setActive(index);
    setInteracted(true);
  };


  if (total === 0) {
    return (
      <div
        className={cn(
          'relative grid place-items-center overflow-hidden rounded-[14px] bg-zinc-800 text-zinc-500',
          aspectClassName,
          className
        )}
      >
        <ImageOff size={28} aria-hidden="true" />
      </div>
    );
  }

  if (total === 1) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-[14px] bg-zinc-900',
          aspectClassName,
          className
        )}
      >
        <CarouselImage
          src={safeImages[0]}
          alt={alt}
          priority={priority}
          sizes={sizes}
          failed={failed.has(0)}
          onError={() =>
            setFailed((prev) => {
              const next = new Set(prev);
              next.add(0);
              return next;
            })
          }
          onClick={onImageClick}
        />
      </div>
    );
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollBy(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollBy(-1);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = { x: event.clientX, t: Date.now() };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start) return;

    const dx = event.clientX - start.x;
    const absDx = Math.abs(dx);
    if (absDx > SWIPE_THRESHOLD_PX) {
      scrollBy(dx < 0 ? 1 : -1);
      return;
    }

    if (onImageClick) {
      // Treat as click, not swipe; the browser will handle scroll-snap on its own.
      onImageClick();
    }
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[14px] bg-zinc-900',
        aspectClassName,
        className
      )}
      role="region"
      aria-roledescription="carousel"
      aria-label={alt}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={trackRef}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onScroll={handleScroll}
      >
        <ul className="flex h-full w-full">
          {safeImages.map((src, idx) => {
            // On-demand mounting: render the first slide immediately so the
            // card has its hero photo. Mount the second slide as soon as the
            // user has interacted (gives the next swipe an image to land on).
            // Mount the rest only when the user has navigated near them. This
            // keeps the picker grid at ~12 mounted images instead of ~36.
            const shouldRender =
              idx === 0 ||
              (interacted && Math.abs(idx - active) <= 1) ||
              // Wrap-around neighbour: when sitting on the last slide, the
              // previous arrow click jumps to slide 0; mount that slide too
              // so the swap isn't blank.
              (interacted &&
                ((active === 0 && idx === total - 1) ||
                  (active === total - 1 && idx === 0)));
            return (
              <li
                key={src}
                ref={(el) => {
                  slideRefs.current[idx] = el;
                }}
                className="relative h-full w-full shrink-0 snap-center snap-always"
                aria-roledescription="slide"
                aria-label={t('position', { current: idx + 1, total })}
              >
                {shouldRender ? (
                  <CarouselImage
                    src={src}
                    alt={alt}
                    priority={priority && idx === 0}
                    sizes={sizes}
                    failed={failed.has(idx)}
                    onError={() =>
                      setFailed((prev) => {
                        const next = new Set(prev);
                        next.add(idx);
                        return next;
                      })
                    }
                  />
                ) : (
                  <div
                    className="h-full w-full bg-zinc-900"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Arrows stay visible on touch so nested homepage rails can still
          change photos without fighting the outer character carousel. */}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          scrollBy(-1);
        }}
        aria-label={t('prev')}
        className={cn(
          'absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/38 text-white backdrop-blur transition-opacity',
          'opacity-80 hover:bg-black/55 hover:opacity-100 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100'
        )}
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          scrollBy(1);
        }}
        aria-label={t('next')}
        className={cn(
          'absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/38 text-white backdrop-blur transition-opacity',
          'opacity-80 hover:bg-black/55 hover:opacity-100 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100'
        )}
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>

      {/* Dots */}
      <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5">
        {safeImages.map((_, idx) => (
          <span
            key={idx}
            className={cn(
              'h-1.5 rounded-full bg-white/55 transition-all',
              idx === active ? 'w-4 bg-white' : 'w-1.5'
            )}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

// In dev the Next image optimizer runs on the local Node server and refuses
// any upstream that resolves to a private/reserved IP (Next 16 hardening).
// Some local proxy stacks (Clash/Surge fake-IP, corporate split-DNS) rewrite
// CDN hostnames into 198.18.0.0/15 which trips that guard, even though the
// browser itself can reach the asset just fine. Letting the browser fetch
// the original URL directly side-steps the optimizer in dev. Production builds
// run in a normal network and keep the full /_next/image pipeline.
const UNOPTIMIZED_IN_DEV = process.env.NODE_ENV !== 'production';

function CarouselImage({
  src,
  alt,
  priority,
  sizes,
  failed,
  onError,
  onClick,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  failed: boolean;
  onError: () => void;
  onClick?: () => void;
}) {
  if (failed) {
    return (
      <div className="grid h-full w-full place-items-center bg-zinc-800 text-zinc-500">
        <ImageOff size={28} aria-hidden="true" />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      onError={onError}
      onClick={onClick}
      fill
      sizes={sizes ?? '100vw'}
      priority={priority}
      unoptimized={UNOPTIMIZED_IN_DEV}
      draggable={false}
      className="select-none object-cover object-top"
    />
  );
}
