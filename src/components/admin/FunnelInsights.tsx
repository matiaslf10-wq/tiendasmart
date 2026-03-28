import type { FunnelInsight } from '@/lib/admin/insights';

type Props = {
  insights: FunnelInsight[];
};

function toneClasses(tone: FunnelInsight['tone']) {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'danger':
      return 'border-rose-200 bg-rose-50 text-rose-900';
    case 'info':
    default:
      return 'border-slate-200 bg-slate-50 text-slate-900';
  }
}

function toneBadge(tone: FunnelInsight['tone']) {
  switch (tone) {
    case 'success':
      return 'Bueno';
    case 'warning':
      return 'Atención';
    case 'danger':
      return 'Crítico';
    case 'info':
    default:
      return 'Info';
  }
}

export default function FunnelInsights({ insights }: Props) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Insights automáticos
        </h3>
        <p className="text-sm text-slate-600">
          Lectura automática del funnel propio de TiendaSmart.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((insight) => (
          <article
            key={insight.id}
            className={`rounded-2xl border p-4 ${toneClasses(insight.tone)}`}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold">{insight.title}</h4>
              <span className="rounded-full border border-current/20 px-2.5 py-1 text-xs font-medium">
                {toneBadge(insight.tone)}
              </span>
            </div>

            <p className="text-sm leading-6 opacity-90">{insight.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}