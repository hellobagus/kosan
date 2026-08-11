import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { normalizeRole } from "@/lib/rbac";
import { LandingPage } from "@/components/public/LandingPage";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(normalizeRole(session.role) === "TENANT" ? "/portal" : "/dashboard");
  }
  return <LandingPage />;
}
