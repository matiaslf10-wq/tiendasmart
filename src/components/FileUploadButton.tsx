'use client';

import type { ChangeEvent } from 'react';

type Props = {
  id: string;
  name: string;
  label?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
};

export default function FileUploadButton({
  id,
  name,
  label = 'Subir imagen',
  onChange,
}: Props) {
  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor={id}
        className="cursor-pointer rounded-2xl bg-gradient-to-r from-gray-900 to-gray-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
      >
        {label}
      </label>

      <input
        id={id}
        name={name}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}