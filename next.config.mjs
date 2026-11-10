/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  // images: {
  //   /**
  //    * No runtime image optimisation, deliberately.
  //    *
  //    * Next's optimiser needs `sharp`, and `sharp` is a native binary. The
  //    * standalone build is produced on macOS, so it bundles
  //    * @img/sharp-darwin-x64 — which cannot load on the Linux host this deploys
  //    * to. The optimiser would then throw on every image request and each
  //    * <Image> would render broken. That is a worse failure than shipping the
  //    * original file, because it fails at request time rather than build time.
  //    *
  //    * Turning it off keeps everything <Image> is actually wanted for here:
  //    * intrinsic width and height (so nothing shifts as it loads), `priority`
  //    * preloading for the hero, lazy loading below the fold, and blur
  //    * placeholders baked in at build time from statically imported files.
  //    * Only the on-the-fly resizing and WebP conversion are given up, and the
  //    * assets are already sized for their slots.
  //    *
  //    * To turn this back on, the build must install Linux binaries:
  //    *   npm i --os=linux --cpu=x64 sharp
  //    * inside cpanel-build/ before zipping.
  //    */
  //   unoptimized: true,
  // },
  // Nothing gains from announcing the framework on every response.
  // poweredByHeader: false,

  /**
   * Long-lived caching for everything under /public that is served by the Node
   * process.
   *
   * Next serves files from /public with `Cache-Control: public, max-age=0`,
   * which means a browser re-asks for every one of them on every page view.
   * For the public site that was five photographs — about a megabyte — plus
   * the icon set, each one waking the Node process just to be told it had not
   * changed. These files are content-stable: the icons are already versioned
   * by folder (/icons/v3/...), and a photograph that changes gets a new name.
   *
   * See DEPLOY.md for the bigger win on cPanel: putting these files in the
   * domain's document root so Apache serves them and the app is never woken
   * at all.
   */
  // async headers() {
  //   const forever = [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }];
  //   return [
  //     { source: '/photos/:path*', headers: forever },
  //     { source: '/icons/:path*', headers: forever },
  //     { source: '/logo-mark.png', headers: forever },
  //     { source: '/logo.png', headers: forever },
  //     { source: '/mail-logo.png', headers: forever },
  //   ];
  // },

  experimental: {
    // serverActions: {
    //   // A long quotation posts a couple of hundred lines of JSON. Nowhere near
    //   // the 1mb default, but the headroom costs nothing and a rejected save on
    //   // a big wedding menu is the worst possible moment to find the limit.
    //   bodySizeLimit: '4mb',
    // },
  },
};

export default nextConfig;
