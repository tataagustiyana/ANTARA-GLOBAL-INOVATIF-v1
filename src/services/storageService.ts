import {
  INITIAL_BUDGETS,
  INITIAL_COA,
  INITIAL_COMPANY_PROFILE,
  INITIAL_EMPLOYEE_LOANS,
  INITIAL_EMPLOYEES,
  INITIAL_PAYROLL_RUNS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_STORES,
  INITIAL_SUPPLIER_DEBTS,
  INITIAL_TAX_COMPONENTS,
  INITIAL_TAX_PAYMENTS,
  INITIAL_TRANSACTIONS,
  INITIAL_USERS,
  INITIAL_MDR_SETTINGS,
  INITIAL_BOOK_PERIOD_CONFIG,
  INITIAL_BOOK_CLOSING_HISTORY,
  INITIAL_DEBT_RECORDS,
} from '../data/initialData';
import {
  ChartOfAccount,
  CompanyProfile,
  Employee,
  EmployeeLoan,
  GoogleSheetsConfig,
  MDRRateSetting,
  PayrollRun,
  PurchaseOrder,
  Store,
  StoreBudget,
  SupplierDebt,
  TaxComponent,
  TaxPaymentRecord,
  Transaction,
  User,
  BookPeriodConfig,
  BookClosingHistory,
  DebtRecord,
  DebtInstallmentPayment,
} from '../types';
import { getTodayString } from '../utils/formatters';
import * as XLSX from 'xlsx';

const STORAGE_KEYS = {
  STORES: 'nusantara_stores_v1',
  USERS: 'nusantara_users_v1',
  COA: 'nusantara_coa_v1',
  TRANSACTIONS: 'nusantara_transactions_v1',
  EMPLOYEES: 'nusantara_employees_v1',
  PAYROLL: 'nusantara_payroll_v1',
  BUDGETS: 'nusantara_budgets_v1',
  COMPANY: 'nusantara_company_profile_v1',
  EMPLOYEE_LOANS: 'nusantara_employee_loans_v1',
  SUPPLIER_DEBTS: 'nusantara_supplier_debts_v1',
  PURCHASE_ORDERS: 'nusantara_purchase_orders_v1',
  TAX_COMPONENTS: 'nusantara_tax_components_v1',
  TAX_PAYMENTS: 'nusantara_tax_payments_v1',
  CONFIG: 'nusantara_sheets_config_v1',
  ACTIVE_USER: 'nusantara_active_user_v1',
  ACTIVE_STORE: 'nusantara_active_store_v1',
  DEVICE_ID: 'nusantara_device_id_v1',
  MDR_RATES: 'nusantara_mdr_rates_v1',
  BOOK_PERIOD: 'nusantara_book_period_v1',
  BOOK_CLOSINGS: 'nusantara_book_closings_v1',
  DEBT_RECORDS: 'nusantara_debt_records_v1',
};

