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

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'var(--bg)',
      borderTop: '1px solid var(--bd)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        alignItems: 'center',
        height: 60,
        maxWidth: 520,
        margin: '0 auto',
      }}>
        {links.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '8px 4px', textDecoration: 'none',
              color: active ? 'var(--a)' : 'var(--tx-4)',
              transition: 'color .15s',
            }}>
              <Icon size={19} strokeWidth={active ? 2 : 1.75} />
              <span style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '.5rem', letterSpacing: '.05em',
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
