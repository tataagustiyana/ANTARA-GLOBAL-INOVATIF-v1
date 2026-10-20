import confetti from 'canvas-confetti';
import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  Download,
  Edit2,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  HandCoins,
  Plus,
  Printer,
  Scissors,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { StorageService } from '../services/storageService';
import { CustomPayrollItem, Employee, EmployeeLoan, PayrollRun, PayrollStatus, Store, User, CompanyProfile } from '../types';
import { formatDate, formatPeriod, formatRupiah, formatTenure, getTodayString } from '../utils/formatters';
import { exportPayrollListPdf } from '../utils/pdfGenerator';

interface PayrollViewProps {
  stores: Store[];
  activeStoreId: string;
  employees: Employee[];
  payrollRuns: PayrollRun[];
  currentUser: User;
  companyProfile?: CompanyProfile;
  onSavePayrollRun: (run: PayrollRun) => Promise<void>;
  onDeletePayrollRun?: (payrollId: string) => Promise<void>;
  onApprovePayroll: (run: PayrollRun, createExpense: boolean) => Promise<void>;
  onOpenPayslipModal: (payroll: PayrollRun) => void;
  employeeLoans?: EmployeeLoan[];
  onSaveLoan?: (loan: EmployeeLoan) => Promise<void>;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  stores,
  activeStoreId,
  employees,
  payrollRuns,
  currentUser,
  companyProfile,
  onSavePayrollRun,
  onDeletePayrollRun,
  onApprovePayroll,
  onOpenPayslipModal,
  employeeLoans = [],
  onSaveLoan,
}) => {
  const isEmployee = currentUser.Role === 'Employee';

  // Filters
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'Draft' | 'Approved' | 'Paid'>(
    'ALL'
  );

  // Laporan List Payroll Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // Edit / Input Components Modal
  const [editingRun, setEditingRun] = useState<PayrollRun | null>(null);
  const [editCustomItems, setEditCustomItems] = useState<CustomPayrollItem[]>([]);
  const [editNotes, setEditNotes] = useState<string>('');

  // Add Manual Payroll Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addEmployeeId, setAddEmployeeId] = useState('');
  const [addStoreId, setAddStoreId] = useState(
    activeStoreId === 'ALL' ? (stores[0]?.Store_ID || 'STR-001') : activeStoreId
  );
  const [addMonth, setAddMonth] = useState(selectedMonth);
  const [addYear, setAddYear] = useState(selectedYear);
  const [addBaseSalary, setAddBaseSalary] = useState<number>(0);
  const [addFixedAllowance, setAddFixedAllowance] = useState<number>(0);
  const [addOvertime, setAddOvertime] = useState<number>(0);
  const [addBonus, setAddBonus] = useState<number>(0);
  const [addMeal, setAddMeal] = useState<number>(0);
  const [addBpjs, setAddBpjs] = useState<number>(0);
  const [addKasbon, setAddKasbon] = useState<number>(0);
  const [addLatePenalty, setAddLatePenalty] = useState<number>(0);
  const [addTax, setAddTax] = useState<number>(0);
  const [addCustomItems, setAddCustomItems] = useState<CustomPayrollItem[]>([]);
  const [addNotes, setAddNotes] = useState('');
  const [addStatus, setAddStatus] = useState<PayrollStatus>('Draft');

  // Confirmation Disburse Modal
  const [disburseRun, setDisburseRun] = useState<PayrollRun | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Active loan for selected employee in Add Modal (Akun 5-101)
  const activeLoanForAddEmp = useMemo(() => {
    if (!addEmployeeId) return null;
    return employeeLoans.find(
      (l) => l.Employee_ID === addEmployeeId && l.Status === 'Active' && l.Remaining_Balance > 0
    );
  }, [addEmployeeId, employeeLoans]);

  // Filtered Payroll Runs
  const filteredRuns = useMemo(() => {
    return payrollRuns.filter((p) => {
      // If employee role, only show their own payroll
      if (isEmployee) {
        const emp = employees.find(
          (e) => e.Full_Name.toLowerCase() === currentUser.Full_Name.toLowerCase()
        );
        if (!emp || p.Employee_ID !== emp.Employee_ID) return false;
      } else if (activeStoreId !== 'ALL') {
        if (p.Store_ID !== activeStoreId) return false;
      }

      if (p.Period_Month !== selectedMonth || p.Period_Year !== selectedYear) {
        return false;
      }

      if (selectedStatus !== 'ALL' && p.Payment_Status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [
    payrollRuns,
    employees,
    activeStoreId,
    selectedMonth,
    selectedYear,
    selectedStatus,
    isEmployee,
    currentUser,
  ]);

  // Aggregate metrics
  const totalPayrollCost = useMemo(() => {
    return filteredRuns.reduce((sum, p) => sum + p.Net_Salary, 0);
  }, [filteredRuns]);

  const totalBaseSalary = useMemo(() => {
    return filteredRuns.reduce((sum, p) => sum + (p.Base_Salary || 0), 0);
  }, [filteredRuns]);

  const totalAllowances = useMemo(() => {
    return filteredRuns.reduce((sum, p) => sum + (p.Total_Allowances || 0), 0);
  }, [filteredRuns]);

  const totalDeductions = useMemo(() => {
    return filteredRuns.reduce((sum, p) => sum + (p.Total_Deductions || 0), 0);
  }, [filteredRuns]);

  const paidCount = useMemo(() => {
    return filteredRuns.filter((p) => p.Payment_Status === 'Paid').length;
  }, [filteredRuns]);

  // Enriched runs with employee details
  const enrichedRuns = useMemo(() => {
    return filteredRuns.map((run) => {
      const emp = employees.find((e) => e.Employee_ID === run.Employee_ID);
      return {
        ...run,
        employeeName: emp?.Full_Name || run.Employee_ID,
        employeePosition: emp?.Position || '-',
        employeeBank: emp?.Bank_Name || '-',
        employeeAccount: emp?.Account_Number || '-',
      };
    });
  }, [filteredRuns, employees]);

  // Export Payroll List PDF Handler
  const handleExportPayrollPdf = () => {
    const activeStoreName =
      activeStoreId === 'ALL'
        ? 'Konsolidasi Seluruh Cabang'
        : stores.find((s) => s.Store_ID === activeStoreId)?.Store_Name || activeStoreId;

    exportPayrollListPdf({
      companyProfile,
      periodMonth: selectedMonth,
      periodYear: selectedYear,
      activeStoreName,
      runs: enrichedRuns,
      totalBaseSalary,
      totalAllowances,
      totalDeductions,
      totalNetSalary: totalPayrollCost,
      printedBy: currentUser.Full_Name,
    });
  };

  // Open Add Manual Payroll Modal
  const handleOpenAddModal = () => {
    const defaultEmp = employees.find((e) => e.Status === 'Active') || employees[0];
    if (defaultEmp) {
      setAddEmployeeId(defaultEmp.Employee_ID);
      setAddStoreId(defaultEmp.Store_ID || (activeStoreId === 'ALL' ? (stores[0]?.Store_ID || 'STR-001') : activeStoreId));
      setAddBaseSalary(defaultEmp.Base_Salary || 0);
      setAddFixedAllowance(defaultEmp.Allowance_Fixed || 0);
      setAddBpjs(Math.round((defaultEmp.Base_Salary || 0) * 0.03));

      // Koneksikan Kasbon / Pinjaman Karyawan pada akun 5-101
      const activeLoan = employeeLoans.find(
        (l) => l.Employee_ID === defaultEmp.Employee_ID && l.Status === 'Active' && l.Remaining_Balance > 0
      );
      if (activeLoan) {
        setAddKasbon(Math.min(activeLoan.Monthly_Installment, activeLoan.Remaining_Balance));
      } else {
        setAddKasbon(0);
      }
    } else {
      setAddEmployeeId('');
      setAddStoreId(activeStoreId === 'ALL' ? (stores[0]?.Store_ID || 'STR-001') : activeStoreId);
      setAddBaseSalary(0);
      setAddFixedAllowance(0);
      setAddBpjs(0);
      setAddKasbon(0);
    }
    setAddOvertime(0);
    setAddBonus(0);
    setAddMeal(0);
    setAddLatePenalty(0);
    setAddTax(0);
    setAddMonth(selectedMonth);
    setAddYear(selectedYear);
    setAddCustomItems([]);
    setAddNotes('');
    setAddStatus('Draft');
    setIsAddModalOpen(true);
  };

  const handleSelectEmployeeForAdd = (empId: string) => {
    setAddEmployeeId(empId);
    const emp = employees.find((e) => e.Employee_ID === empId);
    if (emp) {
      setAddStoreId(emp.Store_ID || addStoreId);
      setAddBaseSalary(emp.Base_Salary || 0);
      setAddFixedAllowance(emp.Allowance_Fixed || 0);
      setAddBpjs(Math.round((emp.Base_Salary || 0) * 0.03));

      // Koneksikan Kasbon / Pinjaman Karyawan pada akun 5-101
      const activeLoan = employeeLoans.find(
        (l) => l.Employee_ID === empId && l.Status === 'Active' && l.Remaining_Balance > 0
      );
      if (activeLoan) {
        setAddKasbon(Math.min(activeLoan.Monthly_Installment, activeLoan.Remaining_Balance));
      } else {
        setAddKasbon(0);
      }
    }
  };

  const handleSaveNewPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmployeeId) {
      alert('Pilih karyawan terlebih dahulu.');
      return;
    }

    const customEarningsTotal = addCustomItems
      .filter((i) => i.type === 'earning')
      .reduce((s, i) => s + i.amount, 0);

    const customDeductionsTotal = addCustomItems
      .filter((i) => i.type === 'deduction')
      .reduce((s, i) => s + i.amount, 0);

    const totalAllowances =
      Number(addFixedAllowance || 0) +
      Number(addOvertime || 0) +
      Number(addBonus || 0) +
      Number(addMeal || 0) +
      customEarningsTotal;

    const totalDeductions =
      Number(addBpjs || 0) +
      Number(addKasbon || 0) +
      Number(addLatePenalty || 0) +
      Number(addTax || 0) +
      customDeductionsTotal;

    const netSalary = Math.max(0, Number(addBaseSalary || 0) + totalAllowances - totalDeductions);

    const newId = `PAY-${addYear}${String(addMonth).padStart(2, '0')}-${addEmployeeId.replace(/[^a-zA-Z0-9]/g, '').slice(-3)}`;

    const newRun: PayrollRun = {
      Payroll_ID: newId,
      Period_Month: Number(addMonth),
      Period_Year: Number(addYear),
      Store_ID: addStoreId,
      Employee_ID: addEmployeeId,
      Base_Salary: Number(addBaseSalary || 0),
      Total_Allowances: totalAllowances,
      Total_Deductions: totalDeductions,
      Net_Salary: netSalary,
      Payment_Status: addStatus,
      Payment_Date: addStatus === 'Paid' ? getTodayString() : '',
      Payslip_URL: '',
      Allowances_Breakdown: {
        fixed: Number(addFixedAllowance || 0),
        overtime: Number(addOvertime || 0),
        bonus: Number(addBonus || 0),
        meal: Number(addMeal || 0),
      },
      Deductions_Breakdown: {
        bpjs: Number(addBpjs || 0),
        kasbon: Number(addKasbon || 0),
        latePenalty: Number(addLatePenalty || 0),
        tax: Number(addTax || 0),
      },
      Custom_Items: addCustomItems,
      Notes: addNotes,
    };

    if (addStatus === 'Paid') {
      await onApprovePayroll(newRun, true);
    } else {
      await onSavePayrollRun(newRun);
    }

    setIsAddModalOpen(false);
    confetti({ particleCount: 60, spread: 70 });
  };

  // Generate Monthly Payroll Runs for All Employees of Store
  const handleGeneratePayroll = async () => {
    const targetEmployees = employees.filter((e) => {
      if (e.Status !== 'Active') return false;
      if (activeStoreId !== 'ALL' && e.Store_ID !== activeStoreId) return false;
      return true;
    });

    if (targetEmployees.length === 0) {
      alert('Tidak ada karyawan aktif pada toko yang dipilih.');
      return;
    }

    let createdCount = 0;
    for (const emp of targetEmployees) {
      // Check if run already exists
      const exists = payrollRuns.some(
        (p) =>
          p.Employee_ID === emp.Employee_ID &&
          p.Period_Month === selectedMonth &&
          p.Period_Year === selectedYear
      );

      if (!exists) {
        const newRunId = `PAY-${selectedYear}${String(selectedMonth).padStart(2, '0')}-${emp.Employee_ID.slice(-3)}`;
        const bpjsEst = Math.round(emp.Base_Salary * 0.03); // standard approx 3% BPJS

        // Koneksikan Kasbon / Pinjaman Karyawan pada akun 5-101
        const activeLoan = employeeLoans.find(
          (l) => l.Employee_ID === emp.Employee_ID && l.Status === 'Active' && l.Remaining_Balance > 0
        );
        const kasbonDeduction = activeLoan
          ? Math.min(activeLoan.Monthly_Installment, activeLoan.Remaining_Balance)
          : 0;

        const totalDeductions = bpjsEst + kasbonDeduction;
        const netSal = Math.max(0, emp.Base_Salary + emp.Allowance_Fixed - totalDeductions);

        const newRun: PayrollRun = {
          Payroll_ID: newRunId,
          Period_Month: selectedMonth,
          Period_Year: selectedYear,
          Store_ID: emp.Store_ID,
          Employee_ID: emp.Employee_ID,
          Base_Salary: emp.Base_Salary,
          Total_Allowances: emp.Allowance_Fixed,
          Total_Deductions: totalDeductions,
          Net_Salary: netSal,
          Payment_Status: 'Draft',
          Payment_Date: '',
          Payslip_URL: '',
          Allowances_Breakdown: {
            fixed: emp.Allowance_Fixed,
            overtime: 0,
            bonus: 0,
            meal: 0,
          },
          Deductions_Breakdown: {
            bpjs: bpjsEst,
            kasbon: kasbonDeduction,
            latePenalty: 0,
            tax: 0,
          },
          Notes:
            kasbonDeduction > 0
              ? `Terhubung Kasbon Akun 5-101 (Ref: ${activeLoan?.Loan_ID || '-'}, Cicilan: ${formatRupiah(kasbonDeduction)})`
              : '',
        };

        await onSavePayrollRun(newRun);
        createdCount++;
      }
    }

    if (createdCount > 0) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      alert(`Berhasil membuat ${createdCount} draft slip gaji untuk periode ${formatPeriod(selectedMonth, selectedYear)}!`);
    } else {
      alert('Semua karyawan pada toko ini sudah memiliki data penggajian untuk periode tersebut.');
    }
  };

  // Open Edit Components Modal
  const handleOpenEdit = (run: PayrollRun) => {
    setEditingRun(run);
    setEditNotes(run.Notes || '');

    if (run.Custom_Items && run.Custom_Items.length > 0) {
      setEditCustomItems(run.Custom_Items.map((i) => ({ ...i })));
    } else {
      const items: CustomPayrollItem[] = [];
      const ab = run.Allowances_Breakdown || { fixed: run.Total_Allowances, overtime: 0, bonus: 0, meal: 0 };
      const db = run.Deductions_Breakdown || { bpjs: run.Total_Deductions, kasbon: 0, latePenalty: 0, tax: 0 };

      if (ab.overtime && ab.overtime > 0) {
        items.push({ id: 'init-ot', name: 'Upah Lembur (Overtime)', amount: ab.overtime, type: 'earning', category: 'allowance' });
      }
      if (ab.bonus && ab.bonus > 0) {
        items.push({ id: 'init-bonus', name: 'Komisi / Bonus Performa Barbershop', amount: ab.bonus, type: 'earning', category: 'commission' });
      }
      if (ab.meal && ab.meal > 0) {
        items.push({ id: 'init-meal', name: 'Uang Makan & Transport Harian', amount: ab.meal, type: 'earning', category: 'allowance' });
      }
      if (db.bpjs && db.bpjs > 0) {
        items.push({ id: 'init-bpjs', name: 'BPJS Ketenagakerjaan & Kesehatan', amount: db.bpjs, type: 'deduction', category: 'other' });
      }
      if (db.kasbon && db.kasbon > 0) {
        items.push({ id: 'init-kasbon', name: 'Cicilan Kasbon / Pinjaman Alat', amount: db.kasbon, type: 'deduction', category: 'loan_payment' });
      }
      if (db.latePenalty && db.latePenalty > 0) {
        items.push({ id: 'init-late', name: 'Potongan Keterlambatan', amount: db.latePenalty, type: 'deduction', category: 'penalty' });
      }

      if (items.length === 0) {
        items.push({
          id: `item-${Date.now()}-1`,
          name: 'Komisi Potong Rambut',
          amount: 0,
          type: 'earning',
          category: 'commission',
        });
      }

      setEditCustomItems(items);
    }
  };

  // Add Item to Slip Gaji
  const handleAddSlipItem = (
    type: 'earning' | 'deduction',
    presetName?: string,
    presetAmount?: number,
    category?: CustomPayrollItem['category'],
    quantity?: number,
    rate_per_unit?: number,
    unit_name?: string
  ) => {
    const finalAmount =
      quantity !== undefined && rate_per_unit !== undefined
        ? quantity * rate_per_unit
        : presetAmount || 0;

    setEditCustomItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: presetName || (type === 'earning' ? 'Komisi Sales / Jasa Baru' : 'Potongan Baru'),
        amount: finalAmount,
        type,
        category: category || (type === 'earning' ? 'commission' : 'penalty'),
        quantity,
        rate_per_unit,
        unit_name: unit_name || (type === 'earning' ? 'Pcs' : undefined),
      },
    ]);
  };

  // Update Item in Slip Gaji
  const handleUpdateSlipItem = (
    id: string,
    updates: Partial<CustomPayrollItem>
  ) => {
    setEditCustomItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };

        // Recalculate amount automatically if quantity or rate_per_unit changed and amount is not explicitly passed
        if (updates.quantity !== undefined || updates.rate_per_unit !== undefined) {
          if (updates.amount === undefined) {
            const q = updates.quantity !== undefined ? updates.quantity : item.quantity;
            const r = updates.rate_per_unit !== undefined ? updates.rate_per_unit : item.rate_per_unit;
            if (q !== undefined && r !== undefined) {
              updated.amount = Math.max(0, Math.round(q * r));
            }
          }
        }
        return updated;
      })
    );
  };

  // Remove Item from Slip Gaji
  const handleRemoveSlipItem = (id: string) => {
    setEditCustomItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Save Edit Components
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRun) return;

    const fixed = editingRun.Allowances_Breakdown?.fixed ?? editingRun.Total_Allowances;
    const customEarnings = editCustomItems
      .filter((i) => i.type === 'earning')
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    const customDeductions = editCustomItems
      .filter((i) => i.type === 'deduction')
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    const totalAllowances = fixed + customEarnings;
    const totalDeductions = customDeductions;
    const netSalary = editingRun.Base_Salary + totalAllowances - totalDeductions;

    const updated: PayrollRun = {
      ...editingRun,
      Total_Allowances: totalAllowances,
      Total_Deductions: totalDeductions,
      Net_Salary: netSalary,
      Custom_Items: editCustomItems,
      Allowances_Breakdown: {
        fixed,
        overtime: editCustomItems
          .filter((i) => i.name.toLowerCase().includes('lembur'))
          .reduce((s, i) => s + i.amount, 0),
        bonus: customEarnings,
        meal: 0,
      },
      Deductions_Breakdown: {
        bpjs: editCustomItems
          .filter((i) => i.name.toLowerCase().includes('bpjs'))
          .reduce((s, i) => s + i.amount, 0),
        kasbon: editCustomItems
          .filter(
            (i) =>
              i.category === 'loan_payment' ||
              i.name.toLowerCase().includes('kasbon') ||
              i.name.toLowerCase().includes('pinjaman')
          )
          .reduce((s, i) => s + i.amount, 0),
        latePenalty: editCustomItems
          .filter(
            (i) =>
              i.category === 'penalty' ||
              i.name.toLowerCase().includes('lambat') ||
              i.name.toLowerCase().includes('denda')
          )
          .reduce((s, i) => s + i.amount, 0),
        tax: 0,
      },
      Notes: editNotes,
    };

    await onSavePayrollRun(updated);
    setEditingRun(null);
  };

  // Execute Disburse / Approve Payroll
  const handleConfirmDisburse = async () => {
    if (!disburseRun) return;
    setIsProcessing(true);
    try {
      const updatedRun: PayrollRun = {
        ...disburseRun,
        Payment_Status: 'Paid',
        Payment_Date: getTodayString(),
      };

      // Trigger approval and automatic Expense Transaction recording in Transactions table!
      await onApprovePayroll(updatedRun, true);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setDisburseRun(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch Disburse All Drafts
  const handleBatchDisburse = async () => {
    const drafts = filteredRuns.filter((p) => p.Payment_Status !== 'Paid');
    if (drafts.length === 0) {
      alert('Semua gaji karyawan pada filter ini sudah berstatus Paid (Terbayar).');
      return;
    }

    if (
      !confirm(
        `Bayar sekaligus ${drafts.length} karyawan dengan total ${formatRupiah(
          drafts.reduce((s, d) => s + d.Net_Salary, 0)
        )}? Sistem akan otomatis mencatat pengeluaran di Keuangan.`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    try {
      for (const run of drafts) {
        const updated: PayrollRun = {
          ...run,
          Payment_Status: 'Paid',
          Payment_Date: getTodayString(),
        };
        await onApprovePayroll(updated, true);
      }
      confetti({ particleCount: 120, spread: 80 });
      alert(`Berhasil membayar ${drafts.length} gaji karyawan dan mencatat biaya pengeluaran di sistem Keuangan!`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportExcel = () => {
    const headers = [
      'ID Payroll',
      'Bulan Periode',
      'Tahun Periode',
      'ID Toko',
      'ID Karyawan',
      'Nama Karyawan',
      'Gaji Pokok (Rp)',
      'Total Tunjangan (Rp)',
      'Total Potongan (Rp)',
      'Gaji Bersih / Take Home Pay (Rp)',
      'Status Pembayaran',
      'Tanggal Pembayaran',
    ];
    const rows = filteredRuns.map((p) => {
      const emp = employees.find((e) => e.Employee_ID === p.Employee_ID);
      return [
        p.Payroll_ID,
        p.Period_Month,
        p.Period_Year,
        p.Store_ID,
        p.Employee_ID,
        emp?.Full_Name || '-',
        p.Base_Salary,
        p.Total_Allowances,
        p.Total_Deductions,
        p.Net_Salary,
        p.Payment_Status,
        p.Payment_Date,
      ];
    });

    StorageService.exportToExcel(
      `Laporan_Payroll_${selectedYear}_${selectedMonth}`,
      headers,
      rows,
      'Payroll'
    );
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isEmployee ? 'Slip Gaji Saya' : 'Manajemen Penggajian (Payroll)'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Proses gaji bulanan, rincian tunjangan/potongan kasbon, dan integrasi otomatis ke beban usaha
          </p>
        </div>

        {!isEmployee && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>+ Tambah Payroll</span>
            </button>
            <button
              onClick={handleExportPayrollPdf}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 shadow-xs transition-colors cursor-pointer"
              title="Cetak & Unduh Laporan Rekapitulasi Payroll Bulanan (PDF)"
            >
              <Printer className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Cetak Rekap PDF</span>
            </button>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 shadow-xs transition-colors cursor-pointer"
              title="Buka Pratinjau Lengkap Laporan Daftar Payroll Bulanan"
            >
              <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Laporan Payroll</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 shadow-2xs transition-colors cursor-pointer"
              title="Ekspor laporan payroll ke format Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
            <button
              onClick={handleGeneratePayroll}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 shadow-xs transition-colors"
            >
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>Generate Otomatis</span>
            </button>
            {filteredRuns.some((p) => p.Payment_Status !== 'Paid') && (
              <button
                onClick={handleBatchDisburse}
                disabled={isProcessing}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
              >
                <CreditCard className="h-4 w-4" />
                <span>Bayar Semua Draft</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter Bar & Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
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

        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Status Pembayaran
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="Draft">Draft</option>
            <option value="Approved">Approved</option>
            <option value="Paid">Paid (Terbayar)</option>
          </select>
        </div>

        <div className="flex flex-col justify-center px-2">
          <span className="text-[11px] text-slate-400">Total Beban Payroll Periode Ini:</span>
          <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatRupiah(totalPayrollCost)}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
            {paidCount} dari {filteredRuns.length} telah dibayarkan
          </span>
        </div>
      </div>

      {/* Integration Info Banner */}
      {!isEmployee && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 dark:bg-emerald-950/30 dark:border-emerald-900/50 flex items-start gap-3">
          <FileCheck2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-300">
            <strong>Otomatisasi Integrasi Keuangan:</strong> Saat status payroll diubah menjadi{' '}
            <em>Paid (Terbayar)</em>, sistem secara otomatis mencatat transaksi Pengeluaran (Beban
            Gaji Akun 5-101) di modul Transaksi & Google Sheets untuk toko bersangkutan.
          </div>
        </div>
      )}

      {/* Payroll Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Karyawan & NIP</th>
                <th className="px-5 py-3">Toko & Rekening</th>
                <th className="px-5 py-3 text-right">Gaji Pokok</th>
                <th className="px-5 py-3 text-right">Total Tunjangan</th>
                <th className="px-5 py-3 text-right">Potongan</th>
                <th className="px-5 py-3 text-right">Gaji Bersih (Net)</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Belum ada data penggajian pada periode {formatPeriod(selectedMonth, selectedYear)}.
                    {!isEmployee && (
                      <div className="mt-2">
                        <button
                          onClick={handleGeneratePayroll}
                          className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          Klik di sini untuk Generate Draft Payroll Otomatis &rarr;
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => {
                  const emp = employees.find((e) => e.Employee_ID === run.Employee_ID);
                  const store = stores.find((s) => s.Store_ID === run.Store_ID);

                  return (
                    <tr
                      key={run.Payroll_ID}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {emp?.Full_Name || run.Employee_ID}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {emp?.Position || 'Staff'} · NIP: {run.Employee_ID}
                        </div>
                        {emp?.Join_Date && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                            Masa Kerja: {formatTenure(emp.Join_Date)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="text-slate-800 dark:text-slate-200">
                          {store?.Store_Name || run.Store_ID}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {emp?.Bank_Name} - {emp?.Account_Number}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {formatRupiah(run.Base_Salary)}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        <div>+{formatRupiah(run.Total_Allowances)}</div>
                        {Boolean(
                          run.Custom_Items?.some((i) => i.type === 'earning' && i.quantity && i.rate_per_unit)
                        ) && (
                          <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-sans mt-0.5">
                            {
                              run.Custom_Items!.filter(
                                (i) => i.type === 'earning' && i.quantity && i.rate_per_unit
                              ).length
                            }{' '}
                            komisi sales
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap font-mono tabular-nums text-rose-600 dark:text-rose-400">
                        -{formatRupiah(run.Total_Deductions)}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap font-mono tabular-nums font-bold text-slate-900 dark:text-white text-sm">
                        {formatRupiah(run.Net_Salary)}
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            run.Payment_Status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : run.Payment_Status === 'Approved'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          }`}
                        >
                          {run.Payment_Status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Slip Gaji Preview & Print */}
                          <button
                            onClick={() => onOpenPayslipModal(run)}
                            className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition-colors"
                            title="Lihat / Cetak Slip Gaji"
                          >
                            <FileText className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Slip Gaji</span>
                          </button>

                          {/* Edit Details (Only for Managers / Finance) */}
                          {!isEmployee && run.Payment_Status !== 'Paid' && (
                            <button
                              onClick={() => handleOpenEdit(run)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                              title="Edit Tunjangan / Potongan"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Disburse / Pay button */}
                          {!isEmployee && run.Payment_Status !== 'Paid' && (
                            <button
                              onClick={() => setDisburseRun(run)}
                              className="flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-colors"
                              title="Setujui & Bayar Gaji"
                            >
                              <CheckCircle className="h-3 w-3" />
                              <span>Bayar</span>
                            </button>
                          )}

                          {/* Delete Payroll Run */}
                          {!isEmployee && onDeletePayrollRun && (
                            <button
                              onClick={async () => {
                                const empName = emp?.Full_Name || run.Employee_ID;
                                const periodStr = formatPeriod(run.Period_Month, run.Period_Year);
                                if (
                                  confirm(
                                    `Apakah Anda yakin ingin menghapus data penggajian untuk ${empName} (${run.Payroll_ID}) pada periode ${periodStr}?`
                                  )
                                ) {
                                  await onDeletePayrollRun(run.Payroll_ID);
                                }
                              }}
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
                              title="Hapus Data Penggajian"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
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

      {/* Modal: Edit Tunjangan & Potongan */}
      {editingRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Rincian Gaji & Potongan
                </h3>
                {(() => {
                  const emp = employees.find((e) => e.Employee_ID === editingRun.Employee_ID);
                  return (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {emp?.Full_Name || editingRun.Employee_ID}
                      </span>
                      <span>·</span>
                      <span>{emp?.Position || 'Staff'}</span>
                      {emp?.Join_Date && (
                        <>
                          <span>·</span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            Masa Kerja: {formatTenure(emp.Join_Date)}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
              <button
                onClick={() => setEditingRun(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Header Gaji Pokok & Tunjangan Tetap */}
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex justify-between">
                <div>
                  <span className="text-slate-500 block">Gaji Pokok:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                    {formatRupiah(editingRun.Base_Salary)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tunjangan Tetap:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                    {formatRupiah(
                      editingRun.Allowances_Breakdown?.fixed ?? editingRun.Total_Allowances
                    )}
                  </span>
                </div>
              </div>

              {/* SECTION A: KOMISI & PENERIMAAN TAMBAHAN (BARBERSHOP COMMISSIONS) */}
              <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Scissors className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Komisi & Penerimaan Tambahan</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddSlipItem('earning')}
                    className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Tambah Baris</span>
                  </button>
                </div>

                {/* Preset Cepat Barbershop */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-medium">Preset Komisi:</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddSlipItem(
                        'earning',
                        'Komisi Sales Pomade & Wax',
                        350000,
                        'commission',
                        35,
                        10000,
                        'Pcs'
                      )
                    }
                    className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-300 font-medium transition-colors"
                  >
                    + Sales Pomade (35 Pcs @ 10rb)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddSlipItem(
                        'earning',
                        'Komisi Potong Rambut (Haircut)',
                        1000000,
                        'commission',
                        50,
                        20000,
                        'Kepala'
                      )
                    }
                    className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-300 font-medium transition-colors"
                  >
                    + Cukur Rambut (50 Kepala @ 20rb)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddSlipItem(
                        'earning',
                        'Komisi Sales Hair Tonic & Shampoo',
                        250000,
                        'commission',
                        20,
                        12500,
                        'Botol'
                      )
                    }
                    className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-300 font-medium transition-colors"
                  >
                    + Sales Tonic (20 Botol @ 12.5rb)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddSlipItem(
                        'earning',
                        'Komisi Treatment & Hair Spa',
                        350000,
                        'commission',
                        10,
                        35000,
                        'Treatment'
                      )
                    }
                    className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-300 font-medium transition-colors"
                  >
                    + Treatment (10 Sesi @ 35rb)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddSlipItem(
                        'earning',
                        'Tips Pelanggan / Service Charge',
                        150000,
                        'bonus'
                      )
                    }
                    className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-300 font-medium transition-colors"
                  >
                    + Tips Flat
                  </button>
                </div>

                {/* List of Custom Earnings */}
                <div className="space-y-2 mt-2">
                  {editCustomItems.filter((i) => i.type === 'earning').length === 0 ? (
                    <div className="py-3 text-center text-slate-400 text-[11px] italic">
                      Belum ada komisi/tunjangan tambahan. Klik tombol di atas untuk menambahkan.
                    </div>
                  ) : (
                    editCustomItems
                      .filter((i) => i.type === 'earning')
                      .map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-850 space-y-2"
                        >
                          {/* Row 1: Nama Komisi & Total Nilai */}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                handleUpdateSlipItem(item.id, { name: e.target.value })
                              }
                              placeholder="Nama komisi sales / jasa..."
                              className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                            <div className="relative w-36">
                              <span className="absolute left-2.5 top-1.5 text-slate-400 text-[10px]">
                                Rp
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={item.amount}
                                onChange={(e) =>
                                  handleUpdateSlipItem(item.id, {
                                    amount: Math.max(0, Number(e.target.value)),
                                  })
                                }
                                title="Total Komisi (dihitung otomatis atau dapat diisi manual)"
                                className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-2 py-1.5 font-mono text-right text-xs font-bold text-emerald-700 dark:text-emerald-400 dark:border-slate-700 dark:bg-slate-800 focus:border-emerald-500 focus:outline-hidden"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSlipItem(item.id)}
                              className="rounded p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Hapus Komponen"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Row 2: Rincian Unit Sales & Harga Komisi Satuan */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-750 text-[11px]">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 dark:text-slate-400">Unit / Qty:</span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={item.quantity ?? ''}
                                placeholder="1"
                                onChange={(e) =>
                                  handleUpdateSlipItem(item.id, {
                                    quantity:
                                      e.target.value === ''
                                        ? undefined
                                        : Math.max(0, Number(e.target.value)),
                                  })
                                }
                                className="w-16 rounded border border-slate-300 bg-white px-2 py-1 font-mono text-center text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 dark:text-slate-400">Satuan:</span>
                              <select
                                value={item.unit_name || 'Pcs'}
                                onChange={(e) =>
                                  handleUpdateSlipItem(item.id, { unit_name: e.target.value })
                                }
                                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              >
                                <option value="Pcs">Pcs (Produk)</option>
                                <option value="Botol">Botol (Tonic/Shampoo)</option>
                                <option value="Kepala">Kepala (Cukur/Potong)</option>
                                <option value="Treatment">Treatment (Spa/Coloring)</option>
                                <option value="Paket">Paket (Shaving/Grooming)</option>
                                <option value="Unit">Unit</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 dark:text-slate-400">
                                Harga Komisi / Unit:
                              </span>
                              <div className="relative w-28">
                                <span className="absolute left-2 top-1 text-slate-400 text-[10px]">
                                  Rp
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="500"
                                  value={item.rate_per_unit ?? ''}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleUpdateSlipItem(item.id, {
                                      rate_per_unit:
                                        e.target.value === ''
                                          ? undefined
                                          : Math.max(0, Number(e.target.value)),
                                    })
                                  }
                                  className="w-full rounded border border-slate-300 bg-white pl-7 pr-2 py-1 font-mono text-right text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                              </div>
                            </div>

                            {item.quantity !== undefined && item.rate_per_unit !== undefined && (
                              <span className="ml-auto inline-flex items-center rounded bg-emerald-100/70 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                                = {item.quantity} {item.unit_name || 'Unit'} × {formatRupiah(item.rate_per_unit)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* SECTION B: POTONGAN DINAMIS (KASBON, BPJS, DENDA) */}
              <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Wallet className="h-3.5 w-3.5 text-rose-500" />
                    <span>Potongan Gaji & Cicilan Kasbon</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddSlipItem('deduction')}
                    className="flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Tambah Potongan</span>
                  </button>
                </div>

                {/* Preset Cepat Potongan */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400">Preset Cepat:</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddSlipItem('deduction', 'BPJS Ketenagakerjaan & Kes', 180000, 'other')
                    }
                    className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-rose-50 hover:text-rose-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    + BPJS
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddSlipItem('deduction', 'Cicilan Pinjaman / Kasbon Alat Barber', 500000, 'loan_payment')
                    }
                    className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-rose-50 hover:text-rose-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    + Cicilan Kasbon / Pinjaman
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddSlipItem('deduction', 'Potongan Keterlambatan', 50000, 'penalty')
                    }
                    className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-rose-50 hover:text-rose-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    + Denda Terlambat
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddSlipItem('deduction', 'Ganti Rugi Kerusakan Peralatan', 100000, 'penalty')
                    }
                    className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-rose-50 hover:text-rose-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    + Kerusakan Alat
                  </button>
                </div>

                {/* List of Custom Deductions */}
                <div className="space-y-2 mt-2">
                  {editCustomItems.filter((i) => i.type === 'deduction').length === 0 ? (
                    <div className="py-3 text-center text-slate-400 text-[11px] italic">
                      Tidak ada potongan gaji pada slip ini.
                    </div>
                  ) : (
                    editCustomItems
                      .filter((i) => i.type === 'deduction')
                      .map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              handleUpdateSlipItem(item.id, { name: e.target.value })
                            }
                            placeholder="Nama potongan..."
                            className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                          <div className="relative w-36">
                            <span className="absolute left-2.5 top-1.5 text-slate-400 text-[10px]">
                              -Rp
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="5000"
                              value={item.amount}
                              onChange={(e) =>
                                handleUpdateSlipItem(item.id, {
                                  amount: Math.max(0, Number(e.target.value)),
                                })
                              }
                              className="w-full rounded-lg border border-rose-300 bg-white pl-8 pr-2 py-1.5 font-mono text-right text-xs text-rose-600 dark:border-rose-900 dark:bg-slate-800 dark:text-rose-400 font-medium"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlipItem(item.id)}
                            className="rounded p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Hapus Komponen"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-600 dark:text-slate-400">
                  Catatan Slip Gaji Karyawan
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Misal: Cicilan pinjaman mesin clipper ke-2 dari 6..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Kalkulasi Preview */}
              {(() => {
                const fixed = editingRun.Allowances_Breakdown?.fixed ?? editingRun.Total_Allowances;
                const customEarnings = editCustomItems
                  .filter((i) => i.type === 'earning')
                  .reduce((sum, i) => sum + (i.amount || 0), 0);
                const customDeductions = editCustomItems
                  .filter((i) => i.type === 'deduction')
                  .reduce((sum, i) => sum + (i.amount || 0), 0);
                const totalGross = editingRun.Base_Salary + fixed + customEarnings;
                const net = totalGross - customDeductions;

                return (
                  <div className="rounded-lg bg-emerald-50 p-3.5 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span>Total Penghasilan Kotor (Gross):</span>
                      <span className="font-mono font-medium">{formatRupiah(totalGross)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-rose-600 dark:text-rose-400">
                      <span>Total Seluruh Potongan:</span>
                      <span className="font-mono font-medium">-{formatRupiah(customDeductions)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-emerald-200 dark:border-emerald-800">
                      <span className="font-bold text-emerald-900 dark:text-emerald-300">
                        Gaji Bersih Diterima (Take Home Pay):
                      </span>
                      <span className="font-bold font-mono text-base text-emerald-700 dark:text-emerald-400">
                        {formatRupiah(net)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRun(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs"
                >
                  Simpan Komponen Slip Gaji
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Disburse & Record Expense */}
      {disburseRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Konfirmasi Pembayaran Gaji
                </h3>
                <p className="text-xs text-slate-500">
                  {employees.find((e) => e.Employee_ID === disburseRun.Employee_ID)?.Full_Name}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Periode:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {formatPeriod(disburseRun.Period_Month, disburseRun.Period_Year)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cabang Toko:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {stores.find((s) => s.Store_ID === disburseRun.Store_ID)?.Store_Name}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-semibold">
                <span className="text-slate-800 dark:text-slate-200">Gaji Bersih Diterima:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatRupiah(disburseRun.Net_Salary)}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Setelah dikonfirmasi, status akan menjadi <strong>Paid</strong> dan otomatis dicatat
              sebagai transaksi Pengeluaran (Beban Gaji) di sheet Transactions.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDisburseRun(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDisburse}
                disabled={isProcessing}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? 'Memproses...' : 'Setujui & Bayarkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah Payroll Manual */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Tambah Data Payroll Baru
                </h3>
                <p className="text-xs text-slate-500">
                  Input data penggajian karyawan, tunjangan, dan potongan bulanan
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPayroll} className="p-6 space-y-4 text-xs">
              {/* Row 1: Employee & Store */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Pilih Karyawan *
                  </label>
                  <select
                    value={addEmployeeId}
                    onChange={(e) => handleSelectEmployeeForAdd(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="" disabled>-- Pilih Karyawan --</option>
                    {employees.map((e) => (
                      <option key={e.Employee_ID} value={e.Employee_ID}>
                        {e.Full_Name} ({e.Employee_ID} - {e.Position})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Cabang / Outlet Beban *
                  </label>
                  <select
                    value={addStoreId}
                    onChange={(e) => setAddStoreId(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {stores.map((s) => (
                      <option key={s.Store_ID} value={s.Store_ID}>
                        {s.Store_Name} ({s.Store_ID})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Periode & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Bulan Periode
                  </label>
                  <select
                    value={addMonth}
                    onChange={(e) => setAddMonth(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Tahun Periode
                  </label>
                  <select
                    value={addYear}
                    onChange={(e) => setAddYear(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Status Pembayaran
                  </label>
                  <select
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value as PayrollStatus)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Draft">Draft (Belum Bayar)</option>
                    <option value="Approved">Approved (Disetujui)</option>
                    <option value="Paid">Paid (Sudah Terbayar)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Penghasilan Pokok & Tunjangan */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-850 space-y-3">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  A. Komponen Penghasilan (Earnings)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500">Gaji Pokok (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      step="50000"
                      value={addBaseSalary}
                      onChange={(e) => setAddBaseSalary(Number(e.target.value))}
                      required
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Tunjangan Tetap (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      step="25000"
                      value={addFixedAllowance}
                      onChange={(e) => setAddFixedAllowance(Number(e.target.value))}
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Lembur (Overtime)</label>
                    <input
                      type="number"
                      min="0"
                      step="25000"
                      value={addOvertime}
                      onChange={(e) => setAddOvertime(Number(e.target.value))}
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Bonus / Komisi</label>
                    <input
                      type="number"
                      min="0"
                      step="25000"
                      value={addBonus}
                      onChange={(e) => setAddBonus(Number(e.target.value))}
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Potongan */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-850 space-y-3">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  B. Komponen Potongan (Deductions)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500">BPJS (3% Est)</label>
                    <input
                      type="number"
                      min="0"
                      value={addBpjs}
                      onChange={(e) => setAddBpjs(Number(e.target.value))}
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Cicilan Kasbon</label>
                    <input
                      type="number"
                      min="0"
                      value={addKasbon}
                      onChange={(e) => setAddKasbon(Number(e.target.value))}
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Denda / Keterlambatan</label>
                    <input
                      type="number"
                      min="0"
                      value={addLatePenalty}
                      onChange={(e) => setAddLatePenalty(Number(e.target.value))}
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Pajak / Potongan Lain</label>
                    <input
                      type="number"
                      min="0"
                      value={addTax}
                      onChange={(e) => setAddTax(Number(e.target.value))}
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Catatan */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Catatan Slip Gaji
                </label>
                <input
                  type="text"
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="Misal: Termasuk bonus target cabang bulan ini..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Total Summary Box */}
              <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block font-medium">
                    Estimasi Gaji Bersih (Take Home Pay)
                  </span>
                  <span className="text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                    {formatRupiah(
                      Math.max(
                        0,
                        Number(addBaseSalary || 0) +
                          Number(addFixedAllowance || 0) +
                          Number(addOvertime || 0) +
                          Number(addBonus || 0) +
                          Number(addMeal || 0) -
                          (Number(addBpjs || 0) +
                            Number(addKasbon || 0) +
                            Number(addLatePenalty || 0) +
                            Number(addTax || 0))
                      )
                    )}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors"
                  >
                    Simpan Data Payroll
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Laporan List Payroll Bulanan & Cetak PDF */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-850">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Laporan Rekapitulasi Daftar Payroll Bulanan
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Periode: <strong>{formatPeriod(selectedMonth, selectedYear)}</strong> · Cabang:{' '}
                    <strong>
                      {activeStoreId === 'ALL'
                        ? 'Konsolidasi Seluruh Cabang'
                        : stores.find((s) => s.Store_ID === activeStoreId)?.Store_Name || activeStoreId}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPayrollPdf}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
                  title="Unduh & Cetak PDF Laporan Payroll Bulanan"
                >
                  <Printer className="h-4 w-4" />
                  <span>Cetak PDF</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Karyawan</span>
                  <span className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1 block">
                    {enrichedRuns.length} Orang
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Gaji Pokok</span>
                  <span className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1 block">
                    {formatRupiah(totalBaseSalary)}
                  </span>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 block">Total Tunjangan</span>
                  <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1 block">
                    +{formatRupiah(totalAllowances)}
                  </span>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5 dark:border-rose-900/50 dark:bg-rose-950/30">
                  <span className="text-[10px] uppercase font-bold text-rose-800 dark:text-rose-300 block">Total Potongan</span>
                  <span className="text-lg font-bold font-mono text-rose-700 dark:text-rose-300 mt-1 block">
                    -{formatRupiah(totalDeductions)}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-900 bg-slate-900 p-3.5 text-white dark:border-slate-700 dark:bg-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-300 block">Total Beban Gaji (THP)</span>
                  <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block">
                    {formatRupiah(totalPayrollCost)}
                  </span>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 text-center">No</th>
                      <th className="px-3 py-2.5">ID Payroll</th>
                      <th className="px-3 py-2.5">Nama & Jabatan</th>
                      <th className="px-3 py-2.5">Cabang</th>
                      <th className="px-3 py-2.5 text-right">Gaji Pokok</th>
                      <th className="px-3 py-2.5 text-right">Tunjangan (+)</th>
                      <th className="px-3 py-2.5 text-right">Potongan (-)</th>
                      <th className="px-3 py-2.5 text-right">Gaji Bersih (THP)</th>
                      <th className="px-3 py-2.5">Rekening Tujuan</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {enrichedRuns.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-slate-400 italic">
                          Belum ada data penggajian untuk filter periode dan cabang ini.
                        </td>
                      </tr>
                    ) : (
                      enrichedRuns.map((r, idx) => (
                        <tr key={r.Payroll_ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-3 py-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {r.Payroll_ID}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-bold text-slate-900 dark:text-white block">{r.employeeName}</span>
                            <span className="text-[10px] text-slate-400">{r.employeePosition}</span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                            {r.Store_ID}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                            {formatRupiah(r.Base_Salary)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                            +{formatRupiah(r.Total_Allowances)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-rose-600 dark:text-rose-400 font-medium">
                            -{formatRupiah(r.Total_Deductions)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatRupiah(r.Net_Salary)}
                          </td>
                          <td className="px-3 py-2.5 text-[11px] text-slate-600 dark:text-slate-400">
                            {r.employeeBank} {r.employeeAccount}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                r.Payment_Status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : r.Payment_Status === 'Approved'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {r.Payment_Status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {enrichedRuns.length > 0 && (
                    <tfoot className="bg-slate-50 dark:bg-slate-800/60 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-slate-900 dark:text-white uppercase">
                          TOTAL REKAPITULASI ({enrichedRuns.length} Karyawan)
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-900 dark:text-white">
                          {formatRupiah(totalBaseSalary)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          +{formatRupiah(totalAllowances)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-rose-600 dark:text-rose-400">
                          -{formatRupiah(totalDeductions)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-900 dark:text-white text-sm">
                          {formatRupiah(totalPayrollCost)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-850">
              <span className="text-xs text-slate-500">
                Laporan ini resmi dan terintegrasi otomatis dengan Bagan Akun Beban Usaha & Kas/Bank.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  onClick={handleExportPayrollPdf}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Cetak / Unduh PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
