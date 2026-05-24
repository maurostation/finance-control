export type TransactionType = 'income' | 'expense';
export type Priority = 'high' | 'low';
export type PurchaseStatus = 'pending' | 'bought';
export type CardStatus = 'open' | 'closed';

export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  card_id?: string | null;
  is_installment: boolean;
  installment_number?: number | null;
  total_installments?: number | null;
  parent_id?: string | null;
  is_recurring: boolean;
  created_at: string;
}

export interface Card {
  id: string;
  user_id: string;
  name: string;
  closing_day: number;
  due_day: number;
  limit_amount: number;
  color: string;
  created_at: string;
}

export interface RecurringTemplate {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  card_id?: string | null;
  day_of_month: number;
  active: boolean;
  created_at: string;
}

export interface PlannedPurchase {
  id: string;
  user_id: string;
  name: string;
  estimated_value: number;
  priority: Priority;
  category: string;
  status: PurchaseStatus;
  notes?: string | null;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  created_at: string;
}

export const CATEGORIES = {
  income: ['Salário', 'Freelance', 'Investimentos', 'Outros'],
  expense: [
    'Alimentação', 'Transporte', 'Moradia', 'Saúde',
    'Lazer', 'Educação', 'Vestuário', 'Assinaturas',
    'Casa', 'Pets', 'Outros',
  ],
};
