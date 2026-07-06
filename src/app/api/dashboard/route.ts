import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInventoryStats } from "@/lib/inventory-service";
import { requireProjectContext, roomProjectFilter } from "@/lib/project-context";

export async function GET() {
  try {
    const auth = await requireProjectContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const projectId = auth.context.projectId;
    const roomFilter = roomProjectFilter(projectId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalRooms,
      occupiedRooms,
      availableRooms,
      activeTenants,
      monthlyIncome,
      monthlyExpense,
      yearlyIncome,
      recentTenants,
      recentFinances,
      inventoryStats,
    ] = await Promise.all([
      prisma.room.count({ where: roomFilter }),
      prisma.room.count({ where: { ...roomFilter, status: "OCCUPIED" } }),
      prisma.room.count({ where: { ...roomFilter, status: "AVAILABLE" } }),
      prisma.tenant.count({
        where: { status: "ACTIVE", room: roomFilter },
      }),
      prisma.finance.aggregate({
        where: { type: "INCOME", projectId, transactionDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.finance.aggregate({
        where: { type: "EXPENSE", projectId, transactionDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.finance.aggregate({
        where: { type: "INCOME", projectId, transactionDate: { gte: startOfYear } },
        _sum: { amount: true },
      }),
      prisma.tenant.findMany({
        where: { status: "ACTIVE", room: roomFilter },
        include: { user: true, room: true },
        orderBy: { checkIn: "desc" },
        take: 5,
      }),
      prisma.finance.findMany({
        where: { projectId },
        orderBy: { transactionDate: "desc" },
        take: 5,
        include: { tenant: { include: { user: true } } },
      }),
      getInventoryStats(projectId),
    ]);

    return NextResponse.json({
      context: auth.context,
      stats: {
        totalRooms,
        occupiedRooms,
        availableRooms,
        activeTenants,
        monthlyIncome: Number(monthlyIncome._sum.amount || 0),
        monthlyExpense: Number(monthlyExpense._sum.amount || 0),
        yearlyIncome: Number(yearlyIncome._sum.amount || 0),
        occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      },
      recentTenants,
      recentFinances,
      inventory: inventoryStats,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
