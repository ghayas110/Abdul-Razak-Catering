'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, SectionTitle, Button, Badge, Field, Input, Select, Modal, EmptyState, TableScroll, ConfirmModal } from '@/components/ui';
import { fmtMoney } from '@/lib/format';
import { saveCateringMenuItem, setCateringMenuItemActive, deleteCateringMenuItem } from '@/lib/actions/catering';
import { CATERING_UNITS, UNIT_META, type CateringMenuItemRow, type CateringUnit } from '@/lib/types';
import { Plus, Pencil, Trash2, Archive, ArchiveRestore, UtensilsCrossed, X, Search } from 'lucide-react';
import { cn } from '@/lib/format';

/**
 * The units a RATE can be quoted in: the ones that are their own base.
 *
 * Derived rather than listed, because this used to be a hand-written array and
 * promptly fell behind — cup and nos were added to the system and a dish still
 * could not be priced in either. A gram or a millilitre is an ordering unit,
 * not a pricing one: the rate behind it is per kilo or per litre, so they are
 * correctly absent here.
 */
const BASE_UNITS: CateringUnit[] = CATERING_UNITS.filter((u) => UNIT_META[u].base === u);

export function MenuClient({
  items, canManage,
}: { items: CateringMenuItemRow[]; canManage: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CateringMenuItemRow | null>(null);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<CateringUnit>('KG');
  const [rate, setRate] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, start] = useTransition();
  const [q, setQ] = useState('');

  function openNew() {
    setEditing(null); setName(''); setUnit('KG'); setRate(''); setSortOrder('0');
    setError(''); setOpen(true);
  }
  function openEdit(it: CateringMenuItemRow) {
    setEditing(it); setName(it.name); setUnit(it.unit);
    setRate(String(it.rate)); setSortOrder(String(it.sortOrder));
    setError(''); setOpen(true);
  }

  function submit() {
    setError('');
    start(async () => {
      const res = await saveCateringMenuItem(editing?.id ?? null, {
        name, unit, rate: Number(rate) || 0, sortOrder: Number(sortOrder) || 0,
      });
      if (res.ok) { setOpen(false); setNotice(res.message ?? 'Saved.'); router.refresh(); }
      else setError(res.error);
    });
  }

  const act = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      setNotice(res.ok ? (res.message ?? 'Done.') : (res.error ?? 'Failed.'));
      router.refresh();
    });

  const [deleting, setDeleting] = useState<CateringMenuItemRow | null>(null);
  function confirmDelete() {
    if (!deleting) return;
    const id = deleting.id;
    setDeleting(null);
    act(() => deleteCateringMenuItem(id));
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => it.name.toLowerCase().includes(s));
  }, [q, items]);

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Catering"
        sub="One rate per dish, quoted per kg, per litre, per piece or per plate."
        right={canManage ? <Button onClick={openNew}><Plus className="mr-1.5 h-4 w-4" /> Add dish</Button> : undefined}
      >
        Menu &amp; Rates
      </SectionTitle>

      {notice && (
        <Card className="flex items-center justify-between gap-3 p-3 text-sm text-[rgb(var(--text-muted))]">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="text-xs text-gold hover:underline">Dismiss</button>
        </Card>
      )}

      <Card className="p-5">
        {items.length === 0 ? (
          <EmptyState icon={<UtensilsCrossed className="h-6 w-6" />} title="The menu is empty" sub="Add your first dish to start building quotations." />
        ) : (
          <>
            <div className="relative mb-4 max-w-sm">
              <Search className={cn('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors', q ? 'text-gold' : 'text-[rgb(var(--text-dim))]')} />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search dishes…"
                className={cn('pl-9 transition-colors', q && 'pr-8 border-[rgb(var(--gold)/0.5)]')}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  title="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[rgb(var(--text-dim))] transition-colors hover:bg-[rgb(var(--surface-2))] hover:text-negative"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {filtered.length === 0 ? (
              <EmptyState icon={<Search className="h-6 w-6" />} title="No dishes match" sub={`Nothing on the menu matches "${q}".`} />
            ) : (
              <TableScroll>
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-[rgb(var(--border)/0.6)] text-left text-xs uppercase tracking-wider text-[rgb(var(--text-dim))]">
                      <th className="py-2 pr-3 font-medium">Dish</th>
                      <th className="py-2 pr-3 font-medium">Priced by</th>
                      <th className="py-2 pr-3 text-right font-medium">Rate</th>
                      {canManage && <th className="py-2 text-right font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((it) => (
                      <tr key={it.id} className={`border-b border-[rgb(var(--border)/0.3)] last:border-0 ${it.isActive ? '' : 'opacity-50'}`}>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[rgb(var(--text))]">{it.name}</span>
                            {!it.isActive && <Badge tone="muted">Archived</Badge>}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 text-[rgb(var(--text-dim))]">per {UNIT_META[it.unit].label}</td>
                        <td className="py-2.5 pr-3 text-right tnum text-[rgb(var(--text))]">{fmtMoney(it.rate, false)}</td>
                    {canManage && (
                      <td className="py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(it)} disabled={pending} title="Edit"
                            className="rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-gold disabled:opacity-40">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => act(() => setCateringMenuItemActive(it.id, !it.isActive))} disabled={pending}
                            title={it.isActive ? 'Archive' : 'Restore'}
                            className="rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-gold disabled:opacity-40">
                            {it.isActive ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                          </button>
                          {!it.usedCount && (
                            <button onClick={() => setDeleting(it)}
                              disabled={pending} title="Delete"
                              className="rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-negative disabled:opacity-40">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
            )}
          </>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${editing.name}` : 'Add dish'} wide>
        <div className="space-y-4">
          {error && <div className="rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Dish name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="QORMA" /></Field>
            <Field label="Priced by" hint="The unit the rate is quoted in">
              <Select value={unit} onChange={(e) => setUnit(e.target.value as CateringUnit)}>
                {BASE_UNITS.map((u) => <option key={u} value={u}>per {UNIT_META[u].label}</option>)}
              </Select>
            </Field>
            <Field label="Sort order"><Input type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></Field>
          </div>

          <Field label="Rate" hint={`What this dish is quoted at — per ${UNIT_META[unit].label}`}>
            <Input type="number" min="0" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="800" />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button onClick={submit} disabled={pending}>{pending ? 'Saving…' : editing ? 'Save changes' : 'Add dish'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        title="Delete this dish?"
        message={deleting ? `Delete "${deleting.name}" from the menu? This can't be undone.` : ''}
        pending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
