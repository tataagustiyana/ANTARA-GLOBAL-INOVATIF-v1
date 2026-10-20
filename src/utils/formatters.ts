export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatRupiah(amount: number, decimals: number = 2): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return decimals > 0 ? `Rp 0,${'0'.repeat(decimals)}` : 'Rp 0';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(absAmount);

  return isNegative ? `-${formatted}` : formatted;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return dateString;
    const monthIndex = parseInt(month, 10) - 1;
    return `${parseInt(day, 10)} ${MONTH_NAMES_ID[monthIndex] || month} ${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Format month and year only for employee start date (e.g. "Januari 2023")
 */
export function formatJoinDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  try {
    const parts = dateString.split('-');
    if (parts.length < 2) return dateString;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (!year || !month) return dateString;
    const monthName = MONTH_NAMES_ID[month - 1] || `Bulan ${month}`;
    return `${monthName} ${year}`;
  } catch {
    return dateString;
  }
}

export function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatPeriod(month: number, year: number): string {
  const monthName = MONTH_NAMES_ID[month - 1] || `Bulan ${month}`;
  return `${monthName} ${year}`;
}

export function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Convert numbers into Indonesian text representation (e.g. "Tujuh Juta Lima Ratus Ribu Rupiah")
export function terbilang(n: number): string {
  const bilangan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];

  function convert(x: number): string {
    if (x < 12) {
      return bilangan[x];
    } else if (x < 20) {
      return convert(x - 10) + ' Belas';
    } else if (x < 100) {
      return convert(Math.floor(x / 10)) + ' Puluh ' + convert(x % 10);
    } else if (x < 200) {
      return 'Seratus ' + convert(x - 100);
    } else if (x < 1000) {
      return convert(Math.floor(x / 100)) + ' Ratus ' + convert(x % 100);
    } else if (x < 2000) {
      return 'Seribu ' + convert(x - 1000);
    } else if (x < 1000000) {
      return convert(Math.floor(x / 1000)) + ' Ribu ' + convert(x % 1000);
    } else if (x < 1000000000) {
      return convert(Math.floor(x / 1000000)) + ' Juta ' + convert(x % 1000000);
    } else if (x < 1000000000000) {
      return convert(Math.floor(x / 1000000000)) + ' Miliar ' + convert(x % 1000000000);
    }
    return '';
  }

  const rounded = Math.floor(Math.abs(n));
  if (rounded === 0) return 'Nol Rupiah';
  const hasil = convert(rounded).replace(/\s+/g, ' ').trim();
  return `${hasil} Rupiah`;
}

/**
 * Calculates tenure (lama bekerja) from join date to current date.
 * Returns breakdown in years, months, days and user-friendly Indonesian string (e.g. "2 Tahun 4 Bulan", "8 Bulan").
 */
export function calculateTenure(joinDate: string | undefined): {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  formatted: string;
} {
  if (!joinDate) {
    return { years: 0, months: 0, days: 0, totalDays: 0, formatted: '-' };
  }

  try {
    const parts = joinDate.split('-');
    if (parts.length < 2) {
      return { years: 0, months: 0, days: 0, totalDays: 0, formatted: '-' };
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parts.length >= 3 ? parseInt(parts[2], 10) : 1;
    if (!year || !month) {
      return { years: 0, months: 0, days: 0, totalDays: 0, formatted: '-' };
    }

    const startDate = new Date(year, month - 1, day);
    const today = new Date();

    if (isNaN(startDate.getTime()) || startDate > today) {
      return { years: 0, months: 0, days: 0, totalDays: 0, formatted: 'Bulan Ini' };
    }

    let years = today.getFullYear() - startDate.getFullYear();
    let months = today.getMonth() - startDate.getMonth();
    let days = today.getDate() - startDate.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      days += prevMonthLastDay;
    }

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let formatted = '';
    if (years > 0 && months > 0) {
      formatted = `${years} Tahun ${months} Bulan`;
    } else if (years > 0) {
      formatted = `${years} Tahun`;
    } else if (months > 0) {
      formatted = `${months} Bulan`;
    } else {
      formatted = '< 1 Bulan';
    }

    return { years, months, days, totalDays, formatted };
  } catch {
    return { years: 0, months: 0, days: 0, totalDays: 0, formatted: '-' };
  }
}

export function formatTenure(joinDate: string | undefined): string {
  return calculateTenure(joinDate).formatted;
}

