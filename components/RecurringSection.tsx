'use client';

import { useState, useEffect } from 'react';
import { RecurringTemplate, Card, Transaction, CATEGORIES } from '@/lib/types';
import { formatCurrency, maskCurrency, parseCurrency } from '@/lib/utils';
import {
  getRecurringTemplates,
  insertRecurringTemplate,
  deactivateRecurringTemplate,
  insertTransaction,
} from '@/lib/supabase';
import { broadcastRefresh } from '@/lib/refresh';
import { Plus, X, CheckCircle, Repeat } from 'lucide-react';

interface Props {
  userId: string;
  currentMonthTx: Transaction[];
  cards: Card[];
  displayMonth: string; // "YYYY-MM" — mês sendo exibido
}

const chipBtn = (active: boolean): React.CSSProperties => ({
  padding: '9px 12px', borderRadius: 8, fontSize: '.82rem', fontWeight: 500,
  border: 'none', cursor: 'pointer',
  background: active ? (active ? 'var(--a-dim)' : 'var(--sf)') : 'var(--sf)',
  color: active ? 'var(--a)' : 'var(--tx-3)',
  boxShadow: active ? 'inset 0 0 0 1.5px var(--a-bd)' : 'inset 0 0 0 1px var(--bd-2)',
  transition: 'all .15s',
});

