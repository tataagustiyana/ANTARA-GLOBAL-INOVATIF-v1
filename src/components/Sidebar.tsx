import {
  ArrowLeftRight,
  BarChart3,
  Building,
  Building2,
  Database,
  FileSpreadsheet,
  HandCoins,
  LayoutDashboard,
  Package,
  Percent,
  Receipt,
  Settings,
  Target,
  Truck,
  Users,
  Landmark,
  Save,
} from 'lucide-react';
import React from 'react';
import { CompanyProfile, User } from '../types';

export type ActiveTabType =
  | 'dashboard'
  | 'transactions'
  | 'debts'
  | 'profit_loss'
  | 'taxes'
  | 'budget'
  | 'purchase_orders'
  | 'supplier_debts'
  | 'employee_loans'
  | 'payroll'
  | 'employees'
  | 'stores_coa'
  | 'company_profile'
  | 'sheets_setup'
  | 'mdr_rates'
  | 'backup_restore';

interface SidebarProps {
  activeTab: ActiveTabType;
  onSelectTab: (tab: ActiveTabType) => void;
  currentUser: User;
  companyProfile?: CompanyProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  companyProfile,
  isOpen,
  onClose,
}) => {
  const isEmployee = currentUser.Role === 'Employee';

  const menuItems: { id: ActiveTabType; label: string; icon: React.ReactNode; allowed: boolean }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
      allowed: true,
    },
    {
      id: 'transactions',
      label: 'Transaksi Keuangan',
      icon: <Receipt className="h-4 w-4" />,
      allowed: !isEmployee,
    },
    {
      id: 'profit_loss',
      label: 'Laba Rugi & Arus Kas',
      icon: <BarChart3 className="h-4 w-4" />,
      allowed: currentUser.Role === 'Superadmin' || currentUser.Role === 'Finance Admin',
    },
    {
      id: 'taxes',
      label: 'Manajemen Pajak',
      icon: <Percent className="h-4 w-4" />,
      allowed: currentUser.Role === 'Superadmin' || currentUser.Role === 'Finance Admin',
    },
    {
      id: 'budget',
      label: 'Target & Anggaran',
      icon: <Target className="h-4 w-4" />,
      allowed: !isEmployee,
    },
    {
      id: 'purchase_orders',
      label: 'Purchase Order (PO)',
      icon: <Package className="h-4 w-4" />,
      allowed: !isEmployee,
    },
    {
      id: 'debts',
      label: 'Hutang & Cicilan',
      icon: <Landmark className="h-4 w-4" />,
      allowed: !isEmployee,
    },
    {
      id: 'supplier_debts',
      label: 'Hutang ke Supplier',
      icon: <Truck className="h-4 w-4" />,
      allowed: !isEmployee,
    },
    {
      id: 'employee_loans',
      label: isEmployee ? 'Pinjaman Saya' : 'Pinjaman Karyawan',
      icon: <HandCoins className="h-4 w-4" />,
      allowed: true,
    },
    {
      id: 'payroll',
      label: isEmployee ? 'Slip Gaji Saya' : 'Penggajian (Payroll)',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      allowed: true,
    },
    {
      id: 'employees',
      label: 'Data Karyawan',
      icon: <Users className="h-4 w-4" />,
      allowed: !isEmployee,
    },
    {
      id: 'stores_coa',
      label: 'Toko & Bagan Akun',
      icon: <Building2 className="h-4 w-4" />,
      allowed: currentUser.Role === 'Superadmin' || currentUser.Role === 'Finance Admin',
    },
    {
      id: 'mdr_rates',
      label: 'Tarif MDR Non-Tunai',
      icon: <Percent className="h-4 w-4" />,
      allowed: currentUser.Role === 'Superadmin' || currentUser.Role === 'Finance Admin',
    },
    {
      id: 'company_profile',
      label: 'Profil Perusahaan & Logo',
      icon: <Building className="h-4 w-4" />,
      allowed: currentUser.Role === 'Superadmin' || currentUser.Role === 'Finance Admin',
    },
    {
      id: 'sheets_setup',
      label: 'Google Sheets DB',
      icon: <Database className="h-4 w-4" />,
      allowed: currentUser.Role === 'Superadmin' || currentUser.Role === 'Finance Admin',
    },
    {
      id: 'backup_restore',
      label: 'Simpan & Cadangan Data',
      icon: <Save className="h-4 w-4" />,
      allowed: true,
    },
  ];

  const brandName = companyProfile?.brandName || 'Nusantara Retail';
  const logoInitial = brandName.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo Zone: Single text element wordmark as per Top Bar / Brand Contract */}
        <div className="flex h-16 items-center px-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {companyProfile?.logoUrl ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white p-1 border border-slate-200 shadow-xs dark:border-slate-700 dark:bg-slate-800">
                <img
                  src={companyProfile.logoUrl}
                  alt={brandName}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm tracking-wider shadow-xs">
                {logoInitial}
              </div>
            )}
            <div className="truncate">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white block truncate">
                {brandName}
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5 truncate">
                Multi-Store System
              </span>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Menu Utama
          </div>

          {menuItems
            .filter((item) => item.allowed)
            .map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
        </div>

        {/* Quick Role / User Info in Sidebar Footer */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
                {currentUser.Role}
              </span>
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-900 dark:text-white truncate">
              {currentUser.Full_Name}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              {currentUser.Store_ID === 'ALL' ? 'Akses Semua Toko' : currentUser.Store_ID}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
