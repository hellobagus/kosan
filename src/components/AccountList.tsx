"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  PageHeader, Card, CardBody, Table, Th, Td, Badge, EmptyState,
  Input, Select, Button,
} from "@/components/ui";
import { formatShortDate } from "@/lib/utils";

interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  tenants?: Array<{ room: { roomNumber: string } }>;
}

const roleLabels: Record<string, string> = {
  OWNER: "Pemilik",
  MANAGER: "Pengelola",
  TENANT: "Penghuni",
};

export default function AccountListPage({
  title,
  description,
  roleFilter,
  rolesToShow,
  allowedRoles,
}: {
  title: string;
  description: string;
  roleFilter?: string;
  rolesToShow?: string[];
  allowedRoles: string[];
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: allowedRoles[0],
    address: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = () => {
    const url = roleFilter ? `/api/users?role=${roleFilter}` : "/api/users";
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (rolesToShow) {
          setUsers(data.filter((u: User) => rolesToShow.includes(u.role)));
        } else {
          setUsers(data);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [roleFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setSubmitting(false);
      return;
    }
    setShowForm(false);
    setForm({ name: "", email: "", password: "", phone: "", role: allowedRoles[0], address: "" });
    fetchUsers();
    setSubmitting(false);
  };

  const toggleActive = async (id: number, isActive: boolean) => {
    await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    fetchUsers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4" /> Tambah Akun
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6 max-w-2xl">
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                <Input label="Telepon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {allowedRoles.map((r) => (
                    <option key={r} value={r}>{roleLabels[r]}</option>
                  ))}
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="p-0">
          {users.length === 0 ? (
            <EmptyState message="Belum ada akun" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Nama</Th>
                  <Th>Email</Th>
                  <Th>Telepon</Th>
                  <Th>Role</Th>
                  {roleFilter === "TENANT" && <Th>Kamar</Th>}
                  <Th>Status</Th>
                  <Th>Terdaftar</Th>
                  <Th>Aksi</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <Td><span className="font-semibold">{u.name}</span></Td>
                    <Td>{u.email}</Td>
                    <Td>{u.phone || "-"}</Td>
                    <Td><Badge variant="info">{roleLabels[u.role]}</Badge></Td>
                    {roleFilter === "TENANT" && (
                      <Td>{u.tenants?.[0]?.room.roomNumber || "-"}</Td>
                    )}
                    <Td>
                      <Badge variant={u.isActive ? "success" : "danger"}>
                        {u.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </Td>
                    <Td>{formatShortDate(u.createdAt)}</Td>
                    <Td>
                      <Button
                        variant="ghost"
                        className="!px-2 !py-1 text-xs"
                        onClick={() => toggleActive(u.id, u.isActive)}
                      >
                        {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
