import { Download, ExternalLink, X } from 'lucide-react';
import React from 'react';

interface ProofPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  description?: string;
}

export const ProofPreviewModal: React.FC<ProofPreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Bukti Transaksi',
  description,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {imageUrl.startsWith('http') && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                title="Buka di tab baru"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <a
              href={imageUrl}
              download="bukti_transaksi"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              title="Unduh gambar"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Image Preview Content */}
        <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100 p-4 dark:bg-slate-950 min-h-[300px]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              referrerPolicy="no-referrer"
              className="max-h-[65vh] w-auto max-w-full rounded-md object-contain shadow-xs"
            />
          ) : (
            <div className="text-center text-sm text-slate-400">Tidak ada lampiran gambar</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 px-5 py-3 dark:border-slate-800">
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
