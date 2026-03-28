type PowerBiEmbedProps = {
  embedUrl?: string | null;
};

export default function PowerBiEmbed({ embedUrl }: PowerBiEmbedProps) {
  return (
    <section className="mt-6 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">
          Dashboard embebido
        </h3>
        <p className="text-sm text-neutral-600">
          Visualización integrada de Power BI dentro del panel de TiendaSmart.
        </p>
      </div>

      {embedUrl ? (
        <div className="overflow-hidden rounded-2xl border border-black/10">
          <iframe
            title="Power BI Dashboard"
            src={embedUrl}
            className="h-[720px] w-full"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-black/10 bg-neutral-50 p-8 text-sm text-neutral-500">
          Todavía no configuraste el enlace embebible de Power BI.
        </div>
      )}
    </section>
  );
}