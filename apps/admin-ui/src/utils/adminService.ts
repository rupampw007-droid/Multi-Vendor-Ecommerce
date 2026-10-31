import type { AxiosError } from 'axios';
import axiosInstance from '@/utils/axiosInstance';
import type {
  AdminRecord,
  AdminResource,
  BannerRecord,
  CustomizationData,
  DashboardStats,
  OrderRecord,
  PageResult,
  ResourceQuery,
  ResourceRecord,
} from '@/types/admin';

type ApiRecord = Record<string, unknown>;
type ApiPage = {
  data?: unknown;
  orders?: unknown;
  admins?: unknown;
  meta?: { total?: number };
};

const resourceRoutes: Partial<Record<AdminResource, string>> = {
  orders: '/order/api/get-admin-orders',
  products: '/admin/api/get-all-products',
  events: '/admin/api/get-all-events',
  users: '/admin/api/get-all-users',
  sellers: '/admin/api/get-all-sellers',
  admins: '/admin/api/get-all-admins',
};

const date = (offset: number) =>
  new Date(Date.now() - offset * 86_400_000).toISOString();

const sampleRows: Record<AdminResource, ResourceRecord[]> = {
  orders: [
    { id: 'ORD-10482', customer: 'Olivia Rhye', seller: 'Northstar Studio', items: 3, total: 284.5, status: 'Processing', date: date(0) },
    { id: 'ORD-10481', customer: 'Phoenix Baker', seller: 'Aster Goods', items: 1, total: 89, status: 'Shipped', date: date(1) },
    { id: 'ORD-10480', customer: 'Lana Steiner', seller: 'Northstar Studio', items: 2, total: 165.75, status: 'Delivered', date: date(2) },
    { id: 'ORD-10479', customer: 'Demi Wilkinson', seller: 'Haven Home', items: 4, total: 422, status: 'Processing', date: date(3) },
    { id: 'ORD-10478', customer: 'Candice Wu', seller: 'Aster Goods', items: 1, total: 58.5, status: 'Cancelled', date: date(4) },
    { id: 'ORD-10477', customer: 'Natali Craig', seller: 'Haven Home', items: 2, total: 138, status: 'Delivered', date: date(5) },
    { id: 'ORD-10476', customer: 'Drew Cano', seller: 'Northstar Studio', items: 1, total: 74.25, status: 'Pending', date: date(6) },
    { id: 'ORD-10475', customer: 'Andi Lane', seller: 'Aster Goods', items: 3, total: 312.4, status: 'Shipped', date: date(7) },
  ],
  payments: [
    { id: 'PAY-68422', orderId: 'ORD-10482', user: 'Olivia Rhye', amount: 284.5, method: 'Visa •••• 4242', status: 'Paid', date: date(0) },
    { id: 'PAY-68421', orderId: 'ORD-10481', user: 'Phoenix Baker', amount: 89, method: 'PayPal', status: 'Paid', date: date(1) },
    { id: 'PAY-68420', orderId: 'ORD-10480', user: 'Lana Steiner', amount: 165.75, method: 'Visa •••• 1919', status: 'Paid', date: date(2) },
    { id: 'PAY-68419', orderId: 'ORD-10479', user: 'Demi Wilkinson', amount: 422, method: 'Mastercard •••• 3381', status: 'Pending', date: date(3) },
    { id: 'PAY-68418', orderId: 'ORD-10478', user: 'Candice Wu', amount: 58.5, method: 'Visa •••• 4242', status: 'Refunded', date: date(4) },
    { id: 'PAY-68417', orderId: 'ORD-10477', user: 'Natali Craig', amount: 138, method: 'Apple Pay', status: 'Paid', date: date(5) },
    { id: 'PAY-68416', orderId: 'ORD-10476', user: 'Drew Cano', amount: 74.25, method: 'Visa •••• 1919', status: 'Failed', date: date(6) },
    { id: 'PAY-68415', orderId: 'ORD-10475', user: 'Andi Lane', amount: 312.4, method: 'PayPal', status: 'Paid', date: date(7) },
  ],
  products: [
    { id: 'PRD-0401', image: '', name: 'Sculpted ceramic vase', seller: 'Northstar Studio', category: 'Home & Living', price: 64, stock: 32, status: 'Active' },
    { id: 'PRD-0402', image: '', name: 'Everyday leather tote', seller: 'Aster Goods', category: 'Accessories', price: 118, stock: 8, status: 'Pending' },
    { id: 'PRD-0403', image: '', name: 'Linen cushion cover', seller: 'Haven Home', category: 'Home & Living', price: 42, stock: 51, status: 'Active' },
    { id: 'PRD-0404', image: '', name: 'Minimal gold earrings', seller: 'Aster Goods', category: 'Jewelry', price: 79, stock: 0, status: 'Draft' },
    { id: 'PRD-0405', image: '', name: 'Hand-poured candle set', seller: 'Northstar Studio', category: 'Home & Living', price: 36, stock: 24, status: 'Active' },
    { id: 'PRD-0406', image: '', name: 'Woven market basket', seller: 'Haven Home', category: 'Accessories', price: 52, stock: 17, status: 'Pending' },
  ],
  events: [
    { id: 'EVT-0281', name: 'Autumn Makers Market', seller: 'Northstar Studio', start: date(-12), end: date(-10), status: 'Upcoming' },
    { id: 'EVT-0280', name: 'The Home Edit', seller: 'Haven Home', start: date(1), end: date(4), status: 'Live' },
    { id: 'EVT-0279', name: 'Independent Jewelry Week', seller: 'Aster Goods', start: date(15), end: date(18), status: 'Upcoming' },
    { id: 'EVT-0278', name: 'Summer Studio Sale', seller: 'Northstar Studio', start: date(18), end: date(15), status: 'Ended' },
  ],
  users: [
    { id: 'USR-0891', name: 'Olivia Rhye', email: 'olivia@example.com', role: 'Customer', joined: date(2), status: 'Active' },
    { id: 'USR-0890', name: 'Phoenix Baker', email: 'phoenix@example.com', role: 'Customer', joined: date(8), status: 'Active' },
    { id: 'USR-0889', name: 'Lana Steiner', email: 'lana@example.com', role: 'Customer', joined: date(16), status: 'Blocked' },
    { id: 'USR-0888', name: 'Demi Wilkinson', email: 'demi@example.com', role: 'Customer', joined: date(21), status: 'Active' },
    { id: 'USR-0887', name: 'Candice Wu', email: 'candice@example.com', role: 'Customer', joined: date(33), status: 'Active' },
    { id: 'USR-0886', name: 'Natali Craig', email: 'natali@example.com', role: 'Customer', joined: date(48), status: 'Active' },
  ],
  sellers: [
    { id: 'SEL-0101', shopName: 'Northstar Studio', owner: 'Morgan Lee', email: 'morgan@northstar.co', productCount: 24, status: 'Approved' },
    { id: 'SEL-0102', shopName: 'Aster Goods', owner: 'Jamie Chen', email: 'jamie@astergoods.co', productCount: 18, status: 'Approved' },
    { id: 'SEL-0103', shopName: 'Haven Home', owner: 'Taylor Brooks', email: 'taylor@havenhome.co', productCount: 31, status: 'Pending' },
    { id: 'SEL-0104', shopName: 'Field Notes Market', owner: 'Alex Rivera', email: 'alex@fieldnotes.co', productCount: 12, status: 'Suspended' },
  ],
  admins: [
    { id: 'ADM-001', name: 'Alex Morgan', email: 'alex@platform.co', role: 'Super Admin', created: date(90), status: 'Active' },
    { id: 'ADM-002', name: 'Jordan Blake', email: 'jordan@platform.co', role: 'Admin', created: date(61), status: 'Active' },
    { id: 'ADM-003', name: 'Sam Taylor', email: 'sam@platform.co', role: 'Admin', created: date(24), status: 'Disabled' },
  ],
};

