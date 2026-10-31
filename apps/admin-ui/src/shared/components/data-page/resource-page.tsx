'use client';

import { Eye, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import type {
  AdminResource,
  ResourceQuery,
  ResourceRecord,
} from '@/types/admin';
import DataTable, {
  type DataColumn,
  type DataFilter,
  type RowAction,
} from '@/shared/components/data-table';
import Modal from '@/shared/components/modal';
import { useToast } from '@/shared/components/toast';
import { deleteRecord, getResourcePage, saveRecord } from '@/utils/adminService';

interface ResourcePageProps<T extends ResourceRecord> {
  resource: AdminResource;
  title: string;
  description: string;
  columns: DataColumn<T>[];
  actions: RowAction<T>[];
  filters?: DataFilter[];
  initialSort?: string;
  pageSize?: number;
}

type ActiveAction<T> = { row: T; action: string } | null;

const isDestructive = (action: string) =>
  ['delete', 'remove', 'refund', 'cancel-refund'].includes(action);

function updateForAction<T extends ResourceRecord>(
  resource: AdminResource,
  row: T,
  action: string,
  selectedStatus: string,
): Partial<ResourceRecord> {
  if (action === 'update-status' || action === 'cancel-refund') {
    return { status: selectedStatus };
  }
  if (action === 'refund') return { status: 'Refunded' };
  if (action === 'approve') return { status: 'Approved' };
  if (action === 'reject') return { status: 'Rejected' };
  if (action === 'toggle-status') {
    const current = String((row as unknown as Record<string, unknown>).status);
    if (resource === 'users') {
      return { status: current === 'Blocked' ? 'Active' : 'Blocked' };
    }
    if (resource === 'sellers') {
      return { status: current === 'Suspended' ? 'Approved' : 'Suspended' };
    }
    return { status: current === 'Disabled' ? 'Active' : 'Disabled' };
  }
  return {};
}

export default function ResourcePage<T extends ResourceRecord>({
  resource,
  title,
  description,
  columns,
  actions,
  filters,
  initialSort = 'date',
  pageSize,
}: ResourcePageProps<T>) {
  const toast = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeAction, setActiveAction] = useState<ActiveAction<T>>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const loadPage = (query: ResourceQuery) => getResourcePage<T>(resource, query);

  const execute = async (action: string, row: T) => {
    if (action === 'view') {
      setActiveAction({ action, row });
      return;
    }
    if (
      ['update-status', 'cancel-refund'].includes(action)
    ) {
      setSelectedStatus(
        action === 'cancel-refund'
          ? 'Refunded'
          : String((row as unknown as Record<string, unknown>).status ?? ''),
      );
      setActiveAction({ row, action });
      return;
    }
    if (isDestructive(action)) {
      setActiveAction({ row, action });
      return;
    }
    await commitAction(action, row, '');
  };

  const commitAction = async (
    action: string,
    row: T,
    nextStatus: string,
  ) => {
    setBusy(true);
    try {
      if (['delete', 'remove'].includes(action)) {
        await deleteRecord(resource, row.id);
      } else {
        await saveRecord(resource, row.id, updateForAction(resource, row, action, nextStatus));
      }
      setActiveAction(null);
      setRefreshKey((current) => current + 1);
      toast('Saved in demo data. This backend action is not available yet.', 'info');
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'The action could not be completed.',
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  const selectedStatusValue = activeAction
    ? String(
        (activeAction.row as unknown as Record<string, unknown>).status ?? '',
      )
    : '';
  const titleForAction = (action: string) =>
    action === 'cancel-refund'
      ? 'Cancel or refund order'
      : action === 'refund'
        ? 'Refund payment'
        : action === 'delete'
          ? 'Delete record'
          : action === 'remove'
            ? 'Remove administrator'
            : 'Confirm action';
  const descriptionForAction = (action: string) =>
    action === 'cancel-refund'
      ? 'Choose whether this order should be cancelled or refunded. This change is saved in demo data.'
      : action === 'refund'
        ? 'This payment will be marked as refunded in demo data.'
        : action === 'remove'
          ? 'This administrator will be removed from the demo list.'
          : 'This change cannot be undone in the current demo data.';

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Marketplace operations</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <button
          type="button"
          className="button button-secondary refresh-button"
          onClick={() => setRefreshKey((current) => current + 1)}
        >
          <LoaderCircle size={16} />
          Refresh data
        </button>
      </div>
      <DataTable<T>
        key={refreshKey}
        columns={columns}
        loadPage={loadPage}
        rowActions={actions}
        onAction={(row, action) => void execute(action, row)}
        filters={filters}
        refreshKey={refreshKey}
        initialSort={initialSort}
        pageSize={pageSize}
      />
      {activeAction?.action === 'view' && (
        <Modal
          title="Record details"
          description="Review the available information for this record."
          onClose={() => setActiveAction(null)}
          size="wide"
        >
          <dl className="detail-grid">
            {Object.entries(activeAction.row).map(([key, value]) => (
              <div key={key}>
                <dt>{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</dt>
                <dd>
                  {value === null || value === undefined || value === ''
                    ? '—'
                    : typeof value === 'string' && key.toLowerCase().includes('date')
                      ? new Date(value).toLocaleString()
                      : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
      {activeAction && activeAction.action !== 'view' && (
        <Modal
          title={titleForAction(activeAction.action)}
          description={descriptionForAction(activeAction.action)}
          onClose={() => setActiveAction(null)}
          footer={
            <>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setActiveAction(null)}
                disabled={busy}
              >
                Keep record
              </button>
              <button
                type="button"
                className={`button ${isDestructive(activeAction.action) ? 'button-danger' : 'button-primary'}`}
                disabled={busy}
                onClick={() =>
                  void commitAction(
                    activeAction.action,
                    activeAction.row,
                    selectedStatus,
                  )
                }
              >
                {busy ? 'Saving…' : 'Confirm'}
              </button>
            </>
          }
        >
          {(activeAction.action === 'update-status' ||
            activeAction.action === 'cancel-refund') && (
            <label className="form-field">
              <span>{activeAction.action === 'cancel-refund' ? 'Outcome' : 'New status'}</span>
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
              >
                {(activeAction.action === 'cancel-refund'
                  ? ['Cancelled', 'Refunded']
                  : resource === 'orders'
                    ? ['Pending', 'Processing', 'Shipped', 'Delivered']
                    : ['Active', 'Pending', 'Rejected']
                ).map((status) => (
                  <option value={status} key={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          )}
          {isDestructive(activeAction.action) && (
            <div className="confirmation-record">
              <div className="confirmation-icon"><Eye size={18} /></div>
              <div>
                <strong>
                  {String(
                    (activeAction.row as unknown as Record<string, unknown>).name ??
                      (activeAction.row as unknown as Record<string, unknown>).shopName ??
                      (activeAction.row as unknown as Record<string, unknown>).id,
                  )}
                </strong>
                <span>Record ID: {activeAction.row.id}</span>
              </div>
            </div>
          )}
          {activeAction.action === 'update-status' &&
            selectedStatusValue === selectedStatus && (
              <p className="form-hint">Choose a status different from the current status.</p>
            )}
        </Modal>
      )}
    </>
  );
}
