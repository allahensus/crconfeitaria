import './globals.css';
import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Cinthia Rodrigues - Confeitaria Artesanal | Bolos e Biscoitos Personalizados',
  description: 'Bolos artesanais, Bentô Cakes, biscoitos amanteigados e doces para tornar seus momentos inesquecíveis. Solicite seu orçamento online!',
  keywords: ['confeitaria artesanal', 'bento cake', 'bolos personalizados', 'biscoitos amanteigados', 'Cinthia Rodrigues'],
  openGraph: {
    title: 'Cinthia Rodrigues - Confeitaria Artesanal',
    description: 'Bolos e biscoitos personalizados sob encomenda em São Paulo.',
    images: ['/cinthia/WhatsApp Image 2026-08-20 at 17.59.33.jpeg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`scroll-smooth ${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-[#FAF6F4] text-[#332220] antialiased selection:bg-[#F2D7D0] selection:text-[#4A231A]">
        {children}
      </body>
    </html>
  );
}
