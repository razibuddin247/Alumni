import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, PieChart } from 'lucide-react';
import { FUND_CATEGORIES, type FundCategory, type FundTransaction } from '../types/portal';
import { formatBdtAmount } from '../utils/portalLogic';

interface TreasuryChartsProps {
  transactions: FundTransaction[];
  selectedCategory: FundCategory | null;
  onSelectCategory: (category: FundCategory) => void;
}

const CHART_COLORS: readonly string[] = [
  '#0A192F', // Deep Navy
  '#C5A059', // Maritime Gold
  '#0D9488', // Teal
  '#1D4ED8', // Cobalt Blue
  '#806127', // Bronze Gold
  '#334155', // Slate
  '#B45309', // Amber
  '#BE123C', // Crimson (expenses/other)
];

function formatCompactBdt(value: number): string {
  if (value >= 1_000_000) {
    return `৳${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `৳${Math.round(value / 1_000)}k`;
  }
  return `৳${Math.round(value)}`;
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const dt = new Date(Date.UTC(y, m - 1, 1));
  return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

export function TreasuryCharts({
  transactions,
  selectedCategory,
  onSelectCategory,
}: TreasuryChartsProps) {
  const [donutMode, setDonutMode] = useState<'contribution' | 'disbursement'>('contribution');
  const [hoveredCategory, setHoveredCategory] = useState<FundCategory | null>(null);
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);

  // 1. Category Distribution Data
  const categoryBreakdown = useMemo(() => {
    const sums = new Map<FundCategory, { amount: number; count: number }>();
    for (const tx of transactions) {
      if (tx.entryType !== donutMode) continue;
      const prev = sums.get(tx.category) ?? { amount: 0, count: 0 };
      sums.set(tx.category, { amount: prev.amount + tx.amount, count: prev.count + 1 });
    }

    const total = Array.from(sums.values()).reduce((acc, item) => acc + item.amount, 0);
    const items = FUND_CATEGORIES.map((cat, idx) => {
      const entry = sums.get(cat);
      const amount = entry?.amount ?? 0;
      const count = entry?.count ?? 0;
      const pct = total > 0 ? (amount / total) * 100 : 0;
      return {
        category: cat,
        amount,
        count,
        pct,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      };
    })
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return { items, total };
  }, [transactions, donutMode]);

  // Build SVG Donut Segments (radius = 64, circumference = 2 * pi * 64 ≈ 402.12)
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const donutSegments = useMemo(() => {
    let offset = 0;
    return categoryBreakdown.items.map((item) => {
      const len = (item.pct / 100) * circumference;
      const seg = {
        ...item,
        dashArray: `${Math.max(0, len - 2)} ${circumference}`,
        dashOffset: -offset,
      };
      offset += len;
      return seg;
    });
  }, [categoryBreakdown.items, circumference]);

  const activeDonutItem = useMemo(() => {
    const target = hoveredCategory || selectedCategory;
    if (!target) return null;
    return categoryBreakdown.items.find((i) => i.category === target) ?? null;
  }, [hoveredCategory, selectedCategory, categoryBreakdown.items]);

  // 2. Monthly Cashflow Data (Collected vs Expenses across up to 6 most recent months)
  const monthlySeries = useMemo(() => {
    const byMonth = new Map<string, { month: string; collected: number; disbursed: number }>();
    for (const tx of transactions) {
      const ym = (tx.transactionDateTime || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(ym)) continue;
      const row = byMonth.get(ym) ?? { month: ym, collected: 0, disbursed: 0 };
      if (tx.entryType === 'contribution') {
        row.collected += tx.amount;
      } else {
        row.disbursed += tx.amount;
      }
      byMonth.set(ym, row);
    }

    const sorted = Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
    const recent = sorted.slice(-6);
    const maxVal = Math.max(
      1000,
      ...recent.flatMap((r) => [r.collected, r.disbursed])
    );

    return { rows: recent, maxVal };
  }, [transactions]);

  return (
    <section
      aria-label="Treasury visual charts"
      data-testid="treasury-charts-section"
      className="grid grid-cols-1 lg:grid-cols-12 gap-5"
    >
      {/* Chart 1: Interactive Category Distribution Donut */}
      <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#806127]" aria-hidden="true" />
            <div>
              <h2 className="font-display text-sm font-bold text-[#0A192F]">
                Category Breakdown
              </h2>
              <p className="text-xs text-slate-500">
                Click a category slice to highlight below
              </p>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Chart breakdown type"
            className="inline-flex items-center p-0.5 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={donutMode === 'contribution'}
              onClick={() => setDonutMode('contribution')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                donutMode === 'contribution'
                  ? 'bg-white text-[#0A192F] shadow-xs'
                  : 'text-slate-600 hover:text-[#0A192F]'
              }`}
            >
              Contributions
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={donutMode === 'disbursement'}
              onClick={() => setDonutMode('disbursement')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                donutMode === 'disbursement'
                  ? 'bg-white text-[#0A192F] shadow-xs'
                  : 'text-slate-600 hover:text-[#0A192F]'
              }`}
            >
              Expenses
            </button>
          </div>
        </div>

        {categoryBreakdown.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
            <p className="text-xs font-medium text-slate-600">
              No {donutMode === 'contribution' ? 'contributions' : 'expenses'} recorded yet.
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Select a category below to add the first entry.
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6 my-auto">
            {/* SVG Donut */}
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
              <svg
                viewBox="0 0 160 160"
                className="w-full h-full -rotate-90"
                role="img"
                aria-label="Category distribution donut chart"
              >
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="#F1F5F9"
                  strokeWidth="22"
                />
                {donutSegments.map((seg) => {
                  const isHighlighted =
                    hoveredCategory === seg.category || selectedCategory === seg.category;
                  return (
                    <motion.circle
                      key={seg.category}
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={isHighlighted ? 26 : 22}
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.35 }}
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredCategory(seg.category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() => onSelectCategory(seg.category)}
                    />
                  );
                })}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5 pointer-events-none">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 truncate max-w-full">
                  {activeDonutItem ? activeDonutItem.category : donutMode === 'contribution' ? 'Total Collected' : 'Total Spent'}
                </span>
                <span className="mt-0.5 font-mono text-sm font-bold text-[#0A192F] tabular-nums">
                  {formatBdtAmount(activeDonutItem ? activeDonutItem.amount : categoryBreakdown.total)}
                </span>
                {activeDonutItem && (
                  <span className="font-mono text-[10px] font-semibold text-[#806127] tabular-nums">
                    {activeDonutItem.pct.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Interactive Legend */}
            <ul className="flex-1 w-full space-y-1.5 min-w-0">
              {categoryBreakdown.items.map((item) => {
                const isSelected = selectedCategory === item.category;
                return (
                  <li key={item.category}>
                    <button
                      type="button"
                      onMouseEnter={() => setHoveredCategory(item.category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() => onSelectCategory(item.category)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                        isSelected
                          ? 'bg-[#FBF8F1] border border-[#C5A059]'
                          : 'hover:bg-[#F8FAFC] border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                          aria-hidden="true"
                        />
                        <span className="font-medium text-[#0A192F] truncate">
                          {item.category}
                        </span>
                      </span>
                      <span className="font-mono text-xs font-semibold text-[#0A192F] tabular-nums whitespace-nowrap shrink-0">
                        {formatBdtAmount(item.amount)}{' '}
                        <span className="text-slate-400 font-normal">
                          ({Math.round(item.pct)}%)
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Chart 2: Monthly Cashflow Grouped Bar Chart */}
      <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#806127]" aria-hidden="true" />
            <div>
              <h2 className="font-display text-sm font-bold text-[#0A192F]">
                Monthly Cashflow Trend
              </h2>
              <p className="text-xs text-slate-500">
                Contributions vs. expenses across recent months
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-medium text-slate-600 shrink-0">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#0A192F]" aria-hidden="true" />
              Collected
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#C5A059]" aria-hidden="true" />
              Expenses
            </span>
          </div>
        </div>

        {monthlySeries.rows.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
            <p className="text-xs font-medium text-slate-600">No monthly cashflow history yet.</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Contributions and disbursements will chart here automatically by month.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Hover Readout Strip */}
            <div className="min-h-[24px] mb-2 flex items-center justify-between text-xs font-mono tabular-nums">
              {hoveredMonthIdx !== null && monthlySeries.rows[hoveredMonthIdx] ? (
                <>
                  <span className="font-semibold text-[#0A192F]">
                    {formatMonthLabel(monthlySeries.rows[hoveredMonthIdx].month)}
                  </span>
                  <span className="text-slate-600">
                    In: <strong className="text-[#0A192F]">{formatBdtAmount(monthlySeries.rows[hoveredMonthIdx].collected)}</strong>
                    <span className="mx-2 text-slate-300">·</span>
                    Out: <strong className="text-[#806127]">{formatBdtAmount(monthlySeries.rows[hoveredMonthIdx].disbursed)}</strong>
                  </span>
                </>
              ) : (
                <span className="text-[11px] font-sans text-slate-400">
                  Hover over any month column to inspect totals
                </span>
              )}
            </div>

            {/* Responsive SVG Bar Chart */}
            <svg
              viewBox="0 0 460 190"
              className="w-full h-44 overflow-visible"
              role="img"
              aria-label="Monthly contributions versus expenses bar chart"
            >
              {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                const y = 152 - tick * 130;
                const val = monthlySeries.maxVal * tick;
                return (
                  <g key={tick}>
                    <line
                      x1="46"
                      y1={y}
                      x2="452"
                      y2={y}
                      stroke={tick === 0 ? '#CBD5E1' : '#F1F5F9'}
                      strokeWidth="1"
                    />
                    <text
                      x="40"
                      y={y + 3}
                      textAnchor="end"
                      className="fill-slate-400 text-[9px] font-mono"
                    >
                      {formatCompactBdt(val)}
                    </text>
                  </g>
                );
              })}

              {monthlySeries.rows.map((row, idx) => {
                const slotW = (452 - 54) / monthlySeries.rows.length;
                const groupCenter = 54 + slotW * idx + slotW / 2;
                const barW = Math.min(20, slotW * 0.3);
                const collH = (row.collected / monthlySeries.maxVal) * 130;
                const expH = (row.disbursed / monthlySeries.maxVal) * 130;
                const isHovered = hoveredMonthIdx === idx;

                return (
                  <g
                    key={row.month}
                    onMouseEnter={() => setHoveredMonthIdx(idx)}
                    onMouseLeave={() => setHoveredMonthIdx(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={groupCenter - slotW / 2}
                      y={16}
                      width={slotW}
                      height={156}
                      fill={isHovered ? '#F8FAFC' : 'transparent'}
                      rx="6"
                    />
                    <motion.rect
                      x={groupCenter - barW - 2}
                      initial={{ height: 0, y: 152 }}
                      animate={{
                        height: Math.max(row.collected > 0 ? 3 : 0, collH),
                        y: 152 - Math.max(row.collected > 0 ? 3 : 0, collH),
                      }}
                      transition={{ duration: 0.4, delay: idx * 0.04 }}
                      width={barW}
                      rx="3"
                      fill="#0A192F"
                    />
                    <motion.rect
                      x={groupCenter + 2}
                      initial={{ height: 0, y: 152 }}
                      animate={{
                        height: Math.max(row.disbursed > 0 ? 3 : 0, expH),
                        y: 152 - Math.max(row.disbursed > 0 ? 3 : 0, expH),
                      }}
                      transition={{ duration: 0.4, delay: idx * 0.04 + 0.05 }}
                      width={barW}
                      rx="3"
                      fill="#C5A059"
                    />
                    <text
                      x={groupCenter}
                      y={170}
                      textAnchor="middle"
                      className={`text-[10px] font-mono ${
                        isHovered ? 'fill-[#0A192F] font-semibold' : 'fill-slate-500'
                      }`}
                    >
                      {formatMonthLabel(row.month)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>
    </section>
  );
}
