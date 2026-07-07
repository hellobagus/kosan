"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { formatShortDate } from "@/lib/utils";

type Announcement = {
  id: number;
  title: string;
  content: string;
  createdByName?: string | null;
  publishedAt: string;
};

export default function TenantAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);

  useEffect(() => {
    fetch("/api/portal/announcements").then((r) => r.json()).then(setItems);
  }, []);

  return (
    <div>
      <PageHeader
        title="Pengumuman"
        description="Informasi dan pemberitahuan dari pemilik, manager, pengurus, dan finance."
      />
      {items.length === 0 ? (
        <Card><CardBody><p className="text-sm text-slate-500">Belum ada pengumuman.</p></CardBody></Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardBody>
                <div className="flex justify-between gap-4 mb-2">
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{formatShortDate(item.publishedAt)}</span>
                </div>
                {item.createdByName && (
                  <p className="text-xs text-teal-700 mb-2">Dari: {item.createdByName}</p>
                )}
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.content}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
