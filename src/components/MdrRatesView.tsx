import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Building2,
  Calculator,
  Check,
  CheckCircle,
  Coins,
  CreditCard,
  Edit2,
  FileSpreadsheet,
  HelpCircle,
  History,
  Info,
  Percent,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { StorageService } from '../services/storageService';
import { ChartOfAccount, MDRRateSetting, PaymentMethod, Transaction, User } from '../types';
import { formatRupiah } from '../utils/formatters';
import { COA_MDR } from '../utils/mdrHelpers';

interface MdrRatesViewProps {
  mdrSettings: MDRRateSetting[];
  chartOfAccounts: ChartOfAccount[];
  transactions: Transaction[];
  currentUser: User;
  onSaveMdrSetting: (setting: MDRRateSetting) => Promise<void>;
  onSaveAllMdrSettings: (settings: MDRRateSetting[]) => Promise<void>;
  onResetMdrSettings: () => Promise<void>;
  onDeleteMdrSetting?: (id: string) => Promise<void>;
  onNavigateToTransactions?: () => void;
}

export const MdrRatesView: React.FC<MdrRatesViewProps> = ({
  mdrSettings,
  chartOfAccounts,
  transactions,
  currentUser,
  onSaveMdrSetting,
  onSaveAllMdrSettings,
  onResetMdrSettings,
  onDeleteMdrSetting,
  onNavigateToTransactions,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State for Edit / Add
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<MDRRateSetting | null>(null);
  const [formId, setFormId] = useState('');
  const [formMethod, setFormMethod] = useState<string>('Qris');
  const [formLabel, setFormLabel] = useState('');
  const [formRatePercent, setFormRatePercent] = useState<string>('0.7');
  const [formProvider, setFormProvider] = useState('');
  const [formCoaCode, setFormCoaCode] = useState('5-111');
  const [formCoaName, setFormCoaName] = useState('Biaya Admin Bank / MDR');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm Reset Modal State
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Live Simulator State
  const [simAmount, setSimAmount] = useState<string>('1000000');
  const [simMethodId, setSimMethodId] = useState<string>('qris');

  // Filter COA for Expense
  const expenseAccounts = useMemo(() => {
    return chartOfAccounts.filter((c) => c.Category === 'Expense');
  }, [chartOfAccounts]);

  // Statistics calculation
  const totalMDRFeesThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions
      .filter((t) => {
        const d = new Date(t.Date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, t) => {
        // If this is an income transaction with MDR_Fee
        if (t.Type === 'Pemasukan' && t.MDR_Fee) {
          return sum + t.MDR_Fee;
        }
        // If this is companion expense on 5-111 without double counting
        if (t.Type === 'Pengeluaran' && t.Category?.includes('5-111') && !t.MDR_Expense_Ref) {
          return sum + t.Amount;
        }
        return sum;
      }, 0);
  }, [transactions]);

  const nonCashIncomeCountThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.filter((t) => {
      const d = new Date(t.Date);
      const isMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      return isMonth && t.Type === 'Pemasukan' && t.Payment_Method !== 'Cash';
    }).length;
  }, [transactions]);

  // Filtered settings
  const filteredSettings = useMemo(() => {
    return mdrSettings.filter((s) => {
      const matchesSearch =
        s.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.notes && s.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesFilter =
        filterActive === 'all'
          ? true
          : filterActive === 'active'
          ? s.isActive
          : !s.isActive;

      return matchesSearch && matchesFilter;
    });
  }, [mdrSettings, searchTerm, filterActive]);

  // Selected setting for simulator
  const simSetting = useMemo(() => {
    return (
      mdrSettings.find((s) => s.id === simMethodId) ||
      mdrSettings[0] || {
        id: 'qris',
        method: 'Qris',
        label: 'QRIS',
        ratePercent: 0.7,
        provider: 'Bank Indonesia',
        coaAccountCode: '5-111',
        coaAccountName: 'Biaya Admin Bank / MDR',
        isActive: true,
      }
    );
  }, [mdrSettings, simMethodId]);

  const simCalc = useMemo(() => {
    const gross = Math.max(0, Number(simAmount) || 0);
    const rate = Number(simSetting.ratePercent) / 100;
    const fee = Math.round(gross * rate);
    const net = Math.max(0, gross - fee);
    return { gross, rate, fee, net };
  }, [simAmount, simSetting]);

  // Handler Open Modal for Edit
  const handleOpenEdit = (setting: MDRRateSetting) => {
    setEditingSetting(setting);
    setFormId(setting.id);
    setFormMethod(setting.method);
    setFormLabel(setting.label);
    setFormRatePercent(String(setting.ratePercent));
    setFormProvider(setting.provider);
    setFormCoaCode(setting.coaAccountCode);
    setFormCoaName(setting.coaAccountName);
    setFormIsActive(setting.isActive);
    setFormNotes(setting.notes || '');
    setIsModalOpen(true);
  };

  // Handler Open Modal for New
  const handleOpenAdd = () => {
    setEditingSetting(null);
    const newId = `mdr_${Date.now().toString(36)}`;
    setFormId(newId);
    setFormMethod('Debit Bank Lain');
    setFormLabel('Saluran Non-Tunai Baru');
    setFormRatePercent('1.0');
    setFormProvider('Penyedia Jasa Pembayaran (PJP)');
    setFormCoaCode('5-111');
    setFormCoaName('Biaya Admin Bank / MDR');
    setFormIsActive(true);
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(formRatePercent);
    if (isNaN(rateNum) || rateNum < 0) {
      alert('Tarif MDR (%) harus berupa angka desimal positif (misal: 0.7 atau 0.15)');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedSetting: MDRRateSetting = {
        id: formId,
        method: formMethod,
        label: formLabel || `${formMethod} (${formRatePercent}%)`,
        ratePercent: rateNum,
        provider: formProvider || 'Bank / Acquirer Merchant',
        coaAccountCode: formCoaCode,
        coaAccountName: formCoaName,
        isActive: formIsActive,
        notes: formNotes,
        updatedAt: new Date().toISOString().split('T')[0],
        updatedBy: currentUser.Full_Name,
      };

      await onSaveMdrSetting(updatedSetting);
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active state
  const handleToggleActive = async (setting: MDRRateSetting) => {
    const updated = {
      ...setting,
      isActive: !setting.isActive,
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: currentUser.Full_Name,
    };
    await onSaveMdrSetting(updated);
  };

  // Preset button for QRIS UMI (Usaha Mikro)
  const handleApplyPresetQrisUmi = async () => {
    const qrisSetting = mdrSettings.find((s) => s.id === 'qris');
    if (!qrisSetting) return;

    const updated = {
      ...qrisSetting,
      ratePercent: 0.3,
      notes: 'Penyesuaian Tarif QRIS Usaha Mikro (UMI) sesuai kebijakan Bank Indonesia (0.3%).',
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: currentUser.Full_Name,
    };
    await onSaveMdrSetting(updated);
  };

  // Preset button for QRIS Standard Reguler
  const handleApplyPresetQrisReguler = async () => {
    const qrisSetting = mdrSettings.find((s) => s.id === 'qris');
    if (!qrisSetting) return;

    const updated = {
      ...qrisSetting,
      ratePercent: 0.7,
      notes: 'Tarif standar Merchant Category Code (MCC) Reguler Bank Indonesia (0.7%).',
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: currentUser.Full_Name,
    };
    await onSaveMdrSetting(updated);
  };

  const getMethodIcon = (method: string) => {
    const m = method.toLowerCase();
    if (m.includes('qris')) return <QrCode className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
    if (m.includes('bca')) return <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    if (m.includes('debit')) return <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
    return <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
  };

  const handleExportExcel = () => {
    const headers = [
      'ID Saluran',
      'Metode Pembayaran',
      'Label Tampilan',
      'Tarif MDR (%)',
      'Acquirer / Provider Bank',
      'Akun COA Beban',
      'Nama Akun COA',
      'Status Aktif',
      'Catatan Regulasi',
      'Terakhir Diperbarui',
    ];
    const rows = filteredSettings.map((s) => [
      s.id,
      s.method,
      s.label,
      `${s.ratePercent}%`,
      s.provider || '-',
      s.coaAccountCode,
      s.coaAccountName,
      s.isActive ? 'Aktif' : 'Nonaktif',
      s.notes || '-',
      s.updatedAt || '-',
    ]);
    StorageService.exportToExcel('Tarif_MDR_Non_Tunai', headers, rows, 'Tarif MDR');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Percent className="h-3.5 w-3.5" />
              <span>Regulasi & Pengaturan Biaya Merchant</span>
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
            <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
              COA: 5-111 Biaya Admin Bank / MDR
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Pengaturan Tarif MDR (Merchant Discount Rate)
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Atur persentase potongan biaya admin bank / MDR untuk metode pembayaran non-tunai. Setiap pencatatan pemasukan non-tunai akan otomatis menghitung nominal kotor (bruto), potongan MDR ke akun <strong>5-111</strong>, dan nominal bersih (netto) yang masuk ke rekening.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 cursor-pointer transition-colors"
            title="Ekspor daftar konfigurasi tarif MDR ke Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80 transition-colors cursor-pointer"
            title="Kembalikan semua tarif ke standar awal regulasi Bank Indonesia & Bank"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span>Reset Standar BI & Bank</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Saluran / Aturan MDR</span>
          </button>
        </div>
      </div>

      {/* Highlights / Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Saluran Non-Tunai Aktif
            </span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <QrCode className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {mdrSettings.filter((s) => s.isActive).length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              dari {mdrSettings.length} saluran terdaftar
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>QRIS, EDC BCA, EDC Bank Lain</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Akun Beban Akuntansi (COA)
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="font-mono text-xl font-bold text-slate-900 dark:text-white">
              5-111
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Biaya Admin Bank / MDR
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Kategori: Beban Operasional Toko
          </div>
        </div>

        {/* Card 3 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Transaksi Non-Tunai Bulan Ini
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {nonCashIncomeCountThisMonth}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">transaksi</span>
          </div>
          <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
            Pelanggan bayar via QRIS & Kartu Debit
          </div>
        </div>

        {/* Card 4 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Beban MDR Terakumulasi
            </span>
            <div className="rounded-lg bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {formatRupiah(totalMDRFeesThisMonth)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Bulan berjalan (Otomatis ke P&L Laba Rugi)
          </div>
        </div>
      </div>

      {/* Interactive Quick Presets Alert */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-purple-50/70 p-4 dark:border-indigo-950 dark:from-indigo-950/30 dark:via-blue-950/20 dark:to-purple-950/30">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-indigo-600/10 p-2 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400 shrink-0 mt-0.5">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Kebijakan Resmi Bank Indonesia & Perubahan Tarif Terbaru
              </h4>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                Pemerintah dan Bank Indonesia menetapkan tarif MDR berjenjang. Anda dapat mengubah persentase di bawah ini kapan saja jika ada regulasi baru dari BI atau perjanjian khusus dengan pihak Bank Acquirer (BCA, Mandiri, BRI, dsb).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleApplyPresetQrisUmi}
              className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-indigo-950/60 shadow-2xs transition-colors"
            >
              Set QRIS Usaha Mikro (0.3%)
            </button>
            <button
              onClick={handleApplyPresetQrisReguler}
              className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-indigo-950/60 shadow-2xs transition-colors"
            >
              Set QRIS Standar Reguler (0.7%)
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Table & Simulator Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): MDR Settings Table & Cards */}
        <div className="space-y-4 lg:col-span-2">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari saluran pembayaran, nama bank, atau regulasi..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterActive('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterActive === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Semua ({mdrSettings.length})
              </button>
              <button
                onClick={() => setFilterActive('active')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterActive === 'active'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Aktif ({mdrSettings.filter((s) => s.isActive).length})
              </button>
              <button
                onClick={() => setFilterActive('inactive')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterActive === 'inactive'
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Nonaktif ({mdrSettings.filter((s) => !s.isActive).length})
              </button>
            </div>
          </div>

          {/* Cards of MDR Settings */}
          <div className="space-y-3">
            {filteredSettings.map((setting) => {
              const rateNum = Number(setting.ratePercent);
              const sampleGross = 1000000;
              const sampleFee = Math.round(sampleGross * (rateNum / 100));
              const sampleNet = sampleGross - sampleFee;

              return (
                <div
                  key={setting.id}
                  className={`relative rounded-xl border bg-white p-5 shadow-xs transition-all hover:shadow-md dark:bg-slate-900 ${
                    setting.isActive
                      ? 'border-slate-200 dark:border-slate-800'
                      : 'border-slate-200/60 bg-slate-50/50 opacity-75 dark:border-slate-800/60 dark:bg-slate-900/40'
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left details */}
                    <div className="flex items-start gap-3.5">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800 shrink-0">
                        {getMethodIcon(setting.method)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {setting.label}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                              setting.id === 'qris'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                : setting.id === 'debit_bca'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            Tarif MDR: {setting.ratePercent}%
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                              setting.isActive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                setting.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {setting.isActive ? 'Berlaku Otomatis' : 'Nonaktif'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Penyedia: <span className="font-medium text-slate-700 dark:text-slate-300">{setting.provider}</span>
                        </p>

                        {setting.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-md p-2 mt-1 border border-slate-100 dark:border-slate-800">
                            {setting.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                      <button
                        onClick={() => handleToggleActive(setting)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                          setting.isActive
                            ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}
                        title={setting.isActive ? 'Nonaktifkan pemotongan otomatis' : 'Aktifkan pemotongan'}
                      >
                        {setting.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>

                      <button
                        onClick={() => handleOpenEdit(setting)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Ubah Tarif</span>
                      </button>

                      {onDeleteMdrSetting && setting.id !== 'qris' && setting.id !== 'debit_bca' && setting.id !== 'debit_lain' && (
                        <button
                          onClick={() => onDeleteMdrSetting(setting.id)}
                          className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300"
                          title="Hapus saluran kustom ini"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Formula Breakdown preview bar */}
                  <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800/80">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800/50">
                        <span className="text-[11px] text-slate-400 block">Akun Beban Akuntansi:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                          {setting.coaAccountCode} - {setting.coaAccountName}
                        </span>
                      </div>
                      <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800/50">
                        <span className="text-[11px] text-slate-400 block">Simulasi Kotor (Bruto):</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          Rp 1.000.000
                        </span>
                      </div>
                      <div className="rounded-md bg-emerald-50/70 p-2 dark:bg-emerald-950/30">
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">
                          Potongan MDR ({setting.ratePercent}%) ➔ Netto Masuk:
                        </span>
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                          -Rp {sampleFee.toLocaleString('id-ID')} ➔ Rp {sampleNet.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {setting.updatedAt && (
                    <div className="mt-2 text-right">
                      <span className="text-[10px] text-slate-400">
                        Terakhir diubah: {setting.updatedAt} {setting.updatedBy ? `oleh ${setting.updatedBy}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredSettings.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
                <h4 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  Tidak ada saluran yang cocok
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Coba ubah kata kunci pencarian atau bersihkan filter.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Live Simulator & Guidelines */}
        <div className="space-y-4">
          {/* Live Interactive Simulator Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <Calculator className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Kalkulator Simulasi MDR Live
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Uji langsung perhitungan otomatis potongan bank berdasarkan tarif yang Anda tetapkan.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nominal Kotor Transaksi Pelanggan (Bruto)
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2 text-xs font-semibold text-slate-400">Rp</span>
                  <input
                    type="number"
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                    placeholder="1000000"
                    className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Pilih Saluran / Metode Pembayaran
                </label>
                <select
                  value={simMethodId}
                  onChange={(e) => setSimMethodId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {mdrSettings.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({s.ratePercent}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Simulation Result Box */}
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Nominal Kotor (Bruto):</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatRupiah(simCalc.gross)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 dark:text-slate-400">
                    Tarif MDR Dikenakan:
                  </span>
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                    {simSetting.ratePercent}%
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs border-t border-emerald-200/60 dark:border-emerald-900 pt-2 text-rose-600 dark:text-rose-400 font-semibold">
                  <span>Potongan MDR (Beban 5-111):</span>
                  <span>- {formatRupiah(simCalc.fee)}</span>
                </div>

                <div className="flex justify-between items-center text-sm border-t border-emerald-200/60 dark:border-emerald-900 pt-2 font-bold text-emerald-800 dark:text-emerald-300">
                  <span>Netto Masuk Rekening Bank:</span>
                  <span className="text-base">{formatRupiah(simCalc.net)}</span>
                </div>
              </div>

              {/* Automatic Accounting Entry Note */}
              <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-900 dark:text-white block">
                  Jurnal Pembukuan Otomatis:
                </span>
                <p>• [D] Kas / Bank (Netto): <strong>{formatRupiah(simCalc.net)}</strong></p>
                <p>• [D] Beban Admin Bank (5-111): <strong>{formatRupiah(simCalc.fee)}</strong></p>
                <p>• [K] Pendapatan Penjualan: <strong>{formatRupiah(simCalc.gross)}</strong></p>
              </div>

              {onNavigateToTransactions && (
                <button
                  onClick={onNavigateToTransactions}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <span>Buka Menu Transaksi Keuangan</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Reference Knowledge Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-slate-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Dasar Ketentuan Tarif Bank
              </h4>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="border-l-2 border-purple-500 pl-2.5">
                <span className="font-semibold text-purple-700 dark:text-purple-400 block">QRIS (Bank Indonesia)</span>
                Peraturan Anggota Dewan Gubernur (PADG) No. 24/2022 menetapkan tarif 0.7% untuk kategori reguler retail, dan 0.3% untuk Usaha Mikro.
              </div>
              <div className="border-l-2 border-blue-500 pl-2.5">
                <span className="font-semibold text-blue-700 dark:text-blue-400 block">Debit BCA (On-Us)</span>
                Kartu debit BCA digesek di EDC BCA dikenakan MDR on-us 0.15% sesuai kesepakatan merchant BCA.
              </div>
              <div className="border-l-2 border-amber-500 pl-2.5">
                <span className="font-semibold text-amber-700 dark:text-amber-400 block">Debit Bank Lain (Off-Us)</span>
                Kartu debit bank lain melalui EDC Mandiri/BRI/BNI/GPN antar-bank umumnya dikenakan tarif interbank 2.0%.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Tambah / Edit Tarif MDR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <Percent className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingSetting ? 'Ubah Aturan Tarif MDR' : 'Tambah Saluran MDR Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Metode Pembayaran Terkait
                </label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {(['Qris', 'Debit bank BCA', 'Debit Bank Lain'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setFormMethod(m);
                        if (!editingSetting) {
                          if (m === 'Qris') {
                            setFormLabel('QRIS (Semua E-Wallet & Mobile Banking)');
                            setFormRatePercent('0.7');
                            setFormProvider('Bank Indonesia & Acquirer Merchant');
                          } else if (m === 'Debit bank BCA') {
                            setFormLabel('Debit Bank BCA (EDC BCA On-Us)');
                            setFormRatePercent('0.15');
                            setFormProvider('PT Bank Central Asia Tbk');
                          } else {
                            setFormLabel('Debit Bank Lain (EDC Off-Us)');
                            setFormRatePercent('2.0');
                            setFormProvider('Jaringan GPN / Visa / Mastercard');
                          }
                        }
                      }}
                      className={`rounded-lg border py-2 px-2 text-xs font-medium text-center transition-colors ${
                        formMethod === m
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Label */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Label Tampilan Saluran
                </label>
                <input
                  type="text"
                  required
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="Contoh: QRIS (Semua E-Wallet & Mobile Banking)"
                  className="mt-1 w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Rate input with percentage */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tarif MDR (%)
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={formRatePercent}
                      onChange={(e) => setFormRatePercent(e.target.value)}
                      placeholder="0.7"
                      className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-8 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Misal: 0.7 untuk 0.7%, 0.15 untuk 0.15%, 2.0 untuk 2.0%
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Penyedia / Bank Acquirer
                  </label>
                  <input
                    type="text"
                    required
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value)}
                    placeholder="Contoh: Bank Indonesia / BCA"
                    className="mt-1 w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* COA Target Account */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Akun Beban Akuntansi (COA)
                </label>
                <select
                  value={formCoaCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setFormCoaCode(code);
                    const found = chartOfAccounts.find((c) => c.Account_Code === code);
                    if (found) setFormCoaName(found.Account_Name);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 py-2 px-3 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="5-111">5-111 - Biaya Admin Bank / MDR (Rekomendasi Standar)</option>
                  {expenseAccounts
                    .filter((c) => c.Account_Code !== '5-111')
                    .map((c) => (
                      <option key={c.Account_Code} value={c.Account_Code}>
                        {c.Account_Code} - {c.Account_Name}
                      </option>
                    ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Komponen potongan MDR otomatis dicatat sebagai pengeluaran/beban pada akun ini.
                </span>
              </div>

              {/* Notes / Basis of regulation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Catatan / Dasar Regulasi
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contoh: Surat Edaran BI No. XX atau Kesepakatan PKS Merchant EDC No. YY"
                  className="mt-1 w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                    Status Pemotongan Otomatis
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Jika aktif, sistem otomatis memotong MDR saat mencatat transaksi pemasukan.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan Tarif'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Reset ke Default */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="rounded-full bg-amber-50 p-2.5 dark:bg-amber-950/50">
                <RotateCcw className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Reset Tarif ke Standar Regulasi?
              </h3>
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin mengembalikan seluruh konfigurasi tarif MDR ke standar awal:
            </p>

            <div className="my-3 rounded-lg bg-slate-50 p-3 text-xs space-y-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <p>• QRIS: <strong>0.7%</strong></p>
              <p>• Debit Bank BCA (EDC On-Us): <strong>0.15%</strong></p>
              <p>• Debit Bank Lain (EDC Off-Us): <strong>2.0%</strong></p>
              <p>• Target Akun Beban: <strong>5-111 - Biaya Admin Bank / MDR</strong></p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  await onResetMdrSettings();
                  setIsResetConfirmOpen(false);
                }}
                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors shadow-xs"
              >
                Ya, Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
