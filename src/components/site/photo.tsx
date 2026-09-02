/**
 * One photographic slot on the public site.
 *
 * A plain `<img>` rather than `next/image`: image optimisation is switched off
 * for this deployment (see the note in next.config.mjs), so `<Image>` would
 * render this same tag after a detour through a component that also wants to
 * own the layout. Width and height are always given, which is the part that
 * actually matters — the browser reserves the box before the file lands and
 * nothing below it moves.
 */
import { cn } from '@/lib/format';
import type { SitePhoto } from '@/lib/site-photos';

export function Photo({
  photo, className, priority, sizes,
}: { photo: SitePhoto; className?: string; priority?: boolean; sizes?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo.src}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      sizes={sizes}
      // The hero image is the largest-contentful paint, so it must not wait
      // for the lazy-loading observer.
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      draggable={false}
      className={cn('h-full w-full object-cover', className)}
    />
  );
}
