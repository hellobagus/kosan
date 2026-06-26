import AccountListPage from "@/components/AccountList";

export default function AkunPengelolaPage() {
  return (
    <AccountListPage
      title="Akun Pengelola / Pemilik"
      description="Kelola akun pengelola dan pemilik kosan"
      rolesToShow={["OWNER", "MANAGER"]}
      allowedRoles={["OWNER", "MANAGER"]}
    />
  );
}
