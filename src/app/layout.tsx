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

const DEFAULT_ADDRESS = 'São Paulo - SP';

export async function generateMetadata(): Promise<Metadata> {
  const organization = await getCurrentOrganization();

  let bakeryName = DEFAULT_BAKERY_NAME;
  let address = DEFAULT_ADDRESS;
  if (organization) {
    const db = getScopedPrisma(organization.id);
    const settings = await db.setting.findMany({
      where: { key: { in: ['bakery_name', 'address'] } },
    });
    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    bakeryName = settingsMap.bakery_name || DEFAULT_BAKERY_NAME;
    address = settingsMap.address || DEFAULT_ADDRESS;
  }

  const shortTitle = `${bakeryName} - Confeitaria Artesanal`;
  const socialDescription = `Bolos e biscoitos personalizados sob encomenda em ${address}.`;

  return {
    metadataBase: new URL(siteUrl),
    title: `${shortTitle} | Bolos e Biscoitos Personalizados`,
    description: 'Bolos artesanais, Bentô Cakes, biscoitos amanteigados e doces para tornar seus momentos inesquecíveis. Solicite seu orçamento online!',
    keywords: ['confeitaria artesanal', 'bento cake', 'bolos personalizados', 'biscoitos amanteigados', bakeryName],
    openGraph: {
      title: shortTitle,
      description: socialDescription,
      images: ['/cinthia/WhatsApp Image 2026-08-20 at 17.59.33.jpeg'],
      url: siteUrl,
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: shortTitle,
      description: socialDescription,
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
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] antialiased selection:bg-[var(--color-border)] selection:text-[var(--color-heading)]">
        {children}
      </body>
    </html>
  );
}
