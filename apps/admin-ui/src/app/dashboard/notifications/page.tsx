'use client';

import { BellRing } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <section className="placeholder-panel">
      <span className="placeholder-icon"><BellRing size={23} /></span>
      <div className="eyebrow">Controllers</div>
      <h1>Notifications</h1>
      <p>Notification management is not connected yet. This area is reserved for platform notices.</p>
      <span className="coming-soon">Coming soon</span>
    </section>
  );
}