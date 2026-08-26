export function extractSubdomain(host: string, rootDomain: string): string | null {
  const hostname = host.split(':')[0].toLowerCase();
  const root = rootDomain.toLowerCase();

  if (hostname === root || hostname === `www.${root}`) {
    return null;
  }

  const suffix = `.${root}`;
  if (!hostname.endsWith(suffix)) {
    return null;
  }

  const subdomain = hostname.slice(0, -suffix.length);
  if (!subdomain || subdomain.includes('.')) {
    return null;
  }

  return subdomain;
}
