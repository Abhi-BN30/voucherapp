import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",

    name:
      "Payment Voucher Management System",

    short_name: "Vouchers",

    description:
      "Payment voucher management system",

    start_url: "/dashboard",

    scope: "/",

    display: "standalone",

    orientation: "portrait-primary",

    background_color: "#f7f4ee",

    theme_color: "#101827",

    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}