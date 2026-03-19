'use client';

import { useState } from 'react';

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

function normalizeArgentinaWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');

  if (!digits) return null;

  // ya viene perfecto
  if (/^549\d{10,12}$/.test(digits)) {
    return digits;
  }

  // empieza con 54
  if (/^54\d{10,12}$/.test(digits)) {
    const rest = digits.slice(2).replace(/^0/, '');

    const match = rest.match(/^(\d{2,4})15?(\d{6,8})$/);
    if (match) {
      return `549${match[1]}${match[2]}`;
    }

    return `549${rest}`;
  }

  // formato local argentino
  const localMatch = digits.match(/^0?(\d{2,4})15?(\d{6,8})$/);
  if (localMatch) {
    return `549${localMatch[1]}${localMatch[2]}`;
  }

  return null;
}

export default function OrderWhatsAppButton({
  phone,
  customerName,
  orderNumber,
  total,
  status,
}: Props) {
  const [error, setError] = useState<string | null>(null);

  if (!phone) {
    return (
      <p className="text-xs text-red-500">
        ⚠ Este pedido no tiene teléfono cargado
      </p>
    );
  }

  const normalizedPhone = normalizeArgentinaWhatsAppPhone(phone);

  function handleClick(e: React.MouseEvent) {
    if (!normalizedPhone) {
      e.preventDefault();
      setError(
        'Número inválido. Revisá el teléfono del cliente (debe incluir código de área).'
      );
    }
  }

  if (!normalizedPhone) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() =>
            setError(
              'Número inválido. Revisá el teléfono del cliente (ej: 11 2345 6789).'
            )
          }
          className="inline-flex items-center gap-2 rounded-2xl bg-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 cursor-not-allowed"
        >
          💬 WhatsApp no disponible
        </button>

        {error && (
          <p className="text-xs text-red-500 leading-snug">{error}</p>
        )}
      </div>
    );
  }

  const message = `Hola${customerName ? ` ${customerName}` : ''} 👋
Te escribimos por tu pedido #${orderNumber ?? ''}.
Estado actual: ${getStatusText(status)}.
Total: $${total}.`;

  const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
    message
  )}`;

  return (
    <div className="space-y-1">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-700"
      >
        💬 Enviar WhatsApp
      </a>

      {error && (
        <p className="text-xs text-red-500 leading-snug">{error}</p>
      )}
    </div>
  );
}