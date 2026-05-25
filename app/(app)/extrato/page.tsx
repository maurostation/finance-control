'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, getTransactions, getCards, deleteTransaction, deleteTransactionAll, insertTransaction } from '@/lib/supabase';
import { Transaction, Card } from '@/lib/types';
import { formatCurrency, getCurrentMonth, getNextMonth } from '@/lib/utils';
import { Trash2, TrendingUp, TrendingDown, Pencil, Calendar, AlertTriangle, CreditCard } from 'lucide-react';
import { onRefresh, openForEdit, broadcastRefresh } from '@/lib/refresh';
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

function shortMonth(m: string) {
  const [y, mo] = m.split('-');
  return new Intl.DateTimeFormat('pt-BR', { month: 'long' })
    .format(new Date(Number(y), Number(mo) - 1, 1));
}

// ── Styled delete confirmation modal ────────────────────────────────────────
function DeleteConfirm({
  tx,
  onCancel,
  onConfirmSingle,
  onConfirmAll,
}: {
  tx: Transaction;
  onCancel: () => void;
  onConfirmSingle: () => void;
  onConfirmAll: () => void;
}) {
  const isParentInstallment = tx.is_installment && !tx.parent_id && (tx.total_installments ?? 0) > 1;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(14,18,25,.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn .15s ease',
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--sf)',
          borderRadius: 16,
          padding: '24px',
          maxWidth: 380,
          width: '100%',
          boxShadow: '0 24px 80px rgba(14,18,25,.18), 0 8px 32px rgba(14,18,25,.12)',
          animation: 'modalIn .2s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14,
        }}>
          <AlertTriangle size={20} color="var(--red)" />
        </div>

        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--tx)', marginBottom: 6, letterSpacing: '-.02em' }}>
          Excluir lançamento?
        </p>
        <p style={{ fontSize: '.85rem', color: 'var(--tx-2)', lineHeight: 1.5, marginBottom: 4 }}>
          <strong>{tx.description}</strong>
        </p>
        <p style={{ fontSize: '.82rem', color: 'var(--tx-3)', marginBottom: isParentInstallment ? 16 : 20 }}>
          {formatCurrency(tx.amount)} · {tx.category} · {tx.date}
        </p>

        {isParentInstallment && (
          <div style={{
            background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.2)',
            borderRadius: 10, padding: '10px 12px', marginBottom: 20,
            fontSize: '.78rem', color: 'var(--tx-2)', lineHeight: 1.5,
          }}>
            <strong style={{ color: 'var(--a)' }}>Parcelamento detectado ({tx.total_installments}x)</strong><br />
            Escolha se quer excluir apenas este mês ou todas as parcelas futuras.
          </div>
        )}

        {isParentInstallment ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={onConfirmSingle} style={{ width: '100%', padding: '11px', borderRadius: 10, background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,.25)', color: 'var(--red)', fontWeight: 600, fontSize: '.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Excluir apenas este mês
            </button>
            <button onClick={onConfirmAll} style={{ width: '100%', padding: '11px', borderRadius: 10, background: 'var(--red)', border: 'none', color: '#fff', fontWeight: 600, fontSize: '.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Excluir todos os meses ({tx.total_installments}x)
            </button>
            <button onClick={onCancel} style={{ width: '100%', padding: '11px', borderRadius: 10, background: 'none', border: '1px solid var(--bd-2)', color: 'var(--tx-3)', fontWeight: 500, fontSize: '.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'none', border: '1px solid var(--bd-2)', color: 'var(--tx-3)', fontWeight: 500, fontSize: '.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
            <button onClick={onConfirmSingle} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'var(--red)', border: 'none', color: '#fff', fontWeight: 600, fontSize: '.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
// ───────────────────────────────────────────────────────────────────────────

export default function ExtratoPage() {
  const [month, setMonth] = useState(() => {
    if (typeof window !== 'undefined') {
      const m = new URLSearchParams(window.location.search).get('month');
      if (m && /^\d{4}-\d{2}$/.test(m)) return m;
    }
    return getNextMonth();
  });
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [payFilter, setPayFilter] = useState<'all' | 'debit' | 'card'>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  // Fatura do mês anterior
  const [prevCardBill, setPrevCardBill] = useState(0);
  const [prevMonth, setPrevMonth] = useState('');
  const [launchingBill, setLaunchingBill] = useState(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      userIdRef.current = user.id;
      setUserId(user.id);
      getCards(user.id).then(({ data }) => setCards(data || []));
    });
  }, []);

  // Load tx on month/userId change — shows skeleton (intentional)
  useEffect(() => {
    if (userId) loadTx(userId, month, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, userId]);

  // Refresh WITHOUT skeleton — keeps RecurringSection mounted, breaks auto-launch loop
  useEffect(() => {
    if (!userId) return;
    return onRefresh(() => loadTx(userId, month, true));
  }, [userId, month]);

  // Load previous month's card bill when viewing a future month
  useEffect(() => {
    if (!userId) return;
    const currentMonth = getCurrentMonth();
    if (month <= currentMonth) { setPrevCardBill(0); setPrevMonth(''); return; }
    const d = new Date(month + '-01T00:00:00');
    d.setMonth(d.getMonth() - 1);
    const prev = d.toISOString().slice(0, 7);
    setPrevMonth(prev);
    getTransactions(userId, prev).then(({ data }) => {
      const bill = (data || [])
        .filter(t => !!t.card_id && t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);
      setPrevCardBill(bill);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, month]);

  // skipSkeleton=true → silent refresh (RecurringSection stays mounted)
  async function loadTx(uid: string, m: string, skipSkeleton: boolean) {
    if (!skipSkeleton) setLoading(true);
    const { data } = await getTransactions(uid, m);
    setTransactions(data || []);
    if (!skipSkeleton) setLoading(false);
  }

  async function handleDeleteSingle(tx: Transaction) {
    setPendingDelete(null);
    await deleteTransaction(tx.id);
    setTransactions(prev => prev.filter(t => t.id !== tx.id));
  }

  async function handleDeleteAll(tx: Transaction) {
    setPendingDelete(null);
    await deleteTransactionAll(tx.id);
    setTransactions(prev => prev.filter(t => t.id !== tx.id && t.parent_id !== tx.id));
  }

  // Create the previous month's card bill as an expense in the current future month
  async function handleLaunchBill() {
    if (!userId || !prevCardBill) return;
    setLaunchingBill(true);
    await insertTransaction({
      user_id: userId,
      type: 'expense',
      amount: prevCardBill,
      description: `Fatura Cartão ${shortMonth(prevMonth)}`,
      category: 'Outros',
      date: `${month}-01`,
      card_id: null,
      is_installment: false,
    });
    broadcastRefresh();
    setPrevCardBill(0);
    setLaunchingBill(false);
  }

  const currentMonth = getCurrentMonth();
  const isFutureMonth = month > currentMonth;

  // Hide the bill banner if the month already has a fatura transaction
  const hasFaturaAlready = transactions.some(t =>
    t.description.toLowerCase().includes('fatura') && t.type === 'expense'
  );

  const showBillBanner = isFutureMonth && prevCardBill > 0 && !hasFaturaAlready;

  const filtered = transactions
    .filter(t => filter === 'all' || t.type === filter)
    .filter(t => {
      if (payFilter === 'debit') return !t.card_id;
      if (payFilter === 'card')  return !!t.card_id;
      return true;
    });
  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
    (acc[t.date] = acc[t.date] || []).push(t);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (loading) return <ExtratoSkeleton />;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 40px' }}>

      {/* Delete confirmation — z-index 2000, no backdropFilter to avoid compositing conflicts */}
      {pendingDelete && (
        <DeleteConfirm
          tx={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirmSingle={() => handleDeleteSingle(pendingDelete)}
          onConfirmAll={() => handleDeleteAll(pendingDelete)}
        />
      )}

      {/* Sticky header — NO backdropFilter (causes modal to appear behind on Safari/WebKit) */}
      <div className="page-sticky-head" style={{
        paddingBottom: 16,
        borderBottom: '1px solid var(--bd)',
        background: 'var(--sf)',          // solid, not blurred — fixes z-index stacking
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <span className="eyebrow" style={{ display: 'block', marginBottom: 10 }}>Extrato</span>

        <select
          className="input"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{ marginBottom: 16, fontWeight: 500 }}
        >
          {MONTHS.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>

        {/* Summary pills */}
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
          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', 'income', 'expense'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '4px 12px', borderRadius: 99, fontSize: '.75rem', fontWeight: 500,
                border: '1px solid', cursor: 'pointer',
                background: filter === f ? 'var(--a)' : 'var(--sf)',
                color: filter === f ? '#fff' : 'var(--tx-3)',
                borderColor: filter === f ? 'var(--a)' : 'var(--bd-2)',
              }}>
                {f === 'all' ? 'Todos' : f === 'income' ? 'Entradas' : 'Saídas'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', 'debit', 'card'] as const).map(f => (
              <button key={f} onClick={() => setPayFilter(f)} style={{
                padding: '4px 12px', borderRadius: 99, fontSize: '.75rem', fontWeight: 500,
                border: '1px solid', cursor: 'pointer',
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

      {/* Fatura do mês anterior — banner só aparece se ainda não foi lançada */}
      {showBillBanner && (
        <div className="page-section" style={{ paddingTop: 20, paddingBottom: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'var(--a-pale)', border: '1px solid var(--a-bd)',
            borderRadius: 14, padding: '14px 18px',
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--a-dim)', border: '1px solid var(--a-bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CreditCard size={16} color="var(--a)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--tx)', lineHeight: 1.3 }}>
                Fatura Cartão — {shortMonth(prevMonth)}
              </p>
              <p style={{ fontSize: '.75rem', color: 'var(--tx-3)', marginTop: 2 }}>
                <span className="money">{formatCurrency(prevCardBill)}</span> não lançado como despesa de {shortMonth(month)}
              </p>
            </div>
            <button
              onClick={handleLaunchBill}
              disabled={launchingBill}
              style={{
                background: 'var(--a)', color: '#fff', border: 'none',
                borderRadius: 8, padding: '8px 14px', fontSize: '.78rem',
                fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
              }}
            >
              {launchingBill ? 'Lançando...' : 'Lançar'}
            </button>
          </div>
        </div>
      )}

      {/* Gastos fixos */}
      {userId && (
        <div className="page-section" style={{ paddingTop: 24, paddingBottom: 0 }}>
          <RecurringSection userId={userId} currentMonthTx={transactions} cards={cards} displayMonth={month} />
        </div>
      )}

      {/* Transaction list */}
      <div className="page-section" style={{ paddingTop: 16, paddingBottom: 0 }}>

        {sortedDates.length === 0 && (
          <div style={{
            background: 'linear-gradient(135deg, var(--a-pale) 0%, var(--bg) 100%)',
            borderRadius: 16, padding: '40px 24px', textAlign: 'center', marginTop: 8,
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--a-dim)', border: '1px solid var(--a-bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Calendar size={22} color="var(--a)" />
            </div>
            <p style={{ fontSize: '.9rem', fontWeight: 600, color: 'var(--tx)', marginBottom: 6 }}>
              {isFutureMonth ? 'Nenhum lançamento ainda' : 'Sem lançamentos neste período'}
            </p>
            <p style={{ fontSize: '.78rem', color: 'var(--tx-3)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
              {isFutureMonth
                ? 'Os gastos fixos acima refletem a projeção. Lance transações para acompanhar o realizado.'
                : 'Nenhuma movimentação registrada. Tente outro mês ou ajuste os filtros.'}
            </p>
          </div>
        )}

        {sortedDates.map(date => (
          <div key={date}>
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
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: tx.type === 'income' ? 'rgba(16,185,129,.1)' : 'var(--bg-1)', border: `1px solid ${tx.type === 'income' ? 'rgba(16,185,129,.2)' : 'var(--bd)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {tx.type === 'income' ? <TrendingUp size={14} color="var(--green)" /> : <TrendingDown size={14} color="var(--tx-3)" />}
                </div>

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
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button onClick={() => openForEdit(tx)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--a-dim)', border: '1px solid var(--a-bd)', borderRadius: 99, padding: '4px 10px', cursor: 'pointer', color: 'var(--a)', fontSize: '.7rem', fontWeight: 500, fontFamily: 'inherit' }}>
                      <Pencil size={10} strokeWidth={2.5} /> Editar
                    </button>
                    <button onClick={() => setPendingDelete(tx)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,.18)', borderRadius: 99, padding: '4px 10px', cursor: 'pointer', color: 'var(--red)', fontSize: '.7rem', fontWeight: 500, fontFamily: 'inherit' }}>
                      <Trash2 size={10} strokeWidth={2.5} /> Excluir
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '.92rem', fontWeight: 700, flexShrink: 0, color: tx.type === 'income' ? 'var(--green)' : 'var(--tx)', paddingTop: 2 }}>
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
