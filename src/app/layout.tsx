import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

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
    <html lang="it" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-canvas text-body antialiased">
        {children}
      </body>
    </html>
  );
}
