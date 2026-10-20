import { MDRRateSetting, PaymentMethod, TransactionType } from '../types';
import { INITIAL_MDR_SETTINGS } from '../data/initialData';

export interface MDRConfig {
  id?: string;
  method: PaymentMethod | string;
  rate: number; // Decimal (e.g. 0.007 for 0.7%)
  ratePercent: string;
  label: string;
  provider: string;
  isNonTunai: boolean;
  coaTarget: string;
}

export const COA_MDR = {
  Account_Code: '5-111',
  Account_Name: 'Biaya Admin Bank / MDR',
  Category: 'Expense' as const,
  FullLabel: '5-111 - Biaya Admin Bank / MDR',
};

/**
 * Normalizes payment method string and returns MDR configuration from provided settings or defaults
 */
export function getMDRConfig(
  paymentMethod: string,
  customSettings?: MDRRateSetting[]
): MDRConfig | null {
  if (!paymentMethod) return null;
  const pNorm = paymentMethod.trim().toLowerCase();

  // Try custom settings first or stored settings
  const settings = customSettings && customSettings.length > 0 
    ? customSettings 
    : (() => {
        try {
          const raw = typeof window !== 'undefined' ? localStorage.getItem('nusantara_mdr_rates_v1') : null;
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        } catch {}
        return INITIAL_MDR_SETTINGS;
      })();

  // 1. Try exact match by method name or id
  let matched = settings.find(
    (s) => s.isActive && (s.method.toLowerCase() === pNorm || s.id.toLowerCase() === pNorm)
  );

  // 2. Try keyword match (qris, bca, debit)
  if (!matched) {
    if (pNorm.includes('qris')) {
      matched = settings.find((s) => s.id === 'qris' || s.method.toLowerCase().includes('qris'));
    } else if (pNorm.includes('bca')) {
      matched = settings.find((s) => s.id === 'debit_bca' || s.method.toLowerCase().includes('bca'));
    } else if (pNorm.includes('debit')) {
      matched = settings.find((s) => s.id === 'debit_lain' || s.method.toLowerCase().includes('debit'));
    }
  }

  if (matched && matched.isActive) {
    const rateDecimal = Number(matched.ratePercent) / 100;
    return {
      id: matched.id,
      method: matched.method,
      rate: rateDecimal,
      ratePercent: `${matched.ratePercent}%`,
      label: matched.label,
      provider: matched.provider,
      isNonTunai: true,
      coaTarget: `${matched.coaAccountCode} - ${matched.coaAccountName}`,
    };
  }

  return null;
}

export interface MDRCalculationResult {
  isApplicable: boolean;
  paymentMethod: string;
  grossAmount: number;
  rate: number;
  ratePercent: string;
  mdrFee: number;
  netAmount: number;
  providerInfo: string;
  coaTarget: string;
}

/**
 * Menghitung MDR secara dinamis untuk transaksi Pemasukan Non-Tunai:
 * - Bruto : Total nominal kotor transaksi dari pelanggan
 * - Tarif MDR: Diambil dari konfigurasi tarif MDR aktif (QRIS, Debit BCA, Debit Bank Lain, dsb)
 * - Potongan MDR (Biaya Admin Bank) = Bruto x Tarif MDR (Dicatat ke Akun COA 5-111 - Biaya Admin Bank / MDR)
 * - Netto (Masuk rekening) = Bruto - Potongan MDR
 */
export function calculateMDR(
  grossAmount: number,
  paymentMethod: string,
  type: TransactionType = 'Pemasukan',
  customSettings?: MDRRateSetting[]
): MDRCalculationResult {
  const safeGross = Math.max(0, Number(grossAmount) || 0);

  // MDR hanya dipotong otomatis pada transaksi Penerimaan / Pemasukan Non-Tunai
  if (type !== 'Pemasukan') {
    return {
      isApplicable: false,
      paymentMethod,
      grossAmount: safeGross,
      rate: 0,
      ratePercent: '0%',
      mdrFee: 0,
      netAmount: safeGross,
      providerInfo: '',
      coaTarget: COA_MDR.FullLabel,
    };
  }

  const config = getMDRConfig(paymentMethod, customSettings);
  if (!config) {
    return {
      isApplicable: false,
      paymentMethod,
      grossAmount: safeGross,
      rate: 0,
      ratePercent: '0%',
      mdrFee: 0,
      netAmount: safeGross,
      providerInfo: '',
      coaTarget: COA_MDR.FullLabel,
    };
  }

  // Hitung Potongan MDR (Dibulatkan ke rupiah terdekat)
  const mdrFee = Math.round(safeGross * config.rate);
  const netAmount = Math.max(0, safeGross - mdrFee);

  return {
    isApplicable: true,
    paymentMethod: String(config.method),
    grossAmount: safeGross,
    rate: config.rate,
    ratePercent: config.ratePercent,
    mdrFee,
    netAmount,
    providerInfo: `${config.label} (${config.provider})`,
    coaTarget: config.coaTarget || COA_MDR.FullLabel,
  };
}
