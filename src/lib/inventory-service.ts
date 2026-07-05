import { AssetStatus, InspectionResult, MaintenanceStatus, Prisma, PurchaseStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  IN_WAREHOUSE: "Di Gudang",
  DEPLOYED: "Di Kamar",
  IN_USE: "Digunakan Penyewa",
  DAMAGED: "Rusak",
  MAINTENANCE: "Maintenance",
  RETIRED: "Tidak Aktif",
};

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  DRAFT: "Draft",
  ORDERED: "Dipesan",
  RECEIVED: "Diterima",
  CANCELLED: "Dibatalkan",
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  OPEN: "Terbuka",
  IN_PROGRESS: "Diproses",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const INSPECTION_RESULT_LABELS: Record<InspectionResult, string> = {
  OK: "Baik",
  DAMAGED: "Rusak",
  MISSING: "Hilang",
};

export function generatePurchaseNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `PO${y}${m}${rand}`;
}

export async function generateAssetCode(itemName: string): Promise<string> {
  const prefix = itemName
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase() || "AST";
  const count = await prisma.roomAsset.count();
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

async function logTransaction(
  tx: Prisma.TransactionClient,
  data: {
    assetId: number;
    action: string;
    fromStatus?: AssetStatus;
    toStatus?: AssetStatus;
    roomId?: number | null;
    tenantId?: number | null;
    notes?: string;
    createdBy?: number;
  }
) {
  await tx.assetTransaction.create({ data });
}

export async function receivePurchase(
  purchaseId: number,
  userId?: number
) {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: { include: { item: true } } },
    });
    if (!purchase) throw new Error("Pembelian tidak ditemukan");
    if (purchase.status === "RECEIVED") throw new Error("Pembelian sudah diterima");
    if (purchase.status === "CANCELLED") throw new Error("Pembelian dibatalkan");

    const createdAssets: number[] = [];

    for (const pi of purchase.items) {
      await tx.warehouseEntry.create({
        data: {
          purchaseId,
          itemId: pi.itemId,
          quantity: pi.quantity,
          notes: `Penerimaan ${purchase.purchaseNumber}`,
        },
      });

      const stock = await tx.warehouseStock.findUnique({ where: { itemId: pi.itemId } });
      if (stock) {
        await tx.warehouseStock.update({
          where: { itemId: pi.itemId },
          data: { quantity: stock.quantity + pi.quantity },
        });
      } else {
        await tx.warehouseStock.create({
          data: { itemId: pi.itemId, quantity: pi.quantity },
        });
      }

      for (let i = 0; i < pi.quantity; i++) {
        const prefix = pi.item.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() || "AST";
        const assetCode = `${prefix}-${purchaseId}-${pi.itemId}-${i + 1}`;
        const asset = await tx.roomAsset.create({
          data: {
            assetCode,
            itemId: pi.itemId,
            status: "IN_WAREHOUSE",
            purchasePrice: pi.unitPrice,
          },
        });
        createdAssets.push(asset.id);
        await logTransaction(tx, {
          assetId: asset.id,
          action: "WAREHOUSE_RECEIVE",
          toStatus: "IN_WAREHOUSE",
          notes: `Dari pembelian ${purchase.purchaseNumber}`,
          createdBy: userId,
        });
      }
    }

    const finance = await tx.finance.create({
      data: {
        type: "EXPENSE",
        amount: purchase.totalAmount,
        description: `Pembelian barang ${purchase.purchaseNumber}`,
        category: "Pembelian Inventaris",
        transactionDate: new Date(),
        createdBy: userId,
      },
    });

    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        status: "RECEIVED",
        receivedAt: new Date(),
        financeId: finance.id,
      },
    });

    return { purchaseId, assetsCreated: createdAssets.length, financeId: finance.id };
  });
}