const readStoredRows = (resource: AdminResource): ResourceRecord[] => {
  if (typeof window === 'undefined') return sampleRows[resource];
  const saved = window.localStorage.getItem(`admin-ui:${resource}`);
  if (!saved) return sampleRows[resource];
  try {
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      throw new Error(`Stored ${resource} data is not a list`);
    }
    return parsed as ResourceRecord[];
  } catch (error) {
    throw new Error(`Could not read saved ${resource} demo data`, { cause: error });
  }
};

const readOverrides = (
  resource: AdminResource,
): Record<string, Partial<ResourceRecord>> => {
  if (typeof window === 'undefined') return {};
  const saved = window.localStorage.getItem(`admin-ui:${resource}:overrides`);
  if (!saved) return {};
  try {
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`Stored ${resource} updates are invalid`);
    }
    return parsed as Record<string, Partial<ResourceRecord>>;
  } catch (error) {
    throw new Error(`Could not read saved ${resource} updates`, { cause: error });
  }
};

const readDeletedIds = (resource: AdminResource): string[] => {
  if (typeof window === 'undefined') return [];
  const saved = window.localStorage.getItem(`admin-ui:${resource}:deleted`);
  if (!saved) return [];
  try {
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== 'string')) {
      throw new Error(`Stored ${resource} deletions are invalid`);
    }
    return parsed;
  } catch (error) {
    throw new Error(`Could not read saved ${resource} deletions`, { cause: error });
  }
};

