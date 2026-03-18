'use client';

import { useEffect, useRef, useState } from 'react';

type ProductImage = {
  id: string;
  image_url: string;
  is_cover?: boolean;
  sort_order?: number | null;
};

type ProductImageGalleryProps = {
  images: ProductImage[];
  fallbackImage?: string | null;
  productName: string;
};

export default function ProductImageGallery({
  images,
  fallbackImage,
  productName,
}: ProductImageGalleryProps) {
  const normalizedImages =
    images.length > 0
      ? images
      : fallbackImage
        ? [
            {
              id: 'fallback-image',
              image_url: fallbackImage,
              is_cover: true,
            },
          ]
        : [];

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || normalizedImages.length === 0) return;

    function handleScroll() {
      const slides = Array.from(
        container.querySelectorAll<HTMLElement>('[data-slide="true"]')
      );

      if (slides.length === 0) return;

      const containerLeft = container.scrollLeft;
      const containerWidth = container.clientWidth;
      const viewportCenter = containerLeft + containerWidth / 2;

      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      slides.forEach((slide, index) => {
        const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
        const distance = Math.abs(slideCenter - viewportCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveIndex(closestIndex);
    }

    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [normalizedImages.length]);

  function scrollToIndex(index: number) {
    const container = scrollRef.current;
    if (!container) return;

    const slides = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slide="true"]')
    );

    const target = slides[index];
    if (!target) return;

    container.scrollTo({
      left: target.offsetLeft,
      behavior: 'smooth',
    });

    setActiveIndex(index);
  }

  if (normalizedImages.length === 0) {
    return (
      <div className="overflow-hidden rounded-3xl border bg-gray-50">
        <div className="flex h-[420px] items-center justify-center text-gray-400">
          Sin imagen
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-3xl border bg-gray-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {normalizedImages.map((image, index) => (
          <div
            key={image.id || `${image.image_url}-${index}`}
            data-slide="true"
            className="min-w-full snap-center"
          >
            <div className="overflow-hidden bg-gray-50">
              <img
                src={image.image_url}
                alt={`${productName} - imagen ${index + 1}`}
                className="h-[420px] w-full object-cover"
              />
            </div>
          </div>
        ))}
      </div>

      {normalizedImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {normalizedImages.map((image, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={`thumb-${image.id || index}`}
                type="button"
                onClick={() => scrollToIndex(index)}
                aria-label={`Ver imagen ${index + 1}`}
                className={`relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border transition ${
                  isActive
                    ? 'border-black ring-2 ring-black/20'
                    : 'border-gray-200 opacity-80 hover:opacity-100'
                }`}
              >
                <img
                  src={image.image_url}
                  alt={`${productName} miniatura ${index + 1}`}
                  className={`h-full w-full object-cover transition ${
                    isActive ? 'brightness-100' : 'brightness-90'
                  }`}
                />
                {isActive && <div className="absolute inset-0 bg-black/10" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}