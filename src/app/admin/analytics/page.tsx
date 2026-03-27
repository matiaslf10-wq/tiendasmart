import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import ExecutiveSummary, {
  type ExecutiveSummaryItem,
} from '@/components/admin/ExecutiveSummary';
import ExportOrdersButton from '@/components/admin/ExportOrdersButton';
import ExportOrdersDetailedButton from '@/components/admin/ExportOrdersDetailedButton';
import Ga4Charts from '@/components/admin/Ga4Charts';
import Ga4DailySeries from '@/components/admin/Ga4DailySeries';
import Ga4TopProductsInsights from '@/components/admin/Ga4TopProductsInsights';
import Ga4TopProductsPlaceholder from '@/components/admin/Ga4TopProductsPlaceholder';
import OrdersAnalyticsSection from '@/components/admin/OrdersAnalyticsSection';
import OrdersRangeTabs from '@/components/admin/OrdersRangeTabs';
import {
  filterOrderItemsByRange,
  filterOrders,
  getOrdersComparison,
  type Order,
  type OrderItemRow,
  type OrdersPeriodComparison,
  type RangeValue,
} from '@/lib/admin/orders';
import {
  getTopProductsInsights,
  type TopProductInsightRow,
} from '@/lib/admin/top-products';
import { getGa4DailySeries, getGa4Overview } from '@/lib/ga4';
import { hasFeature } from '@/lib/plans';
import { getCurrentUserStore } from '@/lib/stores';
import { createClient } from '@/lib/supabase/server';
import {
  ensureAnalyticsApiKey,
  regenerateAnalyticsApiKeyAction,
} from './actions';

type PageProps = {
  searchParams: Promise<{
    range?: RangeValue;
  }>;
};

