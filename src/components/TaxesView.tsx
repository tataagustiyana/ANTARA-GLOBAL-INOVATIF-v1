import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Building2,
  Calculator,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Edit2,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  HelpCircle,
  Info,
  Layers,
  Percent,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  Trash2,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
  ChartOfAccount,
  CompanyProfile,
  PayrollRun,
  Store,
  TaxCalculationBase,
  TaxCategory,
  TaxComponent,
  TaxPaymentRecord,
  TaxRateType,
  TaxTreatment,
  Transaction,
  User,
} from '../types';
import { formatDate, formatRupiah, getTodayString, MONTH_NAMES_ID } from '../utils/formatters';
import { StorageService } from '../services/storageService';

interface TaxesViewProps {
  stores: Store[];
  activeStoreId: string;
  transactions: Transaction[];
  payrollRuns: PayrollRun[];
  chartOfAccounts: ChartOfAccount[];
  taxComponents: TaxComponent[];
  taxPayments: TaxPaymentRecord[];
  currentUser: User;
  companyProfile?: CompanyProfile;
  onSaveTaxComponent: (component: TaxComponent) => void;
  onDeleteTaxComponent: (id: string) => void;
  onSaveTaxPayment: (payment: TaxPaymentRecord, createExpenseTrx?: boolean) => void;
  onDeleteTaxPayment: (id: string) => void;
  onSelectStore?: (storeId: string) => void;
}

type SubTabType = 'components' | 'recap' | 'calculator' | 'payments' | 'guide';

const CATEGORY_LABELS: Record<TaxCategory, string> = {
  PPN: 'PPN (Pertambahan Nilai)',
  PPh_Final: 'PPh Final (UMKM / PP 55)',
  PPh_21: 'PPh 21 (Karyawan / Gaji)',
  PPh_23: 'PPh 23 (Jasa & Sewa Alat)',
  PPh_4_2: 'PPh 4(2) (Sewa Gedung / Final)',
  Pajak_Daerah: 'Pajak Daerah (PB1 / PBJT)',
  Custom: 'Pajak Khusus / Kustom',
};

const CALC_BASE_LABELS: Record<TaxCalculationBase, string> = {
  revenue: 'Peredaran Bruto / Omset Penjualan',
  dpp_transaction: 'Nilai DPP Transaksi Kena Pajak',
  payroll_gross: 'Total Gaji Bruto Karyawan (Payroll)',
  net_profit: 'Laba Bersih Sebelum Pajak (EBT)',
  manual: 'Input Manual / Nilai Khusus',
};

const TREATMENT_LABELS: Record<TaxTreatment, { label: string; desc: string }> = {
  surcharge: {
    label: 'Pungutan Konsumen (Output)',
    desc: 'Menambah tagihan kepada pelanggan/konsumen (misal PPN, PB1)',
  },
  withholding: {
    label: 'Pemotongan Rekanan (Withholding)',
    desc: 'Dipotong dari pembayaran gaji atau supplier/rekanan (misal PPh 21, PPh 23)',
  },
  corporate_expense: {
    label: 'Beban Badan Usaha (Expense)',
    desc: 'Ditanggung langsung oleh perusahaan sebagai beban pajak (misal PPh Final UMKM)',
  },
};

