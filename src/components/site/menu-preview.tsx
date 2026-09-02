'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Photo } from './photo';
import { PHOTOS } from '@/lib/site-photos';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The menu, in three groups.
 *
 * Not a rate card and not a list of forty dishes with a hairline under each
 * one. A customer at this stage is asking one question — "do they cook what I
 * want?" — and three named groups answer it faster than the full catalogue
 * would. The real rate card lives in the office, priced per event, which is
 * why no number appears here.
 */
const GROUPS: { title: string; note: string; dishes: string[] }[] = [
  {
    title: 'From the deg',
    note: 'Slow-cooked, sent hot in warmers',
    dishes: ['Qorma', 'Karahi', 'Nihari', 'Haleem', 'Daal mash', 'Mix vegetable'],
  },
  {
    title: 'Rice and bread',
    note: 'Counted per head, not per kilo',
    dishes: ['Chicken biryani', 'Beef biryani', 'Mutton pulao', 'White rice', 'Naan', 'Roghni naan'],
  },
  {
    title: 'Bar b q and sides',
    note: 'Grilled on site where the venue allows',
    dishes: ['Seekh kabab', 'Malai boti', 'Chicken tikka', 'Fish fry', 'Raita', 'Russian salad'],
  },
];

export function MenuPreview() {
  const reduce = useReducedMotion();

  return (
    <section id="menu" className="scroll-mt-20 border-t border-[rgb(var(--border)/0.4)] bg-[rgb(var(--surface)/0.5)]">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:py-28">
        {/* A wide plate across the top of the band rather than beside the
            columns: the section below it is dense with type, and a photograph
            in the same row would compete with it. */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="overflow-hidden rounded-2xl border border-[rgb(var(--border)/0.6)]"
        >
          <div className="aspect-[16/9] sm:aspect-[21/9]">
            <Photo photo={PHOTOS.menuBand} sizes="(max-width: 1200px) 92vw, 1120px" />
          </div>
        </motion.div>

        <motion.h2
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mt-14 max-w-[24ch] font-display text-3xl leading-tight text-[rgb(var(--text))] sm:text-4xl"
        >
          A short menu, cooked properly.
        </motion.h2>

        <div className="mt-10 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((g, gi) => (
            <motion.div
              key={g.title}
              initial={reduce ? false : { opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: gi * 0.08, ease: EASE }}
            >
              <h3 className="font-display text-xl text-gold">{g.title}</h3>
              <p className="mt-1 text-sm text-[rgb(var(--text-dim))]">{g.note}</p>
              {/* One hairline under the group heading, and none between the
                  dishes. A rule under every row is what turns a short menu
                  into a spec sheet. */}
              <div className="mt-4 h-px w-full bg-[rgb(var(--gold)/0.28)]" />
              <ul className="mt-4 space-y-2.5">
                {g.dishes.map((d) => (
                  <li key={d} className="text-[15px] text-[rgb(var(--text-muted))]">{d}</li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mt-12 max-w-[62ch] text-[15px] leading-relaxed text-[rgb(var(--text-dim))]"
        >
          Anything not listed here, ask. Most menus we send out are built around
          something the family already had in mind.
        </motion.p>
      </div>
    </section>
  );
}