export async function deployAssetToRoom(
  assetId: number,
  roomId: number,
  utilityId?: number,
  userId?: number
) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.roomAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error("Asset tidak ditemukan");
    if (asset.status !== "IN_WAREHOUSE") {
      throw new Error("Asset harus berada di gudang untuk ditempatkan ke kamar");
    }

    const stock = await tx.warehouseStock.findUnique({ where: { itemId: asset.itemId } });
    if (!stock || stock.quantity < 1) throw new Error("Stok gudang tidak mencukupi");

    await tx.warehouseStock.update({
      where: { itemId: asset.itemId },
      data: { quantity: stock.quantity - 1 },
    });

    const updated = await tx.roomAsset.update({
      where: { id: assetId },
      data: {
        roomId,
        utilityId: utilityId || null,
        status: "DEPLOYED",
        deployedAt: new Date(),
      },
      include: { item: true, room: true, utility: true },
    });

    await logTransaction(tx, {
      assetId,
      action: "DEPLOY_TO_ROOM",
      fromStatus: "IN_WAREHOUSE",
      toStatus: "DEPLOYED",
      roomId,
      notes: `Ditempatkan ke kamar ${updated.room?.roomNumber}`,
      createdBy: userId,
    });

    return updated;
  });
}

export async function activateRoomAssetsForTenant(
  roomId: number,
  tenantId: number,
  userId?: number
) {
  return prisma.$transaction(async (tx) => {
    const assets = await tx.roomAsset.findMany({
      where: { roomId, status: "DEPLOYED" },
    });

    for (const asset of assets) {
      await tx.roomAsset.update({
        where: { id: asset.id },
        data: { tenantId, status: "IN_USE" },
      });
      await logTransaction(tx, {
        assetId: asset.id,
        action: "CHECKIN_TENANT",
        fromStatus: "DEPLOYED",
        toStatus: "IN_USE",
        roomId,
        tenantId,
        createdBy: userId,
      });
    }

    return assets.length;
  });
}

export async function reportAssetDamage(
  assetId: number,
  data: { title: string; description?: string; tenantId?: number; userId?: number }
) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.roomAsset.findUnique({
      where: { id: assetId },
      include: { room: true },
    });
    if (!asset) throw new Error("Asset tidak ditemukan");

    const prevStatus = asset.status;
    await tx.roomAsset.update({
      where: { id: assetId },
      data: { status: "DAMAGED" },
    });

    const maintenance = await tx.assetMaintenance.create({
      data: {
        assetId,
        roomId: asset.roomId,
        tenantId: data.tenantId || asset.tenantId,
        title: data.title,
        description: data.description,
        status: "OPEN",
      },
      include: { asset: { include: { item: true } }, room: true },
    });

    await logTransaction(tx, {
      assetId,
      action: "REPORT_DAMAGE",
      fromStatus: prevStatus,
      toStatus: "DAMAGED",
      roomId: asset.roomId,
      tenantId: data.tenantId || asset.tenantId,
      notes: data.title,
      createdBy: data.userId,
    });

    return maintenance;
  });
}

export async function completeMaintenance(
  maintenanceId: number,
  data: { cost?: number; userId?: number }
) {
  return prisma.$transaction(async (tx) => {
    const maintenance = await tx.assetMaintenance.findUnique({
      where: { id: maintenanceId },
      include: { asset: true },
    });
    if (!maintenance) throw new Error("Maintenance tidak ditemukan");

    let financeId: number | undefined;
    const cost = data.cost ?? Number(maintenance.cost);
    if (cost > 0) {
      const finance = await tx.finance.create({
        data: {
          type: "EXPENSE",
          amount: cost,
          description: `Biaya maintenance: ${maintenance.title}`,
          category: "Maintenance Inventaris",
          roomId: maintenance.roomId,
          tenantId: maintenance.tenantId,
          createdBy: data.userId,
        },
      });
      financeId = finance.id;
    }

    await tx.assetMaintenance.update({
      where: { id: maintenanceId },
      data: {
        status: "COMPLETED",
        cost,
        completedAt: new Date(),
        financeId,
      },
    });

    const newStatus: AssetStatus = maintenance.asset.roomId ? "DEPLOYED" : "IN_WAREHOUSE";
    await tx.roomAsset.update({
      where: { id: maintenance.assetId },
      data: { status: newStatus },
    });

    await logTransaction(tx, {
      assetId: maintenance.assetId,
      action: "MAINTENANCE_COMPLETE",
      fromStatus: "MAINTENANCE",
      toStatus: newStatus,
      roomId: maintenance.roomId,
      tenantId: maintenance.tenantId,
      notes: `Maintenance selesai: ${maintenance.title}`,
      createdBy: data.userId,
    });

    return maintenance;
  });
}

