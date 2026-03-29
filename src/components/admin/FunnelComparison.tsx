import type { FunnelComparison as FunnelComparisonType } from '@/lib/admin/funnel-comparison';

type Props = {
  comparison: FunnelComparisonType;
};

function formatDelta(value: number | null) {
  if (value === null) return 'nuevo';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function trendColor(trend: 'up' | 'down' | 'stable') {
  if (trend === 'up') return 'text-emerald-600';
  if (trend === 'down') return 'text-rose-600';
  return 'text-slate-500';
}

function Row({
  label,
  metric,
}: {
  label: string;
  metric: FunnelComparisonType[keyof FunnelComparisonType];
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">
          {metric.previous} → {metric.current}
        </p>
      </div>

      <p className={`text-sm font-semibold ${trendColor(metric.trend)}`}>
        {formatDelta(metric.diffPercent)}
      </p>
    </div>
  );
}

export default function FunnelComparison({ comparison }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        Evolución del funnel
      </h3>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Row label="Vistas" metric={comparison.views} />
        <Row label="Carrito" metric={comparison.addToCart} />
        <Row label="Checkout" metric={comparison.checkout} />
        <Row label="WhatsApp" metric={comparison.whatsapp} />
        <Row label="Contactos" metric={comparison.contactWhatsapp} />
        <Row label="Ventas" metric={comparison.purchases} />
      </div>
    </section>
  );
}