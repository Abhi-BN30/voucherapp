"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export default function SearchableSelect({
  value,
  options,
  placeholder = "Select an option",
  searchPlaceholder = "Search…",
  onChange,
  disabled = false,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const filtered = options.filter((option) =>
    option.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="lux-input flex w-full items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value ? "text-[#18202d]" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <span className={`ml-3 text-xs text-[#b8955a] transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-[#e6e0d5] bg-[#fffdf8] shadow-[0_18px_45px_rgba(16,24,39,.14)]">
          <div className="border-b border-[#eee9df] p-2">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setOpen(false);
                  setQuery("");
                }
              }}
              placeholder={searchPlaceholder}
              className="lux-input !rounded-xl !py-2.5 text-sm"
            />
          </div>

          <div className="max-h-60 overflow-y-auto p-1.5" role="listbox">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-500">
                No matches found.
              </div>
            ) : (
              filtered.map((option) => {
                const active = option === value;

                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      active
                        ? "bg-[#f4ead7] font-semibold text-[#101827]"
                        : "text-slate-700 hover:bg-[#fbf7ee]"
                    }`}
                  >
                    <span>{option}</span>
                    {active && (
                      <span className="text-[#b8955a]">✓</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
