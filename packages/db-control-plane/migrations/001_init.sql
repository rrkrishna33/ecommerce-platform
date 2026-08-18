-- Platform Owners
CREATE TABLE IF NOT EXISTS platform_owners (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'owner',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Themes
CREATE TABLE IF NOT EXISTS themes (
  id VARCHAR(255) PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  config_json JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  custom_domain VARCHAR(255) UNIQUE,
  db_host VARCHAR(255) NOT NULL,
  db_port INTEGER DEFAULT 5432,
  db_name VARCHAR(100) NOT NULL,
  db_user VARCHAR(100) NOT NULL,
  db_password VARCHAR(255) NOT NULL,
  theme_id VARCHAR(255) REFERENCES themes(id),
  status VARCHAR(50) DEFAULT 'provisioning',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenant Provisioning Log
CREATE TABLE IF NOT EXISTS tenant_provisioning_log (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id),
  step VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  error TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants(custom_domain);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_provisioning_log_tenant ON tenant_provisioning_log(tenant_id);
