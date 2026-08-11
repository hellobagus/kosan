"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Lightbulb,
  ListChecks,
} from "lucide-react";
import { Badge, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { getRoleLabel, normalizeRole, type NormalizedRole } from "@/lib/rbac";
import {
  ROLE_GUIDE_ORDER,
  USER_GUIDES,
  type RoleGuide,
} from "@/lib/user-guides";
import { cn } from "@/lib/utils";

type Props = {
  currentRole: string;
};

export default function PanduanClient({ currentRole }: Props) {
  const normalized = normalizeRole(currentRole);
  const isTenant = normalized === "TENANT";

  const visibleRoles = useMemo(
    () => (isTenant ? (["TENANT"] as NormalizedRole[]) : ROLE_GUIDE_ORDER),
    [isTenant]
  );

  const [selected, setSelected] = useState<NormalizedRole>(
    visibleRoles.includes(normalized) ? normalized : visibleRoles[0]
  );

  const guide: RoleGuide = USER_GUIDES[selected];
  const isMyRole = selected === normalized;

  return (
    <div>
      <PageHeader
        title="Panduan Penggunaan"
        description="Tata cara memakai KosanKu sesuai peran Anda. Pilih peran untuk melihat langkah-langkahnya."
      />

      {!isTenant && (
        <div className="flex flex-wrap gap-2 mb-6">
          {visibleRoles.map((role) => {
            const active = role === selected;
            const mine = role === normalized;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelected(role)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                  active
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-slate-700 border-slate-200 hover:border-teal-300 hover:text-teal-700"
                )}
              >
                {getRoleLabel(role)}
                {mine ? " · Anda" : ""}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
        <aside className="space-y-4">
          <Card>
            <CardBody>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Peran</p>
                  <h2 className="text-lg font-semibold text-slate-900 mt-0.5">{guide.title}</h2>
                  {isMyRole && (
                    <Badge variant="success">Panduan untuk akun Anda</Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-4 leading-relaxed">{guide.summary}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ListChecks className="w-4 h-4 text-teal-600" />
                Fokus utama
              </span>
            </CardHeader>
            <CardBody className="pt-0">
              <ul className="space-y-2">
                {guide.focus.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </aside>

        <div className="space-y-4">
          {guide.sections.map((section, sectionIdx) => (
            <Card key={section.title}>
              <CardHeader>
                <h3 className="text-base font-semibold text-slate-900">
                  <span className="text-teal-600 mr-2">{sectionIdx + 1}.</span>
                  {section.title}
                </h3>
              </CardHeader>
              <CardBody className="pt-0">
                <ol className="space-y-4">
                  {section.steps.map((step, stepIdx) => (
                    <li key={step.title} className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                        {stepIdx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900">{step.title}</p>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{step.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          ))}

          {guide.tips && guide.tips.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/40">
              <CardBody>
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-3">
                  <Lightbulb className="w-4 h-4" />
                  Tips
                </div>
                <ul className="space-y-2">
                  {guide.tips.map((tip) => (
                    <li key={tip} className="text-sm text-amber-900/90 leading-relaxed">
                      • {tip}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
