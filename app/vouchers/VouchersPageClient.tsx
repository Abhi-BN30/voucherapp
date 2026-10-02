"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect";
import PdfPreviewModal from "@/components/PdfPreviewModal";
import { PAYEE_TYPES, PAYMENT_MODES } from "@/lib/voucher-options";

type User = {
  userId: number;
  username: string;
  name: string;
};

type Voucher = {
  voucher_id: number;
  voucher_date: string;
  payee: string;
  amount: string;
  amount_in_words: string;
  type_of_payee: string;
  custom_payee_type: string | null;
  mode_of_payment: string;
  towards: string;
  payee_pan: string | null;
  tds: string | null;
  created_by_name: string;
  created_by_username: string;
};

type Props = {
  user: User;
};

type SortKey =
  | "voucher_id"
  | "voucher_date"
  | "payee"
  | "type_of_payee"
  | "towards"
  | "amount"
  | "mode_of_payment"
  | "created_by_name";

type SortDirection = "asc" | "desc";

function formatDate(value: string) {
  const datePart = String(value || "").split("T")[0];

  const parts = datePart.split("-");

  return parts.length === 3
    ? `${parts[2]}-${parts[1]}-${parts[0]}`
    : "-";
}

function compareValues(
  a: Voucher,
  b: Voucher,
  key: SortKey
) {
  switch (key) {
    case "voucher_id":
      return (
        Number(a.voucher_id) -
        Number(b.voucher_id)
      );

    case "amount":
      return (
        Number(a.amount) -
        Number(b.amount)
      );

    case "voucher_date":
      return (
        String(a.voucher_date).localeCompare(
          String(b.voucher_date)
        )
      );

    case "type_of_payee":
      return String(
        a.type_of_payee === "Custom"
          ? a.custom_payee_type || "Custom"
          : a.type_of_payee
      ).localeCompare(
        String(
          b.type_of_payee === "Custom"
            ? b.custom_payee_type ||
                "Custom"
            : b.type_of_payee
        )
      );

    case "payee":
      return a.payee.localeCompare(
        b.payee,
        undefined,
        { sensitivity: "base" }
      );

    case "towards":
      return a.towards.localeCompare(
        b.towards,
        undefined,
        { sensitivity: "base" }
      );

    case "mode_of_payment":
      return a.mode_of_payment.localeCompare(
        b.mode_of_payment,
        undefined,
        { sensitivity: "base" }
      );

    case "created_by_name":
      return a.created_by_name.localeCompare(
        b.created_by_name,
        undefined,
        { sensitivity: "base" }
      );

    default:
      return 0;
  }
}

