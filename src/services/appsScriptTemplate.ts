/**
 * Google Apps Script Code template for Google Sheets integration
 * This code is deployed as a Web App (Deploy > New deployment > Web app > Access: Anyone)
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * NUSANTARA FINANCE & PAYROLL - GOOGLE SHEETS BACKEND (Code.gs)
 * =========================================================================
 * Petunjuk Instalasi:
 * 1. Buat Google Spreadsheet baru di Google Drive Anda.
 * 2. Buka menu Extensions (Ekstensi) > Apps Script.
 * 3. Hapus semua kode yang ada, lalu salin dan tempel (paste) seluruh kode ini.
 * 4. Klik tombol "Save" (ikon disket).
 * 5. Klik "Deploy" (Terapkan) > "New deployment" (Penerapan baru).
 * 6. Pilih tipe: "Web app" (Aplikasi Web).
 * 7. Isi:
 *    - Description: "Nusantara Finance API v1"
 *    - Execute as: "Me" (Email Google Anda)
 *    - Who has access: "Anyone" (Siapa saja - agar aplikasi web dapat terhubung)
 * 8. Klik "Deploy" dan izinkan akses (Authorize Access jika diminta).
 * 9. Salin "Web App URL" (akhiran /exec) dan tempel ke pengaturan aplikasi web!
 * =========================================================================
 */

const SHEET_NAMES = {
  STORES: 'Stores',
  USERS: 'Users & Roles',
  COA: 'Chart_of_Accounts',
  TRANSACTIONS: 'Transactions',
  EMPLOYEES: 'Employees',
  PAYROLL: 'Payroll_Runs',
  BUDGETS: 'Store_Budgets',
  COMPANY: 'Company_Profile',
  EMPLOYEE_LOANS: 'Employee_Loans',
  SUPPLIER_DEBTS: 'Supplier_Debts',
  PURCHASE_ORDERS: 'Purchase_Orders',
};

