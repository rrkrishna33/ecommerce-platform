import type { Tenant } from '@ecommerce/shared-types';
import type { ResolvedTenant, TenantDbConfig } from './types';
import { LRUCache } from 'lru-cache';

export interface TenantResolver {
  getTenantBySubdomain(subdomain: string): Promise<Tenant | null>;
  getTenantByCustomDomain(domain: string): Promise<Tenant | null>;
  getTenantById(id: string): Promise<Tenant | null>;
}

export class TenantResolutionManager {
  private cache: LRUCache<string, ResolvedTenant>;
  private resolver: TenantResolver;
  private rootDomain: string;

  constructor(resolver: TenantResolver, rootDomain: string, cacheTtlSeconds: number = 30) {
    this.resolver = resolver;
    this.rootDomain = rootDomain;
    this.cache = new LRUCache({
      max: 100,
      ttl: cacheTtlSeconds * 1000,
    });
  }

  async resolveFromRequest(
    hostname: string,
    devHeaders?: {
      tenantId?: string;
      tenant?: string;
    }
  ): Promise<ResolvedTenant | null> {
    // Dev override: X-Tenant-Id header or ?tenant query param (only in development)
    if (process.env.NODE_ENV === 'development') {
      if (devHeaders?.tenantId) {
        const cached = this.cache.get(`dev-${devHeaders.tenantId}`);
        if (cached) return cached;

        const tenant = await this.resolver.getTenantById(devHeaders.tenantId);
        if (tenant) {
          return this.buildResolvedTenant(tenant);
        }
      }
    }

    // Try custom domain first
    const customDomainCached = this.cache.get(`domain-${hostname}`);
    if (customDomainCached) return customDomainCached;

    let tenant = await this.resolver.getTenantByCustomDomain(hostname);
    if (tenant) {
      return this.buildResolvedTenant(tenant, `domain-${hostname}`);
    }

    // Try subdomain parsing
    const subdomain = this.extractSubdomain(hostname);
    if (subdomain && subdomain !== 'www') {
      const subdomainCached = this.cache.get(`subdomain-${subdomain}`);
      if (subdomainCached) return subdomainCached;

      tenant = await this.resolver.getTenantBySubdomain(subdomain);
      if (tenant) {
        return this.buildResolvedTenant(tenant, `subdomain-${subdomain}`);
      }
    }

    return null;
  }

  private extractSubdomain(hostname: string): string | null {
    // Remove port if present
    const host = hostname.split(':')[0];

    // Check if it's a root domain or nip.io style
    if (
      host.includes(this.rootDomain) ||
      host.includes('.nip.io') ||
      host.includes('.lvh.me')
    ) {
      const parts = host.split('.');
      if (parts.length > 1) {
        return parts[0]; // Return the first part as subdomain
      }
    }

    return null;
  }

  private buildResolvedTenant(
    tenant: Tenant,
    cacheKey?: string
  ): ResolvedTenant {
    const resolved: ResolvedTenant = {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      customDomain: tenant.customDomain,
      themeId: tenant.themeId,
      status: tenant.status,
      dbConfig: {
        host: tenant.dbHost,
        port: 5432,
        database: tenant.dbName,
        user: tenant.dbUser,
        password: tenant.dbPassword,
      },
    };

    if (cacheKey) {
      this.cache.set(cacheKey, resolved);
    }

    return resolved;
  }

  invalidateCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      max: this.cache.max,
    };
  }
}

export function createTenantResolver(resolver: TenantResolver, rootDomain: string): TenantResolutionManager {
  return new TenantResolutionManager(resolver, rootDomain);
}

export async function resolveTenantFromRequest(
  hostname: string,
  resolver: TenantResolver,
  rootDomain: string,
  devHeaders?: any
): Promise<ResolvedTenant | null> {
  const manager = createTenantResolver(resolver, rootDomain);
  return manager.resolveFromRequest(hostname, devHeaders);
}