export default function VouchersPageClient({
  user,
}: Props) {
  const router = useRouter();

  const [vouchers, setVouchers] =
    useState<Voucher[]>([]);

  const [selected, setSelected] =
    useState<number[]>([]);

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("");
  const [mode, setMode] = useState("");

  const [sortKey, setSortKey] =
    useState<SortKey>("voucher_date");

  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");

  const [loading, setLoading] =
    useState(true);

  const [downloading, setDownloading] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [openActionId, setOpenActionId] =
    useState<number | null>(null);

  const [error, setError] =
    useState("");

  const [pdfPreviewOpen, setPdfPreviewOpen] =
    useState(false);

  const [pdfPreviewUrl, setPdfPreviewUrl] =
    useState<string | null>(null);

  const [pdfPreviewFileName, setPdfPreviewFileName] =
    useState("payment-vouchers.pdf");

  const [pdfPreviewLoading, setPdfPreviewLoading] =
    useState(false);

  const [pdfPreviewError, setPdfPreviewError] =
    useState("");

  async function loadVouchersWithFilters(
    s: string,
    f: string,
    t: string,
    ty: string,
    m: string
  ) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (s.trim()) {
        params.set("search", s.trim());
      }

      if (f) {
        params.set("from", f);
      }

      if (t) {
        params.set("to", t);
      }

      if (ty) {
        params.set("type", ty);
      }

      if (m) {
        params.set("mode", m);
      }

      const response = await fetch(
        params.toString()
          ? `/api/vouchers?${params}`
          : "/api/vouchers"
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.error ||
            data?.message ||
            "Unable to load vouchers."
        );

        return [];
      }

      const rows = data.vouchers || [];

      setVouchers(rows);
      setSelected([]);

      return rows;
    } catch {
      setError(
        "Unable to connect to the server."
      );

      return [];
    } finally {
      setLoading(false);
    }
  }

  async function loadVouchers() {
    await loadVouchersWithFilters(
      search,
      from,
      to,
      type,
      mode
    );
  }

  useEffect(() => {
    loadVouchersWithFilters(
      "",
      "",
      "",
      "",
      ""
    );
  }, []);

  /*
   * Stable client-side sorting.
   *
   * The API already gives us a deterministic
   * default order. Clicking a column header
   * changes the local ordering without another
   * database request.
   */
  const sortedVouchers = useMemo(() => {
    const rows = [...vouchers];

    rows.sort((a, b) => {
      const result = compareValues(
        a,
        b,
        sortKey
      );

      if (result !== 0) {
        return sortDirection === "asc"
          ? result
          : -result;
      }

      /*
       * Stable tie-breaker.
       */
      return (
        Number(b.voucher_id) -
        Number(a.voucher_id)
      );
    });

    return rows;
  }, [
    vouchers,
    sortKey,
    sortDirection,
  ]);

  function sortBy(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) =>
        current === "asc"
          ? "desc"
          : "asc"
      );
    } else {
      setSortKey(key);

      /*
       * Text columns start ascending.
       * Numeric/date columns start descending
       * so the newest/highest values are useful
       * immediately.
       */
      if (
        key === "voucher_date" ||
        key === "voucher_id" ||
        key === "amount"
      ) {
        setSortDirection("desc");
      } else {
        setSortDirection("asc");
      }
    }
  }

  function SortButton({
    label,
    column,
  }: {
    label: string;
    column: SortKey;
  }) {
    const active = sortKey === column;

    return (
      <button
        type="button"
        onClick={() => sortBy(column)}
        className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 transition hover:text-[#101827]"
      >
        <span>{label}</span>

        <span
          className={`text-[11px] ${
            active
              ? "text-[#b8955a]"
              : "text-slate-300 group-hover:text-[#b8955a]"
          }`}
        >
          {active
            ? sortDirection === "asc"
              ? "↑"
              : "↓"
            : "↕"}
        </span>
      </button>
    );
  }

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter(
            (value) => value !== id
          )
        : [...current, id]
    );
  }

  function toggleAll() {
    const visibleIds =
      sortedVouchers.map(
        (voucher) => voucher.voucher_id
      );

    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) =>
        selected.includes(id)
      );

    if (allSelected) {
      setSelected((current) =>
        current.filter(
          (id) => !visibleIds.includes(id)
        )
      );
    } else {
      setSelected((current) =>
        Array.from(
          new Set([
            ...current,
            ...visibleIds,
          ])
        )
      );
    }
  }

  async function clear() {
    setSearch("");
    setFrom("");
    setTo("");
    setType("");
    setMode("");

    await loadVouchersWithFilters(
      "",
      "",
      "",
      "",
      ""
    );
  }

  async function deleteVoucher() {
    if (!deletingId) return;

    setError("");

    try {
      const response = await fetch(
        `/api/vouchers/${deletingId}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to delete voucher."
        );
      }

      setDeletingId(null);
      setOpenActionId(null);

      setSelected((current) =>
        current.filter(
          (id) => id !== deletingId
        )
      );

      await loadVouchersWithFilters(
        search,
        from,
        to,
        type,
        mode
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete voucher."
      );

      setDeletingId(null);
    }
  }

  function closePdfPreview() {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(
        pdfPreviewUrl
      );
    }

    setPdfPreviewUrl(null);
    setPdfPreviewOpen(false);
    setPdfPreviewLoading(false);
    setPdfPreviewError("");
  }

  function downloadPreviewedPdf() {
    if (!pdfPreviewUrl) return;

    const link =
      document.createElement("a");

    link.href = pdfPreviewUrl;
    link.download =
      pdfPreviewFileName;

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function previewPdf(
    request: RequestInfo | URL,
    options?: RequestInit,
    fileName = "payment-vouchers.pdf"
  ) {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(
        pdfPreviewUrl
      );
    }

    setPdfPreviewOpen(true);
    setPdfPreviewLoading(true);
    setPdfPreviewError("");
    setPdfPreviewUrl(null);
    setPdfPreviewFileName(fileName);

    try {
      const response = await fetch(
        request,
        options
      );

      if (!response.ok) {
        let message =
          "Unable to generate PDF.";

        try {
          const data =
            await response.json();

          message =
            data?.message ||
            data?.error ||
            message;

          if (data?.details) {
            message = `${message} ${data.details}`;
          }
        } catch {
          // Non-JSON response.
        }

        throw new Error(message);
      }

      const blob =
        await response.blob();

      if (
        blob.type !==
        "application/pdf"
      ) {
        throw new Error(
          "The server did not return a valid PDF."
        );
      }

      const url =
        URL.createObjectURL(blob);

      setPdfPreviewUrl(url);
    } catch (error) {
      setPdfPreviewError(
        error instanceof Error
          ? error.message
          : "Unable to generate PDF."
      );
    } finally {
      setPdfPreviewLoading(false);
    }
  }

  async function previewVoucher(
    voucherId: number
  ) {
    setOpenActionId(null);

    await previewPdf(
      `/api/vouchers/${voucherId}/pdf`,
      undefined,
      `voucher-${voucherId}.pdf`
    );
  }

  async function downloadIds(
    ids: number[]
  ) {
    if (!ids.length) return;

    setDownloading(true);
    setError("");

    try {
      await previewPdf(
        "/api/vouchers/pdf",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            voucherIds: ids,
          }),
        },
        "payment-vouchers-selected.pdf"
      );
    } finally {
      setDownloading(false);
    }
  }

  async function downloadDateRange() {
    if (!from && !to) {
      setError(
        "Please select a date range first."
      );

      return;
    }

    setDownloading(true);
    setError("");

    try {
      const params =
        new URLSearchParams();

      if (from) {
        params.set("from", from);
      }

      if (to) {
        params.set("to", to);
      }

      const response = await fetch(
        `/api/vouchers?${params}`
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to fetch vouchers for the selected date range."
        );
      }

      const ids = (
        data.vouchers || []
      ).map(
        (voucher: Voucher) =>
          voucher.voucher_id
      );

      if (!ids.length) {
        throw new Error(
          "No vouchers found for the selected date range."
        );
      }

      await previewPdf(
        "/api/vouchers/pdf",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            voucherIds: ids,
          }),
        },
        "payment-vouchers-date-range.pdf"
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to generate PDF."
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="lux-page">
      <header className="lux-header">
        <div className="lux-shell flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#101827] text-sm font-bold text-[#d8c29a]">
              PV
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[.24em] text-[#b8955a]">
                Payment Voucher
              </p>

              <p className="lux-serif text-lg">
                Voucher Register
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">
                {user.name}
              </p>

              <p className="text-xs text-slate-500">
                @{user.username}
              </p>
            </div>

            <button
              className="lux-secondary px-4 py-2.5 text-sm"
              onClick={() =>
                router.push("/dashboard")
              }
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="lux-shell py-8 sm:py-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.28em] text-[#b8955a]">
              Payment records
            </p>

            <h1 className="lux-serif mt-2 text-4xl">
              Vouchers
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Search, sort, filter and manage your
              payment vouchers.
            </p>
          </div>

          <button
            className="lux-primary"
            onClick={() =>
              router.push(
                "/vouchers/create"
              )
            }
          >
            + Create Voucher
          </button>
        </div>

        {/* Filters */}
        <div className="lux-card mt-8 p-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Search All Columns
              </label>

              <input
                className="lux-input"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    loadVouchers();
                  }
                }}
                placeholder="Search any voucher value…"
              />

              <p className="mt-2 text-xs text-slate-400">
                Voucher no., date, payee, amount,
                type, mode, PAN, TDS, towards,
                creator and more.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                From
              </label>

              <input
                className="lux-input"
                type="date"
                value={from}
                onChange={(event) =>
                  setFrom(
                    event.target.value
                  )
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                To
              </label>

              <input
                className="lux-input"
                type="date"
                value={to}
                onChange={(event) =>
                  setTo(
                    event.target.value
                  )
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Payee Type
              </label>

              <SearchableSelect
                value={type}
                options={[
                  ...PAYEE_TYPES,
                ]}
                placeholder="All types"
                searchPlaceholder="Search payee type…"
                onChange={setType}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <SearchableSelect
              className="w-full max-w-xs"
              value={mode}
              options={[
                ...PAYMENT_MODES,
              ]}
              placeholder="All payment modes"
              searchPlaceholder="Search payment mode…"
              onChange={setMode}
            />

            <button
              className="lux-primary"
              disabled={loading}
              onClick={loadVouchers}
            >
              {loading
                ? "Loading…"
                : "Search"}
            </button>

            <button
              className="lux-secondary"
              disabled={loading}
              onClick={clear}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Action bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-800">
              {vouchers.length}
            </span>{" "}
            voucher
            {vouchers.length === 1
              ? ""
              : "s"} found
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              className="lux-secondary"
              disabled={
                !selected.length ||
                downloading
              }
              onClick={() =>
                downloadIds(selected)
              }
            >
              {downloading
                ? "Generating…"
                : `PDF Selected (${selected.length})`}
            </button>

            <button
              className="lux-primary"
              disabled={
                downloading ||
                (!from && !to)
              }
              onClick={
                downloadDateRange
              }
            >
              {downloading
                ? "Generating…"
                : "PDF Date Range"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Voucher table */}
        <div className="lux-card mt-5 overflow-hidden">
          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              Loading vouchers…
            </div>
          ) : !vouchers.length ? (
            <div className="px-6 py-16 text-center">
              <p className="lux-serif text-2xl">
                No vouchers found
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] text-left text-sm">
                <thead className="border-b border-[#e6e0d5] bg-[#fbf8f1]">
                  <tr>
                    <th className="w-12 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={
                          sortedVouchers.length >
                            0 &&
                          sortedVouchers.every(
                            (voucher) =>
                              selected.includes(
                                voucher.voucher_id
                              )
                          )
                        }
                        onChange={
                          toggleAll
                        }
                      />
                    </th>

                    <th className="px-4 py-4">
                      <SortButton
                        label="Voucher"
                        column="voucher_id"
                      />
                    </th>

                    <th className="px-4 py-4">
                      <SortButton
                        label="Date"
                        column="voucher_date"
                      />
                    </th>

                    <th className="px-4 py-4">
                      <SortButton
                        label="Paid To"
                        column="payee"
                      />
                    </th>

                    <th className="px-4 py-4">
                      <SortButton
                        label="Type"
                        column="type_of_payee"
                      />
                    </th>

                    <th className="px-4 py-4">
                      <SortButton
                        label="Towards"
                        column="towards"
                      />
                    </th>

                    <th className="px-4 py-4">
                      <SortButton
                        label="Amount"
                        column="amount"
                      />
                    </th>

                    <th className="px-4 py-4">
                      <SortButton
                        label="Mode"
                        column="mode_of_payment"
                      />
                    </th>

                    <th className="px-4 py-4">
                      <SortButton
                        label="Created By"
                        column="created_by_name"
                      />
                    </th>

                    <th className="w-20 px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eee9df]">
                  {sortedVouchers.map(
                    (voucher) => (
                      <tr
                        key={
                          voucher.voucher_id
                        }
                        className="hover:bg-[#fffdf8]"
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selected.includes(
                              voucher.voucher_id
                            )}
                            onChange={() =>
                              toggle(
                                voucher.voucher_id
                              )
                            }
                          />
                        </td>

                        <td className="px-4 py-4 font-semibold text-[#101827]">
                          #
                          {
                            voucher.voucher_id
                          }
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                          {formatDate(
                            voucher.voucher_date
                          )}
                        </td>

                        <td className="px-4 py-4 font-semibold">
                          {voucher.payee}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {voucher.type_of_payee ===
                          "Custom"
                            ? voucher.custom_payee_type
                            : voucher.type_of_payee}
                        </td>

                        <td className="max-w-xs px-4 py-4 text-slate-600">
                          <span
                            className="block truncate"
                            title={
                              voucher.towards
                            }
                          >
                            {voucher.towards}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 font-semibold">
                          ₹{" "}
                          {Number(
                            voucher.amount
                          ).toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits: 2,
                            }
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-full border border-[#e6e0d5] bg-[#fbf8f1] px-3 py-1 text-xs font-semibold">
                            {
                              voucher.mode_of_payment
                            }
                          </span>
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {
                            voucher.created_by_name
                          }
                        </td>

                        {/* Three-dot action menu */}
                        <td className="relative px-4 py-4 text-right">
                          <button
                            type="button"
                            aria-label={`Actions for voucher #${voucher.voucher_id}`}
                            aria-expanded={
                              openActionId ===
                              voucher.voucher_id
                            }
                            onClick={() =>
                              setOpenActionId(
                                openActionId ===
                                  voucher.voucher_id
                                  ? null
                                  : voucher.voucher_id
                              )
                            }
                            className="inline-grid h-9 w-9 place-items-center rounded-xl border border-transparent text-xl leading-none text-slate-500 transition hover:border-[#e6e0d5] hover:bg-[#fbf7ee] hover:text-[#101827]"
                          >
                            ⋮
                          </button>

                          {openActionId ===
                            voucher.voucher_id && (
                            <div className="absolute right-4 top-14 z-50 w-44 overflow-hidden rounded-2xl border border-[#e6e0d5] bg-[#fffdf8] text-left shadow-[0_18px_45px_rgba(16,24,39,.16)]">
                              <button
                                type="button"
                                className="block w-full px-4 py-3 text-left text-sm font-semibold text-[#101827] hover:bg-[#fbf7ee]"
                                onClick={() =>
                                  previewVoucher(
                                    voucher.voucher_id
                                  )
                                }
                              >
                                Preview PDF
                              </button>

                              <button
                                type="button"
                                className="block w-full border-t border-[#eee9df] px-4 py-3 text-left text-sm font-semibold text-[#101827] hover:bg-[#fbf7ee]"
                                onClick={() => {
                                  setOpenActionId(
                                    null
                                  );

                                  router.push(
                                    `/vouchers/${voucher.voucher_id}/edit`
                                  );
                                }}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="block w-full border-t border-[#eee9df] px-4 py-3 text-left text-sm font-semibold text-[#9a4d4d] hover:bg-red-50"
                                onClick={() => {
                                  setOpenActionId(
                                    null
                                  );

                                  setDeletingId(
                                    voucher.voucher_id
                                  );
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-[#101827]/45 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#e6e0d5] bg-[#fffdf8] p-7 shadow-[0_25px_70px_rgba(16,24,39,.25)]">
            <p className="text-[11px] font-semibold uppercase tracking-[.28em] text-[#b8955a]">
              Delete voucher
            </p>

            <h2 className="lux-serif mt-2 text-2xl">
              Delete voucher #
              {deletingId}?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              This permanently removes the voucher
              from the register.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="lux-secondary"
                onClick={() =>
                  setDeletingId(null)
                }
              >
                Cancel
              </button>

              <button
                className="rounded-xl border border-[#9a4d4d] bg-[#9a4d4d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#7c3030]"
                onClick={
                  deleteVoucher
                }
              >
                Delete Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview */}
      <PdfPreviewModal
        open={pdfPreviewOpen}
        pdfUrl={pdfPreviewUrl}
        fileName={
          pdfPreviewFileName
        }
        loading={
          pdfPreviewLoading
        }
        error={pdfPreviewError}
        onClose={
          closePdfPreview
        }
        onDownload={
          downloadPreviewedPdf
        }
      />
    </main>
  );
}