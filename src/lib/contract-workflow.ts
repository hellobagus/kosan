import { TenantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProjectProfileForRoom } from "@/lib/settings-service";
import { buildContractHtml, toContractTenant } from "@/lib/contract-service";
import { kosanProfileToContractProfile } from "@/lib/contract-profile";
import { htmlToPdfBuffer } from "@/lib/contract-pdf";
import { sendEmail, isEmailConfigured } from "@/lib/email-service";
import { activateRoomAssetsForTenant } from "@/lib/inventory-service";

const WORKFLOW_STATUSES: TenantStatus[] = [
  "PENDING",
  "APPROVED",
  "CONTRACT_SENT",
  "CONTRACT_SIGNED",
];

export function isWorkflowStatus(status: TenantStatus): boolean {
  return WORKFLOW_STATUSES.includes(status);
}

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  PENDING: "Menunggu Verifikasi",
  APPROVED: "Disetujui",
  CONTRACT_SENT: "Kontrak Terkirim",
  CONTRACT_SIGNED: "Kontrak Ditandatangani",
  ACTIVE: "Aktif",
  RESERVED: "Reservasi",
  CHECKOUT_PENDING: "Menunggu Checkout",
  COMPLETED: "Selesai",
};

export async function approveTenant(tenantId: number, userId: number) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return { ok: false as const, error: "Penghuni tidak ditemukan" };
  if (tenant.status !== "PENDING") {
    return { ok: false as const, error: "Hanya calon penghuni (PENDING) yang dapat diverifikasi" };
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: { status: "APPROVED", approvedAt: new Date(), approvedBy: userId },
    include: { user: true, room: true },
  });
  return { ok: true as const, tenant: updated };
}

export async function rejectTenant(tenantId: number) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return { ok: false as const, error: "Penghuni tidak ditemukan" };
  if (!isWorkflowStatus(tenant.status) && tenant.status !== "APPROVED") {
    return { ok: false as const, error: "Tidak dapat menolak penghuni pada status ini" };
  }

  await prisma.tenant.delete({ where: { id: tenantId } });
  return { ok: true as const };
}

