import type { Metadata } from 'next';

// Scoped to /admin only -- the PWA manifest's start_url/scope are both
// /admin, and installing "the app" only makes sense for the confeiteira's
// own management panel, not for customers browsing the public storefront.
export const metadata: Metadata = {
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Confeitaria Admin',
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
