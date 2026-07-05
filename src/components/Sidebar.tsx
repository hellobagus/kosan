"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  DoorOpen,
  Users,
  Wallet,
  FileText,
  UserCog,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
  Menu,
  X,
  Zap,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Informasi Kamar",
    icon: DoorOpen,
    children: [
      { name: "Semua Kamar", href: "/kamar" },
      { name: "Input Kamar Baru", href: "/kamar/baru" },
      { name: "Kamar Terisi", href: "/kamar/terisi" },
      { name: "Kamar Kosong", href: "/kamar/kosong" },
    ],
  },
  {
    name: "Penghuni",
    icon: Users,
    children: [
      { name: "Penghuni Aktif", href: "/penghuni/aktif" },
      { name: "Reservasi", href: "/penghuni/reservasi" },
      { name: "Input Penghuni Baru", href: "/penghuni/baru" },
      { name: "Penghuni Selesai", href: "/penghuni/selesai" },
    ],
  },
  {
    name: "Keuangan",
    icon: Wallet,
    children: [
      { name: "Ringkasan", href: "/keuangan" },
      { name: "Pemasukan", href: "/keuangan/pemasukan" },
      { name: "Pengeluaran", href: "/keuangan/pengeluaran" },
    ],
  },
  {
    name: "Utilitas",
    icon: Zap,
    children: [
      { name: "Daftar Utility", href: "/utilitas" },
      { name: "Utility per Kamar", href: "/utilitas/kamar" },
      { name: "Tagihan Bulanan", href: "/utilitas/tagihan" },
    ],
  },
  {
    name: "Inventaris",
    icon: Package,
    children: [
      { name: "Ringkasan", href: "/inventaris" },
      { name: "Master Barang", href: "/inventaris/barang" },
      { name: "Template Kamar", href: "/inventaris/template" },
      { name: "Area Bersama", href: "/inventaris/area-bersama" },
      { name: "Pembelian", href: "/inventaris/pembelian" },
      { name: "Gudang", href: "/inventaris/gudang" },
      { name: "Asset per Kamar", href: "/inventaris/kamar" },
      { name: "Maintenance", href: "/inventaris/maintenance" },
      { name: "Inspeksi Checkout", href: "/inventaris/inspeksi" },
    ],
  },
  { name: "Cetak Laporan", href: "/laporan", icon: FileText },
  {
    name: "Pengaturan",
    icon: Settings,
    children: [
      { name: "Profil Kosan", href: "/pengaturan/profil" },
      { name: "Pengaturan Kosan", href: "/pengaturan/kosan" },
    ],
  },
  {
    name: "Daftar Akun",
    icon: UserCog,
    children: [
      { name: "Pengelola / Pemilik", href: "/akun/pengelola" },
      { name: "Akun Penghuni", href: "/akun/penghuni" },
    ],
  },
];

export default function Sidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>(() => {
    const active = navigation.find(
      (item) => item.children?.some((c) => pathname.startsWith(c.href))
    );
    return active ? [active.name] : [];
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const roleLabel: Record<string, string> = {
    OWNER: "Pemilik",
    MANAGER: "Pengelola",
    TENANT: "Penghuni",
  };

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50">
        <div className="p-2 bg-teal-500 rounded-lg">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">KosanKu</h1>
          <p className="text-xs text-slate-400">Manajemen Kosan</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          if (item.children) {
            const isOpen = openMenus.includes(item.name);
            const hasActiveChild = item.children.some((c) => isActive(c.href));
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    hasActiveChild
                      ? "bg-teal-600/20 text-teal-300"
                      : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-700 pl-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "block px-3 py-2 rounded-lg text-sm transition-colors",
                          isActive(child.href)
                            ? "bg-teal-600 text-white font-medium"
                            : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                        )}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive(item.href!)
                  ? "bg-teal-600 text-white"
                  : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-slate-700/50">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-white truncate">{userName}</p>
          <p className="text-xs text-slate-400">{roleLabel[userRole] || userRole}</p>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Keluar
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-slate-800 flex flex-col h-full">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-slate-800">
        {sidebarContent}
      </aside>
    </>
  );
}
