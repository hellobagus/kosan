"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type EntityOption = { id: number; code: string; name: string; holdingName: string };
type ProjectOption = { id: number; code: string; name: string; entityId: number };
type ContextInfo = {
  entityId: number;
  projectId: number;
  entity: { code: string; name: string };
  project: { code: string; name: string };
};

export default function AppHeader({ userRole }: { userRole: string }) {
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [context, setContext] = useState<ContextInfo | null>(null);
  const [entityId, setEntityId] = useState<number | "">("");
  const [projectId, setProjectId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  const isStaff = userRole === "OWNER" || userRole === "MANAGER";

  const loadContext = useCallback(() => {
    if (!isStaff) return;
    fetch("/api/organization/context")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setEntities(data.entities || []);
        setProjects(data.projects || []);
        if (data.context) {
          setContext(data.context);
          setEntityId(data.context.entityId);
          setProjectId(data.context.projectId);
        }
      })
      .catch(() => {});
  }, [isStaff]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const loadProjectsForEntity = useCallback((eid: number) => {
    fetch(`/api/organization/projects?entityId=${eid}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProjects(data);
      });
  }, []);

  const handleEntityChange = (eid: number) => {
    setEntityId(eid);
    loadProjectsForEntity(eid);
    fetch(`/api/organization/projects?entityId=${eid}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProjectId(data[0].id);
        }
      });
  };

  const applyContext = async () => {
    if (!entityId || !projectId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/organization/context", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, projectId }),
      });
      const data = await res.json();
        if (res.ok) {
        setContext(data.context);
        window.dispatchEvent(new CustomEvent("kosanku:context-changed", { detail: data.context }));
      } else {
        alert(data.error || "Gagal mengubah project");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isStaff) return null;

  const filteredProjects = projects.filter((p) => !entityId || p.entityId === entityId);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-2 text-slate-600 mr-auto min-w-0">
          <Building2 className="w-4 h-4 shrink-0 text-teal-600" />
          <span className="text-sm font-medium truncate hidden sm:inline">
            {context ? (
              <>
                <span className="text-teal-700">{context.entity.code}</span>
                <span className="mx-1 text-slate-400">/</span>
                <span>{context.project.name}</span>
              </>
            ) : (
              "Pilih Entity & Project"
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={entityId}
              onChange={(e) => handleEntityChange(parseInt(e.target.value, 10))}
              className={cn(
                "appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-300",
                "bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[160px]"
              )}
            >
              <option value="" disabled>Entity</option>
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code} — {e.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={projectId}
              onChange={(e) => setProjectId(parseInt(e.target.value, 10))}
              className={cn(
                "appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-300",
                "bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[160px]"
              )}
            >
              <option value="" disabled>Project (Kos)</option>
              {filteredProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={applyContext}
            disabled={saving || !entityId || !projectId}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              "bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
            )}
          >
            {saving ? "..." : "Terapkan"}
          </button>
        </div>
      </div>
    </header>
  );
}
