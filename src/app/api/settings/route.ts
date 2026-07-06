import { NextRequest, NextResponse } from "next/server";
import { getProjectProfile, getBankAccounts } from "@/lib/settings-service";
import { prisma } from "@/lib/prisma";
import { parseLeasePackages } from "@/lib/tenant-utils";
import { requireProjectContext } from "@/lib/project-context";

export async function GET() {
  const auth = await requireProjectContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [profile, banks] = await Promise.all([
    getProjectProfile(auth.context.projectId),
    getBankAccounts(auth.context.entityId),
  ]);
  return NextResponse.json({ profile, banks, context: auth.context });
}

export async function PUT(request: NextRequest) {
  const auth = await requireProjectContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const { section } = body;
  const projectId = auth.context.projectId;
  const entityId = auth.context.entityId;

  if (section === "profile") {
    const profile = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: body.name,
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
    const profile = await prisma.project.update({
      where: { id: projectId },
      data: {
        gracePeriodDays: parseInt(body.gracePeriodDays) || 3,
        latePenaltyPerDay: parseFloat(body.latePenaltyPerDay) || 50000,
        paymentNotes: body.paymentNotes,
        termsAndConditions: body.termsAndConditions ?? undefined,
        leasePackages: leasePackages as unknown as object,
      },
    });

    if (Array.isArray(body.banks)) {
      await prisma.bankAccount.deleteMany({ where: { entityId } });
      if (body.banks.length > 0) {
        await prisma.bankAccount.createMany({
          data: body.banks.map(
            (
              b: { bankName: string; accountNumber: string; accountHolder: string },
              i: number
            ) => ({
              entityId,
              bankName: b.bankName,
              accountNumber: b.accountNumber,
              accountHolder: b.accountHolder,
              sortOrder: i,
            })
          ),
        });
      }
    }

    const banks = await getBankAccounts(entityId);
    return NextResponse.json({ profile, banks });
  }

  if (section === "contract_template") {
    const profile = await prisma.project.update({
      where: { id: projectId },
      data: {
        contractTemplate: body.contractTemplate ?? null,
        inventoryBaTemplate: body.inventoryBaTemplate ?? null,
      },
    });
    return NextResponse.json(profile);
  }

  return NextResponse.json({ error: "Section tidak valid" }, { status: 400 });
}
