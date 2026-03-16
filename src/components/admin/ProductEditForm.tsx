'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  updateProduct,
  toggleProductActive,
  deleteProductImage,
} from '@/app/admin/productos/actions';

type ProductImage = {
  id: string;
  image_url: string;
  is_cover: boolean;
  sort_order?: number | null;
};

type CategoryOption = {
  id: string;
  name: string;
  is_active?: boolean;
  sort_order?: number;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  category_id?: string | null;
  product_images?: ProductImage[];
};

export default function ProductEditForm({
  product,
  categories,
}: {
  product: Product;
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState(false);

  const existingImages = product.product_images || [];
  const remainingSlots = Math.max(0, 5 - existingImages.length);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [newFiles, setNewFiles] = useState<(File | null)[]>(
    Array.from({ length: remainingSlots }, () => null)
  );

  const [selectedCoverId, setSelectedCoverId] = useState<string>(
    existingImages.find((img) => img.is_cover)?.id || existingImages[0]?.id || ''
  );

  useEffect(() => {
    setSelectedCoverId(
      existingImages.find((img) => img.is_cover)?.id || existingImages[0]?.id || ''
    );
  }, [product.id, existingImages]);

  function openPicker(index: number) {
    inputRefs.current[index]?.click();
  }

  function handleNewFileChange(index: number, fileList: FileList | null) {
    const file = fileList && fileList[0] ? fileList[0] : null;

    setNewFiles((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
  }

  const newPreviews = useMemo(() => {
    return newFiles.map((file) => ({
      fileName: file?.name || '',
      previewUrl: file ? URL.createObjectURL(file) : null,
    }));
  }, [newFiles]);

  useEffect(() => {
    return () => {
      newPreviews.forEach((preview) => {
        if (preview.previewUrl) {
          URL.revokeObjectURL(preview.previewUrl);
        }
      });
    };
  }, [newPreviews]);

  return (
    <article className="rounded-2xl border p-4 space-y-3">
      <div className="flex items-start gap-4">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-24 w-24 rounded-xl border object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-xl border text-sm text-gray-400">
            Sin imagen
          </div>
        )}

        <div className="flex-1 space-y-2">
          <h3 className="text-lg font-semibold">{product.name}</h3>

          <p className="text-gray-600">
            ${Number(product.price).toLocaleString('es-AR')}
          </p>

          {product.description && (
            <p className="text-sm text-gray-700">{product.description}</p>
          )}

          <p className="text-sm">
            Estado: {product.is_active ? 'Activo' : 'Inactivo'}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="rounded-xl border px-4 py-2"
            >
              {open ? 'Cerrar edición' : 'Editar'}
            </button>

            <form action={toggleProductActive}>
              <input type="hidden" name="product_id" value={product.id} />
              <input
                type="hidden"
                name="current_value"
                value={String(product.is_active)}
              />
              <button
                type="submit"
                className="rounded-xl bg-black px-4 py-2 text-white"
              >
                {product.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t pt-3">
          <div className="space-y-3">
            <p className="text-sm font-medium">Fotos actuales</p>

            {existingImages.length === 0 ? (
              <p className="text-sm text-gray-500">No hay fotos todavía.</p>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {existingImages.map((image) => (
                    <div key={image.id} className="space-y-2 rounded-2xl border p-3">
                      <button
                        type="button"
                        onClick={() => setSelectedCoverId(image.id)}
                        className={`relative block h-40 w-full overflow-hidden rounded-xl border ${
                          selectedCoverId === image.id ? 'ring-2 ring-black' : ''
                        }`}
                      >
                        <img
                          src={image.image_url}
                          alt="Imagen del producto"
                          className="h-full w-full object-cover"
                        />

                        {selectedCoverId === image.id && (
                          <div className="absolute left-2 top-2 rounded-full bg-black px-3 py-1 text-xs text-white">
                            Portada
                          </div>
                        )}
                      </button>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCoverId(image.id)}
                          className="rounded-xl border px-4 py-2 text-sm"
                        >
                          {selectedCoverId === image.id
                            ? 'Portada seleccionada'
                            : 'Usar como portada'}
                        </button>

                        <form action={deleteProductImage}>
                          <input type="hidden" name="product_id" value={product.id} />
                          <input type="hidden" name="image_id" value={image.id} />
                          <button
                            type="submit"
                            className="rounded-xl border px-4 py-2 text-sm"
                          >
                            Eliminar foto
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-gray-600">
                  Hacé click sobre una miniatura para seleccionarla como portada.
                </p>
              </>
            )}
          </div>

          <form action={updateProduct} className="grid gap-4">
            <input type="hidden" name="product_id" value={product.id} />
            <input type="hidden" name="cover_image_id" value={selectedCoverId} />

            <label className="block space-y-2">
              <span className="text-sm font-medium">Nombre</span>
              <input
                type="text"
                name="name"
                defaultValue={product.name}
                className="w-full rounded-xl border px-4 py-3"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Precio</span>
              <input
                type="number"
                name="price"
                defaultValue={String(product.price)}
                step="0.01"
                min="0"
                className="w-full rounded-xl border px-4 py-3"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Categoría</span>
              <select
                name="category_id"
                defaultValue={product.category_id ?? ''}
                className="w-full rounded-xl border px-4 py-3"
              >
                <option value="">Sin categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Descripción</span>
              <textarea
                name="description"
                defaultValue={product.description ?? ''}
                className="min-h-24 w-full rounded-xl border px-4 py-3"
              />
            </label>

            {remainingSlots > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Agregar más fotos ({remainingSlots} disponibles)
                </p>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: remainingSlots }).map((_, index) => {
                    const preview = newPreviews[index];

                    return (
                      <div key={index} className="rounded-2xl border p-3 space-y-3">
                        <input
                          ref={(el) => {
                            inputRefs.current[index] = el;
                          }}
                          type="file"
                          name={`new_image_file_${index}`}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleNewFileChange(index, e.target.files)}
                        />

                        <div className="h-40 overflow-hidden rounded-xl border bg-gray-50">
                          {preview?.previewUrl ? (
                            <img
                              src={preview.previewUrl}
                              alt={`Nueva imagen ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-gray-400">
                              Sin imagen
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => openPicker(index)}
                          className="rounded-xl border px-4 py-2"
                        >
                          Subir foto
                        </button>

                        <p className="text-sm text-gray-600">
                          {preview?.fileName || 'Ningún archivo seleccionado'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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