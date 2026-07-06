import TenantWorkflowBoard from "@/components/TenantWorkflowBoard";
import { PageHeader } from "@/components/ui";

export default function PenghuniCalonPage() {
  return (
    <div>
      <PageHeader
        title="Calon Penghuni & Kontrak"
        description="Verifikasi admin, generate surat perjanjian, tanda tangan, dan check-in penghuni baru."
      />
      <TenantWorkflowBoard />
    </div>
  );
}
