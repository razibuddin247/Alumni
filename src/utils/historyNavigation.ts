import type { PortalTab } from '../types/portal';

export const VALID_PORTAL_TABS: readonly PortalTab[] = [
  'credential',
  'profile',
  'directory',
  'jobs',
  'community',
  'funds',
  'gallery',
  'admin',
];

export function isValidPortalTab(value: string | null | undefined): value is PortalTab {
  if (!value) return false;
  return (VALID_PORTAL_TABS as readonly string[]).includes(value);
}

export function readTabFromSearch(search: string): PortalTab {
  const params = new URLSearchParams(search);
  const raw = params.get('tab');
  return isValidPortalTab(raw) ? raw : 'credential';
}

export function readSectionFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const raw = params.get('section');
  return raw ? raw : null;
}

export function readSharedMemberFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const raw = params.get('member');
  return raw ? raw : null;
}

export function buildPortalUrl(
  currentHref: string,
  opts: {
    tab?: PortalTab;
    section?: string | null;
    memberId?: string | null;
  }
): string {
  const url = new URL(currentHref);

  if (opts.tab !== undefined) {
    if (opts.tab === 'credential') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', opts.tab);
    }
  }

  if (opts.section !== undefined) {
    if (opts.section) {
      url.searchParams.set('section', opts.section);
    } else {
      url.searchParams.delete('section');
    }
  }

  if (opts.memberId !== undefined) {
    if (opts.memberId) {
      url.searchParams.set('member', opts.memberId);
    } else {
      url.searchParams.delete('member');
    }
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
