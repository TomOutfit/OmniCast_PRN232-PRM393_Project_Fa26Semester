const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function resetAndMigrate() {
  const connectionString = process.env.DATABASE_URL;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(' Connected to Supabase PostgreSQL database.');

    console.log('\n--- Resetting public schema cleanly ---');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
    await client.query('CREATE SCHEMA public;');
    await client.query('GRANT ALL ON SCHEMA public TO postgres;');
    await client.query('GRANT ALL ON SCHEMA public TO public;');
    console.log(' Public schema reset.');

    const initSqlPath = path.join(__dirname, '..', 'prisma', 'migrations', '001_init.sql');
    const seedSqlPath = path.join(__dirname, '..', 'prisma', 'seed.sql');

    console.log('\n--- 1. Executing Schema Migration (001_init.sql) ---');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    await client.query(initSql);
    console.log(' Schema migration completed successfully!');

    console.log('\n--- 2. Executing Seed Data (seed.sql) ---');
    const seedSql = fs.readFileSync(seedSqlPath, 'utf8');
    await client.query(seedSql);
    console.log(' Seed data inserted successfully!');

    // Verification queries
    console.log('\n--- 3. Verifying Database Tables ---');
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(` Created ${tablesRes.rows.length} tables:\n`, tablesRes.rows.map(r => `  - ${r.table_name}`).join('\n'));

    const userCount = await client.query('SELECT COUNT(*) FROM "User"');
    const channelCount = await client.query('SELECT COUNT(*) FROM "LiveChannel"');
    const eventCount = await client.query('SELECT COUNT(*) FROM "LiveEvent"');
    const recordingCount = await client.query('SELECT COUNT(*) FROM "Recording"');
    const commentCount = await client.query('SELECT COUNT(*) FROM "Comment"');
    const reactionCount = await client.query('SELECT COUNT(*) FROM "Reaction"');
    const tagCount = await client.query('SELECT COUNT(*) FROM "ProductionTag"');

    console.log('\n Verification & Data Counts:');
    console.log(`  • Users: ${userCount.rows[0].count}`);
    console.log(`  • Live Channels (Creator): ${channelCount.rows[0].count}`);
    console.log(`  • Live Events: ${eventCount.rows[0].count}`);
    console.log(`  • Recordings: ${recordingCount.rows[0].count}`);
    console.log(`  • Comments: ${commentCount.rows[0].count}`);
    console.log(`  • Reactions: ${reactionCount.rows[0].count}`);
    console.log(`  • Production Tags: ${tagCount.rows[0].count}`);

    console.log('\n ALL MIGRATIONS AND SEEDING COMPLETED WITH 100% SUCCESS!');
  } catch (err) {
    console.error(' Error during migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetAndMigrate();
