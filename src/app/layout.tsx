import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KosanKu - Sistem Manajemen Kosan",
  description: "Sistem Manajemen Informasi Sewa Kosan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
