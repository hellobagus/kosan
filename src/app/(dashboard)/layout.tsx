import { getSession } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        userName={session?.name || "User"}
        userRole={session?.role || "MANAGER"}
      />
      <main className="lg:pl-72">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
