# KosanKu — User Flow (Presentasi Client)

Dokumen ini berisi flowchart Mermaid untuk presentasi ke client.  
Buka di GitHub / VS Code / Notion (dengan Mermaid), atau gunakan PDF: [`USER-FLOW.pdf`](./USER-FLOW.pdf).

---

## Ringkasan konsep

| Pintu masuk | Setelah login | Digunakan oleh |
|-------------|---------------|----------------|
| Landing publik | — | Calon penghuni |
| Dashboard | `/dashboard` | Staf (Admin, FO, Finance, Maintenance, Manager) |
| Portal | `/portal` | Penghuni aktif |

**Narasi 60 detik:** Calon melihat kamar di website → daftar → Front Office verifikasi & kontrak → check-in. Saat huni, penghuni bayar dan lapor perbaikan lewat portal; Finance mencatat uang; Maintenance menjaga aset. Saat keluar, inspeksi + deposit → kamar kembali kosong.

---

## 1. Big Picture — Siklus Hunian

```mermaid
flowchart TD
  landing["Landing & katalog kamar<br/><i>Calon / Publik</i>"]
  apply["Form daftar online<br/><i>Calon / Publik</i>"]
  verify["Verifikasi calon<br/><i>Front Office</i>"]
  contract["Kontrak & BA inventaris<br/><i>Front Office</i>"]
  checkin["Check-in aktif<br/><i>Front Office</i>"]
  live["Huni + portal penghuni<br/><i>Penghuni</i>"]
  pay["Tagihan & pembayaran<br/><i>Finance</i>"]
  svc["Perbaikan / pindah<br/><i>Maintenance</i>"]
  out["Checkout & kamar kosong<br/><i>Front Office</i>"]

  landing --> apply --> verify --> contract --> checkin --> live
  live --> pay --> out
  live --> svc --> out

  classDef public fill:#e8eef5,stroke:#64748b,color:#0f172a
  classDef fo fill:#0f766e,stroke:#0f766e,color:#fff
  classDef finance fill:#1f8a65,stroke:#1f8a65,color:#fff
  classDef maint fill:#d75c4e,stroke:#d75c4e,color:#fff
  classDef tenant fill:#3685bf,stroke:#3685bf,color:#fff

  class landing,apply public
  class verify,contract,checkin,out fo
  class pay finance
  class svc maint
  class live tenant
```

---

## 2. Setup Awal (Go-Live)

```mermaid
flowchart TD
  org["Struktur organisasi<br/>Holding → Entity → Project<br/><i>Admin / Manager</i>"]
  profile["Profil kosan & paket sewa<br/>Denda, grace period<br/><i>Admin / Manager</i>"]
  rooms["Master kamar & inventaris<br/><i>Admin / Manager</i>"]
  users["Akun staf & hak akses<br/><i>Admin / Manager</i>"]
  coa["Akun keuangan / periode<br/><i>Finance</i>"]
  ready["Siap operasional<br/><i>Sistem</i>"]

  org --> profile --> rooms --> users --> coa --> ready

  classDef admin fill:#7754d9,stroke:#7754d9,color:#fff
  classDef finance fill:#1f8a65,stroke:#1f8a65,color:#fff
  classDef system fill:#e2e8f0,stroke:#94a3b8,color:#0f172a

  class org,profile,rooms,users admin
  class coa finance
  class ready system
```

---

## 3. Onboarding Penghuni (Kontrak)

```mermaid
flowchart TD
  input["Input calon / daftar online<br/>Status: Menunggu Verifikasi<br/><i>Calon / Publik</i>"]
  approve{"Setujui atau tolak?<br/><i>Front Office</i>"}
  reject["Tolak / batalkan data"]
  send["Kirim kontrak PDF<br/>Status: Kontrak Terkirim<br/><i>Sistem</i>"]
  sign["TTD manual + unggah scan<br/>Status: Kontrak Ditandatangani<br/><i>Front Office</i>"]
  ba["Generate BA inventaris<br/><i>Front Office</i>"]
  active["Check-in → Aktif<br/>Kamar Terisi<br/><i>Front Office</i>"]

  input --> approve
  approve -->|Tolak| reject
  approve -->|Setuju| send
  send --> sign --> ba --> active

  classDef public fill:#e8eef5,stroke:#64748b,color:#0f172a
  classDef fo fill:#0f766e,stroke:#0f766e,color:#fff
  classDef system fill:#e2e8f0,stroke:#94a3b8,color:#0f172a
  classDef reject fill:#fef2f2,stroke:#cf2d56,color:#7f1d1d

  class input public
  class approve,sign,ba,active fo
  class send system
  class reject reject
```

---

## 4. Tagihan & Pembayaran

