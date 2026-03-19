'use client';

type Props = {
  phone: string | null;
  customerName: string | null;
  orderNumber: number | null;
  total: number;
  status: string;
};

function getStatusText(status: string) {
  switch (status) {
    case 'pending':
      return 'pendiente';
    case 'confirmed':
      return 'confirmado';
    case 'in_preparation':
      return 'en preparación';
    case 'ready':
      return 'listo';
    case 'delivered':
      return 'entregado';
    case 'cancelled':
      return 'cancelado';
    default:
      return status;
  }
}

function normalizePhone(phone: string) {
  // elimina todo lo que no sea número
  const cleaned = phone.replace(/\D/g, '');

  // si empieza con 0 lo sacamos
  if (cleaned.startsWith('0')) {
    return cleaned.slice(1);
  }

  return cleaned;
}

export default function OrderWhatsAppButton({
  phone,
  customerName,
  orderNumber,
  total,
  status,
}: Props) {
  if (!phone) return null;

  const normalizedPhone = normalizePhone(phone);

  const message = `Hola ${customerName ?? ''} 👋
Tu pedido #${orderNumber} está ${getStatusText(status)}.
Total: $${total}`;

  const url = `https://wa.me/54${normalizedPhone}?text=${encodeURIComponent(
    message
  )}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-700"
    >
      💬 Enviar WhatsApp
    </a>
  );
}