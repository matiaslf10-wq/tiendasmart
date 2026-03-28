import FunnelInsights from '@/components/admin/FunnelInsights';
import {
  buildFunnelInsights,
  buildFunnelSummary,
  formatPercent,
} from '@/lib/admin/insights';

type Props = {
  viewItemEvents: number;
  addToCartEvents: number;
  beginCheckoutEvents: number;
  sendToWhatsAppEvents: number;
  contactWhatsAppEvents: number;
  purchaseEvents?: number;
};

type StepCardProps = {
  label: string;
  value: number;
  helper?: string;
};

function StepCard({ label, value, helper }: StepCardProps) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

export default function FunnelSection({
  viewItemEvents,
  addToCartEvents,
  beginCheckoutEvents,
  sendToWhatsAppEvents,
  contactWhatsAppEvents,
  purchaseEvents = 0,
}: Props) {
  const summary = buildFunnelSummary({
    views: viewItemEvents,
    addsToCart: addToCartEvents,
    checkout: beginCheckoutEvents,
    whatsapp: sendToWhatsAppEvents,
    contactWhatsapp: contactWhatsAppEvents,
    purchases: purchaseEvents,
  });

  const insights = buildFunnelInsights({
    views: viewItemEvents,
    addsToCart: addToCartEvents,
    checkout: beginCheckoutEvents,
    whatsapp: sendToWhatsAppEvents,
    contactWhatsapp: contactWhatsAppEvents,
    purchases: purchaseEvents,
  });

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Funnel comercial
          </h3>
          <p className="text-sm text-slate-600">
            Seguimiento del recorrido desde la vista del producto hasta el
            contacto y la posible venta.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StepCard
            label="Vistas de producto"
            value={viewItemEvents}
          />
          <StepCard
            label="Agregados al carrito"
            value={addToCartEvents}
            helper={`Conversión: ${formatPercent(summary.addRate)}`}
          />
          <StepCard
            label="Inicio de checkout"
            value={beginCheckoutEvents}
            helper={`Conversión: ${formatPercent(summary.checkoutRate)}`}
          />
          <StepCard
            label="Paso a WhatsApp"
            value={sendToWhatsAppEvents}
            helper={`Conversión: ${formatPercent(summary.whatsappRate)}`}
          />
          <StepCard
            label="Contactos directos"
            value={contactWhatsAppEvents}
            helper="Botones de consulta por WhatsApp"
          />
          <StepCard
            label="Ventas"
            value={purchaseEvents}
            helper={
              contactWhatsAppEvents > 0
                ? `Cierre desde contacto: ${formatPercent(summary.closeRateFromContact)}`
                : 'Sin contactos registrados'
            }
          />
        </div>
      </section>

      <FunnelInsights insights={insights} />
    </div>
  );
}