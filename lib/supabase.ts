import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Transactions
export async function getTransactions(userId: string, month: string) {
  const [y, m] = month.split('-').map(Number);
  // Last day of the month — works for every month (28/29/30/31)
  const lastDay = new Date(y, m, 0).getDate();
  const lastDate = `${month}-${String(lastDay).padStart(2, '0')}`;
  return supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', `${month}-01`)
    .lte('date', lastDate)
    .order('date', { ascending: false });
}

export async function insertTransaction(data: Record<string, unknown>) {
  return supabase.from('transactions').insert(data).select().single();
}

export async function updateTransaction(id: string, data: Record<string, unknown>) {
  return supabase.from('transactions').update(data).eq('id', id).select().single();
}

/** Delete a single transaction, preserving any future installments by unlinking them first. */
export async function deleteTransaction(id: string) {
  // Break any parent→child cascade chain so future installments survive
  await supabase.from('transactions').update({ parent_id: null }).eq('parent_id', id);
  return supabase.from('transactions').delete().eq('id', id);
}

/** Delete a transaction AND all its future installments (parent + children). */
export async function deleteTransactionAll(id: string) {
  await supabase.from('transactions').delete().eq('parent_id', id);
  return supabase.from('transactions').delete().eq('id', id);
}

// Cards
export async function getCards(userId: string) {
  return supabase.from('cards').select('*').eq('user_id', userId).order('created_at');
}

export async function insertCard(data: Record<string, unknown>) {
  return supabase.from('cards').insert(data).select().single();
}

// Planned purchases
export async function getPlannedPurchases(userId: string) {
  return supabase
    .from('planned_purchases')
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true });
}

export async function insertPlannedPurchase(data: Record<string, unknown>) {
  return supabase.from('planned_purchases').insert(data).select().single();
}

export async function markPurchaseBought(id: string) {
  return supabase.from('planned_purchases').update({ status: 'bought' }).eq('id', id);
}

export async function updatePlannedPurchase(id: string, data: Record<string, unknown>) {
  return supabase.from('planned_purchases').update(data).eq('id', id).select().single();
}

export async function deletePlannedPurchase(id: string) {
  return supabase.from('planned_purchases').delete().eq('id', id);
}

// Savings
export async function getSavings(userId: string) {
  return supabase.from('savings_goals').select('*').eq('user_id', userId).single();
}

export async function updateSavings(id: string, amount: number) {
  return supabase.from('savings_goals').update({ current_amount: amount }).eq('id', id);
}

// Recurring templates
export async function getRecurringTemplates(userId: string) {
  return supabase
    .from('recurring_templates')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true);
}

export async function insertRecurringTemplate(data: Record<string, unknown>) {
  return supabase.from('recurring_templates').insert(data).select().single();
}

export async function deactivateRecurringTemplate(id: string) {
  return supabase.from('recurring_templates').update({ active: false }).eq('id', id);
}

// Transactions dated from next month onwards (for future planning view)
export async function getFutureTransactions(userId: string) {
  const now = new Date();
  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString().slice(0, 10);
  return supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', firstOfNextMonth)
    .order('date', { ascending: true })
    .limit(30);
}
