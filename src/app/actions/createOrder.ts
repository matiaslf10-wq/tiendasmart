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

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, slug, name, is_active')
      .eq('slug', input.storeSlug)
      .eq('is_active', true)
      .single();

    if (storeError || !store) {
      console.error('createOrder storeError:', storeError);
      return { success: false, error: 'No se encontró la tienda.' };
    }

    const productIds = [...new Set(normalizedItems.map((item) => item.productId))];

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        is_active,
        track_stock,
        stock_quantity,
        allow_backorder
      `)
      .eq('store_id', store.id)
      .in('id', productIds);

    if (productsError) {
      console.error('createOrder productsError:', productsError);
      return { success: false, error: 'No se pudieron validar los productos.' };
    }

    const productsMap = new Map(
      (products ?? []).map((product) => [product.id, product])
    );

    let subtotal = 0;

    const orderItemsToInsert: Array<{
      product_id: string;
      product_name: string;
      unit_price: number;
      quantity: number;
      line_total: number;
    }> = [];

    for (const item of normalizedItems) {
      const product = productsMap.get(item.productId);

      if (!product) {
        return { success: false, error: 'Uno de los productos ya no existe.' };
      }

      if (!product.is_active) {
        return {
          success: false,
          error: `El producto "${product.name}" no está disponible.`,
        };
      }

      const unitPrice = Number(product.price ?? 0);
      const trackStock = Boolean(product.track_stock);
      const allowBackorder = Boolean(product.allow_backorder);
      const stockQuantity = Number(product.stock_quantity ?? 0);

      if (trackStock && !allowBackorder && item.quantity > stockQuantity) {
        return {
          success: false,
          error: `No hay stock suficiente para "${product.name}". Stock disponible: ${stockQuantity}.`,
        };
      }

      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      orderItemsToInsert.push({
        product_id: product.id,
        product_name: product.name,
        unit_price: unitPrice,
        quantity: item.quantity,
        line_total: lineTotal,
      });
    }

    const shippingCost = 0;
    const total = subtotal + shippingCost;

    const orderPayload = {
      store_id: store.id,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      delivery_type: input.deliveryType,
      delivery_address:
        input.deliveryType === 'delivery' ? deliveryAddress : null,
      notes,
      subtotal,
      shipping_cost: shippingCost,
      total,
      currency: 'ARS',
      status: 'pending',
      source: 'web',
    };

    console.log('createOrder orderPayload:', orderPayload);

    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select('id, order_number')
      .single();

    if (orderError || !insertedOrder) {
      console.error('createOrder orderError:', orderError);
      return {
        success: false,
        error: `No se pudo crear el pedido.${orderError?.message ? ` ${orderError.message}` : ''}`,
      };
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      orderItemsToInsert.map((item) => ({
        order_id: insertedOrder.id,
        product_id: item.product_id,
        product_name: item.product_name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_total: item.line_total,
      }))
    );

    if (itemsError) {
      console.error('createOrder itemsError:', itemsError);
      await supabase.from('orders').delete().eq('id', insertedOrder.id);
      return {
        success: false,
        error: `No se pudieron guardar los items del pedido.${itemsError.message ? ` ${itemsError.message}` : ''}`,
      };
    }

    for (const item of normalizedItems) {
      const product = productsMap.get(item.productId)!;
      const trackStock = Boolean(product.track_stock);
      const allowBackorder = Boolean(product.allow_backorder);
      const currentStock = Number(product.stock_quantity ?? 0);

      if (!trackStock) {
        continue;
      }

      const newStock = allowBackorder
        ? currentStock
        : Math.max(0, currentStock - item.quantity);

      const { error: stockError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', product.id)
        .eq('store_id', store.id);

      if (stockError) {
        console.error('createOrder stockError:', stockError);
        return {
          success: false,
          error:
            'El pedido se creó, pero hubo un problema al actualizar el stock. Revisalo en admin.',
        };
      }
    }

    revalidatePath(`/${store.slug}`);
    revalidatePath('/admin/productos');
    revalidatePath('/admin/pedidos');

    return {
      success: true,
      orderId: insertedOrder.id,
      orderNumber: insertedOrder.order_number,
    };
  } catch (error) {
    console.error('createOrder unexpected error:', error);
    return {
      success: false,
      error: 'Ocurrió un error inesperado al crear el pedido.',
    };
  }
}