'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createProduct } from '@/app/admin/productos/actions';
import { uploadProductImageFromClient } from '@/lib/storage-client';

type CategoryOption = {
  id: string;
  name: string;
  is_active?: boolean;
  sort_order?: number;
};

type UploadSlot = {
  fileName: string;
  previewUrl: string | null;
  uploadedUrl: string | null;
  isUploading: boolean;
  error: string | null;
};

const MAX_FILES = 5;
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

function SubmitButton({ disabledByUploads }: { disabledByUploads: boolean }) {
  const { pending } = useFormStatus();

  const disabled = pending || disabledByUploads;
  const label = disabledByUploads
    ? 'Esperá a que terminen de subir las imágenes'
    : pending
    ? 'Creando producto...'
    : 'Crear producto';

  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-fit rounded-xl bg-black px-5 py-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  );
}

export default function ProductCreateForm({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const [slots, setSlots] = useState<UploadSlot[]>(
    Array.from({ length: MAX_FILES }, () => createEmptySlot())
  );
  const [selectedCoverIndex, setSelectedCoverIndex] = useState(0);
  const [trackStock, setTrackStock] = useState(false);

  const hasUploadingFiles = useMemo(
    () => slots.some((slot) => slot.isUploading),
    [slots]
  );

  function setSlot(index: number, updater: (prev: UploadSlot) => UploadSlot) {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = updater(prev[index]);
      return next;
    });
  }

  function clearSlot(index: number) {
    setSlots((prev) => {
      const next = [...prev];
      const current = next[index];

      if (current.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(current.previewUrl);
      }

      next[index] = createEmptySlot();

      const currentCoverStillExists =
        next[selectedCoverIndex]?.previewUrl ||
        next[selectedCoverIndex]?.uploadedUrl;

      if (!currentCoverStillExists) {
        const firstFilledIndex = next.findIndex(
          (slot) => slot.previewUrl || slot.uploadedUrl
        );
        setSelectedCoverIndex(firstFilledIndex >= 0 ? firstFilledIndex : 0);
      }

      return next;
    });
  }

  async function handleFileChange(index: number, fileList: FileList | null) {
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
      slots.forEach((slot) => {
        if (slot.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(slot.previewUrl);
        }
      });
    };
  }, [slots]);

  const filledSlotsCount = useMemo(
    () => slots.filter((slot) => slot.previewUrl || slot.uploadedUrl).length,
    [slots]
  );

  return (
    <form action={createProduct} className="grid gap-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium">Nombre</span>
        <input
          type="text"
          name="name"
          className="w-full rounded-xl border px-4 py-3"
          required
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Precio</span>
        <input
          type="number"
          name="price"
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
          defaultValue=""
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
            defaultValue="0"
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
            disabled={!trackStock}
          />
          <span className="text-sm">Permitir vender sin stock</span>
        </label>

        <p className="text-xs text-gray-500">
          Si no activás el control de stock, el producto se podrá comprar sin
          límite.
        </p>
      </div>

      <input type="hidden" name="cover_index" value={String(selectedCoverIndex)} />

      {slots.map((slot, index) => (
        <input
          key={`image-url-${index}`}
          type="hidden"
          name={`image_url_${index}`}
          value={slot.uploadedUrl ?? ''}
        />
      ))}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Fotos (hasta 5)</p>
          <p className="text-xs text-gray-500">
            Máximo {MAX_FILE_SIZE_MB} MB por imagen. JPG, PNG o WEBP.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot, index) => (
            <div key={index} className="space-y-3 rounded-2xl border p-3">
              <label
                htmlFor={`image_file_${index}`}
                className="inline-flex cursor-pointer rounded-xl border px-4 py-2 text-sm"
              >
                Subir imagen
              </label>

              <input
                id={`image_file_${index}`}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleFileChange(index, e.target.files)}
              />

              <div className="h-40 overflow-hidden rounded-xl border bg-gray-50">
                {slot.previewUrl ? (
                  <img
                    src={slot.previewUrl}
                    alt={`Preview ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    Sin imagen
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCoverIndex(index)}
                  disabled={!slot.uploadedUrl || slot.isUploading}
                  className={`rounded-xl border px-4 py-2 text-sm ${
                    selectedCoverIndex === index ? 'bg-black text-white' : ''
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {selectedCoverIndex === index
                    ? 'Portada seleccionada'
                    : 'Usar como portada'}
                </button>

                {(slot.previewUrl || slot.uploadedUrl || slot.error) && (
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
                  {slot.fileName || 'Ningún archivo seleccionado'}
                </p>

                {slot.isUploading && (
                  <p className="text-amber-700">Subiendo imagen...</p>
                )}

                {!slot.isUploading && slot.uploadedUrl && (
                  <p className="text-green-700">Imagen subida correctamente.</p>
                )}

                {slot.error && <p className="text-red-700">{slot.error}</p>}
              </div>
            </div>
          ))}
        </div>

        {filledSlotsCount === 0 && (
          <p className="text-xs text-gray-500">
            Podés crear el producto sin fotos y agregarlas después.
          </p>
        )}
      </div>

      <SubmitButton disabledByUploads={hasUploadingFiles} />
    </form>
  );
}