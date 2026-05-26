export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(dateStr + 'T00:00:00'));
}

export function formatDateFull(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'));
}

export function getWeekOfMonth(dateStr: string): number {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDate();
  return Math.ceil(day / 7);
}

export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function getNextMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 7);
}

/** Mask a user-typed string as BRL currency (centavos approach: "1234" → "12,34") */
export function maskCurrency(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  const n = parseInt(digits, 10) / 100;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Parse a masked BRL string ("1.234,56") back to a number */
export function parseCurrency(masked: string): number {
  if (!masked) return 0;
  return parseFloat(masked.replace(/\./g, '').replace(',', '.')) || 0;
}

export function getCurrentMonthLabel(): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date())
    .replace(/^\w/, c => c.toUpperCase());
}

export function daysUntil(day: number): number {
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth(), day);
  if (target < today) target.setMonth(target.getMonth() + 1);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getProgressClass(pct: number): string {
  if (pct >= 90) return 'danger';
  if (pct >= 70) return 'warning';
  return 'safe';
}

export function parseNaturalAmount(text: string): number | null {
  const match = text.match(/[\d]+(?:[.,]\d{1,2})?/);
  if (!match) return null;
  return parseFloat(match[0].replace(',', '.'));
}
