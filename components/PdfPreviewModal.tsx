"use client";

type Props = {
  open: boolean;
  pdfUrl: string | null;
  fileName: string;
  loading: boolean;
  error: string;
  onClose: () => void;
  onDownload: () => void;
};

export default function PdfPreviewModal({
  open,
  pdfUrl,
  fileName,
  loading,
  error,
  onClose,
  onDownload,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-[#101827]/70 p-3 backdrop-blur-sm sm:p-5">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-[#e6e0d5] bg-[#fffdf8] shadow-[0_30px_100px_rgba(16,24,39,.35)]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#e6e0d5] bg-[#fffdf8] px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#b8955a]">
              Document Preview
            </p>

            <h2 className="lux-serif mt-1 truncate text-xl text-[#101827] sm:text-2xl">
              Payment Voucher
            </h2>

            <p className="mt-1 truncate text-xs text-slate-500">
              {fileName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#e6e0d5] text-xl text-slate-500 transition hover:border-[#b8955a] hover:bg-[#fbf7ee] hover:text-[#101827]"
            aria-label="Close PDF preview"
          >
            ×
          </button>
        </div>

        {/* PDF Area */}
        <div className="relative min-h-0 flex-1 bg-[#e9e7e2]">
          {loading && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-[#f4f2ed]">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#d8c29a] border-t-[#101827]" />

                <p className="mt-4 text-sm font-semibold text-[#101827]">
                  Generating PDF…
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Preparing your voucher preview
                </p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="flex h-full items-center justify-center px-5">
              <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-xl text-red-600">
                  !
                </div>

                <h3 className="mt-4 font-semibold text-red-900">
                  Unable to preview PDF
                </h3>

                <p className="mt-2 text-sm leading-6 text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={onClose}
                  className="mt-5 rounded-xl border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {!loading && !error && pdfUrl && (
            <iframe
              src={pdfUrl}
              title="Payment Voucher PDF Preview"
              className="h-full w-full border-0"
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-[#e6e0d5] bg-[#fffdf8] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-slate-500">
            Previewing the actual PDF that will be downloaded.
          </p>

          <div className="flex w-full gap-3 sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="lux-secondary flex-1 sm:flex-none"
            >
              Close
            </button>

            <button
              type="button"
              onClick={onDownload}
              disabled={loading || !pdfUrl || !!error}
              className="lux-primary flex-1 sm:flex-none"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}