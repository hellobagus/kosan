import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, TenantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/document-number";
import { parseSuggestedDeposit, resolvePublicProject } from "@/lib/public-project";
import {
  calcDueDate,
  calcTotalAmount,
  findLeasePackage,
  getLeaseBonusMonths,
  parseAdditionalOccupants,
  parseAmount,
  parseLeasePackages,
  type TenantPaymentType,
} from "@/lib/tenant-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project: projectCode,
      name,
      email,
      phone,
      password,
      roomId,
      checkIn,
      leaseDuration,
      paymentType,
      gender,
      ktp,
      maritalStatus,
      occupation,
      ktpAddress,
      correspondenceAddress,
      workplace,
      workplaceAddress,
      emergencyPhone,
      occupantCount,
      additionalOccupants,
      notes,
      agreedTerms,
      rentType,
    } = body;

    if (!name || !roomId || !checkIn || !leaseDuration) {
      return NextResponse.json({ error: "Data wajib belum lengkap" }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return NextResponse.json({ error: "Email wajib dan harus valid" }, { status: 400 });
    }

    if (!phone || !/^08\d{8,12}$/.test(String(phone).replace(/\s/g, ""))) {
      return NextResponse.json({ error: "Nomor HP harus diawali 08 dan valid" }, { status: 400 });
    }

    if (!ktp || String(ktp).replace(/\D/g, "").length !== 16) {
      return NextResponse.json({ error: "Nomor KTP wajib 16 digit" }, { status: 400 });
    }

    if (!agreedTerms) {
      return NextResponse.json({ error: "Syarat & Ketentuan harus disetujui" }, { status: 400 });
    }

    const room = await prisma.room.findFirst({
      where: { id: parseInt(String(roomId), 10) },
      include: { floorRef: { include: { building: true } } },
    });
    if (!room || !room.floorRef?.building) {
      return NextResponse.json({ error: "Kamar tidak ditemukan" }, { status: 400 });
    }

    const project = await resolvePublicProject(projectCode);
    if (!project || room.floorRef.building.projectId !== project.id) {
      return NextResponse.json({ error: "Kamar tidak termasuk kosan ini" }, { status: 400 });
    }

    if (room.status !== "AVAILABLE" || parseAmount(room.price) <= 0) {
      return NextResponse.json({ error: "Kamar tidak tersedia untuk dipilih" }, { status: 400 });
    }

    const activeTenant = await prisma.tenant.findFirst({
      where: { roomId: room.id, status: "ACTIVE" },
    });
    if (activeTenant) {
      return NextResponse.json({ error: "Kamar sudah terisi penghuni aktif" }, { status: 400 });
    }

    const pendingSameRoom = await prisma.tenant.findFirst({
      where: {
        roomId: room.id,
        status: { in: ["PENDING", "APPROVED", "CONTRACT_SENT", "CONTRACT_SIGNED", "RESERVED"] },
      },
    });
    if (pendingSameRoom) {
      return NextResponse.json(
        { error: "Kamar sedang dalam proses pendaftaran calon lain. Silakan pilih kamar lain." },
        { status: 409 }
      );
    }

    const isDaily = rentType === "HARIAN" || leaseDuration === "1 Hari";
    const lease = isDaily ? "1 Hari" : String(leaseDuration);
    const leasePackages = parseLeasePackages(project.leasePackages, {
      leaseBonusRules: project.leaseBonusRules,
      yearlyLeaseBonusEnabled: project.yearlyLeaseBonusEnabled,
      yearlyLeaseBonusMonths: project.yearlyLeaseBonusMonths,
    });

    if (!isDaily) {
      const pkg = findLeasePackage(lease, leasePackages);
      if (!pkg) {
        return NextResponse.json({ error: "Lama sewa tidak tersedia" }, { status: 400 });
      }
    }

    const payType: TenantPaymentType =
      paymentType === "INSTALLMENT" ? "INSTALLMENT" : "FULL";
    const selectedPkg = findLeasePackage(lease, leasePackages);
    const bonusMonths = getLeaseBonusMonths(lease, leasePackages, payType);
    const leaseGift = payType === "FULL" && selectedPkg?.gift ? selectedPkg.gift : null;

    const checkInDate = new Date(checkIn);
    if (Number.isNaN(checkInDate.getTime())) {
      return NextResponse.json({ error: "Tanggal masuk tidak valid" }, { status: 400 });
    }

    const dueDate = calcDueDate(checkInDate, lease, bonusMonths);
    const monthlyRent = isDaily
      ? parseAmount(room.dailyPrice) || parseAmount(room.price)
      : parseAmount(room.price);
    const deposit = parseSuggestedDeposit(room.equipment) || monthlyRent;
    const occCount = Math.min(4, Math.max(1, parseInt(String(occupantCount || "1"), 10) || 1));
    const occupants = parseAdditionalOccupants(additionalOccupants);

    if (occCount >= 2) {
      const required = occCount - 1;
      if (occupants.length < required) {
        return NextResponse.json(
          { error: `Data penghuni tambahan wajib diisi (${required} orang)` },
          { status: 400 }
        );
      }
      for (const o of occupants.slice(0, required)) {
        if (!o.name || o.ktp.length !== 16) {
          return NextResponse.json(
            { error: "Nama dan No. KTP penghuni tambahan wajib lengkap (16 digit)" },
            { status: 400 }
          );
        }
      }
    }

    const total = calcTotalAmount({
      monthlyRent,
      dailyPrice: room.dailyPrice ? parseAmount(room.dailyPrice) : null,
      isDaily,
      leaseDuration: lease,
      occupantCount: occCount,
      discount: 0,
      deposit,
      additionalFees: [],
      checkIn: checkInDate,
      dueDate,
    });

    const tenantEmail = String(email).trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: tenantEmail } });
    if (existingUser && existingUser.role !== "TENANT") {
      return NextResponse.json({ error: "Email sudah digunakan akun lain" }, { status: 400 });
    }

    if (existingUser) {
      const activeLease = await prisma.tenant.findFirst({
        where: {
          userId: existingUser.id,
          status: { in: ["ACTIVE", "PENDING", "APPROVED", "CONTRACT_SENT", "CONTRACT_SIGNED", "RESERVED"] },
        },
      });
      if (activeLease) {
        return NextResponse.json(
          { error: "Email ini sudah memiliki pendaftaran atau sewa aktif" },
          { status: 400 }
        );
      }
    }

    const invoiceNo = await generateInvoiceNumber(project.entityId, project.id);
    const hashedPassword = await bcrypt.hash(
      password && String(password).length >= 6 ? String(password) : "penghuni123",
      10
    );

    const tenant = await prisma.$transaction(async (tx) => {
      let userId: number;
      if (existingUser) {
        userId = existingUser.id;
        await tx.user.update({
          where: { id: userId },
          data: {
            name: String(name).trim(),
            phone: String(phone).replace(/\s/g, ""),
            gender: gender || null,
            ktp: String(ktp).replace(/\D/g, ""),
            maritalStatus: maritalStatus || null,
            occupation: occupation || null,
            ktpAddress: ktpAddress || null,
            correspondenceAddress: correspondenceAddress || ktpAddress || null,
            workplace: workplace || null,
            workplaceAddress: workplaceAddress || null,
            ...(password && String(password).length >= 6 ? { password: hashedPassword } : {}),
          },
        });
      } else {
        const newUser = await tx.user.create({
          data: {
            name: String(name).trim(),
            email: tenantEmail,
            password: hashedPassword,
            phone: String(phone).replace(/\s/g, ""),
            role: "TENANT",
            gender: gender || null,
            ktp: String(ktp).replace(/\D/g, ""),
            maritalStatus: maritalStatus || null,
            occupation: occupation || null,
            ktpAddress: ktpAddress || null,
            correspondenceAddress: correspondenceAddress || ktpAddress || null,
            workplace: workplace || null,
            workplaceAddress: workplaceAddress || null,
          },
        });
        userId = newUser.id;
      }

      return tx.tenant.create({
        data: {
          userId,
          roomId: room.id,
          checkIn: checkInDate,
          dueDate,
          monthlyRent,
          deposit,
          notes: notes
            ? `[Pendaftaran Online]\n${notes}`
            : "[Pendaftaran Online]",
          status: "PENDING" as TenantStatus,
          leaseDuration: lease,
          occupantCount: occCount,
          discount: 0,
          additionalOccupants:
            occupants.length > 0 ? (occupants as unknown as Prisma.InputJsonValue) : undefined,
          emergencyPhone: emergencyPhone || null,
          termsAcceptedAt: new Date(),
          contractRequested: true,
          paymentType: payType,
          leaseBonusMonths: bonusMonths,
          leaseGift,
          totalAmount: total,
          paidAmount: 0,
          paymentStatus: "UNPAID",
          invoiceNumber: invoiceNo,
          isDaily,
          createdByName: "Pendaftaran Online",
          updatedByName: "Pendaftaran Online",
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          room: { select: { id: true, roomNumber: true, price: true } },
        },
      });
    });

    return NextResponse.json(
      {
        ok: true,
        message:
          "Pendaftaran berhasil dikirim. Tim kami akan menghubungi Anda untuk proses persetujuan.",
        application: {
          id: tenant.id,
          status: tenant.status,
          roomNumber: tenant.room.roomNumber,
          checkIn: tenant.checkIn,
          leaseDuration: tenant.leaseDuration,
          totalAmount: tenant.totalAmount?.toString(),
          email: tenant.user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Public apply error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
