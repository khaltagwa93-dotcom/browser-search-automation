from playwright.async_api import async_playwright
from typing import List, Dict

async def run_search(query: str, engine: str = "duckduckgo", limit: int = 10) -> List[Dict]:
    results = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
            ]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="ar-SA",
            viewport={"width": 1280, "height": 800}
        )
        page = await context.new_page()

        try:
            engine = engine.lower().strip()
            if engine == "google":
                results = await _search_google(page, query, limit)
            elif engine == "bing":
                results = await _search_bing(page, query, limit)
            elif engine == "amazon":
                results = await _search_amazon(page, query, limit)
            elif engine == "youtube":
                results = await _search_youtube(page, query, limit)
            else:
                results = await _search_duckduckgo(page, query, limit)
        finally:
            await browser.close()

    return results


async def _search_duckduckgo(page, query: str, limit: int) -> List[Dict]:
    url = f"https://html.duckduckgo.com/html/?q={query}"
    await page.goto(url, wait_until="domcontentloaded", timeout=35000)
    try:
        await page.wait_for_selector(".result, .results_links", timeout=12000)
    except:
        pass

    results = await page.evaluate(f"""
        () => {{
            const items = [];
            const nodes = document.querySelectorAll('.result, .results_links, .results_links_deep');
            let pos = 1;
            for (const node of nodes) {{
                if (items.length >= {limit}) break;
                const titleEl = node.querySelector('a.result__a, a.result__url');
                const snippetEl = node.querySelector('.result__snippet, .result__body');
                if (titleEl) {{
                    let href = titleEl.href || titleEl.getAttribute('href') || '';
                    if (href.includes('uddg=')) {{
                        try {{
                            const match = href.match(/uddg=([^&]+)/);
                            if (match) href = decodeURIComponent(match[1]);
                        }} catch(e) {{}}
                    }}
                    const title = titleEl.innerText.trim();
                    if (title && href && !href.includes('duckduckgo.com/y.js')) {{
                        items.push({{
                            title: title,
                            url: href.startsWith('http') ? href : 'https://duckduckgo.com' + href,
                            snippet: snippetEl ? snippetEl.innerText.trim() : '',
                            position: pos++
                        }});
                    }}
                }}
            }}
            return items;
        }}
    """)
    return results


async def _search_google(page, query: str, limit: int) -> List[Dict]:
    url = f"https://www.google.com/search?q={query}&hl=ar&num={limit}"
    await page.goto(url, wait_until="domcontentloaded", timeout=35000)

    try:
        btn = page.locator('button:has-text("Accept all"), button:has-text("أوافق"), button:has-text("I agree")').first
        if await btn.is_visible(timeout=2500):
            await btn.click()
            await page.wait_for_timeout(800)
    except:
        pass

    try:
        await page.wait_for_selector("div#search, div#rso, div.g", timeout=12000)
    except:
        pass

    results = await page.evaluate(f"""
        () => {{
            const items = [];
            const nodes = document.querySelectorAll('div.g, div[data-sokoban-container], div.tF2Cxc');
            let pos = 1;
            for (const node of nodes) {{
                if (items.length >= {limit}) break;
                const titleEl = node.querySelector('h3');
                const linkEl = node.querySelector('a[href^="http"]');
                const snippetEl = node.querySelector('div[data-sncf], div.VwiC3b, span.st, div.IsZvec');
                if (titleEl && linkEl) {{
                    const href = linkEl.href;
                    if (href && !href.includes('google.com/search') && !href.includes('webcache')) {{
                        items.push({{
                            title: titleEl.innerText.trim(),
                            url: href,
                            snippet: snippetEl ? snippetEl.innerText.trim() : '',
                            position: pos++
                        }});
                    }}
                }}
            }}
            return items;
        }}
    """)
    return results


