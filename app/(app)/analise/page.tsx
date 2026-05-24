'use client';

import { BarChart2, TrendingUp, PieChart, Calendar } from 'lucide-react';

const COMING = [
  { Icon: TrendingUp,  label: 'Evolução do saldo',          desc: 'Linha mês a mês — veja se você está evoluindo.' },
  { Icon: PieChart,    label: 'Gastos por categoria',        desc: 'Donut com quanto vai para cada tipo de gasto.' },
  { Icon: BarChart2,   label: 'Comparativo mensal',          desc: 'Barras comparando entradas vs. saídas por mês.' },
  { Icon: Calendar,    label: 'Heatmap de gastos diários',   desc: 'Calendário de calor que revela seus dias mais caros.' },
];

export default function AnalisePage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ padding: '32px 32px 24px', borderBottom: '1px solid var(--bd)' }}>
        <span className="eyebrow" style={{ display: 'block', marginBottom: 10 }}>Análise</span>
        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--tx)', letterSpacing: '-.03em', marginBottom: 6 }}>
          Seus gráficos
        </p>
        <p style={{ fontSize: '.88rem', color: 'var(--tx-3)', lineHeight: 1.6 }}>
          Os gráficos aparecerão aqui conforme você lança suas transações.
        </p>
      </div>

      {/* Empty state */}
      <div style={{ padding: '40px 32px' }}>

        {/* Hero empty illustration */}
        <div style={{
          background: 'linear-gradient(135deg, var(--a-pale) 0%, #F8F9FB 100%)',
          borderRadius: 20,
          padding: '48px 32px',
          textAlign: 'center',
          marginBottom: 32,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative bars */}
          <div style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            gap: 8, marginBottom: 28, height: 80,
          }}>
            {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
              <div key={i} style={{
                width: 22,
                height: `${h}%`,
                borderRadius: '6px 6px 3px 3px',
                background: i === 3
                  ? 'linear-gradient(180deg, var(--a) 0%, var(--a-lt) 100%)'
                  : 'var(--bg-2)',
                opacity: i === 3 ? 1 : 0.55,
                transition: 'height .6s',
              }} />
            ))}
          </div>

          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'var(--a-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <BarChart2 size={26} color="var(--a)" />
          </div>

          <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--tx)', marginBottom: 8 }}>
            Aguardando seus dados
          </p>
          <p style={{ fontSize: '.85rem', color: 'var(--tx-3)', maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
            Lance pelo menos algumas transações para que os gráficos comecem a aparecer aqui. Quanto mais você lançar, mais precisa será a análise.
          </p>
        </div>

        {/* What's coming */}
        <p style={{
          fontFamily: "'Geist Mono',monospace",
          fontSize: '.62rem',
          color: 'var(--tx-4)',
          textTransform: 'uppercase',
          letterSpacing: '.12em',
          marginBottom: 14,
        }}>
          Em breve
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {COMING.map(({ Icon, label, desc }) => (
            <div key={label} style={{
              background: 'var(--sf)',
              borderRadius: 14,
              padding: '16px 18px',
              boxShadow: '0 1px 4px rgba(14,18,25,.06), 0 4px 16px rgba(14,18,25,.04)',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'var(--a-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 10,
              }}>
                <Icon size={16} color="var(--a)" />
              </div>
              <p style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--tx)', marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: '.78rem', color: 'var(--tx-3)', lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
