import { getSession } from "@/lib/auth";
import PanduanClient from "@/components/PanduanClient";
import { redirect } from "next/navigation";

export default async function PanduanPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <PanduanClient currentRole={session.role} />;
}
