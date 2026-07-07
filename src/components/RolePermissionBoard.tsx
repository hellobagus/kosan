"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Save, Plus, Trash2 } from "lucide-react";
import { Button, Card, CardBody, Input, PageHeader, Select } from "@/components/ui";

type RoleOption = { value: string; label: string };

type MenuRow = {
  id: number;
  key: string;
  name: string;
  href: string | null;
  parentKey: string | null;
  moduleKey: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  permission: {
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  } | null;
};

type PermissionDraft = {
  menuKey: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

const MODULE_OPTIONS = [
  "dashboard", "entity", "project", "room", "tenant", "contract",
  "inventory", "utility", "billing", "payment", "maintenance", "reporting", "accounts",
];

export default function RolePermissionBoard() {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [draft, setDraft] = useState<Record<string, PermissionDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"permissions" | "menus">("permissions");
  const [menuForm, setMenuForm] = useState({
    key: "",
    name: "",
    href: "",
    parentKey: "",
    moduleKey: "dashboard",
    icon: "",
    sortOrder: "0",
  });

  const loadPermissions = useCallback(async (role: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rbac/permissions?role=${encodeURIComponent(role)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat permission");
      setRoles(data.roles || []);
      setMenus(data.menus || []);
      const next: Record<string, PermissionDraft> = {};
      for (const menu of data.menus || []) {
        next[menu.key] = {
          menuKey: menu.key,
          canView: menu.permission?.canView ?? false,
          canCreate: menu.permission?.canCreate ?? false,
          canUpdate: menu.permission?.canUpdate ?? false,
          canDelete: menu.permission?.canDelete ?? false,
        };
      }
      setDraft(next);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPermissions(selectedRole || "SUPER_ADMIN").then(() => {
      if (!selectedRole) setSelectedRole("SUPER_ADMIN");
    });
  }, [loadPermissions, selectedRole]);

  const parentOptions = useMemo(
    () => menus.filter((m) => !m.href),
    [menus]
  );

  const toggleDraft = (menuKey: string, field: keyof Omit<PermissionDraft, "menuKey">) => {
    setDraft((prev) => ({
      ...prev,
      [menuKey]: {
        ...prev[menuKey],
        [field]: !prev[menuKey]?.[field],
      },
    }));
  };

  const setRowAll = (menuKey: string, value: boolean) => {
    setDraft((prev) => ({
      ...prev,
      [menuKey]: {
        menuKey,
        canView: value,
        canCreate: value,
        canUpdate: value,
        canDelete: value,
      },
    }));
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const permissions = Object.values(draft).map((row) => ({
        role: selectedRole,
        menuKey: row.menuKey,
        canView: row.canView,
        canCreate: row.canCreate,
        canUpdate: row.canUpdate,
        canDelete: row.canDelete,
      }));
      const res = await fetch("/api/rbac/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      alert("Hak akses berhasil disimpan");
      window.dispatchEvent(new CustomEvent("kosanku:menus-changed"));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const resetMatrix = async () => {
    if (!confirm("Reset semua permission ke default matrix?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/rbac/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_matrix" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal reset");
      await loadPermissions(selectedRole);
      window.dispatchEvent(new CustomEvent("kosanku:menus-changed"));
      alert(data.message || "Berhasil direset");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal reset");
    } finally {
      setSaving(false);
    }
  };

  const addMenu = async () => {
    if (!menuForm.key || !menuForm.name) {
      alert("Key dan nama menu wajib diisi");
      return;
    }
    const res = await fetch("/api/rbac/menus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: menuForm.key,
        name: menuForm.name,
        href: menuForm.href || null,
        parentKey: menuForm.parentKey || null,
        moduleKey: menuForm.moduleKey,
        icon: menuForm.icon || null,
        sortOrder: menuForm.sortOrder,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Gagal menambah menu");
      return;
    }
    setMenuForm({ key: "", name: "", href: "", parentKey: "", moduleKey: "dashboard", icon: "", sortOrder: "0" });
    await loadPermissions(selectedRole);
    window.dispatchEvent(new CustomEvent("kosanku:menus-changed"));
  };

  const deleteMenu = async (id: number) => {
    if (!confirm("Hapus menu ini?")) return;
    const res = await fetch(`/api/rbac/menus?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Gagal menghapus menu");
      return;
    }
    await loadPermissions(selectedRole);
    window.dispatchEvent(new CustomEvent("kosanku:menus-changed"));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menu & Hak Akses"
        description="Kelola menu aplikasi dan tentukan hak View, Create, Update, Delete per role."
      />

      <div className="flex flex-wrap gap-2">
        <Button variant={tab === "permissions" ? "primary" : "secondary"} onClick={() => setTab("permissions")}>
          Matrix Permission
        </Button>
        <Button variant={tab === "menus" ? "primary" : "secondary"} onClick={() => setTab("menus")}>
          Kelola Menu
        </Button>
      </div>

      {tab === "permissions" && (
        <Card>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <Select label="Role" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </Select>
              <Button onClick={() => loadPermissions(selectedRole)} variant="secondary">
                <RefreshCw className="w-4 h-4 mr-2" /> Muat Ulang
              </Button>
              <Button onClick={resetMatrix} variant="secondary" disabled={saving}>
                Reset Default
              </Button>
              <Button
                onClick={async () => {
                  setSaving(true);
                  try {
                    const res = await fetch("/api/rbac/permissions", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "reset_tenant_portal" }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Gagal reset");
                    if (selectedRole === "TENANT") await loadPermissions(selectedRole);
                    alert(data.message || "Berhasil");
                  } catch (error) {
                    alert(error instanceof Error ? error.message : "Gagal reset");
                  } finally {
                    setSaving(false);
                  }
                }}
                variant="secondary"
                disabled={saving}
              >
                Reset Portal Penghuni
              </Button>
              <Button onClick={savePermissions} disabled={saving || loading}>
                <Save className="w-4 h-4 mr-2" /> {saving ? "Menyimpan..." : "Simpan Permission"}
              </Button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Memuat data...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-600">
                      <th className="py-2 pr-4">Menu</th>
                      <th className="py-2 px-2">Module</th>
                      <th className="py-2 px-2 text-center">View</th>
                      <th className="py-2 px-2 text-center">Create</th>
                      <th className="py-2 px-2 text-center">Update</th>
                      <th className="py-2 px-2 text-center">Delete</th>
                      <th className="py-2 px-2 text-center">Semua</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menus.map((menu) => {
                      const row = draft[menu.key];
                      const indent = menu.parentKey ? "pl-6" : "";
                      return (
                        <tr key={menu.key} className="border-b border-slate-100">
                          <td className={`py-2 pr-4 ${indent}`}>
                            <div className="font-medium text-slate-800">{menu.name}</div>
                            <div className="text-xs text-slate-400">{menu.href || "(parent menu)"}</div>
                          </td>
                          <td className="py-2 px-2 text-xs text-slate-500">{menu.moduleKey}</td>
                          {(["canView", "canCreate", "canUpdate", "canDelete"] as const).map((field) => (
                            <td key={field} className="py-2 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={row?.[field] ?? false}
                                onChange={() => toggleDraft(menu.key, field)}
                              />
                            </td>
                          ))}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={row?.canView && row?.canCreate && row?.canUpdate && row?.canDelete}
                              onChange={(e) => setRowAll(menu.key, e.target.checked)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "menus" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardBody className="space-y-3">
              <h3 className="font-semibold text-slate-800">Tambah Menu Baru</h3>
              <Input label="Key (unik)" value={menuForm.key} onChange={(e) => setMenuForm({ ...menuForm, key: e.target.value })} placeholder="contoh: custom.report" />
              <Input label="Nama Menu" value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} />
              <Input label="URL Path" value={menuForm.href} onChange={(e) => setMenuForm({ ...menuForm, href: e.target.value })} placeholder="/laporan/khusus" />
              <Select label="Parent Menu" value={menuForm.parentKey} onChange={(e) => setMenuForm({ ...menuForm, parentKey: e.target.value })}>
                <option value="">— Tanpa parent —</option>
                {parentOptions.map((m) => (
                  <option key={m.key} value={m.key}>{m.name}</option>
                ))}
              </Select>
              <Select label="Module" value={menuForm.moduleKey} onChange={(e) => setMenuForm({ ...menuForm, moduleKey: e.target.value })}>
                {MODULE_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Select>
              <Input label="Icon (Lucide)" value={menuForm.icon} onChange={(e) => setMenuForm({ ...menuForm, icon: e.target.value })} placeholder="FileText" />
              <Input label="Urutan" value={menuForm.sortOrder} onChange={(e) => setMenuForm({ ...menuForm, sortOrder: e.target.value })} />
              <Button onClick={addMenu}><Plus className="w-4 h-4 mr-2" /> Tambah Menu</Button>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="font-semibold text-slate-800 mb-3">Daftar Menu</h3>
              <div className="space-y-2 max-h-[520px] overflow-y-auto">
                {menus.map((menu) => (
                  <div key={menu.id} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2">
                    <div>
                      <p className="font-medium text-sm">{menu.parentKey ? `↳ ${menu.name}` : menu.name}</p>
                      <p className="text-xs text-slate-400">{menu.key} · {menu.moduleKey}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteMenu(menu.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Hapus menu"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
