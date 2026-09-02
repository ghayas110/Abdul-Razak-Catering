'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Photo } from './photo';
import { PHOTOS } from '@/lib/site-photos';
import { cn } from '@/lib/format';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * What this kitchen actually gets booked for.
 *
 * A bento rather than a row of matching cards: these five are not equal, and a
 * grid that pretends they are makes the page read as a template. The two the
 * business lives on get the photographs and the space; the other three are set
 * as type on tinted ground, which is also what stops the block being five
 * white boxes in a line.
 *
 * Five items, five cells. The layout is written around that number — if a
 * sixth occasion is ever added the grid gets reshaped, not padded.
 */
export function Occasions() {
  const reduce = useReducedMotion();

  const cell = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.6, delay: i * 0.07, ease: EASE },
  });

  return (
    <section id="occasions" className="scroll-mt-20 border-t border-[rgb(var(--border)/0.4)] py-20 lg:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="max-w-[38ch]"
        >
          <h2 className="font-display text-3xl leading-tight text-[rgb(var(--text))] sm:text-4xl">
            Cooked for the occasion, not off a shelf.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[rgb(var(--text-muted))]">
            Every function is quoted on its own menu and its own headcount.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Mehndi — the wide photographic cell. */}
          <motion.article
            {...cell(0)}
            className="group relative col-span-1 overflow-hidden rounded-2xl border border-[rgb(var(--border)/0.6)] sm:col-span-2 lg:row-span-2"
          >
            <div className="aspect-[4/3] lg:h-full lg:aspect-auto lg:min-h-[420px]">
              <Photo
                photo={PHOTOS.occasionsWide}
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 92vw, 62vw"
                className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <h3 className="font-display text-2xl text-ivory">Mehndi and dholki nights</h3>
              <p className="mt-1.5 max-w-[42ch] text-sm leading-relaxed text-ivory-muted">
                Bar b q counters, a hot main line and dessert, held through a late evening
                without the food going cold.
              </p>
            </div>
          </motion.article>

          <TypeCell
            i={1}
            title="Valima and reception"
            body="A formal covered service: qorma, biryani, kabab, bread and sweet, plated and paced to the seating."
          />

          <TypeCell
            i={2}
            title="Aqiqah and milad"
            body="Smaller counts, same kitchen. Degs delivered to the house or the hall, ready to serve."
          />

          {/* Valima — the second photographic cell, half width. */}
          <motion.article
            {...cell(3)}
            className="group relative overflow-hidden rounded-2xl border border-[rgb(var(--border)/0.6)]"
          >
            <div className="aspect-[4/3]">
              <Photo
                photo={PHOTOS.occasionsSmall}
                sizes="(max-width: 1024px) 46vw, 31vw"
                className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <h3 className="font-display text-xl text-ivory">Corporate lunches</h3>
              <p className="mt-1 text-sm text-ivory-muted">Boxed or buffet, delivered on the hour.</p>
            </div>
          </motion.article>

          <TypeCell
            i={4}
            title="Dinners at home"
            body="Twenty guests or two hundred. We bring the food, the warmers and the staff to run the table."
          />
        </div>
      </div>
    </section>
  );
}

/**
 * A typographic cell. Tinted ground rather than the page background, so the
 * grid has three materials in it — photograph, tint, and the surface the page
 * itself sits on — instead of one repeated box.
 */
function TypeCell({ i, title, body, className }: { i: number; title: string; body: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay: i * 0.07, ease: EASE }}
      className={cn(
        'flex flex-col justify-end rounded-2xl border border-[rgb(var(--border)/0.6)]',
        'bg-[rgb(var(--surface))] bg-gradient-to-br from-[rgb(var(--gold)/0.07)] to-transparent p-6',
        'min-h-[200px] transition-colors duration-300 hover:border-[rgb(var(--gold)/0.4)]',
        className,
      )}
    >
      <h3 className="font-display text-xl text-[rgb(var(--text))]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--text-muted))]">{body}</p>
    </motion.article>
  );
}
