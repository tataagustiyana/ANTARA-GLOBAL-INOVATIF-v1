import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  DollarSign,
  Download,
  Edit2,
  FileSpreadsheet,
  Filter,
  Plus,
  Sliders,
  Store as StoreIcon,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { StorageService } from '../services/storageService';
import { ChartOfAccount, Store, StoreBudget, Transaction, User } from '../types';
import { formatPeriod, formatRupiah } from '../utils/formatters';

interface BudgetViewProps {
  stores: Store[];
  activeStoreId: string;
  transactions: Transaction[];
  chartOfAccounts: ChartOfAccount[];
  budgets: StoreBudget[];
  currentUser: User;
  onSaveBudget: (budget: StoreBudget) => Promise<void>;
}

export const BudgetView: React.FC<BudgetViewProps> = ({
  stores,
  activeStoreId,
  transactions,
  chartOfAccounts,
  budgets,
  currentUser,
  onSaveBudget,
}) => {
  const isEmployee = currentUser.Role === 'Employee';

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  // Modal setup
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formStoreId, setFormStoreId] = useState(
    activeStoreId === 'ALL' ? (stores[0]?.Store_ID || 'STR-001') : activeStoreId
  );
  const [formTargetOmset, setFormTargetOmset] = useState<number | ''>('');
  const [formCategoryBudgets, setFormCategoryBudgets] = useState<Record<string, number>>({});
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expense COA accounts
  const expenseAccounts = useMemo(() => {
    return chartOfAccounts.filter((c) => c.Category === 'Expense');
  }, [chartOfAccounts]);

  // Actual Transactions for Selected Period
  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.Status !== 'Approved' || !t.Date) return false;
      const [yStr, mStr] = t.Date.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      return y === selectedYear && m === selectedMonth;
    });
  }, [transactions, selectedYear, selectedMonth]);

  // Active Store Budget for Selected Period
  const activeBudget = useMemo(() => {
    if (activeStoreId === 'ALL') {
      // Aggregate across all stores
      const storeBudgets = budgets.filter(
        (b) => b.Period_Month === selectedMonth && b.Period_Year === selectedYear
      );
      const revTarget = storeBudgets.reduce((sum, b) => sum + (b.Revenue_Target || 0), 0);
      const expBudget = storeBudgets.reduce((sum, b) => sum + (b.Total_Expense_Budget || 0), 0);

      const catMap: Record<string, number> = {};
      storeBudgets.forEach((b) => {
        if (b.Category_Budgets) {
          Object.entries(b.Category_Budgets).forEach(([code, amt]) => {
            catMap[code] = (catMap[code] || 0) + amt;
          });
        }
      });

      return {
        Budget_ID: `BGT-AGG-${selectedYear}${selectedMonth}`,
        Store_ID: 'ALL',
        Period_Month: selectedMonth,
        Period_Year: selectedYear,
        Revenue_Target: revTarget,
        Total_Expense_Budget: expBudget,
        Category_Budgets: catMap,
        Notes: 'Konsolidasi Seluruh Cabang Toko',
      } as StoreBudget;
    }

    return (
      budgets.find(
        (b) =>
          b.Store_ID === activeStoreId &&
          b.Period_Month === selectedMonth &&
          b.Period_Year === selectedYear
      ) || null
    );
  }, [budgets, activeStoreId, selectedMonth, selectedYear]);

  // Realized Revenue (Actual Omset)
  const actualRevenue = useMemo(() => {
    return periodTransactions
      .filter((t) => {
        if (activeStoreId !== 'ALL' && t.Store_ID !== activeStoreId) return false;
        return t.Type === 'Pemasukan';
      })
      .reduce((sum, t) => sum + t.Amount, 0);
  }, [periodTransactions, activeStoreId]);

  // Realized Total Expense
  const actualTotalExpense = useMemo(() => {
    return periodTransactions
      .filter((t) => {
        if (activeStoreId !== 'ALL' && t.Store_ID !== activeStoreId) return false;
        return t.Type === 'Pengeluaran';
      })
      .reduce((sum, t) => sum + t.Amount, 0);
  }, [periodTransactions, activeStoreId]);

  // Realized Expense per Account Code
  const actualExpenseByCat = useMemo(() => {
    const map: Record<string, number> = {};
    periodTransactions
      .filter((t) => {
        if (activeStoreId !== 'ALL' && t.Store_ID !== activeStoreId) return false;
        return t.Type === 'Pengeluaran';
      })
      .forEach((t) => {
        const code = t.Category.split('-')[0]?.trim();
        if (code) {
          map[code] = (map[code] || 0) + t.Amount;
        }
      });
    return map;
  }, [periodTransactions, activeStoreId]);

  // Calculations
  const revenueTarget = activeBudget?.Revenue_Target || 0;
  const revenueAchievedPercent = revenueTarget > 0 ? (actualRevenue / revenueTarget) * 100 : 0;
  const revenueShortfall = Math.max(revenueTarget - actualRevenue, 0);

  const totalExpenseBudget = activeBudget?.Total_Expense_Budget || 0;
  const expenseUsedPercent =
    totalExpenseBudget > 0 ? (actualTotalExpense / totalExpenseBudget) * 100 : 0;
  const remainingBudget = totalExpenseBudget - actualTotalExpense;
  const isOverbudget = remainingBudget < 0 && totalExpenseBudget > 0;

  // Open Edit / Create Budget Modal
  const handleOpenSetupModal = (storeIdToEdit?: string) => {
    const targetStore = storeIdToEdit || (activeStoreId === 'ALL' ? (stores[0]?.Store_ID || 'STR-001') : activeStoreId);
    setFormStoreId(targetStore);

    const existing = budgets.find(
      (b) =>
        b.Store_ID === targetStore &&
        b.Period_Month === selectedMonth &&
        b.Period_Year === selectedYear
    );

    if (existing) {
      setFormTargetOmset(existing.Revenue_Target);
      setFormCategoryBudgets(existing.Category_Budgets || {});
      setFormNotes(existing.Notes || '');
    } else {
      setFormTargetOmset('');
      const defaultCats: Record<string, number> = {};
      expenseAccounts.forEach((c) => {
        defaultCats[c.Account_Code] = 0;
      });
      setFormCategoryBudgets(defaultCats);
      setFormNotes('');
    }

    setIsModalOpen(true);
  };

  // Copy Budget from Previous Month
  const handleCopyFromLastMonth = async () => {
    const lastMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const lastYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

    const previousBudgets = budgets.filter(
      (b) => b.Period_Month === lastMonth && b.Period_Year === lastYear
    );

    if (previousBudgets.length === 0) {
      alert(`Tidak ada data anggaran pada bulan ${formatPeriod(lastMonth, lastYear)} untuk disalin.`);
      return;
    }

    if (
      !confirm(
        `Salin target omset dan pagu anggaran dari ${formatPeriod(
          lastMonth,
          lastYear
        )} ke ${formatPeriod(selectedMonth, selectedYear)}?`
      )
    ) {
      return;
    }

    let copiedCount = 0;
    for (const prev of previousBudgets) {
      const budgetId = `BGT-${selectedYear}${String(selectedMonth).padStart(2, '0')}-${prev.Store_ID}`;
      const newBudget: StoreBudget = {
        Budget_ID: budgetId,
        Store_ID: prev.Store_ID,
        Period_Month: selectedMonth,
        Period_Year: selectedYear,
        Revenue_Target: prev.Revenue_Target,
        Total_Expense_Budget: prev.Total_Expense_Budget,
        Category_Budgets: { ...(prev.Category_Budgets || {}) },
        Notes: `Disalin dari periode ${formatPeriod(lastMonth, lastYear)}`,
        Updated_At: new Date().toISOString().split('T')[0],
      };
      await onSaveBudget(newBudget);
      copiedCount++;
    }

    alert(`Berhasil menyalin target dan anggaran untuk ${copiedCount} cabang toko!`);
  };

  // Save Budget Modal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStoreId) return;

    setIsSubmitting(true);
    try {
      const totalExpBudget = Object.values(formCategoryBudgets).reduce(
        (sum, val) => sum + (Number(val) || 0),
        0
      );

      const budgetId = `BGT-${selectedYear}${String(selectedMonth).padStart(2, '0')}-${formStoreId}`;

      const newBudget: StoreBudget = {
        Budget_ID: budgetId,
        Store_ID: formStoreId,
        Period_Month: selectedMonth,
        Period_Year: selectedYear,
        Revenue_Target: Number(formTargetOmset) || 0,
        Total_Expense_Budget: totalExpBudget,
        Category_Budgets: formCategoryBudgets,
        Notes: formNotes.trim(),
        Updated_At: new Date().toISOString().split('T')[0],
      };

      await onSaveBudget(newBudget);
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export report to Excel
  const handleExportExcel = () => {
    const headers = [
      'Kode Akun',
      'Nama Akun Kategori',
      'Pagu Anggaran (Rp)',
      'Realisasi Beban (Rp)',
      'Sisa Anggaran (Rp)',
      'Persentase Terpakai',
      'Status Kepatuhan',
    ];
    const rows = expenseAccounts.map((acc) => {
      const bgt = activeBudget?.Category_Budgets?.[acc.Account_Code] || 0;
      const act = actualExpenseByCat[acc.Account_Code] || 0;
      const rem = bgt - act;
      const pct = bgt > 0 ? ((act / bgt) * 100).toFixed(1) + '%' : '0%';
      const status = bgt === 0 ? 'Tanpa Pagu' : rem < 0 ? 'Overbudget' : rem / bgt < 0.2 ? 'Waspada' : 'Aman';
      return [acc.Account_Code, acc.Account_Name, bgt, act, rem, pct, status];
    });

    StorageService.exportToExcel(
      `Pengendalian_Anggaran_${activeStoreId}_${selectedYear}_${selectedMonth}`,
      headers,
      rows,
      'Anggaran'
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Target Omset & Anggaran Pengeluaran
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Perencanaan target penjualan dan kontrol pagu anggaran operasional per cabang toko
          </p>
        </div>

        {!isEmployee && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 shadow-2xs transition-colors cursor-pointer"
              title="Ekspor laporan anggaran ke format Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
            <button
              onClick={handleCopyFromLastMonth}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition-colors"
              title="Salin target dari bulan sebelumnya"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Salin Bulan Lalu</span>
            </button>
            <button
              onClick={() => handleOpenSetupModal()}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors"
            >
              <Sliders className="h-4 w-4" />
              <span>Atur Target & Pagu Anggaran</span>
            </button>
          </div>
        )}
      </div>

      {/* Period Selector Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Bulan Periode
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
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
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Tahun
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
        </div>

        <div className="flex flex-col justify-center px-1">
          <span className="text-[11px] text-slate-400">Lingkup Toko Terpilih:</span>
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {activeStoreId === 'ALL'
              ? 'Konsolidasi Seluruh Cabang Toko'
              : stores.find((s) => s.Store_ID === activeStoreId)?.Store_Name || activeStoreId}
          </span>
          <span className="text-[10px] text-slate-500">
            {activeBudget ? 'Pagu Anggaran Aktif' : 'Belum diatur untuk bulan ini'}
          </span>
        </div>
      </div>

      {/* Overbudget Warning Alert Banner */}
      {isOverbudget && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/40 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-rose-900 dark:text-rose-300">
              Peringatan Anggaran: Realisasi Pengeluaran Melebihi Pagu (Overbudget)!
            </h4>
            <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">
              Total pengeluaran telah melampaui pagu anggaran sebesar{' '}
              <strong>{formatRupiah(Math.abs(remainingBudget))}</strong> ({expenseUsedPercent.toFixed(1)}% terpakai).
              Segera evaluasi beban operasional toko untuk mencegah pembengkakan defisit.
            </p>
          </div>
        </div>
      )}

      {/* Top 3 Strategic Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Target Omset vs Realisasi */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              1. Target Omset (Penjualan)
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Target className="h-4 w-4" />
            </div>
          </div>

          <div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {formatRupiah(actualRevenue)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
              <span>Target: {formatRupiah(revenueTarget)}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {revenueAchievedPercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  revenueAchievedPercent >= 100
                    ? 'bg-emerald-500'
                    : revenueAchievedPercent >= 70
                    ? 'bg-emerald-600'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(revenueAchievedPercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>
                {revenueShortfall > 0
                  ? `Sisa Target: ${formatRupiah(revenueShortfall)}`
                  : 'Target Bulan Ini Tercapai! 🎉'}
              </span>
              <span
                className={`font-medium ${
                  revenueAchievedPercent >= 100
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500'
                }`}
              >
                {revenueAchievedPercent >= 100 ? 'Tercapai' : 'Sedang Berjalan'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Pagu Anggaran Beban vs Realisasi */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              2. Pengendalian Anggaran Beban
            </span>
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                isOverbudget
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
              }`}
            >
              <Wallet className="h-4 w-4" />
            </div>
          </div>

          <div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {formatRupiah(actualTotalExpense)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
              <span>Pagu: {formatRupiah(totalExpenseBudget)}</span>
              <span
                className={`font-bold font-mono ${
                  isOverbudget ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {expenseUsedPercent.toFixed(1)}% Terpakai
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverbudget
                    ? 'bg-rose-600'
                    : expenseUsedPercent > 80
                    ? 'bg-amber-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(expenseUsedPercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px]">
              <span
                className={
                  isOverbudget
                    ? 'text-rose-600 font-semibold dark:text-rose-400'
                    : 'text-slate-500'
                }
              >
                {isOverbudget
                  ? `Overbudget: ${formatRupiah(Math.abs(remainingBudget))}`
                  : `Sisa Pagu: ${formatRupiah(remainingBudget)}`}
              </span>
              <span
                className={`font-semibold ${
                  isOverbudget
                    ? 'text-rose-600 dark:text-rose-400'
                    : expenseUsedPercent > 80
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {isOverbudget ? 'Overbudget' : expenseUsedPercent > 80 ? 'Waspada' : 'Aman'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Proyeksi Laba Bersih Operasional */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              3. Target vs Realisasi Laba
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>

          <div>
            <div
              className={`text-2xl font-bold font-mono tabular-nums ${
                actualRevenue - actualTotalExpense >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatRupiah(actualRevenue - actualTotalExpense)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
              <span>Target Laba: {formatRupiah(revenueTarget - totalExpenseBudget)}</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Realisasi Laba
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            {actualRevenue - actualTotalExpense >= revenueTarget - totalExpenseBudget ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Profit melebihi proyeksi target anggaran!</span>
              </span>
            ) : (
              <span className="text-slate-500 flex items-center gap-1">
                <span>Performa operasional masih dalam batas wajar.</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Category Budget Breakdown Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Pengendalian Anggaran Beban Operasional per Kategori
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Perbandingan pagu anggaran dengan realisasi pengeluaran riil bulan berjalan
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Periode: <strong>{formatPeriod(selectedMonth, selectedYear)}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Kode & Nama Akun Pengeluaran</th>
                <th className="px-6 py-3 text-right">Pagu Anggaran</th>
                <th className="px-6 py-3 text-right">Realisasi Beban</th>
                <th className="px-6 py-3 text-right">Sisa Pagu</th>
                <th className="px-6 py-3 w-48 text-center">% Pemakaian</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {expenseAccounts.map((acc) => {
                const bgt = activeBudget?.Category_Budgets?.[acc.Account_Code] || 0;
                const act = actualExpenseByCat[acc.Account_Code] || 0;
                const rem = bgt - act;
                const pct = bgt > 0 ? (act / bgt) * 100 : 0;
                const isCatOver = bgt > 0 && rem < 0;
                const isCatWarning = bgt > 0 && pct >= 80 && pct <= 100;

                return (
                  <tr
                    key={acc.Account_Code}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {acc.Account_Name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {acc.Account_Code} · Beban Operasional
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-white">
                      {bgt > 0 ? formatRupiah(bgt) : <span className="text-slate-400 italic">Belum diatur</span>}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400 font-semibold">
                      {formatRupiah(act)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono tabular-nums font-semibold">
                      <span className={isCatOver ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}>
                        {formatRupiah(rem)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>{pct.toFixed(0)}%</span>
                          <span>{bgt > 0 ? formatRupiah(bgt) : '-'}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isCatOver
                                ? 'bg-rose-600'
                                : isCatWarning
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          bgt === 0
                            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                            : isCatOver
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            : isCatWarning
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        }`}
                      >
                        {bgt === 0 ? 'Tanpa Pagu' : isCatOver ? 'Overbudget' : isCatWarning ? 'Waspada' : 'Aman'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-xs dark:border-slate-700 dark:bg-slate-800/50">
                <td className="px-6 py-3 text-slate-900 dark:text-white">
                  TOTAL PAGU & BEBAN OPERASIONAL
                </td>
                <td className="px-6 py-3 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatRupiah(totalExpenseBudget)}
                </td>
                <td className="px-6 py-3 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                  {formatRupiah(actualTotalExpense)}
                </td>
                <td className="px-6 py-3 text-right font-mono tabular-nums">
                  <span className={isOverbudget ? 'text-rose-600' : 'text-slate-900 dark:text-white'}>
                    {formatRupiah(remainingBudget)}
                  </span>
                </td>
                <td className="px-6 py-3 text-center font-mono">
                  {expenseUsedPercent.toFixed(1)}% Terpakai
                </td>
                <td className="px-6 py-3 text-center">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                      isOverbudget
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {isOverbudget ? 'Overbudget' : 'Terkendali'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Multi-Store Comparison Matrix (When Consolidated View is Active) */}
      {activeStoreId === 'ALL' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-3 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Matriks Target & Anggaran per Toko Cabang
              </h3>
              <p className="text-xs text-slate-500">
                Perbandingan pencapaian target penjualan dan kepatuhan anggaran beban tiap toko
              </p>
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Nama Toko & ID</th>
                  <th className="px-4 py-2.5 text-right">Target Omset</th>
                  <th className="px-4 py-2.5 text-right">Realisasi Omset</th>
                  <th className="px-4 py-2.5 text-center">% Capai Omset</th>
                  <th className="px-4 py-2.5 text-right">Pagu Beban</th>
                  <th className="px-4 py-2.5 text-right">Realisasi Beban</th>
                  <th className="px-4 py-2.5 text-center">% Pakai Beban</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stores.map((s) => {
                  const sBudget = budgets.find(
                    (b) =>
                      b.Store_ID === s.Store_ID &&
                      b.Period_Month === selectedMonth &&
                      b.Period_Year === selectedYear
                  );

                  const sTrx = periodTransactions.filter((t) => t.Store_ID === s.Store_ID);
                  const sRev = sTrx.filter((t) => t.Type === 'Pemasukan').reduce((sum, t) => sum + t.Amount, 0);
                  const sExp = sTrx.filter((t) => t.Type === 'Pengeluaran').reduce((sum, t) => sum + t.Amount, 0);

                  const targetOmset = sBudget?.Revenue_Target || 0;
                  const revPct = targetOmset > 0 ? (sRev / targetOmset) * 100 : 0;
                  const paguBeban = sBudget?.Total_Expense_Budget || 0;
                  const expPct = paguBeban > 0 ? (sExp / paguBeban) * 100 : 0;

                  return (
                    <tr key={s.Store_ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {s.Store_Name}
                        </div>
                        <div className="text-[10px] text-slate-400">{s.Store_ID} · {s.Manager_Name}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {formatRupiah(targetOmset)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatRupiah(sRev)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block font-mono font-bold ${
                            revPct >= 100
                              ? 'text-emerald-600'
                              : revPct >= 70
                              ? 'text-blue-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {revPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {formatRupiah(paguBeban)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400 font-semibold">
                        {formatRupiah(sExp)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block font-mono font-bold ${
                            expPct > 100
                              ? 'text-rose-600'
                              : expPct > 80
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {expPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenSetupModal(s.Store_ID)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                          title="Atur target toko ini"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Setup Target & Category Budgets */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 my-8 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Atur Target Omset & Pagu Anggaran
                </h3>
                <p className="text-xs text-slate-500">
                  Periode: {formatPeriod(selectedMonth, selectedYear)}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Cabang Toko
                </label>
                <select
                  value={formStoreId}
                  onChange={(e) => {
                    const stId = e.target.value;
                    setFormStoreId(stId);
                    const exist = budgets.find(
                      (b) =>
                        b.Store_ID === stId &&
                        b.Period_Month === selectedMonth &&
                        b.Period_Year === selectedYear
                    );
                    if (exist) {
                      setFormTargetOmset(exist.Revenue_Target);
                      setFormCategoryBudgets(exist.Category_Budgets || {});
                      setFormNotes(exist.Notes || '');
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {stores.map((s) => (
                    <option key={s.Store_ID} value={s.Store_ID}>
                      {s.Store_Name} ({s.Store_ID})
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Omset */}
              <div className="rounded-lg bg-emerald-50/60 border border-emerald-200 p-4 dark:bg-emerald-950/30 dark:border-emerald-900/50">
                <label className="block font-bold text-emerald-900 dark:text-emerald-300 text-xs uppercase tracking-wider">
                  Target Omset Penjualan Bulanan (Rp)
                </label>
                <input
                  type="number"
                  value={formTargetOmset}
                  onChange={(e) =>
                    setFormTargetOmset(e.target.value ? Number(e.target.value) : '')
                  }
                  placeholder="Misal: 50000000"
                  min="0"
                  required
                  className="mt-1.5 w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 font-mono text-sm font-semibold text-slate-900 dark:border-emerald-800 dark:bg-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 mt-1">
                  Target pendapatan kotor yang ingin dicapai toko pada bulan ini.
                </span>
              </div>

              {/* Pagu Anggaran per Kategori Akun */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] mb-2">
                  Alokasi Pagu Anggaran Beban per Kategori:
                </label>
                <div className="space-y-2.5">
                  {expenseAccounts.map((acc) => {
                    const currentVal = formCategoryBudgets[acc.Account_Code] || 0;
                    return (
                      <div
                        key={acc.Account_Code}
                        className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800"
                      >
                        <div className="flex-1">
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {acc.Account_Name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {acc.Account_Code}
                          </span>
                        </div>
                        <div className="w-44">
                          <input
                            type="number"
                            value={currentVal === 0 ? '' : currentVal}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : 0;
                              setFormCategoryBudgets((prev) => ({
                                ...prev,
                                [acc.Account_Code]: val,
                              }));
                            }}
                            placeholder="Rp 0"
                            min="0"
                            className="w-full text-right rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Pagu Calculation */}
              <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold">
                <span className="text-slate-800 dark:text-slate-200">
                  Total Pagu Anggaran Pengeluaran:
                </span>
                <span className="font-mono text-sm text-rose-600 dark:text-rose-400">
                  {formatRupiah(
                    Object.values(formCategoryBudgets).reduce((sum, v) => sum + (Number(v) || 0), 0)
                  )}
                </span>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Catatan Strategi & Target
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Misal: Penyesuaian promosi weekend dan target efisiensi utilitas..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Target & Anggaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
