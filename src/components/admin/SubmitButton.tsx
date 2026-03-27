'use client';

import { useFormStatus } from 'react-dom';

type SubmitButtonProps = {
  children?: React.ReactNode;
  pendingLabel?: string;
  className?: string;
};

export default function SubmitButton({
  children = 'Guardar cambios',
  pendingLabel = 'Guardando...',
  className = '',
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}