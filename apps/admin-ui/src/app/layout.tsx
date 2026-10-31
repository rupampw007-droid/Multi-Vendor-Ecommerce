import { Metadata } from 'next';
import './global.css';
import Providers from './provider';

export const metadata: Metadata = {
  title: 'Eshop Admin',
  description: 'Marketplace administration dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
