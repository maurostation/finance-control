'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, FileText } from 'lucide-react';
import { CATEGORIES } from '@/lib/types';
import { parseNaturalAmount } from '@/lib/utils';

interface Props {
  cards: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

type Mode = 'natural' | 'form';
type TxType = 'expense' | 'income';

const INCOME_KEYWORDS = ['recebi','entrou','caiu','depositei','salário','salario'];

function guessType(text: string): TxType {
  return INCOME_KEYWORDS.some(k => text.toLowerCase().includes(k)) ? 'income' : 'expense';
}
function guessDescription(text: string): string {
  const clean = text
    .replace(/gastei|paguei|comprei|recebi|entrou|caiu|em|no|na|de|do|da|com|o|a|R\$|reais/gi, ' ')
    .replace(/\d+([.,]\d{1,2})?/g, '').replace(/\s+/g, ' ').trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase() : text;
}

export default function TransactionSheet({ cards, onClose, onSave }: Props) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [mode, setMode] = useState<Mode>('form');
  const [nlText, setNlText] = useState('');
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [cardId, setCardId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [installments, setInstallments] = useState(1);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function parseNL() {
    const amt = parseNaturalAmount(nlText);
    if (!amt) return;
    const detectedType = guessType(nlText);
    setPreview({
      type: detectedType,
      amount: amt,
      description: guessDescription(nlText) || nlText,
      category: detectedType === 'income' ? 'Salário' : 'Outros',
      date: new Date().toISOString().slice(0, 10),
      is_installment: false,
    });
  }

  async function handleConfirmNL() {
    if (!preview) return;
    setLoading(true);
    await onSave(preview);
    setSaved(true);
    setTimeout(onClose, 700);
  }

  async function handleFormSave() {
    if (!amount || !description || !category) return;
    setLoading(true);
    await onSave({
      type, amount: parseFloat(amount.replace(',', '.')),
      description, category, date,
      card_id: cardId || null,
      is_installment: installments > 1,
      total_installments: installments > 1 ? installments : null,
    });
    setSaved(true);
    setTimeout(onClose, 700);
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 500,
    background: 'rgba(14,18,25,.45)',
    backdropFilter: 'blur(4px)',
    animation: 'fadeIn .18s ease',
    display: 'flex',
    alignItems: isDesktop ? 'center' : 'flex-end',
    justifyContent: 'center',
    padding: isDesktop ? '24px' : '0',
  };

  const panelStyle: React.CSSProperties = isDesktop
    ? {
        background: 'var(--sf)',
        borderRadius: 16,
        padding: '28px 28px 32px',
        width: '100%',
        maxWidth: 480,
        boxShadow: '0 24px 80px rgba(14,18,25,.18), 0 8px 32px rgba(14,18,25,.12)',
        animation: 'modalIn .2s cubic-bezier(.4,0,.2,1)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }
    : {
        background: 'var(--sf)',
        borderRadius: '20px 20px 0 0',
        padding: '24px 20px 48px',
        width: '100%',
        animation: 'slideUp .22s cubic-bezier(.4,0,.2,1)',
        maxHeight: '92svh',
        overflowY: 'auto',
      };

  const ModeBtn = ({ m, label, Icon }: { m: Mode; label: string; Icon: React.ElementType }) => (
    <button onClick={() => setMode(m)} style={{
      padding: '6px 14px', borderRadius: 8, fontSize: '.78rem', fontWeight: 500,
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
      background: mode === m ? 'var(--a-dim)' : 'transparent',
      color: mode === m ? 'var(--a)' : 'var(--tx-4)',
      border: 'none',
      boxShadow: mode === m ? 'inset 0 0 0 1px var(--a-bd)' : 'none',
      transition: 'all .15s',
    }}>
      <Icon size={13} /> {label}
    </button>
  );

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panelStyle}>
        {/* Handle (mobile only) */}
        {!isDesktop && (
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--bg-2)', margin: '0 auto 20px' }} />
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <ModeBtn m="natural" label="IA" Icon={Sparkles} />
            <ModeBtn m="form" label="Form" Icon={FileText} />
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-4)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--tx)', letterSpacing: '-.02em', marginBottom: 16 }}>
          Novo lançamento
        </p>

