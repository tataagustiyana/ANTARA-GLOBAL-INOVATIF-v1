import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit2,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Package,
  PackageCheck,
  Plus,
  Printer,
  Receipt,
  Search,
  ShoppingCart,
  Store as StoreIcon,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { StorageService } from '../services/storageService';
import { CompanyProfile, PurchaseOrder, PurchaseOrderItem, Store, SupplierDebt, User } from '../types';
import { formatDate, formatRupiah, getTodayString } from '../utils/formatters';

interface PurchaseOrdersViewProps {
  stores: Store[];
  activeStoreId: string;
  purchaseOrders: PurchaseOrder[];
  currentUser: User;
  companyProfile?: CompanyProfile;
  onSavePO: (po: PurchaseOrder) => Promise<void>;
  onDeletePO: (poId: string) => Promise<void>;
  onConvertToDebt?: (debt: SupplierDebt) => Promise<void>;
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({
  stores,
  activeStoreId,
  purchaseOrders,
  currentUser,
  companyProfile,
  onSavePO,
  onDeletePO,
  onConvertToDebt,
}) => {
  const isEmployee = currentUser.Role === 'Employee';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStoreId, setFilterStoreId] = useState(activeStoreId);
  const [filterStatus, setFilterStatus] = useState<
    'ALL' | 'Draft' | 'Approved' | 'Ordered' | 'Received' | 'Cancelled'
  >('ALL');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [previewPO, setPreviewPO] = useState<PurchaseOrder | null>(null);

  // Form states
  const [formPoNumber, setFormPoNumber] = useState('');
  const [formStoreId, setFormStoreId] = useState(
    activeStoreId === 'ALL' ? (stores[0]?.Store_ID || 'STR-001') : activeStoreId
  );
  const [formSupplierName, setFormSupplierName] = useState('');
  const [formOrderDate, setFormOrderDate] = useState(getTodayString());
  const [formExpectedDate, setFormExpectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [formPaymentTerm, setFormPaymentTerm] = useState('Tempo 14 Hari');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<PurchaseOrderItem[]>([
    {
      id: 'item-1',
      item_name: 'Pomade Matte Clay 100gr',
      quantity: 20,
      unit: 'Pcs',
      unit_price: 35000,
      total_price: 700000,
    },
  ]);

  // Synchronize store filter
  React.useEffect(() => {
    setFilterStoreId(activeStoreId);
  }, [activeStoreId]);

  // Filtered POs
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (filterStoreId !== 'ALL' && po.Store_ID !== filterStoreId) {
        return false;
      }

      if (filterStatus !== 'ALL' && po.Status !== filterStatus) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = po.PO_Number.toLowerCase().includes(q);
        const matchSupplier = po.Supplier_Name.toLowerCase().includes(q);
        const matchItem = po.Items.some((i) => i.item_name.toLowerCase().includes(q));
        if (!matchNo && !matchSupplier && !matchItem) return false;
      }

