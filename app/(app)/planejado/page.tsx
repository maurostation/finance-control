'use client';

import { useState, useEffect, useRef } from 'react';
import {
  supabase, getPlannedPurchases, insertPlannedPurchase, markPurchaseBought,
  updatePlannedPurchase, deletePlannedPurchase,
} from '@/lib/supabase';
import { PlannedPurchase, GroceryItem, CATEGORIES } from '@/lib/types';
import { formatCurrency, maskCurrency, parseCurrency } from '@/lib/utils';
import {
  Plus, ShoppingBag, CheckCircle, X, Tag, AlertCircle,
  ChevronDown, ChevronRight, Trash2, ExternalLink,
  Sparkles, Heart, Pencil, ShoppingCart,
} from 'lucide-react';
import { PlanejadoSkeleton } from '@/components/Skeleton';

type TabType = 'mercado' | 'compras' | 'desejos';

function parseItems(notes: string | null | undefined): GroceryItem[] {
  try { return JSON.parse(notes || '[]'); } catch { return []; }
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function PriorityPill({ priority }: { priority: string }) {
  const cfg: Record<string, { label: string; color: string; bg: string }> = {
    high:   { label: 'Alta',  color: 'var(--red)', bg: 'var(--red-dim)' },
    medium: { label: 'Média', color: 'var(--a)',   bg: 'var(--a-dim)'   },
    low:    { label: 'Baixa', color: 'var(--tx-3)',bg: 'var(--bg-1)'    },
  };
  const c = cfg[priority] || cfg.low;
  return (
    <span style={{
      fontSize: '.6rem', fontWeight: 600, padding: '2px 7px', borderRadius: 99,
      background: c.bg, color: c.color,
      fontFamily: "'Geist Mono',monospace", letterSpacing: '.04em',
    }}>
      {c.label}
    </span>
  );
}

function IconBox({ children, color = 'var(--bg-1)', border = 'var(--bd)' }: {
  children: React.ReactNode; color?: string; border?: string;
}) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
      background: color, border: `1px solid ${border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function PlanejadoPage() {
  const [tab, setTab] = useState<TabType>('mercado');
  const [userId, setUserId] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<PlannedPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Mercado ──
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});
  const [estimating, setEstimating] = useState<string | null>(null);
  const [showDoneLists, setShowDoneLists] = useState(false);

  // ── Compras / Desejos ──
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fName, setFName] = useState('');
  const [fValue, setFValue] = useState('');
  const [fPriority, setFPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [fCategory, setFCategory] = useState('');
  const [fDate, setFDate] = useState('');
  const [fLink, setFLink] = useState('');
  const [fEssential, setFEssential] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prioFilter, setPrioFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [showBought, setShowBought] = useState(false);
  const [showBoughtWishes, setShowBoughtWishes] = useState(false);

  // ── Grocery item autocomplete ──────────────────────────────────────────────
  const [itemSuggestions, setItemSuggestions] = useState<Record<string, string[]>>({});
  const suggestTimer = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  async function fetchSuggestions(listId: string, query: string) {
    if (suggestTimer.current[listId]) clearTimeout(suggestTimer.current[listId]);
    if (query.trim().length < 2) {
      setItemSuggestions(prev => ({ ...prev, [listId]: [] }));
      return;
    }
    suggestTimer.current[listId] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest-products?q=${encodeURIComponent(query)}`);
        const { suggestions } = await res.json() as { suggestions: string[] };
        setItemSuggestions(prev => ({ ...prev, [listId]: suggestions }));
      } catch { /* ignore network errors */ }
    }, 280);
  }

  function clearSuggestions(listId: string) {
    setTimeout(() => setItemSuggestions(prev => ({ ...prev, [listId]: [] })), 150);
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const { data } = await getPlannedPurchases(user.id);
      setPurchases(data || []);
      setLoading(false);
    });
  }, []);

  // Reset form when changing tab
  useEffect(() => {
    setShowForm(false);
    setEditingId(null);
    setFName(''); setFValue(''); setFPriority('medium');
    setFCategory(''); setFDate(''); setFLink(''); setFEssential(true);
  }, [tab]);

  // ── Mercado actions ──────────────────────────────────────────────────────────

  async function createList() {
    if (!userId || !newListName.trim()) return;
    const { data } = await insertPlannedPurchase({
      user_id: userId, name: newListName.trim(),
      estimated_value: 0, priority: 'low',
      category: 'Alimentação', status: 'pending',
      plan_type: 'mercado', notes: '[]',
    });
    if (data) {
      setPurchases(prev => [data, ...prev]);
      setExpandedId(data.id);
    }
    setNewListName(''); setShowNewList(false);
  }

  async function addGroceryItem(listId: string) {
    const text = (newItemText[listId] || '').trim();
    if (!text) return;
    const list = purchases.find(p => p.id === listId);
    if (!list) return;
    const items = parseItems(list.notes);
    const newItem: GroceryItem = { id: crypto.randomUUID(), name: text, checked: false, price: null };
    const updated = [...items, newItem];
    await updatePlannedPurchase(listId, { notes: JSON.stringify(updated) });
    setPurchases(prev => prev.map(p => p.id === listId ? { ...p, notes: JSON.stringify(updated) } : p));
    setNewItemText(prev => ({ ...prev, [listId]: '' }));
  }

  async function toggleGroceryItem(listId: string, itemId: string) {
    const list = purchases.find(p => p.id === listId);
    if (!list) return;
    const items = parseItems(list.notes).map(it =>
      it.id === itemId ? { ...it, checked: !it.checked } : it
    );
    await updatePlannedPurchase(listId, { notes: JSON.stringify(items) });
    setPurchases(prev => prev.map(p => p.id === listId ? { ...p, notes: JSON.stringify(items) } : p));
  }

  async function removeGroceryItem(listId: string, itemId: string) {
    const list = purchases.find(p => p.id === listId);
    if (!list) return;
    const items = parseItems(list.notes).filter(it => it.id !== itemId);
    const total = items.reduce((s, it) => s + (it.price || 0), 0);
    await updatePlannedPurchase(listId, { notes: JSON.stringify(items), estimated_value: total });
    setPurchases(prev => prev.map(p => p.id === listId
      ? { ...p, notes: JSON.stringify(items), estimated_value: total } : p));
  }

  async function estimatePrices(listId: string) {
    const list = purchases.find(p => p.id === listId);
    if (!list) return;
    const items = parseItems(list.notes);
    const toEstimate = items.filter(it => !it.price);
    if (!toEstimate.length) return;
    setEstimating(listId);
    try {
      const res = await fetch('/api/estimate-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: toEstimate.map(it => it.name) }),
      });
      const { prices } = await res.json() as { prices: Array<{ name: string; price: number }> };
      const updatedItems = items.map(it => {
        if (it.price) return it;
        const match = prices?.find(p =>
          p.name.toLowerCase().includes(it.name.toLowerCase()) ||
          it.name.toLowerCase().includes(p.name.toLowerCase())
        );
        return match ? { ...it, price: Number(match.price.toFixed(2)) } : it;
      });
      const total = updatedItems.reduce((s, it) => s + (it.price || 0), 0);
      await updatePlannedPurchase(listId, { notes: JSON.stringify(updatedItems), estimated_value: Number(total.toFixed(2)) });
      setPurchases(prev => prev.map(p => p.id === listId
        ? { ...p, notes: JSON.stringify(updatedItems), estimated_value: Number(total.toFixed(2)) } : p));
    } catch (e) {
      console.error('estimate-prices error:', e);
    }
    setEstimating(null);
  }

  async function completeList(listId: string) {
    await markPurchaseBought(listId);
    setPurchases(prev => prev.map(p => p.id === listId ? { ...p, status: 'bought' as const } : p));
    if (expandedId === listId) setExpandedId(null);
  }

  async function deleteList(listId: string) {
    await deletePlannedPurchase(listId);
    setPurchases(prev => prev.filter(p => p.id !== listId));
  }

  // ── Compras / Desejos actions ────────────────────────────────────────────────

  function openEdit(p: PlannedPurchase) {
    setFName(p.name);
    setFValue(p.estimated_value
      ? p.estimated_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '');
    setFPriority((p.priority as 'high' | 'medium' | 'low') || 'medium');
    setFCategory(p.category || '');
    setFDate(p.intended_date || '');
    setFLink(p.link || '');
    try { setFEssential(JSON.parse(p.notes || '{}').essential !== false); } catch { setFEssential(true); }
    setEditingId(p.id);
    setShowForm(true);
  }

  async function savePurchase() {
    if (!userId || !fName.trim()) return;
    setSaving(true);
    const planType = tab === 'compras' ? 'compra' : tab === 'desejos' ? 'desejo' : tab;
    const payload: Record<string, unknown> = {
      name: fName.trim(),
      estimated_value: parseCurrency(fValue),
      priority: fPriority,
      category: fCategory || 'Outros',
      intended_date: fDate || null,
      link: fLink || null,
      plan_type: planType,
      notes: (tab === 'compras' || tab === 'desejos') ? JSON.stringify({ essential: fEssential }) : undefined,
    };
    if (editingId) {
      const { data } = await updatePlannedPurchase(editingId, payload);
      if (data) setPurchases(prev => prev.map(p => p.id === editingId ? { ...p, ...data } : p));
    } else {
      const { data } = await insertPlannedPurchase({ ...payload, user_id: userId, status: 'pending' });
      if (data) setPurchases(prev => [...prev, data]);
    }
    setShowForm(false); setEditingId(null);
    setFName(''); setFValue(''); setFPriority('medium');
    setFCategory(''); setFDate(''); setFLink(''); setFEssential(true);
    setSaving(false);
  }

  async function deletePurchase(id: string) {
    await deletePlannedPurchase(id);
    setPurchases(prev => prev.filter(p => p.id !== id));
  }

  async function markBought(id: string) {
    await markPurchaseBought(id);
    setPurchases(prev => prev.map(p => p.id === id ? { ...p, status: 'bought' as const } : p));
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const mercadoActive = purchases.filter(p => (p.plan_type ?? 'compra') === 'mercado' && p.status === 'pending');
  const mercadoDone   = purchases.filter(p => (p.plan_type ?? 'compra') === 'mercado' && p.status === 'bought');

  const isCompra  = (p: PlannedPurchase) => p.plan_type === 'compra' || (p.plan_type as string) === 'compras' || !p.plan_type;
  const isDesejo  = (p: PlannedPurchase) => p.plan_type === 'desejo' || (p.plan_type as string) === 'desejos';

  const comprasPending = purchases.filter(p => isCompra(p) && p.status === 'pending');
  const comprasBought  = purchases.filter(p => isCompra(p) && p.status === 'bought');
  const filteredCompras = comprasPending.filter(p => prioFilter === 'all' || p.priority === prioFilter);

  const desejosPending = purchases.filter(p => isDesejo(p) && p.status === 'pending');
  const desejosBought  = purchases.filter(p => isDesejo(p) && p.status === 'bought');

  if (loading) return <PlanejadoSkeleton />;

  // ─────────────────────────────────────────────────────────────────────────────
  // FORM (shared between Compras and Desejos)
  // ─────────────────────────────────────────────────────────────────────────────
  const PurchaseForm = (
    <div className="card" style={{ padding: 20, marginTop: 16, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--tx)' }}>
          {editingId ? 'Editar' : tab === 'desejos' ? 'Novo desejo' : 'Nova compra'}
        </p>
        <button
          onClick={() => { setShowForm(false); setEditingId(null); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', display: 'flex' }}
        >
          <X size={16} />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          className="input" placeholder="Nome"
          value={fName} onChange={e => setFName(e.target.value)}
        />
        <input
          className="input" type="text" inputMode="decimal" placeholder="Valor estimado (R$)"
          value={fValue} onChange={e => setFValue(maskCurrency(e.target.value))}
        />
        {/* Essencial / Não essencial — Compras only */}
        {tab === 'compras' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([true, false] as const).map(v => (
              <button key={String(v)} onClick={() => setFEssential(v)} style={{
                padding: '9px', borderRadius: 8, fontSize: '.82rem', fontWeight: 500,
                border: '1px solid', cursor: 'pointer',
                background: fEssential === v ? 'var(--a-dim)' : 'var(--sf)',
                color:      fEssential === v ? 'var(--a)'     : 'var(--tx-3)',
                borderColor: fEssential === v ? 'var(--a-bd)' : 'var(--bd-2)',
              }}>
                {v ? 'Essencial' : 'Não essencial'}
              </button>
            ))}
          </div>
        )}
        {/* Priority — Compras only */}
        {tab === 'compras' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {(['high', 'medium', 'low'] as const).map(p => {
              const cfg = {
                high:   { label: 'Alta',  active: { bg: 'var(--red-dim)', color: 'var(--red)', border: 'rgba(239,68,68,.25)' } },
                medium: { label: 'Média', active: { bg: 'var(--a-dim)',   color: 'var(--a)',   border: 'var(--a-bd)'         } },
                low:    { label: 'Baixa', active: { bg: 'var(--bg-1)',    color: 'var(--tx-3)',border: 'var(--bd)'            } },
              }[p];
              const isActive = fPriority === p;
              return (
                <button key={p} onClick={() => setFPriority(p)} style={{
                  padding: '8px', borderRadius: 8, fontSize: '.8rem', fontWeight: 500,
                  cursor: 'pointer', border: '1px solid',
                  background: isActive ? cfg.active.bg  : 'var(--sf)',
                  color:      isActive ? cfg.active.color : 'var(--tx-3)',
                  borderColor: isActive ? cfg.active.border : 'var(--bd-2)',
                }}>
                  {cfg.label}
                </button>
              );
            })}
          </div>
        )}
        <select className="input" value={fCategory} onChange={e => setFCategory(e.target.value)}>
          <option value="">Categoria...</option>
          {CATEGORIES.expense.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {/* Date — Compras only */}
        {tab === 'compras' && (
          <input
            className="input" type="date" placeholder="Data pretendida (opcional)"
            value={fDate} onChange={e => setFDate(e.target.value)}
          />
        )}
        <input
          className="input" placeholder="Link (opcional)"
          value={fLink} onChange={e => setFLink(e.target.value)}
        />
        <button
          className="btn-amber" onClick={savePurchase} disabled={saving || !fName.trim()}
          style={{ justifyContent: 'center' }}
        >
          {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar'}
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // PURCHASE ROW (shared between Compras and Desejos)
  // ─────────────────────────────────────────────────────────────────────────────
  function PurchaseRow({ p, showDate = true }: { p: PlannedPurchase; showDate?: boolean }) {
    return (
      <div style={{
        display: 'flex', gap: 10, alignItems: 'flex-start',
        padding: '14px 0',
        borderBottom: '1px solid var(--bd)',
        opacity: p.status === 'bought' ? .55 : 1,
      }}>
        <IconBox
          color={p.priority === 'high' ? 'var(--red-dim)' : p.priority === 'medium' ? 'var(--a-dim)' : 'var(--bg-1)'}
          border={p.priority === 'high' ? 'rgba(239,68,68,.2)' : p.priority === 'medium' ? 'var(--a-bd)' : 'var(--bd)'}
        >
          {p.priority === 'high'
            ? <AlertCircle size={14} color="var(--red)" />
            : <ShoppingBag size={14} color={p.priority === 'medium' ? 'var(--a)' : 'var(--tx-4)'} />}
        </IconBox>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <p style={{
              fontSize: '.88rem', fontWeight: 600, color: 'var(--tx)', lineHeight: 1.2,
              textDecoration: p.status === 'bought' ? 'line-through' : 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {p.name}
            </p>
            {p.estimated_value > 0 && (
              <span style={{ fontSize: '.92rem', fontWeight: 700, color: 'var(--tx)', flexShrink: 0 }}>
                <span className="money">{formatCurrency(p.estimated_value)}</span>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            {p.category && (
              <span className="badge badge-gray" style={{ fontSize: '.6rem' }}>
                <Tag size={9} /> {p.category}
              </span>
            )}
            {tab === 'compras' && <PriorityPill priority={p.priority} />}
            {showDate && p.intended_date && (
              <span style={{ fontSize: '.65rem', color: 'var(--tx-4)', fontFamily: "'Geist Mono',monospace" }}>
                {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(p.intended_date + 'T00:00:00'))}
              </span>
            )}
            {p.link && (
              <a href={p.link} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 2,
                fontSize: '.65rem', color: 'var(--a)', textDecoration: 'none',
                fontFamily: "'Geist Mono',monospace",
              }}>
                <ExternalLink size={9} /> link
              </a>
            )}
          </div>
        </div>
        {p.status === 'pending' && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
            <button onClick={() => openEdit(p)} title="Editar"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-4)', display: 'flex', padding: 8, borderRadius: 7, minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center', transition: 'background .12s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-1)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
            >
              <Pencil size={14} />
            </button>
            {tab === 'desejos' && (
              <button
                onClick={async () => {
                  await updatePlannedPurchase(p.id, { plan_type: 'compra' });
                  setPurchases(prev => prev.map(x => x.id === p.id ? { ...x, plan_type: 'compra' } : x));
                }}
                title="Mover para Compras"
                style={{
                  background: 'var(--a-dim)', border: '1px solid var(--a-bd)',
                  borderRadius: 7, padding: '6px 10px', cursor: 'pointer',
                  fontSize: '.72rem', fontWeight: 600, color: 'var(--a)',
                  display: 'flex', alignItems: 'center', gap: 4, minHeight: 34,
                }}
              >
                <ShoppingCart size={12} />
                Comprar
              </button>
            )}
            {tab === 'compras' && (
              <button
                onClick={() => markBought(p.id)}
                style={{
                  background: 'var(--a-dim)', border: '1px solid var(--a-bd)',
                  borderRadius: 7, padding: '6px 10px', cursor: 'pointer',
                  fontSize: '.72rem', fontWeight: 600, color: 'var(--a)', whiteSpace: 'nowrap',
                  minHeight: 34,
                }}
              >
                Comprei!
              </button>
            )}
            <button onClick={() => deletePurchase(p.id)} title="Excluir"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-4)', display: 'flex', padding: 8, borderRadius: 7, minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center', transition: 'background .12s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--red-dim)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
        {p.status === 'bought' && (
          <CheckCircle size={14} color="var(--green)" style={{ flexShrink: 0, marginTop: 2 }} />
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 40px' }}>

      {/* ── Sticky header + tabs ── */}
      <div className="page-sticky-head" style={{
        background: 'var(--sf)',
        position: 'sticky', top: 0, zIndex: 10,
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--bd)',
      }}>
        <span className="eyebrow" style={{ display: 'block', marginBottom: 14 }}>
          Central de Planejamento
        </span>
        <div style={{ display: 'flex', gap: 8, paddingBottom: 16 }}>
          {([
            { key: 'mercado', label: 'Mercado' },
            { key: 'compras', label: 'Compras' },
            { key: 'desejos', label: 'Desejos' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '6px 16px', borderRadius: 99,
                border: `1px solid ${tab === key ? 'var(--a)' : 'var(--bd-2)'}`,
                background: tab === key ? 'var(--a)' : 'var(--sf)',
                color: tab === key ? '#fff' : 'var(--tx-3)',
                cursor: 'pointer', fontSize: '.82rem',
                fontWeight: tab === key ? 600 : 400,
                transition: 'all .15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: MERCADO                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'mercado' && (
        <div className="page-section" style={{ paddingTop: 20, paddingBottom: 0 }}>

          {/* Mercado header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: '.78rem', color: 'var(--tx-3)' }}>
                {mercadoActive.length} lista{mercadoActive.length !== 1 ? 's' : ''} ativa{mercadoActive.length !== 1 ? 's' : ''}
                {mercadoActive.length > 0 && (
                  <span style={{ color: 'var(--tx-4)', fontFamily: "'Geist Mono',monospace" }}>
                    {' · '}<span className="money">{formatCurrency(mercadoActive.reduce((s, l) => s + l.estimated_value, 0))}</span> estimado
                  </span>
                )}
              </p>
            </div>
            <button className="btn-amber" onClick={() => setShowNewList(true)}
              style={{ fontSize: '.78rem', padding: '.45rem .9rem' }}>
              <Plus size={13} /> Nova lista
            </button>
          </div>

          {/* New list form */}
          {showNewList && (
            <div className="card" style={{ padding: 16, marginBottom: 12 }}>
              <p style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 10, color: 'var(--tx)' }}>Nova lista de mercado</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input" placeholder="Ex: Compras da semana"
                  value={newListName} onChange={e => setNewListName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createList()}
                  style={{ flex: 1 }}
                  autoFocus
                />
                <button className="btn-amber" onClick={createList} style={{ flexShrink: 0, padding: '.5rem 1rem' }}>
                  Criar
                </button>
                <button
                  onClick={() => { setShowNewList(false); setNewListName(''); }}
                  style={{ background: 'none', border: '1px solid var(--bd)', borderRadius: 8, cursor: 'pointer', color: 'var(--tx-3)', padding: '0 10px' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {mercadoActive.length === 0 && !showNewList && (
            <div style={{
              background: 'linear-gradient(135deg, var(--a-pale) 0%, #F8F9FB 100%)',
              borderRadius: 16, padding: '40px 20px', textAlign: 'center',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 20, alignItems: 'flex-end', height: 48 }}>
                {[35, 55, 45, 72, 50, 38].map((h, i) => (
                  <div key={i} style={{ width: 10, height: `${h}%`, borderRadius: '4px 4px 2px 2px', background: i === 3 ? 'var(--a)' : 'var(--bg-2)', opacity: i === 3 ? 1 : 0.5 }} />
                ))}
              </div>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--a-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <ShoppingCart size={22} color="var(--a)" />
              </div>
              <p style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>Crie sua lista de mercado</p>
              <p style={{ fontSize: '.82rem', color: 'var(--tx-3)', lineHeight: 1.6, maxWidth: 260, margin: '0 auto 16px' }}>
                Organize as compras, adicione itens e use IA para estimar o total — tudo em um lugar.
              </p>
              <button className="btn-amber" onClick={() => setShowNewList(true)} style={{ fontSize: '.82rem' }}>
                <Plus size={14} /> Nova lista
              </button>
            </div>
          )}

          {/* Grocery lists */}
          {mercadoActive.map(list => {
            const items = parseItems(list.notes);
            const checkedCount = items.filter(it => it.checked).length;
            const isExpanded = expandedId === list.id;
            const isEstimating = estimating === list.id;
            const hasUnpriced = items.some(it => !it.price);

            return (
              <div key={list.id} className="card" style={{ marginBottom: 10, overflow: 'hidden' }}>
                {/* List header */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '14px 16px', cursor: 'pointer',
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : list.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--tx)', marginBottom: 3 }}>
                      {list.name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '.68rem', color: 'var(--tx-4)', fontFamily: "'Geist Mono',monospace" }}>
                        {checkedCount}/{items.length} itens
                      </span>
                      {list.estimated_value > 0 && (
                        <span style={{ fontSize: '.68rem', color: 'var(--a)', fontFamily: "'Geist Mono',monospace", fontWeight: 600 }}>
                          <span className="money">{formatCurrency(list.estimated_value)}</span>
                        </span>
                      )}
                      {/* Progress bar */}
                      {items.length > 0 && (
                        <div style={{ flex: 1, height: 4, background: 'var(--bd)', borderRadius: 2, maxWidth: 80 }}>
                          <div style={{
                            height: '100%', borderRadius: 2,
                            background: 'var(--green)',
                            width: `${(checkedCount / items.length) * 100}%`,
                            transition: 'width .3s',
                          }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteList(list.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-4)', display: 'flex', padding: 4 }}
                    title="Excluir lista"
                  >
                    <Trash2 size={13} />
                  </button>
                  {isExpanded ? <ChevronDown size={16} color="var(--tx-3)" /> : <ChevronRight size={16} color="var(--tx-3)" />}
                </div>

                {/* Expanded items */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--bd)', padding: '8px 16px 16px' }}>
                    {/* Item list */}
                    {items.length === 0 && (
                      <p style={{ fontSize: '.78rem', color: 'var(--tx-4)', padding: '12px 0', fontFamily: "'Geist Mono',monospace" }}>
                        Adicione itens à lista abaixo.
                      </p>
                    )}
                    {items.map(item => (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 0',
                        borderBottom: '1px solid var(--bd)',
                        opacity: item.checked ? .5 : 1,
                      }}>
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleGroceryItem(list.id, item.id)}
                          style={{
                            width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                            border: `2px solid ${item.checked ? 'var(--green)' : 'var(--bd-2)'}`,
                            background: item.checked ? 'var(--green)' : 'transparent',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 0,
                          }}
                        >
                          {item.checked && <CheckCircle size={12} color="#fff" />}
                        </button>
                        <span style={{
                          flex: 1, fontSize: '.86rem', color: 'var(--tx)',
                          textDecoration: item.checked ? 'line-through' : 'none',
                        }}>
                          {item.name}
                        </span>
                        {item.price ? (
                          <span style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--tx-3)', fontFamily: "'Geist Mono',monospace" }}>
                            <span className="money">{formatCurrency(item.price)}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '.72rem', color: 'var(--tx-4)', fontFamily: "'Geist Mono',monospace" }}>
                            —
                          </span>
                        )}
                        <button
                          onClick={() => removeGroceryItem(list.id, item.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-4)', display: 'flex', padding: 2 }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {/* Add item row — with autocomplete */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <input
                          className="input"
                          placeholder="Adicionar item…"
                          value={newItemText[list.id] || ''}
                          onChange={e => {
                            const v = e.target.value;
                            setNewItemText(prev => ({ ...prev, [list.id]: v }));
                            fetchSuggestions(list.id, v);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { addGroceryItem(list.id); setItemSuggestions(prev => ({ ...prev, [list.id]: [] })); }
                            if (e.key === 'Escape') setItemSuggestions(prev => ({ ...prev, [list.id]: [] }));
                          }}
                          onBlur={() => clearSuggestions(list.id)}
                          style={{ width: '100%', fontSize: '.82rem', padding: '.45rem .75rem' }}
                        />
                        {/* Suggestions dropdown */}
                        {(itemSuggestions[list.id] || []).length > 0 && (
                          <div style={{
                            position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0,
                            background: 'var(--sf)', border: '1px solid var(--bd-2)',
                            borderRadius: 10, boxShadow: '0 4px 20px rgba(14,18,25,.12)',
                            zIndex: 200, overflow: 'hidden',
                          }}>
                            {(itemSuggestions[list.id] || []).map((s, i, arr) => (
                              <button
                                key={i}
                                onMouseDown={() => {
                                  setNewItemText(prev => ({ ...prev, [list.id]: s }));
                                  setItemSuggestions(prev => ({ ...prev, [list.id]: [] }));
                                }}
                                style={{
                                  display: 'block', width: '100%', textAlign: 'left',
                                  padding: '10px 14px', fontSize: '.83rem', color: 'var(--tx)',
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  borderBottom: i < arr.length - 1 ? '1px solid var(--bd)' : 'none',
                                  transition: 'background .1s',
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-1)'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        className="btn-amber"
                        onClick={() => { addGroceryItem(list.id); setItemSuggestions(prev => ({ ...prev, [list.id]: [] })); }}
                        style={{ padding: '.45rem .75rem', fontSize: '.78rem', flexShrink: 0 }}
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {/* Action row */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {/* AI estimate */}
                      {hasUnpriced && (
                        <button
                          onClick={() => estimatePrices(list.id)}
                          disabled={isEstimating}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 12px', borderRadius: 8,
                            background: isEstimating ? 'var(--bg-1)' : 'var(--a-dim)',
                            border: '1px solid var(--a-bd)',
                            color: isEstimating ? 'var(--tx-4)' : 'var(--a)',
                            cursor: isEstimating ? 'wait' : 'pointer',
                            fontSize: '.78rem', fontWeight: 600,
                          }}
                        >
                          <Sparkles size={12} />
                          {isEstimating ? 'Estimando…' : 'Estimar com IA'}
                        </button>
                      )}
                      {/* Complete list */}
                      <button
                        onClick={() => completeList(list.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '7px 12px', borderRadius: 8,
                          background: 'var(--bg-1)', border: '1px solid var(--bd)',
                          color: 'var(--tx-3)', cursor: 'pointer',
                          fontSize: '.78rem', fontWeight: 500,
                        }}
                      >
                        <CheckCircle size={12} color="var(--green)" />
                        Concluir lista
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Completed lists */}
          {mercadoDone.length > 0 && (
            <div style={{ marginTop: 24, borderTop: '1px solid var(--bd)', paddingTop: 14 }}>
              <button
                onClick={() => setShowDoneLists(!showDoneLists)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '.78rem', fontFamily: "'Geist Mono',monospace" }}
              >
                <CheckCircle size={13} color="var(--green)" />
                {showDoneLists ? 'Ocultar' : 'Ver'} listas concluídas ({mercadoDone.length})
              </button>
              {showDoneLists && (
                <div style={{ marginTop: 8, opacity: .65 }}>
                  {mercadoDone.map(list => (
                    <div key={list.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 0', borderBottom: '1px solid var(--bd)',
                    }}>
                      <div>
                        <p style={{ fontSize: '.86rem', fontWeight: 500, color: 'var(--tx)', textDecoration: 'line-through' }}>{list.name}</p>
                        <p style={{ fontSize: '.68rem', color: 'var(--tx-4)', fontFamily: "'Geist Mono',monospace" }}>
                          {parseItems(list.notes).length} itens · <span className="money">{formatCurrency(list.estimated_value)}</span>
                        </p>
                      </div>
                      <button onClick={() => deleteList(list.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-4)', display: 'flex' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: COMPRAS                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'compras' && (
        <div className="page-section" style={{ paddingTop: 20, paddingBottom: 0 }}>

          {/* Summary pills */}
          <div className="summary-pills" style={{ marginBottom: 14 }}>
            {[
              { label: 'Alta',  value: comprasPending.filter(p => p.priority === 'high').reduce((s, p) => s + p.estimated_value, 0),   count: comprasPending.filter(p => p.priority === 'high').length,   color: 'var(--red)' },
              { label: 'Média', value: comprasPending.filter(p => p.priority === 'medium').reduce((s, p) => s + p.estimated_value, 0), count: comprasPending.filter(p => p.priority === 'medium').length, color: 'var(--a)'   },
              { label: 'Baixa', value: comprasPending.filter(p => p.priority === 'low').reduce((s, p) => s + p.estimated_value, 0),    count: comprasPending.filter(p => p.priority === 'low').length,    color: 'var(--tx-3)'},
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg-1)', borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ fontSize: '.6rem', color: 'var(--tx-4)', fontFamily: "'Geist Mono',monospace", textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
                  {s.label}
                </p>
                <p style={{ fontSize: '.9rem', fontWeight: 700, color: s.color, letterSpacing: '-.02em' }}>
                  <span className="money">{formatCurrency(s.value)}</span>
                </p>
                <p style={{ fontSize: '.62rem', color: 'var(--tx-4)', fontFamily: "'Geist Mono',monospace" }}>
                  {s.count} item{s.count !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>

          {/* Filter + Add button row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {(['all', 'high', 'medium', 'low'] as const).map(f => (
                <button key={f} onClick={() => setPrioFilter(f)} style={{
                  padding: '5px 12px', borderRadius: 99, fontSize: '.73rem', fontWeight: 500,
                  border: '1px solid var(--bd-2)', cursor: 'pointer',
                  background: prioFilter === f ? 'var(--a)' : 'var(--sf)',
                  color: prioFilter === f ? '#fff' : 'var(--tx-3)',
                  borderColor: prioFilter === f ? 'var(--a)' : 'var(--bd-2)',
                }}>
                  {f === 'all' ? 'Todas' : f === 'high' ? 'Alta' : f === 'medium' ? 'Média' : 'Baixa'}
                </button>
              ))}
            </div>
            <button className="btn-amber" onClick={() => { setShowForm(true); setEditingId(null); }}
              style={{ fontSize: '.78rem', padding: '.45rem .9rem' }}>
              <Plus size={13} /> Adicionar
            </button>
          </div>

          {showForm && PurchaseForm}

          {filteredCompras.length === 0 && !showForm && (
            <div style={{
              background: 'linear-gradient(135deg, var(--a-pale) 0%, #F8F9FB 100%)',
              borderRadius: 16, padding: '40px 20px', textAlign: 'center', marginTop: 4,
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--a-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <ShoppingBag size={22} color="var(--a)" />
              </div>
              <p style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>
                {prioFilter === 'all' ? 'Nenhuma compra planejada' : `Nenhuma com prioridade ${prioFilter === 'high' ? 'alta' : prioFilter === 'medium' ? 'média' : 'baixa'}`}
              </p>
              {prioFilter === 'all' && (
                <p style={{ fontSize: '.82rem', color: 'var(--tx-3)', lineHeight: 1.6, maxWidth: 260, margin: '0 auto 16px' }}>
                  Adicione compras com prioridade, data e link para acompanhar tudo que precisa comprar.
                </p>
              )}
              {prioFilter === 'all' && (
                <button className="btn-amber" onClick={() => setShowForm(true)} style={{ fontSize: '.82rem' }}>
                  <Plus size={14} /> Adicionar compra
                </button>
              )}
            </div>
          )}

          {/* Grouped by priority */}
          {(['high', 'medium', 'low'] as const).map(prio => {
            const group = filteredCompras.filter(p => p.priority === prio);
            if (!group.length) return null;
            const cfg = { high: { label: 'Alta prioridade', color: 'var(--red)' }, medium: { label: 'Média prioridade', color: 'var(--a)' }, low: { label: 'Baixa prioridade', color: 'var(--tx-3)' } }[prio];
            return (
              <div key={prio} style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, paddingBottom: 4 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color }} />
                  <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: '.6rem', color: cfg.color, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                    {cfg.label}
                  </span>
                </div>
                {group.map(p => <PurchaseRow key={p.id} p={p} />)}
              </div>
            );
          })}

          {/* Bought section */}
          {comprasBought.length > 0 && (
            <div style={{ marginTop: 24, borderTop: '1px solid var(--bd)', paddingTop: 14 }}>
              <button
                onClick={() => setShowBought(!showBought)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '.78rem', fontFamily: "'Geist Mono',monospace" }}
              >
                <CheckCircle size={13} color="var(--green)" />
                {showBought ? 'Ocultar' : 'Ver'} comprados ({comprasBought.length})
              </button>
              {showBought && (
                <div style={{ marginTop: 8 }}>
                  {comprasBought.map(p => <PurchaseRow key={p.id} p={p} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: DESEJOS                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'desejos' && (
        <div className="page-section" style={{ paddingTop: 20, paddingBottom: 0 }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: '.78rem', color: 'var(--tx-3)' }}>
              {desejosPending.length} desejo{desejosPending.length !== 1 ? 's' : ''}
              {desejosPending.length > 0 && (
                <span style={{ color: 'var(--tx-4)', fontFamily: "'Geist Mono',monospace" }}>
                  {' · '}<span className="money">{formatCurrency(desejosPending.reduce((s, p) => s + p.estimated_value, 0))}</span> estimado
                </span>
              )}
            </p>
            <button className="btn-amber" onClick={() => { setShowForm(true); setEditingId(null); }}
              style={{ fontSize: '.78rem', padding: '.45rem .9rem' }}>
              <Plus size={13} /> Adicionar
            </button>
          </div>

          {showForm && PurchaseForm}

          {desejosPending.length === 0 && !showForm && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,.04) 0%, #F8F9FB 100%)',
              borderRadius: 16, padding: '40px 20px', textAlign: 'center', marginTop: 4,
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(239,68,68,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Heart size={22} color="var(--red)" />
              </div>
              <p style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>Sua lista de desejos</p>
              <p style={{ fontSize: '.82rem', color: 'var(--tx-3)', lineHeight: 1.6, maxWidth: 260, margin: '0 auto 16px' }}>
                Salve aqui tudo que quer comprar mas que ainda nao e urgente. Mova para Compras na hora certa.
              </p>
              <button className="btn-amber" onClick={() => setShowForm(true)} style={{ fontSize: '.82rem' }}>
                <Plus size={14} /> Adicionar desejo
              </button>
            </div>
          )}

          {desejosPending.map(p => <PurchaseRow key={p.id} p={p} showDate={false} />)}

          {/* Bought section */}
          {desejosBought.length > 0 && (
            <div style={{ marginTop: 24, borderTop: '1px solid var(--bd)', paddingTop: 14 }}>
              <button
                onClick={() => setShowBoughtWishes(!showBoughtWishes)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '.78rem', fontFamily: "'Geist Mono',monospace" }}
              >
                <CheckCircle size={13} color="var(--green)" />
                {showBoughtWishes ? 'Ocultar' : 'Ver'} realizados ({desejosBought.length})
              </button>
              {showBoughtWishes && (
                <div style={{ marginTop: 8 }}>
                  {desejosBought.map(p => <PurchaseRow key={p.id} p={p} showDate={false} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
