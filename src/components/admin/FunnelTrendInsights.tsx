import type { FunnelTrendInsight } from '@/lib/admin/funnel-trend-insights';

type Props = {
  insights: FunnelTrendInsight[];
};

function toneClasses(tone: FunnelTrendInsight['tone']) {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-950';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-950';
    case 'info':
    default:
      return 'border-slate-200 bg-slate-50 text-slate-900';
  }
}

function toneLabel(tone: FunnelTrendInsight['tone']) {
  switch (tone) {
    case 'success':
      return 'Positivo';
    case 'warning':
      return 'Atención';
    case 'info':
    default:
      return 'Info';
  }
}

export default function FunnelTrendInsights({ insights }: Props) {
  if (!insights.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Insights de tendencia
        </h3>
        <p className="text-sm text-slate-600">
          Lectura automática de la evolución reciente del funnel propio.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {insights.map((insight) => (
          <article
            key={insight.id}
            className={`rounded-2xl border p-4 ${toneClasses(insight.tone)}`}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <h4 className="text-sm font-semibold">{insight.title}</h4>
              <span className="rounded-full border border-current/20 px-2.5 py-1 text-xs font-medium">
                {toneLabel(insight.tone)}
              </span>
            </div>

            <p className="text-sm leading-6">{insight.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}