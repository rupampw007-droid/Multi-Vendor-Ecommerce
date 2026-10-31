const userMarkers = [
  { x: 178, y: 110, label: 'United States', count: '2,408 users' },
  { x: 338, y: 91, label: 'United Kingdom', count: '1,184 users' },
  { x: 418, y: 130, label: 'India', count: '3,612 users' },
  { x: 535, y: 150, label: 'Singapore', count: '942 users' },
];

const sellerMarkers = [
  { x: 158, y: 126, label: 'United States', count: '148 sellers' },
  { x: 352, y: 108, label: 'United Kingdom', count: '76 sellers' },
  { x: 432, y: 143, label: 'India', count: '212 sellers' },
  { x: 550, y: 163, label: 'Singapore', count: '51 sellers' },
];

export default function DistributionMap() {
  return (
    <section className="panel map-panel">
      <div className="panel-heading">
        <div>
          <div className="panel-eyebrow">Marketplace reach</div>
          <h2>User &amp; seller distribution</h2>
          <p>Activity across regions</p>
        </div>
        <span className="live-tag"><span /> Sample analytics</span>
      </div>
      <div className="map-viewport">
        <svg
          viewBox="0 0 700 285"
          role="img"
          aria-label="Map showing user and seller counts by region"
          className="world-map-svg"
        >
          <g className="map-land">
            <path d="M56 77l25-18 37-6 28 11 22-4 19 15-6 18-21 7-6 19-24 8-10 18-19-4-7-17-15-6-4-21-19-9 5-11-15-7z" />
            <path d="M153 160l22 4 14 18-5 24-12 24-3 29-12 10-10-19 2-23-8-19 4-25-9-13z" />
            <path d="M286 74l18-14 25 4 14 12 27-4 18 11 20-2 17 9 2 14-17 8-6 14-19 2-9 14-19 2-8-14-19 4-9-13-20 1-13-14-15-2-9-14 15-6z" />
            <path d="M332 150l22-8 22 4 17 20-4 26-11 20-7 32-17 8-15-18-6-28-13-19 1-20-10-13z" />
            <path d="M411 77l29-16 35 5 18 13 27 3 12 17-17 10-26-2-16 12-29-6-18-15-17-2z" />
            <path d="M503 153l26-8 31 8 21 17-9 19-27 4-12 16-21-8-14-19-20-9z" />
            <path d="M590 199l17 3 10 11-11 8-18-6z" />
            <path d="M234 69l14-6 11 7-5 11-13-1zM262 84l12-3 8 10-11 7-11-5z" />
          </g>
          {userMarkers.map((marker) => (
            <circle
              key={`user-${marker.label}`}
              className="map-user-marker"
              cx={marker.x}
              cy={marker.y}
              r="7"
            >
              <title>{marker.label}: {marker.count}</title>
            </circle>
          ))}
          {sellerMarkers.map((marker) => (
            <circle
              key={`seller-${marker.label}`}
              className="map-seller-marker"
              cx={marker.x}
              cy={marker.y}
              r="5"
            >
              <title>{marker.label}: {marker.count}</title>
            </circle>
          ))}
        </svg>
      </div>
      <div className="map-legend" aria-label="Map legend">
        <span><i className="legend-users" /> Users</span>
        <span><i className="legend-sellers" /> Sellers</span>
        <span className="legend-hint">Hover markers for regional counts</span>
      </div>
    </section>
  );
}
