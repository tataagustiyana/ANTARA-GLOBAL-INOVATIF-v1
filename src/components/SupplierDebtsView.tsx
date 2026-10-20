import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Edit2,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Info,
  Plus,
  Receipt,
  Search,
  Store as StoreIcon,
  Trash2,
  Truck,
  Wallet,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { StorageService } from '../services/storageService';
import { ChartOfAccount, Store, SupplierDebt, SupplierPayment, User } from '../types';
import { formatDate, formatRupiah, getTodayString } from '../utils/formatters';

interface SupplierDebtsViewProps {
  stores: Store[];
  activeStoreId: string;
  debts: SupplierDebt[];
  chartOfAccounts?: ChartOfAccount[];
  currentUser: User;
  onSaveDebt: (debt: SupplierDebt) => Promise<void>;
  onDeleteDebt: (debtId: string) => Promise<void>;
  onRecordDebtPayment?: (debt: SupplierDebt, payment: SupplierPayment, createExpense: boolean) => Promise<void>;
}

export const SupplierDebtsView: React.FC<SupplierDebtsViewProps> = ({
  stores,
  activeStoreId,
  debts,
  chartOfAccounts = [],
  currentUser,
  onSaveDebt,
  onDeleteDebt,
  onRecordDebtPayment,
}) => {
  const isEmployee = currentUser.Role === 'Employee';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStoreId, setFilterStoreId] = useState(activeStoreId);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'Unpaid' | 'Partial' | 'Paid' | 'Overdue'>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<SupplierDebt | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<SupplierDebt | null>(null);
  const [historyDebt, setHistoryDebt] = useState<SupplierDebt | null>(null);

  // Form: Add/Edit Debt
  const [formSupplierName, setFormSupplierName] = useState('');
  const [formInvoiceNumber, setFormInvoiceNumber] = useState('');
  const [formStoreId, setFormStoreId] = useState(
    activeStoreId === 'ALL' ? (stores[0]?.Store_ID || 'STR-001') : activeStoreId
  );
  const [formTotalAmount, setFormTotalAmount] = useState<number | ''>('');
  const [formInvoiceDate, setFormInvoiceDate] = useState(getTodayString());
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // Default tempo 14 hari
    return d.toISOString().split('T')[0];
  });
  const [formDescription, setFormDescription] = useState('');

  // Form: Payment
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payDate, setPayDate] = useState(getTodayString());
  const [payMethod, setPayMethod] = useState('BCA Transfer');
  const [payNotes, setPayNotes] = useState('');
  const [payCoaAccount, setPayCoaAccount] = useState('2-101 - Hutang Dagang Supplier');
  const [autoCreateExpense, setAutoCreateExpense] = useState(true);

  // Synchronize store filter
  React.useEffect(() => {
    setFilterStoreId(activeStoreId);
  }, [activeStoreId]);

  // Today for overdue calculation
  const todayStr = getTodayString();

  // Helper: check if debt is overdue
  const isOverdue = (debt: SupplierDebt) => {
    if (debt.Status === 'Paid' || debt.Remaining_Balance === 0) return false;
    return debt.Due_Date < todayStr;
  };

  // Helper: days remaining or overdue
  const getDueStatus = (dueDate: string, isPaid: boolean) => {
    if (isPaid) return { text: 'Lunas', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' };
    const today = new Date(todayStr).getTime();
    const due = new Date(dueDate).getTime();
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Terlambat ${Math.abs(diffDays)} hari`,
        color: 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900',
        isOverdue: true,
      };
    }
    if (diffDays === 0) {
      return {
        text: 'Jatuh Tempo Hari Ini!',
        color: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900',
        isUrgent: true,
      };
    }
    if (diffDays <= 3) {
      return {
        text: `Sisa ${diffDays} hari`,
        color: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900',
        isUrgent: true,
      };
    }
    return {
      text: `Sisa ${diffDays} hari`,
      color: 'text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-300',
    };
  };

  // Filtered Debts
  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      if (filterStoreId !== 'ALL' && d.Store_ID !== filterStoreId) {
        return false;
      }

      if (filterStatus === 'Overdue') {
        if (!isOverdue(d)) return false;
      } else if (filterStatus !== 'ALL' && d.Status !== filterStatus) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSupplier = d.Supplier_Name.toLowerCase().includes(q);
        const matchInvoice = d.Invoice_Number.toLowerCase().includes(q);
        const matchDesc = (d.Description || '').toLowerCase().includes(q);
        if (!matchSupplier && !matchInvoice && !matchDesc) return false;
      }

      return true;
    });
  }, [debts, filterStoreId, filterStatus, searchQuery, todayStr]);

  // Aggregate metrics
  const totalDebtAmount = useMemo(() => {
    return filteredDebts.reduce((sum, d) => sum + d.Total_Amount, 0);
  }, [filteredDebts]);

  const totalDebtPaid = useMemo(() => {
    return filteredDebts.reduce((sum, d) => sum + d.Paid_Amount, 0);
  }, [filteredDebts]);

  const totalOutstanding = useMemo(() => {
    return filteredDebts.reduce((sum, d) => sum + d.Remaining_Balance, 0);
  }, [filteredDebts]);

  const overdueList = useMemo(() => {
    return filteredDebts.filter((d) => isOverdue(d));
  }, [filteredDebts, todayStr]);

  const totalOverdueAmount = useMemo(() => {
    return overdueList.reduce((sum, d) => sum + d.Remaining_Balance, 0);
  }, [overdueList]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormSupplierName('PT Barbershop Grooming Supplies');
    setFormInvoiceNumber(`INV-${Date.now().toString().slice(-5)}`);
    setFormStoreId(activeStoreId === 'ALL' ? (stores[0]?.Store_ID || 'STR-001') : activeStoreId);
    setFormTotalAmount(2500000);
    setFormInvoiceDate(getTodayString());
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setFormDueDate(d.toISOString().split('T')[0]);
    setFormDescription('Restock Pomade, Pisau Cukur Feather, dan Shampoo Barbershop');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (debt: SupplierDebt) => {
    setEditingDebt(debt);
    setFormSupplierName(debt.Supplier_Name);
    setFormInvoiceNumber(debt.Invoice_Number);
    setFormStoreId(debt.Store_ID);
    setFormTotalAmount(debt.Total_Amount);
    setFormInvoiceDate(debt.Invoice_Date);
    setFormDueDate(debt.Due_Date);
    setFormDescription(debt.Description || '');
  };

  // Submit Add / Edit Debt
  const handleSubmitDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTotalAmount || Number(formTotalAmount) <= 0) return;

    const totalAmt = Number(formTotalAmount);

    if (editingDebt) {
      const paid = editingDebt.Paid_Amount;
      const remaining = Math.max(0, totalAmt - paid);
      let status: SupplierDebt['Status'] = 'Unpaid';
      if (remaining === 0) status = 'Paid';
      else if (paid > 0) status = 'Partial';
      if (remaining > 0 && formDueDate < todayStr) status = 'Overdue';

      const updated: SupplierDebt = {
        ...editingDebt,
        Supplier_Name: formSupplierName,
        Invoice_Number: formInvoiceNumber,
        Store_ID: formStoreId,
        Total_Amount: totalAmt,
        Remaining_Balance: remaining,
        Invoice_Date: formInvoiceDate,
        Due_Date: formDueDate,
        Description: formDescription,
        Status: status,
      };

      await onSaveDebt(updated);
      setEditingDebt(null);
    } else {
      const newId = `DEBT-${Date.now().toString().slice(-6)}`;
      const isPastDue = formDueDate < todayStr;
      const newDebt: SupplierDebt = {
        Debt_ID: newId,
        Supplier_Name: formSupplierName,
        Invoice_Number: formInvoiceNumber,
        Store_ID: formStoreId,
        Total_Amount: totalAmt,
        Paid_Amount: 0,
        Remaining_Balance: totalAmt,
        Invoice_Date: formInvoiceDate,
        Due_Date: formDueDate,
        Status: isPastDue ? 'Overdue' : 'Unpaid',
        Description: formDescription,
        Payments: [],
        Created_At: getTodayString(),
      };

      await onSaveDebt(newDebt);
      setIsAddModalOpen(false);
    }
  };

  // Open Payment Modal
  const handleOpenPayment = (debt: SupplierDebt) => {
    setPaymentDebt(debt);
    setPayAmount(debt.Remaining_Balance);
    setPayDate(getTodayString());
    setPayMethod('BCA Transfer');
    setPayCoaAccount(debt.COA_Account || '2-101 - Hutang Dagang Supplier');
    setPayNotes(`Pembayaran faktur ${debt.Invoice_Number}`);
    setAutoCreateExpense(true);
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentDebt || !payAmount || Number(payAmount) <= 0) return;

    const amt = Number(payAmount);
    const newPaid = paymentDebt.Paid_Amount + amt;
    const newRemaining = Math.max(0, paymentDebt.Total_Amount - newPaid);
    let newStatus: SupplierDebt['Status'] = 'Unpaid';
    if (newRemaining === 0) newStatus = 'Paid';
    else if (newPaid > 0) newStatus = 'Partial';
    if (newRemaining > 0 && paymentDebt.Due_Date < todayStr) newStatus = 'Overdue';

    const newPayment: SupplierPayment = {
      Payment_ID: `PAY-DEBT-${Date.now().toString().slice(-6)}`,
      Date: payDate,
      Amount: amt,
      Payment_Method: payMethod,
      COA_Account: payCoaAccount,
      Notes: payNotes,
    };

    const updated: SupplierDebt = {
      ...paymentDebt,
      Paid_Amount: newPaid,
      Remaining_Balance: newRemaining,
      Status: newStatus,
      Payments: [...(paymentDebt.Payments || []), newPayment],
    };

    if (onRecordDebtPayment) {
      await onRecordDebtPayment(updated, newPayment, autoCreateExpense);
    } else {
      await onSaveDebt(updated);
    }

    setPaymentDebt(null);
  };

  const handleExportExcel = () => {
    const headers = [
      'ID Hutang',
      'ID Toko',
      'Nama Supplier',
      'No Faktur / Invoice',
      'Tanggal Faktur',
      'Jatuh Tempo',
      'Total Hutang (Rp)',
      'Sudah Dibayar (Rp)',
      'Sisa Hutang (Rp)',
      'Status',
      'Keterangan',
    ];
    const rows = filteredDebts.map((d) => [
      d.Debt_ID,
      d.Store_ID,
      d.Supplier_Name,
      d.Invoice_Number,
      d.Invoice_Date,
      d.Due_Date,
      d.Total_Amount,
      d.Paid_Amount,
      d.Remaining_Balance,
      d.Status,
      d.Description || '-',
    ]);
    StorageService.exportToExcel(`Hutang_Supplier_${activeStoreId}`, headers, rows, 'Hutang Supplier');
  };

  return (
    <div className="space-y-6">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>Hutang ke Supplier (Accounts Payable)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manajemen tagihan supplier, tempo pembayaran produk pomade & perlengkapan barber, serta monitoring jatuh tempo
          </p>
        </div>

        {!isEmployee && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 shadow-2xs transition-colors cursor-pointer"
              title="Ekspor daftar hutang supplier ke format Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Catat Hutang Supplier Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Hutang Usaha
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatRupiah(totalDebtAmount)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Seluruh tagihan masuk</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Sudah Dibayar
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatRupiah(totalDebtPaid)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600">
            {totalDebtAmount > 0 ? `${Math.round((totalDebtPaid / totalDebtAmount) * 100)}% terlunasi` : '0%'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Sisa Hutang Berjalan
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {formatRupiah(totalOutstanding)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Kewajiban yang wajib dilunasi</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Jatuh Tempo (Overdue)
            </span>
            <div className="rounded-lg bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
            {formatRupiah(totalOverdueAmount)}
          </div>
          <div className="mt-1 text-[11px] text-rose-600 font-medium">
            {overdueList.length} faktur melewati batas tempo
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari supplier / no. faktur / deskripsi..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {!isEmployee && (
            <div className="flex items-center gap-1.5">
              <StoreIcon className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={filterStoreId}
                onChange={(e) => setFilterStoreId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="ALL">Semua Cabang Toko</option>
                {stores.map((s) => (
                  <option key={s.Store_ID} value={s.Store_ID}>
                    {s.Store_Name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">Semua Status</option>
              <option value="Unpaid">Belum Dibayar</option>
              <option value="Partial">Dibayar Sebagian</option>
              <option value="Paid">Lunas</option>
              <option value="Overdue">Lewat Jatuh Tempo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Supplier & No. Faktur</th>
                <th className="px-4 py-3">Cabang Outlet</th>
                <th className="px-4 py-3 text-right">Total Tagihan</th>
                <th className="px-4 py-3 text-right">Terbayar</th>
                <th className="px-4 py-3 text-right">Sisa Hutang</th>
                <th className="px-4 py-3">Jatuh Tempo</th>
                <th className="px-4 py-3">Deskripsi Barang</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Truck className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-slate-600 dark:text-slate-300">
                      Tidak ada data hutang supplier
                    </p>
                    <p className="text-[11px] mt-0.5">
                      Gunakan tombol "Catat Hutang Supplier Baru" untuk menambahkan tagihan tempo baru.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDebts.map((debt) => {
                  const store = stores.find((s) => s.Store_ID === debt.Store_ID);
                  const isPaid = debt.Remaining_Balance === 0;
                  const dueInfo = getDueStatus(debt.Due_Date, isPaid);
                  const progressPct = Math.min(
                    100,
                    Math.round((debt.Paid_Amount / debt.Total_Amount) * 100)
                  );

                  return (
                    <tr
                      key={debt.Debt_ID}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isOverdue(debt) ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {debt.Supplier_Name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-bold text-slate-600 dark:text-slate-300">
                            {debt.Invoice_Number}
                          </span>
                          <span>·</span>
                          <span>Tgl Faktur: {formatDate(debt.Invoice_Date)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <StoreIcon className="h-3 w-3 text-slate-400" />
                          <span>{store?.Store_Name || debt.Store_ID}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatRupiah(debt.Total_Amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(debt.Paid_Amount)}
                        </div>
                        <div className="w-20 ml-auto bg-slate-100 rounded-full h-1.5 mt-1 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatRupiah(debt.Remaining_Balance)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-slate-800 dark:text-slate-200">
                          {formatDate(debt.Due_Date)}
                        </div>
                        <span
                          className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold border ${dueInfo.color}`}
                        >
                          {dueInfo.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-slate-600 dark:text-slate-400">
                        {debt.Description || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {debt.Status === 'Paid' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Lunas</span>
                          </span>
                        ) : debt.Status === 'Partial' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            <Clock className="h-3 w-3" />
                            <span>Sebagian</span>
                          </span>
                        ) : isOverdue(debt) ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            <AlertCircle className="h-3 w-3" />
                            <span>Overdue</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Clock className="h-3 w-3" />
                            <span>Belum Bayar</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                        {debt.Remaining_Balance > 0 && !isEmployee && (
                          <button
                            onClick={() => handleOpenPayment(debt)}
                            title="Bayar / Cicil Tagihan"
                            className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setHistoryDebt(debt)}
                          title="Lihat Riwayat Pembayaran"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                        {!isEmployee && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(debt)}
                              title="Edit Tagihan"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Hapus data hutang supplier ${debt.Supplier_Name} (${debt.Invoice_Number})?`
                                  )
                                ) {
                                  onDeleteDebt(debt.Debt_ID);
                                }
                              }}
                              title="Hapus Tagihan"
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CATAT / EDIT HUTANG */}
      {(isAddModalOpen || editingDebt) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-600" />
                <span>{editingDebt ? 'Edit Tagihan Hutang Supplier' : 'Catat Hutang Supplier Baru'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingDebt(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDebt} className="mt-4 space-y-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Nama Supplier / Vendor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formSupplierName}
                  onChange={(e) => setFormSupplierName(e.target.value)}
                  placeholder="Misal: PT Barbershop Grooming Supplies"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Nomor Faktur / Ref Nota <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formInvoiceNumber}
                    onChange={(e) => setFormInvoiceNumber(e.target.value)}
                    placeholder="INV/2026/10/01"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Cabang Outlet Penerima <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formStoreId}
                    onChange={(e) => setFormStoreId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {stores.map((s) => (
                      <option key={s.Store_ID} value={s.Store_ID}>
                        {s.Store_Name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Total Nilai Tagihan Hutang (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="10000"
                  value={formTotalAmount}
                  onChange={(e) => setFormTotalAmount(Number(e.target.value))}
                  required
                  placeholder="Contoh: 3200000"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Tanggal Faktur
                  </label>
                  <input
                    type="date"
                    value={formInvoiceDate}
                    onChange={(e) => setFormInvoiceDate(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Tanggal Jatuh Tempo (Due Date) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Deskripsi / Rincian Pembelian Barang
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Misal: Restock Pomade 80 pcs, Shampoo Barbershop 5 Jerigen..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingDebt(null);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700 shadow-xs"
                >
                  {editingDebt ? 'Simpan Perubahan' : 'Catat Hutang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BAYAR TAGIHAN SUPPLIER */}
      {paymentDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <span>Bayar / Cicil Tagihan Supplier</span>
              </h3>
              <button
                onClick={() => setPaymentDebt(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="mt-4 space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplier:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {paymentDebt.Supplier_Name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Faktur:</span>
                  <span className="font-mono font-medium">{paymentDebt.Invoice_Number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Tagihan:</span>
                  <span className="font-mono">{formatRupiah(paymentDebt.Total_Amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sisa Hutang:</span>
                  <span className="font-mono font-bold text-amber-600">
                    {formatRupiah(paymentDebt.Remaining_Balance)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Nominal Pembayaran (Rp) <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="1000"
                    max={paymentDebt.Remaining_Balance}
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setPayAmount(paymentDebt.Remaining_Balance)}
                    className="absolute right-2 top-2 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
                  >
                    Bayar Lunas
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Tanggal Bayar <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Metode Pembayaran
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
                  >
                    <option value="BCA Transfer">BCA Transfer</option>
                    <option value="Mandiri Transfer">Mandiri Transfer</option>
                    <option value="Kas Tunai Toko">Kas Tunai Toko</option>
                    <option value="Giro Bank">Giro Bank</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Bagan Akun (COA) Pembayaran <span className="text-rose-500">*</span>
                </label>
                <select
                  value={payCoaAccount}
                  onChange={(e) => setPayCoaAccount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-indigo-200 bg-indigo-50/40 px-3 py-2 text-slate-900 dark:border-indigo-900 dark:bg-slate-800 dark:text-white font-medium"
                >
                  <option value="2-101 - Hutang Dagang Supplier">2-101 - Hutang Dagang Supplier (Liabilitas)</option>
                  <option value="5-104 - Perlengkapan & Operasional Toko">5-104 - Perlengkapan & Operasional Toko (Beban)</option>
                  <option value="5-101 - Beban Pokok Penjualan / Bahan Baku">5-101 - Beban Pokok Penjualan / Bahan Baku</option>
                  {chartOfAccounts
                    .filter((c) => c.Account_Code !== '2-101' && c.Account_Code !== '5-104' && c.Account_Code !== '5-101')
                    .map((c) => (
                      <option key={c.Account_Code} value={`${c.Account_Code} - ${c.Account_Name}`}>
                        {c.Account_Code} - {c.Account_Name} ({c.Category})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Catatan Pembayaran
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Misal: Pelunasan tempo faktur..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <label className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCreateExpense}
                  onChange={(e) => setAutoCreateExpense(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="text-[11px] text-emerald-900 dark:text-emerald-300 font-medium">
                  Otomatis catat transaksi Pengeluaran (Beban Pembelian Bahan Baku/Perlengkapan) di Buku Kas Toko
                </span>
              </label>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentDebt(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700 shadow-xs"
                >
                  Konfirmasi Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RIWAYAT PEMBAYARAN */}
      {historyDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-emerald-600" />
                  <span>Riwayat Bayar: {historyDebt.Supplier_Name}</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Faktur #{historyDebt.Invoice_Number}
                </span>
              </div>
              <button
                onClick={() => setHistoryDebt(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center">
                <div>
                  <div className="text-[10px] text-slate-400">Total Tagihan</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatRupiah(historyDebt.Total_Amount)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Terbayar</div>
                  <div className="font-mono font-bold text-emerald-600">
                    {formatRupiah(historyDebt.Paid_Amount)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Sisa Tagihan</div>
                  <div className="font-mono font-bold text-amber-600">
                    {formatRupiah(historyDebt.Remaining_Balance)}
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden dark:border-slate-800 max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 font-semibold text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Tanggal</th>
                      <th className="px-3 py-2 text-right">Nominal</th>
                      <th className="px-3 py-2">Metode</th>
                      <th className="px-3 py-2">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {!historyDebt.Payments || historyDebt.Payments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          Belum ada catatan pembayaran yang dilakukan
                        </td>
                      </tr>
                    ) : (
                      historyDebt.Payments.map((p) => (
                        <tr key={p.Payment_ID}>
                          <td className="px-3 py-2 font-mono">{formatDate(p.Date)}</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-600">
                            {formatRupiah(p.Amount)}
                          </td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                            {p.Payment_Method}
                          </td>
                          <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                            {p.Notes || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => setHistoryDebt(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