```mermaid
flowchart TD
  gen["Generate / catat tagihan<br/>Sewa, utilitas, denda<br/><i>Finance</i>"]
  notify["Tagihan muncul di portal<br/><i>Sistem</i>"]
  pay["Penghuni bayar<br/>Transfer / Midtrans<br/><i>Penghuni</i>"]
  confirm["Konfirmasi / catat pembayaran<br/><i>Finance</i>"]
  ledger["Jurnal & laporan keuangan<br/>Akuntansi otomatis<br/><i>Sistem</i>"]
  invoice["Invoice tersedia<br/><i>Penghuni</i>"]

  gen --> notify --> pay --> confirm --> ledger --> invoice

  classDef finance fill:#1f8a65,stroke:#1f8a65,color:#fff
  classDef system fill:#e2e8f0,stroke:#94a3b8,color:#0f172a
  classDef tenant fill:#3685bf,stroke:#3685bf,color:#fff

  class gen,confirm finance
  class notify,ledger system
  class pay,invoice tenant
```

---

## 5. Permintaan Perbaikan

```mermaid
flowchart TD
  create["Lapor kerusakan di portal<br/>AC, listrik, plumbing, dll.<br/><i>Penghuni</i>"]
  triage["Terima / assign tiket<br/><i>Front Office</i>"]
  fix["Perbaikan di lokasi<br/><i>Maintenance</i>"]
  close["Tutup tiket<br/><i>Maintenance</i>"]
  view["Status terlihat di portal<br/><i>Penghuni</i>"]

  create --> triage --> fix --> close --> view

  classDef tenant fill:#3685bf,stroke:#3685bf,color:#fff
  classDef fo fill:#0f766e,stroke:#0f766e,color:#fff
  classDef maint fill:#d75c4e,stroke:#d75c4e,color:#fff

  class create,view tenant
  class triage fo
  class fix,close maint
```

---

## 6. Pindah Kamar

```mermaid
flowchart TD
  req["Ajukan pindah di portal<br/><i>Penghuni</i>"]
  ok["Persetujuan staf<br/><i>Front Office</i>"]
  diff["Hitung selisih sewa/deposit<br/><i>Finance</i>"]
  letter["Surat pindah<br/><i>Front Office</i>"]
  old["Inspeksi kamar lama + closing meter<br/><i>Maintenance</i>"]
  new["Serah terima kamar baru<br/><i>Front Office</i>"]
  bill["Update kontrak & billing<br/><i>Sistem</i>"]

  req --> ok --> diff --> letter --> old --> new --> bill

  classDef tenant fill:#3685bf,stroke:#3685bf,color:#fff
  classDef fo fill:#0f766e,stroke:#0f766e,color:#fff
  classDef finance fill:#1f8a65,stroke:#1f8a65,color:#fff
  classDef maint fill:#d75c4e,stroke:#d75c4e,color:#fff
  classDef system fill:#e2e8f0,stroke:#94a3b8,color:#0f172a

  class req tenant
  class ok,letter,new fo
  class diff finance
  class old maint
  class bill system
```

---

## 7. Checkout Penghuni

```mermaid
flowchart TD
  start["Mulai checkout<br/>Status: Menunggu Checkout<br/><i>Front Office</i>"]
  inspect["Inspeksi inventaris<br/><i>Maintenance</i>"]
  deposit["Hitung potongan deposit<br/>Jika ada kerusakan<br/><i>Finance</i>"]
  done["Selesaikan checkout<br/>Status: Selesai<br/><i>Front Office</i>"]
  empty["Kamar kosong lagi<br/><i>Sistem</i>"]

  start --> inspect --> deposit --> done --> empty

  classDef fo fill:#0f766e,stroke:#0f766e,color:#fff
  classDef maint fill:#d75c4e,stroke:#d75c4e,color:#fff
  classDef finance fill:#1f8a65,stroke:#1f8a65,color:#fff
  classDef system fill:#e2e8f0,stroke:#94a3b8,color:#0f172a

  class start,done fo
  class inspect maint
  class deposit finance
  class empty system
```

---

## Matriks peran (ringkas)

| Peran | Fokus |
|-------|--------|
| **Super Admin / Manager** | Organisasi, setup, override, laporan |
| **Front Office** | Calon, kontrak, check-in/out, tiket |
| **Finance** | Tagihan, pembayaran, jurnal, laporan keuangan |
| **Maintenance** | Inventaris, utilitas, inspeksi, perbaikan |
| **Penghuni** | Portal: bayar, pindah, lapor rusak |
| **Calon (Publik)** | Katalog kamar & daftar online |

---

## File terkait

- Mermaid mentah (satu file per alur): folder [`docs/user-flow/mermaid/`](./user-flow/mermaid/)
- PDF presentasi: [`docs/USER-FLOW.pdf`](./USER-FLOW.pdf)
- HTML sumber PDF: [`docs/user-flow/presentasi.html`](./user-flow/presentasi.html)
