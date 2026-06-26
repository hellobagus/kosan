import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, TenantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  calcDueDate,
  calcTotalAmount,
  generateInvoiceNumber,
  parseAdditionalFees,
  parseAmount,
} from "@/lib/tenant-utils";

function parseStatusParam(value: string | null): TenantStatus | undefined {
  if (!value) return undefined;
  const allowed = Object.values(TenantStatus) as string[];
  return allowed.includes(value) ? (value as TenantStatus) : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = parseStatusParam(searchParams.get("status"));

    const where = status ? { status } : {};

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        user: true,
        room: true,
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
    } = body;

    if (!name || !roomId || !checkIn || !monthlyRent) {
      return NextResponse.json({ error: "Data wajib belum lengkap" }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { id: parseInt(roomId) } });
    if (!room) {
      return NextResponse.json({ error: "Kamar tidak ditemukan" }, { status: 400 });
    }

    const tenantStatus = status || "ACTIVE";
    if (tenantStatus === "ACTIVE" && room.status !== "AVAILABLE") {
      return NextResponse.json({ error: "Kamar tidak tersedia" }, { status: 400 });
    }

    let userId: number;
    const tenantEmail = email || `penghuni_${Date.now()}@kosanku.local`;

    const existingUser = await prisma.user.findUnique({ where: { email: tenantEmail } });
    if (existingUser) {
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
        },
      });
      userId = newUser.id;
    }

    const lease = leaseDuration || "1 Bulan";
    const checkInDate = new Date(checkIn);
    const dueDate = calcDueDate(checkInDate, lease);
    const fees = parseAdditionalFees(additionalFees);
    const total = calcTotalAmount({
      monthlyRent: parseFloat(monthlyRent),
      dailyPrice: room.dailyPrice ? parseAmount(room.dailyPrice) : null,
      isDaily: isDaily || lease === "1 Hari",
      leaseDuration: lease,
      occupantCount: occupantCount ? parseInt(occupantCount) : 1,
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
          status: tenantStatus as "ACTIVE" | "RESERVED",
          leaseDuration: lease,
          occupantCount: occupantCount ? parseInt(occupantCount) : 1,
          discount: discount ? parseFloat(discount) : 0,
          additionalFees: fees.length > 0 ? (fees as unknown as Prisma.InputJsonValue) : undefined,
          totalAmount: total,
          paidAmount: paid,
          paymentStatus: payStatus as "UNPAID" | "PARTIAL" | "PAID",
          invoiceNumber: generateInvoiceNumber(Date.now() % 10000),
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
            createdBy: session.userId,
          },
        });
      }

      return tx.tenant.update({
        where: { id: t.id },
        data: { invoiceNumber: generateInvoiceNumber(t.id) },
        include: { user: true, room: true },
      });
    });

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

    if (action === "checkout") {
      const { checkOut } = body;
      const updated = await prisma.$transaction(async (tx) => {
        const t = await tx.tenant.update({
          where: { id: parseInt(id) },
          data: {
            status: "COMPLETED",
            checkOut: checkOut ? new Date(checkOut) : new Date(),
          },
          include: { user: true, room: true },
        });
        await tx.room.update({
          where: { id: tenant.roomId },
          data: { status: "AVAILABLE" },
        });
        return t;
      });
      return NextResponse.json(updated);
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
      } = body;
      const fees = parseAdditionalFees(additionalFees);
      const checkInDate = checkIn ? new Date(checkIn) : tenant.checkIn;
      const dueDateVal = dueDate ? new Date(dueDate) : tenant.dueDate;
      const total = totalAmount != null
        ? parseFloat(totalAmount)
        : calcTotalAmount({
            monthlyRent: parseAmount(tenant.monthlyRent),
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
          deposit: deposit != null ? parseFloat(deposit) : tenant.deposit,
          leaseDuration: leaseDuration || tenant.leaseDuration,
          occupantCount: occupantCount ? parseInt(occupantCount) : tenant.occupantCount,
          discount: discount != null ? parseFloat(discount) : tenant.discount,
          additionalFees: fees as unknown as Prisma.InputJsonValue,
          totalAmount: total,
          paidAmount: paid,
          paymentStatus: payStatus as "UNPAID" | "PARTIAL" | "PAID",
          lastPaymentDate: paid > 0 ? new Date() : tenant.lastPaymentDate,
        },
        include: { user: true, room: true },
      });
      return NextResponse.json(updated);
    }

    if (action === "update_profile") {
      const { name, phone, gender, ktp, maritalStatus, occupation, address, notes } = body;
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
        },
      });
      const updated = await prisma.tenant.update({
        where: { id: parseInt(id) },
        data: { notes: notes ?? tenant.notes },
        include: { user: true, room: true },
      });
      return NextResponse.json(updated);
    }

    if (action === "activate") {
      if (tenant.status !== "RESERVED") {
        return NextResponse.json({ error: "Hanya reservasi yang dapat diproses" }, { status: 400 });
      }
      const updated = await prisma.$transaction(async (tx) => {
        const t = await tx.tenant.update({
          where: { id: parseInt(id) },
          data: { status: "ACTIVE" },
          include: { user: true, room: true },
        });
        await tx.room.update({
          where: { id: tenant.roomId },
          data: { status: "OCCUPIED" },
        });
        return t;
      });
      return NextResponse.json(updated);
    }

    // Legacy checkout without action
    const { checkOut, status } = body;
    if (status === "COMPLETED") {
      const updated = await prisma.$transaction(async (tx) => {
        const t = await tx.tenant.update({
          where: { id: parseInt(id) },
          data: {
            status: "COMPLETED",
            checkOut: checkOut ? new Date(checkOut) : new Date(),
          },
          include: { user: true, room: true },
        });
        await tx.room.update({
          where: { id: tenant.roomId },
          data: { status: "AVAILABLE" },
        });
        return t;
      });
      return NextResponse.json(updated);
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
