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

function getDateParts(value: string) {
  try {
    const date = new Date(value);

    const fecha = new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);

    const hora = new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);

    return { fecha, hora };
  } catch {
    return { fecha: value, hora: '' };
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

function escapeCsvValue(value: unknown) {
  const stringValue = String(value ?? '');
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function buildCsv(rows: Array<Array<unknown>>) {
  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
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

type ProductCategoryRow = {
  id: string;
  name: string;
  categories:
    | {
        name: string | null;
      }
    | {
        name: string | null;
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

  const headerRow = [
    'Tienda',
    'Fecha',
    'Hora',
    'Pedido',
    'Cliente',
    'Teléfono',
    'Estado',
    'Tipo',
    'Dirección',
    'Notas',
    'ID producto',
    'Producto',
    'Categoría',
    'Cantidad',
    'Precio unitario',
    'Subtotal ítem',
    'Total pedido',
  ];

  if (orderIds.length === 0) {
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
      product_id,
      product_name,
      quantity,
      line_total,
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

  const productIds = Array.from(
    new Set(
      ((itemsData ?? []) as ExportOrderItemRow[])
        .map((item) => item.product_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  let categoryByProductId = new Map<string, string>();

  if (productIds.length > 0) {
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        categories (
          name
        )
      `)
      .in('id', productIds);

    if (productsError) {
      return NextResponse.json(
        {
          error: 'No se pudieron cargar las categorías de productos',
          details: productsError.message,
        },
        { status: 500 }
      );
    }

    categoryByProductId = new Map(
      ((productsData ?? []) as ProductCategoryRow[]).map((product) => {
        const category = Array.isArray(product.categories)
          ? product.categories[0]?.name ?? ''
          : product.categories?.name ?? '';

        return [product.id, category];
      })
    );
  }

  const detailedRows = ((itemsData ?? []) as ExportOrderItemRow[]).flatMap(
    (item) => {
      const relatedOrder = Array.isArray(item.orders)
        ? item.orders[0]
        : item.orders;

      if (!relatedOrder) return [];

      const { fecha, hora } = getDateParts(relatedOrder.created_at);
      const quantity = Number(item.quantity ?? 0);
      const lineTotal = Number(item.line_total ?? 0);
      const unitPrice = quantity > 0 ? lineTotal / quantity : 0;
      const categoryName = item.product_id
        ? categoryByProductId.get(item.product_id) ?? ''
        : '';

      return [
        [
          store.name,
          fecha,
          hora,
          relatedOrder.order_number ?? '',
          relatedOrder.customer_name ?? '',
          relatedOrder.customer_phone ?? '',
          normalizeStatus(relatedOrder.status ?? ''),
          normalizeDeliveryType(relatedOrder.delivery_type ?? ''),
          relatedOrder.delivery_address ?? '',
          relatedOrder.notes ?? '',
          item.product_id ?? '',
          item.product_name ?? '',
          categoryName,
          quantity,
          formatMoney(unitPrice),
          formatMoney(lineTotal),
          formatMoney(Number(relatedOrder.total ?? 0)),
        ],
      ];
    }
  );

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