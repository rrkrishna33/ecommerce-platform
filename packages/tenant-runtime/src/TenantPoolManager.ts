import { Pool, PoolClient } from 'pg';
import { LRUCache } from 'lru-cache';
import type { TenantDbConfig } from './types';

export class TenantPoolManager {
  private pools: Map<string, Pool> = new Map();
  private cache: LRUCache<string, Pool>;

  constructor(maxPoolCount: number = 50) {
    this.cache = new LRUCache({
      max: maxPoolCount,
      dispose: (pool) => {
        // Gracefully close evicted pools
        pool.end().catch(console.error);
      },
    });
  }

  async getPool(tenantId: string, dbConfig: TenantDbConfig): Promise<Pool> {
    // Check cache first
    const cached = this.cache.get(tenantId);
    if (cached) {
      return cached;
    }

    // Create new pool
    const pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      max: 5, // Small pool per tenant
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Test connection
    const client = await pool.connect();
    client.release();

    // Store in cache
    this.cache.set(tenantId, pool);
    this.pools.set(tenantId, pool);

    return pool;
  }

  async query(
    tenantId: string,
    dbConfig: TenantDbConfig,
    text: string,
    values?: any[]
  ): Promise<any> {
    const pool = await this.getPool(tenantId, dbConfig);
    return pool.query(text, values);
  }

  async getClient(
    tenantId: string,
    dbConfig: TenantDbConfig
  ): Promise<PoolClient> {
    const pool = await this.getPool(tenantId, dbConfig);
    return pool.connect();
  }

  async closeAll(): Promise<void> {
    const promises = Array.from(this.pools.values()).map((pool) =>
      pool.end()
    );
    await Promise.all(promises);
    this.pools.clear();
    this.cache.clear();
  }

  getPoolStats() {
    return {
      poolCount: this.pools.size,
      cacheSize: this.cache.size,
      maxPoolCount: this.cache.max,
    };
  }
}

// Global singleton for the app
export const poolManager = new TenantPoolManager();
