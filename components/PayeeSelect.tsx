"use client";

import { useEffect, useRef, useState } from "react";

type Payee = {
  payee_id: number;
  payee_name: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function PayeeSelect({
  value,
  onChange,
  disabled = false,
}: Props) {
  const [payees, setPayees] = useState<Payee[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [saving, setSaving] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);

  async function loadPayees() {
    try {
      const response = await fetch("/api/payees");

      if (!response.ok) return;

      const data = await response.json();

      setPayees(data.payees || []);
    } catch {
      // Keep the field usable even if the registry
      // temporarily cannot be loaded.
    }
  }

  useEffect(() => {
    loadPayees();
  }, []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutside
      );
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = payees.filter((payee) =>
    payee.payee_name
      .toLowerCase()
      .includes(normalizedQuery)
  );

  const exactMatch = payees.some(
    (payee) =>
      payee.payee_name.toLowerCase() ===
      normalizedQuery
  );

  async function registerPayee(name: string) {
    const trimmedName = name.trim();

    if (!trimmedName) return;

    /*
     * If it already exists, simply use the
     * canonical stored name.
     */
    const existing = payees.find(
      (payee) =>
        payee.payee_name.toLowerCase() ===
        trimmedName.toLowerCase()
    );

    if (existing) {
      onChange(existing.payee_name);
      setQuery(existing.payee_name);
      setOpen(false);
      return;
    }

    setSaving(true);

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
        return;
      }

      const registered = data.payee as Payee;

      setPayees((current) => {
        const alreadyThere = current.some(
          (item) =>
            item.payee_id === registered.payee_id
        );

        return alreadyThere
          ? current
          : [...current, registered].sort((a, b) =>
              a.payee_name.localeCompare(
                b.payee_name
              )
            );
      });

      onChange(registered.payee_name);
      setQuery(registered.payee_name);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          className="lux-input pr-10"
          value={query}
          disabled={disabled || saving}
          onChange={(event) => {
            const next = event.target.value;

            setQuery(next);
            onChange(next);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            /*
             * Register a typed payee automatically when
             * the user leaves the field.
             */
            if (query.trim()) {
              void registerPayee(query);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }

            if (
              event.key === "Enter" &&
              query.trim() &&
              !exactMatch
            ) {
              event.preventDefault();
              void registerPayee(query);
            }
          }}
          placeholder="Search or type payee name"
          required
        />

        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#b8955a]">
          {saving ? "…" : "▾"}
        </span>
      </div>

      {open && !disabled && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-[#e6e0d5] bg-[#fffdf8] shadow-[0_18px_45px_rgba(16,24,39,.14)]">
          <div className="max-h-64 overflow-y-auto p-1.5">
            {filtered.map((payee) => (
              <button
                key={payee.payee_id}
                type="button"
                onMouseDown={(event) =>
                  event.preventDefault()
                }
                onClick={() => {
                  onChange(payee.payee_name);
                  setQuery(payee.payee_name);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-[#fbf7ee]"
              >
                <span>{payee.payee_name}</span>

                <span className="text-[11px] text-slate-400">
                  #{payee.payee_id}
                </span>
              </button>
            ))}

            {query.trim() && !exactMatch && (
              <button
                type="button"
                onMouseDown={(event) =>
                  event.preventDefault()
                }
                onClick={() =>
                  void registerPayee(query)
                }
                className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-[#eee9df] px-3 py-3 text-left text-sm font-semibold text-[#101827] hover:bg-[#f4ead7]"
              >
                <span className="text-[#b8955a]">
                  +
                </span>

                <span>
                  Add "{query.trim()}"
                </span>
              </button>
            )}

            {!filtered.length &&
              !query.trim() && (
                <div className="px-3 py-4 text-center text-sm text-slate-500">
                  No payees registered yet.
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}