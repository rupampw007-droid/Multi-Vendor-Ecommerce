import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  change: ReactNode;
  detail: string;
  icon: LucideIcon;
  tone: 'violet' | 'blue' | 'green' | 'amber';
}

export default function StatCard({
  title,
  value,
  change,
  detail,
  icon: Icon,
  tone,
}: StatCardProps) {
  return (
    <article className="stat-card">
      <div className={`stat-icon stat-icon-${tone}`}>
        <Icon size={19} aria-hidden="true" />
      </div>
      <div className="stat-card-title">{title}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">
        <span className="stat-change">{change}</span>
        <span>{detail}</span>
      </div>
    </article>
  );
}