async def _search_bing(page, query: str, limit: int) -> List[Dict]:
    url = f"https://www.bing.com/search?q={query}&count={limit}"
    await page.goto(url, wait_until="domcontentloaded", timeout=35000)

    try:
        await page.wait_for_selector("ol#b_results, li.b_algo", timeout=12000)
    except:
        pass

    results = await page.evaluate(f"""
        () => {{
            const items = [];
            const nodes = document.querySelectorAll('li.b_algo');
            let pos = 1;
            for (const node of nodes) {{
                if (items.length >= {limit}) break;
                const titleEl = node.querySelector('h2 a');
                const snippetEl = node.querySelector('p, div.b_caption p, .b_lineclamp2, .b_lineclamp3, .b_lineclamp4');
                if (titleEl) {{
                    items.push({{
                        title: titleEl.innerText.trim(),
                        url: titleEl.href,
                        snippet: snippetEl ? snippetEl.innerText.trim() : '',
                        position: pos++
                    }});
                }}
            }}
            return items;
        }}
    """)
    return results


async def _search_amazon(page, query: str, limit: int) -> List[Dict]:
    url = f"https://www.amazon.com/s?k={query.replace(' ', '+')}"
    await page.goto(url, wait_until="domcontentloaded", timeout=40000)

    try:
        await page.wait_for_selector("[data-component-type='s-search-result'], .s-result-item", timeout=15000)
    except:
        pass

    results = await page.evaluate(f"""
        () => {{
            const items = [];
            const nodes = document.querySelectorAll("[data-component-type='s-search-result'], .s-result-item[data-asin]");
            let pos = 1;
            for (const node of nodes) {{
                if (items.length >= {limit}) break;
                const titleEl = node.querySelector("h2 a span, h2 span, .a-size-medium, .a-size-base-plus");
                const linkEl = node.querySelector("h2 a, a.a-link-normal");
                const priceEl = node.querySelector(".a-price .a-offscreen, .a-price-whole");
                const ratingEl = node.querySelector(".a-icon-alt, .a-icon-star-small");
                
                if (titleEl && linkEl) {{
                    let href = linkEl.href || '';
                    if (href && !href.startsWith('http')) href = 'https://www.amazon.com' + href;
                    const price = priceEl ? priceEl.innerText.trim() : '';
                    const rating = ratingEl ? ratingEl.innerText.trim() : '';
                    const snippet = [price, rating].filter(Boolean).join(' | ');
                    
                    items.push({{
                        title: titleEl.innerText.trim(),
                        url: href,
                        snippet: snippet,
                        position: pos++
                    }});
                }}
            }}
            return items;
        }}
    """)
    return results


async def _search_youtube(page, query: str, limit: int) -> List[Dict]:
    url = f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}"
    await page.goto(url, wait_until="domcontentloaded", timeout=40000)

    try:
        await page.wait_for_selector("ytd-video-renderer, ytd-rich-item-renderer", timeout=15000)
    except:
        pass

    await page.evaluate("window.scrollBy(0, 800)")
    await page.wait_for_timeout(1000)

    results = await page.evaluate(f"""
        () => {{
            const items = [];
            const nodes = document.querySelectorAll("ytd-video-renderer, ytd-rich-item-renderer");
            let pos = 1;
            for (const node of nodes) {{
                if (items.length >= {limit}) break;
                const titleEl = node.querySelector("#video-title, a#video-title-link, yt-formatted-string#video-title");
                const linkEl = node.querySelector("a#video-title, a#video-title-link, a.yt-simple-endpoint");
                const channelEl = node.querySelector("#channel-name a, ytd-channel-name a, #text.ytd-channel-name");
                const metaEl = node.querySelector("#metadata-line span, #meta #metadata-line");
                
                if (titleEl && linkEl) {{
                    let href = linkEl.href || '';
                    if (href && !href.startsWith('http')) href = 'https://www.youtube.com' + href;
                    const channel = channelEl ? channelEl.innerText.trim() : '';
                    const meta = metaEl ? metaEl.innerText.trim() : '';
                    const snippet = [channel, meta].filter(Boolean).join(' • ');
                    
                    items.push({{
                        title: titleEl.innerText.trim() || titleEl.textContent.trim(),
                        url: href,
                        snippet: snippet,
                        position: pos++
                    }});
                }}
            }}
            return items;
        }}
    """)
    return results
