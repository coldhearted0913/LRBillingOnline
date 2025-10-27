import { PrismaClient } from '@prisma/client';

// Demo database configuration
// This uses a COMPLETELY SEPARATE database from production
const DEMO_DATABASE_URL = process.env.DEMO_DATABASE_URL || process.env.DATABASE_URL;

if (!DEMO_DATABASE_URL) {
  console.error('❌ DEMO_DATABASE_URL not configured');
}

// Create separate Prisma client for demo
export const demoPrisma = new PrismaClient({
  datasources: {
    db: {
      url: DEMO_DATABASE_URL,
    },
  },
  log: ['error'],
});

// Export demo prisma instance
export default demoPrisma;
