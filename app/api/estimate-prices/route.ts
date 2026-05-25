import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json() as { items: string[] };

    if (!items || items.length === 0) {
      return NextResponse.json({ prices: [] });
    }

    const itemList = items.map(i => `- ${i}`).join('\n');

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Você é um assistente de compras brasileiro. Estime o preço médio atual de cada item de supermercado abaixo em reais (BRL). Considere preços de redes comuns como Extra, Carrefour e Pão de Açúcar.

Responda SOMENTE com um JSON array válido, sem texto extra, sem markdown, no formato:
[{"name": "nome exato do item", "price": valor_numerico}]

Itens:
${itemList}`,
      }],
    });

    const text = (message.content[0] as { type: string; text: string }).text.trim();

    // Extract JSON array from response (handle any stray text)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array in response:', text);
      return NextResponse.json({ prices: [] });
    }

    const prices = JSON.parse(jsonMatch[0]) as Array<{ name: string; price: number }>;
    return NextResponse.json({ prices });
  } catch (err) {
    console.error('estimate-prices error:', err);
    return NextResponse.json({ prices: [] }, { status: 500 });
  }
}
