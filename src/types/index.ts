export type StoreStatus = 'Active' | 'Inactive';
export type UserRole = 'Superadmin' | 'Finance Admin' | 'Store Manager' | 'Employee';
export type AccountCategory = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
export type TransactionType = 'Pemasukan' | 'Pengeluaran' | 'Transfer' | 'Liability' | 'Equity';
export type PaymentMethod =
  | 'Cash'
  | 'Bank Transfer'
  | 'Qris'
  | 'Debit bank BCA'
  | 'Debit Bank Lain'
  | 'E-Wallet';
export type TransactionStatus = 'Approved' | 'Pending' | 'Rejected';
export type PayrollStatus = 'Draft' | 'Approved' | 'Paid';

export interface Store {
  Store_ID: string;
  Store_Name: string;
  Address: string;
  Phone: string;
  Manager_Name: string;
  Status: StoreStatus;
}

export interface User {
  User_ID: string;
  Store_ID: string; // 'ALL' or specific Store_ID
  Full_Name: string;
  Email: string;
  Role: UserRole;
  Status: 'Active' | 'Inactive';
  Avatar?: string;
}

export interface ChartOfAccount {
  Account_Code: string;
  Account_Name: string;
  Category: AccountCategory;
}

export interface Transaction {
  Transaction_ID: string;
  Date: string; // YYYY-MM-DD
  Store_ID: string;
  Type: TransactionType;
  Category: string; // Account_Code or name
  Amount: number;
  Payment_Method: PaymentMethod;
  Description: string;
  Proof_Attachment_URL: string;
  Created_By: string;
  Status: TransactionStatus;
  // Direction for Liability / Equity: Inflow (Dana Masuk) vs Outflow (Dana Keluar)
  Direction?: 'Inflow' | 'Outflow';
  // Transfer specific metadata
  Destination_Store_ID?: string;
  Transfer_Ref?: string;
  // MDR Non-Tunai specific metadata
  Gross_Amount?: number;
  MDR_Rate?: number; // e.g. 0.007 for QRIS (0.7%), 0.0015 for Debit BCA (0.15%), 0.02 for Debit Bank Lain (2%)
  MDR_Fee?: number; // Potongan MDR (Biaya Admin Bank)
  Net_Amount?: number; // Netto Masuk Rekening (Bruto - MDR_Fee)
  MDR_Expense_Ref?: string; // ID transaksi pengeluaran/beban terkait (Akun 5-111)
  // Transfer & Pemindahan Posisi Kas (Tunai vs Non-Tunai / Antar Rekening & Toko)
  Transfer_Type?: 'CASH_TO_NON_CASH' | 'NON_CASH_TO_CASH' | 'NON_CASH_TO_NON_CASH' | 'INTER_STORE';
  Source_Payment_Method?: PaymentMethod;
  Destination_Payment_Method?: PaymentMethod;
  Source_Account?: string;
  Destination_Account?: string;
  // Employee Kasbon specific metadata (Akun 5-101)
  Employee_ID?: string;
  Employee_Name?: string;
  Loan_ID?: string;
}

export interface Employee {
  Employee_ID: string;
  Store_ID: string; // Primary store ID
  Store_IDs?: string[]; // Multiple outlets assignment
  Full_Name: string;
  Position: string;
  Base_Salary: number;
  Allowance_Fixed: number;
  Bank_Name: string;
  Account_Number: string;
  Status: 'Active' | 'Inactive';
  Join_Date?: string;
}

export interface PayrollRun {
  Payroll_ID: string;
  Period_Month: number; // 1 - 12
  Period_Year: number;
  Store_ID: string;
  Employee_ID: string;
  Base_Salary: number;
  Total_Allowances: number;
  Total_Deductions: number;
  Net_Salary: number;
  Payment_Status: PayrollStatus;
  Payment_Date: string;
  Payslip_URL: string;
  // Detailed breakdown
  Allowances_Breakdown?: {
    fixed: number;
    overtime: number;
    bonus: number;
    meal: number;
  };
  Deductions_Breakdown?: {
    bpjs: number;
    kasbon: number;
    latePenalty: number;
    tax: number;
  };
  // Dynamic components (for barbershop commissions, tips, custom deductions, etc.)
  Custom_Items?: CustomPayrollItem[];
  Notes?: string;
}

