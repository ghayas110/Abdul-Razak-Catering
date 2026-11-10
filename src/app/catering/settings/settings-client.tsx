'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, SectionTitle, Button, Field, Input, Textarea, Toggle } from '@/components/ui';
import { saveCateringProfile } from '@/lib/actions/catering';
import type { CateringProfile } from '@/lib/types';
import { Save, HelpCircle } from 'lucide-react';

export function SettingsClient({ profile }: { profile: CateringProfile }) {
  const [form, setForm] = useState(profile);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();

  type StringKey = Exclude<keyof CateringProfile, 'showTerms'>;
  const set = (k: StringKey, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    setErr(''); setMsg('');
    start(async () => {
      const res = await saveCateringProfile(form);
      if (res.ok) setMsg(res.message ?? 'Saved.'); else setErr(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Catering" sub="What prints on the letterhead of every quotation and invoice. Kept separate from the website details below, because the client has always worded the two differently.">
        Quotation Letterhead
      </SectionTitle>

      {err && <Card className="border-negative/30 bg-negative/10 p-3 text-sm text-negative">{err}</Card>}
      {msg && <Card className="p-3 text-sm text-positive">{msg}</Card>}

      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" hint="Printed on the slip letterhead">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Quotation prefix" hint="ARC gives ARC-1001. Letters only.">
            <Input value={form.quotaPrefix} onChange={(e) => set('quotaPrefix', e.target.value.toUpperCase())} maxLength={6} />
          </Field>
          <Field label="Contact person" hint="Printed above the address">
            <Input value={form.person} onChange={(e) => set('person', e.target.value)} placeholder="Name of the person to ask for" />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0300-0000000" />
          </Field>
        </div>
        <Field label="Shop address">
          <Textarea rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="Tax line" hint="Prints in the slip header, just above the status. Leave blank to hide it.">
          <Input value={form.taxNote} onChange={(e) => set('taxNote', e.target.value)} placeholder="If Tax Apply Pay by Party" />
        </Field>

        {/* The one switch that decides whether customers see conditions at
            all. There is no wording to edit here on purpose — see the help
            text: Catering → Rules is the single source. */}
        <div className="rounded-xl border border-[rgb(var(--border)/0.6)] bg-[rgb(var(--surface-2)/0.5)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-[rgb(var(--text))]">
                Print terms &amp; conditions on customer documents
              </div>
              <div className="mt-0.5 text-xs text-[rgb(var(--text-dim))]">
                Quotations, invoices and custom bills.
              </div>
            </div>
            <Toggle
              checked={form.showTerms}
              onChange={(v) => setForm((f) => ({ ...f, showTerms: v }))}
              label={form.showTerms ? 'Showing' : 'Hidden'}
            />
          </div>

          <div className="mt-3 flex gap-2 rounded-lg bg-[rgb(var(--surface))] p-3 text-xs leading-relaxed text-[rgb(var(--text-muted))]">
            <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
            <div>
              <p>
                {form.showTerms
                  ? 'Every active rule from Catering → Rules prints at the bottom of the slip, in order.'
                  : 'Nothing prints at the bottom of the slip. Customers get the items and the total, and no conditions.'}
              </p>
              <p className="mt-1.5">
                The wording lives in <Link href="/catering/rules" className="text-gold hover:underline">Catering → Rules</Link> and
                nowhere else — edit a rule there and every document follows. Switching a rule off there removes just that
                line; this switch turns the whole block off.
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending}>
            <Save className="mr-1.5 h-4 w-4" />{pending ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
