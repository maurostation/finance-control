'use client';

import { useState, useEffect } from 'react';
import { supabase, getTransactions, getCards, deleteTransaction } from '@/lib/supabase';
import { Transaction, Card } from '@/lib/types';
import { formatCurrency, getCurrentMonth } from '@/lib/utils';
import { Trash2, TrendingUp, TrendingDown, Pencil, Calendar } from 'lucide-react';
import { onRefresh, openForEdit } from '@/lib/refresh';
import { ExtratoSkeleton } from '@/components/Skeleton';
import RecurringSection from '@/components/RecurringSection';

// +3 meses futuros → mês atual → -5 meses passados (9 total)
const MONTHS = Array.from({ length: 9 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() + 3 - i);
  return d.toISOString().slice(0, 7);
});

function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(Number(y), Number(mo) - 1, 1));
}

export default function ExtratoPage() {
  const [month, setMonth] = useState(() => {
    // Sync with dashboard month via URL param (?month=YYYY-MM)
    if (typeof window !== 'undefined') {
      const m = new URLSearchParams(window.location.search).get('month');
      if (m && /^\d{4}-\d{2}$/.test(m)) return m;
    }
    return getCurrentMonth();
  });
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [payFilter, setPayFilter] = useState<'all' | 'debit' | 'card'>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      getCards(user.id).then(({ data }) => setCards(data || []));
      loadTx(user.id, month);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (userId) loadTx(userId, month);
  }, [month, userId]);

  // Re-fetch when a transaction is saved anywhere in the app
  useEffect(() => {
    if (!userId) return;
    return onRefresh(() => loadTx(userId, month));
  }, [userId, month]);

  async function loadTx(uid: string, m: string) {
    setLoading(true);
    const { data } = await getTransactions(uid, m);
    setTransactions(data || []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este lançamento?')) return;
    await deleteTransaction(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  }

  const currentMonth = getCurrentMonth();
  const isFutureMonth = month > currentMonth;

  const filtered = transactions
    .filter(t => filter === 'all' || t.type === filter)
    .filter(t => {
      if (payFilter === 'debit') return !t.card_id;
      if (payFilter === 'card')  return !!t.card_id;
      return true;
    });
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Group by date
  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
    (acc[t.date] = acc[t.date] || []).push(t);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (loading) return <ExtratoSkeleton />;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Header */}
      <div className="page-sticky-head" style={{
        paddingBottom: 16,
        borderBottom: '1px solid var(--bd)',
        background: 'var(--sf)',
        position: 'sticky', top: 0, zIndex: 10,
        backdropFilter: 'blur(12px)',
      }}>
        <span className="eyebrow" style={{ display: 'block', marginBottom: 10 }}>Extrato</span>
        {/* Month picker */}
        <select
          className="input"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{ marginBottom: 16, fontWeight: 500 }}
        >
          {MONTHS.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>

        {/* Summary pills — carousel on mobile, 3-col on desktop */}
        <div className="summary-pills">
          {[
            { label: 'Entradas', value: totalIncome,  color: 'var(--green)' },
            { label: 'Saídas',   value: totalExpense, color: 'var(--red)' },
            { label: 'Saldo',    value: totalIncome - totalExpense, color: totalIncome - totalExpense >= 0 ? 'var(--tx)' : 'var(--red)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-1)', borderRadius: 10, padding: '12px 16px',
              boxShadow: '0 1px 4px rgba(14,18,25,.06)',
            }}>
              <p style={{ fontSize: '.65rem', color: 'var(--tx-4)', fontFamily: "'Geist Mono',monospace", textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                {s.label}
              </p>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: s.color, letterSpacing: '-.02em' }}>
                <span className="money">{formatCurrency(s.value)}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {/* Type filter */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', 'income', 'expense'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '4px 12px', borderRadius: 99, fontSize: '.75rem', fontWeight: 500,
                border: '1px solid var(--bd-2)', cursor: 'pointer',
                background: filter === f ? 'var(--a)' : 'var(--sf)',
                color: filter === f ? '#fff' : 'var(--tx-3)',
                borderColor: filter === f ? 'var(--a)' : 'var(--bd-2)',
              }}>
                {f === 'all' ? 'Todos' : f === 'income' ? 'Entradas' : 'Saídas'}
              </button>
            ))}
          </div>
          {/* Payment method filter */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', 'debit', 'card'] as const).map(f => (
              <button key={f} onClick={() => setPayFilter(f)} style={{
                padding: '4px 12px', borderRadius: 99, fontSize: '.75rem', fontWeight: 500,
                border: '1px solid var(--bd-2)', cursor: 'pointer',
                background: payFilter === f ? 'var(--tx-2)' : 'var(--sf)',
                color: payFilter === f ? '#fff' : 'var(--tx-3)',
                borderColor: payFilter === f ? 'var(--tx-2)' : 'var(--bd-2)',
              }}>
                {f === 'all' ? 'Pagamento' : f === 'debit' ? 'Débito' : 'Cartão'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Gastos fixos (recorrentes) ── */}
      {userId && (
        <div className="page-section" style={{ paddingTop: 24, paddingBottom: 0 }}>
          <RecurringSection userId={userId} currentMonthTx={transactions} cards={cards} />
        </div>
      )}

      {/* Transaction list */}
      <div className="page-section" style={{ paddingTop: 16, paddingBottom: 0 }}>

        {/* Empty state */}
        {sortedDates.length === 0 && (
          <div style={{
            background: 'linear-gradient(135deg, var(--a-pale) 0%, var(--bg) 100%)',
            borderRadius: 16, padding: '40px 24px', textAlign: 'center',
            marginTop: 8,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'var(--a-dim)', border: '1px solid var(--a-bd)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <Calendar size={22} color="var(--a)" />
            </div>
            <p style={{ fontSize: '.9rem', fontWeight: 600, color: 'var(--tx)', marginBottom: 6 }}>
              {isFutureMonth ? 'Nenhum lançamento ainda' : 'Sem lançamentos neste período'}
            </p>
            <p style={{ fontSize: '.78rem', color: 'var(--tx-3)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
              {isFutureMonth
                ? 'Os gastos fixos acima refletem a projeção para este mês. Lance transações para acompanhar o realizado.'
                : 'Nenhuma movimentação registrada neste período. Tente outro mês ou ajuste os filtros.'}
            </p>
          </div>
        )}

        {sortedDates.map(date => (
          <div key={date}>
            {/* Day header */}
            <div style={{
              padding: '16px 0 8px',
              fontFamily: "'Geist Mono',monospace",
              fontSize: '.62rem', color: 'var(--tx-4)',
              letterSpacing: '.1em', textTransform: 'uppercase',
              borderBottom: '1px solid var(--bd)',
            }}>
              {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })
                .format(new Date(date + 'T00:00:00'))}
            </div>
            {grouped[date].map((tx, i) => (
              <div key={tx.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 0',
                borderBottom: i < grouped[date].length - 1 ? '1px solid var(--bd)' : 'none',
              }}>
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: tx.type === 'income' ? 'rgba(16,185,129,.1)' : 'var(--bg-1)',
                  border: `1px solid ${tx.type === 'income' ? 'rgba(16,185,129,.2)' : 'var(--bd)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {tx.type === 'income'
                    ? <TrendingUp size={14} color="var(--green)" />
                    : <TrendingDown size={14} color="var(--tx-3)" />}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '.87rem', fontWeight: 500, color: 'var(--tx)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.description}
                    {tx.is_installment && tx.installment_number && tx.total_installments && (
                      <span style={{ marginLeft: 6, fontSize: '.7rem', color: 'var(--tx-4)', fontFamily: "'Geist Mono',monospace" }}>
                        {tx.installment_number}/{tx.total_installments}x
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: '.72rem', color: 'var(--tx-4)', fontFamily: "'Geist Mono',monospace", marginTop: 2 }}>
                    {tx.category}
                  </p>

                  {/* Action chips */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button
                      onClick={() => openForEdit(tx)}
                      title="Editar lançamento"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: 'var(--a-dim)', border: '1px solid var(--a-bd)',
                        borderRadius: 99, padding: '4px 10px', cursor: 'pointer',
                        color: 'var(--a)', fontSize: '.7rem', fontWeight: 500,
                        fontFamily: 'inherit', transition: 'background .15s',
                      }}
                    >
                      <Pencil size={10} strokeWidth={2.5} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      title="Excluir lançamento"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,.18)',
                        borderRadius: 99, padding: '4px 10px', cursor: 'pointer',
                        color: 'var(--red)', fontSize: '.7rem', fontWeight: 500,
                        fontFamily: 'inherit', transition: 'background .15s',
                      }}
                    >
                      <Trash2 size={10} strokeWidth={2.5} />
                      Excluir
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <p style={{
                  fontSize: '.92rem', fontWeight: 700, flexShrink: 0,
                  color: tx.type === 'income' ? 'var(--green)' : 'var(--tx)',
                  paddingTop: 2,
                }}>
                  <span className="money">{tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}</span>
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
