import {
  Award,
  Calendar,
  Clock,
  Download,
  Edit2,
  FileSpreadsheet,
  Filter,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { StorageService } from '../services/storageService';
import { Employee, Store, User } from '../types';
import {
  calculateTenure,
  formatJoinDate,
  formatRupiah,
  formatTenure,
  getCurrentYearMonth,
  MONTH_NAMES_ID,
} from '../utils/formatters';

interface EmployeesViewProps {
  stores: Store[];
  activeStoreId: string;
  employees: Employee[];
  currentUser: User;
  onSaveEmployee: (employee: Employee) => Promise<void>;
  onDeleteEmployee: (employeeId: string) => Promise<void>;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  stores,
  activeStoreId,
  employees,
  currentUser,
  onSaveEmployee,
  onDeleteEmployee,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form state
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formStoreIds, setFormStoreIds] = useState<string[]>(
    activeStoreId === 'ALL' ? [stores[0]?.Store_ID || 'STR-001'] : [activeStoreId]
  );
  const [formPosition, setFormPosition] = useState('');
  const [formBaseSalary, setFormBaseSalary] = useState<number | ''>('');
  const [formAllowanceFixed, setFormAllowanceFixed] = useState<number | ''>('');
  const [formBankName, setFormBankName] = useState('BCA');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formJoinDate, setFormJoinDate] = useState<string>(getCurrentYearMonth());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Month and Year selector helpers
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => currentYear + 1 - i);
  }, [currentYear]);

  const [joinYear, joinMonth] = useMemo(() => {
    const parts = (formJoinDate || getCurrentYearMonth()).split('-').map(Number);
    return [parts[0] || currentYear, parts[1] || (new Date().getMonth() + 1)];
  }, [formJoinDate, currentYear]);

  const handleUpdateJoinDate = (m: number, y: number) => {
    setFormJoinDate(`${y}-${String(m).padStart(2, '0')}`);
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (activeStoreId !== 'ALL') {
        const isAssigned =
          emp.Store_ID === activeStoreId ||
          (emp.Store_IDs && emp.Store_IDs.includes(activeStoreId));
        if (!isAssigned) return false;
      }
      if (selectedStatus !== 'ALL' && emp.Status !== selectedStatus) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          emp.Full_Name.toLowerCase().includes(q) ||
          emp.Employee_ID.toLowerCase().includes(q) ||
          emp.Position.toLowerCase().includes(q) ||
          emp.Bank_Name.toLowerCase().includes(q) ||
          emp.Account_Number.includes(q) ||
          (emp.Join_Date && emp.Join_Date.includes(q)) ||
          formatJoinDate(emp.Join_Date).toLowerCase().includes(q) ||
          formatTenure(emp.Join_Date).toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [employees, activeStoreId, selectedStatus, searchTerm]);

  // Average tenure calculation
  const averageTenureMonths = useMemo(() => {
    const activeEmps = filteredEmployees.filter((e) => e.Status === 'Active' && e.Join_Date);
    if (activeEmps.length === 0) return 0;
    const totalMonths = activeEmps.reduce((sum, e) => {
      const { years, months } = calculateTenure(e.Join_Date);
      return sum + years * 12 + months;
    }, 0);
    return Math.round(totalMonths / activeEmps.length);
  }, [filteredEmployees]);

  const formattedAverageTenure = useMemo(() => {
    if (averageTenureMonths <= 0) return 'Baru';
    const y = Math.floor(averageTenureMonths / 12);
    const m = averageTenureMonths % 12;
    if (y > 0 && m > 0) return `${y} Tahun ${m} Bulan`;
    if (y > 0) return `${y} Tahun`;
    return `${m} Bulan`;
  }, [averageTenureMonths]);

  // Total salary commitment
  const totalBaseSalary = useMemo(() => {
    return filteredEmployees
      .filter((e) => e.Status === 'Active')
      .reduce((sum, e) => sum + e.Base_Salary, 0);
  }, [filteredEmployees]);

  const totalFixedAllowance = useMemo(() => {
    return filteredEmployees
      .filter((e) => e.Status === 'Active')
      .reduce((sum, e) => sum + e.Allowance_Fixed, 0);
  }, [filteredEmployees]);

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    const nextNum = employees.length + 1;
    setFormId(`EMP-${String(nextNum).padStart(3, '0')}`);
    setFormName('');
    setFormStoreIds(activeStoreId === 'ALL' ? [stores[0]?.Store_ID || 'STR-001'] : [activeStoreId]);
    setFormPosition('');
    setFormBaseSalary('');
    setFormAllowanceFixed('');
    setFormBankName('BCA');
    setFormAccountNumber('');
    setFormStatus('Active');
    setFormJoinDate(getCurrentYearMonth());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormId(emp.Employee_ID);
    setFormName(emp.Full_Name);
    setFormStoreIds(
      emp.Store_IDs && emp.Store_IDs.length > 0 ? emp.Store_IDs : [emp.Store_ID]
    );
    setFormPosition(emp.Position);
    setFormBaseSalary(emp.Base_Salary);
    setFormAllowanceFixed(emp.Allowance_Fixed);
    setFormBankName(emp.Bank_Name);
    setFormAccountNumber(emp.Account_Number);
    setFormStatus(emp.Status);
    setFormJoinDate(emp.Join_Date ? emp.Join_Date.slice(0, 7) : getCurrentYearMonth());
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formBaseSalary) {
      alert('Nama karyawan dan Gaji Pokok wajib diisi.');
      return;
    }
    if (formStoreIds.length === 0) {
      alert('Pilih minimal 1 cabang/outlet penempatan.');
      return;
    }

    setIsSubmitting(true);
    try {
      const empData: Employee = {
        Employee_ID: formId,
        Store_ID: formStoreIds[0] || 'STR-001',
        Store_IDs: formStoreIds,
        Full_Name: formName.trim(),
        Position: formPosition.trim() || 'Staff Toko',
        Base_Salary: Number(formBaseSalary),
        Allowance_Fixed: Number(formAllowanceFixed) || 0,
        Bank_Name: formBankName,
        Account_Number: formAccountNumber.trim(),
        Status: formStatus,
        Join_Date: formJoinDate || getCurrentYearMonth(),
      };

      await onSaveEmployee(empData);
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    const headers = [
      'ID Karyawan',
      'ID Toko',
      'Nama Lengkap',
      'Jabatan',
      'Mulai Bekerja',
      'Masa Kerja',
      'Gaji Pokok (Rp)',
      'Tunjangan Tetap (Rp)',
      'Nama Bank',
      'Nomor Rekening',
      'Status',
    ];
    const rows = filteredEmployees.map((e) => [
      e.Employee_ID,
      e.Store_ID,
      e.Full_Name,
      e.Position,
      formatJoinDate(e.Join_Date),
      formatTenure(e.Join_Date),
      e.Base_Salary,
      e.Allowance_Fixed,
      e.Bank_Name,
      e.Account_Number,
      e.Status,
    ]);
    StorageService.exportToExcel(`Master_Karyawan_${activeStoreId}`, headers, rows, 'Karyawan');
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Data Karyawan per Toko
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manajemen master karyawan, gaji pokok, tunjangan tetap, dan rekening pembayaran
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 shadow-2xs transition-colors cursor-pointer"
            title="Ekspor master data karyawan ke format Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>+ Tambah Karyawan</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">Total Karyawan</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {filteredEmployees.length}
          </div>
          <div className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {filteredEmployees.filter((e) => e.Status === 'Active').length} Aktif
            </span>
            <span>·</span>
            <span>{filteredEmployees.filter((e) => e.Status === 'Inactive').length} Non-Aktif</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Rata-rata Lama Bekerja
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formattedAverageTenure}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Dihitung dari tanggal mulai bekerja (Join Date)
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Total Gaji Pokok & Tunjangan
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatRupiah(totalBaseSalary + totalFixedAllowance)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Estimasi beban payroll dasar / bulan
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, NIP, jabatan, tanggal, masa kerja..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="ALL">Semua Status Karyawan</option>
            <option value="Active">Hanya Aktif</option>
            <option value="Inactive">Non-Aktif</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span>
            Total: <strong>{filteredEmployees.length}</strong> karyawan
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-emerald-600 hover:underline dark:text-emerald-400 font-medium"
            >
              Hapus Pencarian
            </button>
          )}
        </div>
      </div>

      {/* Employees Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">NIP / ID</th>
                <th className="px-5 py-3">Nama Lengkap & Jabatan</th>
                <th className="px-5 py-3">Penempatan Toko</th>
                <th className="px-5 py-3">Mulai Bekerja & Masa Kerja</th>
                <th className="px-5 py-3 text-right">Gaji Pokok</th>
                <th className="px-5 py-3 text-right">Tunjangan Tetap</th>
                <th className="px-5 py-3">Rekening Bank</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada karyawan yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const store = stores.find((s) => s.Store_ID === emp.Store_ID);
                  return (
                    <tr
                      key={emp.Employee_ID}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-slate-500">
                        {emp.Employee_ID}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {emp.Full_Name}
                        </div>
                        <div className="text-[10px] text-slate-400">{emp.Position}</div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {(() => {
                          const assigned = stores.filter(
                            (s) => s.Store_ID === emp.Store_ID || emp.Store_IDs?.includes(s.Store_ID)
                          );
                          if (assigned.length === 0) return <span>{emp.Store_ID}</span>;
                          return (
                            <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                              {assigned.map((s) => (
                                <span
                                  key={s.Store_ID}
                                  className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                >
                                  {s.Store_Name}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium">{formatJoinDate(emp.Join_Date)}</span>
                        </div>
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            <Clock className="h-3 w-3" />
                            <span>{formatTenure(emp.Join_Date)}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                        {formatRupiah(emp.Base_Salary)}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {formatRupiah(emp.Allowance_Fixed)}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {emp.Bank_Name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {emp.Account_Number || '-'}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            emp.Status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {emp.Status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                            title="Edit data karyawan"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Hapus data karyawan ${emp.Full_Name} (${emp.Employee_ID})?`
                                )
                              ) {
                                onDeleteEmployee(emp.Employee_ID);
                              }
                            }}
                            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                            title="Hapus data karyawan"
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

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {editingEmployee ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    ID / NIP Karyawan
                  </label>
                  <input
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Status Kepegawaian
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Active">Active (Aktif)</option>
                    <option value="Inactive">Inactive (Non-Aktif)</option>
                  </select>
                </div>
              </div>

              {/* Penempatan Outlet (Bisa lebih dari 1 outlet) */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Penempatan Cabang / Outlet (Bisa Lebih Dari 1)
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    {formStoreIds.length} outlet dipilih
                  </span>
                </div>
                <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                  {stores.map((s) => {
                    const isChecked = formStoreIds.includes(s.Store_ID);
                    return (
                      <label
                        key={s.Store_ID}
                        className="flex items-center gap-2 cursor-pointer select-none rounded p-1 hover:bg-white dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormStoreIds([...formStoreIds, s.Store_ID]);
                            } else {
                              if (formStoreIds.length <= 1) {
                                alert('Karyawan minimal harus ditempatkan di 1 outlet.');
                                return;
                              }
                              setFormStoreIds(formStoreIds.filter((id) => id !== s.Store_ID));
                            }
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {s.Store_Name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">({s.Store_ID})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Nama Lengkap Karyawan
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Misal: Ahmad Fauzi"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Jabatan / Posisi
                </label>
                <input
                  type="text"
                  value={formPosition}
                  onChange={(e) => setFormPosition(e.target.value)}
                  placeholder="Misal: Supervisor Toko, Kasir"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Bulan & Tahun Mulai Bekerja (Hanya Bulan dan Tahun) */}
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Mulai Bekerja (Bulan & Tahun Saja)
                  </label>
                  {formJoinDate && (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Terpilih: {formatJoinDate(formJoinDate)}
                    </span>
                  )}
                </div>
                <div className="mt-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Pilih Bulan</label>
                    <select
                      value={joinMonth}
                      onChange={(e) => handleUpdateJoinDate(Number(e.target.value), joinYear)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {MONTH_NAMES_ID.map((name, idx) => (
                        <option key={name} value={idx + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Pilih Tahun</label>
                    <select
                      value={joinYear}
                      onChange={(e) => handleUpdateJoinDate(joinMonth, Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:border-blue-900/60 dark:text-blue-300">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Lama Bekerja: {formatTenure(formJoinDate)}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Format: {formJoinDate}
                  </span>
                </div>
              </div>

              {/* Salary settings */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Gaji Pokok (Base Salary)
                  </label>
                  <input
                    type="number"
                    value={formBaseSalary}
                    onChange={(e) =>
                      setFormBaseSalary(e.target.value ? Number(e.target.value) : '')
                    }
                    placeholder="Contoh: 5500000"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Tunjangan Tetap
                  </label>
                  <input
                    type="number"
                    value={formAllowanceFixed}
                    onChange={(e) =>
                      setFormAllowanceFixed(e.target.value ? Number(e.target.value) : '')
                    }
                    placeholder="Contoh: 1000000"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Bank account details */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Nama Bank
                  </label>
                  <select
                    value={formBankName}
                    onChange={(e) => setFormBankName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="BCA">BCA</option>
                    <option value="Mandiri">Mandiri</option>
                    <option value="BRI">BRI</option>
                    <option value="BNI">BNI</option>
                    <option value="BSI">BSI (Syariah)</option>
                    <option value="CIMB Niaga">CIMB Niaga</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Nomor Rekening
                  </label>
                  <input
                    type="text"
                    value={formAccountNumber}
                    onChange={(e) => setFormAccountNumber(e.target.value)}
                    placeholder="Contoh: 8820192841"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

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
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Data Karyawan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
