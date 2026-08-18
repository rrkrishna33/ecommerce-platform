// Tenant
export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  themeId: string;
  status: 'provisioning' | 'active' | 'suspended';
  createdAt: Date;
}

// JWT Payload
export interface JwtPayload {
  sub: string; // user id
  role: 'platform_owner' | 'store_admin' | 'shopper';
  tenantId: string | null; // null for platform_owner
  iat: number;
  exp: number;
}

// Platform Owner
export interface PlatformOwner {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
}

// Store Admin
export interface StoreAdmin {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'owner' | 'staff';
  createdAt: Date;
}

// Customer
export interface Customer {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
}

// Category
export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  createdAt: Date;
}

// Address
export interface Address {
  id: string;
  customerId: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  createdAt: Date;
}

// Product
export interface Product {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  basePrice: number;
  createdAt: Date;
}

// Product Variant
export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  attributes: Record<string, string>;
  priceOverride: number | null;
  imageUrl: string | null;
}

// Inventory
export interface Inventory {
  variantId: string;
  quantityOnHand: number;
  reservedQuantity: number;
}

// Cart
export interface Cart {
  id: string;
  customerId: string | null;
  status: 'active' | 'abandoned' | 'checked_out';
}

// Cart Item
export interface CartItem {
  cartId: string;
  variantId: string;
  quantity: number;
  priceAtAdd: number;
}

// Order
export interface Order {
  id: string;
  customerId: string;
  status: 'pending' | 'paid' | 'fulfilled' | 'cancelled';
  total: number;
  shippingAddressId: string;
  billingAddressId: string;
  paymentReference: string;
  createdAt: Date;
}

// Order Item
export interface OrderItem {
  orderId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  productNameSnapshot: string;
}

// Theme
export interface Theme {
  id: string;
  key: string;
  displayName: string;
  configJson: Record<string, any>;
}

// API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Pagination
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
