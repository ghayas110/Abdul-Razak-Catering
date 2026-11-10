'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, ArrowLeft, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

/**
 * Standalone print document frame: a neutral backdrop with a centered A4 sheet
 * and a (non-printing) toolbar. Only the sheet prints.
 */
export function PrintShell({ children, backHref, autoPrint = false }: { children: React.ReactNode; backHref: string; autoPrint?: boolean }) {
  const router = useRouter();
  /**
   * On-screen preview zoom only — printing always uses 100%.
   *
   * Starts at 100 so the server-rendered markup and the first client render
   * agree; the fit-to-width pass below runs after mount and adjusts it on a
   * narrow screen.
   */
  const [zoom, setZoom] = useState(100);
  /** Once the operator touches the zoom, stop fitting it for them. */
  const [manual, setManual] = useState(false);

  /**
   * Sheet height has to differ by browser, so tag the root for CSS.
   *
   * Verified by rendering real PDFs through headless Chrome: with
   * `@page { margin: 0 }` Chrome gives the FULL 297mm page, so a 297mm sheet
   * puts the footer flush on the paper edge and still prints 2 pages.
   * Safari ignores that and enforces the generic printer's ~12.7mm margins, so
   * anything over ~271mm spills the footer onto a blank page (the 4-page bug).
   * One height cannot satisfy both, and CSS cannot query the printable area.
   */
  useEffect(() => {
    const ua = navigator.userAgent;
    const isSafari = /^((?!chrome|chromium|crios|android|fxios|edg).)*safari/i.test(ua);
    document.documentElement.classList.toggle('rgb-safari', isSafari);
  }, []);

  /**
   * Fit the A4 sheet to the screen it is being read on.
   *
   * The sheet is 210mm — 794 CSS px — which is nearly all of a laptop window
   * and more than twice a phone's width. Without this a phone showed the
   * left-hand ~47% of the page and no way to reach the rest.
   *
   * Only ever shrinks. Blowing a slip up past 100% on a wide monitor is not
   * something anyone asked for, and it would push the sheet off the top of the
   * viewport.
   */
  useEffect(() => {
    if (manual) return;
    const fit = () => {
      // The backdrop's horizontal padding, which the sheet cannot use.
      const pad = window.innerWidth <= 640 ? 16 : 24;
      const available = window.innerWidth - pad;
      const A4_PX = 794;
      setZoom(Math.max(25, Math.min(100, Math.floor((available / A4_PX) * 100))));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [manual]);

  const nudge = (next: number) => { setManual(true); setZoom(next); };

  useEffect(() => {
    if (autoPrint) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [autoPrint]);

  return (
    <div className="rgb-backdrop grain">
      <div className="rgb-toolbar">
        <button className="rgb-btn rgb-btn-ghost" onClick={() => router.push(backHref)}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="rgb-zoom">
          <button className="rgb-btn rgb-btn-ghost" onClick={() => nudge(Math.max(25, zoom - 10))} aria-label="Zoom out" title="Zoom out">
            <ZoomOut size={16} />
          </button>
          <span className="rgb-zoom-val" aria-live="polite">{zoom}%</span>
          <button className="rgb-btn rgb-btn-ghost" onClick={() => nudge(Math.min(200, zoom + 10))} aria-label="Zoom in" title="Zoom in">
            <ZoomIn size={16} />
          </button>
          {/* Hands the sheet back to the automatic fit rather than snapping to
              a literal 100%, which on a phone is the broken state this screen
              was in before. */}
          <button className="rgb-btn rgb-btn-ghost" onClick={() => { setManual(false); }} aria-label="Fit to screen" title="Fit to screen">
            <RotateCcw size={14} />
          </button>
        </div>
        <button className="rgb-btn rgb-btn-gold" onClick={() => window.print()}>
          <Printer size={16} /> Print / Save PDF
        </button>
      </div>
      {/* Zoom scales the on-screen preview only. `--rgb-zoom` is ignored inside
          @media print, so the printed sheet is always full size. */}
      <div className="rgb-zoom-wrap" style={{ ['--rgb-zoom' as string]: String(zoom / 100) }}>
        {children}
      </div>
    </div>
  );
}
