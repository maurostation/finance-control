'use client';

import { useState } from 'react';
import { PiggyBank, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Props {
  current: number;
  target: number;
  onDeposit: (amount: number) => Promise<void>;
  monthSurplus?: number;
}

export default function ReserveCard({ current, target, onDeposit, monthSurplus }: Props) {
  const [showInput, setShowInput] = useState(false);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const pct = Math.min((current / target) * 100, 100);

  async function handleDeposit() {
    const amt = parseFloat(value.replace(',', '.'));
    if (!amt || amt <= 0) return;
    setLoading(true);
    await onDeposit(amt);
    setValue('');
    setShowInput(false);
    setLoading(false);
  }

  const progressClass = pct >= 90 ? 'safe' : pct >= 50 ? 'warning' : 'danger';

  return (
    <div className="card" style={{ padding:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:36, height:36, borderRadius:10, flexShrink:0,
            background:'var(--a-dim)', border:'1px solid var(--a-bd)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <PiggyBank size={16} color="var(--a)" />
          </div>
          <div>
            <p style={{ fontSize:'.78rem', color:'var(--tx-3)', fontFamily:"'Geist Mono',monospace", letterSpacing:'.06em', textTransform:'uppercase' }}>
              Reserva de emergência
            </p>
            <p style={{ fontSize:'1.3rem', fontWeight:700, color:'var(--tx)', letterSpacing:'-.03em', lineHeight:1.1 }}>
              <span className="money">{formatCurrency(current)}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowInput(!showInput)}
          style={{
            width:32, height:32, borderRadius:8, border:'1px solid var(--a-bd)',
            background:'var(--a-dim)', cursor:'pointer', color:'var(--a)',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Progress */}
      <div style={{ marginBottom:10 }}>
        <div className="progress-track">
          <div className={`progress-fill ${progressClass}`} style={{ width:`${pct}%` }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
          <span style={{ fontSize:'.72rem', fontFamily:"'Geist Mono',monospace", color:'var(--tx-4)' }}>
            {pct.toFixed(0)}% da meta
          </span>
          <span style={{ fontSize:'.72rem', fontFamily:"'Geist Mono',monospace", color:'var(--tx-3)' }}>
            meta: <span className="money">{formatCurrency(target)}</span>
          </span>
        </div>
      </div>

      {/* Surplus suggestion */}
      {monthSurplus && monthSurplus > 0 && !showInput && (
        <div style={{
          marginTop:8, padding:'10px 12px', borderRadius:8,
          background:'var(--a-pale)', border:'1px solid var(--a-bd)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <p style={{ fontSize:'.8rem', color:'var(--tx-2)' }}>
            Sobrou <strong style={{ color:'var(--a)' }}><span className="money">{formatCurrency(monthSurplus)}</span></strong> esse mês
          </p>
          <button
            className="btn-amber"
            onClick={() => { setValue(monthSurplus.toFixed(2)); setShowInput(true); }}
            style={{ fontSize:'.75rem', padding:'.35rem .8rem' }}
          >
            Guardar
          </button>
        </div>
      )}

      {/* Deposit input */}
      {showInput && (
        <div style={{ marginTop:12, display:'flex', gap:8 }}>
          <input
            className="input"
            type="number"
            placeholder="Valor a guardar"
            value={value}
            onChange={e => setValue(e.target.value)}
            style={{ flex:1 }}
            autoFocus
          />
          <button className="btn-amber" onClick={handleDeposit} disabled={loading}>
            {loading ? '...' : 'Ok'}
          </button>
          <button className="btn-ghost" onClick={() => setShowInput(false)}>✕</button>
        </div>
      )}
    </div>
  );
}
