export type DemoAccount = {
  role: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
};

/** Semua akun demo (seed & dokumentasi) */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "Pemilik / Owner", name: "Admin Pemilik", email: "admin@kosanku.com", password: "admin123" },
  { role: "Super Admin", name: "Sinta Super Admin", email: "superadmin@kosanku.com", password: "staff123" },
  { role: "Entity Manager", name: "Eka Entity Manager", email: "entity.manager@kosanku.com", password: "staff123" },
  { role: "Project Manager", name: "Pandu Project Manager", email: "project.manager@kosanku.com", password: "staff123" },
  { role: "Manager (legacy)", name: "Budi Pengelola", email: "manager@kosanku.com", password: "manager123" },
  {
    role: "Pengurus (Front Office)",
    name: "Fira Front Office",
    email: "frontoffice@kosanku.com",
    password: "staff123",
    phone: "081282771292",
  },
  { role: "Finance", name: "Fani Finance", email: "finance@kosanku.com", password: "staff123" },
  {
    role: "Maintenance",
    name: "Maman Maintenance",
    email: "maintenance@kosanku.com",
    password: "staff123",
    phone: "081282771292",
  },
  {
    role: "Penghuni",
    name: "Bagus Trinanda",
    email: "bagus.trinanda@ifca.co.id",
    password: "penghuni123",
  },
];

/** Akun yang ditampilkan di halaman login */
export const LOGIN_DEMO_ACCOUNTS: DemoAccount[] = [
  DEMO_ACCOUNTS.find((a) => a.email === "admin@kosanku.com")!,
  DEMO_ACCOUNTS.find((a) => a.email === "superadmin@kosanku.com")!,
  DEMO_ACCOUNTS.find((a) => a.email === "frontoffice@kosanku.com")!,
  DEMO_ACCOUNTS.find((a) => a.email === "maintenance@kosanku.com")!,
  DEMO_ACCOUNTS.find((a) => a.email === "bagus.trinanda@ifca.co.id")!,
];
