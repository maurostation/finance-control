'use client';

import { useState, useEffect } from 'react';
import { supabase, getCards, insertCard, getTransactions } from '@/lib/supabase';
import { Card, Transaction } from '@/lib/types';
import { formatCurrency, getCurrentMonth, daysUntil } from '@/lib/utils';
import { Plus, CreditCard, X, TrendingDown } from 'lucide-react';
import { onRefresh } from '@/lib/refresh';
import { CardsPageSkeleton } from '@/components/Skeleton';

const CARD_COLORS = ['#D97706','#7C3AED','#0EA5E9','#10B981','#EF4444','#EC4899'];

export default function CartoesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [closingDay, setClosingDay] = useState(10);
  const [dueDay, setDueDay] = useState(17);
  const [limit, setLimit] = useState('');
  const [color, setColor] = useState(CARD_COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function loadData(uid: string) {
    setLoading(true);
    const [cardsRes, txRes] = await Promise.all([
      getCards(uid),
      getTransactions(uid, getCurrentMonth()),
    ]);
    setCards(cardsRes.data || []);
    setTransactions(txRes.data || []);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      await loadData(user.id);
    });
  }, []);

  // Re-fetch when a transaction is saved anywhere in the app
  useEffect(() => {
    if (!userId) return;
    return onRefresh(() => loadData(userId));
  }, [userId]);

  function cardBill(cardId: string) {
    return transactions.filter(t => t.card_id === cardId && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  }

  function cardTx(cardId: string) {
    return transactions.filter(t => t.card_id === cardId && t.type === 'expense');
  }

  async function handleAddCard() {
    if (!userId || !name) return;
    setSaving(true);
    const { data } = await insertCard({
      user_id: userId, name, closing_day: closingDay, due_day: dueDay,
      limit_amount: parseFloat(limit) || 0, color,
    });
    if (data) setCards(prev => [...prev, data]);
    setShowForm(false);
    setName(''); setLimit(''); setSaving(false);
  }

  if (loading) return <CardsPageSkeleton />;

  return (
    <div style={{ maxWidth:900, margin:"0 auto", padding:"0 0 40px" }}>
      {/* Header */}
      <div style={{ padding:'32px 32px 20px', borderBottom:'1px solid var(--bd)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span className="eyebrow">Cartões</span>
          <button className="btn-amber" onClick={() => setShowForm(true)} style={{ fontSize:'.78rem', padding:'.45rem .9rem' }}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
      </div>

      <div style={{ padding:'20px' }}>
        {cards.length === 0 && !showForm && (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--tx-4)' }}>
            <CreditCard size={28} style={{ margin:'0 auto 12px', display:'block' }} />
            <p style={{ fontFamily:"'Geist Mono',monospace", fontSize:'.78rem' }}>Nenhum cartão cadastrado.</p>
            <button className="btn-amber" onClick={() => setShowForm(true)} style={{ marginTop:16 }}>
              <Plus size={13} /> Adicionar cartão
            </button>
          </div>
        )}

        {/* Add card form */}
        {showForm && (
          <div className="card" style={{ padding:20, marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <p style={{ fontWeight:600, color:'var(--tx)' }}>Novo cartão</p>
              <button onClick={() => setShowForm(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--tx-3)', display:'flex' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <input className="input" placeholder="Nome do cartão (ex: Nubank)" value={name} onChange={e => setName(e.target.value)} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <label style={{ fontSize:'.75rem', color:'var(--tx-3)', display:'block', marginBottom:4 }}>Fechamento (dia)</label>
                  <input className="input" type="number" min={1} max={31} value={closingDay} onChange={e => setClosingDay(Number(e.target.value))} />
                </div>
                <div>
                  <label style={{ fontSize:'.75rem', color:'var(--tx-3)', display:'block', marginBottom:4 }}>Vencimento (dia)</label>
                  <input className="input" type="number" min={1} max={31} value={dueDay} onChange={e => setDueDay(Number(e.target.value))} />
                </div>
              </div>
              <input className="input" type="number" placeholder="Limite (R$) — opcional" value={limit} onChange={e => setLimit(e.target.value)} />
              <div>
                <label style={{ fontSize:'.75rem', color:'var(--tx-3)', display:'block', marginBottom:8 }}>Cor</label>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {CARD_COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)} style={{
                      width:28, height:28, borderRadius:'50%', background:c, border:'none', cursor:'pointer',
                      outline: color === c ? `3px solid ${c}` : 'none',
                      outlineOffset:2,
                    }} />
                  ))}
                </div>
              </div>
              <button className="btn-amber" onClick={handleAddCard} disabled={saving} style={{ justifyContent:'center' }}>
                {saving ? 'Salvando...' : 'Salvar cartão'}
              </button>
            </div>
          </div>
        )}

        {/* Cards list */}
        {cards.map(card => {
          const bill = cardBill(card.id);
          const txList = cardTx(card.id);
          const days = daysUntil(card.closing_day);
          const isExpanded = selectedCard?.id === card.id;

          return (
            <div key={card.id} style={{ marginBottom:12 }}>
              {/* Card visual */}
              <div
                onClick={() => setSelectedCard(isExpanded ? null : card)}
                style={{
                  background:`linear-gradient(135deg, ${card.color}22 0%, ${card.color}08 100%)`,
                  border:`1px solid ${card.color}25`,
                  borderRadius:14, padding:'16px 18px', cursor:'pointer',
                  transition:'all .2s',
                }}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <div style={{
                        width:8, height:8, borderRadius:'50%', background:card.color,
                        boxShadow:`0 0 0 3px ${card.color}25`,
                      }} />
                      <span style={{ fontSize:'.84rem', fontWeight:600, color:'var(--tx)' }}>{card.name}</span>
                    </div>
                    <p style={{ fontSize:'1.5rem', fontWeight:700, color:'var(--tx)', letterSpacing:'-.04em' }}>
                      {formatCurrency(bill)}
                    </p>
                    <p style={{ fontSize:'.75rem', color:'var(--tx-3)', marginTop:4 }}>
                      fatura em aberto · fecha em {days} dia{days !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    {card.limit_amount > 0 && (
                      <span className="badge badge-gray" style={{ display:'block', marginBottom:4 }}>
                        limite {formatCurrency(card.limit_amount)}
                      </span>
                    )}
                    <span className="badge badge-amber">
                      vence dia {card.due_day}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expanded transactions */}
              {isExpanded && txList.length > 0 && (
                <div className="card" style={{ marginTop:4, borderRadius:'0 0 12px 12px' }}>
                  {txList.map((tx, i) => (
                    <div key={tx.id} style={{
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                      padding:'10px 16px',
                      borderBottom: i < txList.length - 1 ? '1px solid var(--bd)' : 'none',
                    }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <TrendingDown size={13} color="var(--tx-4)" />
                        <div>
                          <p style={{ fontSize:'.83rem', fontWeight:500, color:'var(--tx)' }}>{tx.description}</p>
                          <p style={{ fontSize:'.7rem', color:'var(--tx-4)', fontFamily:"'Geist Mono',monospace" }}>
                            {tx.category} · {tx.date}
                            {tx.is_installment && ` · ${tx.installment_number}/${tx.total_installments}x`}
                          </p>
                        </div>
                      </div>
                      <span style={{ fontSize:'.88rem', fontWeight:600, color:'var(--tx)' }}>
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                  <div style={{
                    padding:'10px 16px', display:'flex', justifyContent:'space-between',
                    background:'var(--bg-1)', borderTop:'1px solid var(--bd)',
                    borderRadius:'0 0 12px 12px',
                  }}>
                    <span style={{ fontSize:'.78rem', fontWeight:600, color:'var(--tx-2)' }}>Total</span>
                    <span style={{ fontSize:'.9rem', fontWeight:700, color:'var(--tx)' }}>{formatCurrency(bill)}</span>
                  </div>
                </div>
              )}
              {isExpanded && txList.length === 0 && (
                <div style={{ padding:'14px 18px', textAlign:'center', color:'var(--tx-4)', fontSize:'.78rem', fontFamily:"'Geist Mono',monospace" }}>
                  Nenhuma compra neste cartão este mês.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
