'use client';

const ITEMS = [
  'FINANÇAS PESSOAIS',
  'PAY YOURSELF FIRST',
  'RESERVA DE EMERGÊNCIA',
  'CARTÃO NÃO É RENDA',
  'CASHFLOW POSITIVO',
  'METAS CONCRETAS',
  'GASTOS FIXOS',
  'ORÇAMENTO MENSAL',
  'LIBERDADE FINANCEIRA',
  'CONSUMO CONSCIENTE',
  'PLANEJAMENTO INTELIGENTE',
  'CONTROLE TOTAL',
];

// Double the items for a seamless -50% loop
const track = [...ITEMS, ...ITEMS];

export default function FinanceTicker() {
  return (
    <div style={{
      background: 'var(--sf)',
      borderBottom: '1px solid var(--bd)',
      overflow: 'hidden',
      height: 'var(--ticker-h)',
      display: 'flex',
      alignItems: 'center',
      userSelect: 'none',
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        animation: 'tickerScroll 38s linear infinite',
      }}>
        {track.map((item, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '.58rem',
              letterSpacing: '.2em',
              fontWeight: 500,
              color: 'var(--tx-4)',
              textTransform: 'uppercase',
              padding: '0 16px',
            }}>
              {item}
            </span>
            <span style={{
              color: 'var(--a)',
              fontSize: '.5rem',
              opacity: .8,
            }}>
              •
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
