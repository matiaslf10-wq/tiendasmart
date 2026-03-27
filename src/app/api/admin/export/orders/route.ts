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

export async function GET(request: NextRequest) {
  const membership = await getCurrentUserStore();

  if (!membership?.stores) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const store = membership.stores;
  const rangeParam = request.nextUrl.searchParams.get('range');
  const range: RangeValue = isValidRange(rangeParam) ? rangeParam : '30d';

  const supabase = await createClient();

  const { data, error } = await supabase
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

  if (error) {
    return NextResponse.json(
      {
        error: 'No se pudo exportar la información',
        details: error.message,
      },
      { status: 500 }
    );
  }

  const orders = (data ?? []) as Order[];

  const { rangeFilteredOrders } = filterOrders({
    orders,
    status: 'all',
    queryText: '',
    delivery: 'all',
    notes: 'all',
    range,
  });

  const headerRow = [
    'Fecha',
    'Pedido',
    'Cliente',
    'Teléfono',
    'Total',
    'Estado',
    'Tipo',
    'Dirección',
    'Notas',
  ];

  const dataRows = rangeFilteredOrders.map((order) => [
    formatDate(order.created_at),
    order.order_number ?? '',
    order.customer_name ?? '',
    order.customer_phone ?? '',
    formatMoney(Number(order.total ?? 0)),
    normalizeStatus(order.status ?? ''),
    normalizeDeliveryType(order.delivery_type ?? ''),
    order.delivery_address ?? '',
    order.notes ?? '',
  ]);

  const csvContent = buildCsv([headerRow, ...dataRows]);
  const csvWithBom = `\uFEFF${csvContent}`;

  const today = new Intl.DateTimeFormat('sv-SE').format(new Date());
  const filename = `pedidos-${store.slug}-${range}-${today}.csv`;

  return new NextResponse(csvWithBom, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}