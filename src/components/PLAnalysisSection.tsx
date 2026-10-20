import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Layers,
  Percent,
  PieChart,
  Scale,
  Sparkles,
  Store as StoreIcon,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartOfAccount, Store, StoreBudget, Transaction } from '../types';
import { formatPeriod, formatRupiah } from '../utils/formatters';

interface PLAnalysisSectionProps {
  transactions: Transaction[];
  stores: Store[];
  activeStoreId: string;
  chartOfAccounts: ChartOfAccount[];
  budgets?: StoreBudget[];
  onNavigateTab: (tab: any) => void;
}

type PLTimeRange = 'this_month' | 'last_month' | 'ytd';

export const PLAnalysisSection: React.FC<PLAnalysisSectionProps> = ({
  transactions,
  stores,
  activeStoreId,
  chartOfAccounts,
  budgets = [],
  onNavigateTab,
}) => {
  const [timeRange, setTimeRange] = useState<PLTimeRange>('this_month');
  const [chartStyle, setChartStyle] = useState<'bar' | 'area'>('bar');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  // Filter approved transactions by active store
  const storeFilteredTrx = useMemo(() => {
    if (activeStoreId === 'ALL') return transactions.filter((t) => t.Status === 'Approved');
    return transactions.filter(
      (t) =>
        t.Status === 'Approved' &&
        (t.Store_ID === activeStoreId || t.Destination_Store_ID === activeStoreId)
    );
  }, [transactions, activeStoreId]);

  // 12-Month Trend Data for Recharts Visualization
  const monthlyTrendData = useMemo(() => {
    const monthLabels = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    return monthLabels.map((name, index) => {
      const monthNum = index + 1;
      const mTrx = storeFilteredTrx.filter((t) => {
        if (!t.Date) return false;
        const [yStr, mStr] = t.Date.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10);
        return y === currentYear && m === monthNum;
      });

      const rev = mTrx
        .filter((t) => t.Type === 'Pemasukan')
        .reduce((sum, t) => sum + (t.Amount || 0), 0);
      const exp = mTrx
        .filter((t) => t.Type === 'Pengeluaran')
        .reduce((sum, t) => sum + (t.Amount || 0), 0);
      const net = rev - exp;
      const margin = rev > 0 ? (net / rev) * 100 : 0;

      return {
        month: name,
        monthNum,
        Pendapatan: rev,
        Pengeluaran: exp,
        LabaBersih: net,
        Margin: Math.round(margin),
      };
    });
  }, [storeFilteredTrx, currentYear]);

  // Selected Period Transactions
  const periodTrx = useMemo(() => {
    return storeFilteredTrx.filter((t) => {
      if (!t.Date) return false;
      const [yStr, mStr] = t.Date.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);

      if (timeRange === 'this_month') {
        return y === currentYear && m === currentMonth;
      } else if (timeRange === 'last_month') {
        return y === prevYear && m === prevMonth;
      } else if (timeRange === 'ytd') {
        return y === currentYear;
      }
      return true;
    });
  }, [storeFilteredTrx, timeRange, currentYear, currentMonth, prevYear, prevMonth]);

  // Previous Comparison Period Transactions (for MoM / YoY)
  const comparisonTrx = useMemo(() => {
    return storeFilteredTrx.filter((t) => {
      if (!t.Date) return false;
      const [yStr, mStr] = t.Date.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);

      if (timeRange === 'this_month') {
        return y === prevYear && m === prevMonth;
      } else if (timeRange === 'last_month') {
        const twoMonthsAgoM = prevMonth === 1 ? 12 : prevMonth - 1;
        const twoMonthsAgoY = prevMonth === 1 ? prevYear - 1 : prevYear;
        return y === twoMonthsAgoY && m === twoMonthsAgoM;
      } else if (timeRange === 'ytd') {
        return y === currentYear - 1;
      }
      return true;
    });
  }, [storeFilteredTrx, timeRange, currentYear, currentMonth, prevYear, prevMonth]);

  // Current Period Metrics
  const revenueTrx = useMemo(() => periodTrx.filter((t) => t.Type === 'Pemasukan'), [periodTrx]);
  const expenseTrx = useMemo(() => periodTrx.filter((t) => t.Type === 'Pengeluaran'), [periodTrx]);

  const totalRevenue = useMemo(
    () => revenueTrx.reduce((sum, t) => sum + (t.Amount || 0), 0),
    [revenueTrx]
  );
  const totalExpense = useMemo(
    () => expenseTrx.reduce((sum, t) => sum + (t.Amount || 0), 0),
    [expenseTrx]
  );
  const netProfit = totalRevenue - totalExpense;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const oerPercent = totalRevenue > 0 ? (totalExpense / totalRevenue) * 100 : 0; // Operating Expense Ratio

  // Comparison Metrics
  const compRevenue = useMemo(
    () =>
      comparisonTrx
        .filter((t) => t.Type === 'Pemasukan')
        .reduce((sum, t) => sum + (t.Amount || 0), 0),
    [comparisonTrx]
  );
  const compExpense = useMemo(
    () =>
      comparisonTrx
        .filter((t) => t.Type === 'Pengeluaran')
        .reduce((sum, t) => sum + (t.Amount || 0), 0),
    [comparisonTrx]
  );
  const compProfit = compRevenue - compExpense;

  const revGrowth = compRevenue > 0 ? ((totalRevenue - compRevenue) / compRevenue) * 100 : 0;
  const expGrowth = compExpense > 0 ? ((totalExpense - compExpense) / compExpense) * 100 : 0;
  const profitGrowth =
    compProfit !== 0 ? ((netProfit - compProfit) / Math.abs(compProfit)) * 100 : 0;

  // Breakdown Revenue by COA Category
  const revenueBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    revenueTrx.forEach((t) => {
      const cat = t.Category || 'Pendapatan Lain-lain';
      map[cat] = (map[cat] || 0) + t.Amount;
    });
    return Object.entries(map)
      .map(([name, amount]) => ({
        name,
        amount,
        pct: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [revenueTrx, totalRevenue]);

  // Breakdown Expense by COA Category
  const expenseBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenseTrx.forEach((t) => {
      const cat = t.Category || 'Beban Lain-lain';
      map[cat] = (map[cat] || 0) + t.Amount;
    });
    return Object.entries(map)
      .map(([name, amount]) => ({
        name,
        amount,
        pctOfRev: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
        pctOfExp: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenseTrx, totalRevenue, totalExpense]);

  // Store Profitability Matrix
  const storeProfitability = useMemo(() => {
    return stores.map((s) => {
      const sTrx = periodTrx.filter((t) => t.Store_ID === s.Store_ID);
      const rev = sTrx
        .filter((t) => t.Type === 'Pemasukan')
        .reduce((sum, t) => sum + t.Amount, 0);
      const exp = sTrx
        .filter((t) => t.Type === 'Pengeluaran')
        .reduce((sum, t) => sum + t.Amount, 0);
      const net = rev - exp;
      const margin = rev > 0 ? (net / rev) * 100 : 0;
      const oer = rev > 0 ? (exp / rev) * 100 : 0;

      const sBudget = budgets.find(
        (b) =>
          b.Store_ID === s.Store_ID &&
          b.Period_Month === currentMonth &&
          b.Period_Year === currentYear
      );
      const budgetAmount = sBudget?.Total_Expense_Budget || 0;
      const budgetPercent = budgetAmount > 0 ? (exp / budgetAmount) * 100 : 0;

      return {
        store: s,
        revenue: rev,
        expense: exp,
        netProfit: net,
        margin,
        oer,
        budgetAmount,
        budgetPercent,
      };
    });
  }, [stores, periodTrx, budgets, currentMonth, currentYear]);

  // Financial Health Verdict
  const healthVerdict = useMemo(() => {
    if (totalRevenue === 0 && totalExpense === 0) {
      return {
        status: 'Belum Ada Data',
        badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        desc: 'Belum ada transaksi pendapatan atau pengeluaran pada periode ini.',
        advice: 'Catat transaksi pemasukan kasir dan pengeluaran operasional toko.',
      };
    }
    if (netProfit < 0) {
      return {
        status: 'Defisit (Rugi Operasional)',
        badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
        desc: `Beban operasional melebihi omset sebesar ${formatRupiah(Math.abs(netProfit))}.`,
        advice:
          'Evaluasi pos pengeluaran terbesar, tekan biaya operasional non-esensial, atau genjot omset penjualan.',
      };
    }
    if (profitMargin >= 30) {
      return {
        status: 'Sangat Menguntungkan (High Profit)',
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
        desc: `Marjin laba bersih mencapai ${profitMargin.toFixed(1)}% (Sangat Prima).`,
        advice:
          'Pertahankan efisiensi biaya dan alokasikan sebagian keuntungan untuk ekspansi cabang.',
      };
    }
    if (profitMargin >= 15) {
      return {
        status: 'Sehat & Stabil (Healthy)',
        badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300',
        desc: `Marjin laba bersih ${profitMargin.toFixed(1)}% dengan rasio beban ${oerPercent.toFixed(1)}%.`,
        advice: 'Kondisi operasional stabil. Pantau tren pertumbuhan pendapatan tiap minggu.',
      };
    }
    return {
      status: 'Waspada (Low Margin)',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
      desc: `Laba bersih tipis (${profitMargin.toFixed(1)}%), beban menyerap ${oerPercent.toFixed(1)}% dari omset.`,
      advice: 'Cek efisiensi biaya utilitas, kasbon, dan negosiasikan harga beli dengan supplier.',
    };
  }, [netProfit, totalRevenue, totalExpense, profitMargin, oerPercent]);

  const activeStoreName =
    activeStoreId === 'ALL'
      ? 'Konsolidasi Semua Cabang'
      : stores.find((s) => s.Store_ID === activeStoreId)?.Store_Name || activeStoreId;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Analisa Laba Rugi (P&L Analysis)
              </h2>
              <span className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                P & L Insight
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Evaluasi kinerja pendapatan, beban usaha, marjin profitabilitas, dan perbandingan MoM
              · <strong className="text-slate-700 dark:text-slate-300">{activeStoreName}</strong>
            </p>
          </div>
        </div>

        {/* Controls: Time Range Selector & Link */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800 text-xs">
            <button
              onClick={() => setTimeRange('this_month')}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                timeRange === 'this_month'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setTimeRange('last_month')}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                timeRange === 'last_month'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Bulan Lalu
            </button>
            <button
              onClick={() => setTimeRange('ytd')}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                timeRange === 'ytd'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              YTD ({currentYear})
            </button>
          </div>

          <button
            onClick={() => onNavigateTab('profit_loss')}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition-colors shadow-xs"
            title="Buka Laporan Laba Rugi Lengkap"
          >
            <span>Laporan Penuh</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Row 1: Executive KPI Cards with MoM Trend Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Pendapatan */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Pendapatan Kotor (Revenue)</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatRupiah(totalRevenue)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px]">
            {compRevenue > 0 ? (
              <span
                className={`inline-flex items-center gap-0.5 font-semibold ${
                  revGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                }`}
              >
                {revGrowth >= 0 ? '+' : ''}
                {revGrowth.toFixed(1)}%
                <span className="text-slate-400 font-normal ml-0.5">
                  vs {timeRange === 'ytd' ? 'tahun lalu' : 'periode lalu'}
                </span>
              </span>
            ) : (
              <span className="text-slate-400">Periode awal</span>
            )}
          </div>
        </div>

        {/* Metric 2: Total Beban Usaha */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Beban (Operating Expense)</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatRupiah(totalExpense)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px]">
            {compExpense > 0 ? (
              <span
                className={`inline-flex items-center gap-0.5 font-semibold ${
                  expGrowth <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                }`}
              >
                {expGrowth >= 0 ? '+' : ''}
                {expGrowth.toFixed(1)}%
                <span className="text-slate-400 font-normal ml-0.5">
                  vs {timeRange === 'ytd' ? 'tahun lalu' : 'periode lalu'}
                </span>
              </span>
            ) : (
              <span className="text-slate-400">Periode awal</span>
            )}
          </div>
        </div>

        {/* Metric 3: Laba Bersih */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Laba Bersih Operasional</span>
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                netProfit >= 0
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
              }`}
            >
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-xl font-bold font-mono tabular-nums ${
              netProfit >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatRupiah(netProfit)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px]">
            {compProfit !== 0 ? (
              <span
                className={`inline-flex items-center gap-0.5 font-semibold ${
                  profitGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                }`}
              >
                {profitGrowth >= 0 ? '+' : ''}
                {profitGrowth.toFixed(1)}%
                <span className="text-slate-400 font-normal ml-0.5">
                  vs {timeRange === 'ytd' ? 'tahun lalu' : 'periode lalu'}
                </span>
              </span>
            ) : (
              <span className="text-slate-400">Periode awal</span>
            )}
          </div>
        </div>

        {/* Metric 4: Profit Margin & Expense Ratio */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Marjin Laba & Beban</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {profitMargin.toFixed(1)}%
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>Rasio Beban (OER):</span>
            <span className="font-semibold font-mono text-slate-700 dark:text-slate-300">
              {oerPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Status Kesehatan Finansial & Rekomendasi Manajerial */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-850/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Diagnosa Finansial:
              </span>
              <span
                className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${healthVerdict.badgeClass}`}
              >
                {healthVerdict.status}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {healthVerdict.desc}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
              <strong>Saran Aksi:</strong> {healthVerdict.advice}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right md:border-l md:border-slate-200 md:pl-4 dark:md:border-slate-750">
          <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
            Efisiensi Operasional
          </span>
          <span
            className={`text-sm font-bold font-mono ${
              oerPercent <= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'
            }`}
          >
            {oerPercent <= 70 ? 'Terkendali Baik ✓' : 'Perlu Penghematan ⚠'}
          </span>
        </div>
      </div>

      {/* Row 3: Revenue-to-Profit Waterfall Bar (Visualisasi Struktur 100% Omset) */}
      {totalRevenue > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-slate-900 dark:text-white">
                Struktur Alokasi Omset (Kemana Perginya Setiap Rp 100 Pendapatan?)
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              100% = {formatRupiah(totalRevenue)}
            </span>
          </div>

          {/* Stacked Progress Bar */}
          <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            {expenseBreakdown.slice(0, 4).map((item, idx) => {
              const colors = [
                'bg-blue-500',
                'bg-amber-500',
                'bg-purple-500',
                'bg-rose-500',
              ];
              const w = Math.min(item.pctOfRev, 100);
              if (w <= 0) return null;
              return (
                <div
                  key={idx}
                  className={`${colors[idx % colors.length]} transition-all duration-300`}
                  style={{ width: `${w}%` }}
                  title={`${item.name}: ${w.toFixed(1)}% (${formatRupiah(item.amount)})`}
                />
              );
            })}
            {netProfit > 0 && (
              <div
                className="bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(profitMargin, 100)}%` }}
                title={`Sisa Laba Bersih: ${profitMargin.toFixed(1)}% (${formatRupiah(netProfit)})`}
              />
            )}
          </div>

          {/* Legend Items */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] pt-1">
            {expenseBreakdown.slice(0, 4).map((item, idx) => {
              const bgDots = [
                'bg-blue-500',
                'bg-amber-500',
                'bg-purple-500',
                'bg-rose-500',
              ];
              return (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${bgDots[idx % bgDots.length]}`} />
                  <span className="text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                    {item.name.replace(/^\d+-\d+\s*-\s*/, '')}
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {item.pctOfRev.toFixed(0)}%
                  </span>
                </div>
              );
            })}
            {netProfit > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Laba Bersih
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {profitMargin.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recharts Monthly Trend Visualization in Dashboard P&L */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Grafik Tren Laba Rugi Bulanan ({currentYear})
              </h4>
              <span className="text-[10px] text-slate-400">
                Visualisasi dinamika pendapatan, beban operasional, dan laba bersih per bulan (Recharts)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setChartStyle('bar')}
                className={`rounded px-2.5 py-1 font-medium transition-colors ${
                  chartStyle === 'bar'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                Diagram Batang
              </button>
              <button
                type="button"
                onClick={() => setChartStyle('area')}
                className={`rounded px-2.5 py-1 font-medium transition-colors ${
                  chartStyle === 'area'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                Area Gelombang
              </button>
            </div>
          </div>
        </div>

        {/* Recharts Canvas */}
        <div className="w-full h-64 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            {chartStyle === 'bar' ? (
              <BarChart data={monthlyTrendData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 9 }}
                  tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : `${v}`)}
                />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      const rev = payload.find((p: any) => p.dataKey === 'Pendapatan')?.value || 0;
                      const exp = payload.find((p: any) => p.dataKey === 'Pengeluaran')?.value || 0;
                      const net = rev - exp;
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white/95 p-2.5 shadow-lg backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95 text-[11px] space-y-1 min-w-[170px]">
                          <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-1 dark:border-slate-800">
                            Bulan {label} {currentYear}
                          </div>
                          <div className="space-y-0.5 font-mono">
                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                              <span>Inflow:</span>
                              <span className="font-semibold">{formatRupiah(rev)}</span>
                            </div>
                            <div className="flex justify-between text-rose-600 dark:text-rose-400">
                              <span>Outflow:</span>
                              <span className="font-semibold">{formatRupiah(exp)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-0.5 font-bold text-slate-900 dark:text-white">
                              <span>Net:</span>
                              <span className={net >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                {formatRupiah(net)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                <Bar dataKey="Pendapatan" fill="#10b981" radius={[3, 3, 0, 0]} name="Pendapatan" />
                <Bar dataKey="Pengeluaran" fill="#f43f5e" radius={[3, 3, 0, 0]} name="Pengeluaran" />
                <Line
                  type="monotone"
                  dataKey="LabaBersih"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#3b82f6' }}
                  name="Laba Bersih"
                />
              </BarChart>
            ) : (
              <AreaChart data={monthlyTrendData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashPLColorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="dashPLColorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 9 }}
                  tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : `${v}`)}
                />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      const rev = payload.find((p: any) => p.dataKey === 'Pendapatan')?.value || 0;
                      const exp = payload.find((p: any) => p.dataKey === 'Pengeluaran')?.value || 0;
                      const net = rev - exp;
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white/95 p-2.5 shadow-lg backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95 text-[11px] space-y-1 min-w-[170px]">
                          <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-1 dark:border-slate-800">
                            Bulan {label} {currentYear}
                          </div>
                          <div className="space-y-0.5 font-mono">
                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                              <span>Inflow:</span>
                              <span className="font-semibold">{formatRupiah(rev)}</span>
                            </div>
                            <div className="flex justify-between text-rose-600 dark:text-rose-400">
                              <span>Outflow:</span>
                              <span className="font-semibold">{formatRupiah(exp)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-0.5 font-bold text-slate-900 dark:text-white">
                              <span>Net:</span>
                              <span className={net >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                {formatRupiah(net)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                <Area
                  type="monotone"
                  dataKey="Pendapatan"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#dashPLColorRev)"
                  name="Pendapatan"
                />
                <Area
                  type="monotone"
                  dataKey="Pengeluaran"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#dashPLColorExp)"
                  name="Pengeluaran"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 4: Two-Column Breakdown (Pendapatan vs Pengeluaran per Kategori) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Kolom 1: Sumber Pendapatan (Revenues) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Sumber Pendapatan (Inflow)
              </h3>
            </div>
            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatRupiah(totalRevenue)}
            </span>
          </div>

          {revenueBreakdown.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Belum ada pencatatan pendapatan periode ini.
            </div>
          ) : (
            <div className="space-y-2.5 text-xs">
              {revenueBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[220px]">
                      {item.name}
                    </span>
                    <div className="font-mono tabular-nums text-right">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatRupiah(item.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">
                        ({item.pct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(item.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kolom 2: Beban Usaha Terbesar (Operating Expenses) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-rose-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Struktur Beban Usaha (Outflow)
              </h3>
            </div>
            <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
              {formatRupiah(totalExpense)}
            </span>
          </div>

          {expenseBreakdown.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Belum ada pencatatan pengeluaran periode ini.
            </div>
          ) : (
            <div className="space-y-2.5 text-xs">
              {expenseBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[220px]">
                      {item.name}
                    </span>
                    <div className="font-mono tabular-nums text-right">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatRupiah(item.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">
                        ({item.pctOfExp.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-rose-500"
                      style={{ width: `${Math.min(item.pctOfExp, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 5: Store Profitability Matrix (Konsolidasi Multi-Cabang) */}
      {stores.length > 1 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Matriks Profitabilitas Antar Cabang
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Kontribusi omset, beban, dan perolehan laba bersih per outlet
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('profit_loss')}
              className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Lihat Detail &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Cabang Toko</th>
                  <th className="px-4 py-2.5 text-right">Omset (Revenue)</th>
                  <th className="px-4 py-2.5 text-right">Beban Operasional</th>
                  <th className="px-4 py-2.5 text-right">Laba Bersih</th>
                  <th className="px-4 py-2.5 text-right">Marjin (%)</th>
                  <th className="px-4 py-2.5 text-center">Realisasi Budget</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {storeProfitability.map((item) => (
                  <tr
                    key={item.store.Store_ID}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <StoreIcon className="h-3.5 w-3.5 text-slate-400" />
                        <span>{item.store.Store_Name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.store.Store_ID}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatRupiah(item.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {formatRupiah(item.expense)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono tabular-nums font-bold ${
                        item.netProfit >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatRupiah(item.netProfit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                      {item.margin.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.budgetAmount > 0 ? (
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                            item.budgetPercent >= 100
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                              : item.budgetPercent >= 90
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {item.budgetPercent >= 100
                            ? `🚨 Overbudget (${item.budgetPercent.toFixed(0)}%)`
                            : item.budgetPercent >= 90
                            ? `⚠️ >90% (${item.budgetPercent.toFixed(0)}%)`
                            : `${item.budgetPercent.toFixed(0)}% Terpakai`}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                          item.netProfit >= 0
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                        }`}
                      >
                        {item.netProfit >= 0 ? 'Surplus ✓' : 'Defisit ✕'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