const overlayLocalChanges = <T extends ResourceRecord>(
  resource: AdminResource,
  rows: T[],
): T[] => {
  const overrides = readOverrides(resource);
  const deleted = new Set(readDeletedIds(resource));
  return rows
    .filter((row) => !deleted.has(row.id))
    .map((row) => ({ ...row, ...overrides[row.id] }) as T);
};

const stringValue = (value: unknown, fallback = '') =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
const numberValue = (value: unknown, fallback = 0) =>
  typeof value === 'number' ? value : fallback;
const objectValue = (value: unknown): ApiRecord =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as ApiRecord)
    : {};

const mapApiRecord = (resource: AdminResource, value: unknown): ResourceRecord => {
  const row = objectValue(value);
  const id = stringValue(row.id, 'unknown');
  if (resource === 'orders') {
    const fulfillments = Array.isArray(row.fulfillments) ? row.fulfillments : [];
    const sellerName = objectValue(objectValue(fulfillments[0]).shop).name;
    return {
      id,
      customer: stringValue(objectValue(row.user).name, 'Customer'),
      seller: stringValue(sellerName, 'Multiple sellers'),
      items: Array.isArray(row.items) ? row.items.length : 0,
      total: numberValue(row.totalAmount),
      status: stringValue(row.status, 'Pending'),
      date: stringValue(row.createdAt),
    };
  }
  if (resource === 'products') {
    const images = Array.isArray(row.images) ? row.images : [];
    return {
      id,
      image: stringValue(objectValue(images[0]).url),
      name: stringValue(row.title, 'Untitled product'),
      seller: stringValue(objectValue(row.Shop).name, 'Seller'),
      category: stringValue(row.category, 'Uncategorized'),
      price: numberValue(row.sale_price),
      stock: numberValue(row.stock),
      status: stringValue(row.status, 'Active'),
    };
  }
  if (resource === 'events') {
    const start = stringValue(row.starting_date);
    const end = stringValue(row.ending_date);
    const isPast = end && Date.parse(end) < Date.now();
    const isLive = start && Date.parse(start) <= Date.now() && !isPast;
    return {
      id,
      name: stringValue(row.title, 'Untitled event'),
      seller: stringValue(objectValue(row.Shop).name, 'Seller'),
      start,
      end,
      status: isPast ? 'Ended' : isLive ? 'Live' : 'Upcoming',
    };
  }
  if (resource === 'users') {
    return {
      id,
      name: stringValue(row.name, 'User'),
      email: stringValue(row.email),
      role: stringValue(row.role, 'Customer'),
      joined: stringValue(row.createdAt),
      status: 'Active',
    };
  }
  if (resource === 'sellers') {
    const shop = objectValue(row.shop);
    const products = Array.isArray(shop.products) ? shop.products : [];
    return {
      id,
      shopName: stringValue(shop.name, 'Shop not set up'),
      owner: stringValue(row.name, 'Seller'),
      email: stringValue(row.email),
      productCount: products.length,
      status: 'Approved',
    };
  }
  return {
    id,
    name: stringValue(row.name, 'Admin'),
    email: stringValue(row.email),
    role: stringValue(row.role, 'Admin'),
    created: stringValue(row.createdAt),
    status: 'Active',
  };
};

