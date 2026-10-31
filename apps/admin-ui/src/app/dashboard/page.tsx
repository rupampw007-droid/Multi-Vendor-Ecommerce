'use client';

import { ArrowUpRight, CircleDollarSign, ShoppingBag, Store, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { DashboardStats } from '@/types/admin';
import DistributionMap from '@/shared/components/charts/distribution-map';
import DeviceChart from '@/shared/components/charts/device-chart';
import RevenueChart from '@/shared/components/charts/revenue-chart';
import StatCard from '@/shared/components/stat-card';
import { getDashboardStats } from '@/utils/adminService';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setStats(await getDashboardStats());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load dashboard metrics.',
      );
    } finally {
      setLoading(false);
    }
  }, [retry]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return (
    <>
      <div className="dashboard-welcome">
        <div>
          <div className="eyebrow">OVERVIEW</div>
          <h1>Good morning, Admin <span>✦</span></h1>
          <p>Here&apos;s what&apos;s happening across your marketplace today.</p>
        </div>
        <div className="dashboard-date">
          <span>Today</span>
          <strong>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</strong>
        </div>
      </div>
      {error && (
        <div className="inline-error" role="alert">
          <span>{error}</span>
          <button type="button" className="button button-secondary button-small" onClick={() => setRetry((value) => value + 1)}>
            Try again
          </button>
        </div>
      )}
      <div className="stat-grid" aria-busy={loading}>
        <StatCard
          title="Total revenue"
          value={loading ? '—' : formatCurrency(stats?.revenue ?? 0)}
          change={<span className="stat-live"><i /> Live</span>}
          detail="all time"
          icon={CircleDollarSign}
          tone="violet"
        />
        <StatCard
          title="Total orders"
          value={loading ? '—' : (stats?.orders ?? 0).toLocaleString()}
          change={<span className="stat-live"><i /> Live</span>}
          detail="all time"
          icon={ShoppingBag}
          tone="blue"
        />
        <StatCard
          title="Active users"
          value={loading ? '—' : (stats?.users ?? 0).toLocaleString()}
          change={<span className="stat-live"><i /> Live</span>}
          detail="registered customers"
          icon={Users}
          tone="green"
        />
        <StatCard
          title="Total sellers"
          value={loading ? '—' : (stats?.sellers ?? 0).toLocaleString()}
          change={<span className="stat-live"><i /> Live</span>}
          detail="marketplace partners"
          icon={Store}
          tone="amber"
        />
      </div>
      <div className="dashboard-chart-grid">
        <RevenueChart />
        <DeviceChart />
      </div>
      <DistributionMap />
      <section className="dashboard-footer-note">
        <ArrowUpRight size={16} />
        <span>
          Revenue and KPI totals are loaded from the admin API. Revenue history,
          device usage, and regional distribution are illustrative until analytics
          endpoints are available.
        </span>
      </section>
    </>
  );
}