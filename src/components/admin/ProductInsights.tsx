import type { ProductInsight } from '@/lib/admin/product-insights';

type Props = {
  insights: ProductInsight[];
};

function toneClasses(tone: ProductInsight['tone']) {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-950';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-950';
    case 'danger':
      return 'border-rose-200 bg-rose-50 text-rose-950';
    case 'info':
    default:
      return 'border-slate-200 bg-slate-50 text-slate-900';
  }
}

function toneLabel(tone: ProductInsight['tone']) {
  switch (tone) {
    case 'success':
      return 'Oportunidad positiva';
    case 'warning':
      return 'Atención';
    case 'danger':
      return 'Crítico';
    case 'info':
    default:
      return 'Info';
  }
}

function MetricPill({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <span className="rounded-full border border-current/15 px-2.5 py-1 text-xs font-medium">
      {label}: {value}
    </span>
  );
}

export default function ProductInsights({ insights }: Props) {
  if (insights.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Insights por producto
        </h3>
        <p className="text-sm text-slate-600">
          Detección automática de productos con oportunidad de mejora o buen desempeño.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {insights.map((insight) => (
          <article
            key={insight.id}
            className={`rounded-2xl border p-4 ${toneClasses(insight.tone)}`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{insight.productName}</p>
                <p className="mt-1 text-xs opacity-80">{insight.title}</p>
              </div>

              <span className="rounded-full border border-current/20 px-2.5 py-1 text-xs font-medium">
                {toneLabel(insight.tone)}
              </span>
            </div>

            <p className="text-sm leading-6">{insight.description}</p>

            <p className="mt-3 text-sm">
              <span className="font-semibold">Qué hacer:</span>{' '}
              {insight.recommendation}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <MetricPill label="Views" value={insight.views} />
              <MetricPill label="Carrito" value={insight.addToCart} />
              <MetricPill label="WhatsApp" value={insight.contactWhatsapp} />
              <MetricPill label="Ventas" value={insight.purchases} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}