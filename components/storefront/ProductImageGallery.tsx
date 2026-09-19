'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Leaf } from 'lucide-react';

interface ProductImageItem {
  id: string;
  imageUrl: string;
  altText: string;
  isPrimary: boolean;
  displayOrder: number;
}

interface ProductImageGalleryProps {
  images: ProductImageItem[];
  productName: string;
}

export default function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-square rounded-3xl bg-cream-200/80 border border-cream-300 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 rounded-full bg-herbal-100 flex items-center justify-center mb-4">
          <Leaf className="w-12 h-12 text-herbal-700" />
        </div>
        <h4 className="font-serif text-lg font-bold text-herbal-900">{productName}</h4>
        <p className="text-xs text-herbal-600 mt-1">Authentic Homemade Herbal Heritage</p>
      </div>
    );
  }

  const activeImage = images[selectedImageIndex] || images[0];

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-4">
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto max-h-[480px] py-1 sm:py-0">
          {images.map((img, idx) => {
            const isSelected = idx === selectedImageIndex;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelectedImageIndex(idx)}
                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                  isSelected
                    ? 'border-herbal-800 ring-2 ring-herbal-800/20 shadow-md'
                    : 'border-cream-300 opacity-70 hover:opacity-100'
                }`}
                aria-label={`View image ${idx + 1} of ${productName}`}
              >
                <Image
                  src={img.imageUrl}
                  alt={img.altText || `${productName} preview`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Main Image Display */}
      <div className="relative flex-1 aspect-square rounded-3xl overflow-hidden bg-white border border-cream-300 shadow-md">
        <Image
          src={activeImage.imageUrl}
          alt={activeImage.altText || productName}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-all duration-300"
        />
      </div>
    </div>
  );
}