      return true;
    });
  }, [purchaseOrders, filterStoreId, filterStatus, searchQuery]);

  // Aggregate metrics
  const totalPlannedSpending = useMemo(() => {
    return filteredPOs.reduce((sum, po) => sum + po.Grand_Total, 0);
  }, [filteredPOs]);

  const draftCount = useMemo(() => {
    return filteredPOs.filter((po) => po.Status === 'Draft' || po.Status === 'Approved').length;
  }, [filteredPOs]);

  const orderedCount = useMemo(() => {
    return filteredPOs.filter((po) => po.Status === 'Ordered').length;
  }, [filteredPOs]);

  const receivedCount = useMemo(() => {
    return filteredPOs.filter((po) => po.Status === 'Received').length;
  }, [filteredPOs]);

  // Calculate current form subtotal
  const formSubtotal = useMemo(() => {
    return formItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
  }, [formItems]);

  // Add Item Line
  const handleAddItemLine = () => {
    setFormItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        item_name: '',
        quantity: 1,
        unit: 'Pcs',
        unit_price: 0,
        total_price: 0,
      },
    ]);
  };

  // Update Item Line
  const handleUpdateItemLine = (
    id: string,
    field: keyof PurchaseOrderItem,
    value: string | number
  ) => {
    setFormItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          const qty = field === 'quantity' ? Number(value) : item.quantity;
          const price = field === 'unit_price' ? Number(value) : item.unit_price;
          updated.total_price = Math.round(qty * price);
        }
        return updated;
      })
    );
  };

  // Remove Item Line
  const handleRemoveItemLine = (id: string) => {
    if (formItems.length <= 1) {
      alert('Purchase Order harus memiliki minimal 1 item barang.');
      return;
    }
    setFormItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    const nextSeq = purchaseOrders.length + 1;
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    setEditingPO(null);
    setFormPoNumber(`PO/NR/${yearMonth}/${String(nextSeq).padStart(3, '0')}`);
    setFormStoreId(activeStoreId === 'ALL' ? (stores[0]?.Store_ID || 'STR-001') : activeStoreId);
    setFormSupplierName('CV Sumber Pomade & Grooming Nusantara');
    setFormOrderDate(getTodayString());
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setFormExpectedDate(d.toISOString().split('T')[0]);
    setFormPaymentTerm('Tempo 14 Hari');
    setFormNotes('Pengiriman langsung ke outlet. Hubungi store manager sebelum kirim.');
    setFormItems([
      {
        id: 'item-1',
        item_name: 'Pomade Matte Clay Hold 100gr',
        quantity: 25,
        unit: 'Pcs',
        unit_price: 35000,
        total_price: 875000,
      },
      {
        id: 'item-2',
        item_name: 'Hair Tonic Menthol 250ml',
        quantity: 12,
        unit: 'Botol',
        unit_price: 27500,
        total_price: 330000,
      },
    ]);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (po: PurchaseOrder) => {
    setEditingPO(po);
    setFormPoNumber(po.PO_Number);
    setFormStoreId(po.Store_ID);
    setFormSupplierName(po.Supplier_Name);
    setFormOrderDate(po.Order_Date);
    setFormExpectedDate(po.Expected_Date);
    setFormPaymentTerm(po.Payment_Term || 'Tempo 14 Hari');
    setFormNotes(po.Notes || '');
    setFormItems(po.Items && po.Items.length > 0 ? [...po.Items] : []);
    setIsFormModalOpen(true);
  };

  // Submit PO (Add / Edit)
  const handleSubmitPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formItems.length === 0) return;

    const grandTotal = formSubtotal;

    if (editingPO) {
      const updated: PurchaseOrder = {
        ...editingPO,
        PO_Number: formPoNumber,
        Store_ID: formStoreId,
        Supplier_Name: formSupplierName,
        Order_Date: formOrderDate,
        Expected_Date: formExpectedDate,
        Items: formItems,
        Subtotal: grandTotal,
        Grand_Total: grandTotal,
        Payment_Term: formPaymentTerm,
        Notes: formNotes,
      };
      await onSavePO(updated);
      setIsFormModalOpen(false);
      setEditingPO(null);
    } else {
      const newPO: PurchaseOrder = {
        PO_ID: `PO-${Date.now().toString().slice(-6)}`,
        PO_Number: formPoNumber,
        Store_ID: formStoreId,
        Supplier_Name: formSupplierName,
        Order_Date: formOrderDate,
        Expected_Date: formExpectedDate,
        Items: formItems,
        Subtotal: grandTotal,
        Grand_Total: grandTotal,
        Status: 'Draft',
        Payment_Term: formPaymentTerm,
        Notes: formNotes,
        Created_By: currentUser.Full_Name,
        Created_At: getTodayString(),
      };
      await onSavePO(newPO);
      setIsFormModalOpen(false);
    }
  };

  // Change PO Status Quick
  const handleUpdateStatus = async (po: PurchaseOrder, newStatus: PurchaseOrder['Status']) => {
    const updated: PurchaseOrder = {
      ...po,
      Status: newStatus,
    };
    await onSavePO(updated);

    // If marked as Received and not yet converted to debt, suggest converting to Hutang Supplier
    if (newStatus === 'Received' && onConvertToDebt && !po.Linked_Debt_ID) {
      if (
        confirm(
          `Barang PO ${po.PO_Number} telah diterima. Apakah Anda ingin mencatat tagihan ini otomatis ke menu 'Hutang ke Supplier' (Accounts Payable)?`
        )
      ) {
        const newDebtId = `DEBT-${Date.now().toString().slice(-6)}`;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);

        const newDebt: SupplierDebt = {
          Debt_ID: newDebtId,
          Supplier_Name: po.Supplier_Name,
          Invoice_Number: `INV-${po.PO_Number.replace(/\//g, '-')}`,
          Store_ID: po.Store_ID,
          Total_Amount: po.Grand_Total,
          Paid_Amount: 0,
          Remaining_Balance: po.Grand_Total,
          Invoice_Date: getTodayString(),
          Due_Date: dueDate.toISOString().split('T')[0],
          Status: 'Unpaid',
          Description: `Pembelian barang PO ${po.PO_Number} (${po.Items.map((i) => i.item_name).join(', ')})`,
          Purchase_Order_ID: po.PO_ID,
          Payments: [],
          Created_At: getTodayString(),
        };

        await onConvertToDebt(newDebt);
        // Link debt to PO
        await onSavePO({ ...updated, Linked_Debt_ID: newDebtId });
      }
    }
  };

  const handleExportExcel = () => {
    const headers = [
      'ID PO',
      'Nomor PO',
      'ID Toko',
      'Nama Supplier',
      'Tanggal Order',
      'Estimasi Pengiriman',
      'Total Item',
      'Subtotal (Rp)',
      'PPN (Rp)',
      'Grand Total (Rp)',
      'Status Approval',
      'Metode Pembayaran',
      'Catatan',
    ];
    const rows = filteredPOs.map((po) => [
      po.PO_ID,
      po.PO_Number,
      po.Store_ID,
      po.Supplier_Name,
      po.Order_Date,
      po.Expected_Date || '-',
      po.Items.length,
      po.Subtotal,
      po.Tax_Amount || 0,
      po.Grand_Total,
      po.Status,
      po.Payment_Term || '-',
      po.Notes || '-',
    ]);
    StorageService.exportToExcel(`Purchase_Orders_${activeStoreId}`, headers, rows, 'Purchase Orders');
  };

  return (
    <div className="space-y-6">
      {/* Title & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>Perencanaan Pembelanjaan (Purchase Order)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Rencanakan dan ajukan pengadaan barang, restock pomade & perlengkapan barbershop dengan approval bertahap
          </p>
        </div>

        {!isEmployee && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 shadow-2xs transition-colors cursor-pointer"
              title="Ekspor daftar purchase order ke format Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Purchase Order Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Rencana Belanja (PO)
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatRupiah(totalPlannedSpending)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">{filteredPOs.length} Dokumen PO</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Draft & Menunggu Approval
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {draftCount} <span className="text-xs font-normal text-slate-400">PO</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Perlu persetujuan manajemen</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Sedang Dipesan ke Supplier
            </span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-purple-600 dark:text-purple-400">
            {orderedCount} <span className="text-xs font-normal text-slate-400">PO</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Menunggu pengiriman supplier</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Selesai & Diterima di Toko
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <PackageCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {receivedCount} <span className="text-xs font-normal text-slate-400">PO</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-600">Barang siap digunakan/dijual</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari no PO / supplier / nama barang..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {!isEmployee && (
            <div className="flex items-center gap-1.5">
              <StoreIcon className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={filterStoreId}
                onChange={(e) => setFilterStoreId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="ALL">Semua Cabang Toko</option>
                {stores.map((s) => (
                  <option key={s.Store_ID} value={s.Store_ID}>
                    {s.Store_Name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">Semua Status PO</option>
              <option value="Draft">Draft</option>
              <option value="Approved">Disetujui (Approved)</option>
              <option value="Ordered">Dipesan (Ordered)</option>
              <option value="Received">Diterima (Received)</option>
              <option value="Cancelled">Dibatalkan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">No. PO & Tanggal</th>
                <th className="px-4 py-3">Supplier Vendor</th>
                <th className="px-4 py-3">Cabang Outlet</th>
                <th className="px-4 py-3">Daftar Item Barang</th>
                <th className="px-4 py-3 text-right">Grand Total</th>
                <th className="px-4 py-3">Estimasi Kirim</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <ShoppingCart className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-slate-600 dark:text-slate-300">
                      Tidak ada dokumen Purchase Order
                    </p>
                    <p className="text-[11px] mt-0.5">
                      Gunakan tombol "Buat Purchase Order Baru" untuk merencanakan pengadaan barang.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => {
                  const store = stores.find((s) => s.Store_ID === po.Store_ID);
                  const itemCount = po.Items.reduce((acc, i) => acc + (i.quantity || 0), 0);

                  return (
                    <tr
                      key={po.PO_ID}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white font-mono">
                          {po.PO_Number}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Tgl Order: {formatDate(po.Order_Date)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {po.Supplier_Name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Termin: {po.Payment_Term || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <StoreIcon className="h-3 w-3 text-slate-400" />
                          <span>{store?.Store_Name || po.Store_ID}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {po.Items.length} jenis item ({itemCount} total unit)
                        </div>
                        <div className="truncate text-[11px] text-slate-400 mt-0.5">
                          {po.Items.map((i) => `${i.item_name} (${i.quantity} ${i.unit})`).join(', ')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatRupiah(po.Grand_Total)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-slate-800 dark:text-slate-200">
                          {formatDate(po.Expected_Date)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {po.Status === 'Draft' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Draft
                          </span>
                        ) : po.Status === 'Approved' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                            Disetujui
                          </span>
                        ) : po.Status === 'Ordered' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-200 dark:border-purple-900">
                            <Truck className="h-3 w-3" />
                            <span>Dipesan</span>
                          </span>
                        ) : po.Status === 'Received' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Diterima</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                            Batal
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                        {/* Status Transition dropdown or quick button */}
                        {!isEmployee && (
                          <>
                            {po.Status === 'Draft' && (
                              <button
                                onClick={() => handleUpdateStatus(po, 'Approved')}
                                title="Setujui PO ini"
                                className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300"
                              >
                                Setujui
                              </button>
                            )}
                            {po.Status === 'Approved' && (
                              <button
                                onClick={() => handleUpdateStatus(po, 'Ordered')}
                                title="Tandai Sudah Dipesan ke Supplier"
                                className="rounded-lg bg-purple-50 px-2 py-1 text-[11px] font-medium text-purple-700 hover:bg-purple-100 dark:bg-purple-950/50 dark:text-purple-300"
                              >
                                Pesan
                              </button>
                            )}
                            {po.Status === 'Ordered' && (
                              <button
                                onClick={() => handleUpdateStatus(po, 'Received')}
                                title="Tandai Barang Telah Diterima di Toko"
                                className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 shadow-xs"
                              >
                                Terima Barang
                              </button>
                            )}
                          </>
                        )}

                        <button
                          onClick={() => setPreviewPO(po)}
                          title="Pratinjau Lembar PO & Cetak"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>

                        {!isEmployee && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(po)}
                              title="Edit PO"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Hapus Purchase Order ${po.PO_Number}?`)) {
                                  onDeletePO(po.PO_ID);
                                }
                              }}
                              title="Hapus PO"
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: BUAT / EDIT PURCHASE ORDER */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl my-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-600" />
                <span>
                  {editingPO ? `Edit Purchase Order (${editingPO.PO_Number})` : 'Buat Purchase Order Baru'}
                </span>
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPO} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Nomor PO <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formPoNumber}
                    onChange={(e) => setFormPoNumber(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Cabang Outlet Tujuan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formStoreId}
                    onChange={(e) => setFormStoreId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
                  >
                    {stores.map((s) => (
                      <option key={s.Store_ID} value={s.Store_ID}>
                        {s.Store_Name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Termin Pembayaran
                  </label>
                  <select
                    value={formPaymentTerm}
                    onChange={(e) => setFormPaymentTerm(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                    <option value="Tempo 14 Hari">Tempo 14 Hari</option>
                    <option value="Tempo 30 Hari">Tempo 30 Hari</option>
                    <option value="Transfer Dimuka (DP 50%)">Transfer Dimuka (DP 50%)</option>
                    <option value="Lunas Transfer Bank">Lunas Transfer Bank</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Nama Supplier / Vendor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formSupplierName}
                    onChange={(e) => setFormSupplierName(e.target.value)}
                    placeholder="Nama vendor..."
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Tanggal Order PO
                  </label>
                  <input
                    type="date"
                    value={formOrderDate}
                    onChange={(e) => setFormOrderDate(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Target Tanggal Kedatangan
                  </label>
                  <input
                    type="date"
                    value={formExpectedDate}
                    onChange={(e) => setFormExpectedDate(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Dynamic Items Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    Daftar Rincian Item Barang Pembelanjaan:
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemLine}
                    className="flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Baris Barang</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-[10px] uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Nama Barang</th>
                        <th className="px-2 py-2 w-20 text-center">Qty</th>
                        <th className="px-2 py-2 w-24">Satuan</th>
                        <th className="px-3 py-2 w-32 text-right">Harga Satuan (Rp)</th>
                        <th className="px-3 py-2 w-32 text-right">Subtotal (Rp)</th>
                        <th className="px-2 py-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {formItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.item_name}
                              onChange={(e) =>
                                handleUpdateItemLine(item.id, 'item_name', e.target.value)
                              }
                              placeholder="Nama barang / produk..."
                              required
                              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItemLine(item.id, 'quantity', e.target.value)
                              }
                              required
                              className="w-full text-center rounded border border-slate-300 bg-white px-1 py-1 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) =>
                                handleUpdateItemLine(item.id, 'unit', e.target.value)
                              }
                              placeholder="Pcs / Botol"
                              required
                              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={item.unit_price}
                              onChange={(e) =>
                                handleUpdateItemLine(item.id, 'unit_price', e.target.value)
                              }
                              required
                              className="w-full text-right rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatRupiah(item.total_price)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemLine(item.id)}
                              className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Hapus Baris"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-800">
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">
                          Total Nilai Purchase Order:
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatRupiah(formSubtotal)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  Catatan / Instruksi Pengiriman Khusus
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Instruksi khusus kepada supplier..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700 shadow-xs"
                >
                  {editingPO ? 'Simpan Perubahan PO' : 'Buat Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRATINJAU DOKUMEN PURCHASE ORDER & CETAK */}
      {previewPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl my-8 rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 print:hidden">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-600" />
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  Dokumen Resmi Purchase Order
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Cetak / Cetak PDF</span>
                </button>
                <button
                  onClick={() => setPreviewPO(null)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="p-8 print:p-0 space-y-6 text-slate-900 dark:text-slate-100">
              {/* Header Kop */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 dark:border-slate-200">
                <div className="flex items-center gap-3">
                  {companyProfile?.logoUrl ? (
                    <div className="h-12 w-12 rounded-lg border border-slate-200 p-1 bg-white">
                      <img
                        src={companyProfile.logoUrl}
                        alt="Logo"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-emerald-600 text-white font-bold text-xl flex items-center justify-center">
                      {(companyProfile?.brandName || 'N').charAt(0)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      {companyProfile?.companyName || 'PT NUSANTARA RETAIL MANDIRI'}
                    </h2>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white">
                      PURCHASE ORDER (PO)
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {companyProfile?.legalAddress} · Telp: {companyProfile?.phone}
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    {previewPO.PO_Number}
                  </div>
                  <div className="text-slate-500">Tgl Order: {formatDate(previewPO.Order_Date)}</div>
                  <div className="text-slate-500">
                    Est. Pengiriman: {formatDate(previewPO.Expected_Date)}
                  </div>
                  <div className="mt-1 inline-block rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 text-[10px] uppercase border border-emerald-200">
                    Status: {previewPO.Status}
                  </div>
                </div>
              </div>

              {/* Vendor & Delivery info */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Kepada Vendor / Supplier:
                  </span>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                    {previewPO.Supplier_Name}
                  </div>
                  <div className="text-slate-500 mt-0.5">Termin: {previewPO.Payment_Term}</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Tujuan Pengiriman Barang:
                  </span>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                    {stores.find((s) => s.Store_ID === previewPO.Store_ID)?.Store_Name ||
                      previewPO.Store_ID}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    {stores.find((s) => s.Store_ID === previewPO.Store_ID)?.Address || '-'}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-800 dark:border-slate-300 font-bold uppercase text-[10px]">
                    <th className="py-2">No</th>
                    <th className="py-2">Nama Barang / Spesifikasi</th>
                    <th className="py-2 text-center">Jumlah Qty</th>
                    <th className="py-2 text-right">Harga Satuan</th>
                    <th className="py-2 text-right">Total Biaya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {previewPO.Items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="py-2.5 text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 font-medium text-slate-900 dark:text-white">
                        {item.item_name}
                      </td>
                      <td className="py-2.5 text-center font-mono">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2.5 text-right font-mono">
                        {formatRupiah(item.unit_price)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold">
                        {formatRupiah(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-800 dark:border-slate-300 font-bold text-sm">
                    <td colSpan={4} className="py-3 text-right">
                      GRAND TOTAL PEMBELIAN:
                    </td>
                    <td className="py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {formatRupiah(previewPO.Grand_Total)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {previewPO.Notes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-slate-600 dark:text-slate-300 text-[11px]">
                  <strong>Catatan Khusus:</strong> {previewPO.Notes}
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 text-center text-xs pt-8">
                <div>
                  <span className="text-slate-500">Dibuat Oleh (Purchasing):</span>
                  <div className="h-16"></div>
                  <div className="border-t border-slate-300 font-bold text-slate-800 dark:text-slate-200 pt-1">
                    {previewPO.Created_By}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Disetujui Oleh (Finance / Owner):</span>
                  <div className="h-16"></div>
                  <div className="border-t border-slate-300 font-bold text-slate-800 dark:text-slate-200 pt-1">
                    {companyProfile?.financeDirectorName || 'Direktur Keuangan'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end p-4 border-t border-slate-200 dark:border-slate-800 print:hidden">
              <button
                type="button"
                onClick={() => setPreviewPO(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
