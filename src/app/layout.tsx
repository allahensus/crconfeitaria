import './globals.css';
import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { getCurrentOrganization } from '@/lib/tenant';
import { getScopedPrisma } from '@/lib/db';

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

// TODO: update if/when a custom domain replaces the default *.vercel.app one.
const siteUrl = 'https://crconfeitaria.vercel.app';
const DEFAULT_BAKERY_NAME = 'Cinthia Rodrigues';

export async function generateMetadata(): Promise<Metadata> {
  const organization = await getCurrentOrganization();

  let bakeryName = DEFAULT_BAKERY_NAME;
  if (organization) {
    const db = getScopedPrisma(organization.id);
    const setting = await db.setting.findUnique({
      where: { organizationId_key: { organizationId: organization.id, key: 'bakery_name' } },
    });
    bakeryName = setting?.value || DEFAULT_BAKERY_NAME;
  }

  const shortTitle = `${bakeryName} - Confeitaria Artesanal`;

  return {
    metadataBase: new URL(siteUrl),
    title: `${shortTitle} | Bolos e Biscoitos Personalizados`,
    description: 'Bolos artesanais, Bentô Cakes, biscoitos amanteigados e doces para tornar seus momentos inesquecíveis. Solicite seu orçamento online!',
    keywords: ['confeitaria artesanal', 'bento cake', 'bolos personalizados', 'biscoitos amanteigados', bakeryName],
    openGraph: {
      title: shortTitle,
      description: 'Bolos e biscoitos personalizados sob encomenda em São Paulo.',
      images: ['/cinthia/WhatsApp Image 2026-08-20 at 17.59.33.jpeg'],
      url: siteUrl,
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: shortTitle,
      description: 'Bolos e biscoitos personalizados sob encomenda em São Paulo.',
      images: ['/cinthia/WhatsApp Image 2026-08-20 at 17.59.33.jpeg'],
    },
  };
}

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
