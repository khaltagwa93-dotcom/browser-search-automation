import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 15;
export const dynamic = 'force-dynamic';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
}

async function searchDuckDuckGoInstant(query: string, limit: number): Promise<SearchResult[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'BrowserSearchAutomation/1.0',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`DuckDuckGo API ${res.status}`);

  const data = await res.json();
  const results: SearchResult[] = [];

  // Abstract
  if (data.AbstractText && data.AbstractURL) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL,
      snippet: data.AbstractText,
      position: 1,
    });
  }

  // RelatedTopics
  const topics = data.RelatedTopics || [];
  for (const t of topics) {
    if (results.length >= limit) break;
    if (t.Text && t.FirstURL) {
      results.push({
        title: t.Text.split(' - ')[0] || t.Text.slice(0, 80),
        url: t.FirstURL,
        snippet: t.Text,
        position: results.length + 1,
      });
    } else if (t.Topics) {
      // nested
      for (const sub of t.Topics) {
        if (results.length >= limit) break;
        if (sub.Text && sub.FirstURL) {
          results.push({
            title: sub.Text.split(' - ')[0] || sub.Text.slice(0, 80),
            url: sub.FirstURL,
            snippet: sub.Text,
            position: results.length + 1,
          });
        }
      }
    }
  }

  // Results array
  for (const r of (data.Results || [])) {
    if (results.length >= limit) break;
    if (r.Text && r.FirstURL) {
      results.push({
        title: r.Text,
        url: r.FirstURL,
        snippet: '',
        position: results.length + 1,
      });
    }
  }

  return results;
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'أرسل JSON صالح' },
        { status: 400 }
      );
    }

    const query = (body.query || '').trim();
    const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 15);

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query too short', message: 'كلمة البحث قصيرة جداً' },
        { status: 400 }
      );
    }

    const results = await searchDuckDuckGoInstant(query, limit);

    return NextResponse.json({
      success: true,
      query,
      engine: 'duckduckgo-instant',
      results,
      count: results.length,
      timestamp: new Date().toISOString(),
      note: results.length === 0 
        ? 'لم يتم العثور على نتائج فورية. جرّب كلمة إنجليزية أو استخدم النسخة المحلية الكاملة (Playwright).'
        : undefined,
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        message: error.message || 'فشل البحث',
        hint: 'الخطة المجانية على Vercel محدودة. للنسخة الكاملة (Playwright) شغّل محلياً.',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Browser Search Automation API - Lightweight Instant Answer mode',
    usage: 'POST { "query": "...", "limit": 10 }',
    note: 'Uses DuckDuckGo Instant Answer (free, no key). Full Playwright version available for local/Docker.',
  });
}
