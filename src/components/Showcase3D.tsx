import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '../types/showroom.ts';

interface Showcase3DProps {
  products: Product[];
  lang: 'en' | 'ar';
  onSelectProduct: (product: Product) => void;
}

export const Showcase3D: React.FC<Showcase3DProps> = ({
  products,
  lang,
  onSelectProduct,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const featured = products.slice(0, 7);

  useEffect(() => {
    if (featured.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featured.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [featured.length, isPaused]);

  if (featured.length === 0) return null;

  const getOffset = (index: number) => {
    const total = featured.length;
    let diff = index - activeIndex;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  };

  return (
    <div
      className="relative py-8 overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="relative h-[360px] sm:h-[430px] flex items-center justify-center"
        style={{ perspective: '1200px' }}
      >
        {featured.map((product, idx) => {
          const offset = getOffset(idx);
          const abs = Math.abs(offset);
          if (abs > 2) return null;

          const translateX = offset * 54; // percentage offset
          const translateZ = abs === 0 ? 0 : abs === 1 ? -140 : -260;
          const rotateY = offset * -18;
          const scale = abs === 0 ? 1 : abs === 1 ? 0.84 : 0.7;
          const opacity = abs === 0 ? 1 : abs === 1 ? 0.72 : 0.35;
          const zIndex = 10 - abs;

          return (
            <button
              key={product.id}
              type="button"
              onClick={() => {
                if (offset === 0) {
                  onSelectProduct(product);
                } else {
                  setActiveIndex(idx);
                }
              }}
              style={{
                transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                opacity,
                zIndex,
                transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1), opacity 600ms ease',
              }}
              className="absolute w-[78vw] max-w-[460px] bg-[#FAF7F2] border border-[#D6CCC0] rounded-lg overflow-hidden shadow-xl text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[#B89362]"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#F2ECE1]">
                <img
                  src={product.images[0]}
                  alt={lang === 'ar' ? product.titleAr : product.titleEn}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
              <div
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                className="p-4 sm:p-5 bg-[#FAF7F2]"
              >
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8C7E70]">
                  {lang === 'ar' ? 'مجموعة مختارة · أولاد الراجحي' : 'Signature Piece · Awlad Al Rajhi'}
                </p>
                <h3
                  className={`mt-1 text-base sm:text-lg font-semibold text-[#1C1917] truncate ${
                    lang === 'ar' ? 'font-arabic' : 'font-display text-xl'
                  }`}
                >
                  {lang === 'ar' ? product.titleAr : product.titleEn}
                </h3>
              </div>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setActiveIndex((prev) => (prev - 1 + featured.length) % featured.length)}
          aria-label="Previous showcase item"
          className="p-2.5 rounded border border-[#D6CCC0] text-[#3A2B22] hover:border-[#B89362] hover:bg-[#F2ECE1] transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5">
          {featured.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Showcase item ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === activeIndex ? 'w-7 bg-[#B89362]' : 'w-2 bg-[#D6CCC0]'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setActiveIndex((prev) => (prev + 1) % featured.length)}
          aria-label="Next showcase item"
          className="p-2.5 rounded border border-[#D6CCC0] text-[#3A2B22] hover:border-[#B89362] hover:bg-[#F2ECE1] transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
