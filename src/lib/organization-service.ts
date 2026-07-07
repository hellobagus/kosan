import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROLE_OPTIONS } from "@/lib/rbac";

export async function ensureDefaultOrganization() {
  const holdingCount = await prisma.holding.count();
  if (holdingCount > 0) return getDefaultOrganization();

  const profile = await prisma.kosanProfile.findUnique({ where: { id: 1 } });
  const banks = await prisma.bankAccount.findMany({ orderBy: { sortOrder: "asc" } });

  const holding = await prisma.holding.create({
    data: {
      name: "Holding KosanKu",
      code: "HOLD",
      description: "Holding default",
    },
  });

  const entity = await prisma.entity.create({
    data: {
      holdingId: holding.id,
      name: profile?.name || "KosanKu",
      code: "KOSAN",
      address: profile?.address,
      phone: profile?.phone,
      email: profile?.email,
    },
  });

  const project = await prisma.project.create({
    data: {
      entityId: entity.id,
      name: profile?.name || "KosanKu",
      code: "MAIN",
      address: profile?.address,
      phone: profile?.phone,
      email: profile?.email,
      logoUrl: profile?.logoUrl,
      gracePeriodDays: profile?.gracePeriodDays ?? 3,
      latePenaltyPerDay: profile?.latePenaltyPerDay ?? 50000,
      paymentNotes: profile?.paymentNotes,
      termsAndConditions: profile?.termsAndConditions,
      yearlyLeaseBonusEnabled: profile?.yearlyLeaseBonusEnabled ?? true,
      yearlyLeaseBonusMonths: profile?.yearlyLeaseBonusMonths ?? 1,
      leaseBonusRules: profile?.leaseBonusRules ?? Prisma.JsonNull,
      leasePackages: profile?.leasePackages ?? Prisma.JsonNull,
      managerName: profile?.managerName,
      contractLocation: profile?.contractLocation,
      contractTemplate: profile?.contractTemplate,
      inventoryBaTemplate: profile?.inventoryBaTemplate,
    },
  });

  if (banks.length > 0) {
    await prisma.bankAccount.updateMany({
      where: { entityId: null },
      data: { entityId: entity.id },
    });
  }

  const building = await prisma.building.create({
    data: {
      projectId: project.id,
      name: "Gedung Utama",
      code: "GDG01",
      sortOrder: 0,
    },
  });

  const floorLevels = await prisma.room.findMany({
    select: { floor: true },
    distinct: ["floor"],
    orderBy: { floor: "asc" },
  });
  const levels = floorLevels.length > 0 ? floorLevels.map((f) => f.floor) : [1];

  const floorMap = new Map<number, number>();
  for (const level of levels) {
    const floor = await prisma.floor.create({
      data: {
        buildingId: building.id,
        name: `Lantai ${level}`,
        level,
        sortOrder: level,
      },
    });
    floorMap.set(level, floor.id);
  }

  const rooms = await prisma.room.findMany();
  for (const room of rooms) {
    const floorId = floorMap.get(room.floor) || floorMap.get(1)!;
    await prisma.room.update({
      where: { id: room.id },
      data: { floorId },
    });
  }

  await prisma.utility.updateMany({ where: { projectId: null }, data: { projectId: project.id } });
  await prisma.sharedArea.updateMany({ where: { projectId: null }, data: { projectId: project.id } });
  await prisma.roomTemplate.updateMany({ where: { projectId: null }, data: { projectId: project.id } });
  await prisma.supplier.updateMany({ where: { projectId: null }, data: { projectId: project.id } });
  await prisma.inventoryCategory.updateMany({ where: { projectId: null }, data: { projectId: project.id } });
  await prisma.inventoryItem.updateMany({ where: { projectId: null }, data: { projectId: project.id } });
  await prisma.purchase.updateMany({ where: { projectId: null }, data: { projectId: project.id } });
  await prisma.finance.updateMany({ where: { projectId: null }, data: { projectId: project.id } });

  const staff = await prisma.user.findMany({
    where: { role: { in: ROLE_OPTIONS.filter((role) => role !== "TENANT") } },
  });
  for (const user of staff) {
    await prisma.userEntityAccess.upsert({
      where: { userId_entityId: { userId: user.id, entityId: entity.id } },
      create: { userId: user.id, entityId: entity.id },
      update: {},
    });
    await prisma.userProjectAccess.upsert({
      where: { userId_projectId: { userId: user.id, projectId: project.id } },
      create: { userId: user.id, projectId: project.id },
      update: {},
    });
  }

  return { holding, entity, project, building };
}

async function getDefaultOrganization() {
  const project = await prisma.project.findFirst({
    where: { active: true },
    include: { entity: { include: { holding: true } } },
    orderBy: { id: "asc" },
  });
  if (!project) throw new Error("Organisasi belum dikonfigurasi");
  return {
    holding: project.entity.holding,
    entity: project.entity,
    project,
    building: await prisma.building.findFirst({ where: { projectId: project.id } }),
  };
}

export async function listHoldings() {
  return prisma.holding.findMany({
    where: { active: true },
    include: {
      entities: {
        where: { active: true },
        include: { projects: { where: { active: true } } },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function listBuildings(projectId: number) {
  return prisma.building.findMany({
    where: { projectId, active: true },
    include: {
      floors: {
        where: { active: true },
        orderBy: { level: "asc" },
        include: { _count: { select: { rooms: true } } },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}
