'use client';

import { CreditCard, ChevronRight } from 'lucide-react';
import { formatCurrency, daysUntil } from '@/lib/utils';
import { Card } from '@/lib/types';

interface Props {
  card: Card;
  openBillAmount: number;
  onClick: () => void;
}

export default function CardWidget({ card, openBillAmount, onClick }: Props) {
  const days = daysUntil(card.closing_day);
  const limitUsedPct = card.limit_amount > 0
    ? Math.min((openBillAmount / card.limit_amount) * 100, 100)
    : 0;
  const urgency = days <= 3 ? 'danger' : days <= 7 ? 'warning' : 'safe';
  const urgencyColor = urgency === 'danger' ? 'var(--red)' : urgency === 'warning' ? 'var(--a)' : 'var(--tx-3)';

  return (
    <button onClick={onClick} style={{
      background:'var(--sf)',
      borderRadius:12, padding:'14px 16px',
      display:'flex', alignItems:'center', gap:12,
      cursor:'pointer', textAlign:'left', width:'100%',
      border: 'none',
      boxShadow: '0 1px 4px rgba(14,18,25,.06), 0 4px 16px rgba(14,18,25,.04)',
      transition:'box-shadow .2s, transform .15s',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(14,18,25,.1), 0 0 0 2px var(--a-bd)';
      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(14,18,25,.06), 0 4px 16px rgba(14,18,25,.04)';
      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
    }}>
      <div style={{
        width:36, height:36, borderRadius:10, flexShrink:0,
        background: card.color + '18',
        border: `1px solid ${card.color}30`,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <CreditCard size={16} style={{ color: card.color }} />
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
          <span style={{ fontSize:'.85rem', fontWeight:600, color:'var(--tx)' }}>{card.name}</span>
          <span style={{ fontSize:'.9rem', fontWeight:700, color:'var(--tx)' }}>
            <span className="money">{formatCurrency(openBillAmount)}</span>
          </span>
        </div>
        <div className="progress-track" style={{ height:4, marginBottom:6 }}>
          <div className={`progress-fill ${urgency}`} style={{ width:`${limitUsedPct}%` }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:'.62rem', color: urgencyColor }}>
            fecha em {days} dia{days !== 1 ? 's' : ''}
          </span>
          {card.limit_amount > 0 && (
            <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:'.62rem', color:'var(--tx-4)' }}>
              {limitUsedPct.toFixed(0)}% do limite
            </span>
          )}
        </div>
      </div>

      <ChevronRight size={14} color="var(--tx-4)" style={{ flexShrink:0 }} />
    </button>
  );
}
