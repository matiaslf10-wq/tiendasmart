'use client';

import { useEffect, useMemo, useState } from 'react';
import { createProduct } from '@/app/admin/productos/actions';
import FileUploadButton from '@/components/FileUploadButton';

type CategoryOption = {
  id: string;
  name: string;
  is_active?: boolean;
  sort_order?: number;
};

export default function ProductCreateForm({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const [files, setFiles] = useState<(File | null)[]>(
    Array.from({ length: 5 }, () => null)
  );
  const [selectedCoverIndex, setSelectedCoverIndex] = useState(0);

  function handleFileChange(index: number, fileList: FileList | null) {
    const file = fileList && fileList[0] ? fileList[0] : null;

    setFiles((prev) => {
      const next = [...prev];
      next[index] = file;

      const currentCoverStillExists = next[selectedCoverIndex];
      if (!currentCoverStillExists) {
        const firstFilledIndex = next.findIndex(Boolean);
        setSelectedCoverIndex(firstFilledIndex >= 0 ? firstFilledIndex : 0);
      }

      return next;
    });
  }

  const previews = useMemo(() => {
    return files.map((file) => ({
      fileName: file?.name || '',
      previewUrl: file ? URL.createObjectURL(file) : null,
    }));
  }, [files]);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => {
        if (preview.previewUrl) {
          URL.revokeObjectURL(preview.previewUrl);
        }
      });
    };
  }, [previews]);

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

      <input type="hidden" name="cover_index" value={String(selectedCoverIndex)} />

      <div className="space-y-3">
        <p className="text-sm font-medium">Fotos (hasta 5)</p>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {previews.map((preview, index) => (
            <div key={index} className="space-y-3 rounded-2xl border p-3">
              <FileUploadButton
                id={`image_file_${index}`}
                name={`image_file_${index}`}
                label="Subir imagen"
                onChange={(e) => handleFileChange(index, e.target.files)}
              />

              <div className="h-40 overflow-hidden rounded-xl border bg-gray-50">
                {preview.previewUrl ? (
                  <img
                    src={preview.previewUrl}
                    alt={`Preview ${index + 1}`}
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
                onClick={() => setSelectedCoverIndex(index)}
                className={`rounded-xl border px-4 py-2 text-sm ${
                  selectedCoverIndex === index ? 'bg-black text-white' : ''
                }`}
              >
                {selectedCoverIndex === index
                  ? 'Portada seleccionada'
                  : 'Usar como portada'}
              </button>

              <p className="text-sm text-gray-600">
                {preview.fileName || 'Ningún archivo seleccionado'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="w-fit rounded-xl bg-black px-5 py-3 text-white"
      >
        Crear producto
      </button>
    </form>
  );
}