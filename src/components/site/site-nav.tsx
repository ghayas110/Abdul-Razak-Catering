'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion, useScroll, useMotionValueEvent } from 'framer-motion';
import { BrandLockup } from '@/components/brand';
import { cn } from '@/lib/format';
import { Menu, X, LogIn } from 'lucide-react';

const LINKS = [
  { label: 'What we cater', href: '#occasions' },
  { label: 'Menu', href: '#menu' },
  { label: 'Contact', href: '#enquire' },
];

/**
 * The public header.
 *
 * One line at every desktop width and 68px tall, which is the whole design
 * constraint: three section links, the wordmark, and the one door staff need.
 * Anything else belongs in the footer.
 *
 * It starts transparent over the hero photograph and takes on a surface once
 * the page has moved, so the mark reads against both.
 */
export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [lifted, setLifted] = useState(false);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();

  // `useMotionValueEvent` rather than a scroll listener: this runs off the
  // motion frame loop and only sets state on the one frame the value crosses
  // the threshold, instead of re-rendering the tree on every scroll tick.
  useMotionValueEvent(scrollY, 'change', (y) => {
    const next = y > 24;
    setLifted((cur) => (cur === next ? cur : next));
  });

  return (
    <header
      className={cn(
        'no-print fixed inset-x-0 top-0 z-40 transition-colors duration-300',
        lifted
          ? 'border-b border-[rgb(var(--border)/0.5)] bg-[rgb(var(--bg)/0.86)] backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Abdul Razak Catering, home">
          <BrandLockup name="Abdul Razak" sub="Catering Service" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-[rgb(var(--text-muted))] transition-colors hover:text-[rgb(var(--text))]"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--gold)/0.4)] px-4 py-2 text-sm text-[rgb(var(--text))] transition-colors hover:border-[rgb(var(--gold)/0.75)] hover:bg-[rgb(var(--gold)/0.1)]"
          >
            <LogIn className="h-4 w-4" /> Staff login
          </Link>
        </nav>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="rounded-xl p-2 text-[rgb(var(--text-muted))] transition-colors hover:text-[rgb(var(--text))] md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-[rgb(var(--border)/0.5)] bg-[rgb(var(--bg))] md:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))]"
                >
                  {l.label}
                </a>
              ))}
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-1 flex items-center gap-2 rounded-xl border border-[rgb(var(--gold)/0.4)] px-3 py-2.5 text-sm text-[rgb(var(--text))]"
              >
                <LogIn className="h-4 w-4" /> Staff login
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
