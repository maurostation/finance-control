'use client';

import { useState, useEffect } from 'react';
import { supabase, getTransactions, deleteTransaction } from '@/lib/supabase';
import { Transaction } from '@/lib/types';
import { formatCurrency, getCurrentMonth } from '@/lib/utils';
import { Trash2, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { onRefresh } from '@/lib/refresh';

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  return d.toISOString().slice(0, 7);
});

function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(Number(y), Number(mo) - 1, 1));
}

export default function ExtratoPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      loadTx(user.id, month);
    });
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
    const { data } = await getTransactions(uid, m);
    setTransactions(data || []);
  }

  async function handleDelete(id: string) {
    await deleteTransaction(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  }

  const filtered = transactions.filter(t => filter === 'all' || t.type === filter);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Group by date
  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
    (acc[t.date] = acc[t.date] || []).push(t);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ maxWidth:900, margin:"0 auto", padding:"0 0 40px" }}>
      {/* Header */}
      <div style={{
        padding:'32px 32px 16px',
        borderBottom:'1px solid var(--bd)',
        background:'var(--sf)',
        position:'sticky', top:0, zIndex:10,
        backdropFilter:'blur(12px)',
      }}>
        <span className="eyebrow" style={{ display:'block', marginBottom:10 }}>Extrato</span>
        {/* Month picker */}
        <select
          className="input"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{ marginBottom:12, fontWeight:500 }}
        >
          {MONTHS.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>

        {/* Summary pills */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {[
            { label:'Entradas', value:totalIncome, color:'var(--green)' },
            { label:'Saídas', value:totalExpense, color:'var(--red)' },
            { label:'Saldo', value:totalIncome - totalExpense, color: totalIncome - totalExpense >= 0 ? 'var(--tx)' : 'var(--red)' },
          ].map(s => (
            <div key={s.label} style={{
              background:'var(--bg-1)', borderRadius:10, padding:'10px 12px',
              boxShadow:'0 1px 4px rgba(14,18,25,.06)',
            }}>
              <p style={{ fontSize:'.65rem', color:'var(--tx-4)', fontFamily:"'Geist Mono',monospace", textTransform:'uppercase', letterSpacing:'.06em', marginBottom:3 }}>
                {s.label}
              </p>
              <p style={{ fontSize:'.9rem', fontWeight:700, color:s.color, letterSpacing:'-.02em' }}>
                {formatCurrency(s.value)}
              </p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{ display:'flex', gap:6, marginTop:10 }}>
          {(['all','income','expense'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:'5px 12px', borderRadius:99, fontSize:'.75rem', fontWeight:500,
              border:'1px solid var(--bd-2)', cursor:'pointer',
              background: filter===f ? 'var(--a)' : 'var(--sf)',
              color: filter===f ? '#fff' : 'var(--tx-3)',
              borderColor: filter===f ? 'var(--a)' : 'var(--bd-2)',
            }}>
              {f === 'all' ? 'Todos' : f === 'income' ? 'Entradas' : 'Saídas'}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <div style={{ padding:'0 32px' }}>
        {sortedDates.length === 0 && (
          <p style={{ textAlign:'center', color:'var(--tx-4)', padding:'40px 0', fontFamily:"'Geist Mono',monospace", fontSize:'.78rem' }}>
            Nenhum lançamento neste período.
          </p>
        )}
        {sortedDates.map(date => (
          <div key={date}>
            {/* Day header */}
            <div style={{
              padding:'14px 0 6px',
              fontFamily:"'Geist Mono',monospace",
              fontSize:'.62rem', color:'var(--tx-4)',
              letterSpacing:'.1em', textTransform:'uppercase',
              borderBottom:'1px solid var(--bd)',
            }}>
              {new Intl.DateTimeFormat('pt-BR', { weekday:'long', day:'2-digit', month:'short' })
                .format(new Date(date + 'T00:00:00'))}
            </div>
            {grouped[date].map((tx, i) => (
              <div key={tx.id} style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'12px 0',
                borderBottom: i < grouped[date].length - 1 ? '1px solid var(--bd)' : 'none',
              }}>
                <div style={{
                  width:36, height:36, borderRadius:10, flexShrink:0,
                  background: tx.type === 'income' ? 'rgba(16,185,129,.1)' : 'var(--bg-1)',
                  border:`1px solid ${tx.type === 'income' ? 'rgba(16,185,129,.2)' : 'var(--bd)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  {tx.type === 'income'
                    ? <TrendingUp size={14} color="var(--green)" />
                    : <TrendingDown size={14} color="var(--tx-3)" />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:'.85rem', fontWeight:500, color:'var(--tx)', lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {tx.description}
                    {tx.is_installment && tx.installment_number && tx.total_installments && (
                      <span style={{ marginLeft:6, fontSize:'.7rem', color:'var(--tx-4)', fontFamily:"'Geist Mono',monospace" }}>
                        {tx.installment_number}/{tx.total_installments}x
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize:'.72rem', color:'var(--tx-4)', fontFamily:"'Geist Mono',monospace" }}>
                    {tx.category}
                  </p>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <p style={{
                    fontSize:'.9rem', fontWeight:600,
                    color: tx.type === 'income' ? 'var(--green)' : 'var(--tx)',
                  }}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'var(--tx-4)', padding:'2px 0 0', display:'block', marginLeft:'auto' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
