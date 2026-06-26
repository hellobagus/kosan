-- =====================================================
-- JALANKAN SEBAGAI SUPERUSER (postgres / admin DB)
-- Database: kosan_train
-- User aplikasi: bagus
-- =====================================================

-- 1. Berikan hak akses ke user bagus
GRANT CONNECT ON DATABASE kosan_train TO bagus;
GRANT USAGE, CREATE ON SCHEMA public TO bagus;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bagus;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bagus;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bagus;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bagus;

-- 2. Buat tabel (skip jika sudah ada)
-- Enum types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('OWNER', 'MANAGER', 'TENANT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE room_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE tenant_status AS ENUM ('ACTIVE', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tabel users
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password        VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    role            user_role NOT NULL DEFAULT 'TENANT',
    address         TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabel rooms
CREATE TABLE IF NOT EXISTS rooms (
    id              SERIAL PRIMARY KEY,
    room_number     VARCHAR(20) UNIQUE NOT NULL,
    floor           INTEGER NOT NULL DEFAULT 1,
    price           DECIMAL(12, 2) NOT NULL,
    daily_price     DECIMAL(12, 2),
    facilities      TEXT,
    equipment       TEXT,
    description     TEXT,
    status          room_status NOT NULL DEFAULT 'AVAILABLE',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabel tenants
CREATE TABLE IF NOT EXISTS tenants (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id         INTEGER NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    check_in        DATE NOT NULL,
    check_out       DATE,
    monthly_rent    DECIMAL(12, 2) NOT NULL,
    deposit         DECIMAL(12, 2) DEFAULT 0,
    status          tenant_status NOT NULL DEFAULT 'ACTIVE',
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabel finances
CREATE TABLE IF NOT EXISTS finances (
    id              SERIAL PRIMARY KEY,
    type            transaction_type NOT NULL,
    amount          DECIMAL(12, 2) NOT NULL,
    description     VARCHAR(255) NOT NULL,
    category        VARCHAR(100),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    tenant_id       INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
    room_id         INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tambah kolom baru jika tabel sudah ada
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS daily_price DECIMAL(12, 2);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS equipment TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_user ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_room ON tenants(room_id);
CREATE INDEX IF NOT EXISTS idx_finances_type ON finances(type);
CREATE INDEX IF NOT EXISTS idx_finances_date ON finances(transaction_date);
CREATE INDEX IF NOT EXISTS idx_finances_type_date ON finances(type, transaction_date);

-- Trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_finances_updated_at ON finances;
CREATE TRIGGER update_finances_updated_at BEFORE UPDATE ON finances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Berikan ownership tabel ke bagus (opsional, agar prisma bisa manage)
ALTER TABLE IF EXISTS users OWNER TO bagus;
ALTER TABLE IF EXISTS rooms OWNER TO bagus;
ALTER TABLE IF EXISTS tenants OWNER TO bagus;
ALTER TABLE IF EXISTS finances OWNER TO bagus;

-- Selesai! User bagus sekarang bisa jalankan: npm run db:seed
