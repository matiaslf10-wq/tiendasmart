'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  buildWhatsAppMessage,
  clearCart,
  decreaseCartItem,
  formatPrice,
  getCart,
  getCustomerData,
  getWhatsAppUrl,
  increaseCartItem,
  removeCartItem,
  saveCustomerData,
  type CartItem,
} from '@/lib/cart';
import {
  canPurchase,
  getMaxPurchasableQuantity,
  getStockLabel,
} from '@/lib/stock';
import StoreToast from '@/components/store/StoreToast';
import { createOrder } from '@/app/actions/createOrder';

type WhatsAppCartProps = {
  storeSlug: string;
  storeName: string;
  whatsappNumber: string;
};

type ToastState = {
  message: string;
  tone: 'success' | 'error' | 'info';
} | null;

function isPhoneValid(phone: string) {
  const digits = phone.replace(/\D/g, '');

  return (
    /^\d{10}$/.test(digits) ||       // 1123456789
    /^0\d{10,11}$/.test(digits) ||   // 01123456789
    /^54\d{10,12}$/.test(digits) ||  // 541123456789
    /^549\d{10,12}$/.test(digits) || // 5491123456789
    /^\d{2,4}15\d{6,8}$/.test(digits.replace(/^0/, ''))
  );
}

export default function WhatsAppCart({
  storeSlug,
  storeName,
  whatsappNumber,
}: WhatsAppCartProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const [isSubmitting, startTransition] = useTransition();

  function showToast(message: string, tone: 'success' | 'error' | 'info') {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 2200);
  }

  function loadCart() {
    setItems(getCart(storeSlug));
  }

  useEffect(() => {
    loadCart();

    const saved = getCustomerData(storeSlug);
    setCustomerName(saved.name ?? '');
    setCustomerPhone(saved.phone ?? '');
    setCustomerAddress(saved.address ?? '');
    setCustomerNotes(saved.notes ?? '');

    function onUpdate() {
      loadCart();
    }

    function onOpenCart() {
      setOpen(true);
    }

    window.addEventListener('cart-updated', onUpdate as EventListener);
    window.addEventListener('open-cart', onOpenCart as EventListener);

    return () => {
      window.removeEventListener('cart-updated', onUpdate as EventListener);
      window.removeEventListener('open-cart', onOpenCart as EventListener);
    };
  }, [storeSlug]);

  useEffect(() => {
    saveCustomerData(storeSlug, {
      name: customerName,
      phone: customerPhone,
      address: customerAddress,
      notes: customerNotes,
    });
  }, [customerName, customerPhone, customerAddress, customerNotes, storeSlug]);

  const validItems = useMemo(
    () => items.filter((item) => canPurchase(item) && item.quantity > 0),
    [items]
  );

  const totalItems = useMemo(
    () => validItems.reduce((acc, item) => acc + item.quantity, 0),
    [validItems]
  );

  const totalPrice = useMemo(
    () => validItems.reduce((acc, item) => acc + item.quantity * item.price, 0),
    [validItems]
  );

  const validPhone = isPhoneValid(customerPhone);

  const canSend =
    validItems.length > 0 &&
    customerName.trim().length > 0 &&
    customerPhone.trim().length > 0 &&
    validPhone;

  async function handleSubmitOrder() {
    if (!customerName.trim()) {
      showToast('Completá tu nombre.', 'error');
      return;
    }

    if (!customerPhone.trim()) {
      showToast('Completá tu teléfono.', 'error');
      return;
    }

    if (!validPhone) {
      showToast('Ingresá un teléfono válido con código de área.', 'error');
      return;
    }

    if (validItems.length === 0) {
      showToast('No hay productos disponibles para enviar.', 'error');
      return;
    }

    startTransition(async () => {
      const result = await createOrder({
        storeSlug,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryType: customerAddress.trim() ? 'delivery' : 'pickup',
        deliveryAddress: customerAddress.trim(),
        notes: customerNotes.trim(),
        items: validItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      });

      if (!result.success) {
        showToast(result.error, 'error');
        return;
      }

      const baseMessage = buildWhatsAppMessage({
        storeName,
        storeSlug,
        items: validItems,
      });

      const extraLines = [
        '',
        `*Pedido:* #${result.orderNumber}`,
        '',
        '*Datos del cliente:*',
        `- Nombre: ${customerName.trim() || 'No informado'}`,
        `- Teléfono: ${customerPhone.trim() || 'No informado'}`,
        `- Dirección: ${customerAddress.trim() || 'No informada'}`,
        `- Observaciones: ${customerNotes.trim() || 'Sin observaciones'}`,
      ];

      const whatsappUrl = getWhatsAppUrl(
        whatsappNumber,
        `${baseMessage}\n${extraLines.join('\n')}`
      );

      clearCart(storeSlug);
      loadCart();

      showToast(`Pedido #${result.orderNumber} creado con éxito.`, 'success');

      window.open(whatsappUrl, '_blank', 'noreferrer');
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg"
      >
        Carrito ({totalItems})
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-xl font-bold">Tu carrito</h2>
                <p className="text-sm text-gray-500">{storeName}</p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                Cerrar
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <p className="text-sm text-gray-600">
                  Todavía no agregaste productos.
                </p>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => {
                    const purchasable = canPurchase(item);
                    const maxQty = getMaxPurchasableQuantity(item);
                    const stockLabel = getStockLabel(item);
                    const reachedMax =
                      Number.isFinite(maxQty) && item.quantity >= maxQty;

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-gray-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold">{item.name}</h3>

                            <p className="mt-1 text-xs text-gray-500">
                              {stockLabel}
                            </p>

                            <p className="text-sm text-gray-500">
                              {formatPrice(item.price)} c/u
                            </p>

                            <p className="mt-1 text-sm font-medium">
                              Subtotal: {formatPrice(item.price * item.quantity)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              removeCartItem(storeSlug, item.id);
                              loadCart();
                              showToast('Producto quitado del carrito.', 'info');
                            }}
                            className="text-sm text-red-600"
                          >
                            Quitar
                          </button>
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              decreaseCartItem(storeSlug, item.id);
                              loadCart();
                            }}
                            className="rounded-xl border px-3 py-1"
                          >
                            -
                          </button>

                          <span className="min-w-6 text-center font-semibold">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              increaseCartItem(storeSlug, item.id);
                              loadCart();
                            }}
                            disabled={!purchasable || reachedMax}
                            className="rounded-xl border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>

                        {reachedMax && (
                          <p className="mt-2 text-xs text-red-600">
                            Sin stock
                          </p>
                        )}

                        {!purchasable && (
                          <p className="mt-2 text-xs text-red-600">
                            Este producto ya no está disponible.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <section className="space-y-4 rounded-2xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900">Tus datos</h3>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">
                    Nombre *
                  </span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ej: María"
                    className="w-full rounded-xl border px-4 py-3 text-sm"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">
                    Teléfono *
                  </span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Ej: 11 2345 6789"
                    className="w-full rounded-xl border px-4 py-3 text-sm"
                  />
                  {customerPhone.trim().length > 0 && !validPhone && (
                    <p className="text-xs text-red-600">
                      Ingresá un número válido con código de área. Ej: 11 2345 6789
                    </p>
                  )}
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">
                    Dirección
                  </span>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Ej: Av. Siempreviva 123"
                    className="w-full rounded-xl border px-4 py-3 text-sm"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">
                    Observaciones
                  </span>
                  <textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Ej: sin cebolla, tocar timbre, pagar en efectivo"
                    className="min-h-24 w-full rounded-xl border px-4 py-3 text-sm"
                  />
                </label>

                <p className="text-xs text-gray-500">
                  Para enviar el pedido, completá tu nombre y tu teléfono.
                </p>

                {items.length > 0 && validItems.length === 0 && (
                  <p className="text-xs text-red-600">
                    No hay productos disponibles para enviar en este momento.
                  </p>
                )}
              </section>
            </div>

            <div className="space-y-3 border-t px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span>Total</span>
                <strong>{formatPrice(totalPrice)}</strong>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    clearCart(storeSlug);
                    loadCart();
                    showToast('Carrito vaciado.', 'info');
                  }}
                  className="rounded-xl border px-4 py-3 text-sm"
                  disabled={items.length === 0 || isSubmitting}
                >
                  Vaciar
                </button>

                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={!canSend || isSubmitting}
                  className={`flex-1 rounded-xl px-4 py-3 text-center text-sm font-semibold ${
                    canSend && !isSubmitting
                      ? 'bg-green-600 text-white'
                      : 'cursor-not-allowed bg-gray-200 text-gray-500'
                  }`}
                >
                  {isSubmitting ? 'Creando pedido...' : 'Enviar por WhatsApp'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <StoreToast message={toast.message} tone={toast.tone} />}
    </>
  );
}