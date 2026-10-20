import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  FileCode,
  HardDrive,
  RefreshCw,
  Save,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { FirestoreService } from '../services/firestoreService';
import { StorageService } from '../services/storageService';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshAllData: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  isFirestoreConnected: boolean;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  isOpen,
  onClose,
  onRefreshAllData,
  showToast,
  isFirestoreConnected,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>(() =>
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const stats = StorageService.getDataSummaryStats();

  // 1. Simpan & Sinkronkan Semua Data
  const handleSaveAndSyncNow = async () => {
    setIsSaving(true);
    try {
      // Re-save all active states into localStorage
      const backup = StorageService.exportFullBackup();

      // Push to Firestore
      const res = await FirestoreService.syncAllLocalToFirestore();

      const timeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastSavedTime(timeStr);

      if (res.success) {
        showToast(
          `Semua data (${res.count} dokumen) berhasil disimpan & disinkronkan ke Cloud Firestore dan memori lokal!`,
          'success'
        );
      } else {
        showToast(
          'Semua data tersimpan aman di memori lokal. Cloud Firestore akan otomatis sinkron saat online.',
          'info'
        );
      }
      onRefreshAllData();
    } catch (err: any) {
      showToast(`Gagal menyimpan: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Download File Backup JSON
  const handleDownloadBackup = () => {
    try {
      const filename = StorageService.downloadBackupFile();
      showToast(`File cadangan ${filename} berhasil diunduh ke komputer Anda.`, 'success');
    } catch (err: any) {
      showToast(`Gagal mengunduh cadangan: ${err.message}`, 'error');
    }
  };

  // 3. Restore dari File Backup JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Apakah Anda yakin ingin memulihkan data dari file cadangan ini? Data saat ini akan diperbarui sesuai isi file.')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const result = StorageService.importFullBackupJson(content);
        if (result.success) {
          await FirestoreService.syncAllLocalToFirestore();
          showToast(result.message, 'success');
          onRefreshAllData();
          onClose();
        } else {
          showToast(result.message, 'error');
        }
      } catch (err: any) {
        showToast(`Gagal membaca file cadangan: ${err.message}`, 'error');
      } finally {
        setIsRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg">Penyimpanan & Cadangan Data</h3>
              <p className="text-xs text-slate-300">
                Jaminan keamanan data agar perubahan & penambahan tidak hilang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Box */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/30 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
                  Sistem Auto-Save Aktif
                </div>
                <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  Setiap kali Anda menambah, mengedit, atau menghapus data transaksi, kasbon, hutang, atau karyawan, data langsung disimpan ke <strong>Penyimpanan Browser (LocalStorage)</strong> dan disinkronkan ke <strong>Cloud Firestore</strong>.
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] text-emerald-700 dark:text-emerald-400">
                  <span>Waktu Simpan Terakhir: <strong>{lastSavedTime}</strong></span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Cloud Firestore: {isFirestoreConnected ? 'Terhubung (Online)' : 'Tersimpan Lokal'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Data Summary Grid */}
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
              Ringkasan Data Tersimpan Saat Ini:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Transaksi</div>
                <div className="font-bold text-slate-800 dark:text-white text-base mt-0.5">
                  {stats.transactions}
                </div>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Cabang Toko</div>
                <div className="font-bold text-slate-800 dark:text-white text-base mt-0.5">
                  {stats.stores}
                </div>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Karyawan</div>
                <div className="font-bold text-slate-800 dark:text-white text-base mt-0.5">
                  {stats.employees}
                </div>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Hutang & Cicilan</div>
                <div className="font-bold text-slate-800 dark:text-white text-base mt-0.5">
                  {stats.debtRecords}
                </div>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="space-y-3 pt-1">
            {/* Action 1: Simpan & Sinkronkan Sekarang */}
            <button
              onClick={handleSaveAndSyncNow}
              disabled={isSaving}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-emerald-300 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 rounded-lg bg-emerald-500/40 text-white">
                  <Save className={`h-5 w-5 ${isSaving ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <div className="font-bold text-sm">
                    {isSaving ? 'Sedang Menyimpan...' : 'Simpan & Sinkronkan Semua Data Sekarang'}
                  </div>
                  <div className="text-xs text-emerald-100">
                    Kunci seluruh penambahan dan perubahan data ke database
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/20 text-white">
                Simpan
              </span>
            </button>

            {/* Action 2: Download File Cadangan JSON */}
            <button
              onClick={handleDownloadBackup}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-900 dark:text-white shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Unduh File Cadangan (Download Backup .json)</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Simpan salinan data lengkap ke laptop/komputer Anda sebagai arsip
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                Unduh .json
              </span>
            </button>

            {/* Action 3: Pulihkan Data dari File Cadangan */}
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
                id="restore-file-input"
              />
              <label
                htmlFor="restore-file-input"
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-900 dark:text-white shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">
                      {isRestoring ? 'Memulihkan Data...' : 'Pulihkan Data dari File Cadangan (Restore)'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Unggah file backup .json yang telah diunduh sebelumnya
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  Pilih File
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Penyimpanan Terpadu: LocalStorage + Firestore</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
