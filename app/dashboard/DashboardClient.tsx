"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { formatVoucherNumber } from "@/lib/voucher-utils";

type Props = {
  user: {
    userId: number;
    username: string;
    name: string;
  };
};

type Stats = {
  summary: {
    voucher_count: number;
    total_amount: string;
    largest_amount: string;
  };
  modes: any[];
  types: any[];
  monthly: any[];
  recent: any[];
};

export default function DashboardClient({
  user,
}: Props) {
  const r = useRouter();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] =
    useState<Stats | null>(null);
  const [loading, setLoading] =
    useState(true);

  async function load() {
    setLoading(true);

    const p = new URLSearchParams();

    if (from) {
      p.set("from", from);
    }

    if (to) {
      p.set("to", to);
    }

    const x = await fetch(
      `/api/dashboard?${p}`
    );

    if (x.ok) {
      setData(await x.json());
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const maxMonth = useMemo(
    () =>
      Math.max(
        1,
        ...(data?.monthly || []).map(
          (x) => Number(x.amount)
        )
      ),
    [data]
  );

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    r.push("/");
    r.refresh();
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
                Management System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="lux-secondary"
              onClick={() =>
                r.push("/payees")
              }
            >
              Payee Registry
            </button>

            <button
              className="lux-secondary"
              onClick={logout}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="lux-shell py-8 sm:py-10">
        {/* Welcome section */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.3em] text-[#b8955a]">
            Project finance workspace
          </p>

          <h1 className="lux-serif mt-3 text-4xl sm:text-5xl">
            Good morning, {user.name}
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            #99 SESHADRIPURA 2ND MAIN ROAD PROJECT
          </p>
        </div>

        {/* Compact horizontal date filter */}
        <div className="dashboard-range mt-6">
          <div className="dashboard-range-field">
            <label>From</label>

            <input
              className="lux-input"
              type="date"
              value={from}
              onChange={(e) =>
                setFrom(e.target.value)
              }
            />
          </div>

          <span className="dashboard-range-arrow">
            →
          </span>

          <div className="dashboard-range-field">
            <label>To</label>

            <input
              className="lux-input"
              type="date"
              value={to}
              onChange={(e) =>
                setTo(e.target.value)
              }
            />
          </div>

          <button
            className="lux-primary dashboard-range-button"
            onClick={load}
          >
            Apply Range
          </button>
        </div>

        {/* Summary */}
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              "Total Vouchers",
              data?.summary
                .voucher_count ?? 0,
            ],
            [
              "Total Amount",
              `₹ ${Number(
                data?.summary
                  .total_amount || 0
              ).toLocaleString(
                "en-IN",
                {
                  minimumFractionDigits: 2,
                }
              )}`,
            ],
            [
              "Largest Payment",
              `₹ ${Number(
                data?.summary
                  .largest_amount || 0
              ).toLocaleString(
                "en-IN",
                {
                  minimumFractionDigits: 2,
                }
              )}`,
            ],
            [
              "Payment Modes",
              data?.modes.length ?? 0,
            ],
          ].map(([a, b]) => (
            <div
              key={String(a)}
              className="lux-card p-5"
            >
              <p className="text-xs uppercase tracking-wider text-slate-400">
                {a}
              </p>

              <p className="metric-number mt-2 text-3xl">
                {loading ? "—" : b}
              </p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          <button
            onClick={() =>
              r.push(
                "/vouchers/create"
              )
            }
            className="lux-card group p-7 text-left"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[.24em] text-[#b8955a]">
              Quick action
            </p>

            <h2 className="lux-serif mt-3 text-2xl">
              Create Voucher
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Record a new project
              payment.
            </p>

            <p className="mt-5 font-semibold">
              Open creation form →
            </p>
          </button>

          <button
            onClick={() =>
              r.push("/vouchers")
            }
            className="lux-card group p-7 text-left"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[.24em] text-[#b8955a]">
              Register
            </p>

            <h2 className="lux-serif mt-3 text-2xl">
              View All Vouchers
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Search, filter, export,
              preview and manage
              payment records.
            </p>

            <p className="mt-5 font-semibold">
              Open voucher register →
            </p>
          </button>

          <button
            onClick={() =>
              r.push("/payees")
            }
            className="lux-card group p-7 text-left"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[.24em] text-[#b8955a]">
              Registry
            </p>

            <h2 className="lux-serif mt-3 text-2xl">
              Payee Registry
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Manage payees and review
              payment history.
            </p>

            <p className="mt-5 font-semibold">
              Open registry →
            </p>
          </button>
        </div>

        {/* Expense type + monthly */}
        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          <div className="lux-card p-6">
            <p className="text-[11px] uppercase tracking-[.28em] text-[#b8955a]">
              Expense type
            </p>

            <h2 className="lux-serif mt-2 text-2xl">
              Spend by type
            </h2>

            <div className="mt-6 space-y-4">
              {(data?.types || [])
                .slice(0, 8)
                .map((x: any) => (
                  <div
                    key={`${x.type}-${x.custom_type}`}
                  >
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold">
                        {x.type ===
                        "Custom"
                          ? x.custom_type ||
                            "Custom"
                          : x.type}
                      </span>

                      <span>
                        ₹{" "}
                        {Number(
                          x.amount
                        ).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 0,
                          }
                        )}
                      </span>
                    </div>

                    <div className="mt-2 h-2 rounded-full bg-[#eee9df]">
                      <div
                        className="h-2 rounded-full bg-[#b8955a]"
                        style={{
                          width: `${Math.min(
                            100,
                            (Number(
                              x.amount
                            ) /
                              Math.max(
                                1,
                                Number(
                                  data
                                    ?.summary
                                    .total_amount
                                )
                              )) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="lux-card p-6">
            <p className="text-[11px] uppercase tracking-[.28em] text-[#b8955a]">
              Monthly expenditure
            </p>

            <h2 className="lux-serif mt-2 text-2xl">
              Spending trend
            </h2>

            <div className="mt-6 space-y-4">
              {(data?.monthly || [])
                .slice(-8)
                .map((x) => (
                  <div key={x.month}>
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>
                        {x.month}
                      </span>

                      <span>
                        ₹{" "}
                        {Number(
                          x.amount
                        ).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 0,
                          }
                        )}
                      </span>
                    </div>

                    <div className="h-3 rounded-full bg-[#eee9df]">
                      <div
                        className="h-3 rounded-full bg-[#b8955a]"
                        style={{
                          width: `${Math.max(
                            3,
                            (Number(
                              x.amount
                            ) /
                              maxMonth) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="lux-card p-6">
            <p className="text-[11px] uppercase tracking-[.28em] text-[#b8955a]">
              Payment mode
            </p>

            <h2 className="lux-serif mt-2 text-2xl">
              Distribution
            </h2>

            <div className="mt-6 space-y-4">
              {(data?.modes || []).map(
                (x) => (
                  <div key={x.mode}>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold">
                        {x.mode}
                      </span>

                      <span>
                        ₹{" "}
                        {Number(
                          x.amount
                        ).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 0,
                          }
                        )}
                      </span>
                    </div>

                    <div className="mt-2 h-2 rounded-full bg-[#eee9df]">
                      <div
                        className="h-2 rounded-full bg-[#101827]"
                        style={{
                          width: `${Math.min(
                            100,
                            (Number(
                              x.amount
                            ) /
                              Math.max(
                                1,
                                Number(
                                  data
                                    ?.summary
                                    .total_amount
                                )
                              )) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Recent vouchers */}
        <div className="lux-card mt-5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e6e0d5] px-6 py-5">
            <div>
              <p className="text-[11px] uppercase tracking-[.28em] text-[#b8955a]">
                Recent
              </p>

              <h2 className="lux-serif mt-1 text-2xl">
                Latest vouchers
              </h2>
            </div>

            <button
              className="lux-link"
              onClick={() =>
                r.push("/vouchers")
              }
            >
              View all →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-[#fbf8f1]">
                <tr>
                  <th className="px-5 py-4">
                    Voucher
                  </th>

                  <th className="px-5 py-4">
                    Date
                  </th>

                  <th className="px-5 py-4">
                    Paid To
                  </th>

                  <th className="px-5 py-4">
                    Amount
                  </th>

                  <th className="px-5 py-4">
                    Mode
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#eee9df]">
                {(data?.recent || []).map(
                  (x) => (
                    <tr
                      key={
                        x.voucher_id
                      }
                    >
                      <td className="px-5 py-4 font-semibold">
                        {formatVoucherNumber(
                          x.voucher_id,
                          x.voucher_date
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {String(
                          x.voucher_date
                        )
                          .slice(0, 10)
                          .split("-")
                          .reverse()
                          .join("-")}
                      </td>

                      <td className="px-5 py-4">
                        {x.payee}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        ₹{" "}
                        {Number(
                          x.amount
                        ).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                          }
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {
                          x.mode_of_payment
                        }
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}