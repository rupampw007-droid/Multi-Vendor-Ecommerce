'use client';

import type { PaymentRecord } from '@/types/admin';
import ResourcePage from '@/shared/components/data-page/resource-page';
import {
  CurrencyCell,
  DateCell,
  StatusBadge,
} from '@/shared/components/data-page/table-cells';
import type { DataColumn, RowAction } from '@/shared/components/data-table';

const columns: DataColumn<PaymentRecord>[] = [
  { key: 'id', title: 'Payment ID', sortable: true, render: (row) => <strong className="table-id">{row.id}</strong> },
  { key: 'orderId', title: 'Order ID', render: (row) => <span className="table-id">{row.orderId}</span> },
  { key: 'user', title: 'User', sortable: true, render: (row) => <span className="primary-cell">{row.user}</span> },
  { key: 'amount', title: 'Amount', sortable: true, render: (row) => <CurrencyCell value={row.amount} /> },
  { key: 'method', title: 'Method', render: (row) => row.method },
  { key: 'status', title: 'Payment status', render: (row) => <StatusBadge value={row.status} /> },
  { key: 'date', title: 'Date', sortable: true, render: (row) => <DateCell value={row.date} /> },
];

const actions: RowAction<PaymentRecord>[] = [
  { id: 'view', label: 'View' },
  { id: 'refund', label: 'Refund', danger: true, render: (row) => row.status !== 'Refunded' },
];

export default function PaymentsPage() {
  return (
    <ResourcePage
      resource="payments"
      title="Payments"
      description="Monitor payment activity, statuses, and refunds."
      columns={columns}
      actions={actions}
      filters={[{ key: 'status', label: 'status', options: ['Paid', 'Pending', 'Failed', 'Refunded'] }]}
      initialSort="date"
    />
  );
}