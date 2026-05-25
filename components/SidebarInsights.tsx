'use client';

import { useState, useEffect } from 'react';
import { supabase, getTransactions, getSavings } from '@/lib/supabase';
import { Transaction, SavingsGoal } from '@/lib/types';
import { formatCurrency, getCurrentMonth } from '@/lib/utils';
import { AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';
import { onRefresh } from '@/lib/refresh';

interface Insight {
  type: 'danger' | 'warning' | 'good';
  title: string;
  body: string;
  amount?: number;
}

const STYLE: Record<string, { color: string; bg: string }> = {
  danger:  { color: 'var(--red)',   bg: 'var(--red-dim)' },
  warning: { color: 'var(--a)',     bg: 'var(--a-dim)'   },
  good:    { color: 'var(--green)', bg: 'rgba(16,185,129,.08)' },
};

export default function SidebarInsights({ userId }: { userId: string | null }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savings, setSavings]           = useState<SavingsGoal | null>(null);
  const [aiDiagnostic, setAiDiagnostic] = useState('');
  const [aiLoading, setAiLoading]       = useState(false);

  async function loadData(uid: string) {
    const [txRes, savRes] = await Promise.all([
      getTransactions(uid, getCurrentMonth()),
      getSavings(uid),
    ]);
    setTransactions(txRes.data || []);
    setSavings(savRes.data || null);
  }

  useEffect(() => {
    if (!userId) return;
    loadData(userId);
    return onRefresh(() => loadData(userId));
  }, [userId]);

  // ── Compute insights ───────────────────────────────────────────
  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;
  const budgetPct    = totalIncome > 0 ? Math.min((totalExpense / totalIncome) * 100, 100) : 0;

  const now = new Date();
  const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - now.getDay());
  const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const thisWeekExp = transactions.filter(t => t.type === 'expense' && new Date(t.date + 'T00:00:00') >= thisWeekStart).reduce((s, t) => s + t.amount, 0);
  const lastWeekExp = transactions.filter(t => { const d = new Date(t.date + 'T00:00:00'); return t.type === 'expense' && d >= lastWeekStart && d < thisWeekStart; }).reduce((s, t) => s + t.amount, 0);
  const weekDelta = lastWeekExp > 0 ? ((thisWeekExp - lastWeekExp) / lastWeekExp) * 100 : 0;

  const insights: Insight[] = [];
  if (budgetPct >= 90) insights.push({ type: 'danger', title: 'Orçamento crítico', body: `${budgetPct.toFixed(0)}% da renda gasto.` });
  if (weekDelta > 25)  insights.push({ type: 'warning', title: 'Semana mais cara', body: `↑${weekDelta.toFixed(0)}% vs anterior` });
  if (savings && savings.current_amount < savings.target_amount * 0.1) insights.push({ type: 'warning', title: 'Reserva muito baixa', body: `${((savings.current_amount / savings.target_amount) * 100).toFixed(0)}% da meta.` });
  if (balance > 0 && budgetPct < 90) insights.push({ type: 'good', title: 'Sobrou', body: 'Mova parte para a reserva.', amount: balance });

  async function handleAI() {
    setAiLoading(true);
    try {
      const res = await fetch('/api/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, savings }),
      });
      const { diagnostic } = await res.json();
      setAiDiagnostic(diagnostic);
    } catch {
      setAiDiagnostic('Não foi possível gerar diagnóstico agora.');
    }
    setAiLoading(false);
  }

  return (
    <div style={{
      padding: '14px 0 0',
      borderTop: '1px solid var(--bd)',
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <Sparkles size={11} color="var(--a)" />
        <span style={{
          fontFamily: "'Geist Mono',monospace",
          fontSize: '.58rem',
          color: 'var(--tx-3)',
          textTransform: 'uppercase',
          letterSpacing: '.12em',
          fontWeight: 500,
        }}>
          Inteligência
        </span>
        {insights.length > 0 && (
          <span style={{
            marginLeft: 'auto',
            background: insights.some(i => i.type === 'danger') ? 'var(--red-dim)' : 'var(--a-dim)',
            color: insights.some(i => i.type === 'danger') ? 'var(--red)' : 'var(--a)',
            borderRadius: 99,
            padding: '1px 7px',
            fontSize: '.58rem',
            fontFamily: "'Geist Mono',monospace",
            fontWeight: 600,
          }}>
            {insights.length}
          </span>
        )}
      </div>

      {/* Insight pills */}
      {insights.map((ins, i) => {
        const s = STYLE[ins.type];
        return (
          <div key={i} style={{
            background: s.bg,
            borderRadius: 8,
            padding: '8px 10px',
          }}>
            <p style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--tx)', lineHeight: 1.2, marginBottom: 2 }}>
              {ins.title}{ins.amount !== undefined ? <> <span className="money">{formatCurrency(ins.amount)}</span></> : null}
            </p>
            <p style={{ fontSize: '.7rem', color: 'var(--tx-3)', lineHeight: 1.4 }}>
              {ins.body}
            </p>
          </div>
        );
      })}

      {/* AI section */}
      {aiDiagnostic ? (
        <div style={{ background: 'var(--a-dim)', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 3 }}>
            <Sparkles size={10} color="var(--a)" />
            <span style={{ fontSize: '.68rem', fontWeight: 600, color: 'var(--a)' }}>Diagnóstico IA</span>
          </div>
          <p style={{ fontSize: '.7rem', color: 'var(--tx-2)', lineHeight: 1.5, fontStyle: 'italic' }}>
            &ldquo;{aiDiagnostic}&rdquo;
          </p>
        </div>
      ) : (
        <button
          className="btn-amber"
          onClick={handleAI}
          disabled={aiLoading}
          style={{ width: '100%', justifyContent: 'center', fontSize: '.75rem', padding: '.45rem .8rem', marginTop: 2 }}
        >
          {aiLoading
            ? 'Analisando...'
            : <><Sparkles size={11} /> Analisar meu mês</>}
        </button>
      )}
    </div>
  );
}
