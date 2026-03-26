type ConversionData = {
  viewToCart: number;
  cartToCheckout: number;
  checkoutToWhatsapp: number;
  whatsappToPurchase: number;
};

type Ga4ChartsProps = {
  ga4Data: {
    viewItemEvents: number;
    addToCartEvents: number;
    beginCheckoutEvents: number;
    sendToWhatsAppEvents: number;
    purchaseEvents: number;
    sessions: number;
    activeUsers: number;
    screenPageViews: number;
  };
  conversion: ConversionData;
};

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function getSafePercent(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(value, 100);
}

function BarRow({
  label,
  value,
  maxValue,
}: {
  label: string;
  value: number;
  maxValue: number;
}) {
  const width = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{value}</p>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-900 transition-all"
          style={{ width: `${getSafePercent(width)}%` }}
        />
      </div>
    </div>
  );
}

function PercentBarRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-sm font-semibold text-slate-900">
          {formatPercent(value)}
        </p>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${getSafePercent(value)}%` }}
        />
      </div>
    </div>
  );
}

export default function Ga4Charts({ ga4Data, conversion }: Ga4ChartsProps) {
  const funnelMax = Math.max(
    ga4Data.viewItemEvents,
    ga4Data.addToCartEvents,
    ga4Data.beginCheckoutEvents,
    ga4Data.sendToWhatsAppEvents,
    ga4Data.purchaseEvents,
    1
  );

  const trafficMax = Math.max(
    ga4Data.activeUsers,
    ga4Data.sessions,
    ga4Data.screenPageViews,
    1
  );

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-slate-900">
            Gráfico de embudo
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Comparación visual del volumen en cada etapa del recorrido de compra.
          </p>
        </div>

        <div className="space-y-4">
          <BarRow
            label="Views"
            value={ga4Data.viewItemEvents}
            maxValue={funnelMax}
          />
          <BarRow
            label="Add to cart"
            value={ga4Data.addToCartEvents}
            maxValue={funnelMax}
          />
          <BarRow
            label="Checkout"
            value={ga4Data.beginCheckoutEvents}
            maxValue={funnelMax}
          />
          <BarRow
            label="WhatsApp"
            value={ga4Data.sendToWhatsAppEvents}
            maxValue={funnelMax}
          />
          <BarRow
            label="Purchase"
            value={ga4Data.purchaseEvents}
            maxValue={funnelMax}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-slate-900">
            Tasas de conversión
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Porcentaje de avance entre cada etapa del embudo.
          </p>
        </div>

        <div className="space-y-4">
          <PercentBarRow
            label="View → Add to cart"
            value={conversion.viewToCart}
          />
          <PercentBarRow
            label="Cart → Checkout"
            value={conversion.cartToCheckout}
          />
          <PercentBarRow
            label="Checkout → WhatsApp"
            value={conversion.checkoutToWhatsapp}
          />
          <PercentBarRow
            label="WhatsApp → Purchase"
            value={conversion.whatsappToPurchase}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-slate-900">
            Tráfico general
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Relación entre usuarios activos, sesiones y vistas totales.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <BarRow
            label="Usuarios activos"
            value={ga4Data.activeUsers}
            maxValue={trafficMax}
          />
          <BarRow
            label="Sesiones"
            value={ga4Data.sessions}
            maxValue={trafficMax}
          />
          <BarRow
            label="Views"
            value={ga4Data.screenPageViews}
            maxValue={trafficMax}
          />
        </div>
      </section>
    </div>
  );
}