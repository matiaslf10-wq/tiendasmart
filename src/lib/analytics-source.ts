const STORAGE_KEY_PREFIX = 'tiendasmart_attribution_';

export type AttributionData = {
  source: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
  landingPath?: string;
};

function getStorageKey(storeSlug: string) {
  return `${STORAGE_KEY_PREFIX}${storeSlug}`;
}

function normalizeSourceFromReferrer(referrer: string) {
  const value = referrer.toLowerCase();

  if (value.includes('instagram.com')) return 'instagram';
  if (value.includes('facebook.com') || value.includes('fb.com')) return 'facebook';
  if (value.includes('tiktok.com')) return 'tiktok';
  if (value.includes('wa.me') || value.includes('whatsapp.com')) return 'whatsapp';
  if (value.includes('google.')) return 'google';
  if (value.includes('youtube.com')) return 'youtube';
  return 'referral';
}

export function getAttributionFromBrowser(): AttributionData {
  if (typeof window === 'undefined') {
    return { source: 'direct' };
  }

  const url = new URL(window.location.href);
  const utmSource = url.searchParams.get('utm_source')?.trim();
  const utmMedium = url.searchParams.get('utm_medium')?.trim();
  const utmCampaign = url.searchParams.get('utm_campaign')?.trim();
  const referrer = document.referrer?.trim();

  if (utmSource) {
    return {
      source: utmSource,
      medium: utmMedium ?? undefined,
      campaign: utmCampaign ?? undefined,
      referrer: referrer || undefined,
      landingPath: `${url.pathname}${url.search}`,
    };
  }

  if (referrer) {
    return {
      source: normalizeSourceFromReferrer(referrer),
      medium: 'referral',
      referrer,
      landingPath: `${url.pathname}${url.search}`,
    };
  }

  return {
    source: 'direct',
    medium: 'none',
    landingPath: `${url.pathname}${url.search}`,
  };
}

export function persistAttribution(storeSlug: string) {
  if (typeof window === 'undefined') return;

  try {
    const current = getAttributionFromBrowser();
    const storageKey = getStorageKey(storeSlug);
    const existingRaw = sessionStorage.getItem(storageKey);

    if (!existingRaw) {
      sessionStorage.setItem(storageKey, JSON.stringify(current));
      return;
    }

    const existing = JSON.parse(existingRaw) as AttributionData;

    const shouldReplace =
      current.source !== 'direct' ||
      current.medium !== 'none' ||
      Boolean(current.campaign);

    if (shouldReplace) {
      sessionStorage.setItem(storageKey, JSON.stringify(current));
      return;
    }

    sessionStorage.setItem(storageKey, JSON.stringify(existing));
  } catch {
    // noop
  }
}

export function getStoredAttribution(storeSlug: string): AttributionData {
  if (typeof window === 'undefined') {
    return { source: 'direct' };
  }

  try {
    const storageKey = getStorageKey(storeSlug);
    const raw = sessionStorage.getItem(storageKey);

    if (raw) {
      return JSON.parse(raw) as AttributionData;
    }
  } catch {
    // noop
  }

  const current = getAttributionFromBrowser();

  try {
    sessionStorage.setItem(getStorageKey(storeSlug), JSON.stringify(current));
  } catch {
    // noop
  }

  return current;
}