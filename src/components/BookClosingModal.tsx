import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  FileSpreadsheet,
  History,
  Lock,
  LockOpen,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { StorageService } from '../services/storageService';
import { BookClosingHistory, BookPeriodConfig, ChartOfAccount, Store, Transaction, User } from '../types';
import { formatDate, formatPeriod, formatRupiah, getTodayString } from '../utils/formatters';

interface BookClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BookPeriodConfig;
  onSaveConfig: (newConfig: BookPeriodConfig) => Promise<void>;
  history: BookClosingHistory[];
  onSaveClosingRecord: (record: BookClosingHistory) => Promise<void>;
  onDeleteClosingRecord?: (id: string) => Promise<void>;
  transactions: Transaction[];
  chartOfAccounts: ChartOfAccount[];
  stores: Store[];
  currentUser: User;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const BookClosingModal: React.FC<BookClosingModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  history,
  onSaveClosingRecord,
  onDeleteClosingRecord,
  transactions,
  chartOfAccounts,
  stores,
  currentUser,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'closing' | 'config' | 'history'>('closing');

  // Form State: Aturan Tanggal Perusahaan
  const [cutoffDay, setCutoffDay] = useState<number>(config.cutoffDay || 25);
  const [startDate, setStartDate] = useState<string>(config.startDate || '2026-09-26');
  const [endDate, setEndDate] = useState<string>(config.endDate || '2026-10-25');
  const [periodLabel, setPeriodLabel] = useState<string>(config.currentPeriod || '2026-10');
  const [policyNotes, setPolicyNotes] = useState<string>(
    config.notes || 'Periode cut-off buku bulanan tanggal 25.'
  );

  // Form State: Tutup Buku Action
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [reopenNotes, setReopenNotes] = useState<string>('');
  const [isConfirmClosingOpen, setIsConfirmClosingOpen] = useState<boolean>(false);
  const [isConfirmReopenOpen, setIsConfirmReopenOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Search state in History tab
  const [historySearchTerm, setHistorySearchTerm] = useState<string>('');

  // Form State: Edit Riwayat Tutup Buku
  const [editingRecord, setEditingRecord] = useState<BookClosingHistory | null>(null);
  const [editPeriod, setEditPeriod] = useState<string>('');
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [editEndDate, setEditEndDate] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'CLOSED' | 'REOPENED'>('CLOSED');
  const [editTotalRevenue, setEditTotalRevenue] = useState<number | ''>(0);
  const [editTotalExpense, setEditTotalExpense] = useState<number | ''>(0);
  const [editNetProfit, setEditNetProfit] = useState<number | ''>(0);
  const [editRetainedEarnings, setEditRetainedEarnings] = useState<number | ''>(0);
  const [editTransactionCount, setEditTransactionCount] = useState<number | ''>(0);
  const [editClosedBy, setEditClosedBy] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  // State: Konfirmasi Hapus Riwayat Tutup Buku
  const [deletingRecord, setDeletingRecord] = useState<BookClosingHistory | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Sync state if config prop updates
  React.useEffect(() => {
    setCutoffDay(config.cutoffDay || 25);
    setStartDate(config.startDate || '2026-09-26');
    setEndDate(config.endDate || '2026-10-25');
    setPeriodLabel(config.currentPeriod || '2026-10');
    setPolicyNotes(config.notes || 'Periode cut-off buku bulanan tanggal 25.');
  }, [config]);

  // Hitung transaksi dalam periode aktif berjalan [startDate ... endDate]
  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.Status !== 'Approved') return false;
      if (!t.Date) return false;
      return t.Date >= startDate && t.Date <= endDate;
    });
  }, [transactions, startDate, endDate]);

  // Ringkasan Finansial Periode Berjalan
  const summary = useMemo(() => {
    let rev = 0;
    let exp = 0;
    let liabInflow = 0;
    let liabOutflow = 0;
    let eqInflow = 0;
    let eqOutflow = 0;

    periodTransactions.forEach((t) => {
      if (t.Type === 'Pemasukan') {
        rev += t.Amount || 0;
      } else if (t.Type === 'Pengeluaran') {
        exp += t.Amount || 0;
      } else if (t.Type === 'Liability') {
        if (t.Direction === 'Inflow') {
          liabInflow += t.Amount || 0;
        } else {
          liabOutflow += t.Amount || 0;
        }
      } else if (t.Type === 'Equity') {
        if (t.Direction === 'Inflow') {
          eqInflow += t.Amount || 0;
        } else {
          eqOutflow += t.Amount || 0;
        }
      }
    });

    const netProfit = rev - exp;
    return {
      totalRevenue: rev,
      totalExpense: exp,
      netProfit,
      liabInflow,
      liabOutflow,
      eqInflow,
      eqOutflow,
      count: periodTransactions.length,
    };
  }, [periodTransactions]);

  // Handler: Simpan Aturan Periode & Tanggal Cut-off
  const handleSavePeriodConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updatedConfig: BookPeriodConfig = {
        ...config,
        cutoffDay: Number(cutoffDay),
        startDate,
        endDate,
        currentPeriod: periodLabel,
        notes: policyNotes,
        updatedAt: getTodayString(),
        updatedBy: `${currentUser.Full_Name} (${currentUser.Role})`,
      };
      await onSaveConfig(updatedConfig);
      onShowToast?.('Aturan periode dan tanggal buku perusahaan berhasil disimpan!', 'success');
      setActiveTab('closing');
    } catch (err: any) {
      alert('Gagal menyimpan aturan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Eksekusi TUTUP BUKU (Close Book)
  const handleExecuteCloseBook = async () => {
    setIsSubmitting(true);
    try {
      const closingId = `CLOSE-${periodLabel}-${Date.now().toString().slice(-4)}`;
      const newRecord: BookClosingHistory = {
        id: closingId,
        period: periodLabel,
        startDate,
        endDate,
        status: 'CLOSED',
        closedAt: `${getTodayString()} ${new Date().toLocaleTimeString('id-ID')}`,
        closedBy: `${currentUser.Full_Name} (${currentUser.Role})`,
        totalRevenue: summary.totalRevenue,
        totalExpense: summary.totalExpense,
        netProfit: summary.netProfit,
        totalLiabilityInflow: summary.liabInflow,
        totalLiabilityOutflow: summary.liabOutflow,
        totalEquityInflow: summary.eqInflow,
        totalEquityOutflow: summary.eqOutflow,
        transactionCount: summary.count,
        retainedEarningsTransferred: summary.netProfit,
        notes: closingNotes.trim() || `Tutup buku periode ${periodLabel} berhasil diverifikasi. Laba bersih ditransfer ke Ekuitas Akun 3-104 (Laba Ditahan).`,
      };

      // 1. Simpan history penutupan
      await onSaveClosingRecord(newRecord);

      // 2. Update config status ke CLOSED
      const updatedConfig: BookPeriodConfig = {
        ...config,
        currentPeriodStatus: 'CLOSED',
        currentPeriod: periodLabel,
        startDate,
        endDate,
        updatedAt: getTodayString(),
        updatedBy: `${currentUser.Full_Name} (${currentUser.Role})`,
      };
      await onSaveConfig(updatedConfig);

      setIsConfirmClosingOpen(false);
      setClosingNotes('');
      onShowToast?.(
        `Buku periode ${periodLabel} resmi DITUTUP. Laba bersih dialihkan ke Ekuitas Laba Ditahan.`,
        'success'
      );
    } catch (err: any) {
      alert('Gagal menutup buku: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Eksekusi BUKA BUKU KEMBALI (Re-open Book)
  const handleExecuteReopenBook = async () => {
    setIsSubmitting(true);
    try {
      const activeRecord = history.find((h) => h.period === periodLabel && h.status === 'CLOSED');
      if (activeRecord) {
        const updatedRecord: BookClosingHistory = {
          ...activeRecord,
          status: 'REOPENED',
          reopenedAt: `${getTodayString()} ${new Date().toLocaleTimeString('id-ID')}`,
          reopenedBy: `${currentUser.Full_Name} (${currentUser.Role})`,
          notes: `${activeRecord.notes || ''} [Dibuka kembali: ${reopenNotes || 'Revisi/Audit susulan'}]`,
        };
        await onSaveClosingRecord(updatedRecord);
      }

      const updatedConfig: BookPeriodConfig = {
        ...config,
        currentPeriodStatus: 'OPEN',
        updatedAt: getTodayString(),
        updatedBy: `${currentUser.Full_Name} (${currentUser.Role})`,
      };
      await onSaveConfig(updatedConfig);

      setIsConfirmReopenOpen(false);
      setReopenNotes('');
      onShowToast?.(`Buku periode ${periodLabel} berhasil DIBUKA KEMBALI untuk penyesuaian.`, 'info');
    } catch (err: any) {
      alert('Gagal membuka kembali buku: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ekspor Riwayat Tutup Buku ke Excel
  const handleExportHistory = () => {
    const headers = [
      'ID Tutup Buku',
      'Periode',
      'Tanggal Mulai',
      'Tanggal Selesai',
      'Status Buku',
      'Total Pendapatan (Rp)',
      'Total Beban (Rp)',
      'Laba/Rugi Bersih (Rp)',
      'Jumlah Trx',
      'Ditutup Oleh',
      'Waktu Tutup',
      'Catatan',
    ];
    const rows = history.map((h) => [
      h.id,
      h.period,
      h.startDate,
      h.endDate,
      h.status,
      h.totalRevenue,
      h.totalExpense,
      h.netProfit,
      h.transactionCount,
      h.closedBy,
      h.closedAt,
      h.notes || '-',
    ]);

    StorageService.exportToExcel(`Riwayat_Tutup_Buku_${getTodayString()}.xlsx`, headers, rows, 'Tutup_Buku');
    onShowToast?.('Riwayat tutup buku berhasil diekspor ke Excel.', 'success');
  };

  // Filter Riwayat Tutup Buku berdasarkan kata kunci pencarian
  const filteredHistory = useMemo(() => {
    if (!historySearchTerm.trim()) return history;
    const q = historySearchTerm.toLowerCase();
    return history.filter(
      (h) =>
        h.period.toLowerCase().includes(q) ||
        h.id.toLowerCase().includes(q) ||
        (h.closedBy || '').toLowerCase().includes(q) ||
        (h.notes || '').toLowerCase().includes(q) ||
        h.startDate.includes(q) ||
        h.endDate.includes(q)
    );
  }, [history, historySearchTerm]);

  // Handler: Buka modal edit riwayat tutup buku
  const handleOpenEdit = (record: BookClosingHistory) => {
    setEditingRecord(record);
    setEditPeriod(record.period);
    setEditStartDate(record.startDate);
    setEditEndDate(record.endDate);
    setEditStatus(record.status);
    setEditTotalRevenue(record.totalRevenue);
    setEditTotalExpense(record.totalExpense);
    setEditNetProfit(record.netProfit);
    setEditRetainedEarnings(record.retainedEarningsTransferred ?? record.netProfit);
    setEditTransactionCount(record.transactionCount);
    setEditClosedBy(record.closedBy);
    setEditNotes(record.notes || '');
  };

  // Helper: Hitung Laba Bersih Otomatis pada modal edit
  const handleAutoCalculateNetProfit = () => {
    const rev = Number(editTotalRevenue) || 0;
    const exp = Number(editTotalExpense) || 0;
    const net = rev - exp;
    setEditNetProfit(net);
    setEditRetainedEarnings(net);
  };

  // Handler: Simpan perubahan edit riwayat tutup buku
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setIsSubmittingEdit(true);
    try {
      const revenue = Number(editTotalRevenue) || 0;
      const expense = Number(editTotalExpense) || 0;
      const net = editNetProfit !== '' ? Number(editNetProfit) : revenue - expense;
      const retained = editRetainedEarnings !== '' ? Number(editRetainedEarnings) : net;

      const updatedRecord: BookClosingHistory = {
        ...editingRecord,
        period: editPeriod.trim() || editingRecord.period,
        startDate: editStartDate,
        endDate: editEndDate,
        status: editStatus,
        totalRevenue: revenue,
        totalExpense: expense,
        netProfit: net,
        retainedEarningsTransferred: retained,
        transactionCount: Number(editTransactionCount) || 0,
        closedBy: editClosedBy.trim() || editingRecord.closedBy,
        notes: editNotes.trim(),
      };

      await onSaveClosingRecord(updatedRecord);
      onShowToast?.(`Riwayat tutup buku periode ${updatedRecord.period} berhasil diperbarui!`, 'success');
      setEditingRecord(null);
    } catch (err: any) {
      alert('Gagal memperbarui riwayat tutup buku: ' + err.message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handler: Konfirmasi hapus riwayat tutup buku
  const handleConfirmDelete = async () => {
    if (!deletingRecord) return;
    setIsDeleting(true);
    try {
      if (onDeleteClosingRecord) {
        await onDeleteClosingRecord(deletingRecord.id);
      }
      onShowToast?.(`Riwayat tutup buku periode ${deletingRecord.period} berhasil dihapus.`, 'info');
      setDeletingRecord(null);
    } catch (err: any) {
      alert('Gagal menghapus riwayat tutup buku: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const isClosed = config.currentPeriodStatus === 'CLOSED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8 overflow-hidden">
        {/* Header Banner */}
        <div className={`p-6 border-b transition-colors ${
          isClosed
            ? 'bg-amber-500/10 border-amber-200 dark:border-amber-900/50'
            : 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/50'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-xs ${
                isClosed
                  ? 'bg-amber-500 text-white shadow-amber-500/20'
                  : 'bg-emerald-600 text-white shadow-emerald-500/20'
              }`}>
                {isClosed ? <Lock className="h-6 w-6" /> : <LockOpen className="h-6 w-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Buka Buku & Tutup Buku Perusahaan
                  </h2>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isClosed
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  }`}>
                    {isClosed ? 'TUTUP BUKU (TERKUNCI)' : 'BUKA BUKU (AKTIF)'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Periode Aktif: <strong>{periodLabel}</strong> ({startDate} s/d {endDate}) · Aturan Cut-Off: Tgl {cutoffDay === 0 ? 'Akhir Bulan' : cutoffDay}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-5">
            <button
              onClick={() => setActiveTab('closing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'closing'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-white/80 text-slate-600 hover:bg-white dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Status & Eksekusi Buku</span>
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'config'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-white/80 text-slate-600 hover:bg-white dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Sesuaikan Tanggal & Aturan Cut-off</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-white/80 text-slate-600 hover:bg-white dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Riwayat Tutup Buku ({history.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* TAB 1: STATUS & EKSEKUSI BUKU */}
          {activeTab === 'closing' && (
            <div className="space-y-6">
              {/* Status Banner Message */}
              {isClosed ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800/80 dark:bg-amber-950/30">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        Buku Laporan Keuangan Periode {periodLabel} Sedang DITUTUP
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                        Transaksi pada rentang <strong>{startDate} s/d {endDate}</strong> telah difinalisasi dan saldo laba bersih dialihkan ke Ekuitas Laba Ditahan. Transaksi periode ini dilindungi dari penambahan atau pengubahan.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => setIsConfirmReopenOpen(true)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors cursor-pointer shadow-xs"
                        >
                          <LockOpen className="h-3.5 w-3.5" />
                          <span>Buka Buku Kembali (Re-open Period)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/80 dark:bg-emerald-950/30">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Buku Laporan Keuangan Sedang TERBUKA (OPEN)
                      </h4>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">
                        Pencatatan mutasi transaksi keuangan harian, beban gaji, serta penyesuaian kasbon aktif berjalan normal. Tanggal cut-off buku dijadwalkan pada <strong>{endDate}</strong> (Tgl {cutoffDay}).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Summary of Current Period */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Ringkasan Finansial Periode Berjalan ({startDate} s/d {endDate})
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {summary.count} Transaksi Disetujui
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">Total Pendapatan</span>
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="mt-1 text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {formatRupiah(summary.totalRevenue)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">Total Pengeluaran</span>
                      <TrendingDown className="h-4 w-4 text-rose-500" />
                    </div>
                    <div className="mt-1 text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                      {formatRupiah(summary.totalExpense)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">Laba / (Rugi) Bersih</span>
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className={`mt-1 text-base font-bold font-mono ${
                      summary.netProfit >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {formatRupiah(summary.netProfit)}
                    </div>
                  </div>
                </div>

                {/* Liability & Equity mutasi */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-900/60 dark:bg-purple-950/20">
                    <div className="text-[11px] font-bold text-purple-900 dark:text-purple-300">
                      Kewajiban / Hutang (Liability)
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex justify-between">
                      <span>Penambahan Hutang:</span>
                      <span className="font-mono font-semibold">{formatRupiah(summary.liabInflow)}</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex justify-between">
                      <span>Pelunasan Hutang:</span>
                      <span className="font-mono font-semibold">{formatRupiah(summary.liabOutflow)}</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                    <div className="text-[11px] font-bold text-amber-900 dark:text-amber-300">
                      Ekuitas / Modal (Equity)
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex justify-between">
                      <span>Setoran Modal:</span>
                      <span className="font-mono font-semibold">{formatRupiah(summary.eqInflow)}</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex justify-between">
                      <span>Prive / Penarikan:</span>
                      <span className="font-mono font-semibold">{formatRupiah(summary.eqOutflow)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Section */}
              {!isClosed && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Tutup Buku Periode {periodLabel} Sekarang
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Menutup periode membukukan Laba Bersih ({formatRupiah(summary.netProfit)}) ke Saldo Ekuitas Laba Ditahan (Akun 3-104) dan mengunci transaksi.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsConfirmClosingOpen(true)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs shrink-0"
                    >
                      <Lock className="h-4 w-4" />
                      <span>Tutup Buku Periode Ini</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Dialog Konfirmasi TUTUP BUKU */}
              {isConfirmClosingOpen && (
                <div className="rounded-xl border-2 border-slate-900 bg-white p-5 shadow-lg dark:border-emerald-500 dark:bg-slate-800 animate-in fade-in">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                    <AlertCircle className="h-4 w-4" />
                    <span>Konfirmasi Final Penutupan Buku Periode {periodLabel}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                    Apakah Anda yakin ingin menutup buku untuk periode <strong>{startDate} s/d {endDate}</strong>? Saldo Laba Bersih sebesar <strong>{formatRupiah(summary.netProfit)}</strong> akan dicatat ke Saldo Laba Ditahan.
                  </p>
                  <div className="mt-3">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Catatan Penutupan Buku:
                    </label>
                    <input
                      type="text"
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      placeholder="Contoh: Tutup buku telah diverifikasi bersama Direktur Keuangan."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setIsConfirmClosingOpen(false)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleExecuteCloseBook}
                      disabled={isSubmitting}
                      className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50"
                    >
                      {isSubmitting ? 'Memproses...' : 'Ya, Tutup Buku Sekarang'}
                    </button>
                  </div>
                </div>
              )}

              {/* Dialog Konfirmasi BUKA BUKU KEMBALI */}
              {isConfirmReopenOpen && (
                <div className="rounded-xl border-2 border-amber-500 bg-white p-5 shadow-lg dark:bg-slate-800 animate-in fade-in">
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
                    <LockOpen className="h-4 w-4" />
                    <span>Konfirmasi Pembukaan Kembali Buku (Re-open Book)</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                    Membuka kembali buku periode <strong>{periodLabel}</strong> akan mengizinkan editing transaksi kembali untuk keperluan revisi atau audit susulan.
                  </p>
                  <div className="mt-3">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Alasan Pembukaan Kembali:
                    </label>
                    <input
                      type="text"
                      value={reopenNotes}
                      onChange={(e) => setReopenNotes(e.target.value)}
                      placeholder="Contoh: Koreksi faktur pembelian atau klaim payroll susulan."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setIsConfirmReopenOpen(false)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleExecuteReopenBook}
                      disabled={isSubmitting}
                      className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-xs disabled:opacity-50"
                    >
                      {isSubmitting ? 'Memproses...' : 'Ya, Buka Buku Kembali'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SESUAIKAN TANGGAL & ATURAN CUT-OFF PERUSAHAAN */}
          {activeTab === 'config' && (
            <form onSubmit={handleSavePeriodConfig} className="space-y-5">
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
                <div className="flex items-start gap-2.5">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                    Aturan tanggal buku di bawah ini dapat disesuaikan sewaktu-waktu bila kebijakan / SOP perusahaan berubah (misalnya cut-off tgl 20, 25, 28, atau hari terakhir bulan).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Label Nama Periode (Bulan-Tahun):
                  </label>
                  <input
                    type="text"
                    value={periodLabel}
                    onChange={(e) => setPeriodLabel(e.target.value)}
                    placeholder="Contoh: 2026-10"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Format umum: YYYY-MM (misal: 2026-10)
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tanggal Cut-off Bulanan (Kebijakan Perusahaan):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={31}
                      value={cutoffDay}
                      onChange={(e) => setCutoffDay(Number(e.target.value))}
                      className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {cutoffDay === 0 ? 'Hari Terakhir Bulan Kalender' : `Setiap Tanggal ${cutoffDay}`}
                    </span>
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    {[20, 25, 28, 0].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setCutoffDay(d);
                          // Auto calculate standard dates
                          if (d === 25) {
                            setStartDate('2026-09-26');
                            setEndDate('2026-10-25');
                          } else if (d === 20) {
                            setStartDate('2026-09-21');
                            setEndDate('2026-10-20');
                          } else if (d === 28) {
                            setStartDate('2026-09-29');
                            setEndDate('2026-10-28');
                          } else if (d === 0) {
                            setStartDate('2026-10-01');
                            setEndDate('2026-10-31');
                          }
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {d === 0 ? 'Akhir Bulan' : `Tgl ${d}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tanggal Mulai Periode Aktif:
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Awal buku periode ini
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tanggal Selesai / Cut-off Periode Aktif:
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Batas akhir cut-off buku periode ini
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Dasar Kebijakan / Catatan Peraturan Perusahaan:
                </label>
                <textarea
                  rows={3}
                  value={policyNotes}
                  onChange={(e) => setPolicyNotes(e.target.value)}
                  placeholder="Contoh: Sesuai SK Direksi No. 04/SK-DIR/2026 cut-off keuangan dilakukan setiap tanggal 25."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('closing')}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Aturan Periode'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: RIWAYAT TUTUP BUKU */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Log Arsip Penutupan Buku
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {history.length} Arsip
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Dokumentasi historis audit buku bulanan dan saldo laba yang dialihkan ke ekuitas
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                      placeholder="Cari periode, catatan..."
                      className="w-44 rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 py-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={handleExportHistory}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition-colors shadow-xs shrink-0 cursor-pointer"
                    title="Ekspor seluruh riwayat tutup buku ke format Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Ekspor Excel</span>
                  </button>
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400 dark:border-slate-800">
                  {historySearchTerm
                    ? 'Tidak ada riwayat tutup buku yang cocok dengan pencarian.'
                    : 'Belum ada riwayat penutupan buku yang tercatat.'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Periode</th>
                        <th className="px-4 py-2.5">Rentang Tanggal</th>
                        <th className="px-4 py-2.5 text-right">Laba Bersih Ditransfer</th>
                        <th className="px-4 py-2.5 text-center">Status</th>
                        <th className="px-4 py-2.5">Ditutup Oleh</th>
                        <th className="px-4 py-2.5">Waktu</th>
                        <th className="px-4 py-2.5 text-center whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredHistory.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white font-mono">
                            <div>{h.period}</div>
                            <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500 font-sans">
                              ID: {h.id}
                            </div>
                            {h.notes && (
                              <div
                                className="text-[10px] font-normal text-slate-500 dark:text-slate-400 italic mt-0.5 max-w-xs truncate font-sans"
                                title={h.notes}
                              >
                                📝 {h.notes}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            <div>{h.startDate} s/d {h.endDate}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {h.transactionCount || 0} Transaksi
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatRupiah(h.netProfit)}
                            {h.retainedEarningsTransferred !== undefined && (
                              <div className="text-[9px] font-normal text-slate-400">
                                Saldo: {formatRupiah(h.retainedEarningsTransferred)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                h.status === 'CLOSED'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                            >
                              {h.status === 'CLOSED' ? 'DITUTUP' : 'DIBUKA'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                            {h.closedBy}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                            {h.closedAt}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(h)}
                                className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300 transition-colors shadow-2xs cursor-pointer"
                                title="Edit arsip riwayat tutup buku ini"
                              >
                                <Edit2 className="h-3 w-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingRecord(h)}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50/80 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300 transition-colors shadow-2xs cursor-pointer"
                                title="Hapus arsip riwayat tutup buku ini"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* MODAL EDIT RIWAYAT TUTUP BUKU */}
              {editingRecord && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
                  <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8 overflow-hidden animate-in fade-in zoom-in-95">
                    {/* Header Edit Modal */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                          <Edit2 className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              Edit Riwayat Tutup Buku ({editingRecord.period})
                            </h3>
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                              {editingRecord.id}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Sesuaikan catatan historis penutupan buku, tanggal cut-off, atau saldo laba bersih
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingRecord(null)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Form Edit Modal */}
                    <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Periode */}
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Label Nama Periode (Bulan-Tahun):
                          </label>
                          <input
                            type="text"
                            value={editPeriod}
                            onChange={(e) => setEditPeriod(e.target.value)}
                            placeholder="Contoh: 2026-09"
                            required
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                          />
                        </div>

                        {/* Status Buku */}
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Status Buku:
                          </label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as 'CLOSED' | 'REOPENED')}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                          >
                            <option value="CLOSED">CLOSED (Tutup Buku - Terkunci)</option>
                            <option value="REOPENED">REOPENED (Buku Dibuka Kembali)</option>
                          </select>
                        </div>

                        {/* Tanggal Mulai */}
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Tanggal Mulai Periode:
                          </label>
                          <input
                            type="date"
                            value={editStartDate}
                            onChange={(e) => setEditStartDate(e.target.value)}
                            required
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                          />
                        </div>

                        {/* Tanggal Selesai */}
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Tanggal Selesai / Cut-off Periode:
                          </label>
                          <input
                            type="date"
                            value={editEndDate}
                            onChange={(e) => setEditEndDate(e.target.value)}
                            required
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                          />
                        </div>

                        {/* Total Pendapatan */}
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Total Pendapatan (Rp):
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={editTotalRevenue}
                            onChange={(e) => setEditTotalRevenue(e.target.value ? Number(e.target.value) : '')}
                            required
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                          />
                        </div>

                        {/* Total Beban / Pengeluaran */}
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Total Pengeluaran / Beban (Rp):
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={editTotalExpense}
                            onChange={(e) => setEditTotalExpense(e.target.value ? Number(e.target.value) : '')}
                            required
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-semibold text-rose-600 dark:text-rose-400"
                          />
                        </div>

                        {/* Laba / (Rugi) Bersih */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Laba / (Rugi) Bersih (Rp):
                            </label>
                            <button
                              type="button"
                              onClick={handleAutoCalculateNetProfit}
                              className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
                              title="Hitung: Total Pendapatan - Total Pengeluaran"
                            >
                              <Calculator className="h-3 w-3" />
                              <span>Hitung Otomatis</span>
                            </button>
                          </div>
                          <input
                            type="number"
                            step="any"
                            value={editNetProfit}
                            onChange={(e) => setEditNetProfit(e.target.value ? Number(e.target.value) : '')}
                            required
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                          />
                        </div>

                        {/* Saldo Laba Ditahan yang Dialihkan */}
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Saldo Dialihkan ke Laba Ditahan (3-104):
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={editRetainedEarnings}
                            onChange={(e) => setEditRetainedEarnings(e.target.value ? Number(e.target.value) : '')}
                            required
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                          />
                        </div>

                        {/* Jumlah Transaksi */}
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Jumlah Transaksi Tercatat:
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={editTransactionCount}
                            onChange={(e) => setEditTransactionCount(e.target.value ? Number(e.target.value) : '')}
                            required
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                          />
                        </div>

                        {/* Ditutup Oleh */}
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Ditutup Oleh (Nama & Jabatan):
                          </label>
                          <input
                            type="text"
                            value={editClosedBy}
                            onChange={(e) => setEditClosedBy(e.target.value)}
                            required
                            placeholder="Contoh: Raden Wijaya (Superadmin)"
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                          />
                        </div>
                      </div>

                      {/* Catatan / Keterangan Penutupan Buku */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Catatan / Notula Penutupan Buku:
                        </label>
                        <textarea
                          rows={3}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Catatan penutupan buku, hasil verifikasi audit, atau alasan revisi..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      {/* Footer Edit Modal */}
                      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setEditingRecord(null)}
                          className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingEdit}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          <Save className="h-3.5 w-3.5" />
                          <span>{isSubmittingEdit ? 'Menyimpan...' : 'Simpan Perubahan Arsip'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* DIALOG KONFIRMASI HAPUS RIWAYAT TUTUP BUKU */}
              {deletingRecord && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
                  <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Hapus Arsip Tutup Buku?
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Tindakan ini tidak dapat dibatalkan. Arsip akan dihapus secara permanen dari sistem dan Cloud Firestore.
                        </p>
                      </div>
                    </div>

                    {/* Ringkasan Arsip yang akan Dihapus */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">ID Arsip:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{deletingRecord.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Periode:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{deletingRecord.period}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rentang Tanggal:</span>
                        <span className="text-slate-700 dark:text-slate-300">{deletingRecord.startDate} s/d {deletingRecord.endDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Laba Bersih:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(deletingRecord.netProfit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Ditutup Oleh:</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{deletingRecord.closedBy}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setDeletingRecord(null)}
                        className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Arsip Ini'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Terakhir diubah: <strong>{config.updatedBy || 'Superadmin'}</strong> ({config.updatedAt || '-'})
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
