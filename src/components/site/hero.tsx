'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Photo } from './photo';
import { PHOTOS } from '@/lib/site-photos';
import { ArrowRight } from 'lucide-react';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The hero.
 *
 * Asymmetric rather than centred: the left column carries the whole argument
 * and the right carries the evidence, which is what a caterer is actually
 * selling. The two photographs overlap on purpose — one tall plate of the
 * table, one square of a single dish sitting into its corner — so the block
 * reads as a composition instead of a stock frame.
 *
 * Everything above the fold is four things: what this is, the claim, one
 * sentence, and the two doors out. Anything else moves down the page.
 */
export function Hero() {
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: EASE },
  });

  return (
    <section className="relative overflow-hidden">
      {/* Warm ambient wash behind the type, so the left column is not a flat
          field of background next to a photograph. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-ink-radial" />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-24 h-[520px] w-[520px] rounded-full bg-[rgb(var(--gold)/0.09)] blur-[130px]"
      />

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-4 pb-20 pt-[104px] sm:px-6 lg:grid-cols-12 lg:gap-10 lg:pb-24 lg:pt-24">
        <div className="lg:col-span-6 xl:col-span-5">
          <motion.p
            {...rise(0)}
            className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold"
          >
            Wedding and event catering
          </motion.p>

          <motion.h1
            {...rise(0.08)}
            className="mt-5 font-display text-4xl leading-[1.06] tracking-tight text-[rgb(var(--text))] sm:text-5xl lg:text-[3.4rem]"
          >
            The food people
            <br />
            still talk about.
          </motion.h1>

          <motion.p
            {...rise(0.16)}
            className="mt-5 max-w-[46ch] text-base leading-relaxed text-[rgb(var(--text-muted))]"
          >
            Mehndis, valimas, aqiqahs and office lunches across Karachi. Cooked fresh
            on the day, served hot, priced honestly by the head.
          </motion.p>

          <motion.div {...rise(0.24)} className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#enquire"
              className="group inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-ink ring-1 ring-inset ring-white/15 transition-all duration-200 hover:bg-gold-light active:translate-y-px"
            >
              Request a quotation
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <a
              href="#menu"
              className="inline-flex items-center rounded-xl border border-[rgb(var(--gold)/0.4)] px-5 py-3 text-sm text-[rgb(var(--text))] transition-colors duration-200 hover:border-[rgb(var(--gold)/0.75)] hover:bg-[rgb(var(--gold)/0.1)]"
            >
              See the menu
            </a>
          </motion.div>
        </div>

        <div className="lg:col-span-6 lg:col-start-7 xl:col-span-7">
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
            className="relative mx-auto max-w-[520px] lg:max-w-none"
          >
            <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border)/0.6)] shadow-lift">
              {/* Fixed height above `lg`, not an aspect ratio: the column is
                  wide there, and a portrait ratio against it grows the hero
                  past the fold and pushes the CTAs off screen. */}
              <div className="aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:h-[560px]">
                <Photo photo={PHOTOS.heroMain} priority sizes="(max-width: 1024px) 92vw, 44vw" />
              </div>
            </div>

            {/* The inset sits OUTSIDE the frame on wide screens and tucks back
                inside on a phone, where hanging it over the edge would push
                the page sideways. */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35, ease: EASE }}
              className="absolute -bottom-6 right-4 hidden w-40 overflow-hidden rounded-2xl border border-[rgb(var(--gold)/0.35)] shadow-lift sm:block lg:bottom-8 lg:-left-12 lg:right-auto lg:w-44"
            >
              <div className="aspect-square">
                <Photo photo={PHOTOS.heroInset} sizes="200px" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