// Response helper with CORS
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET Endpoint
function doGet(e) {
  try {
    const action = e.parameter.action || 'getAllData';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Auto initialize if sheets don't exist
    checkAndInitSheets(ss);

    if (action === 'ping') {
      return createJsonResponse({
        status: 'success',
        message: 'Koneksi ke Google Sheets berhasil!',
        timestamp: new Date().toISOString(),
        spreadsheetName: ss.getName(),
      });
    }

    if (action === 'getAllData') {
      const data = {
        stores: getSheetData(ss.getSheetByName(SHEET_NAMES.STORES)),
        users: getSheetData(ss.getSheetByName(SHEET_NAMES.USERS)),
        chartOfAccounts: getSheetData(ss.getSheetByName(SHEET_NAMES.COA)),
        transactions: getSheetData(ss.getSheetByName(SHEET_NAMES.TRANSACTIONS)),
        employees: getSheetData(ss.getSheetByName(SHEET_NAMES.EMPLOYEES)),
        payrollRuns: getSheetData(ss.getSheetByName(SHEET_NAMES.PAYROLL)),
        budgets: getSheetData(ss.getSheetByName(SHEET_NAMES.BUDGETS)),
        companyProfile: getSheetData(ss.getSheetByName(SHEET_NAMES.COMPANY))[0] || null,
        employeeLoans: getSheetData(ss.getSheetByName(SHEET_NAMES.EMPLOYEE_LOANS)),
        supplierDebts: getSheetData(ss.getSheetByName(SHEET_NAMES.SUPPLIER_DEBTS)),
        purchaseOrders: getSheetData(ss.getSheetByName(SHEET_NAMES.PURCHASE_ORDERS)),
      };

      return createJsonResponse({
        status: 'success',
        data: data,
        timestamp: new Date().toISOString(),
      });
    }

    return createJsonResponse({ status: 'error', message: 'Aksi GET tidak dikenali' });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

// POST Endpoint
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const payload = postData.payload;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    checkAndInitSheets(ss);

    // 1. Inisialisasi struktur sheet
    if (action === 'initSheets') {
      checkAndInitSheets(ss, true);
      return createJsonResponse({ status: 'success', message: 'Semua 6 Sheet berhasil disiapkan!' });
    }

    // 1b. Simpan & Hapus Toko (Stores)
    if (action === 'saveStore') {
      const sheet = ss.getSheetByName(SHEET_NAMES.STORES);
      upsertRow(sheet, 'Store_ID', payload);
      return createJsonResponse({ status: 'success', message: 'Data toko berhasil disimpan' });
    }

    if (action === 'deleteStore') {
      const sheet = ss.getSheetByName(SHEET_NAMES.STORES);
      deleteRowById(sheet, 'Store_ID', payload.Store_ID);
      return createJsonResponse({ status: 'success', message: 'Data toko berhasil dihapus' });
    }

    // 1c. Simpan & Hapus Bagan Akun (COA)
    if (action === 'saveCoa') {
      const sheet = ss.getSheetByName(SHEET_NAMES.COA);
      upsertRow(sheet, 'Account_Code', payload);
      return createJsonResponse({ status: 'success', message: 'Data akun berhasil disimpan' });
    }

    if (action === 'deleteCoa') {
      const sheet = ss.getSheetByName(SHEET_NAMES.COA);
      deleteRowById(sheet, 'Account_Code', payload.Account_Code);
      return createJsonResponse({ status: 'success', message: 'Data akun berhasil dihapus' });
    }

    // 1d. Simpan & Hapus Pengguna (Users & Roles)
    if (action === 'saveUser') {
      const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
      upsertRow(sheet, 'User_ID', payload);
      return createJsonResponse({ status: 'success', message: 'Data pengguna berhasil disimpan' });
    }

    if (action === 'deleteUser') {
      const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
      deleteRowById(sheet, 'User_ID', payload.User_ID);
      return createJsonResponse({ status: 'success', message: 'Data pengguna berhasil dihapus' });
    }

    // 2. Simpan Transaksi Keuangan
    if (action === 'saveTransaction') {
      const sheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
      upsertRow(sheet, 'Transaction_ID', payload);
      return createJsonResponse({ status: 'success', message: 'Transaksi berhasil disimpan' });
    }

    // 3. Hapus Transaksi
    if (action === 'deleteTransaction') {
      const sheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
      deleteRowById(sheet, 'Transaction_ID', payload.Transaction_ID);
      return createJsonResponse({ status: 'success', message: 'Transaksi berhasil dihapus' });
    }

    // 4. Simpan Karyawan
    if (action === 'saveEmployee') {
      const sheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEES);
      upsertRow(sheet, 'Employee_ID', payload);
      return createJsonResponse({ status: 'success', message: 'Data karyawan berhasil disimpan' });
    }

    // 5. Simpan Payroll Run
    if (action === 'savePayrollRun') {
      const sheet = ss.getSheetByName(SHEET_NAMES.PAYROLL);
      upsertRow(sheet, 'Payroll_ID', payload);
      return createJsonResponse({ status: 'success', message: 'Data Payroll berhasil disimpan' });
    }

    // 6. Approval & Bayar Payroll (Otomatis catat pengeluaran di Transactions)
    if (action === 'approvePayroll') {
      const payrollSheet = ss.getSheetByName(SHEET_NAMES.PAYROLL);
      const trxSheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
      
      // Update payroll row
      upsertRow(payrollSheet, 'Payroll_ID', payload.payrollRun);

      // Catat transaksi pengeluaran gaji otomatis jika status Paid/Approved
      if (payload.createExpenseTransaction && payload.transaction) {
        upsertRow(trxSheet, 'Transaction_ID', payload.transaction);
      }

      return createJsonResponse({
        status: 'success',
        message: 'Payroll disetujui & transaksi pengeluaran otomatis dicatat di Google Sheets',
      });
    }

    // 6b. Simpan & Hapus Target Omset & Pagu Anggaran
    if (action === 'saveBudget') {
      const sheet = ss.getSheetByName(SHEET_NAMES.BUDGETS);
      const budgetRow = {
        Budget_ID: payload.Budget_ID,
        Store_ID: payload.Store_ID,
        Period_Month: payload.Period_Month,
        Period_Year: payload.Period_Year,
        Revenue_Target: payload.Revenue_Target,
        Total_Expense_Budget: payload.Total_Expense_Budget,
        Category_Budgets_JSON: JSON.stringify(payload.Category_Budgets || {}),
        Notes: payload.Notes || '',
        Updated_At: payload.Updated_At || new Date().toISOString(),
      };
      upsertRow(sheet, 'Budget_ID', budgetRow);
      return createJsonResponse({ status: 'success', message: 'Target omset & anggaran berhasil disimpan' });
    }

    if (action === 'deleteBudget') {
      const sheet = ss.getSheetByName(SHEET_NAMES.BUDGETS);
      deleteRowById(sheet, 'Budget_ID', payload.Budget_ID);
      return createJsonResponse({ status: 'success', message: 'Target omset & anggaran berhasil dihapus' });
    }

    // 6c. Simpan Profil Perusahaan
    if (action === 'saveCompanyProfile') {
      const sheet = ss.getSheetByName(SHEET_NAMES.COMPANY);
      setSheetData(sheet, [payload]);
      return createJsonResponse({ status: 'success', message: 'Profil perusahaan berhasil disimpan' });
    }

    // 6d. Pinjaman Karyawan
    if (action === 'saveEmployeeLoan') {
      const sheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEE_LOANS);
      upsertRow(sheet, 'Loan_ID', payload);
      return createJsonResponse({ status: 'success', message: 'Pinjaman karyawan berhasil disimpan' });
    }

    if (action === 'deleteEmployeeLoan') {
      const sheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEE_LOANS);
      deleteRowById(sheet, 'Loan_ID', payload.Loan_ID);
      return createJsonResponse({ status: 'success', message: 'Pinjaman karyawan berhasil dihapus' });
    }

    // 6e. Hutang Supplier
    if (action === 'saveSupplierDebt') {
      const sheet = ss.getSheetByName(SHEET_NAMES.SUPPLIER_DEBTS);
      upsertRow(sheet, 'Debt_ID', payload);
      return createJsonResponse({ status: 'success', message: 'Tagihan hutang supplier berhasil disimpan' });
    }

    if (action === 'deleteSupplierDebt') {
      const sheet = ss.getSheetByName(SHEET_NAMES.SUPPLIER_DEBTS);
      deleteRowById(sheet, 'Debt_ID', payload.Debt_ID);
      return createJsonResponse({ status: 'success', message: 'Tagihan hutang supplier berhasil dihapus' });
    }

    // 6f. Purchase Order
    if (action === 'savePurchaseOrder') {
      const sheet = ss.getSheetByName(SHEET_NAMES.PURCHASE_ORDERS);
      const poRow = {
        ...payload,
        Items_JSON: JSON.stringify(payload.Items || []),
      };
      upsertRow(sheet, 'PO_ID', poRow);
      return createJsonResponse({ status: 'success', message: 'Purchase Order berhasil disimpan' });
    }

    if (action === 'deletePurchaseOrder') {
      const sheet = ss.getSheetByName(SHEET_NAMES.PURCHASE_ORDERS);
      deleteRowById(sheet, 'PO_ID', payload.PO_ID);
      return createJsonResponse({ status: 'success', message: 'Purchase Order berhasil dihapus' });
    }

    // 7. Bulk Sync All Data
    if (action === 'syncAll') {
      if (payload.stores) setSheetData(ss.getSheetByName(SHEET_NAMES.STORES), payload.stores);
      if (payload.users) setSheetData(ss.getSheetByName(SHEET_NAMES.USERS), payload.users);
      if (payload.chartOfAccounts) setSheetData(ss.getSheetByName(SHEET_NAMES.COA), payload.chartOfAccounts);
      if (payload.transactions) setSheetData(ss.getSheetByName(SHEET_NAMES.TRANSACTIONS), payload.transactions);
      if (payload.employees) setSheetData(ss.getSheetByName(SHEET_NAMES.EMPLOYEES), payload.employees);
      if (payload.payrollRuns) setSheetData(ss.getSheetByName(SHEET_NAMES.PAYROLL), payload.payrollRuns);
      if (payload.budgets) setSheetData(ss.getSheetByName(SHEET_NAMES.BUDGETS), payload.budgets);
      if (payload.companyProfile) setSheetData(ss.getSheetByName(SHEET_NAMES.COMPANY), [payload.companyProfile]);
      if (payload.employeeLoans) setSheetData(ss.getSheetByName(SHEET_NAMES.EMPLOYEE_LOANS), payload.employeeLoans);
      if (payload.supplierDebts) setSheetData(ss.getSheetByName(SHEET_NAMES.SUPPLIER_DEBTS), payload.supplierDebts);
      if (payload.purchaseOrders) {
        const poRows = payload.purchaseOrders.map(po => ({
          ...po,
          Items_JSON: JSON.stringify(po.Items || []),
        }));
        setSheetData(ss.getSheetByName(SHEET_NAMES.PURCHASE_ORDERS), poRows);
      }

      return createJsonResponse({ status: 'success', message: 'Seluruh data berhasil disinkronisasi ke Google Sheets!' });
    }

    // 8. Upload File / Bukti Pembayaran ke Google Drive
    if (action === 'uploadProof') {
      const base64Data = payload.base64Data;
      const fileName = payload.fileName || ('bukti_' + new Date().getTime() + '.png');
      const contentType = payload.contentType || 'image/png';
      
      const folderName = 'Nusantara_Finance_Receipts';
      let folder;
      const folders = DriveApp.getFoldersByName(folderName);
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder(folderName);
      }

      const decoded = Utilities.base64Decode(base64Data.split(',')[1] || base64Data);
      const blob = Utilities.newBlob(decoded, contentType, fileName);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const fileUrl = 'https://drive.google.com/uc?export=view&id=' + file.getId();

      return createJsonResponse({
        status: 'success',
        fileUrl: fileUrl,
        fileId: file.getId(),
      });
    }

    return createJsonResponse({ status: 'error', message: 'Aksi POST tidak dikenali' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

// Helper: Inisialisasi sheet & header jika belum ada
function checkAndInitSheets(ss, force = false) {
  const schemas = {
    [SHEET_NAMES.STORES]: ['Store_ID', 'Store_Name', 'Address', 'Phone', 'Manager_Name', 'Status'],
    [SHEET_NAMES.USERS]: ['User_ID', 'Store_ID', 'Full_Name', 'Email', 'Role', 'Status'],
    [SHEET_NAMES.COA]: ['Account_Code', 'Account_Name', 'Category'],
    [SHEET_NAMES.TRANSACTIONS]: ['Transaction_ID', 'Date', 'Store_ID', 'Type', 'Category', 'Amount', 'Payment_Method', 'Description', 'Proof_Attachment_URL', 'Created_By', 'Status', 'Destination_Store_ID'],
    [SHEET_NAMES.EMPLOYEES]: ['Employee_ID', 'Store_ID', 'Full_Name', 'Position', 'Base_Salary', 'Allowance_Fixed', 'Bank_Name', 'Account_Number', 'Status', 'Join_Date'],
    [SHEET_NAMES.PAYROLL]: ['Payroll_ID', 'Period_Month', 'Period_Year', 'Store_ID', 'Employee_ID', 'Base_Salary', 'Total_Allowances', 'Total_Deductions', 'Net_Salary', 'Payment_Status', 'Payment_Date', 'Payslip_URL', 'Notes'],
    [SHEET_NAMES.BUDGETS]: ['Budget_ID', 'Store_ID', 'Period_Month', 'Period_Year', 'Revenue_Target', 'Total_Expense_Budget', 'Category_Budgets_JSON', 'Notes', 'Updated_At'],
    [SHEET_NAMES.COMPANY]: ['companyName', 'brandName', 'tagline', 'legalAddress', 'city', 'province', 'postalCode', 'phone', 'email', 'website', 'taxNumber', 'logoUrl', 'logoPreset', 'financeDirectorName', 'financeDirectorTitle', 'currencySymbol', 'updatedAt'],
    [SHEET_NAMES.EMPLOYEE_LOANS]: ['Loan_ID', 'Employee_ID', 'Employee_Name', 'Store_ID', 'Total_Amount', 'Tenor_Months', 'Monthly_Installment', 'Paid_Amount', 'Remaining_Balance', 'Start_Date', 'Purpose', 'Status', 'Notes', 'Created_At'],
    [SHEET_NAMES.SUPPLIER_DEBTS]: ['Debt_ID', 'Supplier_Name', 'Invoice_Number', 'Store_ID', 'Total_Amount', 'Paid_Amount', 'Remaining_Balance', 'Invoice_Date', 'Due_Date', 'Status', 'Description', 'Purchase_Order_ID', 'Created_At'],
    [SHEET_NAMES.PURCHASE_ORDERS]: ['PO_ID', 'PO_Number', 'Store_ID', 'Supplier_Name', 'Order_Date', 'Expected_Date', 'Subtotal', 'Tax_Amount', 'Grand_Total', 'Status', 'Payment_Term', 'Notes', 'Created_By', 'Linked_Debt_ID', 'Items_JSON', 'Created_At'],
  };

  for (const [name, headers] of Object.entries(schemas)) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(headers);
      styleHeaderRow(sheet, headers.length);
    } else if (force || sheet.getLastRow() === 0) {
      sheet.clear();
      sheet.appendRow(headers);
      styleHeaderRow(sheet, headers.length);
    }
  }
}

