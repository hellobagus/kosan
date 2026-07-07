"use client";

import { useState } from "react";
import MaintenanceBoard from "@/components/MaintenanceBoard";
import TenantRepairBoard from "@/components/TenantRepairBoard";
import { PageHeader, Button } from "@/components/ui";

export default function InventarisMaintenancePage() {
  const [tab, setTab] = useState<"asset" | "unit">("unit");

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Kelola perbaikan inventaris kamar dan permintaan perbaikan unit dari penghuni."
      />
      <div className="flex gap-2 mb-6">
        <Button variant={tab === "unit" ? "primary" : "secondary"} onClick={() => setTab("unit")}>
          Permintaan Unit Penghuni
        </Button>
        <Button variant={tab === "asset" ? "primary" : "secondary"} onClick={() => setTab("asset")}>
          Inventaris / Asset
        </Button>
      </div>
      {tab === "unit" ? <TenantRepairBoard /> : <MaintenanceBoard />}
    </div>
  );
}
