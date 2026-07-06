import { getSession } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";
import { ensureDefaultOrganization } from "@/lib/organization-service";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  await ensureDefaultOrganization().catch(() => {});

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        userName={session?.name || "User"}
        userRole={session?.role || "MANAGER"}
      />
      <div className="lg:pl-72 flex flex-col min-h-screen">
        <AppHeader userRole={session?.role || "MANAGER"} />
        <main className="flex-1">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
