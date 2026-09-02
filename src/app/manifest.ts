import type { MetadataRoute } from 'next';

// Served at /manifest.webmanifest. This is what makes the app installable and
// controls how it launches from the home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Abdul Razak Catering Service',
    short_name: 'Abdul Razak',
    description: 'Quotations, invoices, menu rates and the event ledger for Abdul Razak Catering Service, Karachi.',
    // Installed app opens on the sign-in screen; once a session exists the
    // login page forwards straight through to the dashboard.
    start_url: '/login',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0B0B0D',
    theme_color: '#0B0B0D',
    categories: ['business', 'productivity'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      { src: '/icons/favicon-32.png?v=2', sizes: '32x32', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-96.png?v=2', sizes: '96x96', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-128.png?v=2', sizes: '128x128', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png?v=2', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-256.png?v=2', sizes: '256x256', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-384.png?v=2', sizes: '384x384', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Padded variants so Android's circular/squircle masks don't crop the crest.
      { src: '/icons/icon-maskable-192.png?v=2', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // The three things staff open the installed app to do.
    shortcuts: [
      { name: 'New quotation', short_name: 'Quote', url: '/catering/quotations/new', icons: [{ src: '/icons/icon-192.png?v=2', sizes: '192x192' }] },
      { name: 'Quotations', short_name: 'Quotes', url: '/catering/quotations', icons: [{ src: '/icons/icon-192.png?v=2', sizes: '192x192' }] },
      { name: 'Invoices', short_name: 'Invoices', url: '/catering/invoices', icons: [{ src: '/icons/icon-192.png?v=2', sizes: '192x192' }] },
    ],
  };
}
