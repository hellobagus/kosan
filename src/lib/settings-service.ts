import { prisma } from "@/lib/prisma";
import { getProjectContextForUser } from "@/lib/project-context";
import { getSession, isStaff } from "@/lib/auth";
import { ensureDefaultOrganization } from "@/lib/organization-service";
import { resolveProjectFromRoom } from "@/lib/document-number";

export type ProjectProfile = {
  id: number;
  entityId: number;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  gracePeriodDays: number;
  latePenaltyPerDay: { toString(): string };
  paymentNotes: string | null;
  termsAndConditions: string | null;
  yearlyLeaseBonusEnabled: boolean;
  yearlyLeaseBonusMonths: number;
  leaseBonusRules: unknown;
  leasePackages: unknown;
  managerName: string | null;
  contractLocation: string | null;
  contractTemplate: string | null;
  inventoryBaTemplate: string | null;
};

export async function getProjectProfile(projectId?: number): Promise<ProjectProfile> {
  if (!projectId) {
    await ensureDefaultOrganization();
    const session = await getSession();
    if (session && isStaff(session.role)) {
      const ctx = await getProjectContextForUser(session);
      if (ctx) {
        return prisma.project.findUniqueOrThrow({ where: { id: ctx.projectId } });
      }
    }
    const project = await prisma.project.findFirst({ orderBy: { id: "asc" } });
    if (project) return project;
  } else {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (project) return project;
  }

  await ensureDefaultOrganization();
  return prisma.project.findFirstOrThrow({ orderBy: { id: "asc" } });
}

/** Profil project dari kamar penghuni (untuk kontrak, invoice, BA, dll.) */
export async function getProjectProfileForRoom(roomId: number): Promise<ProjectProfile> {
  const org = await resolveProjectFromRoom(roomId);
  if (org) {
    return getProjectProfile(org.projectId);
  }
  await ensureDefaultOrganization();
  return prisma.project.findFirstOrThrow({ orderBy: { id: "asc" } });
}

/** @deprecated use getProjectProfile */
export async function getKosanProfile() {
  const profile = await getProjectProfile();
  return {
    id: 1,
    name: profile.name,
    address: profile.address,
    phone: profile.phone,
    email: profile.email,
    logoUrl: profile.logoUrl,
    gracePeriodDays: profile.gracePeriodDays,
    latePenaltyPerDay: profile.latePenaltyPerDay,
    paymentNotes: profile.paymentNotes,
    termsAndConditions: profile.termsAndConditions,
    yearlyLeaseBonusEnabled: profile.yearlyLeaseBonusEnabled,
    yearlyLeaseBonusMonths: profile.yearlyLeaseBonusMonths,
    leaseBonusRules: profile.leaseBonusRules,
    leasePackages: profile.leasePackages,
    managerName: profile.managerName,
    contractLocation: profile.contractLocation,
    contractTemplate: profile.contractTemplate,
    inventoryBaTemplate: profile.inventoryBaTemplate,
    updatedAt: new Date(),
  };
}

export async function getBankAccounts(entityId?: number) {
  if (entityId) {
    return prisma.bankAccount.findMany({
      where: { entityId },
      orderBy: { sortOrder: "asc" },
    });
  }
  const session = await getSession();
  if (session && isStaff(session.role)) {
    const ctx = await getProjectContextForUser(session);
    if (ctx) {
      return prisma.bankAccount.findMany({
        where: { entityId: ctx.entityId },
        orderBy: { sortOrder: "asc" },
      });
    }
  }
  return prisma.bankAccount.findMany({ orderBy: { sortOrder: "asc" } });
}
