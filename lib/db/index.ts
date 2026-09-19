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

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is not configured. Please supply a valid PostgreSQL connection string in .env.'
    );
  }

  // Ensure SSL encryption is enabled while accepting the Supabase transaction pooler's certificate chain.
  // Note: in node-postgres, ConnectionParameters parses connectionString and overwrites config.ssl
  // if sslmode is present in the URL query string. To make the configuration deterministic and prevent
  // the URL parser from resetting ssl to { rejectUnauthorized: true }, we strip any sslmode query
  // parameter from connectionString and explicitly pass ssl: { rejectUnauthorized: false }.
  let poolConnectionString = connectionString;
  try {
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    poolConnectionString = url.toString();
  } catch {
    // If URL parsing fails, fallback to raw connectionString
  }

  const pool = new Pool({
    connectionString: poolConnectionString,
    ssl: { rejectUnauthorized: false },
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

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    const client = globalForPrisma.prisma;
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export default prisma;
