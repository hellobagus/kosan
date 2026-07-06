"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, MapPin, Pencil, Plus, Save, X, Eye } from "lucide-react";
import { Button, Card, CardBody, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { useProjectRefreshKey } from "@/hooks/useProjectRefresh";

type EntityDetail = {
  id: number;
  code: string;
  name: string;
  legalName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxId: string | null;
  holding: { code: string; name: string };
  projects: ProjectRow[];
};

type ProjectRow = {
  id: number;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  managerName: string | null;
  contractLocation: string | null;
  active: boolean;
  _count?: { buildings: number };
};

type ContextInfo = {
  entityId: number;
  projectId: number;
  entity: { code: string; name: string };
  project: { code: string; name: string };
};

const EMPTY_ENTITY = {
  name: "",
  code: "",
  legalName: "",
  address: "",
  phone: "",
  email: "",
  taxId: "",
};

const EMPTY_PROJECT = {
  name: "",
  code: "",
  address: "",
  phone: "",
  email: "",
  managerName: "",
  contractLocation: "",
};

export default function EntityProjectBoard() {
  const refreshKey = useProjectRefreshKey();
  const [context, setContext] = useState<ContextInfo | null>(null);
  const [entities, setEntities] = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<number | "">("");
  const [entity, setEntity] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [editEntity, setEditEntity] = useState(false);
  const [entityForm, setEntityForm] = useState(EMPTY_ENTITY);
  const [savingEntity, setSavingEntity] = useState(false);

  const [viewProjectId, setViewProjectId] = useState<number | null>(null);
  const [editProjectId, setEditProjectId] = useState<number | null>(null);
  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT);
  const [savingProject, setSavingProject] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState(EMPTY_PROJECT);

  const loadContext = useCallback(() => {
    return fetch("/api/organization/context")
      .then((r) => r.json())
      .then((data) => {
        if (data.context) setContext(data.context);
        if (data.entities) setEntities(data.entities);
        if (data.context?.entityId) {
          setSelectedEntityId(data.context.entityId);
        } else if (data.entities?.[0]?.id) {
          setSelectedEntityId(data.entities[0].id);
        }
        return data;
      });
  }, []);

  const loadEntity = useCallback((entityId: number) => {
    setLoading(true);
    setError("");
    return fetch(`/api/organization/entities?entityId=${entityId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setEntity(null);
          return;
        }
        setEntity(data);
        setEntityForm({
          name: data.name || "",
          code: data.code || "",
          legalName: data.legalName || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          taxId: data.taxId || "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadContext();
  }, [loadContext, refreshKey]);

  useEffect(() => {
    if (selectedEntityId) loadEntity(Number(selectedEntityId));
  }, [selectedEntityId, loadEntity, refreshKey]);

  const saveEntity = async () => {
    if (!entity) return;
    setSavingEntity(true);
    setMessage("");
    const res = await fetch("/api/organization/entities", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: entity.id, ...entityForm }),
    });
    const data = await res.json();
    setSavingEntity(false);
    if (res.ok) {
      setMessage("Data entity berhasil disimpan");
      setEditEntity(false);
      loadEntity(entity.id);
      window.dispatchEvent(new CustomEvent("kosanku:context-changed"));
    } else {
      setError(data.error || "Gagal menyimpan entity");
    }
  };

  const openEditProject = (p: ProjectRow) => {
    setViewProjectId(p.id);
    setEditProjectId(p.id);
    setProjectForm({
      name: p.name || "",
      code: p.code || "",
      address: p.address || "",
      phone: p.phone || "",
      email: p.email || "",
      managerName: p.managerName || "",
      contractLocation: p.contractLocation || "",
    });
  };

  const saveProject = async (id: number) => {
    setSavingProject(true);
    setMessage("");
    const res = await fetch("/api/organization/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...projectForm }),
    });
    const data = await res.json();
    setSavingProject(false);
    if (res.ok) {
      setMessage(`Project ${projectForm.code} berhasil disimpan`);
      setEditProjectId(null);
      if (entity) loadEntity(entity.id);
      window.dispatchEvent(new CustomEvent("kosanku:context-changed"));
    } else {
      setError(data.error || "Gagal menyimpan project");
    }
  };

  const addProject = async () => {
    if (!entity || !newProjectForm.name || !newProjectForm.code) return;
    setSavingProject(true);
    setMessage("");
    const res = await fetch("/api/organization/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityId: entity.id,
        ...newProjectForm,
      }),
    });
    const data = await res.json();
    setSavingProject(false);
    if (res.ok) {
      setMessage(`Project ${newProjectForm.code} berhasil ditambahkan`);
      setShowAddProject(false);
      setNewProjectForm(EMPTY_PROJECT);
      loadEntity(entity.id);
      window.dispatchEvent(new CustomEvent("kosanku:context-changed"));
    } else {
      setError(data.error || "Gagal menambah project");
    }
  };

  const activeProjectId = context?.projectId;

  if (loading && !entity) {
    return <p className="text-slate-500">Memuat data entity & project...</p>;
  }

  return (
    <div className="mb-8">
      <PageHeader
        title="Entity & Project (Kos)"
        description="Kelola nama, alamat, dan kontak setiap entity serta project/kos. Alamat project dipakai di invoice, kontrak, dan profil kos."
      />

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-teal-50 text-teal-800 text-sm border border-teal-200">{message}</div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
      )}

      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <Select
          label="Pilih Entity"
          value={selectedEntityId}
          onChange={(e) => {
            setSelectedEntityId(parseInt(e.target.value, 10));
            setViewProjectId(null);
            setEditProjectId(null);
            setEditEntity(false);
          }}
          className="min-w-[240px]"
        >
          {entities.map((e) => (
            <option key={e.id} value={e.id}>{e.code} — {e.name}</option>
          ))}
        </Select>
        {context && (
          <p className="text-sm text-slate-500 pb-2">
            Project aktif di header: <span className="font-medium text-teal-700">{context.project.code}</span>
          </p>
        )}
      </div>

      {entity && (
        <>
          <Card className="mb-6">
            <CardBody>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-teal-600" />
                    Entity: {entity.code}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Holding {entity.holding.code} — {entity.holding.name}
                  </p>
                </div>
                {!editEntity ? (
                  <Button variant="secondary" onClick={() => setEditEntity(true)}>
                    <Pencil className="w-4 h-4" /> Edit Entity
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={saveEntity} disabled={savingEntity}>
                      <Save className="w-4 h-4" /> {savingEntity ? "Menyimpan..." : "Simpan"}
                    </Button>
                    <Button variant="ghost" onClick={() => setEditEntity(false)}>
                      <X className="w-4 h-4" /> Batal
                    </Button>
                  </div>
                )}
              </div>

              {editEntity ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Kode Entity" value={entityForm.code} onChange={(e) => setEntityForm({ ...entityForm, code: e.target.value.toUpperCase() })} />
                  <Input label="Nama Entity" value={entityForm.name} onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })} />
                  <Input label="Nama Legal (PT)" value={entityForm.legalName} onChange={(e) => setEntityForm({ ...entityForm, legalName: e.target.value })} />
                  <Input label="NPWP" value={entityForm.taxId} onChange={(e) => setEntityForm({ ...entityForm, taxId: e.target.value })} />
                  <Input label="Telepon" value={entityForm.phone} onChange={(e) => setEntityForm({ ...entityForm, phone: e.target.value })} />
                  <Input label="Email" type="email" value={entityForm.email} onChange={(e) => setEntityForm({ ...entityForm, email: e.target.value })} />
                  <div className="md:col-span-2">
                    <Textarea label="Alamat Entity (kantor / legal)" value={entityForm.address} onChange={(e) => setEntityForm({ ...entityForm, address: e.target.value })} rows={3} />
                  </div>
                </div>
              ) : (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div><dt className="text-slate-500">Nama</dt><dd className="font-medium">{entity.name}</dd></div>
                  <div><dt className="text-slate-500">Nama Legal</dt><dd>{entity.legalName || "—"}</dd></div>
                  <div><dt className="text-slate-500">Telepon</dt><dd>{entity.phone || "—"}</dd></div>
                  <div><dt className="text-slate-500">Email</dt><dd>{entity.email || "—"}</dd></div>
                  <div><dt className="text-slate-500">NPWP</dt><dd>{entity.taxId || "—"}</dd></div>
                  <div className="md:col-span-2">
                    <dt className="text-slate-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Alamat Entity</dt>
                    <dd className="mt-1 whitespace-pre-wrap">{entity.address || "—"}</dd>
                  </div>
                </dl>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="font-semibold text-lg">Daftar Project / Kos</h3>
                <Button onClick={() => setShowAddProject(true)}>
                  <Plus className="w-4 h-4" /> Tambah Project
                </Button>
              </div>

              {showAddProject && (
                <div className="mb-6 p-4 border border-teal-200 rounded-lg bg-teal-50/50">
                  <h4 className="font-medium mb-3">Project Baru</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input label="Kode" value={newProjectForm.code} onChange={(e) => setNewProjectForm({ ...newProjectForm, code: e.target.value.toUpperCase() })} placeholder="KOSBLU" />
                    <Input label="Nama Kos" value={newProjectForm.name} onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })} />
                    <Input label="Telepon" value={newProjectForm.phone} onChange={(e) => setNewProjectForm({ ...newProjectForm, phone: e.target.value })} />
                    <Input label="Email" value={newProjectForm.email} onChange={(e) => setNewProjectForm({ ...newProjectForm, email: e.target.value })} />
                    <div className="md:col-span-2">
                      <Textarea label="Alamat Kos" value={newProjectForm.address} onChange={(e) => setNewProjectForm({ ...newProjectForm, address: e.target.value })} rows={2} />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button onClick={addProject} disabled={savingProject}>Simpan Project</Button>
                    <Button variant="ghost" onClick={() => setShowAddProject(false)}>Batal</Button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {entity.projects.length === 0 ? (
                  <p className="text-slate-500 text-sm">Belum ada project. Tambahkan project/kos untuk entity ini.</p>
                ) : (
                  entity.projects.map((p) => (
                    <div
                      key={p.id}
                      className={`border rounded-lg p-4 ${p.id === activeProjectId ? "border-teal-400 bg-teal-50/30" : "border-slate-200"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800">
                            {p.code} — {p.name}
                            {p.id === activeProjectId && (
                              <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-teal-600 text-white">Aktif di header</span>
                            )}
                          </p>
                          <p className="text-sm text-slate-500 mt-1 flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            {p.address || <span className="italic">Alamat belum diisi</span>}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {p._count?.buildings ?? 0} gedung · {p.phone || "—"} · {p.email || "—"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => { setViewProjectId(p.id); setEditProjectId(null); }}>
                            <Eye className="w-3.5 h-3.5" /> Lihat
                          </Button>
                          <Button variant="secondary" onClick={() => openEditProject(p)}>
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </Button>
                        </div>
                      </div>

                      {(viewProjectId === p.id || editProjectId === p.id) && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          {editProjectId === p.id ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Input label="Kode" value={projectForm.code} onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value.toUpperCase() })} />
                              <Input label="Nama Kos" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} />
                              <Input label="Telepon" value={projectForm.phone} onChange={(e) => setProjectForm({ ...projectForm, phone: e.target.value })} />
                              <Input label="Email" value={projectForm.email} onChange={(e) => setProjectForm({ ...projectForm, email: e.target.value })} />
                              <Input label="Nama Pengelola" value={projectForm.managerName} onChange={(e) => setProjectForm({ ...projectForm, managerName: e.target.value })} />
                              <Input label="Lokasi Kontrak" value={projectForm.contractLocation} onChange={(e) => setProjectForm({ ...projectForm, contractLocation: e.target.value })} />
                              <div className="md:col-span-2">
                                <Textarea label="Alamat Kos (tampil di invoice & kontrak)" value={projectForm.address} onChange={(e) => setProjectForm({ ...projectForm, address: e.target.value })} rows={3} />
                              </div>
                              <div className="md:col-span-2 flex gap-2">
                                <Button onClick={() => saveProject(p.id)} disabled={savingProject}>
                                  <Save className="w-4 h-4" /> Simpan
                                </Button>
                                <Button variant="ghost" onClick={() => setEditProjectId(null)}>Batal</Button>
                              </div>
                            </div>
                          ) : (
                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div><dt className="text-slate-500">Kode</dt><dd className="font-mono">{p.code}</dd></div>
                              <div><dt className="text-slate-500">Pengelola</dt><dd>{p.managerName || "—"}</dd></div>
                              <div><dt className="text-slate-500">Telepon</dt><dd>{p.phone || "—"}</dd></div>
                              <div><dt className="text-slate-500">Email</dt><dd>{p.email || "—"}</dd></div>
                              <div><dt className="text-slate-500">Lokasi Kontrak</dt><dd>{p.contractLocation || "—"}</dd></div>
                              <div className="md:col-span-2">
                                <dt className="text-slate-500">Alamat Lengkap</dt>
                                <dd className="mt-1 whitespace-pre-wrap">{p.address || "—"}</dd>
                              </div>
                            </dl>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
