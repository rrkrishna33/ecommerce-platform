import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function deploy() {
  console.log('🚀 DEPLOYMENT SETUP\n');

  // Step 1: Connect to default postgres database
  console.log('Step 1: Connecting to PostgreSQL...');

  const credentials = [
    { password: 'postgres' },
    { password: '' },
    { password: process.env.POSTGRES_PASSWORD },
  ];

  let adminPool = null;
  let connected = false;

  for (const cred of credentials) {
    try {
      adminPool = new Pool({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: cred.password || undefined,
        database: 'postgres',
      });

      await adminPool.query('SELECT 1');
      connected = true;
      break;
    } catch (e) {
      if (adminPool) await adminPool.end();
    }
  }

  if (!connected) {
    console.error('❌ Cannot connect to PostgreSQL');
    console.error('  Tried: postgres/postgres, postgres/<no password>, postgres/$POSTGRES_PASSWORD');
    process.exit(1);
  }

  try {
    // Test connection
    const result = await adminPool.query('SELECT version()');
    console.log(`✓ Connected: ${result.rows[0].version.split(',')[0]}\n`);

    // Step 2: Create control-plane database
    console.log('Step 2: Creating control-plane database...');
    try {
      await adminPool.query('DROP DATABASE IF EXISTS platform_control');
      console.log('  • Dropped existing database (if any)');
    } catch (e) {
      // Ignore - database might not exist
    }

    await adminPool.query('CREATE DATABASE platform_control');
    console.log('✓ Control-plane database created\n');

    // Step 3: Connect to control-plane and apply schema
    console.log('Step 3: Applying control-plane schema...');
    const controlPlanePool = new Pool({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'platform_control',
    });

    const schemaPath = path.join(__dirname, '..', 'packages', 'db-control-plane', 'migrations', '001_init.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await controlPlanePool.query(schema);
    console.log('✓ Control-plane schema applied\n');

    // Verify tables
    const tables = await controlPlanePool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log('  Tables created:');
    tables.rows.forEach((t) => console.log(`    • ${t.table_name}`));
    console.log('');

    await controlPlanePool.end();

    // Step 4: Summary
    console.log('═══════════════════════════════════════════════');
    console.log('✅ CONTROL-PLANE DATABASE READY');
    console.log('═══════════════════════════════════════════════\n');
    console.log('Next: Running seed script to provision demo tenants...\n');
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('  → PostgreSQL is not running on localhost:5432');
    }
    process.exit(1);
  } finally {
    await adminPool.end();
  }
}

deploy();
