'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
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
  type DeliveryType,
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

type CheckoutResult = {
  orderNumber: string | number;
  message: string;
  whatsappUrl: string;
} | null;

function isPhoneValid(phone: string) {
  const digits = phone.replace(/\D/g, '');

  return (
    /^\d{10}$/.test(digits) || // 1123456789
    /^0\d{10,11}$/.test(digits) || // 01123456789
    /^54\d{10,12}$/.test(digits) || // 541123456789
    /^549\d{10,12}$/.test(digits) || // 5491123456789
    /^\d{2,4}15\d{6,8}$/.test(digits.replace(/^0/, ''))
  );
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
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
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup');
  const [toast, setToast] = useState<ToastState>(null);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult>(null);
  const [isSubmitting, startTransition] = useTransition();
  const toastTimeoutRef = useRef<number | null>(null);

  function showToast(message: string, tone: 'success' | 'error' | 'info') {
    setToast({ message, tone });

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 2200);
  }

  function loadCart() {
    setItems(getCart(storeSlug));
  }

  function resetCheckoutResult() {
    setCheckoutResult(null);
  }

  useEffect(() => {
    loadCart();

    const saved = getCustomerData(storeSlug);
    setCustomerName(saved.name ?? '');
    setCustomerPhone(saved.phone ?? '');
    setCustomerAddress(saved.address ?? '');
    setCustomerNotes(saved.notes ?? '');
    setDeliveryType(saved.deliveryType ?? 'pickup');

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

      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [storeSlug]);

  useEffect(() => {
    saveCustomerData(storeSlug, {
      name: customerName,
      phone: customerPhone,
      address: customerAddress,
      notes: customerNotes,
      deliveryType,
    });
  }, [
    customerName,
    customerPhone,
    customerAddress,
    customerNotes,
    deliveryType,
    storeSlug,
  ]);

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
  const requiresAddress = deliveryType === 'delivery';
  const hasValidAddress = customerAddress.trim().length > 0;

  const canSend =
    validItems.length > 0 &&
    customerName.trim().length > 0 &&
    customerPhone.trim().length > 0 &&
    validPhone &&
    (!requiresAddress || hasValidAddress);

  async function handleCopyMessage() {
    if (!checkoutResult?.message) return;

    try {
      await navigator.clipboard.writeText(checkoutResult.message);
      showToast('Mensaje copiado.', 'success');
    } catch {
      showToast('No se pudo copiar el mensaje.', 'error');
    }
  }

  function handleOpenWhatsApp() {
    if (!checkoutResult?.whatsappUrl) return;

    window.open(checkoutResult.whatsappUrl, '_blank', 'noreferrer');
  }

  function handleCloseCart() {
    setOpen(false);
  }

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

    if (requiresAddress && !customerAddress.trim()) {
      showToast('Completá la dirección para envío a domicilio.', 'error');
      return;
    }

    if (validItems.length === 0) {
      showToast('No hay productos disponibles para enviar.', 'error');
      return;
    }

    startTransition(() => {
      void (async () => {
        const normalizedPhone = normalizePhone(customerPhone);

        const result = await createOrder({
          storeSlug,
          customerName: customerName.trim(),
          customerPhone: normalizedPhone,
          deliveryType,
          deliveryAddress:
            deliveryType === 'delivery' ? customerAddress.trim() : '',
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

        const message = buildWhatsAppMessage({
          storeName,
          storeSlug,
          items: validItems,
          orderNumber: result.orderNumber,
          customerName: customerName.trim(),
          customerPhone: normalizedPhone,
          deliveryType,
          deliveryAddress: customerAddress.trim(),
          notes: customerNotes.trim(),
        });

        const whatsappUrl = getWhatsAppUrl(whatsappNumber, message);

        clearCart(storeSlug);
        loadCart();

        setCheckoutResult({
          orderNumber: result.orderNumber,
          message,
          whatsappUrl,
        });

        showToast(`Pedido #${result.orderNumber} creado con éxito.`, 'success');
      })();
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
                <h2 className="text-xl font-bold">
                  {checkoutResult ? 'Pedido creado' : 'Tu carrito'}
                </h2>
                <p className="text-sm text-gray-500">{storeName}</p>
              </div>

              <button
                type="button"
                onClick={handleCloseCart}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                Cerrar
              </button>
            </div>

            {checkoutResult ? (
              <div className="flex flex-1 flex-col justify-between px-5 py-5">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                    <p className="text-sm font-semibold text-green-800">
                      Pedido #{checkoutResult.orderNumber} creado con éxito
                    </p>
                    <p className="mt-1 text-sm text-green-700">
                      Ahora podés abrir WhatsApp para enviarlo al comercio o copiar
                      el mensaje manualmente.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-900">
                      ¿Qué querés hacer ahora?
                    </p>

                    <div className="mt-4 flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={handleOpenWhatsApp}
                        className="rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white"
                      >
                        Abrir WhatsApp
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyMessage}
                        className="rounded-xl border px-4 py-3 text-sm font-medium"
                      >
                        Copiar mensaje
                      </button>

                      <button
                        type="button"
                        onClick={handleCloseCart}
                        className="rounded-xl border px-4 py-3 text-sm font-medium"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <p className="mb-2 text-sm font-medium text-gray-900">
                      Vista previa del mensaje
                    </p>
                    <pre className="whitespace-pre-wrap break-words text-xs text-gray-600">
                      {checkoutResult.message}
                    </pre>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={resetCheckoutResult}
                    className="text-sm text-gray-500 underline-offset-2 hover:underline"
                  >
                    Volver
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                                  Subtotal:{' '}
                                  {formatPrice(item.price * item.quantity)}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  removeCartItem(storeSlug, item.id);
                                  loadCart();
                                  showToast(
                                    'Producto quitado del carrito.',
                                    'info'
                                  );
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
                          Ingresá un número válido con código de área. Ej: 11
                          2345 6789
                        </p>
                      )}
                    </label>

                    <div className="space-y-2">
                      <span className="text-sm font-medium text-gray-700">
                        Tipo de entrega *
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDeliveryType('pickup')}
                          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                            deliveryType === 'pickup'
                              ? 'border-black bg-black text-white'
                              : 'border-gray-300 bg-white text-gray-700'
                          }`}
                        >
                          Retiro en local
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeliveryType('delivery')}
                          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                            deliveryType === 'delivery'
                              ? 'border-black bg-black text-white'
                              : 'border-gray-300 bg-white text-gray-700'
                          }`}
                        >
                          Envío a domicilio
                        </button>
                      </div>
                    </div>

                    {deliveryType === 'delivery' && (
                      <label className="block space-y-2">
                        <span className="text-sm font-medium text-gray-700">
                          Dirección *
                        </span>
                        <input
                          type="text"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="Ej: Av. Siempreviva 123"
                          className="w-full rounded-xl border px-4 py-3 text-sm"
                        />
                        {requiresAddress && !hasValidAddress && (
                          <p className="text-xs text-red-600">
                            La dirección es obligatoria para envío a domicilio.
                          </p>
                        )}
                      </label>
                    )}

                    {deliveryType === 'pickup' && (
                      <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600">
                        Vas a retirar tu pedido en el local.
                      </div>
                    )}

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

                  <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600">
                    <p>
                      <strong>Entrega:</strong>{' '}
                      {deliveryType === 'delivery'
                        ? 'Envío a domicilio'
                        : 'Retiro en local'}
                    </p>
                    {deliveryType === 'delivery' && customerAddress.trim() && (
                      <p className="mt-1">
                        <strong>Dirección:</strong> {customerAddress.trim()}
                      </p>
                    )}
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
                      {isSubmitting ? 'Creando pedido...' : 'Crear pedido'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && <StoreToast message={toast.message} tone={toast.tone} />}
    </>
  );
}