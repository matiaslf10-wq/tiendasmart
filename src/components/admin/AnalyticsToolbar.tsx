type AnalyticsToolbarProps = {
  range: 'today' | '7d' | '30d' | 'month' | 'all';
  powerBiUrl?: string | null;
};

export default function AnalyticsToolbar({
  range,
  powerBiUrl,
}: AnalyticsToolbarProps) {
  const exportUrl = `/api/admin/export/analytics?range=${range}`;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          Exportación y BI
        </h2>
        <p className="text-sm text-neutral-600">
          Descargá el reporte en Excel o abrí el dashboard externo.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={exportUrl}
          className="inline-flex items-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Descargar Excel directo
        </a>

        {powerBiUrl ? (
          <a
            href={powerBiUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
          >
            Abrir en Power BI
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center rounded-xl border border-black/10 bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-400"
          >
            Abrir en Power BI
          </button>
        )}
      </div>
    </div>
  );
}