import type {
  ComparisonMetric,
  OrdersPeriodComparison as OrdersPeriodComparisonType,
} from '@/lib/admin/orders';

type OrdersPeriodComparisonProps = {
  comparison: OrdersPeriodComparisonType | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-AR').format(value);
}

function formatPercent(value: number | null) {
  if (value === null) return 'Nuevo';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function getTrendSymbol(trend: ComparisonMetric['trend']) {
  if (trend === 'up') return '↗';
  if (trend === 'down') return '↘';
  return '→';
}

function getTrendClasses(trend: ComparisonMetric['trend']) {
  if (trend === 'up') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  if (trend === 'down') {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }

  return 'bg-slate-50 text-slate-700 border-slate-200';
}

type ComparisonCardProps = {
  title: string;
  metric: ComparisonMetric;
  valueFormatter?: (value: number) => string;
};

function ComparisonCard({
  title,
  metric,
  valueFormatter = formatNumber,
}: ComparisonCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {valueFormatter(metric.current)}
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${getTrendClasses(metric.trend)}`}
        >
          <span aria-hidden="true">{getTrendSymbol(metric.trend)}</span>
          {formatPercent(metric.diffPercent)}
        </span>
      </div>

      <div className="mt-4 space-y-1 text-sm text-slate-600">
        <p>
          Actual:{' '}
          <span className="font-medium text-slate-900">
            {valueFormatter(metric.current)}
          </span>
        </p>
        <p>
          Anterior:{' '}
          <span className="font-medium text-slate-900">
            {valueFormatter(metric.previous)}
          </span>
        </p>
        <p>
          Diferencia:{' '}
          <span className="font-medium text-slate-900">
            {metric.diff > 0 ? '+' : ''}
            {valueFormatter(metric.diff)}
          </span>
        </p>
      </div>
    </div>
  );
}

export default function OrdersPeriodComparison({
  comparison,
}: OrdersPeriodComparisonProps) {
  if (!comparison) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">
            Comparación de períodos
          </h2>
          <p className="text-sm text-slate-500">
            No disponible para el rango seleccionado.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">
          Comparación de períodos
        </h2>
        <p className="text-sm text-slate-500">
          Rendimiento del período actual frente al inmediatamente anterior.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ComparisonCard
          title="Facturación"
          metric={comparison.revenue}
          valueFormatter={formatCurrency}
        />
        <ComparisonCard title="Pedidos" metric={comparison.orders} />
        <ComparisonCard
          title="Ticket promedio"
          metric={comparison.averageTicket}
          valueFormatter={formatCurrency}
        />
        <ComparisonCard
          title="Unidades vendidas"
          metric={comparison.unitsSold}
        />
      </div>
    </section>
  );
}