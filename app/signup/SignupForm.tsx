"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!/^[a-z0-9._-]{3,40}$/i.test(username.trim())) {
      setError("Username must be 3–40 characters and use only letters, numbers, dot, underscore or hyphen.");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits.");
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username,
          pin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to create account.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-5 py-10"
      style={{
        background:
          "radial-gradient(circle at 20% 10%, rgba(184,149,90,.16), transparent 35%), #101827",
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-[#d8c29a]/60 bg-white/5 font-serif text-lg font-bold text-[#d8c29a]">
            PV
          </div>
          <p className="text-[11px] uppercase tracking-[.32em] text-[#d8c29a]">
            Payment Voucher
          </p>
          <h1 className="lux-serif mt-3 text-4xl">Create Account</h1>
          <p className="mt-3 text-sm text-slate-300">
            Set up your access to create and manage vouchers.
          </p>
        </div>

        <div className="lux-card p-7 sm:p-8">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Full Name
              </label>
              <input
                className="lux-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Username
              </label>
              <input
                className="lux-input"
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                placeholder="Choose a username"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                4-digit PIN
              </label>
              <input
                className="lux-input tracking-[.5em]"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                type="password"
                maxLength={4}
                placeholder="••••"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Confirm PIN
              </label>
              <input
                className="lux-input tracking-[.5em]"
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                type="password"
                maxLength={4}
                placeholder="••••"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button className="lux-primary w-full py-3.5" disabled={loading}>
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/")}
              className="font-semibold text-[#8b6b38] hover:underline"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
