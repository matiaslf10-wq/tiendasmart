import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserStore } from '@/lib/stores';
import {
  filterOrderItemsByRange,
  filterOrders,
  type Order,
  type OrderItemRow,
  type RangeValue,
} from '@/lib/admin/orders';

type ExportOrderItemRow = OrderItemRow & {
  order_id: string;
  unit_price?: number | string | null;
};

function isValidRange(value: string | null): value is RangeValue {
  return (
    value === 'today' ||
    value === '7d' ||
    value === '30d' ||
    value === 'month' ||
    value === 'all'
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
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

export async function GET(request: NextRequest) {
  try {
    const membership = await getCurrentUserStore();

    if (!membership?.stores) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const store = membership.stores;
    const supabase = await createClient();

    const url = new URL(request.url);
    const rangeParam = url.searchParams.get('range');
    const range: RangeValue = isValidRange(rangeParam) ? rangeParam : '30d';

    const [
      { data: ordersData, error: ordersError },
      { data: itemsData, error: itemsError },
    ] = await Promise.all([
      supabase
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
          created_at,
          store_id
        `)
        .eq('store_id', store.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('order_items')
        .select(
          'order_id, product_id, product_name, unit_price, quantity, line_total, orders!inner(created_at, store_id)'
        )
        .eq('orders.store_id', store.id),
    ]);

    if (ordersError) {
      return NextResponse.json(
        { error: `Error cargando pedidos: ${ordersError.message}` },
        { status: 500 }
      );
    }

    if (itemsError) {
      return NextResponse.json(
        { error: `Error cargando items de pedidos: ${itemsError.message}` },
        { status: 500 }
      );
    }

    const allOrders = (ordersData ?? []) as Order[];

    const allOrderItems: ExportOrderItemRow[] = ((itemsData ?? []) as Array<{
      order_id: string;
      product_id: string | null;
      product_name: string | null;
      unit_price?: number | string | null;
      quantity: number | string | null;
      line_total: number | string | null;
      orders: { created_at: string; store_id: string }[];
    }>).map((item) => ({
      order_id: item.order_id,
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: item.unit_price ?? 0,
      quantity: item.quantity,
      line_total: item.line_total,
      orders: item.orders?.[0] ?? null,
    })) as ExportOrderItemRow[];

    const { rangeFilteredOrders } = filterOrders({
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
    ) as ExportOrderItemRow[];

    const orderIdsInRange = new Set(rangeFilteredOrders.map((order) => order.id));

    const orderItems = rangeFilteredOrderItems.filter((item) =>
      orderIdsInRange.has(item.order_id)
    );

    const totalRevenue = rangeFilteredOrders.reduce(
      (acc, order) => acc + Number(order.total ?? 0),
      0
    );

    const avgTicket =
      rangeFilteredOrders.length > 0
        ? totalRevenue / rangeFilteredOrders.length
        : 0;

    const totalItemsSold = orderItems.reduce(
      (acc, item) => acc + Number(item.quantity ?? 0),
      0
    );

    const statusCount = rangeFilteredOrders.reduce<Record<string, number>>(
      (acc, order) => {
        const key = order.status || 'unknown';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {}
    );

    const topProductsMap = orderItems.reduce<
      Record<
        string,
        {
          product_name: string;
          quantity: number;
          revenue: number;
          orders: Set<string>;
        }
      >
    >((acc, item) => {
      const key = item.product_id || item.product_name || 'sin-producto';

      if (!acc[key]) {
        acc[key] = {
          product_name: item.product_name ?? 'Sin nombre',
          quantity: 0,
          revenue: 0,
          orders: new Set<string>(),
        };
      }

      acc[key].quantity += Number(item.quantity ?? 0);
      acc[key].revenue += Number(item.line_total ?? 0);
      acc[key].orders.add(item.order_id);

      return acc;
    }, {});

    const topProducts = Object.values(topProductsMap)
      .map((item) => ({
        producto: item.product_name,
        unidades_vendidas: item.quantity,
        facturacion: item.revenue,
        pedidos: item.orders.size,
      }))
      .sort((a, b) => b.unidades_vendidas - a.unidades_vendidas);

    const dailyMap = rangeFilteredOrders.reduce<
      Record<string, { pedidos: number; facturacion: number }>
    >((acc, order) => {
      const date = new Date(order.created_at);
      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (!acc[key]) {
        acc[key] = { pedidos: 0, facturacion: 0 };
      }

      acc[key].pedidos += 1;
      acc[key].facturacion += Number(order.total ?? 0);

      return acc;
    }, {});

    const dailySeries = Object.entries(dailyMap)
      .map(([fecha, values]) => ({
        fecha,
        pedidos: values.pedidos,
        facturacion: values.facturacion,
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    const summarySheet = [
      { métrica: 'Tienda', valor: store.name },
      { métrica: 'Slug', valor: store.slug },
      { métrica: 'Período', valor: range },
      { métrica: 'Pedidos', valor: rangeFilteredOrders.length },
      { métrica: 'Facturación total', valor: totalRevenue },
      { métrica: 'Facturación total formateada', valor: formatCurrency(totalRevenue) },
      { métrica: 'Ticket promedio', valor: avgTicket },
      { métrica: 'Ticket promedio formateado', valor: formatCurrency(avgTicket) },
      { métrica: 'Items vendidos', valor: totalItemsSold },
    ];

    const statusSheet = Object.entries(statusCount).map(([estado, cantidad]) => ({
      estado,
      cantidad,
    }));

    const ordersSheet = rangeFilteredOrders.map((order) => ({
      id: order.id,
      pedido: order.order_number,
      fecha: formatDate(order.created_at),
      cliente: order.customer_name ?? '',
      telefono: order.customer_phone ?? '',
      total: Number(order.total ?? 0),
      total_formateado: formatCurrency(Number(order.total ?? 0)),
      estado: order.status ?? '',
      tipo_entrega: order.delivery_type ?? '',
      direccion: order.delivery_address ?? '',
      notas: order.notes ?? '',
    }));

    const itemsSheet = orderItems.map((item) => ({
      order_id: item.order_id,
      producto: item.product_name ?? '',
      cantidad: Number(item.quantity ?? 0),
      precio_unitario: Number(item.unit_price ?? 0),
      precio_unitario_formateado: formatCurrency(Number(item.unit_price ?? 0)),
      subtotal: Number(item.line_total ?? 0),
      subtotal_formateado: formatCurrency(Number(item.line_total ?? 0)),
    }));

    const topProductsSheet = topProducts.map((item) => ({
      producto: item.producto,
      unidades_vendidas: item.unidades_vendidas,
      facturacion: item.facturacion,
      facturacion_formateada: formatCurrency(item.facturacion),
      pedidos: item.pedidos,
    }));

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(summarySheet),
      'Resumen'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(statusSheet),
      'Estados'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(ordersSheet),
      'Pedidos'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(itemsSheet),
      'Items'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(topProductsSheet),
      'Top productos'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(dailySeries),
      'Serie diaria'
    );

    const fileBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    const fileName = `analytics-${store.slug}-${range}.xlsx`;

    return new NextResponse(fileBuffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Error inesperado al exportar analytics';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}