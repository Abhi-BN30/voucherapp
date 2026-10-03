"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect";
import PdfPreviewModal from "@/components/PdfPreviewModal";
import {
  PAYEE_TYPES,
  PAYMENT_MODES,
} from "@/lib/voucher-options";
import { formatVoucherNumber } from "@/lib/voucher-utils";

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
  type_of_payee: string;
  custom_payee_type: string | null;
  mode_of_payment: string;
  towards: string;
  created_by_name: string;
  deleted_at: string | null;
};

function date(v: string) {
  return String(v)
    .slice(0, 10)
    .split("-")
    .reverse()
    .join("-");
}

export default function VouchersPageClient({
  user,
}: {
  user: User;
}) {
  const r = useRouter();

  const [rows, setRows] = useState<Voucher[]>([]);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("");
  const [mode, setMode] = useState("");
  const [archived, setArchived] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<number | null>(null);

  const [actionOpen, setActionOpen] = useState<number | null>(null);

  const [sort, setSort] = useState<{
    k: keyof Voucher | "";
    dir: 1 | -1;
  }>({
    k: "voucher_date",
    dir: -1,
  });

  async function load() {
    setLoading(true);
    setError("");
    setActionOpen(null);

    const p = new URLSearchParams();

    if (search.trim()) {
      p.set("search", search.trim());
    }

    if (from) {
      p.set("from", from);
    }

    if (to) {
      p.set("to", to);
    }

    if (type) {
      p.set("type", type);
    }

    if (mode) {
      p.set("mode", mode);
    }

    if (archived) {
      p.set("archived", "1");
    }

    const x = await fetch(`/api/vouchers?${p}`);
    const d = await x.json();

    if (!x.ok) {
      setError(
        d.message ||
          d.error ||
          "Unable to load vouchers"
      );
    } else {
      setRows(d.vouchers || []);
      setSelected([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [archived]);

  const sorted = useMemo(
    () =>
      [...rows].sort((a: any, b: any) => {
        const k = sort.k;

        if (!k) {
          return 0;
        }

        let av = a[k];
        let bv = b[k];

        if (k === "voucher_date") {
          av = String(av).slice(0, 10);
          bv = String(bv).slice(0, 10);
        }

        if (k === "amount") {
          av = Number(av);
          bv = Number(bv);
        }

        return av < bv
          ? -1 * sort.dir
          : av > bv
          ? sort.dir
          : 0;
      }),
    [rows, sort]
  );

  function toggleSort(k: keyof Voucher) {
    setActionOpen(null);

    setSort((s) =>
      s.k === k
        ? {
            k,
            dir: s.dir === 1 ? -1 : 1,
          }
        : {
            k,
            dir: 1,
          }
    );
  }

  function toggle(id: number) {
    setActionOpen(null);

    setSelected((s) =>
      s.includes(id)
        ? s.filter((x) => x !== id)
        : [...s, id]
    );
  }

  function toggleAll() {
    setActionOpen(null);

    setSelected(
      selected.length === sorted.length
        ? []
        : sorted.map((x) => x.voucher_id)
    );
  }

  async function archive(id: number) {
    if (
      !confirm(
        "Archive this voucher? It will be removed from the active register but can be restored."
      )
    ) {
      return;
    }

    const x = await fetch(`/api/vouchers/${id}`, {
      method: "DELETE",
    });

    if (x.ok) {
      load();
    } else {
      const d = await x.json();

      setError(
        d.message ||
          "Unable to archive voucher."
      );
    }
  }

  async function restore(id: number) {
    const x = await fetch(`/api/vouchers/${id}`, {
      method: "PATCH",
    });

    if (x.ok) {
      load();
    } else {
      const d = await x.json();

      setError(
        d.message ||
          "Unable to restore voucher."
      );
    }
  }

  async function exportFile(
    format: "csv" | "xls"
  ) {
    const p = new URLSearchParams({
      format,
    });

    if (search) {
      p.set("search", search);
    }

    if (from) {
      p.set("from", from);
    }

    if (to) {
      p.set("to", to);
    }

    if (type) {
      p.set("type", type);
    }

    if (mode) {
      p.set("mode", mode);
    }

    const x = await fetch(
      `/api/vouchers/export?${p}`
    );

    if (!x.ok) {
      setError(
        "Unable to export register."
      );
      return;
    }

    const b = await x.blob();
    const u = URL.createObjectURL(b);

    const a = document.createElement("a");
    a.href = u;
    a.download =
      format === "csv"
        ? "voucher-register.csv"
        : "voucher-register.xls";

    a.click();

    URL.revokeObjectURL(u);
  }

  async function downloadSelected() {
    if (!selected.length) {
      return;
    }

    const x = await fetch(
      "/api/vouchers/pdf",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          voucherIds: selected,
        }),
      }
    );

    if (!x.ok) {
      setError(
        "Unable to generate PDF."
      );
      return;
    }

    const b = await x.blob();
    const u = URL.createObjectURL(b);

    const a = document.createElement("a");
    a.href = u;
    a.download =
      "payment-vouchers.pdf";

    a.click();

    URL.revokeObjectURL(u);
  }

  return (
    <main className="lux-page">
      <header className="lux-header">
        <div className="lux-shell flex items-center justify-between py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[.24em] text-[#b8955a]">
              Payment Voucher
            </p>

            <p className="lux-serif text-lg">
              Voucher Register
            </p>
          </div>

          <div className="flex gap-2">
            <button
              className="lux-secondary"
              onClick={() =>
                r.push("/dashboard")
              }
            >
              Dashboard
            </button>

            <button
              className="lux-primary"
              onClick={() =>
                r.push("/vouchers/create")
              }
            >
              + Create
            </button>
          </div>
        </div>
      </header>

      <div className="lux-shell py-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.28em] text-[#b8955a]">
            Payment records
          </p>

          <h1 className="lux-serif mt-2 text-4xl">
            {archived
              ? "Archived Vouchers"
              : "Vouchers"}
          </h1>
        </div>

        {/* Filters */}
        <div className="lux-card mt-7 p-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Search
              </label>

              <input
                className="lux-input"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    load();
                  }
                }}
                placeholder="Voucher no., paid to, type, towards, amount or mode"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                From
              </label>

              <input
                className="lux-input"
                type="date"
                value={from}
                onChange={(e) =>
                  setFrom(e.target.value)
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
                onChange={(e) =>
                  setTo(e.target.value)
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Type
              </label>

              <SearchableSelect
                value={type}
                options={[...PAYEE_TYPES]}
                placeholder="All types"
                searchPlaceholder="Search type…"
                onChange={setType}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <SearchableSelect
              className="w-full max-w-xs"
              value={mode}
              options={[...PAYMENT_MODES]}
              placeholder="All payment modes"
              searchPlaceholder="Search mode…"
              onChange={setMode}
            />

            <button
              className="lux-primary"
              onClick={load}
            >
              Search
            </button>

            <button
              className="lux-secondary"
              onClick={() => {
                setSearch("");
                setFrom("");
                setTo("");
                setType("");
                setMode("");

                setTimeout(load, 0);
              }}
            >
              Clear
            </button>

            <button
              className="lux-secondary"
              onClick={() =>
                setArchived((v) => !v)
              }
            >
              {archived
                ? "Active Vouchers"
                : "Archived"}
            </button>
          </div>
        </div>

        {/* Register controls */}
        <div className="mt-5 flex flex-wrap justify-between gap-3">
          <p className="text-sm text-slate-500">
            <b className="text-slate-800">
              {sorted.length}
            </b>{" "}
            voucher
            {sorted.length === 1
              ? ""
              : "s"}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              className="lux-secondary"
              disabled={!selected.length}
              onClick={downloadSelected}
            >
              Download Selected (
              {selected.length})
            </button>

            <button
              className="lux-secondary"
              onClick={() =>
                exportFile("csv")
              }
            >
              Export CSV
            </button>

            <button
              className="lux-secondary"
              onClick={() =>
                exportFile("xls")
              }
            >
              Export Excel
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
            <div className="p-12 text-center text-sm text-slate-500">
              Loading vouchers…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="bg-[#fbf8f1]">
                  <tr>
                    <th className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={
                          selected.length ===
                            sorted.length &&
                          sorted.length > 0
                        }
                        onChange={toggleAll}
                      />
                    </th>

                    {[
                      [
                        "voucher_id",
                        "Voucher",
                      ],
                      [
                        "voucher_date",
                        "Date",
                      ],
                      ["payee", "Paid To"],
                      [
                        "type_of_payee",
                        "Type",
                      ],
                      [
                        "towards",
                        "Towards",
                      ],
                      ["amount", "Amount"],
                      [
                        "mode_of_payment",
                        "Mode",
                      ],
                    ].map(([k, h]) => (
                      <th
                        key={k}
                        className="cursor-pointer px-4 py-4 text-xs uppercase tracking-wider text-slate-500"
                        onClick={() =>
                          toggleSort(
                            k as keyof Voucher
                          )
                        }
                      >
                        {h}{" "}
                        <span>
                          {sort.k === k
                            ? sort.dir === 1
                              ? "↑"
                              : "↓"
                            : ""}
                        </span>
                      </th>
                    ))}

                    <th className="px-4 py-4 text-right text-xs uppercase tracking-wider text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eee9df]">
                  {sorted.map((v) => (
                    <tr
                      key={v.voucher_id}
                      className="hover:bg-[#fffdf8]"
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selected.includes(
                            v.voucher_id
                          )}
                          onChange={() =>
                            toggle(
                              v.voucher_id
                            )
                          }
                        />
                      </td>

                      <td className="px-4 py-4 font-semibold">
                        {formatVoucherNumber(
                          v.voucher_id,
                          v.voucher_date
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {date(v.voucher_date)}
                      </td>

                      <td className="px-4 py-4 font-semibold">
                        {v.payee}
                      </td>

                      <td className="px-4 py-4">
                        {v.type_of_payee ===
                        "Custom"
                          ? v.custom_payee_type
                          : v.type_of_payee}
                      </td>

                      <td className="max-w-xs px-4 py-4">
                        <span
                          className="block truncate"
                          title={v.towards}
                        >
                          {v.towards}
                        </span>
                      </td>

                      <td className="px-4 py-4 font-semibold">
                        ₹{" "}
                        {Number(
                          v.amount
                        ).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                          }
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {v.mode_of_payment}
                      </td>

                      {/* 3-dot action menu */}
                      <td className="px-4 py-4">
                        <div className="relative flex justify-end">
                          {archived ? (
                            <button
                              className="lux-link"
                              onClick={() =>
                                restore(
                                  v.voucher_id
                                )
                              }
                            >
                              Restore
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                aria-label={`Actions for voucher ${formatVoucherNumber(
                                  v.voucher_id,
                                  v.voucher_date
                                )}`}
                                aria-expanded={
                                  actionOpen ===
                                  v.voucher_id
                                }
                                className="action-menu-trigger"
                                onClick={() =>
                                  setActionOpen(
                                    actionOpen ===
                                      v.voucher_id
                                      ? null
                                      : v.voucher_id
                                  )
                                }
                              >
                                ⋯
                              </button>

                              {actionOpen ===
                                v.voucher_id && (
                                <>
                                  <button
                                    className="fixed inset-0 z-10 cursor-default"
                                    aria-label="Close action menu"
                                    onClick={() =>
                                      setActionOpen(
                                        null
                                      )
                                    }
                                  />

                                  <div className="action-menu">
                                    <button
                                      onClick={() => {
                                        setPreview(
                                          v.voucher_id
                                        );
                                        setActionOpen(
                                          null
                                        );
                                      }}
                                    >
                                      PDF Preview
                                    </button>

                                    <button
                                      onClick={() => {
                                        r.push(
                                          `/vouchers/${v.voucher_id}/edit`
                                        );
                                        setActionOpen(
                                          null
                                        );
                                      }}
                                    >
                                      Edit
                                    </button>

                                    <button
                                      className="danger"
                                      onClick={() => {
                                        setActionOpen(
                                          null
                                        );
                                        archive(
                                          v.voucher_id
                                        );
                                      }}
                                    >
                                      Archive
                                    </button>
                                  </div>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <PdfPreviewModal
        voucherId={preview}
        onClose={() =>
          setPreview(null)
        }
      />
    </main>
  );
}