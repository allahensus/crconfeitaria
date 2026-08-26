import { headers } from 'next/headers';
import { cache } from 'react';
import { prisma } from './prisma';

export const getCurrentOrganization = cache(async () => {
  const headerList = await headers();
  const subdomain = headerList.get('x-tenant-subdomain');
  if (!subdomain) return null;

  return prisma.organization.findUnique({ where: { subdomain } });
});
