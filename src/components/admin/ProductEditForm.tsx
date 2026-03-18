'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  updateProduct,
  toggleProductActive,
  deleteProductImage,
} from '@/app/admin/productos/actions';
import { uploadProductImageFromClient } from '@/lib/storage-client';

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
  image_url?: string | null;
  is_active?: boolean | null;
  category_id?: string | null;
  track_stock?: boolean | null;
  stock_quantity?: number | null;
  allow_backorder?: boolean | null;
  product_images?: ProductImage[];
};

type ProductEditFormProps = {
  product: Product;
  categories: CategoryOption[];
};

type UploadSlot = {
  fileName: string;
  previewUrl: string | null;
  uploadedUrl: string | null;
  isUploading: boolean;
  error: string | null;
};

const MAX_FILE_SIZE_MB = 3;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

function createEmptySlot(): UploadSlot {
  return {
    fileName: '',
    previewUrl: null,
    uploadedUrl: null,
    isUploading: false,
    error: null,
  };
}

export default function ProductEditForm({
  product,
  categories,
}: ProductEditFormProps) {
  const [open, setOpen] = useState(false);
  const [trackStock, setTrackStock] = useState(!!product.track_stock);

  const existingImages = product.product_images || [];
  const remainingSlots = Math.max(0, 5 - existingImages.length);

  const [newSlots, setNewSlots] = useState<UploadSlot[]>(
    Array.from({ length: remainingSlots }, () => createEmptySlot())
  );

  const [selectedCoverId, setSelectedCoverId] = useState<string>(
    existingImages.find((img) => img.is_cover)?.id || existingImages[0]?.id || ''
  );

  useEffect(() => {
    setSelectedCoverId(
      existingImages.find((img) => img.is_cover)?.id || existingImages[0]?.id || ''
    );
  }, [product.id, existingImages]);

  useEffect(() => {
    setTrackStock(!!product.track_stock);
  }, [product.id, product.track_stock]);

  useEffect(() => {
    setNewSlots(Array.from({ length: remainingSlots }, () => createEmptySlot()));
  }, [remainingSlots, product.id]);

  const hasUploadingFiles = useMemo(
    () => newSlots.some((slot) => slot.isUploading),
    [newSlots]
  );

  function setSlot(index: number, updater: (prev: UploadSlot) => UploadSlot) {
    setNewSlots((prev) => {
      const next = [...prev];
      next[index] = updater(prev[index]);
      return next;
    });
  }

  function clearSlot(index: number) {
    setNewSlots((prev) => {
      const next = [...prev];
      const current = next[index];

      if (current.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(current.previewUrl);
      }

      next[index] = createEmptySlot();
      return next;
    });
  }

  async function handleNewFileChange(index: number, fileList: FileList | null) {
    const file = fileList?.[0] ?? null;

    if (!file) {
      clearSlot(index);
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setSlot(index, (prev) => {
        if (prev.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(prev.previewUrl);
        }

        return {
          ...createEmptySlot(),
          error: 'Formato no permitido. Usá JPG, PNG o WEBP.',
        };
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setSlot(index, (prev) => {
        if (prev.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(prev.previewUrl);
        }

        return {
          ...createEmptySlot(),
          error: `La imagen supera los ${MAX_FILE_SIZE_MB} MB.`,
        };
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setSlot(index, (prev) => {
      if (prev.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.previewUrl);
      }

      return {
        fileName: file.name,
        previewUrl,
        uploadedUrl: null,
        isUploading: true,
        error: null,
      };
    });

    try {
      const uploadedUrl = await uploadProductImageFromClient(file);

      setSlot(index, (prev) => ({
        ...prev,
        uploadedUrl,
        isUploading: false,
        error: null,
      }));
    } catch (error) {
      setSlot(index, (prev) => ({
        ...prev,
        uploadedUrl: null,
        isUploading: false,
        error:
          error instanceof Error ? error.message : 'No se pudo subir la imagen.',
      }));
    }
  }

  useEffect(() => {
    return () => {
      newSlots.forEach((slot) => {
        if (slot.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(slot.previewUrl);
        }
      });
    };
  }, [newSlots]);

  const stockLabel = !product.track_stock
    ? 'Sin control'
    : (product.stock_quantity ?? 0) > 0
      ? `${product.stock_quantity ?? 0} unidades`
      : product.allow_backorder
        ? 'Sin stock, pero disponible por encargo'
        : 'Sin stock';

  return (
    <article className="space-y-3 rounded-2xl border p-4">
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

          <p className="text-sm">
            Stock: <span className="font-medium">{stockLabel}</span>
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

            {newSlots.map((slot, index) => (
              <input
                key={`new-image-url-${product.id}-${index}`}
                type="hidden"
                name={`new_image_url_${index}`}
                value={slot.uploadedUrl ?? ''}
              />
            ))}

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

            <div className="space-y-3 rounded-2xl border p-4">
              <p className="text-sm font-medium">Control de stock</p>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="track_stock"
                  value="true"
                  checked={trackStock}
                  onChange={(e) => setTrackStock(e.target.checked)}
                />
                <span className="text-sm">Controlar stock</span>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Cantidad en stock</span>
                <input
                  type="number"
                  name="stock_quantity"
                  defaultValue={String(product.stock_quantity ?? 0)}
                  min="0"
                  className="w-full rounded-xl border px-4 py-3"
                  disabled={!trackStock}
                />
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="allow_backorder"
                  value="true"
                  defaultChecked={!!product.allow_backorder}
                  disabled={!trackStock}
                />
                <span className="text-sm">Permitir vender sin stock</span>
              </label>

              <p className="text-xs text-gray-500">
                Si no activás el control de stock, el producto se podrá comprar sin
                límite.
              </p>
            </div>

            {remainingSlots > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    Agregar más fotos ({remainingSlots} disponibles)
                  </p>
                  <p className="text-xs text-gray-500">
                    Máximo {MAX_FILE_SIZE_MB} MB por imagen. JPG, PNG o WEBP.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: remainingSlots }).map((_, index) => {
                    const slot = newSlots[index];

                    return (
                      <div key={index} className="space-y-3 rounded-2xl border p-3">
                        <label
                          htmlFor={`new_image_file_${index}_${product.id}`}
                          className="inline-flex cursor-pointer rounded-xl border px-4 py-2 text-sm"
                        >
                          Subir imagen
                        </label>

                        <input
                          id={`new_image_file_${index}_${product.id}`}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => handleNewFileChange(index, e.target.files)}
                        />

                        <div className="h-40 overflow-hidden rounded-xl border bg-gray-50">
                          {slot?.previewUrl ? (
                            <img
                              src={slot.previewUrl}
                              alt={`Nueva imagen ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-gray-400">
                              Sin imagen
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {(slot?.previewUrl || slot?.uploadedUrl || slot?.error) && (
                            <button
                              type="button"
                              onClick={() => clearSlot(index)}
                              className="rounded-xl border px-4 py-2 text-sm"
                            >
                              Quitar
                            </button>
                          )}
                        </div>

                        <div className="space-y-1 text-sm">
                          <p className="text-gray-600">
                            {slot?.fileName || 'Ningún archivo seleccionado'}
                          </p>

                          {slot?.isUploading && (
                            <p className="text-amber-700">Subiendo imagen...</p>
                          )}

                          {!slot?.isUploading && slot?.uploadedUrl && (
                            <p className="text-green-700">
                              Imagen subida correctamente.
                            </p>
                          )}

                          {slot?.error && <p className="text-red-700">{slot.error}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={hasUploadingFiles}
              className="w-fit rounded-xl bg-black px-5 py-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {hasUploadingFiles
                ? 'Esperá a que terminen de subir las imágenes'
                : 'Guardar cambios'}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}