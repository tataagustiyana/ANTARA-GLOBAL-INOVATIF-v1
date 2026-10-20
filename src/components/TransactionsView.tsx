import {
  ArrowDownRight,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  Banknote,
  BookOpen,
  Building2,
  Calculator,
  Calendar,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Coins,
  CreditCard,
  Download,
  Edit2,
  Eye,
  FileDown,
  FileSpreadsheet,
  Filter,
  HandCoins,
  Image as ImageIcon,
  Landmark,
  Lock,
  Percent,
  Plus,
  QrCode,
  Repeat,
  RotateCcw,
  Scale,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { StorageService } from '../services/storageService';
import {
  BookPeriodConfig,
  ChartOfAccount,
  CompanyProfile,
  DatePreset,
  DateRangeFilter,
  Employee,
  EmployeeLoan,
  PaymentMethod,
  Store,
  Transaction,
  TransactionStatus,
  TransactionType,
  User,
  MDRRateSetting,
} from '../types';
import { formatDate, formatRupiah, getTodayString } from '../utils/formatters';
import { calculateMDR, COA_MDR, getMDRConfig } from '../utils/mdrHelpers';
import { exportTransactionsPdf } from '../utils/pdfGenerator';

interface TransactionsViewProps {
  stores: Store[];
  activeStoreId: string;
  transactions: Transaction[];
  chartOfAccounts: ChartOfAccount[];
  currentUser: User;
  companyProfile?: CompanyProfile;
  employees?: Employee[];
  employeeLoans?: EmployeeLoan[];
  onSaveLoan?: (loan: EmployeeLoan) => Promise<void>;
  onSaveTransaction: (trx: Transaction | Transaction[]) => Promise<void>;
  onDeleteTransaction: (trxId: string) => Promise<void>;
  onUpdateStatus: (trxId: string, status: TransactionStatus) => Promise<void>;
  onOpenProofModal: (imageUrl: string, title?: string, description?: string) => void;
  openCreateModalDirectly?: TransactionType | 'Transfer_Cash_To_Bank' | 'Transfer_Bank_To_Cash' | null;
  onClearDirectModal?: () => void;
  mdrSettings?: MDRRateSetting[];
  onNavigateToMdr?: () => void;
  bookPeriodConfig?: BookPeriodConfig;
  onOpenBookClosingModal?: () => void;
}

export const PAYMENT_METHOD_OPTIONS: {
  id: PaymentMethod;
  label: string;
  subtext: string;
  mdrBadge?: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'Cash',
    label: 'Cash',
    subtext: 'Kas Tunai Toko (Bebas MDR)',
    mdrBadge: '0% MDR',
    icon: Banknote,
  },
  {
    id: 'Bank Transfer',
    label: 'Bank Transfer',
    subtext: 'Transfer Rekening Antar Bank',
    mdrBadge: '0% MDR',
    icon: Building2,
  },
  {
    id: 'Qris',
    label: 'Qris',
    subtext: 'QRIS Scan Merchant (MDR 0.7%)',
    mdrBadge: 'MDR 0.7%',
    icon: QrCode,
  },
  {
    id: 'Debit bank BCA',
    label: 'Debit bank BCA',
    subtext: 'Mesin EDC BCA On-Us (MDR 0.15%)',
    mdrBadge: 'MDR 0.15%',
    icon: CreditCard,
  },
  {
    id: 'Debit Bank Lain',
    label: 'Debit Bank Lain',
    subtext: 'EDC Bank Mandiri, BRI, BNI, dll (MDR 2%)',
    mdrBadge: 'MDR 2.0%',
    icon: CreditCard,
  },
  {
    id: 'E-Wallet',
    label: 'E-Wallet',
    subtext: 'Dompet Digital / Lainnya',
    icon: Wallet,
  },
];

