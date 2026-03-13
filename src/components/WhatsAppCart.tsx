'use client';

import { useCart } from '@/context/cart';

export default function WhatsAppCart({ phone }: { phone: string }) {
  const { cart, clearCart } = useCart();

  if (!cart.length) return null;

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const message = `Hola! Quiero hacer este pedido:

${cart.map((item) => `${item.quantity} × ${item.name} - $${item.price}`).join('\n')}

Total: $${total}`;

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 rounded-full bg-green-600 px-6 py-4 text-white shadow-lg"
      onClick={() => clearCart()}
    >
      Enviar pedido por WhatsApp
    </a>
  );
}