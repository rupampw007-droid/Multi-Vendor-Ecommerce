import Link from 'next/link';
import { RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import type { ReactNode } from 'react';

/* ---------- Types (exported so pages can build their own data) ---------- */

export type HeroTile = {
  vendor: string;
  product: string;
  price: string;
  href: string;
  /** Optional product photo. Falls back to a simple shape if omitted. */
  imageUrl?: string;
  tone: 'blue' | 'yellow' | 'mint';
};

export type HeroCta = { label: string; href: string };

export type HeroPerk = { icon: ReactNode; label: string };

export type HeroProps = {
  title?: string;
  description?: string;
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  perks?: HeroPerk[];
  tiles?: [HeroTile, HeroTile, HeroTile];
  className?: string;
};

/* ---------- Defaults (swap any of these via props) ---------- */

const DEFAULT_PERKS: HeroPerk[] = [
  { icon: <ShieldCheck size={18} />, label: 'Verified sellers' },
  { icon: <Truck size={18} />, label: 'One checkout, many shops' },
  { icon: <RotateCcw size={18} />, label: '7-day returns' },
];

const DEFAULT_TILES: [HeroTile, HeroTile, HeroTile] = [
  {
    vendor: 'Maple Studio',
    product: 'Hand-poured soy candle',
    price: '₹499',
    href: '/products',
    tone: 'blue',
  },
  {
    vendor: 'Northwind Tech',
    product: 'Wireless earbuds',
    price: '₹1,799',
    href: '/products',
    tone: 'yellow',
  },
  {
    vendor: 'Green Loom',
    product: 'Cotton tote bag',
    price: '₹349',
    href: '/products',
    tone: 'mint',
  },
];

const TONE_BG: Record<HeroTile['tone'], string> = {
  blue: 'bg-[#3489ff]',
  yellow: 'bg-[#ffc83d]',
  mint: 'bg-[#9fe3c8]',
};

/* ---------- Tile ---------- */

const Tile = ({
  tile,
  className = '',
  shape,
}: {
  tile: HeroTile;
  className?: string;
  shape: 'circle' | 'square' | 'pill';
}) => (
  <Link
    href={tile.href}
    className={`group relative flex flex-col overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-[#0f1b2d] ${TONE_BG[tile.tone]} ${className}`}
  >
    {/* Image area */}
    <div className="relative flex-1 min-h-[120px] flex items-center justify-center">
      {tile.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tile.imageUrl}
          alt={tile.product}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className={`bg-white/40 ${
            shape === 'circle'
              ? 'w-28 h-28 rounded-full'
              : shape === 'square'
              ? 'w-24 h-24 rounded-3xl rotate-12'
              : 'w-32 h-16 rounded-full'
          }`}
        />
      )}
    </div>

    {/* Seller label */}
    <div className="m-3 rounded-xl bg-white px-3 py-2">
      <span className="block text-[11px] text-gray-500">
        Sold by {tile.vendor}
      </span>
      <span className="block text-sm font-medium text-[#0f1b2d] truncate">
        {tile.product}
      </span>
      <span className="block text-sm font-semibold text-[#3489ff]">
        {tile.price}
      </span>
    </div>
  </Link>
);

/* ---------- Hero ---------- */

const Hero = ({
  title = 'Every shop you like, one cart to check out.',
  description = 'Browse products from independent sellers across India. Pay once, track every order in one place.',
  primaryCta = { label: 'Shop all products', href: '/products' },
  secondaryCta = { label: 'Start selling', href: '/become-a-seller' },
  perks = DEFAULT_PERKS,
  tiles = DEFAULT_TILES,
  className = '',
}: HeroProps) => {
  return (
    <section className={`w-full bg-[#eef5ff] ${className}`}>
      <div className="w-[90%] md:w-[80%] m-auto py-12 lg:py-20 grid gap-12 lg:grid-cols-2 lg:items-center">
        {/* Copy */}
        <div className="text-left">
          <h1 className="font-[family-name:var(--font-poppins)] text-4xl md:text-5xl lg:text-[3.5rem] font-semibold leading-[1.1] text-[#0f1b2d] max-w-[16ch]">
            {title}
          </h1>

          <p className="mt-5 max-w-[48ch] text-base md:text-lg leading-relaxed text-[#3b4a5f] font-[family-name:var(--font-roboto)]">
            {description}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={primaryCta.href}
              className="h-12 px-6 inline-flex items-center bg-[#3489ff] text-white font-medium outline-none focus-visible:ring-4 focus-visible:ring-[#0f1b2d]"
            >
              {primaryCta.label}
            </Link>
            <Link
              href={secondaryCta.href}
              className="h-12 px-6 inline-flex items-center border-[2.5px] border-[#3489ff] text-[#3489ff] font-medium outline-none focus-visible:ring-4 focus-visible:ring-[#0f1b2d]"
            >
              {secondaryCta.label}
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#3b4a5f]">
            {perks.map((perk) => (
              <li key={perk.label} className="flex items-center gap-2">
                <span className="text-[#3489ff]">{perk.icon}</span>
                {perk.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Seller tiles: different sizes on purpose, big one leads */}
        <div className="grid grid-cols-5 grid-rows-2 gap-4 h-[380px] md:h-[440px]">
          <Tile
            tile={tiles[0]}
            shape="circle"
            className="col-span-3 row-span-2 rounded-[2rem]"
          />
          <Tile
            tile={tiles[1]}
            shape="square"
            className="col-span-2 rounded-2xl"
          />
          <Tile
            tile={tiles[2]}
            shape="pill"
            className="col-span-2 rounded-2xl"
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;