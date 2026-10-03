import type {
  Metadata,
  Viewport,
} from "next";

import "./globals.css";

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import MobileBottomNav from "@/components/MobileBottomNav";

export const metadata: Metadata = {
  title: "Payment Voucher",
  description:
    "Payment voucher management system",
  applicationName: "Payment Voucher",

  manifest:
    "/manifest.webmanifest",

  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vouchers",
  },
};

export const viewport: Viewport = {
  themeColor: "#101827",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}

        <MobileBottomNav />

        <ServiceWorkerRegister />
      </body>
    </html>
  );
}