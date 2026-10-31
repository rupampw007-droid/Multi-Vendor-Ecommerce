const devices = [
  { label: 'Phone', value: 58, color: '#8878ff', count: '58%' },
  { label: 'Computer', value: 29, color: '#47c7b2', count: '29%' },
  { label: 'Tablet', value: 13, color: '#f5ae5c', count: '13%' },
];

export default function DeviceChart() {
  return (
    <section className="panel device-panel">
      <div className="panel-heading">
        <div>
          <div className="panel-eyebrow">Audience</div>
          <h2>Device usage</h2>
          <p>Sessions by device type</p>
        </div>
        <span className="tiny-period">Last 30 days</span>
      </div>
      <div className="device-chart-content">
        <div
          className="device-donut"
          role="img"
          aria-label="Phone 58 percent, Computer 29 percent, Tablet 13 percent"
        >
          <div className="donut-center">
            <strong>100%</strong>
            <span>sessions</span>
          </div>
        </div>
        <div className="device-legend">
          {devices.map((device) => (
            <div className="device-legend-row" key={device.label}>
              <span className="device-legend-label">
                <i style={{ backgroundColor: device.color }} />
                {device.label}
              </span>
              <strong>{device.count}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="chart-disclaimer">Illustrative device distribution</div>
    </section>
  );
}