export async function inspectCheckoutAssets(
  tenantId: number,
  inspections: Array<{
    assetId: number;
    result: InspectionResult;
    damageCost?: number;
    notes?: string;
  }>,
  userId?: number
) {
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      include: { room: true },
    });
    if (!tenant) throw new Error("Penghuni tidak ditemukan");

    let totalDeduction = 0;
    const results = [];

    for (const insp of inspections) {
      const asset = await tx.roomAsset.findUnique({ where: { id: insp.assetId } });
      if (!asset) continue;

      const damageCost = insp.damageCost || 0;
      const depositDeducted = insp.result !== "OK" ? damageCost : 0;
      totalDeduction += depositDeducted;

      const record = await tx.checkoutInspection.create({
        data: {
          tenantId,
          roomId: tenant.roomId,
          assetId: insp.assetId,
          result: insp.result,
          damageCost,
          depositDeducted,
          notes: insp.notes,
          inspectedBy: userId,
        },
        include: { asset: { include: { item: true } } },
      });
      results.push(record);

      let newStatus: AssetStatus = "DEPLOYED";
      if (insp.result === "DAMAGED") newStatus = "DAMAGED";
      if (insp.result === "MISSING") newStatus = "RETIRED";

      await tx.roomAsset.update({
        where: { id: insp.assetId },
        data: { tenantId: null, status: newStatus },
      });

      await logTransaction(tx, {
        assetId: insp.assetId,
        action: "CHECKOUT_INSPECT",
        fromStatus: asset.status,
        toStatus: newStatus,
        roomId: tenant.roomId,
        tenantId,
        notes: `Inspeksi: ${insp.result}`,
        createdBy: userId,
      });

      if (insp.result === "DAMAGED") {
        await tx.assetMaintenance.create({
          data: {
            assetId: insp.assetId,
            roomId: tenant.roomId,
            tenantId,
            title: `Kerusakan saat checkout - ${record.asset.item.name}`,
            description: insp.notes,
            status: "OPEN",
          },
        });
      }
    }

    if (totalDeduction > 0) {
      const currentDeposit = Number(tenant.deposit);
      const deduction = Math.min(totalDeduction, currentDeposit);
      await tx.tenant.update({
        where: { id: tenantId },
        data: { deposit: currentDeposit - deduction },
      });
      if (deduction > 0) {
        await tx.finance.create({
          data: {
            type: "INCOME",
            amount: deduction,
            description: `Potong deposit kerusakan barang - ${tenant.invoiceNumber || `Penghuni #${tenantId}`}`,
            category: "Potong Deposit",
            tenantId,
            roomId: tenant.roomId,
            createdBy: userId,
          },
        });
      }
    }

    return { inspections: results, totalDeduction };
  });
}

export async function reactivateAsset(assetId: number, userId?: number) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.roomAsset.findUnique({
      where: { id: assetId },
      include: { room: true },
    });
    if (!asset) throw new Error("Asset tidak ditemukan");

    const newStatus: AssetStatus = asset.roomId ? "DEPLOYED" : "IN_WAREHOUSE";
    const updated = await tx.roomAsset.update({
      where: { id: assetId },
      data: { status: newStatus },
      include: { item: true, room: true },
    });

    await logTransaction(tx, {
      assetId,
      action: "REACTIVATE",
      fromStatus: asset.status,
      toStatus: newStatus,
      roomId: asset.roomId,
      createdBy: userId,
    });

    return updated;
  });
}

export async function getInventoryStats() {
  const [
    totalRooms,
    totalAssets,
    damagedAssets,
    maintenanceOpen,
    assetValue,
  ] = await Promise.all([
    prisma.room.count(),
    prisma.roomAsset.count({ where: { status: { not: "RETIRED" } } }),
    prisma.roomAsset.count({ where: { status: "DAMAGED" } }),
    prisma.assetMaintenance.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.roomAsset.aggregate({
      where: { status: { not: "RETIRED" } },
      _sum: { purchasePrice: true },
    }),
  ]);

  return {
    totalRooms,
    totalAssets,
    damagedAssets,
    maintenanceOpen,
    assetValue: Number(assetValue._sum.purchasePrice || 0),
  };
}
