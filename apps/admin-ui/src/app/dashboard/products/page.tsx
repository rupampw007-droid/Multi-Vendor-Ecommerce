'use client';

import type { ProductRecord } from '@/types/admin';
import ResourcePage from '@/shared/components/data-page/resource-page';
import {
  CurrencyCell,
  ProductImage,
  StatusBadge,
} from '@/shared/components/data-page/table-cells';
import type { DataColumn, RowAction } from '@/shared/components/data-table';

const columns: DataColumn<ProductRecord>[] = [
  { key: 'image', title: 'Image', render: (row) => <ProductImage src={row.image} name={row.name} /> },
  { key: 'name', title: 'Product', sortable: true, render: (row) => <span className="primary-cell">{row.name}</span> },
  { key: 'seller', title: 'Seller', sortable: true, render: (row) => row.seller },
  { key: 'category', title: 'Category', render: (row) => row.category },
  { key: 'price', title: 'Price', sortable: true, render: (row) => <CurrencyCell value={row.price} /> },
  { key: 'stock', title: 'Stock', sortable: true, render: (row) => <span className={row.stock <= 5 ? 'stock-low' : ''}>{row.stock}</span> },
  { key: 'status', title: 'Status', render: (row) => <StatusBadge value={row.status} /> },
];

const actions: RowAction<ProductRecord>[] = [
  { id: 'view', label: 'View' },
  { id: 'approve', label: 'Approve', render: (row) => row.status !== 'Active' },
  { id: 'reject', label: 'Reject', danger: true, render: (row) => row.status === 'Pending' },
  { id: 'delete', label: 'Delete', danger: true },
];

export default function ProductsPage() {
  return (
    <ResourcePage
      resource="products"
      title="Products"
      description="Review product listings, inventory, and seller submissions."
      columns={columns}
      actions={actions}
      filters={[{ key: 'status', label: 'status', options: ['Active', 'Pending', 'Draft'] }]}
      initialSort="createdAt"
    />
  );
}
