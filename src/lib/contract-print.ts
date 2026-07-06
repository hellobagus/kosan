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

function printPdfBlob(blob: Blob, title = "Dokumen") {
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    alert("Popup diblokir. PDF diunduh — buka file lalu cetak.");
    return;
  }
  w.addEventListener("load", () => {
    setTimeout(() => {
      w.print();
      URL.revokeObjectURL(url);
    }, 500);
  });
}

export async function fetchAndPrintContract(tenantId: number) {
  const res = await fetch(`/api/tenants/${tenantId}/contract?format=pdf`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Gagal memuat kontrak PDF");
  }
  const blob = await res.blob();
  printPdfBlob(blob, `Kontrak-${tenantId}`);
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
