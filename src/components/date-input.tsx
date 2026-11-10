'use client';

import { useState, useEffect, useRef } from 'react';
import { cn, getWeekday } from '@/lib/format';
import { inputClass } from '@/components/ui';
import { Calendar } from 'lucide-react';

/**
 * Date field that ALWAYS displays day/month/year, regardless of browser locale.
 *
 * A native <input type="date"> renders in the browser's locale format (US
 * browsers show mm/dd/yyyy), and that is not overridable. So the visible field
 * is a text input the user types dd/mm/yyyy into, with a real date picker kept
 * next to it for convenience. The `value`/`onChange` contract stays ISO
 * (YYYY-MM-DD) so callers and the server are unaffected.
 */
export function DateInput({
  value,
  onChange,
  className,
  id,
  showDay = true,
}: {
  value: string;                    // ISO: YYYY-MM-DD (or '')
  onChange: (iso: string) => void;
  className?: string;
  id?: string;
  showDay?: boolean;
}) {
  const [text, setText] = useState(isoToDisplay(value));
  const pickerRef = useRef<HTMLInputElement>(null);

  // Keep the visible text in sync when the value changes from outside.
  useEffect(() => { setText(isoToDisplay(value)); }, [value]);

  function handleText(raw: string) {
    // Allow only digits and slashes, and auto-insert the slashes as they type.
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let out = digits;
    if (digits.length > 4) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setText(out);

    const iso = displayToIso(out);
    if (iso) onChange(iso);
    else if (out === '') onChange('');
  }

  const weekdayName = showDay ? getWeekday(value) : '';

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={text}
          onChange={(e) => handleText(e.target.value)}
          onBlur={() => setText(isoToDisplay(value))}  // discard a half-typed date
          placeholder="dd/mm/yyyy"
          aria-label="Date, day slash month slash year"
          className={cn(inputClass, 'pr-10')}
        />

        {/* Real picker, kept for convenience. Visually it's just the icon. */}
        <button
          type="button"
          onClick={() => {
            const el = pickerRef.current;
            if (!el) return;
            // showPicker() throws if the browser will not open a picker for
            // this element (no user activation, element not rendered). There
            // is nothing useful to do about that, and letting it escape would
            // break the click handler, so it is swallowed. NOT written as
            // `showPicker?.() ?? click()`: showPicker returns undefined on
            // SUCCESS, so that form always ran the fallback click as well.
            try { el.showPicker(); } catch { /* no picker available */ }
          }}
          aria-label="Open calendar"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-[rgb(var(--text-dim))] hover:text-gold"
        >
          <Calendar className="h-4 w-4" />
        </button>
        {/*
         * The real date field, invisible, laid exactly over the icon.
         *
         * On a touch device this IS the tap target (see .date-native-overlay
         * in globals.css) because iOS cannot be driven from the button above:
         * Safari before 16 has no showPicker() at all, WebKit rejects it on an
         * element it does not consider rendered, and — unlike Chrome — it
         * ignores a synthetic .click() on a date input outright. The result
         * was an icon that did nothing on iPhone while working on Android.
         * Tapping the actual control is the one thing every mobile browser
         * honours.
         *
         * It stays click-through on desktop, where a mouse click landing on a
         * date input does NOT reliably open Chrome's dropdown — only its own
         * calendar indicator does — so the button and showPicker() above
         * remain in charge there.
         */}
        <input
          ref={pickerRef}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          tabIndex={-1}
          aria-hidden
          className="date-native-overlay absolute inset-y-0 right-0 w-12 opacity-0"
        />
      </div>

      {showDay && weekdayName && (
        <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-gold animate-fadeIn">
          <span className="h-1.5 w-1.5 rounded-full bg-gold shrink-0" />
          <span>{weekdayName}</span>
        </div>
      )}
    </div>
  );
}

/** YYYY-MM-DD → dd/mm/yyyy */
function isoToDisplay(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** dd/mm/yyyy → YYYY-MM-DD (null when incomplete or not a real date) */
function displayToIso(s: string): string | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = Number(dd), mo = Number(mm), y = Number(yyyy);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  // Rejects impossible dates like 31/02/2026, which Date would roll over.
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${yyyy}-${mm}-${dd}`;
}
