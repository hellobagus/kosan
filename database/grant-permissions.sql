-- Jalankan sebagai superuser (postgres) di database kosan_train
-- untuk memberikan hak akses ke user bagus

GRANT ALL ON SCHEMA public TO bagus;
GRANT CREATE ON SCHEMA public TO bagus;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bagus;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bagus;

-- Setelah grant, jalankan dari terminal proyek:
-- npx prisma db push
-- npm run db:seed
