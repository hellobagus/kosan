import { appUrl } from "@/lib/app-url";
import { sendEmail, isEmailConfigured } from "@/lib/email-service";
import { prisma } from "@/lib/prisma";
import { REPAIR_CATEGORY_LABELS, REPAIR_STATUS_LABELS } from "@/lib/repair-request-constants";
import type { RepairCategory, RepairRequestStatus } from "@prisma/client";

type RepairWithRelations = {
  id: number;
  status: RepairRequestStatus;
  category: RepairCategory;
  title: string;
  description: string | null;
  priority: string;
  photoUrls: unknown;
  resolutionNotes: string | null;
  room: { roomNumber: string; floor: number };
  tenant: { user: { name: string; phone: string | null } };
};

export function normalizeWhatsAppPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.length >= 9) return `62${digits}`;
  return null;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return "";
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function isWhatsAppConfigured(): boolean {
  const provider = (process.env.WHATSAPP_PROVIDER || "off").toLowerCase();
  if (provider === "off" || provider === "none" || provider === "link") return false;
  return Boolean(
    process.env.WHATSAPP_API_TOKEN?.trim() || process.env.WHATSAPP_ACCOUNT_TOKEN?.trim()
  );
}

type FonnteDevice = {
  device: string;
  name: string;
  status: string;
  token: string;
  quota?: string;
};

export async function getFonnteStatus() {
  const accountToken = process.env.WHATSAPP_ACCOUNT_TOKEN?.trim();
  const deviceToken = process.env.WHATSAPP_API_TOKEN?.trim();

  if (!accountToken && !deviceToken) {
    return { ok: false, error: "Token Fonnte belum diatur" };
  }

  if (accountToken) {
    const res = await fetch("https://api.fonnte.com/get-devices", {
      method: "POST",
      headers: { Authorization: accountToken },
    });
    const data = await res.json().catch(() => ({}));
    if (!data?.status) {
      return { ok: false, error: data?.reason || "Account token tidak valid" };
    }
    const devices = (data.data || []) as FonnteDevice[];
    const connected = devices.filter((d) => d.status === "connect");
    return {
      ok: true,
      accountValid: true,
      totalDevices: data.devices ?? devices.length,
      connectedDevices: connected.length,
      devices: devices.map((d) => ({
        name: d.name,
        phone: d.device,
        status: d.status,
        hasDeviceToken: Boolean(d.token),
      })),
      canSend: Boolean(deviceToken) || connected.length > 0,
      hint:
        connected.length === 0
          ? "Account token valid, tapi belum ada WhatsApp yang terhubung. Buka dashboard Fonnte → Device → scan QR."
          : !deviceToken
            ? "Gunakan Device Token dari daftar device, atau biarkan kosong — sistem akan pakai device yang connect."
            : undefined,
    };
  }

  return { ok: true, accountValid: false, canSend: Boolean(deviceToken) };
}

async function resolveFonnteSendToken(): Promise<{ token?: string; error?: string }> {
  const deviceToken = process.env.WHATSAPP_API_TOKEN?.trim();
  if (deviceToken) return { token: deviceToken };

  const accountToken = process.env.WHATSAPP_ACCOUNT_TOKEN?.trim();
  if (!accountToken) {
    return { error: "WHATSAPP_API_TOKEN (device token) belum diisi" };
  }

  const res = await fetch("https://api.fonnte.com/get-devices", {
    method: "POST",
    headers: { Authorization: accountToken },
  });
  const data = await res.json().catch(() => ({}));
  if (!data?.status) {
    return { error: data?.reason || "Account token tidak valid" };
  }

  const devices = (data.data || []) as FonnteDevice[];
  const connected = devices.find((d) => d.status === "connect" && d.token);
  if (!connected) {
    return {
      error:
        "Tidak ada device WhatsApp yang terhubung di Fonnte. Hubungkan device dulu di dashboard Fonnte, lalu salin Device Token ke WHATSAPP_API_TOKEN.",
    };
  }
  return { token: connected.token };
}

function getWhatsAppProvider() {
  return (process.env.WHATSAPP_PROVIDER || "off").toLowerCase();
}

async function sendViaFonnte(target: string, message: string, imageUrl?: string) {
  const resolved = await resolveFonnteSendToken();
  if (!resolved.token) return { ok: false as const, error: resolved.error || "Token Fonnte tidak tersedia" };

  const body = new URLSearchParams();
  body.set("target", target);
  body.set("message", message);
  if (imageUrl) body.set("url", imageUrl);

  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: { Authorization: resolved.token },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.status === false) {
    return { ok: false as const, error: data?.reason || data?.message || "Gagal kirim Fonnte" };
  }
  return { ok: true as const };
}

