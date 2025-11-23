#!/usr/bin/env node

/**
 * Baseline Prisma migrations for existing production databases
 * This script marks all existing migrations as applied without running them
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');

// Get all migration directories (excluding migration_lock.toml)
const migrations = fs.readdirSync(migrationsDir)
  .filter(name => fs.statSync(path.join(migrationsDir, name)).isDirectory())
  .sort();

console.log(`Found ${migrations.length} migrations to baseline`);

// Try to run migrate deploy first
try {
  console.log('Attempting to run prisma migrate deploy...');
  const output = execSync('npx prisma migrate deploy', { 
    stdio: 'pipe',
    encoding: 'utf8',
    env: { ...process.env, PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: '1' }
  });
  console.log(output);
  console.log('Migrations deployed successfully');
  process.exit(0);
} catch (error) {
  // Capture error output
  const stdout = error.stdout?.toString() || '';
  const stderr = error.stderr?.toString() || '';
  const errorOutput = stdout + stderr + (error.message || '');
  
  // Log the error for debugging
  if (stdout) console.log('STDOUT:', stdout);
  if (stderr) console.error('STDERR:', stderr);
  
  if (errorOutput.includes('P3005') || errorOutput.includes('database schema is not empty') || errorOutput.includes('schema is not empty')) {
    console.log('Database schema is not empty. Baselining migrations...');
    
    // Mark each migration as applied
    for (const migration of migrations) {
      try {
        console.log(`Marking migration ${migration} as applied...`);
        const resolveOutput = execSync(`npx prisma migrate resolve --applied ${migration}`, {
          stdio: 'pipe',
          encoding: 'utf8',
          env: { ...process.env, PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: '1' }
        });
        console.log(resolveOutput);
        console.log(`✓ Marked migration ${migration} as applied`);
      } catch (resolveError) {
        // If migration is already marked, that's okay
        const resolveOutput = resolveError.stdout?.toString() || resolveError.stderr?.toString() || '';
        if (!resolveOutput.includes('already applied')) {
          console.warn(`Warning: Could not mark ${migration} as applied:`, resolveOutput);
        }
      }
    }
    
    // Now try migrate deploy again
    console.log('Running prisma migrate deploy after baseline...');
    try {
      const deployOutput = execSync('npx prisma migrate deploy', {
        stdio: 'pipe',
        encoding: 'utf8',
        env: { ...process.env, PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: '1' }
      });
      console.log(deployOutput);
      console.log('Migrations deployed successfully after baseline');
      process.exit(0);
    } catch (deployError) {
      const deployStdout = deployError.stdout?.toString() || '';
      const deployStderr = deployError.stderr?.toString() || '';
      console.error('Failed to deploy migrations after baseline');
      if (deployStdout) console.error('STDOUT:', deployStdout);
      if (deployStderr) console.error('STDERR:', deployStderr);
      process.exit(1);
    }
  } else {
    // Some other error occurred
    console.error('Migration deploy failed with unexpected error:', errorOutput);
    process.exit(1);
  }
}

