import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export async function applyTenantMigrations(pool: Pool): Promise<void> {
  const migrationsDir = path.join(__dirname, '..', 'migrations');

  // Read all .sql files from migrations directory
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  if (files.length === 0) {
    console.log('No migrations found');
    return;
  }

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
      await pool.query(sql);
      console.log(`Applied migration: ${file}`);
    } catch (error) {
      console.error(`Error applying migration ${file}:`, error);
      throw error;
    }
  }
}
