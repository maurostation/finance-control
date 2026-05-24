'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, List, CreditCard, ShoppingBag, BarChart2 } from 'lucide-react';

const links = [
  { href: '/dashboard', label: 'Início',    Icon: LayoutDashboard },
  { href: '/extrato',   label: 'Extrato',   Icon: List },
  { href: '/cartoes',   label: 'Cartões',   Icon: CreditCard },
  { href: '/planejado', label: 'Planejado', Icon: ShoppingBag },
  { href: '/analise',   label: 'Análise',   Icon: BarChart2 },
];

export default function BottomNav({ onAddClick }: { onAddClick: () => void }) {
  const pathname = usePathname();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(248,249,251,.93)',
      borderTop: '1px solid var(--bd)',
      backdropFilter: 'blur(22px) saturate(160%)',
      WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {/* 5 links + FAB in centre: 2 | FAB | 3 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr auto 1fr 1fr 1fr',
        alignItems: 'center',
        height: 60,
        maxWidth: 520,
        margin: '0 auto',
        padding: '0 4px',
      }}>
        {links.slice(0, 2).map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '8px 2px', textDecoration: 'none',
              color: active ? 'var(--a)' : 'var(--tx-4)',
              transition: 'color .15s',
            }}>
              <Icon size={19} strokeWidth={active ? 2 : 1.75} />
              <span style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '.52rem', letterSpacing: '.06em',
                textTransform: 'uppercase',
                fontWeight: active ? 600 : 400,
              }}>{label}</span>
            </Link>
          );
        })}

        {/* FAB — Add */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 6px' }}>
          <button onClick={onAddClick} className="btn-amber" style={{
            width: 44, height: 44, borderRadius: '50%',
            padding: 0, fontSize: '1.4rem', lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            +
          </button>
        </div>

        {links.slice(2).map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '8px 2px', textDecoration: 'none',
              color: active ? 'var(--a)' : 'var(--tx-4)',
              transition: 'color .15s',
            }}>
              <Icon size={19} strokeWidth={active ? 2 : 1.75} />
              <span style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '.52rem', letterSpacing: '.06em',
                textTransform: 'uppercase',
                fontWeight: active ? 600 : 400,
              }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
