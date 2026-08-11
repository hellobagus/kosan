import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  extractCommonFacilities,
  resolvePublicProject,
} from "@/lib/public-project";
import { parseLeasePackages } from "@/lib/tenant-utils";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("project");
    const project = await resolvePublicProject(code);
    if (!project) {
      return NextResponse.json({ error: "Kosan belum dikonfigurasi" }, { status: 404 });
    }

    const [sharedAreas, availableCount, roomCount] = await Promise.all([
      prisma.sharedArea.findMany({
        where: { projectId: project.id },
        orderBy: { id: "asc" },
        select: { name: true, description: true },
      }),
      prisma.room.count({
        where: {
          status: "AVAILABLE",
          floorRef: { building: { projectId: project.id } },
          price: { gt: 0 },
        },
      }),
      prisma.room.count({
        where: { floorRef: { building: { projectId: project.id } } },
      }),
    ]);

    const fromNotes = extractCommonFacilities(project.paymentNotes);
    const fromAreas = sharedAreas.map((a) => a.name);
    const facilities = [...new Set([...fromNotes, ...fromAreas])];

    const leasePackages = parseLeasePackages(project.leasePackages, {
      leaseBonusRules: project.leaseBonusRules,
      yearlyLeaseBonusEnabled: project.yearlyLeaseBonusEnabled,
      yearlyLeaseBonusMonths: project.yearlyLeaseBonusMonths,
    });

    return NextResponse.json({
      project: {
        id: project.id,
        code: project.code,
        name: project.name,
        address: project.address,
        phone: project.phone,
        email: project.email,
        logoUrl: project.logoUrl,
        managerName: project.managerName,
        termsAndConditions: project.termsAndConditions,
        paymentNotes: project.paymentNotes,
      },
      facilities,
      sharedAreas,
      leasePackages,
      stats: {
        availableRooms: availableCount,
        totalRooms: roomCount,
      },
    });
  } catch (error) {
    console.error("Public info error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
