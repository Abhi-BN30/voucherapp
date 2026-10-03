"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { amountToWords } from "@/lib/number-to-words";
import { PAYEE_TYPES, PAYMENT_MODES } from "@/lib/voucher-options";
import SearchableSelect from "@/components/SearchableSelect";
import PayeeSelect from "@/components/PayeeSelect";

type User = {
  userId: number;
  username: string;
  name: string;
};

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
  has_attachment?: boolean;
  attachment_file_name?: string | null;
  attachment_mime_type?: string | null;
};

type Props = {
  user: User;
  mode?: "create" | "edit";
  initialVoucher?: Voucher;
};

const MAX_ATTACHMENT_SIZE = 3 * 1024 * 1024;

const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
];

const ALLOWED_ATTACHMENT_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
];

function today() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function normalizeDate(value: string) {
  const stringValue = String(value || "");

  const match =
    stringValue.match(
      /^(\d{4}-\d{2}-\d{2})/
    );

  return match
    ? match[1]
    : stringValue.slice(0, 10);
}

function label(
  name: string,
  required = false,
  optional = false
) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
      {name}{" "}
      {required && (
        <span className="text-red-500">
          *
        </span>
      )}

      {optional && (
        <span className="ml-1 normal-case font-normal tracking-normal text-slate-400">
          (Optional)
        </span>
      )}
    </label>
  );
}

function isAllowedAttachment(file: File) {
  const extension =
    "." +
    file.name
      .split(".")
      .pop()
      ?.toLowerCase();

  return (
    ALLOWED_ATTACHMENT_TYPES.includes(
      file.type
    ) &&
    ALLOWED_ATTACHMENT_EXTENSIONS.includes(
      extension
    )
  );
}

