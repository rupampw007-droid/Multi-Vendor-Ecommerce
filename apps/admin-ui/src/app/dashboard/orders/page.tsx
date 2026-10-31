'use client';

import type { OrderRecord } from '@/types/admin';
import ResourcePage from '@/shared/components/data-page/resource-page';
import {
  CurrencyCell,
  DateCell,
  StatusBadge,
} from '@/shared/components/data-page/table-cells';
import type { DataColumn, RowAction } from '@/shared/components/data-table';

const columns: DataColumn<OrderRecord>[] = [
  { key: 'id', title: 'Order ID', sortable: true, render: (row) => <strong className="table-id">{row.id}</strong> },
  { key: 'customer', title: 'Customer', sortable: true, render: (row) => <span className="primary-cell">{row.customer}</span> },
  { key: 'seller', title: 'Seller', render: (row) => row.seller },
  { key: 'items', title: 'Items', render: (row) => `${row.items} items` },
  { key: 'total', title: 'Total', sortable: true, render: (row) => <CurrencyCell value={row.total} /> },
  { key: 'status', title: 'Status', render: (row) => <StatusBadge value={row.status} /> },
  { key: 'date', title: 'Date', sortable: true, render: (row) => <DateCell value={row.date} /> },
];

const actions: RowAction<OrderRecord>[] = [
  { id: 'view', label: 'View' },
  { id: 'update-status', label: 'Update status' },
  { id: 'cancel-refund', label: 'Cancel / refund', danger: true },
];

export default function OrdersPage() {
  return (
    <ResourcePage
      resource="orders"
      title="Orders"
      description="Review, track, and manage marketplace orders."
      columns={columns}
      actions={actions}
      filters={[{ key: 'status', label: 'status', options: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'] }]}
      initialSort="date"
    />
  );
}
