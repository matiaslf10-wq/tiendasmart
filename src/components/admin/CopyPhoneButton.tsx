'use client';

import { useState } from 'react';

type Props = {
  phone: string | null;
};

export default function CopyPhoneButton({ phone }: Props) {
  const [message, setMessage] = useState<string | null>(null);

  async function handleCopy() {
    if (!phone || !phone.trim()) {
      setMessage('No hay teléfono para copiar.');
      window.setTimeout(() => setMessage(null), 1800);
      return;
    }

    try {
      await navigator.clipboard.writeText(phone.trim());
      setMessage('Teléfono copiado.');
    } catch {
      setMessage('No se pudo copiar.');
    }

    window.setTimeout(() => setMessage(null), 1800);
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
      >
        📋 Copiar teléfono
      </button>

      {message ? (
        <p className="text-xs text-gray-500">{message}</p>
      ) : null}
    </div>
  );
}