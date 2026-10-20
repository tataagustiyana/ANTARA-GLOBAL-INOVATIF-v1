import React, { useEffect, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { BudgetView } from './components/BudgetView';
import { CompanyProfileView } from './components/CompanyProfileView';
import { Dashboard } from './components/Dashboard';
import { EmployeeLoansView } from './components/EmployeeLoansView';
import { EmployeesView } from './components/EmployeesView';
import { FirestoreSyncModal } from './components/FirestoreSyncModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { Header } from './components/Header';
import { PayrollView } from './components/PayrollView';
import { PayslipModal } from './components/PayslipModal';
import { ProfitLossView } from './components/ProfitLossView';
import { ProofPreviewModal } from './components/ProofPreviewModal';
import { PurchaseOrdersView } from './components/PurchaseOrdersView';
import { ActiveTabType, Sidebar } from './components/Sidebar';
import { StoresCoaView } from './components/StoresCoaView';
import { SupplierDebtsView } from './components/SupplierDebtsView';
import { TaxesView } from './components/TaxesView';
import { TransactionsView } from './components/TransactionsView';
import { MdrRatesView } from './components/MdrRatesView';
import { BookClosingModal } from './components/BookClosingModal';
import { DebtManagementView } from './components/DebtManagementView';
import { DataBackupModal } from './components/DataBackupModal';
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
} from './data/initialData';
import { auth, onAuthStateChanged } from './lib/firebase';
import { FIRESTORE_COLLECTIONS, FirestoreService } from './services/firestoreService';
import { StorageService } from './services/storageService';
import {
  BookPeriodConfig,
  BookClosingHistory,
  ChartOfAccount,
  CompanyProfile,
  DebtInstallmentPayment,
  DebtRecord,
  Employee,
  EmployeeLoan,
  GoogleSheetsConfig,
  LiveActivity,
  MDRRateSetting,
  PayrollRun,
  PurchaseOrder,
  Store,
  StoreBudget,
  SupplierDebt,
  SupplierPayment,
  TaxComponent,
  TaxPaymentRecord,
  Transaction,
  TransactionStatus,
  User,
} from './types';

