'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, getTransactions, getCards, getPlannedPurchases, getSavings, updateSavings } from '@/lib/supabase';
import { Transaction, Card, PlannedPurchase, SavingsGoal } from '@/lib/types';
import { formatCurrency, getCurrentMonth, getCurrentMonthLabel, getProgressClass } from '@/lib/utils';
import ReserveCard from '@/components/ReserveCard';
import CardWidget from '@/components/CardWidget';
import RecurringSection from '@/components/RecurringSection';
import { TrendingDown, TrendingUp, Calendar, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { onRefresh } from '@/lib/refresh';
import { DashboardSkeleton } from '@/components/Skeleton';

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [purchases, setPurchases] = useState<PlannedPurchase[]>([]);
  const [savings, setSavings] = useState<SavingsGoal | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payFilter, setPayFilter] = useState<'all' | 'debit' | 'card'>('all');

  async function loadData(uid: string) {
    setLoading(true);
    const [txRes, cardsRes, purchasesRes, savingsRes] = await Promise.all([
      getTransactions(uid, getCurrentMonth()),
      getCards(uid),
      getPlannedPurchases(uid),
      getSavings(uid),
    ]);
    setTransactions(txRes.data || []);
    setCards(cardsRes.data || []);
    setPurchases(purchasesRes.data || []);
    setSavings(savingsRes.data || null);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      await loadData(user.id);
    });
  }, []);

  // Re-fetch whenever a transaction is saved anywhere in the app
  useEffect(() => {
    if (!userId) return;
    return onRefresh(() => loadData(userId));
  }, [userId]);

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;
  const budgetPct    = totalIncome > 0 ? Math.min((totalExpense / totalIncome) * 100, 100) : 0;

  const now = new Date();
  const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - now.getDay());
  const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const thisWeekExp = transactions.filter(t => t.type === 'expense' && new Date(t.date + 'T00:00:00') >= thisWeekStart).reduce((s,t) => s + t.amount, 0);
  const lastWeekExp = transactions.filter(t => { const d = new Date(t.date+'T00:00:00'); return t.type==='expense' && d >= lastWeekStart && d < thisWeekStart; }).reduce((s,t) => s + t.amount, 0);
  const weekDelta   = lastWeekExp > 0 ? ((thisWeekExp - lastWeekExp) / lastWeekExp) * 100 : 0;

  function cardBill(id: string) {
    return transactions.filter(t => t.card_id === id && t.type === 'expense').reduce((s,t) => s + t.amount, 0);
  }

  const highPriority = purchases.filter(p => p.priority === 'high' && p.status === 'pending');

  const handleDeposit = useCallback(async (amount: number) => {
    if (!savings) return;
    const newAmount = savings.current_amount + amount;
    await updateSavings(savings.id, newAmount);
    setSavings(prev => prev ? { ...prev, current_amount: newAmount } : prev);
  }, [savings]);

  const recentTx = transactions
    .filter(t => {
      if (payFilter === 'debit') return !t.card_id;
      if (payFilter === 'card')  return !!t.card_id;
      return true;
    })
    .slice(0, 6);

  if (loading) return <DashboardSkeleton />;

  return (
    <div style={{ padding: '32px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Hero header ── */}
      <div style={{
        background: 'linear-gradient(105deg, #FFFBEB 0%, #FEF9F0 40%, #F8F9FB 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        marginBottom: 24,
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(14,18,25,.05), 0 8px 32px rgba(14,18,25,.04)',
      }}>
        {/* Subtle grid */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none', borderRadius:20,
          backgroundImage:'linear-gradient(rgba(14,18,25,.018) 1px, transparent 1px), linear-gradient(90deg, rgba(14,18,25,.018) 1px, transparent 1px)',
          backgroundSize:'40px 40px',
          maskImage:'radial-gradient(ellipse 80% 80% at 20% 0%, black 0%, transparent 100%)',
        }} />

        <div style={{ position:'relative', zIndex:1, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:24 }}>
          <div>
            <span className="eyebrow" style={{ marginBottom:10, display:'block' }}>{getCurrentMonthLabel()}</span>
            <p style={{ fontSize:'.85rem', color:'var(--tx-3)', marginBottom:6 }}>Disponível no mês</p>
            <p style={{ fontSize:'3rem', fontWeight:800, letterSpacing:'-.055em', color: balance >= 0 ? 'var(--tx)' : 'var(--red)', lineHeight:1 }}>
              {formatCurrency(balance)}
            </p>
          </div>

          {/* Stats row */}
          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            {[
              { label:'Entradas', value:totalIncome, color:'var(--green)', Icon:TrendingUp },
              { label:'Saídas',   value:totalExpense, color:'var(--red)',   Icon:TrendingDown },
            ].map(({ label, value, color, Icon }) => (
              <div key={label} style={{ minWidth:120 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
                  <Icon size={13} color={color} />
                  <span style={{ fontSize:'.72rem', color:'var(--tx-3)', fontFamily:"'Geist Mono',monospace", textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</span>
                </div>
                <p style={{ fontSize:'1.3rem', fontWeight:700, color:'var(--tx)', letterSpacing:'-.03em' }}>{formatCurrency(value)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Budget bar */}
        <div style={{ marginTop:20, position:'relative', zIndex:1 }}>
          <div className="progress-track" style={{ height:8 }}>
            <div className={`progress-fill ${getProgressClass(budgetPct)}`} style={{ width:`${budgetPct}%` }} />
          </div>
          <p style={{ marginTop:6, fontSize:'.72rem', fontFamily:"'Geist Mono',monospace", color:'var(--tx-4)' }}>
            {budgetPct.toFixed(0)}% da renda utilizada este mês
          </p>
        </div>
      </div>

      {/* ── Main content: single column ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 20 }}>

        {/* Urgent purchases alert strip */}
        {highPriority.length > 0 && (
          <div style={{
            background: 'var(--red-dim)',
            borderRadius: 12,
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <AlertCircle size={15} color="var(--red)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--tx)' }}>
                {highPriority.length} compra{highPriority.length !== 1 ? 's' : ''} urgente{highPriority.length !== 1 ? 's' : ''} pendente{highPriority.length !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: '.78rem', color: 'var(--tx-3)', marginLeft: 6 }}>
                {highPriority.map(p => p.name).join(', ')}
              </span>
            </div>
            <Link href="/planejado" style={{ fontSize: '.75rem', color: 'var(--a)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              Ver <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {/* Week stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Esta semana', value: thisWeekExp, sub: weekDelta !== 0 ? `${weekDelta > 0 ? '↑' : '↓'}${Math.abs(weekDelta).toFixed(0)}% vs anterior` : '—', bad: weekDelta > 0 },
            { label: 'Semana passada', value: lastWeekExp, sub: 'período anterior', bad: false },
          ].map(item => (
            <div key={item.label} style={{
              background: 'var(--sf)', borderRadius: 14, padding: '18px 20px',
              boxShadow: '0 1px 4px rgba(14,18,25,.06), 0 4px 16px rgba(14,18,25,.04)',
            }}>
              <p style={{ fontSize: '.72rem', color: 'var(--tx-3)', marginBottom: 8 }}>{item.label}</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--tx)', letterSpacing: '-.03em' }}>
                {formatCurrency(item.value)}
              </p>
              <p style={{ fontSize: '.7rem', fontFamily: "'Geist Mono',monospace", color: item.bad ? 'var(--red)' : 'var(--tx-4)', marginTop: 5 }}>
                {item.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Reserve */}
        {savings && (
          <ReserveCard
            current={savings.current_amount}
            target={savings.target_amount}
            onDeposit={handleDeposit}
            monthSurplus={balance > 50 ? Math.floor(balance * 0.3) : undefined}
          />
        )}

        {/* Cards */}
        {cards.length > 0 && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="eyebrow">Cartões</span>
              <Link href="/cartoes" style={{ fontSize: '.75rem', color: 'var(--a)', fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                Ver todos <ArrowRight size={12} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cards.slice(0, 3).map(card => (
                <CardWidget key={card.id} card={card} openBillAmount={cardBill(card.id)} onClick={() => {}} />
              ))}
            </div>
          </section>
        )}

      </div>

      {/* ── Gastos fixos (recorrentes) ── */}
      {userId && (
        <RecurringSection userId={userId} currentMonthTx={transactions} cards={cards} />
      )}

      {/* ── Recent transactions (full width) ── */}
      {(recentTx.length > 0 || transactions.length > 0) && (
        <section style={{ marginTop:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span className="eyebrow">Lançamentos recentes</span>
            <Link href="/extrato" style={{ fontSize:'.75rem', color:'var(--a)', fontWeight:500, textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>
              Ver extrato completo <ArrowRight size={12} />
            </Link>
          </div>
          {/* Débito / Cartão chips */}
          <div style={{ display:'flex', gap:6, marginBottom:12 }}>
            {(['all','debit','card'] as const).map(f => (
              <button key={f} onClick={() => setPayFilter(f)} style={{
                padding:'4px 12px', borderRadius:99, fontSize:'.73rem', fontWeight:500,
                border:'1px solid var(--bd-2)', cursor:'pointer',
                background: payFilter===f ? 'var(--tx-2)' : 'var(--sf)',
                color: payFilter===f ? '#fff' : 'var(--tx-3)',
                borderColor: payFilter===f ? 'var(--tx-2)' : 'var(--bd-2)',
              }}>
                {f === 'all' ? 'Todos' : f === 'debit' ? 'Débito' : 'Cartão'}
              </button>
            ))}
          </div>
          <div style={{
            background:'var(--sf)', borderRadius:14,
            boxShadow:'0 1px 4px rgba(14,18,25,.06), 0 4px 16px rgba(14,18,25,.04)',
            overflow:'hidden',
          }}>
            {recentTx.length === 0 && (
              <p style={{ textAlign:'center', padding:'24px', color:'var(--tx-4)', fontSize:'.78rem', fontFamily:"'Geist Mono',monospace" }}>
                Nenhum lançamento neste filtro.
              </p>
            )}
            {recentTx.map((tx, i) => (
              <div key={tx.id} style={{
                display:'flex', alignItems:'center', gap:12, padding:'13px 20px',
                borderBottom: i < recentTx.length-1 ? '1px solid var(--bd)' : 'none',
                transition:'background .15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='var(--bg)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}
              >
                <div style={{
                  width:34, height:34, borderRadius:9, flexShrink:0,
                  background: tx.type==='income' ? 'rgba(16,185,129,.1)' : 'var(--bg-1)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.9rem',
                }}>
                  {tx.type==='income' ? <TrendingUp size={15} color="var(--green)" /> : <TrendingDown size={15} color="var(--tx-3)" />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:'.87rem', fontWeight:500, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.description}</p>
                  <p style={{ fontSize:'.72rem', color:'var(--tx-4)', fontFamily:"'Geist Mono',monospace" }}>{tx.category} · {tx.date}</p>
                </div>
                <span style={{ fontSize:'.92rem', fontWeight:700, color: tx.type==='income' ? 'var(--green)' : 'var(--tx)', flexShrink:0 }}>
                  {tx.type==='income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {transactions.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--tx-4)' }}>
          <Calendar size={32} style={{ margin:'0 auto 14px', display:'block' }} />
          <p style={{ fontFamily:"'Geist Mono',monospace", fontSize:'.8rem', letterSpacing:'.04em' }}>
            Nenhum lançamento este mês.<br />Use o botão Lançar para começar.
          </p>
        </div>
      )}
    </div>
  );
}
