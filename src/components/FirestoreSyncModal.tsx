import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Cloud,
  Copy,
  Database,
  ExternalLink,
  Laptop,
  Radio,
  RefreshCw,
  Server,
  Share2,
  ShieldCheck,
  Smartphone,
  X,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { LiveActivity } from '../types';

interface FirestoreSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirestoreConnected: boolean;
  deviceId: string;
  liveActivities: LiveActivity[];
  itemCounts: {
    transactions: number;
    stores: number;
    coa: number;
    users: number;
    employees: number;
    payroll: number;
    budgets: number;
    loans: number;
    debts: number;
    purchaseOrders: number;
    taxComponents: number;
    taxPayments: number;
  };
  onSendTestPing?: () => void;
}

export const FirestoreSyncModal: React.FC<FirestoreSyncModalProps> = ({
  isOpen,
  onClose,
  isFirestoreConnected,
  deviceId,
  liveActivities,
  itemCounts,
  onSendTestPing,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSendingPing, setIsSendingPing] = useState(false);

  if (!isOpen) return null;

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestPing = async () => {
    if (!onSendTestPing) return;
    setIsSendingPing(true);
    try {
      await onSendTestPing();
    } finally {
      setTimeout(() => setIsSendingPing(false), 600);
    }
  };

  const collectionsList = [
    { name: 'Transaksi Keuangan', collection: 'transactions', count: itemCounts.transactions, desc: 'Pemasukan, pengeluaran & transfer kas' },
    { name: 'Cabang Toko / Outlet', collection: 'stores', count: itemCounts.stores, desc: 'Master cabang dan unit usaha' },
    { name: 'Bagan Akun (COA)', collection: 'chart_of_accounts', count: itemCounts.coa, desc: 'Akun aktiva, pasiva, pendapatan & beban' },
    { name: 'Pengguna & RBAC', collection: 'users', count: itemCounts.users, desc: 'Hak akses & persona multi-role' },
    { name: 'Data Karyawan', collection: 'employees', count: itemCounts.employees, desc: 'Master staff & penetapan cabang' },
    { name: 'Penggajian (Payroll)', collection: 'payroll_runs', count: itemCounts.payroll, desc: 'Slip gaji, tunjangan, komisi & potongan' },
    { name: 'Pagu & Anggaran', collection: 'budgets', count: itemCounts.budgets, desc: 'Target omset & limit beban per cabang' },
    { name: 'Profil Perusahaan', collection: 'company_profile', count: 1, desc: 'Identitas legal, nama brand & logo' },
    { name: 'Pinjaman Karyawan', collection: 'employee_loans', count: itemCounts.loans, desc: 'Kasbon berjangka & angsuran' },
    { name: 'Hutang Supplier', collection: 'supplier_debts', count: itemCounts.debts, desc: 'Accounts payable & riwayat pelunasan' },
    { name: 'Purchase Orders (PO)', collection: 'purchase_orders', count: itemCounts.purchaseOrders, desc: 'Pesanan vendor & konversi hutang' },
    { name: 'Komponen Pajak', collection: 'tax_components', count: itemCounts.taxComponents, desc: 'Pengaturan tarif & jenis pajak manual' },
    { name: 'Penyetoran Pajak (NTPN)', collection: 'tax_payments', count: itemCounts.taxPayments, desc: 'Rekam billing DJP & NTPN negara' },
    { name: 'Pengaturan Google Sheets', collection: 'app_settings', count: 1, desc: 'URL Web App & integrasi cloud spread sheet' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Pusat Sinkronisasi Real-Time Firebase Firestore
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Semua entitas data terhubung real-time di seluruh perangkat (Firebase SDK v10+ Modular onSnapshot).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Status Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-indigo-100 bg-linear-to-br from-indigo-50/80 to-white p-4 dark:border-indigo-900/40 dark:from-indigo-950/30 dark:to-slate-900">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-1">
                <span>STATUS KONEKSI</span>
                <Radio className="h-4 w-4 animate-pulse text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500" />
                {isFirestoreConnected ? 'Tersambung Real-Time' : 'Menghubungkan...'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Perubahan pada HP, tablet, atau PC lain langsung muncul tanpa refresh.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                <span>DATABASE INSTANCE</span>
                <Server className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate" title="ai-studio-antaraglobalinov-7d11469e-4c72-4534-8070-bd3525c519c2">
                ai-studio-antaraglobalinov-...
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Region: <strong className="text-slate-700 dark:text-slate-300">asia-southeast1</strong>
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                <span>DEVICE ID SESI INI</span>
                <Laptop className="h-4 w-4 text-slate-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
                  {deviceId}
                </span>
                <button
                  onClick={handleCopyDeviceId}
                  className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  title="Salin Device ID"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {copied ? 'Tersalin ke clipboard!' : 'ID unik untuk membedakan perangkat lain.'}
              </p>
            </div>
          </div>

          {/* Test Real-Time Ping Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  Uji Kirim Sinyal Real-Time ke Perangkat Lain
                </h4>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300/80">
                  Klik tombol di samping untuk membuktikan sinkronisasi instan di browser/perangkat Anda yang lain.
                </p>
              </div>
            </div>
            <button
              onClick={handleTestPing}
              disabled={isSendingPing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSendingPing ? 'animate-spin' : ''}`} />
              <span>{isSendingPing ? 'Mengirim Sinyal...' : 'Kirim Sinyal Uji (Ping)'}</span>
            </button>
          </div>

          {/* Real-time Collections Grid */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>14 Entitas Data Terintegrasi Real-Time</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  100% onSnapshot
                </span>
              </h4>
              <span className="text-[11px] text-slate-500">Auto-Reactivity</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {collectionsList.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {item.name}
                    </span>
                    <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {item.count} data
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="truncate">{item.desc}</span>
                  </div>
                  <div className="mt-1 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    /{item.collection}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Activity Stream (Cross-Device Feed) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Log Aktivitas Real-Time Antar Perangkat</span>
              </h4>
              <span className="text-[11px] text-slate-500">
                {liveActivities.length} aktivitas terekam
              </span>
            </div>

            {liveActivities.length > 0 ? (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900 max-h-56 overflow-y-auto">
                {liveActivities.slice(0, 10).map((act) => {
                  const isFromMe = act.actorDeviceId === deviceId;
                  const timeFormatted = new Date(act.timestamp).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  return (
                    <div
                      key={act.id}
                      className="flex items-start justify-between gap-3 p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {act.userName}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              {act.userRole}
                            </span>
                            {isFromMe ? (
                              <span className="rounded bg-blue-50 px-1 py-0.2 text-[9px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                Perangkat Ini
                              </span>
                            ) : (
                              <span className="rounded bg-purple-50 px-1 py-0.2 text-[9px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                                Perangkat Lain
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                            {act.action}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {act.details}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] font-mono text-slate-400">
                        {timeFormatted}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
                Belum ada aktivitas tercatat di sesi ini. Mulai lakukan transaksi, payroll, atau perubahan data untuk melihat stream aktivitas live.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-850">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Keamanan Firestore Rules v2 aktif dengan hak akses granular</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
