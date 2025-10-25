import { PrismaClient } from '@prisma/client';

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('Available env vars:', Object.keys(process.env).filter(k => !k.includes('SECRET')));
}

// Parse and enhance DATABASE_URL with connection pooling
const getConnectionString = () => {
  let connectionString = process.env.DATABASE_URL || '';
  
  // For PostgreSQL databases (Neon, Railway, Supabase, etc.)
  if (connectionString.includes('postgresql://') || connectionString.includes('postgres://')) {
    try {
      const url = new URL(connectionString);
      
      // CRITICAL: Connection pool parameters for Railway/Neon
      // These prevent "connection pool timeout" errors
      url.searchParams.set('pgbouncer', 'true'); // Use PgBouncer-compatible mode
      url.searchParams.set('connect_timeout', '10'); // Reduce to 10 seconds for faster timeouts
      url.searchParams.set('connection_limit', '10'); // Increase to 10 connections for better throughput
      url.searchParams.set('pool_timeout', '10'); // 10 second pool timeout
      url.searchParams.set('statement_cache_size', '0'); // Disable prepared statement cache
      url.searchParams.set('application_name', 'lr-billing-app');
      
      return url.toString();
    } catch (e) {
      console.error('Error parsing DATABASE_URL:', e);
      return connectionString;
    }
  }
  
  return connectionString;
};

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Connection pool configuration
const connectionString = getConnectionString();

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: connectionString,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Performance optimizations
  errorFormat: 'minimal',
  // Disable query engine debug logs in production
  // CRITICAL: Optimize for Railway/Neon
});

// Note: Connection recovery is handled by the middleware and query retries below

// Implement automatic reconnection with exponential backoff
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

async function reconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('❌ Max reconnection attempts reached');
    return;
  }
  
  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 10000);
  
  console.log(`🔄 Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`);
  
  await new Promise(resolve => setTimeout(resolve, delay));
  
  try {
    await prisma.$connect();
    console.log('✅ Successfully reconnected to database');
    reconnectAttempts = 0;
  } catch (error) {
    console.error('❌ Reconnection failed:', error);
  }
}

// Add query middleware for automatic reconnection
prisma.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (error: any) {
    if (error.message && error.message.includes('Closed')) {
      console.log('🔄 Connection lost during query, attempting to reconnect...');
      await reconnect();
      // Retry the query once after reconnection
      try {
        return await next(params);
      } catch (retryError) {
        console.error('❌ Query failed after reconnection:', retryError);
        throw retryError;
      }
    }
    throw error;
  }
});

// CRITICAL: Disable heartbeat in production to prevent connection pool exhaustion
// The heartbeat was causing the connection pool to exhaust its 5-connection limit
// Neon's connection pooler handles connection lifecycle automatically
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  setInterval(async () => {
    try {
      // Simple query to keep connection alive (only in development)
      await prisma.$queryRaw`SELECT 1`;
      console.log('💓 Connection heartbeat OK');
    } catch (error) {
      console.error('❌ Heartbeat failed:', error);
      await reconnect();
    }
  }, 4 * 60 * 1000); // Every 4 minutes
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    console.log('🛑 Closing Prisma connection...');
    await prisma.$disconnect();
  });
  
  process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, closing Prisma connection...');
    await prisma.$disconnect();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, closing Prisma connection...');
    await prisma.$disconnect();
    process.exit(0);
  });
}

