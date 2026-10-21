import type { Metadata } from "next";
import { appFonts } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "IOP — Io Preventivo",
  description:
    "Genera preventivi di ristrutturazione edilizia in pochi minuti, dal capitolato o da zero.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${appFonts} h-full`}>
      <body className="min-h-full bg-canvas text-body antialiased">
        {children}
      </body>
    </html>
  );
}
