#!/usr/bin/env node

/**
 * OmniCast - Database Migration Script
 * 
 * This script handles database migrations for the OmniCast project.
 * It can be run with: node scripts/migrate.js [command]
 * 
 * Commands:
 *   migrate   - Run pending migrations
 *   rollback  - Rollback the last migration
 *   seed      - Seed the database with sample data
 *   reset     - Reset the database (warning: destructive)
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const commands = {
  migrate: async () => {
    console.log('🔄 Running database migrations...');
    try {
      // Use Prisma migrate
      const { execSync } = require('child_process');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  },

  rollback: async () => {
    console.log('⏪ Rolling back last migration...');
    try {
      // Note: This requires prisma-rollback or manual intervention
      console.log('⚠️ Rollback requires manual intervention');
      console.log('Please run: npx prisma migrate resolve --rolled-back <migration_name>');
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      process.exit(1);
    }
  },

  seed: async () => {
    console.log('🌱 Seeding database with sample data...');
    try {
      // Read seed file
      const seedFile = path.join(__dirname, '../prisma/seed.sql');
      
      if (fs.existsSync(seedFile)) {
        const sql = fs.readFileSync(seedFile, 'utf8');
        await prisma.$executeRawUnsafe(sql);
        console.log('✅ Database seeded successfully');
      } else {
        console.log('⚠️ Seed file not found');
      }
    } catch (error) {
      console.error('❌ Seeding failed:', error.message);
      process.exit(1);
    }
  },

  reset: async () => {
    console.log('⚠️ This will reset the database (destructive action)');
    console.log('Press Ctrl+C to cancel...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      console.log('🗑️ Resetting database...');
      await prisma.$executeRaw`DROP SCHEMA public CASCADE`;
      await prisma.$executeRaw`CREATE SCHEMA public`;
      
      const { execSync } = require('child_process');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      
      console.log('✅ Database reset successfully');
    } catch (error) {
      console.error('❌ Reset failed:', error.message);
      process.exit(1);
    }
  },

  generate: async () => {
    console.log('🔧 Generating Prisma Client...');
    try {
      const { execSync } = require('child_process');
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('✅ Prisma Client generated successfully');
    } catch (error) {
      console.error('❌ Generate failed:', error.message);
      process.exit(1);
    }
  },

  studio: async () => {
    console.log('🎨 Opening Prisma Studio...');
    try {
      const { execSync } = require('child_process');
      execSync('npx prisma studio', { stdio: 'inherit' });
    } catch (error) {
      // User closed studio
    }
  }
};

// Main
const command = process.argv[2] || 'migrate';

if (commands[command]) {
  commands[command]()
    .then(() => {
      console.log('✨ Done');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
} else {
  console.log('Available commands:', Object.keys(commands).join(', '));
  process.exit(1);
}
