import AccountListPage from "@/components/AccountList";

export default function AkunPenghuniPage() {
  return (
    <AccountListPage
      title="Akun Penghuni"
      description="Daftar akun penghuni kosan"
      roleFilter="TENANT"
      allowedRoles={["TENANT"]}
    />
  );
}
