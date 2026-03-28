type FunnelSectionProps = {
  data: {
    views: number;
    addToCart: number;
    checkout: number;
    whatsapp: number;
    orders: number;
  };
  conversion: {
    viewToCart: number;
    cartToCheckout: number;
    checkoutToWhatsapp: number;
    whatsappToOrder: number;
    totalConversion: number;
  };
};

function Step({
  label,
  value,
  percent,
}: {
  label: string;
  value: number;
  percent?: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>

      {percent !== undefined && (
        <p className="mt-1 text-xs text-slate-400">
          {percent.toFixed(1)}%
        </p>
      )}
    </div>
  );
}

export default function FunnelSection({ data, conversion }: FunnelSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        Funnel de conversión (propio)
      </h3>

      <div className="grid gap-4 text-center sm:grid-cols-2 xl:grid-cols-5">
        <Step label="Views" value={data.views} />
        <Step
          label="Add to Cart"
          value={data.addToCart}
          percent={conversion.viewToCart}
        />
        <Step
          label="Checkout"
          value={data.checkout}
          percent={conversion.cartToCheckout}
        />
        <Step
          label="WhatsApp"
          value={data.whatsapp}
          percent={conversion.checkoutToWhatsapp}
        />
        <Step
          label="Pedidos"
          value={data.orders}
          percent={conversion.whatsappToOrder}
        />
      </div>

      <div className="mt-4 text-center text-sm text-slate-600">
        Conversión total:{' '}
        <span className="font-semibold">
          {conversion.totalConversion.toFixed(2)}%
        </span>
      </div>
    </section>
  );
}