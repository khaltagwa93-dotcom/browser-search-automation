import { NextRequest, NextResponse } from 'next/server';
import { chromium as playwrightChromium } from 'playwright-core';
import chromium from '@sparticuz/chromium';

export const maxDuration = 60; // Vercel pro allows up to 60s, hobby 10s
export const dynamic = 'force-dynamic';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = (body.query || '').trim();
    const engine = body.engine || 'duckduckgo'; // duckduckgo | google | bing
    const limit = Math.min(Number(body.limit) || 10, 20);

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Query too short' }, { status: 400 });
    }

    // Launch browser optimized for serverless
    const executablePath = await chromium.executablePath();
    
    const browser = await playwrightChromium.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'ar-SA',
    });

    const page = await context.newPage();
    
    let results: SearchResult[] = [];

    try {
      if (engine === 'google') {
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}&hl=ar&num=${limit}`, {
          waitUntil: 'domcontentloaded',
          timeout: 25000,
        });
        
        // Accept cookies if present
        try {
          const acceptBtn = page.locator('button:has-text("Accept all"), button:has-text("أوافق")').first();
          if (await acceptBtn.isVisible({ timeout: 2000 })) {
            await acceptBtn.click();
          }
        } catch {}

        await page.waitForSelector('div#search, div#rso', { timeout: 10000 });

        results = await page.evaluate((max) => {
          const items: SearchResult[] = [];
          const nodes = document.querySelectorAll('div.g, div[data-sokoban-container]');
          let pos = 1;
          nodes.forEach((node) => {
            if (items.length >= max) return;
            const titleEl = node.querySelector('h3');
            const linkEl = node.querySelector('a[href^="http"]');
            const snippetEl = node.querySelector('div[data-sncf], div.VwiC3b, span.st');
            if (titleEl && linkEl) {
              const href = (linkEl as HTMLAnchorElement).href;
              if (href && !href.includes('google.com')) {
                items.push({
                  title: titleEl.textContent?.trim() || '',
                  url: href,
                  snippet: snippetEl?.textContent?.trim() || '',
                  position: pos++,
                });
              }
            }
          });
          return items;
        }, limit);
      } else if (engine === 'bing') {
        await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${limit}`, {
          waitUntil: 'domcontentloaded',
          timeout: 25000,
        });
        await page.waitForSelector('ol#b_results', { timeout: 10000 });
        results = await page.evaluate((max) => {
          const items: SearchResult[] = [];
          const nodes = document.querySelectorAll('li.b_algo');
          let pos = 1;
          nodes.forEach((node) => {
            if (items.length >= max) return;
            const titleEl = node.querySelector('h2 a');
            const snippetEl = node.querySelector('p, div.b_caption p');
            if (titleEl) {
              items.push({
                title: titleEl.textContent?.trim() || '',
                url: (titleEl as HTMLAnchorElement).href,
                snippet: snippetEl?.textContent?.trim() || '',
                position: pos++,
              });
            }
          });
          return items;
        }, limit);
      } else {
        // DuckDuckGo (more friendly)
        await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
          waitUntil: 'domcontentloaded',
          timeout: 25000,
        });
        await page.waitForSelector('.result, .results_links', { timeout: 10000 });
        results = await page.evaluate((max) => {
          const items: SearchResult[] = [];
          const nodes = document.querySelectorAll('.result, .results_links_deep');
          let pos = 1;
          nodes.forEach((node) => {
            if (items.length >= max) return;
            const titleEl = node.querySelector('a.result__a, a.result__url');
            const snippetEl = node.querySelector('.result__snippet, .result__body');
            const link = titleEl as HTMLAnchorElement;
            if (link && link.href) {
              items.push({
                title: link.textContent?.trim() || '',
                url: link.href.startsWith('http') ? link.href : 'https://duckduckgo.com' + link.getAttribute('href'),
                snippet: snippetEl?.textContent?.trim() || '',
                position: pos++,
              });
            }
          });
          return items;
        }, limit);
      }
    } finally {
      await browser.close();
    }

    return NextResponse.json({
      success: true,
      query,
      engine,
      results,
      count: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { 
        error: 'Search failed', 
        message: error.message || 'Unknown error',
        hint: 'On free Vercel plan, timeout is 10s. Try DuckDuckGo or shorter queries.'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Browser Search Automation API',
    usage: 'POST with { "query": "your search", "engine": "duckduckgo|google|bing", "limit": 10 }',
    engines: ['duckduckgo', 'google', 'bing'],
  });
}