const hasMissingEndpoint = (error: unknown) =>
  (error as AxiosError | undefined)?.response?.status === 404;

const mockPage = <T extends ResourceRecord>(
  resource: AdminResource,
  query: ResourceQuery,
): PageResult<T> => {
  let rows = overlayLocalChanges(resource, readStoredRows(resource));
  const search = query.search.trim().toLowerCase();
  if (search) {
    rows = rows.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(search),
      ),
    );
  }
  Object.entries(query.filters).forEach(([key, value]) => {
    if (value) {
      rows = rows.filter(
        (row) =>
          stringValue((row as unknown as ApiRecord)[key]).toLowerCase() ===
          value.toLowerCase(),
      );
    }
  });
  const direction = query.sortDirection === 'asc' ? 1 : -1;
  rows = [...rows].sort((a, b) => {
    const left = String((a as unknown as ApiRecord)[query.sortBy] ?? '');
    const right = String((b as unknown as ApiRecord)[query.sortBy] ?? '');
    return left.localeCompare(right, undefined, { numeric: true }) * direction;
  });
  const start = (query.page - 1) * query.pageSize;
  return {
    data: rows.slice(start, start + query.pageSize) as T[],
    total: rows.length,
    page: query.page,
    pageSize: query.pageSize,
    source: 'demo',
  };
};

export async function getResourcePage<T extends ResourceRecord>(
  resource: AdminResource,
  query: ResourceQuery,
): Promise<PageResult<T>> {
  const endpoint = resourceRoutes[resource];
  if (!endpoint) return mockPage<T>(resource, query);
  try {
    const clientSideStatus =
      Boolean(query.filters.status) &&
      (['users', 'sellers', 'admins'].includes(resource) ||
        (resource === 'events' && query.filters.status === 'Approved'));
    const requestFilters = { ...query.filters };
    if (clientSideStatus) delete requestFilters.status;
    const response = await axiosInstance.get<ApiPage>(endpoint, {
      params: {
        page: clientSideStatus ? 1 : query.page,
        pageSize: clientSideStatus ? 100 : query.pageSize,
        search: query.search,
        sortBy: query.sortBy,
        sortDirection: query.sortDirection,
        ...requestFilters,
      },
      requireAuth: true,
    });
    const payload = response.data;
    const sourceRows = payload.data ?? payload.orders ?? payload.admins ?? [];
    let rows = Array.isArray(sourceRows)
      ? overlayLocalChanges(
          resource,
          sourceRows.map((row) => mapApiRecord(resource, row) as T),
        )
      : [];
    if (clientSideStatus) {
      rows = rows.filter(
        (row) =>
          stringValue((row as unknown as ApiRecord).status).toLowerCase() ===
          query.filters.status.toLowerCase(),
      );
    }
    const start = (query.page - 1) * query.pageSize;
    const total = clientSideStatus
      ? rows.length
      : Math.max(
          0,
          numberValue(payload.meta?.total, rows.length) -
            readDeletedIds(resource).length,
        );
    return {
      data: clientSideStatus
        ? rows.slice(start, start + query.pageSize)
        : rows,
      total,
      page: query.page,
      pageSize: query.pageSize,
      source: 'api',
    };
  } catch (error) {
    if (hasMissingEndpoint(error)) return mockPage<T>(resource, query);
    throw error;
  }
}

