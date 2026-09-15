import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mana Grameena | Authentic Homemade Herbal Essentials',
  description:
    'Experience the pure healing wisdom of rural heritage. Handcrafted homemade herbal oils, powders, and natural wellness essentials sourced with devotion.',
  keywords: [
    'Mana Grameena',
    'homemade herbal products',
    'ayurvedic oils',
    'natural skincare',
    'organic wellness',
    'rural Indian herbs',
  ],
  authors: [{ name: 'Mana Grameena' }],
  metadataBase: new URL('https://managrameena.com'),
  openGraph: {
    title: 'Mana Grameena | Authentic Homemade Herbal Essentials',
    description:
      'Handcrafted homemade herbal products made from pure natural ingredients.',
    url: 'https://managrameena.com',
    siteName: 'Mana Grameena',
    locale: 'en_IN',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen flex flex-col font-sans bg-cream-100 text-herbal-950">
        {children}
      </body>
    </html>
  );
}