export class StorageService {
  static getDeviceId(): string {
    let id = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 8) + '_' + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
    }
    return id;
  }

  // Load initial or stored data
  static getStores(): Store[] {
    const raw = localStorage.getItem(STORAGE_KEYS.STORES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(INITIAL_STORES));
      return INITIAL_STORES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_STORES;
    }
  }

  static saveStores(stores: Store[]): void {
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));
  }

  static getUsers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_USERS;
    }
  }

  static saveUsers(users: User[]): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  static getCOA(): ChartOfAccount[] {
    const raw = localStorage.getItem(STORAGE_KEYS.COA);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.COA, JSON.stringify(INITIAL_COA));
      return INITIAL_COA;
    }
    try {
      const parsed: ChartOfAccount[] = JSON.parse(raw);
      const hasMdrAccount = parsed.some((c) => c.Account_Code === '5-111');
      if (!hasMdrAccount) {
        const mdrCoa = INITIAL_COA.find((c) => c.Account_Code === '5-111') || {
          Account_Code: '5-111',
          Account_Name: 'Biaya Admin Bank / MDR',
          Category: 'Expense' as const,
        };
        const updated = [...parsed, mdrCoa];
        localStorage.setItem(STORAGE_KEYS.COA, JSON.stringify(updated));
        return updated;
      }
      return parsed;
    } catch {
      return INITIAL_COA;
    }
  }

  static saveCOA(coa: ChartOfAccount[]): void {
    localStorage.setItem(STORAGE_KEYS.COA, JSON.stringify(coa));
  }

  static getTransactions(): Transaction[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_TRANSACTIONS;
    }
    try {
      const parsed: Transaction[] = JSON.parse(raw);
      // Ensure demonstration alert transaction is present if user has older cached storage
      const hasAlertSample = parsed.some((t) => t.Transaction_ID === 'TRX-202610-008');
      if (!hasAlertSample) {
        const sampleTrx = INITIAL_TRANSACTIONS.find((t) => t.Transaction_ID === 'TRX-202610-008');
        if (sampleTrx) {
          const merged = [sampleTrx, ...parsed];
          localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(merged));
          return merged;
        }
      }
      return parsed;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  }

  static saveTransactions(transactions: Transaction[]): void {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }

  static getEmployees(): Employee[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_EMPLOYEES;
    }
  }

  static saveEmployees(employees: Employee[]): void {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  }

  static getPayrollRuns(): PayrollRun[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYROLL);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(INITIAL_PAYROLL_RUNS));
      return INITIAL_PAYROLL_RUNS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_PAYROLL_RUNS;
    }
  }

  static savePayrollRuns(runs: PayrollRun[]): void {
    localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(runs));
  }

  static getBudgets(): StoreBudget[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BUDGETS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(INITIAL_BUDGETS));
      return INITIAL_BUDGETS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_BUDGETS;
    }
  }

  static saveBudgets(budgets: StoreBudget[]): void {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  }

  static getCompanyProfile(): CompanyProfile {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPANY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(INITIAL_COMPANY_PROFILE));
      return INITIAL_COMPANY_PROFILE;
    }
    try {
      return { ...INITIAL_COMPANY_PROFILE, ...JSON.parse(raw) };
    } catch {
      return INITIAL_COMPANY_PROFILE;
    }
  }

  static saveCompanyProfile(profile: CompanyProfile): void {
    localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(profile));
  }

  static getEmployeeLoans(): EmployeeLoan[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EMPLOYEE_LOANS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEE_LOANS, JSON.stringify(INITIAL_EMPLOYEE_LOANS));
      return INITIAL_EMPLOYEE_LOANS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_EMPLOYEE_LOANS;
    }
  }

  static saveEmployeeLoans(loans: EmployeeLoan[]): void {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEE_LOANS, JSON.stringify(loans));
  }

  static getSupplierDebts(): SupplierDebt[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SUPPLIER_DEBTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SUPPLIER_DEBTS, JSON.stringify(INITIAL_SUPPLIER_DEBTS));
      return INITIAL_SUPPLIER_DEBTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_SUPPLIER_DEBTS;
    }
  }

  static saveSupplierDebts(debts: SupplierDebt[]): void {
    localStorage.setItem(STORAGE_KEYS.SUPPLIER_DEBTS, JSON.stringify(debts));
  }

  static getPurchaseOrders(): PurchaseOrder[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PURCHASE_ORDERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(INITIAL_PURCHASE_ORDERS));
      return INITIAL_PURCHASE_ORDERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_PURCHASE_ORDERS;
    }
  }

  static savePurchaseOrders(orders: PurchaseOrder[]): void {
    localStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(orders));
  }

  // --- TAX MANAGEMENT METHODS ---
  static getTaxComponents(): TaxComponent[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TAX_COMPONENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TAX_COMPONENTS, JSON.stringify(INITIAL_TAX_COMPONENTS));
      return INITIAL_TAX_COMPONENTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_TAX_COMPONENTS;
    }
  }

  static saveTaxComponents(components: TaxComponent[]): void {
    localStorage.setItem(STORAGE_KEYS.TAX_COMPONENTS, JSON.stringify(components));
  }

  static getTaxPayments(): TaxPaymentRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TAX_PAYMENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TAX_PAYMENTS, JSON.stringify(INITIAL_TAX_PAYMENTS));
      return INITIAL_TAX_PAYMENTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_TAX_PAYMENTS;
    }
  }

  static saveTaxPayments(payments: TaxPaymentRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.TAX_PAYMENTS, JSON.stringify(payments));
  }

  // Automatically record Expense transaction when Tax Payment is completed
  static createTaxPaymentExpenseTransaction(
    payment: TaxPaymentRecord,
    storeId: string,
    actorName: string
  ): Transaction {
    const dateNow = getTodayString();
    return {
      Transaction_ID: `TRX-${payment.periodYear}${String(payment.periodMonth).padStart(2, '0')}-TAX-${payment.id.slice(-4)}`,
      Date: payment.paymentDate || dateNow,
      Store_ID: storeId === 'ALL' ? 'STR-001' : storeId,
      Type: 'Pengeluaran',
      Category: '5-104 - Beban Perlengkapan & Operasional Toko',
      Amount: payment.amount,
      Payment_Method: payment.paymentMethod === 'Kas Toko' ? 'Cash' : 'Bank Transfer',
      Description: `Penyetoran Pajak: ${payment.taxComponentName} (${payment.taxCode}) Masa ${payment.periodMonth}/${payment.periodYear} [Billing: ${payment.billingCode}${payment.ntpn ? ' | NTPN: ' + payment.ntpn : ''}]`,
      Proof_Attachment_URL: payment.proofUrl || '',
      Created_By: actorName,
      Status: 'Approved',
    };
  }

  // --- MANAJEMEN HUTANG & CICILAN METHODS ---
  static getDebtRecords(): DebtRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.DEBT_RECORDS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DEBT_RECORDS, JSON.stringify(INITIAL_DEBT_RECORDS));
      return INITIAL_DEBT_RECORDS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_DEBT_RECORDS;
    }
  }

  static saveDebtRecords(debts: DebtRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.DEBT_RECORDS, JSON.stringify(debts));
  }

  // Automatically record financial transaction when Debt Installment Payment is made
  static createDebtPaymentExpenseTransaction(
    debt: DebtRecord,
    payment: DebtInstallmentPayment,
    storeId: string,
    actorName: string
  ): Transaction {
    const dateNow = getTodayString();
    const periodStr = dateNow.slice(0, 7).replace('-', '');
    return {
      Transaction_ID:
        payment.Transaction_ID || `TRX-${periodStr}-CICILAN-${payment.Payment_ID.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`,
      Date: payment.Date || dateNow,
      Store_ID: storeId === 'ALL' ? (debt.Store_ID || 'STR-001') : storeId,
      Type: 'Pengeluaran',
      Category: payment.COA_Account || debt.COA_Account || '2-103 - Hutang Bank / Pinjaman Usaha',
      Amount: payment.Total_Paid || payment.Amount,
      Payment_Method: payment.Payment_Method || 'Bank Transfer',
      Description: `Pembayaran Cicilan #${payment.Installment_Number} Hutang: ${debt.Creditor_Name} (Ref: ${debt.Reference_Number})${payment.Notes ? ' - ' + payment.Notes : ''}`.trim(),
      Proof_Attachment_URL: payment.Proof_Attachment_URL || '',
      Created_By: actorName,
      Status: 'Approved',
    };
  }

  static getConfig(): GoogleSheetsConfig {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) {
      return {
        webAppUrl: '',
        spreadsheetId: '',
        autoSync: false,
        isConnected: false,
      };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        webAppUrl: '',
        autoSync: false,
        isConnected: false,
      };
    }
  }

  static saveConfig(config: GoogleSheetsConfig): void {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }

  static getActiveUser(users: User[]): User {
    const savedId = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
    if (savedId) {
      const found = users.find((u) => u.User_ID === savedId);
      if (found) return found;
    }
    return users[0] || INITIAL_USERS[0];
  }

  static setActiveUserId(userId: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, userId);
  }

  static saveActiveUser(user: User): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, user.User_ID);
  }

  static getActiveStoreId(): string {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_STORE) || 'ALL';
  }

  static setActiveStoreId(storeId: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_STORE, storeId);
  }

  // Reset to sample initial state
  static resetToDefaults(): void {
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(INITIAL_STORES));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.COA, JSON.stringify(INITIAL_COA));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
    localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(INITIAL_PAYROLL_RUNS));
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(INITIAL_BUDGETS));
  }

  // --- Google Sheets Web App API Calls ---
  static async testConnection(webAppUrl: string): Promise<{ success: boolean; message: string; spreadsheetName?: string }> {
    if (!webAppUrl || !webAppUrl.startsWith('http')) {
      return { success: false, message: 'URL Web App tidak valid. Pastikan dimulai dengan https://' };
    }
    try {
      const targetUrl = new URL(webAppUrl);
      targetUrl.searchParams.set('action', 'ping');
      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.status === 'success') {
        return {
          success: true,
          message: data.message || 'Koneksi berhasil!',
          spreadsheetName: data.spreadsheetName,
        };
      }
      return { success: false, message: data.message || 'Respons tidak sesuai format' };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal terhubung: ${err.message || 'Pastikan izin deployment diset "Who has access: Anyone"'}`,
      };
    }
  }

  static async fetchFromSheets(webAppUrl: string): Promise<{
    success: boolean;
    data?: {
      stores?: Store[];
      users?: User[];
      chartOfAccounts?: ChartOfAccount[];
      transactions?: Transaction[];
      employees?: Employee[];
      payrollRuns?: PayrollRun[];
      budgets?: StoreBudget[];
      companyProfile?: CompanyProfile;
      employeeLoans?: EmployeeLoan[];
      supplierDebts?: SupplierDebt[];
      purchaseOrders?: PurchaseOrder[];
      taxComponents?: TaxComponent[];
      taxPayments?: TaxPaymentRecord[];
    };
    error?: string;
  }> {
    try {
      const targetUrl = new URL(webAppUrl);
      targetUrl.searchParams.set('action', 'getAllData');
      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.status === 'success' && result.data) {
        return { success: true, data: result.data };
      }
      return { success: false, error: result.message || 'Format data tidak sesuai' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async pushToSheets(webAppUrl: string, payload: any): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight blockage on Google Apps Script
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      return { success: result.status === 'success', message: result.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // Automatically record Expense transaction when Payroll is paid
  static createPayrollExpenseTransaction(
    payroll: PayrollRun,
    employee: Employee | undefined,
    actorName: string
  ): Transaction {
    const empName = employee ? employee.Full_Name : payroll.Employee_ID;
    const dateNow = getTodayString();
    const kasbonAmount = payroll.Deductions_Breakdown?.kasbon || 0;
    const kasbonNote = kasbonAmount > 0 ? ` [Potongan Kasbon Akun 5-101: Rp ${kasbonAmount.toLocaleString('id-ID')}]` : '';
    return {
      Transaction_ID: `TRX-${payroll.Period_Year}${String(payroll.Period_Month).padStart(2, '0')}-PAY-${payroll.Payroll_ID.slice(-4)}`,
      Date: payroll.Payment_Date || dateNow,
      Store_ID: payroll.Store_ID,
      Type: 'Pengeluaran',
      Category: '5-101 - Beban Gaji & Upah Karyawan (Kasbon)',
      Amount: payroll.Net_Salary,
      Payment_Method: 'Bank Transfer',
      Description: `Pembayaran Gaji Periode ${payroll.Period_Month}/${payroll.Period_Year} - ${empName} (${employee?.Position || 'Staff'})${kasbonNote}`,
      Proof_Attachment_URL: payroll.Payslip_URL || '',
      Created_By: actorName,
      Status: 'Approved',
      Employee_ID: payroll.Employee_ID,
      Employee_Name: empName,
      Loan_ID: kasbonAmount > 0 ? `KASBON-${payroll.Employee_ID}` : undefined,
    };
  }

  // Export tables as native Microsoft Excel (.xlsx) format
  static exportToExcel(
    filename: string,
    headers: string[],
    rows: (string | number)[][],
    sheetName: string = 'Data'
  ): void {
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-fit column widths based on contents
    const colWidths = headers.map((header, colIdx) => {
      let maxLen = String(header || '').length;
      rows.forEach((row) => {
        const cellVal = row[colIdx];
        if (cellVal !== undefined && cellVal !== null) {
          maxLen = Math.max(maxLen, String(cellVal).length);
        }
      });
      return { wch: Math.min(Math.max(maxLen + 3, 12), 50) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

    const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, cleanFilename);
  }

  // Alias for backward compatibility (generates .xlsx)
  static exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
    this.exportToExcel(filename, headers, rows);
  }

  // --- MDR Settings (Tarif MDR Non-Tunai) ---
  static getMDRSettings(): MDRRateSetting[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MDR_RATES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MDR_RATES, JSON.stringify(INITIAL_MDR_SETTINGS));
      return INITIAL_MDR_SETTINGS;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return INITIAL_MDR_SETTINGS;
    } catch {
      return INITIAL_MDR_SETTINGS;
    }
  }

  static saveMDRSettings(settings: MDRRateSetting[]): void {
    localStorage.setItem(STORAGE_KEYS.MDR_RATES, JSON.stringify(settings));
  }

  static resetMDRSettings(): MDRRateSetting[] {
    localStorage.setItem(STORAGE_KEYS.MDR_RATES, JSON.stringify(INITIAL_MDR_SETTINGS));
    return INITIAL_MDR_SETTINGS;
  }

  // --- Buka Buku & Tutup Buku (Book Closing) ---
  static getBookPeriodConfig(): BookPeriodConfig {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOK_PERIOD);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.BOOK_PERIOD, JSON.stringify(INITIAL_BOOK_PERIOD_CONFIG));
      return INITIAL_BOOK_PERIOD_CONFIG;
    }
    try {
      return { ...INITIAL_BOOK_PERIOD_CONFIG, ...JSON.parse(raw) };
    } catch {
      return INITIAL_BOOK_PERIOD_CONFIG;
    }
  }

  static saveBookPeriodConfig(config: BookPeriodConfig): void {
    localStorage.setItem(STORAGE_KEYS.BOOK_PERIOD, JSON.stringify(config));
  }

  static getBookClosingHistory(): BookClosingHistory[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOK_CLOSINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.BOOK_CLOSINGS, JSON.stringify(INITIAL_BOOK_CLOSING_HISTORY));
      return INITIAL_BOOK_CLOSING_HISTORY;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      return INITIAL_BOOK_CLOSING_HISTORY;
    } catch {
      return INITIAL_BOOK_CLOSING_HISTORY;
    }
  }

  static saveBookClosingHistory(history: BookClosingHistory[]): void {
    localStorage.setItem(STORAGE_KEYS.BOOK_CLOSINGS, JSON.stringify(history));
  }

  // =========================================================================
  // SISTEM CADANGAN & PENYIMPANAN PERMANEN (BACKUP & RESTORE DATA)
  // =========================================================================

  /**
   * Menghasilkan objek backup utuh seluruh data sistem aplikasi
   */
  static exportFullBackup(): { filename: string; jsonString: string; data: Record<string, any> } {
    const backupData = {
      appId: 'ai-studio-antaraglobalinov',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      stores: this.getStores(),
      users: this.getUsers(),
      chartOfAccounts: this.getCOA(),
      transactions: this.getTransactions(),
      employees: this.getEmployees(),
      payrollRuns: this.getPayrollRuns(),
      budgets: this.getBudgets(),
      companyProfile: this.getCompanyProfile(),
      employeeLoans: this.getEmployeeLoans(),
      supplierDebts: this.getSupplierDebts(),
      purchaseOrders: this.getPurchaseOrders(),
      taxComponents: this.getTaxComponents(),
      taxPayments: this.getTaxPayments(),
      mdrSettings: this.getMDRSettings(),
      bookPeriodConfig: this.getBookPeriodConfig(),
      bookClosingHistory: this.getBookClosingHistory(),
      debtRecords: this.getDebtRecords(),
    };

    const dateStr = getTodayString();
    const filename = `Backup_Data_Keuangan_Payroll_${dateStr}.json`;
    return {
      filename,
      jsonString: JSON.stringify(backupData, null, 2),
      data: backupData,
    };
  }

  /**
   * Mengunduh file backup JSON ke memori lokal komputer pengguna
   */
  static downloadBackupFile(): string {
    const { filename, jsonString } = this.exportFullBackup();
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return filename;
  }

  /**
   * Memulihkan data dari teks JSON backup ke penyimpanan lokal
   */
  static importFullBackupJson(jsonString: string): { success: boolean; message: string; counts?: Record<string, number> } {
    try {
      const data = JSON.parse(jsonString);
      const counts: Record<string, number> = {};

      if (Array.isArray(data.stores) && data.stores.length > 0) {
        this.saveStores(data.stores);
        counts.stores = data.stores.length;
      }
      if (Array.isArray(data.users) && data.users.length > 0) {
        this.saveUsers(data.users);
        counts.users = data.users.length;
      }
      if (Array.isArray(data.chartOfAccounts || data.coa) && (data.chartOfAccounts || data.coa).length > 0) {
        const coaList = data.chartOfAccounts || data.coa;
        this.saveCOA(coaList);
        counts.coa = coaList.length;
      }
      if (Array.isArray(data.transactions) && data.transactions.length > 0) {
        this.saveTransactions(data.transactions);
        counts.transactions = data.transactions.length;
      }
      if (Array.isArray(data.employees) && data.employees.length > 0) {
        this.saveEmployees(data.employees);
        counts.employees = data.employees.length;
      }
      if (Array.isArray(data.payrollRuns) && data.payrollRuns.length > 0) {
        this.savePayrollRuns(data.payrollRuns);
        counts.payroll = data.payrollRuns.length;
      }
      if (Array.isArray(data.budgets) && data.budgets.length > 0) {
        this.saveBudgets(data.budgets);
        counts.budgets = data.budgets.length;
      }
      if (data.companyProfile) {
        this.saveCompanyProfile(data.companyProfile);
      }
      if (Array.isArray(data.employeeLoans) && data.employeeLoans.length > 0) {
        this.saveEmployeeLoans(data.employeeLoans);
        counts.loans = data.employeeLoans.length;
      }
      if (Array.isArray(data.supplierDebts) && data.supplierDebts.length > 0) {
        this.saveSupplierDebts(data.supplierDebts);
        counts.supplierDebts = data.supplierDebts.length;
      }
      if (Array.isArray(data.purchaseOrders) && data.purchaseOrders.length > 0) {
        this.savePurchaseOrders(data.purchaseOrders);
        counts.purchaseOrders = data.purchaseOrders.length;
      }
      if (Array.isArray(data.taxComponents) && data.taxComponents.length > 0) {
        this.saveTaxComponents(data.taxComponents);
        counts.taxComponents = data.taxComponents.length;
      }
      if (Array.isArray(data.taxPayments) && data.taxPayments.length > 0) {
        this.saveTaxPayments(data.taxPayments);
        counts.taxPayments = data.taxPayments.length;
      }
      if (Array.isArray(data.mdrSettings) && data.mdrSettings.length > 0) {
        this.saveMDRSettings(data.mdrSettings);
      }
      if (data.bookPeriodConfig) {
        this.saveBookPeriodConfig(data.bookPeriodConfig);
      }
      if (Array.isArray(data.bookClosingHistory) && data.bookClosingHistory.length > 0) {
        this.saveBookClosingHistory(data.bookClosingHistory);
      }
      if (Array.isArray(data.debtRecords) && data.debtRecords.length > 0) {
        this.saveDebtRecords(data.debtRecords);
        counts.debtRecords = data.debtRecords.length;
      }

      return {
        success: true,
        message: 'Data berhasil dipulihkan secara lengkap ke penyimpanan lokal!',
        counts,
      };
    } catch (err: any) {
      console.error('Error importing backup JSON:', err);
      return {
        success: false,
        message: `Gagal memulihkan file cadangan: ${err.message || 'Format JSON tidak valid'}`,
      };
    }
  }

  /**
   * Mengambil statistik ringkasan jumlah data saat ini
   */
  static getDataSummaryStats(): Record<string, number> {
    return {
      transactions: this.getTransactions().length,
      stores: this.getStores().length,
      users: this.getUsers().length,
      coa: this.getCOA().length,
      employees: this.getEmployees().length,
      payrollRuns: this.getPayrollRuns().length,
      budgets: this.getBudgets().length,
      employeeLoans: this.getEmployeeLoans().length,
      supplierDebts: this.getSupplierDebts().length,
      purchaseOrders: this.getPurchaseOrders().length,
      taxComponents: this.getTaxComponents().length,
      taxPayments: this.getTaxPayments().length,
      debtRecords: this.getDebtRecords().length,
    };
  }
}
