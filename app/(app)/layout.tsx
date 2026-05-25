'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import TransactionSheet from '@/components/TransactionSheet';
import SidebarInsights from '@/components/SidebarInsights';
import FinanceTicker from '@/components/FinanceTicker';
import { supabase, getCards, insertTransaction, updateTransaction } from '@/lib/supabase';
import { Card, Transaction } from '@/lib/types';
import { broadcastRefresh, onOpenEdit, broadcastValuesState, onRequestValuesToggle } from '@/lib/refresh';
import { LayoutDashboard, List, CreditCard, ShoppingBag, BarChart2, Plus, LogOut, Banknote, Eye, EyeOff } from 'lucide-react';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Início',    Icon: LayoutDashboard },
  { href: '/extrato',   label: 'Extrato',   Icon: List },
  { href: '/cartoes',   label: 'Cartões',   Icon: CreditCard },
  { href: '/planejado', label: 'Planejado', Icon: ShoppingBag },
  { href: '/analise',   label: 'Análise',   Icon: BarChart2 },
];

const PUSH_TIPS = [
  'Você registrou seus gastos hoje? 2 minutos agora fazem diferença no seu controle financeiro.',
  'Bom dia! Que tal verificar como estão seus gastos esta semana?',
  'Controle em dia, mente tranquila. Abra o app e registre seus lançamentos recentes.',
  'Pequenos gastos somam muito. Você sabe exatamente para onde foi seu dinheiro esta semana?',
  'Quem não controla o dinheiro, o dinheiro controla. Abra o app e mantenha o foco.',
  'Sua reserva está crescendo? Registre seus lançamentos e veja o progresso real.',
];

