'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, getTransactions, getCards, getPlannedPurchases, getSavings, updateSavings, getFutureTransactions } from '@/lib/supabase';
import { Transaction, Card, PlannedPurchase, SavingsGoal } from '@/lib/types';
import { formatCurrency, getCurrentMonth, getCurrentMonthLabel, getProgressClass } from '@/lib/utils';
import ReserveCard from '@/components/ReserveCard';
import CardWidget from '@/components/CardWidget';
import RecurringSection from '@/components/RecurringSection';
import { TrendingDown, TrendingUp, Calendar, ArrowRight, AlertCircle, CalendarClock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { onRefresh, requestValuesToggle, onValuesState } from '@/lib/refresh';
import { DashboardSkeleton } from '@/components/Skeleton';

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [purchases, setPurchases] = useState<PlannedPurchase[]>([]);
  const [savings, setSavings] = useState<SavingsGoal | null>(null);
  const [futureTx, setFutureTx] = useState<Transaction[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payFilter, setPayFilter] = useState<'all' | 'debit' | 'card'>('all');
  const [heroHidden, setHeroHidden] = useState(false);
  const [futureMonth, setFutureMonth] = useState('');

  async function loadData(uid: string) {
    setLoading(true);
    const [txRes, cardsRes, purchasesRes, savingsRes, futureRes] = await Promise.all([
      getTransactions(uid, getCurrentMonth()),
      getCards(uid),
      getPlannedPurchases(uid),
      getSavings(uid),
      getFutureTransactions(uid),
    ]);
    setTransactions(txRes.data || []);
    setCards(cardsRes.data || []);
    setPurchases(purchasesRes.data || []);
    setSavings(savingsRes.data || null);
    setFutureTx(futureRes.data || []);
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

  // Sync hero eye button with the layout's values-hidden state
  useEffect(() => {
    try { setHeroHidden(localStorage.getItem('fc-values-hidden') === 'true'); } catch {}
    return onValuesState(h => setHeroHidden(h));
  }, []);

  // Auto-select first future month when data loads
  useEffect(() => {
    if (futureTx.length > 0 && !futureMonth) {
      const months = [...new Set(futureTx.map(t => t.date.slice(0, 7)))].sort();
      setFutureMonth(months[0]);
    }
  }, [futureTx, futureMonth]);

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
    <div className="dashboard-root px-page" style={{ paddingTop: 24, paddingBottom: 40, maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Hero header ── */}
      <div style={{
        background: 'linear-gradient(105deg, #FFFFFF 0%, #F5F6F8 55%, #EDEEF1 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        marginBottom: 24,
        position: 'relative', overflow: 'hidden',
        border: '1px solid var(--bd-2)',
        boxShadow: '0 2px 12px rgba(14,18,25,.07), 0 8px 32px rgba(14,18,25,.05)',
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
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <p style={{ fontSize:'3rem', fontWeight:800, letterSpacing:'-.055em', color: balance >= 0 ? 'var(--tx)' : 'var(--red)', lineHeight:1 }}>
                <span className="money">{formatCurrency(balance)}</span>
              </p>
              {/* Desktop-only eye toggle — near the main number */}
              <button
                className="hero-eye-btn"
                onClick={requestValuesToggle}
                title={heroHidden ? 'Mostrar valores' : 'Ocultar valores'}
              >
                {heroHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{heroHidden ? 'Mostrar' : 'Ocultar'}</span>
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            {[
              { label:'Entradas', value:totalIncome, color:'var(--green)', Icon:TrendingUp },
              { label:'Saídas',   value:totalExpense, color:'var(--red)',   Icon:TrendingDown },
            ].map(({ label, value, color, Icon }) => (
              <div key={label}>
                <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:4 }}>
                  <Icon size={13} color={color} />
                  <span style={{ fontSize:'.72rem', color:'var(--tx-3)', fontFamily:"'Geist Mono',monospace", textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</span>
                </div>
                <p style={{ fontSize:'1.3rem', fontWeight:700, color:'var(--tx)', letterSpacing:'-.03em' }}><span className="money">{formatCurrency(value)}</span></p>
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
            display: 'flex', alignItems: 'center', gap: 12,
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

        {/* ── Stats + Card: single carousel mobile / equal 3-col desktop ── */}
        <div className={cards.length > 0 ? 'week-and-cards' : 'week-stats-only'}>
          {[
            { label: 'Esta semana',    value: thisWeekExp,  sub: weekDelta !== 0 ? `${weekDelta > 0 ? '↑' : '↓'}${Math.abs(weekDelta).toFixed(0)}% vs anterior` : '—', bad: weekDelta > 0 },
            { label: 'Semana passada', value: lastWeekExp,  sub: 'período anterior', bad: false },
          ].map(item => (
            <div key={item.label} style={{
              background: 'var(--sf)', borderRadius: 14, padding: '16px 20px',
              boxShadow: '0 1px 4px rgba(14,18,25,.06), 0 4px 16px rgba(14,18,25,.04)',
            }}>
              <p style={{ fontSize: '.72rem', color: 'var(--tx-3)', marginBottom: 8 }}>{item.label}</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--tx)', letterSpacing: '-.03em' }}>
                <span className="money">{formatCurrency(item.value)}</span>
              </p>
              <p style={{ fontSize: '.7rem', fontFamily: "'Geist Mono',monospace", color: item.bad ? 'var(--red)' : 'var(--tx-4)', marginTop: 4 }}>
                {item.sub}
              </p>
            </div>
          ))}
          {/* Cartão — 3rd column on desktop, 3rd slide on mobile */}
          {cards.length > 0 && (
            <CardWidget card={cards[0]} openBillAmount={cardBill(cards[0].id)} onClick={() => {}} />
          )}
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

      </div>

      {/* ── Gastos fixos (recorrentes) ── */}
      {userId && (
        <div style={{ marginTop: 20 }}>
          <RecurringSection userId={userId} currentMonthTx={transactions} cards={cards} />
        </div>
      )}

      {/* ── Próximos meses — tab nav ── */}
      {(() => {
        const futureMonths = [...new Set(futureTx.map(t => t.date.slice(0, 7)))].sort();
        const selectedTxs  = futureTx.filter(t => t.date.startsWith(futureMonth));
        const monthLabel   = (m: string) => {
          const l = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
            .format(new Date(m + '-01T00:00:00'));
          return l.charAt(0).toUpperCase() + l.slice(1);
        };
        const out = selectedTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const inc = selectedTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

        return (
          <section style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <CalendarClock size={11} color="var(--a)" />
              <span className="eyebrow">Próximos meses</span>
            </div>

            {/* Month tabs — scrollable pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {futureMonths.map(m => (
                <button key={m} onClick={() => setFutureMonth(m)} style={{
                  padding: '6px 16px', borderRadius: 99, fontSize: '.78rem', fontWeight: 500,
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, border: '1px solid',
                  background: futureMonth === m ? 'var(--a)' : 'var(--sf)',
                  color: futureMonth === m ? '#fff' : 'var(--tx-3)',
                  borderColor: futureMonth === m ? 'var(--a)' : 'var(--bd-2)',
                  transition: 'all .15s',
                }}>
                  {monthLabel(m)}
                </button>
              ))}
            </div>

            {futureMonth && selectedTxs.length > 0 ? (
              <>
                {/* Totals bar */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {inc > 0 && (
                    <div style={{ flex: 1, background: 'rgba(16,185,129,.06)', borderRadius: 10, padding: '10px 16px', border: '1px solid rgba(16,185,129,.12)' }}>
                      <p style={{ fontSize: '.62rem', color: 'var(--tx-4)', fontFamily:"'Geist Mono',monospace", textTransform:'uppercase', letterSpacing:'.06em', marginBottom: 2 }}>Entradas</p>
                      <p style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--green)' }}><span className="money">+{formatCurrency(inc)}</span></p>
                    </div>
                  )}
                  {out > 0 && (
                    <div style={{ flex: 1, background: 'var(--red-dim)', borderRadius: 10, padding: '10px 16px', border: '1px solid rgba(239,68,68,.1)' }}>
                      <p style={{ fontSize: '.62rem', color: 'var(--tx-4)', fontFamily:"'Geist Mono',monospace", textTransform:'uppercase', letterSpacing:'.06em', marginBottom: 2 }}>Saídas</p>
                      <p style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--red)' }}><span className="money">-{formatCurrency(out)}</span></p>
                    </div>
                  )}
                </div>
                {/* Transaction list */}
                <div style={{ background:'var(--sf)', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(14,18,25,.06), 0 4px 16px rgba(14,18,25,.04)' }}>
                  {selectedTxs.map((tx, i) => (
                    <div key={tx.id} style={{
                      display:'flex', alignItems:'center', gap:12, padding:'12px 20px',
                      borderBottom: i < selectedTxs.length-1 ? '1px solid var(--bd)' : 'none',
                    }}>
                      <div style={{
                        width:32, height:32, borderRadius:8, flexShrink:0,
                        background: tx.type==='income' ? 'rgba(16,185,129,.1)' : 'var(--bg-1)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        {tx.type==='income' ? <TrendingUp size={13} color="var(--green)" /> : <TrendingDown size={13} color="var(--tx-3)" />}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:'.85rem', fontWeight:500, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.description}</p>
                        <p style={{ fontSize:'.68rem', color:'var(--tx-4)', fontFamily:"'Geist Mono',monospace" }}>{tx.category} · {tx.date}</p>
                      </div>
                      <span style={{ fontSize:'.9rem', fontWeight:700, color: tx.type==='income' ? 'var(--green)' : 'var(--tx)', flexShrink:0 }}>
                        <span className="money">{tx.type==='income' ? '+' : '-'}{formatCurrency(tx.amount)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Empty state for selected month (or no future months at all) */
              <div style={{
                background: 'var(--sf)', borderRadius: 14, padding: '32px 20px', textAlign: 'center',
                boxShadow: '0 1px 4px rgba(14,18,25,.06)',
              }}>
                <CalendarClock size={24} color="var(--tx-4)" style={{ margin: '0 auto 8px', display: 'block', opacity: .5 }} />
                <p style={{ fontSize: '.78rem', color: 'var(--tx-4)', fontFamily:"'Geist Mono',monospace" }}>
                  {futureMonths.length === 0
                    ? 'Nenhum lançamento futuro registrado.'
                    : 'Nenhum lançamento neste mês.'}
                </p>
              </div>
            )}
          </section>
        );
      })()}

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
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
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
                display:'flex', alignItems:'center', gap:12, padding:'12px 20px',
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
                  <span className="money">{tx.type==='income' ? '+' : '-'}{formatCurrency(tx.amount)}</span>
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
