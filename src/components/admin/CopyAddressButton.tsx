'use client';

import { useState } from 'react';

type Props = {
  address: string;
};

export default function CopyAddressButton({ address }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
    >
      {copied ? '✅ Dirección copiada' : '📍 Copiar dirección'}
    </button>
  );
}