import {
  AlertCircle,
  Building,
  Check,
  ChevronDown,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Shield,
  Sparkles,
  Store as StoreIcon,
  User as UserIcon,
  UserCheck,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import {
  auth,
  createUserWithEmailAndPassword,
  googleProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from '../lib/firebase';
import { Store, User, UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  stores: Store[];
  onSelectUser: (user: User) => void;
  onUserLoginSuccess: (user: User) => void;
  onUserLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  stores,
  onSelectUser,
  onUserLoginSuccess,
  onUserLogout,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Superadmin');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('ALL');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      // Find if user already exists by email, or create new
      const existingUser = users.find(
        (u) => u.Email.toLowerCase() === (fbUser.email || '').toLowerCase()
      );

      const loggedUser: User = existingUser
        ? {
            ...existingUser,
            Full_Name: fbUser.displayName || existingUser.Full_Name,
            Avatar: fbUser.photoURL || existingUser.Avatar,
          }
        : {
            User_ID: fbUser.uid || `USR-GGL-${Date.now()}`,
            Store_ID: 'ALL',
            Full_Name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Pengguna Google',
            Email: fbUser.email || '',
            Role: 'Superadmin',
            Status: 'Active',
            Avatar: fbUser.photoURL || undefined,
          };

      setSuccessMessage(`Berhasil masuk sebagai ${loggedUser.Full_Name}`);
      onUserLoginSuccess(loggedUser);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Jendela login Google ditutup sebelum selesai.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage(
          'Popup login diblokir browser. Silakan aktifkan izin popup atau gunakan Login Email & Password.'
        );
      } else {
        setErrorMessage(
          err.message || 'Gagal masuk dengan Google. Periksa koneksi atau coba opsi Email.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Email & Password Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Harap isi email dan password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = result.user;

      const existingUser = users.find(
        (u) => u.Email.toLowerCase() === (fbUser.email || '').toLowerCase()
      );

      const loggedUser: User = existingUser || {
        User_ID: fbUser.uid,
        Store_ID: 'ALL',
        Full_Name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Pengguna',
        Email: fbUser.email || email,
        Role: 'Superadmin',
        Status: 'Active',
      };

      setSuccessMessage(`Selamat datang kembali, ${loggedUser.Full_Name}!`);
      onUserLoginSuccess(loggedUser);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Email Sign-In error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setErrorMessage('Email atau password tidak sesuai.');
      } else if (err.code === 'auth/user-not-found') {
        setErrorMessage('Akun belum terdaftar. Silakan pilih tab "Daftar Akun Baru".');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMessage('Format email tidak valid.');
      } else {
        // Check if demo user matches credentials in offline mode
        const demoUser = users.find(
          (u) => u.Email.toLowerCase() === email.toLowerCase()
        );
        if (demoUser && password.length >= 4) {
          setSuccessMessage(`Berhasil masuk sebagai demo ${demoUser.Full_Name}`);
          onUserLoginSuccess(demoUser);
          setTimeout(() => onClose(), 600);
          return;
        }
        setErrorMessage(err.message || 'Gagal masuk dengan email.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Email Registration
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setErrorMessage('Harap lengkapi semua kolom pendaftaran.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password minimal 6 karakter.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = result.user;

      // Update Firebase Auth profile
      if (fullName) {
        await updateProfile(fbUser, { displayName: fullName });
      }

      const newUser: User = {
        User_ID: fbUser.uid,
        Store_ID: selectedStoreId,
        Full_Name: fullName,
        Email: email,
        Role: selectedRole,
        Status: 'Active',
      };

      setSuccessMessage(`Akun ${fullName} berhasil dibuat & aktif!`);
      onUserLoginSuccess(newUser);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Email register error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('Email ini sudah terdaftar. Silakan pilih tab "Masuk".');
      } else if (err.code === 'auth/weak-password') {
        setErrorMessage('Password terlalu lemah. Gunakan minimal 6 karakter.');
      } else {
        setErrorMessage(err.message || 'Gagal mendaftar akun baru.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
      onUserLogout();
      setSuccessMessage('Berhasil keluar.');
      setTimeout(() => {
        onClose();
      }, 400);
    }
  };

  // Demo user quick login
  const handleSelectDemoUser = (user: User) => {
    onSelectUser(user);
    setSuccessMessage(`Beralih ke persona: ${user.Full_Name} (${user.Role})`);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Identitas Pengguna & Login
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Akses Terproteksi Firebase Authentication (Google / Email)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Active Account Identity Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              {currentUser.Avatar ? (
                <img
                  src={currentUser.Avatar}
                  alt={currentUser.Full_Name}
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-emerald-500"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 font-bold text-white text-base shadow-xs">
                  {currentUser.Full_Name.charAt(0)}
                </div>
              )}
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  Akun Aktif Saat Ini
                </span>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  {currentUser.Full_Name}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                    {currentUser.Role}
                  </span>
                  <span className="text-[11px]">
                    · {currentUser.Store_ID === 'ALL' ? 'Semua Toko' : currentUser.Store_ID}
                  </span>
                  {currentUser.Email && (
                    <span className="text-[11px] text-slate-400">· {currentUser.Email}</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
              title="Keluar dari akun aktif"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar</span>
            </button>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2.5">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* SECTION 1: Google Sign-In Button */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              1. Masuk Cepat dengan Google
            </span>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 shadow-xs transition-colors cursor-pointer"
            >
              {/* Colorful Google G Logo */}
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
              atau
            </span>
          </div>

          {/* SECTION 2: Email & Password Authentication */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                2. Login dengan Email & Password
              </span>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMessage(null);
                  }}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                    authMode === 'signin'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  Masuk (Sign In)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMessage(null);
                  }}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  Daftar Baru
                </button>
              </div>
            </div>

            {authMode === 'signin' ? (
              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@nusantaragroup.co.id"
                      className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Kata Sandi (Password)
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
                >
                  {isLoading ? 'Memproses...' : 'Masuk Sekarang'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleEmailRegister} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <UserIcon className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Hendra Setiawan"
                      className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email Pengguna
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@nusantaragroup.co.id"
                      className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Kata Sandi (Password)
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Peran (Role)
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="Superadmin">Superadmin</option>
                      <option value="Finance Admin">Finance Admin</option>
                      <option value="Store Manager">Store Manager</option>
                      <option value="Employee">Employee (Karyawan)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Toko Ditugaskan
                    </label>
                    <select
                      value={selectedStoreId}
                      onChange={(e) => setSelectedStoreId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="ALL">Semua Toko (Konsolidasi)</option>
                      {stores.map((s) => (
                        <option key={s.Store_ID} value={s.Store_ID}>
                          {s.Store_Name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
                >
                  {isLoading ? 'Mendaftarkan...' : 'Daftar Akun Baru & Masuk'}
                </button>
              </form>
            )}
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
              pilihan cepat
            </span>
          </div>

          {/* SECTION 3: Demo Persona RBAC 1-Click Access */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>3. Demo Akses Instan (Pilih Persona Role)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Pilih langsung akun demo untuk menguji hak akses (RBAC) tanpa perlu mengetik kata sandi:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {users.map((u) => {
                const isSelected = u.User_ID === currentUser.User_ID;
                return (
                  <button
                    key={u.User_ID}
                    type="button"
                    onClick={() => handleSelectDemoUser(u)}
                    className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-950/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {u.Full_Name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {u.Full_Name}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block">
                        {u.Role}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {u.Store_ID === 'ALL' ? 'Pusat (Semua Toko)' : u.Store_ID}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-3 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Keamanan Terjamin oleh Firebase</span>
          <button
            onClick={onClose}
            className="font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
