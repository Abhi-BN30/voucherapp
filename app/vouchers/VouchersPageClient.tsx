"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect";
import { PAYEE_TYPES, PAYMENT_MODES } from "@/lib/voucher-options";

type User = { userId: number; username: string; name: string };

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

type Props = { user: User };

function formatDate(value: string) {
  const datePart = String(value || "").split("T")[0];
  const parts = datePart.split("-");
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : "-";
}

export default function VouchersPageClient({ user }: Props) {
  const router = useRouter();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("");
  const [mode, setMode] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function loadVouchersWithFilters(s: string, f: string, t: string, ty: string, m: string) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (s.trim()) params.set("search", s.trim());
      if (f) params.set("from", f);
      if (t) params.set("to", t);
      if (ty) params.set("type", ty);
      if (m) params.set("mode", m);

      const response = await fetch(params.toString() ? `/api/vouchers?${params}` : "/api/vouchers");
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || data?.message || "Unable to load vouchers.");
        return [];
      }

      const rows = data.vouchers || [];
      setVouchers(rows);
      setSelected([]);
      return rows;
    } catch {
      setError("Unable to connect to the server.");
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function loadVouchers() {
    await loadVouchersWithFilters(search, from, to, type, mode);
  }

  useEffect(() => {
    loadVouchersWithFilters("", "", "", "", "");
  }, []);

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  function toggleAll() {
    setSelected(selected.length === vouchers.length ? [] : vouchers.map((voucher) => voucher.voucher_id));
  }

  async function clear() {
    setSearch("");
    setFrom("");
    setTo("");
    setType("");
    setMode("");
    await loadVouchersWithFilters("", "", "", "", "");
  }

  async function deleteVoucher() {
    if (!deletingId) return;

    setError("");

    try {
      const response = await fetch(`/api/vouchers/${deletingId}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to delete voucher.");
      }

      setDeletingId(null);
      setSelected((current) => current.filter((id) => id !== deletingId));
      await loadVouchersWithFilters(search, from, to, type, mode);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to delete voucher.");
      setDeletingId(null);
    }
  }

  async function downloadIds(ids: number[]) {
    if (!ids.length) return;
    setDownloading(true);
    setError("");

    try {
      const response = await fetch("/api/vouchers/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherIds: ids }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || data?.error || "Unable to generate PDF.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "payment-vouchers.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to download vouchers.");
    } finally {
      setDownloading(false);
    }
  }

  async function downloadDateRange() {
    if (!from && !to) {
      setError("Please select a date range first.");
      return;
    }

    setDownloading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const response = await fetch(`/api/vouchers?${params}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data?.error || data?.message || "Unable to fetch vouchers for the selected date range.");

      const ids = (data.vouchers || []).map((voucher: Voucher) => voucher.voucher_id);
      if (!ids.length) throw new Error("No vouchers found for the selected date range.");

      await downloadIds(ids);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to download vouchers.");
      setDownloading(false);
    }
  }

  return (
    <main className="lux-page">
      <header className="lux-header">
        <div className="lux-shell flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#101827] text-sm font-bold text-[#d8c29a]">PV</div>
            <div>
              <p className="text-[10px] uppercase tracking-[.24em] text-[#b8955a]">Payment Voucher</p>
              <p className="lux-serif text-lg">Voucher Register</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-slate-500">@{user.username}</p>
            </div>
            <button className="lux-secondary px-4 py-2.5 text-sm" onClick={() => router.push("/dashboard")}>Dashboard</button>
          </div>
        </div>
      </header>

      <div className="lux-shell py-8 sm:py-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.28em] text-[#b8955a]">Payment records</p>
            <h1 className="lux-serif mt-2 text-4xl">Vouchers</h1>
            <p className="mt-2 text-sm text-slate-500">Search, filter, edit and manage payment vouchers.</p>
          </div>
          <button className="lux-primary" onClick={() => router.push("/vouchers/create")}>+ Create Voucher</button>
        </div>

        <div className="lux-card mt-8 p-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Search</label>
              <input className="lux-input" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") loadVouchers(); }} placeholder="Paid to, towards or amount…" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">From</label>
              <input className="lux-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">To</label>
              <input className="lux-input" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Payee Type</label>
              <SearchableSelect value={type} options={[...PAYEE_TYPES]} placeholder="All types" searchPlaceholder="Search payee type…" onChange={setType} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <SearchableSelect className="w-full max-w-xs" value={mode} options={[...PAYMENT_MODES]} placeholder="All payment modes" searchPlaceholder="Search payment mode…" onChange={setMode} />
            <button className="lux-primary" disabled={loading} onClick={loadVouchers}>{loading ? "Loading…" : "Search"}</button>
            <button className="lux-secondary" disabled={loading} onClick={clear}>Clear</button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500"><span className="font-semibold text-slate-800">{vouchers.length}</span> voucher{vouchers.length === 1 ? "" : "s"} found</p>
          <div className="flex flex-wrap gap-3">
            <button className="lux-secondary" disabled={!selected.length || downloading} onClick={() => downloadIds(selected)}>{downloading ? "Generating…" : `Download Selected (${selected.length})`}</button>
            <button className="lux-primary" disabled={downloading || (!from && !to)} onClick={downloadDateRange}>{downloading ? "Generating…" : "Download Date Range"}</button>
          </div>
        </div>

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="lux-card mt-5 overflow-hidden">
          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">Loading vouchers…</div>
          ) : !vouchers.length ? (
            <div className="px-6 py-16 text-center"><p className="lux-serif text-2xl">No vouchers found</p><p className="mt-2 text-sm text-slate-500">Try changing your search or filters.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1260px] text-left text-sm">
                <thead className="border-b border-[#e6e0d5] bg-[#fbf8f1]">
                  <tr>
                    <th className="w-12 px-4 py-4"><input type="checkbox" checked={selected.length === vouchers.length && vouchers.length > 0} onChange={toggleAll} /></th>
                    {['Voucher', 'Date', 'Paid To', 'Type', 'Towards', 'Amount', 'Mode', 'Created By', 'Action'].map((heading) => <th key={heading} className="px-4 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{heading}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee9df]">
                  {vouchers.map((voucher) => (
                    <tr key={voucher.voucher_id} className="hover:bg-[#fffdf8]">
                      <td className="px-4 py-4"><input type="checkbox" checked={selected.includes(voucher.voucher_id)} onChange={() => toggle(voucher.voucher_id)} /></td>
                      <td className="px-4 py-4 font-semibold text-[#101827]">#{voucher.voucher_id}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">{formatDate(voucher.voucher_date)}</td>
                      <td className="px-4 py-4 font-semibold">{voucher.payee}</td>
                      <td className="px-4 py-4 text-slate-600">{voucher.type_of_payee === "Custom" ? voucher.custom_payee_type : voucher.type_of_payee}</td>
                      <td className="max-w-xs px-4 py-4 text-slate-600"><span className="block truncate" title={voucher.towards}>{voucher.towards}</span></td>
                      <td className="whitespace-nowrap px-4 py-4 font-semibold">₹ {Number(voucher.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-4"><span className="rounded-full border border-[#e6e0d5] bg-[#fbf8f1] px-3 py-1 text-xs font-semibold">{voucher.mode_of_payment}</span></td>
                      <td className="px-4 py-4 text-slate-600">{voucher.created_by_name}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                          <a className="lux-link text-sm" href={`/api/vouchers/${voucher.voucher_id}/pdf`}>PDF</a>
                          <button className="lux-link text-sm" onClick={() => router.push(`/vouchers/${voucher.voucher_id}/edit`)}>Edit</button>
                          <button className="text-sm font-semibold text-[#9a4d4d] hover:text-[#7c3030]" onClick={() => setDeletingId(voucher.voucher_id)}>Delete</button>
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

      {deletingId !== null && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-[#101827]/45 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#e6e0d5] bg-[#fffdf8] p-7 shadow-[0_25px_70px_rgba(16,24,39,.25)]">
            <p className="text-[11px] font-semibold uppercase tracking-[.28em] text-[#b8955a]">Delete voucher</p>
            <h2 className="lux-serif mt-2 text-2xl">Delete voucher #{deletingId}?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">This permanently removes the voucher from the register. The generated PDF can no longer be retrieved from this record.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="lux-secondary" onClick={() => setDeletingId(null)}>Cancel</button>
              <button className="rounded-xl border border-[#9a4d4d] bg-[#9a4d4d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#7c3030]" onClick={deleteVoucher}>Delete Voucher</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