type Insight = {
  title: string;
  description: string;
  tone: 'neutral' | 'warning' | 'success';
};

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatDelta(value: number | null) {
  if (value === null) return 'nuevo';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function buildInsights(params: {
  ga4Data: Awaited<ReturnType<typeof getGa4Overview>>;
  conversion: {
    viewToCart: number;
    cartToCheckout: number;
    checkoutToWhatsapp: number;
    whatsappToPurchase: number;
  };
}): Insight[] {
  const { ga4Data, conversion } = params;
  const insights: Insight[] = [];

  if (ga4Data.viewItemEvents >= 20 && conversion.viewToCart < 8) {
    insights.push({
      title: 'Mucho interés, poco agregado al carrito',
      description:
        'Los productos reciben vistas, pero pocas personas los agregan al carrito. Conviene revisar precio, fotos, descripción y claridad del stock.',
      tone: 'warning',
    });
  }

  if (ga4Data.addToCartEvents >= 10 && conversion.cartToCheckout < 40) {
    insights.push({
      title: 'Caída entre carrito y checkout',
      description:
        'La gente agrega productos, pero una parte importante no inicia checkout. Puede ayudar simplificar el proceso, mostrar costos antes y reforzar confianza.',
      tone: 'warning',
    });
  }

  if (
    ga4Data.beginCheckoutEvents >= 10 &&
    conversion.checkoutToWhatsapp < 60
  ) {
    insights.push({
      title: 'Checkout con baja derivación a WhatsApp',
      description:
        'Hay intención de compra, pero no todos llegan a WhatsApp. Revisá si el botón está visible, si el mensaje se entiende y si el flujo es claro.',
      tone: 'warning',
    });
  }

  if (
    ga4Data.sendToWhatsAppEvents >= 5 &&
    conversion.whatsappToPurchase < 35
  ) {
    insights.push({
      title: 'WhatsApp no está cerrando suficientes ventas',
      description:
        'Hay conversaciones iniciadas, pero pocas terminan en compra. Puede mejorar el tiempo de respuesta, el guion de atención y la claridad del cierre.',
      tone: 'warning',
    });
  }

  if (
    ga4Data.viewItemEvents > 0 &&
    conversion.viewToCart >= 12 &&
    conversion.cartToCheckout >= 50
  ) {
    insights.push({
      title: 'Buen rendimiento del embudo superior',
      description:
        'La tienda está convirtiendo bien desde vistas hacia carrito y checkout. Hay una base sólida para escalar tráfico.',
      tone: 'success',
    });
  }

  if (ga4Data.purchaseEvents > 0 && conversion.whatsappToPurchase >= 45) {
    insights.push({
      title: 'Buen cierre comercial por WhatsApp',
      description:
        'Las conversaciones que llegan a WhatsApp están cerrando bien. Vale la pena sostener ese canal y medir tiempos de respuesta.',
      tone: 'success',
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: 'Todavía no hay suficiente volumen para detectar patrones claros',
      description:
        'Seguimos mostrando métricas y funnel, pero conviene acumular más tráfico o más eventos para sacar conclusiones más firmes.',
      tone: 'neutral',
    });
  }

  return insights;
}

function buildExecutiveSummary(params: {
  comparison: OrdersPeriodComparison | null;
  ga4Data: Awaited<ReturnType<typeof getGa4Overview>> | null;
  conversion: {
    viewToCart: number;
    cartToCheckout: number;
    checkoutToWhatsapp: number;
    whatsappToPurchase: number;
  } | null;
}): ExecutiveSummaryItem[] {
  const { comparison, ga4Data, conversion } = params;
  const summary: ExecutiveSummaryItem[] = [];

  if (comparison) {
    const revenueDelta = comparison.revenue.diffPercent;
    const ordersDelta = comparison.orders.diffPercent;
    const ticketDelta = comparison.averageTicket.diffPercent;

    if (comparison.revenue.current === 0 && comparison.orders.current === 0) {
      summary.push({
        title: 'Sin ventas en el período seleccionado',
        description:
          'No se registran pedidos en este rango. Conviene revisar adquisición de tráfico, visibilidad de productos y activación comercial.',
        tone: 'warning',
      });
    } else if (
      comparison.revenue.trend === 'up' &&
      comparison.orders.trend === 'up'
    ) {
      summary.push({
        title: 'Crecimiento comercial frente al período anterior',
        description: `La facturación creció ${formatDelta(
          revenueDelta
        )} y los pedidos subieron ${formatDelta(
          ordersDelta
        )}. El período muestra una mejora general del rendimiento comercial.`,
        tone: 'success',
      });
    } else if (
      comparison.revenue.trend === 'up' &&
      comparison.orders.trend !== 'up'
    ) {
      summary.push({
        title: 'Mejor facturación con menos volumen de pedidos',
        description: `La facturación avanzó ${formatDelta(
          revenueDelta
        )}, pero los pedidos no crecieron al mismo ritmo. Esto sugiere tickets más altos o una mejor mezcla de productos.`,
        tone: 'neutral',
      });
    } else if (
      comparison.revenue.trend === 'down' &&
      comparison.orders.trend === 'down'
    ) {
      summary.push({
        title: 'Caída comercial frente al período anterior',
        description: `La facturación cayó ${formatDelta(
          revenueDelta
        )} y los pedidos bajaron ${formatDelta(
          ordersDelta
        )}. Conviene revisar demanda, surtido, difusión y ejecución comercial.`,
        tone: 'warning',
      });
    }

    if (ticketDelta !== null && comparison.averageTicket.trend === 'up') {
      summary.push({
        title: 'Suba del ticket promedio',
        description: `El ticket promedio mejoró ${formatDelta(
          ticketDelta
        )}. Puede estar empujado por precios, combos, upselling o compras más grandes por pedido.`,
        tone: 'success',
      });
    } else if (
      ticketDelta !== null &&
      comparison.averageTicket.trend === 'down'
    ) {
      summary.push({
        title: 'Baja del ticket promedio',
        description: `El ticket promedio cayó ${formatDelta(
          ticketDelta
        )}. Conviene revisar estrategia de precios, combos y productos de mayor valor.`,
        tone: 'warning',
      });
    }
  }

  if (ga4Data && conversion) {
    if (ga4Data.viewItemEvents > 0 && conversion.viewToCart < 8) {
      summary.push({
        title: 'Hay interés en productos, pero cuesta llevarlo al carrito',
        description:
          'La tienda está generando vistas, aunque pocas llegan a agregado al carrito. El foco debería estar en ficha de producto, precio, fotos y claridad de propuesta.',
        tone: 'warning',
      });
    }

    if (
      ga4Data.addToCartEvents > 0 &&
      conversion.cartToCheckout >= 50 &&
      conversion.checkoutToWhatsapp >= 60
    ) {
      summary.push({
        title: 'El proceso de compra muestra buena tracción',
        description:
          'Una proporción sana de usuarios avanza desde carrito a checkout y luego a WhatsApp. El flujo comercial está bien encaminado.',
        tone: 'success',
      });
    }

    if (
      ga4Data.sendToWhatsAppEvents > 0 &&
      conversion.whatsappToPurchase < 35
    ) {
      summary.push({
        title: 'La oportunidad está en el cierre por WhatsApp',
        description:
          'El embudo logra derivar conversaciones, pero muchas no terminan en compra. La principal mejora parece estar en respuesta, seguimiento y cierre comercial.',
        tone: 'warning',
      });
    }
  }

  if (summary.length === 0) {
    summary.push({
      title: 'Rendimiento estable, todavía sin señales fuertes',
      description:
        'El panel ya muestra comportamiento comercial y operativo, pero todavía no aparecen patrones suficientemente marcados como para sacar una conclusión dominante.',
      tone: 'neutral',
    });
  }

  return summary.slice(0, 4);
}

function MetricCard({
  label,
  value,
  helpText,
}: {
  label: string;
  value: number | string;
  helpText?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {helpText ? (
        <p className="mt-2 text-xs text-slate-400">{helpText}</p>
      ) : null}
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const toneClasses =
    insight.tone === 'warning'
      ? 'border-amber-200 bg-amber-50'
      : insight.tone === 'success'
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-slate-200 bg-slate-50';

  const titleClasses =
    insight.tone === 'warning'
      ? 'text-amber-950'
      : insight.tone === 'success'
        ? 'text-emerald-950'
        : 'text-slate-900';

  const bodyClasses =
    insight.tone === 'warning'
      ? 'text-amber-900'
      : insight.tone === 'success'
        ? 'text-emerald-900'
        : 'text-slate-600';

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <p className={`text-sm font-semibold ${titleClasses}`}>{insight.title}</p>
      <p className={`mt-2 text-sm ${bodyClasses}`}>{insight.description}</p>
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const membership = await getCurrentUserStore();

  if (!membership?.stores) {
    redirect('/login');
  }

  const store = membership.stores;
  const resolvedSearchParams = await searchParams;
  const range: RangeValue = resolvedSearchParams.range ?? '30d';

  if (!hasFeature(store.plan, 'advanced_analytics')) {
    return (
      <AdminShell
        title="Analytics"
        subtitle={`Tienda: ${store.name}`}
        storeName={store.name}
        storeSlug={store.slug}
        plan={store.plan}
        current="analytics"
        pendingOrdersCount={0}
      >
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-wide text-amber-700">
              Función disponible en planes superiores
            </p>

            <h2 className="text-2xl font-bold text-amber-950">
              Analytics avanzado no está incluido en tu plan
            </h2>

            <p className="max-w-2xl text-sm text-amber-900">
              Tu tienda está usando el plan <strong>{store.plan}</strong>. Para
              acceder a métricas avanzadas, comparativas y análisis comercial,
              necesitás actualizar a <strong>Pro</strong> o{' '}
              <strong>Intelligence</strong>.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/admin/pedidos"
                className="inline-flex items-center rounded-2xl bg-amber-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800"
              >
                Volver a Pedidos
              </Link>

              <Link
                href="/admin"
                className="inline-flex items-center rounded-2xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
              >
                Ir al panel
              </Link>
            </div>
          </div>
        </section>
      </AdminShell>
    );
  }

  const analyticsApiKey =
    store.analytics_api_key ?? (await ensureAnalyticsApiKey()).apiKey;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const publicAnalyticsUrl = appUrl
    ? `${appUrl}/api/public/analytics/orders-detailed?range=${range}&api_key=${analyticsApiKey}`
    : `/api/public/analytics/orders-detailed?range=${range}&api_key=${analyticsApiKey}`;

  const supabase = await createClient();

  const ga4ServiceAccountJson = process.env.GA4_SERVICE_ACCOUNT_JSON;
  const hasGa4Credentials = Boolean(ga4ServiceAccountJson);
  const ga4PropertyId = store.google_analytics_property_id ?? null;

  let ga4Data: Awaited<ReturnType<typeof getGa4Overview>> | null = null;
  let ga4DailySeries: Awaited<ReturnType<typeof getGa4DailySeries>> = [];
  let ga4Error: string | null = null;

  const [
    { data: ordersData, error: ordersError },
    { data: itemsData, error: itemsError },
  ] = await Promise.all([
    supabase.from('orders').select('*').eq('store_id', store.id),
    supabase
      .from('order_items')
      .select(
        'product_id, product_name, quantity, line_total, orders!inner(created_at, store_id)'
      )
      .eq('orders.store_id', store.id),
  ]);

  if (ga4PropertyId && hasGa4Credentials) {
    try {
      const [overview, dailySeries] = await Promise.all([
        getGa4Overview({
          propertyId: ga4PropertyId,
          range,
        }),
        getGa4DailySeries({
          propertyId: ga4PropertyId,
          range,
        }),
      ]);

      ga4Data = overview;
      ga4DailySeries = dailySeries;
    } catch (error) {
      ga4Error =
        error instanceof Error ? error.message : 'Error desconocido GA4';
    }
  }

  if (ordersError) {
    throw new Error(`Error cargando pedidos: ${ordersError.message}`);
  }

  if (itemsError) {
    throw new Error(`Error cargando items de pedidos: ${itemsError.message}`);
  }

  const allOrders = (ordersData ?? []) as Order[];

  const allOrderItems = ((itemsData ?? []) as Array<{
    product_id: string | null;
    product_name: string | null;
    quantity: number | string | null;
    line_total: number | string | null;
    orders: { created_at: string; store_id: string }[];
  }>).map((item) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    line_total: item.line_total,
    orders: item.orders?.[0] ?? null,
  })) as OrderItemRow[];

  const conversion = ga4Data
    ? {
        viewToCart:
          ga4Data.viewItemEvents > 0
            ? (ga4Data.addToCartEvents / ga4Data.viewItemEvents) * 100
            : 0,
        cartToCheckout:
          ga4Data.addToCartEvents > 0
            ? (ga4Data.beginCheckoutEvents / ga4Data.addToCartEvents) * 100
            : 0,
        checkoutToWhatsapp:
          ga4Data.beginCheckoutEvents > 0
            ? (ga4Data.sendToWhatsAppEvents / ga4Data.beginCheckoutEvents) * 100
            : 0,
        whatsappToPurchase:
          ga4Data.sendToWhatsAppEvents > 0
            ? (ga4Data.purchaseEvents / ga4Data.sendToWhatsAppEvents) * 100
            : 0,
      }
    : null;

  const insights =
    ga4Data && conversion
      ? buildInsights({
          ga4Data,
          conversion,
        })
      : [];

  const { rangeFilteredOrders, pendingOrdersCount } = filterOrders({
    orders: allOrders,
    status: 'all',
    queryText: '',
    delivery: 'all',
    notes: 'all',
    range,
  });

  const rangeFilteredOrderItems = filterOrderItemsByRange(
    allOrderItems,
    range
  );

  const comparison = getOrdersComparison(allOrders, allOrderItems, range);

  const executiveSummary = buildExecutiveSummary({
    comparison,
    ga4Data,
    conversion,
  });

  let topProductsInsights: TopProductInsightRow[] = [];

  if (ga4PropertyId && hasGa4Credentials) {
    try {
      topProductsInsights = await getTopProductsInsights({
        propertyId: ga4PropertyId,
        range,
        orderItems: rangeFilteredOrderItems,
        limit: 10,
      });
    } catch (error) {
      const details =
        error instanceof Error
          ? error.message
          : 'Error desconocido GA4 top products';

      ga4Error = ga4Error
        ? `${ga4Error} | Top productos: ${details}`
        : `Top productos: ${details}`;
    }
  }

  return (
    <AdminShell
      title="Analytics"
      subtitle={`Tienda: ${store.name}`}
      storeName={store.name}
      storeSlug={store.slug}
      plan={store.plan}
      current="analytics"
      pendingOrdersCount={pendingOrdersCount}
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Rendimiento comercial
              </h2>
              <p className="text-sm text-slate-500">
                Analizá ingresos, comportamiento de pedidos, tráfico y
                conversión en el período seleccionado.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <ExportOrdersButton range={range} />
              <ExportOrdersDetailedButton range={range} />
            </div>
          </div>
        </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Conexión para Power BI y Excel
            </h2>

            <p className="text-sm text-slate-600">
              Usá estas URLs para importar datos desde Power BI Desktop o desde
              Excel con Power Query.
            </p>

            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                API key
              </p>
              <code className="break-all text-sm text-slate-900">
                {analyticsApiKey}
              </code>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                URL CSV para Excel
              </p>
              <code className="break-all text-sm text-slate-900">
                {publicAnalyticsUrl}
              </code>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                URL JSON para Power BI
              </p>
              <code className="break-all text-sm text-slate-900">
                {publicAnalyticsJsonUrl}
              </code>
            </div>

            <form action={regenerateAnalyticsApiKeyAction}>
              <button
                type="submit"
                className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
              >
                Regenerar API key
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Estado de Google Analytics
            </h2>

            <p className="text-sm text-slate-600">
              Credenciales backend:{' '}
              <span className="font-medium">
                {hasGa4Credentials ? 'Configuradas' : 'Faltan variables'}
              </span>
            </p>

            <p className="text-sm text-slate-600">
              Property ID:{' '}
              <span className="font-medium">
                {ga4PropertyId ? 'Configurado' : 'No configurado'}
              </span>
            </p>

            {ga4Error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">
                  Error al consultar GA4
                </p>
                <p className="mt-1 break-words text-sm text-red-700">
                  {ga4Error}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {ga4Data ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Usuarios activos"
              value={ga4Data.activeUsers}
              helpText="Personas activas en el período"
            />
            <MetricCard
              label="Sesiones"
              value={ga4Data.sessions}
              helpText="Cantidad total de sesiones"
            />
            <MetricCard
              label="Views"
              value={ga4Data.screenPageViews}
              helpText="Vistas de páginas y pantallas"
            />
            <MetricCard
              label="Purchases"
              value={ga4Data.purchaseEvents}
              helpText="Compras detectadas por GA4"
            />
            <MetricCard
              label="View item"
              value={ga4Data.viewItemEvents}
              helpText="Visualizaciones de producto"
            />
            <MetricCard
              label="Add to cart"
              value={ga4Data.addToCartEvents}
              helpText="Agregados al carrito"
            />
            <MetricCard
              label="Begin checkout"
              value={ga4Data.beginCheckoutEvents}
              helpText="Inicio de checkout"
            />
            <MetricCard
              label="Enviar a WhatsApp"
              value={ga4Data.sendToWhatsAppEvents}
              helpText="Derivaciones al canal de venta"
            />
          </section>
        ) : null}

        {ga4Data && conversion ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Funnel de conversión
            </h3>

            <div className="grid gap-4 text-center sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Views</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {ga4Data.viewItemEvents}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Add to cart</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {ga4Data.addToCartEvents}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatPercent(conversion.viewToCart)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Checkout</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {ga4Data.beginCheckoutEvents}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatPercent(conversion.cartToCheckout)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">WhatsApp</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {ga4Data.sendToWhatsAppEvents}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatPercent(conversion.checkoutToWhatsapp)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Purchase</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {ga4Data.purchaseEvents}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatPercent(conversion.whatsappToPurchase)}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {ga4Data && conversion ? (
          <Ga4Charts ga4Data={ga4Data} conversion={conversion} />
        ) : null}

        {ga4DailySeries.length > 0 ? (
          <Ga4DailySeries points={ga4DailySeries} />
        ) : null}

        <ExecutiveSummary items={executiveSummary} />

        {insights.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Insights automáticos
            </h3>

            <div className="grid gap-4 xl:grid-cols-2">
              {insights.map((insight) => (
                <InsightCard
                  key={`${insight.title}-${insight.description}`}
                  insight={insight}
                />
              ))}
            </div>
          </section>
        ) : null}

        {topProductsInsights.length > 0 ? (
          <Ga4TopProductsInsights rows={topProductsInsights} />
        ) : (
          <Ga4TopProductsPlaceholder
            hasGa4Credentials={hasGa4Credentials}
            hasPropertyId={Boolean(ga4PropertyId)}
            hasOrdersData={rangeFilteredOrderItems.length > 0}
            ga4Error={ga4Error}
          />
        )}

        <OrdersRangeTabs
          basePath="/admin/analytics"
          currentRange={range}
          status="all"
          queryText=""
          delivery="all"
          notes="all"
        />

        <OrdersAnalyticsSection
          orders={rangeFilteredOrders}
          items={rangeFilteredOrderItems}
          range={range}
          comparison={comparison}
        />
      </div>
    </AdminShell>
  );
}