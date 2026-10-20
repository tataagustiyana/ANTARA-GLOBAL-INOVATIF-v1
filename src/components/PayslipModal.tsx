import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CheckCircle2, Download, FileDown, Printer, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { CompanyProfile, Employee, PayrollRun, Store } from '../types';
import { formatDate, formatPeriod, formatRupiah, terbilang } from '../utils/formatters';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  payroll: PayrollRun | null;
  employee: Employee | null;
  store: Store | null;
  companyProfile?: CompanyProfile;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  isOpen,
  onClose,
  payroll,
  employee,
  store,
  companyProfile,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen || !payroll || !employee) return null;

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const safeName = (employee.Full_Name || 'Karyawan').replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`Slip_Gaji_${safeName}_${payroll.Period_Year}_${payroll.Period_Month}.pdf`);
    } catch (err) {
      console.error('Gagal generate PDF slip gaji:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const allowances = payroll.Allowances_Breakdown || {
    fixed: payroll.Total_Allowances || 0,
    overtime: 0,
    bonus: 0,
    meal: 0,
  };

  const deductions = payroll.Deductions_Breakdown || {
    bpjs: 0,
    kasbon: 0,
    latePenalty: 0,
    tax: 0,
  };

  const companyName = companyProfile?.companyName || 'PT NUSANTARA RETAIL MANDIRI';
  const companyAddress = companyProfile?.legalAddress || store?.Address || 'Kantor Pusat';
  const taxNumber = companyProfile?.taxNumber || '-';
  const signerName = companyProfile?.financeDirectorName || 'Hendra Setiawan, S.E., Ak.';
  const signerTitle = companyProfile?.financeDirectorTitle || 'Direktur Keuangan & Operasional';

  const customEarnings = payroll.Custom_Items?.filter((i) => i.type === 'earning') || [];
  const customDeductions = payroll.Custom_Items?.filter((i) => i.type === 'deduction') || [];

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = () => {
    if (!printRef.current) return;

    const earningsRows =
      customEarnings.length > 0
        ? customEarnings
            .map((item) => {
              const unitDetail =
                item.quantity !== undefined && item.rate_per_unit !== undefined
                  ? ` <span style="font-size:11px;color:#64748b;font-weight:normal;">(${item.quantity} ${item.unit_name || 'Unit'} @ ${formatRupiah(item.rate_per_unit)})</span>`
                  : '';
              return `<tr><td>${item.name}${unitDetail}</td><td class="text-right">${formatRupiah(item.amount)}</td></tr>`;
            })
            .join('')
        : `<tr><td>Tunjangan Jabatan & Tetap</td><td class="text-right">${formatRupiah(allowances.fixed)}</td></tr>
           <tr><td>Lembur / Bonus</td><td class="text-right">${formatRupiah(allowances.overtime + allowances.bonus)}</td></tr>`;

    const deductionsRows =
      customDeductions.length > 0
        ? customDeductions
            .map(
              (item) =>
                `<tr><td>${item.name}</td><td class="text-right">-${formatRupiah(item.amount)}</td></tr>`
            )
            .join('')
        : `<tr><td>BPJS Ketenagakerjaan & Kes</td><td class="text-right">${formatRupiah(deductions.bpjs)}</td></tr>
           <tr><td>Kasbon / Pinjaman</td><td class="text-right">${formatRupiah(deductions.kasbon)}</td></tr>
           <tr><td>Potongan Keterlambatan / PPh 21</td><td class="text-right">${formatRupiah(deductions.latePenalty + deductions.tax)}</td></tr>`;

    const slipHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Slip Gaji - ${employee.Full_Name} - ${formatPeriod(payroll.Period_Month, payroll.Period_Year)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .company { font-size: 13px; font-weight: bold; color: #059669; text-transform: uppercase; }
    .title { font-size: 18px; font-weight: bold; text-transform: uppercase; margin-top: 2px; }
    .subtitle { font-size: 11px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th, td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; text-align: left; }
    .text-right { text-align: right; }
    .total-box { background: #f1f5f9; font-weight: bold; font-size: 14px; margin-top: 16px; padding: 12px; border-radius: 6px; }
    .signatures { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; font-size: 12px; }
    .sign-box { width: 30%; }
    .sign-space { height: 60px; }
    .sign-name { border-top: 1px solid #94a3b8; padding-top: 4px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">${companyName}</div>
    <div class="title">SLIP GAJI KARYAWAN</div>
    <div class="subtitle">${companyAddress} · NPWP: ${taxNumber} | Cabang: ${store?.Store_Name || '-'}</div>
    <div class="subtitle" style="margin-top:4px;">Periode: ${formatPeriod(payroll.Period_Month, payroll.Period_Year)} | Ref: ${payroll.Payroll_ID}</div>
  </div>
  <div>
    <strong>Nama:</strong> ${employee.Full_Name} &nbsp;|&nbsp; 
    <strong>NIP:</strong> ${employee.Employee_ID} &nbsp;|&nbsp; 
    <strong>Jabatan:</strong> ${employee.Position} &nbsp;|&nbsp; 
    <strong>Rekening:</strong> ${employee.Bank_Name} - ${employee.Account_Number}
  </div>
  <table style="margin-top:16px;">
    <tr><th>PENGHASILAN</th><th class="text-right">JUMLAH</th><th>POTONGAN</th><th class="text-right">JUMLAH</th></tr>
    <tr>
      <td>Gaji Pokok</td><td class="text-right">${formatRupiah(payroll.Base_Salary)}</td>
      <td colspan="2" rowspan="2" style="vertical-align:top; padding:0;">
        <table style="width:100%; margin:0; border:none;">
          ${deductionsRows}
        </table>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="vertical-align:top; padding:0;">
        <table style="width:100%; margin:0; border:none;">
          <tr><td>Tunjangan Tetap</td><td class="text-right">${formatRupiah(allowances.fixed)}</td></tr>
          ${earningsRows}
        </table>
      </td>
    </tr>
    <tr style="font-weight:bold; background:#f8fafc;">
      <td>Total Penghasilan Kotor</td><td class="text-right">${formatRupiah(payroll.Base_Salary + payroll.Total_Allowances)}</td>
      <td>Total Potongan</td><td class="text-right">-${formatRupiah(payroll.Total_Deductions)}</td>
    </tr>
  </table>
  <div class="total-box">
    GAJI BERSIH DITERIMA: ${formatRupiah(payroll.Net_Salary)}<br>
    <span style="font-size:11px; font-weight:normal; font-style:italic;">Terbilang: ${terbilang(payroll.Net_Salary)}</span>
  </div>
  <div class="signatures">
    <div class="sign-box"><div>Dibuat Oleh,</div><div class="sign-space"></div><div class="sign-name">Finance & Payroll Dept</div></div>
    <div class="sign-box"><div>Disetujui Oleh,</div><div class="sign-space"></div><div class="sign-name">${signerName}</div><div style="font-size:10px; color:#64748b;">${signerTitle}</div></div>
    <div class="sign-box"><div>Diterima Oleh,</div><div class="sign-space"></div><div class="sign-name">${employee.Full_Name}</div><div style="font-size:10px; color:#64748b;">${employee.Position}</div></div>
  </div>
</body>
</html>`;

    const blob = new Blob([slipHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Slip_Gaji_${employee.Full_Name.replace(/\s+/g, '_')}_${payroll.Period_Year}_${payroll.Period_Month}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8">
        {/* Modal Controls (Not Printed) */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Slip Gaji Karyawan
            </h3>
            <span className="text-xs text-slate-500">
              · {formatPeriod(payroll.Period_Month, payroll.Period_Year)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
              title="Unduh Slip Gaji dalam format PDF"
            >
              <FileDown className="h-4 w-4" />
              <span>{isGeneratingPdf ? 'Memproses PDF...' : 'Unduh PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak</span>
            </button>
            <button
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Unduh HTML</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div className="p-8 print:p-0" ref={printRef} id="printable-payslip">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4 dark:border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3.5">
                {companyProfile?.logoUrl ? (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white p-1 border border-slate-200 shadow-xs">
                    <img
                      src={companyProfile.logoUrl}
                      alt={companyName}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white font-bold text-xl shadow-xs">
                    {companyName.charAt(0)}
                  </div>
                )}
                <div>
                  <span className="text-xs font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase block">
                    {companyName}
                  </span>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    SLIP GAJI KARYAWAN
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {companyAddress} · NPWP: {taxNumber}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Cabang Operasional: <strong>{store?.Store_Name || 'Kantor Pusat'}</strong>
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  REF: {payroll.Payroll_ID}
                </div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  Periode: {formatPeriod(payroll.Period_Month, payroll.Period_Year)}
                </div>
                <div className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Status: {payroll.Payment_Status.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Employee Info Grid (Tanpa Masa Kerja sesuai permintaan) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 text-xs border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-slate-400 dark:text-slate-500 block">Nama Karyawan</span>
              <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block text-sm">
                {employee.Full_Name}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 block">ID Karyawan / NIP</span>
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300 mt-0.5 block">
                {employee.Employee_ID}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 block">Jabatan & Toko</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 mt-0.5 block">
                {employee.Position} · {store?.Store_Name || '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 block">Rekening Pembayaran</span>
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300 mt-0.5 block">
                {employee.Bank_Name} - {employee.Account_Number}
              </span>
            </div>
          </div>

          {/* Earnings & Deductions Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Penghasilan (Earnings) */}
            <div>
              <div className="border-b border-slate-200 pb-1.5 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  A. Penerimaan (Earnings)
                </h4>
              </div>
              <table className="w-full text-xs mt-2">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="py-2 text-slate-600 dark:text-slate-400">Gaji Pokok</td>
                    <td className="py-2 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                      {formatRupiah(payroll.Base_Salary)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-600 dark:text-slate-400">Tunjangan Tetap</td>
                    <td className="py-2 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                      {formatRupiah(allowances.fixed)}
                    </td>
                  </tr>
                  {customEarnings.length > 0 ? (
                    customEarnings.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 text-slate-600 dark:text-slate-400">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {item.name}
                            </span>
                          </div>
                          {item.quantity !== undefined && item.rate_per_unit !== undefined && (
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.quantity} {item.unit_name || 'Unit'} × {formatRupiah(item.rate_per_unit)}
                            </div>
                          )}
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums text-slate-900 dark:text-white font-medium align-top">
                          {formatRupiah(item.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <>
                      {allowances.overtime > 0 && (
                        <tr>
                          <td className="py-2 text-slate-600 dark:text-slate-400">Upah Lembur (Overtime)</td>
                          <td className="py-2 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                            {formatRupiah(allowances.overtime)}
                          </td>
                        </tr>
                      )}
                      {allowances.bonus > 0 && (
                        <tr>
                          <td className="py-2 text-slate-600 dark:text-slate-400">Bonus & Insentif Performa</td>
                          <td className="py-2 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                            {formatRupiah(allowances.bonus)}
                          </td>
                        </tr>
                      )}
                      {allowances.meal > 0 && (
                        <tr>
                          <td className="py-2 text-slate-600 dark:text-slate-400">Uang Makan / Transport</td>
                          <td className="py-2 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                            {formatRupiah(allowances.meal)}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 dark:border-slate-800 font-semibold">
                    <td className="py-2 text-slate-800 dark:text-slate-200">Total Penghasilan Kotor</td>
                    <td className="py-2 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                      {formatRupiah(payroll.Base_Salary + payroll.Total_Allowances)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Potongan (Deductions) */}
            <div>
              <div className="border-b border-slate-200 pb-1.5 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  B. Potongan (Deductions)
                </h4>
              </div>
              <table className="w-full text-xs mt-2">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customDeductions.length > 0 ? (
                    customDeductions.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 text-slate-600 dark:text-slate-400">{item.name}</td>
                        <td className="py-2 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                          -{formatRupiah(item.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr>
                        <td className="py-2 text-slate-600 dark:text-slate-400">BPJS Ketenagakerjaan & Kesehatan</td>
                        <td className="py-2 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                          {deductions.bpjs > 0 ? `-${formatRupiah(deductions.bpjs)}` : 'Rp 0'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-slate-600 dark:text-slate-400">Kasbon / Pinjaman Karyawan</td>
                        <td className="py-2 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                          {deductions.kasbon > 0 ? `-${formatRupiah(deductions.kasbon)}` : 'Rp 0'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-slate-600 dark:text-slate-400">Keterlambatan & Kehadiran</td>
                        <td className="py-2 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                          {deductions.latePenalty > 0 ? `-${formatRupiah(deductions.latePenalty)}` : 'Rp 0'}
                        </td>
                      </tr>
                      {deductions.tax > 0 && (
                        <tr>
                          <td className="py-2 text-slate-600 dark:text-slate-400">PPh Pasal 21</td>
                          <td className="py-2 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                            -{formatRupiah(deductions.tax)}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 dark:border-slate-800 font-semibold">
                    <td className="py-2 text-slate-800 dark:text-slate-200">Total Potongan</td>
                    <td className="py-2 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                      -{formatRupiah(payroll.Total_Deductions)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Take Home Pay Box */}
          <div className="mt-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  GAJI BERSIH DITERIMA (TAKE HOME PAY)
                </span>
                <p className="text-xs italic text-slate-600 dark:text-slate-300 mt-1">
                  Terbilang: &ldquo;{terbilang(payroll.Net_Salary)}&rdquo;
                </p>
                {payroll.Notes && (
                  <p className="text-xs text-slate-500 mt-1">Catatan: {payroll.Notes}</p>
                )}
              </div>
              <div className="text-left sm:text-right">
                <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(payroll.Net_Salary)}
                </span>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Ditransfer ke {employee.Bank_Name} ({formatDate(payroll.Payment_Date || '')})
                </span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-12 grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Dibuat Oleh,</span>
              <div className="h-14"></div>
              <div className="border-t border-slate-300 dark:border-slate-700 pt-1 font-medium text-slate-800 dark:text-slate-200">
                Finance & Payroll Dept
              </div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Disetujui Oleh,</span>
              <div className="h-14"></div>
              <div className="border-t border-slate-300 dark:border-slate-700 pt-1 font-medium text-slate-800 dark:text-slate-200">
                {signerName}
              </div>
              <div className="text-[10px] text-slate-400">{signerTitle}</div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Diterima Oleh,</span>
              <div className="h-14"></div>
              <div className="border-t border-slate-300 dark:border-slate-700 pt-1 font-medium text-slate-800 dark:text-slate-200">
                {employee.Full_Name}
              </div>
              <div className="text-[10px] text-slate-400">{employee.Position}</div>
            </div>
          </div>

          {/* Confidential Footer */}
          <div className="mt-8 text-center text-[10px] text-slate-400 dark:text-slate-500 border-t border-dashed border-slate-200 dark:border-slate-800 pt-3">
            Dokumen ini dihasilkan secara otomatis oleh Nusantara Finance & Payroll System dan bersifat rahasia (CONFIDENTIAL).
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex justify-end border-t border-slate-200 px-6 py-3 dark:border-slate-800 print:hidden">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
