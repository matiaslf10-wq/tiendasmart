'use client';

import { useState } from 'react';

type Props = {
  value: string;
  label?: string;
};

export default function CopyToClipboardButton({ value, label }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('No se pudo copiar');
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
    >
      {copied ? 'Copiado ✓' : label ?? 'Copiar'}
    </button>
  );
}