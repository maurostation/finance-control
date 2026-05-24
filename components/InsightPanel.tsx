'use client';

import { AlertTriangle, TrendingUp, Lightbulb, Sparkles, ChevronRight } from 'lucide-react';

export interface Insight {
  type: 'danger' | 'warning' | 'good' | 'ai';
  title: string;
  body: string;
  action?: string;
}

interface Props {
  insights: Insight[];
  aiDiagnostic?: string;
  loading?: boolean;
  onRequestDiagnostic?: () => void;
}

const icons = {
  danger:  { Icon: AlertTriangle,  color: 'var(--red)',   bg: 'var(--red-dim)' },
  warning: { Icon: AlertTriangle,  color: 'var(--a)',     bg: 'var(--a-dim)'   },
  good:    { Icon: TrendingUp,     color: 'var(--green)', bg: 'rgba(16,185,129,.08)' },
  ai:      { Icon: Sparkles,       color: 'var(--a)',     bg: 'var(--a-dim)'   },
};

export default function InsightPanel({ insights, aiDiagnostic, loading, onRequestDiagnostic }: Props) {
  return (
    <section>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span className="eyebrow">Painel de inteligência</span>
        <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:'.6rem', color:'var(--tx-4)', letterSpacing:'.06em' }}>
          {insights.length} pontos
        </span>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {insights.map((ins, i) => {
          const { Icon, color, bg } = icons[ins.type];
          return (
            <div key={i} className={`insight-card ${ins.type}`} style={{ paddingLeft:20 }}>
              <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <div style={{
                  width:30, height:30, borderRadius:8, flexShrink:0,
                  background:bg, display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <Icon size={14} color={color} />
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:'.84rem', fontWeight:600, color:'var(--tx)', lineHeight:1.3 }}>{ins.title}</p>
                  <p style={{ fontSize:'.8rem', color:'var(--tx-3)', marginTop:3, lineHeight:1.5 }}>{ins.body}</p>
                  {ins.action && (
                    <button style={{
                      marginTop:8, background:'none', border:'none', cursor:'pointer',
                      color, fontSize:'.78rem', fontWeight:500, padding:0,
                      display:'flex', alignItems:'center', gap:3,
                    }}>
                      {ins.action} <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* AI Diagnostic */}
        <div className="insight-card ai" style={{ paddingLeft:20 }}>
          <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
            <div style={{
              width:30, height:30, borderRadius:8, flexShrink:0,
              background:'var(--a-dim)', display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <Sparkles size={14} color="var(--a)" />
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:'.84rem', fontWeight:600, color:'var(--tx)' }}>Diagnóstico IA</p>
              {aiDiagnostic ? (
                <p style={{ fontSize:'.8rem', color:'var(--tx-2)', marginTop:4, lineHeight:1.6, fontStyle:'italic' }}>
                  &ldquo;{aiDiagnostic}&rdquo;
                </p>
              ) : (
                <div style={{ marginTop:6 }}>
                  <p style={{ fontSize:'.8rem', color:'var(--tx-3)', marginBottom:8 }}>
                    Claude analisa seu mês completo e gera um diagnóstico personalizado.
                  </p>
                  <button
                    className="btn-amber"
                    onClick={onRequestDiagnostic}
                    disabled={loading}
                    style={{ fontSize:'.78rem', padding:'.45rem 1rem' }}
                  >
                    {loading ? 'Analisando...' : <><Sparkles size={12} /> Analisar meu mês</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
