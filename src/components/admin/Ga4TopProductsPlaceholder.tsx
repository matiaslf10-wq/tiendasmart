type Ga4TopProductsPlaceholderProps = {
  hasGa4Credentials: boolean;
  hasPropertyId: boolean;
  hasOrdersData: boolean;
  ga4Error?: string | null;
};

export default function Ga4TopProductsPlaceholder({
  hasGa4Credentials,
  hasPropertyId,
  hasOrdersData,
  ga4Error,
}: Ga4TopProductsPlaceholderProps) {
  let title = 'Top productos en preparación';
  let description =
    'Este ranking pronto combinará ventas reales con señales de comportamiento de GA4 para mostrar no solo qué más se vende, sino también qué más atrae interés.';

  if (!hasGa4Credentials || !hasPropertyId) {
    title = 'Top productos aún no disponible';
    description =
      'Para enriquecer este ranking con datos de comportamiento, necesitás completar la configuración de Google Analytics 4 en esta tienda.';
  } else if (ga4Error) {
    title = 'Top productos temporalmente limitado';
    description =
      'Por el momento mostramos la base comercial de pedidos, mientras terminamos de procesar o sincronizar las señales de navegación de GA4.';
  } else if (!hasOrdersData) {
    title = 'Todavía no hay suficientes datos de productos';
    description =
      'Cuando ingresen más pedidos o eventos de producto, este bloque va a mostrar qué artículos concentran mayor tracción comercial.';
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="max-w-3xl text-sm text-slate-600">{description}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-500">
          Próxima mejora: ranking híbrido con ventas, vistas de producto,
          agregado al carrito e intención de compra.
        </p>
      </div>
    </section>
  );
}