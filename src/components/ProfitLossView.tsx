import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Download,
  FileSpreadsheet,
  LineChart as LineChartIcon,
  Printer,
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
import { StorageService } from '../services/storageService';
import { ChartOfAccount, CompanyProfile, Store, Transaction, User } from '../types';
import { formatDate, formatPeriod, formatRupiah } from '../utils/formatters';
import { exportProfitLossPdf } from '../utils/pdfGenerator';

interface ProfitLossViewProps {
  stores: Store[];
  activeStoreId: string;
  transactions: Transaction[];
  chartOfAccounts: ChartOfAccount[];
  companyProfile?: CompanyProfile;
  currentUser?: User;
}

export const ProfitLossView: React.FC<ProfitLossViewProps> = ({
  stores,
  activeStoreId,
  transactions,
  chartOfAccounts,
  companyProfile,
  currentUser,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>('ALL');
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  // Monthly Trend Data for Recharts
  const monthlyChartData = useMemo(() => {
    const monthNames = [
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
    return monthNames.map((name, index) => {
      const monthNum = index + 1;
      const mTrx = transactions.filter((t) => {
        if (t.Status !== 'Approved') return false;
        if (activeStoreId !== 'ALL' && t.Store_ID !== activeStoreId) return false;
        if (!t.Date) return false;
        const [yStr, mStr] = t.Date.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10);
        return y === selectedYear && m === monthNum;
      });

      const rev = mTrx
        .filter((t) => t.Type === 'Pemasukan')
        .reduce((sum, t) => sum + (t.Amount || 0), 0);
      const exp = mTrx
        .filter((t) => t.Type === 'Pengeluaran')
        .reduce((sum, t) => sum + (t.Amount || 0), 0);
      const profit = rev - exp;
      const margin = rev > 0 ? (profit / rev) * 100 : 0;

      return {
        month: name,
        monthNum,
        Pendapatan: rev,
        Pengeluaran: exp,
        LabaBersih: profit,
        Margin: Math.round(margin),
      };
    });
  }, [transactions, activeStoreId, selectedYear]);

  // Filter transactions
  const filteredTrx = useMemo(() => {
    return transactions.filter((t) => {
      if (t.Status !== 'Approved') return false;

      // Store filter
      if (activeStoreId !== 'ALL' && t.Store_ID !== activeStoreId) {
        return false;
      }

      if (!t.Date) return false;
      const [yStr, mStr] = t.Date.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);

      if (y !== selectedYear) return false;
      if (selectedMonth !== 'ALL' && m !== selectedMonth) return false;

      return true;
    });
  }, [transactions, activeStoreId, selectedYear, selectedMonth]);

  // Aggregate Revenues by COA
  const revenues = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTrx
      .filter((t) => t.Type === 'Pemasukan')
      .forEach((t) => {
        map[t.Category] = (map[t.Category] || 0) + t.Amount;
      });

    return Object.entries(map).map(([category, amount]) => ({
      category,
      amount,
    }));
  }, [filteredTrx]);

  const totalRevenue = useMemo(() => {
    return revenues.reduce((sum, r) => sum + r.amount, 0);
  }, [revenues]);

  // Aggregate Expenses by COA
  const expenses = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTrx
      .filter((t) => t.Type === 'Pengeluaran')
      .forEach((t) => {
        map[t.Category] = (map[t.Category] || 0) + t.Amount;
      });

    return Object.entries(map).map(([category, amount]) => ({
      category,
      amount,
    }));
  }, [filteredTrx]);

  const totalExpense = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const netProfit = totalRevenue - totalExpense;
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Store matrix comparison
  const storeMatrix = useMemo(() => {
    return stores.map((s) => {
      const sTrx = transactions.filter((t) => {
        if (t.Status !== 'Approved' || t.Store_ID !== s.Store_ID) return false;
        if (!t.Date) return false;
        const [yStr, mStr] = t.Date.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10);
        if (y !== selectedYear) return false;
        if (selectedMonth !== 'ALL' && m !== selectedMonth) return false;
        return true;
      });

      const rev = sTrx
        .filter((t) => t.Type === 'Pemasukan')
        .reduce((sum, t) => sum + t.Amount, 0);
      const exp = sTrx
        .filter((t) => t.Type === 'Pengeluaran')
        .reduce((sum, t) => sum + t.Amount, 0);

      return {
        store: s,
        revenue: rev,
        expense: exp,
        profit: rev - exp,
        margin: rev > 0 ? ((rev - exp) / rev) * 100 : 0,
      };
    });
  }, [stores, transactions, selectedYear, selectedMonth]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    const activeStoreName =
      activeStoreId === 'ALL'
        ? 'Konsolidasi Seluruh Cabang'
        : stores.find((s) => s.Store_ID === activeStoreId)?.Store_Name || activeStoreId;

    exportProfitLossPdf({
      companyProfile,
      periodMonth: selectedMonth,
      periodYear: selectedYear,
      activeStoreName,
      totalRevenue,
      totalExpense,
      netProfit,
      marginPercent,
      revenues,
      expenses,
      monthlyChartData,
      storeMatrix: activeStoreId === 'ALL' ? storeMatrix : undefined,
      printedBy: currentUser?.Full_Name || 'Finance Admin',
    });
  };

  const handleExportExcel = () => {
    const headers = ['Komponen Laba Rugi', 'Kategori / Akun', 'Nominal (Rp)'];
    const rows: (string | number)[][] = [];

    rows.push(['PENDAPATAN', '', '']);
    revenues.forEach((r) => rows.push(['Pendapatan', r.category, r.amount]));
    rows.push(['TOTAL PENDAPATAN', '', totalRevenue]);

    rows.push(['BEBAN USAHA', '', '']);
    expenses.forEach((e) => rows.push(['Beban Usaha', e.category, e.amount]));
    rows.push(['TOTAL BEBAN USAHA', '', totalExpense]);

    rows.push(['LABA BERSIH (NET PROFIT)', '', netProfit]);
    rows.push(['MARGIN LABA (%)', '', `${marginPercent.toFixed(2)}%`]);

    StorageService.exportToExcel(
      `Laporan_Laba_Rugi_${selectedYear}_${selectedMonth}`,
      headers,
      rows,
      'Laba Rugi'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Laporan Laba Rugi & Arus Kas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Laporan keuangan komparatif operasional toko (Pendapatan - Beban Usaha)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) =>
              setSelectedMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
          >
            <option value="ALL">Semua Bulan (Setahun Penuh {selectedYear})</option>
            {[
              { m: 1, name: 'Januari' },
              { m: 2, name: 'Februari' },
              { m: 3, name: 'Maret' },
              { m: 4, name: 'April' },
              { m: 5, name: 'Mei' },
              { m: 6, name: 'Juni' },
              { m: 7, name: 'Juli' },
              { m: 8, name: 'Agustus' },
              { m: 9, name: 'September' },
              { m: 10, name: 'Oktober' },
              { m: 11, name: 'November' },
              { m: 12, name: 'Desember' },
            ].map((item) => (
              <option key={item.m} value={item.m}>
                {item.name} {selectedYear}
              </option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
          >
            {[2024, 2025, 2026, 2027].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 shadow-2xs transition-colors cursor-pointer"
            title="Ekspor laporan laba rugi ke format Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 shadow-xs transition-colors cursor-pointer"
            title="Unduh Laporan Laba Rugi & Arus Kas dalam format PDF lengkap dengan Diagram Batang"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Unduh PDF (Diagram Batang)</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Total Pendapatan</span>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatRupiah(totalRevenue)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {revenues.length} Pos Sumber Pendapatan
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Total Beban Usaha</span>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
            {formatRupiah(totalExpense)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {expenses.length} Pos Beban Operasional
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Laba Bersih Operasional
          </span>
          <div
            className={`mt-2 text-2xl font-bold font-mono tabular-nums ${
              netProfit >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatRupiah(netProfit)}
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 block">
            Net Margin: <strong>{marginPercent.toFixed(1)}%</strong>
          </span>
        </div>
      </div>

      {/* Visualisasi Data Tren Bulanan Menggunakan Recharts */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4 print:border-slate-300 print:shadow-none print:break-inside-avoid">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Visualisasi Tren Pendapatan, Pengeluaran & Laba Bulanan ({selectedYear})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grafik interaktif Recharts untuk memantau fluktuasi arus kas dan profitabilitas per bulan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800 text-xs">
              <button
                onClick={() => setChartType('bar')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                  chartType === 'bar'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Diagram Batang</span>
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                  chartType === 'area'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <LineChartIcon className="h-3.5 w-3.5" />
                <span>Area Tren</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recharts Canvas Container */}
        <div className="w-full h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : `${v}`)}
                />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      const rev = payload.find((p: any) => p.dataKey === 'Pendapatan')?.value || 0;
                      const exp = payload.find((p: any) => p.dataKey === 'Pengeluaran')?.value || 0;
                      const net = rev - exp;
                      const margin = rev > 0 ? (net / rev) * 100 : 0;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95 text-xs space-y-1.5 min-w-[210px]">
                          <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-1.5 dark:border-slate-800 flex justify-between items-center">
                            <span>Bulan {label} {selectedYear}</span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                net >= 0
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                            >
                              Margin: {margin.toFixed(0)}%
                            </span>
                          </div>
                          <div className="space-y-1 font-mono pt-0.5">
                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                              <span>Pendapatan:</span>
                              <span className="font-semibold">{formatRupiah(rev)}</span>
                            </div>
                            <div className="flex justify-between text-rose-600 dark:text-rose-400">
                              <span>Pengeluaran:</span>
                              <span className="font-semibold">{formatRupiah(exp)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1 font-bold text-slate-900 dark:text-white">
                              <span>Laba Bersih:</span>
                              <span className={net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}>
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
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="Pendapatan" fill="#10b981" radius={[4, 4, 0, 0]} name="Pendapatan (Inflow)" />
                <Bar dataKey="Pengeluaran" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Pengeluaran (Outflow)" />
                <Line
                  type="monotone"
                  dataKey="LabaBersih"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  name="Laba Bersih (Net Profit)"
                />
              </BarChart>
            ) : (
              <AreaChart data={monthlyChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="plColorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="plColorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : `${v}`)}
                />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      const rev = payload.find((p: any) => p.dataKey === 'Pendapatan')?.value || 0;
                      const exp = payload.find((p: any) => p.dataKey === 'Pengeluaran')?.value || 0;
                      const net = rev - exp;
                      const margin = rev > 0 ? (net / rev) * 100 : 0;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95 text-xs space-y-1.5 min-w-[210px]">
                          <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-1.5 dark:border-slate-800 flex justify-between items-center">
                            <span>Bulan {label} {selectedYear}</span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                net >= 0
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                            >
                              Margin: {margin.toFixed(0)}%
                            </span>
                          </div>
                          <div className="space-y-1 font-mono pt-0.5">
                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                              <span>Pendapatan:</span>
                              <span className="font-semibold">{formatRupiah(rev)}</span>
                            </div>
                            <div className="flex justify-between text-rose-600 dark:text-rose-400">
                              <span>Pengeluaran:</span>
                              <span className="font-semibold">{formatRupiah(exp)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1 font-bold text-slate-900 dark:text-white">
                              <span>Laba Bersih:</span>
                              <span className={net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}>
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
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Area
                  type="monotone"
                  dataKey="Pendapatan"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#plColorRev)"
                  name="Pendapatan (Inflow)"
                />
                <Area
                  type="monotone"
                  dataKey="Pengeluaran"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#plColorExp)"
                  name="Pengeluaran (Outflow)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Income Statement Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden p-6">
        <div className="border-b-2 border-slate-900 pb-4 dark:border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Laporan Laba Rugi Komprehensif
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              PT Nusantara Retail Group · Cabang:{' '}
              {activeStoreId === 'ALL'
                ? 'Konsolidasi Seluruh Cabang'
                : stores.find((s) => s.Store_ID === activeStoreId)?.Store_Name}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            Periode:{' '}
            <strong>
              {selectedMonth === 'ALL'
                ? `Tahun ${selectedYear} (YTD)`
                : formatPeriod(selectedMonth, selectedYear)}
            </strong>
          </div>
        </div>

        {/* Section 1: Revenue */}
        <div className="mt-6">
          <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200 uppercase tracking-wider rounded-md">
            1. PENDAPATAN OPERASIONAL (REVENUE)
          </div>
          <table className="w-full text-xs mt-2">
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {revenues.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-3 px-4 text-slate-400 italic">
                    Belum ada data pendapatan pada periode ini.
                  </td>
                </tr>
              ) : (
                revenues.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                      {item.category}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-white">
                      {formatRupiah(item.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-bold bg-slate-50/50 dark:bg-slate-800/30">
                <td className="py-3 px-4 text-slate-900 dark:text-white">
                  TOTAL PENDAPATAN OPERASIONAL
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatRupiah(totalRevenue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Section 2: Operating Expenses */}
        <div className="mt-8">
          <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200 uppercase tracking-wider rounded-md">
            2. BEBAN USAHA & OPERASIONAL (OPERATING EXPENSES)
          </div>
          <table className="w-full text-xs mt-2">
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-3 px-4 text-slate-400 italic">
                    Belum ada data pengeluaran pada periode ini.
                  </td>
                </tr>
              ) : (
                expenses.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                      {item.category}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-rose-600 dark:text-rose-400">
                      {formatRupiah(item.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-bold bg-slate-50/50 dark:bg-slate-800/30">
                <td className="py-3 px-4 text-slate-900 dark:text-white">
                  TOTAL BEBAN USAHA
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400 text-sm">
                  {formatRupiah(totalExpense)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Section 3: Bottom Line Net Income */}
        <div className="mt-8 rounded-lg border-2 border-slate-800 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                LABA / (RUGI) BERSIH OPERASIONAL (NET PROFIT)
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Formula: Total Pendapatan Operasional - Total Beban Usaha
              </span>
            </div>
            <div className="text-right">
              <span
                className={`text-2xl font-bold font-mono tabular-nums ${
                  netProfit >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatRupiah(netProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Store Comparison Matrix (When Consolidated View is Active) */}
      {activeStoreId === 'ALL' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Matriks Kinerja Laba Rugi per Cabang Toko
            </h3>
            <p className="text-xs text-slate-500">
              Perbandingan kontribusi omzet dan profitabilitas antar toko
            </p>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Nama Toko & ID</th>
                  <th className="px-4 py-2.5">Manager</th>
                  <th className="px-4 py-2.5 text-right">Pendapatan</th>
                  <th className="px-4 py-2.5 text-right">Pengeluaran</th>
                  <th className="px-4 py-2.5 text-right">Laba Bersih</th>
                  <th className="px-4 py-2.5 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {storeMatrix.map((item) => (
                  <tr key={item.store.Store_ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {item.store.Store_Name}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {item.store.Store_ID}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {item.store.Manager_Name}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatRupiah(item.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400 font-medium">
                      {formatRupiah(item.expense)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono tabular-nums font-bold ${
                        item.profit >= 0
                          ? 'text-slate-900 dark:text-white'
                          : 'text-rose-600'
                      }`}
                    >
                      {formatRupiah(item.profit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 font-semibold">
                      {item.margin.toFixed(1)}%
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
