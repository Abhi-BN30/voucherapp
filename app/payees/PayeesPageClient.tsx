"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  userId: number;
  username: string;
  name: string;
};

type Payee = {
  payee_id: number;
  payee_name: string;
};

type Props = {
  user: User;
};

export default function PayeesPageClient({ user }: Props) {
  const router = useRouter();

  const [payees, setPayees] = useState<Payee[]>([]);
  const [search, setSearch] = useState("");
  const [payeeName, setPayeeName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadPayees() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/payees");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to load payees."
        );
      }

      setPayees(data.payees || []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load payees."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayees();
  }, []);

  async function addPayee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = payeeName.trim();

    if (!trimmedName) {
      setError("Please enter a payee name.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/payees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payeeName: trimmedName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to add payee."
        );
      }

      setPayeeName("");

      setSuccess(
        `${data.payee.payee_name} is now registered as payee #${data.payee.payee_id}.`
      );

      await loadPayees();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to add payee."
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredPayees = payees.filter((payee) =>
    payee.payee_name
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

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

              <p className="lux-serif text-lg text-[#101827]">
                Payee Registry
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
              onClick={() => router.push("/dashboard")}
              className="lux-secondary px-4 py-2.5 text-sm"
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
              Master registry
            </p>

            <h1 className="lux-serif mt-2 text-4xl">
              Payees
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Maintain the list of payees available while creating vouchers.
            </p>
          </div>

          <button
            onClick={() => router.push("/vouchers/create")}
            className="lux-primary"
          >
            + Create Voucher
          </button>
        </div>

        {/* Add Payee */}
        <form
          onSubmit={addPayee}
          className="lux-card mt-8 p-6 sm:p-7"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[.28em] text-[#b8955a]">
            Add Payee
          </p>

          <h2 className="lux-serif mt-2 text-2xl">
            Register a new payee
          </h2>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              className="lux-input"
              value={payeeName}
              onChange={(event) =>
                setPayeeName(event.target.value)
              }
              placeholder="Enter payee name"
              maxLength={150}
            />

            <button
              type="submit"
              disabled={saving}
              className="lux-primary shrink-0"
            >
              {saving ? "Adding…" : "Add Payee"}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}
        </form>

        {/* Registry */}
        <div className="lux-card mt-6 overflow-hidden">
          <div className="border-b border-[#e6e0d5] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[.24em] text-[#b8955a]">
                  Registered Payees
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {payees.length} registered payee
                  {payees.length === 1 ? "" : "s"}
                </p>
              </div>

              <input
                className="lux-input w-full sm:max-w-xs"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search payees…"
              />
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              Loading payees…
            </div>
          ) : !filteredPayees.length ? (
            <div className="px-6 py-16 text-center">
              <p className="lux-serif text-2xl">
                No payees found
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Add a payee above to begin building your registry.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="border-b border-[#e6e0d5] bg-[#fbf8f1]">
                  <tr>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Payee Number
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Payee Name
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eee9df]">
                  {filteredPayees.map((payee) => (
                    <tr
                      key={payee.payee_id}
                      className="hover:bg-[#fffdf8]"
                    >
                      <td className="px-5 py-4 font-semibold text-[#101827]">
                        #{payee.payee_id}
                      </td>

                      <td className="px-5 py-4 font-medium">
                        {payee.payee_name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}