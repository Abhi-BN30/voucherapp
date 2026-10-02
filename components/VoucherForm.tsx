"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { amountToWords } from "@/lib/number-to-words";
import { PAYEE_TYPES, PAYMENT_MODES } from "@/lib/voucher-options";
import SearchableSelect from "@/components/SearchableSelect";

type User = { userId: number; username: string; name: string };

type Voucher = {
  voucher_id: number;
  voucher_date: string;
  payee: string;
  amount: string | number;
  amount_in_words: string;
  type_of_payee: string;
  custom_payee_type: string | null;
  mode_of_payment: string;
  towards: string;
  payee_pan: string | null;
  tds: string | null;
};

type Props = {
  user: User;
  mode?: "create" | "edit";
  initialVoucher?: Voucher;
};

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeDate(value: string) {
  const stringValue = String(value || "");
  const match = stringValue.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : stringValue.slice(0, 10);
}

function label(name: string, required = false, optional = false) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
      {name}{" "}
      {required && <span className="text-red-500">*</span>}
      {optional && (
        <span className="ml-1 normal-case font-normal tracking-normal text-slate-400">
          (Optional)
        </span>
      )}
    </label>
  );
}

export default function VoucherForm({ user, mode = "create", initialVoucher }: Props) {
  const router = useRouter();
  const editing = mode === "edit";
  const initial = initialVoucher;

  const [voucherDate, setVoucherDate] = useState(
    normalizeDate(initial?.voucher_date || today())
  );
  const [payee, setPayee] = useState(initial?.payee || "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [amountInWords, setAmountInWords] = useState(initial?.amount_in_words || "");
  const [typeOfPayee, setTypeOfPayee] = useState(initial?.type_of_payee || "");
  const [customPayeeType, setCustomPayeeType] = useState(initial?.custom_payee_type || "");
  const [modeOfPayment, setModeOfPayment] = useState(initial?.mode_of_payment || "");
  const [towards, setTowards] = useState(initial?.towards || "");
  const [payeePan, setPayeePan] = useState(initial?.payee_pan || "");
  const [tds, setTds] = useState(initial?.tds || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const downloadPdf = formData.get("submitAction") === "download";

    setError("");
    setSuccess("");

    if (!voucherDate) return setError("Please select the voucher date.");
    if (!payee.trim()) return setError("Please enter the payee.");
    if (!amount || Number(amount) <= 0) return setError("Please enter a valid amount.");
    if (!typeOfPayee) return setError("Please select the type of payee.");
    if (typeOfPayee === "Custom" && !customPayeeType.trim()) {
      return setError("Please specify the custom payee type.");
    }
    if (!modeOfPayment) return setError("Please select the mode of payment.");
    if (!towards.trim()) return setError("Please enter what the payment is towards.");

    setSaving(true);

    try {
      const url = editing
        ? `/api/vouchers/${initial?.voucher_id}`
        : "/api/vouchers";

      const response = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucherDate,
          payee,
          amount,
          amountInWords,
          typeOfPayee,
          customPayeeType: typeOfPayee === "Custom" ? customPayeeType : null,
          modeOfPayment,
          towards,
          payeePan: payeePan || null,
          tds: tds || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to save voucher.");
        return;
      }

      const voucherId = Number(data.voucher.voucher_id);
      setSuccess(`Voucher #${voucherId} ${editing ? "updated" : "saved"} successfully.`);

      if (downloadPdf) {
        window.open(`/api/vouchers/${voucherId}/pdf`, "_blank");
      }

      setTimeout(() => {
        router.push("/vouchers");
        router.refresh();
      }, 700);
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setSaving(false);
    }
  }

  const payeeType =
    typeOfPayee === "Custom"
      ? customPayeeType || "Custom"
      : typeOfPayee;

  const displayPaidTo = payee
    ? `${payee}${payeeType ? ` (${payeeType})` : ""}`
    : "—";

  return (
    <main className="lux-page">
      <header className="lux-header">
        <div className="lux-shell flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#101827] text-sm font-bold text-[#d8c29a]">PV</div>
            <div>
              <p className="text-[10px] uppercase tracking-[.24em] text-[#b8955a]">Payment Voucher</p>
              <p className="lux-serif text-lg">{editing ? "Edit Voucher" : "Create Voucher"}</p>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-slate-500">@{user.username}</p>
          </div>
        </div>
      </header>

      <div className="lux-shell py-8 sm:py-10">
        <button type="button" onClick={() => router.push("/vouchers")} className="mb-6 text-sm font-semibold text-slate-500 hover:text-[#101827]">
          ← Back to Vouchers
        </button>

        <div className="grid gap-7 lg:grid-cols-[1fr_360px]">
          <form onSubmit={handleSubmit} className="lux-card overflow-visible">
            <div className="border-b border-[#e6e0d5] px-6 py-6 sm:px-8">
              <p className="text-[11px] font-semibold uppercase tracking-[.28em] text-[#b8955a]">
                {editing ? "Update payment record" : "New payment record"}
              </p>
              <h1 className="lux-serif mt-2 text-3xl">Voucher Details</h1>
              <p className="mt-2 text-sm text-slate-500">Required fields are marked with an asterisk.</p>
            </div>

            <div className="space-y-8 p-6 sm:p-8">
              <section>
                <div className="mb-5 flex items-center gap-3">
                  <span className="text-xs font-bold text-[#b8955a]">01</span>
                  <h2 className="lux-serif text-xl">Voucher Information</h2>
                  <div className="gold-line flex-1" />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    {label("Date", true)}
                    <input className="lux-input" type="date" value={voucherDate} onChange={(event) => setVoucherDate(event.target.value)} required />
                  </div>

                  <div>
                    {label("Paid To", true)}
                    <input className="lux-input" value={payee} onChange={(event) => setPayee(event.target.value)} placeholder="Name of payee" required />
                  </div>

                  <div>
                    {label("Type of Payee", true)}
                    <SearchableSelect value={typeOfPayee} options={[...PAYEE_TYPES]} placeholder="Select type" searchPlaceholder="Search payee type…" onChange={(value) => { setTypeOfPayee(value); if (value !== "Custom") setCustomPayeeType(""); }} />
                  </div>

                  {typeOfPayee === "Custom" && (
                    <div>
                      {label("Custom Payee Type", true)}
                      <input className="lux-input" value={customPayeeType} onChange={(event) => setCustomPayeeType(event.target.value)} placeholder="Enter custom type" required />
                    </div>
                  )}
                </div>
              </section>

              <section>
                <div className="mb-5 flex items-center gap-3">
                  <span className="text-xs font-bold text-[#b8955a]">02</span>
                  <h2 className="lux-serif text-xl">Payment Details</h2>
                  <div className="gold-line flex-1" />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    {label("Amount", true)}
                    <input
                      className="lux-input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(event) => {
                        const value = event.target.value;
                        setAmount(value);
                        setAmountInWords(value && Number(value) > 0 ? amountToWords(Number(value)) : "");
                      }}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    {label("Amount in Words")}
                    <input className="lux-input bg-[#faf7f0]" value={amountInWords} readOnly />
                  </div>

                  <div>
                    {label("Mode of Payment", true)}
                    <SearchableSelect value={modeOfPayment} options={[...PAYMENT_MODES]} placeholder="Select payment mode" searchPlaceholder="Search payment mode…" onChange={setModeOfPayment} />
                  </div>

                  <div>
                    {label("Payee PAN No.", false, true)}
                    <input className="lux-input uppercase" value={payeePan} onChange={(event) => setPayeePan(event.target.value)} placeholder="PAN number" />
                  </div>

                  <div className="md:col-span-2">
                    {label("Towards", true)}
                    <textarea className="lux-input resize-none" rows={3} value={towards} onChange={(event) => setTowards(event.target.value)} placeholder="What is this payment towards?" required />
                  </div>

                  <div className="md:col-span-2">
                    {label("TDS", false, true)}
                    <input className="lux-input" value={tds} onChange={(event) => setTds(event.target.value)} placeholder="TDS, if applicable" />
                  </div>
                </div>
              </section>

              {(error || success) && (
                <div>
                  {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                  {success && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#e6e0d5] bg-[#fbf8f1] px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
              <button type="button" onClick={() => router.push("/vouchers")} className="lux-secondary">Cancel</button>
              <button type="submit" disabled={saving} name="submitAction" value="save" className="lux-secondary">{saving ? "Saving…" : editing ? "Save Changes" : "Save Voucher"}</button>
              <button type="submit" disabled={saving} name="submitAction" value="download" className="lux-primary">{saving ? "Saving…" : editing ? "Save & Download PDF" : "Save & Download PDF"}</button>
            </div>
          </form>

          <aside className="self-start lg:sticky lg:top-24">
            <div className="lux-card p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[.28em] text-[#b8955a]">Live summary</p>
              <h2 className="lux-serif mt-2 text-2xl">Voucher Preview</h2>
              <div className="gold-line mt-5" />
              <div className="mt-5 space-y-4 text-sm">
                <div><p className="text-xs uppercase tracking-wider text-slate-400">Date</p><p className="mt-1 font-semibold">{voucherDate ? `${voucherDate.slice(8, 10)}-${voucherDate.slice(5, 7)}-${voucherDate.slice(0, 4)}` : "—"}</p></div>
                <div><p className="text-xs uppercase tracking-wider text-slate-400">Paid To</p><p className="mt-1 font-semibold">{displayPaidTo}</p></div>
                <div><p className="text-xs uppercase tracking-wider text-slate-400">Amount</p><p className="lux-serif mt-1 text-2xl">{amount ? `₹ ${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹ —"}</p><p className="mt-1 text-xs leading-5 text-slate-500">{amountInWords || "Amount in words will appear here."}</p></div>
                <div><p className="text-xs uppercase tracking-wider text-slate-400">Payment Mode</p><p className="mt-1 font-semibold">{modeOfPayment || "—"}</p></div>
                <div><p className="text-xs uppercase tracking-wider text-slate-400">Towards</p><p className="mt-1 leading-6 text-slate-700">{towards || "—"}</p></div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