export interface CustomPayrollItem {
  id: string;
  name: string;
  amount: number;
  type: 'earning' | 'deduction';
  category?: 'commission' | 'allowance' | 'bonus' | 'loan_payment' | 'penalty' | 'other';
  quantity?: number; // Jumlah unit yang terjual / dikerjakan (misal: 25 pcs pomade, 40 kepala cukur)
  rate_per_unit?: number; // Tarif / komisi per unit (misal: Rp 15.000 / pcs)
  unit_name?: string; // Satuan unit (Pcs, Botol, Kepala, Paket, dsb)
}

// ==========================================
// PINJAMAN BERJANGKA KARYAWAN (EMPLOYEE LOANS)
// ==========================================
export interface LoanRepayment {
  Repayment_ID: string;
  Date: string;
  Amount: number;
  Notes?: string;
  Payroll_ID?: string;
  Created_By?: string;
}

export interface EmployeeLoan {
  Loan_ID: string; // e.g. "LOAN-202610-001"
  Employee_ID: string;
  Employee_Name: string;
  Store_ID: string;
  Total_Amount: number; // Pokok pinjaman
  Tenor_Months: number; // Jangka waktu (bulan)
  Monthly_Installment: number; // Cicilan per bulan
  Paid_Amount: number; // Total sudah terbayar
  Remaining_Balance: number; // Sisa pinjaman
  Start_Date: string; // Tanggal pengajuan / pencairan
  Purpose: string; // Keperluan pinjaman
  Status: 'Active' | 'Paid_Off' | 'Cancelled';
  Repayments?: LoanRepayment[];
  Notes?: string;
  Created_At: string;
}

// ==========================================
// HUTANG KE SUPPLIER (ACCOUNTS PAYABLE)
// ==========================================
export interface SupplierPayment {
  Payment_ID: string;
  Date: string;
  Amount: number;
  Payment_Method: string; // Kas / Bank BCA / Mandiri / Transfer
  Proof_URL?: string;
  Notes?: string;
  Transaction_ID?: string;
  COA_Account?: string; // Bagan Akun yang dipilih (e.g. "2-101 - Hutang Dagang Supplier")
}

export interface SupplierDebt {
  Debt_ID: string; // e.g. "DEBT-202610-001"
  Supplier_Name: string; // e.g. "PT Barbershop Grooming Supplies"
  Invoice_Number: string; // No Faktur / Ref Nota
  Store_ID: string; // Cabang penerima barang/jasa
  Total_Amount: number; // Total tagihan
  Paid_Amount: number; // Total terbayar
  Remaining_Balance: number; // Sisa tagihan
  Invoice_Date: string; // Tanggal faktur
  Due_Date: string; // Tanggal jatuh tempo
  Status: 'Unpaid' | 'Partial' | 'Paid' | 'Overdue';
  Description?: string;
  Purchase_Order_ID?: string; // Linked PO
  COA_Account?: string; // Bagan Akun terkait (e.g. "2-101 - Hutang Dagang Supplier")
  Payments?: SupplierPayment[];
  Created_At: string;
}

// ==========================================
// PURCHASE ORDER (PERENCANAAN PEMBELANJAAN)
// ==========================================
export interface PurchaseOrderItem {
  id: string;
  item_name: string; // e.g. "Pomade Oil-Based Classic 100gr"
  quantity: number;
  unit: string; // Pcs, Botol, Lusin, Pack, Box
  unit_price: number;
  total_price: number;
}

export interface PurchaseOrder {
  PO_ID: string; // e.g. "PO-202610-001"
  PO_Number: string; // e.g. "PO/NR/2026/10/001"
  Store_ID: string;
  Supplier_Name: string;
  Order_Date: string;
  Expected_Date: string;
  Items: PurchaseOrderItem[];
  Subtotal: number;
  Tax_Amount?: number;
  Grand_Total: number;
  Status: 'Draft' | 'Approved' | 'Ordered' | 'Received' | 'Cancelled';
  Payment_Term?: string; // COD, Tempo 30 Hari, dll.
  Notes?: string;
  Created_By: string;
  Linked_Debt_ID?: string;
  Created_At: string;
}

export interface GoogleSheetsConfig {
  webAppUrl: string;
  spreadsheetId?: string;
  autoSync: boolean;
  lastSyncTime?: string;
  isConnected: boolean;
}

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom'
  | 'all';

export interface DateRangeFilter {
  preset: DatePreset;
  startDate: string;
  endDate: string;
}

