import {
  AlertCircle,
  Building,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Info,
  Landmark,
  Percent,
  Plus,
  Receipt,
  Search,
  Store as StoreIcon,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
  ChartOfAccount,
  CompanyProfile,
  DebtInstallmentPayment,
  DebtRecord,
  DebtStatus,
  DebtType,
  PaymentMethod,
  Store,
  Transaction,
  User,
} from '../types';
import { formatDate, formatRupiah, getTodayString } from '../utils/formatters';
import { exportDebtsReportPdf } from '../utils/pdfGenerator';
import * as XLSX from 'xlsx';

interface DebtManagementViewProps {
  stores: Store[];
  activeStoreId: string;
  debts: DebtRecord[];
  chartOfAccounts: ChartOfAccount[];
  transactions: Transaction[];
  currentUser: User;
  companyProfile?: CompanyProfile;
  onSaveDebt: (debt: DebtRecord) => Promise<void>;
  onDeleteDebt: (debtId: string) => Promise<void>;
  onRecordDebtPayment: (
    debt: DebtRecord,
    payment: DebtInstallmentPayment,
    createExpenseTrx: boolean
  ) => Promise<void>;
  onDeleteDebtPayment?: (debt: DebtRecord, paymentId: string) => Promise<void>;
  onSelectStore?: (storeId: string) => void;
  onNavigateToTransactions?: (searchKeyword: string) => void;
}

const DEBT_TYPES: DebtType[] = [
  'Hutang Bank / Kredit Usaha',
  'Sewa / Leasing Peralatan',
  'Hutang Dagang / Supplier',
  'Pinjaman Pihak Ketiga / Investor',
  'Hutang Modal & Operasional',
  'Hutang Lainnya',
];

const PAYMENT_METHODS: PaymentMethod[] = [
  'Bank Transfer',
  'Cash',
  'Debit bank BCA',
  'Debit Bank Lain',
  'Qris',
  'E-Wallet',
];