export const TaxesView: React.FC<TaxesViewProps> = ({
  stores,
  activeStoreId,
  transactions,
  payrollRuns,
  chartOfAccounts,
  taxComponents,
  taxPayments,
  currentUser,
  companyProfile,
  onSaveTaxComponent,
  onDeleteTaxComponent,
  onSaveTaxPayment,
  onDeleteTaxPayment,
  onSelectStore,
}) => {
  // Navigation & Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('components');

  // Filter States
  const [selectedStoreId, setSelectedStoreId] = useState<string>(activeStoreId || 'ALL');
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modal Component Form State
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<TaxComponent | null>(null);
  const [compFormData, setCompFormData] = useState<{
    code: string;
    name: string;
    category: TaxCategory;
    rate: number;
    rateType: TaxRateType;
    calculationBase: TaxCalculationBase;
    taxTreatment: TaxTreatment;
    storeScope: string;
    status: 'Active' | 'Inactive';
    description: string;
    accountCode: string;
  }>({
    code: '',
    name: '',
    category: 'PPh_Final',
    rate: 0.5,
    rateType: 'percentage',
    calculationBase: 'revenue',
    taxTreatment: 'corporate_expense',
    storeScope: 'ALL',
    status: 'Active',
    description: '',
    accountCode: '5-104',
  });

  // Modal Payment Form State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState<{
    taxComponentId: string;
    storeId: string;
    periodMonth: number;
    periodYear: number;
    dppAmount: number;
    amount: number;
    billingCode: string;
    ntpn: string;
    paymentDate: string;
    paymentMethod: string;
    notes: string;
    createExpenseTrx: boolean;
  }>({
    taxComponentId: '',
    storeId: selectedStoreId === 'ALL' ? 'STR-001' : selectedStoreId,
    periodMonth: selectedMonth,
    periodYear: selectedYear,
    dppAmount: 0,
    amount: 0,
    billingCode: '',
    ntpn: '',
    paymentDate: getTodayString(),
    paymentMethod: 'Bank Transfer',
    notes: '',
    createExpenseTrx: true,
  });

  // Interactive Live Calculator State
  const [calcInputDpp, setCalcInputDpp] = useState<number>(10000000);
  const [calcSelectedCompId, setCalcSelectedCompId] = useState<string>(
    taxComponents[0]?.id || ''
  );
  const [calcCustomRate, setCalcCustomRate] = useState<number>(0.5);
  const [calcUseCustomRate, setCalcUseCustomRate] = useState<boolean>(false);

  // Sync selectedStoreId with activeStoreId if prop changes
  React.useEffect(() => {
    if (activeStoreId && activeStoreId !== selectedStoreId) {
      setSelectedStoreId(activeStoreId);
    }
  }, [activeStoreId]);

  // Derived Financial Bases for Selected Store & Period
  const financialBases = useMemo(() => {
    // Filter transactions
    const periodTransactions = transactions.filter((t) => {
      if (t.Status !== 'Approved') return false;
      if (selectedStoreId !== 'ALL' && t.Store_ID !== selectedStoreId) return false;
      const [tYear, tMonth] = t.Date.split('-').map(Number);
      return tYear === selectedYear && tMonth === selectedMonth;
    });

    // Total Omset / Pendapatan Bruto (Revenue)
    const grossRevenue = periodTransactions
      .filter((t) => t.Type === 'Pemasukan')
      .reduce((sum, t) => sum + (t.Amount || 0), 0);

    // Total Pengeluaran Operasional (Expense)
    const totalExpenses = periodTransactions
      .filter((t) => t.Type === 'Pengeluaran')
      .reduce((sum, t) => sum + (t.Amount || 0), 0);

    // Net Profit Before Tax
    const netProfitBeforeTax = grossRevenue - totalExpenses;

    // Filter payroll runs
    const periodPayrolls = payrollRuns.filter((p) => {
      if (p.Payment_Status !== 'Paid' && p.Payment_Status !== 'Approved') return false;
      if (selectedStoreId !== 'ALL' && p.Store_ID !== selectedStoreId) return false;
      return p.Period_Year === selectedYear && p.Period_Month === selectedMonth;
    });

    // Total Gaji Bruto Karyawan
    const grossPayroll = periodPayrolls.reduce(
      (sum, p) => sum + (p.Base_Salary || 0) + (p.Total_Allowances || 0),
      0
    );

    return {
      grossRevenue,
      totalExpenses,
      netProfitBeforeTax,
      grossPayroll,
      transactionCount: periodTransactions.length,
    };
  }, [transactions, payrollRuns, selectedStoreId, selectedMonth, selectedYear]);

  // Calculate Real-time Tax Obligations based on Active Components
  const taxCalculations = useMemo(() => {
    return taxComponents.map((comp) => {
      // Check if component applies to selected store
      const isApplicableToStore =
        selectedStoreId === 'ALL' ||
        comp.storeScope === 'ALL' ||
        comp.storeScope === selectedStoreId;

      let baseAmount = 0;
      let baseLabel = '';

      switch (comp.calculationBase) {
        case 'revenue':
          baseAmount = financialBases.grossRevenue;
          baseLabel = 'Omset Bruto';
          break;
        case 'payroll_gross':
          baseAmount = financialBases.grossPayroll;
          baseLabel = 'Gaji Bruto Karyawan';
          break;
        case 'net_profit':
          baseAmount = Math.max(0, financialBases.netProfitBeforeTax);
          baseLabel = 'Laba Sebelum Pajak';
          break;
        case 'dpp_transaction':
          // By default DPP penyerahan kena pajak disesuaikan dengan omset atau proporsi penjualan
          baseAmount = financialBases.grossRevenue;
          baseLabel = 'DPP Penyerahan BKP/JKP';
          break;
        case 'manual':
        default:
          baseAmount = 0;
          baseLabel = 'Penyesuaian Manual';
          break;
      }

      // Calculate Tax Amount
      let estimatedTax = 0;
      if (comp.status === 'Active' && isApplicableToStore) {
        if (comp.rateType === 'percentage') {
          estimatedTax = Math.round((baseAmount * comp.rate) / 100);
        } else {
          estimatedTax = comp.rate;
        }
      }

      // Check payments recorded for this component and period
      const matchingPayments = taxPayments.filter((p) => {
        if (p.taxComponentId !== comp.id) return false;
        if (p.periodMonth !== selectedMonth || p.periodYear !== selectedYear) return false;
        if (selectedStoreId !== 'ALL' && p.storeId !== 'ALL' && p.storeId !== selectedStoreId)
          return false;
        return p.status === 'Paid';
      });

      const paidAmount = matchingPayments.reduce((sum, p) => sum + p.amount, 0);
      const remainingTax = Math.max(0, estimatedTax - paidAmount);

      return {
        component: comp,
        isApplicableToStore,
        baseAmount,
        baseLabel,
        estimatedTax,
        paidAmount,
        remainingTax,
        paymentStatus:
          estimatedTax === 0
            ? 'Tidak Ada Beban'
            : paidAmount >= estimatedTax
            ? 'Lunas'
            : paidAmount > 0
            ? 'Sebagian'
            : 'Belum Disetor',
      };
    });
  }, [
    taxComponents,
    taxPayments,
    financialBases,
    selectedStoreId,
    selectedMonth,
    selectedYear,
  ]);

  // Overall Statistics
  const stats = useMemo(() => {
    const activeComps = taxComponents.filter((c) => c.status === 'Active');
    const totalEstimated = taxCalculations.reduce(
      (sum, item) => (item.component.status === 'Active' ? sum + item.estimatedTax : sum),
      0
    );
    const totalPaid = taxCalculations.reduce(
      (sum, item) => (item.component.status === 'Active' ? sum + item.paidAmount : sum),
      0
    );
    const totalOutstanding = Math.max(0, totalEstimated - totalPaid);

    return {
      activeCount: activeComps.length,
      totalCount: taxComponents.length,
      totalEstimated,
      totalPaid,
      totalOutstanding,
    };
  }, [taxComponents, taxCalculations]);

  // Filtered Components for Tab 1
  const filteredComponents = useMemo(() => {
    return taxComponents.filter((comp) => {
      const matchSearch =
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (comp.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === 'ALL' || comp.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [taxComponents, searchQuery, categoryFilter]);

  // Filtered Payments for Tab 3
  const filteredPayments = useMemo(() => {
    return taxPayments.filter((p) => {
      if (selectedStoreId !== 'ALL' && p.storeId !== 'ALL' && p.storeId !== selectedStoreId)
        return false;
      if (p.periodMonth !== selectedMonth || p.periodYear !== selectedYear) return false;
      return true;
    });
  }, [taxPayments, selectedStoreId, selectedMonth, selectedYear]);

  // Open Component Modal for Add/Edit
  const handleOpenAddComponent = () => {
    setEditingComponent(null);
    setCompFormData({
      code: `PAJAK-${String(taxComponents.length + 1).padStart(3, '0')}`,
      name: '',
      category: 'PPh_Final',
      rate: 0.5,
      rateType: 'percentage',
      calculationBase: 'revenue',
      taxTreatment: 'corporate_expense',
      storeScope: selectedStoreId === 'ALL' ? 'ALL' : selectedStoreId,
      status: 'Active',
      description: '',
      accountCode: '5-104',
    });
    setIsComponentModalOpen(true);
  };

  const handleOpenEditComponent = (comp: TaxComponent) => {
    setEditingComponent(comp);
    setCompFormData({
      code: comp.code,
      name: comp.name,
      category: comp.category,
      rate: comp.rate,
      rateType: comp.rateType,
      calculationBase: comp.calculationBase,
      taxTreatment: comp.taxTreatment,
      storeScope: comp.storeScope,
      status: comp.status,
      description: comp.description || '',
      accountCode: comp.accountCode || '5-104',
    });
    setIsComponentModalOpen(true);
  };

  const handleSaveComponentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compFormData.name.trim() || !compFormData.code.trim()) return;

    const componentToSave: TaxComponent = {
      id: editingComponent ? editingComponent.id : `TAX-${Date.now()}`,
      code: compFormData.code.trim().toUpperCase(),
      name: compFormData.name.trim(),
      category: compFormData.category,
      rate: Number(compFormData.rate) || 0,
      rateType: compFormData.rateType,
      calculationBase: compFormData.calculationBase,
      taxTreatment: compFormData.taxTreatment,
      storeScope: compFormData.storeScope,
      status: compFormData.status,
      description: compFormData.description.trim(),
      accountCode: compFormData.accountCode,
      updatedAt: getTodayString(),
      isSystem: editingComponent ? editingComponent.isSystem : false,
    };

    onSaveTaxComponent(componentToSave);
    setIsComponentModalOpen(false);
  };

  // Toggle active status directly
  const handleToggleComponentStatus = (comp: TaxComponent) => {
    const updated: TaxComponent = {
      ...comp,
      status: comp.status === 'Active' ? 'Inactive' : 'Active',
      updatedAt: getTodayString(),
    };
    onSaveTaxComponent(updated);
  };

  // Open Record Payment Modal
  const handleOpenPaymentModal = (defaultCompId?: string, defaultAmount?: number, defaultDpp?: number) => {
    const initialCompId = defaultCompId || taxComponents[0]?.id || '';
    const initialComp = taxComponents.find((c) => c.id === initialCompId);

    setPaymentFormData({
      taxComponentId: initialCompId,
      storeId: selectedStoreId === 'ALL' ? 'STR-001' : selectedStoreId,
      periodMonth: selectedMonth,
      periodYear: selectedYear,
      dppAmount: defaultDpp !== undefined ? defaultDpp : financialBases.grossRevenue,
      amount: defaultAmount !== undefined ? defaultAmount : initialComp ? Math.round((financialBases.grossRevenue * initialComp.rate) / 100) : 0,
      billingCode: Math.floor(100000000000000 + Math.random() * 900000000000000).toString(), // Generated 15 digit demo billing
      ntpn: '',
      paymentDate: getTodayString(),
      paymentMethod: 'Bank Transfer',
      notes: `Penyetoran Pajak Masa ${MONTH_NAMES_ID[selectedMonth - 1]} ${selectedYear}`,
      createExpenseTrx: true,
    });
    setIsPaymentModalOpen(true);
  };

  const handleSavePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentFormData.taxComponentId || paymentFormData.amount <= 0) return;

    const comp = taxComponents.find((c) => c.id === paymentFormData.taxComponentId);
    if (!comp) return;

    const record: TaxPaymentRecord = {
      id: `TAX-PAY-${paymentFormData.periodYear}${String(paymentFormData.periodMonth).padStart(2, '0')}-${Date.now().toString().slice(-4)}`,
      taxComponentId: comp.id,
      taxComponentName: comp.name,
      taxCode: comp.code,
      storeId: paymentFormData.storeId,
      periodMonth: paymentFormData.periodMonth,
      periodYear: paymentFormData.periodYear,
      dppAmount: Number(paymentFormData.dppAmount) || 0,
      taxRate: comp.rate,
      amount: Number(paymentFormData.amount) || 0,
      billingCode: paymentFormData.billingCode.trim() || 'KODE-BILLING-DJP',
      ntpn: paymentFormData.ntpn.trim() || undefined,
      paymentDate: paymentFormData.paymentDate,
      paymentMethod: paymentFormData.paymentMethod,
      status: paymentFormData.ntpn.trim() ? 'Paid' : 'Pending',
      notes: paymentFormData.notes.trim(),
      createdAt: getTodayString(),
    };

    onSaveTaxPayment(record, paymentFormData.createExpenseTrx);
    setIsPaymentModalOpen(false);
  };

  // Export Tax Summary to Excel (.xlsx)
  const handleExportExcel = () => {
    const storeLabel =
      selectedStoreId === 'ALL'
        ? 'Semua Cabang'
        : stores.find((s) => s.Store_ID === selectedStoreId)?.Store_Name || selectedStoreId;

    const headers = [
      'Kode Pajak',
      'Nama Komponen',
      'Kategori Pajak',
      'Tarif (%)',
      'Basis Pengenaan',
      'Sifat Pajak',
      'Basis Nilai Riil / DPP (Rp)',
      'Estimasi Pajak Terutang (Rp)',
      'Sudah Disetor (Rp)',
      'Sisa Belum Setor (Rp)',
      'Status Setoran',
    ];

    const rows = taxCalculations.map((item) => [
      item.component.code,
      item.component.name,
      CATEGORY_LABELS[item.component.category] || item.component.category,
      item.component.rate,
      CALC_BASE_LABELS[item.component.calculationBase] || item.component.calculationBase,
      item.component.taxTreatment,
      item.baseAmount,
      item.estimatedTax,
      item.paidAmount,
      item.remainingTax,
      item.paymentStatus,
    ]);

    StorageService.exportToExcel(
      `Rekap_Pajak_${selectedYear}_${selectedMonth}_${selectedStoreId}`,
      headers,
      rows,
      'Rekap Pajak'
    );
  };

  // Quick Calculator Computation
  const activeCalcComp = taxComponents.find((c) => c.id === calcSelectedCompId);
  const effectiveCalcRate = calcUseCustomRate
    ? calcCustomRate
    : activeCalcComp
    ? activeCalcComp.rate
    : 0.5;
  const calcTaxResult = Math.round((calcInputDpp * effectiveCalcRate) / 100);
  const calcTotalWithTax =
    activeCalcComp?.taxTreatment === 'surcharge'
      ? calcInputDpp + calcTaxResult
      : calcInputDpp;
  const calcAfterWithholding =
    activeCalcComp?.taxTreatment === 'withholding'
      ? calcInputDpp - calcTaxResult
      : calcInputDpp;

  return (
    <div className="space-y-6">
      {/* Top Header & Overview Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Manajemen Pajak & Fiskal
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur komponen pajak secara manual (tarif, basis, sifat, dan akun COA) serta pantau kewajiban SPT Masa.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab('calculator')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Calculator className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            Kalkulator Cepat
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-100 hover:text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 cursor-pointer transition-colors"
            title="Ekspor laporan rekapitulasi pajak ke format Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Ekspor Excel (.xlsx)
          </button>
          <button
            onClick={() => handleOpenPaymentModal()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
          >
            <Receipt className="h-3.5 w-3.5" />
            Catat Setoran NTPN
          </button>
          <button
            onClick={handleOpenAddComponent}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Komponen Pajak
          </button>
        </div>
      </div>

      {/* Control Bar: Outlet & Period Selectors */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          {/* Outlet Scope Selector */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Lingkup Toko:
            </span>
            <select
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(e.target.value);
                if (onSelectStore) onSelectStore(e.target.value);
              }}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="ALL">Semua Cabang Toko</option>
              {stores.map((s) => (
                <option key={s.Store_ID} value={s.Store_ID}>
                  {s.Store_Name} ({s.Store_ID})
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* Month & Year Selectors */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Masa Pajak:
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {MONTH_NAMES_ID.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Financial base summary indicator */}
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
          <span>
            Omset Periode: <strong className="font-mono text-slate-900 dark:text-white">{formatRupiah(financialBases.grossRevenue)}</strong>
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>
            Gaji Bruto: <strong className="font-mono text-slate-900 dark:text-white">{formatRupiah(financialBases.grossPayroll)}</strong>
          </span>
        </div>
      </div>

      {/* 4 Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Komponen Pajak */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Komponen Pajak Aktif
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Sliders className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {stats.activeCount}
            </span>
            <span className="text-xs text-slate-400">
              dari {stats.totalCount} komponen terdaftar
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Dapat diatur tarif & rumusnya secara manual
          </p>
        </div>

        {/* Estimasi Pajak Terutang */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Estimasi Pajak Terutang
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {formatRupiah(stats.totalEstimated)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Masa {MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}
          </p>
        </div>

        {/* Sudah Disetor */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Pajak Telah Disetor (NTPN)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <BadgeCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatRupiah(stats.totalPaid)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Tercatat dengan Kode Billing resmi DJP
          </p>
        </div>

        {/* Sisa Kewajiban Belum Disetor */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Sisa Kewajiban Belum Setor
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                stats.totalOutstanding > 0
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
              }`}
            >
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span
              className={`text-2xl font-bold font-mono ${
                stats.totalOutstanding > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {formatRupiah(stats.totalOutstanding)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {stats.totalOutstanding === 0
              ? 'Seluruh kewajiban lunas'
              : 'Jatuh tempo tgl 15 bulan berikutnya'}
          </p>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('components')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
            activeSubTab === 'components'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="h-4 w-4" />
          Komponen & Tarif Pajak ({taxComponents.length})
        </button>
        <button
          onClick={() => setActiveSubTab('recap')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
            activeSubTab === 'recap'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          Rekapitulasi Real-Time Masa Pajak
        </button>
        <button
          onClick={() => setActiveSubTab('calculator')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
            activeSubTab === 'calculator'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Calculator className="h-4 w-4" />
          Kalkulator Simulasi Pajak
        </button>
        <button
          onClick={() => setActiveSubTab('payments')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
            activeSubTab === 'payments'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Receipt className="h-4 w-4" />
          Riwayat Penyetoran & NTPN ({filteredPayments.length})
        </button>
        <button
          onClick={() => setActiveSubTab('guide')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
            activeSubTab === 'guide'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          Panduan Fiskal & Kalender SPT
        </button>
      </div>

      {/* SUB-TAB 1: KOMPONEN PAJAK MANUAL */}
      {activeSubTab === 'components' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari kode pajak, nama, regulasi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="ALL">Semua Kategori Pajak</option>
                <option value="PPh_Final">PPh Final UMKM (PP 55)</option>
                <option value="PPN">PPN 11% (Keluaran/Masukan)</option>
                <option value="PPh_21">PPh 21 Karyawan</option>
                <option value="PPh_23">PPh 23 Jasa & Sewa</option>
                <option value="PPh_4_2">PPh 4(2) Final Sewa</option>
                <option value="Pajak_Daerah">Pajak Daerah (PB1)</option>
                <option value="Custom">Pajak Khusus / Kustom</option>
              </select>
            </div>
          </div>

          {/* Tax Components Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                  <tr>
                    <th className="py-3 pl-4 pr-3">Kode & Nama Komponen</th>
                    <th className="px-3 py-3">Kategori</th>
                    <th className="px-3 py-3">Tarif Manual</th>
                    <th className="px-3 py-3">Basis Perhitungan</th>
                    <th className="px-3 py-3">Sifat Pajak</th>
                    <th className="px-3 py-3">Lingkup Toko</th>
                    <th className="px-3 py-3">Akun COA</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="py-3 pl-3 pr-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredComponents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Tidak ada komponen pajak yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredComponents.map((comp) => {
                      const isActive = comp.status === 'Active';
                      const treatmentInfo = TREATMENT_LABELS[comp.taxTreatment];

                      return (
                        <tr
                          key={comp.id}
                          className="hover:bg-slate-50/70 transition-colors dark:hover:bg-slate-800/40"
                        >
                          {/* Kode & Nama */}
                          <td className="py-3.5 pl-4 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                {comp.code}
                              </span>
                              {comp.isSystem && (
                                <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                  Preset
                                </span>
                              )}
                            </div>
                            <div className="mt-1 font-semibold text-slate-900 dark:text-white">
                              {comp.name}
                            </div>
                            {comp.description && (
                              <div className="mt-0.5 max-w-sm truncate text-[10px] text-slate-400" title={comp.description}>
                                {comp.description}
                              </div>
                            )}
                          </td>

                          {/* Kategori */}
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {CATEGORY_LABELS[comp.category] || comp.category}
                            </span>
                          </td>

                          {/* Tarif */}
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                              {comp.rateType === 'percentage'
                                ? `${comp.rate}%`
                                : formatRupiah(comp.rate)}
                            </span>
                          </td>

                          {/* Basis Perhitungan */}
                          <td className="px-3 py-3.5">
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {CALC_BASE_LABELS[comp.calculationBase] || comp.calculationBase}
                            </div>
                          </td>

                          {/* Sifat Pajak */}
                          <td className="px-3 py-3.5">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                comp.taxTreatment === 'corporate_expense'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                                  : comp.taxTreatment === 'withholding'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              }`}
                              title={treatmentInfo?.desc}
                            >
                              {treatmentInfo?.label || comp.taxTreatment}
                            </span>
                          </td>

                          {/* Lingkup Toko */}
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            {comp.storeScope === 'ALL' ? (
                              <span className="text-slate-600 dark:text-slate-400">
                                Semua Cabang
                              </span>
                            ) : (
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {stores.find((s) => s.Store_ID === comp.storeScope)?.Store_Name ||
                                  comp.storeScope}
                              </span>
                            )}
                          </td>

                          {/* Akun COA */}
                          <td className="px-3 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {comp.accountCode || '-'}
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleComponentStatus(comp)}
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                isActive
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isActive ? 'bg-emerald-600' : 'bg-slate-400'
                                }`}
                              />
                              {isActive ? 'Aktif' : 'Nonaktif'}
                            </button>
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 pl-3 pr-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditComponent(comp)}
                                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                                title="Ubah Komponen & Tarif"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Apakah Anda yakin ingin menghapus komponen pajak "${comp.name}"?`
                                    )
                                  ) {
                                    onDeleteTaxComponent(comp.id);
                                  }
                                }}
                                className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                                title="Hapus Komponen"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REKAPITULASI REAL-TIME */}
      {activeSubTab === 'recap' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
            <Info className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <div className="text-xs text-indigo-950 dark:text-indigo-200">
              <strong className="font-semibold block mb-0.5">
                Perhitungan Pajak Terintegrasi dengan Buku Besar & Penggajian
              </strong>
              Kewajiban pajak di bawah ini dihitung otomatis secara real-time berdasarkan transaksi pemasukan, pengeluaran, dan slip gaji pada masa{' '}
              <strong>{MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}</strong> untuk{' '}
              <strong>
                {selectedStoreId === 'ALL'
                  ? 'Semua Cabang Toko'
                  : stores.find((s) => s.Store_ID === selectedStoreId)?.Store_Name || selectedStoreId}
              </strong>
              . Seluruh rumus dan tarif dapat Anda sesuaikan di tab &quot;Komponen &amp; Tarif Pajak&quot;.
            </div>
          </div>

          {/* Real-time Calculation Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Rincian Beban Pajak per Komponen Aktif
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Menghitung DPP dari data transaksi nyata vs tarif manual yang dikonfigurasi.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Total Terutang:</span>
                <span className="font-mono text-base font-bold text-indigo-600 dark:text-indigo-400">
                  {formatRupiah(stats.totalEstimated)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                  <tr>
                    <th className="py-3 pl-4 pr-3">Komponen & Tarif</th>
                    <th className="px-3 py-3">Dasar Pengenaan (DPP Real)</th>
                    <th className="px-3 py-3">Rumus Perhitungan</th>
                    <th className="px-3 py-3 text-right">Estimasi Terutang</th>
                    <th className="px-3 py-3 text-right">Sudah Disetor</th>
                    <th className="px-3 py-3 text-right">Sisa Kewajiban</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="py-3 pl-3 pr-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {taxCalculations
                    .filter((item) => item.component.status === 'Active' && item.isApplicableToStore)
                    .map((item) => {
                      return (
                        <tr
                          key={item.component.id}
                          className="hover:bg-slate-50/70 transition-colors dark:hover:bg-slate-800/40"
                        >
                          {/* Komponen */}
                          <td className="py-3.5 pl-4 pr-3">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {item.component.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-slate-400">
                                {item.component.code}
                              </span>
                              <span className="rounded-full bg-indigo-50 px-1.5 py-0.2 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                                {item.component.rate}%
                              </span>
                            </div>
                          </td>

                          {/* DPP Real */}
                          <td className="px-3 py-3.5">
                            <div className="font-mono font-medium text-slate-900 dark:text-slate-100">
                              {formatRupiah(item.baseAmount)}
                            </div>
                            <div className="text-[10px] text-slate-400">{item.baseLabel}</div>
                          </td>

                          {/* Rumus */}
                          <td className="px-3 py-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {item.component.rate}% × {formatRupiah(item.baseAmount)}
                          </td>

                          {/* Estimasi Terutang */}
                          <td className="px-3 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatRupiah(item.estimatedTax)}
                          </td>

                          {/* Sudah Disetor */}
                          <td className="px-3 py-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            {formatRupiah(item.paidAmount)}
                          </td>

                          {/* Sisa Kewajiban */}
                          <td className="px-3 py-3.5 text-right font-mono font-bold">
                            <span
                              className={
                                item.remainingTax > 0
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-400'
                              }
                            >
                              {formatRupiah(item.remainingTax)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3.5 text-center">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                item.paymentStatus === 'Lunas'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : item.paymentStatus === 'Sebagian'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : item.paymentStatus === 'Belum Disetor'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {item.paymentStatus}
                            </span>
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 pl-3 pr-4 text-right">
                            <button
                              onClick={() =>
                                handleOpenPaymentModal(
                                  item.component.id,
                                  item.remainingTax > 0 ? item.remainingTax : item.estimatedTax,
                                  item.baseAmount
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                            >
                              <Receipt className="h-3 w-3" />
                              Catat Setor
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot className="border-t-2 border-slate-300 bg-slate-50/80 font-bold dark:border-slate-700 dark:bg-slate-800/80 text-slate-900 dark:text-white">
                  <tr>
                    <td colSpan={3} className="py-3.5 pl-4 pr-3 text-xs">
                      TOTAL KEWAJIBAN MASA {MONTH_NAMES_ID[selectedMonth - 1].toUpperCase()}{' '}
                      {selectedYear}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-sm text-indigo-600 dark:text-indigo-400">
                      {formatRupiah(stats.totalEstimated)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">
                      {formatRupiah(stats.totalPaid)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-sm text-rose-600 dark:text-rose-400">
                      {formatRupiah(stats.totalOutstanding)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: KALKULATOR SIMULASI PAJAK MANDIRI */}
      {activeSubTab === 'calculator' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Form Input Simulator */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
              <Calculator className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Kalkulator Simulasi Pajak Mandiri
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Uji perhitungan pajak secara instan dengan memasukkan nominal DPP dan memilih komponen.
                </p>
              </div>
            </div>

            {/* Input Nilai Transaksi / DPP */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nilai Transaksi / Dasar Pengenaan Pajak (DPP)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={calcInputDpp}
                  onChange={(e) => setCalcInputDpp(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm font-mono font-bold text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="0"
                />
              </div>
              <div className="flex gap-2 mt-1.5">
                {[1000000, 5000000, 10000000, 50000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCalcInputDpp(amt)}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {formatRupiah(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Pilih Komponen Pajak */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pilih Komponen Pajak Terdaftar
              </label>
              <select
                value={calcSelectedCompId}
                onChange={(e) => {
                  setCalcSelectedCompId(e.target.value);
                  const selected = taxComponents.find((c) => c.id === e.target.value);
                  if (selected) {
                    setCalcCustomRate(selected.rate);
                  }
                }}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {taxComponents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) - Tarif: {c.rate}% [{TREATMENT_LABELS[c.taxTreatment]?.label}]
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Rate Override Checkbox */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={calcUseCustomRate}
                  onChange={(e) => setCalcUseCustomRate(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Gunakan Tarif Kustom Manual (Ubah Persentase Sementara)
                </span>
              </label>

              {calcUseCustomRate && (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Tarif Uji (%):</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={calcCustomRate}
                    onChange={(e) => setCalcCustomRate(Number(e.target.value) || 0)}
                    className="w-24 rounded-lg border border-slate-300 py-1 px-2 text-xs font-mono font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <span className="text-xs font-bold text-indigo-600">%</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() =>
                  handleOpenPaymentModal(
                    activeCalcComp?.id,
                    calcTaxResult,
                    calcInputDpp
                  )
                }
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 px-4 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                <Receipt className="h-4 w-4" />
                Gunakan Hasil Ini untuk Catat Penyetoran Pajak
              </button>
            </div>
          </div>

          {/* Hasil Perhitungan Simulator */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-6 dark:border-slate-800 dark:bg-slate-900 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Hasil Simulasi Perhitungan
                </span>
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-mono font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  Tarif: {effectiveCalcRate}%
                </span>
              </div>

              {/* Rincian Angka */}
              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-center text-xs py-1">
                  <span className="text-slate-500 dark:text-slate-400">Nilai Dasar Pengenaan (DPP):</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white text-sm">
                    {formatRupiah(calcInputDpp)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs py-1">
                  <span className="text-slate-500 dark:text-slate-400">
                    Beban / Potongan Pajak ({effectiveCalcRate}%):
                  </span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-base">
                    {formatRupiah(calcTaxResult)}
                  </span>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-800" />

                {activeCalcComp?.taxTreatment === 'surcharge' && (
                  <div className="flex justify-between items-center text-xs py-1 bg-emerald-50/60 p-2.5 rounded-lg dark:bg-emerald-950/30">
                    <span className="text-emerald-900 dark:text-emerald-300 font-medium">
                      Total Ditagihkan ke Pelanggan (DPP + Pajak):
                    </span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-base">
                      {formatRupiah(calcTotalWithTax)}
                    </span>
                  </div>
                )}

                {activeCalcComp?.taxTreatment === 'withholding' && (
                  <div className="flex justify-between items-center text-xs py-1 bg-blue-50/60 p-2.5 rounded-lg dark:bg-blue-950/30">
                    <span className="text-blue-900 dark:text-blue-300 font-medium">
                      Total Dibayarkan ke Penerima (DPP - Potongan):
                    </span>
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-base">
                      {formatRupiah(calcAfterWithholding)}
                    </span>
                  </div>
                )}

                {activeCalcComp?.taxTreatment === 'corporate_expense' && (
                  <div className="flex justify-between items-center text-xs py-1 bg-amber-50/60 p-2.5 rounded-lg dark:bg-amber-950/30">
                    <span className="text-amber-900 dark:text-amber-300 font-medium">
                      Beban Badan Usaha yang Harus Disetor:
                    </span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-base">
                      {formatRupiah(calcTaxResult)}
                    </span>
                  </div>
                )}
              </div>

              {/* Catatan Komponen */}
              {activeCalcComp && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
                  <div className="font-semibold text-slate-800 dark:text-white mb-0.5">
                    {activeCalcComp.name}
                  </div>
                  <div>{activeCalcComp.description || 'Tidak ada catatan tambahan.'}</div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    Sifat: {TREATMENT_LABELS[activeCalcComp.taxTreatment]?.label} • Akun COA: {activeCalcComp.accountCode}
                  </div>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-400 border-t border-slate-200 pt-3 dark:border-slate-800 flex items-center justify-between">
              <span>Dasar Perhitungan Resmi DJP Kemenkeu RI</span>
              <span>Presisi: Pembulatan ke Rupiah terdekat</span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: RIWAYAT PENYETORAN & NTPN */}
      {activeSubTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Daftar Penyetoran Pajak & NTPN Negara
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pencatatan bukti bayar pajak resmi dengan Kode Billing 15 digit dan Nomor Transaksi Penerimaan Negara (NTPN).
              </p>
            </div>
            <button
              onClick={() => handleOpenPaymentModal()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Catat Setoran Baru
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                  <tr>
                    <th className="py-3 pl-4 pr-3">Masa & Komponen Pajak</th>
                    <th className="px-3 py-3">Kode Billing DJP</th>
                    <th className="px-3 py-3">NTPN (Bank/Pos)</th>
                    <th className="px-3 py-3">Tanggal Setor</th>
                    <th className="px-3 py-3">Dasar Pengenaan (DPP)</th>
                    <th className="px-3 py-3 text-right">Jumlah Setor</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="py-3 pl-3 pr-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Belum ada riwayat penyetoran pajak pada masa {MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => {
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50/70 transition-colors dark:hover:bg-slate-800/40"
                        >
                          {/* Komponen */}
                          <td className="py-3.5 pl-4 pr-3">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {p.taxComponentName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Masa {MONTH_NAMES_ID[p.periodMonth - 1]} {p.periodYear} • {p.taxCode}
                            </div>
                          </td>

                          {/* Kode Billing */}
                          <td className="px-3 py-3.5">
                            <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                              {p.billingCode}
                            </span>
                          </td>

                          {/* NTPN */}
                          <td className="px-3 py-3.5">
                            {p.ntpn ? (
                              <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {p.ntpn}
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                                Belum Terverifikasi
                              </span>
                            )}
                          </td>

                          {/* Tanggal Setor */}
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            {formatDate(p.paymentDate)}
                          </td>

                          {/* DPP */}
                          <td className="px-3 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                            {formatRupiah(p.dppAmount)}
                          </td>

                          {/* Nominal */}
                          <td className="px-3 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatRupiah(p.amount)}
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3.5 text-center">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                p.status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              }`}
                            >
                              {p.status === 'Paid' ? 'Lunas / Terverifikasi' : 'Pending'}
                            </span>
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 pl-3 pr-4 text-right">
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Hapus catatan penyetoran ${p.taxComponentName} sebesar ${formatRupiah(
                                      p.amount
                                    )}?`
                                  )
                                ) {
                                  onDeleteTaxPayment(p.id);
                                }
                              }}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                              title="Hapus Catatan"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: PANDUAN FISKAL & KALENDER SPT */}
      {activeSubTab === 'guide' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Kalender Batas Waktu SPT Masa */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
              <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Jadwal &amp; Batas Waktu Kepatuhan Fiskal
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ketentuan batas penyetoran dan pelaporan SPT Masa perpajakan Indonesia.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white">
                    PPh Final UMKM (PP 55/2022)
                  </span>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    Tgl 15 Tiap Bulan
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Batas setor tanggal 15 bulan berikutnya. Validasi NTPN pada Surat Setoran Pajak berfungsi sebagai bukti lapor SPT Masa (tidak wajib lapor tersendiri jika nihil/telah disetor).
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white">
                    PPh Pasal 21 &amp; PPh Pasal 23
                  </span>
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                    Setor Tgl 10/15, Lapor Tgl 20
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Penyetoran paling lambat tanggal 10 atau 15 bulan berikutnya. Pelaporan SPT Masa PPh Unifikasi paling lambat tanggal 20 bulan berikutnya.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white">
                    PPN (Pajak Pertambahan Nilai)
                  </span>
                  <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                    Akhir Bulan Berikutnya
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Bagi Pengusaha Kena Pajak (PKP), penyetoran PPN kurang bayar dan pelaporan SPT Masa PPN 1111 dilakukan paling lambat akhir bulan berikutnya sebelum SPT dilaporkan.
                </p>
              </div>
            </div>
          </div>

          {/* Rangkuman Aturan & Tips Penghematan Fiskal */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Panduan Peraturan &amp; Tips Pajak Usaha
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ringkasan peraturan perundang-undangan perpajakan terkini di Indonesia.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="rounded-lg bg-emerald-50/50 p-3.5 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30">
                <strong className="block text-emerald-900 dark:text-emerald-200 font-semibold mb-1">
                  1. Fasilitas PPh Final PP 55/2022 (Tarif 0.5%)
                </strong>
                Wajib Pajak Orang Pribadi atau Badan (PT/CV) dengan peredaran bruto (omset) tahunan sampai dengan Rp 4,8 Miliar berhak memanfaatkan tarif PPh Final 0.5% dari omset per bulan. Untuk Orang Pribadi, omset sampai dengan Rp 500 Juta dalam setahun tidak dikenai pajak.
              </div>

              <div className="rounded-lg bg-slate-50 p-3.5 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <strong className="block text-slate-900 dark:text-white font-semibold mb-1">
                  2. Perubahan Tarif Pajak Sesuai UU HPP No. 7/2021
                </strong>
                Tarif PPN umum saat ini adalah 11% (berlaku sejak 1 April 2022). Komponen PPN dapat disesuaikan manual pada sistem jika terdapat perubahan tarif atau penyerahan barang/jasa tertentu.
              </div>

              <div className="rounded-lg bg-slate-50 p-3.5 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <strong className="block text-slate-900 dark:text-white font-semibold mb-1">
                  3. Tata Kelola Akuntansi COA
                </strong>
                Pastikan setiap pemotongan PPh 21 atau PPh 23 dialokasikan ke akun kewajiban lancar (Hutang Pajak / 2-102) agar laporan neraca dan laba rugi tetap seimbang.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / UBAH KOMPONEN PAJAK MANUAL */}
      {/* ========================================================================= */}
      {isComponentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  <Sliders className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingComponent ? 'Ubah Komponen Pajak' : 'Tambah Komponen Pajak Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Atur nama, kode, tarif persentase, basis pengenaan, dan sifat secara manual.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsComponentModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveComponentSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Kode Pajak */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Komponen Pajak <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: PPH-FINAL, PPN-11, PB1-10"
                    value={compFormData.code}
                    onChange={(e) => setCompFormData({ ...compFormData, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Kategori Pajak */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori Pajak <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={compFormData.category}
                    onChange={(e) => setCompFormData({ ...compFormData, category: e.target.value as TaxCategory })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="PPh_Final">PPh Final UMKM (PP 55)</option>
                    <option value="PPN">PPN (Pajak Pertambahan Nilai)</option>
                    <option value="PPh_21">PPh Pasal 21 Karyawan</option>
                    <option value="PPh_23">PPh Pasal 23 Jasa & Sewa</option>
                    <option value="PPh_4_2">PPh Pasal 4 ayat 2 (Final Sewa Ruko)</option>
                    <option value="Pajak_Daerah">Pajak Daerah (PB1 Restoran/Layanan)</option>
                    <option value="Custom">Pajak Khusus / Kustom</option>
                  </select>
                </div>
              </div>

              {/* Nama Komponen Pajak */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Resmi Komponen Pajak <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="misal: PPh Final UMKM 0.5% (PP 55/2022)"
                  value={compFormData.name}
                  onChange={(e) => setCompFormData({ ...compFormData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Tarif & Tipe Tarif */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tarif Manual <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={compFormData.rate}
                      onChange={(e) => setCompFormData({ ...compFormData, rate: Number(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-9 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {compFormData.rateType === 'percentage' ? '%' : 'Rp'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bentuk Tarif
                  </label>
                  <select
                    value={compFormData.rateType}
                    onChange={(e) => setCompFormData({ ...compFormData, rateType: e.target.value as TaxRateType })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="percentage">Persentase (%) dari DPP</option>
                    <option value="fixed">Nominal Tetap (Rp)</option>
                  </select>
                </div>
              </div>

              {/* Basis Perhitungan & Sifat Pajak */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dasar Pengenaan / Basis Perhitungan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={compFormData.calculationBase}
                    onChange={(e) => setCompFormData({ ...compFormData, calculationBase: e.target.value as TaxCalculationBase })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="revenue">Peredaran Bruto / Omset Penjualan</option>
                    <option value="dpp_transaction">Nilai DPP Transaksi Kena Pajak</option>
                    <option value="payroll_gross">Total Gaji Bruto Karyawan (Payroll)</option>
                    <option value="net_profit">Laba Bersih Sebelum Pajak</option>
                    <option value="manual">Input / Penyesuaian Manual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sifat Pemotongan / Pemungutan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={compFormData.taxTreatment}
                    onChange={(e) => setCompFormData({ ...compFormData, taxTreatment: e.target.value as TaxTreatment })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="corporate_expense">Beban Usaha Badan (Ditanggung Perusahaan)</option>
                    <option value="withholding">Pemotongan Rekanan / Karyawan (Withholding)</option>
                    <option value="surcharge">Pungutan Konsumen (Menambah Tagihan Pelanggan)</option>
                  </select>
                </div>
              </div>

              {/* Lingkup Toko & Akun COA */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lingkup Cabang Toko
                  </label>
                  <select
                    value={compFormData.storeScope}
                    onChange={(e) => setCompFormData({ ...compFormData, storeScope: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="ALL">Semua Cabang Toko</option>
                    {stores.map((s) => (
                      <option key={s.Store_ID} value={s.Store_ID}>
                        {s.Store_Name} ({s.Store_ID})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Akun COA Terkait (Bagan Akun)
                  </label>
                  <select
                    value={compFormData.accountCode}
                    onChange={(e) => setCompFormData({ ...compFormData, accountCode: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {chartOfAccounts.map((coa) => (
                      <option key={coa.Account_Code} value={coa.Account_Code}>
                        {coa.Account_Code} - {coa.Account_Name} ({coa.Category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Deskripsi & Keterangan Regulasi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan &amp; Dasar Regulasi (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="misal: PP 55 Tahun 2022, UU Harmonisasi Peraturan Perpajakan No. 7/2021"
                  value={compFormData.description}
                  onChange={(e) => setCompFormData({ ...compFormData, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Status Switch */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status Keaktifan
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={compFormData.status === 'Active'}
                      onChange={() => setCompFormData({ ...compFormData, status: 'Active' })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Aktif (Dihitung dalam SPT / Beban)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={compFormData.status === 'Inactive'}
                      onChange={() => setCompFormData({ ...compFormData, status: 'Inactive' })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Nonaktif
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsComponentModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  {editingComponent ? 'Simpan Perubahan' : 'Tambahkan Komponen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CATAT PENYETORAN PAJAK & BUKTI NTPN */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Catat Penyetoran Pajak Negara
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Masukkan Kode Billing 15 digit DJP dan bukti NTPN hasil setor bank/pos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Komponen Pajak */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Komponen Pajak yang Disetor <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={paymentFormData.taxComponentId}
                  onChange={(e) => {
                    const comp = taxComponents.find((c) => c.id === e.target.value);
                    setPaymentFormData({
                      ...paymentFormData,
                      taxComponentId: e.target.value,
                      amount: comp ? Math.round((paymentFormData.dppAmount * comp.rate) / 100) : paymentFormData.amount,
                    });
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="" disabled>-- Pilih Komponen Pajak --</option>
                  {taxComponents.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) - {c.rate}%
                    </option>
                  ))}
                </select>
              </div>

              {/* Masa Pajak & Toko */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Masa Pajak Bulan &amp; Tahun
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={paymentFormData.periodMonth}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, periodMonth: Number(e.target.value) })}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {MONTH_NAMES_ID.map((name, idx) => (
                        <option key={idx + 1} value={idx + 1}>{name}</option>
                      ))}
                    </select>
                    <select
                      value={paymentFormData.periodYear}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, periodYear: Number(e.target.value) })}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {[2024, 2025, 2026, 2027].map((yr) => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cabang Outlet Pembayar
                  </label>
                  <select
                    value={paymentFormData.storeId}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, storeId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="ALL">Semua Cabang (Pusat)</option>
                    {stores.map((s) => (
                      <option key={s.Store_ID} value={s.Store_ID}>
                        {s.Store_Name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DPP & Jumlah Setoran */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dasar Pengenaan Pajak (DPP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={paymentFormData.dppAmount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, dppAmount: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jumlah Nominal Disetor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs font-mono font-bold text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400"
                  />
                </div>
              </div>

              {/* Kode Billing & NTPN */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Billing DJP (15 Digit) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: 028471928471928"
                    value={paymentFormData.billingCode}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, billingCode: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs font-mono font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    NTPN (No. Transaksi Penerimaan Negara)
                  </label>
                  <input
                    type="text"
                    placeholder="misal: 91A82C7E3B410D99"
                    value={paymentFormData.ntpn}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, ntpn: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs font-mono font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Tanggal & Metode Bayar */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Pembayaran
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentFormData.paymentDate}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={paymentFormData.paymentMethod}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Bank Transfer">Bank BCA Operasional (Virtual Account / Billing)</option>
                    <option value="Bank Mandiri">Bank Mandiri</option>
                    <option value="Kas Toko">Kas Tunai Drawer</option>
                    <option value="Online">Pajak Online / DJP Portal</option>
                  </select>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Penyetoran
                </label>
                <input
                  type="text"
                  placeholder="Keterangan transaksi setor pajak..."
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Opsi Otomatis Transaksi Pengeluaran */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentFormData.createExpenseTrx}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, createExpenseTrx: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
                    Otomatis catat sebagai transaksi pengeluaran operasional di buku kas cabang
                  </span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                >
                  Simpan Bukti Setor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
