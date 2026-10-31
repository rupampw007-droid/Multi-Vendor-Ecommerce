export type AdminResource =
  | 'orders'
  | 'payments'
  | 'products'
  | 'events'
  | 'users'
  | 'sellers'
  | 'admins';

export type SortDirection = 'asc' | 'desc';

export interface ResourceQuery {
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortDirection: SortDirection;
  filters: Record<string, string>;
}

export interface PageResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  source: 'api' | 'demo';
}

export interface OrderRecord {
  id: string;
  customer: string;
  seller: string;
  items: number;
  total: number;
  status: string;
  date: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  user: string;
  amount: number;
  method: string;
  status: string;
  date: string;
}

export interface ProductRecord {
  id: string;
  image: string;
  name: string;
  seller: string;
  category: string;
  price: number;
  stock: number;
  status: string;
}

export interface EventRecord {
  id: string;
  name: string;
  seller: string;
  start: string;
  end: string;
  status: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  joined: string;
  status: string;
}

export interface SellerRecord {
  id: string;
  shopName: string;
  owner: string;
  email: string;
  productCount: number;
  status: string;
}

export interface AdminRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  created: string;
  status: string;
}

export interface DashboardStats {
  revenue: number;
  orders: number;
  users: number;
  sellers: number;
}

export interface CustomizationData {
  categories: string[];
  subCategories: Record<string, string[]>;
  logo: string | null;
  banner: string | null;
  banners: BannerRecord[];
}

export interface BannerRecord {
  id: string;
  title: string;
  image: string;
}

export type ResourceRecord =
  | OrderRecord
  | PaymentRecord
  | ProductRecord
  | EventRecord
  | UserRecord
  | SellerRecord
  | AdminRecord;