export default function VoucherForm({
  user,
  mode = "create",
  initialVoucher,
}: Props) {
  const router = useRouter();

  const editing = mode === "edit";
  const initial = initialVoucher;

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [voucherDate, setVoucherDate] =
    useState(
      normalizeDate(
        initial?.voucher_date || today()
      )
    );

  const [payee, setPayee] = useState(
    initial?.payee || ""
  );

  const [amount, setAmount] = useState(
    initial
      ? String(initial.amount)
      : ""
  );

  const [amountInWords, setAmountInWords] =
    useState(
      initial?.amount_in_words || ""
    );

  const [typeOfPayee, setTypeOfPayee] =
    useState(
      initial?.type_of_payee || ""
    );

  const [customPayeeType, setCustomPayeeType] =
    useState(
      initial?.custom_payee_type || ""
    );

  const [modeOfPayment, setModeOfPayment] =
    useState(
      initial?.mode_of_payment || ""
    );

  const [towards, setTowards] =
    useState(
      initial?.towards || ""
    );

  const [payeePan, setPayeePan] =
    useState(
      initial?.payee_pan || ""
    );

  const [tds, setTds] =
    useState(initial?.tds || "");

  const [
    attachment,
    setAttachment,
  ] = useState<File | null>(null);

  const [
    attachmentPreview,
    setAttachmentPreview,
  ] = useState<string | null>(null);

  const [
    removeExistingAttachment,
    setRemoveExistingAttachment,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [duplicate, setDuplicate] =
    useState<any>(null);

  const hasExistingAttachment =
    Boolean(
      initial?.has_attachment
    ) &&
    !removeExistingAttachment;

  function handleAttachmentChange(
    file: File | null
  ) {
    setError("");

    if (!file) {
      setAttachment(null);
      setAttachmentPreview(null);
      return;
    }

    if (!isAllowedAttachment(file)) {
      setError(
        "Only JPG, JPEG and PNG images are allowed."
      );

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    if (
      file.size >
      MAX_ATTACHMENT_SIZE
    ) {
      setError(
        "Attachment must be 3 MB or smaller."
      );

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setAttachment(file);

    const url =
      URL.createObjectURL(file);

    setAttachmentPreview(url);

    setRemoveExistingAttachment(false);
  }

  function removeNewAttachment() {
    setAttachment(null);
    setAttachmentPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeExisting() {
    setRemoveExistingAttachment(true);
    setAttachment(null);
    setAttachmentPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function restoreExisting() {
    setRemoveExistingAttachment(false);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const submitForm =
      new FormData(
        event.currentTarget
      );

    const action = String(
      submitForm.get(
        "submitAction"
      ) || "save"
    );

    const downloadPdf =
      action === "download";

    const saveAndNew =
      action === "save-new";

    setError("");
    setSuccess("");
    setDuplicate(null);

    if (!voucherDate) {
      setError(
        "Please select the voucher date."
      );
      return;
    }

    if (!payee.trim()) {
      setError(
        "Please enter the payee."
      );
      return;
    }

    if (
      !amount ||
      Number(amount) <= 0
    ) {
      setError(
        "Please enter a valid amount."
      );
      return;
    }

    if (!typeOfPayee) {
      setError(
        "Please select the type of payee."
      );
      return;
    }

    if (
      typeOfPayee === "Custom" &&
      !customPayeeType.trim()
    ) {
      setError(
        "Please specify the custom payee type."
      );
      return;
    }

    if (!modeOfPayment) {
      setError(
        "Please select the mode of payment."
      );
      return;
    }

    if (!towards.trim()) {
      setError(
        "Please enter what the payment is towards."
      );
      return;
    }

    setSaving(true);

    try {
      const url = editing
        ? `/api/vouchers/${initial?.voucher_id}`
        : "/api/vouchers";

      const data =
        new FormData();

      data.append(
        "voucherDate",
        voucherDate
      );

      data.append(
        "payee",
        payee
      );

      data.append(
        "amount",
        amount
      );

      data.append(
        "amountInWords",
        amountInWords
      );

      data.append(
        "typeOfPayee",
        typeOfPayee
      );

      data.append(
        "customPayeeType",
        typeOfPayee === "Custom"
          ? customPayeeType
          : ""
      );

      data.append(
        "modeOfPayment",
        modeOfPayment
      );

      data.append(
        "towards",
        towards
      );

      data.append(
        "payeePan",
        payeePan
      );

      data.append(
        "tds",
        tds
      );

      data.append(
        "allowDuplicate",
        "false"
      );

      if (
        editing &&
        removeExistingAttachment
      ) {
        data.append(
          "removeAttachment",
          "true"
        );
      }

      if (attachment) {
        data.append(
          "attachment",
          attachment
        );
      }

      const response =
        await fetch(url, {
          method: editing
            ? "PUT"
            : "POST",
          body: data,
        });

      const result =
        await response.json();

      if (
        response.status === 409 &&
        result.duplicate
      ) {
        setDuplicate(
          result.duplicate
        );

        setError(
          result.message ||
            "A similar voucher exists."
        );

        return;
      }

      if (!response.ok) {
        setError(
          result.message ||
            "Unable to save voucher."
        );

        return;
      }

      const voucherId =
        Number(
          result.voucher
            .voucher_id
        );

      setSuccess(
        `Voucher #${voucherId} ${
          editing
            ? "updated"
            : "saved"
        } successfully.`
      );

      if (downloadPdf) {
        window.open(
          `/api/vouchers/${voucherId}/pdf`,
          "_blank"
        );
      }

      if (
        saveAndNew &&
        !editing
      ) {
        setPayee("");
        setAmount("");
        setAmountInWords("");
        setCustomPayeeType("");
        setTowards("");
        setPayeePan("");
        setTds("");

        removeNewAttachment();

        return;
      }

      setTimeout(() => {
        router.push(
          "/vouchers"
        );

        router.refresh();
      }, 500);
    } catch {
      setError(
        "Unable to connect to the server."
      );
    } finally {
      setSaving(false);
    }
  }

  async function forceSave() {
    if (!duplicate) return;

    setSaving(true);
    setError("");

    try {
      const data =
        new FormData();

      data.append(
        "voucherDate",
        voucherDate
      );

      data.append(
        "payee",
        payee
      );

      data.append(
        "amount",
        amount
      );

      data.append(
        "amountInWords",
        amountInWords
      );

      data.append(
        "typeOfPayee",
        typeOfPayee
      );

      data.append(
        "customPayeeType",
        typeOfPayee === "Custom"
          ? customPayeeType
          : ""
      );

      data.append(
        "modeOfPayment",
        modeOfPayment
      );

      data.append(
        "towards",
        towards
      );

      data.append(
        "payeePan",
        payeePan
      );

      data.append(
        "tds",
        tds
      );

      data.append(
        "allowDuplicate",
        "true"
      );

      if (
        editing &&
        removeExistingAttachment
      ) {
        data.append(
          "removeAttachment",
          "true"
        );
      }

      if (attachment) {
        data.append(
          "attachment",
          attachment
        );
      }

      const response =
        await fetch(
          editing
            ? `/api/vouchers/${initial?.voucher_id}`
            : "/api/vouchers",
          {
            method: editing
              ? "PUT"
              : "POST",
            body: data,
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.message ||
            "Unable to save voucher."
        );

        return;
      }

      setDuplicate(null);

      const id =
        Number(
          result.voucher
            .voucher_id
        );

      setSuccess(
        `Voucher #${id} saved successfully.`
      );

      setTimeout(() => {
        router.push(
          "/vouchers"
        );

        router.refresh();
      }, 500);
    } finally {
      setSaving(false);
    }
  }

  const payeeType =
    typeOfPayee === "Custom"
      ? customPayeeType ||
        "Custom"
      : typeOfPayee;

  const displayPaidTo =
    payee
      ? `${payee}${
          payeeType
            ? ` (${payeeType})`
            : ""
        }`
      : "—";

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
                {editing
                  ? "Edit Voucher"
                  : "Create Voucher"}
              </p>
            </div>
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">
              {user.name}
            </p>

            <p className="text-xs text-slate-500">
              @{user.username}
            </p>
          </div>
        </div>
      </header>

      <div className="lux-shell py-8 sm:py-10">
        <button
          type="button"
          onClick={() =>
            router.push(
              "/vouchers"
            )
          }
          className="mb-6 text-sm font-semibold text-slate-500 hover:text-[#101827]"
        >
          ← Back to Vouchers
        </button>

        <div className="grid gap-7 lg:grid-cols-[1fr_360px]">
          <form
            onSubmit={handleSubmit}
            className="lux-card overflow-visible"
          >
            <div className="border-b border-[#e6e0d5] px-6 py-6 sm:px-8">
              <p className="text-[11px] font-semibold uppercase tracking-[.28em] text-[#b8955a]">
                {editing
                  ? "Update payment record"
                  : "New payment record"}
              </p>

              <h1 className="lux-serif mt-2 text-3xl">
                Voucher Details
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Required fields are marked with an
                asterisk.
              </p>
            </div>

            <div className="space-y-8 p-6 sm:p-8">
              {/* =================================================
                  SECTION 01
                  ================================================= */}

              <section>
                <div className="mb-5 flex items-center gap-3">
                  <span className="text-xs font-bold text-[#b8955a]">
                    01
                  </span>

                  <h2 className="lux-serif text-xl">
                    Voucher Information
                  </h2>

                  <div className="gold-line flex-1" />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    {label(
                      "Date",
                      true
                    )}

                    <input
                      className="lux-input"
                      type="date"
                      value={
                        voucherDate
                      }
                      onChange={(event) =>
                        setVoucherDate(
                          event.target
                            .value
                        )
                      }
                      required
                    />
                  </div>

                  <div>
                    {label(
                      "Paid To",
                      true
                    )}

                    <PayeeSelect
                      value={payee}
                      onChange={
                        setPayee
                      }
                    />
                  </div>

                  <div>
                    {label(
                      "Type of Payee",
                      true
                    )}

                    <SearchableSelect
                      value={
                        typeOfPayee
                      }
                      options={[
                        ...PAYEE_TYPES,
                      ]}
                      placeholder="Select type"
                      searchPlaceholder="Search payee type…"
                      onChange={(
                        value
                      ) => {
                        setTypeOfPayee(
                          value
                        );

                        if (
                          value !==
                          "Custom"
                        ) {
                          setCustomPayeeType(
                            ""
                          );
                        }
                      }}
                    />
                  </div>

                  {typeOfPayee ===
                    "Custom" && (
                    <div>
                      {label(
                        "Custom Payee Type",
                        true
                      )}

                      <input
                        className="lux-input"
                        value={
                          customPayeeType
                        }
                        onChange={(
                          event
                        ) =>
                          setCustomPayeeType(
                            event.target
                              .value
                          )
                        }
                        placeholder="Enter custom type"
                        required
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* =================================================
                  SECTION 02
                  ================================================= */}

              <section>
                <div className="mb-5 flex items-center gap-3">
                  <span className="text-xs font-bold text-[#b8955a]">
                    02
                  </span>

                  <h2 className="lux-serif text-xl">
                    Payment Details
                  </h2>

                  <div className="gold-line flex-1" />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    {label(
                      "Amount",
                      true
                    )}

                    <input
                      className="lux-input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(event) => {
                        const value =
                          event.target
                            .value;

                        setAmount(
                          value
                        );

                        setAmountInWords(
                          value &&
                            Number(
                              value
                            ) > 0
                            ? amountToWords(
                                Number(
                                  value
                                )
                              )
                            : ""
                        );
                      }}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    {label(
                      "Amount in Words"
                    )}

                    <input
                      className="lux-input bg-[#faf7f0]"
                      value={
                        amountInWords
                      }
                      readOnly
                    />
                  </div>

                  <div>
                    {label(
                      "Mode of Payment",
                      true
                    )}

                    <SearchableSelect
                      value={
                        modeOfPayment
                      }
                      options={[
                        ...PAYMENT_MODES,
                      ]}
                      placeholder="Select payment mode"
                      searchPlaceholder="Search payment mode…"
                      onChange={
                        setModeOfPayment
                      }
                    />
                  </div>

                  <div>
                    {label(
                      "Payee PAN No.",
                      false,
                      true
                    )}

                    <input
                      className="lux-input uppercase"
                      value={
                        payeePan
                      }
                      onChange={(
                        event
                      ) =>
                        setPayeePan(
                          event.target
                            .value
                        )
                      }
                      placeholder="PAN number"
                    />
                  </div>

                  <div className="md:col-span-2">
                    {label(
                      "Towards",
                      true
                    )}

                    <textarea
                      className="lux-input resize-none"
                      rows={3}
                      value={
                        towards
                      }
                      onChange={(
                        event
                      ) =>
                        setTowards(
                          event.target
                            .value
                        )
                      }
                      placeholder="What is this payment towards?"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    {label(
                      "TDS",
                      false,
                      true
                    )}

                    <input
                      className="lux-input"
                      value={tds}
                      onChange={(
                        event
                      ) =>
                        setTds(
                          event.target
                            .value
                        )
                      }
                      placeholder="TDS, if applicable"
                    />
                  </div>
                </div>
              </section>

              {/* =================================================
                  SECTION 03 — ATTACHMENT
                  ================================================= */}

              <section>
                <div className="mb-5 flex items-center gap-3">
                  <span className="text-xs font-bold text-[#b8955a]">
                    03
                  </span>

                  <h2 className="lux-serif text-xl">
                    Transaction Attachment
                  </h2>

                  <div className="gold-line flex-1" />
                </div>

                <p className="mb-4 text-sm text-slate-500">
                  Optional. Attach the UPI transaction
                  screenshot or payment proof.
                </p>

                {/* Existing attachment */}
                {hasExistingAttachment &&
                  !attachment && (
                    <div className="overflow-hidden rounded-2xl border border-[#e6e0d5] bg-[#fbf8f1]">
                      <div className="flex items-center justify-between border-b border-[#e6e0d5] px-4 py-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Current attachment
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {initial?.attachment_file_name ||
                              "Transaction screenshot"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={
                            removeExisting
                          }
                          className="text-xs font-semibold text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="p-4">
                        <img
                          src={`/api/vouchers/${initial?.voucher_id}/attachment`}
                          alt="Current transaction attachment"
                          className="max-h-72 w-full rounded-xl border border-[#e6e0d5] bg-white object-contain"
                        />
                      </div>
                    </div>
                  )}

                {/* Existing attachment removed */}
                {editing &&
                  removeExistingAttachment &&
                  !attachment && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      The existing attachment will be
                      removed when you save this voucher.
                      <button
                        type="button"
                        onClick={
                          restoreExisting
                        }
                        className="ml-2 font-semibold underline"
                      >
                        Undo
                      </button>
                    </div>
                  )}

                {/* New attachment preview */}
                {attachment &&
                  attachmentPreview && (
                    <div className="mb-4 overflow-hidden rounded-2xl border border-[#e6e0d5] bg-[#fbf8f1]">
                      <div className="flex items-center justify-between border-b border-[#e6e0d5] px-4 py-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            New attachment
                          </p>

                          <p className="mt-1 max-w-[240px] truncate text-sm font-medium text-slate-800">
                            {
                              attachment.name
                            }
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={
                            removeNewAttachment
                          }
                          className="text-xs font-semibold text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="p-4">
                        <img
                          src={
                            attachmentPreview
                          }
                          alt="Selected transaction attachment"
                          className="max-h-72 w-full rounded-xl border border-[#e6e0d5] bg-white object-contain"
                        />
                      </div>
                    </div>
                  )}

                {/* Upload control */}
                {!attachment && (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfc5b5] bg-[#fbf8f1] px-6 py-8 text-center transition hover:border-[#b8955a] hover:bg-[#f8f3e9]">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-[#101827] text-[#d8c29a]">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 16V4" />
                        <path d="m7 9 5-5 5 5" />
                        <path d="M5 20h14" />
                      </svg>
                    </div>

                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      Upload transaction screenshot
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      JPG, JPEG or PNG · Maximum 3 MB
                    </p>

                    <span className="mt-4 rounded-lg bg-[#101827] px-4 py-2 text-xs font-semibold text-white">
                      Choose Image
                    </span>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      className="hidden"
                      onChange={(
                        event
                      ) =>
                        handleAttachmentChange(
                          event.target
                            .files?.[0] ||
                            null
                        )
                      }
                    />
                  </label>
                )}
              </section>

              {(error ||
                success) && (
                <div>
                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                      {success}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#e6e0d5] bg-[#fbf8f1] px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/vouchers"
                  )
                }
                className="lux-secondary"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                name="submitAction"
                value="save"
                className="lux-secondary"
              >
                {saving
                  ? "Saving…"
                  : editing
                  ? "Save Changes"
                  : "Save Voucher"}
              </button>

              {!editing && (
                <button
                  type="submit"
                  disabled={saving}
                  name="submitAction"
                  value="save-new"
                  className="lux-secondary"
                >
                  {saving
                    ? "Saving…"
                    : "Save & New"}
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                name="submitAction"
                value="download"
                className="lux-primary"
              >
                {saving
                  ? "Saving…"
                  : "Save & Download PDF"}
              </button>
            </div>
          </form>

          {/* Live summary */}
          <aside className="self-start lg:sticky lg:top-24">
            <div className="lux-card p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[.28em] text-[#b8955a]">
                Live summary
              </p>

              <h2 className="lux-serif mt-2 text-2xl">
                Voucher Preview
              </h2>

              <div className="gold-line mt-5" />

              <div className="mt-5 space-y-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    Date
                  </p>

                  <p className="mt-1 font-semibold">
                    {voucherDate
                      ? `${voucherDate.slice(
                          8,
                          10
                        )}-${voucherDate.slice(
                          5,
                          7
                        )}-${voucherDate.slice(
                          0,
                          4
                        )}`
                      : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    Paid To
                  </p>

                  <p className="mt-1 font-semibold">
                    {displayPaidTo}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    Amount
                  </p>

                  <p className="lux-serif mt-1 text-2xl">
                    {amount
                      ? `₹ ${Number(
                          amount
                        ).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                          }
                        )}`
                      : "₹ —"}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {amountInWords ||
                      "Amount in words will appear here."}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    Payment Mode
                  </p>

                  <p className="mt-1 font-semibold">
                    {modeOfPayment ||
                      "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    Towards
                  </p>

                  <p className="mt-1 leading-6 text-slate-700">
                    {towards ||
                      "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    Attachment
                  </p>

                  <p className="mt-1 font-semibold">
                    {attachment
                      ? "New image selected"
                      : hasExistingAttachment
                      ? "Attached"
                      : "None"}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {duplicate && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-[#101827]/45 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#e6e0d5] bg-[#fffdf8] p-7 shadow-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[.28em] text-[#b8955a]">
              Possible duplicate
            </p>

            <h2 className="lux-serif mt-2 text-2xl">
              Similar voucher found
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Voucher #
              {
                duplicate.voucher_id
              }{" "}
              has the same date, payee,
              amount and towards details.
              You can still save this voucher
              if it is intentional.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="lux-secondary"
                onClick={() =>
                  setDuplicate(
                    null
                  )
                }
              >
                Cancel
              </button>

              <button
                className="lux-primary"
                onClick={
                  forceSave
                }
              >
                Save Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}