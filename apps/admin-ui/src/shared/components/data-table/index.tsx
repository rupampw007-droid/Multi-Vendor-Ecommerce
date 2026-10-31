'use client';

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  LoaderCircle,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { PageResult, ResourceQuery, SortDirection } from '@/types/admin';

export interface DataColumn<T> {
  key: string;
  title: string;
  sortable?: boolean;
  render: (row: T) => ReactNode;
}

export interface DataFilter {
  key: string;
  label: string;
  options: string[];
}

export interface RowAction<T> {
  id: string;
  label: string | ((row: T) => string);
  danger?: boolean;
  render?: (row: T) => boolean;
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  loadPage: (query: ResourceQuery) => Promise<PageResult<T>>;
  filters?: DataFilter[];
  rowActions?: RowAction<T>[];
  onAction?: (row: T, action: string) => void;
  refreshKey?: number;
  initialSort?: string;
  pageSize?: number;
}

export default function DataTable<T extends { id: string }>({
  columns,
  loadPage,
  filters = [],
  rowActions = [],
  onAction,
  refreshKey = 0,
  initialSort = 'date',
  pageSize = 8,
}: DataTableProps<T>) {
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState(initialSort);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PageResult<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [searchText]);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const next = await loadPage({
        page,
        pageSize,
        search,
        sortBy,
        sortDirection,
        filters: filterValues,
      });
      setResult(next);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load records. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [
    filterValues,
    loadPage,
    page,
    pageSize,
    refreshKey,
    retry,
    search,
    sortBy,
    sortDirection,
  ]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / pageSize));
  const start = result?.total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, result?.total ?? 0);

  return (
    <div className="table-card">
      <div className="table-toolbar">
        <label className="table-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search records</span>
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search..."
            type="search"
          />
        </label>
        <div className="table-filters">
          {filters.map((filter) => (
            <label className="filter-select" key={filter.key}>
              <span className="sr-only">{filter.label}</span>
              <select
                value={filterValues[filter.key] ?? ''}
                onChange={(event) => {
                  setFilterValues((current) => ({
                    ...current,
                    [filter.key]: event.target.value,
                  }));
                  setPage(1);
                }}
              >
                <option value="">All {filter.label}</option>
                {filter.options.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </label>
          ))}
          {result && (
            <span className={`data-source source-${result.source}`}>
              {result.source === 'api' ? 'Live data' : 'Demo data'}
            </span>
          )}
        </div>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    sortBy === column.key
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      className="sort-button"
                      onClick={() => handleSort(column.key)}
                    >
                      {column.title}
                      <ChevronsUpDown size={14} aria-hidden="true" />
                    </button>
                  ) : (
                    column.title
                  )}
                </th>
              ))}
              {rowActions.length > 0 && <th scope="col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  className="table-state"
                  colSpan={columns.length + (rowActions.length ? 1 : 0)}
                >
                  <LoaderCircle className="spin" size={22} />
                  <span>Loading records...</span>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  className="table-state table-error"
                  colSpan={columns.length + (rowActions.length ? 1 : 0)}
                >
                  <span>{error}</span>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => setRetry((current) => current + 1)}
                  >
                    Try again
                  </button>
                </td>
              </tr>
            ) : result?.data.length ? (
              result.data.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={column.key}>{column.render(row)}</td>
                  ))}
                  {rowActions.length > 0 && (
                    <td>
                      <div className="row-action-list">
                        {rowActions
                          .filter((action) => !action.render || action.render(row))
                          .map((action) => (
                            <button
                              className={`table-action ${action.danger ? 'table-action-danger' : ''}`}
                              type="button"
                              key={action.id}
                              onClick={() => onAction?.(row, action.id)}
                            >
                              {typeof action.label === 'function'
                                ? action.label(row)
                                : action.label}
                            </button>
                          ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="table-state"
                  colSpan={columns.length + (rowActions.length ? 1 : 0)}
                >
                  <span className="empty-title">No records found</span>
                  <span>Try changing your search or filters.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <footer className="table-pagination">
        <span>
          Showing <strong>{start}–{end}</strong> of{' '}
          <strong>{result?.total ?? 0}</strong> results
        </span>
        <div className="pagination-controls">
          <button
            className="button button-secondary button-small"
            type="button"
            aria-label="Previous page"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span className="page-indicator">
            Page {page} of {totalPages}
          </span>
          <button
            className="button button-secondary button-small"
            type="button"
            aria-label="Next page"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
}
