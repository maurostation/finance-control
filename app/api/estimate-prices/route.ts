import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ prices: [], error: 'GROQ_API_KEY not configured' }, { status: 500 });
  }

  const client = new Groq({ apiKey });

  try {
    const { items } = await req.json() as { items: string[] };

    if (!items || items.length === 0) {
      return NextResponse.json({ prices: [] });
    }

    const itemList = items.map(i => `- ${i}`).join('\n');

    const completion = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
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

    const text = completion.choices[0]?.message?.content?.trim() ?? '';

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('estimate-prices: no JSON array in response:', text);
      return NextResponse.json({ prices: [] });
    }

    const prices = JSON.parse(jsonMatch[0]) as Array<{ name: string; price: number }>;
    return NextResponse.json({ prices });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('estimate-prices error:', msg);
    return NextResponse.json({ prices: [], error: msg }, { status: 500 });
  }
}