export async function sendContractEmail(tenantId: number) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { user: true, room: true },
  });
  if (!tenant) return { ok: false as const, error: "Penghuni tidak ditemukan" };
  if (!["APPROVED", "CONTRACT_SENT"].includes(tenant.status)) {
    return { ok: false as const, error: "Kontrak hanya dapat dikirim setelah disetujui admin" };
  }
  if (!tenant.user.email) {
    return { ok: false as const, error: "Email penghuni belum diisi" };
  }

  const profile = await getProjectProfileForRoom(tenant.roomId);
  const html = buildContractHtml(
    kosanProfileToContractProfile(profile),
    toContractTenant(tenant)
  );

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const viewUrl = `${appUrl}/api/tenants/${tenantId}/contract?format=pdf`;
  const pdfFilename = `Kontrak_Sewa_${tenant.user.name.replace(/\s+/g, "_")}.pdf`;

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await htmlToPdfBuffer(html);
  } catch (err) {
    console.error("PDF generation error:", err);
    return { ok: false as const, error: "Gagal membuat PDF kontrak. Pastikan wkhtmltopdf terpasang di server." };
  }

  const emailHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#0d9488">Surat Perjanjian Sewa Kamar</h2>
      <p>Yth. <strong>${tenant.user.name}</strong>,</p>
      <p>Berikut kami kirimkan Surat Perjanjian Sewa Kamar (Kost) untuk kamar <strong>${tenant.room.roomNumber}</strong> di <strong>${profile.name}</strong>.</p>
      <p>File PDF kontrak terlampir pada email ini. Silakan cetak, tanda tangani, dan tempel materai Rp10.000, lalu serahkan dokumen fisik ke pengelola.</p>
      <p style="margin:24px 0">
        <a href="${viewUrl}" style="background:#0d9488;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
          Unduh Kontrak (PDF)
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="font-size:12px;color:#999">${profile.name} — ${profile.phone || ""}</p>
    </div>`;

  if (isEmailConfigured()) {
    const result = await sendEmail({
      to: tenant.user.email,
      subject: `Surat Perjanjian Sewa Kamar - ${profile.name}`,
      html: emailHtml,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
    if (!result.ok) return { ok: false as const, error: result.error };
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: "CONTRACT_SENT",
      contractSentAt: new Date(),
    },
    include: { user: true, room: true },
  });

  return {
    ok: true as const,
    tenant: updated,
    emailSent: isEmailConfigured(),
    viewUrl,
  };
}

export async function markContractSigned(tenantId: number, signedUrl?: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return { ok: false as const, error: "Penghuni tidak ditemukan" };
  if (!["CONTRACT_SENT", "APPROVED"].includes(tenant.status)) {
    return { ok: false as const, error: "Kontrak belum dikirim atau sudah ditandatangani" };
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: "CONTRACT_SIGNED",
      contractSignedAt: new Date(),
      contractSignedUrl: signedUrl || null,
    },
    include: { user: true, room: true },
  });
  return { ok: true as const, tenant: updated };
}

export async function generateInventoryBa(tenantId: number) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return { ok: false as const, error: "Penghuni tidak ditemukan" };
  if (!["CONTRACT_SIGNED", "CONTRACT_SENT"].includes(tenant.status)) {
    return { ok: false as const, error: "Generate BA inventaris setelah kontrak ditandatangani" };
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: { inventoryBaAt: new Date() },
    include: { user: true, room: true },
  });
  return { ok: true as const, tenant: updated };
}

export async function checkinTenant(tenantId: number, userId: number) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { room: true },
  });
  if (!tenant) return { ok: false as const, error: "Penghuni tidak ditemukan" };

  const allowedStatuses: TenantStatus[] = ["CONTRACT_SIGNED", "APPROVED", "RESERVED"];
  if (!allowedStatuses.includes(tenant.status)) {
    return { ok: false as const, error: "Penghuni tidak siap untuk check-in" };
  }

  if (tenant.room.status !== "AVAILABLE" && tenant.status !== "RESERVED") {
    const activeInRoom = await prisma.tenant.findFirst({
      where: { roomId: tenant.roomId, status: "ACTIVE", id: { not: tenantId } },
    });
    if (activeInRoom) {
      return { ok: false as const, error: "Kamar sudah terisi penghuni aktif lain" };
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.tenant.update({
      where: { id: tenantId },
      data: {
        status: "ACTIVE",
        inventoryBaAt: tenant.inventoryBaAt || new Date(),
      },
      include: { user: true, room: true },
    });
    await tx.room.update({
      where: { id: tenant.roomId },
      data: { status: "OCCUPIED" },
    });
    return t;
  });

  await activateRoomAssetsForTenant(tenant.roomId, tenantId, userId).catch(() => {});

  return { ok: true as const, tenant: updated };
}

export async function refundDeposit(tenantId: number, amount: number, userId: number) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { user: true, room: true },
  });
  if (!tenant) return { ok: false as const, error: "Penghuni tidak ditemukan" };
  if (tenant.status !== "COMPLETED") {
    return { ok: false as const, error: "Pengembalian deposit hanya untuk penghuni yang sudah checkout" };
  }
  if (tenant.depositRefundedAt) {
    return { ok: false as const, error: "Deposit sudah dikembalikan" };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.tenant.update({
      where: { id: tenantId },
      data: {
        depositRefundAmount: amount,
        depositRefundedAt: new Date(),
      },
      include: { user: true, room: true },
    });

    if (amount > 0) {
      await tx.finance.create({
        data: {
          type: "EXPENSE",
          amount,
          description: `Pengembalian Deposit - ${tenant.user.name} (Kamar ${tenant.room.roomNumber})`,
          category: "Deposit",
          transactionDate: new Date(),
          tenantId,
          roomId: tenant.roomId,
          createdBy: userId,
        },
      });
    }
    return t;
  });

  return { ok: true as const, tenant: updated };
}
