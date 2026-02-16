import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kosan_db';

const globalForDb = globalThis as unknown as { pool: Pool | undefined };

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool;