export default function App() {
  // Master data states
  const [stores, setStores] = useState<Store[]>(() => StorageService.getStores());
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>(() =>
    StorageService.getCOA()
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    StorageService.getTransactions()
  );
  const [employees, setEmployees] = useState<Employee[]>(() => StorageService.getEmployees());
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(() =>
    StorageService.getPayrollRuns()
  );
  const [budgets, setBudgets] = useState<StoreBudget[]>(() =>
    StorageService.getBudgets()
  );
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() =>
    StorageService.getCompanyProfile()
  );
  const [employeeLoans, setEmployeeLoans] = useState<EmployeeLoan[]>(() =>
    StorageService.getEmployeeLoans()
  );
  const [supplierDebts, setSupplierDebts] = useState<SupplierDebt[]>(() =>
    StorageService.getSupplierDebts()
  );
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() =>
    StorageService.getPurchaseOrders()
  );
  const [taxComponents, setTaxComponents] = useState<TaxComponent[]>(() =>
    StorageService.getTaxComponents()
  );
  const [taxPayments, setTaxPayments] = useState<TaxPaymentRecord[]>(() =>
    StorageService.getTaxPayments()
  );
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(() =>
    StorageService.getConfig()
  );
  const [mdrSettings, setMdrSettings] = useState<MDRRateSetting[]>(() =>
    StorageService.getMDRSettings()
  );
  const [bookPeriodConfig, setBookPeriodConfig] = useState<BookPeriodConfig>(() =>
    StorageService.getBookPeriodConfig()
  );
  const [bookClosingHistory, setBookClosingHistory] = useState<BookClosingHistory[]>(() =>
    StorageService.getBookClosingHistory()
  );
  const [debtRecords, setDebtRecords] = useState<DebtRecord[]>(() =>
    StorageService.getDebtRecords()
  );

  // Active User Persona (RBAC) & Active Store
  const [currentUser, setCurrentUser] = useState<User>(() =>
    StorageService.getActiveUser(StorageService.getUsers())
  );
  const [activeStoreId, setActiveStoreId] = useState<string>(() => {
    const active = StorageService.getActiveUser(StorageService.getUsers());
    if (active.Store_ID !== 'ALL') return active.Store_ID;
    return StorageService.getActiveStoreId();
  });

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<ActiveTabType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return (
      localStorage.getItem('nusantara_theme') === 'dark' ||
      (!('nusantara_theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);
  const [firestoreModalOpen, setFirestoreModalOpen] = useState(false);
  const [isBookClosingModalOpen, setIsBookClosingModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [liveActivities, setLiveActivities] = useState<LiveActivity[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [proofModal, setProofModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    title?: string;
    description?: string;
  }>({
    isOpen: false,
    imageUrl: '',
  });

  const [payslipModal, setPayslipModal] = useState<{
    isOpen: boolean;
    payroll: PayrollRun | null;
    employee: Employee | null;
    store: Store | null;
  }>({
    isOpen: false,
    payroll: null,
    employee: null,
    store: null,
  });

  const [directNewTrxType, setDirectNewTrxType] = useState<
    'Pemasukan' | 'Pengeluaran' | 'Transfer' | 'Transfer_Cash_To_Bank' | 'Transfer_Bank_To_Cash' | null
  >(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(
    null
  );

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Sync dark mode class on document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nusantara_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nusantara_theme', 'light');
    }
  }, [darkMode]);

  // Status koneksi sinkronisasi Cloud Firestore
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);

  // Inisialisasi seeding Firestore jika koleksi masih kosong
  useEffect(() => {
    const seedFirestore = async () => {
      try {
        await Promise.allSettled([
          FirestoreService.seedIfEmpty(FIRESTORE_COLLECTIONS.STORES, 'Store_ID', StorageService.getStores()),
          FirestoreService.seedIfEmpty(FIRESTORE_COLLECTIONS.USERS, 'User_ID', StorageService.getUsers()),
          FirestoreService.seedIfEmpty(FIRESTORE_COLLECTIONS.COA, 'Account_Code', StorageService.getCOA()),
          FirestoreService.seedIfEmpty(FIRESTORE_COLLECTIONS.TRANSACTIONS, 'Transaction_ID', StorageService.getTransactions()),
          FirestoreService.seedIfEmpty(FIRESTORE_COLLECTIONS.EMPLOYEES, 'Employee_ID', StorageService.getEmployees()),
          FirestoreService.seedIfEmpty(FIRESTORE_COLLECTIONS.PAYROLL, 'Payroll_ID', StorageService.getPayrollRuns()),
          FirestoreService.seedIfEmpty(FIRESTORE_COLLECTIONS.BUDGETS, 'Budget_ID', StorageService.getBudgets()),
          FirestoreService.seedIfEmpty(FIRESTORE_COLLECTIONS.EMPLOYEE_LOANS, 'Loan_ID', StorageService.getEmployeeLoans()),
          FirestoreService.seedIfEmpty(FIRESTORE_COLLECTIONS.SUPPLIER_DEBTS, 'Debt_ID', StorageService.getSupplierDebts()),
          FirestoreService.seedIfEmpty(FIRESTORE_COLLECTIONS.PURCHASE_ORDERS, 'PO_ID', StorageService.getPurchaseOrders()),
          FirestoreService.seedIfEmpty(FIRESTORE_COLLECTIONS.TAX_COMPONENTS, 'id', StorageService.getTaxComponents()),
          FirestoreService.seedIfEmpty(FIRESTORE_COLLECTIONS.TAX_PAYMENTS, 'id', StorageService.getTaxPayments()),
          FirestoreService.seedIfEmpty(FIRESTORE_COLLECTIONS.DEBT_RECORDS, 'Debt_ID', StorageService.getDebtRecords()),
          FirestoreService.seedDocumentIfEmpty(FIRESTORE_COLLECTIONS.COMPANY_PROFILE, 'current', StorageService.getCompanyProfile()),
          FirestoreService.seedDocumentIfEmpty(FIRESTORE_COLLECTIONS.APP_SETTINGS, 'sheets_config', StorageService.getConfig()),
          FirestoreService.seedDocumentIfEmpty(FIRESTORE_COLLECTIONS.APP_SETTINGS, 'mdr_rates', { items: StorageService.getMDRSettings() }),
          FirestoreService.seedDocumentIfEmpty(FIRESTORE_COLLECTIONS.APP_SETTINGS, 'book_period', StorageService.getBookPeriodConfig()),
        ]);
      } catch (err) {
        console.warn('Initial Firestore seeding check:', err);
      }
    };
    seedFirestore();
  }, []);

  // 3. FUNGSI LISTENER onSnapshot AGAR TAMPILAN UI OTOMATIS TER-UPDATE REAL-TIME
  useEffect(() => {
    let trxLoaded = false;
    const unsubTransactions = FirestoreService.subscribeCollection<Transaction>(
      FIRESTORE_COLLECTIONS.TRANSACTIONS,
      (items) => {
        if (!trxLoaded && items.length === 0) return;
        trxLoaded = true;
        const local = StorageService.getTransactions();
        const remoteIds = new Set(items.map((t) => t.Transaction_ID));
        const unsyncedLocals = local.filter((loc) => !remoteIds.has(loc.Transaction_ID));
        const combined = [...items, ...unsyncedLocals];
        const sorted = combined.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
        setTransactions(sorted);
        StorageService.saveTransactions(sorted);
        setIsFirestoreConnected(true);
      }
    );

    let storesLoaded = false;
    const unsubStores = FirestoreService.subscribeCollection<Store>(
      FIRESTORE_COLLECTIONS.STORES,
      (items) => {
        if (!storesLoaded && items.length === 0) return;
        storesLoaded = true;
        setStores(items);
        StorageService.saveStores(items);
        setIsFirestoreConnected(true);
      }
    );

    let usersLoaded = false;
    const unsubUsers = FirestoreService.subscribeCollection<User>(
      FIRESTORE_COLLECTIONS.USERS,
      (items) => {
        if (!usersLoaded && items.length === 0) return;
        usersLoaded = true;
        setUsers(items);
        StorageService.saveUsers(items);
        setIsFirestoreConnected(true);
      }
    );

    let coaLoaded = false;
    const unsubCoa = FirestoreService.subscribeCollection<ChartOfAccount>(
      FIRESTORE_COLLECTIONS.COA,
      (items) => {
        if (!coaLoaded && items.length === 0) return;
        coaLoaded = true;
        setChartOfAccounts(items);
        StorageService.saveCOA(items);
        setIsFirestoreConnected(true);
      }
    );

    let empLoaded = false;
    const unsubEmployees = FirestoreService.subscribeCollection<Employee>(
      FIRESTORE_COLLECTIONS.EMPLOYEES,
      (items) => {
        if (!empLoaded && items.length === 0) return;
        empLoaded = true;
        setEmployees(items);
        StorageService.saveEmployees(items);
        setIsFirestoreConnected(true);
      }
    );

    let payrollLoaded = false;
    const unsubPayroll = FirestoreService.subscribeCollection<PayrollRun>(
      FIRESTORE_COLLECTIONS.PAYROLL,
      (items) => {
        if (!payrollLoaded && items.length === 0) return;
        payrollLoaded = true;
        setPayrollRuns(items);
        StorageService.savePayrollRuns(items);
        setIsFirestoreConnected(true);
      }
    );

    let budgetsLoaded = false;
    const unsubBudgets = FirestoreService.subscribeCollection<StoreBudget>(
      FIRESTORE_COLLECTIONS.BUDGETS,
      (items) => {
        if (!budgetsLoaded && items.length === 0) return;
        budgetsLoaded = true;
        setBudgets(items);
        StorageService.saveBudgets(items);
        setIsFirestoreConnected(true);
      }
    );

    const unsubCompany = FirestoreService.subscribeDocument<CompanyProfile>(
      FIRESTORE_COLLECTIONS.COMPANY_PROFILE,
      'current',
      (profile) => {
        if (profile) {
          setCompanyProfile(profile);
          StorageService.saveCompanyProfile(profile);
          setIsFirestoreConnected(true);
        }
      }
    );

    let loansLoaded = false;
    const unsubLoans = FirestoreService.subscribeCollection<EmployeeLoan>(
      FIRESTORE_COLLECTIONS.EMPLOYEE_LOANS,
      (items) => {
        if (!loansLoaded && items.length === 0) return;
        loansLoaded = true;
        setEmployeeLoans(items);
        StorageService.saveEmployeeLoans(items);
        setIsFirestoreConnected(true);
      }
    );

    let debtsLoaded = false;
    const unsubDebts = FirestoreService.subscribeCollection<SupplierDebt>(
      FIRESTORE_COLLECTIONS.SUPPLIER_DEBTS,
      (items) => {
        if (!debtsLoaded && items.length === 0) return;
        debtsLoaded = true;
        setSupplierDebts(items);
        StorageService.saveSupplierDebts(items);
        setIsFirestoreConnected(true);
      }
    );

    let poLoaded = false;
    const unsubPO = FirestoreService.subscribeCollection<PurchaseOrder>(
      FIRESTORE_COLLECTIONS.PURCHASE_ORDERS,
      (items) => {
        if (!poLoaded && items.length === 0) return;
        poLoaded = true;
        setPurchaseOrders(items);
        StorageService.savePurchaseOrders(items);
        setIsFirestoreConnected(true);
      }
    );

    let taxCompsLoaded = false;
    const unsubTaxComps = FirestoreService.subscribeCollection<TaxComponent>(
      FIRESTORE_COLLECTIONS.TAX_COMPONENTS,
      (items) => {
        if (!taxCompsLoaded && items.length === 0) return;
        taxCompsLoaded = true;
        setTaxComponents(items);
        StorageService.saveTaxComponents(items);
        setIsFirestoreConnected(true);
      }
    );

    let taxPaymentsLoaded = false;
    const unsubTaxPayments = FirestoreService.subscribeCollection<TaxPaymentRecord>(
      FIRESTORE_COLLECTIONS.TAX_PAYMENTS,
      (items) => {
        if (!taxPaymentsLoaded && items.length === 0) return;
        taxPaymentsLoaded = true;
        setTaxPayments(items);
        StorageService.saveTaxPayments(items);
        setIsFirestoreConnected(true);
      }
    );

    // Integrasi Google Sheets Config Real-time
    const unsubSheetsConfig = FirestoreService.subscribeSheetsConfig((cfg) => {
      if (cfg) {
        setSheetsConfig(cfg);
        StorageService.saveConfig(cfg);
        setIsFirestoreConnected(true);
      }
    });

    // Integrasi Tarif MDR Real-time
    const unsubMdr = FirestoreService.subscribeMDRSettings((remoteSettings) => {
      if (remoteSettings && remoteSettings.length > 0) {
        setMdrSettings(remoteSettings);
        StorageService.saveMDRSettings(remoteSettings);
        setIsFirestoreConnected(true);
      }
    });

    // Feed Aktivitas Real-time Antar Perangkat
    let isInitialActivities = true;
    const unsubLiveActivities = FirestoreService.subscribeLiveActivities((activities) => {
      setLiveActivities(activities);
      if (isInitialActivities) {
        isInitialActivities = false;
        return;
      }
      if (activities.length > 0) {
        const latest = activities[0];
        const myDeviceId = StorageService.getDeviceId();
        if (latest.actorDeviceId && latest.actorDeviceId !== myDeviceId) {
          showToast(
            `⚡ Real-Time (${latest.userName}): ${latest.action} - ${latest.details}`,
            'info'
          );
        }
      }
    });

    // Integrasi Aturan Periode Buku (Buka Buku & Tutup Buku)
    const unsubBookPeriod = FirestoreService.subscribeBookPeriodConfig((remoteCfg) => {
      if (remoteCfg) {
        setBookPeriodConfig(remoteCfg);
        StorageService.saveBookPeriodConfig(remoteCfg);
        setIsFirestoreConnected(true);
      }
    });

    const unsubBookClosings = FirestoreService.subscribeBookClosingHistory((remoteClosings) => {
      if (remoteClosings && remoteClosings.length > 0) {
        setBookClosingHistory(remoteClosings);
        StorageService.saveBookClosingHistory(remoteClosings);
        setIsFirestoreConnected(true);
      }
    });

    let debtRecordsLoaded = false;
    const unsubDebtRecords = FirestoreService.subscribeCollection<DebtRecord>(
      FIRESTORE_COLLECTIONS.DEBT_RECORDS,
      (items) => {
        if (!debtRecordsLoaded && items.length === 0) return;
        debtRecordsLoaded = true;
        setDebtRecords(items);
        StorageService.saveDebtRecords(items);
        setIsFirestoreConnected(true);
      }
    );

    return () => {
      unsubTransactions();
      unsubStores();
      unsubUsers();
      unsubCoa();
      unsubEmployees();
      unsubPayroll();
      unsubBudgets();
      unsubCompany();
      unsubLoans();
      unsubDebts();
      unsubPO();
      unsubTaxComps();
      unsubTaxPayments();
      unsubSheetsConfig();
      unsubMdr();
      unsubLiveActivities();
      unsubBookPeriod();
      unsubBookClosings();
      unsubDebtRecords();
    };
  }, []);

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const existing = users.find(
          (u) => u.Email.toLowerCase() === (fbUser.email || '').toLowerCase()
        );
        if (existing) {
          setCurrentUser(existing);
        } else {
          const newUser: User = {
            User_ID: fbUser.uid,
            Store_ID: 'ALL',
            Full_Name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Pengguna',
            Email: fbUser.email || '',
            Role: 'Superadmin',
            Status: 'Active',
            Avatar: fbUser.photoURL || undefined,
          };
          setCurrentUser(newUser);
        }
      }
    });
    return () => unsubscribe();
  }, [users]);

  // Handle Login Success via Google / Email
  const handleUserLoginSuccess = (user: User) => {
    if (!users.some((u) => u.User_ID === user.User_ID || u.Email.toLowerCase() === user.Email.toLowerCase())) {
      const updatedUsers = [user, ...users];
      setUsers(updatedUsers);
      StorageService.saveUsers(updatedUsers);
    }
    setCurrentUser(user);
    StorageService.saveActiveUser(user);
    if (user.Store_ID !== 'ALL') {
      setActiveStoreId(user.Store_ID);
    }
    showToast(`Berhasil masuk sebagai ${user.Full_Name} (${user.Role})`, 'success');
  };

  // Handle Logout
  const handleUserLogout = () => {
    const defaultUser = users[0];
    if (defaultUser) {
      setCurrentUser(defaultUser);
      StorageService.saveActiveUser(defaultUser);
    }
    showToast('Sesi telah diakhiri. Akun telah keluar.', 'info');
  };

  // Handle Switch User (RBAC Persona Switcher)
  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    StorageService.setActiveUserId(user.User_ID);

    // If user is locked to a store (Store Manager or Employee), switch active store automatically
    if (user.Store_ID !== 'ALL') {
      setActiveStoreId(user.Store_ID);
      StorageService.setActiveStoreId(user.Store_ID);
    }

    // If user is employee, redirect to dashboard or payslip
    if (user.Role === 'Employee') {
      setActiveTab('dashboard');
    }

    showToast(`Beralih pengguna: ${user.Full_Name} (${user.Role})`, 'info');
  };

  // Handle Switch Store
  const handleSelectStore = (storeId: string) => {
    setActiveStoreId(storeId);
    StorageService.setActiveStoreId(storeId);
  };

  // Handle Refresh All Data (e.g. after Restore or Sync)
  const handleRefreshAllData = () => {
    setStores(StorageService.getStores());
    setUsers(StorageService.getUsers());
    setChartOfAccounts(StorageService.getCOA());
    setTransactions(StorageService.getTransactions());
    setEmployees(StorageService.getEmployees());
    setPayrollRuns(StorageService.getPayrollRuns());
    setBudgets(StorageService.getBudgets());
    setCompanyProfile(StorageService.getCompanyProfile());
    setEmployeeLoans(StorageService.getEmployeeLoans());
    setSupplierDebts(StorageService.getSupplierDebts());
    setPurchaseOrders(StorageService.getPurchaseOrders());
    setTaxComponents(StorageService.getTaxComponents());
    setTaxPayments(StorageService.getTaxPayments());
    setMdrSettings(StorageService.getMDRSettings());
    setBookPeriodConfig(StorageService.getBookPeriodConfig());
    setBookClosingHistory(StorageService.getBookClosingHistory());
    setDebtRecords(StorageService.getDebtRecords());
  };

  // --- Test Real-time Broadcast Ping Handler ---
  const handleSendTestPing = async () => {
    try {
      await FirestoreService.recordLiveActivity({
        userName: currentUser.Full_Name,
        userRole: currentUser.Role,
        action: 'Uji Sinyal Real-Time Multi-Perangkat',
        details: `Sinyal sinkronisasi aktif berhasil dipancarkan ke seluruh browser/device`,
        entityType: 'config',
      });
      showToast('Sinyal uji real-time berhasil dipancarkan ke seluruh perangkat!', 'success');
    } catch (err: any) {
      showToast(`Gagal mengirim sinyal: ${err.message}`, 'error');
    }
  };

  // --- Transactions Handlers ---
  const handleSaveTransaction = async (trxOrTrxs: Transaction | Transaction[]) => {
    const list = Array.isArray(trxOrTrxs) ? trxOrTrxs : [trxOrTrxs];
    if (list.length === 0) return;

    setTransactions((prev) => {
      const ids = new Set(list.map((t) => t.Transaction_ID));
      const updated = [...list, ...prev.filter((t) => !ids.has(t.Transaction_ID))];
      StorageService.saveTransactions(updated);
      return updated;
    });

    for (const trx of list) {
      // Sync real-time ke Cloud Firestore
      FirestoreService.saveTransaction(trx).catch((err) =>
        console.warn('[Firestore] Error saving transaction:', err)
      );

      // Record Live Activity real-time antar perangkat
      FirestoreService.recordLiveActivity({
        userName: currentUser.Full_Name,
        userRole: currentUser.Role,
        action: `Transaksi ${trx.Type} Disimpan`,
        details: `${trx.Transaction_ID}: Rp ${trx.Amount.toLocaleString('id-ID')} (${trx.Category})`,
        entityType: 'transaction',
        storeId: trx.Store_ID,
      }).catch(() => {});

      // If connected to Google Sheets, sync remote
      if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
        StorageService.pushToSheets(sheetsConfig.webAppUrl, {
          action: 'saveTransaction',
          payload: trx,
        }).catch((err) => console.error('Remote sync error:', err));
      }
    }

    if (list.length === 1) {
      showToast(`Transaksi ${list[0].Transaction_ID} (${list[0].Type}) berhasil disimpan.`);
    } else {
      showToast(`${list.length} transaksi (termasuk beban MDR Akun 5-111) berhasil dibukukan otomatis.`, 'success');
    }
  };

  const handleDeleteTransaction = async (trxId: string) => {
    const target = transactions.find((t) => t.Transaction_ID === trxId);
    const idsToDelete = new Set<string>([trxId]);
    if (target?.MDR_Expense_Ref) {
      idsToDelete.add(target.MDR_Expense_Ref);
    }
    transactions.forEach((t) => {
      if (t.MDR_Expense_Ref === trxId) {
        idsToDelete.add(t.Transaction_ID);
      }
    });

    setTransactions((prev) => {
      const updated = prev.filter((t) => !idsToDelete.has(t.Transaction_ID));
      StorageService.saveTransactions(updated);
      return updated;
    });

    idsToDelete.forEach((id) => {
      // Sync real-time ke Cloud Firestore
      FirestoreService.deleteTransaction(id).catch((err) =>
        console.warn('[Firestore] Error deleting transaction:', err)
      );

      // Record Live Activity
      FirestoreService.recordLiveActivity({
        userName: currentUser.Full_Name,
        userRole: currentUser.Role,
        action: 'Transaksi Dihapus',
        details: `ID Transaksi: ${id}`,
        entityType: 'transaction',
      }).catch(() => {});

      if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
        StorageService.pushToSheets(sheetsConfig.webAppUrl, {
          action: 'deleteTransaction',
          payload: { Transaction_ID: id },
        }).catch((err) => console.error('Remote sync error:', err));
      }
    });

    if (idsToDelete.size > 1) {
      showToast(`Transaksi ${trxId} dan komponen MDR terkait (Akun 5-111) telah dihapus.`, 'info');
    } else {
      showToast(`Transaksi ${trxId} telah dihapus.`, 'info');
    }
  };

  const handleUpdateTransactionStatus = async (trxId: string, status: TransactionStatus) => {
    const updated = transactions.map((t) =>
      t.Transaction_ID === trxId ? { ...t, Status: status } : t
    );
    setTransactions(updated);
    StorageService.saveTransactions(updated);

    const changed = updated.find((t) => t.Transaction_ID === trxId);
    if (changed) {
      FirestoreService.saveTransaction(changed).catch((err) =>
        console.warn('[Firestore] Error updating transaction status:', err)
      );
    }
    if (changed && sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'saveTransaction',
        payload: changed,
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(`Status transaksi ${trxId} diubah menjadi ${status}.`);
  };

  // --- Payroll Handlers & Automatic Expense Transaction Integration ---
  const handleSavePayrollRun = async (run: PayrollRun) => {
    const updated = [run, ...payrollRuns.filter((p) => p.Payroll_ID !== run.Payroll_ID)];
    setPayrollRuns(updated);
    StorageService.savePayrollRuns(updated);

    FirestoreService.savePayrollRun(run).catch((err) =>
      console.warn('[Firestore] Error saving payroll:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'savePayrollRun',
        payload: run,
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(`Data payroll ${run.Payroll_ID} berhasil disimpan.`);
  };

  const handleDeletePayrollRun = async (payrollId: string) => {
    const updated = payrollRuns.filter((p) => p.Payroll_ID !== payrollId);
    setPayrollRuns(updated);
    StorageService.savePayrollRuns(updated);

    FirestoreService.deletePayrollRun(payrollId).catch((err) =>
      console.warn('[Firestore] Error deleting payroll:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'deletePayrollRun',
        payload: { Payroll_ID: payrollId },
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(`Slip payroll ${payrollId} berhasil dihapus.`, 'info');
  };

  const handleApprovePayroll = async (run: PayrollRun, createExpense: boolean = true) => {
    // 1. Update Payroll Run
    const updatedPayrollRuns = payrollRuns.map((p) =>
      p.Payroll_ID === run.Payroll_ID ? run : p
    );
    setPayrollRuns(updatedPayrollRuns);
    StorageService.savePayrollRuns(updatedPayrollRuns);

    FirestoreService.savePayrollRun(run).catch((err) =>
      console.warn('[Firestore] Error saving payroll run:', err)
    );

    // 2. CRITICAL: Automatically record Expense transaction in Transactions table
    let newTrx: Transaction | null = null;
    if (createExpense) {
      const emp = employees.find((e) => e.Employee_ID === run.Employee_ID);
      newTrx = StorageService.createPayrollExpenseTransaction(
        run,
        emp,
        currentUser.Full_Name
      );

      const updatedTrx = [newTrx, ...transactions];
      setTransactions(updatedTrx);
      StorageService.saveTransactions(updatedTrx);

      FirestoreService.saveTransaction(newTrx).catch((err) =>
        console.warn('[Firestore] Error saving payroll expense transaction:', err)
      );
    }

    // 3. KONEKSIKAN KASBON / PINJAMAN KARYAWAN PADA AKUN 5-101
    const kasbonAmount = run.Deductions_Breakdown?.kasbon || 0;
    if (kasbonAmount > 0) {
      const activeLoan = employeeLoans.find(
        (l) => l.Employee_ID === run.Employee_ID && l.Status === 'Active' && l.Remaining_Balance > 0
      );
      if (activeLoan) {
        const newPaid = activeLoan.Paid_Amount + kasbonAmount;
        const newRemaining = Math.max(0, activeLoan.Total_Amount - newPaid);
        const updatedLoan: EmployeeLoan = {
          ...activeLoan,
          Paid_Amount: newPaid,
          Remaining_Balance: newRemaining,
          Status: newRemaining === 0 ? 'Paid_Off' : 'Active',
          Repayments: [
            ...(activeLoan.Repayments || []),
            {
              Repayment_ID: `REP-PAY-${run.Payroll_ID.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`,
              Date: run.Payment_Date || new Date().toISOString().split('T')[0],
              Amount: kasbonAmount,
              Notes: `Dipotong otomatis via Slip Gaji ${run.Payroll_ID} Periode ${run.Period_Month}/${run.Period_Year} (Akun 5-101 Beban Gaji & Kasbon)`,
              Created_By: currentUser.Full_Name,
            },
          ],
        };

        const updatedLoans = employeeLoans.map((l) =>
          l.Loan_ID === updatedLoan.Loan_ID ? updatedLoan : l
        );
        setEmployeeLoans(updatedLoans);
        StorageService.saveEmployeeLoans(updatedLoans);
        FirestoreService.saveEmployeeLoan(updatedLoan).catch((err) =>
          console.warn('[Firestore] Error updating employee loan from payroll:', err)
        );
      }
    }

    // 4. Remote Sync via Google Apps Script (calls action=approvePayroll)
    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'approvePayroll',
        payload: {
          payrollRun: run,
          createExpenseTransaction: createExpense,
          transaction: newTrx,
        },
      }).catch((err) => console.error('Remote sync error:', err));
    }

    const empName = employees.find((e) => e.Employee_ID === run.Employee_ID)?.Full_Name;
    showToast(
      `Gaji ${empName || run.Employee_ID} berhasil dibayar & beban pengeluaran (termasuk potongan Kasbon Akun 5-101) otomatis dicatat di Keuangan!`,
      'success'
    );
  };

  // --- Employees Handlers ---
  const handleSaveEmployee = async (emp: Employee) => {
    const updated = [emp, ...employees.filter((e) => e.Employee_ID !== emp.Employee_ID)];
    setEmployees(updated);
    StorageService.saveEmployees(updated);

    FirestoreService.saveEmployee(emp).catch((err) =>
      console.warn('[Firestore] Error saving employee:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'saveEmployee',
        payload: emp,
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(`Karyawan ${emp.Full_Name} (${emp.Employee_ID}) disimpan.`);
  };

  const handleDeleteEmployee = async (empId: string) => {
    const updated = employees.filter((e) => e.Employee_ID !== empId);
    setEmployees(updated);
    StorageService.saveEmployees(updated);

    FirestoreService.deleteEmployee(empId).catch((err) =>
      console.warn('[Firestore] Error deleting employee:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'deleteEmployee',
        payload: { Employee_ID: empId },
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(`Karyawan ${empId} telah dihapus.`, 'info');
  };

  // --- Stores & COA Handlers ---
  const handleSaveStore = async (store: Store) => {
    const exists = stores.some((s) => s.Store_ID === store.Store_ID);
    const updated = exists
      ? stores.map((s) => (s.Store_ID === store.Store_ID ? store : s))
      : [...stores, store];

    setStores(updated);
    StorageService.saveStores(updated);

    FirestoreService.saveStore(store).catch((err) =>
      console.warn('[Firestore] Error saving store:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'saveStore',
        payload: store,
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(
      `Cabang toko ${store.Store_Name} (${store.Store_ID}) berhasil ${
        exists ? 'diperbarui' : 'ditambahkan'
      }.`
    );
  };

  const handleDeleteStore = async (storeId: string) => {
    if (stores.length <= 1) {
      showToast('Minimal harus ada satu cabang toko aktif di sistem.', 'error');
      return;
    }

    const targetStore = stores.find((s) => s.Store_ID === storeId);
    const updated = stores.filter((s) => s.Store_ID !== storeId);
    setStores(updated);
    StorageService.saveStores(updated);

    FirestoreService.deleteStore(storeId).catch((err) =>
      console.warn('[Firestore] Error deleting store:', err)
    );

    // If the active store in selector was the deleted one, switch to 'ALL'
    if (activeStoreId === storeId) {
      setActiveStoreId('ALL');
      StorageService.setActiveStoreId('ALL');
    }

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'deleteStore',
        payload: { Store_ID: storeId },
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(`Cabang toko ${targetStore?.Store_Name || storeId} telah dihapus.`, 'info');
  };

  const handleSaveCoa = async (coa: ChartOfAccount) => {
    const exists = chartOfAccounts.some((c) => c.Account_Code === coa.Account_Code);
    const updated = exists
      ? chartOfAccounts.map((c) => (c.Account_Code === coa.Account_Code ? coa : c))
      : [...chartOfAccounts, coa];

    setChartOfAccounts(updated);
    StorageService.saveCOA(updated);

    FirestoreService.saveCOA(coa).catch((err) =>
      console.warn('[Firestore] Error saving COA:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'saveCoa',
        payload: coa,
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(`Akun ${coa.Account_Code} - ${coa.Account_Name} berhasil ${exists ? 'diperbarui' : 'disimpan'}.`);
  };

  const handleDeleteCoa = async (accountCode: string) => {
    const updated = chartOfAccounts.filter((c) => c.Account_Code !== accountCode);
    setChartOfAccounts(updated);
    StorageService.saveCOA(updated);

    FirestoreService.deleteCOA(accountCode).catch((err) =>
      console.warn('[Firestore] Error deleting COA:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'deleteCoa',
        payload: { Account_Code: accountCode },
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(`Akun ${accountCode} telah dihapus.`, 'info');
  };

  // --- User RBAC Handlers ---
  const handleSaveUser = async (user: User) => {
    const exists = users.some((u) => u.User_ID === user.User_ID);
    const updated = exists
      ? users.map((u) => (u.User_ID === user.User_ID ? user : u))
      : [...users, user];

    setUsers(updated);
    StorageService.saveUsers(updated);

    FirestoreService.saveUser(user).catch((err) =>
      console.warn('[Firestore] Error saving user:', err)
    );

    // If edited user is the current active session, update it
    if (currentUser.User_ID === user.User_ID) {
      setCurrentUser(user);
      if (user.Store_ID !== 'ALL') {
        setActiveStoreId(user.Store_ID);
        StorageService.setActiveStoreId(user.Store_ID);
      }
    }

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'saveUser',
        payload: user,
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(
      `Pengguna ${user.Full_Name} (${user.Role}) berhasil ${
        exists ? 'diperbarui' : 'ditambahkan'
      }.`
    );
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser.User_ID) {
      showToast('Tidak dapat menghapus akun yang sedang Anda gunakan saat ini.', 'error');
      return;
    }

    if (users.length <= 1) {
      showToast('Minimal harus ada satu pengguna dalam sistem.', 'error');
      return;
    }

    const targetUser = users.find((u) => u.User_ID === userId);
    // Protect against deleting the only superadmin
    if (targetUser?.Role === 'Superadmin') {
      const superadminCount = users.filter((u) => u.Role === 'Superadmin').length;
      if (superadminCount <= 1) {
        showToast('Tidak dapat menghapus satu-satunya akun Superadmin di sistem.', 'error');
        return;
      }
    }

    const updated = users.filter((u) => u.User_ID !== userId);
    setUsers(updated);
    StorageService.saveUsers(updated);

    FirestoreService.deleteUser(userId).catch((err) =>
      console.warn('[Firestore] Error deleting user:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'deleteUser',
        payload: { User_ID: userId },
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(`Pengguna ${targetUser?.Full_Name || userId} telah dihapus.`, 'info');
  };

  // --- Budget & Targets Handlers ---
  const handleSaveBudget = async (budget: StoreBudget) => {
    const exists = budgets.some((b) => b.Budget_ID === budget.Budget_ID);
    const updated = exists
      ? budgets.map((b) => (b.Budget_ID === budget.Budget_ID ? budget : b))
      : [budget, ...budgets];
    setBudgets(updated);
    StorageService.saveBudgets(updated);

    FirestoreService.saveBudget(budget).catch((err) =>
      console.warn('[Firestore] Error saving budget:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'saveBudget',
        payload: budget,
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(
      `Target omset & pagu anggaran cabang ${budget.Store_ID} periode ${budget.Period_Month}/${budget.Period_Year} berhasil disimpan.`
    );
  };

  // --- Company Profile Handlers ---
  const handleSaveCompanyProfile = async (profile: CompanyProfile) => {
    setCompanyProfile(profile);
    StorageService.saveCompanyProfile(profile);

    FirestoreService.saveCompanyProfile(profile).catch((err) =>
      console.warn('[Firestore] Error saving company profile:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'saveCompanyProfile',
        payload: profile,
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(`Profil & logo perusahaan (${profile.brandName}) berhasil diperbarui!`, 'success');
  };

  // --- Employee Loans Handlers ---
  const handleSaveLoan = async (loan: EmployeeLoan) => {
    const exists = employeeLoans.some((l) => l.Loan_ID === loan.Loan_ID);
    const updated = exists
      ? employeeLoans.map((l) => (l.Loan_ID === loan.Loan_ID ? loan : l))
      : [loan, ...employeeLoans];
    setEmployeeLoans(updated);
    StorageService.saveEmployeeLoans(updated);

    FirestoreService.saveEmployeeLoan(loan).catch((err) =>
      console.warn('[Firestore] Error saving employee loan:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'saveEmployeeLoan',
        payload: loan,
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(`Pinjaman ${loan.Loan_ID} (${loan.Employee_Name}) berhasil disimpan.`);
  };

  const handleDeleteLoan = async (loanId: string) => {
    const updated = employeeLoans.filter((l) => l.Loan_ID !== loanId);
    setEmployeeLoans(updated);
    StorageService.saveEmployeeLoans(updated);

    FirestoreService.deleteEmployeeLoan(loanId).catch((err) =>
      console.warn('[Firestore] Error deleting employee loan:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'deleteEmployeeLoan',
        payload: { Loan_ID: loanId },
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(`Pinjaman ${loanId} telah dihapus.`, 'info');
  };

  // --- Supplier Debts Handlers ---
  const handleSaveDebt = async (debt: SupplierDebt) => {
    const exists = supplierDebts.some((d) => d.Debt_ID === debt.Debt_ID);
    const updated = exists
      ? supplierDebts.map((d) => (d.Debt_ID === debt.Debt_ID ? debt : d))
      : [debt, ...supplierDebts];
    setSupplierDebts(updated);
    StorageService.saveSupplierDebts(updated);

    FirestoreService.saveSupplierDebt(debt).catch((err) =>
      console.warn('[Firestore] Error saving supplier debt:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'saveSupplierDebt',
        payload: debt,
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(`Data tagihan ${debt.Supplier_Name} (${debt.Invoice_Number}) berhasil disimpan.`);
  };

  const handleDeleteDebt = async (debtId: string) => {
    const updated = supplierDebts.filter((d) => d.Debt_ID !== debtId);
    setSupplierDebts(updated);
    StorageService.saveSupplierDebts(updated);

    FirestoreService.deleteSupplierDebt(debtId).catch((err) =>
      console.warn('[Firestore] Error deleting supplier debt:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'deleteSupplierDebt',
        payload: { Debt_ID: debtId },
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(`Tagihan hutang ${debtId} telah dihapus.`, 'info');
  };

  const handleRecordDebtPayment = async (
    debt: SupplierDebt,
    payment: SupplierPayment,
    createExpense: boolean
  ) => {
    const currentPayments = debt.Payments || [];
    const newPayments = [...currentPayments, payment];
    const totalPaid = newPayments.reduce((sum, p) => sum + p.Amount, 0);
    const remaining = Math.max(0, debt.Total_Amount - totalPaid);
    const newStatus = remaining === 0 ? 'Paid' : 'Partial';

    const updatedDebt: SupplierDebt = {
      ...debt,
      Paid_Amount: totalPaid,
      Remaining_Balance: remaining,
      Status: newStatus,
      Payments: newPayments,
    };

    await handleSaveDebt(updatedDebt);

    // If requested, also record an Expense transaction in the accounting ledger
    if (createExpense) {
      const dateNow = new Date();
      const monthStr = String(dateNow.getMonth() + 1).padStart(2, '0');
      const newTrx: Transaction = {
        Transaction_ID: `TRX-${dateNow.getFullYear()}${monthStr}-DEBT-${payment.Payment_ID.slice(-4)}`,
        Date: payment.Date || dateNow.toISOString().split('T')[0],
        Store_ID: debt.Store_ID,
        Type: 'Pengeluaran',
        Category: payment.COA_Account || debt.COA_Account || '2-101 - Hutang Dagang Supplier',
        Amount: payment.Amount,
        Payment_Method: (payment.Payment_Method as any) || 'Bank Transfer',
        Description: `Pembayaran Tagihan Supplier: ${debt.Supplier_Name} (Faktur: ${debt.Invoice_Number}) - ${payment.Notes || ''}`.trim(),
        Proof_Attachment_URL: payment.Proof_URL || '',
        Created_By: currentUser.Full_Name,
        Status: 'Approved',
      };
      await handleSaveTransaction(newTrx);
    }

    showToast(
      `Pembayaran Rp ${payment.Amount.toLocaleString('id-ID')} untuk tagihan ${debt.Invoice_Number} berhasil dicatat!`
    );
  };

  // --- Manajemen Hutang & Cicilan Handlers ---
  const handleSaveDebtRecord = async (debt: DebtRecord) => {
    const exists = debtRecords.some((d) => d.Debt_ID === debt.Debt_ID);
    const updated = exists
      ? debtRecords.map((d) => (d.Debt_ID === debt.Debt_ID ? debt : d))
      : [debt, ...debtRecords];
    setDebtRecords(updated);
    StorageService.saveDebtRecords(updated);

    FirestoreService.saveDebtRecord(debt).catch((err) =>
      console.warn('[Firestore] Error saving debt record:', err)
    );

    showToast(`Data hutang ${debt.Creditor_Name} (${debt.Debt_ID}) berhasil disimpan.`);
  };

  const handleDeleteDebtRecord = async (debtId: string) => {
    const updated = debtRecords.filter((d) => d.Debt_ID !== debtId);
    setDebtRecords(updated);
    StorageService.saveDebtRecords(updated);

    FirestoreService.deleteDebtRecord(debtId).catch((err) =>
      console.warn('[Firestore] Error deleting debt record:', err)
    );

    showToast(`Data hutang ${debtId} telah dihapus.`, 'info');
  };

  const handleRecordDebtInstallmentPayment = async (
    debt: DebtRecord,
    payment: DebtInstallmentPayment,
    createExpenseTrx: boolean
  ) => {
    // 1. Simpan pembaruan hutang
    await handleSaveDebtRecord(debt);

    // 2. Terbitkan transaksi pengeluaran keuangan jika dicentang
    if (createExpenseTrx) {
      const expTrx = StorageService.createDebtPaymentExpenseTransaction(
        debt,
        payment,
        debt.Store_ID,
        currentUser.Full_Name
      );
      if (payment.COA_Account) {
        expTrx.Category = payment.COA_Account;
      }
      await handleSaveTransaction(expTrx);
    }

    showToast(
      `Pembayaran cicilan #${payment.Installment_Number} Rp ${(payment.Total_Paid || payment.Amount).toLocaleString('id-ID')} untuk ${debt.Creditor_Name} berhasil dicatat!`
    );
  };

  const handleDeleteDebtInstallmentPayment = async (debt: DebtRecord, paymentId: string) => {
    const currentPayments = debt.Payments || [];
    const removedPayment = currentPayments.find((p) => p.Payment_ID === paymentId);
    const newPayments = currentPayments.filter((p) => p.Payment_ID !== paymentId);
    const newPaidTotal = newPayments.reduce((sum, p) => sum + p.Amount, 0);
    const newRemaining = Math.max(0, debt.Total_Amount - newPaidTotal);
    let newStatus: DebtRecord['Status'] = 'Unpaid';
    if (newRemaining === 0) newStatus = 'Paid';
    else if (newPaidTotal > 0) newStatus = 'Partial';
    if (newRemaining > 0 && debt.Due_Date < new Date().toISOString().split('T')[0]) newStatus = 'Overdue';

    const updatedDebt: DebtRecord = {
      ...debt,
      Paid_Amount: newPaidTotal,
      Remaining_Balance: newRemaining,
      Status: newStatus,
      Payments: newPayments,
    };

    await handleSaveDebtRecord(updatedDebt);

    // Hapus juga transaksi keuangan terkait jika ada
    if (removedPayment?.Transaction_ID) {
      await handleDeleteTransaction(removedPayment.Transaction_ID);
    }

    showToast(`Catatan pembayaran cicilan ${paymentId} telah dihapus.`, 'info');
  };

  // --- Purchase Orders Handlers ---
  const handleSavePO = async (po: PurchaseOrder) => {
    const exists = purchaseOrders.some((p) => p.PO_ID === po.PO_ID);
    const updated = exists
      ? purchaseOrders.map((p) => (p.PO_ID === po.PO_ID ? po : p))
      : [po, ...purchaseOrders];
    setPurchaseOrders(updated);
    StorageService.savePurchaseOrders(updated);

    FirestoreService.savePurchaseOrder(po).catch((err) =>
      console.warn('[Firestore] Error saving purchase order:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'savePurchaseOrder',
        payload: po,
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(`Purchase Order ${po.PO_Number} (${po.Supplier_Name}) berhasil disimpan.`);
  };

  const handleDeletePO = async (poId: string) => {
    const updated = purchaseOrders.filter((p) => p.PO_ID !== poId);
    setPurchaseOrders(updated);
    StorageService.savePurchaseOrders(updated);

    FirestoreService.deletePurchaseOrder(poId).catch((err) =>
      console.warn('[Firestore] Error deleting purchase order:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'deletePurchaseOrder',
        payload: { PO_ID: poId },
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(`Purchase Order ${poId} telah dihapus.`, 'info');
  };

  const handleConvertToDebt = async (debt: SupplierDebt) => {
    await handleSaveDebt(debt);
    showToast(`PO berhasil dikonversi menjadi Tagihan Hutang Supplier (${debt.Invoice_Number})!`);
  };

  // --- Tax Management Handlers ---
  const handleSaveTaxComponent = (comp: TaxComponent) => {
    const exists = taxComponents.some((c) => c.id === comp.id);
    const updated = exists
      ? taxComponents.map((c) => (c.id === comp.id ? comp : c))
      : [...taxComponents, comp];
    setTaxComponents(updated);
    StorageService.saveTaxComponents(updated);

    FirestoreService.saveTaxComponent(comp).catch((err) =>
      console.warn('[Firestore] Error saving tax component:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'saveTaxComponent',
        payload: comp,
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(`Komponen pajak ${comp.code} (${comp.name}) berhasil disimpan.`);
  };

  const handleDeleteTaxComponent = (compId: string) => {
    const updated = taxComponents.filter((c) => c.id !== compId);
    setTaxComponents(updated);
    StorageService.saveTaxComponents(updated);

    FirestoreService.deleteTaxComponent(compId).catch((err) =>
      console.warn('[Firestore] Error deleting tax component:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'deleteTaxComponent',
        payload: { id: compId },
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast('Komponen pajak telah dihapus.', 'info');
  };

  const handleSaveTaxPayment = (payment: TaxPaymentRecord, createExpenseTrx: boolean = true) => {
    const exists = taxPayments.some((p) => p.id === payment.id);
    const updated = exists
      ? taxPayments.map((p) => (p.id === payment.id ? payment : p))
      : [payment, ...taxPayments];
    setTaxPayments(updated);
    StorageService.saveTaxPayments(updated);

    FirestoreService.saveTaxPayment(payment).catch((err) =>
      console.warn('[Firestore] Error saving tax payment:', err)
    );

    // Otomatis catat sebagai transaksi pengeluaran operasional jika dipilih
    if (createExpenseTrx) {
      const expenseTrx = StorageService.createTaxPaymentExpenseTransaction(
        payment,
        payment.storeId,
        currentUser.Full_Name
      );
      const updatedTrx = [expenseTrx, ...transactions];
      setTransactions(updatedTrx);
      StorageService.saveTransactions(updatedTrx);

      FirestoreService.saveTransaction(expenseTrx).catch((err) =>
        console.warn('[Firestore] Error saving tax expense transaction:', err)
      );
    }

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'saveTaxPayment',
        payload: payment,
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast(
      `Penyetoran pajak ${payment.taxComponentName} berhasil dicatat (Billing: ${payment.billingCode})!`
    );
  };

  const handleDeleteTaxPayment = (payId: string) => {
    const updated = taxPayments.filter((p) => p.id !== payId);
    setTaxPayments(updated);
    StorageService.saveTaxPayments(updated);

    FirestoreService.deleteTaxPayment(payId).catch((err) =>
      console.warn('[Firestore] Error deleting tax payment:', err)
    );

    if (sheetsConfig.isConnected && sheetsConfig.webAppUrl) {
      StorageService.pushToSheets(sheetsConfig.webAppUrl, {
        action: 'deleteTaxPayment',
        payload: { id: payId },
      }).catch((err) => console.error('Remote sync error:', err));
    }

    showToast('Catatan penyetoran pajak telah dihapus.', 'info');
  };

  // --- Google Sheets Sync Handlers ---
  const handleSaveSheetsConfig = (cfg: GoogleSheetsConfig) => {
    setSheetsConfig(cfg);
    StorageService.saveConfig(cfg);
    showToast(
      cfg.isConnected
        ? 'Google Sheets terhubung & pengaturan tersimpan!'
        : 'Pengaturan Google Sheets disimpan.',
      'info'
    );
  };

  const handleSyncPull = async () => {
    if (!sheetsConfig.webAppUrl) {
      showToast('Masukkan URL Web App terlebih dahulu di pengaturan.', 'error');
      return;
    }
    setIsSyncing(true);
    try {
      const res = await StorageService.fetchFromSheets(sheetsConfig.webAppUrl);
      if (res.success && res.data) {
        if (res.data.stores && res.data.stores.length > 0) {
          setStores(res.data.stores);
          StorageService.saveStores(res.data.stores);
        }
        if (res.data.users && res.data.users.length > 0) {
          setUsers(res.data.users);
          StorageService.saveUsers(res.data.users);
        }
        if (res.data.chartOfAccounts && res.data.chartOfAccounts.length > 0) {
          setChartOfAccounts(res.data.chartOfAccounts);
          StorageService.saveCOA(res.data.chartOfAccounts);
        }
        if (res.data.transactions && res.data.transactions.length > 0) {
          setTransactions(res.data.transactions);
          StorageService.saveTransactions(res.data.transactions);
        }
        if (res.data.employees && res.data.employees.length > 0) {
          setEmployees(res.data.employees);
          StorageService.saveEmployees(res.data.employees);
        }
        if (res.data.payrollRuns && res.data.payrollRuns.length > 0) {
          setPayrollRuns(res.data.payrollRuns);
          StorageService.savePayrollRuns(res.data.payrollRuns);
        }
        if (res.data.budgets && res.data.budgets.length > 0) {
          setBudgets(res.data.budgets);
          StorageService.saveBudgets(res.data.budgets);
        }
        if (res.data.companyProfile) {
          setCompanyProfile(res.data.companyProfile);
          StorageService.saveCompanyProfile(res.data.companyProfile);
        }
        if (res.data.employeeLoans && res.data.employeeLoans.length > 0) {
          setEmployeeLoans(res.data.employeeLoans);
          StorageService.saveEmployeeLoans(res.data.employeeLoans);
        }
        if (res.data.supplierDebts && res.data.supplierDebts.length > 0) {
          setSupplierDebts(res.data.supplierDebts);
          StorageService.saveSupplierDebts(res.data.supplierDebts);
        }
        if (res.data.purchaseOrders && res.data.purchaseOrders.length > 0) {
          setPurchaseOrders(res.data.purchaseOrders);
          StorageService.savePurchaseOrders(res.data.purchaseOrders);
        }
        if (res.data.taxComponents && res.data.taxComponents.length > 0) {
          setTaxComponents(res.data.taxComponents);
          StorageService.saveTaxComponents(res.data.taxComponents);
        }
        if (res.data.taxPayments && res.data.taxPayments.length > 0) {
          setTaxPayments(res.data.taxPayments);
          StorageService.saveTaxPayments(res.data.taxPayments);
        }

        const nowIso = new Date().toISOString();
        const updatedConfig = { ...sheetsConfig, isConnected: true, lastSyncTime: nowIso };
        setSheetsConfig(updatedConfig);
        StorageService.saveConfig(updatedConfig);

        showToast('Data berhasil ditarik dari Google Sheets!');
      } else {
        showToast(res.error || 'Gagal menarik data dari Google Sheets.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan sinkronisasi.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncPush = async () => {
    if (!sheetsConfig.webAppUrl) {
      showToast('Masukkan URL Web App terlebih dahulu di pengaturan.', 'error');
      return;
    }
    setIsSyncing(true);
    try {
      const payload = {
        action: 'syncAll',
        payload: {
          stores,
          users,
          chartOfAccounts,
          transactions,
          employees,
          payrollRuns,
          budgets,
          companyProfile,
          employeeLoans,
          supplierDebts,
          purchaseOrders,
          taxComponents,
          taxPayments,
        },
      };

      const res = await StorageService.pushToSheets(sheetsConfig.webAppUrl, payload);
      if (res.success) {
        const nowIso = new Date().toISOString();
        const updatedConfig = { ...sheetsConfig, isConnected: true, lastSyncTime: nowIso };
        setSheetsConfig(updatedConfig);
        StorageService.saveConfig(updatedConfig);
        showToast('Semua database (termasuk PO, Hutang & Pinjaman Karyawan) berhasil disinkronkan ke Google Sheets!');
      } else {
        showToast(res.message || 'Gagal mengirim data ke Google Sheets.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan sinkronisasi.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Open Payslip Modal
  const handleOpenPayslip = (payroll: PayrollRun) => {
    const emp = employees.find((e) => e.Employee_ID === payroll.Employee_ID) || null;
    const store = stores.find((s) => s.Store_ID === payroll.Store_ID) || null;
    setPayslipModal({
      isOpen: true,
      payroll,
      employee: emp,
      store,
    });
  };

  // --- MDR Rates Handlers ---
  const handleSaveMdrSetting = async (setting: MDRRateSetting) => {
    const exists = mdrSettings.some((s) => s.id === setting.id);
    const updated = exists
      ? mdrSettings.map((s) => (s.id === setting.id ? setting : s))
      : [...mdrSettings, setting];
    setMdrSettings(updated);
    StorageService.saveMDRSettings(updated);
    await FirestoreService.saveMDRSettings(updated).catch((err) =>
      console.warn('[Firestore] Error saving MDR settings:', err)
    );
    FirestoreService.recordLiveActivity({
      userName: currentUser.Full_Name,
      userRole: currentUser.Role,
      action: 'Tarif MDR Diperbarui',
      details: `Tarif MDR ${setting.label} diubah menjadi ${setting.ratePercent}%`,
      entityType: 'mdr',
    }).catch(() => {});
    showToast(`Tarif MDR ${setting.label} (${setting.ratePercent}%) berhasil disimpan!`);
  };

  const handleSaveAllMdrSettings = async (settings: MDRRateSetting[]) => {
    setMdrSettings(settings);
    StorageService.saveMDRSettings(settings);
    await FirestoreService.saveMDRSettings(settings).catch((err) =>
      console.warn('[Firestore] Error saving all MDR settings:', err)
    );
    showToast('Seluruh aturan tarif MDR berhasil diperbarui!');
  };

  const handleResetMdrSettings = async () => {
    const reset = StorageService.resetMDRSettings();
    setMdrSettings(reset);
    await FirestoreService.saveMDRSettings(reset).catch((err) =>
      console.warn('[Firestore] Error resetting MDR settings:', err)
    );
    FirestoreService.recordLiveActivity({
      userName: currentUser.Full_Name,
      userRole: currentUser.Role,
      action: 'Reset Tarif MDR',
      details: 'Seluruh tarif MDR dikembalikan ke standar awal Bank Indonesia & Bank',
      entityType: 'mdr',
    }).catch(() => {});
    showToast('Tarif MDR berhasil di-reset ke standar regulasi resmi (QRIS 0.7%, BCA 0.15%, Lain 2.0%)!');
  };

  const handleDeleteMdrSetting = async (id: string) => {
    const updated = mdrSettings.filter((s) => s.id !== id);
    setMdrSettings(updated);
    StorageService.saveMDRSettings(updated);
    await FirestoreService.saveMDRSettings(updated).catch((err) =>
      console.warn('[Firestore] Error deleting MDR setting:', err)
    );
    showToast('Saluran MDR telah dihapus.', 'info');
  };

  // --- Buka Buku & Tutup Buku (Book Closing Period) Handlers ---
  const handleSaveBookPeriodConfig = async (newConfig: BookPeriodConfig) => {
    setBookPeriodConfig(newConfig);
    StorageService.saveBookPeriodConfig(newConfig);
    await FirestoreService.saveBookPeriodConfig(newConfig).catch((err) =>
      console.warn('[Firestore] Error saving book period config:', err)
    );
    FirestoreService.recordLiveActivity({
      userName: currentUser.Full_Name,
      userRole: currentUser.Role,
      action: 'Pengaturan Periode Buku Diperbarui',
      details: `Aturan cut-off tgl ${newConfig.cutoffDay}, periode: ${newConfig.currentPeriod} (${newConfig.startDate} s/d ${newConfig.endDate})`,
      entityType: 'settings',
    }).catch(() => {});
    showToast('Aturan tanggal periode buku berhasil disesuaikan!');
  };

  const handleSaveBookClosingRecord = async (record: BookClosingHistory) => {
    const exists = bookClosingHistory.some((h) => h.id === record.id);
    const updated = exists
      ? bookClosingHistory.map((h) => (h.id === record.id ? record : h))
      : [record, ...bookClosingHistory];
    setBookClosingHistory(updated);
    StorageService.saveBookClosingHistory(updated);
    await FirestoreService.saveBookClosing(record).catch((err) =>
      console.warn('[Firestore] Error saving book closing record:', err)
    );
  };

  const handleDeleteBookClosingRecord = async (id: string) => {
    const target = bookClosingHistory.find((h) => h.id === id);
    const updated = bookClosingHistory.filter((h) => h.id !== id);
    setBookClosingHistory(updated);
    StorageService.saveBookClosingHistory(updated);
    await FirestoreService.deleteBookClosing(id).catch((err) =>
      console.warn('[Firestore] Error deleting book closing record:', err)
    );
    FirestoreService.recordLiveActivity({
      userName: currentUser.Full_Name,
      userRole: currentUser.Role,
      action: 'Riwayat Tutup Buku Dihapus',
      details: `Arsip tutup buku periode ${target?.period || id} telah dihapus dari sistem`,
      entityType: 'book_closing',
    }).catch(() => {});
    showToast(`Arsip tutup buku periode ${target?.period || id} berhasil dihapus!`, 'info');
  };

  const handleCloseBook = async (
    closingRecord: BookClosingHistory,
    nextConfig: BookPeriodConfig
  ) => {
    // 1. Simpan history tutup buku
    await handleSaveBookClosingRecord(closingRecord);

    // 2. Update config periode buku
    setBookPeriodConfig(nextConfig);
    StorageService.saveBookPeriodConfig(nextConfig);
    await FirestoreService.saveBookPeriodConfig(nextConfig).catch((err) =>
      console.warn('[Firestore] Error saving book period config on close:', err)
    );

    FirestoreService.recordLiveActivity({
      userName: currentUser.Full_Name,
      userRole: currentUser.Role,
      action: 'Tutup Buku Periode',
      details: `Periode ${closingRecord.period} berhasil ditutup resmi oleh ${closingRecord.closedBy}`,
      entityType: 'book_closing',
    }).catch(() => {});

    showToast(
      `Tutup buku periode ${closingRecord.period} berhasil! Laporan keuangan telah dikunci.`,
      'success'
    );
  };

  const handleReopenBook = async (reason: string) => {
    const updatedConfig: BookPeriodConfig = {
      ...bookPeriodConfig,
      currentPeriodStatus: 'OPEN',
    };
    setBookPeriodConfig(updatedConfig);
    StorageService.saveBookPeriodConfig(updatedConfig);
    await FirestoreService.saveBookPeriodConfig(updatedConfig).catch((err) =>
      console.warn('[Firestore] Error saving book period config on reopen:', err)
    );

    FirestoreService.recordLiveActivity({
      userName: currentUser.Full_Name,
      userRole: currentUser.Role,
      action: 'Buka Buku Kembali',
      details: `Buku periode ${bookPeriodConfig.currentPeriod} dibuka kembali oleh ${currentUser.Full_Name}: "${reason}"`,
      entityType: 'book_closing',
    }).catch(() => {});

    showToast(
      `Buku periode ${bookPeriodConfig.currentPeriod} berhasil DIBUKA KEMBALI. Transaksi dapat diubah.`,
      'info'
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Header */}
      <Header
        stores={stores}
        activeStoreId={activeStoreId}
        onSelectStore={handleSelectStore}
        currentUser={currentUser}
        users={users}
        onSelectUser={handleSelectUser}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        sheetsConfig={sheetsConfig}
        onOpenSheetsModal={() => setSheetsModalOpen(true)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        companyProfile={companyProfile}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        isFirestoreConnected={isFirestoreConnected}
        bookPeriodConfig={bookPeriodConfig}
        onOpenBookClosingModal={() => setIsBookClosingModalOpen(true)}
        onOpenBackupModal={() => setBackupModalOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === 'backup_restore') {
              setBackupModalOpen(true);
              return;
            }
            setActiveTab(tab);
            if (tab === 'sheets_setup') {
              setSheetsModalOpen(true);
            }
          }}
          currentUser={currentUser}
          companyProfile={companyProfile}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* Toast Notification */}
          {toast && (
            <div
              className={`fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 shadow-xl border flex items-center gap-3 text-xs font-medium transition-all animate-in fade-in slide-in-from-bottom-3 ${
                toast.type === 'success'
                  ? 'bg-emerald-900 text-white border-emerald-700'
                  : toast.type === 'error'
                  ? 'bg-rose-900 text-white border-rose-700'
                  : 'bg-slate-900 text-white border-slate-700'
              }`}
            >
              <span>{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* Active View Router */}
          {activeTab === 'dashboard' && (
            <Dashboard
              stores={stores}
              activeStoreId={activeStoreId}
              transactions={transactions}
              employees={employees}
              payrollRuns={payrollRuns}
              chartOfAccounts={chartOfAccounts}
              budgets={budgets}
              currentUser={currentUser}
              companyProfile={companyProfile}
              employeeLoans={employeeLoans}
              supplierDebts={supplierDebts}
              purchaseOrders={purchaseOrders}
              mdrSettings={mdrSettings}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenNewTransactionModal={(type) => {
                setDirectNewTrxType(type || 'Pemasukan');
                setActiveTab('transactions');
              }}
              onOpenPayslipModal={handleOpenPayslip}
              onSelectStore={handleSelectStore}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              stores={stores}
              activeStoreId={activeStoreId}
              transactions={transactions}
              chartOfAccounts={chartOfAccounts}
              currentUser={currentUser}
              companyProfile={companyProfile}
              onSaveTransaction={handleSaveTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onUpdateStatus={handleUpdateTransactionStatus}
              onOpenProofModal={(imageUrl, title, description) =>
                setProofModal({ isOpen: true, imageUrl, title, description })
              }
              openCreateModalDirectly={directNewTrxType}
              onClearDirectModal={() => setDirectNewTrxType(null)}
              mdrSettings={mdrSettings}
              onNavigateToMdr={() => setActiveTab('mdr_rates')}
              bookPeriodConfig={bookPeriodConfig}
              onOpenBookClosingModal={() => setIsBookClosingModalOpen(true)}
              employees={employees}
              employeeLoans={employeeLoans}
              onSaveLoan={handleSaveLoan}
            />
          )}

          {activeTab === 'profit_loss' && (
            <ProfitLossView
              stores={stores}
              activeStoreId={activeStoreId}
              transactions={transactions}
              chartOfAccounts={chartOfAccounts}
              companyProfile={companyProfile}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'taxes' && (
            <TaxesView
              stores={stores}
              activeStoreId={activeStoreId}
              transactions={transactions}
              payrollRuns={payrollRuns}
              chartOfAccounts={chartOfAccounts}
              taxComponents={taxComponents}
              taxPayments={taxPayments}
              currentUser={currentUser}
              companyProfile={companyProfile}
              onSaveTaxComponent={handleSaveTaxComponent}
              onDeleteTaxComponent={handleDeleteTaxComponent}
              onSaveTaxPayment={handleSaveTaxPayment}
              onDeleteTaxPayment={handleDeleteTaxPayment}
              onSelectStore={handleSelectStore}
            />
          )}

          {activeTab === 'budget' && (
            <BudgetView
              stores={stores}
              activeStoreId={activeStoreId}
              transactions={transactions}
              chartOfAccounts={chartOfAccounts}
              budgets={budgets}
              currentUser={currentUser}
              onSaveBudget={handleSaveBudget}
            />
          )}

          {activeTab === 'purchase_orders' && (
            <PurchaseOrdersView
              stores={stores}
              activeStoreId={activeStoreId}
              purchaseOrders={purchaseOrders}
              currentUser={currentUser}
              companyProfile={companyProfile}
              onSavePO={handleSavePO}
              onDeletePO={handleDeletePO}
              onConvertToDebt={handleConvertToDebt}
            />
          )}

          {activeTab === 'debts' && (
            <DebtManagementView
              stores={stores}
              activeStoreId={activeStoreId}
              debts={debtRecords}
              chartOfAccounts={chartOfAccounts}
              transactions={transactions}
              currentUser={currentUser}
              companyProfile={companyProfile}
              onSaveDebt={handleSaveDebtRecord}
              onDeleteDebt={handleDeleteDebtRecord}
              onRecordDebtPayment={handleRecordDebtInstallmentPayment}
              onDeleteDebtPayment={handleDeleteDebtInstallmentPayment}
              onSelectStore={handleSelectStore}
              onNavigateToTransactions={(keyword) => {
                setActiveTab('transactions');
              }}
            />
          )}

          {activeTab === 'supplier_debts' && (
            <SupplierDebtsView
              stores={stores}
              activeStoreId={activeStoreId}
              debts={supplierDebts}
              chartOfAccounts={chartOfAccounts}
              currentUser={currentUser}
              onSaveDebt={handleSaveDebt}
              onDeleteDebt={handleDeleteDebt}
              onRecordDebtPayment={handleRecordDebtPayment}
            />
          )}

          {activeTab === 'employee_loans' && (
            <EmployeeLoansView
              stores={stores}
              activeStoreId={activeStoreId}
              employees={employees}
              loans={employeeLoans}
              currentUser={currentUser}
              onSaveLoan={handleSaveLoan}
              onDeleteLoan={handleDeleteLoan}
            />
          )}

          {activeTab === 'payroll' && (
            <PayrollView
              stores={stores}
              activeStoreId={activeStoreId}
              employees={employees}
              payrollRuns={payrollRuns}
              currentUser={currentUser}
              companyProfile={companyProfile}
              onSavePayrollRun={handleSavePayrollRun}
              onDeletePayrollRun={handleDeletePayrollRun}
              onApprovePayroll={handleApprovePayroll}
              onOpenPayslipModal={handleOpenPayslip}
              employeeLoans={employeeLoans}
              onSaveLoan={handleSaveLoan}
            />
          )}

          {activeTab === 'employees' && (
            <EmployeesView
              stores={stores}
              activeStoreId={activeStoreId}
              employees={employees}
              currentUser={currentUser}
              onSaveEmployee={handleSaveEmployee}
              onDeleteEmployee={handleDeleteEmployee}
            />
          )}

          {activeTab === 'stores_coa' && (
            <StoresCoaView
              stores={stores}
              chartOfAccounts={chartOfAccounts}
              users={users}
              currentUser={currentUser}
              onSaveStore={handleSaveStore}
              onDeleteStore={handleDeleteStore}
              onSaveCoa={handleSaveCoa}
              onDeleteCoa={handleDeleteCoa}
              onSaveUser={handleSaveUser}
              onDeleteUser={handleDeleteUser}
              employees={employees}
              transactions={transactions}
              onNavigateToMdr={() => setActiveTab('mdr_rates')}
            />
          )}

          {activeTab === 'mdr_rates' && (
            <MdrRatesView
              mdrSettings={mdrSettings}
              chartOfAccounts={chartOfAccounts}
              transactions={transactions}
              currentUser={currentUser}
              onSaveMdrSetting={handleSaveMdrSetting}
              onSaveAllMdrSettings={handleSaveAllMdrSettings}
              onResetMdrSettings={handleResetMdrSettings}
              onDeleteMdrSetting={handleDeleteMdrSetting}
              onNavigateToTransactions={() => setActiveTab('transactions')}
            />
          )}

          {activeTab === 'company_profile' && (
            <CompanyProfileView
              companyProfile={companyProfile}
              currentUser={currentUser}
              onSaveCompanyProfile={handleSaveCompanyProfile}
            />
          )}
        </main>
      </div>

      {/* Proof Preview Modal */}
      <ProofPreviewModal
        isOpen={proofModal.isOpen}
        imageUrl={proofModal.imageUrl}
        title={proofModal.title}
        description={proofModal.description}
        onClose={() => setProofModal({ isOpen: false, imageUrl: '' })}
      />

      {/* Official Indonesian Payslip Modal */}
      <PayslipModal
        isOpen={payslipModal.isOpen}
        payroll={payslipModal.payroll}
        employee={payslipModal.employee}
        store={payslipModal.store}
        companyProfile={companyProfile}
        onClose={() =>
          setPayslipModal({ isOpen: false, payroll: null, employee: null, store: null })
        }
      />

      {/* Google Sheets Setup & Sync Modal */}
      <GoogleSheetsModal
        isOpen={sheetsModalOpen}
        onClose={() => setSheetsModalOpen(false)}
        config={sheetsConfig}
        onSaveConfig={handleSaveSheetsConfig}
        onSyncPull={handleSyncPull}
        onSyncPush={handleSyncPush}
        isSyncing={isSyncing}
      />

      {/* Firebase Authentication Modal (Google Sign-In & Email Login) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        users={users}
        stores={stores}
        onSelectUser={(u) => {
          handleSelectUser(u);
          showToast(`Beralih ke persona: ${u.Full_Name}`, 'info');
        }}
        onUserLoginSuccess={handleUserLoginSuccess}
        onUserLogout={handleUserLogout}
      />

      {/* Modal Buka Buku & Tutup Buku (Book Closing Period) */}
      {isBookClosingModalOpen && (
        <BookClosingModal
          isOpen={isBookClosingModalOpen}
          onClose={() => setIsBookClosingModalOpen(false)}
          config={bookPeriodConfig}
          onSaveConfig={handleSaveBookPeriodConfig}
          history={bookClosingHistory}
          onSaveClosingRecord={handleSaveBookClosingRecord}
          onDeleteClosingRecord={handleDeleteBookClosingRecord}
          transactions={transactions}
          chartOfAccounts={chartOfAccounts}
          stores={stores}
          currentUser={currentUser}
          onShowToast={(msg, type) => showToast(msg, type || 'success')}
        />
      )}

      {/* Modal Penyimpanan & Cadangan Data (Backup & Restore) */}
      <DataBackupModal
        isOpen={backupModalOpen}
        onClose={() => setBackupModalOpen(false)}
        onRefreshAllData={handleRefreshAllData}
        showToast={showToast}
        isFirestoreConnected={isFirestoreConnected}
      />
    </div>
  );
}