export const DebtManagementView: React.FC<DebtManagementViewProps> = ({
  stores,
  activeStoreId,
  debts,
  chartOfAccounts,
  transactions,
  currentUser,
  companyProfile,
  onSaveDebt,
  onDeleteDebt,
  onRecordDebtPayment,
  onDeleteDebtPayment,
  onSelectStore,
  onNavigateToTransactions,
}) => {
  const isEmployee = currentUser.Role === 'Employee';
  const todayStr = getTodayString();

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStoreId, setFilterStoreId] = useState(activeStoreId);
  const [filterDebtType, setFilterDebtType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Sync store filter with active store from top bar
  React.useEffect(() => {
    setFilterStoreId(activeStoreId);
  }, [activeStoreId]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<DebtRecord | null>(null);
  const [historyDebt, setHistoryDebt] = useState<DebtRecord | null>(null);
  const [deleteConfirmDebt, setDeleteConfirmDebt] = useState<DebtRecord | null>(null);

  // Form: Add / Edit Debt
  const [formCreditorName, setFormCreditorName] = useState('');
  const [formDebtType, setFormDebtType] = useState<DebtType>('Hutang Bank / Kredit Usaha');
  const [formRefNumber, setFormRefNumber] = useState('');
  const [formStoreId, setFormStoreId] = useState(
    activeStoreId === 'ALL' ? (stores[0]?.Store_ID || 'STR-001') : activeStoreId
  );
  const [formCoaAccount, setFormCoaAccount] = useState('2-103 - Hutang Bank / Pinjaman Usaha');
  const [formTotalAmount, setFormTotalAmount] = useState<number | ''>('');
  const [formTenorMonths, setFormTenorMonths] = useState<number | ''>(12);
  const [formMonthlyInstallment, setFormMonthlyInstallment] = useState<number | ''>('');
  const [formStartDate, setFormStartDate] = useState(todayStr);
  const [formDueDate, setFormDueDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCreateDisbursementTrx, setFormCreateDisbursementTrx] = useState(false);
  const [formDisbursementPaymentMethod, setFormDisbursementPaymentMethod] = useState<PaymentMethod>('Bank Transfer');

  // Form: Record Installment Payment
  const [payDate, setPayDate] = useState(todayStr);
  const [payInstallmentNum, setPayInstallmentNum] = useState<number>(1);
  const [payPrincipalAmount, setPayPrincipalAmount] = useState<number | ''>('');
  const [payInterestAmount, setPayInterestAmount] = useState<number | ''>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Bank Transfer');
  const [payCoaAccount, setPayCoaAccount] = useState('');
  const [payProofUrl, setPayProofUrl] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payAutoCreateTrx, setPayAutoCreateTrx] = useState(true);

  // Calculate monthly installment estimate automatically
  React.useEffect(() => {
    if (formTotalAmount && typeof formTotalAmount === 'number' && formTenorMonths && typeof formTenorMonths === 'number' && formTenorMonths > 0) {
      if (!editingDebt) {
        setFormMonthlyInstallment(Math.round(formTotalAmount / formTenorMonths));
      }
    }
  }, [formTotalAmount, formTenorMonths, editingDebt]);

  // Calculate due date automatically from start date and tenor
  React.useEffect(() => {
    if (formStartDate && formTenorMonths && typeof formTenorMonths === 'number' && formTenorMonths > 0) {
      if (!editingDebt || !formDueDate) {
        const start = new Date(formStartDate);
        if (!isNaN(start.getTime())) {
          start.setMonth(start.getMonth() + formTenorMonths);
          setFormDueDate(start.toISOString().split('T')[0]);
        }
      }
    }
  }, [formStartDate, formTenorMonths, editingDebt]);

  // Filtered COA lists
  const liabilityCoas = useMemo(() => {
    return chartOfAccounts.filter((c) => c.Category === 'Liability' || c.Account_Code.startsWith('2-'));
  }, [chartOfAccounts]);

  const expenseCoas = useMemo(() => {
    return chartOfAccounts.filter((c) => c.Category === 'Expense' || c.Account_Code.startsWith('5-'));
  }, [chartOfAccounts]);

  // Filtered Debts List
  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      // Store filter
      if (filterStoreId !== 'ALL' && d.Store_ID !== filterStoreId) {
        return false;
      }
      // Type filter
      if (filterDebtType !== 'ALL' && d.Debt_Type !== filterDebtType) {
        return false;
      }
      // Status filter
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'Overdue') {
          if (d.Status !== 'Paid' && d.Due_Date < todayStr) return true;
          return d.Status === 'Overdue';
        }
        if (d.Status !== filterStatus) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCreditor = d.Creditor_Name.toLowerCase().includes(q);
        const matchRef = (d.Reference_Number || '').toLowerCase().includes(q);
        const matchDesc = (d.Description || '').toLowerCase().includes(q);
        const matchCoa = (d.COA_Account || '').toLowerCase().includes(q);
        const matchId = d.Debt_ID.toLowerCase().includes(q);
        return matchCreditor || matchRef || matchDesc || matchCoa || matchId;
      }
      return true;
    });
  }, [debts, filterStoreId, filterDebtType, filterStatus, searchQuery, todayStr]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalPrincipal = filteredDebts.reduce((sum, d) => sum + (d.Total_Amount || 0), 0);
    const totalPaid = filteredDebts.reduce((sum, d) => sum + (d.Paid_Amount || 0), 0);
    const totalRemaining = filteredDebts.reduce((sum, d) => sum + (d.Remaining_Balance || 0), 0);
    const overdueCount = filteredDebts.filter(
      (d) => d.Status === 'Overdue' || (d.Status !== 'Paid' && d.Due_Date < todayStr)
    ).length;
    const activeCount = filteredDebts.filter((d) => d.Status !== 'Paid').length;
    const paidCount = filteredDebts.filter((d) => d.Status === 'Paid').length;

    return {
      totalPrincipal,
      totalPaid,
      totalRemaining,
      repaymentPct: totalPrincipal > 0 ? (totalPaid / totalPrincipal) * 100 : 0,
      overdueCount,
      activeCount,
      paidCount,
      totalCount: filteredDebts.length,
    };
  }, [filteredDebts, todayStr]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingDebt(null);
    setFormCreditorName('');
    setFormDebtType('Hutang Bank / Kredit Usaha');
    setFormRefNumber('');
    setFormStoreId(activeStoreId === 'ALL' ? (stores[0]?.Store_ID || 'STR-001') : activeStoreId);
    setFormCoaAccount(
      liabilityCoas[0]?.Account_Name
        ? `${liabilityCoas[0].Account_Code} - ${liabilityCoas[0].Account_Name}`
        : '2-103 - Hutang Bank / Pinjaman Usaha'
    );
    setFormTotalAmount('');
    setFormTenorMonths(12);
    setFormMonthlyInstallment('');
    setFormStartDate(todayStr);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setFormDueDate(nextYear.toISOString().split('T')[0]);
    setFormDescription('');
    setFormCreateDisbursementTrx(false);
    setFormDisbursementPaymentMethod('Bank Transfer');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (debt: DebtRecord) => {
    setEditingDebt(debt);
    setFormCreditorName(debt.Creditor_Name);
    setFormDebtType(debt.Debt_Type);
    setFormRefNumber(debt.Reference_Number || '');
    setFormStoreId(debt.Store_ID);
    setFormCoaAccount(debt.COA_Account);
    setFormTotalAmount(debt.Total_Amount);
    setFormTenorMonths(debt.Tenor_Months || 12);
    setFormMonthlyInstallment(debt.Monthly_Installment || '');
    setFormStartDate(debt.Start_Date);
    setFormDueDate(debt.Due_Date);
    setFormDescription(debt.Description || '');
    setFormCreateDisbursementTrx(false);
    setIsAddModalOpen(true);
  };

  // Save Debt
  const handleSubmitDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCreditorName.trim()) return;
    if (!formTotalAmount || Number(formTotalAmount) <= 0) return;

    const totalAmt = Number(formTotalAmount);
    const tenor = formTenorMonths ? Number(formTenorMonths) : undefined;
    const monthlyAmt = formMonthlyInstallment ? Number(formMonthlyInstallment) : undefined;

    if (editingDebt) {
      const paid = editingDebt.Paid_Amount;
      const remaining = Math.max(0, totalAmt - paid);
      let status: DebtStatus = 'Unpaid';
      if (remaining === 0) status = 'Paid';
      else if (paid > 0) status = 'Partial';
      if (remaining > 0 && formDueDate < todayStr) status = 'Overdue';

      const updated: DebtRecord = {
        ...editingDebt,
        Store_ID: formStoreId,
        Creditor_Name: formCreditorName,
        Debt_Type: formDebtType,
        Reference_Number: formRefNumber,
        COA_Account: formCoaAccount,
        Total_Amount: totalAmt,
        Paid_Amount: paid,
        Remaining_Balance: remaining,
        Tenor_Months: tenor,
        Monthly_Installment: monthlyAmt,
        Start_Date: formStartDate,
        Due_Date: formDueDate,
        Status: status,
        Description: formDescription,
      };

      await onSaveDebt(updated);
      setEditingDebt(null);
      setIsAddModalOpen(false);
    } else {
      const newId = `HTG-${formStartDate.replace(/-/g, '').slice(0, 6)}-${Date.now().toString().slice(-3)}`;
      const isPastDue = formDueDate < todayStr;
      const newDebt: DebtRecord = {
        Debt_ID: newId,
        Store_ID: formStoreId,
        Creditor_Name: formCreditorName,
        Debt_Type: formDebtType,
        Reference_Number: formRefNumber,
        COA_Account: formCoaAccount,
        Total_Amount: totalAmt,
        Paid_Amount: 0,
        Remaining_Balance: totalAmt,
        Tenor_Months: tenor,
        Monthly_Installment: monthlyAmt,
        Start_Date: formStartDate,
        Due_Date: formDueDate,
        Status: isPastDue ? 'Overdue' : 'Unpaid',
        Description: formDescription,
        Payments: [],
        Created_By: currentUser.Full_Name,
        Created_At: todayStr,
      };

      await onSaveDebt(newDebt);
      setIsAddModalOpen(false);
    }
  };

  // Open Record Installment Payment Modal
  const handleOpenPaymentModal = (debt: DebtRecord) => {
    setPaymentDebt(debt);
    const existingPayments = debt.Payments || [];
    const nextInstallmentNum = existingPayments.length + 1;
    setPayInstallmentNum(nextInstallmentNum);

    // Default amount: monthly installment or remaining balance, whichever is smaller
    const defaultAmt = debt.Monthly_Installment
      ? Math.min(debt.Monthly_Installment, debt.Remaining_Balance)
      : debt.Remaining_Balance;

    setPayPrincipalAmount(defaultAmt > 0 ? defaultAmt : debt.Remaining_Balance);
    setPayInterestAmount(0);
    setPayDate(todayStr);
    setPayMethod('Bank Transfer');
    // Default COA to the debt's assigned COA, or fallback to general loan account
    setPayCoaAccount(debt.COA_Account || '2-103 - Hutang Bank / Pinjaman Usaha');
    setPayProofUrl('');
    setPayNotes(`Cicilan #${nextInstallmentNum} - ${debt.Creditor_Name} (${debt.Reference_Number || debt.Debt_ID})`);
    setPayAutoCreateTrx(true);
  };

  // Submit Installment Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentDebt || !payPrincipalAmount || Number(payPrincipalAmount) <= 0) return;

    const principalAmt = Number(payPrincipalAmount);
    const interestAmt = payInterestAmount ? Number(payInterestAmount) : 0;
    const totalPaidAmt = principalAmt + interestAmt;

    const newPaidTotal = (paymentDebt.Paid_Amount || 0) + principalAmt;
    const newRemaining = Math.max(0, paymentDebt.Total_Amount - newPaidTotal);
    let newStatus: DebtStatus = 'Unpaid';
    if (newRemaining === 0) newStatus = 'Paid';
    else if (newPaidTotal > 0) newStatus = 'Partial';
    if (newRemaining > 0 && paymentDebt.Due_Date < todayStr) newStatus = 'Overdue';

    const periodStr = payDate.replace(/-/g, '').slice(0, 6);
    const paymentId = `PAY-HTG-${paymentDebt.Debt_ID.slice(-4)}-${String(payInstallmentNum).padStart(2, '0')}`;
    const generatedTrxId = `TRX-${periodStr}-CICILAN-${paymentId.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`;

    const newPayment: DebtInstallmentPayment = {
      Payment_ID: paymentId,
      Date: payDate,
      Installment_Number: payInstallmentNum,
      Amount: principalAmt,
      Interest_Amount: interestAmt,
      Total_Paid: totalPaidAmt,
      Payment_Method: payMethod,
      COA_Account: payCoaAccount || paymentDebt.COA_Account,
      Transaction_ID: payAutoCreateTrx ? generatedTrxId : undefined,
      Proof_Attachment_URL: payProofUrl.trim() || undefined,
      Notes: payNotes.trim(),
      Created_By: currentUser.Full_Name,
      Created_At: todayStr,
    };

    const updatedDebt: DebtRecord = {
      ...paymentDebt,
      Paid_Amount: newPaidTotal,
      Remaining_Balance: newRemaining,
      Status: newStatus,
      Payments: [...(paymentDebt.Payments || []), newPayment],
    };

    await onRecordDebtPayment(updatedDebt, newPayment, payAutoCreateTrx);
    setPaymentDebt(null);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Daftar Hutang
    const debtRows = filteredDebts.map((d, index) => {
      const store = stores.find((s) => s.Store_ID === d.Store_ID);
      return {
        No: index + 1,
        'ID Hutang': d.Debt_ID,
        'Cabang Toko': store ? `${store.Store_ID} - ${store.Store_Name}` : d.Store_ID,
        'Nama Kreditur': d.Creditor_Name,
        'Jenis Hutang': d.Debt_Type,
        'No. Kontrak / Ref': d.Reference_Number || '-',
        'Bagan Akun (COA)': d.COA_Account,
        'Total Plafon (Rp)': d.Total_Amount,
        'Sudah Dibayar (Rp)': d.Paid_Amount,
        'Sisa Saldo (Rp)': d.Remaining_Balance,
        'Tenor (Bulan)': d.Tenor_Months || '-',
        'Cicilan/Bulan (Rp)': d.Monthly_Installment || '-',
        'Tgl Mulai': d.Start_Date,
        'Jatuh Tempo': d.Due_Date,
        Status: d.Status,
        'Jumlah Cicilan': (d.Payments || []).length,
        Keterangan: d.Description || '',
      };
    });

    const wsDebts = XLSX.utils.json_to_sheet(debtRows);
    XLSX.utils.book_append_sheet(wb, wsDebts, 'Daftar Hutang');

    // Sheet 2: Rincian Cicilan
    const installmentRows: any[] = [];
    filteredDebts.forEach((d) => {
      (d.Payments || []).forEach((p) => {
        installmentRows.push({
          'ID Hutang': d.Debt_ID,
          Kreditur: d.Creditor_Name,
          'ID Pembayaran': p.Payment_ID,
          'Cicilan Ke': p.Installment_Number,
          'Tanggal Bayar': p.Date,
          'Pokok (Rp)': p.Amount,
          'Bunga (Rp)': p.Interest_Amount || 0,
          'Total Dibayar (Rp)': p.Total_Paid || p.Amount,
          'Metode Bayar': p.Payment_Method,
          'Bagan Akun (COA)': p.COA_Account,
          'ID Transaksi Keuangan': p.Transaction_ID || '-',
          Catatan: p.Notes || '',
        });
      });
    });

    if (installmentRows.length > 0) {
      const wsInstallments = XLSX.utils.json_to_sheet(installmentRows);
      XLSX.utils.book_append_sheet(wb, wsInstallments, 'Riwayat Pembayaran Cicilan');
    }

    const dateStr = todayStr.replace(/-/g, '');
    XLSX.writeFile(wb, `Laporan_Monitoring_Hutang_Cicilan_${dateStr}.xlsx`);
  };

  // Export to PDF
  const handleExportPdf = () => {
    const activeStoreName =
      filterStoreId === 'ALL'
        ? 'Semua Outlet (Konsolidasian)'
        : stores.find((s) => s.Store_ID === filterStoreId)?.Store_Name || filterStoreId;

    exportDebtsReportPdf({
      companyProfile,
      activeStoreName,
      debts: filteredDebts,
      totalPrincipal: summaryMetrics.totalPrincipal,
      totalPaid: summaryMetrics.totalPaid,
      totalRemaining: summaryMetrics.totalRemaining,
      printedBy: currentUser.Full_Name,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
            <Landmark className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                Monitoring Hutang & Cicilan
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                Buku Keuangan
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Pantau jadwal angsuran, sisa pokok, dan pembayaran cicilan yang terintegrasi langsung dengan Transaksi Keuangan.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
            title="Ekspor data hutang dan rincian cicilan ke file Excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
            title="Cetak Laporan PDF Monitoring Hutang resmi"
          >
            <FileText className="h-4 w-4" />
            <span>Laporan PDF</span>
          </button>

          {!isEmployee && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Hutang Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Plafon */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Plafon Pinjaman</span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-900">
            {formatRupiah(summaryMetrics.totalPrincipal)}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
            <span>{summaryMetrics.totalCount} fasilitas terdaftar</span>
            <span className="font-medium text-slate-700">{summaryMetrics.activeCount} aktif</span>
          </div>
        </div>

        {/* Card 2: Total Realisasi Pembayaran */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Cicilan Terbayar</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-emerald-600">
            {formatRupiah(summaryMetrics.totalPaid)}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-emerald-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, summaryMetrics.repaymentPct)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-700">
              {summaryMetrics.repaymentPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 3: Sisa Saldo Hutang */}
        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Sisa Saldo Pokok (Kewajiban)</span>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-rose-600">
            {formatRupiah(summaryMetrics.totalRemaining)}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
            <span>Perlu dilunasi</span>
            <span className="font-medium text-emerald-600">{summaryMetrics.paidCount} lunas</span>
          </div>
        </div>

        {/* Card 4: Jatuh Tempo */}
        <div className={`bg-white p-5 rounded-2xl border ${summaryMetrics.overdueCount > 0 ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Status Pembayaran</span>
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-900">
            {summaryMetrics.overdueCount > 0 ? (
              <span className="text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="h-5 w-5" />
                {summaryMetrics.overdueCount} Lewat Tempo
              </span>
            ) : (
              <span className="text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-5 w-5" />
                Semua Lancar
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Tercatat langsung di Laba Rugi & Arus Kas
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama kreditur, no. kontrak, akun COA, atau keterangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Cabang Toko */}
          <div className="w-full md:w-56">
            <select
              value={filterStoreId}
              onChange={(e) => {
                setFilterStoreId(e.target.value);
                if (onSelectStore) onSelectStore(e.target.value);
              }}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="ALL">Semua Cabang Toko</option>
              {stores.map((s) => (
                <option key={s.Store_ID} value={s.Store_ID}>
                  {s.Store_Name} ({s.Store_ID})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Jenis Hutang */}
          <div className="w-full md:w-56">
            <select
              value={filterDebtType}
              onChange={(e) => setFilterDebtType(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="ALL">Semua Jenis Hutang</option>
              {DEBT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div className="w-full md:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="Unpaid">Belum Dibayar</option>
              <option value="Partial">Cicilan Berjalan</option>
              <option value="Paid">Lunas</option>
              <option value="Overdue">Lewat Jatuh Tempo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main List / Table of Debts */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredDebts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-3">
              <Landmark className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Tidak ada data hutang</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              {searchQuery || filterDebtType !== 'ALL' || filterStatus !== 'ALL' || filterStoreId !== 'ALL'
                ? 'Tidak ada data hutang yang sesuai dengan kriteria filter saat ini.'
                : 'Belum ada fasilitas hutang atau pinjaman usaha yang tercatat. Klik tombol di bawah untuk menambahkan.'}
            </p>
            {!isEmployee && (
              <button
                onClick={handleOpenAddModal}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Hutang Baru</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDebts.map((debt) => {
              const store = stores.find((s) => s.Store_ID === debt.Store_ID);
              const payments = debt.Payments || [];
              const paymentCount = payments.length;
              const repaymentPct =
                debt.Total_Amount > 0 ? (debt.Paid_Amount / debt.Total_Amount) * 100 : 0;
              const isOverdue = debt.Status !== 'Paid' && debt.Due_Date < todayStr;

              return (
                <div key={debt.Debt_ID} className="p-5 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Creditor info, type, store, COA */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base md:text-lg text-slate-900">
                          {debt.Creditor_Name}
                        </span>

                        <span className="px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                          {debt.Debt_ID}
                        </span>

                        <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                          {debt.Debt_Type}
                        </span>

                        {store && (
                          <span className="px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-800 rounded-md border border-amber-200 flex items-center gap-1">
                            <StoreIcon className="h-3 w-3" />
                            {store.Store_Name}
                          </span>
                        )}

                        {/* Status Badge */}
                        {debt.Status === 'Paid' ? (
                          <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Lunas
                          </span>
                        ) : isOverdue ? (
                          <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-100 text-rose-800 rounded-full flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Jatuh Tempo ({debt.Due_Date})
                          </span>
                        ) : debt.Status === 'Partial' ? (
                          <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Cicilan Berjalan ({paymentCount}x)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-xs font-semibold bg-slate-200 text-slate-800 rounded-full">
                            Belum Dibayar
                          </span>
                        )}
                      </div>

                      {/* Meta row: COA, Ref Number, Dates */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <div className="flex items-center gap-1 text-indigo-700 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          <Tag className="h-3 w-3" />
                          <span>COA Hutang: {debt.COA_Account}</span>
                        </div>

                        {debt.Reference_Number && (
                          <div className="flex items-center gap-1">
                            <span>No. Ref/Kontrak:</span>
                            <span className="font-mono text-slate-700 font-semibold">{debt.Reference_Number}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Mulai: {formatDate(debt.Start_Date)}</span>
                          <span>•</span>
                          <span>Jatuh Tempo: {formatDate(debt.Due_Date)}</span>
                        </div>

                        {debt.Tenor_Months && (
                          <div className="flex items-center gap-1">
                            <span>Tenor: {debt.Tenor_Months} Bulan</span>
                            {debt.Monthly_Installment && (
                              <span>(~{formatRupiah(debt.Monthly_Installment)}/bln)</span>
                            )}
                          </div>
                        )}
                      </div>

                      {debt.Description && (
                        <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                          "{debt.Description}"
                        </p>
                      )}
                    </div>

                    {/* Right: Amounts, progress, and actions */}
                    <div className="flex flex-col lg:items-end justify-between gap-3 min-w-[260px]">
                      {/* Financial numbers */}
                      <div className="grid grid-cols-2 gap-3 text-right">
                        <div>
                          <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Plafon</div>
                          <div className="text-sm font-bold text-slate-900">{formatRupiah(debt.Total_Amount)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-400 uppercase font-semibold">Sisa Pokok</div>
                          <div className={`text-sm font-extrabold ${debt.Remaining_Balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatRupiah(debt.Remaining_Balance)}
                          </div>
                        </div>
                      </div>

                      {/* Repayment Progress bar */}
                      <div className="w-full">
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>Terbayar: {formatRupiah(debt.Paid_Amount)}</span>
                          <span className="font-semibold text-slate-700">{repaymentPct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${debt.Status === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(100, repaymentPct)}%` }}
                          />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        {debt.Status !== 'Paid' && !isEmployee && (
                          <button
                            onClick={() => handleOpenPaymentModal(debt)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>Bayar Cicilan</span>
                          </button>
                        )}

                        <button
                          onClick={() => setHistoryDebt(debt)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                          title="Lihat riwayat pembayaran cicilan & transaksi keuangan"
                        >
                          <History className="h-3.5 w-3.5" />
                          <span>Riwayat ({paymentCount})</span>
                        </button>

                        {!isEmployee && (
                          <button
                            onClick={() => handleOpenEditModal(debt)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit data hutang"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {!isEmployee && (
                          <button
                            onClick={() => setDeleteConfirmDebt(debt)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus data hutang"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: BAYAR CICILAN DENGAN PILIHAN BAGAN AKUN (COA)
          ========================================================================= */}
      {paymentDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Bayar Cicilan Hutang
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  Pembayaran akan otomatis diterbitkan ke Transaksi Keuangan dengan Bagan Akun yang dipilih
                </p>
              </div>
              <button
                onClick={() => setPaymentDebt(null)}
                className="p-1.5 text-amber-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              {/* Debt Summary Banner */}
              <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200/80 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-900 font-semibold">{paymentDebt.Creditor_Name}</span>
                  <span className="font-mono text-amber-800">{paymentDebt.Reference_Number || paymentDebt.Debt_ID}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-amber-800">
                  <span>Sisa Saldo Pokok Saat Ini:</span>
                  <span className="font-bold text-rose-600 text-sm">
                    {formatRupiah(paymentDebt.Remaining_Balance)}
                  </span>
                </div>
                {paymentDebt.Monthly_Installment && (
                  <div className="flex items-center justify-between text-[11px] text-amber-700">
                    <span>Estimasi Angsuran per Termin:</span>
                    <span>{formatRupiah(paymentDebt.Monthly_Installment)}</span>
                  </div>
                )}
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tanggal Bayar */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Pembayaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Cicilan Ke- */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Angsuran / Cicilan Ke- <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={payInstallmentNum}
                    onChange={(e) => setPayInstallmentNum(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                  />
                </div>

                {/* Nominal Pokok Cicilan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nominal Pokok Cicilan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={paymentDebt.Remaining_Balance}
                    required
                    placeholder="Contoh: 10000000"
                    value={payPrincipalAmount}
                    onChange={(e) => setPayPrincipalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-slate-900"
                  />
                  {payPrincipalAmount && typeof payPrincipalAmount === 'number' && (
                    <div className="text-[11px] text-emerald-600 font-medium mt-1">
                      {formatRupiah(payPrincipalAmount)}
                    </div>
                  )}
                </div>

                {/* Nominal Bunga Pinjaman (Opsional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bunga Pinjaman (Rp) <span className="text-slate-400">(Opsional)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Contoh: 650000"
                    value={payInterestAmount}
                    onChange={(e) => setPayInterestAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  {payInterestAmount && typeof payInterestAmount === 'number' && payInterestAmount > 0 ? (
                    <div className="text-[11px] text-amber-600 font-medium mt-1">
                      Bunga: {formatRupiah(payInterestAmount)}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Total Bayar Preview */}
              <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Total Pengeluaran Kas (Pokok + Bunga):</span>
                <span className="text-base font-extrabold text-amber-400">
                  {formatRupiah(
                    (typeof payPrincipalAmount === 'number' ? payPrincipalAmount : 0) +
                      (typeof payInterestAmount === 'number' ? payInterestAmount : 0)
                  )}
                </span>
              </div>

              {/* BAGAN AKUN (CHART OF ACCOUNTS) SELECTION */}
              <div className="space-y-1.5 p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <label className="block text-xs font-bold text-indigo-900">
                  Pilih Bagan Akun (COA) Pembayaran Hutang <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  Tentukan pos akun buku besar untuk pembayaran ini sesuai tujuan (misal: pelunasan Liabilitas/Hutang Pokok atau Beban Bunga Operasional).
                </p>

                <select
                  value={payCoaAccount}
                  onChange={(e) => setPayCoaAccount(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-xs md:text-sm bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-semibold text-slate-800"
                >
                  <optgroup label="-- Akun Kewajiban / Liabilitas (2-xxx) --">
                    {liabilityCoas.map((c) => (
                      <option key={c.Account_Code} value={`${c.Account_Code} - ${c.Account_Name}`}>
                        {c.Account_Code} - {c.Account_Name}
                      </option>
                    ))}
                    {/* Fallback default if not in custom list */}
                    <option value="2-103 - Hutang Bank / Pinjaman Usaha">
                      2-103 - Hutang Bank / Pinjaman Usaha
                    </option>
                    <option value="2-101 - Hutang Dagang Supplier">
                      2-101 - Hutang Dagang Supplier
                    </option>
                    <option value="2-102 - Hutang Gaji & Pajak">
                      2-102 - Hutang Gaji & Pajak
                    </option>
                  </optgroup>

                  <optgroup label="-- Akun Beban & Biaya Operasional (5-xxx) --">
                    {expenseCoas.map((c) => (
                      <option key={c.Account_Code} value={`${c.Account_Code} - ${c.Account_Name}`}>
                        {c.Account_Code} - {c.Account_Name}
                      </option>
                    ))}
                    <option value="5-104 - Beban Perlengkapan & Operasional Toko">
                      5-104 - Beban Perlengkapan & Operasional Toko
                    </option>
                    <option value="5-105 - Beban Bunga & Finansial Pinjaman">
                      5-105 - Beban Bunga & Finansial Pinjaman
                    </option>
                  </optgroup>

                  <optgroup label="-- Semua Bagan Akun Lainnya --">
                    {chartOfAccounts
                      .filter((c) => !c.Account_Code.startsWith('2-') && !c.Account_Code.startsWith('5-'))
                      .map((c) => (
                        <option key={c.Account_Code} value={`${c.Account_Code} - ${c.Account_Name}`}>
                          {c.Account_Code} - {c.Account_Name} ({c.Category})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Metode Pembayaran & Bukti */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Metode Pembayaran */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Metode Pembayaran (Sumber Kas) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bukti Bayar URL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lampiran Bukti Transfer / Resi <span className="text-slate-400">(Opsional)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={payProofUrl}
                    onChange={(e) => setPayProofUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Catatan Pembayaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan / Keterangan Pembayaran
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pembayaran cicilan termin ke-4 via transfer Bank BCA"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Auto Create Expense Checkbox */}
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="autoCreateTrx"
                  checked={payAutoCreateTrx}
                  onChange={(e) => setPayAutoCreateTrx(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <label htmlFor="autoCreateTrx" className="text-xs text-emerald-950 font-medium cursor-pointer">
                  <span className="font-bold">Otomatis catat transaksi pengeluaran keuangan</span>
                  <p className="text-[11px] text-emerald-700 mt-0.5 font-normal">
                    Menerbitkan bukti pengeluaran di menu Transaksi Keuangan dengan kategori COA: <strong className="font-semibold text-emerald-900">{payCoaAccount}</strong>.
                  </p>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentDebt(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Simpan Pembayaran Cicilan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: TAMBAH / EDIT FASILITAS HUTANG
          ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-amber-400" />
                  {editingDebt ? 'Edit Fasilitas Hutang' : 'Tambah Fasilitas Hutang Baru'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Catat fasilitas kredit, leasing, atau pinjaman modal yang dimiliki outlet/perusahaan
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDebt} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Kreditur */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Kreditur / Pemberi Pinjaman <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bank BCA, PT Takara Belmont, dsb."
                    value={formCreditorName}
                    onChange={(e) => setFormCreditorName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  />
                </div>

                {/* Cabang Toko */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cabang Toko Terkait <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formStoreId}
                    onChange={(e) => setFormStoreId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    {stores.map((s) => (
                      <option key={s.Store_ID} value={s.Store_ID}>
                        {s.Store_Name} ({s.Store_ID})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Jenis Hutang */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Hutang / Pinjaman <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formDebtType}
                    onChange={(e) => setFormDebtType(e.target.value as DebtType)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    {DEBT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* No. Kontrak / Referensi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Kontrak / Perjanjian Kredit / Ref
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: PK-BCA/2026/088"
                    value={formRefNumber}
                    onChange={(e) => setFormRefNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* PILIHAN BAGAN AKUN (COA) UNTUK HUTANG INI */}
              <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200">
                <label className="block text-xs font-bold text-indigo-900 mb-1">
                  Bagan Akun (COA) Kewajiban <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-indigo-700 mb-2">
                  Pilih pos akun Liabilitas / Kewajiban untuk klasifikasi neraca dan laporan keuangan.
                </p>
                <select
                  value={formCoaAccount}
                  onChange={(e) => setFormCoaAccount(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-medium text-slate-800"
                >
                  <optgroup label="-- Akun Kewajiban / Liabilitas (2-xxx) --">
                    {liabilityCoas.map((c) => (
                      <option key={c.Account_Code} value={`${c.Account_Code} - ${c.Account_Name}`}>
                        {c.Account_Code} - {c.Account_Name}
                      </option>
                    ))}
                    <option value="2-103 - Hutang Bank / Pinjaman Usaha">
                      2-103 - Hutang Bank / Pinjaman Usaha
                    </option>
                    <option value="2-101 - Hutang Dagang Supplier">
                      2-101 - Hutang Dagang Supplier
                    </option>
                    <option value="2-102 - Hutang Gaji & Pajak">
                      2-102 - Hutang Gaji & Pajak
                    </option>
                  </optgroup>
                  <optgroup label="-- Semua Akun Lainnya --">
                    {chartOfAccounts
                      .filter((c) => !c.Account_Code.startsWith('2-'))
                      .map((c) => (
                        <option key={c.Account_Code} value={`${c.Account_Code} - ${c.Account_Name}`}>
                          {c.Account_Code} - {c.Account_Name} ({c.Category})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Total Plafon, Tenor, Estimasi Cicilan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Plafon */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Plafon / Nilai Hutang (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="Contoh: 120000000"
                    value={formTotalAmount}
                    onChange={(e) => setFormTotalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold"
                  />
                  {formTotalAmount && typeof formTotalAmount === 'number' && (
                    <div className="text-[11px] text-emerald-600 font-medium mt-1">
                      {formatRupiah(formTotalAmount)}
                    </div>
                  )}
                </div>

                {/* Tenor Bulan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tenor (Bulan)
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Contoh: 12"
                    value={formTenorMonths}
                    onChange={(e) => setFormTenorMonths(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Estimasi Cicilan/Bln */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimasi Angsuran / Bln (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Contoh: 10000000"
                    value={formMonthlyInstallment}
                    onChange={(e) => setFormMonthlyInstallment(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                  />
                  {formMonthlyInstallment && typeof formMonthlyInstallment === 'number' && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      ~ {formatRupiah(formMonthlyInstallment)}
                    </div>
                  )}
                </div>
              </div>

              {/* Tanggal Mulai & Jatuh Tempo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Mulai / Akad Pinjaman <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Jatuh Tempo Akhir <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Keterangan / Tujuan Penggunaan Dana */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan & Tujuan Penggunaan Dana
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Fasilitas pinjaman modal kerja ekspansi outlet dan pengadaan kursi barbershop hidrolik."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-amber-400" />
                  <span>{editingDebt ? 'Simpan Perubahan' : 'Buat Fasilitas Hutang'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: RIWAYAT PEMBAYARAN CICILAN
          ========================================================================= */}
      {historyDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-amber-400" />
                  Riwayat Pembayaran Cicilan Hutang
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {historyDebt.Creditor_Name} — Ref: {historyDebt.Reference_Number || historyDebt.Debt_ID}
                </p>
              </div>
              <button
                onClick={() => setHistoryDebt(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Financial Quick Recap */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Plafon</span>
                  <div className="font-bold text-slate-800 text-sm md:text-base">
                    {formatRupiah(historyDebt.Total_Amount)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Terbayar</span>
                  <div className="font-bold text-emerald-600 text-sm md:text-base">
                    {formatRupiah(historyDebt.Paid_Amount)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Sisa Pokok</span>
                  <div className="font-bold text-rose-600 text-sm md:text-base">
                    {formatRupiah(historyDebt.Remaining_Balance)}
                  </div>
                </div>
              </div>

              {/* Installments Table */}
              {(!historyDebt.Payments || historyDebt.Payments.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-500">Belum ada catatan pembayaran cicilan untuk hutang ini.</p>
                  {!isEmployee && (
                    <button
                      onClick={() => {
                        const target = historyDebt;
                        setHistoryDebt(null);
                        handleOpenPaymentModal(target);
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>Catat Pembayaran Sekarang</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Cicilan</th>
                        <th className="px-3 py-2.5">Tanggal</th>
                        <th className="px-3 py-2.5 text-right">Pokok</th>
                        <th className="px-3 py-2.5 text-right">Bunga</th>
                        <th className="px-3 py-2.5 text-right">Total Bayar</th>
                        <th className="px-3 py-2.5">Metode Bayar</th>
                        <th className="px-3 py-2.5">Bagan Akun (COA)</th>
                        <th className="px-3 py-2.5">Transaksi Keuangan</th>
                        <th className="px-3 py-2.5">Keterangan</th>
                        {onDeleteDebtPayment && !isEmployee && <th className="px-3 py-2.5 text-center">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyDebt.Payments.map((p) => (
                        <tr key={p.Payment_ID} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                            #{p.Installment_Number}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                            {formatDate(p.Date)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {formatRupiah(p.Amount)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-600 whitespace-nowrap">
                            {p.Interest_Amount ? formatRupiah(p.Interest_Amount) : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                            {formatRupiah(p.Total_Paid || p.Amount)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                            {p.Payment_Method}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-indigo-700 font-medium">
                            <span className="px-2 py-0.5 bg-indigo-50 rounded border border-indigo-100 text-[11px]">
                              {p.COA_Account}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {p.Transaction_ID ? (
                              <button
                                onClick={() => {
                                  if (onNavigateToTransactions) {
                                    setHistoryDebt(null);
                                    onNavigateToTransactions(p.Transaction_ID!);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
                                title="Buka transaksi ini di menu Transaksi Keuangan"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>{p.Transaction_ID}</span>
                              </button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 max-w-[150px] truncate" title={p.Notes}>
                            {p.Notes || '-'}
                          </td>
                          {onDeleteDebtPayment && !isEmployee && (
                            <td className="px-3 py-2.5 text-center">
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Hapus catatan cicilan #${p.Installment_Number} (${formatRupiah(p.Total_Paid || p.Amount)})?`)) {
                                    await onDeleteDebtPayment(historyDebt, p.Payment_ID);
                                    setHistoryDebt(null);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="Hapus catatan pembayaran ini"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Close Button */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {historyDebt.Status !== 'Paid' && !isEmployee && (
                  <button
                    onClick={() => {
                      const target = historyDebt;
                      setHistoryDebt(null);
                      handleOpenPaymentModal(target);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Bayar Cicilan Baru</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setHistoryDebt(null)}
                  className="ml-auto px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: KONFIRMASI HAPUS HUTANG
          ========================================================================= */}
      {deleteConfirmDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-lg text-slate-900">Hapus Fasilitas Hutang?</h3>
              <p className="text-xs text-slate-500">
                Anda akan menghapus data hutang <strong className="font-bold text-slate-800">{deleteConfirmDebt.Creditor_Name}</strong> (
                {deleteConfirmDebt.Reference_Number || deleteConfirmDebt.Debt_ID}) dengan total nilai{' '}
                <strong className="text-rose-600">{formatRupiah(deleteConfirmDebt.Total_Amount)}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmDebt(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDeleteDebt(deleteConfirmDebt.Debt_ID);
                  setDeleteConfirmDebt(null);
                }}
                className="flex-1 px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
