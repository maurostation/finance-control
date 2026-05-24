'use client';

import { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';

const TIPS_POOL = [
  'Regra do Pay Yourself First: ao receber o salário, transfira para a reserva antes de qualquer outro gasto.',
  'Lifestyle inflation é silenciosa — quando a renda sobe, os gastos sobem junto. Quebre esse ciclo conscientemente.',
  'Cartão de crédito não é extensão de renda: é dinheiro do mês que vem sendo consumido agora.',
  'Gastos pequenos e frequentes são os maiores vilões: R$ 30/dia em extras = quase R$ 900/mês.',
  'Automatize a poupança: configure uma transferência automática no dia do pagamento. O que você não vê, não gasta.',
  'Primeiro mês de controle é revelador — muita gente fica em choque ao ver para onde o dinheiro realmente foi.',
  'A reserva de emergência tem valor psicológico: te livra de tomar decisões ruins por desespero.',
  'Metas concretas funcionam melhor que intenções: não "guardar mais", mas "R$ 500 por mês, todo dia 5".',
  'Cada real guardado é poder de decisão amanhã: trocar de emprego, viajar, reduzir a jornada.',
  'Antes de qualquer compra não planejada acima de R$ 200: espere 48 horas. Se ainda quiser, vale a pena.',
  'Quem ganha bem e não guarda nada ainda é, na prática, pobre — riqueza é o que sobra, não o que entra.',
  'Compras parceladas somadas podem comprometer boa parte da renda futura sem você perceber.',
];

function pick3(): string[] {
  return [...TIPS_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
}

export default function FinanceTicker() {
  const [tips, setTips] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('fc-ticker-tips');
      if (stored) {
        setTips(JSON.parse(stored));
      } else {
        const selected = pick3();
        sessionStorage.setItem('fc-ticker-tips', JSON.stringify(selected));
        setTips(selected);
      }
    } catch {
      setTips(pick3());
    }
  }, []);

  if (tips.length === 0) return null;

  // Duplicate content so the -50% translate creates a seamless loop
  const items = [...tips, ...tips];

  return (
    <div style={{
      background: 'var(--a-dim)',
      borderBottom: '1px solid var(--a-bd)',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      height: 44,
    }}>
      {/* Left pin: icon + fade */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 2,
        display: 'flex', alignItems: 'center',
        paddingLeft: 16, paddingRight: 36,
        background: 'linear-gradient(90deg, var(--a-pale) 60%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        <Lightbulb size={14} color="var(--a)" strokeWidth={2} />
      </div>

      {/* Right fade */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 2,
        width: 56,
        background: 'linear-gradient(270deg, var(--a-pale) 40%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Scrolling track */}
      <div style={{
        display: 'flex',
        whiteSpace: 'nowrap',
        animation: 'tickerScroll 60s linear infinite',
        paddingLeft: 52,
        alignItems: 'center',
      }}>
        {items.map((tip, i) => (
          <span key={i} style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: '.82rem',
            color: 'var(--tx-2)',
            lineHeight: 1,
            paddingRight: 64,
          }}>
            {tip}
            {/* Separator dot */}
            <span style={{
              display: 'inline-block',
              width: 5, height: 5,
              borderRadius: '50%',
              background: 'var(--a)',
              opacity: 0.45,
              marginLeft: 64,
              flexShrink: 0,
            }} />
          </span>
        ))}
      </div>
    </div>
  );
}
