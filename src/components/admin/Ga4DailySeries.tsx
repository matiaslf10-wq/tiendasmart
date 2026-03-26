import type { Ga4DailyPoint } from '@/lib/ga4';

type Ga4DailySeriesProps = {
  points: Ga4DailyPoint[];
};

function shortDate(value: string) {
  if (value.length !== 8) return value;
  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);
  return `${day}/${month}`;
}

function SimpleBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const width = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xs font-semibold text-slate-900">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-900"
          style={{ width: `${Math.min(width, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function Ga4DailySeries({ points }: Ga4DailySeriesProps) {
  if (!points.length) return null;

  const maxViews = Math.max(...points.map((p) => p.viewItemEvents), 1);
  const maxSessions = Math.max(...points.map((p) => p.sessions), 1);
  const recentPoints = points.slice(-14);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-slate-900">
          Evolución diaria
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Últimos días del período seleccionado, para ver tendencia de tráfico e interés.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-800">
            Sesiones por día
          </h4>
          {recentPoints.map((point) => (
            <SimpleBar
              key={`sessions-${point.date}`}
              label={shortDate(point.date)}
              value={point.sessions}
              max={maxSessions}
            />
          ))}
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-800">
            View item por día
          </h4>
          {recentPoints.map((point) => (
            <SimpleBar
              key={`views-${point.date}`}
              label={shortDate(point.date)}
              value={point.viewItemEvents}
              max={maxViews}
            />
          ))}
        </div>
      </div>
    </section>
  );
}