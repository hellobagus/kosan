import { NextRequest, NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { getKosanProfile, getBankAccounts } from "@/lib/settings-service";
import { prisma } from "@/lib/prisma";
import { parseLeasePackages } from "@/lib/tenant-utils";

export async function GET() {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile, banks] = await Promise.all([getKosanProfile(), getBankAccounts()]);
  return NextResponse.json({ profile, banks });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { section } = body;

  if (section === "profile") {
    const profile = await prisma.kosanProfile.upsert({
      where: { id: 1 },
      update: {
        name: body.name,
        address: body.address,
        phone: body.phone,
        email: body.email,
        logoUrl: body.logoUrl,
        managerName: body.managerName,
        contractLocation: body.contractLocation,
      },
      create: {
        name: body.name || "KosanKu",
        address: body.address,
        phone: body.phone,
        email: body.email,
        logoUrl: body.logoUrl,
        managerName: body.managerName,
        contractLocation: body.contractLocation,
      },
    });
    return NextResponse.json(profile);
  }

  if (section === "kosan") {
    const leasePackages = parseLeasePackages(body.leasePackages, {
      leaseBonusRules: body.leaseBonusRules,
    });
    const profile = await prisma.kosanProfile.upsert({
      where: { id: 1 },
      update: {
        gracePeriodDays: parseInt(body.gracePeriodDays) || 3,
        latePenaltyPerDay: parseFloat(body.latePenaltyPerDay) || 50000,
        paymentNotes: body.paymentNotes,
        termsAndConditions: body.termsAndConditions ?? undefined,
        leasePackages: leasePackages as unknown as object,
      },
      create: {
        gracePeriodDays: parseInt(body.gracePeriodDays) || 3,
        latePenaltyPerDay: parseFloat(body.latePenaltyPerDay) || 50000,
        paymentNotes: body.paymentNotes,
        termsAndConditions: body.termsAndConditions,
        leasePackages: leasePackages as unknown as object,
      },
    });

    if (Array.isArray(body.banks)) {
      await prisma.bankAccount.deleteMany();
      if (body.banks.length > 0) {
        await prisma.bankAccount.createMany({
          data: body.banks.map(
            (
              b: { bankName: string; accountNumber: string; accountHolder: string },
              i: number
            ) => ({
              bankName: b.bankName,
              accountNumber: b.accountNumber,
              accountHolder: b.accountHolder,
              sortOrder: i,
            })
          ),
        });
      }
    }

    const banks = await getBankAccounts();
    return NextResponse.json({ profile, banks });
  }

  return NextResponse.json({ error: "Section tidak valid" }, { status: 400 });
}
