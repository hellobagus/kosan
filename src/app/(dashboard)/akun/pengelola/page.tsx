import AccountListPage from "@/components/AccountList";

export default function AkunPengelolaPage() {
  return (
    <AccountListPage
      title="Akun Staff"
      description="Kelola akun staff berdasarkan jabatan dan tanggung jawabnya"
      rolesToShow={[
        "SUPER_ADMIN",
        "ENTITY_MANAGER",
        "PROJECT_MANAGER",
        "FRONT_OFFICE",
        "FINANCE",
        "MAINTENANCE",
        "OWNER",
        "MANAGER",
      ]}
      allowedRoles={[
        "SUPER_ADMIN",
        "ENTITY_MANAGER",
        "PROJECT_MANAGER",
        "FRONT_OFFICE",
        "FINANCE",
        "MAINTENANCE",
      ]}
    />
  );
}
