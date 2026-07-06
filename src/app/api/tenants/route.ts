import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, TenantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  calcDueDate,
  calcTotalAmount,
  getLeaseBonusMonths,
  findLeasePackage,
  parseAdditionalFees,
  parseAdditionalOccupants,
  parseAmount,
  parseLeasePackages,
  type TenantPaymentType,
} from "@/lib/tenant-utils";
import { getKosanProfile } from "@/lib/settings-service";
import { requireProjectContext, roomProjectFilter } from "@/lib/project-context";
import { generateInvoiceNumber } from "@/lib/document-number";

function parseStatusParam(value: string | null): TenantStatus | undefined {
  if (!value) return undefined;
  const allowed = Object.values(TenantStatus) as string[];
  return allowed.includes(value) ? (value as TenantStatus) : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireProjectContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const status = parseStatusParam(searchParams.get("status"));

    const where: Record<string, unknown> = {
      room: roomProjectFilter(auth.context.projectId),
    };
    if (status) where.status = status;

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        user: true,
        room: { include: { floorRef: true } },
      },
      orderBy: { checkIn: "desc" },
    });

    return NextResponse.json(tenants);
  } catch (error) {
    console.error("Tenants GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      name, email, phone, address, roomId, checkIn, monthlyRent, deposit, notes, password,
      status, leaseDuration, occupantCount, discount, additionalFees, isDaily,
      gender, ktp, maritalStatus, occupation, paidAmount, paymentStatus,
      emergencyPhone, additionalOccupants, agreedTerms, contractRequested,
      paymentType, ktpAddress, correspondenceAddress, workplace, workplaceAddress,
    } = body;

    if (!name || !roomId || !checkIn || !monthlyRent) {
      return NextResponse.json({ error: "Data wajib belum lengkap" }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email penghuni wajib dan harus valid" }, { status: 400 });
    }

    if (!agreedTerms) {
      return NextResponse.json({ error: "Syarat & Ketentuan harus disetujui" }, { status: 400 });
    }

    const room = await prisma.room.findFirst({
      where: { id: parseInt(roomId) },
      include: { floorRef: { include: { building: true } } },
    });
    if (!room) {
      return NextResponse.json({ error: "Kamar tidak ditemukan" }, { status: 400 });
    }

    const auth = await requireProjectContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (room.floorRef?.building.projectId !== auth.context.projectId) {
      return NextResponse.json({ error: "Kamar tidak termasuk project aktif" }, { status: 400 });
    }

    const invoiceNo = await generateInvoiceNumber(auth.context.entityId, auth.context.projectId);

    const tenantStatus = status || (contractRequested ? "PENDING" : "ACTIVE");
    const preActiveStatuses = ["PENDING", "APPROVED", "CONTRACT_SENT", "CONTRACT_SIGNED", "RESERVED"];
    if (tenantStatus === "ACTIVE" && room.status !== "AVAILABLE") {
      return NextResponse.json({ error: "Kamar tidak tersedia" }, { status: 400 });
    }
    if (preActiveStatuses.includes(tenantStatus) && tenantStatus !== "RESERVED" && room.status !== "AVAILABLE") {
      const activeTenant = await prisma.tenant.findFirst({
        where: { roomId: parseInt(roomId), status: "ACTIVE" },
      });
      if (activeTenant) {
        return NextResponse.json({ error: "Kamar sudah terisi penghuni aktif" }, { status: 400 });
      }
    }

    let userId: number;
    const tenantEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email: tenantEmail } });
    if (existingUser) {
      if (existingUser.role !== "TENANT") {
        return NextResponse.json({ error: "Email sudah digunakan akun lain" }, { status: 400 });
      }
      userId = existingUser.id;
      await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          phone: phone || null,
          address: address || null,
          gender: gender || null,
          ktp: ktp || null,
          maritalStatus: maritalStatus || null,
          occupation: occupation || null,
          ktpAddress: ktpAddress || null,
          correspondenceAddress: correspondenceAddress || null,
          workplace: workplace || null,
          workplaceAddress: workplaceAddress || null,
        },
      });
    } else {
      const hashedPassword = await bcrypt.hash(password || "penghuni123", 10);
      const newUser = await prisma.user.create({
        data: {
          name,
          email: tenantEmail,
          password: hashedPassword,
          phone: phone || null,
          address: address || null,
          role: "TENANT",
          gender: gender || null,
          ktp: ktp || null,
          maritalStatus: maritalStatus || null,
          occupation: occupation || null,
          ktpAddress: ktpAddress || null,
          correspondenceAddress: correspondenceAddress || null,
          workplace: workplace || null,
          workplaceAddress: workplaceAddress || null,
        },
      });
      userId = newUser.id;
    }

    const lease = leaseDuration || "1 Bulan";
    const checkInDate = new Date(checkIn);
    const profile = await getKosanProfile();
    const leasePackages = parseLeasePackages(profile.leasePackages, {
      leaseBonusRules: profile.leaseBonusRules,
      yearlyLeaseBonusEnabled: profile.yearlyLeaseBonusEnabled,
      yearlyLeaseBonusMonths: profile.yearlyLeaseBonusMonths,
    });
    const payType: TenantPaymentType =
      paymentType === "INSTALLMENT" ? "INSTALLMENT" : "FULL";

    if (!isDaily && lease !== "1 Hari") {
      const pkg = findLeasePackage(lease, leasePackages);
      if (!pkg) {
        return NextResponse.json({ error: "Lama sewa tidak tersedia dalam pengaturan kosan" }, { status: 400 });
      }
    }

    const selectedPkg = findLeasePackage(lease, leasePackages);
    const bonusMonths = getLeaseBonusMonths(lease, leasePackages, payType);
    const leaseGift =
      payType === "FULL" && selectedPkg?.gift ? selectedPkg.gift : null;
    const dueDate = calcDueDate(checkInDate, lease, bonusMonths);
    const fees = parseAdditionalFees(additionalFees);
    const occupants = parseAdditionalOccupants(additionalOccupants);
    const occCount = occupantCount ? parseInt(occupantCount) : 1;

    if (occCount >= 2) {
      const required = occCount - 1;
      if (occupants.length < required) {
        return NextResponse.json({ error: `Data penghuni tambahan wajib diisi (${required} orang)` }, { status: 400 });
      }
      for (const o of occupants.slice(0, required)) {
        if (!o.name || o.ktp.length !== 16) {
          return NextResponse.json({ error: "Nama dan No. KTP penghuni tambahan wajib lengkap (16 digit)" }, { status: 400 });
        }
      }
    }
    const total = calcTotalAmount({
      monthlyRent: parseFloat(monthlyRent),
      dailyPrice: room.dailyPrice ? parseAmount(room.dailyPrice) : null,
      isDaily: isDaily || lease === "1 Hari",
      leaseDuration: lease,
      occupantCount: occCount,
      discount: discount ? parseFloat(discount) : 0,
      deposit: deposit ? parseFloat(deposit) : 0,
      additionalFees: fees,
      checkIn: checkInDate,
      dueDate,
    });

    const paid = paidAmount ? parseFloat(paidAmount) : 0;
    const payStatus = paymentStatus || (paid >= total ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID");

    const tenant = await prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: {
          userId,
          roomId: parseInt(roomId),
          checkIn: checkInDate,
          dueDate,
          monthlyRent: parseFloat(monthlyRent),
          deposit: deposit ? parseFloat(deposit) : 0,
          notes: notes || null,
          status: tenantStatus as TenantStatus,
          leaseDuration: lease,
          occupantCount: occCount,
          discount: discount ? parseFloat(discount) : 0,
          additionalFees: fees.length > 0 ? (fees as unknown as Prisma.InputJsonValue) : undefined,
          additionalOccupants: occupants.length > 0 ? (occupants as unknown as Prisma.InputJsonValue) : undefined,
          emergencyPhone: emergencyPhone || null,
          termsAcceptedAt: new Date(),
          contractRequested: contractRequested === true,
          paymentType: payType,
          leaseBonusMonths: bonusMonths,
          leaseGift,
          totalAmount: total,
          paidAmount: paid,
          paymentStatus: payStatus as "UNPAID" | "PARTIAL" | "PAID",
          invoiceNumber: invoiceNo,
          lastPaymentDate: paid > 0 ? checkInDate : null,
          isDaily: isDaily || lease === "1 Hari",
        },
        include: { user: true, room: true },
      });

      if (tenantStatus === "ACTIVE") {
        await tx.room.update({
          where: { id: parseInt(roomId) },
          data: { status: "OCCUPIED" },
        });
      }

      if (deposit && parseFloat(deposit) > 0) {
        await tx.finance.create({
          data: {
            type: "INCOME",
            amount: parseFloat(deposit),
            description: `Deposit - ${name} (Kamar ${room.roomNumber})`,
            category: "Deposit",
            transactionDate: checkInDate,
            tenantId: t.id,
            roomId: parseInt(roomId),
            projectId: auth.context.projectId,
            createdBy: session.userId,
          },
        });
      }

      if (paid > 0) {
        await tx.finance.create({
          data: {
            type: "INCOME",
            amount: paid,
            description: `Pembayaran Sewa - ${name} (Kamar ${room.roomNumber})`,
            category: "Sewa",
            transactionDate: checkInDate,
            tenantId: t.id,
            roomId: parseInt(roomId),
            projectId: auth.context.projectId,
            createdBy: session.userId,
          },
        });
      }

      return tx.tenant.findUniqueOrThrow({
        where: { id: t.id },
        include: { user: true, room: true },
      });
    });

    if (tenantStatus === "ACTIVE") {
      const { activateRoomAssetsForTenant } = await import("@/lib/inventory-service");
      await activateRoomAssetsForTenant(parseInt(roomId), tenant.id, session.userId).catch(() => {});
    }

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    console.error("Tenants POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, action } = body;

    const tenant = await prisma.tenant.findUnique({
      where: { id: parseInt(id) },
      include: { user: true, room: true },
    });

    if (!tenant) return NextResponse.json({ error: "Penghuni tidak ditemukan" }, { status: 404 });

    if (action === "checkout" || action === "checkout_with_inspection") {
      const { checkOut, inspections } = body;
      const { checkoutTenantWithInspection } = await import("@/lib/inventory-service");
      const result = await checkoutTenantWithInspection(
        parseInt(id),
        checkOut ? new Date(checkOut) : new Date(),
        inspections || [],
        session.userId
      );
      return NextResponse.json(result);
    }

    if (action === "extend") {
      const { leaseDuration, occupantCount, discount, additionalFees } = body;
      const lease = leaseDuration || "1 Bulan";
      const startDate = tenant.dueDate ? addDay(tenant.dueDate, 1) : tenant.checkIn;
      const newDueDate = calcDueDate(startDate, lease);
      const fees = parseAdditionalFees(additionalFees);
      const total = calcTotalAmount({
        monthlyRent: parseAmount(tenant.monthlyRent),
        dailyPrice: tenant.room.dailyPrice ? parseAmount(tenant.room.dailyPrice) : null,
        isDaily: tenant.isDaily,
        leaseDuration: lease,
        occupantCount: occupantCount ? parseInt(occupantCount) : tenant.occupantCount,
        discount: discount ? parseFloat(discount) : 0,
        deposit: 0,
        additionalFees: fees,
        checkIn: startDate,
        dueDate: newDueDate,
      });

      const updated = await prisma.tenant.update({
        where: { id: parseInt(id) },
        data: {
          dueDate: newDueDate,
          leaseDuration: lease,
          occupantCount: occupantCount ? parseInt(occupantCount) : tenant.occupantCount,
          discount: discount ? parseFloat(discount) : 0,
          additionalFees: fees.length > 0 ? (fees as unknown as Prisma.InputJsonValue) : (tenant.additionalFees ?? undefined),
          totalAmount: total,
          paidAmount: 0,
          paymentStatus: "UNPAID",
          extensionDate: new Date(),
        },
        include: { user: true, room: true },
      });
      return NextResponse.json(updated);
    }

    if (action === "update_biaya") {
      const {
        checkIn, dueDate, deposit, leaseDuration, occupantCount,
        discount, additionalFees, totalAmount, paidAmount, paymentStatus,
        monthlyRent, emergencyPhone,
      } = body;
      const fees = parseAdditionalFees(additionalFees);
      const checkInDate = checkIn ? new Date(checkIn) : tenant.checkIn;
      const dueDateVal = dueDate ? new Date(dueDate) : tenant.dueDate;
      const rent = monthlyRent != null ? parseFloat(monthlyRent) : parseAmount(tenant.monthlyRent);
      const total = totalAmount != null
        ? parseFloat(totalAmount)
        : calcTotalAmount({
            monthlyRent: rent,
            dailyPrice: tenant.room.dailyPrice ? parseAmount(tenant.room.dailyPrice) : null,
            isDaily: tenant.isDaily,
            leaseDuration: leaseDuration || tenant.leaseDuration || "1 Bulan",
            occupantCount: occupantCount ? parseInt(occupantCount) : tenant.occupantCount,
            discount: discount ? parseFloat(discount) : parseAmount(tenant.discount),
            deposit: deposit ? parseFloat(deposit) : parseAmount(tenant.deposit),
            additionalFees: fees,
            checkIn: checkInDate,
            dueDate: dueDateVal,
          });

      const paid = paidAmount != null ? parseFloat(paidAmount) : parseAmount(tenant.paidAmount);
      const payStatus = paymentStatus || (paid >= total ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID");

      const updated = await prisma.tenant.update({
        where: { id: parseInt(id) },
        data: {
          checkIn: checkInDate,
          dueDate: dueDateVal,
          monthlyRent: rent,
          deposit: deposit != null ? parseFloat(deposit) : tenant.deposit,
          leaseDuration: leaseDuration || tenant.leaseDuration,
          occupantCount: occupantCount ? parseInt(occupantCount) : tenant.occupantCount,
          discount: discount != null ? parseFloat(discount) : tenant.discount,
          additionalFees: fees as unknown as Prisma.InputJsonValue,
          totalAmount: total,
          paidAmount: paid,
          paymentStatus: payStatus as "UNPAID" | "PARTIAL" | "PAID",
          lastPaymentDate: paid > 0 ? new Date() : tenant.lastPaymentDate,
          emergencyPhone: emergencyPhone !== undefined ? (emergencyPhone || null) : tenant.emergencyPhone,
        },
        include: { user: true, room: true },
      });
      return NextResponse.json(updated);
    }

    if (action === "update_profile") {
      const {
        name, phone, gender, ktp, maritalStatus, occupation, address, notes,
        ktpAddress, correspondenceAddress, workplace, workplaceAddress,
      } = body;
      await prisma.user.update({
        where: { id: tenant.userId },
        data: {
          name: name || tenant.user.name,
          phone: phone ?? tenant.user.phone,
          gender: gender ?? tenant.user.gender,
          ktp: ktp ?? tenant.user.ktp,
          maritalStatus: maritalStatus ?? tenant.user.maritalStatus,
          occupation: occupation ?? tenant.user.occupation,
          address: address ?? tenant.user.address,
          ktpAddress: ktpAddress ?? tenant.user.ktpAddress,
          correspondenceAddress: correspondenceAddress ?? tenant.user.correspondenceAddress,
          workplace: workplace ?? tenant.user.workplace,
          workplaceAddress: workplaceAddress ?? tenant.user.workplaceAddress,
        },
      });
      const updated = await prisma.tenant.update({
        where: { id: parseInt(id) },
        data: { notes: notes ?? tenant.notes },
        include: { user: true, room: true },
      });
      return NextResponse.json(updated);
    }

    if (action === "activate" || action === "checkin") {
      const { checkinTenant } = await import("@/lib/contract-workflow");
      const result = await checkinTenant(parseInt(id), session.userId);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result.tenant);
    }

    if (action === "approve") {
      const { approveTenant } = await import("@/lib/contract-workflow");
      const result = await approveTenant(parseInt(id), session.userId);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result.tenant);
    }

    if (action === "reject") {
      const { rejectTenant } = await import("@/lib/contract-workflow");
      const result = await rejectTenant(parseInt(id));
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "send_contract") {
      const { sendContractEmail } = await import("@/lib/contract-workflow");
      const result = await sendContractEmail(parseInt(id));
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result);
    }

    if (action === "mark_signed") {
      const { markContractSigned } = await import("@/lib/contract-workflow");
      const { signedUrl } = body;
      const result = await markContractSigned(parseInt(id), signedUrl);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result.tenant);
    }

    if (action === "generate_ba") {
      const { generateInventoryBa } = await import("@/lib/contract-workflow");
      const result = await generateInventoryBa(parseInt(id));
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result.tenant);
    }

    if (action === "refund_deposit") {
      const { refundDeposit } = await import("@/lib/contract-workflow");
      const { amount } = body;
      const result = await refundDeposit(parseInt(id), parseFloat(amount || "0"), session.userId);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result.tenant);
    }

    if (action === "apply_utility_invoice") {
      const { periodMonth, periodYear } = body;
      if (!periodMonth || !periodYear) {
        return NextResponse.json({ error: "Bulan dan tahun wajib diisi" }, { status: 400 });
      }
      const { applyUtilityBillsToInvoice } = await import("@/lib/utility-invoice-service");
      const result = await applyUtilityBillsToInvoice({
        tenantId: parseInt(id),
        periodMonth: parseInt(periodMonth),
        periodYear: parseInt(periodYear),
      });
      return NextResponse.json(result);
    }

    // Legacy checkout without action
    const { checkOut, status, inspections } = body;
    if (status === "COMPLETED") {
      const { checkoutTenantWithInspection } = await import("@/lib/inventory-service");
      const result = await checkoutTenantWithInspection(
        parseInt(id),
        checkOut ? new Date(checkOut) : new Date(),
        inspections || [],
        session.userId
      );
      return NextResponse.json(result.tenant);
    }

    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  } catch (error) {
    console.error("Tenants PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

    const tenant = await prisma.tenant.findUnique({ where: { id: parseInt(id) } });
    if (!tenant) return NextResponse.json({ error: "Penghuni tidak ditemukan" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.tenant.delete({ where: { id: parseInt(id) } });
      if (tenant.status === "ACTIVE") {
        await tx.room.update({
          where: { id: tenant.roomId },
          data: { status: "AVAILABLE" },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tenants DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function addDay(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
