'use client';

import { Plus, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { AdminRecord, ResourceQuery } from '@/types/admin';
import DataTable, {
  type DataColumn,
  type RowAction,
} from '@/shared/components/data-table';
import Modal from '@/shared/components/modal';
import { DateCell, StatusBadge } from '@/shared/components/data-page/table-cells';
import { useToast } from '@/shared/components/toast';
import {
  createAdmin,
  deleteRecord,
  getResourcePage,
  saveRecord,
} from '@/utils/adminService';

const columns: DataColumn<AdminRecord>[] = [
  { key: 'name', title: 'Name', sortable: true, render: (row) => <span className="primary-cell">{row.name}</span> },
  { key: 'email', title: 'Email', sortable: true, render: (row) => row.email },
  { key: 'role', title: 'Role', render: (row) => <span className="admin-role"><ShieldCheck size={14} />{row.role}</span> },
  { key: 'created', title: 'Created', sortable: true, render: (row) => <DateCell value={row.created} /> },
  { key: 'status', title: 'Status', render: (row) => <StatusBadge value={row.status} /> },
];

const actions: RowAction<AdminRecord>[] = [
  { id: 'view', label: 'View' },
  { id: 'toggle-status', label: (row) => row.status === 'Disabled' ? 'Enable' : 'Disable' },
  { id: 'remove', label: 'Remove', danger: true },
];

export default function ManagementPage() {
  const toast = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeRow, setActiveRow] = useState<AdminRecord | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<AdminRecord | null>(null);
  const [removing, setRemoving] = useState(false);

  const loadPage = (query: ResourceQuery) =>
    getResourcePage<AdminRecord>('admins', query);

  const addAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setValidationError('Enter a valid email address.');
      return;
    }
    setValidationError('');
    setSubmitting(true);
    try {
      await createAdmin('', normalizedEmail);
      setEmail('');
      setAddOpen(false);
      setRefreshKey((current) => current + 1);
      toast('Administrator access granted.');
    } catch (error) {
      const requestError = error as {
        response?: { data?: { message?: string } };
      };
      toast(
        requestError.response?.data?.message ??
          (error instanceof Error ? error.message : 'Could not add administrator.'),
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (row: AdminRecord, action: string) => {
    if (action === 'view') {
      setActiveRow(row);
      return;
    }
    if (action === 'remove') {
      setPendingRemoval(row);
      return;
    }
    try {
      await saveRecord('admins', row.id, {
        status: row.status === 'Disabled' ? 'Active' : 'Disabled',
      });
      toast('Updated in demo data. The backend disable endpoint is not available.', 'info');
      setRefreshKey((current) => current + 1);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update administrator.', 'error');
    }
  };

  const confirmRemoval = async () => {
    if (!pendingRemoval) return;
    setRemoving(true);
    try {
      await deleteRecord('admins', pendingRemoval.id);
      setPendingRemoval(null);
      setRefreshKey((current) => current + 1);
      toast('Removed from demo data. The backend removal endpoint is not available.', 'info');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not remove administrator.', 'error');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Access &amp; permissions</div>
          <h1>Management</h1>
          <p>Manage administrator accounts and platform access.</p>
        </div>
        <button type="button" className="button button-primary" onClick={() => setAddOpen(true)}>
          <Plus size={17} />
          Add Admin
        </button>
      </div>
      <section className="panel management-note">
        <ShieldCheck size={19} />
        <p>
          Admins must already have a registered account. Adding an admin grants
          administrator access to that email.
        </p>
      </section>
      <DataTable<AdminRecord>
        key={refreshKey}
        columns={columns}
        loadPage={loadPage}
        rowActions={actions}
        onAction={(row, action) => void handleAction(row, action)}
        refreshKey={refreshKey}
        initialSort="created"
      />
      {addOpen && (
        <Modal
          title="Add administrator"
          description="Promote an existing registered account to administrator."
          onClose={() => {
            setAddOpen(false);
            setValidationError('');
          }}
          footer={
            <>
              <button type="button" className="button button-secondary" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                form="add-admin-form"
                className="button button-primary"
                disabled={submitting}
              >
                {submitting ? 'Adding…' : 'Grant admin access'}
              </button>
            </>
          }
        >
          <form id="add-admin-form" onSubmit={(event) => void addAdmin(event)}>
            <label className="form-field">
              <span>Email address</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                aria-describedby={validationError ? 'admin-email-error' : undefined}
              />
            </label>
            {validationError && <p className="form-error" id="admin-email-error">{validationError}</p>}
            <p className="form-hint">
              Role will be set to Admin. The account name is taken from its
              existing profile.
            </p>
          </form>
        </Modal>
      )}
      {activeRow && (
        <Modal title="Administrator details" onClose={() => setActiveRow(null)}>
          <dl className="detail-grid">
            {Object.entries(activeRow).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{String(value || '—')}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
      {pendingRemoval && (
        <Modal
          title="Remove administrator"
          description={`Remove administrator access for ${pendingRemoval.email}?`}
          onClose={() => setPendingRemoval(null)}
          footer={
            <>
              <button type="button" className="button button-secondary" onClick={() => setPendingRemoval(null)}>
                Keep admin
              </button>
              <button
                type="button"
                className="button button-danger"
                disabled={removing}
                onClick={() => void confirmRemoval()}
              >
                {removing ? 'Removing…' : 'Remove admin'}
              </button>
            </>
          }
        >
          <p className="confirmation-copy">This change is local to the dashboard demo data.</p>
        </Modal>
      )}
    </>
  );
}
