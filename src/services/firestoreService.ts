import {
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  handleFirestoreError,
  limit,
  onSnapshot,
  OperationType,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from '../lib/firebase';
import {
  ChartOfAccount,
  CompanyProfile,
  Employee,
  EmployeeLoan,
  GoogleSheetsConfig,
  LiveActivity,
  PayrollRun,
  PurchaseOrder,
  Store,
  StoreBudget,
  SupplierDebt,
  TaxComponent,
  TaxPaymentRecord,
  Transaction,
  User,
  MDRRateSetting,
  BookPeriodConfig,
  BookClosingHistory,
  DebtRecord,
} from '../types';
import { StorageService } from './storageService';

/**
 * Daftar nama koleksi (collections) di Cloud Firestore
 */
export const FIRESTORE_COLLECTIONS = {
  STORES: 'stores',
  USERS: 'users',
  COA: 'chart_of_accounts',
  TRANSACTIONS: 'transactions',
  EMPLOYEES: 'employees',
  PAYROLL: 'payroll_runs',
  BUDGETS: 'budgets',
  COMPANY_PROFILE: 'company_profile',
  EMPLOYEE_LOANS: 'employee_loans',
  SUPPLIER_DEBTS: 'supplier_debts',
  PURCHASE_ORDERS: 'purchase_orders',
  TAX_COMPONENTS: 'tax_components',
  TAX_PAYMENTS: 'tax_payments',
  APP_SETTINGS: 'app_settings',
  LIVE_ACTIVITIES: 'live_activities',
  BOOK_PERIOD: 'book_period_config',
  BOOK_CLOSINGS: 'book_closing_history',
  DEBT_RECORDS: 'debt_records',
} as const;

/**
 * Service Firestore Modular (Firebase SDK v10+)
 * Menangani penyimpanan, pembaruan, penghapusan, dan listener real-time (onSnapshot)
 */
export class FirestoreService {
  // =========================================================================
  // 2. FUNGSI UNTUK MENYIMPAN / MENGUBAH / MENGHAPUS DATA KE FIRESTORE
  // =========================================================================

  /**
   * Menyimpan atau memperbarui dokumen ke Firestore collection secara generik
   */
  static async saveDocument<T extends Record<string, any>>(
    collectionName: string,
    docId: string,
    data: T
  ): Promise<void> {
    const docPath = `${collectionName}/${docId}`;
    try {
      const docRef = doc(db, collectionName, docId);
      // Clean undefined values to prevent Firestore serialization error
      const cleanedData = JSON.parse(JSON.stringify(data));
      await setDoc(docRef, cleanedData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }

  /**
   * Menghapus dokumen dari Firestore collection
   */
  static async deleteDocument(collectionName: string, docId: string): Promise<void> {
    const docPath = `${collectionName}/${docId}`;
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  }

  // --- TYPED HELPERS: TRANSAKSI KEUANGAN ---
  static async saveTransaction(trx: Transaction): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.TRANSACTIONS, trx.Transaction_ID, trx);
  }

  static async deleteTransaction(trxId: string): Promise<void> {
    await this.deleteDocument(FIRESTORE_COLLECTIONS.TRANSACTIONS, trxId);
  }

  // --- TYPED HELPERS: TOKO / CABANG ---
  static async saveStore(store: Store): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.STORES, store.Store_ID, store);
  }

  static async deleteStore(storeId: string): Promise<void> {
    await this.deleteDocument(FIRESTORE_COLLECTIONS.STORES, storeId);
  }

  // --- TYPED HELPERS: PENGGUNA / PERSONA ---
  static async saveUser(user: User): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.USERS, user.User_ID, user);
  }

  static async deleteUser(userId: string): Promise<void> {
    await this.deleteDocument(FIRESTORE_COLLECTIONS.USERS, userId);
  }

  // --- TYPED HELPERS: BAGAN AKUN (COA) ---
  static async saveCOA(coa: ChartOfAccount): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.COA, coa.Account_Code, coa);
  }

  static async deleteCOA(accountCode: string): Promise<void> {
    await this.deleteDocument(FIRESTORE_COLLECTIONS.COA, accountCode);
  }

  // --- TYPED HELPERS: KARYAWAN ---
  static async saveEmployee(emp: Employee): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.EMPLOYEES, emp.Employee_ID, emp);
  }

  static async deleteEmployee(empId: string): Promise<void> {
    await this.deleteDocument(FIRESTORE_COLLECTIONS.EMPLOYEES, empId);
  }

  // --- TYPED HELPERS: PENGGAJIAN (PAYROLL) ---
  static async savePayrollRun(run: PayrollRun): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.PAYROLL, run.Payroll_ID, run);
  }

  static async deletePayrollRun(payrollId: string): Promise<void> {
    await this.deleteDocument(FIRESTORE_COLLECTIONS.PAYROLL, payrollId);
  }

  // --- TYPED HELPERS: TARGET & ANGGARAN (BUDGET) ---
  static async saveBudget(budget: StoreBudget): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.BUDGETS, budget.Budget_ID, budget);
  }

  // --- TYPED HELPERS: PROFIL PERUSAHAAN ---
  static async saveCompanyProfile(profile: CompanyProfile): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.COMPANY_PROFILE, 'current', profile);
  }

  // --- TYPED HELPERS: PINJAMAN KARYAWAN ---
  static async saveEmployeeLoan(loan: EmployeeLoan): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.EMPLOYEE_LOANS, loan.Loan_ID, loan);
  }

  static async deleteEmployeeLoan(loanId: string): Promise<void> {
    await this.deleteDocument(FIRESTORE_COLLECTIONS.EMPLOYEE_LOANS, loanId);
  }

  // --- TYPED HELPERS: HUTANG SUPPLIER ---
  static async saveSupplierDebt(debt: SupplierDebt): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.SUPPLIER_DEBTS, debt.Debt_ID, debt);
  }

  static async deleteSupplierDebt(debtId: string): Promise<void> {
    await this.deleteDocument(FIRESTORE_COLLECTIONS.SUPPLIER_DEBTS, debtId);
  }

  // --- TYPED HELPERS: PURCHASE ORDER (PO) ---
  static async savePurchaseOrder(po: PurchaseOrder): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.PURCHASE_ORDERS, po.PO_ID, po);
  }

  static async deletePurchaseOrder(poId: string): Promise<void> {
    await this.deleteDocument(FIRESTORE_COLLECTIONS.PURCHASE_ORDERS, poId);
  }

  // --- TYPED HELPERS: KOMPONEN PAJAK ---
  static async saveTaxComponent(comp: TaxComponent): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.TAX_COMPONENTS, comp.id, comp);
  }

  static async deleteTaxComponent(compId: string): Promise<void> {
    await this.deleteDocument(FIRESTORE_COLLECTIONS.TAX_COMPONENTS, compId);
  }

  // --- TYPED HELPERS: SETORAN PAJAK (NTPN / BILLING) ---
  static async saveTaxPayment(payment: TaxPaymentRecord): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.TAX_PAYMENTS, payment.id, payment);
  }

  static async deleteTaxPayment(paymentId: string): Promise<void> {
    await this.deleteDocument(FIRESTORE_COLLECTIONS.TAX_PAYMENTS, paymentId);
  }

  // --- TYPED HELPERS: PENGATURAN APLIKASI (GOOGLE SHEETS CONFIG) ---
  static async saveSheetsConfig(cfg: GoogleSheetsConfig): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.APP_SETTINGS, 'sheets_config', cfg);
  }

  static subscribeSheetsConfig(onData: (cfg: GoogleSheetsConfig | null) => void): () => void {
    return this.subscribeDocument<GoogleSheetsConfig>(
      FIRESTORE_COLLECTIONS.APP_SETTINGS,
      'sheets_config',
      onData
    );
  }

  // --- TYPED HELPERS: TARIF MDR NON-TUNAI ---
  static async saveMDRSettings(settings: MDRRateSetting[]): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.APP_SETTINGS, 'mdr_rates', {
      items: settings,
      updatedAt: new Date().toISOString(),
    });
  }

  static subscribeMDRSettings(onData: (settings: MDRRateSetting[] | null) => void): () => void {
    return this.subscribeDocument<{ items: MDRRateSetting[] }>(
      FIRESTORE_COLLECTIONS.APP_SETTINGS,
      'mdr_rates',
      (data) => {
        if (data && Array.isArray(data.items)) {
          onData(data.items);
        } else {
          onData(null);
        }
      }
    );
  }

  // --- TYPED HELPERS: BUKA BUKU & TUTUP BUKU (BOOK CLOSING) ---
  static async saveBookPeriodConfig(config: BookPeriodConfig): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.APP_SETTINGS, 'book_period', config);
  }

  static subscribeBookPeriodConfig(onData: (config: BookPeriodConfig | null) => void): () => void {
    return this.subscribeDocument<BookPeriodConfig>(
      FIRESTORE_COLLECTIONS.APP_SETTINGS,
      'book_period',
      onData
    );
  }

  static async saveBookClosing(record: BookClosingHistory): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.BOOK_CLOSINGS, record.id, record);
  }

  static async deleteBookClosing(id: string): Promise<void> {
    await this.deleteDocument(FIRESTORE_COLLECTIONS.BOOK_CLOSINGS, id);
  }

  static subscribeBookClosingHistory(onData: (history: BookClosingHistory[]) => void): () => void {
    return this.subscribeCollection<BookClosingHistory>(
      FIRESTORE_COLLECTIONS.BOOK_CLOSINGS,
      onData
    );
  }

  // --- TYPED HELPERS: MANAJEMEN HUTANG & CICILAN ---
  static async saveDebtRecord(debt: DebtRecord): Promise<void> {
    await this.saveDocument(FIRESTORE_COLLECTIONS.DEBT_RECORDS, debt.Debt_ID, debt);
  }

  static async deleteDebtRecord(debtId: string): Promise<void> {
    await this.deleteDocument(FIRESTORE_COLLECTIONS.DEBT_RECORDS, debtId);
  }

  static subscribeDebtRecords(onData: (debts: DebtRecord[]) => void): () => void {
    return this.subscribeCollection<DebtRecord>(
      FIRESTORE_COLLECTIONS.DEBT_RECORDS,
      onData
    );
  }

  // --- SINKRONISASI MENYELURUH (SAVE ALL TO CLOUD FIRESTORE) ---
  /**
   * Menyimpan dan menyinkronkan seluruh dataset lokal saat ini ke Cloud Firestore
   */
  static async syncAllLocalToFirestore(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const stores = StorageService.getStores();
      const users = StorageService.getUsers();
      const coa = StorageService.getCOA();
      const transactions = StorageService.getTransactions();
      const employees = StorageService.getEmployees();
      const payrollRuns = StorageService.getPayrollRuns();
      const budgets = StorageService.getBudgets();
      const companyProfile = StorageService.getCompanyProfile();
      const loans = StorageService.getEmployeeLoans();
      const debts = StorageService.getSupplierDebts();
      const pos = StorageService.getPurchaseOrders();
      const taxComps = StorageService.getTaxComponents();
      const taxPayments = StorageService.getTaxPayments();
      const debtRecords = StorageService.getDebtRecords();

      let totalSynced = 0;

      const saveBatch = async (items: any[], colName: string, idKey: string) => {
        if (!items || items.length === 0) return;
        const batch = writeBatch(db);
        let batchCount = 0;
        for (const item of items) {
          const id = String(item[idKey]);
          const docRef = doc(db, colName, id);
          batch.set(docRef, JSON.parse(JSON.stringify(item)), { merge: true });
          batchCount++;
          totalSynced++;
          if (batchCount >= 450) {
            await batch.commit();
            batchCount = 0;
          }
        }
        if (batchCount > 0) {
          await batch.commit();
        }
      };

      await Promise.all([
        saveBatch(stores, FIRESTORE_COLLECTIONS.STORES, 'Store_ID'),
        saveBatch(users, FIRESTORE_COLLECTIONS.USERS, 'User_ID'),
        saveBatch(coa, FIRESTORE_COLLECTIONS.COA, 'Account_Code'),
        saveBatch(transactions, FIRESTORE_COLLECTIONS.TRANSACTIONS, 'Transaction_ID'),
        saveBatch(employees, FIRESTORE_COLLECTIONS.EMPLOYEES, 'Employee_ID'),
        saveBatch(payrollRuns, FIRESTORE_COLLECTIONS.PAYROLL, 'Payroll_ID'),
        saveBatch(budgets, FIRESTORE_COLLECTIONS.BUDGETS, 'Budget_ID'),
        saveBatch(loans, FIRESTORE_COLLECTIONS.EMPLOYEE_LOANS, 'Loan_ID'),
        saveBatch(debts, FIRESTORE_COLLECTIONS.SUPPLIER_DEBTS, 'Debt_ID'),
        saveBatch(pos, FIRESTORE_COLLECTIONS.PURCHASE_ORDERS, 'PO_ID'),
        saveBatch(taxComps, FIRESTORE_COLLECTIONS.TAX_COMPONENTS, 'id'),
        saveBatch(taxPayments, FIRESTORE_COLLECTIONS.TAX_PAYMENTS, 'id'),
        saveBatch(debtRecords, FIRESTORE_COLLECTIONS.DEBT_RECORDS, 'Debt_ID'),
      ]);

      if (companyProfile) {
        await this.saveCompanyProfile(companyProfile);
        totalSynced++;
      }

      return { success: true, count: totalSynced };
    } catch (err: any) {
      console.error('[Firestore] Error syncAllLocalToFirestore:', err);
      return { success: false, count: 0, error: err.message || 'Gagal sinkronisasi' };
    }
  }

  // --- TYPED HELPERS: AKTIVITAS REAL-TIME ANTAR PERANGKAT ---
  static async recordLiveActivity(
    activity: Omit<LiveActivity, 'id' | 'timestamp' | 'actorDeviceId'>
  ): Promise<void> {
    const id = `ACT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullActivity: LiveActivity = {
      ...activity,
      id,
      timestamp: new Date().toISOString(),
      actorDeviceId: StorageService.getDeviceId(),
    };
    await this.saveDocument(FIRESTORE_COLLECTIONS.LIVE_ACTIVITIES, id, fullActivity);
  }

  static subscribeLiveActivities(
    onData: (activities: LiveActivity[]) => void,
    limitCount: number = 30
  ): () => void {
    const colRef = collection(db, FIRESTORE_COLLECTIONS.LIVE_ACTIVITIES);
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(limitCount));

    return onSnapshot(
      q,
      (snapshot) => {
        const items: LiveActivity[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as LiveActivity);
        });
        onData(items);
      },
      (error) => {
        console.warn('Firestore onSnapshot live_activities error:', error.message);
      }
    );
  }

  // =========================================================================
  // 3. FUNGSI LISTENER onSnapshot (REAL-TIME UPDATE ANTAR PERANGKAT)
  // =========================================================================

  /**
   * Berlangganan (subscribe) pembaruan real-time pada suatu koleksi Firestore.
   * Callback `onData` akan dipanggil setiap kali ada data baru, diubah, atau dihapus
   * dari perangkat manapun tanpa perlu refresh halaman.
   */
  static subscribeCollection<T>(
    collectionName: string,
    onData: (items: T[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const colRef = collection(db, collectionName);

    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as T);
        });
        onData(items);
      },
      (error) => {
        console.warn(`Firestore onSnapshot warning for ${collectionName}:`, error.message);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  }

  /**
   * Berlangganan (subscribe) pada single document (misal company_profile/current)
   */
  static subscribeDocument<T>(
    collectionName: string,
    docId: string,
    onData: (data: T | null) => void,
    onError?: (error: Error) => void
  ): () => void {
    const docRef = doc(db, collectionName, docId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onData(docSnap.data() as T);
        } else {
          onData(null);
        }
      },
      (error) => {
        console.warn(`Firestore onSnapshot warning for ${collectionName}/${docId}:`, error.message);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  }

  /**
   * Seed batch data awal ke Firestore jika koleksi masih kosong
   */
  static async seedIfEmpty<T extends Record<string, any>>(
    collectionName: string,
    idField: keyof T,
    initialItems: T[]
  ): Promise<void> {
    try {
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(colRef);
      if (snapshot.empty && initialItems.length > 0) {
        const batch = writeBatch(db);
        initialItems.forEach((item) => {
          const id = String(item[idField]);
          const docRef = doc(db, collectionName, id);
          batch.set(docRef, JSON.parse(JSON.stringify(item)));
        });
        await batch.commit();
        console.log(`[Firestore] Inisialisasi seeding untuk ${collectionName} selesai (${initialItems.length} dokumen).`);
      }
    } catch (err: any) {
      console.warn(`[Firestore] Seed skipped for ${collectionName}:`, err.message);
    }
  }

  /**
   * Seed single document ke Firestore jika dokumen belum ada
   */
  static async seedDocumentIfEmpty<T extends Record<string, any>>(
    collectionName: string,
    docId: string,
    initialData: T
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, JSON.parse(JSON.stringify(initialData)));
        console.log(`[Firestore] Inisialisasi dokumen ${collectionName}/${docId} selesai.`);
      }
    } catch (err: any) {
      console.warn(`[Firestore] Seed document skipped for ${collectionName}/${docId}:`, err.message);
    }
  }
}

