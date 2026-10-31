'use client';

import type { UserRecord } from '@/types/admin';
import ResourcePage from '@/shared/components/data-page/resource-page';
import { DateCell, StatusBadge } from '@/shared/components/data-page/table-cells';
import type { DataColumn, RowAction } from '@/shared/components/data-table';

const columns: DataColumn<UserRecord>[] = [
  { key: 'name', title: 'Name', sortable: true, render: (row) => <span className="primary-cell">{row.name}</span> },
  { key: 'email', title: 'Email', sortable: true, render: (row) => row.email },
  { key: 'role', title: 'Role', render: (row) => row.role },
  { key: 'joined', title: 'Joined', sortable: true, render: (row) => <DateCell value={row.joined} /> },
  { key: 'status', title: 'Status', render: (row) => <StatusBadge value={row.status} /> },
];

const actions: RowAction<UserRecord>[] = [
  { id: 'view', label: 'View' },
  { id: 'toggle-status', label: (row) => row.status === 'Blocked' ? 'Unblock' : 'Block' },
  { id: 'delete', label: 'Delete', danger: true },
];

export default function UsersPage() {
  return (
    <ResourcePage
      resource="users"
      title="Users"
      description="Review customer accounts and access status."
      columns={columns}
      actions={actions}
      filters={[{ key: 'status', label: 'status', options: ['Active', 'Blocked'] }]}
      initialSort="joined"
    />
  );
}