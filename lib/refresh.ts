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