export interface StoreBudget {
  Budget_ID: string; // e.g. "BGT-202610-STR-001"
  Store_ID: string;
  Period_Month: number; // 1 - 12
  Period_Year: number;
  Revenue_Target: number; // Target Omset
  Total_Expense_Budget: number; // Total Pagu Anggaran Pengeluaran
  Category_Budgets?: Record<string, number>; // Account_Code/Category -> budget amount
  Notes?: string;
  Updated_At?: string;
}

export interface CompanyProfile {
  companyName: string;
  brandName: string;
  tagline: string;
  legalAddress: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  taxNumber: string; // NPWP Perusahaan
  logoUrl: string; // Base64 data URL atau external image link
  logoPreset?: string; // ID preset logo alternatif (misal: 'emerald-shield', 'gold-crown', 'blue-cube', dll)
  financeDirectorName: string;
  financeDirectorTitle: string;
  currencySymbol: string;
  updatedAt?: string;
}

// ==========================================
// MANAJEMEN KOMPONEN PAJAK (TAX MANAGEMENT)
// ==========================================
export type TaxCategory =
  | 'PPN'
  | 'PPh_Final'
  | 'PPh_21'
  | 'PPh_23'
  | 'PPh_4_2'
  | 'Pajak_Daerah'
  | 'Custom';

export type TaxRateType = 'percentage' | 'fixed';

export type TaxCalculationBase =
  | 'revenue'
  | 'dpp_transaction'
  | 'payroll_gross'
  | 'net_profit'
  | 'manual';

export type TaxTreatment = 'surcharge' | 'withholding' | 'corporate_expense';

export interface TaxComponent {
  id: string; // e.g. "TAX-001"
  code: string; // e.g. "PPN-11", "PPH-FINAL", "PPH-21"
  name: string; // e.g. "Pajak Pertambahan Nilai (PPN 11%)"
  category: TaxCategory;
  rate: number; // e.g. 11 for 11%, 0.5 for 0.5%, 2 for 2%
  rateType: TaxRateType; // 'percentage' | 'fixed'
  calculationBase: TaxCalculationBase;
  taxTreatment: TaxTreatment; // surcharge (pungut pelanggan), withholding (potong rekanan), corporate_expense (beban perusahaan)
  storeScope: string; // 'ALL' or specific Store_ID
  status: 'Active' | 'Inactive';
  description?: string;
  accountCode?: string; // Akun COA terkait, misal "2-102"
  effectiveDate?: string;
  isSystem?: boolean;
  updatedAt?: string;
}

export interface TaxPaymentRecord {
  id: string; // e.g. "TAX-PAY-202610-001"
  taxComponentId: string;
  taxComponentName: string;
  taxCode: string;
  storeId: string; // 'ALL' or specific Store_ID
  periodMonth: number; // 1 - 12
  periodYear: number;
  dppAmount: number; // Dasar Pengenaan Pajak
  taxRate: number; // Tarif %
  amount: number; // Jumlah pajak yang disetor
  billingCode: string; // Kode Billing DJP (15 digit)
  ntpn?: string; // Nomor Transaksi Penerimaan Negara
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: string; // 'Bank Transfer' | 'Kas Toko' | 'Online'
  status: 'Paid' | 'Pending' | 'Draft';
  proofUrl?: string;
  notes?: string;
  transactionId?: string; // Linked ID jika dicatat sebagai transaksi pengeluaran
  createdAt: string;
}

// ==========================================
// AKTIVITAS REAL-TIME ANTAR PERANGKAT (LIVE STREAM)
// ==========================================
export type LiveActivityEntityType =
  | 'transaction'
  | 'payroll'
  | 'debt'
  | 'loan'
  | 'po'
  | 'tax'
  | 'store'
  | 'user'
  | 'config'
  | 'settings'
  | 'book_closing'
  | 'coa'
  | 'budget'
  | 'company'
  | 'mdr';

export interface LiveActivity {
  id: string;
  timestamp: string; // ISO string
  userName: string;
  userRole: string;
  action: string; // e.g. "Transaksi Baru Disimpan", "Payroll Disetujui", dsb.
  details: string; // Deskripsi singkat ringkas
  entityType: LiveActivityEntityType;
  storeId?: string;
  actorDeviceId?: string;
}

