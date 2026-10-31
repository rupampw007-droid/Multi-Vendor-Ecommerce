'use client';

import type { EventRecord } from '@/types/admin';
import ResourcePage from '@/shared/components/data-page/resource-page';
import { DateCell, StatusBadge } from '@/shared/components/data-page/table-cells';
import type { DataColumn, RowAction } from '@/shared/components/data-table';

const columns: DataColumn<EventRecord>[] = [
  { key: 'name', title: 'Event', sortable: true, render: (row) => <span className="primary-cell">{row.name}</span> },
  { key: 'seller', title: 'Seller', sortable: true, render: (row) => row.seller },
  { key: 'start', title: 'Starts', sortable: true, render: (row) => <DateCell value={row.start} /> },
  { key: 'end', title: 'Ends', sortable: true, render: (row) => <DateCell value={row.end} /> },
  { key: 'status', title: 'Status', render: (row) => <StatusBadge value={row.status} /> },
];

const actions: RowAction<EventRecord>[] = [
  { id: 'view', label: 'View' },
  { id: 'approve', label: 'Approve', render: (row) => row.status !== 'Approved' },
  { id: 'delete', label: 'Delete', danger: true },
];

export default function EventsPage() {
  return (
    <ResourcePage
      resource="events"
      title="Events"
      description="Manage seller events and marketplace campaigns."
      columns={columns}
      actions={actions}
      filters={[{ key: 'status', label: 'status', options: ['Upcoming', 'Live', 'Ended', 'Approved'] }]}
      initialSort="start"
    />
  );
}