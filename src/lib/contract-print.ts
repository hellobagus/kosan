"use client";

export function printDocumentHtml(html: string, title = "Dokumen") {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup diblokir. Izinkan popup untuk mencetak dokumen.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  setTimeout(() => w.print(), 400);
}

export async function fetchAndPrintContract(tenantId: number) {
  const res = await fetch(`/api/tenants/${tenantId}/contract`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Gagal memuat kontrak");
  }
  const html = await res.text();
  printDocumentHtml(html, `Kontrak #${tenantId}`);
}

export async function fetchAndPrintInventoryBa(tenantId: number, type: "checkin" | "checkout" = "checkin") {
  const res = await fetch(`/api/tenants/${tenantId}/inventaris-ba?type=${type}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Gagal memuat BA inventaris");
  }
  const html = await res.text();
  printDocumentHtml(html, `BA Inventaris #${tenantId}`);
}
