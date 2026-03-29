import type { ProductAlert } from '@/lib/admin/product-alerts';

type Props = {
  alerts: ProductAlert[];
};

function toneClasses(tone: ProductAlert['tone']) {
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

function toneLabel(tone: ProductAlert['tone']) {
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

function Pill({
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

export default function ProductAlerts({ alerts }: Props) {
  if (!alerts.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Alertas automáticas por producto
        </h3>
        <p className="text-sm text-slate-600">
          Señales detectadas automáticamente sobre productos con riesgo o buen rendimiento.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {alerts.map((alert) => (
          <article
            key={alert.id}
            className={`rounded-2xl border p-4 ${toneClasses(alert.tone)}`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{alert.productName}</p>
                <p className="mt-1 text-xs opacity-80">{alert.title}</p>
              </div>

              <span className="rounded-full border border-current/20 px-2.5 py-1 text-xs font-medium">
                {toneLabel(alert.tone)}
              </span>
            </div>

            <p className="text-sm leading-6">{alert.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill label="Views" value={alert.views} />
              <Pill label="Carrito" value={alert.addToCart} />
              <Pill label="WhatsApp" value={alert.contactWhatsapp} />
              <Pill label="Ventas" value={alert.purchases} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}