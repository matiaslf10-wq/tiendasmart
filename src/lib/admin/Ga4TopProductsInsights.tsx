// components/admin/Ga4TopProductsInsights.tsx
import type { TopProductInsightRow } from '@/lib/admin/top-products';

type Props = {
  rows: TopProductInsightRow[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function toneClasses(tone: TopProductInsightRow['tone']) {
  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  if (tone === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export default function Ga4TopProductsInsights({ rows }: Props) {
  if (!rows.length) {
    return (
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Top productos e insights
          </h2>
          <p className="text-sm text-gray-600">
            Todavía no hay datos suficientes para armar recomendaciones.
          </p>
        </div>
      </section>
    );
  }

  const winners = rows.filter((row) => row.tone === 'success').slice(0, 2);
  const risks = rows.filter((row) => row.tone === 'warning').slice(0, 2);

  return (
    <section className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Top productos e insights
        </h2>
        <p className="text-sm text-gray-600">
          Mezcla señales de GA4 (vistas y carrito) con ventas reales de la
          tienda.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-emerald-900">
            Oportunidades para empujar
          </h3>
          <div className="space-y-2">
            {winners.length ? (
              winners.map((row) => (
                <div key={`win-${row.itemId || row.itemName}`}>
                  <p className="text-sm font-medium text-emerald-950">
                    {row.itemName}
                  </p>
                  <p className="text-sm text-emerald-800">{row.insightText}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-emerald-800">
                Aún no aparecen productos con señal fuerte.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-amber-900">
            Alertas para revisar
          </h3>
          <div className="space-y-2">
            {risks.length ? (
              risks.map((row) => (
                <div key={`risk-${row.itemId || row.itemName}`}>
                  <p className="text-sm font-medium text-amber-950">
                    {row.itemName}
                  </p>
                  <p className="text-sm text-amber-800">{row.insightText}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-amber-800">
                No hay alertas fuertes en este período.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-3 pr-4">Producto</th>
              <th className="py-3 pr-4">Vistas</th>
              <th className="py-3 pr-4">Carritos</th>
              <th className="py-3 pr-4">Vendidos</th>
              <th className="py-3 pr-4">Ingresos</th>
              <th className="py-3 pr-4">Vista → carrito</th>
              <th className="py-3 pr-4">Carrito → venta</th>
              <th className="py-3">Insight</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.itemId}-${row.itemName}`}
                className="border-b align-top last:border-b-0"
              >
                <td className="py-3 pr-4">
                  <div className="font-medium text-gray-900">{row.itemName}</div>
                  {row.itemId ? (
                    <div className="text-xs text-gray-500">{row.itemId}</div>
                  ) : null}
                </td>
                <td className="py-3 pr-4 text-gray-700">{row.views}</td>
                <td className="py-3 pr-4 text-gray-700">{row.addToCartEvents}</td>
                <td className="py-3 pr-4 text-gray-700">{row.purchasedUnits}</td>
                <td className="py-3 pr-4 text-gray-700">
                  {formatCurrency(row.revenue)}
                </td>
                <td className="py-3 pr-4 text-gray-700">
                  {formatPercent(row.viewToCartRate)}
                </td>
                <td className="py-3 pr-4 text-gray-700">
                  {formatPercent(row.cartToPurchaseRate)}
                </td>
                <td className="py-3">
                  <div
                    className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${toneClasses(
                      row.tone
                    )}`}
                  >
                    {row.insightTitle}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{row.insightText}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}