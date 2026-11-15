import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';

interface HeroSlide {
  image: string;
  captionEn: string;
  captionAr: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    image: '/assets/aistudio/FB_IMG_1794687953960_6ea0d05d.jpg',
    captionEn: 'THE ART OF LUXURY LIVING',
    captionAr: 'فن المعيشة الفاخرة',
  },
  {
    image: '/assets/aistudio/FB_IMG_1794687979441_242eb32a.jpg',
    captionEn: 'TIMELESS ELEGANCE',
    captionAr: 'أناقة خالدة تتجاوز الزمن',
  },
  {
    image: '/assets/aistudio/FB_IMG_1794687794741_4817b8cf.jpg',
    captionEn: 'EXCEPTIONAL CRAFTSMANSHIP',
    captionAr: 'حرفية استثنائية في كل تفصيلة',
  },
  {
    image: '/assets/aistudio/FB_IMG_1794687917096_94110550.jpg',
    captionEn: 'DESIGNED FOR DISTINCTION',
    captionAr: 'مصممة للتميز والذوق الرفيع',
  },
];

interface HeroSectionProps {
  lang: 'en' | 'ar';
  whatsappUrl: string;
  onExploreCollections: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  lang,
  whatsappUrl,
  onExploreCollections,
}) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  const current = HERO_SLIDES[index];

  return (
    <section
      id="home"
      className="relative w-full min-h-[78vh] lg:min-h-[86vh] flex items-end overflow-hidden bg-[#1C1917]"
    >
      {/* Cinematic Background Crossfade + Ken Burns Zoom */}
      <AnimatePresence mode="sync">
        <motion.div
          key={current.image}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <img
            src={current.image}
            alt={current.captionEn}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover animate-kenburns"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/90 via-[#1C1917]/40 to-[#1C1917]/20" />
        </motion.div>
      </AnimatePresence>

      {/* Hero Foreground Content */}
      <div className="relative z-10 w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 lg:pb-20 pt-24">
        <div
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          className="max-w-3xl"
        >
          <p className="text-xs sm:text-sm tracking-[0.26em] uppercase text-[#C8A97E] mb-3 font-medium">
            {lang === 'ar'
              ? `${current.captionAr} · أولاد الراجحي للأثاث`
              : `${current.captionEn} · أولاد الراجحي`}
          </p>

          <h1
            style={{ textWrap: 'balance' }}
            className="font-display text-4xl sm:text-6xl lg:text-[4.25rem] font-medium tracking-[0.04em] text-[#FAF7F2] leading-[1.05]"
          >
            AWLAD AL RAJHI
          </h1>

          <p className="mt-3 text-sm sm:text-base lg:text-lg tracking-[0.2em] uppercase text-[#F2ECE1]/90 font-normal">
            WHERE ELEGANCE MEETS EXCELLENCE
          </p>

          <p
            className={`mt-5 max-w-xl text-sm sm:text-base text-[#F2ECE1]/80 leading-relaxed ${
              lang === 'ar' ? 'font-arabic' : ''
            }`}
          >
            {lang === 'ar'
              ? 'معرض أولاد الراجحي للأثاث الفاخر — غرف نوم رئيسية، تسريحات عصرية، غرف سفرة، وصالونات مختارة بعناية لتمنح منزلك فخامة تدوم.'
              : 'An international-caliber luxury furniture showroom presenting bespoke bedroom suites, architectural dining ensembles, sculptural sofas, and illuminated dressing rooms.'}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onExploreCollections}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-[#C8A97E] text-[#1C1917] text-xs sm:text-sm font-semibold tracking-[0.14em] uppercase rounded hover:bg-[#FAF7F2] transition-colors cursor-pointer"
            >
              <span>{lang === 'ar' ? 'استكشف المجموعات' : 'Explore Collection'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 border border-[#FAF7F2]/40 bg-[#1C1917]/50 backdrop-blur-sm text-[#FAF7F2] text-xs sm:text-sm font-medium tracking-[0.12em] uppercase rounded hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-[#C8A97E]" />
              <span>{lang === 'ar' ? 'تواصل واتساب · 01275979910' : 'Private Inquiry · 01275979910'}</span>
            </a>
          </div>
        </div>

        {/* Slide Controls */}
        <div className="mt-10 flex items-center justify-between border-t border-[#FAF7F2]/15 pt-5">
          <div className="flex items-center gap-2">
            {HERO_SLIDES.map((s, i) => (
              <button
                key={s.image}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1 transition-all duration-300 cursor-pointer ${
                  i === index ? 'w-10 bg-[#C8A97E]' : 'w-4 bg-[#FAF7F2]/30 hover:bg-[#FAF7F2]/60'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
              aria-label="Previous hero slide"
              className="p-2 border border-[#FAF7F2]/25 text-[#FAF7F2] rounded hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((prev) => (prev + 1) % HERO_SLIDES.length)}
              aria-label="Next hero slide"
              className="p-2 border border-[#FAF7F2]/25 text-[#FAF7F2] rounded hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
