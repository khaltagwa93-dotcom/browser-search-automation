import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
}

async function searchDuckDuckGo(query: string, limit: number): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ar,en;q=0.9',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    throw new Error(`DuckDuckGo returned ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  $('.result, .results_links, .results_links_deep').each((i, el) => {
    if (results.length >= limit) return false;

    const titleEl = $(el).find('a.result__a, a.result__url').first();
    const snippetEl = $(el).find('.result__snippet, .result__body').first();
    
    let href = titleEl.attr('href') || '';
    // DuckDuckGo sometimes uses redirect links
    if (href.startsWith('/l/?') || href.includes('uddg=')) {
      try {
        const match = href.match(/uddg=([^&]+)/);
        if (match) href = decodeURIComponent(match[1]);
      } catch {}
    }
    if (!href.startsWith('http')) {
      href = 'https://duckduckgo.com' + href;
    }

    const title = titleEl.text().trim();
    if (title && href && !href.includes('duckduckgo.com/y.js')) {
      results.push({
        title,
        url: href,
        snippet: snippetEl.text().trim() || '',
        position: results.length + 1,
      });
    }
  });

  return results;
}

async function searchBing(query: string, limit: number): Promise<SearchResult[]> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${limit}`;
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html',
      'Accept-Language': 'ar,en;q=0.9',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new Error(`Bing returned ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  $('li.b_algo').each((i, el) => {
    if (results.length >= limit) return false;
    const titleEl = $(el).find('h2 a').first();
    const snippetEl = $(el).find('p, .b_caption p').first();
    const href = titleEl.attr('href') || '';
    const title = titleEl.text().trim();
    if (title && href) {
      results.push({
        title,
        url: href,
        snippet: snippetEl.text().trim() || '',
        position: results.length + 1,
      });
    }
  });

  return results;
}

async function searchGoogle(query: string, limit: number): Promise<SearchResult[]> {
  // Lightweight attempt – Google often blocks, but try
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=ar&num=${limit}&gbv=1`;
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html',
      'Accept-Language': 'ar,en;q=0.9',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new Error(`Google returned ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  // Classic Google HTML selectors (gbv=1 is simpler version)
  $('div.g, div.tF2Cxc, div.ezO2md').each((i, el) => {
    if (results.length >= limit) return false;
    const titleEl = $(el).find('h3, a > span').first();
    const linkEl = $(el).find('a[href^="http"]').first();
    const snippetEl = $(el).find('div.VwiC3b, span.st, div[data-sncf]').first();
    
    let href = linkEl.attr('href') || '';
    if (href.startsWith('/url?')) {
      try {
        const u = new URL('https://google.com' + href);
        href = u.searchParams.get('q') || u.searchParams.get('url') || href;
      } catch {}
    }

    const title = titleEl.text().trim();
    if (title && href && href.startsWith('http') && !href.includes('google.com')) {
      results.push({
        title,
        url: href,
        snippet: snippetEl.text().trim() || '',
        position: results.length + 1,
      });
    }
  });

  return results;
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body', message: 'أرسل JSON صالح' },
        { status: 400 }
      );
    }

    const query = (body.query || '').trim();
    const engine = (body.engine || 'duckduckgo').toLowerCase();
    const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 15);

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query too short', message: 'كلمة البحث قصيرة جداً' },
        { status: 400 }
      );
    }

    let results: SearchResult[] = [];
    let usedEngine = engine;

    try {
      if (engine === 'bing') {
        results = await searchBing(query, limit);
      } else if (engine === 'google') {
        results = await searchGoogle(query, limit);
        if (results.length === 0) {
          // fallback
          results = await searchDuckDuckGo(query, limit);
          usedEngine = 'duckduckgo (fallback)';
        }
      } else {
        results = await searchDuckDuckGo(query, limit);
      }
    } catch (searchErr: any) {
      // Final fallback to DuckDuckGo
      if (engine !== 'duckduckgo') {
        try {
          results = await searchDuckDuckGo(query, limit);
          usedEngine = 'duckduckgo (fallback after error)';
        } catch (fallbackErr: any) {
          return NextResponse.json(
            {
              error: 'Search failed',
              message: searchErr.message || 'فشل البحث',
              hint: 'جرّب DuckDuckGo أو كلمة بحث أقصر. الخطة المجانية محدودة الوقت.',
            },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          {
            error: 'Search failed',
            message: searchErr.message || 'فشل البحث',
            hint: 'جرّب مرة أخرى أو غيّر كلمة البحث.',
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      query,
      engine: usedEngine,
      results,
      count: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: 'Internal error',
        message: error.message || 'خطأ داخلي',
        hint: 'حاول مرة أخرى بعد قليل',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Browser Search Automation API (Lightweight)',
    usage: 'POST { "query": "...", "engine": "duckduckgo|google|bing", "limit": 10 }',
    engines: ['duckduckgo', 'google', 'bing'],
    note: 'Uses fetch + cheerio for reliability on free Vercel. No Playwright required.',
  });
}
