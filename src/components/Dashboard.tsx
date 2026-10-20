import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  Banknote,
  BarChart2,
  BellRing,
  Building2,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Coins,
  CreditCard,
  DollarSign,
  FileDown,
  FileSpreadsheet,
  FileText,
  HandCoins,
  Landmark,
  Package,
  Percent,
  PlusCircle,
  QrCode,
  Radio,
  Repeat,
  ShieldAlert,
  Sparkles,
  Store as StoreIcon,
  Target,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
  ChartOfAccount,
  CompanyProfile,
  Employee,
  EmployeeLoan,
  LiveActivity,
  MDRRateSetting,
  PayrollRun,
  PurchaseOrder,
  Store,
  StoreBudget,
  SupplierDebt,
  Transaction,
  User,
} from '../types';
import { formatDate, formatJoinDate, formatPeriod, formatRupiah, formatTenure } from '../utils/formatters';
import { exportFinancialSummaryPdf } from '../utils/pdfGenerator';
import { getMDRConfig } from '../utils/mdrHelpers';
import { StorageService } from '../services/storageService';
import { PLAnalysisSection } from './PLAnalysisSection';
import { renderPaymentMethodBadge } from './TransactionsView';

interface DashboardProps {
  stores: Store[];
  activeStoreId: string;
  transactions: Transaction[];
  employees: Employee[];
  payrollRuns: PayrollRun[];
  chartOfAccounts: ChartOfAccount[];
  budgets: StoreBudget[];
  currentUser: User;
  companyProfile?: CompanyProfile;
  employeeLoans?: EmployeeLoan[];
  supplierDebts?: SupplierDebt[];
  purchaseOrders?: PurchaseOrder[];
  liveActivities?: LiveActivity[];
  mdrSettings?: MDRRateSetting[];
  onNavigateTab: (tab: any) => void;
  onOpenNewTransactionModal: (
    type?: 'Pemasukan' | 'Pengeluaran' | 'Transfer' | 'Transfer_Cash_To_Bank' | 'Transfer_Bank_To_Cash'
  ) => void;
  onOpenPayslipModal: (payroll: PayrollRun) => void;
  onSelectStore?: (storeId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stores,
  activeStoreId,
  transactions,
  employees,
  payrollRuns,
  chartOfAccounts,
  budgets,
  currentUser,
  companyProfile,
  employeeLoans = [],
  supplierDebts = [],
  purchaseOrders = [],
  liveActivities = [],
  mdrSettings = [],
  onNavigateTab,
  onOpenNewTransactionModal,
  onOpenPayslipModal,
  onSelectStore,
}) => {
  const isEmployee = currentUser.Role === 'Employee';
  const [isAlertCollapsed, setIsAlertCollapsed] = useState<boolean>(false);

  // Current year & month selection state
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>(now.getMonth() + 1);

  const currentYear = selectedYear;
  const currentMonth = typeof selectedMonth === 'number' ? selectedMonth : now.getMonth() + 1;

  // Filter transactions by store
  const filteredTransactions = useMemo(() => {
    if (activeStoreId === 'ALL') return transactions;
    return transactions.filter(
      (t) => t.Store_ID === activeStoreId || t.Destination_Store_ID === activeStoreId
    );
  }, [transactions, activeStoreId]);

  // Current Month / Period Financials
  const currentMonthTransactions = useMemo(() => {
    return filteredTransactions.filter((t) => {
      if (!t.Date) return false;
      const [y, m] = t.Date.split('-');
      const yNum = parseInt(y, 10);
      const mNum = parseInt(m, 10);
      if (yNum !== selectedYear) return false;
      if (selectedMonth !== 'ALL' && mNum !== selectedMonth) return false;
      return true;
    });
  }, [filteredTransactions, selectedYear, selectedMonth]);

  // Income, Expense, Net Profit
  const totalRevenue = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.Type === 'Pemasukan' && t.Status === 'Approved')
      .reduce((sum, t) => sum + (t.Amount || 0), 0);
  }, [currentMonthTransactions]);

  const totalExpense = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.Type === 'Pengeluaran' && t.Status === 'Approved')
      .reduce((sum, t) => sum + (t.Amount || 0), 0);
  }, [currentMonthTransactions]);

  const netProfit = totalRevenue - totalExpense;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // View state for Cash & Bank Liquidity section
  const [cashBankViewMode, setCashBankViewMode] = useState<'cumulative' | 'month'>('cumulative');
  const [showChannelBreakdown, setShowChannelBreakdown] = useState<boolean>(false);

  // Helper fungsi untuk mendeteksi apakah metode pembayaran adalah Tunai (Cash)
  const isCashMethod = (method: string = '') => {
    const m = (method || '').toLowerCase().trim();
    return m === 'cash' || m.includes('tunai');
  };

  // Kalkulasi Lengkap Posisi Uang Tunai vs Non-Tunai (Bank)
  const cashAndBankMetrics = useMemo(() => {
    const approvedTrxs = filteredTransactions.filter((t) => t.Status === 'Approved');

    // 1. Saldo Riil Kumulatif (Keseluruhan Uang Tunai & Rekening Bank)
    let cumulativeCashBalance = 0;
    let cumulativeBankBalance = 0;

    // 2. Arus Kas Bulan Berjalan
    let currentMonthCashIn = 0;
    let currentMonthCashOut = 0;
    let currentMonthBankInNet = 0;
    let currentMonthBankInGross = 0;
    let currentMonthBankOut = 0;
    let currentMonthMDRTotal = 0;

    // Counter Transaksi Bulan Ini
    let currentMonthCashTrxCount = 0;
    let currentMonthBankTrxCount = 0;

    // 3. Rincian per Saluran Non-Tunai Bulan Ini
    const channelStats: Record<
      string,
      { label: string; inNet: number; inGross: number; mdr: number; out: number; count: number }
    > = {
      qris: { label: 'QRIS (Scan Merchant)', inNet: 0, inGross: 0, mdr: 0, out: 0, count: 0 },
      debit_bca: { label: 'Debit Bank BCA (EDC On-Us)', inNet: 0, inGross: 0, mdr: 0, out: 0, count: 0 },
      debit_lain: { label: 'Debit Bank Lain (EDC Off-Us)', inNet: 0, inGross: 0, mdr: 0, out: 0, count: 0 },
      transfer: { label: 'Bank Transfer (Rekening)', inNet: 0, inGross: 0, mdr: 0, out: 0, count: 0 },
      ewallet: { label: 'E-Wallet / Dompet Digital', inNet: 0, inGross: 0, mdr: 0, out: 0, count: 0 },
      other: { label: 'Saluran Lainnya', inNet: 0, inGross: 0, mdr: 0, out: 0, count: 0 },
    };

    const getChannelKey = (method: string = '') => {
      const p = method.toLowerCase();
      if (p.includes('qris')) return 'qris';
      if (p.includes('bca')) return 'debit_bca';
      if (p.includes('debit')) return 'debit_lain';
      if (p.includes('transfer')) return 'transfer';
      if (p.includes('wallet')) return 'ewallet';
      return 'other';
    };

    approvedTrxs.forEach((t) => {
      const isCash = isCashMethod(t.Payment_Method);
      const isThisMonth = t.Date
        ? (() => {
            const [y, m] = t.Date.split('-');
            const yNum = parseInt(y, 10);
            const mNum = parseInt(m, 10);
            return yNum === selectedYear && (selectedMonth === 'ALL' || mNum === selectedMonth);
          })()
        : false;

      const gross = t.Gross_Amount || t.Amount || 0;
      const net = typeof t.Net_Amount === 'number' ? t.Net_Amount : (t.Amount || 0);
      const mdr = t.MDR_Fee || (gross > net ? gross - net : 0);
      const chKey = getChannelKey(t.Payment_Method);

      if (t.Type === 'Pemasukan') {
        if (isCash) {
          cumulativeCashBalance += t.Amount;
          if (isThisMonth) {
            currentMonthCashIn += t.Amount;
            currentMonthCashTrxCount += 1;
          }
        } else {
          // Uang yang riil masuk rekening bank adalah Netto (setelah potongan MDR)
          cumulativeBankBalance += net;
          if (isThisMonth) {
            currentMonthBankInNet += net;
            currentMonthBankInGross += gross;
            currentMonthMDRTotal += mdr;
            currentMonthBankTrxCount += 1;
            if (channelStats[chKey]) {
              channelStats[chKey].inNet += net;
              channelStats[chKey].inGross += gross;
              channelStats[chKey].mdr += mdr;
              channelStats[chKey].count += 1;
            }
          }
        }
      } else if (t.Type === 'Pengeluaran') {
        const isMdrExpense = t.Category?.includes('5-111') || Boolean(t.MDR_Expense_Ref && !isCash);

        if (isCash) {
          cumulativeCashBalance -= t.Amount;
          if (isThisMonth) {
            currentMonthCashOut += t.Amount;
            currentMonthCashTrxCount += 1;
          }
        } else {
          // Hanya kurangi saldo riil bank jika bukan pencatatan beban MDR otomatis (karena pemasukan non-tunai sudah dicatat netto)
          if (!isMdrExpense) {
            cumulativeBankBalance -= t.Amount;
          }
          if (isThisMonth) {
            currentMonthBankOut += t.Amount;
            currentMonthBankTrxCount += 1;
            if (channelStats[chKey]) {
              channelStats[chKey].out += t.Amount;
              channelStats[chKey].count += 1;
            }
          }
        }
      } else if (t.Type === 'Transfer') {
        const desc = (t.Description || '').toLowerCase();
        const cat = (t.Category || '').toLowerCase();
        const isDepositToBank =
          t.Transfer_Type === 'CASH_TO_NON_CASH' ||
          desc.includes('setor') ||
          cat.includes('setor') ||
          (t.Source_Payment_Method === 'Cash' && Boolean(t.Destination_Payment_Method && t.Destination_Payment_Method !== 'Cash'));
        const isWithdrawFromBank =
          t.Transfer_Type === 'NON_CASH_TO_CASH' ||
          desc.includes('tarik') ||
          cat.includes('tarik') ||
          (Boolean(t.Source_Payment_Method && t.Source_Payment_Method !== 'Cash') && t.Destination_Payment_Method === 'Cash');

        if (isDepositToBank) {
          // Setor tunai ke rekening bank: Kas fisik berkurang, Saldo bank bertambah
          cumulativeCashBalance -= t.Amount;
          cumulativeBankBalance += t.Amount;
          if (isThisMonth) {
            currentMonthCashOut += t.Amount;
            currentMonthBankInNet += t.Amount;
            currentMonthBankInGross += t.Amount;
          }
        } else if (isWithdrawFromBank) {
          // Tarik tunai dari bank ke kas kecil: Saldo bank berkurang, Kas fisik bertambah
          cumulativeBankBalance -= t.Amount;
          cumulativeCashBalance += t.Amount;
          if (isThisMonth) {
            currentMonthBankOut += t.Amount;
            currentMonthCashIn += t.Amount;
          }
        } else if (activeStoreId !== 'ALL') {
          // Mutasi transfer kas/bank antar cabang
          if (t.Store_ID === activeStoreId) {
            if (isCash) cumulativeCashBalance -= t.Amount;
            else cumulativeBankBalance -= t.Amount;
          }
          if (t.Destination_Store_ID === activeStoreId) {
            if (isCash) cumulativeCashBalance += t.Amount;
            else cumulativeBankBalance += t.Amount;
          }
        }
      }
    });

    const totalLiquidity = cumulativeCashBalance + cumulativeBankBalance;
    const cashShare = totalLiquidity > 0 ? (cumulativeCashBalance / totalLiquidity) * 100 : 0;
    const bankShare = totalLiquidity > 0 ? (cumulativeBankBalance / totalLiquidity) * 100 : 0;

    const currentMonthTotalIn = currentMonthCashIn + currentMonthBankInNet;
    const currentMonthCashShare = currentMonthTotalIn > 0 ? (currentMonthCashIn / currentMonthTotalIn) * 100 : 0;
    const currentMonthBankShare = currentMonthTotalIn > 0 ? (currentMonthBankInNet / currentMonthTotalIn) * 100 : 0;

    return {
      cumulativeCashBalance,
      cumulativeBankBalance,
      totalLiquidity,
      cashShare,
      bankShare,
      currentMonthCashIn,
      currentMonthCashOut,
      currentMonthCashNet: currentMonthCashIn - currentMonthCashOut,
      currentMonthCashTrxCount,
      currentMonthBankInNet,
      currentMonthBankInGross,
      currentMonthBankOut,
      currentMonthBankNet: currentMonthBankInNet - currentMonthBankOut,
      currentMonthBankTrxCount,
      currentMonthMDRTotal,
      currentMonthTotalIn,
      currentMonthCashShare,
      currentMonthBankShare,
      channelStats,
    };
  }, [filteredTransactions, activeStoreId, selectedYear, selectedMonth]);

  // Dynamic MDR Rate Labels from mdrSettings
  const qrisRateLabel = useMemo(() => {
    const cfg = getMDRConfig('Qris', mdrSettings);
    return cfg ? `MDR ${cfg.ratePercent}` : 'MDR 0.7%';
  }, [mdrSettings]);

  const bcaRateLabel = useMemo(() => {
    const cfg = getMDRConfig('Debit bank BCA', mdrSettings);
    return cfg ? `MDR ${cfg.ratePercent}` : 'MDR 0.15%';
  }, [mdrSettings]);

  const debitLainRateLabel = useMemo(() => {
    const cfg = getMDRConfig('Debit Bank Lain', mdrSettings);
    return cfg ? `MDR ${cfg.ratePercent}` : 'MDR 2.0%';
  }, [mdrSettings]);

  // Current Month Payroll Total
  const currentMonthPayrollTotal = useMemo(() => {
    const runs = payrollRuns.filter((p) => {
      const matchStore = activeStoreId === 'ALL' || p.Store_ID === activeStoreId;
      const matchesYear = p.Period_Year === selectedYear;
      const matchesMonth = selectedMonth === 'ALL' || p.Period_Month === selectedMonth;
      return (
        matchStore &&
        matchesYear &&
        matchesMonth &&
        (p.Payment_Status === 'Paid' || p.Payment_Status === 'Approved')
      );
    });
    return runs.reduce((sum, p) => sum + (p.Net_Salary || 0), 0);
  }, [payrollRuns, activeStoreId, selectedYear, selectedMonth]);

  // Active employees count
  const activeEmployeesCount = useMemo(() => {
    return employees.filter(
      (e) => (activeStoreId === 'ALL' || e.Store_ID === activeStoreId) && e.Status === 'Active'
    ).length;
  }, [employees, activeStoreId]);

  // Current Month Budget and Targets
  const currentMonthBudget = useMemo(() => {
    const storeBudgets = budgets.filter(
      (b) =>
        (activeStoreId === 'ALL' || b.Store_ID === activeStoreId) &&
        (selectedMonth === 'ALL' || b.Period_Month === selectedMonth) &&
        b.Period_Year === selectedYear
    );

    const targetOmset = storeBudgets.reduce((sum, b) => sum + (b.Revenue_Target || 0), 0);
    const paguBeban = storeBudgets.reduce((sum, b) => sum + (b.Total_Expense_Budget || 0), 0);

    return {
      targetOmset,
      paguBeban,
      hasBudget: storeBudgets.length > 0,
      count: storeBudgets.length,
    };
  }, [budgets, activeStoreId, selectedMonth, selectedYear]);

  const targetOmsetPercent =
    currentMonthBudget.targetOmset > 0
      ? (totalRevenue / currentMonthBudget.targetOmset) * 100
      : 0;

  const expenseBudgetPercent =
    currentMonthBudget.paguBeban > 0
      ? (totalExpense / currentMonthBudget.paguBeban) * 100
      : 0;

  const remainingBudget = currentMonthBudget.paguBeban - totalExpense;
  const isOverbudget = currentMonthBudget.paguBeban > 0 && remainingBudget < 0;

  // Notifikasi Otomatis Budget: Pantau realisasi pengeluaran seluruh cabang vs pagu bulanan (Ambang Batas >= 90%)
  const branchBudgetAlerts = useMemo(() => {
    return stores
      .map((store) => {
        const storeBudget = budgets.find(
          (b) =>
            b.Store_ID === store.Store_ID &&
            b.Period_Month === currentMonth &&
            b.Period_Year === currentYear
        );

        if (!storeBudget || !storeBudget.Total_Expense_Budget || storeBudget.Total_Expense_Budget <= 0) {
          return null;
        }

        const storeExpenses = transactions
          .filter(
            (t) =>
              t.Store_ID === store.Store_ID &&
              t.Type === 'Pengeluaran' &&
              t.Status === 'Approved' &&
              t.Date?.startsWith(`${currentYear}-${String(currentMonth).padStart(2, '0')}`)
          )
          .reduce((sum, t) => sum + (t.Amount || 0), 0);

        const totalBudget = storeBudget.Total_Expense_Budget;
        const percentUsed = (storeExpenses / totalBudget) * 100;
        const remaining = totalBudget - storeExpenses;
        const isExceeded90 = percentUsed >= 90;
        const isOver100 = percentUsed > 100;

        if (!isExceeded90) return null;

        return {
          store,
          budget: storeBudget,
          actualExpense: storeExpenses,
          totalBudget,
          percentUsed,
          remaining,
          isOver100,
          isActiveStore: activeStoreId === store.Store_ID,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.percentUsed - a.percentUsed);
  }, [stores, budgets, transactions, currentMonth, currentYear, activeStoreId]);

  // Store Breakdown Comparison (for Superadmin or consolidated view)
  const storeComparison = useMemo(() => {
    return stores.map((store) => {
      const storeTrx = transactions.filter(
        (t) =>
          t.Store_ID === store.Store_ID &&
          t.Status === 'Approved' &&
          t.Date?.startsWith(`${currentYear}-${String(currentMonth).padStart(2, '0')}`)
      );
      const inc = storeTrx
        .filter((t) => t.Type === 'Pemasukan')
        .reduce((sum, t) => sum + t.Amount, 0);
      const exp = storeTrx
        .filter((t) => t.Type === 'Pengeluaran')
        .reduce((sum, t) => sum + t.Amount, 0);
      return {
        store,
        revenue: inc,
        expense: exp,
        profit: inc - exp,
      };
    });
  }, [stores, transactions, currentYear, currentMonth]);

  // Category Expense Breakdown with detailed descriptions
  const expenseBreakdown = useMemo(() => {
    const map: Record<
      string,
      {
        name: string;
        code: string;
        amount: number;
        count: number;
        descriptions: string[];
      }
    > = {};

    const defaultCoaDescriptions: Record<string, string> = {
      '5-101': 'Gaji, upah lembur, tunjangan, dan kasbon staf karyawan',
      '5-102': 'Biaya sewa outlet ruko/gedung & service charge pengelola',
      '5-103': 'Biaya utilitas operasional (listrik PLN, air PAM, & internet)',
      '5-104': 'Pengadaan perlengkapan operasional barbershop, alat cukur, dan bahan habis pakai',
      '5-105': 'Beban pemasaran, promosi event, iklan media sosial, dan sponsorship',
      '5-111': 'Biaya administrasi bank, potongan MDR EDC BCA/Mandiri & QRIS',
      '2-101': 'Pembayaran tagihan faktur hutang dagang supplier',
      '2-102': 'Pembayaran kewajiban hutang gaji & pajak karyawan',
      '2-103': 'Pembayaran angsuran cicilan pinjaman bank / modal usaha',
    };

    currentMonthTransactions
      .filter((t) => t.Type === 'Pengeluaran' && t.Status === 'Approved')
      .forEach((t) => {
        const rawCat = (t.Category || 'Lain-lain').trim();
        let code = '';
        let name = rawCat;

        // Extract code if format is "5-101 - Name" or "5-101: Name"
        const matchedPrefix = rawCat.match(/^(\d+-\d+)\s*[-:]\s*(.+)$/);
        if (matchedPrefix) {
          code = matchedPrefix[1].trim();
          name = matchedPrefix[2].trim();
        } else if (rawCat.includes('-')) {
          const parts = rawCat.split('-');
          if (parts.length >= 2 && parts[0].trim().length <= 5) {
            code = parts[0].trim();
            name = parts.slice(1).join('-').trim();
          }
        }

        // Try matching with chartOfAccounts
        if (!code || !name) {
          const matchedCoa = chartOfAccounts.find(
            (c) =>
              c.Account_Code === rawCat ||
              c.Account_Name.toLowerCase() === rawCat.toLowerCase() ||
              rawCat.toLowerCase().includes(c.Account_Name.toLowerCase())
          );
          if (matchedCoa) {
            code = matchedCoa.Account_Code;
            name = matchedCoa.Account_Name;
          }
        }

        const key = code ? `${code} - ${name}` : name;
        if (!map[key]) {
          map[key] = {
            name: name || rawCat,
            code: code,
            amount: 0,
            count: 0,
            descriptions: [],
          };
        }

        map[key].amount += t.Amount || 0;
        map[key].count += 1;

        if (t.Description && t.Description.trim() && t.Description.trim() !== '-') {
          const desc = t.Description.trim();
          if (!map[key].descriptions.includes(desc)) {
            map[key].descriptions.push(desc);
          }
        }
      });

    return Object.entries(map)
      .map(([key, item]) => {
        let finalDescription = '';
        if (item.descriptions.length > 0) {
          finalDescription = item.descriptions.slice(0, 3).join(', ');
          if (item.descriptions.length > 3) {
            finalDescription += `, +${item.descriptions.length - 3} lainnya`;
          }
        } else if (item.code && defaultCoaDescriptions[item.code]) {
          finalDescription = defaultCoaDescriptions[item.code];
        } else {
          finalDescription = 'Beban operasional outlet cabang';
        }

        return {
          name: item.name,
          code: item.code,
          amount: item.amount,
          count: item.count,
          description: finalDescription,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [currentMonthTransactions, chartOfAccounts]);

  // Recent 5 transactions
  const recentTransactions = useMemo(() => {
    return [...filteredTransactions]
      .sort((a, b) => (b.Date > a.Date ? 1 : -1))
      .slice(0, 5);
  }, [filteredTransactions]);

  // Employee's own payroll records
  const myEmployeeRecord = useMemo(() => {
    if (!isEmployee) return null;
    return employees.find((e) => e.Full_Name.toLowerCase() === currentUser.Full_Name.toLowerCase());
  }, [employees, currentUser, isEmployee]);

  const myPayrolls = useMemo(() => {
    if (!myEmployeeRecord) return [];
    return payrollRuns.filter((p) => p.Employee_ID === myEmployeeRecord.Employee_ID);
  }, [payrollRuns, myEmployeeRecord]);

  const latestMyPayroll = myPayrolls.length > 0 ? myPayrolls[0] : null;

  // Employee's own loans
  const myLoans = useMemo(() => {
    if (!myEmployeeRecord) return [];
    return employeeLoans.filter((l) => l.Employee_ID === myEmployeeRecord.Employee_ID);
  }, [employeeLoans, myEmployeeRecord]);

  const activeMyLoans = useMemo(() => {
    return myLoans.filter((l) => l.Status === 'Active');
  }, [myLoans]);

  const totalMyLoanOutstanding = useMemo(() => {
    return activeMyLoans.reduce((sum, l) => sum + (l.Remaining_Balance ?? (l.Total_Amount - l.Paid_Amount)), 0);
  }, [activeMyLoans]);

  // Operational metrics for management
  const filteredDebts = useMemo(() => {
    if (activeStoreId === 'ALL') return supplierDebts;
    return supplierDebts.filter((d) => d.Store_ID === activeStoreId);
  }, [supplierDebts, activeStoreId]);

  const unpaidDebtsTotal = useMemo(() => {
    return filteredDebts
      .filter((d) => d.Status !== 'Paid')
      .reduce((sum, d) => sum + (d.Remaining_Balance ?? (d.Total_Amount - d.Paid_Amount)), 0);
  }, [filteredDebts]);

  const unpaidDebtsCount = useMemo(() => {
    return filteredDebts.filter((d) => d.Status !== 'Paid').length;
  }, [filteredDebts]);

  const filteredLoans = useMemo(() => {
    if (activeStoreId === 'ALL') return employeeLoans;
    return employeeLoans.filter((l) => l.Store_ID === activeStoreId);
  }, [employeeLoans, activeStoreId]);

  const activeLoansBalanceTotal = useMemo(() => {
    return filteredLoans
      .filter((l) => l.Status === 'Active')
      .reduce((sum, l) => sum + (l.Remaining_Balance ?? (l.Total_Amount - l.Paid_Amount)), 0);
  }, [filteredLoans]);

  const activeLoansCount = useMemo(() => {
    return filteredLoans.filter((l) => l.Status === 'Active').length;
  }, [filteredLoans]);

  const filteredPOs = useMemo(() => {
    if (activeStoreId === 'ALL') return purchaseOrders;
    return purchaseOrders.filter((po) => po.Store_ID === activeStoreId);
  }, [purchaseOrders, activeStoreId]);

  const activePOCount = useMemo(() => {
    return filteredPOs.filter(
      (po) => po.Status === 'Draft' || po.Status === 'Approved' || po.Status === 'Ordered'
    ).length;
  }, [filteredPOs]);

  const activePOTotalAmount = useMemo(() => {
    return filteredPOs
      .filter((po) => po.Status === 'Draft' || po.Status === 'Approved' || po.Status === 'Ordered')
      .reduce((sum, po) => sum + po.Grand_Total, 0);
  }, [filteredPOs]);

  const periodLabel =
    selectedMonth === 'ALL'
      ? `Tahun ${selectedYear} (Setahun Penuh / YTD)`
      : formatPeriod(selectedMonth, selectedYear);

  const activeStoreName =
    activeStoreId === 'ALL'
      ? 'Laporan Konsolidasi Seluruh Cabang'
      : stores.find((s) => s.Store_ID === activeStoreId)?.Store_Name || activeStoreId;

  // Handler for exporting PDF summary
  const handleExportSummaryPdf = () => {
    exportFinancialSummaryPdf({
      companyProfile,
      periodMonth: currentMonth,
      periodYear: selectedYear,
      activeStoreName,
      totalRevenue,
      totalExpense,
      netProfit,
      profitMargin,
      targetOmset: currentMonthBudget.targetOmset,
      paguBeban: currentMonthBudget.paguBeban,
      expenseBreakdown,
      storeComparison,
      currentMonthPayrollTotal,
      totalCash: cashAndBankMetrics.cumulativeCashBalance,
      totalBank: cashAndBankMetrics.cumulativeBankBalance,
      printedBy: currentUser.Full_Name,
    });
  };

  const handleExportSummaryExcel = () => {
    const headers = ['Indikator Keuangan / Kategori Pengeluaran', 'Keterangan Operasional / Detail', 'Nominal (Rp)', 'Porsi (%)'];
    const rows: (string | number)[][] = [
      ['Periode Laporan', periodLabel, '', ''],
      ['Entitas / Lingkup Toko', activeStoreName, '', ''],
      ['Total Pendapatan (Omset)', 'Akumulasi pemasukan operasional cabang', totalRevenue, '100%'],
      ['Target Omset', 'Target penjualan cabang periode ini', currentMonthBudget.targetOmset, ''],
      ['Total Beban Operasional', 'Total seluruh biaya usaha', totalExpense, `${totalRevenue > 0 ? ((totalExpense / totalRevenue) * 100).toFixed(1) : 0}%`],
      ['Pagu Anggaran Beban', 'Batas maksimal pagu anggaran beban', currentMonthBudget.paguBeban, ''],
      ['Laba Bersih Operasional', 'Omset dikurangi beban operasional', netProfit, `${profitMargin.toFixed(2)}%`],
      ['Margin Laba Bersih', 'Net profit margin', `${profitMargin.toFixed(2)}%`, ''],
      ['Total Saldo Kas Fisik (Tunai)', 'Uang fisik di laci kasir & brankas toko', cashAndBankMetrics.cumulativeCashBalance, ''],
      ['Total Saldo Bank & Digital (Non-Tunai)', 'Saldo rekening bank BCA, EDC, & QRIS', cashAndBankMetrics.cumulativeBankBalance, ''],
      ['Total Likuiditas Kas & Bank', 'Total dana operasional siap pakai', cashAndBankMetrics.totalLiquidity, ''],
      ['Realisasi Beban Gaji (Payroll)', 'Total pembayaran gaji karyawan aktif', currentMonthPayrollTotal, ''],
      ['Potongan Biaya MDR Non-Tunai Bulan Ini', 'Fee admin perbankan EDC & QRIS', cashAndBankMetrics.currentMonthMDRTotal, ''],
      ['Dicetak Oleh', currentUser.Full_Name, '', ''],
      ['', '', '', ''],
      ['--- RINCIAN PENGELUARAN PER KATEGORI (COA) ---', 'KETERANGAN / RINCIAN BIAYA OPERASIONAL', 'JUMLAH (RP)', 'PORSI BEBAN (%)'],
      ...expenseBreakdown.map((item) => [
        item.code ? `${item.code} - ${item.name}` : item.name,
        item.description || '-',
        item.amount,
        `${totalExpense > 0 ? ((item.amount / totalExpense) * 100).toFixed(1) : 0}%`,
      ]),
    ];

    StorageService.exportToExcel(
      `Ringkasan_Keuangan_${activeStoreId}_${selectedYear}_${selectedMonth}`,
      headers,
      rows,
      'Ringkasan Keuangan'
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isEmployee ? 'Dashboard Karyawan' : 'Ringkasan Keuangan & Operasional'}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Periode: <strong>{periodLabel}</strong> · {activeStoreName}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Real-Time onSnapshot Aktif
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Periode Selector (Bulan & Tahun Lengkap) */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 shadow-xs">
            <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Periode:</span>
            <select
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="bg-transparent font-bold text-slate-900 dark:text-white text-xs outline-none cursor-pointer pr-1"
              title="Pilih Bulan Periode Dashboard"
            >
              <option value="ALL">Semua Bulan (Setahun Penuh)</option>
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
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-900 dark:text-white text-xs outline-none cursor-pointer"
              title="Pilih Tahun Periode Dashboard"
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {!isEmployee && (
            <>
              {/* Lingkup Toko Selector */}
              {onSelectStore &&
                (currentUser.Role === 'Superadmin' ||
                  (currentUser.Role === 'Finance Admin' && currentUser.Store_ID === 'ALL')) && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 shadow-xs">
                    <StoreIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Lingkup Toko:</span>
                    <select
                      value={activeStoreId}
                      onChange={(e) => onSelectStore(e.target.value)}
                      className="bg-transparent font-bold text-slate-900 dark:text-white text-xs outline-none cursor-pointer pr-1"
                      title="Pilih Lingkup Toko"
                    >
                      <option value="ALL">Semua Cabang (Pusat)</option>
                      {stores.map((s) => (
                        <option key={s.Store_ID} value={s.Store_ID}>
                          {s.Store_Name} ({s.Store_ID})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

            {(currentUser.Role === 'Superadmin' || currentUser.Role === 'Finance Admin') && (
              <button
                onClick={() => onNavigateTab('taxes')}
                className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 shadow-xs transition-colors cursor-pointer"
                title="Kelola Komponen Pajak & Fiskal"
              >
                <Percent className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Pajak & Fiskal</span>
              </button>
            )}

            <button
              onClick={handleExportSummaryExcel}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 shadow-2xs transition-colors cursor-pointer"
              title="Ekspor Ringkasan Indikator Keuangan ke format Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
            <button
              onClick={handleExportSummaryPdf}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 shadow-xs transition-colors cursor-pointer"
              title="Cetak Laporan Ringkasan Keuangan & Operasional PDF"
            >
              <FileDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Cetak Laporan PDF</span>
            </button>
            <button
              onClick={() => onOpenNewTransactionModal('Pemasukan')}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Pemasukan</span>
            </button>
            <button
              onClick={() => onOpenNewTransactionModal('Pengeluaran')}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Pengeluaran</span>
            </button>
            <button
              onClick={() => onOpenNewTransactionModal('Transfer')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition-colors cursor-pointer"
            >
              <Repeat className="h-4 w-4" />
              <span>Transfer Kas</span>
            </button>
          </>
        )}
      </div>
    </div>

      {/* IF ROLE IS EMPLOYEE: Dedicated Personal View */}
      {isEmployee && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <span className="text-xs text-slate-400">Selamat Datang,</span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {currentUser.Full_Name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {myEmployeeRecord?.Position || 'Staff'} · {stores.find((s) => s.Store_ID === myEmployeeRecord?.Store_ID)?.Store_Name}
              </p>
              {myEmployeeRecord?.Join_Date && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span>Mulai: {formatJoinDate(myEmployeeRecord.Join_Date)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    <span>Masa Kerja: {formatTenure(myEmployeeRecord.Join_Date)}</span>
                  </span>
                </div>
              )}
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              Karyawan Aktif
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 block">Gaji Pokok Terdaftar</span>
              <span className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1 block">
                {formatRupiah(myEmployeeRecord?.Base_Salary || 0)}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 block">Tunjangan Tetap</span>
              <span className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1 block">
                {formatRupiah(myEmployeeRecord?.Allowance_Fixed || 0)}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 block">Rekening Payroll</span>
              <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 mt-1 block">
                {myEmployeeRecord?.Bank_Name} - {myEmployeeRecord?.Account_Number}
              </span>
            </div>
          </div>

          {latestMyPayroll ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Slip Gaji Terbaru Anda ({formatPeriod(latestMyPayroll.Period_Month, latestMyPayroll.Period_Year)})
                  </span>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                    {formatRupiah(latestMyPayroll.Net_Salary)}
                  </div>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Status: {latestMyPayroll.Payment_Status.toUpperCase()} · Ditransfer pada{' '}
                    {formatDate(latestMyPayroll.Payment_Date || '')}
                  </span>
                </div>
                <button
                  onClick={() => onOpenPayslipModal(latestMyPayroll)}
                  className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  <span>Lihat & Cetak Slip Gaji</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              Belum ada slip gaji yang diproses untuk akun Anda.
            </div>
          )}

          {/* Employee Active Loans Card */}
          {activeMyLoans.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                    <HandCoins className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                      Pinjaman Berjangka Anda ({activeMyLoans.length} Aktif)
                    </span>
                    <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                      Sisa Pinjaman: {formatRupiah(totalMyLoanOutstanding)}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Cicilan:{' '}
                      <strong className="text-slate-900 dark:text-white">
                        {formatRupiah(activeMyLoans[0]?.Monthly_Installment || 0)}/bulan
                      </strong>{' '}
                      · Keperluan: {activeMyLoans[0]?.Purpose || '-'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('employee_loans')}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-slate-850 transition-colors"
                >
                  <span>Lihat Riwayat & Jadwal Pinjaman</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Posisi Kas Toko untuk Karyawan & Kasir */}
          {myEmployeeRecord?.Store_ID && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-850/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Posisi Kas Toko Cabang: {stores.find((s) => s.Store_ID === myEmployeeRecord.Store_ID)?.Store_Name || myEmployeeRecord.Store_ID}
                    </h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Saldo uang tunai di kasir/brankas dan uang non-tunai di bank cabang Anda
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 self-start sm:self-auto">
                  Kasir & Likuiditas Cabang
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Uang Tunai */}
                <div className="rounded-lg border border-emerald-200 bg-white p-3.5 shadow-2xs dark:border-emerald-900/60 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">
                      Total Uang Tunai (Cash)
                    </span>
                    <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {formatRupiah(cashAndBankMetrics.cumulativeCashBalance)}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Kas Fisik Toko ({cashAndBankMetrics.cashShare.toFixed(1)}%)
                  </span>
                </div>

                {/* Uang Non-Tunai */}
                <div className="rounded-lg border border-blue-200 bg-white p-3.5 shadow-2xs dark:border-blue-900/60 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-blue-800 dark:text-blue-300">
                      Total Non-Tunai (Bank)
                    </span>
                    <Landmark className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {formatRupiah(cashAndBankMetrics.cumulativeBankBalance)}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    EDC, QRIS & Bank ({cashAndBankMetrics.bankShare.toFixed(1)}%)
                  </span>
                </div>

                {/* Total Likuiditas */}
                <div className="rounded-lg border border-purple-200 bg-white p-3.5 shadow-2xs dark:border-purple-900/60 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-purple-800 dark:text-purple-300">
                      Total Likuiditas Toko
                    </span>
                    <Wallet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {formatRupiah(cashAndBankMetrics.totalLiquidity)}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Total Dana Toko Siap Pakai
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards Grid (For Management Roles) */}
      {!isEmployee && (
        <div className="space-y-4">
          {/* TOP EXECUTIVE BANNER: RINGKASAN SALDO UANG TUNAI & NON-TUNAI (BANK) */}
          <div className="rounded-2xl border border-slate-200 bg-linear-to-r from-emerald-50/70 via-white to-blue-50/70 p-4.5 sm:p-5 shadow-xs dark:border-slate-800 dark:from-emerald-950/20 dark:via-slate-900 dark:to-blue-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/70 pb-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900">
                  <Landmark className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Posisi Kas & Likuiditas: Uang Tunai vs Non-Tunai (Bank)
                    </h3>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                      Saldo Riil
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Ketersediaan dana fisik kasir/brankas toko dan saldo non-tunai di rekening bank & EDC.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigateTab('mdr_rates')}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs transition-colors"
                  title="Atur Tarif MDR Transaksi Non-Tunai"
                >
                  <Percent className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Tarif MDR</span>
                </button>
                <button
                  onClick={() => onNavigateTab('transactions')}
                  className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 cursor-pointer shadow-2xs transition-colors"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  <span>Buku Kas</span>
                </button>
              </div>
            </div>

            {/* 3 Executive Metric Cards */}
            <div className="mt-3.5 grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Tunai */}
              <div className="rounded-xl border border-emerald-200/90 bg-white/90 p-4 shadow-2xs dark:border-emerald-900/60 dark:bg-slate-900/90">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                      <Banknote className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                        Total Uang Tunai (Cash)
                      </span>
                      <span className="text-[10px] text-slate-400">Kas Fisik Kasir & Brankas</span>
                    </div>
                  </div>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {cashAndBankMetrics.cashShare.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatRupiah(cashAndBankMetrics.cumulativeCashBalance)}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] border-t border-slate-100 pt-1.5 dark:border-slate-800 text-slate-500">
                  <span>Masuk: +{formatRupiah(cashAndBankMetrics.currentMonthCashIn)}</span>
                  <span>Keluar: -{formatRupiah(cashAndBankMetrics.currentMonthCashOut)}</span>
                </div>
              </div>

              {/* Non-Tunai / Bank */}
              <div className="rounded-xl border border-blue-200/90 bg-white/90 p-4 shadow-2xs dark:border-blue-900/60 dark:bg-slate-900/90">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                      <Landmark className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 block">
                        Total Uang Non-Tunai (Bank)
                      </span>
                      <span className="text-[10px] text-slate-400">Rekening Bank, EDC & QRIS</span>
                    </div>
                  </div>
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {cashAndBankMetrics.bankShare.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatRupiah(cashAndBankMetrics.cumulativeBankBalance)}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] border-t border-slate-100 pt-1.5 dark:border-slate-800 text-slate-500">
                  <span>Masuk Netto: +{formatRupiah(cashAndBankMetrics.currentMonthBankInNet)}</span>
                  <span className="text-rose-500">MDR: -{formatRupiah(cashAndBankMetrics.currentMonthMDRTotal)}</span>
                </div>
              </div>

              {/* Total Likuiditas */}
              <div className="rounded-xl border border-purple-200/90 bg-white/90 p-4 shadow-2xs dark:border-purple-900/60 dark:bg-slate-900/90">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
                      <Wallet className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 block">
                        Total Likuiditas Kas & Bank
                      </span>
                      <span className="text-[10px] text-slate-400">Total Dana Siap Pakai</span>
                    </div>
                  </div>
                  <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                    100%
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-purple-900 dark:text-purple-200">
                  {formatRupiah(cashAndBankMetrics.totalLiquidity)}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] border-t border-slate-100 pt-1.5 dark:border-slate-800 text-slate-500">
                  <span>Komposisi: {cashAndBankMetrics.cashShare.toFixed(0)}% Tunai</span>
                  <span>{cashAndBankMetrics.bankShare.toFixed(0)}% Bank / Digital</span>
                </div>
              </div>
            </div>
          </div>
          {/* NOTIFIKASI OTOMATIS: Realisasi Pengeluaran Cabang Melebihi 90% Budget Bulanan */}
          {branchBudgetAlerts.length > 0 && !isAlertCollapsed && (
            <div className="rounded-xl border border-amber-300 bg-linear-to-r from-amber-50 via-orange-50 to-amber-50/70 p-4 sm:p-5 shadow-xs dark:border-amber-900/60 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-amber-200/80 pb-3 dark:border-amber-900/50">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                    <BellRing className="h-5 w-5 animate-bounce" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                      {branchBudgetAlerts.length}
                    </span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                        Notifikasi Otomatis: Pengeluaran Cabang Melebihi 90% Budget Bulanan!
                      </h3>
                      <span className="rounded-md bg-amber-200/90 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 uppercase tracking-wider">
                        {branchBudgetAlerts.length} Cabang Terdeteksi
                      </span>
                    </div>
                    <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                      Peringatan dini otomatis: Realisasi pengeluaran pada periode{' '}
                      <strong>{formatPeriod(currentMonth, currentYear)}</strong> telah mencapai atau melampaui 90% dari pagu anggaran bulanan yang ditentukan.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onNavigateTab('budget')}
                    className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition-colors cursor-pointer"
                  >
                    <span>Kelola Pagu Anggaran</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setIsAlertCollapsed(true)}
                    className="rounded-lg border border-amber-300 bg-white/80 p-1.5 text-amber-800 hover:bg-white dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300 cursor-pointer"
                    title="Ciutkan Peringatan"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Grid Rincian Cabang yang Melebihi 90% */}
              <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {branchBudgetAlerts.map((item) => (
                  <div
                    key={item.store.Store_ID}
                    className={`rounded-lg border p-3.5 bg-white/95 shadow-xs dark:bg-slate-900/90 ${
                      item.isOver100
                        ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-200 dark:ring-rose-950'
                        : 'border-amber-300 dark:border-amber-900/60 ring-1 ring-amber-200 dark:ring-amber-950'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <StoreIcon className="h-4 w-4 text-slate-500 shrink-0" />
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {item.store.Store_Name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          ({item.store.Store_ID})
                        </span>
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold whitespace-nowrap ${
                          item.isOver100
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                        }`}
                      >
                        {item.isOver100 ? '🚨 Overbudget' : '⚠️ >90% Terpakai'}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-baseline justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Realisasi Beban / Pagu</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatRupiah(item.actualExpense)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono ml-1">
                          / {formatRupiah(item.totalBudget)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-extrabold font-mono ${
                            item.isOver100
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {item.percentUsed.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar dengan 90% Threshold */}
                    <div className="mt-2 relative">
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.isOver100 ? 'bg-rose-600' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-300">
                        {item.remaining >= 0 ? (
                          <>
                            Sisa Pagu:{' '}
                            <strong className="text-amber-700 dark:text-amber-400 font-mono">
                              {formatRupiah(item.remaining)}
                            </strong>
                          </>
                        ) : (
                          <>
                            Melampaui:{' '}
                            <strong className="text-rose-600 dark:text-rose-400 font-mono">
                              -{formatRupiah(Math.abs(item.remaining))}
                            </strong>
                          </>
                        )}
                      </span>
                      <button
                        onClick={() => onNavigateTab('budget')}
                        className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400 text-[11px] cursor-pointer"
                      >
                        Atur Budget &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collapsed Pill Notifikasi Otomatis Budget */}
          {branchBudgetAlerts.length > 0 && isAlertCollapsed && (
            <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 shadow-xs dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="font-semibold">
                  Peringatan Otomatis: {branchBudgetAlerts.length} cabang melebihi 90% pagu anggaran bulanan ({formatPeriod(currentMonth, currentYear)}).
                </span>
              </div>
              <button
                onClick={() => setIsAlertCollapsed(false)}
                className="font-bold underline text-amber-800 dark:text-amber-300 hover:opacity-80 cursor-pointer"
              >
                Tampilkan Rincian Cabang &rarr;
              </button>
            </div>
          )}

          {/* Overbudget Alert Banner for Single Store if not covered above */}
          {isOverbudget && branchBudgetAlerts.length === 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-rose-900 dark:text-rose-300">
                    Peringatan: Pengeluaran Toko Melebihi Pagu Anggaran (Overbudget)!
                  </span>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
                    Total pengeluaran telah melampaui batas anggaran sebesar{' '}
                    <strong>{formatRupiah(Math.abs(remainingBudget))}</strong> ({expenseBudgetPercent.toFixed(1)}% terpakai).
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('budget')}
                className="text-xs font-semibold text-rose-700 underline dark:text-rose-300 whitespace-nowrap hover:opacity-80"
              >
                Lihat Anggaran &rarr;
              </button>
            </div>
          )}

          {/* Target Omset & Anggaran Pengeluaran Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Target Omset Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <Target className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Target Omset Penjualan
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Bulan {formatPeriod(currentMonth, currentYear)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('budget')}
                  className="text-[11px] font-medium text-emerald-600 hover:underline dark:text-emerald-400 flex items-center gap-0.5"
                >
                  <span>Atur Target</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatRupiah(totalRevenue)}
                  </div>
                  <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {targetOmsetPercent.toFixed(1)}% Tercapai
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.min(targetOmsetPercent, 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
                  <span>Target: {formatRupiah(currentMonthBudget.targetOmset)}</span>
                  <span>
                    {currentMonthBudget.targetOmset > totalRevenue
                      ? `Sisa Target: ${formatRupiah(currentMonthBudget.targetOmset - totalRevenue)}`
                      : 'Target Tercapai! 🎉'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pagu Anggaran Pengeluaran Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                      isOverbudget
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                    }`}
                  >
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Kontrol Anggaran Beban
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Batas Pengeluaran Bulan Ini
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('budget')}
                  className="text-[11px] font-medium text-emerald-600 hover:underline dark:text-emerald-400 flex items-center gap-0.5"
                >
                  <span>Kelola Pagu</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatRupiah(totalExpense)}
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold font-mono ${
                        isOverbudget
                          ? 'text-rose-600 dark:text-rose-400'
                          : expenseBudgetPercent >= 90
                          ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {expenseBudgetPercent.toFixed(1)}% Terpakai
                    </span>
                    {expenseBudgetPercent >= 90 && !isOverbudget && (
                      <span className="block text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        ⚠ &gt;90% Batas Pagu
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOverbudget
                        ? 'bg-rose-600'
                        : expenseBudgetPercent >= 90
                        ? 'bg-amber-500'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(expenseBudgetPercent, 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
                  <span>Pagu: {formatRupiah(currentMonthBudget.paguBeban)}</span>
                  <span
                    className={
                      isOverbudget
                        ? 'text-rose-600 font-semibold'
                        : expenseBudgetPercent >= 90
                        ? 'text-amber-600 font-semibold'
                        : 'text-slate-400'
                    }
                  >
                    {isOverbudget
                      ? `Overbudget: ${formatRupiah(Math.abs(remainingBudget))}`
                      : `Sisa Pagu: ${formatRupiah(remainingBudget)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: POSISI SALDO KAS & BANK (UANG TUNAI VS NON-TUNAI / BANK) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            {/* Header & Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-xs">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Posisi Kas & Likuiditas: Uang Tunai vs Non-Tunai (Bank)
                    </h3>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Likuiditas Real-Time
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Saldo ketersediaan uang fisik kasir/brankas toko dan uang non-tunai di rekening bank & settlement digital.
                  </p>
                </div>
              </div>

              {/* View Switcher & Action */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800 text-xs font-semibold">
                  <button
                    onClick={() => setCashBankViewMode('cumulative')}
                    className={`rounded-md px-3 py-1 transition-colors cursor-pointer ${
                      cashBankViewMode === 'cumulative'
                        ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Saldo Kumulatif Berjalan
                  </button>
                  <button
                    onClick={() => setCashBankViewMode('month')}
                    className={`rounded-md px-3 py-1 transition-colors cursor-pointer ${
                      cashBankViewMode === 'month'
                        ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Arus Kas Bulan Ini
                  </button>
                </div>

                <button
                  onClick={() => setShowChannelBreakdown(!showChannelBreakdown)}
                  className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    showChannelBreakdown
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                  title="Lihat rincian saldo per saluran pembayaran non-tunai"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Rincian Saluran</span>
                  {showChannelBreakdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* 3 Main Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: TOTAL UANG TUNAI (CASH) */}
              <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-linear-to-br from-emerald-50/80 via-white to-emerald-50/30 p-4.5 shadow-2xs dark:border-emerald-900/60 dark:from-emerald-950/30 dark:via-slate-900 dark:to-emerald-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                      <Banknote className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                        Total Uang Tunai (Cash)
                      </h4>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                        Kas Fisik di Kasir & Brankas Toko
                      </span>
                    </div>
                  </div>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                    {cashAndBankMetrics.cashShare.toFixed(1)}% Likuiditas
                  </span>
                </div>

                <div className="mt-3.5">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    {cashBankViewMode === 'cumulative' ? 'Total Saldo Kas Tunai Fisik' : 'Netto Arus Kas Tunai Bulan Ini'}
                  </span>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                    {formatRupiah(
                      cashBankViewMode === 'cumulative'
                        ? cashAndBankMetrics.cumulativeCashBalance
                        : cashAndBankMetrics.currentMonthCashNet
                    )}
                  </div>
                </div>

                {/* Substats Bulan Berjalan */}
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-emerald-100 pt-2.5 dark:border-emerald-900/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Pemasukan Tunai:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatRupiah(cashAndBankMetrics.currentMonthCashIn)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Pengeluaran Tunai:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      -{formatRupiah(cashAndBankMetrics.currentMonthCashOut)}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 dark:border-slate-800">
                  <span>{cashAndBankMetrics.currentMonthCashTrxCount} transaksi tunai bulan ini</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenNewTransactionModal('Transfer_Cash_To_Bank')}
                      className="font-semibold text-blue-700 hover:underline dark:text-blue-400 cursor-pointer"
                      title="Setor uang tunai kasir ke Bank BCA"
                    >
                      ⇄ Setor Bank
                    </button>
                    <button
                      onClick={() => onOpenNewTransactionModal('Pemasukan')}
                      className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400 cursor-pointer"
                    >
                      + Catat Tunai
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: TOTAL UANG NON-TUNAI (BANK & DIGITAL) */}
              <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-linear-to-br from-blue-50/80 via-white to-indigo-50/30 p-4.5 shadow-2xs dark:border-blue-900/60 dark:from-blue-950/30 dark:via-slate-900 dark:to-indigo-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                      <Landmark className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                        Total Uang Non-Tunai (Bank)
                      </h4>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                        Rekening Bank, QRIS & EDC Netto
                      </span>
                    </div>
                  </div>
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-extrabold text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                    {cashAndBankMetrics.bankShare.toFixed(1)}% Likuiditas
                  </span>
                </div>

                <div className="mt-3.5">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    {cashBankViewMode === 'cumulative' ? 'Total Saldo Kas di Bank' : 'Netto Arus Kas Bank Bulan Ini'}
                  </span>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                    {formatRupiah(
                      cashBankViewMode === 'cumulative'
                        ? cashAndBankMetrics.cumulativeBankBalance
                        : cashAndBankMetrics.currentMonthBankNet
                    )}
                  </div>
                </div>

                {/* Substats Bulan Berjalan */}
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-blue-100 pt-2.5 dark:border-blue-900/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Masuk Rekening (Netto):</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      +{formatRupiah(cashAndBankMetrics.currentMonthBankInNet)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Pengeluaran via Bank:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      -{formatRupiah(cashAndBankMetrics.currentMonthBankOut)}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 dark:border-slate-800">
                  <span className="truncate">Potongan MDR: -{formatRupiah(cashAndBankMetrics.currentMonthMDRTotal)} (5-111)</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenNewTransactionModal('Transfer_Bank_To_Cash')}
                      className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400 shrink-0 cursor-pointer"
                      title="Tarik saldo bank untuk isi kas tunai laci kasir"
                    >
                      ⇄ Tarik Tunai
                    </button>
                    <button
                      onClick={() => onNavigateTab('mdr_rates')}
                      className="font-semibold text-blue-700 hover:underline dark:text-blue-400 shrink-0 ml-1 cursor-pointer"
                    >
                      Tarif MDR &rarr;
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 3: TOTAL LIKUIDITAS (TUNAI + BANK) */}
              <div className="relative overflow-hidden rounded-xl border border-purple-200 bg-linear-to-br from-purple-50/80 via-white to-pink-50/30 p-4.5 shadow-2xs dark:border-purple-900/60 dark:from-purple-950/30 dark:via-slate-900 dark:to-pink-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                        Total Likuiditas Kas & Bank
                      </h4>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                        Total Dana Siap Pakai (Tunai + Bank)
                      </span>
                    </div>
                  </div>
                  <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-800 dark:bg-purple-900/60 dark:text-purple-200">
                    100% Likuiditas
                  </span>
                </div>

                <div className="mt-3.5">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    {cashBankViewMode === 'cumulative' ? 'Total Saldo Dana Tersedia' : 'Total Arus Kas Masuk Bulan Ini'}
                  </span>
                  <div className="text-2xl font-bold font-mono tabular-nums text-purple-900 dark:text-purple-100 mt-0.5">
                    {formatRupiah(
                      cashBankViewMode === 'cumulative'
                        ? cashAndBankMetrics.totalLiquidity
                        : cashAndBankMetrics.currentMonthTotalIn
                    )}
                  </div>
                </div>

                {/* Progress bar komposisi Tunai vs Bank */}
                <div className="mt-3 space-y-1.5 border-t border-purple-100 pt-2.5 dark:border-purple-900/60">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      Tunai: {cashAndBankMetrics.cashShare.toFixed(1)}%
                    </span>
                    <span className="font-semibold text-blue-700 dark:text-blue-400">
                      Bank: {cashAndBankMetrics.bankShare.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.max(0, Math.min(cashAndBankMetrics.cashShare, 100))}%` }}
                      title={`Uang Tunai: ${cashAndBankMetrics.cashShare.toFixed(1)}%`}
                    />
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${Math.max(0, Math.min(cashAndBankMetrics.bankShare, 100))}%` }}
                      title={`Uang Non-Tunai / Bank: ${cashAndBankMetrics.bankShare.toFixed(1)}%`}
                    />
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 dark:border-slate-800">
                  <span>Inflow: {cashAndBankMetrics.currentMonthCashShare.toFixed(0)}% Tunai | {cashAndBankMetrics.currentMonthBankShare.toFixed(0)}% Bank</span>
                  <button
                    onClick={() => onNavigateTab('transactions')}
                    className="font-semibold text-purple-700 hover:underline dark:text-purple-400 cursor-pointer"
                  >
                    Buku Kas &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Action Bar: Pemindahan Dana Posisi Kas (Tunai ⇄ Non-Tunai) */}
            <div className="mt-4 rounded-xl border border-blue-200/90 bg-linear-to-r from-blue-50/90 via-sky-50/50 to-indigo-50/80 p-3.5 dark:border-blue-900/60 dark:from-blue-950/40 dark:via-slate-900 dark:to-indigo-950/30 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs">
                    <Repeat className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Pemindahan Dana Posisi Kas (Tunai ⇄ Non-Tunai)
                      </h5>
                      <span className="rounded-full bg-blue-100 px-2 py-0.2 text-[9px] font-bold text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                        Mutasi Kas & Bank
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Pindahkan dana kas fisik kasir ke rekening bank atau tarik saldo bank untuk modal kasir
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onOpenNewTransactionModal('Transfer_Cash_To_Bank')}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Setor uang tunai kasir toko ke rekening bank operasional"
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    <span>Setor Tunai (Kas ➔ Bank)</span>
                  </button>
                  <button
                    onClick={() => onOpenNewTransactionModal('Transfer_Bank_To_Cash')}
                    className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white hover:bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-slate-800 dark:text-blue-200 dark:hover:bg-slate-750 px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Tarik saldo rekening bank untuk modal kasir / kas kecil"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Tarik Tunai (Bank ➔ Kas)</span>
                  </button>
                  <button
                    onClick={() => onOpenNewTransactionModal('Transfer')}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                    title="Buka form pemindahan kas lengkap (termasuk settlement QRIS dan antar cabang)"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 text-slate-500" />
                    <span>Kelola Transfer</span>
                  </button>
                </div>
              </div>
            </div>

            {/* EXPANDABLE: Rincian Saluran Non-Tunai (Bank & Digital) */}
            {showChannelBreakdown && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-850/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-2 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Rincian Arus Kas Per Saluran Non-Tunai / Bank (Bulan {formatPeriod(currentMonth, currentYear)})
                    </h5>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Netto = Nominal kotor dikurangi potongan MDR admin bank
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* QRIS */}
                  <div className="rounded-lg border border-purple-200 bg-white p-3 dark:border-purple-900/60 dark:bg-slate-900 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <QrCode className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">QRIS</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        {qrisRateLabel}
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-bold font-mono text-slate-900 dark:text-white">
                      +{formatRupiah(cashAndBankMetrics.channelStats.qris.inNet)}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                      <span>Bruto: {formatRupiah(cashAndBankMetrics.channelStats.qris.inGross)}</span>
                      <span className="text-rose-500">MDR: -{formatRupiah(cashAndBankMetrics.channelStats.qris.mdr)}</span>
                    </div>
                  </div>

                  {/* Debit BCA */}
                  <div className="rounded-lg border border-blue-200 bg-white p-3 dark:border-blue-900/60 dark:bg-slate-900 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Debit BCA</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {bcaRateLabel}
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-bold font-mono text-slate-900 dark:text-white">
                      +{formatRupiah(cashAndBankMetrics.channelStats.debit_bca.inNet)}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                      <span>Bruto: {formatRupiah(cashAndBankMetrics.channelStats.debit_bca.inGross)}</span>
                      <span className="text-rose-500">MDR: -{formatRupiah(cashAndBankMetrics.channelStats.debit_bca.mdr)}</span>
                    </div>
                  </div>

                  {/* Debit Bank Lain */}
                  <div className="rounded-lg border border-cyan-200 bg-white p-3 dark:border-cyan-900/60 dark:bg-slate-900 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Debit Bank Lain</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
                        {debitLainRateLabel}
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-bold font-mono text-slate-900 dark:text-white">
                      +{formatRupiah(cashAndBankMetrics.channelStats.debit_lain.inNet)}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                      <span>Bruto: {formatRupiah(cashAndBankMetrics.channelStats.debit_lain.inGross)}</span>
                      <span className="text-rose-500">MDR: -{formatRupiah(cashAndBankMetrics.channelStats.debit_lain.mdr)}</span>
                    </div>
                  </div>

                  {/* Bank Transfer */}
                  <div className="rounded-lg border border-indigo-200 bg-white p-3 dark:border-indigo-900/60 dark:bg-slate-900 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Bank Transfer</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        0% MDR
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-bold font-mono text-slate-900 dark:text-white">
                      +{formatRupiah(cashAndBankMetrics.channelStats.transfer.inNet)}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                      <span>Keluar: -{formatRupiah(cashAndBankMetrics.channelStats.transfer.out)}</span>
                      <span className="text-slate-500">{cashAndBankMetrics.channelStats.transfer.count} Trx</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 6 Main KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1: Total Pendapatan */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Total Pendapatan (Revenue)</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold font-mono tabular-nums tracking-tight text-slate-900 dark:text-white">
                {formatRupiah(totalRevenue)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Bulan Berjalan ({currentMonthTransactions.filter(t => t.Type === 'Pemasukan').length} Transaksi)</span>
              </div>
            </div>

            {/* Card 2: Total Pengeluaran */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Total Pengeluaran (Expense)</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                  <ArrowDownRight className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold font-mono tabular-nums tracking-tight text-slate-900 dark:text-white">
                {formatRupiah(totalExpense)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>Termasuk Operasional & Utilitas</span>
              </div>
            </div>

            {/* Card 3: Laba Bersih (Net Profit) */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Laba Bersih (Net Profit)</span>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    netProfit >= 0
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                  }`}
                >
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div
                className={`mt-3 text-2xl font-bold font-mono tabular-nums tracking-tight ${
                  netProfit >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatRupiah(netProfit)}
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Margin Laba:{' '}
                <strong className="font-mono text-slate-900 dark:text-white">
                  {profitMargin.toFixed(1)}%
                </strong>
              </div>
            </div>

            {/* Card 4: Total Saldo Uang Tunai (Cash) */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs dark:border-emerald-900/60 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">Total Uang Tunai (Cash)</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                  <Banknote className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold font-mono tabular-nums tracking-tight text-slate-900 dark:text-white">
                {formatRupiah(cashAndBankMetrics.cumulativeCashBalance)}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {cashAndBankMetrics.cashShare.toFixed(1)}% Likuiditas
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Fisik di Kasir/Brankas
                </span>
              </div>
            </div>

            {/* Card 5: Total Saldo Non-Tunai (Bank & Digital) */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 shadow-xs dark:border-blue-900/60 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-blue-800 dark:text-blue-300">Total Uang Non-Tunai (Bank)</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                  <Landmark className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold font-mono tabular-nums tracking-tight text-slate-900 dark:text-white">
                {formatRupiah(cashAndBankMetrics.cumulativeBankBalance)}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-700 dark:text-blue-400">
                  {cashAndBankMetrics.bankShare.toFixed(1)}% Likuiditas
                </span>
                <button
                  onClick={() => onNavigateTab('mdr_rates')}
                  className="text-blue-700 hover:underline dark:text-blue-400 text-[11px] font-semibold cursor-pointer"
                >
                  Tarif MDR &rarr;
                </button>
              </div>
            </div>

            {/* Card 6: Beban Payroll Bulan Ini */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Beban Payroll Bulan Ini</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold font-mono tabular-nums tracking-tight text-slate-900 dark:text-white">
                {formatRupiah(currentMonthPayrollTotal)}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{activeEmployeesCount} Karyawan Aktif</span>
                <button
                  onClick={() => onNavigateTab('payroll')}
                  className="text-emerald-600 hover:underline dark:text-emerald-400 font-medium"
                >
                  Kelola Payroll &rarr;
                </button>
              </div>
            </div>
          </div>

        {/* Operational & Liability Row (Supplier Debts, Employee Loans, Purchase Orders) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card: Hutang Supplier */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Hutang Supplier (A/P)
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {unpaidDebtsCount} Faktur Belum Lunas
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('supplier_debts')}
                  className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400 flex items-center gap-0.5"
                >
                  <span>Kelola</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="mt-3">
                <span className="text-[11px] text-slate-500 block">Total Sisa Tagihan</span>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                  {formatRupiah(unpaidDebtsTotal)}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Status Pembayaran</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {unpaidDebtsCount > 0 ? 'Perlu Pelunasan' : 'Semua Lunas ✓'}
              </span>
            </div>
          </div>

          {/* Card: Pinjaman Karyawan */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                    <HandCoins className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Pinjaman Karyawan
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {activeLoansCount} Pinjaman Berjalan
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('employee_loans')}
                  className="text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400 flex items-center gap-0.5"
                >
                  <span>Kelola</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="mt-3">
                <span className="text-[11px] text-slate-500 block">Total Saldo Pokok Terutang</span>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                  {formatRupiah(activeLoansBalanceTotal)}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Metode Pemotongan</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Auto Potong Payroll Slip
              </span>
            </div>
          </div>

          {/* Card: Purchase Order (PO) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Purchase Order (PO)
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {activePOCount} Pesanan Berjalan
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('purchase_orders')}
                  className="text-xs font-semibold text-purple-600 hover:underline dark:text-purple-400 flex items-center gap-0.5"
                >
                  <span>Kelola</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="mt-3">
                <span className="text-[11px] text-slate-500 block">Total Rencana Belanja Aktif</span>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                  {formatRupiah(activePOTotalAmount)}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Alur Operasional</span>
              <span className="font-medium text-purple-600 dark:text-purple-400">
                PO &rarr; Terima &rarr; Hutang
              </span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Dedicated P&L Analysis Section */}
      {!isEmployee && (
        <PLAnalysisSection
          transactions={transactions}
          stores={stores}
          activeStoreId={activeStoreId}
          chartOfAccounts={chartOfAccounts}
          budgets={budgets}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* Middle Section: Cash Flow Graph & Category Breakdown */}
      {!isEmployee && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cashflow & Financial Performance Overview */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Perbandingan Kinerja Toko (Bulan Ini)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pendapatan vs Pengeluaran per masing-masing cabang toko
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('profit_loss')}
                className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400 flex items-center gap-1"
              >
                <span>Lihat Laporan Lengkap</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {storeComparison.map((item) => {
                const maxVal = Math.max(
                  ...storeComparison.map((s) => Math.max(s.revenue, s.expense)),
                  1000000
                );
                const revWidth = (item.revenue / maxVal) * 100;
                const expWidth = (item.expense / maxVal) * 100;

                return (
                  <div key={item.store.Store_ID} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <StoreIcon className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {item.store.Store_Name}
                        </span>
                        <span className="text-[10px] text-slate-400">({item.store.Store_ID})</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          In: {formatRupiah(item.revenue)}
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 font-medium">
                          Out: {formatRupiah(item.expense)}
                        </span>
                        <span
                          className={`font-semibold ${
                            item.profit >= 0
                              ? 'text-slate-900 dark:text-white'
                              : 'text-rose-500'
                          }`}
                        >
                          Net: {formatRupiah(item.profit)}
                        </span>
                      </div>
                    </div>

                    {/* Progress bars */}
                    <div className="space-y-1">
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${Math.min(revWidth, 100)}%` }}
                        />
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-rose-400 transition-all duration-500"
                          style={{ width: `${Math.min(expWidth, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Expense Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Komposisi Pengeluaran
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Alokasi biaya usaha dan rincian operasional bulan berjalan
              </p>
            </div>

            <div className="mt-4 space-y-3.5">
              {expenseBreakdown.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Belum ada transaksi pengeluaran bulan ini.
                </div>
              ) : (
                expenseBreakdown.map((cat, idx) => {
                  const percent = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[190px]">
                          {cat.code ? `${cat.code} · ${cat.name}` : cat.name}
                        </span>
                        <div className="text-right font-mono tabular-nums">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatRupiah(cat.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1.5 font-sans font-medium">
                            ({percent.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      {cat.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={cat.description}>
                          {cat.description}
                        </p>
                      )}
                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-slate-800 dark:bg-slate-200"
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Cross-Device Real-Time Activity Feed Card */}
      {!isEmployee && liveActivities.length > 0 && (
        <div className="rounded-xl border border-indigo-150 bg-linear-to-r from-indigo-50/50 via-white to-slate-50/50 shadow-xs dark:border-indigo-900/40 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 overflow-hidden">
          <div className="flex items-center justify-between border-b border-indigo-100/80 px-6 py-3.5 dark:border-indigo-900/40">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Aktivitas Real-Time Antar Perangkat
                  </h3>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Stream
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Perubahan data terbaru dari sesi pengguna di berbagai perangkat
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
            {liveActivities.slice(0, 5).map((act) => {
              const timeFormatted = new Date(act.timestamp).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              return (
                <div
                  key={act.id}
                  className="flex items-center justify-between gap-3 px-6 py-2.5 text-xs hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold text-slate-900 dark:text-white mr-1.5">
                        {act.userName}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-2">
                        ({act.userRole})
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 mr-2">
                        {act.action}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {act.details}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-mono text-slate-400">
                    {timeFormatted}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions Table */}
      {!isEmployee && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Transaksi Keuangan Terbaru
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pencatatan mutasi kas dan bank per toko
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
            >
              <span>Semua Transaksi</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Tanggal / ID</th>
                  <th className="px-6 py-3">Toko</th>
                  <th className="px-6 py-3">Tipe & Kategori</th>
                  <th className="px-6 py-3">Deskripsi</th>
                  <th className="px-6 py-3 text-right">Nominal</th>
                  <th className="px-6 py-3">Metode Bayar</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentTransactions.map((trx) => (
                  <tr
                    key={trx.Transaction_ID}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {formatDate(trx.Date)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {trx.Transaction_ID}
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {stores.find((s) => s.Store_ID === trx.Store_ID)?.Store_Name || trx.Store_ID}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block font-semibold ${
                          trx.Type === 'Pemasukan'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : trx.Type === 'Pengeluaran'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {trx.Type}
                      </span>
                      <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                        {trx.Category}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-300 max-w-[240px] truncate">
                      {trx.Description || '-'}
                    </td>
                    <td className="px-6 py-3 text-right whitespace-nowrap font-mono tabular-nums font-semibold">
                      <span
                        className={
                          trx.Type === 'Pemasukan'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : trx.Type === 'Pengeluaran'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-900 dark:text-white'
                        }
                      >
                        {trx.Type === 'Pengeluaran' ? '-' : '+'}
                        {formatRupiah(trx.Amount)}
                      </span>
                      {Boolean(trx.Type === 'Pemasukan' && trx.MDR_Fee && trx.MDR_Fee > 0) && (
                        <div className="text-[10px] font-normal font-sans leading-tight mt-0.5">
                          <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                            Netto: {formatRupiah(trx.Net_Amount || (trx.Amount - trx.MDR_Fee!))}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {renderPaymentMethodBadge(trx.Payment_Method)}
                    </td>
                    <td className="px-6 py-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          trx.Status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : trx.Status === 'Pending'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}
                      >
                        {trx.Status}
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
