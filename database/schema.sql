-- =====================================================
-- SISTEM MANAJEMEN INFORMASI SEWA KOSAN
-- Database: PostgreSQL
-- =====================================================

-- Enum types
CREATE TYPE user_role AS ENUM ('OWNER', 'MANAGER', 'TENANT');
CREATE TYPE room_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');
CREATE TYPE tenant_status AS ENUM ('ACTIVE', 'RESERVED', 'COMPLETED');
CREATE TYPE payment_status AS ENUM ('UNPAID', 'PARTIAL', 'PAID');
CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE payment_method AS ENUM ('CASH', 'TRANSFER', 'MIDTRANS');
CREATE TYPE payment_record_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED');

-- =====================================================
-- TABEL: users (Akun Pengelola & Penghuni)
-- =====================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password        VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    role            user_role NOT NULL DEFAULT 'TENANT',
    address         TEXT,
    gender          VARCHAR(20),
    ktp             VARCHAR(20),
    marital_status  VARCHAR(30),
    occupation      VARCHAR(100),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABEL: rooms (Informasi Kamar)
-- =====================================================
CREATE TABLE rooms (
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

-- =====================================================
-- TABEL: tenants (Data Penghuni / Sewa)
-- =====================================================
CREATE TABLE tenants (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id         INTEGER NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    check_in        DATE NOT NULL,
    check_out       DATE,
    due_date        DATE,
    monthly_rent    DECIMAL(12, 2) NOT NULL,
    deposit         DECIMAL(12, 2) DEFAULT 0,
    status          tenant_status NOT NULL DEFAULT 'ACTIVE',
    lease_duration  VARCHAR(30),
    occupant_count  INTEGER NOT NULL DEFAULT 1,
    discount        DECIMAL(12, 2) DEFAULT 0,
    additional_fees JSONB,
    total_amount    DECIMAL(12, 2),
    paid_amount     DECIMAL(12, 2) DEFAULT 0,
    payment_status  payment_status NOT NULL DEFAULT 'UNPAID',
    invoice_number  VARCHAR(20),
    last_payment_date DATE,
    extension_date  DATE,
    is_daily        BOOLEAN NOT NULL DEFAULT FALSE,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABEL: finances (Pemasukan & Pengeluaran)
-- =====================================================
CREATE TABLE finances (
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

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_user ON tenants(user_id);
CREATE INDEX idx_tenants_room ON tenants(room_id);
CREATE INDEX idx_finances_type ON finances(type);
CREATE INDEX idx_finances_date ON finances(transaction_date);
CREATE INDEX idx_finances_type_date ON finances(type, transaction_date);

-- =====================================================
-- TABEL: payments (Riwayat Pembayaran)
-- =====================================================
CREATE TABLE payments (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount          DECIMAL(12, 2) NOT NULL,
    method          payment_method NOT NULL,
    status          payment_record_status NOT NULL DEFAULT 'PENDING',
    order_id        VARCHAR(60) UNIQUE NOT NULL,
    transaction_id  VARCHAR(100),
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_status ON payments(status);

-- =====================================================
-- TRIGGER: auto update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finances_updated_at BEFORE UPDATE ON finances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
