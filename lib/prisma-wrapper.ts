import { PrismaClient } from '@prisma/client';
import { prisma as prodPrisma } from './prisma';
import { demoPrisma } from './prisma-demo';

/**
 * Get the appropriate Prisma client based on DEMO_MODE
 * This ensures complete isolation between production and demo data
 */
export function getPrismaClient(): PrismaClient {
  const isDemoMode = process.env.DEMO_MODE === 'true';
  
  if (isDemoMode) {
    console.log('🔒 Using DEMO database (isolated from production)');
    return demoPrisma;
  } else {
    console.log('🔐 Using PRODUCTION database');
    return prodPrisma;
  }
}

// Export for convenience
export const prisma = getPrismaClient();

// Export demo mode flag
export const isDemoMode = () => process.env.DEMO_MODE === 'true';
