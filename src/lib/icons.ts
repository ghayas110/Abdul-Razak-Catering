/**
 * Where the app's icons live, and the one knob that busts every icon cache.
 *
 * ── Why the version is in the PATH and not a ?v= query ──
 *
 * It used to be `/icons/apple-touch-icon.png?v=2`. That works on Android and
 * on desktop browsers, and does nothing at all on an iPhone: when iOS saves a
 * site to the home screen it stores the icon in a WebClip keyed by the file's
 * PATH, ignoring the query string, and it never re-fetches that icon for the
 * life of the clip. Clearing Safari's history and website data does not touch
 * it either — that is a different cache. So the client's phone kept showing
 * the old mark no matter what they cleared, while the same build showed the
 * new one on Android. Changing the path is the only thing iOS treats as a
 * genuinely different icon.
 *
 * ── Using it ──
 *
 * Bump ICON_VERSION whenever the artwork changes, then run `npm run icons`,
 * which writes the whole set into `public/icons/<version>/`. Every reference
 * in the app builds its URL through `iconPath`, so nothing is left pointing at
 * the old folder.
 *
 * The previous folder is deliberately left on disk: anything already cached or
 * bookmarked against the old URL keeps resolving instead of 404ing.
 *
 * NOTE: an iPhone that ALREADY has the app on its home screen still shows the
 * old icon after this change — iOS will not update the icon of an existing
 * clip. The icon has to be removed from the home screen and re-added, at which
 * point the new path is fetched fresh.
 */
export const ICON_VERSION = 'v3';

/** `/icons/v3/icon-192.png` — always build icon URLs through this. */
export const iconPath = (file: string) => `/icons/${ICON_VERSION}/${file}`;
