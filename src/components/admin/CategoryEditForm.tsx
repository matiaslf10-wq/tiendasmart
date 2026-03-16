'use client';

import { useState } from 'react';
import {
  updateCategory,
  toggleCategoryActive,
  deleteCategory,
} from '@/app/admin/categorias/actions';

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

export default function CategoryEditForm({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-2xl border p-4 space-y-3">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{category.name}</h3>

          <p className="text-sm text-gray-600">Slug: {category.slug}</p>

          {category.description && (
            <p className="text-sm text-gray-700">{category.description}</p>
          )}

          <p className="text-sm text-gray-600">Orden: {category.sort_order}</p>

          <p className="text-sm">
            Estado: {category.is_active ? 'Activa' : 'Inactiva'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-xl border px-4 py-2"
          >
            {open ? 'Cerrar edición' : 'Editar'}
          </button>

          <form action={toggleCategoryActive}>
            <input type="hidden" name="category_id" value={category.id} />
            <input
              type="hidden"
              name="current_value"
              value={String(category.is_active)}
            />
            <button
              type="submit"
              className="rounded-xl bg-black px-4 py-2 text-white"
            >
              {category.is_active ? 'Desactivar' : 'Activar'}
            </button>
          </form>

          <form action={deleteCategory}>
            <input type="hidden" name="category_id" value={category.id} />
            <button
              type="submit"
              className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Eliminar
            </button>
          </form>
        </div>
      </div>

      {open && (
        <div className="border-t pt-3">
          <form action={updateCategory} className="grid gap-4">
            <input type="hidden" name="category_id" value={category.id} />

            <label className="block space-y-2">
              <span className="text-sm font-medium">Nombre</span>
              <input
                type="text"
                name="name"
                defaultValue={category.name}
                className="w-full rounded-xl border px-4 py-3"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Slug</span>
              <input
                type="text"
                name="slug"
                defaultValue={category.slug}
                className="w-full rounded-xl border px-4 py-3"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Descripción</span>
              <textarea
                name="description"
                defaultValue={category.description ?? ''}
                className="min-h-24 w-full rounded-xl border px-4 py-3"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Orden</span>
              <input
                type="number"
                name="sort_order"
                defaultValue={String(category.sort_order)}
                min="0"
                step="1"
                className="w-full rounded-xl border px-4 py-3"
                required
              />
            </label>

            <button
              type="submit"
              className="w-fit rounded-xl bg-black px-5 py-3 text-white"
            >
              Guardar cambios
            </button>
          </form>
        </div>
      )}
    </article>
  );
}