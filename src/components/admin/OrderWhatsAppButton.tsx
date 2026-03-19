'use client';

import { useState } from 'react';

type Props = {
  phone: string | null;
  customerName: string | null;
  orderNumber: number | null;
  total: number;
  status: string;
  compact?: boolean;
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

function normalizeArgentinaWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');

  if (!digits) return null;

  if (/^549\d{10,12}$/.test(digits)) {
    return digits;
  }

  if (/^54\d{10,12}$/.test(digits)) {
    const rest = digits.slice(2);

    if (/^\d{10,12}$/.test(rest)) {
      return `549${rest}`;
    }
  }

  if (/^\d{10}$/.test(digits)) {
    return `549${digits}`;
  }

  if (/^0\d{10,11}$/.test(digits)) {
    return `549${digits.slice(1)}`;
  }

  const withoutLeadingZero = digits.replace(/^0/, '');
  const matchWith15 = withoutLeadingZero.match(/^(\d{2,4})15(\d{6,8})$/);

  if (matchWith15) {
    return `549${matchWith15[1]}${matchWith15[2]}`;
  }

  return null;
}

export default function OrderWhatsAppButton({
  phone,
  customerName,
  orderNumber,
  total,
  status,
  compact = false,
}: Props) {
  const [showError, setShowError] = useState(false);

  if (!phone || !phone.trim()) {
    return (
      <p className="text-xs text-red-500">
        ⚠ Este pedido no tiene teléfono cargado.
      </p>
    );
  }

  const normalizedPhone = normalizeArgentinaWhatsAppPhone(phone);

  const message = `Hola${customerName ? ` ${customerName}` : ''} 👋
Te escribimos por tu pedido #${orderNumber ?? ''}.
Estado actual: ${getStatusText(status)}.
Total: $${total}.`;

  if (!normalizedPhone) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setShowError(true)}
          className={`inline-flex items-center gap-2 rounded-2xl ${
            compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
          } bg-gray-300 font-semibold text-gray-700`}
        >
          💬 WhatsApp no disponible
        </button>

        {showError && (
          <p className="text-xs leading-snug text-red-500">
            Número inválido: <span className="font-medium">{phone}</span>. Usá
            formato como 11 2345 6789, 011 15 2345 6789 o +54 9 11 2345 6789.
          </p>
        )}
      </div>
    );
  }

  const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
    message
  )}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-2xl bg-green-600 font-semibold text-white shadow hover:bg-green-700 ${
        compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
      }`}
    >
      {compact ? '💬 WhatsApp' : '💬 Enviar WhatsApp'}
    </a>
  );
}