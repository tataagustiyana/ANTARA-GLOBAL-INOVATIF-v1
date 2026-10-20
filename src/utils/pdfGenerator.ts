import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanyProfile, DebtRecord, PayrollRun, Store, Transaction } from '../types';
import { formatPeriod, formatRupiah } from './formatters';

export interface ExpenseBreakdownItem {
  name: string;
  amount: number;
  code?: string;
  description?: string;
  count?: number;
}

interface FinancialSummaryPdfData {
  companyProfile?: CompanyProfile;
  periodMonth: number;
  periodYear: number;
  activeStoreName: string;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  targetOmset: number;
  paguBeban: number;
  expenseBreakdown: ExpenseBreakdownItem[];
  storeComparison: { store: Store; revenue: number; expense: number; profit: number }[];
  currentMonthPayrollTotal: number;
  totalSupplierDebtOutstanding?: number;
  totalEmployeeLoanOutstanding?: number;
  totalCash?: number;
  totalBank?: number;
  printedBy: string;
}

export function exportFinancialSummaryPdf(data: FinancialSummaryPdfData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const companyName = data.companyProfile?.companyName || 'PT NUSANTARA RETAIL MANDIRI';
  const brandName = data.companyProfile?.brandName || 'Nusantara Retail & Barbershop';
  const address = data.companyProfile?.legalAddress || 'Jakarta, Indonesia';

  let currentY = 16;

  // Header Box
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(14, currentY, pageWidth - 28, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(brandName.toUpperCase(), 20, currentY + 9);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`LAPORAN RINGKASAN KEUANGAN & OPERASIONAL`, 20, currentY + 15);
  doc.text(
    `Periode: ${formatPeriod(data.periodMonth, data.periodYear)} | Outlet: ${data.activeStoreName}`,
    20,
    currentY + 20
  );

  currentY += 28;

  // Metadata Subheader
  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFontSize(8);
  doc.text(`Entitas Legal: ${companyName} · ${address}`, 14, currentY);
  doc.text(
    `Dicetak: ${new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })} oleh ${data.printedBy}`,
    pageWidth - 14,
    currentY,
    { align: 'right' }
  );

  currentY += 6;

  // Section 1: Ringkasan Indikator Keuangan (KPI Table)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('I. KINERJA KEUANGAN (KEY FINANCIAL METRICS)', 14, currentY);
  currentY += 3;

  const kpiData = [
    [
      'Total Pemasukan (Omset)',
      formatRupiah(data.totalRevenue),
      'Target Omset',
      data.targetOmset > 0 ? formatRupiah(data.targetOmset) : 'Belum Ditentukan',
    ],
    [
      'Total Beban Operasional',
      formatRupiah(data.totalExpense),
      'Pagu Anggaran Beban',
      data.paguBeban > 0 ? formatRupiah(data.paguBeban) : 'Belum Ditentukan',
    ],
    [
      'Laba Bersih Operasional',
      formatRupiah(data.netProfit),
      'Margin Laba Bersih',
      `${data.profitMargin.toFixed(1)}%`,
    ],
    [
      'Realisasi Beban Gaji (Payroll)',
      formatRupiah(data.currentMonthPayrollTotal),
      'Status Anggaran',
      data.paguBeban > 0
        ? data.totalExpense <= data.paguBeban
          ? 'Efektif (Di Bawah Pagu)'
          : 'Melebihi Anggaran (Overbudget)'
        : 'Standar Operasional',
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Indikator Pendapatan & Biaya', 'Nominal', 'Target / Parameter', 'Pencapaian']],
    body: kpiData,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129], // emerald-500
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 40 },
      2: { cellWidth: 50 },
      3: { halign: 'right', cellWidth: 42 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Section 2: Rincian Pengeluaran per Kategori & Keterangan
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('II. RINCIAN PENGELUARAN OPERASIONAL PER KATEGORI & KETERANGAN', 14, currentY);
  currentY += 3;

  const expenseRows = data.expenseBreakdown.map((item, index) => {
    const pct = data.totalExpense > 0 ? (item.amount / data.totalExpense) * 100 : 0;
    const catLabel = item.code ? `${item.code} · ${item.name}` : item.name;
    const descLabel = item.description || (item.count ? `${item.count} transaksi operasional tercatat` : '-');
    return [
      String(index + 1),
      catLabel,
      descLabel,
      formatRupiah(item.amount),
      `${pct.toFixed(1)}%`,
    ];
  });

  if (expenseRows.length === 0) {
    expenseRows.push(['-', 'Tidak ada pengeluaran tercatat periode ini', '-', 'Rp 0', '0%']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['No', 'Kategori Pengeluaran (COA)', 'Keterangan / Rincian Operasional', 'Jumlah (Rp)', 'Porsi (%)']],
    body: expenseRows,
    theme: 'striped',
    headStyles: {
      fillColor: [51, 65, 85], // slate-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold', cellWidth: 50 },
      2: { cellWidth: 64, textColor: [71, 85, 105] },
      3: { halign: 'right', fontStyle: 'bold', cellWidth: 34 },
      4: { halign: 'right', cellWidth: 24 },
    },
    foot: [
      [
        '',
        'TOTAL BEBAN OPERASIONAL',
        `${data.expenseBreakdown.length} Kategori Pengeluaran`,
        formatRupiah(data.totalExpense),
        '100.0%',
      ],
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Check page overflow before Section 3
  if (currentY > 230) {
    doc.addPage();
    currentY = 16;
  }

  // Section 3: Performa Cabang (Store Breakdown)
  if (data.storeComparison.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('III. KINERJA KOMPARATIF OUTLET / CABANG', 14, currentY);
    currentY += 3;

    const storeRows = data.storeComparison.map((s, index) => [
      String(index + 1),
      s.store.Store_Name,
      s.store.Address,
      formatRupiah(s.revenue),
      formatRupiah(s.expense),
      formatRupiah(s.profit),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['No', 'Nama Cabang', 'Lokasi', 'Pemasukan', 'Pengeluaran', 'Laba Bersih']],
      body: storeRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { fontStyle: 'bold', cellWidth: 40 },
        2: { cellWidth: 45 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 28 },
        5: { halign: 'right', fontStyle: 'bold', cellWidth: 31 },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Check page overflow for Signatures
  if (currentY > 235) {
    doc.addPage();
    currentY = 20;
  }

  // Signatures Section
  currentY += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const signerName = data.companyProfile?.financeDirectorName || 'Hendra Setiawan, S.E., Ak.';
  const signerTitle = data.companyProfile?.financeDirectorTitle || 'Direktur Keuangan & Operasional';

  doc.text('Dibuat & Diverifikasi:', 24, currentY);
  doc.text('Disetujui Oleh:', pageWidth - 60, currentY);

  currentY += 18;
  doc.setDrawColor(148, 163, 184); // slate-400
  doc.line(24, currentY, 74, currentY);
  doc.line(pageWidth - 60, currentY, pageWidth - 14, currentY);

  currentY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text(data.printedBy, 24, currentY);
  doc.text(signerName, pageWidth - 60, currentY);

  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.text('Finance & Operation Admin', 24, currentY);
  doc.text(signerTitle, pageWidth - 60, currentY);

  // Save the document
  const fileName = `Laporan_Ringkasan_Keuangan_Operasional_${data.periodYear}_${String(
    data.periodMonth
  ).padStart(2, '0')}.pdf`;
  doc.save(fileName);
}

export interface TransactionsPdfData {
  companyProfile?: CompanyProfile;
  activeStoreName: string;
  transactions: Transaction[];
  dateFilterLabel: string;
  typeFilterLabel: string;
  categoryFilterLabel: string;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  printedBy: string;
  totalCash?: number;
  totalBank?: number;
  totalLiquidity?: number;
  cashIncome?: number;
  cashExpense?: number;
  cashNet?: number;
  bankIncome?: number;
  bankExpense?: number;
  bankNet?: number;
}

export function exportTransactionsPdf(data: TransactionsPdfData) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const companyName = data.companyProfile?.companyName || 'PT NUSANTARA RETAIL MANDIRI';
  const brandName = data.companyProfile?.brandName || 'Nusantara Retail & Barbershop';
  const address = data.companyProfile?.legalAddress || 'Jakarta, Indonesia';

  let currentY = 12;

  // Header Box
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(14, currentY, pageWidth - 28, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`${brandName.toUpperCase()} - LAPORAN TRANSAKSI KEUANGAN`, 20, currentY + 7.5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Entitas: ${companyName} | Cabang: ${data.activeStoreName} | Filter Waktu: ${data.dateFilterLabel} | Tipe: ${data.typeFilterLabel}`,
    20,
    currentY + 13
  );
  doc.text(
    `Total Baris Transaksi: ${data.transactions.length} | Dicetak: ${new Date().toLocaleDateString(
      'id-ID',
      { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    )} oleh ${data.printedBy}`,
    20,
    currentY + 17.5
  );

  currentY += 26;

  // --- KARTU RINGKASAN KEUANGAN TRANSAKSI (3 CARDS: PEMASUKAN, PENGELUARAN, ARUS KAS BERSIH) ---
  const cardGap = 3.5;
  const cardW = (pageWidth - 28 - cardGap * 2) / 3; // ~87.3mm
  const cardH = 17;

  const countIncome = data.transactions.filter(
    (t) => t.Type === 'Pemasukan' && t.Status === 'Approved'
  ).length;
  const countExpense = data.transactions.filter(
    (t) => t.Type === 'Pengeluaran' && t.Status === 'Approved'
  ).length;

  // 1. KARTU TOTAL PEMASUKAN
  const card1X = 14;
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.roundedRect(card1X, currentY, cardW, cardH, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text('TOTAL PEMASUKAN', card1X + 3.5, currentY + 4.5);

  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Akumulasi Pendapatan & Pemasukan Periode', card1X + 3.5, currentY + 7.8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(formatRupiah(data.totalIncome), card1X + 3.5, currentY + 12);

  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Frekuensi: ${countIncome} Transaksi Pemasukan Disetujui`,
    card1X + 3.5,
    currentY + 15.2
  );

  // 2. KARTU TOTAL PENGELUARAN
  const card2X = 14 + cardW + cardGap;
  doc.setFillColor(254, 242, 242); // rose-50
  doc.setDrawColor(244, 63, 94); // rose-500
  doc.roundedRect(card2X, currentY, cardW, cardH, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(159, 18, 57); // rose-900
  doc.text('TOTAL PENGELUARAN', card2X + 3.5, currentY + 4.5);

  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Akumulasi Beban & Pengeluaran Operasional', card2X + 3.5, currentY + 7.8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(225, 29, 72); // rose-600
  doc.text(formatRupiah(data.totalExpense), card2X + 3.5, currentY + 12);

  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Frekuensi: ${countExpense} Transaksi Pengeluaran Disetujui`,
    card2X + 3.5,
    currentY + 15.2
  );

  // 3. KARTU ARUS KAS BERSIH (NET CASH FLOW)
  const card3X = 14 + (cardW + cardGap) * 2;
  const isNetPositive = data.netCashFlow >= 0;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(isNetPositive ? 16 : 244, isNetPositive ? 185 : 63, isNetPositive ? 129 : 94);
  doc.roundedRect(card3X, currentY, cardW, cardH, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('ARUS KAS BERSIH (NET CASH FLOW)', card3X + 3.5, currentY + 4.5);

  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Selisih Pemasukan dikurangi Pengeluaran', card3X + 3.5, currentY + 7.8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  if (isNetPositive) {
    doc.setTextColor(5, 150, 105); // emerald-600
  } else {
    doc.setTextColor(225, 29, 72); // rose-600
  }
  doc.text(formatRupiah(data.netCashFlow), card3X + 3.5, currentY + 12);

  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'bold');
  const netMarginPct =
    data.totalIncome > 0 ? ((data.netCashFlow / data.totalIncome) * 100).toFixed(1) : '0.0';
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Margin Bersih: ${netMarginPct}% | Status: ${isNetPositive ? 'Surplus Kas' : 'Defisit Kas'}`,
    card3X + 3.5,
    currentY + 15.2
  );

  currentY += cardH + 5;

  // Table Body
  const tableRows = data.transactions.map((trx, index) => {
    return [
      String(index + 1),
      trx.Transaction_ID,
      trx.Date || '-',
      trx.Store_ID,
      trx.Type,
      trx.Category,
      trx.Payment_Method,
      trx.Description || '-',
      formatRupiah(trx.Amount),
      trx.Status,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'No',
        'ID Transaksi',
        'Tanggal',
        'Outlet',
        'Tipe',
        'Kategori Akun',
        'Metode Bayar',
        'Keterangan',
        'Nominal',
        'Status',
      ],
    ],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold', cellWidth: 32 },
      2: { cellWidth: 20 },
      3: { cellWidth: 18 },
      4: { fontStyle: 'bold', cellWidth: 24 },
      5: { cellWidth: 46 },
      6: { cellWidth: 25 },
      7: { cellWidth: 50 },
      8: { halign: 'right', fontStyle: 'bold', cellWidth: 26 },
      9: { halign: 'center', cellWidth: 18 },
    },
    foot: [
      [
        '',
        'TOTAL RINGKASAN TRANSAKSI',
        '',
        '',
        '',
        '',
        `Masuk: ${formatRupiah(data.totalIncome)}`,
        `Keluar: ${formatRupiah(data.totalExpense)}`,
        formatRupiah(data.netCashFlow),
        '',
      ],
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Check page overflow for Signatures
  if (currentY > 175) {
    doc.addPage();
    currentY = 16;
  }

  // Signatures Section
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const signerName = data.companyProfile?.financeDirectorName || 'Hendra Setiawan, S.E., Ak.';
  const signerTitle = data.companyProfile?.financeDirectorTitle || 'Direktur Keuangan & Operasional';

  doc.text('Dibuat & Diverifikasi Oleh:', 20, currentY);
  doc.text('Disetujui Oleh:', pageWidth - 65, currentY);

  currentY += 15;
  doc.setDrawColor(148, 163, 184);
  doc.line(20, currentY, 70, currentY);
  doc.line(pageWidth - 65, currentY, pageWidth - 15, currentY);

  currentY += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.printedBy, 20, currentY);
  doc.text(signerName, pageWidth - 65, currentY);

  currentY += 3;
  doc.setFont('helvetica', 'normal');
  doc.text('Finance & Accounting Staff', 20, currentY);
  doc.text(signerTitle, pageWidth - 65, currentY);

  const fileName = `Laporan_Transaksi_Keuangan_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

export interface ProfitLossPdfData {
  companyProfile?: CompanyProfile;
  periodMonth: number | 'ALL';
  periodYear: number;
  activeStoreName: string;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  marginPercent: number;
  revenues: { category: string; amount: number }[];
  expenses: { category: string; amount: number }[];
  monthlyChartData: {
    month: string;
    monthNum: number;
    Pendapatan: number;
    Pengeluaran: number;
    LabaBersih: number;
    Margin: number;
  }[];
  storeMatrix?: {
    store: Store;
    revenue: number;
    expense: number;
    profit: number;
    margin: number;
  }[];
  printedBy: string;
}

export function exportProfitLossPdf(data: ProfitLossPdfData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const companyName = data.companyProfile?.companyName || 'PT NUSANTARA RETAIL MANDIRI';
  const brandName = data.companyProfile?.brandName || 'Nusantara Retail & Barbershop';
  const address = data.companyProfile?.legalAddress || 'Jakarta, Indonesia';

  let currentY = 14;

  // Header Box
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(14, currentY, pageWidth - 28, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(brandName.toUpperCase(), 20, currentY + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('LAPORAN LABA RUGI & ARUS KAS (INCOME & CASH FLOW STATEMENT)', 20, currentY + 14);

  const periodLabel =
    data.periodMonth === 'ALL'
      ? `Tahun ${data.periodYear} (Setahun Penuh / YTD)`
      : formatPeriod(data.periodMonth, data.periodYear);

  doc.text(`Periode: ${periodLabel} | Cabang: ${data.activeStoreName}`, 20, currentY + 19.5);

  currentY += 28;

  // Metadata Subheader
  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFontSize(8);
  doc.text(`Entitas Legal: ${companyName} · ${address}`, 14, currentY);
  doc.text(
    `Dicetak: ${new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })} oleh ${data.printedBy}`,
    pageWidth - 14,
    currentY,
    { align: 'right' }
  );

  currentY += 5;

  // KPI Summary Strip (4 cards)
  const cardW = (pageWidth - 28 - 9) / 4;
  const kpiCards = [
    { label: 'TOTAL PENDAPATAN', value: formatRupiah(data.totalRevenue), color: [16, 185, 129] },
    { label: 'TOTAL BEBAN USAHA', value: formatRupiah(data.totalExpense), color: [244, 63, 94] },
    {
      label: 'LABA BERSIH (NET PROFIT)',
      value: formatRupiah(data.netProfit),
      color: data.netProfit >= 0 ? [16, 185, 129] : [244, 63, 94],
    },
    {
      label: 'MARGIN LABA BERSIH',
      value: `${data.marginPercent.toFixed(1)}%`,
      color: data.netProfit >= 0 ? [59, 130, 246] : [244, 63, 94],
    },
  ];

  kpiCards.forEach((card, idx) => {
    const cardX = 14 + idx * (cardW + 3);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(cardX, currentY, cardW, 14, 1.5, 1.5, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(card.label, cardX + 3, currentY + 4.5);

    doc.setFontSize(8.5);
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.value, cardX + 3, currentY + 10.5);
  });

  currentY += 18;

  // --- DIAGRAM BATANG (BAR CHART) SECTION ---
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('I. DIAGRAM BATANG TREN LABA RUGI & ARUS KAS (JANUARI - DESEMBER)', 14, currentY);
  currentY += 3;

  // Vector Bar Chart Container
  const chartBoxX = 14;
  const chartBoxY = currentY;
  const chartBoxW = pageWidth - 28; // 182mm
  const chartBoxH = 46;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(chartBoxX, chartBoxY, chartBoxW, chartBoxH, 2, 2, 'FD');

  // Chart Legend at top right
  const legendY = chartBoxY + 5;
  // Green box: Pendapatan
  doc.setFillColor(16, 185, 129);
  doc.rect(chartBoxX + chartBoxW - 88, legendY - 2.5, 3, 3, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Pendapatan (Inflow)', chartBoxX + chartBoxW - 83, legendY);

  // Red box: Pengeluaran
  doc.setFillColor(244, 63, 94);
  doc.rect(chartBoxX + chartBoxW - 55, legendY - 2.5, 3, 3, 'F');
  doc.text('Pengeluaran (Outflow)', chartBoxX + chartBoxW - 50, legendY);

  // Blue box: Laba Bersih
  doc.setFillColor(59, 130, 246);
  doc.rect(chartBoxX + chartBoxW - 24, legendY - 2.5, 3, 3, 'F');
  doc.text('Laba Bersih', chartBoxX + chartBoxW - 19, legendY);

  // Chart Plot Area
  const plotLeft = chartBoxX + 16;
  const plotTop = chartBoxY + 8;
  const plotW = chartBoxW - 20; // 162mm
  const plotH = 28;

  // Calculate maximum value for Y-axis scale
  let maxVal = 1000000;
  data.monthlyChartData.forEach((item) => {
    if (item.Pendapatan > maxVal) maxVal = item.Pendapatan;
    if (item.Pengeluaran > maxVal) maxVal = item.Pengeluaran;
    if (Math.abs(item.LabaBersih) > maxVal) maxVal = Math.abs(item.LabaBersih);
  });
  // Nice ceiling
  const step = Math.pow(10, Math.floor(Math.log10(maxVal)));
  const maxCeil = Math.ceil(maxVal / step) * step;

  // Horizontal Gridlines & Y-Axis ticks
  const gridSteps = 3;
  for (let g = 0; g <= gridSteps; g++) {
    const val = (maxCeil / gridSteps) * g;
    const lineY = plotTop + plotH - (g / gridSteps) * plotH;

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(plotLeft, lineY, plotLeft + plotW, lineY);

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    const labelText = val >= 1000000 ? `${(val / 1000000).toFixed(0)}jt` : `${val}`;
    doc.text(labelText, plotLeft - 1.5, lineY + 1, { align: 'right' });
  }

  // Draw 12 Months Bars
  const colSlotW = plotW / 12; // ~13.5mm
  const barW = 2.4; // each bar width

  data.monthlyChartData.forEach((mItem, idx) => {
    const slotStartX = plotLeft + idx * colSlotW;
    const groupCenterX = slotStartX + colSlotW / 2;

    // Highlight background for selected month
    if (typeof data.periodMonth === 'number' && mItem.monthNum === data.periodMonth) {
      doc.setFillColor(254, 243, 199); // amber-100
      doc.roundedRect(slotStartX + 0.5, plotTop - 1, colSlotW - 1, plotH + 7, 1, 1, 'F');
      doc.setFillColor(217, 119, 6); // amber-600 badge
      doc.rect(groupCenterX - 3, plotTop - 2.5, 6, 1.5, 'F');
    }

    // Heights
    const revH = (mItem.Pendapatan / maxCeil) * plotH;
    const expH = (mItem.Pengeluaran / maxCeil) * plotH;
    const profitH = (Math.max(0, mItem.LabaBersih) / maxCeil) * plotH;

    const b1X = groupCenterX - barW * 1.5 - 0.5;
    const b2X = groupCenterX - barW * 0.5;
    const b3X = groupCenterX + barW * 0.5 + 0.5;
    const baselineY = plotTop + plotH;

    // Bar 1: Pendapatan (Green)
    if (revH > 0) {
      doc.setFillColor(16, 185, 129);
      doc.rect(b1X, baselineY - revH, barW, revH, 'F');
    }

    // Bar 2: Pengeluaran (Red)
    if (expH > 0) {
      doc.setFillColor(244, 63, 94);
      doc.rect(b2X, baselineY - expH, barW, expH, 'F');
    }

    // Bar 3: Laba Bersih (Blue)
    if (profitH > 0) {
      doc.setFillColor(59, 130, 246);
      doc.rect(b3X, baselineY - profitH, barW, profitH, 'F');
    } else if (mItem.LabaBersih < 0) {
      // Rugi marker
      doc.setFillColor(225, 29, 72);
      doc.rect(b3X, baselineY - 1.2, barW, 1.2, 'F');
    }

    // Month Label
    doc.setFontSize(6);
    doc.setFont('helvetica', typeof data.periodMonth === 'number' && mItem.monthNum === data.periodMonth ? 'bold' : 'normal');
    doc.setTextColor(
      typeof data.periodMonth === 'number' && mItem.monthNum === data.periodMonth ? 180 : 71,
      typeof data.periodMonth === 'number' && mItem.monthNum === data.periodMonth ? 83 : 85,
      typeof data.periodMonth === 'number' && mItem.monthNum === data.periodMonth ? 9 : 105
    );
    doc.text(mItem.month, groupCenterX, baselineY + 4, { align: 'center' });
  });

  currentY += chartBoxH + 6;

  // --- SECTION II: TABEL PENDAPATAN OPERASIONAL ---
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('II. RINCIAN PENDAPATAN OPERASIONAL (REVENUE)', 14, currentY);
  currentY += 2;

  const revRows = data.revenues.map((item, idx) => {
    const pct = data.totalRevenue > 0 ? (item.amount / data.totalRevenue) * 100 : 0;
    return [String(idx + 1), item.category, formatRupiah(item.amount), `${pct.toFixed(1)}%`];
  });
  if (revRows.length === 0) {
    revRows.push(['-', 'Tidak ada pendapatan pada periode ini', 'Rp 0', '0%']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['No', 'Kategori Pos Pendapatan', 'Nominal (Rp)', 'Porsi (%)']],
    body: revRows,
    foot: [['', 'TOTAL PENDAPATAN OPERASIONAL', formatRupiah(data.totalRevenue), '100%']],
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129], // emerald-500
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    footStyles: {
      fillColor: [240, 253, 244],
      textColor: [5, 150, 105],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: { fontSize: 7, cellPadding: 1.8 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 102 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 40 },
      3: { halign: 'right', cellWidth: 30 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Check page break before expenses
  if (currentY > 210) {
    doc.addPage();
    currentY = 16;
  }

  // --- SECTION III: TABEL BEBAN USAHA & OPERASIONAL ---
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('III. RINCIAN BEBAN USAHA & OPERASIONAL (OPERATING EXPENSES)', 14, currentY);
  currentY += 2;

  const expRows = data.expenses.map((item, idx) => {
    const pct = data.totalExpense > 0 ? (item.amount / data.totalExpense) * 100 : 0;
    return [String(idx + 1), item.category, formatRupiah(item.amount), `${pct.toFixed(1)}%`];
  });
  if (expRows.length === 0) {
    expRows.push(['-', 'Tidak ada pengeluaran pada periode ini', 'Rp 0', '0%']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['No', 'Kategori Pos Beban Usaha', 'Nominal (Rp)', 'Porsi (%)']],
    body: expRows,
    foot: [['', 'TOTAL BEBAN USAHA OPERASIONAL', formatRupiah(data.totalExpense), '100%']],
    theme: 'grid',
    headStyles: {
      fillColor: [244, 63, 94], // rose-500
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    footStyles: {
      fillColor: [255, 241, 242],
      textColor: [225, 29, 72],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: { fontSize: 7, cellPadding: 1.8 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 102 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 40 },
      3: { halign: 'right', cellWidth: 30 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Bottom Line Box
  if (currentY > 230) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFillColor(data.netProfit >= 0 ? 240 : 255, data.netProfit >= 0 ? 253 : 241, data.netProfit >= 0 ? 244 : 242);
  doc.setDrawColor(data.netProfit >= 0 ? 16 : 244, data.netProfit >= 0 ? 185 : 63, data.netProfit >= 0 ? 129 : 94);
  doc.roundedRect(14, currentY, pageWidth - 28, 14, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('HASIL AKHIR: LABA / (RUGI) BERSIH OPERASIONAL', 20, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Formula: Total Pendapatan Operasional - Total Beban Usaha', 20, currentY + 10.5);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  if (data.netProfit >= 0) {
    doc.setTextColor(5, 150, 105);
  } else {
    doc.setTextColor(225, 29, 72);
  }
  doc.text(formatRupiah(data.netProfit), pageWidth - 20, currentY + 9, { align: 'right' });

  currentY += 19;

  // Multi-Store Matrix (if present and consolidated)
  if (data.storeMatrix && data.storeMatrix.length > 0) {
    if (currentY > 215) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('IV. MATRIKS KINERJA LABA RUGI PER CABANG TOKO', 14, currentY);
    currentY += 2;

    const matrixRows = data.storeMatrix.map((item, idx) => [
      String(idx + 1),
      item.store.Store_Name,
      item.store.Manager_Name,
      formatRupiah(item.revenue),
      formatRupiah(item.expense),
      formatRupiah(item.profit),
      `${item.margin.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['No', 'Nama Cabang', 'Manager', 'Pendapatan', 'Pengeluaran', 'Laba Bersih', 'Margin %']],
      body: matrixRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      styles: { fontSize: 7, cellPadding: 1.8 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { fontStyle: 'bold', cellWidth: 42 },
        2: { cellWidth: 35 },
        3: { halign: 'right', cellWidth: 26 },
        4: { halign: 'right', cellWidth: 26 },
        5: { halign: 'right', fontStyle: 'bold', cellWidth: 27 },
        6: { halign: 'right', cellWidth: 18 },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Signatures Section
  if (currentY > 235) {
    doc.addPage();
    currentY = 20;
  }

  currentY += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const signerName = data.companyProfile?.financeDirectorName || 'Hendra Setiawan, S.E., Ak.';
  const signerTitle = data.companyProfile?.financeDirectorTitle || 'Direktur Keuangan & Operasional';

  doc.text('Dibuat & Disiapkan Oleh:', 24, currentY);
  doc.text('Disetujui Oleh:', pageWidth - 65, currentY);

  currentY += 16;
  doc.setDrawColor(148, 163, 184);
  doc.line(24, currentY, 74, currentY);
  doc.line(pageWidth - 65, currentY, pageWidth - 15, currentY);

  currentY += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.printedBy, 24, currentY);
  doc.text(signerName, pageWidth - 65, currentY);

  currentY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.text('Finance & Accounting Division', 24, currentY);
  doc.text(signerTitle, pageWidth - 65, currentY);

  const filePeriodName =
    data.periodMonth === 'ALL'
      ? `Tahun_${data.periodYear}`
      : `${data.periodYear}_${String(data.periodMonth).padStart(2, '0')}`;
  doc.save(`Laporan_Laba_Rugi_Arus_Kas_${filePeriodName}.pdf`);
}

export interface PayrollListPdfData {
  companyProfile?: CompanyProfile;
  periodMonth: number;
  periodYear: number;
  activeStoreName: string;
  runs: (PayrollRun & {
    employeeName?: string;
    employeePosition?: string;
    employeeBank?: string;
    employeeAccount?: string;
  })[];
  totalBaseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  totalNetSalary: number;
  printedBy: string;
}

export function exportPayrollListPdf(data: PayrollListPdfData) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const companyName = data.companyProfile?.companyName || 'PT NUSANTARA RETAIL MANDIRI';
  const brandName = data.companyProfile?.brandName || 'Nusantara Retail & Barbershop';
  const address = data.companyProfile?.legalAddress || 'Jakarta, Indonesia';

  let currentY = 12;

  // Header Box
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(12, currentY, pageWidth - 24, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(brandName.toUpperCase(), 18, currentY + 7.5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('LAPORAN DAFTAR REKAPITULASI PENGGAJIAN BULANAN (MONTHLY PAYROLL REPORT)', 18, currentY + 13);
  doc.text(
    `Periode: ${formatPeriod(data.periodMonth, data.periodYear)} | Outlet: ${data.activeStoreName} | Total Karyawan: ${data.runs.length} Orang`,
    18,
    currentY + 18
  );

  currentY += 26;

  // Metadata ribbon
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.text(`Entitas Legal: ${companyName} · ${address}`, 12, currentY);
  doc.text(
    `Dicetak: ${new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })} oleh ${data.printedBy}`,
    pageWidth - 12,
    currentY,
    { align: 'right' }
  );

  currentY += 4;

  // KPI Summary Strip (5 metric tiles)
  const numTiles = 5;
  const tileGap = 3;
  const tileW = (pageWidth - 24 - (numTiles - 1) * tileGap) / numTiles;
  const tiles = [
    { label: 'TOTAL KARYAWAN', value: `${data.runs.length} Orang`, color: [15, 23, 42] },
    { label: 'TOTAL GAJI POKOK', value: formatRupiah(data.totalBaseSalary), color: [71, 85, 105] },
    { label: 'TOTAL TUNJANGAN', value: `+${formatRupiah(data.totalAllowances)}`, color: [16, 185, 129] },
    { label: 'TOTAL POTONGAN', value: `-${formatRupiah(data.totalDeductions)}`, color: [244, 63, 94] },
    { label: 'TOTAL BEBAN GAJI (THP)', value: formatRupiah(data.totalNetSalary), color: [5, 150, 105] },
  ];

  tiles.forEach((tile, idx) => {
    const tX = 12 + idx * (tileW + tileGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(tX, currentY, tileW, 13, 1.5, 1.5, 'FD');

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(tile.label, tX + 3, currentY + 4.2);

    doc.setFontSize(8.5);
    doc.setTextColor(tile.color[0], tile.color[1], tile.color[2]);
    doc.text(tile.value, tX + 3, currentY + 10);
  });

  currentY += 17;

  // Main Payroll Data Table
  const tableRows = data.runs.map((run, index) => {
    return [
      String(index + 1),
      run.Payroll_ID,
      run.employeeName || run.Employee_ID,
      run.employeePosition || '-',
      run.Store_ID,
      formatRupiah(run.Base_Salary),
      formatRupiah(run.Total_Allowances),
      formatRupiah(run.Total_Deductions),
      formatRupiah(run.Net_Salary),
      run.employeeBank ? `${run.employeeBank} ${run.employeeAccount || ''}` : '-',
      run.Payment_Status.toUpperCase(),
      run.Payment_Date || '-',
    ];
  });

  if (tableRows.length === 0) {
    tableRows.push(['-', '-', 'Belum ada data penggajian untuk periode ini', '-', '-', 'Rp 0', 'Rp 0', 'Rp 0', 'Rp 0', '-', '-', '-']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'No',
        'ID Payroll',
        'Nama Karyawan',
        'Jabatan',
        'Cabang',
        'Gaji Pokok',
        'Tunjangan (+)',
        'Potongan (-)',
        'Take Home Pay',
        'Rekening Tujuan',
        'Status',
        'Tgl Bayar',
      ],
    ],
    body: tableRows,
    foot: [
      [
        '',
        'TOTAL PENGGAJIAN',
        `${data.runs.length} Karyawan`,
        '',
        '',
        formatRupiah(data.totalBaseSalary),
        formatRupiah(data.totalAllowances),
        formatRupiah(data.totalDeductions),
        formatRupiah(data.totalNetSalary),
        '',
        '',
        '',
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold', cellWidth: 22 },
      2: { fontStyle: 'bold', cellWidth: 38 },
      3: { cellWidth: 24 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'right', cellWidth: 24 },
      6: { halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105], cellWidth: 24 },
      7: { halign: 'right', fontStyle: 'bold', textColor: [225, 29, 72], cellWidth: 24 },
      8: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 28 },
      9: { cellWidth: 32 },
      10: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
      11: { halign: 'center', cellWidth: 19 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Check page overflow for Signatures
  if (currentY > 175) {
    doc.addPage();
    currentY = 16;
  }

  // Signatures Section
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const signerName = data.companyProfile?.financeDirectorName || 'Hendra Setiawan, S.E., Ak.';
  const signerTitle = data.companyProfile?.financeDirectorTitle || 'Direktur Keuangan & Operasional';

  doc.text('Dibuat & Disiapkan Oleh:', 20, currentY);
  doc.text('Diperiksa Oleh (HRD):', 120, currentY);
  doc.text('Disetujui Oleh:', pageWidth - 65, currentY);

  currentY += 15;
  doc.setDrawColor(148, 163, 184);
  doc.line(20, currentY, 65, currentY);
  doc.line(120, currentY, 165, currentY);
  doc.line(pageWidth - 65, currentY, pageWidth - 15, currentY);

  currentY += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.printedBy, 20, currentY);
  doc.text('Staff HRD & Personalia', 120, currentY);
  doc.text(signerName, pageWidth - 65, currentY);

  currentY += 3;
  doc.setFont('helvetica', 'normal');
  doc.text('Payroll Specialist', 20, currentY);
  doc.text('Human Capital Manager', 120, currentY);
  doc.text(signerTitle, pageWidth - 65, currentY);

  const fileName = `Laporan_Rekapitulasi_Payroll_${data.periodYear}_${String(data.periodMonth).padStart(2, '0')}.pdf`;
  doc.save(fileName);
}

export interface DebtsReportPdfData {
  companyProfile?: CompanyProfile;
  activeStoreName: string;
  debts: DebtRecord[];
  totalPrincipal: number;
  totalPaid: number;
  totalRemaining: number;
  printedBy: string;
}

export function exportDebtsReportPdf(data: DebtsReportPdfData) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const companyName = data.companyProfile?.companyName || 'PT NUSANTARA RETAIL MANDIRI';
  const brandName = data.companyProfile?.brandName || 'Nusantara Retail & Barbershop';
  const address = data.companyProfile?.legalAddress || 'Jakarta, Indonesia';

  let currentY = 14;

  // Header Box
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(14, currentY, pageWidth - 28, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(brandName.toUpperCase(), 20, currentY + 8);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`LAPORAN MONITORING HUTANG & CICILAN TRANSAKSI KEUANGAN`, 20, currentY + 14);
  doc.text(
    `Outlet / Cabang: ${data.activeStoreName} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} | Dicetak Oleh: ${data.printedBy}`,
    20,
    currentY + 19
  );

  currentY += 26;

  // 3 Summary Metric Cards
  const cardWidth = (pageWidth - 28 - 8) / 3;

  // Card 1: Total Plafon Hutang
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, currentY, cardWidth, 16, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL PLAFON / NILAI HUTANG', 18, currentY + 5.5);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatRupiah(data.totalPrincipal), 18, currentY + 12);

  // Card 2: Total Cicilan Terbayar
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(14 + cardWidth + 4, currentY, cardWidth, 16, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(5, 150, 105);
  doc.text('TOTAL CICILAN TERBAYAR (REALISASI)', 18 + cardWidth + 4, currentY + 5.5);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text(formatRupiah(data.totalPaid), 18 + cardWidth + 4, currentY + 12);

  // Card 3: Sisa Saldo Hutang
  doc.setFillColor(255, 241, 242);
  doc.roundedRect(14 + (cardWidth + 4) * 2, currentY, cardWidth, 16, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(225, 29, 72);
  doc.text('SISA SALDO HUTANG (OUTSTANDING)', 18 + (cardWidth + 4) * 2, currentY + 5.5);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(190, 18, 60);
  doc.text(formatRupiah(data.totalRemaining), 18 + (cardWidth + 4) * 2, currentY + 12);

  currentY += 21;

  // Debts Table
  const tableRows = data.debts.map((debt, index) => {
    const paymentCount = debt.Payments?.length || 0;
    const lastPayment = paymentCount > 0 ? debt.Payments[paymentCount - 1] : null;
    const lastPayInfo = lastPayment
      ? `${formatRupiah(lastPayment.Total_Paid || lastPayment.Amount)} (${lastPayment.Date})${lastPayment.Transaction_ID ? ' [' + lastPayment.Transaction_ID + ']' : ''}`
      : '-';

    const statusLabel =
      debt.Status === 'Paid'
        ? 'LUNAS'
        : debt.Status === 'Partial'
        ? `SEBAGIAN (${paymentCount}x)`
        : debt.Status === 'Overdue'
        ? 'JATUH TEMPO'
        : 'BELUM BAYAR';

    return [
      (index + 1).toString(),
      debt.Debt_ID,
      debt.Creditor_Name,
      debt.Debt_Type,
      debt.Reference_Number || '-',
      debt.COA_Account,
      formatRupiah(debt.Total_Amount),
      formatRupiah(debt.Paid_Amount),
      formatRupiah(debt.Remaining_Balance),
      debt.Due_Date,
      statusLabel,
      lastPayInfo,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'No',
        'ID Hutang',
        'Kreditur / Rekanan',
        'Jenis Hutang',
        'No Referensi',
        'Bagan Akun (COA)',
        'Plafon (Rp)',
        'Terbayar (Rp)',
        'Sisa Hutang (Rp)',
        'Jatuh Tempo',
        'Status',
        'Pembayaran Terakhir & No TRX',
      ],
    ],
    body: tableRows,
    foot: [
      [
        '',
        'TOTAL KONSOLIDASI',
        '',
        '',
        '',
        '',
        formatRupiah(data.totalPrincipal),
        formatRupiah(data.totalPaid),
        formatRupiah(data.totalRemaining),
        '',
        `${data.debts.length} Fasilitas`,
        '',
      ],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 22, fontStyle: 'bold' },
      2: { cellWidth: 38 },
      3: { cellWidth: 26 },
      4: { cellWidth: 24 },
      5: { cellWidth: 32 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
      7: { halign: 'right', cellWidth: 22, textColor: [4, 120, 87] },
      8: { halign: 'right', fontStyle: 'bold', cellWidth: 22, textColor: [190, 18, 60] },
      9: { halign: 'center', cellWidth: 18 },
      10: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
      11: { cellWidth: 34 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Check page overflow for Signatures
  if (currentY > 170) {
    doc.addPage();
    currentY = 16;
  }

  // Signatures Section
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const signerName = data.companyProfile?.financeDirectorName || 'Hendra Setiawan, S.E., Ak.';
  const signerTitle = data.companyProfile?.financeDirectorTitle || 'Direktur Keuangan & Operasional';

  doc.text('Dibuat & Disiapkan Oleh:', 20, currentY);
  doc.text('Diperiksa Oleh (Finance Lead):', 120, currentY);
  doc.text('Disetujui Oleh:', pageWidth - 70, currentY);

  currentY += 15;
  doc.setDrawColor(148, 163, 184);
  doc.line(20, currentY, 65, currentY);
  doc.line(120, currentY, 165, currentY);
  doc.line(pageWidth - 70, currentY, pageWidth - 20, currentY);

  currentY += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.printedBy, 20, currentY);
  doc.text('Finance & Accounting Lead', 120, currentY);
  doc.text(signerName, pageWidth - 70, currentY);

  currentY += 3;
  doc.setFont('helvetica', 'normal');
  doc.text('Staff Treasury & AP', 20, currentY);
  doc.text('Accounting Manager', 120, currentY);
  doc.text(signerTitle, pageWidth - 70, currentY);

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Laporan_Monitoring_Hutang_Cicilan_${dateStr}.pdf`;
  doc.save(fileName);
}