export const renderPaymentMethodBadge = (method: string, mdrSettings?: MDRRateSetting[]) => {
  const m = method || '-';
  const mLower = m.toLowerCase();

  const getDynamicRate = (id: string, defaultRate: string) => {
    if (!mdrSettings || mdrSettings.length === 0) return defaultRate;
    const found = mdrSettings.find((s) => s.id === id);
    return found ? `${found.ratePercent}%` : defaultRate;
  };

  if (mLower === 'cash' || mLower.includes('tunai')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80">
        <Banknote className="h-3 w-3 shrink-0" />
        <span>Cash</span>
      </span>
    );
  }
  if (mLower.includes('transfer')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/80">
        <Building2 className="h-3 w-3 shrink-0" />
        <span>{m}</span>
      </span>
    );
  }
  if (mLower.includes('qris')) {
    const rateText = getDynamicRate('qris', '0.7%');
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/80">
        <QrCode className="h-3 w-3 shrink-0 text-purple-600 dark:text-purple-400" />
        <span className="font-semibold">{m}</span>
        <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-purple-200/80 text-purple-800 dark:bg-purple-900/80 dark:text-purple-200">
          {rateText}
        </span>
      </span>
    );
  }
  if (mLower.includes('bca')) {
    const rateText = getDynamicRate('debit_bca', '0.15%');
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/80">
        <CreditCard className="h-3 w-3 shrink-0 text-indigo-600 dark:text-indigo-400" />
        <span className="font-semibold">{m}</span>
        <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-indigo-200/80 text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-200">
          {rateText}
        </span>
      </span>
    );
  }
  if (mLower.includes('debit')) {
    const rateText = getDynamicRate('debit_lain', '2%');
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200/60 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/80">
        <CreditCard className="h-3 w-3 shrink-0 text-cyan-600 dark:text-cyan-400" />
        <span className="font-semibold">{m}</span>
        <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-cyan-200/80 text-cyan-800 dark:bg-cyan-900/80 dark:text-cyan-200">
          {rateText}
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
      <Wallet className="h-3 w-3 shrink-0" />
      <span>{m}</span>
    </span>
  );
};

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  stores,
  activeStoreId,
  transactions,
  chartOfAccounts,
  currentUser,
  companyProfile,
  employees = [],
  employeeLoans = [],
  onSaveLoan,
  onSaveTransaction,
  onDeleteTransaction,
  onUpdateStatus,
  onOpenProofModal,
  openCreateModalDirectly,
  onClearDirectModal,
  mdrSettings,
  onNavigateToMdr,
  bookPeriodConfig,
  onOpenBookClosingModal,
}) => {
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | TransactionType>('ALL');
  const [selectedTransferFilter, setSelectedTransferFilter] = useState<
    'ALL' | 'CASH_TO_NON_CASH' | 'NON_CASH_TO_CASH' | 'NON_CASH_TO_NON_CASH' | 'INTER_STORE'
  >('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ALL');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<DatePreset>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isCustomDateOpen, setIsCustomDateOpen] = useState<boolean>(false);
  const [isTransferDropdownOpen, setIsTransferDropdownOpen] = useState<boolean>(false);

  // Active Store Display Name
  const activeStoreName = useMemo(() => {
    if (activeStoreId === 'ALL') return 'Seluruh Cabang (Konsolidasi)';
    return stores.find((s) => s.Store_ID === activeStoreId)?.Store_Name || activeStoreId;
  }, [stores, activeStoreId]);

  // Relative Date Helpers (YYYY-MM-DD)
  const toDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = useMemo(() => getTodayString(), []);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toDateStr(d);
  }, []);

  const sevenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toDateStr(d);
  }, []);

  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toDateStr(d);
  }, []);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(!!openCreateModalDirectly);
  const [modalType, setModalType] = useState<TransactionType>(
    openCreateModalDirectly === 'Transfer_Cash_To_Bank' || openCreateModalDirectly === 'Transfer_Bank_To_Cash'
      ? 'Transfer'
      : (openCreateModalDirectly || 'Pemasukan')
  );

  // Form State
  const [formStoreId, setFormStoreId] = useState(
    activeStoreId === 'ALL' ? (stores[0]?.Store_ID || 'STR-001') : activeStoreId
  );
  const [formTargetStoreId, setFormTargetStoreId] = useState(stores[1]?.Store_ID || 'STR-002');
  const [formDate, setFormDate] = useState(getTodayString());
  const [formCategory, setFormCategory] = useState('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('Cash');
  const [formDirection, setFormDirection] = useState<'Inflow' | 'Outflow'>('Inflow');
  const [formDescription, setFormDescription] = useState('');
  const [formProofUrl, setFormProofUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Kasbon Karyawan Akun 5-101 Form States
  const [formEmployeeId, setFormEmployeeId] = useState<string>('');
  const [formLoanId, setFormLoanId] = useState<string>('');
  const [formKasbonAction, setFormKasbonAction] = useState<'disbursement' | 'repayment' | 'salary_only'>('disbursement');
  const [formOnlyWithKasbon, setFormOnlyWithKasbon] = useState<boolean>(false);

  // Pemindahan Posisi Kas (Tunai vs Non-Tunai / Antar Rekening & Toko)
  const [formTransferType, setFormTransferType] = useState<
    'CASH_TO_NON_CASH' | 'NON_CASH_TO_CASH' | 'NON_CASH_TO_NON_CASH' | 'INTER_STORE'
  >(
    openCreateModalDirectly === 'Transfer_Bank_To_Cash' ? 'NON_CASH_TO_CASH' : 'CASH_TO_NON_CASH'
  );
  const [formSourcePaymentMethod, setFormSourcePaymentMethod] = useState<PaymentMethod>(
    openCreateModalDirectly === 'Transfer_Bank_To_Cash' ? 'Bank Transfer' : 'Cash'
  );
  const [formDestinationPaymentMethod, setFormDestinationPaymentMethod] = useState<PaymentMethod>(
    openCreateModalDirectly === 'Transfer_Bank_To_Cash' ? 'Cash' : 'Bank Transfer'
  );

  const handleSelectTransferType = (
    mode: 'CASH_TO_NON_CASH' | 'NON_CASH_TO_CASH' | 'NON_CASH_TO_NON_CASH' | 'INTER_STORE',
    storeIdOverride?: string,
    targetStoreOverride?: string
  ) => {
    setFormTransferType(mode);
    const currStoreId = storeIdOverride || formStoreId;
    const currStore = stores.find((s) => s.Store_ID === currStoreId);
    const storeName = currStore?.Store_Name || 'Toko';

    if (mode === 'CASH_TO_NON_CASH') {
      setFormSourcePaymentMethod('Cash');
      setFormDestinationPaymentMethod('Bank Transfer');
      setFormPaymentMethod('Cash');
      setFormCategory('1-101 ke 1-102 - Setor Tunai Kas Toko ke Bank BCA');
      setFormDescription(`Setor kas tunai fisik dari kasir ${storeName} ke Rekening Bank BCA Operasional`);
    } else if (mode === 'NON_CASH_TO_CASH') {
      setFormSourcePaymentMethod('Bank Transfer');
      setFormDestinationPaymentMethod('Cash');
      setFormPaymentMethod('Bank Transfer');
      setFormCategory('1-102 ke 1-101 - Tarik Tunai Bank ke Kas Toko');
      setFormDescription(`Tarik tunai dari Rekening Bank BCA untuk kas kecil / laci kasir ${storeName}`);
    } else if (mode === 'NON_CASH_TO_NON_CASH') {
      setFormSourcePaymentMethod('Qris');
      setFormDestinationPaymentMethod('Bank Transfer');
      setFormPaymentMethod('Bank Transfer');
      setFormCategory('1-103 ke 1-102 - Settlement QRIS/E-Wallet ke Bank BCA');
      setFormDescription(`Pemindahan saldo settlement QRIS / E-Wallet ke Rekening Bank BCA Utama`);
    } else if (mode === 'INTER_STORE') {
      setFormSourcePaymentMethod('Bank Transfer');
      setFormDestinationPaymentMethod('Bank Transfer');
      setFormPaymentMethod('Bank Transfer');
      setFormCategory('Transfer Kas / Bank Antar Cabang Toko');
      const targetStore = stores.find((s) => s.Store_ID === (targetStoreOverride || formTargetStoreId));
      setFormDescription(`Transfer kas operasional dari ${storeName} ke ${targetStore?.Store_Name || 'Cabang Tujuan'}`);
    }
  };

  const handleSwapTransferDirection = () => {
    if (formTransferType === 'CASH_TO_NON_CASH') {
      handleSelectTransferType('NON_CASH_TO_CASH');
    } else if (formTransferType === 'NON_CASH_TO_CASH') {
      handleSelectTransferType('CASH_TO_NON_CASH');
    }
  };

  // Posisi Kas Likuiditas Real-Time (Uang Tunai Kasir vs Rekening Bank)
  const cashLiquidityMetrics = useMemo(() => {
    const storeTrxs = transactions.filter((t) => {
      if (t.Status !== 'Approved') return false;
      if (activeStoreId === 'ALL') return true;
      return t.Store_ID === activeStoreId || t.Destination_Store_ID === activeStoreId;
    });

    let cashBalance = 0;
    let bankBalance = 0;
    let totalCashToBankTransfer = 0;
    let totalBankToCashTransfer = 0;

    storeTrxs.forEach((t) => {
      const isCash =
        (t.Payment_Method || '').toLowerCase().includes('cash') ||
        (t.Payment_Method || '').toLowerCase().includes('tunai');
      const gross = t.Gross_Amount || t.Amount || 0;
      const net = typeof t.Net_Amount === 'number' ? t.Net_Amount : (t.Amount || 0);

      if (t.Type === 'Pemasukan') {
        if (isCash) cashBalance += t.Amount;
        else bankBalance += net;
      } else if (t.Type === 'Pengeluaran') {
        const isMdrExpense = t.Category?.includes('5-111') || Boolean(t.MDR_Expense_Ref && !isCash);
        if (isCash) cashBalance -= t.Amount;
        else if (!isMdrExpense) bankBalance -= t.Amount;
      } else if (t.Type === 'Transfer') {
        const desc = (t.Description || '').toLowerCase();
        const cat = (t.Category || '').toLowerCase();
        const isDepositToBank =
          t.Transfer_Type === 'CASH_TO_NON_CASH' ||
          desc.includes('setor') ||
          cat.includes('setor') ||
          (t.Source_Payment_Method === 'Cash' &&
            Boolean(t.Destination_Payment_Method && t.Destination_Payment_Method !== 'Cash'));
        const isWithdrawFromBank =
          t.Transfer_Type === 'NON_CASH_TO_CASH' ||
          desc.includes('tarik') ||
          cat.includes('tarik') ||
          (Boolean(t.Source_Payment_Method && t.Source_Payment_Method !== 'Cash') &&
            t.Destination_Payment_Method === 'Cash');

        if (isDepositToBank) {
          cashBalance -= t.Amount;
          bankBalance += t.Amount;
          totalCashToBankTransfer += t.Amount;
        } else if (isWithdrawFromBank) {
          bankBalance -= t.Amount;
          cashBalance += t.Amount;
          totalBankToCashTransfer += t.Amount;
        } else if (activeStoreId !== 'ALL') {
          if (t.Store_ID === activeStoreId) {
            if (isCash) cashBalance -= t.Amount;
            else bankBalance -= t.Amount;
          }
          if (t.Destination_Store_ID === activeStoreId) {
            if (isCash) cashBalance += t.Amount;
            else bankBalance += t.Amount;
          }
        }
      } else if (t.Type === 'Liability' || t.Type === 'Equity') {
        if (t.Direction === 'Inflow') {
          if (isCash) cashBalance += t.Amount;
          else bankBalance += t.Amount;
        } else {
          if (isCash) cashBalance -= t.Amount;
          else bankBalance -= t.Amount;
        }
      }
    });

    return {
      cashBalance,
      bankBalance,
      totalLiquidity: cashBalance + bankBalance,
      totalCashToBankTransfer,
      totalBankToCashTransfer,
    };
  }, [transactions, activeStoreId]);

  // Check if active formCategory is Akun 5-101 (Beban Gaji & Upah Karyawan / Kasbon)
  const isAccount5101 = useMemo(() => {
    if (modalType !== 'Pengeluaran') return false;
    const cat = (formCategory || '').toLowerCase();
    return cat.includes('5-101') || cat.includes('gaji') || cat.includes('kasbon');
  }, [modalType, formCategory]);

  const selectedEmployee = useMemo(() => {
    if (!formEmployeeId) return null;
    return employees.find((e) => e.Employee_ID === formEmployeeId) || null;
  }, [employees, formEmployeeId]);

  const activeLoanForEmployee = useMemo(() => {
    if (!formEmployeeId) return null;
    return (
      employeeLoans.find(
        (l) => l.Employee_ID === formEmployeeId && l.Status === 'Active' && l.Remaining_Balance > 0
      ) || null
    );
  }, [employeeLoans, formEmployeeId]);

  const employeesWithActiveLoans = useMemo(() => {
    const loanEmpIds = new Set(
      employeeLoans
        .filter((l) => l.Status === 'Active' && l.Remaining_Balance > 0)
        .map((l) => l.Employee_ID)
    );
    return employees.filter((e) => loanEmpIds.has(e.Employee_ID));
  }, [employees, employeeLoans]);

  const selectableEmployees = useMemo(() => {
    if (formOnlyWithKasbon) {
      return employeesWithActiveLoans;
    }
    return employees;
  }, [employees, formOnlyWithKasbon, employeesWithActiveLoans]);

  const handleSelectEmployee = (empId: string) => {
    setFormEmployeeId(empId);
    if (!empId) {
      setFormLoanId('');
      return;
    }
    const emp = employees.find((e) => e.Employee_ID === empId);
    const loan = employeeLoans.find(
      (l) => l.Employee_ID === empId && l.Status === 'Active' && l.Remaining_Balance > 0
    );
    if (loan) {
      setFormLoanId(loan.Loan_ID);
      setFormKasbonAction('repayment');
      if (!formAmount || Number(formAmount) === 0) {
        setFormAmount(loan.Monthly_Installment || loan.Remaining_Balance);
      }
      setFormDescription(
        `Beban Gaji & Kasbon Karyawan: ${emp?.Full_Name || empId} (${empId}) - Ref Kasbon: ${loan.Loan_ID}`
      );
    } else {
      setFormLoanId('');
      setFormKasbonAction('salary_only');
      setFormDescription(
        `Beban Gaji & Upah Karyawan: ${emp?.Full_Name || empId} (${empId})`
      );
    }
  };

  // Live MDR Calculation for Modal Form (Dynamic using configured mdrSettings)
  const currentMdrCalc = useMemo(() => {
    return calculateMDR(Number(formAmount) || 0, formPaymentMethod, modalType, mdrSettings);
  }, [formAmount, formPaymentMethod, modalType, mdrSettings]);

  // Handle open modal directly from props (e.g. from Dashboard quick action)
  React.useEffect(() => {
    if (openCreateModalDirectly) {
      if (openCreateModalDirectly === 'Transfer_Cash_To_Bank') {
        handleOpenAddModal('Transfer', 'CASH_TO_NON_CASH');
      } else if (openCreateModalDirectly === 'Transfer_Bank_To_Cash') {
        handleOpenAddModal('Transfer', 'NON_CASH_TO_CASH');
      } else {
        handleOpenAddModal(openCreateModalDirectly);
      }
      if (onClearDirectModal) onClearDirectModal();
    }
  }, [openCreateModalDirectly, onClearDirectModal]);

  // Set default category when type or coa changes
  React.useEffect(() => {
    if (modalType === 'Transfer') {
      setFormCategory('Transfer Kas / Bank Antar Toko');
    } else {
      const coaOptions = chartOfAccounts.filter((c) => {
        if (modalType === 'Pemasukan') return c.Category === 'Revenue';
        if (modalType === 'Pengeluaran') return c.Category === 'Expense';
        if (modalType === 'Liability') return c.Category === 'Liability';
        if (modalType === 'Equity') return c.Category === 'Equity';
        return false;
      });
      if (coaOptions.length > 0 && !formCategory) {
        setFormCategory(`${coaOptions[0].Account_Code} - ${coaOptions[0].Account_Name}`);
      }
    }
  }, [modalType, chartOfAccounts, formCategory]);

  // Filtered list
  const filteredList = useMemo(() => {
    return transactions.filter((trx) => {
      // Store filter
      if (activeStoreId !== 'ALL') {
        const matchStore =
          trx.Store_ID === activeStoreId || trx.Destination_Store_ID === activeStoreId;
        if (!matchStore) return false;
      }

      // Type filter
      if (selectedType !== 'ALL' && trx.Type !== selectedType) return false;

      // Category filter
      if (selectedCategory !== 'ALL' && trx.Category !== selectedCategory) return false;

      // Payment Method filter
      if (selectedPaymentMethod !== 'ALL') {
        const pLower = (trx.Payment_Method || '').toLowerCase();
        const fLower = selectedPaymentMethod.toLowerCase();
        if (pLower !== fLower && !pLower.includes(fLower)) return false;
      }

      // Date filter
      if (trx.Date) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const [yStr, mStr] = trx.Date.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10);

        if (dateFilter === 'today') {
          if (trx.Date !== todayStr) return false;
        } else if (dateFilter === 'yesterday') {
          if (trx.Date !== yesterdayStr) return false;
        } else if (dateFilter === 'last_7_days') {
          if (trx.Date < sevenDaysAgoStr || trx.Date > todayStr) return false;
        } else if (dateFilter === 'last_30_days') {
          if (trx.Date < thirtyDaysAgoStr || trx.Date > todayStr) return false;
        } else if (dateFilter === 'this_month') {
          if (y !== currentYear || m !== currentMonth) return false;
        } else if (dateFilter === 'last_month') {
          const lastM = currentMonth === 1 ? 12 : currentMonth - 1;
          const lastY = currentMonth === 1 ? currentYear - 1 : currentYear;
          if (y !== lastY || m !== lastM) return false;
        } else if (dateFilter === 'this_year') {
          if (y !== currentYear) return false;
        } else if (dateFilter === 'custom') {
          if (customStartDate && customEndDate) {
            const start = customStartDate <= customEndDate ? customStartDate : customEndDate;
            const end = customStartDate <= customEndDate ? customEndDate : customStartDate;
            if (trx.Date < start || trx.Date > end) return false;
          } else if (customStartDate) {
            if (trx.Date < customStartDate) return false;
          } else if (customEndDate) {
            if (trx.Date > customEndDate) return false;
          }
        }
      }

      // Employee / Kasbon filter
      if (selectedEmployeeFilter !== 'ALL') {
        if (selectedEmployeeFilter === 'WITH_KASBON') {
          const isKasbon =
            Boolean(trx.Employee_ID) ||
            Boolean(trx.Loan_ID) ||
            (trx.Category && trx.Category.includes('5-101'));
          if (!isKasbon) return false;
        } else {
          if (trx.Employee_ID !== selectedEmployeeFilter) return false;
        }
      }

      // Transfer Type filter (when selectedTransferFilter is active)
      if (selectedTransferFilter !== 'ALL') {
        if (trx.Type !== 'Transfer') return false;
        const desc = (trx.Description || '').toLowerCase();
        const cat = (trx.Category || '').toLowerCase();
        const tMode =
          trx.Transfer_Type ||
          (desc.includes('setor') || cat.includes('setor')
            ? 'CASH_TO_NON_CASH'
            : desc.includes('tarik') || cat.includes('tarik')
            ? 'NON_CASH_TO_CASH'
            : desc.includes('qris') || cat.includes('qris')
            ? 'NON_CASH_TO_NON_CASH'
            : trx.Destination_Store_ID
            ? 'INTER_STORE'
            : 'CASH_TO_NON_CASH');
        if (tMode !== selectedTransferFilter) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchText =
          trx.Transaction_ID.toLowerCase().includes(q) ||
          trx.Description.toLowerCase().includes(q) ||
          trx.Category.toLowerCase().includes(q) ||
          trx.Payment_Method.toLowerCase().includes(q) ||
          trx.Created_By.toLowerCase().includes(q) ||
          (trx.Employee_Name && trx.Employee_Name.toLowerCase().includes(q)) ||
          (trx.Employee_ID && trx.Employee_ID.toLowerCase().includes(q)) ||
          (trx.Loan_ID && trx.Loan_ID.toLowerCase().includes(q));
        if (!matchText) return false;
      }

      return true;
    });
  }, [
    transactions,
    activeStoreId,
    selectedType,
    selectedTransferFilter,
    selectedCategory,
    selectedPaymentMethod,
    selectedEmployeeFilter,
    dateFilter,
    customStartDate,
    customEndDate,
    todayStr,
    yesterdayStr,
    sevenDaysAgoStr,
    thirtyDaysAgoStr,
    searchTerm,
  ]);

  // Form file upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormProofUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleOpenAddModal = (
    type: TransactionType,
    initialTransferMode: 'CASH_TO_NON_CASH' | 'NON_CASH_TO_CASH' | 'NON_CASH_TO_NON_CASH' | 'INTER_STORE' = 'CASH_TO_NON_CASH'
  ) => {
    setEditingTransaction(null);
    setModalType(type);
    setFormDate(getTodayString());
    setFormAmount('');
    setFormDescription('');
    setFormProofUrl('');
    setFormPaymentMethod(type === 'Transfer' ? 'Bank Transfer' : 'Cash');
    setFormStoreId(activeStoreId === 'ALL' ? (stores[0]?.Store_ID || 'STR-001') : activeStoreId);
    setFormDirection('Inflow');
    setFormEmployeeId('');
    setFormLoanId('');
    setFormKasbonAction('disbursement');
    setFormOnlyWithKasbon(false);

    if (type === 'Transfer') {
      const activeStoreToUse = activeStoreId === 'ALL' ? (stores[0]?.Store_ID || 'STR-001') : activeStoreId;
      handleSelectTransferType(initialTransferMode, activeStoreToUse);
    } else {
      const coaOptions = chartOfAccounts.filter((c) => {
        if (type === 'Pemasukan') return c.Category === 'Revenue';
        if (type === 'Pengeluaran') return c.Category === 'Expense';
        if (type === 'Liability') return c.Category === 'Liability';
        if (type === 'Equity') return c.Category === 'Equity';
        return false;
      });
      if (coaOptions.length > 0) {
        setFormCategory(`${coaOptions[0].Account_Code} - ${coaOptions[0].Account_Name}`);
      }
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (trx: Transaction) => {
    setEditingTransaction(trx);
    setModalType(trx.Type);
    setFormDate(trx.Date);
    setFormAmount(trx.Gross_Amount ?? trx.Amount);
    setFormDescription(trx.Description === '-' ? '' : trx.Description);
    setFormProofUrl(trx.Proof_Attachment_URL || '');
    setFormPaymentMethod(trx.Payment_Method);
    setFormStoreId(trx.Store_ID);
    setFormDirection(trx.Direction || 'Inflow');
    if (trx.Destination_Store_ID) {
      setFormTargetStoreId(trx.Destination_Store_ID);
    }
    setFormCategory(trx.Category);
    setFormEmployeeId(trx.Employee_ID || '');
    setFormLoanId(trx.Loan_ID || '');
    setFormKasbonAction('repayment');
    setFormOnlyWithKasbon(false);

    if (trx.Type === 'Transfer') {
      const mode = trx.Transfer_Type || (
        trx.Source_Payment_Method === 'Cash' || (trx.Description || '').toLowerCase().includes('setor')
          ? 'CASH_TO_NON_CASH'
          : (trx.Destination_Payment_Method === 'Cash' || (trx.Description || '').toLowerCase().includes('tarik'))
          ? 'NON_CASH_TO_CASH'
          : trx.Destination_Store_ID
          ? 'INTER_STORE'
          : 'CASH_TO_NON_CASH'
      );
      setFormTransferType(mode);
      setFormSourcePaymentMethod(trx.Source_Payment_Method || (mode === 'CASH_TO_NON_CASH' ? 'Cash' : 'Bank Transfer'));
      setFormDestinationPaymentMethod(trx.Destination_Payment_Method || (mode === 'NON_CASH_TO_CASH' ? 'Cash' : 'Bank Transfer'));
    }

    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || Number(formAmount) <= 0) {
      alert('Nominal harus lebih besar dari 0');
      return;
    }

    // Peringatan jika tanggal transaksi berada pada periode yang sudah TUTUP BUKU
    if (
      bookPeriodConfig &&
      bookPeriodConfig.currentPeriodStatus === 'CLOSED' &&
      formDate >= bookPeriodConfig.startDate &&
      formDate <= bookPeriodConfig.endDate
    ) {
      const proceed = confirm(
        `PERINGATAN TUTUP BUKU:\nTanggal transaksi (${formDate}) berada dalam periode ${bookPeriodConfig.currentPeriod} yang telah DITUTUP (${bookPeriodConfig.startDate} s/d ${bookPeriodConfig.endDate}).\n\nApakah Anda yakin ingin tetap menyimpan perubahan transaksi ini?`
      );
      if (!proceed) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const grossAmount = Number(formAmount);
      const isLiabOrEq = modalType === 'Liability' || modalType === 'Equity';
      const mdrCalc = calculateMDR(grossAmount, formPaymentMethod, modalType, mdrSettings);

      if (editingTransaction) {
        // Mode Edit Transaksi yang sudah ada
        const existingId = editingTransaction.Transaction_ID;
        const existingMdrRef = editingTransaction.MDR_Expense_Ref;

        const updatedTrx: Transaction = {
          ...editingTransaction,
          Date: formDate,
          Store_ID: formStoreId,
          Type: modalType,
          Category: formCategory,
          Amount: grossAmount,
          Payment_Method: modalType === 'Transfer'
            ? (formTransferType === 'CASH_TO_NON_CASH' ? 'Cash' : 'Bank Transfer')
            : formPaymentMethod,
          Description: formDescription || (modalType === 'Transfer' ? 'Pemindahan dana kas' : '-'),
          Proof_Attachment_URL: formProofUrl,
          Destination_Store_ID: modalType === 'Transfer' && formTransferType === 'INTER_STORE' ? formTargetStoreId : undefined,
          Direction: isLiabOrEq ? formDirection : undefined,
          Gross_Amount: grossAmount,
          MDR_Rate: mdrCalc.isApplicable ? mdrCalc.rate : undefined,
          MDR_Fee: mdrCalc.isApplicable ? mdrCalc.mdrFee : undefined,
          Net_Amount: mdrCalc.isApplicable ? mdrCalc.netAmount : grossAmount,
          MDR_Expense_Ref: mdrCalc.isApplicable && mdrCalc.mdrFee > 0
            ? (existingMdrRef || `${existingId}-MDR`)
            : undefined,
          Transfer_Type: modalType === 'Transfer' ? formTransferType : undefined,
          Source_Payment_Method: modalType === 'Transfer' ? formSourcePaymentMethod : undefined,
          Destination_Payment_Method: modalType === 'Transfer' ? formDestinationPaymentMethod : undefined,
          Source_Account: modalType === 'Transfer'
            ? (formTransferType === 'CASH_TO_NON_CASH'
              ? '1-101 - Kas Toko (Cash Drawer)'
              : formTransferType === 'NON_CASH_TO_CASH'
              ? '1-102 - Rekening Bank BCA Operasional'
              : '1-103 - Kas Rekening Kasir QRIS/E-Wallet')
            : undefined,
          Destination_Account: modalType === 'Transfer'
            ? (formTransferType === 'CASH_TO_NON_CASH'
              ? '1-102 - Rekening Bank BCA Operasional'
              : formTransferType === 'NON_CASH_TO_CASH'
              ? '1-101 - Kas Toko (Cash Drawer)'
              : '1-102 - Rekening Bank BCA Operasional')
            : undefined,
          Employee_ID: isAccount5101 && formEmployeeId ? formEmployeeId : undefined,
          Employee_Name: isAccount5101 && selectedEmployee ? selectedEmployee.Full_Name : undefined,
          Loan_ID: isAccount5101 && (formLoanId || activeLoanForEmployee?.Loan_ID) ? (formLoanId || activeLoanForEmployee?.Loan_ID) : undefined,
        };

        if (mdrCalc.isApplicable && mdrCalc.mdrFee > 0) {
          const mdrExpenseId = updatedTrx.MDR_Expense_Ref || `${existingId}-MDR`;
          const mdrExpenseTrx: Transaction = {
            Transaction_ID: mdrExpenseId,
            Date: formDate,
            Store_ID: formStoreId,
            Type: 'Pengeluaran',
            Category: COA_MDR.FullLabel,
            Amount: mdrCalc.mdrFee,
            Payment_Method: formPaymentMethod,
            Description: `Potongan MDR (${mdrCalc.ratePercent}) Biaya Admin Bank transaksi ref: ${existingId} (${formDescription || 'Pemasukan Non-Tunai'})`,
            Proof_Attachment_URL: formProofUrl,
            Created_By: editingTransaction.Created_By || currentUser.Full_Name,
            Status: editingTransaction.Status || 'Approved',
            MDR_Expense_Ref: existingId,
          };
          await onSaveTransaction([updatedTrx, mdrExpenseTrx]);
        } else {
          // Jika sebelumnya ada transaksi beban MDR tapi kini metode berubah jadi tunai/bebas MDR, hapus referensi MDR lama
          if (existingMdrRef) {
            onDeleteTransaction(existingMdrRef).catch(() => {});
          }
          await onSaveTransaction(updatedTrx);
        }

        setIsModalOpen(false);
        setEditingTransaction(null);
        return;
      }

      // Mode Tambah Transaksi Baru
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const newId = `TRX-${yearMonth}-${randomSuffix}`;
      const mdrExpenseId =
        mdrCalc.isApplicable && mdrCalc.mdrFee > 0
          ? `TRX-${yearMonth}-${randomSuffix}-MDR`
          : undefined;

      const newTrx: Transaction = {
        Transaction_ID: newId,
        Date: formDate,
        Store_ID: formStoreId,
        Type: modalType,
        Category: formCategory,
        Amount: grossAmount, // Pendapatan Bruto (Total kotor transaksi dari pelanggan)
        Payment_Method: modalType === 'Transfer'
          ? (formTransferType === 'CASH_TO_NON_CASH' ? 'Cash' : 'Bank Transfer')
          : formPaymentMethod,
        Description: formDescription || (modalType === 'Transfer' ? 'Pemindahan dana kas' : '-'),
        Proof_Attachment_URL: formProofUrl,
        Created_By: currentUser.Full_Name,
        Status: 'Approved',
        Destination_Store_ID: modalType === 'Transfer' && formTransferType === 'INTER_STORE' ? formTargetStoreId : undefined,
        Direction: isLiabOrEq ? formDirection : undefined,
        Gross_Amount: grossAmount,
        MDR_Rate: mdrCalc.isApplicable ? mdrCalc.rate : undefined,
        MDR_Fee: mdrCalc.isApplicable ? mdrCalc.mdrFee : undefined,
        Net_Amount: mdrCalc.isApplicable ? mdrCalc.netAmount : grossAmount,
        MDR_Expense_Ref: mdrExpenseId,
        Transfer_Type: modalType === 'Transfer' ? formTransferType : undefined,
        Source_Payment_Method: modalType === 'Transfer' ? formSourcePaymentMethod : undefined,
        Destination_Payment_Method: modalType === 'Transfer' ? formDestinationPaymentMethod : undefined,
        Source_Account: modalType === 'Transfer'
          ? (formTransferType === 'CASH_TO_NON_CASH'
            ? '1-101 - Kas Toko (Cash Drawer)'
            : formTransferType === 'NON_CASH_TO_CASH'
            ? '1-102 - Rekening Bank BCA Operasional'
            : '1-103 - Kas Rekening Kasir QRIS/E-Wallet')
          : undefined,
        Destination_Account: modalType === 'Transfer'
          ? (formTransferType === 'CASH_TO_NON_CASH'
            ? '1-102 - Rekening Bank BCA Operasional'
            : formTransferType === 'NON_CASH_TO_CASH'
            ? '1-101 - Kas Toko (Cash Drawer)'
            : '1-102 - Rekening Bank BCA Operasional')
          : undefined,
        Employee_ID: isAccount5101 && formEmployeeId ? formEmployeeId : undefined,
        Employee_Name: isAccount5101 && selectedEmployee ? selectedEmployee.Full_Name : undefined,
        Loan_ID: isAccount5101 && (formLoanId || activeLoanForEmployee?.Loan_ID) ? (formLoanId || activeLoanForEmployee?.Loan_ID) : undefined,
      };

      if (mdrCalc.isApplicable && mdrCalc.mdrFee > 0 && mdrExpenseId) {
        // Otomatis catat potongan MDR sebagai pengeluaran/beban pada Akun COA 5-111 - Biaya Admin Bank / MDR
        const mdrExpenseTrx: Transaction = {
          Transaction_ID: mdrExpenseId,
          Date: formDate,
          Store_ID: formStoreId,
          Type: 'Pengeluaran',
          Category: COA_MDR.FullLabel,
          Amount: mdrCalc.mdrFee,
          Payment_Method: formPaymentMethod,
          Description: `Potongan MDR (${mdrCalc.ratePercent}) Biaya Admin Bank transaksi ref: ${newId} (${formDescription || 'Pemasukan Non-Tunai'})`,
          Proof_Attachment_URL: formProofUrl,
          Created_By: currentUser.Full_Name,
          Status: 'Approved',
          MDR_Expense_Ref: newId,
        };

        await onSaveTransaction([newTrx, mdrExpenseTrx]);
      } else {
        await onSaveTransaction(newTrx);
      }

      // Hubungkan cicilan / pencairan kasbon ke buku Pinjaman Karyawan
      if (isAccount5101 && onSaveLoan) {
        if (formKasbonAction === 'repayment' && activeLoanForEmployee) {
          const repayAmt = grossAmount;
          const newPaid = activeLoanForEmployee.Paid_Amount + repayAmt;
          const newRemaining = Math.max(0, activeLoanForEmployee.Total_Amount - newPaid);
          const updatedLoan: EmployeeLoan = {
            ...activeLoanForEmployee,
            Paid_Amount: newPaid,
            Remaining_Balance: newRemaining,
            Status: newRemaining === 0 ? 'Paid_Off' : 'Active',
            Repayments: [
              ...(activeLoanForEmployee.Repayments || []),
              {
                Repayment_ID: `REP-TRX-${newId.slice(-6)}`,
                Date: formDate,
                Amount: repayAmt,
                Notes: `Cicilan/Potongan Kasbon via Transaksi Pengeluaran ${newId} (Akun 5-101)`,
                Created_By: currentUser.Full_Name,
              },
            ],
          };
          await onSaveLoan(updatedLoan);
        } else if (
          formKasbonAction === 'disbursement' &&
          selectedEmployee
        ) {
          const newLoanId = `LOAN-${Date.now().toString().slice(-6)}`;
          const newLoan: EmployeeLoan = {
            Loan_ID: newLoanId,
            Employee_ID: selectedEmployee.Employee_ID,
            Employee_Name: selectedEmployee.Full_Name,
            Store_ID: formStoreId,
            Total_Amount: grossAmount,
            Tenor_Months: 1,
            Monthly_Installment: grossAmount,
            Paid_Amount: 0,
            Remaining_Balance: grossAmount,
            Start_Date: formDate,
            Purpose: formDescription || 'Kasbon / Pinjaman Karyawan',
            Status: 'Active',
            Repayments: [],
            Notes: `Pencairan Kasbon dicatat via Transaksi Pengeluaran ${newId} (Akun 5-101)`,
            Created_At: getTodayString(),
          };
          await onSaveLoan(newLoan);
        }
      }

      setIsModalOpen(false);
      setEditingTransaction(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    const headers = [
      'ID Transaksi',
      'Tanggal',
      'ID Toko',
      'Tipe',
      'Kategori Akun',
      'Nominal Bruto (Rp)',
      'Metode Pembayaran',
      'Tarif MDR',
      'Potongan MDR Admin Bank (Rp)',
      'Nominal Netto Rekening (Rp)',
      'Keterangan',
      'Dicatat Oleh',
      'Status',
    ];
    const rows = filteredList.map((t) => [
      t.Transaction_ID,
      t.Date,
      t.Store_ID,
      t.Type,
      t.Category,
      t.Gross_Amount || t.Amount,
      t.Payment_Method,
      t.MDR_Rate ? `${(t.MDR_Rate * 100).toFixed(2)}%` : '-',
      t.MDR_Fee || 0,
      typeof t.Net_Amount === 'number' ? t.Net_Amount : t.Amount,
      t.Description,
      t.Created_By,
      t.Status,
    ]);
    const dateSuffix =
      dateFilter === 'custom' && customStartDate
        ? `_${customStartDate}_sd_${customEndDate || customStartDate}`
        : `_${dateFilter}`;
    StorageService.exportToExcel(`Transaksi_Keuangan_${activeStoreId}${dateSuffix}`, headers, rows, 'Transaksi');
  };

  const dateFilterLabel = useMemo(() => {
    switch (dateFilter) {
      case 'today':
        return `Hari Ini (${formatDate(todayStr)})`;
      case 'yesterday':
        return `Kemarin (${formatDate(yesterdayStr)})`;
      case 'last_7_days':
        return `7 Hari Terakhir (${formatDate(sevenDaysAgoStr)} s/d ${formatDate(todayStr)})`;
      case 'last_30_days':
        return `30 Hari Terakhir (${formatDate(thirtyDaysAgoStr)} s/d ${formatDate(todayStr)})`;
      case 'this_month':
        return 'Bulan Ini';
      case 'last_month':
        return 'Bulan Lalu';
      case 'this_year':
        return 'Tahun Ini';
      case 'custom':
        if (customStartDate && customEndDate) {
          if (customStartDate === customEndDate) {
            return `Tanggal: ${formatDate(customStartDate)}`;
          }
          return `${formatDate(customStartDate)} s/d ${formatDate(customEndDate)}`;
        }
        if (customStartDate) return `Mulai ${formatDate(customStartDate)}`;
        if (customEndDate) return `Sampai ${formatDate(customEndDate)}`;
        return 'Rentang Tanggal Kustom';
      case 'all':
      default:
        return 'Semua Periode';
    }
  }, [dateFilter, customStartDate, customEndDate, todayStr, yesterdayStr, sevenDaysAgoStr, thirtyDaysAgoStr]);

  // Financial summary of currently filtered transactions
  const summaryMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    let transfer = 0;
    let cashToBank = 0;
    let bankToCash = 0;

    for (const trx of filteredList) {
      if (trx.Status === 'Approved') {
        if (trx.Type === 'Pemasukan') {
          income += trx.Amount;
        } else if (trx.Type === 'Pengeluaran') {
          expense += trx.Amount;
        } else if (trx.Type === 'Transfer') {
          transfer += trx.Amount;
          const desc = (trx.Description || '').toLowerCase();
          const cat = (trx.Category || '').toLowerCase();
          const isDeposit =
            trx.Transfer_Type === 'CASH_TO_NON_CASH' ||
            desc.includes('setor') ||
            cat.includes('setor') ||
            trx.Source_Payment_Method === 'Cash';
          const isWithdraw =
            trx.Transfer_Type === 'NON_CASH_TO_CASH' ||
            desc.includes('tarik') ||
            cat.includes('tarik') ||
            trx.Destination_Payment_Method === 'Cash';
          if (isDeposit) {
            cashToBank += trx.Amount;
          } else if (isWithdraw) {
            bankToCash += trx.Amount;
          }
        } else if (trx.Type === 'Liability' || trx.Type === 'Equity') {
          if (trx.Direction === 'Inflow') {
            income += trx.Amount;
          } else {
            expense += trx.Amount;
          }
        }
      }
    }

    return {
      income,
      expense,
      netCashFlow: income - expense,
      transfer,
      cashToBank,
      bankToCash,
    };
  }, [filteredList]);

  const handleExportPDF = () => {
    const activeStoreName =
      activeStoreId === 'ALL'
        ? 'Seluruh Cabang (Konsolidasi)'
        : stores.find((s) => s.Store_ID === activeStoreId)?.Store_Name || activeStoreId;

    exportTransactionsPdf({
      companyProfile,
      activeStoreName,
      transactions: filteredList,
      dateFilterLabel,
      typeFilterLabel: selectedType === 'ALL' ? 'Semua Tipe' : selectedType,
      categoryFilterLabel: selectedCategory === 'ALL' ? 'Semua Kategori' : selectedCategory,
      totalIncome: summaryMetrics.income,
      totalExpense: summaryMetrics.expense,
      netCashFlow: summaryMetrics.netCashFlow,
      totalCash: cashLiquidityMetrics.cashBalance,
      totalBank: cashLiquidityMetrics.bankBalance,
      totalLiquidity: cashLiquidityMetrics.totalLiquidity,
      printedBy: currentUser.Full_Name,
    });
  };

  const isFilterActive =
    searchTerm !== '' ||
    selectedType !== 'ALL' ||
    selectedTransferFilter !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    selectedPaymentMethod !== 'ALL' ||
    dateFilter !== 'this_month' ||
    customStartDate !== '' ||
    customEndDate !== '';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedType('ALL');
    setSelectedTransferFilter('ALL');
    setSelectedCategory('ALL');
    setSelectedPaymentMethod('ALL');
    setSelectedEmployeeFilter('ALL');
    setDateFilter('this_month');
    setCustomStartDate('');
    setCustomEndDate('');
    setIsCustomDateOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Transaksi Keuangan (Cash Flow)
            </h1>
            {bookPeriodConfig && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  bookPeriodConfig.currentPeriodStatus === 'OPEN'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {bookPeriodConfig.currentPeriodStatus === 'OPEN' ? (
                  <BookOpen className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                <span>
                  {bookPeriodConfig.currentPeriodStatus === 'OPEN' ? 'Buku Terbuka' : 'Buku Ditutup'}
                </span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pencatatan mutasi kas, pengeluaran beban, kewajiban (liability), dan modal saham/ekuitas (equity)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {bookPeriodConfig && onOpenBookClosingModal && (
            <button
              onClick={onOpenBookClosingModal}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors shadow-2xs ${
                bookPeriodConfig.currentPeriodStatus === 'OPEN'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
              title="Kelola Buka Buku & Tutup Buku Laporan Keuangan serta Aturan Tanggal"
            >
              {bookPeriodConfig.currentPeriodStatus === 'OPEN' ? (
                <BookOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              )}
              <span>{bookPeriodConfig.currentPeriodStatus === 'OPEN' ? 'Buka Buku' : 'Tutup Buku'}</span>
            </button>
          )}

          {onNavigateToMdr && (
            <button
              onClick={onNavigateToMdr}
              className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/80 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/70 transition-colors shadow-2xs"
              title="Atur persentase Tarif MDR Non-Tunai (QRIS, Debit BCA, Debit Bank Lain)"
            >
              <Percent className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>Atur Tarif MDR</span>
            </button>
          )}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition-colors shadow-xs"
            title="Cetak Laporan Transaksi Keuangan ke format PDF"
          >
            <FileDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Cetak PDF</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 shadow-2xs transition-colors cursor-pointer"
            title="Ekspor seluruh data transaksi ke format Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Ekspor Excel</span>
          </button>
          <button
            onClick={() => handleOpenAddModal('Pemasukan')}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>+ Pemasukan</span>
          </button>
          <button
            onClick={() => handleOpenAddModal('Pengeluaran')}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>+ Pengeluaran</span>
          </button>
          {/* Pemindahan Posisi Kas (Tunai ⇄ Non-Tunai) */}
          <div className="relative inline-flex rounded-lg shadow-xs">
            <button
              onClick={() => handleOpenAddModal('Transfer', 'CASH_TO_NON_CASH')}
              className="flex items-center gap-1.5 rounded-l-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
              title="Catat Pemindahan Kas dari Uang Tunai ke Bank atau sebaliknya"
            >
              <Repeat className="h-3.5 w-3.5" />
              <span>⇄ Pemindahan Kas</span>
            </button>
            <button
              type="button"
              onClick={() => setIsTransferDropdownOpen(!isTransferDropdownOpen)}
              className="flex items-center px-2 rounded-r-lg bg-blue-700 text-white hover:bg-blue-800 border-l border-blue-500 transition-colors cursor-pointer"
              title="Pilih arah pemindahan dana kas spesifik"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {isTransferDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-blue-200 bg-white p-1.5 shadow-xl z-30 dark:border-blue-800 dark:bg-slate-900 animate-in fade-in zoom-in-95">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Pilih Arah Pemindahan Kas:
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsTransferDropdownOpen(false);
                    handleOpenAddModal('Transfer', 'CASH_TO_NON_CASH');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg text-left hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                >
                  <span className="p-1 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    🏦
                  </span>
                  <div>
                    <div className="font-semibold text-blue-900 dark:text-blue-200">Setor Tunai (Kas ➔ Bank)</div>
                    <div className="text-[10px] text-slate-400">Kasir Toko setor ke Rekening BCA</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsTransferDropdownOpen(false);
                    handleOpenAddModal('Transfer', 'NON_CASH_TO_CASH');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg text-left hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                >
                  <span className="p-1 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                    💵
                  </span>
                  <div>
                    <div className="font-semibold text-emerald-900 dark:text-emerald-200">Tarik Tunai (Bank ➔ Kas)</div>
                    <div className="text-[10px] text-slate-400">Tarik bank untuk modal kasir / petty cash</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsTransferDropdownOpen(false);
                    handleOpenAddModal('Transfer', 'NON_CASH_TO_NON_CASH');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg text-left hover:bg-purple-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                >
                  <span className="p-1 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                    📲
                  </span>
                  <div>
                    <div className="font-semibold text-purple-900 dark:text-purple-200">Settlement QRIS ➔ Bank</div>
                    <div className="text-[10px] text-slate-400">Cairkan saldo QRIS ke Rekening BCA</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsTransferDropdownOpen(false);
                    handleOpenAddModal('Transfer', 'INTER_STORE');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium border-t border-slate-100 dark:border-slate-800 mt-1 pt-1.5 cursor-pointer"
                >
                  <span className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    🏬
                  </span>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">Transfer Antar Cabang Toko</div>
                    <div className="text-[10px] text-slate-400">Pindah kas operasional antar outlet</div>
                  </div>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => handleOpenAddModal('Liability')}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs transition-colors"
            title="Catat Transaksi Hutang / Kewajiban (Pinjaman, Hutang Dagang, Pelunasan)"
          >
            <Scale className="h-4 w-4" />
            <span>+ Liability</span>
          </button>
          <button
            onClick={() => handleOpenAddModal('Equity')}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 shadow-xs transition-colors"
            title="Catat Transaksi Ekuitas / Modal (Setoran Modal Pemilik, Prive, Dividen)"
          >
            <Coins className="h-4 w-4" />
            <span>+ Equity</span>
          </button>
        </div>
      </div>

      {/* Widget Khusus: Ringkasan Posisi Kas Likuiditas & Tombol Cepat Pemindahan Dana */}
      <div className="rounded-xl border border-blue-200/90 bg-linear-to-r from-blue-50/90 via-sky-50/50 to-indigo-50/80 p-4 dark:border-blue-900/60 dark:from-blue-950/40 dark:via-slate-900 dark:to-indigo-950/30 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Sisi Kiri: Status Saldo Likuiditas Kas Toko vs Bank */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Posisi Kas & Bank ({activeStoreName})
                  </h3>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                    Tunai ⇄ Non-Tunai
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Saldo uang kas fisik kasir toko dan saldo rekening bank operasional
                </p>
              </div>
            </div>

            {/* Pill Balances */}
            <div className="flex flex-wrap items-center gap-2 sm:border-l sm:border-blue-200/80 sm:pl-4 dark:border-blue-800">
              {/* Uang Tunai */}
              <div className="rounded-lg border border-emerald-200 bg-white/90 px-3 py-1.5 shadow-2xs dark:border-emerald-800 dark:bg-slate-900/90">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                  <Banknote className="h-3.5 w-3.5" />
                  <span>KAS TUNAI (LACI KASIR):</span>
                </div>
                <div className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  {formatRupiah(cashLiquidityMetrics.cashBalance)}
                </div>
              </div>

              {/* Uang Bank */}
              <div className="rounded-lg border border-blue-200 bg-white/90 px-3 py-1.5 shadow-2xs dark:border-blue-800 dark:bg-slate-900/90">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-800 dark:text-blue-300">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>NON-TUNAI (BANK BCA):</span>
                </div>
                <div className="text-sm font-bold font-mono text-blue-700 dark:text-blue-400">
                  {formatRupiah(cashLiquidityMetrics.bankBalance)}
                </div>
              </div>

              {/* Total */}
              <div className="rounded-lg border border-purple-200 bg-white/90 px-3 py-1.5 shadow-2xs dark:border-purple-800 dark:bg-slate-900/90">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-800 dark:text-purple-300">
                  <Wallet className="h-3.5 w-3.5" />
                  <span>TOTAL LIKUIDITAS:</span>
                </div>
                <div className="text-sm font-bold font-mono text-purple-700 dark:text-purple-400">
                  {formatRupiah(cashLiquidityMetrics.totalLiquidity)}
                </div>
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Tombol Tindakan Cepat Pemindahan Dana */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenAddModal('Transfer', 'CASH_TO_NON_CASH')}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Pindahkan uang tunai fisik dari laci kasir untuk disetor ke Rekening Bank BCA"
            >
              <Banknote className="h-3.5 w-3.5" />
              <span>+ Setor Tunai (Kas ➔ Bank)</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddModal('Transfer', 'NON_CASH_TO_CASH')}
              className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white hover:bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-slate-800 dark:text-blue-200 dark:hover:bg-slate-750 px-3 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Tarik saldo dari Rekening Bank untuk mengisi kas kecil / modal kasir toko"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>+ Tarik Tunai (Bank ➔ Kas)</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddModal('Transfer', 'NON_CASH_TO_NON_CASH')}
              className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/80 hover:bg-purple-100 text-purple-800 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-200 px-2.5 py-2 text-xs font-semibold transition-colors cursor-pointer"
              title="Settlement saldo QRIS / dompet digital ke Rekening Giro Bank BCA"
            >
              <QrCode className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>Settlement QRIS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Pencarian Transaksi
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari ID, keterangan, nama..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Date Preset Selector & Custom Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Pilih Periode Tanggal
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCustomDateOpen(!isCustomDateOpen);
                  if (!isCustomDateOpen && dateFilter !== 'custom') {
                    setDateFilter('custom');
                  }
                }}
                className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 cursor-pointer"
                title="Buka pemilih rentang tanggal khusus"
              >
                <Calendar className="h-3 w-3" />
                <span>{isCustomDateOpen ? 'Tutup Tanggal' : 'Pilih Tanggal'}</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={dateFilter}
                onChange={(e) => {
                  const val = e.target.value as DatePreset;
                  setDateFilter(val);
                  if (val === 'custom') {
                    setIsCustomDateOpen(true);
                  }
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
              >
                <option value="this_month">📅 Bulan Ini (Default)</option>
                <option value="today">⚡ Hari Ini</option>
                <option value="yesterday">⏪ Kemarin</option>
                <option value="last_7_days">📊 7 Hari Terakhir</option>
                <option value="last_30_days">📆 30 Hari Terakhir</option>
                <option value="last_month">🗓️ Bulan Lalu</option>
                <option value="this_year">📈 Tahun Ini</option>
                <option value="custom">🎯 Pilih Tanggal / Rentang (Kustom)...</option>
                <option value="all">🌐 Semua Waktu</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setIsCustomDateOpen(!isCustomDateOpen);
                  if (!isCustomDateOpen && dateFilter !== 'custom') {
                    setDateFilter('custom');
                  }
                }}
                className={`p-1.5 rounded-lg border text-xs transition-colors shrink-0 cursor-pointer ${
                  dateFilter === 'custom' || isCustomDateOpen
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-300'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                }`}
                title="Buka / Tutup Kalender Rentang Tanggal"
              >
                <CalendarDays className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Jenis Transaksi
              </label>
              {selectedType === 'Transfer' && (
                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">
                  Mutasi Kas
                </span>
              )}
            </div>
            <select
              value={selectedType}
              onChange={(e) => {
                const val = e.target.value as any;
                setSelectedType(val);
                if (val !== 'Transfer') {
                  setSelectedTransferFilter('ALL');
                }
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="ALL">Semua Jenis Transaksi</option>
              <option value="Pemasukan">Pemasukan (Revenue)</option>
              <option value="Pengeluaran">Pengeluaran (Beban)</option>
              <option value="Transfer">⇄ Pemindahan Kas (Tunai ⇄ Bank / Antar Toko)</option>
              <option value="Liability">Liability (Kewajiban / Hutang)</option>
              <option value="Equity">Equity (Modal / Ekuitas)</option>
            </select>
            {selectedType === 'Transfer' && (
              <div className="mt-1.5">
                <select
                  value={selectedTransferFilter}
                  onChange={(e) => setSelectedTransferFilter(e.target.value as any)}
                  className="w-full rounded-md border border-blue-300 bg-blue-50/70 px-2 py-1 text-[11px] font-medium text-blue-900 focus:border-blue-500 focus:outline-hidden dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-200"
                >
                  <option value="ALL">Semua Pemindahan Kas</option>
                  <option value="CASH_TO_NON_CASH">🏦 Setor Tunai (Kas ➔ Bank)</option>
                  <option value="NON_CASH_TO_CASH">💵 Tarik Tunai (Bank ➔ Kas)</option>
                  <option value="NON_CASH_TO_NON_CASH">📲 Settlement QRIS ➔ Bank</option>
                  <option value="INTER_STORE">🏬 Antar Cabang Toko</option>
                </select>
              </div>
            )}
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Metode Pembayaran
            </label>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="ALL">Semua Metode Bayar</option>
              <option value="Cash">Cash (Tunai)</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Qris">Qris</option>
              <option value="Debit bank BCA">Debit bank BCA</option>
              <option value="Debit Bank Lain">Debit Bank Lain</option>
              <option value="E-Wallet">E-Wallet</option>
            </select>
          </div>

          {/* Employee & Kasbon Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
              <span>Karyawan & Kasbon</span>
              {employeesWithActiveLoans.length > 0 && (
                <span className="text-[9px] px-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                  {employeesWithActiveLoans.length} Kasbon Aktif
                </span>
              )}
            </label>
            <select
              value={selectedEmployeeFilter}
              onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="ALL">Semua Karyawan & Kasbon</option>
              <option value="WITH_KASBON">⭐ Hanya Terkait Kasbon (Akun 5-101)</option>
              {employees.map((emp) => {
                const hasLoan = employeeLoans.some(
                  (l) =>
                    l.Employee_ID === emp.Employee_ID &&
                    l.Status === 'Active' &&
                    l.Remaining_Balance > 0
                );
                return (
                  <option key={emp.Employee_ID} value={emp.Employee_ID}>
                    {emp.Full_Name} {hasLoan ? '⚠️ (Ada Kasbon)' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Custom Date Range Picker Accordion / Card */}
        {(isCustomDateOpen || dateFilter === 'custom') && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20 -mx-4 -mb-4 p-4 rounded-b-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Pilih Rentang Tanggal Spesifik
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Saring mutasi transaksi berdasarkan tanggal mulai & tanggal akhir
                  </p>
                </div>
              </div>

              {/* Quick shortcut chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
                  Pilihan Cepat:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('today');
                    setCustomStartDate(todayStr);
                    setCustomEndDate(todayStr);
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    dateFilter === 'today'
                      ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('yesterday');
                    setCustomStartDate(yesterdayStr);
                    setCustomEndDate(yesterdayStr);
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    dateFilter === 'yesterday'
                      ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  Kemarin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('last_7_days');
                    setCustomStartDate(sevenDaysAgoStr);
                    setCustomEndDate(todayStr);
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    dateFilter === 'last_7_days'
                      ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  7 Hari Terakhir
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('last_30_days');
                    setCustomStartDate(thirtyDaysAgoStr);
                    setCustomEndDate(todayStr);
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    dateFilter === 'last_30_days'
                      ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  30 Hari
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('this_month');
                    const now = new Date();
                    const y = now.getFullYear();
                    const m = String(now.getMonth() + 1).padStart(2, '0');
                    setCustomStartDate(`${y}-${m}-01`);
                    setCustomEndDate(todayStr);
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    dateFilter === 'this_month'
                      ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  Bulan Ini
                </button>
              </div>
            </div>

            {/* Inputs Row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Tanggal Mulai (Dari)
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setDateFilter('custom');
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="pt-4 text-xs font-semibold text-slate-400">
                s/d
              </div>

              <div className="flex-1 min-w-[180px]">
                <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Tanggal Akhir (Sampai)
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setDateFilter('custom');
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                {(customStartDate || customEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStartDate('');
                      setCustomEndDate('');
                      setDateFilter('this_month');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-rose-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-rose-300 transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Hapus Tanggal</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsCustomDateOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  Terapkan Filter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Summary & Active Badges Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">
              Menampilkan: <strong className="text-slate-900 dark:text-white">{filteredList.length}</strong> transaksi
            </span>

            {/* Active Date Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
              <Calendar className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span>{dateFilterLabel}</span>
              {dateFilter !== 'this_month' && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('this_month');
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="hover:text-rose-600 ml-0.5"
                  title="Kembalikan ke Bulan Ini"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>

            {/* Type badge if filtered */}
            {selectedType !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
                <span>{selectedType}</span>
                <button
                  type="button"
                  onClick={() => setSelectedType('ALL')}
                  className="hover:text-rose-600 ml-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}

            {/* Payment method badge if filtered */}
            {selectedPaymentMethod !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800">
                <span>{selectedPaymentMethod}</span>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('ALL')}
                  className="hover:text-rose-600 ml-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
          </div>

          {/* Reset All Button */}
          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Financial Summary Cards for Active Filtered Transactions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-emerald-200/80 bg-white p-3.5 shadow-xs dark:border-emerald-900/60 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Pemasukan (Filter)
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <ArrowDownRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-1.5 text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-400">
            {formatRupiah(summaryMetrics.income)}
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            {dateFilterLabel}
          </div>
        </div>

        <div className="rounded-xl border border-rose-200/80 bg-white p-3.5 shadow-xs dark:border-rose-900/60 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Pengeluaran (Filter)
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-1.5 text-base sm:text-lg font-bold text-rose-700 dark:text-rose-400">
            {formatRupiah(summaryMetrics.expense)}
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            {dateFilterLabel}
          </div>
        </div>

        <div className={`rounded-xl border p-3.5 shadow-xs dark:bg-slate-900 ${
          summaryMetrics.netCashFlow >= 0
            ? 'border-blue-200/80 bg-white dark:border-blue-900/60'
            : 'border-amber-200/80 bg-white dark:border-amber-900/60'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Arus Kas Bersih (Netto)
            </span>
            <span className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
              summaryMetrics.netCashFlow >= 0
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
            }`}>
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className={`mt-1.5 text-base sm:text-lg font-bold ${
            summaryMetrics.netCashFlow >= 0
              ? 'text-blue-700 dark:text-blue-400'
              : 'text-amber-700 dark:text-amber-400'
          }`}>
            {formatRupiah(summaryMetrics.netCashFlow)}
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            {summaryMetrics.netCashFlow >= 0 ? 'Surplus operasional' : 'Defisit operasional'} ({dateFilterLabel})
          </div>
        </div>

        <div className="rounded-xl border border-indigo-200/80 bg-white p-3.5 shadow-xs dark:border-indigo-900/60 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Pemindahan Kas (Mutasi)
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Repeat className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-1.5 text-base sm:text-lg font-bold text-indigo-700 dark:text-indigo-400">
            {formatRupiah(summaryMetrics.transfer)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 truncate">
            <span>Setor: {formatRupiah(summaryMetrics.cashToBank)}</span>
            <span>Tarik: {formatRupiah(summaryMetrics.bankToCash)}</span>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Tanggal & ID</th>
                <th className="px-5 py-3">Toko</th>
                <th className="px-5 py-3">Jenis & Akun</th>
                <th className="px-5 py-3">Keterangan</th>
                <th className="px-5 py-3 text-right">Nominal</th>
                <th className="px-5 py-3">Metode Bayar</th>
                <th className="px-5 py-3 text-center">Bukti</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada transaksi yang cocok dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredList.map((trx) => (
                  <tr
                    key={trx.Transaction_ID}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatDate(trx.Date)}
                        </span>
                        {Boolean(
                          bookPeriodConfig?.currentPeriodStatus === 'CLOSED' &&
                          trx.Date >= bookPeriodConfig.startDate &&
                          trx.Date <= bookPeriodConfig.endDate
                        ) && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded px-1 py-0.2 text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/80"
                            title="Transaksi berada dalam periode Tutup Buku"
                          >
                            <Lock className="h-2.5 w-2.5" />
                            <span>Tutup Buku</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {trx.Transaction_ID}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {stores.find((s) => s.Store_ID === trx.Store_ID)?.Store_Name || trx.Store_ID}
                      </div>
                      {trx.Destination_Store_ID && (
                        <div className="text-[10px] text-blue-600 dark:text-blue-400">
                          &rarr; Tujuan:{' '}
                          {stores.find((s) => s.Store_ID === trx.Destination_Store_ID)?.Store_Name ||
                            trx.Destination_Store_ID}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <span
                          className={`font-semibold ${
                            trx.Type === 'Pemasukan'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : trx.Type === 'Pengeluaran'
                              ? 'text-rose-600 dark:text-rose-400'
                              : trx.Type === 'Liability'
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : trx.Type === 'Equity'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {trx.Type === 'Transfer' ? 'Pemindahan Kas' : trx.Type}
                        </span>
                        {trx.Direction && (
                          <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                            trx.Direction === 'Inflow'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}>
                            {trx.Direction === 'Inflow' ? '↓ Masuk' : '↑ Keluar'}
                          </span>
                        )}
                        {trx.Type === 'Transfer' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                            {trx.Transfer_Type === 'CASH_TO_NON_CASH' || (trx.Description || '').toLowerCase().includes('setor')
                              ? '🏦 Setor Tunai'
                              : trx.Transfer_Type === 'NON_CASH_TO_CASH' || (trx.Description || '').toLowerCase().includes('tarik')
                              ? '💵 Tarik Tunai'
                              : trx.Transfer_Type === 'NON_CASH_TO_NON_CASH'
                              ? '📲 Settlement QRIS'
                              : '🏬 Antar Toko'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 max-w-[200px] truncate">
                        {trx.Category}
                      </div>
                      {trx.Type === 'Transfer' && (
                        <div className="text-[10px] text-blue-700 dark:text-blue-400 font-mono mt-0.5">
                          {trx.Source_Account && trx.Destination_Account
                            ? `${trx.Source_Account.split(' - ')[0]} ➔ ${trx.Destination_Account.split(' - ')[0]}`
                            : trx.Transfer_Type === 'CASH_TO_NON_CASH'
                            ? '1-101 (Tunai) ➔ 1-102 (Bank)'
                            : trx.Transfer_Type === 'NON_CASH_TO_CASH'
                            ? '1-102 (Bank) ➔ 1-101 (Tunai)'
                            : 'Mutasi Posisi Kas'}
                        </div>
                      )}
                      {trx.Category.includes('5-111') && (
                        <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                          Beban MDR (Akun 5-111)
                        </span>
                      )}
                      {Boolean(trx.Category.includes('5-101') || trx.Employee_ID || trx.Loan_ID) && (
                        <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                          <UserCheck className="h-2.5 w-2.5" />
                          <span>Gaji & Kasbon (5-101)</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 max-w-[240px]">
                      <div className="truncate">{trx.Description || '-'}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-400">
                          Oleh: {trx.Created_By}
                        </span>
                        {Boolean(trx.Employee_Name || trx.Employee_ID) && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-300/80 dark:border-amber-700/80">
                            <span>👤 {trx.Employee_Name || trx.Employee_ID}</span>
                            {trx.Loan_ID && (
                              <span className="font-mono text-[8px] bg-amber-200/90 dark:bg-amber-900/90 px-1 rounded font-bold">
                                Kasbon: {trx.Loan_ID}
                              </span>
                            )}
                          </span>
                        )}
                        {trx.MDR_Expense_Ref && (
                          <span className="text-[9px] font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1 rounded border border-purple-200/60 dark:border-purple-800/60">
                            Ref: {trx.MDR_Expense_Ref}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-mono tabular-nums font-semibold">
                      <span
                        className={
                          trx.Type === 'Pemasukan' || ((trx.Type === 'Liability' || trx.Type === 'Equity') && trx.Direction === 'Inflow')
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : trx.Type === 'Pengeluaran' || ((trx.Type === 'Liability' || trx.Type === 'Equity') && trx.Direction === 'Outflow')
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-blue-600 dark:text-blue-400 font-bold'
                        }
                      >
                        {trx.Type === 'Transfer'
                          ? '⇄ '
                          : trx.Type === 'Pengeluaran' || ((trx.Type === 'Liability' || trx.Type === 'Equity') && trx.Direction === 'Outflow')
                          ? '-'
                          : '+'}
                        {formatRupiah(trx.Amount)}
                      </span>
                      {trx.Type === 'Transfer' && (
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                          {trx.Transfer_Type === 'CASH_TO_NON_CASH' || (trx.Description || '').toLowerCase().includes('setor')
                            ? '(Kas Fisik - / Bank +)'
                            : trx.Transfer_Type === 'NON_CASH_TO_CASH' || (trx.Description || '').toLowerCase().includes('tarik')
                            ? '(Bank - / Kas Fisik +)'
                            : '(Mutasi Kas)'}
                        </div>
                      )}
                      {Boolean(trx.Type === 'Pemasukan' && trx.MDR_Fee && trx.MDR_Fee > 0) && (
                        <div className="text-[10px] font-normal leading-tight mt-0.5">
                          <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                            Netto: {formatRupiah(trx.Net_Amount || (trx.Amount - trx.MDR_Fee!))}
                          </span>
                          <span className="text-rose-600 dark:text-rose-400 ml-1 font-medium">
                            (MDR: -{formatRupiah(trx.MDR_Fee!)})
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {trx.Type === 'Transfer' ? (
                        <div className="flex items-center gap-1 text-[11px] font-medium">
                          {renderPaymentMethodBadge(
                            trx.Source_Payment_Method ||
                              (trx.Transfer_Type === 'NON_CASH_TO_CASH' ? 'Bank Transfer' : 'Cash'),
                            mdrSettings
                          )}
                          <ArrowRight className="h-3 w-3 text-blue-500 shrink-0" />
                          {renderPaymentMethodBadge(
                            trx.Destination_Payment_Method ||
                              (trx.Transfer_Type === 'CASH_TO_NON_CASH' ? 'Bank Transfer' : 'Cash'),
                            mdrSettings
                          )}
                        </div>
                      ) : (
                        renderPaymentMethodBadge(trx.Payment_Method, mdrSettings)
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      {trx.Proof_Attachment_URL ? (
                        <button
                          onClick={() =>
                            onOpenProofModal(
                              trx.Proof_Attachment_URL,
                              `Bukti ${trx.Transaction_ID}`,
                              trx.Description
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition-colors"
                          title="Lihat lampiran nota"
                        >
                          <ImageIcon className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Lihat</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
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
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {trx.Status === 'Pending' && (
                          <>
                            <button
                              onClick={() => onUpdateStatus(trx.Transaction_ID, 'Approved')}
                              className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                              title="Setujui (Approve)"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onUpdateStatus(trx.Transaction_ID, 'Rejected')}
                              className="rounded p-1 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                              title="Tolak (Reject)"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleOpenEditModal(trx)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors"
                          title="Edit transaksi"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus transaksi ${trx.Transaction_ID}?`)) {
                              onDeleteTransaction(trx.Transaction_ID);
                            }
                          }}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition-colors"
                          title="Hapus transaksi"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Input / Edit Transaksi / Transfer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-white font-bold text-xs ${
                    editingTransaction
                      ? 'bg-blue-600'
                      : modalType === 'Pemasukan'
                      ? 'bg-emerald-600'
                      : modalType === 'Pengeluaran'
                      ? 'bg-rose-600'
                      : 'bg-blue-600'
                  }`}
                >
                  {editingTransaction ? '✎' : modalType === 'Pemasukan' ? '+' : modalType === 'Pengeluaran' ? '-' : '⇄'}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {editingTransaction
                      ? `Edit Transaksi (${editingTransaction.Transaction_ID})`
                      : modalType === 'Transfer'
                      ? 'Transfer Antar Kas / Toko'
                      : `Catat ${modalType} Baru`}
                  </h3>
                  {editingTransaction && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Mengubah data transaksi yang telah tercatat sebelumnya
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingTransaction(null);
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Type selector toggle inside modal */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-lg dark:bg-slate-800 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setModalType('Pemasukan');
                    const coaOptions = chartOfAccounts.filter((c) => c.Category === 'Revenue');
                    if (coaOptions.length > 0) {
                      setFormCategory(`${coaOptions[0].Account_Code} - ${coaOptions[0].Account_Name}`);
                    }
                  }}
                  className={`py-1.5 px-2 rounded-md transition-colors text-center ${
                    modalType === 'Pemasukan'
                      ? 'bg-white text-emerald-700 shadow-xs font-semibold dark:bg-slate-700 dark:text-emerald-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  + Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalType('Pengeluaran');
                    const coaOptions = chartOfAccounts.filter((c) => c.Category === 'Expense');
                    if (coaOptions.length > 0) {
                      setFormCategory(`${coaOptions[0].Account_Code} - ${coaOptions[0].Account_Name}`);
                    }
                  }}
                  className={`py-1.5 px-2 rounded-md transition-colors text-center ${
                    modalType === 'Pengeluaran'
                      ? 'bg-white text-rose-700 shadow-xs font-semibold dark:bg-slate-700 dark:text-rose-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  - Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalType('Transfer');
                    setFormCategory('Transfer Antar Toko / Rekening');
                  }}
                  className={`py-1.5 px-2 rounded-md transition-colors text-center ${
                    modalType === 'Transfer'
                      ? 'bg-white text-blue-700 shadow-xs font-semibold dark:bg-slate-700 dark:text-blue-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  ⇄ Transfer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalType('Liability');
                    const coaOptions = chartOfAccounts.filter((c) => c.Category === 'Liability');
                    if (coaOptions.length > 0) {
                      setFormCategory(`${coaOptions[0].Account_Code} - ${coaOptions[0].Account_Name}`);
                    }
                  }}
                  className={`py-1.5 px-2 rounded-md transition-colors text-center ${
                    modalType === 'Liability'
                      ? 'bg-white text-indigo-700 shadow-xs font-semibold dark:bg-slate-700 dark:text-indigo-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  ⚖ Liability
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalType('Equity');
                    const coaOptions = chartOfAccounts.filter((c) => c.Category === 'Equity');
                    if (coaOptions.length > 0) {
                      setFormCategory(`${coaOptions[0].Account_Code} - ${coaOptions[0].Account_Name}`);
                    }
                  }}
                  className={`py-1.5 px-2 rounded-md transition-colors text-center ${
                    modalType === 'Equity'
                      ? 'bg-white text-amber-700 shadow-xs font-semibold dark:bg-slate-700 dark:text-amber-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  🏛 Equity
                </button>
              </div>

              {/* Sifat Aliran Dana Khusus Liability & Equity */}
              {(modalType === 'Liability' || modalType === 'Equity') && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Sifat Aliran Arus Kas ({modalType}):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                        formDirection === 'Inflow'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold dark:bg-emerald-950/60 dark:text-emerald-200'
                          : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="trxDirection"
                        checked={formDirection === 'Inflow'}
                        onChange={() => setFormDirection('Inflow')}
                        className="text-emerald-600"
                      />
                      <div>
                        <div>
                          {modalType === 'Liability'
                            ? '↓ Penerimaan Pinjaman / Tambah Hutang'
                            : '↓ Setoran Modal / Tambahan Investasi'}
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-normal">
                          (Kas & Bank Bertambah)
                        </span>
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                        formDirection === 'Outflow'
                          ? 'border-rose-500 bg-rose-50 text-rose-900 font-semibold dark:bg-rose-950/60 dark:text-rose-200'
                          : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="trxDirection"
                        checked={formDirection === 'Outflow'}
                        onChange={() => setFormDirection('Outflow')}
                        className="text-rose-600"
                      />
                      <div>
                        <div>
                          {modalType === 'Liability'
                            ? '↑ Pembayaran / Pelunasan Hutang'
                            : '↑ Penarikan Modal / Prive / Dividen'}
                        </div>
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-normal">
                          (Kas & Bank Berkurang)
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Mode Khusus Transfer / Pemindahan Posisi Kas (Tunai & Non-Tunai) */}
              {modalType === 'Transfer' ? (
                <div className="rounded-xl border border-blue-300/80 bg-linear-to-br from-blue-50/90 via-sky-50/40 to-slate-50/80 p-3.5 dark:border-blue-700/60 dark:from-blue-950/40 dark:via-sky-950/30 dark:to-slate-900/40 shadow-xs space-y-3.5">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-blue-200 dark:border-blue-800/60">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
                        <Repeat className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Pemindahan Posisi Kas (Tunai ⇄ Non-Tunai)
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Pindahkan saldo antara uang kas fisik toko dan rekening bank operasional
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                      Mutasi Kas / Bank
                    </span>
                  </div>

                  {/* 4 Transfer Mode Buttons */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Pilih Arah Pemindahan Dana:
                      </label>
                      <button
                        type="button"
                        onClick={handleSwapTransferDirection}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-100 hover:bg-blue-200 text-blue-900 dark:bg-blue-900/60 dark:hover:bg-blue-800 dark:text-blue-200 transition-colors cursor-pointer"
                        title="Tukar arah pemindahan antara Tunai dan Bank"
                      >
                        <ArrowRightLeft className="h-3 w-3" />
                        <span>⇄ Tukar Arah (Tunai ⇄ Non-Tunai)</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* 1. Tunai ke Non-Tunai */}
                      <button
                        type="button"
                        onClick={() => handleSelectTransferType('CASH_TO_NON_CASH')}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          formTransferType === 'CASH_TO_NON_CASH'
                            ? 'border-blue-600 bg-white dark:bg-slate-800 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 bg-white/70 hover:bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900 dark:text-blue-200">
                          <span>🏦 Tunai ke Non-Tunai (Setor Bank)</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Setor uang tunai kasir toko ke Rekening Bank BCA
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[9px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                          <span>1-101 Kas Tunai (-) ➔ 1-102 Bank BCA (+)</span>
                        </div>
                      </button>

                      {/* 2. Non-Tunai ke Tunai */}
                      <button
                        type="button"
                        onClick={() => handleSelectTransferType('NON_CASH_TO_CASH')}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          formTransferType === 'NON_CASH_TO_CASH'
                            ? 'border-blue-600 bg-white dark:bg-slate-800 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 bg-white/70 hover:bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900 dark:text-blue-200">
                          <span>💵 Non-Tunai ke Tunai (Tarik Bank)</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Tarik saldo bank untuk isi kas kecil / kasir toko
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[9px] font-mono font-semibold text-amber-700 dark:text-amber-400">
                          <span>1-102 Bank BCA (-) ➔ 1-101 Kas Tunai (+)</span>
                        </div>
                      </button>

                      {/* 3. Antar Non-Tunai */}
                      <button
                        type="button"
                        onClick={() => handleSelectTransferType('NON_CASH_TO_NON_CASH')}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          formTransferType === 'NON_CASH_TO_NON_CASH'
                            ? 'border-blue-600 bg-white dark:bg-slate-800 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 bg-white/70 hover:bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900 dark:text-blue-200">
                          <span>📲 Settlement QRIS / E-Wallet</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Pencairan saldo QRIS/E-Wallet ke Rekening Bank Utama
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[9px] font-mono font-semibold text-purple-700 dark:text-purple-400">
                          <span>1-103 QRIS (-) ➔ 1-102 Bank BCA (+)</span>
                        </div>
                      </button>

                      {/* 4. Antar Cabang Toko */}
                      <button
                        type="button"
                        onClick={() => handleSelectTransferType('INTER_STORE')}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          formTransferType === 'INTER_STORE'
                            ? 'border-blue-600 bg-white dark:bg-slate-800 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 bg-white/70 hover:bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900 dark:text-blue-200">
                          <span>🏬 Transfer Antar Cabang Toko</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Pindah kas / modal operasional antar outlet toko
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[9px] font-mono font-semibold text-blue-700 dark:text-blue-400">
                          <span>Outlet A ➔ Outlet B</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Visual Flow Box: Asal Dana -> Tujuan Dana */}
                  <div className="p-3 bg-white/90 dark:bg-slate-800/90 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      {/* Kolom Asal */}
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700">
                        <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                          📤 Sumber / Asal Kas (Dana Keluar):
                        </span>
                        <div className="space-y-1.5">
                          <div>
                            <label className="text-[10px] text-slate-500 block">Cabang Toko Asal:</label>
                            <select
                              value={formStoreId}
                              onChange={(e) => {
                                setFormStoreId(e.target.value);
                                handleSelectTransferType(formTransferType, e.target.value);
                              }}
                              className="w-full text-xs font-semibold rounded border border-slate-300 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            >
                              {stores.map((s) => (
                                <option key={s.Store_ID} value={s.Store_ID}>
                                  {s.Store_Name} ({s.Store_ID})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block">Posisi Kas Asal:</label>
                            {formTransferType === 'CASH_TO_NON_CASH' ? (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded border border-amber-200 dark:border-amber-800">
                                <Banknote className="h-3.5 w-3.5 shrink-0" />
                                <span>Kas Fisik Tunai (1-101 Cash Drawer)</span>
                              </div>
                            ) : formTransferType === 'NON_CASH_TO_CASH' ? (
                              <select
                                value={formSourcePaymentMethod}
                                onChange={(e) => setFormSourcePaymentMethod(e.target.value as PaymentMethod)}
                                className="w-full text-xs font-semibold rounded border border-slate-300 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              >
                                <option value="Bank Transfer">Rekening Bank BCA Operasional (1-102)</option>
                                <option value="Debit bank BCA">EDC BCA Merchant (1-102)</option>
                                <option value="Debit Bank Lain">Rekening Bank Mandiri/BRI (1-102)</option>
                              </select>
                            ) : formTransferType === 'NON_CASH_TO_NON_CASH' ? (
                              <select
                                value={formSourcePaymentMethod}
                                onChange={(e) => setFormSourcePaymentMethod(e.target.value as PaymentMethod)}
                                className="w-full text-xs font-semibold rounded border border-slate-300 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              >
                                <option value="Qris">Saldo Rekening QRIS Kasir (1-103)</option>
                                <option value="E-Wallet">Saldo Dompet Digital E-Wallet (1-103)</option>
                              </select>
                            ) : (
                              <select
                                value={formSourcePaymentMethod}
                                onChange={(e) => setFormSourcePaymentMethod(e.target.value as PaymentMethod)}
                                className="w-full text-xs font-semibold rounded border border-slate-300 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              >
                                <option value="Bank Transfer">Bank Transfer (Rekening Bank)</option>
                                <option value="Cash">Kas Tunai Toko (Cash)</option>
                              </select>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Kolom Tujuan */}
                      <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                        <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300 block mb-1">
                          📥 Penerima / Tujuan Kas (Dana Masuk):
                        </span>
                        <div className="space-y-1.5">
                          {formTransferType === 'INTER_STORE' ? (
                            <div>
                              <label className="text-[10px] text-blue-600 dark:text-blue-400 block">Cabang Toko Tujuan:</label>
                              <select
                                value={formTargetStoreId}
                                onChange={(e) => {
                                  setFormTargetStoreId(e.target.value);
                                  handleSelectTransferType(formTransferType, undefined, e.target.value);
                                }}
                                className="w-full text-xs font-semibold rounded border border-blue-300 bg-white p-1.5 dark:border-blue-700 dark:bg-slate-800 dark:text-white"
                              >
                                {stores.map((s) => (
                                  <option key={s.Store_ID} value={s.Store_ID}>
                                    {s.Store_Name} ({s.Store_ID})
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div>
                              <label className="text-[10px] text-blue-600 dark:text-blue-400 block">Cabang Toko Penerima:</label>
                              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 p-1.5 bg-white dark:bg-slate-800 rounded border border-blue-200 dark:border-blue-700">
                                {stores.find((s) => s.Store_ID === formStoreId)?.Store_Name || formStoreId} (Satu Cabang)
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="text-[10px] text-blue-600 dark:text-blue-400 block">Posisi Kas Tujuan:</label>
                            {formTransferType === 'CASH_TO_NON_CASH' ? (
                              <select
                                value={formDestinationPaymentMethod}
                                onChange={(e) => setFormDestinationPaymentMethod(e.target.value as PaymentMethod)}
                                className="w-full text-xs font-semibold rounded border border-blue-300 bg-white p-1.5 dark:border-blue-700 dark:bg-slate-800 dark:text-white"
                              >
                                <option value="Bank Transfer">Rekening Bank BCA Operasional (1-102)</option>
                                <option value="Debit bank BCA">Rekening Bank BCA Pusat (1-102)</option>
                                <option value="Debit Bank Lain">Rekening Bank Mandiri / Lain (1-102)</option>
                                <option value="E-Wallet">Saldo Dompet Digital E-Wallet (1-103)</option>
                              </select>
                            ) : formTransferType === 'NON_CASH_TO_CASH' ? (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded border border-emerald-200 dark:border-emerald-800">
                                <Banknote className="h-3.5 w-3.5 shrink-0" />
                                <span>Kas Fisik Tunai (1-101 Laci Kasir Toko)</span>
                              </div>
                            ) : formTransferType === 'NON_CASH_TO_NON_CASH' ? (
                              <select
                                value={formDestinationPaymentMethod}
                                onChange={(e) => setFormDestinationPaymentMethod(e.target.value as PaymentMethod)}
                                className="w-full text-xs font-semibold rounded border border-blue-300 bg-white p-1.5 dark:border-blue-700 dark:bg-slate-800 dark:text-white"
                              >
                                <option value="Bank Transfer">Rekening Bank BCA Operasional Utama (1-102)</option>
                                <option value="Debit Bank Lain">Rekening Bank Lainnya</option>
                              </select>
                            ) : (
                              <select
                                value={formDestinationPaymentMethod}
                                onChange={(e) => setFormDestinationPaymentMethod(e.target.value as PaymentMethod)}
                                className="w-full text-xs font-semibold rounded border border-blue-300 bg-white p-1.5 dark:border-blue-700 dark:bg-slate-800 dark:text-white"
                              >
                                <option value="Bank Transfer">Rekening Bank (Bank Transfer)</option>
                                <option value="Cash">Kas Tunai Toko (Cash)</option>
                              </select>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Accounting Notice */}
                    <div className="flex items-start gap-2 text-[11px] text-blue-900 dark:text-blue-200 bg-blue-100/60 dark:bg-blue-950/50 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800/80">
                      <CheckCircle className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="leading-relaxed">
                        {formTransferType === 'CASH_TO_NON_CASH' ? (
                          <span>
                            <strong>Mutasi Kas Tunai ➔ Bank:</strong> Uang kas fisik tunai di toko akan berkurang sebesar nominal transfer, dan saldo rekening bank operasional bertambah. Komposisi likuiditas kas tunai & bank akan otomatis ter-update di Dashboard.
                          </span>
                        ) : formTransferType === 'NON_CASH_TO_CASH' ? (
                          <span>
                            <strong>Mutasi Bank ➔ Kas Tunai:</strong> Saldo rekening bank berkurang sebesar nominal penarikan, dan uang kas fisik toko bertambah (untuk modal kembalian kasir / petty cash).
                          </span>
                        ) : formTransferType === 'NON_CASH_TO_NON_CASH' ? (
                          <span>
                            <strong>Settlement QRIS / E-Wallet ➔ Bank:</strong> Saldo dompet digital / merchant QRIS dicairkan ke rekening giro/operasional BCA utama.
                          </span>
                        ) : (
                          <span>
                            <strong>Transfer Antar Toko:</strong> Pemindahan dana kas/bank antar cabang toko tercatat pada outlet asal dan outlet tujuan.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Store & Target Store */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Cabang Toko
                    </label>
                    <select
                      value={formStoreId}
                      onChange={(e) => setFormStoreId(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {stores.map((s) => (
                        <option key={s.Store_ID} value={s.Store_ID}>
                          {s.Store_Name} ({s.Store_ID})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Kategori / Akun COA
                      </label>
                      {modalType === 'Pengeluaran' && (
                        <button
                          type="button"
                          onClick={() => {
                            const found = chartOfAccounts.find(
                              (c) =>
                                c.Account_Code === '5-101' ||
                                c.Account_Name.toLowerCase().includes('gaji')
                            );
                            if (found) {
                              setFormCategory(`${found.Account_Code} - ${found.Account_Name}`);
                            } else {
                              setFormCategory('5-101 - Beban Gaji & Upah Karyawan (Kasbon)');
                            }
                            setFormOnlyWithKasbon(true);
                          }}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                            isAccount5101
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold dark:bg-amber-950 dark:text-amber-200'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          ⭐ Akun 5-101 (Gaji & Kasbon)
                        </button>
                      )}
                    </div>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {chartOfAccounts
                        .filter((c) => {
                          if (modalType === 'Pemasukan') return c.Category === 'Revenue';
                          if (modalType === 'Pengeluaran') return c.Category === 'Expense';
                          if (modalType === 'Liability') return c.Category === 'Liability';
                          if (modalType === 'Equity') return c.Category === 'Equity';
                          return false;
                        })
                        .map((c) => (
                          <option
                            key={c.Account_Code}
                            value={`${c.Account_Code} - ${c.Account_Name}`}
                          >
                            {c.Account_Code} - {c.Account_Name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Integrasi Kasbon Karyawan Akun 5-101 Beban Gaji & Upah Karyawan */}
              {modalType === 'Pengeluaran' && isAccount5101 && (
                <div className="rounded-xl border border-amber-300/80 bg-linear-to-br from-amber-50/90 via-orange-50/40 to-slate-50/80 p-3.5 dark:border-amber-700/60 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-slate-900/40 shadow-xs space-y-3">
                  {/* Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-amber-200 dark:border-amber-800/60">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500 text-white shadow-2xs">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Koneksi Data Karyawan & Kasbon (Akun 5-101)
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                            {employeesWithActiveLoans.length} Karyawan Ada Kasbon
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Pilih karyawan untuk menghubungkan pencairan kasbon, cicilan potongan gaji, atau beban gaji.
                        </p>
                      </div>
                    </div>

                    {/* Filter Toggle: Hanya Karyawan yang Kasbon */}
                    <button
                      type="button"
                      onClick={() => setFormOnlyWithKasbon(!formOnlyWithKasbon)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                        formOnlyWithKasbon
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${formOnlyWithKasbon ? 'bg-white' : 'bg-amber-500'}`} />
                      <span>{formOnlyWithKasbon ? 'Tampilkan Semua Karyawan' : 'Filter: Hanya yang Kasbon'}</span>
                    </button>
                  </div>

                  {/* Employee Selection Dropdown */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Pilih Data Karyawan {formOnlyWithKasbon ? '(Filter Kasbon Aktif)' : ''}:
                      </label>
                      {selectedEmployee && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Toko: {selectedEmployee.Store_ID} | Posisi: {selectedEmployee.Position}
                        </span>
                      )}
                    </div>

                    <select
                      value={formEmployeeId}
                      onChange={(e) => handleSelectEmployee(e.target.value)}
                      className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs text-slate-900 font-medium focus:border-amber-500 focus:outline-hidden dark:border-amber-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">-- Pilih Karyawan {formOnlyWithKasbon ? 'yang memiliki Kasbon Aktif' : ''} --</option>
                      {selectableEmployees.map((emp) => {
                        const loan = employeeLoans.find(
                          (l) => l.Employee_ID === emp.Employee_ID && l.Status === 'Active' && l.Remaining_Balance > 0
                        );
                        return (
                          <option key={emp.Employee_ID} value={emp.Employee_ID}>
                            {emp.Full_Name} ({emp.Employee_ID}) - {emp.Position}
                            {loan
                              ? ` [⚠️ KASBON: Sisa ${formatRupiah(loan.Remaining_Balance)} | Cicilan: ${formatRupiah(loan.Monthly_Installment)}/bln]`
                              : ' [Tidak ada kasbon aktif]'}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Action Mode Radio Cards (Repayment, Disbursement, Salary Only) */}
                  {formEmployeeId && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Tindakan Transaksi Beban Gaji & Kasbon:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* 1. Potong Cicilan Kasbon */}
                        <button
                          type="button"
                          onClick={() => {
                            setFormKasbonAction('repayment');
                            if (activeLoanForEmployee && (!formAmount || Number(formAmount) === 0)) {
                              setFormAmount(activeLoanForEmployee.Monthly_Installment || activeLoanForEmployee.Remaining_Balance);
                            }
                            if (selectedEmployee && activeLoanForEmployee) {
                              setFormDescription(
                                `Beban Gaji & Kasbon Karyawan: ${selectedEmployee.Full_Name} (${selectedEmployee.Employee_ID}) - Ref Kasbon: ${activeLoanForEmployee.Loan_ID}`
                              );
                            }
                          }}
                          disabled={!activeLoanForEmployee}
                          className={`p-2.5 rounded-lg border text-left transition-all relative ${
                            formKasbonAction === 'repayment'
                              ? 'border-amber-600 bg-amber-500/10 text-amber-950 font-semibold ring-2 ring-amber-500/30 dark:border-amber-500 dark:text-amber-200'
                              : activeLoanForEmployee
                              ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : 'border-slate-200 bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-bold">
                            <span>💳 Potong / Cicil Kasbon</span>
                            {activeLoanForEmployee && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-200 text-amber-900 font-bold dark:bg-amber-900 dark:text-amber-200">
                                Ada Pinjaman
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            Kurangi saldo kasbon karyawan & catat riwayat pelunasan
                          </div>
                        </button>

                        {/* 2. Pencairan Kasbon Baru */}
                        <button
                          type="button"
                          onClick={() => {
                            setFormKasbonAction('disbursement');
                            if (selectedEmployee) {
                              setFormDescription(
                                `Pencairan Kasbon / Pinjaman Karyawan: ${selectedEmployee.Full_Name} (${selectedEmployee.Employee_ID})`
                              );
                            }
                          }}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            formKasbonAction === 'disbursement'
                              ? 'border-rose-600 bg-rose-500/10 text-rose-950 font-semibold ring-2 ring-rose-500/30 dark:border-rose-500 dark:text-rose-200'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <div className="text-xs font-bold">
                            💰 Pencairan Kasbon Baru
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            Cairkan kasbon & catat ke buku Pinjaman Karyawan
                          </div>
                        </button>

                        {/* 3. Gaji Reguler Non-Kasbon */}
                        <button
                          type="button"
                          onClick={() => {
                            setFormKasbonAction('salary_only');
                            if (selectedEmployee) {
                              setFormDescription(
                                `Beban Gaji & Upah Karyawan: ${selectedEmployee.Full_Name} (${selectedEmployee.Employee_ID})`
                              );
                            }
                          }}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            formKasbonAction === 'salary_only'
                              ? 'border-blue-600 bg-blue-500/10 text-blue-950 font-semibold ring-2 ring-blue-500/30 dark:border-blue-500 dark:text-blue-200'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <div className="text-xs font-bold">
                            👥 Beban Gaji Reguler
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            Catat beban gaji karyawan tanpa memotong saldo kasbon
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Detail Info Card for Active Loan */}
                  {selectedEmployee && activeLoanForEmployee && (
                    <div className="rounded-lg border border-amber-200 bg-white/90 p-3 dark:border-amber-800 dark:bg-slate-800/90 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 mb-2 border-b border-slate-100 dark:border-slate-700">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            Data Kasbon Aktif: {activeLoanForEmployee.Loan_ID}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                            Keperluan: {activeLoanForEmployee.Purpose}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Status: {activeLoanForEmployee.Status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2.5 text-center">
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-2 rounded border border-slate-200/60 dark:border-slate-700">
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">Total Pinjaman</div>
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {formatRupiah(activeLoanForEmployee.Total_Amount)}
                          </div>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded border border-emerald-200/60 dark:border-emerald-800">
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-300">Sudah Dibayar</div>
                          <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                            {formatRupiah(activeLoanForEmployee.Paid_Amount)}
                          </div>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-950/40 p-2 rounded border border-rose-200/60 dark:border-rose-800">
                          <div className="text-[10px] text-rose-700 dark:text-rose-300">Sisa Saldo Kasbon</div>
                          <div className="font-mono font-bold text-rose-700 dark:text-rose-300">
                            {formatRupiah(activeLoanForEmployee.Remaining_Balance)}
                          </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950/40 p-2 rounded border border-blue-200/60 dark:border-blue-800">
                          <div className="text-[10px] text-blue-700 dark:text-blue-300">Cicilan Bulanan</div>
                          <div className="font-mono font-bold text-blue-700 dark:text-blue-300">
                            {formatRupiah(activeLoanForEmployee.Monthly_Installment)}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1 mb-2.5">
                        <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                          <span>Progress Pelunasan Kasbon</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {Math.round((activeLoanForEmployee.Paid_Amount / (activeLoanForEmployee.Total_Amount || 1)) * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-full dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.round((activeLoanForEmployee.Paid_Amount / (activeLoanForEmployee.Total_Amount || 1)) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Quick Amount Fill Buttons */}
                      {formKasbonAction === 'repayment' && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Isi Cepat Nominal:
                          </span>
                          <button
                            type="button"
                            onClick={() => setFormAmount(activeLoanForEmployee.Monthly_Installment)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:hover:bg-amber-800 dark:text-amber-200 transition-colors cursor-pointer"
                          >
                            Pakai Cicilan Bulanan ({formatRupiah(activeLoanForEmployee.Monthly_Installment)})
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormAmount(activeLoanForEmployee.Remaining_Balance)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-100 hover:bg-rose-200 text-rose-900 dark:bg-rose-900/60 dark:hover:bg-rose-800 dark:text-rose-200 transition-colors cursor-pointer"
                          >
                            Lunasi Sisa Kasbon ({formatRupiah(activeLoanForEmployee.Remaining_Balance)})
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Info if employee has NO active loan */}
                  {selectedEmployee && !activeLoanForEmployee && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200">
                      <CheckCircle className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                      <span>
                        <strong>{selectedEmployee.Full_Name}</strong> saat ini tidak memiliki pinjaman kasbon aktif. Anda dapat mencairkan kasbon baru atau mencatat pembayaran gaji reguler.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Date & Nominal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Tanggal Transaksi
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      {modalType === 'Pemasukan' ? 'Nominal Transaksi Bruto (Rp)' : 'Nominal Transaksi (Rp)'}
                    </label>
                    {modalType === 'Pemasukan' && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Total Kotor dari Pelanggan
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={formAmount}
                    onChange={(e) =>
                      setFormAmount(e.target.value ? Number(e.target.value) : '')
                    }
                    placeholder="Contoh: 1500000.00"
                    min="0.01"
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  {modalType === 'Pemasukan' && (
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                      Masukkan total nominal kotor transaksi dari pelanggan sebelum potongan fee perbankan (format 2 desimal didukung).
                    </p>
                  )}
                  {modalType === 'Transfer' && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] font-semibold text-slate-500">Nominal Cepat:</span>
                      {[250000, 500000, 1000000, 2500000, 5000000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setFormAmount(amt)}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-pointer transition-colors"
                        >
                          Rp {(amt / 1000).toLocaleString('id-ID')}rb
                        </button>
                      ))}
                      {formTransferType === 'CASH_TO_NON_CASH' && cashLiquidityMetrics.cashBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormAmount(cashLiquidityMetrics.cashBalance)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 cursor-pointer transition-colors"
                        >
                          Setor Semua Kas ({formatRupiah(cashLiquidityMetrics.cashBalance)})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method / Transfer Accounting Jurnal */}
              {modalType === 'Transfer' ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 dark:border-blue-900/60 dark:bg-blue-950/40 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                      <Repeat className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Jurnal Mutasi Buku Kas & Bank (Otomatis):</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-200/80 text-blue-900 dark:bg-blue-900 dark:text-blue-200">
                      Internal Cash Transfer
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 block mb-0.5">
                        📤 Akun Asal (Kredit / Saldo Berkurang -):
                      </span>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {formTransferType === 'CASH_TO_NON_CASH'
                          ? '1-101 - Kas Toko (Cash Drawer Kasir)'
                          : formTransferType === 'NON_CASH_TO_CASH'
                          ? '1-102 - Rekening Bank BCA Operasional'
                          : '1-103 - Saldo QRIS / E-Wallet'}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Metode: <span className="font-semibold">{formSourcePaymentMethod}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block mb-0.5">
                        📥 Akun Tujuan (Debit / Saldo Bertambah +):
                      </span>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {formTransferType === 'CASH_TO_NON_CASH'
                          ? '1-102 - Rekening Bank BCA Operasional'
                          : formTransferType === 'NON_CASH_TO_CASH'
                          ? '1-101 - Kas Toko (Cash Drawer Kasir)'
                          : '1-102 - Rekening Bank BCA Operasional'}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Metode: <span className="font-semibold">{formDestinationPaymentMethod}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                    ℹ️ Transaksi ini memindahkan dana internal antar posisi kas/bank secara real-time. Tidak mempengaruhi perhitungan Laba/Rugi (P&L), hanya merubah komposisi likuiditas uang tunai & saldo bank.
                  </p>
                </div>
              ) : (
                /* Payment Method Selection for Pemasukan, Pengeluaran, Liability, Equity */
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Metode Pembayaran
                    </label>
                    {modalType === 'Pemasukan' && (
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        Pilihan Non-Tunai otomatis menerapkan Tarif MDR
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {(
                      modalType === 'Pemasukan'
                        ? (['Cash', 'Bank Transfer', 'Qris', 'Debit bank BCA', 'Debit Bank Lain'] as PaymentMethod[])
                        : (['Cash', 'Bank Transfer', 'Debit bank BCA', 'Debit Bank Lain', 'Qris', 'E-Wallet'] as PaymentMethod[])
                    ).map((method) => {
                      const opt = PAYMENT_METHOD_OPTIONS.find((o) => o.id === method);
                      const IconComp = opt?.icon || CreditCard;
                      const isSelected = formPaymentMethod === method;

                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setFormPaymentMethod(method)}
                          className={`group relative flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                            isSelected
                              ? modalType === 'Pemasukan'
                                ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 font-semibold shadow-xs ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/70 dark:text-emerald-200'
                                : modalType === 'Pengeluaran'
                                ? 'border-rose-600 bg-rose-50/90 text-rose-950 font-semibold shadow-xs ring-2 ring-rose-500/20 dark:border-rose-500 dark:bg-rose-950/70 dark:text-rose-200'
                                : 'border-blue-600 bg-blue-50/90 text-blue-950 font-semibold shadow-xs ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/70 dark:text-blue-200'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750'
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              isSelected
                                ? modalType === 'Pemasukan'
                                  ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                                  : modalType === 'Pengeluaran'
                                  ? 'bg-rose-600 text-white dark:bg-rose-500'
                                  : 'bg-blue-600 text-white dark:bg-blue-500'
                                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'
                            }`}
                          >
                            <IconComp className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold leading-tight truncate">
                                {method}
                              </span>
                              {modalType === 'Pemasukan' && opt?.mdrBadge && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                    opt.mdrBadge.includes('0%')
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                      : 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                                  }`}
                                >
                                  {opt.mdrBadge}
                                </span>
                              )}
                            </div>
                            {opt?.subtext && (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5 truncate">
                                {opt.subtext}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <div
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                modalType === 'Pemasukan'
                                  ? 'bg-emerald-600 dark:bg-emerald-400'
                                  : modalType === 'Pengeluaran'
                                  ? 'bg-rose-600 dark:bg-rose-400'
                                  : 'bg-blue-600 dark:bg-blue-400'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Automatic MDR Calculation & Accounting Card */}
              {modalType === 'Pemasukan' && currentMdrCalc.isApplicable && (
                <div className="rounded-xl border border-emerald-300/80 bg-linear-to-br from-emerald-50/90 via-teal-50/40 to-slate-50/80 p-3.5 dark:border-emerald-700/60 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900/40 shadow-xs">
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-emerald-200 dark:border-emerald-800/60">
                    <div className="flex items-center gap-1.5">
                      <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Perhitungan Otomatis MDR Non-Tunai ({currentMdrCalc.paymentMethod})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-600 text-white shadow-xs">
                        Tarif MDR: {currentMdrCalc.ratePercent}
                      </span>
                      {onNavigateToMdr && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsModalOpen(false);
                            onNavigateToMdr();
                          }}
                          className="text-[10px] text-emerald-700 dark:text-emerald-300 underline font-semibold hover:text-emerald-900 transition-colors"
                          title="Buka menu pengaturan untuk mengubah tarif regulasi MDR"
                        >
                          [Ubah Tarif]
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* 1. Bruto */}
                    <div className="p-2.5 rounded-lg bg-white/90 border border-slate-200/80 dark:bg-slate-800/90 dark:border-slate-700">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                        1. Pemasukan Bruto
                      </div>
                      <div className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-1">
                        {formatRupiah(currentMdrCalc.grossAmount)}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Total kotor dari pelanggan
                      </div>
                    </div>

                    {/* 2. Potongan MDR */}
                    <div className="p-2.5 rounded-lg bg-rose-50/90 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/80">
                      <div className="text-[10px] uppercase font-semibold text-rose-700 dark:text-rose-300">
                        2. Potongan MDR ({currentMdrCalc.ratePercent})
                      </div>
                      <div className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                        - {formatRupiah(currentMdrCalc.mdrFee)}
                      </div>
                      <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 truncate font-medium">
                        Biaya Admin Bank (Akun 5-111)
                      </div>
                    </div>

                    {/* 3. Netto */}
                    <div className="p-2.5 rounded-lg bg-emerald-100/80 border border-emerald-300 dark:bg-emerald-900/50 dark:border-emerald-700">
                      <div className="text-[10px] uppercase font-semibold text-emerald-800 dark:text-emerald-300">
                        3. Netto Masuk Rekening
                      </div>
                      <div className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1">
                        {formatRupiah(currentMdrCalc.netAmount)}
                      </div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Bruto - Potongan MDR
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-300 bg-white/75 dark:bg-slate-800/75 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/60">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Otomatisasi Akuntansi Wajib:
                      </span>{' '}
                      Potongan MDR sebesar{' '}
                      <strong className="text-rose-600 dark:text-rose-400 font-mono">
                        {formatRupiah(currentMdrCalc.mdrFee)}
                      </strong>{' '}
                      akan otomatis dicatat sebagai pengeluaran/beban pada{' '}
                      <strong className="text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">
                        Akun COA 5-111 - Biaya Admin Bank / MDR
                      </strong>
                      .
                    </div>
                  </div>
                </div>
              )}

              {modalType === 'Pemasukan' && !currentMdrCalc.isApplicable && (
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Metode <strong>{formPaymentMethod}</strong>: Bebas potongan MDR bank (100% Netto diterima penuh).
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {formatRupiah(Number(formAmount) || 0)}
                  </span>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Keterangan / Catatan
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Detail transaksi, nomor invoice atau keperluan..."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Upload Proof / Struk */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Upload Foto Struk / Nota Bukti (Disimpan ke Google Drive / Sheets)
                </label>
                <div className="mt-1.5 flex items-center gap-3">
                  <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <Upload className="h-4 w-4" />
                    <span>Pilih Foto Bukti</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {formProofUrl && (
                    <div className="flex items-center gap-2">
                      <img
                        src={formProofUrl}
                        alt="Preview"
                        className="h-10 w-10 rounded-md object-cover border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setFormProofUrl('')}
                        className="text-xs text-rose-500 hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit / Cancel */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
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
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
