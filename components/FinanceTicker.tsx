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
      display: 'flex',
      alignItems: 'center',
      height: 44,
    }}>
      {/* Scrolling track */}
      <div style={{
        display: 'flex',
        whiteSpace: 'nowrap',
        animation: 'tickerScroll 60s linear infinite',
        paddingLeft: 24,
        alignItems: 'center',
      }}>
        {items.map((tip, i) => (
          <span key={i} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 20,
            fontSize: '.82rem',
            color: 'var(--tx-2)',
            lineHeight: 1,
            paddingRight: 48,
          }}>
            <Lightbulb size={12} color="var(--a)" strokeWidth={2} style={{ flexShrink: 0 }} />
            {tip}
          </span>
        ))}
      </div>
    </div>
  );
}
