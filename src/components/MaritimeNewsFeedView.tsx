import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Anchor,
  Compass,
  ExternalLink,
  Globe,
  Newspaper,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import type { MaritimeNewsArticle, MaritimeNewsResponse } from '../types/portal';

const NEWS_CATEGORIES = [
  'All',
  'Regulations & IMO',
  'Shipping Markets',
  'Green Tech & Decarbonization',
  'Seafarer Welfare & Safety',
  'Ports & Logistics',
] as const;

type NewsCategoryFilter = (typeof NEWS_CATEGORIES)[number];

function getCategoryBadgeColor(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes('regulation') || cat.includes('imo')) {
    return 'bg-amber-50 text-amber-900 border-amber-200/80';
  }
  if (cat.includes('green') || cat.includes('decarbon') || cat.includes('tech')) {
    return 'bg-emerald-50 text-emerald-900 border-emerald-200/80';
  }
  if (cat.includes('welfare') || cat.includes('safety') || cat.includes('seafarer')) {
    return 'bg-sky-50 text-sky-900 border-sky-200/80';
  }
  if (cat.includes('port') || cat.includes('logistic')) {
    return 'bg-indigo-50 text-indigo-900 border-indigo-200/80';
  }
  return 'bg-slate-100 text-[#0A192F] border-slate-200';
}

export function MaritimeNewsFeedView() {
  const [newsData, setNewsData] = useState<MaritimeNewsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<NewsCategoryFilter>('All');

  const fetchNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const url = isRefresh ? '/api/maritime-news?refresh=true' : '/api/maritime-news';
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data: MaritimeNewsResponse = await res.json();
      setNewsData(data);
    } catch (err: unknown) {
      console.error('Error fetching maritime news feed:', err);
      setError(
        err instanceof Error ? err.message : 'Unable to connect to maritime news feed'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const filteredArticles = useMemo(() => {
    if (!newsData?.articles) return [];
    return newsData.articles.filter((art) => {
      // Category filter
      if (selectedCategory !== 'All') {
        const catA = art.category.toLowerCase();
        const catB = selectedCategory.toLowerCase();
        if (!catA.includes(catB) && !catB.includes(catA)) {
          return false;
        }
      }
      // Text query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = art.title.toLowerCase().includes(query);
        const matchesSummary = art.summary.toLowerCase().includes(query);
        const matchesSource = art.source.toLowerCase().includes(query);
        const matchesHighlights = art.highlights?.some((h) => h.toLowerCase().includes(query));
        return matchesTitle || matchesSummary || matchesSource || matchesHighlights;
      }
      return true;
    });
  }, [newsData, selectedCategory, searchQuery]);

  const formattedLastUpdated = useMemo(() => {
    if (!newsData?.lastUpdated) return null;
    try {
      const date = new Date(newsData.lastUpdated);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return newsData.lastUpdated;
    }
  }, [newsData?.lastUpdated]);

  return (
    <section className="space-y-6 min-w-0" data-testid="maritime-news-feed-section">
      {/* Top Banner / Headline */}
      <div className="bg-gradient-to-r from-[#0A192F] via-[#112240] to-[#1E3A8A] text-white rounded-2xl p-5 sm:p-6 shadow-md border border-[#806127]/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-200 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              Live Search-Grounded Maritime Intelligence
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
              Global Maritime &amp; Shipping Industry Updates
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Real-time industry insights, IMO environmental regulatory shifts, global container and
              tanker freight markets, seafarer welfare updates, and deep-sea port developments.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => fetchNews(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 hover:text-white border border-white/15 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              aria-label="Refresh latest maritime news"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-300' : ''}`}
                aria-hidden="true"
              />
              {refreshing ? 'Searching Live Web...' : 'Refresh Feed'}
            </button>
          </div>
        </div>

        {/* Status ribbon */}
        <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-amber-300 shrink-0" aria-hidden="true" />
            <span>Search Sources: IMO, TradeWinds, Lloyd&apos;s List, BIMCO, Splash247</span>
          </div>
          {formattedLastUpdated && (
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Last synchronized: {formattedLastUpdated}
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keywords (e.g., IMO, Suez, Tanker, STCW, Methanol, Chittagong)..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm text-[#0A192F] placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0A192F] focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium shrink-0 self-center">
            Showing <span className="font-bold text-[#0A192F]">{filteredArticles.length}</span>{' '}
            verified update{filteredArticles.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {NEWS_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer border ${
                  isSelected
                    ? 'bg-[#0A192F] text-amber-200 border-[#0A192F] shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-[#0A192F]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content State: Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3.5 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-28 bg-slate-200 rounded-md" />
                <div className="h-4 w-20 bg-slate-200 rounded-md" />
              </div>
              <div className="h-6 w-3/4 bg-slate-200 rounded-md" />
              <div className="space-y-2">
                <div className="h-3.5 w-full bg-slate-200 rounded-md" />
                <div className="h-3.5 w-5/6 bg-slate-200 rounded-md" />
              </div>
              <div className="h-8 w-32 bg-slate-200 rounded-md" />
            </div>
          ))}
        </div>
      ) : error && (!newsData || newsData.articles.length === 0) ? (
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <h3 className="text-base font-bold text-[#0A192F]">Unable to Load Maritime News</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => fetchNews(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Connection
          </button>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-10 text-center space-y-3">
          <Newspaper className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
          <h3 className="text-base font-bold text-[#0A192F]">No matching maritime news found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No updates matched your current filters. Try searching for broader terms or switch
            category to &quot;All&quot;.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            className="text-xs font-semibold text-[#806127] hover:underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Articles Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredArticles.map((article) => {
            const badgeClass = getCategoryBadgeColor(article.category);
            return (
              <article
                key={article.id}
                className="bg-white border border-[#E2E8F0] hover:border-[#806127]/40 rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Category and Date/Source Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span
                      className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-wide ${badgeClass}`}
                    >
                      {article.category}
                    </span>
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <span className="font-semibold text-slate-700">{article.source}</span>
                      <span>•</span>
                      <span>{article.publishedDate}</span>
                    </div>
                  </div>

                  {/* Headline */}
                  <h3 className="text-base sm:text-lg font-bold font-display text-[#0A192F] group-hover:text-[#806127] transition-colors leading-snug">
                    {article.title}
                  </h3>

                  {/* Summary */}
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {article.summary}
                  </p>

                  {/* Highlights Bullet points if available */}
                  {article.highlights && article.highlights.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Key Maritime Takeaways:
                      </div>
                      <ul className="space-y-1 text-xs text-slate-700">
                        {article.highlights.map((highlight, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-[#806127] font-bold shrink-0 mt-0.5">›</span>
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Footer Link / Action */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                    <Anchor className="w-3.5 h-3.5 text-slate-400" />
                    <span>BMASA Verified Intel</span>
                  </div>

                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A192F] hover:text-[#806127] transition-colors group/btn"
                  >
                    <span>Read Full Coverage</span>
                    <ExternalLink
                      className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-[#806127] transition-colors"
                      aria-hidden="true"
                    />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Grounding Source Attribution Ribbon */}
      {newsData?.groundingSources && newsData.groundingSources.length > 0 && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-600 space-y-2">
          <div className="font-semibold text-[#0A192F] flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#806127]" aria-hidden="true" />
            <span>Search-Grounded Verified Web Sources:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {newsData.groundingSources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-[#0A192F] transition-colors text-[11px]"
              >
                <span>{src.title}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
