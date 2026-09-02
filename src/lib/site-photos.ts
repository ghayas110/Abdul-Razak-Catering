/**
 * The photography the public site renders.
 *
 * Real files, served from this repository rather than hotlinked, so the site
 * does not go blank the day a third-party CDN changes its URLs. They came from
 * Unsplash, whose licence allows commercial use without attribution;
 * `credit` is recorded here anyway so the photographer is traceable and so a
 * replacement can be sourced from the same shoot if one is ever wanted.
 *
 * ⚠ These are stand-ins for the client's OWN work. Every one of them is a
 * genuine catering scene, but none of them is this kitchen's food or a
 * function it actually catered. Replace them as soon as a shoot exists: drop
 * the new files into `public/photos/` under the same names and nothing else
 * has to move, because each slot declares the ratio it was laid out for and
 * the image is cropped to fill.
 *
 * Shot list, with what each slot wants:
 *
 *   heroMain        4:3   the buffet before service opens, wide enough to show the room
 *   heroInset       1:1   one dish carried or plated, close
 *   occasionsWide   4:3   guests filling their plates along the hot line
 *   occasionsSmall  4:3   a laid-out spread, no people, styled
 *   menuBand       16:9   food across the frame, shot wide
 */

export interface SitePhoto {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Photographer, for traceability. Not rendered. */
  credit: string;
}

export const PHOTOS = {
  heroMain: {
    src: '/photos/buffet-line.jpg',
    alt: 'A row of covered chafing dishes laid out along a banquet table before service',
    width: 1500, height: 1125, credit: 'Masood Aslami / Unsplash',
  },
  heroInset: {
    src: '/photos/biryani-platter.jpg',
    alt: 'A steel platter of rice and slow-cooked meat being carried out to the table',
    width: 800, height: 800, credit: 'Amaan Abid / Unsplash',
  },
  occasionsWide: {
    src: '/photos/guests-at-line.jpg',
    alt: 'Guests filling their plates along the hot line at a catered function',
    width: 1500, height: 1125, credit: 'Jacob McGowin / Unsplash',
  },
  occasionsSmall: {
    src: '/photos/buffet-spread.jpg',
    alt: 'A catering spread laid out in silver dishes with salad and fried starters',
    width: 1000, height: 750, credit: 'Saile Ilyas / Unsplash',
  },
  menuBand: {
    src: '/photos/handi-biryani.jpg',
    alt: 'Clay handis of biryani and salad set out on a serving table',
    width: 1800, height: 1013, credit: 'Adil Murshed / Unsplash',
  },
} satisfies Record<string, SitePhoto>;
