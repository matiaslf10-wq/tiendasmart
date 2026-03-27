type SummaryTone = 'neutral' | 'success' | 'warning';

type SummaryItem = {
  title: string;
  description: string;
  tone: SummaryTone;
};

type ExecutiveSummaryProps = {
  items: SummaryItem[];
};

function getToneClasses(tone: SummaryTone) {
  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50';
  }

  if (tone === 'warning') {
    return 'border-amber-200 bg-amber-50';
  }

  return 'border-slate-200 bg-slate-50';
}

function getTitleClasses(tone: SummaryTone) {
  if (tone === 'success') {
    return 'text-emerald-950';
  }

  if (tone === 'warning') {
    return 'text-amber-950';
  }

  return 'text-slate-900';
}

function getBodyClasses(tone: SummaryTone) {
  if (tone === 'success') {
    return 'text-emerald-900';
  }

  if (tone === 'warning') {
    return 'text-amber-900';
  }

  return 'text-slate-600';
}

export type ExecutiveSummaryItem = SummaryItem;

export default function ExecutiveSummary({
  items,
}: ExecutiveSummaryProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">
          Resumen ejecutivo
        </h2>
        <p className="text-sm text-slate-500">
          Lectura rápida del rendimiento comercial del período.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((item) => (
          <div
            key={`${item.title}-${item.description}`}
            className={`rounded-2xl border p-4 ${getToneClasses(item.tone)}`}
          >
            <p className={`text-sm font-semibold ${getTitleClasses(item.tone)}`}>
              {item.title}
            </p>
            <p className={`mt-2 text-sm ${getBodyClasses(item.tone)}`}>
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}