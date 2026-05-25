import { NextRequest, NextResponse } from 'next/server';

interface MLBAutosuggest {
  suggested_queries?: Array<{ q: string }>;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.trim().length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const url = `https://api.mercadolibre.com/sites/MLB/autosuggest?q=${encodeURIComponent(q)}&limit=8`;
    const res  = await fetch(url, { next: { revalidate: 60 } });

    if (!res.ok) return NextResponse.json({ suggestions: [] });

    const data: MLBAutosuggest = await res.json();
    const suggestions = (data.suggested_queries ?? [])
      .map(s => s.q)
      .filter(s => s.toLowerCase().includes(q.toLowerCase().split(' ')[0]))
      .slice(0, 7);

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
