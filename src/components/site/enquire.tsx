'use client';

import { useState, useTransition } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { createLead } from '@/lib/actions/misc';
import { inputClass } from '@/components/ui';
import { cn } from '@/lib/format';
import { Check, Loader2, Phone, MessageCircle, Mail, MapPin } from 'lucide-react';

const EASE = [0.22, 1, 0.36, 1] as const;

type Contact = {
  phone: string;
  phoneIntl: string;
  whatsapp: string;
  whatsappDisplay: string;
  email: string;
  address: string;
};

/**
 * The one thing this page is for.
 *
 * A form rather than a phone number alone, because most of these enquiries
 * arrive at eleven at night when nobody is going to pick up, and a name with a
 * date attached is worth more to the office in the morning than a missed call.
 * It writes straight into the Enquiries screen and rings the notification bell.
 *
 * The call and WhatsApp buttons render only when those numbers have actually
 * been set in Settings. An empty `tel:` link is a dead button, and a dead
 * button on a contact section is worse than no button.
 */
export function Enquire({ contact }: { contact: Contact }) {
  const reduce = useReducedMotion();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [message, setMessage] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    start(async () => {
      const res = await createLead({
        name: name.trim(),
        phone: phone.trim(),
        eventDate: eventDate || null,
        message: message.trim() || null,
        source: 'WEBSITE',
      });
      if (res.ok) setDone(true);
      else setError(res.error);
    });
  }

  const reveal = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: 0.6, delay, ease: EASE },
  });

  return (
    <section id="enquire" className="scroll-mt-20 border-t border-[rgb(var(--border)/0.4)] py-20 lg:py-28">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-16">
        <motion.div {...reveal()} className="lg:col-span-5">
          <h2 className="max-w-[20ch] font-display text-3xl leading-tight text-[rgb(var(--text))] sm:text-4xl">
            Tell us the date and the headcount.
          </h2>
          <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-[rgb(var(--text-muted))]">
            We will come back with a written quotation: every dish, the quantity and
            the rate, on one page. No obligation to book.
          </p>

          <div className="mt-8 space-y-3">
            {contact.phoneIntl && (
              <ContactRow
                icon={<Phone className="h-4 w-4" />}
                href={`tel:+${contact.phoneIntl}`}
                label={contact.phone}
              />
            )}
            {contact.whatsapp && (
              <ContactRow
                icon={<MessageCircle className="h-4 w-4" />}
                href={`https://wa.me/${contact.whatsapp}`}
                label={`WhatsApp ${contact.whatsappDisplay}`}
                external
              />
            )}
            {contact.email && (
              <ContactRow
                icon={<Mail className="h-4 w-4" />}
                href={`mailto:${contact.email}`}
                label={contact.email}
              />
            )}
            {contact.address && (
              <div className="flex items-start gap-3 text-sm text-[rgb(var(--text-muted))]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>{contact.address}</span>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div {...reveal(0.1)} className="lg:col-span-6 lg:col-start-7">
          <div className="rounded-2xl border border-[rgb(var(--border)/0.6)] bg-[rgb(var(--surface))] p-6 shadow-card sm:p-8">
            {done ? (
              /* Success replaces the form rather than sitting above it: leaving
                 the filled fields on screen invites a second submission of the
                 same enquiry. */
              <div className="flex flex-col items-start py-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(var(--gold)/0.14)] text-gold">
                  <Check className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-2xl text-[rgb(var(--text))]">
                  We have it, {name.split(' ')[0] || 'thank you'}.
                </h3>
                <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-[rgb(var(--text-muted))]">
                  Someone from the office will call you back on {phone}. If the event is
                  inside a week, call us directly instead.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-5">
                <FormField label="Your name" htmlFor="lead-name">
                  <input
                    id="lead-name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    autoComplete="name"
                    className={inputClass}
                  />
                </FormField>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Phone number" htmlFor="lead-phone" hint="A number we can reach you on">
                    <input
                      id="lead-phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      autoComplete="tel"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Event date" htmlFor="lead-date" hint="Leave blank if it is not fixed">
                    <input
                      id="lead-date"
                      name="eventDate"
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className={cn(inputClass, 'appearance-none')}
                    />
                  </FormField>
                </div>

                <FormField
                  label="What is the function?"
                  htmlFor="lead-message"
                  hint="Occasion, rough headcount, anywhere you already have in mind"
                >
                  <textarea
                    id="lead-message"
                    name="message"
                    rows={4}
                    maxLength={500}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className={cn(inputClass, 'resize-y leading-relaxed')}
                  />
                </FormField>

                {error && (
                  <p role="alert" className="text-sm text-negative">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-ink ring-1 ring-inset ring-white/15 transition-all duration-200 hover:bg-gold-light active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {pending ? 'Sending' : 'Request a quotation'}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FormField({
  label, htmlFor, hint, children,
}: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-[rgb(var(--text))]">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-[rgb(var(--text-dim))]">{hint}</p>}
    </div>
  );
}

function ContactRow({
  icon, href, label, external,
}: { icon: React.ReactNode; href: string; label: string; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      className="flex items-center gap-3 text-sm text-[rgb(var(--text-muted))] transition-colors hover:text-[rgb(var(--text))]"
    >
      <span className="text-gold">{icon}</span>
      {label}
    </a>
  );
}
