import {
  AlertCircle,
  Building,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Gem,
  Globe,
  Image as ImageIcon,
  Leaf,
  Mail,
  MapPin,
  Maximize2,
  Phone,
  RefreshCw,
  Save,
  Shield,
  Sparkles,
  Star,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { CompanyProfile, User } from '../types';

interface CompanyProfileViewProps {
  companyProfile: CompanyProfile;
  currentUser: User;
  onSaveCompanyProfile: (profile: CompanyProfile) => Promise<void>;
}

// Preset Logo Badges with distinct styles
export const PRESET_LOGOS = [
  {
    id: 'emerald-shield',
    name: 'Tameng Emerald Nusantara',
    bg: 'bg-emerald-600',
    textColor: 'text-white',
    icon: <Shield className="h-6 w-6 text-white" />,
    letter: 'N',
  },
  {
    id: 'gold-crown',
    name: 'Mahkota Retail Emas',
    bg: 'bg-amber-500',
    textColor: 'text-slate-900',
    icon: <Crown className="h-6 w-6 text-white" />,
    letter: 'R',
  },
  {
    id: 'blue-cube',
    name: 'Kubus Modern Dinamis',
    bg: 'bg-blue-600',
    textColor: 'text-white',
    icon: <Building2 className="h-6 w-6 text-white" />,
    letter: 'M',
  },
  {
    id: 'indigo-gem',
    name: 'Permata Sapphire Prima',
    bg: 'bg-indigo-600',
    textColor: 'text-white',
    icon: <Gem className="h-6 w-6 text-white" />,
    letter: 'G',
  },
  {
    id: 'teal-leaf',
    name: 'Ekosistem Daun Lestari',
    bg: 'bg-teal-600',
    textColor: 'text-white',
    icon: <Leaf className="h-6 w-6 text-white" />,
    letter: 'E',
  },
  {
    id: 'rose-star',
    name: 'Bintang Prestasi Retail',
    bg: 'bg-rose-600',
    textColor: 'text-white',
    icon: <Star className="h-6 w-6 text-white" />,
    letter: 'P',
  },
];

export const CompanyProfileView: React.FC<CompanyProfileViewProps> = ({
  companyProfile,
  currentUser,
  onSaveCompanyProfile,
}) => {
  const isReadOnly = currentUser.Role !== 'Superadmin' && currentUser.Role !== 'Finance Admin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states initialized with current profile
  const [formData, setFormData] = useState<CompanyProfile>({ ...companyProfile });
  const [activeTab, setActiveTab] = useState<'identity' | 'logo' | 'contact' | 'authorization'>('identity');
  const [previewMode, setPreviewMode] = useState<'payslip' | 'header' | 'report'>('payslip');
  const [isSaving, setIsSaving] = useState(false);
  const [logoInputUrl, setLogoInputUrl] = useState(companyProfile.logoUrl || '');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Handle Image File Upload (Converts to Base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('File harus berupa gambar (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 2 MB');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        logoUrl: base64,
        logoPreset: undefined,
      }));
      setLogoInputUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  // Select Preset Logo
  const handleSelectPreset = (presetId: string) => {
    setFormData((prev) => ({
      ...prev,
      logoPreset: presetId,
      logoUrl: '',
    }));
    setLogoInputUrl('');
    setUploadError(null);
  };

  // Apply custom URL
  const handleApplyLogoUrl = () => {
    if (!logoInputUrl.trim()) {
      setFormData((prev) => ({ ...prev, logoUrl: '', logoPreset: 'emerald-shield' }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      logoUrl: logoInputUrl.trim(),
      logoPreset: undefined,
    }));
    setUploadError(null);
  };

  // Remove Logo
  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: '',
      logoPreset: 'emerald-shield',
    }));
    setLogoInputUrl('');
    setUploadError(null);
  };

  // Save changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    setIsSaving(true);
    try {
      const updated: CompanyProfile = {
        ...formData,
        updatedAt: new Date().toISOString().split('T')[0],
      };
      await onSaveCompanyProfile(updated);
    } finally {
      setIsSaving(false);
    }
  };

  // Selected Preset Object
  const currentPreset = PRESET_LOGOS.find((p) => p.id === (formData.logoPreset || 'emerald-shield')) || PRESET_LOGOS[0];

  return (
    <div className="space-y-6">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>Pengaturan Profil Perusahaan & Logo</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola identitas resmi entitas perusahaan, logo korporat, alamat kantor pusat, serta penandatangan dokumen
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Profil Perusahaan'}</span>
          </button>
        )}
      </div>

      {isReadOnly && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Anda masuk dengan role <strong>{currentUser.Role}</strong>. Hanya <strong>Superadmin</strong> dan <strong>Finance Admin</strong> yang dapat mengubah profil dan logo perusahaan.
          </span>
        </div>
      )}

      {/* Main Grid: Form on Left, Live Document Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Tabs & Inputs (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-slate-200 text-xs dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-xl px-2 pt-2 shadow-2xs">
            {[
              { id: 'identity', label: '1. Identitas Utama', icon: <Building className="h-3.5 w-3.5" /> },
              { id: 'logo', label: '2. Logo Perusahaan', icon: <ImageIcon className="h-3.5 w-3.5" /> },
              { id: 'contact', label: '3. Kontak & Alamat', icon: <MapPin className="h-3.5 w-3.5" /> },
              { id: 'authorization', label: '4. Otorisasi Keuangan', icon: <UserCheck className="h-3.5 w-3.5" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 py-3 px-3.5 font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5 text-xs">
            {/* TAB 1: IDENTITAS UTAMA */}
            {activeTab === 'identity' && (
              <div className="space-y-4">
                <div className="rounded-lg bg-slate-50 p-3.5 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Identitas Legal & Brand Bisnis
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Nama resmi digunakan pada berkas hukum, slip gaji karyawan, dan kop laporan keuangan.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Nama Resmi Badan Usaha / PT / CV <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Contoh: PT Nusantara Retail Mandiri"
                    required
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium focus:border-emerald-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Ditampilkan di kop resmi slip gaji dan dokumen audit.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300">
                      Nama Brand / Merek Dagang <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.brandName}
                      onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                      placeholder="Contoh: Nusantara Retail"
                      required
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium focus:border-emerald-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Ditampilkan di navigasi header dan sidebar aplikasi.
                    </span>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300">
                      Nomor Pokok Wajib Pajak (NPWP)
                    </label>
                    <input
                      type="text"
                      value={formData.taxNumber}
                      onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                      placeholder="01.345.678.9-012.000"
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Slogan / Tagline Perusahaan
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="Contoh: Sistem Manajemen Keuangan & Rantai Retail Multi-Store"
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300">
                      Simbol Mata Uang
                    </label>
                    <input
                      type="text"
                      value={formData.currencySymbol || 'Rp'}
                      onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300">
                      Terakhir Diperbarui
                    </label>
                    <input
                      type="text"
                      value={formData.updatedAt || new Date().toISOString().split('T')[0]}
                      disabled
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LOGO PERUSAHAAN */}
            {activeTab === 'logo' && (
              <div className="space-y-5">
                <div className="rounded-lg bg-slate-50 p-3.5 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Logo Korporat & Identitas Visual
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Unggah file logo Anda sendiri (PNG/JPG/SVG) atau pilih dari koleksi preset logo retail modern yang tersedia.
                  </p>
                </div>

                {/* Current Logo Preview Card */}
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Pratinjau Logo Aktif
                    </div>
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-md border border-slate-200 dark:border-slate-700 dark:bg-slate-900 p-2 overflow-hidden">
                      {formData.logoUrl ? (
                        <img
                          src={formData.logoUrl}
                          alt="Logo Perusahaan"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div
                          className={`flex h-full w-full items-center justify-center rounded-xl ${currentPreset.bg} ${currentPreset.textColor} font-bold text-2xl shadow-inner`}
                        >
                          {currentPreset.icon}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 font-mono">
                      {formData.logoUrl ? 'Custom Image' : currentPreset.name}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {formData.brandName || 'Nusantara Retail'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Logo ini akan muncul pada header aplikasi, menu navigasi, kop slip gaji resmi, dan laporan keuangan ekspor.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isReadOnly}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Unggah Gambar Logo</span>
                      </button>
                      {(formData.logoUrl || formData.logoPreset !== 'emerald-shield') && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          disabled={isReadOnly}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Hapus / Reset</span>
                        </button>
                      )}
                    </div>
                    {uploadError && (
                      <p className="text-[11px] text-rose-600 font-medium">{uploadError}</p>
                    )}
                  </div>
                </div>

                {/* Option A: Paste Custom Logo URL */}
                <div className="space-y-1.5">
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Atau Masukkan URL Gambar Logo Eksternal
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={logoInputUrl}
                      onChange={(e) => setLogoInputUrl(e.target.value)}
                      placeholder="https://example.com/logo-perusahaan.png"
                      disabled={isReadOnly}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono focus:border-emerald-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleApplyLogoUrl}
                      disabled={isReadOnly}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      Terapkan URL
                    </button>
                  </div>
                </div>

                {/* Option B: Choose Built-in Corporate Preset Badges */}
                <div className="space-y-2 pt-2">
                  <label className="block font-semibold text-slate-800 dark:text-slate-200">
                    Pilihan Preset Desain Logo Korporat:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PRESET_LOGOS.map((preset) => {
                      const isSelected = !formData.logoUrl && (formData.logoPreset === preset.id || (!formData.logoPreset && preset.id === 'emerald-shield'));
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${preset.bg} ${preset.textColor} shadow-xs font-bold`}
                          >
                            {preset.icon}
                          </div>
                          <div className="truncate">
                            <span className="block font-semibold text-slate-900 dark:text-white truncate">
                              {preset.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {isSelected ? '✓ Terpilih' : 'Gunakan'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: KONTAK & LOKASI KANTOR PUSAT */}
            {activeTab === 'contact' && (
              <div className="space-y-4">
                <div className="rounded-lg bg-slate-50 p-3.5 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Kantor Pusat & Saluran Kontak
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Alamat resmi domisili perusahaan yang tertera pada slip gaji dan header faktur/laporan.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Alamat Lengkap Kantor Pusat
                  </label>
                  <textarea
                    rows={2}
                    value={formData.legalAddress}
                    onChange={(e) => setFormData({ ...formData, legalAddress: e.target.value })}
                    placeholder="Gedung / Jalan, Lantai, Komplek..."
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300">
                      Kota
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Jakarta Pusat"
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300">
                      Provinsi
                    </label>
                    <input
                      type="text"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      placeholder="DKI Jakarta"
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300">
                      Kode Pos
                    </label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="10350"
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" />
                      <span>No. Telepon Kantor</span>
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+62 21 2992 8888"
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Mail className="h-3 w-3 text-slate-400" />
                      <span>Email Resmi</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="info@perusahaan.co.id"
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Globe className="h-3 w-3 text-slate-400" />
                      <span>Website / Domain</span>
                    </label>
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://perusahaan.co.id"
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: OTORISASI KEANGAN & PENANDATANGAN */}
            {activeTab === 'authorization' && (
              <div className="space-y-4">
                <div className="rounded-lg bg-slate-50 p-3.5 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Pejabat Penandatangan Laporan & Slip Gaji
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Data pejabat otorisasi yang dicantumkan pada kolom tanda tangan slip gaji karyawan dan laporan keuangan.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300">
                      Nama Pimpinan Keuangan / Authorized Signer
                    </label>
                    <input
                      type="text"
                      value={formData.financeDirectorName}
                      onChange={(e) => setFormData({ ...formData, financeDirectorName: e.target.value })}
                      placeholder="Nama lengkap beserta gelar..."
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300">
                      Jabatan Resmi Penandatangan
                    </label>
                    <input
                      type="text"
                      value={formData.financeDirectorTitle}
                      onChange={(e) => setFormData({ ...formData, financeDirectorTitle: e.target.value })}
                      placeholder="Direktur Keuangan / CFO / Head of Finance"
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Simulated Signature Preview */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Pratinjau Blok Tanda Tangan:
                    </span>
                    <div className="mt-2 text-xs">
                      <div className="text-slate-500">Mengetahui & Menyetujui,</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {formData.companyName}
                      </div>
                      <div className="h-12 flex items-end">
                        <span className="font-serif italic text-emerald-700 dark:text-emerald-400 text-sm tracking-wide">
                          (Ditandatangani secara digital)
                        </span>
                      </div>
                      <div className="font-bold underline text-slate-900 dark:text-white">
                        {formData.financeDirectorName || 'Nama Pimpinan'}
                      </div>
                      <div className="text-slate-500 text-[10px]">
                        {formData.financeDirectorTitle || 'Direktur Keuangan'}
                      </div>
                    </div>
                  </div>

                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-emerald-600/40 text-emerald-600 font-bold text-[10px] text-center rotate-12">
                    SEAL & STAMP
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">
                Semua perubahan akan diterapkan secara *real-time* ke seluruh modul aplikasi.
              </span>
              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Live Interactive Document Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-emerald-600" />
                  <span>Pratinjau Tampilan Dokumen</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Lihat bagaimana identitas dan logo muncul di aplikasi
                </p>
              </div>

              {/* Preview Mode Switcher */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg dark:bg-slate-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => setPreviewMode('payslip')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors ${
                    previewMode === 'payslip'
                      ? 'bg-white shadow-xs text-slate-900 dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Slip Gaji
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('header')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors ${
                    previewMode === 'header'
                      ? 'bg-white shadow-xs text-slate-900 dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Navbar
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('report')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors ${
                    previewMode === 'report'
                      ? 'bg-white shadow-xs text-slate-900 dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Kop P&L
                </button>
              </div>
            </div>

            {/* PREVIEW 1: PAYSLIP HEADER */}
            {previewMode === 'payslip' && (
              <div className="mt-4 rounded-lg border border-slate-300 bg-white p-4 shadow-sm text-slate-900 dark:text-slate-900">
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                      ) : (
                        <div className={`flex h-full w-full items-center justify-center ${currentPreset.bg} text-white font-bold`}>
                          {currentPreset.icon}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                        {formData.companyName}
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        SLIP GAJI KARYAWAN
                      </div>
                      <div className="text-[10px] text-slate-500 leading-tight">
                        {formData.legalAddress}, {formData.city} · NPWP: {formData.taxNumber || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-500">
                    <span className="font-mono">REF: PAY-202610-001</span>
                    <div className="font-semibold text-slate-800">Oktober 2026</div>
                  </div>
                </div>

                <div className="py-3 text-[11px] text-slate-600 border-b border-slate-200 flex justify-between">
                  <span>Nama: <strong>Ahmad Zaki (Karyawan)</strong></span>
                  <span>Jabatan: <strong>Store Supervisor</strong></span>
                </div>

                <div className="pt-2 flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-500">Gaji Bersih Diterima:</span>
                  <span className="font-mono font-bold text-slate-900">Rp 7.850.000</span>
                </div>

                <div className="mt-4 pt-2 border-t border-dashed border-slate-200 flex justify-between text-[10px] text-slate-500">
                  <div>
                    <div>Disiapkan oleh:</div>
                    <div className="mt-4 font-bold text-slate-800">Finance Staff</div>
                  </div>
                  <div className="text-right">
                    <div>Disetujui oleh:</div>
                    <div className="mt-4 font-bold text-slate-800">{formData.financeDirectorName}</div>
                    <div>{formData.financeDirectorTitle}</div>
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW 2: NAVBAR / HEADER */}
            {previewMode === 'header' && (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-slate-900 p-3 text-white flex items-center justify-between border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden bg-white/10 p-0.5">
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                      ) : (
                        <div className={`flex h-full w-full items-center justify-center rounded-md ${currentPreset.bg} text-white font-bold text-xs`}>
                          {currentPreset.icon}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-sm tracking-tight text-white block">
                        {formData.brandName || 'Nusantara Retail'}
                      </span>
                      <span className="text-[10px] text-slate-400 block -mt-0.5">
                        {formData.tagline || 'Multi-Store Finance'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[10px] font-medium">
                      Multi-Store Active
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  Brand & logo langsung menghiasi navbar atas dan sidebar navigasi utama.
                </p>
              </div>
            )}

            {/* PREVIEW 3: PROFIT & LOSS REPORT HEADER */}
            {previewMode === 'report' && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white space-y-3">
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                      ) : (
                        <div className={`flex h-full w-full items-center justify-center rounded-md ${currentPreset.bg} text-white font-bold`}>
                          {currentPreset.icon}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        {formData.companyName}
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        LAPORAN LABA RUGI KOMPREHENSIF (P&L)
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 text-right">
                    <div>{formData.phone}</div>
                    <div>{formData.website}</div>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-500 dark:text-slate-400">Total Pendapatan Usaha</span>
                    <span className="font-mono font-bold text-emerald-600">Rp 125.000.000</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-500 dark:text-slate-400">Total Beban Operasional</span>
                    <span className="font-mono font-bold text-rose-600">Rp 68.500.000</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold text-slate-900 dark:text-white">
                    <span>Laba Bersih Operasional</span>
                    <span className="font-mono text-emerald-600">Rp 56.500.000</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Summary Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>Sinkronisasi Otomatis Seluruh Sistem:</span>
            </h4>
            <p>
              • <strong>Slip Gaji:</strong> Nama PT, NPWP, alamat kantor, logo, dan penandatangan otomatis tercetak di setiap slip gaji karyawan (PDF & Print).
            </p>
            <p>
              • <strong>Sidebar & Navbar:</strong> Logo dan nama merek dagang diperbarui secara instan tanpa perlu reload.
            </p>
            <p>
              • <strong>Google Sheets:</strong> Data profil perusahaan dapat disinkronkan ke spreadsheet backend Anda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
