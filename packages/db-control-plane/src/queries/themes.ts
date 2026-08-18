import { Pool } from 'pg';
import type { Theme } from '@ecommerce/shared-types';

export async function getThemeById(
  pool: Pool,
  id: string
): Promise<Theme | null> {
  const result = await pool.query(
    'SELECT * FROM themes WHERE id = $1',
    [id]
  );
  return result.rows[0] ? mapToTheme(result.rows[0]) : null;
}

export async function getThemeByKey(
  pool: Pool,
  key: string
): Promise<Theme | null> {
  const result = await pool.query(
    'SELECT * FROM themes WHERE key = $1',
    [key]
  );
  return result.rows[0] ? mapToTheme(result.rows[0]) : null;
}

export async function listAllThemes(pool: Pool): Promise<Theme[]> {
  const result = await pool.query(
    'SELECT * FROM themes ORDER BY display_name'
  );
  return result.rows.map(mapToTheme);
}

export async function createTheme(
  pool: Pool,
  theme: Omit<Theme, 'id'>
): Promise<Theme> {
  const id = `theme_${Date.now()}`;
  const result = await pool.query(
    'INSERT INTO themes (id, key, display_name, config_json) VALUES ($1, $2, $3, $4) RETURNING *',
    [id, theme.key, theme.displayName, JSON.stringify(theme.configJson)]
  );
  return mapToTheme(result.rows[0]);
}

function mapToTheme(row: any): Theme {
  return {
    id: row.id,
    key: row.key,
    displayName: row.display_name,
    configJson: row.config_json,
  };
}
