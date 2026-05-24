'use client';

import { useState, useEffect } from 'react';
import { supabase, getPlannedPurchases, insertPlannedPurchase, markPurchaseBought } from '@/lib/supabase';
import { PlannedPurchase, CATEGORIES } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Plus, ShoppingBag, CheckCircle, X, Tag, AlertCircle } from 'lucide-react';
import { PlanejadoSkeleton } from '@/components/Skeleton';

export default function PlanejadoPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<PlannedPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBought, setShowBought] = useState(false);

  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [priority, setPriority] = useState<'high' | 'low'>('low');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const { data } = await getPlannedPurchases(user.id);
      setPurchases(data || []);
      setLoading(false);
    });
  }, []);

  async function handleAdd() {
    if (!userId || !name || !category) return;
    setSaving(true);
    const { data } = await insertPlannedPurchase({
      user_id: userId, name, priority, category,
      estimated_value: parseFloat(value.replace(',', '.')) || 0,
      notes: notes || null, status: 'pending',
    });
    if (data) setPurchases(prev => [...prev, data]);
    setShowForm(false);
    setName(''); setValue(''); setNotes(''); setCategory(''); setSaving(false);
  }

  async function handleBought(id: string) {
    await markPurchaseBought(id);
    setPurchases(prev => prev.map(p => p.id === id ? { ...p, status: 'bought' as const } : p));
  }

  const pending = purchases.filter(p => p.status === 'pending');
  const highPriority = pending.filter(p => p.priority === 'high');
  const lowPriority = pending.filter(p => p.priority === 'low');
  const bought = purchases.filter(p => p.status === 'bought');

  const totalPending = pending.reduce((s, p) => s + p.estimated_value, 0);
  const totalHigh = highPriority.reduce((s, p) => s + p.estimated_value, 0);

  function PurchaseRow({ p }: { p: PlannedPurchase }) {
    return (
      <div style={{
        display:'flex', gap:12, alignItems:'flex-start',
        padding:'14px 0',
        borderBottom:'1px solid var(--bd)',
        opacity: p.status === 'bought' ? .55 : 1,
      }}>
        <div style={{
          width:36, height:36, borderRadius:10, flexShrink:0,
          background: p.priority === 'high' ? 'var(--red-dim)' : 'var(--bg-1)',
          border:`1px solid ${p.priority === 'high' ? 'rgba(239,68,68,.18)' : 'var(--bd)'}`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {p.priority === 'high'
            ? <AlertCircle size={15} color="var(--red)" />
            : <ShoppingBag size={15} color="var(--tx-4)" />}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
            <p style={{ fontSize:'.88rem', fontWeight:600, color:'var(--tx)', lineHeight:1.2,
              textDecoration: p.status === 'bought' ? 'line-through' : 'none' }}>
              {p.name}
            </p>
            <span style={{ fontSize:'.95rem', fontWeight:700, color:'var(--tx)', flexShrink:0, marginLeft:8 }}>
              {formatCurrency(p.estimated_value)}
            </span>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
            <span className="badge badge-gray" style={{ fontSize:'.6rem' }}>
              <Tag size={9} /> {p.category}
            </span>
            <span className={`badge ${p.priority === 'high' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize:'.6rem' }}>
              {p.priority === 'high' ? 'Alta prioridade' : 'Baixa prioridade'}
            </span>
          </div>
          {p.notes && (
            <p style={{ fontSize:'.75rem', color:'var(--tx-3)', marginTop:4, fontStyle:'italic' }}>{p.notes}</p>
          )}
        </div>
        {p.status === 'pending' && (
          <button
            onClick={() => handleBought(p.id)}
            style={{
              flexShrink:0, background:'var(--a-dim)', border:'1px solid var(--a-bd)',
              borderRadius:8, padding:'6px 10px', cursor:'pointer',
              fontSize:'.73rem', fontWeight:600, color:'var(--a)',
              whiteSpace:'nowrap',
            }}
          >
            Comprei!
          </button>
        )}
        {p.status === 'bought' && (
          <div style={{ flexShrink:0, color:'var(--green)', display:'flex', alignItems:'center', gap:3 }}>
            <CheckCircle size={14} />
          </div>
        )}
      </div>
    );
  }

  if (loading) return <PlanejadoSkeleton />;

  return (
    <div style={{ maxWidth:900, margin:"0 auto", padding:"0 0 40px" }}>
      {/* Header */}
      <div style={{ padding:'32px 32px 20px', borderBottom:'1px solid var(--bd)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <span className="eyebrow">Compras planejadas</span>
          <button className="btn-amber" onClick={() => setShowForm(true)} style={{ fontSize:'.78rem', padding:'.45rem .9rem' }}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
        {/* Summary */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[
            { label:'Alta prioridade', value:totalHigh, color:'var(--red)', count:highPriority.length },
            { label:'Total planejado', value:totalPending, color:'var(--tx)', count:pending.length },
          ].map(s => (
            <div key={s.label} style={{ background:'var(--bg-1)', borderRadius:10, padding:'10px 12px', boxShadow:'0 1px 4px rgba(14,18,25,.06)' }}>
              <p style={{ fontSize:'.65rem', color:'var(--tx-4)', fontFamily:"'Geist Mono',monospace", textTransform:'uppercase', letterSpacing:'.06em', marginBottom:3 }}>
                {s.label}
              </p>
              <p style={{ fontSize:'.9rem', fontWeight:700, color:s.color, letterSpacing:'-.02em' }}>
                {formatCurrency(s.value)}
              </p>
              <p style={{ fontSize:'.65rem', color:'var(--tx-4)', fontFamily:"'Geist Mono',monospace" }}>{s.count} item{s.count !== 1 ? 's' : ''}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'0 32px' }}>
        {/* Add form */}
        {showForm && (
          <div className="card" style={{ padding:20, marginTop:16, marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <p style={{ fontWeight:600, color:'var(--tx)' }}>Nova compra</p>
              <button onClick={() => setShowForm(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--tx-3)', display:'flex' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <input className="input" placeholder="Nome da compra" value={name} onChange={e => setName(e.target.value)} />
              <input className="input" type="number" placeholder="Valor estimado (R$)" value={value} onChange={e => setValue(e.target.value)} />
              {/* Priority */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {(['high','low'] as const).map(p => (
                  <button key={p} onClick={() => setPriority(p)} style={{
                    padding:'9px', borderRadius:8, fontSize:'.82rem', fontWeight:500,
                    border:'1px solid var(--bd-2)', cursor:'pointer',
                    background: priority === p ? (p === 'high' ? 'var(--red-dim)' : 'var(--a-dim)') : 'var(--sf)',
                    color: priority === p ? (p === 'high' ? 'var(--red)' : 'var(--a)') : 'var(--tx-3)',
                    borderColor: priority === p ? (p === 'high' ? 'rgba(239,68,68,.25)' : 'var(--a-bd)') : 'var(--bd-2)',
                  }}>
                    {p === 'high' ? '🔴 Alta prioridade' : '🟡 Baixa prioridade'}
                  </button>
                ))}
              </div>
              <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Categoria...</option>
                {CATEGORIES.expense.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <textarea className="input" rows={2} placeholder="Notas (opcional)" value={notes} onChange={e => setNotes(e.target.value)} style={{ resize:'none', fontFamily:'inherit' }} />
              <button className="btn-amber" onClick={handleAdd} disabled={saving} style={{ justifyContent:'center' }}>
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        )}

        {/* High priority */}
        {highPriority.length > 0 && (
          <div style={{ marginTop:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--red)' }} />
              <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:'.62rem', color:'var(--red)', letterSpacing:'.1em', textTransform:'uppercase' }}>
                Alta prioridade
              </span>
            </div>
            {highPriority.map(p => <PurchaseRow key={p.id} p={p} />)}
          </div>
        )}

        {/* Low priority */}
        {lowPriority.length > 0 && (
          <div style={{ marginTop: highPriority.length > 0 ? 20 : 16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--a)' }} />
              <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:'.62rem', color:'var(--a)', letterSpacing:'.1em', textTransform:'uppercase' }}>
                Baixa prioridade
              </span>
            </div>
            {lowPriority.map(p => <PurchaseRow key={p.id} p={p} />)}
          </div>
        )}

        {pending.length === 0 && !showForm && (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--tx-4)' }}>
            <ShoppingBag size={28} style={{ margin:'0 auto 12px', display:'block' }} />
            <p style={{ fontFamily:"'Geist Mono',monospace", fontSize:'.78rem' }}>Nenhuma compra planejada.</p>
          </div>
        )}

        {/* Bought */}
        {bought.length > 0 && (
          <div style={{ marginTop:24, borderTop:'1px solid var(--bd)', paddingTop:16 }}>
            <button
              onClick={() => setShowBought(!showBought)}
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--tx-3)', display:'flex', alignItems:'center', gap:6, fontSize:'.78rem', fontFamily:"'Geist Mono',monospace" }}
            >
              <CheckCircle size={13} color="var(--green)" />
              {showBought ? 'Ocultar' : 'Ver'} comprados ({bought.length})
            </button>
            {showBought && (
              <div style={{ marginTop:8, opacity:.7 }}>
                {bought.map(p => <PurchaseRow key={p.id} p={p} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
