import CopyToClipboardButton from '@/components/admin/CopyToClipboardButton';

type SourceLinkRow = {
  label: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign?: string;
  tsLink: string;
  url: string;
};

type Props = {
  links: SourceLinkRow[];
};

export default function SourceLinksCard({ links }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Links listos para compartir
        </h3>
        <p className="text-sm text-slate-600">
          Usalos en bio, QR, flyers o campañas para medir automáticamente el origen del tráfico.
        </p>
      </div>

      <div className="space-y-4">
        {links.map((link) => (
          <div
            key={link.tsLink}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {link.label}
                </p>
                <p className="text-xs text-slate-500">
                  {link.utmSource} / {link.utmMedium} / {link.utmCampaign ?? '—'}
                </p>
              </div>

              <CopyToClipboardButton value={link.url} />
            </div>

            <code className="block break-all text-xs text-slate-700">
              {link.url}
            </code>
          </div>
        ))}
      </div>
    </section>
  );
}