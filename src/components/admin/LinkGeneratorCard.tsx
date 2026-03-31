'use client';

import { useMemo, useState } from 'react';

type Props = {
  baseUrl: string;
};

export default function LinkGeneratorCard({ baseUrl }: Props) {
  const [tsLink, setTsLink] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');

  const generatedUrl = useMemo(() => {
    const url = new URL(baseUrl);

    if (tsLink.trim()) {
      url.searchParams.set('ts_link', tsLink.trim());
    }

    if (utmSource.trim()) {
      url.searchParams.set('utm_source', utmSource.trim());
    }

    if (utmMedium.trim()) {
      url.searchParams.set('utm_medium', utmMedium.trim());
    }

    if (utmCampaign.trim()) {
      url.searchParams.set('utm_campaign', utmCampaign.trim());
    }

    return url.toString();
  }, [baseUrl, tsLink, utmSource, utmMedium, utmCampaign]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generatedUrl);
    } catch {
      // noop
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Generador de links de marketing
        </h3>
        <p className="text-sm text-slate-600">
          Creá un link personalizado para medir campañas, historias, flyers o QR.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">ts_link</span>
          <input
            type="text"
            value={tsLink}
            onChange={(e) => setTsLink(e.target.value)}
            placeholder="ej: instagram_story_mayo"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">utm_source</span>
          <input
            type="text"
            value={utmSource}
            onChange={(e) => setUtmSource(e.target.value)}
            placeholder="ej: instagram"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">utm_medium</span>
          <input
            type="text"
            value={utmMedium}
            onChange={(e) => setUtmMedium(e.target.value)}
            placeholder="ej: social"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">utm_campaign</span>
          <input
            type="text"
            value={utmCampaign}
            onChange={(e) => setUtmCampaign(e.target.value)}
            placeholder="ej: hot_sale"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
          />
        </label>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          Link generado
        </p>
        <code className="block break-all text-sm text-slate-900">
          {generatedUrl}
        </code>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          Copiar link
        </button>
      </div>
    </section>
  );
}