async function sendViaWablas(target: string, message: string, imageUrl?: string) {
  const token = process.env.WHATSAPP_API_TOKEN?.trim();
  const domain = (process.env.WHATSAPP_WABLAS_DOMAIN || "solo").trim();
  if (!token) return { ok: false as const, error: "WHATSAPP_API_TOKEN kosong" };

  const res = await fetch(`https://${domain}.wablas.com/api/send-message`, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone: target,
      message,
      ...(imageUrl ? { image: imageUrl } : {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false as const, error: data?.message || "Gagal kirim Wablas" };
  }
  return { ok: true as const };
}

export async function sendWhatsAppMessage(params: {
  phone: string;
  message: string;
  imageUrl?: string;
}): Promise<{ ok: boolean; error?: string; manualLink?: string }> {
  const target = normalizeWhatsAppPhone(params.phone);
  if (!target) {
    return { ok: false, error: "Nomor WhatsApp tidak valid", manualLink: "" };
  }

  const manualLink = buildWhatsAppLink(params.phone, params.message);
  if (!isWhatsAppConfigured()) {
    return { ok: false, error: "WhatsApp API belum dikonfigurasi", manualLink };
  }

  const provider = getWhatsAppProvider();
  const absoluteImage = params.imageUrl?.startsWith("http")
    ? params.imageUrl
    : params.imageUrl
      ? appUrl(params.imageUrl)
      : undefined;

  try {
    const result =
      provider === "wablas"
        ? await sendViaWablas(target, params.message, absoluteImage)
        : await sendViaFonnte(target, params.message, absoluteImage);

    if (!result.ok) {
      return { ok: false, error: result.error, manualLink };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal kirim WhatsApp",
      manualLink,
    };
  }
}

async function getStaffNotifyPhones(): Promise<string[]> {
  const fromEnv = process.env.WHATSAPP_STAFF_PHONES?.split(",")
    .map((p) => normalizeWhatsAppPhone(p.trim()))
    .filter((p): p is string => Boolean(p));
  if (fromEnv?.length) return fromEnv;

  const users = await prisma.user.findMany({
    where: {
      role: { in: ["FRONT_OFFICE", "MAINTENANCE", "PROJECT_MANAGER", "MANAGER"] },
      isActive: true,
      phone: { not: null },
    },
    select: { phone: true },
  });

  return users
    .map((u) => normalizeWhatsAppPhone(u.phone || ""))
    .filter((p): p is string => Boolean(p));
}

function formatRepairMessage(repair: RepairWithRelations, extra?: string) {
  const photos = Array.isArray(repair.photoUrls) ? (repair.photoUrls as string[]) : [];
  const photoLine = photos.length > 0 ? `\nFoto: ${photos.length} lampiran` : "";
  return [
    `*Kosanku — Permintaan Perbaikan*`,
    ``,
    `Status: ${REPAIR_STATUS_LABELS[repair.status]}`,
    `Kategori: ${REPAIR_CATEGORY_LABELS[repair.category]}`,
    `Kamar: ${repair.room.roomNumber} (Lt.${repair.room.floor})`,
    `Penghuni: ${repair.tenant.user.name}`,
    `Judul: ${repair.title}`,
    repair.description ? `Detail: ${repair.description}` : "",
    repair.priority === "URGENT" ? `⚠️ *PRIORITAS MENDESAK*` : "",
    extra || "",
    photoLine,
    ``,
    `ID: #${repair.id}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function notifyStaffNewRepairRequest(repair: RepairWithRelations) {
  const phones = await getStaffNotifyPhones();
  const message = formatRepairMessage(
    repair,
    "Penghuni mengajukan laporan kerusakan. Mohon lakukan inspeksi ke unit."
  );
  const photos = Array.isArray(repair.photoUrls) ? (repair.photoUrls as string[]) : [];
  const firstPhoto = photos[0];

  for (const phone of phones) {
    await sendWhatsAppMessage({ phone, message, imageUrl: firstPhoto });
  }

  if (isEmailConfigured()) {
    const staffEmails = await prisma.user.findMany({
      where: {
        role: { in: ["FRONT_OFFICE", "MAINTENANCE", "PROJECT_MANAGER"] },
        isActive: true,
      },
      select: { email: true },
    });
    const html = message.replace(/\n/g, "<br>");
    for (const { email } of staffEmails) {
      await sendEmail({
        to: email,
        subject: `[Kosanku] Permintaan perbaikan — Kamar ${repair.room.roomNumber}`,
        html: `<p>${html}</p>`,
      });
    }
  }
}

export async function notifyTenantRepairStatusUpdate(
  repair: RepairWithRelations,
  note?: string
) {
  if (process.env.WHATSAPP_NOTIFY_TENANT === "false") return;

  const phone = repair.tenant.user.phone;
  if (!phone) return;

  const extra =
    note ||
    (repair.status === "INSPECTING"
      ? "Pengurus akan/sedang melakukan inspeksi ke unit Anda."
      : repair.status === "IN_PROGRESS"
        ? "Tim sedang melakukan perbaikan."
        : repair.status === "COMPLETED"
          ? `Perbaikan selesai.${repair.resolutionNotes ? ` Catatan: ${repair.resolutionNotes}` : ""}`
          : repair.status === "CANCELLED"
            ? "Permintaan perbaikan dibatalkan."
            : "");

  await sendWhatsAppMessage({
    phone,
    message: formatRepairMessage(repair, extra),
  });
}
