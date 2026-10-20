import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Edit2,
  FileSpreadsheet,
  FileText,
  Filter,
  HandCoins,
  History,
  Info,
  Plus,
  Receipt,
  Search,
  Store as StoreIcon,
  Trash2,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { StorageService } from '../services/storageService';
import { Employee, EmployeeLoan, LoanRepayment, Store, User } from '../types';
import { formatDate, formatRupiah, getTodayString } from '../utils/formatters';

interface EmployeeLoansViewProps {
  stores: Store[];
  activeStoreId: string;
  employees: Employee[];
  loans: EmployeeLoan[];
  currentUser: User;
  onSaveLoan: (loan: EmployeeLoan) => Promise<void>;
  onDeleteLoan: (loanId: string) => Promise<void>;
}

export const EmployeeLoansView: React.FC<EmployeeLoansViewProps> = ({
  stores,
  activeStoreId,
  employees,
  loans,
  currentUser,
  onSaveLoan,
  onDeleteLoan,
}) => {
  const isEmployee = currentUser.Role === 'Employee';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStoreId, setFilterStoreId] = useState(activeStoreId);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'Active' | 'Paid_Off'>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<EmployeeLoan | null>(null);
  const [repaymentLoan, setRepaymentLoan] = useState<EmployeeLoan | null>(null);
  const [historyLoan, setHistoryLoan] = useState<EmployeeLoan | null>(null);

  // Form: Add/Edit Loan
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formTotalAmount, setFormTotalAmount] = useState<number | ''>('');
  const [formTenorMonths, setFormTenorMonths] = useState<number>(6);
  const [formStartDate, setFormStartDate] = useState(getTodayString());
  const [formPurpose, setFormPurpose] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Form: Repayment Modal
  const [repayAmount, setRepayAmount] = useState<number | ''>('');
  const [repayDate, setRepayDate] = useState(getTodayString());
  const [repayNotes, setRepayNotes] = useState('');

  // Synchronize store filter with prop
  React.useEffect(() => {
    setFilterStoreId(activeStoreId);
  }, [activeStoreId]);

  // Filtered Loans
  const filteredLoans = useMemo(() => {
    return loans.filter((l) => {
      // If employee role, show only loans matching current employee
      if (isEmployee) {
        const emp = employees.find(
          (e) => e.Full_Name.toLowerCase() === currentUser.Full_Name.toLowerCase()
        );
        if (!emp || l.Employee_ID !== emp.Employee_ID) return false;
      } else if (filterStoreId !== 'ALL' && l.Store_ID !== filterStoreId) {
        return false;
      }

      if (filterStatus !== 'ALL' && l.Status !== filterStatus) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = l.Employee_Name.toLowerCase().includes(q);
        const matchPurpose = l.Purpose.toLowerCase().includes(q);
        const matchId = l.Loan_ID.toLowerCase().includes(q);
        if (!matchName && !matchPurpose && !matchId) return false;
      }

      return true;
    });
  }, [loans, employees, isEmployee, currentUser, filterStoreId, filterStatus, searchQuery]);

  // Metric summaries
  const totalLoanPrincipal = useMemo(() => {
    return filteredLoans.reduce((sum, l) => sum + l.Total_Amount, 0);
  }, [filteredLoans]);

  const totalLoanRepaid = useMemo(() => {
    return filteredLoans.reduce((sum, l) => sum + l.Paid_Amount, 0);
  }, [filteredLoans]);

  const totalOutstanding = useMemo(() => {
    return filteredLoans.reduce((sum, l) => sum + l.Remaining_Balance, 0);
  }, [filteredLoans]);

  const activeLoanCount = useMemo(() => {
    return filteredLoans.filter((l) => l.Status === 'Active').length;
  }, [filteredLoans]);

  // Open Add Modal
  const handleOpenAdd = () => {
    const defaultEmp = employees[0];
    setFormEmployeeId(defaultEmp ? defaultEmp.Employee_ID : '');
    setFormTotalAmount(1500000);
    setFormTenorMonths(3);
    setFormStartDate(getTodayString());
    setFormPurpose('Pembelian Perlengkapan Cukur / Kebutuhan Barbershop');
    setFormNotes('Dipotong rutin tiap akhir bulan lewat payroll slip gaji.');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (loan: EmployeeLoan) => {
    setEditingLoan(loan);
    setFormEmployeeId(loan.Employee_ID);
    setFormTotalAmount(loan.Total_Amount);
    setFormTenorMonths(loan.Tenor_Months);
    setFormStartDate(loan.Start_Date);
    setFormPurpose(loan.Purpose);
    setFormNotes(loan.Notes || '');
  };

  // Submit Add / Edit Loan
  const handleSubmitLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTotalAmount || Number(formTotalAmount) <= 0) return;

    const emp = employees.find((e) => e.Employee_ID === formEmployeeId);
    if (!emp) return;

    const totalAmt = Number(formTotalAmount);
    const tenor = Number(formTenorMonths) || 1;
    const monthlyInstallment = Math.round(totalAmt / tenor);

    if (editingLoan) {
      // Edit existing loan
      const paid = editingLoan.Paid_Amount;
      const remaining = Math.max(0, totalAmt - paid);
      const updated: EmployeeLoan = {
        ...editingLoan,
        Employee_ID: emp.Employee_ID,
        Employee_Name: emp.Full_Name,
        Store_ID: emp.Store_ID,
        Total_Amount: totalAmt,
        Tenor_Months: tenor,
        Monthly_Installment: monthlyInstallment,
        Remaining_Balance: remaining,
        Status: remaining === 0 ? 'Paid_Off' : 'Active',
        Start_Date: formStartDate,
        Purpose: formPurpose,
        Notes: formNotes,
      };
      await onSaveLoan(updated);
      setEditingLoan(null);
    } else {
      // Create new loan
      const newId = `LOAN-${Date.now().toString().slice(-6)}`;
      const newLoan: EmployeeLoan = {
        Loan_ID: newId,
        Employee_ID: emp.Employee_ID,
        Employee_Name: emp.Full_Name,
        Store_ID: emp.Store_ID,
        Total_Amount: totalAmt,
        Tenor_Months: tenor,
        Monthly_Installment: monthlyInstallment,
        Paid_Amount: 0,
        Remaining_Balance: totalAmt,
        Start_Date: formStartDate,
        Purpose: formPurpose,
        Status: 'Active',
        Repayments: [],
        Notes: formNotes,
        Created_At: getTodayString(),
      };
      await onSaveLoan(newLoan);
      setIsAddModalOpen(false);
    }
  };

  // Open Repayment Modal
  const handleOpenRepayment = (loan: EmployeeLoan) => {
    setRepaymentLoan(loan);
    setRepayAmount(Math.min(loan.Monthly_Installment, loan.Remaining_Balance));
    setRepayDate(getTodayString());
    setRepayNotes(`Cicilan pinjaman tenor ${loan.Tenor_Months} bulan`);
  };

  // Submit Repayment
  const handleSubmitRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repaymentLoan || !repayAmount || Number(repayAmount) <= 0) return;

    const amount = Number(repayAmount);
    const newPaid = repaymentLoan.Paid_Amount + amount;
    const newRemaining = Math.max(0, repaymentLoan.Total_Amount - newPaid);
    const isNowPaidOff = newRemaining === 0;

    const newRepayment: LoanRepayment = {
      Repayment_ID: `REP-${Date.now().toString().slice(-6)}`,
      Date: repayDate,
      Amount: amount,
      Notes: repayNotes,
      Created_By: currentUser.Full_Name,
    };

    const updated: EmployeeLoan = {
      ...repaymentLoan,
      Paid_Amount: newPaid,
      Remaining_Balance: newRemaining,
      Status: isNowPaidOff ? 'Paid_Off' : 'Active',
      Repayments: [...(repaymentLoan.Repayments || []), newRepayment],
    };

    await onSaveLoan(updated);
    setRepaymentLoan(null);
  };

  const handleExportExcel = () => {
    const headers = [
      'ID Pinjaman',
      'ID Toko',
      'Nama Karyawan',
      'Jumlah Pinjaman (Rp)',
      'Tenor (Bulan)',
      'Cicilan per Bulan (Rp)',
      'Total Terbayar (Rp)',
      'Sisa Pinjaman (Rp)',
      'Status',
      'Keperluan',
      'Tanggal Pengajuan',
    ];
    const rows = filteredLoans.map((l) => {
      const emp = employees.find((e) => e.Employee_ID === l.Employee_ID);
      return [
        l.Loan_ID,
        l.Store_ID,
        emp?.Full_Name || '-',
        l.Total_Amount,
        l.Tenor_Months,
        l.Monthly_Installment,
        l.Paid_Amount,
        l.Remaining_Balance,
        l.Status,
        l.Purpose,
        l.Start_Date,
      ];
    });
    StorageService.exportToExcel(`Pinjaman_Karyawan_${activeStoreId}`, headers, rows, 'Pinjaman Karyawan');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>Pinjaman Berjangka Karyawan & Kasbon</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola fasilitas pinjaman berjangka, cicilan perlengkapan barber, dan monitoring sisa saldo pinjaman karyawan
          </p>
        </div>

        {!isEmployee && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 shadow-2xs transition-colors cursor-pointer"
              title="Ekspor daftar pinjaman karyawan ke format Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Ajukan Pinjaman Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Pinjaman Disalurkan
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatRupiah(totalLoanPrincipal)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Akumulasi seluruh pinjaman</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Cicilan Terkumpul
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatRupiah(totalLoanRepaid)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600">
            {totalLoanPrincipal > 0
              ? `${Math.round((totalLoanRepaid / totalLoanPrincipal) * 100)}% telah terbayar`
              : '0%'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Sisa Saldo Piutang (Outstanding)
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {formatRupiah(totalOutstanding)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Saldo berjalan yang belum lunas</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Peminjam Aktif
            </span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {activeLoanCount}{' '}
            <span className="text-xs font-normal text-slate-400">Karyawan</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Pinjaman sedang berjalan</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama karyawan / keperluan..."
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
              <option value="Active">Aktif (Berjalan)</option>
              <option value="Paid_Off">Lunas (Selesai)</option>
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
                <th className="px-4 py-3">No. Pinjaman & Karyawan</th>
                <th className="px-4 py-3">Cabang Toko</th>
                <th className="px-4 py-3 text-right">Pokok Pinjaman</th>
                <th className="px-4 py-3 text-center">Tenor & Cicilan</th>
                <th className="px-4 py-3 text-right">Terbayar</th>
                <th className="px-4 py-3 text-right">Sisa Hutang</th>
                <th className="px-4 py-3">Keperluan Pinjaman</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <HandCoins className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-slate-600 dark:text-slate-300">
                      Tidak ada data pinjaman karyawan
                    </p>
                    <p className="text-[11px] mt-0.5">
                      Gunakan tombol "Ajukan Pinjaman Baru" untuk mencatat pinjaman berjangka atau kasbon.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => {
                  const store = stores.find((s) => s.Store_ID === loan.Store_ID);
                  const progressPct = Math.min(
                    100,
                    Math.round((loan.Paid_Amount / loan.Total_Amount) * 100)
                  );

                  return (
                    <tr
                      key={loan.Loan_ID}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {loan.Employee_Name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{loan.Loan_ID}</span>
                          <span>·</span>
                          <span>Tgl: {formatDate(loan.Start_Date)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <StoreIcon className="h-3 w-3 text-slate-400" />
                          <span>{store?.Store_Name || loan.Store_ID}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatRupiah(loan.Total_Amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {formatRupiah(loan.Monthly_Installment)}
                          <span className="text-[10px] text-slate-400">/bln</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Tenor: {loan.Tenor_Months} Bulan
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(loan.Paid_Amount)}
                        </div>
                        <div className="w-20 ml-auto bg-slate-100 rounded-full h-1.5 mt-1 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatRupiah(loan.Remaining_Balance)}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="truncate text-slate-700 dark:text-slate-300 font-medium">
                          {loan.Purpose}
                        </div>
                        {loan.Notes && (
                          <div className="truncate text-[10px] text-slate-400 mt-0.5">
                            {loan.Notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {loan.Status === 'Paid_Off' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Lunas</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Clock className="h-3 w-3" />
                            <span>Aktif</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                        {loan.Status === 'Active' && !isEmployee && (
                          <button
                            onClick={() => handleOpenRepayment(loan)}
                            title="Catat Pembayaran Cicilan"
                            className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors"
                          >
                            <HandCoins className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setHistoryLoan(loan)}
                          title="Lihat Riwayat Cicilan"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                        {!isEmployee && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(loan)}
                              title="Edit Pinjaman"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Hapus pinjaman karyawan ${loan.Employee_Name} (${loan.Loan_ID})?`
                                  )
                                ) {
                                  onDeleteLoan(loan.Loan_ID);
                                }
                              }}
                              title="Hapus Pinjaman"
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

      {/* MODAL: AJUKAN / EDIT PINJAMAN */}
      {(isAddModalOpen || editingLoan) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <HandCoins className="h-4 w-4 text-emerald-600" />
                <span>
                  {editingLoan ? 'Edit Data Pinjaman Karyawan' : 'Form Pengajuan Pinjaman Karyawan'}
                </span>
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingLoan(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLoan} className="mt-4 space-y-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Pilih Karyawan Peminjam <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
                >
                  {employees.map((emp) => (
                    <option key={emp.Employee_ID} value={emp.Employee_ID}>
                      {emp.Full_Name} ({emp.Position} - {emp.Store_ID})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Jumlah Pokok Pinjaman (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="100000"
                    step="50000"
                    value={formTotalAmount}
                    onChange={(e) => setFormTotalAmount(Number(e.target.value))}
                    required
                    placeholder="Contoh: 3000000"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Jangka Waktu / Tenor (Bulan) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formTenorMonths}
                    onChange={(e) => setFormTenorMonths(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
                  >
                    <option value={1}>1 Bulan (Kasbon Cepat)</option>
                    <option value={2}>2 Bulan</option>
                    <option value={3}>3 Bulan</option>
                    <option value={4}>4 Bulan</option>
                    <option value={6}>6 Bulan (Rekomendasi Alat Barber)</option>
                    <option value={10}>10 Bulan</option>
                    <option value={12}>12 Bulan (1 Tahun)</option>
                  </select>
                </div>
              </div>

              {/* Automatic Calculation Preview */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/30 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block font-medium">
                    Estimasi Cicilan per Bulan:
                  </span>
                  <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">
                    {formTotalAmount && formTenorMonths
                      ? formatRupiah(Math.round(Number(formTotalAmount) / formTenorMonths))
                      : 'Rp 0'}
                  </span>
                </div>
                <div className="text-right text-[10px] text-emerald-600 dark:text-emerald-400">
                  Dapat dipotong langsung di Slip Gaji
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Tanggal Pencairan / Pengajuan
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Tujuan / Keperluan Pinjaman <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    placeholder="Contoh: Pembelian Mesin Cukur Cordless"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Catatan / Syarat Pemotongan
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Catatan persetujuan manajemen..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingLoan(null);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700 shadow-xs"
                >
                  {editingLoan ? 'Simpan Perubahan' : 'Setujui & Simpan Pinjaman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BAYAR CICILAN / REPAYMENT */}
      {repaymentLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Coins className="h-4 w-4 text-emerald-600" />
                <span>Catat Pembayaran Cicilan Pinjaman</span>
              </h3>
              <button
                onClick={() => setRepaymentLoan(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRepayment} className="mt-4 space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Karyawan:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {repaymentLoan.Employee_Name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Pokok:</span>
                  <span className="font-mono">{formatRupiah(repaymentLoan.Total_Amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sisa Hutang:</span>
                  <span className="font-mono font-bold text-amber-600">
                    {formatRupiah(repaymentLoan.Remaining_Balance)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Nominal Cicilan Dibayar (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1000"
                  max={repaymentLoan.Remaining_Balance}
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(Number(e.target.value))}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Tanggal Pembayaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={repayDate}
                  onChange={(e) => setRepayDate(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Catatan Pembayaran (Metode / No. Ref)
                </label>
                <input
                  type="text"
                  value={repayNotes}
                  onChange={(e) => setRepayNotes(e.target.value)}
                  placeholder="Misal: Potong payroll Oktober / Transfer kasir"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRepaymentLoan(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700 shadow-xs"
                >
                  Simpan Cicilan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RIWAYAT PEMBAYARAN CICILAN */}
      {historyLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-emerald-600" />
                  <span>Riwayat Cicilan: {historyLoan.Employee_Name}</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">{historyLoan.Loan_ID}</span>
              </div>
              <button
                onClick={() => setHistoryLoan(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center">
                <div>
                  <div className="text-[10px] text-slate-400">Total Pokok</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatRupiah(historyLoan.Total_Amount)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Terbayar</div>
                  <div className="font-mono font-bold text-emerald-600">
                    {formatRupiah(historyLoan.Paid_Amount)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Sisa Saldo</div>
                  <div className="font-mono font-bold text-amber-600">
                    {formatRupiah(historyLoan.Remaining_Balance)}
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden dark:border-slate-800 max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 font-semibold text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Tanggal</th>
                      <th className="px-3 py-2 text-right">Nominal</th>
                      <th className="px-3 py-2">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {!historyLoan.Repayments || historyLoan.Repayments.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-slate-400">
                          Belum ada catatan cicilan yang masuk
                        </td>
                      </tr>
                    ) : (
                      historyLoan.Repayments.map((rep) => (
                        <tr key={rep.Repayment_ID}>
                          <td className="px-3 py-2 font-mono">{formatDate(rep.Date)}</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-600">
                            {formatRupiah(rep.Amount)}
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                            {rep.Notes || '-'}
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
                onClick={() => setHistoryLoan(null)}
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
