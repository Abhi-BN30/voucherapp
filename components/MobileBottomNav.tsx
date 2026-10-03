"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

function HomeIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9 21v-7h6v7" />
    </svg>
  );
}

function VoucherIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 8h7" />
      <path d="M8.5 12h7" />
      <path d="M8.5 16h4" />
    </svg>
  );
}

function PayeeIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.7-3.6 3-5.5 7-5.5s6.3 1.9 7 5.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M21 19V5a2 2 0 0 0-2-2h-5" />
    </svg>
  );
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [moreOpen, setMoreOpen] = useState(false);

  const moreRef = useRef<HTMLDivElement>(null);

  const hidden =
    pathname === "/" ||
    pathname === "/signup";

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        moreRef.current &&
        !moreRef.current.contains(
          event.target as Node
        )
      ) {
        setMoreOpen(false);
      }
    }

    if (moreOpen) {
      document.addEventListener(
        "mousedown",
        handleOutsideClick
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [moreOpen]);

  if (hidden) {
    return null;
  }

  const isHome =
    pathname === "/dashboard";

  const isVouchers =
    pathname === "/vouchers" ||
    pathname.startsWith("/vouchers/");

  const isPayees =
    pathname === "/payees" ||
    pathname.startsWith("/payees/");

  async function logout() {
    setMoreOpen(false);

    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.push("/");
    router.refresh();
  }

  return (
    <>
      {moreOpen && (
        <div
          ref={moreRef}
          className="mobile-more-menu"
        >
          <div className="mobile-more-menu-title">
            Account
          </div>

          <button
            type="button"
            onClick={logout}
            className="mobile-more-menu-item danger"
          >
            <SignOutIcon />
            <span>Sign out</span>
          </button>
        </div>
      )}

      <nav
        className="mobile-bottom-nav"
        aria-label="Mobile navigation"
      >
        <div className="mobile-bottom-nav-inner">
          {/* Home */}
          <button
            type="button"
            className={`mobile-nav-item ${
              isHome ? "active" : ""
            }`}
            onClick={() =>
              router.push("/dashboard")
            }
            aria-label="Dashboard"
          >
            <HomeIcon />
            <span>Home</span>
          </button>

          {/* Vouchers */}
          <button
            type="button"
            className={`mobile-nav-item ${
              isVouchers ? "active" : ""
            }`}
            onClick={() =>
              router.push("/vouchers")
            }
            aria-label="Vouchers"
          >
            <VoucherIcon />
            <span>Vouchers</span>
          </button>

          {/* Create */}
          <button
            type="button"
            className="mobile-nav-create"
            onClick={() =>
              router.push(
                "/vouchers/create"
              )
            }
            aria-label="Create voucher"
          >
            <span className="mobile-nav-create-icon">
              <PlusIcon />
            </span>

            <span className="mobile-nav-create-label">
              Create
            </span>
          </button>

          {/* Payees */}
          <button
            type="button"
            className={`mobile-nav-item ${
              isPayees ? "active" : ""
            }`}
            onClick={() =>
              router.push("/payees")
            }
            aria-label="Payees"
          >
            <PayeeIcon />
            <span>Payees</span>
          </button>

          {/* More */}
          <button
            type="button"
            className={`mobile-nav-item ${
              moreOpen ? "active" : ""
            }`}
            onClick={() =>
              setMoreOpen((value) => !value)
            }
            aria-label="More"
            aria-expanded={moreOpen}
          >
            <MoreIcon />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}