export type SourceLinkPreset = {
  label: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign?: string;
  tsLink: string;
};

export function buildTrackedStoreUrl(params: {
  baseUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign?: string;
  tsLink: string;
}) {
  const url = new URL(params.baseUrl);

  url.searchParams.set('utm_source', params.utmSource);
  url.searchParams.set('utm_medium', params.utmMedium);

  if (params.utmCampaign) {
    url.searchParams.set('utm_campaign', params.utmCampaign);
  }

  url.searchParams.set('ts_link', params.tsLink);

  return url.toString();
}

export function getDefaultSourceLinkPresets(storeUrl: string) {
  const presets: SourceLinkPreset[] = [
    {
      label: 'Instagram bio',
      utmSource: 'instagram',
      utmMedium: 'social',
      utmCampaign: 'bio',
      tsLink: 'instagram_bio',
    },
    {
      label: 'QR local',
      utmSource: 'qr',
      utmMedium: 'offline',
      utmCampaign: 'local',
      tsLink: 'qr_local',
    },
    {
      label: 'Flyer',
      utmSource: 'flyer',
      utmMedium: 'offline',
      utmCampaign: 'impreso',
      tsLink: 'flyer_impreso',
    },
    {
      label: 'Campaña Meta',
      utmSource: 'meta',
      utmMedium: 'paid_social',
      utmCampaign: 'campana_meta',
      tsLink: 'meta_ads',
    },
    {
      label: 'WhatsApp difusión',
      utmSource: 'whatsapp',
      utmMedium: 'message',
      utmCampaign: 'difusion',
      tsLink: 'whatsapp_difusion',
    },
  ];

  return presets.map((preset) => ({
    ...preset,
    url: buildTrackedStoreUrl({
      baseUrl: storeUrl,
      utmSource: preset.utmSource,
      utmMedium: preset.utmMedium,
      utmCampaign: preset.utmCampaign,
      tsLink: preset.tsLink,
    }),
  }));
}