export default function RecurringSection({ userId, currentMonthTx, cards, displayMonth }: Props) {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [launching, setLaunching] = useState<string | null>(null);
  const [launchingAll, setLaunchingAll] = useState(false);

  // Form state
  const [rType, setRType] = useState<'expense' | 'income'>('expense');
  const [rDesc, setRDesc] = useState('');
  const [rAmount, setRAmount] = useState('');
  const [rCategory, setRCategory] = useState('');
  const [rDay, setRDay] = useState(1);
  const [rCardId, setRCardId] = useState('');
  const [rSaving, setRSaving] = useState(false);

  useEffect(() => {
    getRecurringTemplates(userId).then(({ data }) => setTemplates(data || []));
  }, [userId]);

  // Calcula a data de lançamento para o mês exibido
  function buildDate(t: RecurringTemplate): string {
    const [year, mo] = displayMonth.split('-').map(Number);
    const maxDay = new Date(year, mo, 0).getDate();
    const day = String(Math.min(t.day_of_month, maxDay)).padStart(2, '0');
    return `${year}-${String(mo).padStart(2, '0')}-${day}`;
  }

  const notLaunched = templates.filter(
    t => !currentMonthTx.some(tx => tx.is_recurring && tx.description === t.description)
  );

  async function handleLaunchAll() {
    if (!notLaunched.length) return;
    setLaunchingAll(true);
    await Promise.all(notLaunched.map(t => insertTransaction({
      user_id: userId,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.category,
      card_id: t.card_id || null,
      date: buildDate(t),
      is_recurring: true,
      is_installment: false,
    })));
    broadcastRefresh();
    setLaunchingAll(false);
  }

  function isLaunched(t: RecurringTemplate) {
    return currentMonthTx.some(tx => tx.is_recurring && tx.description === t.description);
  }

  async function handleLaunch(t: RecurringTemplate) {
    setLaunching(t.id);
    await insertTransaction({
      user_id: userId,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.category,
      card_id: t.card_id || null,
      date: buildDate(t),
      is_recurring: true,
      is_installment: false,
    });
    broadcastRefresh();
    setLaunching(null);
  }

  async function handleAdd() {
    if (!rDesc || !rAmount || !rCategory) return;
    setRSaving(true);
    const { data } = await insertRecurringTemplate({
      user_id: userId,
      description: rDesc,
      amount: parseCurrency(rAmount),
      type: rType,
      category: rCategory,
      card_id: rCardId || null,
      day_of_month: rDay,
      active: true,
    });
    if (data) setTemplates(prev => [...prev, data]);
    setShowForm(false);
    setRDesc(''); setRAmount(''); setRCategory(''); setRCardId('');
    setRSaving(false);
  }

  async function handleRemove(id: string) {
    await deactivateRecurringTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Repeat size={11} color="var(--a)" /> Gastos fixos
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {notLaunched.length > 1 && (
            <button
              onClick={handleLaunchAll}
              disabled={launchingAll}
              style={{
                background: 'var(--a-dim)', border: '1px solid var(--a-bd)',
                borderRadius: 7, padding: '4px 10px', cursor: 'pointer',
                fontSize: '.72rem', fontWeight: 600, color: 'var(--a)',
                opacity: launchingAll ? .5 : 1,
              }}
            >
              {launchingAll ? '...' : `Lançar todos (${notLaunched.length})`}
            </button>
          )}
          <button
            onClick={() => setShowForm(v => !v)}
            className="btn-ghost"
            style={{ fontSize: '.75rem', padding: '.3rem .8rem', gap: 4 }}
          >
            <Plus size={12} /> Adicionar
          </button>
        </div>
      </div>

      <div style={{
        background: 'var(--sf)', borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(14,18,25,.06), 0 4px 16px rgba(14,18,25,.04)',
      }}>
        {/* ── Add form ── */}
        {showForm && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Type toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['expense', 'income'] as const).map(t => (
                <button key={t} onClick={() => setRType(t)} style={chipBtn(rType === t)}>
                  {t === 'expense' ? '↑ Saída' : '↓ Entrada'}
                </button>
              ))}
            </div>
            <input
              className="input"
              placeholder="Nome (ex: Netflix, Aluguel)"
              value={rDesc}
              onChange={e => setRDesc(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: '.72rem', color: 'var(--tx-3)', display: 'block', marginBottom: 4 }}>Valor (R$)</label>
                <input
                  className="input"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={rAmount}
                  onChange={e => setRAmount(maskCurrency(e.target.value))}
                />
              </div>
              <div>
                <label style={{ fontSize: '.72rem', color: 'var(--tx-3)', display: 'block', marginBottom: 4 }}>Dia de cobrança</label>
                <input
                  className="input"
                  type="number"
                  min={1} max={31}
                  placeholder="Ex: 10"
                  value={rDay}
                  onChange={e => setRDay(Number(e.target.value))}
                />
              </div>
            </div>
            <select className="input" value={rCategory} onChange={e => setRCategory(e.target.value)}>
              <option value="">Categoria...</option>
              {CATEGORIES[rType].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {rType === 'expense' && cards.length > 0 && (
              <select className="input" value={rCardId} onChange={e => setRCardId(e.target.value)}>
                <option value="">Débito / dinheiro</option>
                {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" onClick={() => setShowForm(false)} style={{ flex: 1, justifyContent: 'center' }}>
                Cancelar
              </button>
              <button className="btn-amber" onClick={handleAdd} disabled={rSaving} style={{ flex: 2, justifyContent: 'center' }}>
                {rSaving ? 'Salvando...' : 'Salvar fixo'}
              </button>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {templates.length === 0 && !showForm && (
          <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--tx-4)', fontFamily: "'Geist Mono',monospace", fontSize: '.75rem' }}>
            Nenhum gasto fixo cadastrado.
          </div>
        )}

        {/* ── Template list ── */}
        {templates.map((t, i) => {
          const launched = isLaunched(t);
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
              borderBottom: i < templates.length - 1 ? '1px solid var(--bd)' : 'none',
            }}>
              {/* Icon */}
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: launched ? 'rgba(16,185,129,.08)' : 'var(--bg-1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {launched
                  ? <CheckCircle size={15} color="var(--green)" />
                  : <Repeat size={15} color="var(--tx-4)" />}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '.86rem', fontWeight: 500, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.description}
                </p>
                <p style={{ fontSize: '.7rem', color: 'var(--tx-4)', fontFamily: "'Geist Mono',monospace" }}>
                  dia {t.day_of_month} · {t.category}
                  {t.card_id && cards.find(c => c.id === t.card_id) ? ` · ${cards.find(c => c.id === t.card_id)!.name}` : ''}
                </p>
              </div>

              {/* Amount */}
              <span style={{ fontSize: '.9rem', fontWeight: 700, color: t.type === 'income' ? 'var(--green)' : 'var(--tx)', flexShrink: 0 }}>
                <span className="money">{t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}</span>
              </span>

              {/* Action */}
              {launched ? (
                <span style={{ fontSize: '.7rem', color: 'var(--green)', fontWeight: 600, fontFamily: "'Geist Mono',monospace", flexShrink: 0 }}>
                  ✓ lançado
                </span>
              ) : (
                <button
                  onClick={() => handleLaunch(t)}
                  disabled={!!launching}
                  style={{
                    flexShrink: 0, background: 'var(--a-dim)', border: '1px solid var(--a-bd)',
                    borderRadius: 7, padding: '5px 10px', cursor: 'pointer',
                    fontSize: '.73rem', fontWeight: 600, color: 'var(--a)',
                    opacity: launching ? .5 : 1,
                  }}
                >
                  {launching === t.id ? '...' : 'Lançar'}
                </button>
              )}

              {/* Remove */}
              <button
                onClick={() => handleRemove(t.id)}
                title="Remover fixo"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-4)', padding: 0, display: 'flex', flexShrink: 0 }}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
