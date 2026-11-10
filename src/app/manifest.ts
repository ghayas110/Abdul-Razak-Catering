import type { MetadataRoute } from 'next';
import { iconPath } from '@/lib/icons';

// Served at /manifest.webmanifest. This is what makes the app installable and
// controls how it launches from the home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Abdul Razzak Catering',
    short_name: 'Abdul Razzak Catering',
    description: 'Quotations, invoices, menu rates and the event ledger for Abdul Razzak Catering, Karachi.',
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
      { src: iconPath('favicon-32.png'), sizes: '32x32', type: 'image/png', purpose: 'any' },
      { src: iconPath('icon-96.png'), sizes: '96x96', type: 'image/png', purpose: 'any' },
      { src: iconPath('icon-128.png'), sizes: '128x128', type: 'image/png', purpose: 'any' },
      { src: iconPath('icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: iconPath('icon-256.png'), sizes: '256x256', type: 'image/png', purpose: 'any' },
      { src: iconPath('icon-384.png'), sizes: '384x384', type: 'image/png', purpose: 'any' },
      { src: iconPath('icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Padded variants so Android's circular/squircle masks don't crop the crest.
      { src: iconPath('icon-maskable-192.png'), sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: iconPath('icon-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // The three things staff open the installed app to do.
    shortcuts: [
      { name: 'New quotation', short_name: 'Quote', url: '/catering/quotations/new', icons: [{ src: iconPath('icon-192.png'), sizes: '192x192' }] },
      { name: 'Quotations', short_name: 'Quotes', url: '/catering/quotations', icons: [{ src: iconPath('icon-192.png'), sizes: '192x192' }] },
      { name: 'Invoices', short_name: 'Invoices', url: '/catering/invoices', icons: [{ src: iconPath('icon-192.png'), sizes: '192x192' }] },
    ],
  };
}
