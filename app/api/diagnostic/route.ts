import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { transactions, savings } = await req.json();

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ diagnostic: 'Sem lançamentos suficientes para análise. Registre algumas transações primeiro.' });
    }

    const totalIncome  = transactions.filter((t: { type: string; amount: number }) => t.type === 'income').reduce((s: number, t: { amount: number }) => s + t.amount, 0);
    const totalExpense = transactions.filter((t: { type: string; amount: number }) => t.type === 'expense').reduce((s: number, t: { amount: number }) => s + t.amount, 0);

    const byCategory = transactions
      .filter((t: { type: string }) => t.type === 'expense')
      .reduce((acc: Record<string, number>, t: { category: string; amount: number }) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const topCategories = Object.entries(byCategory)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([cat, val]) => `${cat}: R$${(val as number).toFixed(2)}`)
      .join(', ');

    const prompt = `Você é um consultor financeiro pessoal direto e empático. Analise os dados financeiros abaixo e escreva um diagnóstico curto (máximo 3 frases) em português brasileiro informal. Seja específico com os números, honesto sobre problemas, e sempre termine com uma sugestão prática acionável.

Dados do mês:
- Entradas: R$${totalIncome.toFixed(2)}
- Saídas: R$${totalExpense.toFixed(2)}
- Saldo: R$${(totalIncome - totalExpense).toFixed(2)}
- Maiores gastos: ${topCategories || 'sem categorias'}
- Reserva de emergência: R$${savings?.current_amount?.toFixed(2) || '0'} de meta R$${savings?.target_amount?.toFixed(2) || '0'}

Escreva apenas o diagnóstico, sem saudações ou formatação.`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 220,
      messages: [{ role: 'user', content: prompt }],
    });

    const diagnostic = (message.content[0] as { type: string; text: string }).text;
    return NextResponse.json({ diagnostic });
  } catch (err) {
    console.error('AI diagnostic error:', err);
    return NextResponse.json({ diagnostic: 'Não foi possível gerar o diagnóstico agora.' }, { status: 500 });
  }
}
