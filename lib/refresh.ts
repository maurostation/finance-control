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
