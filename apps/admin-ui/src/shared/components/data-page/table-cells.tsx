import { ImageIcon } from 'lucide-react';

export function StatusBadge({ value }: { value: string }) {
  const tone = value.toLowerCase().replaceAll(' ', '-');
  return <span className={`status-badge status-${tone}`}>{value}</span>;
}

export function DateCell({ value }: { value: string }) {
  const parsed = Date.parse(value);
  return (
    <span className="date-cell">
      {Number.isNaN(parsed)
        ? '—'
        : new Date(parsed).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
    </span>
  );
}

export function CurrencyCell({ value }: { value: number }) {
  return (
    <span className="currency-cell">
      {new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(value)}
    </span>
  );
}

export function ProductImage({ src, name }: { src: string; name: string }) {
  return src ? (
    // Product images may be hosted by third-party sellers.
    <img className="product-thumbnail" src={src} alt="" />
  ) : (
    <span className="product-thumbnail product-thumbnail-placeholder" aria-label={`${name} image`}>
      <ImageIcon size={17} />
    </span>
  );
}