export async function getAdminSession() {
  const response = await axiosInstance.get<{ admin: { id: string; name: string; email: string } }>(
    '/admin/api/admin-session',
    { requireAuth: true },
  );
  return response.data.admin;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const response = await axiosInstance.get<DashboardStats>(
      '/admin/api/dashboard-stats',
      { requireAuth: true },
    );
    return response.data;
  } catch (error) {
    if (!hasMissingEndpoint(error)) throw error;
    const orders = readStoredRows('orders') as OrderRecord[];
    return {
      revenue: orders.reduce((total, order) => total + order.total, 0),
      orders: orders.length,
      users: readStoredRows('users').length,
      sellers: readStoredRows('sellers').length,
    };
  }
}

export async function saveRecord(
  resource: AdminResource,
  id: string,
  updates: Partial<ResourceRecord>,
) {
  const overrides = readOverrides(resource);
  overrides[id] = { ...overrides[id], ...updates };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      `admin-ui:${resource}:overrides`,
      JSON.stringify(overrides),
    );
  }
  return 'demo' as const;
}

export async function deleteRecord(resource: AdminResource, id: string) {
  const deleted = new Set(readDeletedIds(resource));
  deleted.add(id);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      `admin-ui:${resource}:deleted`,
      JSON.stringify([...deleted]),
    );
  }
  return 'demo' as const;
}

export async function createAdmin(name: string, email: string) {
  const response = await axiosInstance.put<{ admin?: ApiRecord }>(
    '/admin/api/add-new-admin',
    { email },
    { requireAuth: true },
  );
  return mapApiRecord('admins', response.data.admin ?? { name, email, role: 'admin' }) as AdminRecord;
}

const customizationStorageKey = 'admin-ui:customizations';
const defaultCustomizations: CustomizationData = {
  categories: ['Home & Living', 'Accessories', 'Jewelry'],
  subCategories: {
    'Home & Living': ['Decor', 'Kitchen', 'Textiles'],
    Accessories: ['Bags', 'Scarves'],
    Jewelry: ['Earrings', 'Necklaces'],
  },
  logo: null,
  banner: null,
  banners: [],
};

const loadCustomizations = (): CustomizationData => {
  if (typeof window === 'undefined') return defaultCustomizations;
  const stored = window.localStorage.getItem(customizationStorageKey);
  if (!stored) return defaultCustomizations;
  try {
    return {
      ...defaultCustomizations,
      ...(JSON.parse(stored) as Partial<CustomizationData>),
    };
  } catch (error) {
    throw new Error('Could not read saved customization data', { cause: error });
  }
};

export async function getCustomizations(): Promise<CustomizationData> {
  const local = loadCustomizations();
  try {
    const response = await axiosInstance.get<Partial<CustomizationData>>(
      '/admin/api/get-all',
      { requireAuth: true },
    );
    return {
      ...local,
      ...response.data,
      banners: local.banners,
      categories: response.data.categories ?? local.categories,
      subCategories: response.data.subCategories ?? local.subCategories,
    };
  } catch (error) {
    if (hasMissingEndpoint(error)) return local;
    throw error;
  }
}

export async function saveCustomizations(data: CustomizationData) {
  try {
    await axiosInstance.put(
      '/admin/api/customizations',
      {
        categories: data.categories,
        subCategories: data.subCategories,
        logo: data.logo,
        banner: data.banner,
      },
      { requireAuth: true },
    );
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(customizationStorageKey, JSON.stringify(data));
    }
    return 'api' as const;
  } catch (error) {
    if (hasMissingEndpoint(error)) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(customizationStorageKey, JSON.stringify(data));
      }
      return 'demo' as const;
    }
    throw error;
  }
}

export function newBanner(title: string, image: string): BannerRecord {
  return { id: `banner-${Date.now()}`, title, image };
}

export function dashboardSampleRows() {
  return sampleRows;
}
