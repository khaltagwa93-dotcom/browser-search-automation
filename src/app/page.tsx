'use client';

import { useState, useEffect } from 'react';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
}

interface SearchResponse {
  success: boolean;
  query: string;
  engine: string;
  results: SearchResult[];
  count: number;
  timestamp: string;
  error?: string;
  message?: string;
  hint?: string;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [engine, setEngine] = useState('duckduckgo');
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [meta, setMeta] = useState<{ query: string; engine: string; timestamp: string; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('search-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const saveHistory = (q: string) => {
    const updated = [q, ...history.filter(h => h !== q)].slice(0, 20);
    setHistory(updated);
    localStorage.setItem('search-history', JSON.stringify(updated));
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setMeta(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), engine, limit }),
      });

      const data: SearchResponse = await res.json();

      if (!res.ok || data.error) {
        setError(data.message || data.error || 'فشل البحث');
        if (data.hint) setError(prev => prev + ' — ' + data.hint);
        return;
      }

      setResults(data.results || []);
      setMeta({
        query: data.query,
        engine: data.engine,
        timestamp: data.timestamp,
        count: data.count,
      });
      saveHistory(query.trim());
    } catch (err: any) {
      setError('خطأ في الاتصال: ' + (err.message || 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!results.length) return;
    const header = 'Position,Title,URL,Snippet\n';
    const rows = results.map(r => 
      `${r.position},"${r.title.replace(/"/g, '""')}","${r.url}","${r.snippet.replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-${meta?.query || 'results'}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            نظام أتمتة البحث من المتصفح
          </h1>
          <p className="mt-2 text-slate-400 text-sm md:text-base">
            Playwright · DuckDuckGo / Google / Bing · مفتوح المصدر · يعمل على Vercel
          </p>
        </header>

        <div className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-xl mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="أدخل كلمة البحث هنا..."
              className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-500"
              dir="auto"
            />
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              className="bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="duckduckgo">DuckDuckGo (موصى به)</option>
              <option value="google">Google</option>
              <option value="bing">Bing</option>
            </select>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value={5}>5 نتائج</option>
              <option value={10}>10 نتائج</option>
              <option value={15}>15 نتائج</option>
              <option value={20}>20 نتائج</option>
            </select>
            <button
              onClick={runSearch}
              disabled={loading || !query.trim()}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  جاري البحث...
                </span>
              ) : 'بحث'}
            </button>
          </div>

          {history.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-slate-500 text-sm self-center">سجل:</span>
              {history.slice(0, 8).map((h) => (
                <button
                  key={h}
                  onClick={() => { setQuery(h); }}
                  className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-full transition"
                >
                  {h}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-900/40 border border-red-700 text-red-200 rounded-xl p-4">
            {error}
          </div>
        )}

        {meta && (
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 text-sm text-slate-400">
            <div>
              نتائج لـ <span className="text-cyan-400 font-medium">"{meta.query}"</span> عبر{' '}
              <span className="text-blue-400">{meta.engine}</span> — {meta.count} نتيجة
            </div>
            <div className="flex gap-3">
              <span>{new Date(meta.timestamp).toLocaleString('ar')}</span>
              <button
                onClick={exportCSV}
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                تصدير CSV
              </button>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            {results.map((r) => (
              <article
                key={r.position}
                className="bg-slate-800/50 border border-slate-700 hover:border-slate-500 rounded-xl p-5 transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="text-slate-500 font-mono text-sm mt-1">{r.position}</span>
                  <div className="flex-1 min-w-0">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg text-cyan-300 hover:text-cyan-200 font-medium line-clamp-2"
                    >
                      {r.title}
                    </a>
                    <p className="text-xs text-green-500/80 mt-1 truncate">{r.url}</p>
                    {r.snippet && (
                      <p className="mt-2 text-slate-300 text-sm leading-relaxed line-clamp-3">
                        {r.snippet}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && !results.length && !error && (
          <div className="text-center py-20 text-slate-500">
            <p className="text-lg">أدخل كلمة بحث واضغط "بحث" لبدء الأتمتة</p>
            <p className="mt-2 text-sm">النظام يستخدم متصفح حقيقي (Playwright) لاستخراج النتائج</p>
          </div>
        )}

        <footer className="mt-16 text-center text-slate-600 text-xs">
          <p>نظام أتمتة بحث مفتوح المصدر · لا يخزن بيانات على الخادم · النتائج محلية</p>
          <p className="mt-1">ملاحظة: على خطة Vercel المجانية قد يحدث timeout بعد 10 ثوانٍ — استخدم DuckDuckGo وعدد نتائج أقل</p>
        </footer>
      </div>
    </div>
  );
}
