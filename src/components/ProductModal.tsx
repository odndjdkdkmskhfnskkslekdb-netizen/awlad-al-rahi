import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, MessageCircle, Phone } from 'lucide-react';
import type { Category, Product } from '../types/showroom.ts';

interface ProductModalProps {
  product: Product | null;
  category?: Category;
  lang: 'en' | 'ar';
  whatsappUrl: string;
  phone: string;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  category,
  lang,
  whatsappUrl,
  phone,
  onClose,
}) => {
  const [imgIndex, setImgIndex] = useState(0);

  if (!product) return null;

  const images = product.images.length > 0 ? product.images : ['/assets/aistudio/FB_IMG_1794687979441_242eb32a.jpg'];
  const currentImg = images[imgIndex] || images[0];

  const inquiryText = encodeURIComponent(
    `مرحباً أولاد الراجحي، أود الاستفسار عن: ${product.titleAr} (${product.titleEn})`
  );
  const productWhatsappHref = `${whatsappUrl}?text=${inquiryText}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/80 backdrop-blur-sm p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-5xl bg-[#FAF7F2] border border-[#D6CCC0] rounded-lg overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product preview"
          className="absolute top-3 right-3 z-20 p-2 bg-[#FAF7F2]/90 text-[#1C1917] rounded-full border border-[#D6CCC0] hover:border-[#B89362] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left: Multi-Image Stage */}
        <div className="lg:col-span-7 bg-[#F2ECE1] flex flex-col justify-between">
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <img
              src={currentImg}
              alt={lang === 'ar' ? product.titleAr : product.titleEn}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setImgIndex((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-[#FAF7F2]/90 text-[#1C1917] rounded-full border border-[#D6CCC0] hover:border-[#B89362] cursor-pointer"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setImgIndex((prev) => (prev + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-[#FAF7F2]/90 text-[#1C1917] rounded-full border border-[#D6CCC0] hover:border-[#B89362] cursor-pointer"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="p-3 flex items-center gap-2 overflow-x-auto border-t border-[#E5DDD0]">
              {images.map((url, idx) => (
                <button
                  key={`${url}-${idx}`}
                  type="button"
                  onClick={() => setImgIndex(idx)}
                  className={`w-16 h-12 rounded overflow-hidden border-2 shrink-0 cursor-pointer ${
                    idx === imgIndex ? 'border-[#B89362]' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Luxury Details & WhatsApp CTA */}
        <div
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#8C7E70]">
              {category ? (lang === 'ar' ? category.nameAr : category.nameEn) : 'AWLAD AL RAJHI'}
              {product.isBestSeller ? ` · ${lang === 'ar' ? 'الأكثر مبيعاً' : 'Best Seller'}` : ''}
            </p>

            <h2
              className={`mt-2 text-2xl sm:text-3xl font-semibold text-[#1C1917] ${
                lang === 'ar' ? 'font-arabic' : 'font-display'
              }`}
            >
              {lang === 'ar' ? product.titleAr : product.titleEn}
            </h2>
            <p className="mt-1 text-xs text-[#8C7E70] font-arabic">
              {lang === 'ar' ? product.titleEn : product.titleAr}
            </p>

            <div className="my-5 h-px bg-[#E5DDD0]" />

            {(product.price || product.availability) && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                {product.price ? (
                  <div className="flex items-baseline gap-2.5 tabular-nums">
                    {product.discountPrice && product.discountPrice < product.price ? (
                      <>
                        <span className="text-lg font-bold text-[#1C1917]">
                          {product.discountPrice.toLocaleString()} {lang === 'ar' ? 'ج.م' : 'EGP'}
                        </span>
                        <span className="text-xs text-[#8C7E70] line-through">
                          {product.price.toLocaleString()} {lang === 'ar' ? 'ج.م' : 'EGP'}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-[#1C1917]">
                        {product.price.toLocaleString()} {lang === 'ar' ? 'ج.م' : 'EGP'}
                      </span>
                    )}
                  </div>
                ) : (
                  <span />
                )}

                {product.availability && (
                  <span className="px-2.5 py-1 text-[11px] font-medium rounded border border-[#D6CCC0] bg-[#F2ECE1] text-[#3A2B22]">
                    {product.availability === 'in-stock'
                      ? lang === 'ar'
                        ? 'متاح للتسليم'
                        : 'In Stock'
                      : product.availability === 'made-to-order'
                      ? lang === 'ar'
                        ? 'تفصيل حسب الطلب'
                        : 'Made to Order'
                      : lang === 'ar'
                      ? 'غير متاح حالياً'
                      : 'Unavailable'}
                  </span>
                )}
              </div>
            )}

            <p className={`text-sm sm:text-base text-[#3A2B22] leading-relaxed ${lang === 'ar' ? 'font-arabic' : ''}`}>
              {lang === 'ar' ? product.descriptionAr : product.descriptionEn}
            </p>

            {(product.materialsEn || product.materialsAr) && (
              <div className="mt-5 pt-4 border-t border-[#E5DDD0]">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8C7E70]">
                  {lang === 'ar' ? 'الخامات والتفاصيل' : 'Materials & Finish'}
                </p>
                <p className={`mt-1 text-sm text-[#1C1917] font-medium ${lang === 'ar' ? 'font-arabic' : ''}`}>
                  {lang === 'ar' ? product.materialsAr || product.materialsEn : product.materialsEn || product.materialsAr}
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-5 border-t border-[#E5DDD0] space-y-3">
            <a
              href={productWhatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-[#1C1917] text-[#FAF7F2] text-xs sm:text-sm font-medium tracking-[0.1em] uppercase rounded hover:bg-[#3A2B22] transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-[#C8A97E]" />
              <span>{lang === 'ar' ? 'استفسار وحجز عبر واتساب' : 'Inquire via WhatsApp'}</span>
            </a>

            <a
              href={`tel:+2${phone}`}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 border border-[#D6CCC0] text-[#3A2B22] text-xs sm:text-sm font-medium rounded hover:border-[#B89362] hover:bg-[#F2ECE1] transition-colors"
            >
              <Phone className="w-4 h-4 text-[#B89362]" />
              <span className="tabular-nums">{phone}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
