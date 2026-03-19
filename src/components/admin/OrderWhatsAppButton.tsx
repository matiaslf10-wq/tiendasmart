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

  // ya viene en formato whatsapp argentino correcto
  if (/^549\d{10,12}$/.test(digits)) {
    return digits;
  }

  // +54 ... pero falta el 9
  if (/^54\d{10,12}$/.test(digits)) {
    const rest = digits.slice(2);

    // casos tipo 54 11 23456789
    if (/^\d{10,12}$/.test(rest)) {
      return `549${rest}`;
    }
  }

  // formato local CABA / AMBA: 1123456789
  if (/^\d{10}$/.test(digits)) {
    return `549${digits}`;
  }

  // formato local con 0 adelante: 01123456789
  if (/^0\d{10,11}$/.test(digits)) {
    return `549${digits.slice(1)}`;
  }

  // formato con 15: 0111523456789 / 1152345678
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
          className="inline-flex items-center gap-2 rounded-2xl bg-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
        >
          💬 WhatsApp no disponible
        </button>

        {showError && (
          <p className="text-xs leading-snug text-red-500">
            Número inválido: <span className="font-medium">{phone}</span>.  
            Usá formato como 11 2345 6789, 011 15 2345 6789 o +54 9 11 2345 6789.
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
      className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-700"
    >
      💬 Enviar WhatsApp
    </a>
  );
}