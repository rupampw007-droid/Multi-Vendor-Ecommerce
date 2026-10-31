'use client';

import { useMemo, useState } from 'react';

export type RevenueRange = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

const rangeLabels: Record<RevenueRange, string[]> = {
  Daily: ['8a', '9a', '10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p', '6p', '7p'],
  Weekly: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  Monthly: ['1', '3', '5', '7', '9', '11', '13', '15', '17', '19', '21', '23'],
  Yearly: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const rangeSeries: Record<RevenueRange, number[]> = {
  Daily: [31, 38, 34, 52, 48, 61, 58, 76, 69, 83, 78, 96],
  Weekly: [38, 55, 49, 66, 59, 82, 94],
  Monthly: [32, 43, 38, 58, 49, 65, 53, 78, 68, 87, 74, 96],
  Yearly: [29, 34, 42, 37, 51, 58, 49, 70, 64, 82, 74, 96],
};

export default function RevenueChart() {
  const [range, setRange] = useState<RevenueRange>('Monthly');
  const points = useMemo(() => {
    const values = rangeSeries[range];
    return values.map((value, index) => ({
      x: 24 + (index * 652) / (values.length - 1),
      y: 198 - value * 1.65,
      label: rangeLabels[range][index],
      value,
    }));
  }, [range]);
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `24,200 ${line} 676,200`;

  return (
    <section className="panel revenue-panel">
      <div className="panel-heading">
        <div>
          <div className="panel-eyebrow">Revenue overview</div>
          <h2>Sales performance</h2>
          <p>Revenue trend across your marketplace</p>
        </div>
        <div className="segmented-control" role="group" aria-label="Revenue time range">
          {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as RevenueRange[]).map((item) => (
            <button
              type="button"
              key={item}
              className={range === item ? 'segment-active' : ''}
              aria-pressed={range === item}
              onClick={() => setRange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-summary">
        <strong>₹48,294.32</strong>
        <span className="positive-change">↗ 12.8%</span>
        <span>vs. previous period</span>
      </div>
      <div className="chart-wrap">
        <svg
          viewBox="0 0 700 245"
          role="img"
          aria-label={`${range} revenue trend chart`}
          className="revenue-chart-svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#8b7bff" stopOpacity=".25" />
              <stop offset="100%" stopColor="#8b7bff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[40, 80, 120, 160, 200].map((y) => (
            <line
              key={y}
              x1="24"
              x2="676"
              y1={y}
              y2={y}
              className="chart-grid-line"
            />
          ))}
          <polygon points={area} fill="url(#revenue-fill)" />
          <polyline points={line} className="chart-line" />
          {points.map((point) => (
            <g key={`${range}-${point.label}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                className="chart-point"
              >
                <title>
                  {point.label}: ₹{(point.value * 426.5).toLocaleString()}
                </title>
              </circle>
              {points.length < 9 && (
                <text x={point.x} y="227" textAnchor="middle" className="chart-label">
                  {point.label}
                </text>
              )}
            </g>
          ))}
          {points.length >= 9 &&
            points.filter((_, index) => index % 2 === 0).map((point) => (
              <text
                key={`${range}-label-${point.label}`}
                x={point.x}
                y="227"
                textAnchor="middle"
                className="chart-label"
              >
                {point.label}
              </text>
            ))}
        </svg>
      </div>
      <div className="chart-disclaimer">Illustrative revenue trend</div>
    </section>
  );
}
