import {
  Check,
  CheckCircle2,
  Copy,
  Database,
  Download,
  ExternalLink,
  RefreshCw,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../services/appsScriptTemplate';
import { StorageService } from '../services/storageService';
import { GoogleSheetsConfig } from '../types';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleSheetsConfig;
  onSaveConfig: (config: GoogleSheetsConfig) => void;
  onSyncPull: () => Promise<void>;
  onSyncPush: () => Promise<void>;
  isSyncing: boolean;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onSyncPull,
  onSyncPush,
  isSyncing,
}) => {
  const [urlInput, setUrlInput] = useState(config.webAppUrl || '');
  const [spreadsheetId, setSpreadsheetId] = useState(config.spreadsheetId || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    sheetName?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'instructions' | 'code'>('settings');

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!urlInput.trim()) {
      setTestResult({
        success: false,
        message: 'Masukkan URL Web App Google Apps Script terlebih dahulu.',
      });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await StorageService.testConnection(urlInput.trim());
      setTestResult({
        success: res.success,
        message: res.message,
        sheetName: res.spreadsheetName,
      });
      if (res.success) {
        onSaveConfig({
          ...config,
          webAppUrl: urlInput.trim(),
          spreadsheetId: spreadsheetId.trim(),
          isConnected: true,
          lastSyncTime: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Gagal terhubung' });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveOnly = () => {
    onSaveConfig({
      ...config,
      webAppUrl: urlInput.trim(),
      spreadsheetId: spreadsheetId.trim(),
      isConnected: urlInput.trim().length > 0 ? config.isConnected : false,
    });
    onClose();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([GOOGLE_APPS_SCRIPT_CODE], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Code.gs';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Integrasi Database Google Sheets
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hubungkan aplikasi langsung ke Spreadsheet via Google Apps Script Web App Endpoint
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50 dark:bg-slate-900/50 dark:border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Koneksi & Sinkronisasi
          </button>
          <button
            onClick={() => setActiveTab('instructions')}
            className={`py-3 px-4 font-medium border-b-2 transition-colors ${
              activeTab === 'instructions'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Panduan 1-Menit Setup
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`py-3 px-4 font-medium border-b-2 transition-colors ${
              activeTab === 'code'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Kode Google Apps Script (Code.gs)
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Connection Status Box */}
              <div
                className={`rounded-xl border p-4 flex items-start justify-between gap-4 ${
                  config.isConnected
                    ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 h-3 w-3 rounded-full ${
                      config.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Status Koneksi:{' '}
                      {config.isConnected ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Terhubung ke Google Sheets
                        </span>
                      ) : (
                        <span className="text-slate-500">Mode Lokal (Offline-First Ready)</span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {config.isConnected
                        ? `Sinkronisasi aktif ke spreadsheet. Perubahan data otomatis dapat diperbarui.`
                        : 'Saat belum terhubung, aplikasi menyimpan data secara lokal dan tetap dapat digunakan penuh.'}
                    </p>
                    {config.lastSyncTime && (
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Terakhir sinkron: {new Date(config.lastSyncTime).toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onSyncPull}
                    disabled={isSyncing || !config.webAppUrl}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition-colors"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Tarik Data</span>
                  </button>
                  <button
                    onClick={onSyncPush}
                    disabled={isSyncing || !config.webAppUrl}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Kirim Semua ke Sheet</span>
                  </button>
                </div>
              </div>

              {/* Endpoint Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Google Apps Script Web App URL (<span className="text-rose-500">*</span>)
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    <button
                      onClick={handleTestConnection}
                      disabled={testing || !urlInput.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors whitespace-nowrap"
                    >
                      {testing ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Menguji...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-emerald-400 dark:text-emerald-600" />
                          <span>Uji Koneksi (Ping)</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    URL yang didapatkan saat Anda memilih &quot;Deploy&quot; &gt; &quot;New deployment&quot; &gt; &quot;Web app&quot; di Google Apps Script.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    ID Spreadsheet Google Sheets (Opsional untuk tautan langsung)
                  </label>
                  <input
                    type="text"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="Contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  {spreadsheetId && (
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-1.5 inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      <span>Buka Google Spreadsheet di tab baru</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Test Connection Results */}
              {testResult && (
                <div
                  className={`rounded-lg p-3 text-xs flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <X className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  )}
                  <div>
                    <span className="font-semibold">{testResult.message}</span>
                    {testResult.sheetName && (
                      <p className="mt-0.5 text-[11px]">
                        Nama Spreadsheet Terhubung: <strong>{testResult.sheetName}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Sheet Structure Overview */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                  6 Tab Sheet yang Didukung:
                </h4>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                    <span className="font-medium text-slate-900 dark:text-white block">1. Stores</span>
                    <span className="text-[10px] text-slate-400">Data cabang toko</span>
                  </div>
                  <div className="rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                    <span className="font-medium text-slate-900 dark:text-white block">2. Users & Roles</span>
                    <span className="text-[10px] text-slate-400">Hak akses RBAC</span>
                  </div>
                  <div className="rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                    <span className="font-medium text-slate-900 dark:text-white block">3. Chart_of_Accounts</span>
                    <span className="text-[10px] text-slate-400">Bagan akun standar</span>
                  </div>
                  <div className="rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                    <span className="font-medium text-slate-900 dark:text-white block">4. Transactions</span>
                    <span className="text-[10px] text-slate-400">Jurnal & transfer</span>
                  </div>
                  <div className="rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                    <span className="font-medium text-slate-900 dark:text-white block">5. Employees</span>
                    <span className="text-[10px] text-slate-400">Master gaji karyawan</span>
                  </div>
                  <div className="rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                    <span className="font-medium text-slate-900 dark:text-white block">6. Payroll_Runs</span>
                    <span className="text-[10px] text-slate-400">Proses gaji & payslip</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'instructions' && (
            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 dark:bg-emerald-950/30 dark:border-emerald-900/50">
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-300 text-sm">
                  Langkah Mudah Menghubungkan Google Spreadsheet:
                </h4>
                <ol className="mt-3 list-decimal pl-4 space-y-2">
                  <li>
                    Buka{' '}
                    <a
                      href="https://sheets.new"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-medium text-emerald-700 underline dark:text-emerald-400"
                    >
                      sheets.new
                    </a>{' '}
                    untuk membuat Spreadsheet kosong baru di Google Drive Anda.
                  </li>
                  <li>
                    Di spreadsheet baru Anda, klik menu{' '}
                    <strong>Ekstensi (Extensions) &gt; Apps Script</strong>.
                  </li>
                  <li>
                    Buka tab <strong>&ldquo;Kode Google Apps Script&rdquo;</strong> di atas, lalu klik{' '}
                    <strong>Salin Script</strong>.
                  </li>
                  <li>
                    Di editor Apps Script Google, hapus kode lama (<code>myFunction</code>), lalu tempel
                    (paste) kode yang telah disalin.
                  </li>
                  <li>
                    Klik tombol <strong>Simpan (ikon disket)</strong>.
                  </li>
                  <li>
                    Klik tombol <strong>Deploy (Terapkan) &gt; New deployment (Penerapan baru)</strong>.
                  </li>
                  <li>
                    Pilih tipe gear <strong>Web app (Aplikasi Web)</strong>:
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-700 dark:text-slate-300">
                      <li>Execute as (Jalankan sebagai): <strong>Me (email Anda)</strong></li>
                      <li>Who has access (Yang memiliki akses): <strong>Anyone (Siapa saja)</strong></li>
                    </ul>
                  </li>
                  <li>
                    Klik <strong>Deploy</strong>, lalu salin <strong>Web App URL</strong> yang dihasilkan.
                  </li>
                  <li>
                    Kembali ke tab <strong>Koneksi & Sinkronisasi</strong> di aplikasi ini, tempelkan URL
                    tersebut, lalu klik <strong>Uji Koneksi (Ping)</strong>!
                  </li>
                </ol>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <h5 className="font-semibold text-slate-900 dark:text-white">
                  Otomatisasi yang Disediakan Script:
                </h5>
                <p className="mt-1">
                  Script ini secara otomatis membuat 6 sheet dengan judul kolom warna profesional saat
                  pertama kali dipanggil. Ketika Anda menyetujui gaji di modul Payroll, script juga
                  otomatis mencatat baris Pengeluaran (Beban Gaji) di sheet Transactions!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500">File: Code.gs (250+ baris)</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-600 font-semibold">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Salin Script</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadCode}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Unduh .gs</span>
                  </button>
                </div>
              </div>

              <div className="relative rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-slate-300 max-h-[360px] overflow-auto">
                <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={() => {
              StorageService.resetToDefaults();
              window.location.reload();
            }}
            type="button"
            className="text-xs text-rose-600 hover:underline dark:text-rose-400"
          >
            Reset ke Data Awal Demo
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSaveOnly}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Simpan Pengaturan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
