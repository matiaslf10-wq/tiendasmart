import { getRangeWindow } from '@/lib/admin/orders';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { filterOrders, type Order, type RangeValue } from '@/lib/admin/orders';

function isValidRange(value: string | null): value is RangeValue {
  return (
    value === 'today' ||
    value === '7d' ||
    value === '30d' ||
    value === 'month' ||
    value === 'all'
  );
}

function getDateParts(value: string) {
  try {
    const date = new Date(value);

    const fecha = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);

    const hora = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);

    return { fecha, hora };
  } catch {
    return { fecha: value, hora: '' };
  }
}

function normalizeStatus(status: string) {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'preparing':
    case 'in_preparation':
      return 'En preparación';
    case 'completed':
      return 'Completado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status || '';
  }
}

function normalizeDeliveryType(deliveryType: string | null) {
  switch (deliveryType) {
    case 'delivery':
      return 'Delivery';
    case 'pickup':
      return 'Retiro';
    default:
      return deliveryType ?? '';
  }
}

type ExportOrderItemRow = {
  product_id: string | null;
  product_name: string | null;
  quantity: number | string | null;
  line_total: number | string | null;
  orders:
    | {
        id: string;
        order_number: number | string | null;
        customer_name: string | null;
        customer_phone: string | null;
        total: number | string | null;
        status: string | null;
        delivery_type: string | null;
        delivery_address: string | null;
        notes: string | null;
        created_at: string;
      }
    | {
        id: string;
        order_number: number | string | null;
        customer_name: string | null;
        customer_phone: string | null;
        total: number | string | null;
        status: string | null;
        delivery_type: string | null;
        delivery_address: string | null;
        notes: string | null;
        created_at: string;
      }[]
    | null;
};

type ProductRow = {
  id: string;
  category_id?: string | null;
  categories?:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
};

type AnalyticsDetailedJsonRow = {
  tienda: string;
  fecha: string;
  hora: string;
  pedido: number | string | null;
  cliente: string;
  telefono: string;
  estado: string;
  tipo: string;
  direccion: string;
  notas: string;
  product_id: string;
  producto: string;
  categoria: string;
  cantidad: number;
  precio_unitario: number;
  subtotal_item: number;
  total_pedido: number;
};

type AnalyticsDetailedJsonResponse = {
  store: {
    id: string;
    name: string;
    slug: string;
  };
  range: RangeValue;
  generated_at: string;
  row_count: number;
  rows: AnalyticsDetailedJsonRow[];
};

export async function GET(request: NextRequest) {
  const apiKey =
    request.headers.get('x-api-key');

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Falta API key' },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  const rangeParam = request.nextUrl.searchParams.get('range');
  const range: RangeValue = isValidRange(rangeParam) ? rangeParam : '30d';

  const supabase = await createClient();

  const bounds = getRangeWindow(range);
  const { data: payload, error: exportError } = await supabase.rpc('analytics_export', {
    p_api_key: apiKey,
    p_start: bounds?.start.toISOString() ?? null,
    p_end: bounds?.end.toISOString() ?? null,
  });
  if (exportError) return NextResponse.json({ error: 'No se pudo generar la exportación' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  if (!payload?.store) return NextResponse.json({ error: 'API key inválida' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const store = payload.store as { id: string; name: string; slug: string };
  const ordersData = payload.orders;
  const allOrders = (ordersData ?? []) as Order[];

  const { rangeFilteredOrders } = filterOrders({
    orders: allOrders,
    status: 'all',
    queryText: '',
    delivery: 'all',
    notes: 'all',
    range,
  });

  const orderIds = rangeFilteredOrders
    .map((order) => order.id)
    .filter((value): value is string => Boolean(value));

  if (orderIds.length === 0) {
    const emptyResponse: AnalyticsDetailedJsonResponse = {
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
      },
      range,
      generated_at: new Date().toISOString(),
      row_count: 0,
      rows: [],
    };

    return NextResponse.json(emptyResponse, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  const itemsData = payload.items as ExportOrderItemRow[];

  const normalizedItems = (itemsData ?? []) as ExportOrderItemRow[];

  const productIds = Array.from(
    new Set(
      normalizedItems
        .map((item) => item.product_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  let categoryByProductId = new Map<string, string>();

  if (productIds.length > 0) {
    const productsData = payload.products as ProductRow[];
    categoryByProductId = new Map(
      ((productsData ?? []) as ProductRow[]).map((product) => {
        const categoryName = Array.isArray(product.categories)
          ? product.categories[0]?.name ?? ''
          : product.categories?.name ?? '';

        return [product.id, categoryName];
      })
    );
  }

  const rows: AnalyticsDetailedJsonRow[] = normalizedItems.flatMap((item) => {
    const relatedOrder = Array.isArray(item.orders)
      ? item.orders[0]
      : item.orders;

    if (!relatedOrder) return [];

    const { fecha, hora } = getDateParts(relatedOrder.created_at);
    const cantidad = Number(item.quantity ?? 0);
    const subtotalItem = Number(item.line_total ?? 0);
    const precioUnitario = cantidad > 0 ? subtotalItem / cantidad : 0;
    const totalPedido = Number(relatedOrder.total ?? 0);
    const categoria = item.product_id
      ? categoryByProductId.get(item.product_id) ?? ''
      : '';

    return [
      {
        tienda: store.name,
        fecha,
        hora,
        pedido: relatedOrder.order_number ?? null,
        cliente: relatedOrder.customer_name ?? '',
        telefono: relatedOrder.customer_phone ?? '',
        estado: normalizeStatus(relatedOrder.status ?? ''),
        tipo: normalizeDeliveryType(relatedOrder.delivery_type ?? ''),
        direccion: relatedOrder.delivery_address ?? '',
        notas: relatedOrder.notes ?? '',
        product_id: item.product_id ?? '',
        producto: item.product_name ?? '',
        categoria,
        cantidad,
        precio_unitario: precioUnitario,
        subtotal_item: subtotalItem,
        total_pedido: totalPedido,
      },
    ];
  });

  const response: AnalyticsDetailedJsonResponse = {
    store: {
      id: store.id,
      name: store.name,
      slug: store.slug,
    },
    range,
    generated_at: new Date().toISOString(),
    row_count: rows.length,
    rows,
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}