function Sidebar({ onAddClick, onSignOut, onToggleValues, valuesHidden, pathname, userId }: {
  onAddClick: () => void;
  onSignOut: () => void;
  onToggleValues: () => void;
  valuesHidden: boolean;
  pathname: string;
  userId: string | null;
}) {
  return (
    <aside style={{
      width: 264,
      flexShrink: 0,
      height: '100svh',
      position: 'sticky',
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '28px 16px',
      background: 'var(--sf)',
      boxShadow: '1px 0 0 var(--bd)',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, paddingLeft: 4 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, background: 'var(--a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(217,119,6,.28)', flexShrink: 0,
        }}>
          <Banknote size={17} color="#fff" strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '.82rem', letterSpacing: '-.03em', color: 'var(--tx)', lineHeight: 1.15 }}>
            Controle
          </div>
          <div style={{ fontWeight: 700, fontSize: '.82rem', letterSpacing: '-.03em', color: 'var(--a)', lineHeight: 1.15 }}>
            Financeiro
          </div>
        </div>
      </div>

      {/* Add button */}
      <button onClick={onAddClick} className="btn-amber" style={{
        width: '100%', justifyContent: 'center', marginBottom: 24,
      }}>
        <Plus size={14} /> Lançar
      </button>

      {/* Nav links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {NAV_LINKS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 9, textDecoration: 'none',
              background: active ? 'var(--a-dim)' : 'transparent',
              color: active ? 'var(--a)' : 'var(--tx-3)',
              fontWeight: active ? 600 : 400,
              fontSize: '.875rem',
              transition: 'background .15s, color .15s',
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-1)'; }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Icon size={17} strokeWidth={active ? 2 : 1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Insights panel */}
      <SidebarInsights userId={userId} />

      {/* Eye toggle */}
      <button onClick={onToggleValues} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px', borderRadius: 9,
        background: valuesHidden ? 'var(--a-dim)' : 'none',
        border: 'none', cursor: 'pointer',
        color: valuesHidden ? 'var(--a)' : 'var(--tx-4)', fontSize: '.85rem',
        transition: 'all .15s', width: '100%', marginBottom: 2,
      }}
      onMouseEnter={e => { if (!valuesHidden) (e.currentTarget as HTMLElement).style.color = 'var(--tx)'; }}
      onMouseLeave={e => { if (!valuesHidden) (e.currentTarget as HTMLElement).style.color = 'var(--tx-4)'; }}
      >
        {valuesHidden ? <EyeOff size={15} /> : <Eye size={15} />}
        {valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}
      </button>

      {/* Sign out */}
      <button onClick={onSignOut} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px', borderRadius: 9,
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--tx-4)', fontSize: '.85rem',
        transition: 'color .15s', width: '100%',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--tx)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--tx-4)'}
      >
        <LogOut size={15} /> Sair
      </button>
    </aside>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [showSheet, setShowSheet] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [valuesHidden, setValuesHidden] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);
      getCards(user.id).then(({ data }) => setCards(data || []));
      setAuthReady(true);
    });
    // Restore eye state
    try { if (localStorage.getItem('fc-values-hidden') === 'true') setValuesHidden(true); } catch {}
  }, [router]);

  const toggleValues = useCallback(() => {
    setValuesHidden(v => {
      const next = !v;
      try { localStorage.setItem('fc-values-hidden', next.toString()); } catch {}
      broadcastValuesState(next);
      return next;
    });
  }, []);

  // Listen for toggle requests from components outside the sidebar (e.g. hero button)
  useEffect(() => {
    return onRequestValuesToggle(toggleValues);
  }, [toggleValues]);

  // ── Listen for edit-transaction events dispatched by extrato ──
  useEffect(() => {
    return onOpenEdit(tx => {
      setEditingTx(tx);
      setShowSheet(true);
    });
  }, []);

  // ── Push notification scheduler (fires on app open if 2+ days have passed) ──
  useEffect(() => {
    if (!userId || typeof window === 'undefined' || !('Notification' in window)) return;

    async function setupNotifications() {
      // Register service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }

      // Request permission on first load (non-blocking)
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      if (Notification.permission !== 'granted') return;

      // Check if 2+ days have passed since last notification
      const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
      const lastKey = `fc-last-notif-${userId}`;
      const last = parseInt(localStorage.getItem(lastKey) || '0', 10);
      if (Date.now() - last < TWO_DAYS) return;

      // Pick a random tip and show after a short delay (feels natural)
      const tip = PUSH_TIPS[Math.floor(Math.random() * PUSH_TIPS.length)];
      setTimeout(async () => {
        try {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            reg.active?.postMessage({ type: 'SHOW_REMINDER', body: tip });
          } else {
            new Notification('Controle Financeiro', { body: tip, icon: '/icon-192.png' });
          }
          localStorage.setItem(lastKey, Date.now().toString());
        } catch { /* silently ignore if SW not available */ }
      }, 4000);
    }

    setupNotifications();
  }, [userId]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }, [router]);

  const handleSave = useCallback(async (data: Record<string, unknown>) => {
    if (!userId) return;

    // ── Edit mode: update existing transaction ──
    if (data.id) {
      const { id, ...fields } = data;
      await updateTransaction(id as string, fields);
      broadcastRefresh();
      return;
    }

    // ── Insert mode ──
    const base: Record<string, unknown> = { ...data, user_id: userId };

    if ((base['is_installment'] as boolean) && ((base['total_installments'] as number) > 1)) {
      const total = base['total_installments'] as number;
      const perInstallment = (base['amount'] as number) / total;
      const baseDate = new Date((base['date'] as string) + 'T00:00:00');
      const parentResult = await insertTransaction({ ...base, amount: perInstallment, installment_number: 1, is_installment: true });
      const parentId = parentResult.data?.id;
      for (let i = 2; i <= total; i++) {
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() + (i - 1));
        await insertTransaction({ ...base, amount: perInstallment, date: d.toISOString().slice(0, 10), installment_number: i, is_installment: true, parent_id: parentId || null });
      }
    } else {
      await insertTransaction(base);
    }
    broadcastRefresh();
  }, [userId]);

  // Hold render until Supabase confirms the session — prevents flash of authenticated UI
  if (!authReady) {
    return <div style={{ minHeight: '100svh', background: 'var(--bg)' }} />;
  }

  return (
    <>
      {/* Mobile eye toggle */}
      <button className="mobile-eye-btn" onClick={toggleValues}>
        {valuesHidden ? <EyeOff size={14} /> : <Eye size={14} />}
        {valuesHidden ? 'Mostrar' : 'Ocultar'}
      </button>

      {/* Desktop layout */}
      <div style={{ display: 'flex', minHeight: '100svh' }} className={`desktop-layout${valuesHidden ? ' values-hidden' : ''}`}>
        <div className="sidebar-wrapper">
          <Sidebar onAddClick={() => setShowSheet(true)} onSignOut={handleSignOut} onToggleValues={toggleValues} valuesHidden={valuesHidden} pathname={pathname} userId={userId} />
        </div>
        <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Full-width sticky ticker at top of every page */}
          <div style={{ position: 'sticky', top: 0, zIndex: 30 }}>
            <FinanceTicker />
          </div>
          <div style={{ flex: 1 }}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="mobile-nav">
        <BottomNav onAddClick={() => setShowSheet(true)} />
      </div>

      {showSheet && (
        <TransactionSheet
          cards={cards}
          onClose={() => { setShowSheet(false); setEditingTx(null); }}
          onSave={handleSave}
          editTx={editingTx}
        />
      )}
    </>
  );
}
