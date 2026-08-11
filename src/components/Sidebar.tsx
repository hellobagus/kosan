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
  Circle,
  User,
  Bell,
  Wrench,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { getRoleLabel } from "@/lib/rbac";

type NavMenuItem = {
  key: string;
  name: string;
  href?: string;
  icon?: string | null;
  children?: NavMenuItem[];
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  DoorOpen,
  Users,
  Wallet,
  FileText,
  UserCog,
  Settings,
  Zap,
  Package,
  User,
  Bell,
  Wrench,
  BookOpen,
};

function resolveIcon(name?: string | null) {
  if (!name) return Circle;
  return ICON_MAP[name] || Circle;
}

export default function Sidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname();
  const [navigation, setNavigation] = useState<NavMenuItem[]>([]);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const loadMenus = useCallback(() => {
    fetch("/api/rbac/my-menus")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setNavigation(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadMenus();
    const handler = () => loadMenus();
    window.addEventListener("kosanku:menus-changed", handler);
    return () => window.removeEventListener("kosanku:menus-changed", handler);
  }, [loadMenus]);

  useEffect(() => {
    const active = navigation.find(
      (item) => item.children?.some((c) => pathname === c.href || (c.href && pathname.startsWith(c.href + "/")))
    );
    if (active) setOpenMenus([active.key]);
  }, [navigation, pathname]);

  const toggleMenu = (key: string) => {
    setOpenMenus((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

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
          const Icon = resolveIcon(item.icon);
          if (item.children?.length) {
            const isOpen = openMenus.includes(item.key);
            const hasActiveChild = item.children.some((c) => c.href && isActive(c.href));
            return (
              <div key={item.key}>
                <button
                  onClick={() => toggleMenu(item.key)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    hasActiveChild
                      ? "bg-teal-600/20 text-teal-300"
                      : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-700 pl-3">
                    {item.children.map((child) => (
                      child.href ? (
                        <Link
                          key={child.key}
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
                      ) : null
                    ))}
                  </div>
                )}
              </div>
            );
          }
          if (!item.href) return null;
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-teal-600 text-white"
                  : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-slate-700/50">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-white truncate">{userName}</p>
          <p className="text-xs text-slate-400">{getRoleLabel(userRole)}</p>
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
