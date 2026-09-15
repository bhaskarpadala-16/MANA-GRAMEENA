import 'server-only';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Global database singleton for Mana Grameena.
 * Utilizes Prisma 7 with PostgreSQL driver adapter (@prisma/adapter-pg)
 * and pg.Pool for resilient connection pooling.
 *
 * Protected with 'server-only' to guarantee database credentials
 * never leak into client browser bundles.
 */

const connectionString = process.env.DATABASE_URL;

function createPrismaClient(): PrismaClient {
  if (!connectionString) {
    // Return un-initialized client placeholder if credentials are not yet configured.
    // Real queries will require DATABASE_URL in .env.
    const pool = new Pool({ connectionString: 'postgresql://placeholder:placeholder@localhost:5432/placeholder' });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
