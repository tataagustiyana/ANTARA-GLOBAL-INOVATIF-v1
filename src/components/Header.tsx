import {
  BookOpen,
  Building,
  ChevronDown,
  Cloud,
  Database,
  Lock,
  LogIn,
  LogOut,
  Moon,
  Save,
  Shield,
  Store as StoreIcon,
  Sun,
  UserCheck,
} from 'lucide-react';
import React, { useState } from 'react';
import { BookPeriodConfig, CompanyProfile, GoogleSheetsConfig, Store, User } from '../types';

interface HeaderProps {
  stores: Store[];
  activeStoreId: string;
  onSelectStore: (storeId: string) => void;
  currentUser: User;
  users: User[];
  onSelectUser: (user: User) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  sheetsConfig: GoogleSheetsConfig;
  onOpenSheetsModal: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  companyProfile?: CompanyProfile;
  onNavigateTab?: (tab: any) => void;
  onOpenAuthModal?: () => void;
  isFirestoreConnected?: boolean;
  onOpenFirestoreModal?: () => void;
  bookPeriodConfig?: BookPeriodConfig;
  onOpenBookClosingModal?: () => void;
  onOpenBackupModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stores,
  activeStoreId,
  onSelectStore,
  currentUser,
  users,
  onSelectUser,
  darkMode,
  onToggleDarkMode,
  sheetsConfig,
  onOpenSheetsModal,
  sidebarOpen,
  onToggleSidebar,
  companyProfile,
  onNavigateTab,
  onOpenAuthModal,
  isFirestoreConnected = true,
  onOpenFirestoreModal,
  bookPeriodConfig,
  onOpenBookClosingModal,
  onOpenBackupModal,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);

  // Can the user switch stores? Superadmin and global Finance Admin can. Store Managers and Employees are locked to their store.
  const isStoreSelectorAllowed =
    currentUser.Role === 'Superadmin' ||
    (currentUser.Role === 'Finance Admin' && currentUser.Store_ID === 'ALL');

  const activeStore = stores.find((s) => s.Store_ID === activeStoreId);
  const activeStoreLabel =
    activeStoreId === 'ALL'
      ? 'Semua Toko (Konsolidasi)'
      : activeStore
      ? activeStore.Store_Name
      : 'Pilih Toko';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 md:px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 transition-colors">
      {/* Left Zone: Sidebar Mobile Toggle & Brand Indicator */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={sidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
            />
          </svg>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs">
            NR
          </div>
          <div className="hidden sm:block">
            <div className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
              {companyProfile?.brandName || 'Nusantara Retail'}
            </div>
            <div className="text-[10px] text-slate-400 leading-tight">
              Sistem Keuangan & Payroll Terpadu
            </div>
          </div>
        </div>
      </div>

      {/* Right Zone: Store Selector (PILIH LINGKUP TOKO), Google Sheets, Dark Mode, Identitas / Login */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Store Selector (Pindah ke sebelah kanan sesuai instruksi) */}
        <div className="relative">
          {isStoreSelectorAllowed ? (
            <div>
              <button
                onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                title="Pilih Lingkup Toko"
              >
                <StoreIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[130px] sm:max-w-[190px]">
                  {activeStoreLabel}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {storeDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setStoreDropdownOpen(false)}
                >
                  <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Pilih Lingkup Toko:
                  </div>
                  <button
                    onClick={() => onSelectStore('ALL')}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer ${
                      activeStoreId === 'ALL'
                        ? 'bg-emerald-50 text-emerald-700 font-semibold dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">Semua Toko (Konsolidasi Pusat)</span>
                    {activeStoreId === 'ALL' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  {stores.map((s) => (
                    <button
                      key={s.Store_ID}
                      onClick={() => onSelectStore(s.Store_ID)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer ${
                        activeStoreId === s.Store_ID
                          ? 'bg-emerald-50 text-emerald-700 font-semibold dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-left truncate">
                        <div className="font-medium truncate">{s.Store_Name}</div>
                        <div className="text-[10px] text-slate-400">{s.Store_ID}</div>
                      </div>
                      {activeStoreId === s.Store_ID && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
              <StoreIcon className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                {activeStore?.Store_Name || activeStoreId}
              </span>
            </div>
          )}
        </div>

        {/* Buka Buku & Tutup Buku Status / Modal Button */}
        {bookPeriodConfig && onOpenBookClosingModal && (
          <button
            onClick={onOpenBookClosingModal}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              bookPeriodConfig.currentPeriodStatus === 'OPEN'
                ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-amber-200 bg-amber-50/80 text-amber-800 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
            title={`Status Buku: ${
              bookPeriodConfig.currentPeriodStatus === 'OPEN' ? 'Buku Terbuka' : 'Buku Ditutup'
            } (${bookPeriodConfig.startDate} s/d ${bookPeriodConfig.endDate}). Klik untuk sesuaikan tanggal aturan cut-off perusahaan atau tutup/buka buku.`}
          >
            {bookPeriodConfig.currentPeriodStatus === 'OPEN' ? (
              <BookOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <span className="hidden sm:inline font-semibold">
              {bookPeriodConfig.currentPeriodStatus === 'OPEN' ? 'Buku Terbuka' : 'Buku Ditutup'}
            </span>
            <span
              className={`h-2 w-2 rounded-full ${
                bookPeriodConfig.currentPeriodStatus === 'OPEN'
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
          </button>
        )}

        {/* Firestore Real-Time Cloud Sync Indicator */}
        <button
          onClick={onOpenFirestoreModal}
          className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 px-2.5 py-1.5 text-xs font-medium text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 dark:text-indigo-300 transition-colors cursor-pointer"
          title="Klik untuk membuka Status Sinkronisasi Real-Time Firestore"
        >
          <Cloud className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="hidden lg:inline">
            Firestore Real-time
          </span>
          <span
            className={`h-2 w-2 rounded-full ${
              isFirestoreConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            }`}
          />
        </button>

        {/* Google Sheets Status Badge */}
        <button
          onClick={onOpenSheetsModal}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
            sheetsConfig.isConnected
              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/70 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
          title="Status Database Google Sheets"
        >
          <Database className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline">
            {sheetsConfig.isConnected ? 'Sheets Aktif' : 'Setup Sheets'}
          </span>
          <span
            className={`h-2 w-2 rounded-full ${
              sheetsConfig.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            }`}
          />
        </button>

        {/* Simpan & Cadangkan Data Button */}
        {onOpenBackupModal && (
          <button
            onClick={onOpenBackupModal}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Simpan & Cadangkan Data agar Tidak Hilang (Backup & Restore)"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="inline">Simpan Data</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-200 animate-pulse" />
          </button>
        )}

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Toggle mode gelap"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Identitas Pengguna & Login Button */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 pr-2.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 transition-colors cursor-pointer"
            title="Identitas Pengguna & Opsi Login"
          >
            {currentUser.Avatar ? (
              <img
                src={currentUser.Avatar}
                alt={currentUser.Full_Name}
                className="h-7 w-7 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                {currentUser.Full_Name.charAt(0)}
              </div>
            )}
            <div className="hidden sm:block text-left text-xs">
              <div className="font-semibold text-slate-900 dark:text-white leading-tight truncate max-w-[120px]">
                {currentUser.Full_Name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                {currentUser.Role}
              </div>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {userDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in zoom-in-95 duration-100"
              onClick={() => setUserDropdownOpen(false)}
            >
              {/* Account Header */}
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  Identitas Pengguna
                </span>
                <span className="font-bold text-xs text-slate-900 dark:text-white block mt-0.5 truncate">
                  {currentUser.Full_Name}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                  {currentUser.Email || 'Belum terhubung email'}
                </span>
              </div>

              {/* Action: Open Login / Firebase Authentication Modal */}
              {onOpenAuthModal && (
                <div className="py-1 border-b border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenAuthModal();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950/80 transition-colors cursor-pointer"
                  >
                    <LogIn className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Masuk dengan Google / Email</span>
                  </button>
                </div>
              )}

              {/* Quick Persona Switching (RBAC Demo) */}
              <div className="px-2 pt-2 pb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Ganti Role Pengguna (Demo RBAC):
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {users.map((u) => {
                  const isSelected = u.User_ID === currentUser.User_ID;
                  return (
                    <button
                      key={u.User_ID}
                      onClick={() => onSelectUser(u)}
                      className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-100 text-slate-900 font-semibold dark:bg-slate-800 dark:text-white'
                          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <UserCheck
                        className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                          isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                        }`}
                      />
                      <div className="text-left truncate">
                        <div className="font-medium text-slate-900 dark:text-white truncate">
                          {u.Full_Name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {u.Role} · {u.Store_ID === 'ALL' ? 'Semua Cabang' : u.Store_ID}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {(currentUser.Role === 'Superadmin' || currentUser.Role === 'Finance Admin') && onNavigateTab && (
                <div className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-800">
                  <button
                    onClick={() => {
                      onNavigateTab('company_profile');
                      setUserDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 font-medium cursor-pointer"
                  >
                    <Building className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Profil Perusahaan & Logo</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

