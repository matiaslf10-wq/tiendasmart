type Props = {
  customerName?: string | null;
  customerPhone?: string | null;
  orderNumber?: number | null;
  compact?: boolean;
};

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

export default function OrderWhatsAppButton({
  customerName,
  customerPhone,
  orderNumber,
  compact = false,
}: Props) {
  if (!customerPhone) {
    return null;
  }

  const normalizedPhone = normalizePhone(customerPhone);

  if (!normalizedPhone) {
    return null;
  }

  const message = encodeURIComponent(
    `Hola${customerName ? ` ${customerName}` : ''}${
      orderNumber ? `, te escribimos por tu pedido #${orderNumber}` : ''
    }.`
  );

  const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={
        compact
          ? 'inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100'
          : 'inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100'
      }
    >
      WhatsApp
    </a>
  );
}