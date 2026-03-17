'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  buildWhatsAppMessage,
  clearCart,
  decreaseCartItem,
  formatPrice,
  getCart,
  getWhatsAppUrl,
  increaseCartItem,
  removeCartItem,
  type CartItem,
} from '@/lib/cart';

type WhatsAppCartProps = {
  storeSlug: string;
  storeName: string;
  whatsappNumber: string;
};

export default function WhatsAppCart({
  storeSlug,
  storeName,
  whatsappNumber,
}: WhatsAppCartProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);

  function loadCart() {
    setItems(getCart(storeSlug));
  }

  useEffect(() => {
    loadCart();

    function onUpdate() {
      loadCart();
    }

    window.addEventListener('cart-updated', onUpdate as EventListener);

    return () => {
      window.removeEventListener('cart-updated', onUpdate as EventListener);
    };
  }, [storeSlug]);

  const totalItems = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  const totalPrice = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity * item.price, 0),
    [items]
  );

  const whatsappUrl = useMemo(() => {
    const message = buildWhatsAppMessage({
      storeName,
      storeSlug,
      items,
    });

    return getWhatsAppUrl(whatsappNumber, message);
  }, [items, storeName, storeSlug, whatsappNumber]);

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

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <p className="text-sm text-gray-600">
                  Todavía no agregaste productos.
                </p>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold">{item.name}</h3>
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
                          className="rounded-xl border px-3 py-1"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t px-5 py-4 space-y-3">
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
                  }}
                  className="rounded-xl border px-4 py-3 text-sm"
                  disabled={items.length === 0}
                >
                  Vaciar
                </button>

                <a
                  href={items.length > 0 ? whatsappUrl : '#'}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex-1 rounded-xl px-4 py-3 text-center text-sm font-semibold ${
                    items.length > 0
                      ? 'bg-green-600 text-white'
                      : 'pointer-events-none bg-gray-200 text-gray-500'
                  }`}
                >
                  Enviar por WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}