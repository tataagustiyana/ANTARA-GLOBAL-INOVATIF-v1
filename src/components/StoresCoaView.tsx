import {
  AlertTriangle,
  Building2,
  Edit2,
  FileSpreadsheet,
  MapPin,
  Phone,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { StorageService } from '../services/storageService';
import { ChartOfAccount, Employee, Store, StoreStatus, Transaction, User, UserRole } from '../types';

interface StoresCoaViewProps {
  stores: Store[];
  chartOfAccounts: ChartOfAccount[];
  users: User[];
  currentUser: User;
  onSaveStore: (store: Store) => Promise<void>;
  onDeleteStore: (storeId: string) => Promise<void>;
  onSaveCoa: (coa: ChartOfAccount) => Promise<void>;
  onDeleteCoa?: (accountCode: string) => Promise<void>;
  onSaveUser: (user: User) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  employees?: Employee[];
  transactions?: Transaction[];
  onNavigateToMdr?: () => void;
}

export const StoresCoaView: React.FC<StoresCoaViewProps> = ({
  stores,
  chartOfAccounts,
  users,
  currentUser,
  onSaveStore,
  onDeleteStore,
  onSaveCoa,
  onDeleteCoa,
  onSaveUser,
  onDeleteUser,
  employees = [],
  transactions = [],
  onNavigateToMdr,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'stores' | 'coa' | 'users'>('stores');

  // Store modal states
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [storeId, setStoreId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeManager, setStoreManager] = useState('');
  const [storeStatus, setStoreStatus] = useState<StoreStatus>('Active');
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);

  // COA modal states
  const [isCoaModalOpen, setIsCoaModalOpen] = useState(false);
  const [editingCoa, setEditingCoa] = useState<ChartOfAccount | null>(null);
  const [accountCode, setAccountCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountCategory, setAccountCategory] = useState<
    'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'
  >('Expense');
  const [coaToDelete, setCoaToDelete] = useState<ChartOfAccount | null>(null);

  // User & RBAC modal states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userId, setUserId] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('Store Manager');
  const [userStoreId, setUserStoreId] = useState('ALL');
  const [userStatus, setUserStatus] = useState<'Active' | 'Inactive'>('Active');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // --- Store Handlers ---
  const handleOpenAddStore = () => {
    setEditingStore(null);
    const nextNum = stores.length + 1;
    setStoreId(`STR-00${nextNum}`);
    setStoreName('');
    setStoreAddress('');
    setStorePhone('');
    setStoreManager('');
    setStoreStatus('Active');
    setIsStoreModalOpen(true);
  };

  const handleOpenEditStore = (store: Store) => {
    setEditingStore(store);
    setStoreId(store.Store_ID);
    setStoreName(store.Store_Name);
    setStoreAddress(store.Address);
    setStorePhone(store.Phone);
    setStoreManager(store.Manager_Name);
    setStoreStatus(store.Status);
    setIsStoreModalOpen(true);
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !storeId.trim()) return;

    await onSaveStore({
      Store_ID: storeId.trim(),
      Store_Name: storeName.trim(),
      Address: storeAddress.trim(),
      Phone: storePhone.trim(),
      Manager_Name: storeManager.trim(),
      Status: storeStatus,
    });

    setIsStoreModalOpen(false);
    setEditingStore(null);
  };

  const handleConfirmDeleteStore = async () => {
    if (!storeToDelete) return;
    await onDeleteStore(storeToDelete.Store_ID);
    setStoreToDelete(null);
  };

  // --- COA Handlers ---
  const handleOpenAddCoa = () => {
    setEditingCoa(null);
    setAccountCode('');
    setAccountName('');
    setAccountCategory('Expense');
    setIsCoaModalOpen(true);
  };

  const handleOpenEditCoa = (coa: ChartOfAccount) => {
    setEditingCoa(coa);
    setAccountCode(coa.Account_Code);
    setAccountName(coa.Account_Name);
    setAccountCategory(coa.Category);
    setIsCoaModalOpen(true);
  };

  const handleSaveCoa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountCode.trim() || !accountName.trim()) return;

    await onSaveCoa({
      Account_Code: accountCode.trim(),
      Account_Name: accountName.trim(),
      Category: accountCategory,
    });

    setIsCoaModalOpen(false);
    setEditingCoa(null);
  };

  const handleConfirmDeleteCoa = async () => {
    if (!coaToDelete || !onDeleteCoa) return;
    await onDeleteCoa(coaToDelete.Account_Code);
    setCoaToDelete(null);
  };

  // --- User & RBAC Handlers ---
  const handleOpenAddUser = () => {
    setEditingUser(null);
    const nextNum = users.length + 1;
    setUserId(`USR-${String(nextNum).padStart(3, '0')}`);
    setUserFullName('');
    setUserEmail('');
    setUserRole('Store Manager');
    setUserStoreId(stores[0]?.Store_ID || 'ALL');
    setUserStatus('Active');
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setUserId(user.User_ID);
    setUserFullName(user.Full_Name);
    setUserEmail(user.Email);
    setUserRole(user.Role);
    setUserStoreId(user.Store_ID);
    setUserStatus(user.Status);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !userFullName.trim() || !userEmail.trim()) return;

    await onSaveUser({
      User_ID: userId.trim(),
      Full_Name: userFullName.trim(),
      Email: userEmail.trim(),
      Role: userRole,
      Store_ID: userRole === 'Superadmin' ? 'ALL' : userStoreId,
      Status: userStatus,
    });

    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    await onDeleteUser(userToDelete.User_ID);
    setUserToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Pengaturan Cabang Toko & Bagan Akun
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Kelola entitas cabang retail, bagan akun (Chart of Accounts), serta hak akses pengguna (RBAC)
        </p>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 text-xs dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('stores')}
          className={`flex items-center gap-2 py-3 px-4 font-medium border-b-2 transition-colors ${
            activeSubTab === 'stores'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Cabang Toko (Stores)</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-slate-800">
            {stores.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('coa')}
          className={`flex items-center gap-2 py-3 px-4 font-medium border-b-2 transition-colors ${
            activeSubTab === 'coa'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Bagan Akun (Chart of Accounts)</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-slate-800">
            {chartOfAccounts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 py-3 px-4 font-medium border-b-2 transition-colors ${
            activeSubTab === 'users'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>Hak Akses & Pengguna (RBAC)</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-slate-800">
            {users.length}
          </span>
        </button>

        {onNavigateToMdr && (
          <button
            onClick={onNavigateToMdr}
            className="flex items-center gap-1.5 py-2.5 px-3 font-semibold text-xs rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60 transition-colors ml-auto self-center shadow-2xs"
            title="Kelola & Sesuaikan Tarif MDR Non-Tunai (QRIS, Debit BCA, Debit Bank Lain)"
          >
            <span>⚙️ Pengaturan Tarif MDR (5-111)</span>
          </button>
        )}
      </div>

      {/* 1. Stores Tab */}
      {activeSubTab === 'stores' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Total <strong>{stores.length}</strong> cabang toko terdaftar.
            </span>
            <button
              onClick={handleOpenAddStore}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>+ Tambah Cabang Toko</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((s) => {
              const empCount = employees.filter((e) => e.Store_ID === s.Store_ID).length;
              const trCount = transactions.filter((t) => t.Store_ID === s.Store_ID).length;

              return (
                <div
                  key={s.Store_ID}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                          {s.Store_ID}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 leading-snug">
                          {s.Store_Name}
                        </h3>
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold shrink-0 ${
                          s.Status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {s.Status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <span className="line-clamp-2 leading-relaxed">{s.Address || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{s.Phone || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                        <UserCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>Manager: {s.Manager_Name || '-'}</span>
                      </div>
                    </div>

                    {/* Associated metadata counts */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 border border-slate-100 dark:border-slate-800">
                      <span>👥 {empCount} Karyawan</span>
                      <span>·</span>
                      <span>📑 {trCount} Transaksi</span>
                    </div>
                  </div>

                  {/* Actions: Edit & Hapus */}
                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <button
                      onClick={() => handleOpenEditStore(s)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Edit Cabang</span>
                    </button>
                    <button
                      onClick={() => setStoreToDelete(s)}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70 transition-colors"
                      title="Hapus cabang toko"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Chart of Accounts Tab */}
      {activeSubTab === 'coa' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Total <strong>{chartOfAccounts.length}</strong> akun standar (Asset, Liability, Equity, Revenue, Expense).
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const headers = [
                    'Kode Akun',
                    'Nama Akun',
                    'Kategori',
                    'Sifat Akun',
                    'Keterangan',
                  ];
                  const rows = chartOfAccounts.map((coa) => [
                    coa.Account_Code,
                    coa.Account_Name,
                    coa.Category,
                    coa.Category === 'Revenue'
                      ? 'Kredit (Pendapatan)'
                      : coa.Category === 'Expense'
                      ? 'Debit (Beban Usaha)'
                      : 'Posisi Keuangan',
                    coa.Account_Code === '5-111' ? 'Akun Beban MDR Otomatis' : '-',
                  ]);
                  StorageService.exportToExcel('Bagan_Akun_COA', headers, rows, 'Bagan Akun');
                }}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 shadow-2xs transition-colors cursor-pointer"
                title="Ekspor bagan akun ke format Microsoft Excel (.xlsx)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Ekspor Excel (.xlsx)</span>
              </button>
              <button
                onClick={handleOpenAddCoa}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>+ Tambah Akun Baru</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Kode Akun</th>
                  <th className="px-5 py-3">Nama Akun</th>
                  <th className="px-5 py-3">Kategori</th>
                  <th className="px-5 py-3">Sifat Akun</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {chartOfAccounts.map((coa) => (
                  <tr
                    key={coa.Account_Code}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-5 py-3 font-mono font-semibold text-slate-900 dark:text-white">
                      {coa.Account_Code}
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300 font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{coa.Account_Name}</span>
                        {coa.Account_Code === '5-111' && (
                          <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
                            Potongan MDR Otomatis
                            {onNavigateToMdr && (
                              <button
                                type="button"
                                onClick={onNavigateToMdr}
                                className="underline hover:text-purple-900 dark:hover:text-purple-100 ml-1 font-bold"
                              >
                                [Ubah Tarif]
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          coa.Category === 'Revenue'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : coa.Category === 'Expense'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                        }`}
                      >
                        {coa.Category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-[11px]">
                      {coa.Category === 'Revenue'
                        ? 'Kredit (Pendapatan)'
                        : coa.Category === 'Expense'
                        ? 'Debit (Beban Usaha)'
                        : 'Posisi Keuangan'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditCoa(coa)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                          title="Edit akun"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {onDeleteCoa && (
                          <button
                            onClick={() => setCoaToDelete(coa)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                            title="Hapus akun"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Users & RBAC Roles Tab */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Total <strong>{users.length}</strong> pengguna terdaftar dalam sistem hak akses RBAC.
            </span>
            <button
              onClick={handleOpenAddUser}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>+ Tambah Pengguna Baru</span>
            </button>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 dark:bg-slate-800/40 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <h4 className="font-semibold text-slate-900 dark:text-white">
              Panduan Hak Akses Sistem (Role-Based Access Control):
            </h4>
            <p>
              • <strong>Superadmin</strong>: Memiliki kendali menyeluruh atas seluruh cabang toko dan laporan konsolidasi.
            </p>
            <p>
              • <strong>Finance Admin</strong>: Mengelola pencatatan keuangan, approval transaksi, dan pemrosesan penggajian bulanan.
            </p>
            <p>
              • <strong>Store Manager</strong>: Terisolasi khusus untuk toko yang ditugaskan (STR-xxx). Dapat mencatat transaksi kasir, transfer dana, dan memantau status gaji cabang mereka.
            </p>
            <p>
              • <strong>Employee</strong>: Akses personal terbatas untuk memeriksa rincian slip gaji milik mereka sendiri.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">ID Pengguna</th>
                  <th className="px-5 py-3">Nama Lengkap</th>
                  <th className="px-5 py-3">Email Akun</th>
                  <th className="px-5 py-3">Role Sistem</th>
                  <th className="px-5 py-3">Lingkup Toko</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  const isCurrent = u.User_ID === currentUser.User_ID;
                  return (
                    <tr key={u.User_ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-mono text-slate-500">{u.User_ID}</td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{u.Full_Name}</span>
                          {isCurrent && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Akun Anda
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{u.Email}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            u.Role === 'Superadmin'
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400'
                              : u.Role === 'Finance Admin'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                              : u.Role === 'Store Manager'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          }`}
                        >
                          {u.Role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                        {u.Store_ID === 'ALL'
                          ? 'Semua Toko (Konsolidasi)'
                          : stores.find((s) => s.Store_ID === u.Store_ID)?.Store_Name || u.Store_ID}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            u.Status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {u.Status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                            title="Edit data pengguna"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setUserToDelete(u)}
                            disabled={isCurrent}
                            className={`rounded p-1 ${
                              isCurrent
                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                : 'text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400'
                            }`}
                            title={isCurrent ? 'Tidak dapat menghapus akun yang sedang digunakan' : 'Hapus pengguna'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Tambah / Edit Cabang Toko */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {editingStore ? 'Edit Cabang Toko' : 'Tambah Cabang Toko Baru'}
              </h3>
              <button
                onClick={() => setIsStoreModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStore} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    ID Toko (Store_ID)
                  </label>
                  <input
                    type="text"
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    required
                    disabled={!!editingStore}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-slate-800/80"
                  />
                  {editingStore && (
                    <span className="text-[10px] text-slate-400 mt-0.5 block">ID Toko tidak dapat diubah</span>
                  )}
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Status Operasional
                  </label>
                  <select
                    value={storeStatus}
                    onChange={(e) => setStoreStatus(e.target.value as StoreStatus)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Active">Active (Aktif)</option>
                    <option value="Inactive">Inactive (Non-Aktif)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Nama Cabang Toko
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Misal: Flagship Grand Indonesia"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Alamat Lengkap Cabang
                </label>
                <textarea
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  rows={2}
                  placeholder="Alamat mall, jalan, nomor gedung, kota..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    No. Telepon Toko
                  </label>
                  <input
                    type="text"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    placeholder="+62 21..."
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Nama Store Manager
                  </label>
                  <input
                    type="text"
                    value={storeManager}
                    onChange={(e) => setStoreManager(e.target.value)}
                    placeholder="Nama manager..."
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStoreModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs"
                >
                  {editingStore ? 'Simpan Perubahan' : 'Simpan Toko'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Toko */}
      {storeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Hapus Cabang Toko?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Cabang Toko:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {storeToDelete.Store_Name} ({storeToDelete.Store_ID})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Manager:</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {storeToDelete.Manager_Name || '-'}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Karyawan terkait:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {employees.filter((e) => e.Store_ID === storeToDelete.Store_ID).length} orang
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Transaksi terkait:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {transactions.filter((t) => t.Store_ID === storeToDelete.Store_ID).length} transaksi
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus data cabang toko ini dari sistem?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStoreToDelete(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStore}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs"
              >
                Hapus Cabang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah / Edit COA */}
      {isCoaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {editingCoa ? 'Edit Bagan Akun' : 'Tambah Bagan Akun Baru'}
              </h3>
              <button
                onClick={() => setIsCoaModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoa} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Kode Akun (Account_Code)
                </label>
                <input
                  type="text"
                  value={accountCode}
                  onChange={(e) => setAccountCode(e.target.value)}
                  placeholder="Misal: 5-106"
                  required
                  disabled={!!editingCoa}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono disabled:opacity-60 disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Nama Akun
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Misal: Beban Pemeliharaan & Perbaikan AC"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Kategori Akun
                </label>
                <select
                  value={accountCategory}
                  onChange={(e) => setAccountCategory(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Expense">Expense (Beban Usaha)</option>
                  <option value="Revenue">Revenue (Pendapatan)</option>
                  <option value="Asset">Asset (Kas & Bank)</option>
                  <option value="Liability">Liability (Hutang)</option>
                  <option value="Equity">Equity (Modal)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCoaModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  {editingCoa ? 'Simpan Perubahan' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus COA */}
      {coaToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Hapus Bagan Akun?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {coaToDelete.Account_Code} - {coaToDelete.Account_Name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus akun ini dari bagan akun?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCoaToDelete(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCoa}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
              >
                Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah / Edit Pengguna (Users & Roles) */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {editingUser ? 'Edit Pengguna & Hak Akses' : 'Tambah Pengguna Baru'}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    ID Pengguna
                  </label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                    disabled={!!editingUser}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-slate-800/80"
                  />
                  {editingUser && (
                    <span className="text-[10px] text-slate-400 mt-0.5 block">ID Pengguna permanen</span>
                  )}
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Status Akun
                  </label>
                  <select
                    value={userStatus}
                    onChange={(e) => setUserStatus(e.target.value as 'Active' | 'Inactive')}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Active">Active (Aktif)</option>
                    <option value="Inactive">Inactive (Non-Aktif)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Nama Lengkap Pengguna
                </label>
                <input
                  type="text"
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  placeholder="Misal: Ahmad Zaki"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Email Akun
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="nama@nusantaragroup.co.id"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Role Sistem
                  </label>
                  <select
                    value={userRole}
                    onChange={(e) => {
                      const r = e.target.value as UserRole;
                      setUserRole(r);
                      if (r === 'Superadmin') {
                        setUserStoreId('ALL');
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
                  >
                    <option value="Superadmin">Superadmin</option>
                    <option value="Finance Admin">Finance Admin</option>
                    <option value="Store Manager">Store Manager</option>
                    <option value="Employee">Employee</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Lingkup Cabang Toko
                  </label>
                  <select
                    value={userRole === 'Superadmin' ? 'ALL' : userStoreId}
                    onChange={(e) => setUserStoreId(e.target.value)}
                    disabled={userRole === 'Superadmin'}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-60 disabled:bg-slate-100"
                  >
                    <option value="ALL">Semua Cabang (ALL)</option>
                    {stores.map((s) => (
                      <option key={s.Store_ID} value={s.Store_ID}>
                        {s.Store_Name} ({s.Store_ID})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5 text-[11px] text-slate-500 border border-slate-100 dark:border-slate-800">
                {userRole === 'Superadmin' && 'Superadmin memiliki akses tak terbatas ke semua cabang dan laporan keuangan.'}
                {userRole === 'Finance Admin' && 'Finance Admin dapat mengelola transaksi, laporan laba rugi, dan proses penggajian.'}
                {userRole === 'Store Manager' && 'Store Manager hanya dapat melihat dan memasukkan transaksi untuk cabang yang dipilih.'}
                {userRole === 'Employee' && 'Employee hanya dapat melihat dan mencetak slip gaji pribadi milik mereka sendiri.'}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Pengguna */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Hapus Pengguna?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tindakan ini akan mencabut akses login pengguna.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Pengguna:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {userToDelete.Full_Name} ({userToDelete.User_ID})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-800 dark:text-slate-200">{userToDelete.Email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role Sistem:</span>
                <span className="font-medium text-slate-900 dark:text-white">{userToDelete.Role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lingkup Cabang:</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {userToDelete.Store_ID === 'ALL'
                    ? 'Semua Cabang'
                    : stores.find((s) => s.Store_ID === userToDelete.Store_ID)?.Store_Name || userToDelete.Store_ID}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus data pengguna ini dari sistem?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs"
              >
                Hapus Pengguna
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
