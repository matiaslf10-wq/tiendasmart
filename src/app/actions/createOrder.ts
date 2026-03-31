'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type CheckoutItemInput = {
  productId: string;
  quantity: number;
};

type CreateOrderInput = {
  storeSlug: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryType: 'pickup' | 'delivery';
  deliveryAddress?: string;
  notes?: string;
  items: CheckoutItemInput[];
  trafficSource?: string;
  trafficMedium?: string;
  trafficCampaign?: string;
  trafficReferrer?: string;
  trafficTsLink?: string;
  landingPath?: string;
};

type CreateOrderResult =
  | {
      success: true;
      orderId: string;
      orderNumber: number;
    }
  | {
      success: false;
      error: string;
    };

export async function createOrder(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  try {
    const supabase = await createClient();

    const customerName = input.customerName.trim();
    const customerPhone = input.customerPhone.trim();
    const customerEmail = input.customerEmail?.trim() || null;
    const deliveryAddress = input.deliveryAddress?.trim() || null;
    const notes = input.notes?.trim() || null;

    if (!input.storeSlug) {
      return { success: false, error: 'Falta la tienda.' };
    }

    if (!customerName) {
      return { success: false, error: 'Ingresá tu nombre.' };
    }

    if (!customerPhone) {
      return { success: false, error: 'Ingresá tu teléfono.' };
    }

    if (!Array.isArray(input.items) || input.items.length === 0) {
      return { success: false, error: 'El carrito está vacío.' };
    }

    if (input.deliveryType === 'delivery' && !deliveryAddress) {
      return { success: false, error: 'Ingresá la dirección de entrega.' };
    }

    const normalizedItems = input.items
      .filter(
        (item) =>
          item.productId &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0
      )
      .map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

    if (normalizedItems.length === 0) {
      return { success: false, error: 'No hay productos válidos en el carrito.' };
    }

    const { data, error } = await supabase.rpc('create_order_atomic', {
  p_store_slug: input.storeSlug,
  p_customer_name: customerName,
  p_customer_phone: customerPhone,
  p_customer_email: customerEmail,
  p_delivery_type: input.deliveryType,
  p_delivery_address:
    input.deliveryType === 'delivery' ? deliveryAddress : null,
  p_notes: notes,
  p_items: normalizedItems,
  p_metadata: {
    traffic_source: input.trafficSource ?? null,
    traffic_medium: input.trafficMedium ?? null,
    traffic_campaign: input.trafficCampaign ?? null,
    traffic_referrer: input.trafficReferrer ?? null,
    traffic_ts_link: input.trafficTsLink ?? null,
    landing_path: input.landingPath ?? null,
  },
});

    if (error) {
      console.error('createOrder rpc error:', error);

      return {
        success: false,
        error: error.message || 'No se pudo crear el pedido.',
      };
    }

    const row = Array.isArray(data) ? data[0] : null;

    if (!row?.order_id || !row?.order_number) {
      return {
        success: false,
        error: 'No se pudo crear el pedido.',
      };
    }

    revalidatePath(`/${input.storeSlug}`);
    revalidatePath('/admin/productos');
    revalidatePath('/admin/pedidos');

    return {
      success: true,
      orderId: row.order_id,
      orderNumber: Number(row.order_number),
    };
  } catch (error) {
    console.error('createOrder unexpected error:', error);
    return {
      success: false,
      error: 'Ocurrió un error inesperado al crear el pedido.',
    };
  }
}