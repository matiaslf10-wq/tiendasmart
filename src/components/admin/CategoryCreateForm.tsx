'use client';

import { useFormStatus } from 'react-dom';
import { createCategory } from '@/app/admin/categorias/actions';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-fit rounded-xl bg-black px-5 py-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Creando categoría...' : 'Crear categoría'}
    </button>
  );
}

export default function CategoryCreateForm() {
  return (
    <form action={createCategory} className="grid gap-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium">Nombre</span>
        <input
          type="text"
          name="name"
          className="w-full rounded-xl border px-4 py-3"
          placeholder="Ej: Tortas"
          required
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Slug</span>
        <input
          type="text"
          name="slug"
          className="w-full rounded-xl border px-4 py-3"
          placeholder="Ej: tortas"
        />
        <p className="text-sm text-gray-500">
          Si lo dejás vacío, se genera automáticamente a partir del nombre.
        </p>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Descripción</span>
        <textarea
          name="description"
          className="min-h-24 w-full rounded-xl border px-4 py-3"
          placeholder="Descripción opcional"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Orden</span>
        <input
          type="number"
          name="sort_order"
          defaultValue="0"
          min="0"
          step="1"
          className="w-full rounded-xl border px-4 py-3"
        />
      </label>

      <SubmitButton />
    </form>
  );
}