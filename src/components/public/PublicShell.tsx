"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Beranda" },
  { href: "/#fasilitas", label: "Fasilitas" },
  { href: "/kamar-tersedia", label: "Kamar" },
  { href: "/daftar", label: "Daftar" },
];

export function PublicShell({
  children,
  projectName,
}: {
  children: React.ReactNode;
  projectName?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const brand = projectName || "KosanKu";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="rounded-lg bg-teal-600 p-2">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-slate-900">{brand}</p>
              <p className="text-[11px] text-slate-500">Hunian nyaman untuk Anda</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href.split("#")[0]) && item.href !== "/";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/login"
              className="ml-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Masuk
            </Link>
          </nav>

          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-1 rounded-lg bg-slate-900 px-3 py-2.5 text-center text-sm font-semibold text-white"
              >
                Masuk
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-semibold text-slate-900">{brand}</p>
            <p className="text-sm text-slate-500">Dikelola dengan KosanKu</p>
          </div>
          <div className="flex gap-4 text-sm text-slate-600">
            <Link href="/kamar-tersedia" className="hover:text-teal-700">
              Lihat kamar
            </Link>
            <Link href="/daftar" className="hover:text-teal-700">
              Daftar
            </Link>
            <Link href="/login" className="hover:text-teal-700">
              Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