export interface MDRRateSetting {
  id: string; // identifier e.g. 'qris', 'debit_bca', 'debit_lain'
  method: PaymentMethod | string;
  label: string;
  ratePercent: number; // e.g. 0.7 for 0.7%, 0.15 for 0.15%, 2.0 for 2.0%
  provider: string; // e.g. 'Bank Indonesia & Acquirer Merchant'
  coaAccountCode: string; // e.g. '5-111'
  coaAccountName: string; // e.g. 'Biaya Admin Bank / MDR'
  isActive: boolean;
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// ==========================================
// PENGATURAN BUKA BUKU & TUTUP BUKU (BOOK CLOSING)
// ==========================================
export type BookStatus = 'OPEN' | 'CLOSED';

export interface BookPeriodConfig {
  cutoffDay: number; // e.g. 25 (setiap tanggal 25) atau 0 (akhir bulan kalender)
  currentPeriodStatus: BookStatus; // 'OPEN' = Buka Buku, 'CLOSED' = Tutup Buku
  currentPeriod: string; // e.g. "2026-10"
  startDate: string; // Tanggal Mulai Periode aktif (YYYY-MM-DD), dapat disesuaikan jika aturan berubah
  endDate: string; // Tanggal Akhir / Cut-off Periode aktif (YYYY-MM-DD), dapat disesuaikan jika aturan berubah
  autoCloseNotification?: boolean;
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface BookClosingHistory {
  id: string; // e.g. "CLOSE-2026-09"
  period: string; // e.g. "2026-09"
  startDate: string;
  endDate: string;
  status: 'CLOSED' | 'REOPENED';
  closedAt: string;
  closedBy: string;
  reopenedAt?: string;
  reopenedBy?: string;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  totalLiabilityInflow?: number;
  totalLiabilityOutflow?: number;
  totalEquityInflow?: number;
  totalEquityOutflow?: number;
  transactionCount: number;
  retainedEarningsTransferred?: number;
  notes?: string;
}

// ==========================================
// MANAJEMEN HUTANG & CICILAN (DEBTS & INSTALLMENTS)
// ==========================================
export type DebtType =
  | 'Hutang Dagang / Supplier'
  | 'Hutang Bank / Kredit Usaha'
  | 'Pinjaman Pihak Ketiga / Investor'
  | 'Sewa / Leasing Peralatan'
  | 'Hutang Modal & Operasional'
  | 'Hutang Lainnya';

export type DebtStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Overdue';

export interface DebtInstallmentPayment {
  Payment_ID: string;
  Date: string; // YYYY-MM-DD
  Installment_Number: number; // Cicilan ke-1, 2, dst.
  Amount: number; // Pokok cicilan
  Interest_Amount?: number; // Bunga cicilan (jika ada)
  Total_Paid: number; // Pokok + Bunga
  Payment_Method: PaymentMethod;
  COA_Account: string; // Bagan Akun yang dipilih (e.g. "2-101 - Hutang Dagang Supplier" / "2-103 - Hutang Bank / Pinjaman Usaha")
  Settlement_Account?: string; // Akun Kas / Bank (e.g. "1-101 - Kas Toko" / "1-102 - Rekening Bank BCA")
  Transaction_ID?: string; // ID transaksi keuangan yang tercatat
  Proof_Attachment_URL?: string;
  Notes?: string;
  Created_By: string;
  Created_At: string;
}

export interface DebtRecord {
  Debt_ID: string; // e.g. "HTG-202610-001"
  Store_ID: string; // Cabang toko terkait
  Creditor_Name: string; // Pemberi Pinjaman / Kreditur / Bank / Supplier
  Debt_Type: DebtType;
  Reference_Number: string; // No. Kontrak / Faktur / Rekening
  COA_Account: string; // Bagan Akun yang dipilih (Akun Kewajiban / Liability)
  Total_Amount: number; // Total Pokok Hutang
  Paid_Amount: number; // Total sudah dibayar
  Remaining_Balance: number; // Sisa pokok hutang
  Tenor_Months?: number; // Jangka waktu (jumlah bulan / termin cicilan)
  Monthly_Installment?: number; // Estimasi cicilan per termin
  Start_Date: string; // Tanggal awal akad / timbul hutang
  Due_Date: string; // Tanggal jatuh tempo akhir
  Status: DebtStatus;
  Description?: string;
  Proof_Attachment_URL?: string;
  Payments: DebtInstallmentPayment[];
  Initial_Transaction_ID?: string; // ID transaksi penerimaan dana (jika dicatat sebagai inflow kas)
  Created_By: string;
  Created_At: string;
}