function styleHeaderRow(sheet, cols) {
  const range = sheet.getRange(1, 1, 1, cols);
  range.setBackground('#1e293b');
  range.setFontColor('#ffffff');
  range.setFontWeight('bold');
  range.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

// Helper: Ambil data dari sheet menjadi array of object
function getSheetData(sheet) {
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return [];

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  return rows.map(row => {
    const obj = {};
    headers.forEach((h, idx) => {
      let val = row[idx];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      obj[h] = val;
    });
    return obj;
  });
}

// Helper: Upsert row berdasarkan Key (misal Transaction_ID)
function upsertRow(sheet, keyName, dataObj) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const keyValue = dataObj[keyName];

  let targetRowIndex = -1;
  if (lastRow > 1) {
    const keyColIndex = headers.indexOf(keyName);
    if (keyColIndex !== -1) {
      const keyColumnValues = sheet.getRange(2, keyColIndex + 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < keyColumnValues.length; i++) {
        if (String(keyColumnValues[i][0]) === String(keyValue)) {
          targetRowIndex = i + 2;
          break;
        }
      }
    }
  }

  const rowValues = headers.map(h => (dataObj[h] !== undefined ? dataObj[h] : ''));

  if (targetRowIndex > 0) {
    sheet.getRange(targetRowIndex, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

// Helper: Hapus baris berdasarkan Key ID
function deleteRowById(sheet, keyName, keyValue) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const keyColIndex = headers.indexOf(keyName);

  if (keyColIndex === -1 || lastRow <= 1) return;

  const keyColumnValues = sheet.getRange(2, keyColIndex + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < keyColumnValues.length; i++) {
    if (String(keyColumnValues[i][0]) === String(keyValue)) {
      sheet.deleteRow(i + 2);
      break;
    }
  }
}

// Helper: Set full sheet data
function setSheetData(sheet, dataList) {
  if (!sheet || !dataList) return;
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // Bersihkan baris data lama (pertahankan baris 1 header)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }

  if (dataList.length === 0) return;

  const rows = dataList.map(item => {
    return headers.map(h => (item[h] !== undefined ? item[h] : ''));
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}
`;
