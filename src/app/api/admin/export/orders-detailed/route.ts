import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserStore } from '@/lib/stores';
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

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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
      return status;
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

function escapeCsvValue(value: unknown) {
  const stringValue = String(value ?? '');
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function buildCsv(rows: Array<Array<unknown>>) {
  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
}

type ExportOrderItemRow = {
  quantity: number | string | null;
  unit_price?: number | string | null;
  line_total: number | string | null;
  product_name: string | null;
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

export async function GET(request: NextRequest) {
  const membership = await getCurrentUserStore();

  if (!membership?.stores) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const store = membership.stores;
  const rangeParam = request.nextUrl.searchParams.get('range');
  const range: RangeValue = isValidRange(rangeParam) ? rangeParam : '30d';

  const supabase = await createClient();

  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      customer_name,
      customer_phone,
      total,
      status,
      notes,
      delivery_type,
      delivery_address,
      created_at
    `)
    .eq('store_id', store.id)
    .order('created_at', { ascending: false });

  if (ordersError) {
    return NextResponse.json(
      {
        error: 'No se pudieron cargar los pedidos',
        details: ordersError.message,
      },
      { status: 500 }
    );
  }

  const allOrders = (ordersData ?? []) as Order[];

  const { rangeFilteredOrders } = filterOrders({
    orders: allOrders,
    status: 'all',
    queryText: '',
    delivery: 'all',
    notes: 'all',
    range,
  });

  const orderIds = rangeFilteredOrders.map((order) => order.id).filter(Boolean);

  if (orderIds.length === 0) {
    const headerRow = [
      'Fecha',
      'Pedido',
      'Cliente',
      'Teléfono',
      'Estado',
      'Tipo',
      'Dirección',
      'Notas',
      'Producto',
      'Cantidad',
      'Precio unitario',
      'Subtotal ítem',
      'Total pedido',
    ];

    const csvContent = buildCsv([headerRow]);
    const csvWithBom = `\uFEFF${csvContent}`;
    const today = new Intl.DateTimeFormat('sv-SE').format(new Date());
    const filename = `pedidos-detalle-${store.slug}-${range}-${today}.csv`;

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const { data: itemsData, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      quantity,
      unit_price,
      line_total,
      product_name,
      orders!inner (
        id,
        order_number,
        customer_name,
        customer_phone,
        total,
        status,
        delivery_type,
        delivery_address,
        notes,
        created_at
      )
    `)
    .in('order_id', orderIds);

  if (itemsError) {
    return NextResponse.json(
      {
        error: 'No se pudieron cargar los ítems de los pedidos',
        details: itemsError.message,
      },
      { status: 500 }
    );
  }

  const detailedRows = ((itemsData ?? []) as ExportOrderItemRow[]).flatMap(
    (item) => {
      const relatedOrder = Array.isArray(item.orders)
        ? item.orders[0]
        : item.orders;

      if (!relatedOrder) return [];

      return [
        [
          formatDate(relatedOrder.created_at),
          relatedOrder.order_number ?? '',
          relatedOrder.customer_name ?? '',
          relatedOrder.customer_phone ?? '',
          normalizeStatus(relatedOrder.status ?? ''),
          normalizeDeliveryType(relatedOrder.delivery_type ?? ''),
          relatedOrder.delivery_address ?? '',
          relatedOrder.notes ?? '',
          item.product_name ?? '',
          item.quantity ?? '',
          formatMoney(Number(item.unit_price ?? 0)),
          formatMoney(Number(item.line_total ?? 0)),
          formatMoney(Number(relatedOrder.total ?? 0)),
        ],
      ];
    }
  );

  const headerRow = [
    'Fecha',
    'Pedido',
    'Cliente',
    'Teléfono',
    'Estado',
    'Tipo',
    'Dirección',
    'Notas',
    'Producto',
    'Cantidad',
    'Precio unitario',
    'Subtotal ítem',
    'Total pedido',
  ];

  const csvContent = buildCsv([headerRow, ...detailedRows]);
  const csvWithBom = `\uFEFF${csvContent}`;

  const today = new Intl.DateTimeFormat('sv-SE').format(new Date());
  const filename = `pedidos-detalle-${store.slug}-${range}-${today}.csv`;

  return new NextResponse(csvWithBom, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}