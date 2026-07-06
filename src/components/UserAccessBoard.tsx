"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { Button, Card, CardBody, PageHeader, Select } from "@/components/ui";

type StaffUser = { id: number; name: string; email: string; role: string };
type EntityRow = { id: number; code: string; name: string };
type ProjectRow = { id: number; code: string; name: string; entityId: number };

export default function UserAccessBoard() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [entityId, setEntityId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [access, setAccess] = useState<{
    entityAccess: Array<{ entity: EntityRow }>;
    projectAccess: Array<{ project: ProjectRow & { entity: EntityRow } }>;
  } | null>(null);

  const loadBase = useCallback(() => {
    fetch("/api/users?role=MANAGER")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []));
    fetch("/api/organization/context")
      .then((r) => r.json())
      .then((data) => {
        setEntities(data.entities || []);
        setProjects(data.projects || []);
      });
  }, []);

  const loadAccess = useCallback((userId: string) => {
    if (!userId) return;
    fetch(`/api/organization/access?userId=${userId}`)
      .then((r) => r.json())
      .then(setAccess);
  }, []);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    loadAccess(selectedUser);
  }, [selectedUser, loadAccess]);

  const grantAccess = async () => {
    if (!selectedUser) return;
    const res = await fetch("/api/organization/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: parseInt(selectedUser, 10),
        entityId: entityId ? parseInt(entityId, 10) : undefined,
        projectId: projectId ? parseInt(projectId, 10) : undefined,
      }),
    });
    if (res.ok) {
      setEntityId("");
      setProjectId("");
      loadAccess(selectedUser);
    }
  };

  const filteredProjects = projects.filter(
    (p) => !entityId || p.entityId === parseInt(entityId, 10)
  );

  return (
    <Card className="mt-6">
      <CardBody>
        <PageHeader
          title="Akses Entity & Project"
          description="Atur manager/pengelola yang hanya boleh mengakses entity atau project tertentu. OWNER otomatis akses penuh."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Select label="Pengelola" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            <option value="">Pilih pengelola</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </Select>
        </div>

        {selectedUser && access && (
          <div className="mb-6 text-sm text-slate-600 space-y-2">
            <p className="font-medium flex items-center gap-2"><Shield className="w-4 h-4" /> Akses saat ini:</p>
            <ul className="list-disc ml-5">
              {access.entityAccess.map((a) => (
                <li key={a.entity.id}>Entity: {a.entity.code} — {a.entity.name}</li>
              ))}
              {access.projectAccess.map((a) => (
                <li key={a.project.id}>Project: {a.project.code} — {a.project.name}</li>
              ))}
              {access.entityAccess.length === 0 && access.projectAccess.length === 0 && (
                <li>Belum ada akses khusus (hanya OWNER yang full access)</li>
              )}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <Select label="Entity" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
            <option value="">Pilih entity</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>{e.code} — {e.name}</option>
            ))}
          </Select>
          <Select label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Pilih project</option>
            {filteredProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </Select>
          <Button onClick={grantAccess} disabled={!selectedUser || (!entityId && !projectId)}>
            Berikan Akses
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
