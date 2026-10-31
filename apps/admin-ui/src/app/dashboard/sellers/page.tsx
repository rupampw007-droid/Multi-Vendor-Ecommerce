'use client';

import type { SellerRecord } from '@/types/admin';
import ResourcePage from '@/shared/components/data-page/resource-page';
import { StatusBadge } from '@/shared/components/data-page/table-cells';
import type { DataColumn, RowAction } from '@/shared/components/data-table';

const columns: DataColumn<SellerRecord>[] = [
  { key: 'shopName', title: 'Shop name', sortable: true, render: (row) => <span className="primary-cell">{row.shopName}</span> },
  { key: 'owner', title: 'Owner', sortable: true, render: (row) => row.owner },
  { key: 'email', title: 'Email', sortable: true, render: (row) => row.email },
  { key: 'productCount', title: 'Products', sortable: true, render: (row) => row.productCount },
  { key: 'status', title: 'Status', render: (row) => <StatusBadge value={row.status} /> },
];

const actions: RowAction<SellerRecord>[] = [
  { id: 'view', label: 'View' },
  { id: 'approve', label: 'Approve', render: (row) => row.status !== 'Approved' },
  { id: 'toggle-status', label: (row) => row.status === 'Suspended' ? 'Restore' : 'Suspend' },
  { id: 'delete', label: 'Delete', danger: true },
];

export default function SellersPage() {
  return (
    <ResourcePage
      resource="sellers"
      title="Sellers"
      description="Review seller shops, inventory, and marketplace access."
      columns={columns}
      actions={actions}
      filters={[{ key: 'status', label: 'status', options: ['Approved', 'Pending', 'Suspended'] }]}
      initialSort="shopName"
    />
  );
}
