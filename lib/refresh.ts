import { Transaction } from './types';

// Broadcast a refresh signal to all pages after a save
export function broadcastRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finance-refresh'));
  }
}

// Hook: re-run callback when a save happens anywhere in the app
export function onRefresh(callback: () => void) {
  window.addEventListener('finance-refresh', callback);
  return () => window.removeEventListener('finance-refresh', callback);
}

// Open TransactionSheet in edit mode for an existing transaction
export function openForEdit(tx: Transaction) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finance-open-edit', { detail: tx }));
  }
}

// Layout listens to this to open the edit sheet
export function onOpenEdit(callback: (tx: Transaction) => void) {
  const handler = (e: Event) => callback((e as CustomEvent<Transaction>).detail);
  window.addEventListener('finance-open-edit', handler);
  return () => window.removeEventListener('finance-open-edit', handler);
}

// ── Values hidden sync ──────────────────────────────────────────────────────
// Any component can request a toggle; layout is the single source of truth.
export function requestValuesToggle() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('fc-request-values-toggle'));
  }
}
export function onRequestValuesToggle(cb: () => void) {
  window.addEventListener('fc-request-values-toggle', cb);
  return () => window.removeEventListener('fc-request-values-toggle', cb);
}
// Layout broadcasts the current state after every toggle.
export function broadcastValuesState(hidden: boolean) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fc-values-state', { detail: hidden }));
  }
}
export function onValuesState(cb: (hidden: boolean) => void) {
  const h = (e: Event) => cb((e as CustomEvent<boolean>).detail);
  window.addEventListener('fc-values-state', h);
  return () => window.removeEventListener('fc-values-state', h);
}
