import type { Tenant } from '@ecommerce/shared-types';

export interface TenantDbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface ResolvedTenant {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  themeId: string;
  status: 'provisioning' | 'active' | 'suspended';
  dbConfig: TenantDbConfig;
}