        {/* Natural language */}
        {mode === 'natural' && (
          <div>
            <p style={{ fontSize: '.83rem', color: 'var(--tx-3)', marginBottom: 10 }}>
              Descreva em linguagem natural:
            </p>
            <textarea
              className="input"
              rows={3}
              placeholder={'"gastei 50 no mercado" · "recebi 3200 de salário" · "paguei 480 no Nubank"'}
              value={nlText}
              onChange={e => { setNlText(e.target.value); setPreview(null); }}
              style={{ resize: 'none', fontFamily: 'inherit' }}
              autoFocus={isDesktop}
            />
            {!preview && (
              <button className="btn-amber" onClick={parseNL} style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
                <Sparkles size={14} /> Interpretar
              </button>
            )}
            {preview && (
              <div style={{ marginTop: 14, padding: 16, borderRadius: 12, background: 'var(--a-pale)', boxShadow: 'inset 0 0 0 1px var(--a-bd)' }}>
                <p style={{ fontSize: '.72rem', color: 'var(--a)', fontFamily: "'Geist Mono',monospace", letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Preview</p>
                {[
                  ['Tipo', (preview.type as string) === 'income' ? '↓ Entrada' : '↑ Saída'],
                  ['Valor', `R$ ${Number(preview.amount).toFixed(2).replace('.', ',')}`],
                  ['Descrição', preview.description as string],
                  ['Categoria', preview.category as string],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.84rem', marginBottom: 5 }}>
                    <span style={{ color: 'var(--tx-3)' }}>{k}</span>
                    <span style={{ fontWeight: 500, color: 'var(--tx)' }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button className="btn-ghost" onClick={() => setPreview(null)} style={{ flex: 1, justifyContent: 'center' }}>Ajustar</button>
                  <button className="btn-amber" onClick={handleConfirmNL} disabled={loading} style={{ flex: 2, justifyContent: 'center' }}>
                    {saved ? '✓ Salvo!' : loading ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        {mode === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['expense', 'income'] as TxType[]).map(t => (
                <button key={t} onClick={() => setType(t)} style={{
                  padding: '10px', borderRadius: 10, fontSize: '.85rem', fontWeight: 500,
                  cursor: 'pointer', border: 'none',
                  boxShadow: type === t ? `inset 0 0 0 1.5px ${t === 'expense' ? 'rgba(239,68,68,.35)' : 'rgba(16,185,129,.35)'}` : 'inset 0 0 0 1px var(--bd-2)',
                  background: type === t ? (t === 'expense' ? 'var(--red-dim)' : 'rgba(16,185,129,.08)') : 'var(--sf)',
                  color: type === t ? (t === 'expense' ? 'var(--red)' : 'var(--green)') : 'var(--tx-3)',
                  transition: 'all .15s',
                }}>
                  {t === 'expense' ? '↑ Saída' : '↓ Entrada'}
                </button>
              ))}
            </div>
            <div>
              <label style={{ fontSize: '.78rem', color: 'var(--tx-3)', display: 'block', marginBottom: 5 }}>Valor (R$)</label>
              <input className="input" type="number" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} autoFocus={isDesktop} />
            </div>
            <div>
              <label style={{ fontSize: '.78rem', color: 'var(--tx-3)', display: 'block', marginBottom: 5 }}>Descrição</label>
              <input className="input" placeholder="Ex: Mercado, Salário..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '.78rem', color: 'var(--tx-3)', display: 'block', marginBottom: 5 }}>Categoria</label>
              <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Selecionar...</option>
                {CATEGORIES[type].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: '.78rem', color: 'var(--tx-3)', display: 'block', marginBottom: 5 }}>Data</label>
                <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              {type === 'expense' && (
                <div>
                  <label style={{ fontSize: '.78rem', color: 'var(--tx-3)', display: 'block', marginBottom: 5 }}>Parcelas</label>
                  <select className="input" value={installments} onChange={e => setInstallments(Number(e.target.value))}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                      <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x`}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {type === 'expense' && cards.length > 0 && (
              <div>
                <label style={{ fontSize: '.78rem', color: 'var(--tx-3)', display: 'block', marginBottom: 5 }}>Cartão (opcional)</label>
                <select className="input" value={cardId} onChange={e => setCardId(e.target.value)}>
                  <option value="">Débito / dinheiro</option>
                  {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <button className="btn-amber" onClick={handleFormSave} disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {saved ? '✓ Salvo!' : loading ? 'Salvando...' : 'Salvar lançamento'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
