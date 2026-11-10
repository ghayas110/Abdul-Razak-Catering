'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/format';
import { Search, Check, X, UtensilsCrossed, CornerDownLeft } from 'lucide-react';
import type { Option } from './search-select';

/**
 * The dish field on a quotation line: one box, typed straight into, exactly
 * like a search engine's — suggestions drop in as you type, picking one locks
 * the line to that menu item, and just typing past the suggestions and moving
 * on keeps whatever you typed as a one-off custom dish. There is no second
 * "Description" field alongside it any more; this box IS the description.
 *
 * The suggestion list is debounced, not the field itself — what you type
 * lands in the line immediately (so a custom name is never lost if you never
 * open the dropdown), only the list of matches below settles a beat after you
 * stop typing, so a fast typist doesn't see it flicker through every prefix.
 */
export function DishCombobox({
  options, menuItemId, description, onPick, onText, placeholder = 'Type or search a dish…',
}: {
  options: Option[];
  /** The line's current menuItemId — null once the text has diverged from it. */
  menuItemId: number | null;
  description: string;
  /** A suggestion was clicked: apply that menu item (fills the rate and unit too). */
  onPick: (id: number) => void;
  /** Free typing: this is the description now, and it is no longer tied to a menu item. */
  onText: (text: string) => void;
  placeholder?: string;
}) {
  const reduce = useReducedMotion();
  const [q, setQ] = useState(description);
  const [dq, setDq] = useState(description);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const focused = useRef(false);

  // A pick made elsewhere (or the line being reset) updates `description` out
  // from under this component. Follow it — but only while the operator isn't
  // actively typing here, or their next keystroke would be overwritten.
  useEffect(() => {
    if (!focused.current) setQ(description);
  }, [description]);

  // Debounce the SUGGESTIONS only. `q` (and therefore the line's own
  // description, via onText) updates on every keystroke regardless.
  useEffect(() => {
    const t = setTimeout(() => setDq(q), 150);
    return () => clearTimeout(t);
  }, [q]);

  const filtered = useMemo(() => {
    const s = dq.trim().toLowerCase();
    const list = s
      ? options.filter((o) => `${o.label} ${o.sub ?? ''}`.toLowerCase().includes(s))
      : options;
    return list.slice(0, 8);
  }, [dq, options]);

  useEffect(() => { setActive(0); }, [dq]);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function choose(o: Option) {
    onPick(Number(o.value));
    // The mousedown on this button calls preventDefault (see below), which
    // deliberately keeps focus in the input so the click can't blur-then-miss
    // it. That means the "only follow `description` while unfocused" effect
    // above never fires for a click — so the box is set directly here instead.
    setQ(o.label);
    setOpen(false);
  }

  function clear() {
    setQ('');
    onText('');
    setOpen(true);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); return; }
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % filtered.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + filtered.length) % filtered.length); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(filtered[active]); }
  }

  // Splits a label around the typed substring so the match can be picked out
  // in gold, the way a search box usually does. Falls back to the plain label
  // when the text doesn't actually appear in it (matched on `sub` instead).
  function highlight(label: string) {
    const s = dq.trim();
    if (!s) return label;
    const i = label.toLowerCase().indexOf(s.toLowerCase());
    if (i === -1) return label;
    return (
      <>
        {label.slice(0, i)}
        <mark className="rounded-sm bg-[rgb(var(--gold)/0.28)] text-[rgb(var(--text))]">{label.slice(i, i + s.length)}</mark>
        {label.slice(i + s.length)}
      </>
    );
  }

  const linked = menuItemId != null;
  const panelId = 'dish-combobox-panel';

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className={cn('pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transition-colors', open ? 'text-gold' : 'text-[rgb(var(--text-dim))]')} />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={panelId}
          aria-autocomplete="list"
          value={q}
          onFocus={() => { focused.current = true; setOpen(true); }}
          onBlur={() => { focused.current = false; }}
          onChange={(e) => { const v = e.target.value; setQ(v); onText(v); }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-xl border py-2.5 pl-8 text-sm text-[rgb(var(--text))] outline-none transition-all duration-150',
            'bg-[rgb(var(--surface-2))] placeholder:text-[rgb(var(--text-dim))]',
            q ? 'pr-8' : 'pr-3',
            linked ? 'border-[rgb(var(--gold)/0.55)] shadow-[0_0_0_3px_rgb(var(--gold)/0.08)]'
              : open ? 'border-[rgb(var(--gold)/0.6)] shadow-[0_0_0_3px_rgb(var(--gold)/0.08)]'
                : 'border-[rgb(var(--border)/0.7)] hover:border-[rgb(var(--border))]',
          )}
        />
        {q && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => { e.preventDefault(); clear(); }}
            title="Clear"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[rgb(var(--text-dim))] transition-colors hover:bg-[rgb(var(--surface))] hover:text-negative"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Quiet status line: which state this row is in, not a blocking badge. */}
      <div className="mt-1 flex items-center gap-1.5 truncate text-[11px]">
        {linked ? (
          <span className="flex items-center gap-1 text-gold/80">
            <Check className="h-3 w-3" /> On the menu
          </span>
        ) : q.trim() ? (
          <span className="flex items-center gap-1 text-[rgb(var(--text-dim))]">
            <UtensilsCrossed className="h-3 w-3" /> Custom — not on the menu
          </span>
        ) : (
          <span className="text-[rgb(var(--text-dim))]">&nbsp;</span>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="listbox"
            initial={reduce ? false : { opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 mt-1 w-full origin-top overflow-hidden rounded-xl border border-[rgb(var(--gold)/0.25)] bg-[rgb(var(--surface))] shadow-lift"
          >
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
                <UtensilsCrossed className="h-5 w-5 text-[rgb(var(--text-dim))]" />
                <p className="text-sm text-[rgb(var(--text-muted))]">Nothing on the menu matches “{dq.trim()}”.</p>
                <p className="text-xs text-[rgb(var(--text-dim))]">Keep typing and it saves as a custom line.</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto py-1">
                {filtered.map((o, i) => (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    // Fires before the input's onBlur, so the pick lands before
                    // anything closes the panel out from under the click.
                    onMouseDown={(e) => { e.preventDefault(); choose(o); }}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 border-l-2 px-3 py-2.5 text-left text-sm transition-colors',
                      i === active
                        ? 'border-l-gold bg-[rgb(var(--gold)/0.1)]'
                        : 'border-l-transparent hover:border-l-[rgb(var(--gold)/0.4)] hover:bg-[rgb(var(--surface-2))]',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 truncate text-[rgb(var(--text))]">
                        {o.value === menuItemId && <Check className="h-3.5 w-3.5 shrink-0 text-gold" />}
                        {highlight(o.label)}
                      </span>
                      {o.sub && <span className="block truncate text-xs text-[rgb(var(--text-dim))]">{o.sub}</span>}
                    </span>
                    {o.right && <span className="shrink-0 tnum text-xs text-gold">{o.right}</span>}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-[rgb(var(--border)/0.4)] px-3 py-1.5 text-[10.5px] text-[rgb(var(--text-dim))]">
              <span className="flex items-center gap-3">
                <span>↑↓ browse</span>
                <span className="flex items-center gap-0.5"><CornerDownLeft className="h-3 w-3" /> pick</span>
                <span>esc close</span>
              </span>
              {q.trim() && filtered.length > 0 && <span>or keep typing for custom</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
