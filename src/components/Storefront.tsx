import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  MapPin,
  MessageCircle,
  Pause,
  Phone,
  Play,
  Search,
  Share2,
  Star,
  X,
} from 'lucide-react';
import type { Category, Product, ShowroomContent, VideoItem } from '../types/showroom.ts';
import { Navbar, type NavItem } from './Navbar.tsx';
import { HeroSection } from './HeroSection.tsx';
import { Showcase3D } from './Showcase3D.tsx';
import { ProductModal } from './ProductModal.tsx';
import { ShowroomMap } from './ShowroomMap.tsx';
import { buildDirectionsUrl, getParsedNumericCoords } from '../utils/maps.ts';

interface StorefrontProps {
  data: ShowroomContent;
  lang: 'en' | 'ar';
  onToggleLang: () => void;
  onOpenAdmin: () => void;
  isPreviewMode?: boolean;
  onExitPreview?: () => void;
  onPublishFromPreview?: () => void;
}

export const Storefront: React.FC<StorefrontProps> = ({
  data,
  lang,
  onToggleLang,
  onOpenAdmin,
  isPreviewMode,
  onExitPreview,
  onPublishFromPreview,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [collectionSearch, setCollectionSearch] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<VideoItem | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const bestSellerTrackRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const publishedProducts = useMemo(
    () =>
      [...data.products]
        .filter((p) => p.isPublished)
        .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999)),
    [data.products]
  );

  // Hide empty categories automatically
  const activeCategories = useMemo(() => {
    return [...data.categories]
      .sort((a, b) => a.order - b.order)
      .filter((cat) => publishedProducts.some((p) => p.categoryId === cat.id));
  }, [data.categories, publishedProducts]);

  const bestSellers = useMemo(
    () => publishedProducts.filter((p) => p.isBestSeller || p.isFeatured),
    [publishedProducts]
  );

  const activeBanners = useMemo(
    () => [...data.banners].filter((b) => b.isActive).sort((a, b) => a.order - b.order),
    [data.banners]
  );

  const activeOffers = useMemo(
    () => data.offers.filter((o) => o.isActive),
    [data.offers]
  );

  const activeVideos = useMemo(
    () => data.videos.filter((v) => v.isActive),
    [data.videos]
  );

  const activeReviews = useMemo(
    () =>
      [...data.reviews]
        .filter((r) => r.isActive && (!r.status || r.status === 'approved'))
        .sort((a, b) => a.order - b.order)
        .slice(0, 20),
    [data.reviews]
  );

  const approvedDeliveredPhotos = useMemo(
    () => data.deliveredPhotos.filter((d) => d.approved),
    [data.deliveredPhotos]
  );

  const filteredProducts = useMemo(() => {
    if (selectedCategoryId === 'all') return publishedProducts;
    return publishedProducts.filter((p) => p.categoryId === selectedCategoryId);
  }, [publishedProducts, selectedCategoryId]);

  const normalizedQuery = collectionSearch.trim().toLowerCase();

  const searchMatchingProducts = useMemo(() => {
    if (!normalizedQuery) return [];
    return publishedProducts.filter((p) => {
      const cat = data.categories.find((c) => c.id === p.categoryId);
      const haystack = [
        p.titleEn,
        p.titleAr,
        p.descriptionEn,
        p.descriptionAr,
        p.materialsEn,
        p.materialsAr,
        cat?.nameEn || '',
        cat?.nameAr || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, publishedProducts, data.categories]);

  const visibleCollections = useMemo(() => {
    if (!normalizedQuery) return activeCategories;
    return activeCategories.filter((cat) => {
      const catMatch =
        cat.nameEn.toLowerCase().includes(normalizedQuery) ||
        cat.nameAr.toLowerCase().includes(normalizedQuery);
      const hasProductMatch = searchMatchingProducts.some((p) => p.categoryId === cat.id);
      return catMatch || hasProductMatch;
    });
  }, [activeCategories, normalizedQuery, searchMatchingProducts]);

  // Dynamic navigation items: only show sections with actual content
  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [{ id: 'home', labelEn: 'HOME', labelAr: 'الرئيسية' }];
    if (activeCategories.length > 0) {
      items.push({ id: 'collections', labelEn: 'COLLECTIONS', labelAr: 'المجموعات' });
    }
    if (publishedProducts.length > 0) {
      items.push({ id: 'products', labelEn: 'PRODUCTS', labelAr: 'المنتجات' });
    }
    if (bestSellers.length > 0) {
      items.push({ id: 'best-sellers', labelEn: 'BEST SELLERS', labelAr: 'الأكثر مبيعاً' });
    }
    if (activeOffers.length > 0) {
      items.push({ id: 'offers', labelEn: 'EXCLUSIVE OFFERS', labelAr: 'العروض الحصرية' });
    }
    if (activeVideos.length > 0) {
      items.push({ id: 'videos', labelEn: 'VIDEO GALLERY', labelAr: 'معرض الفيديو' });
    }
    if (activeReviews.length > 0 || data.settings.whatsappScreenshots.length > 0) {
      items.push({ id: 'reviews', labelEn: 'CUSTOMER REVIEWS', labelAr: 'آراء العملاء' });
    }
    items.push({ id: 'find-us', labelEn: 'FIND US', labelAr: 'موقعنا' });
    items.push({ id: 'contact', labelEn: 'CONTACT', labelAr: 'تواصل معنا' });
    return items;
  }, [
    activeCategories.length,
    publishedProducts.length,
    bestSellers.length,
    activeOffers.length,
    activeVideos.length,
    activeReviews.length,
    data.settings.whatsappScreenshots.length,
  ]);

  // Automatic Advertising Banner slider
  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const t = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5500);
    return () => clearInterval(t);
  }, [activeBanners.length]);

  // Automatic Customer Reviews slider
  useEffect(() => {
    if (activeReviews.length <= 1) return;
    const t = setInterval(() => {
      setReviewIndex((prev) => (prev + 1) % activeReviews.length);
    }, 5000);
    return () => clearInterval(t);
  }, [activeReviews.length]);

  // Automatic horizontal scroll for Best Sellers
  useEffect(() => {
    if (bestSellers.length <= 2) return;
    const t = setInterval(() => {
      const el = bestSellerTrackRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;
      if (el.scrollLeft >= maxScroll - 16) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: 360, behavior: 'smooth' });
      }
    }, 4500);
    return () => clearInterval(t);
  }, [bestSellers.length]);

  const handleCategorySelect = (catId: string) => {
    setSelectedCategoryId(catId);
    const el = document.getElementById('products');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const getCategoryForProduct = (product: Product): Category | undefined =>
    data.categories.find((c) => c.id === product.categoryId);

  const toggleInlineVideo = (id: string) => {
    const vid = videoRefs.current[id];
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      setPlayingVideoId(id);
    } else {
      vid.pause();
      setPlayingVideoId(null);
    }
  };

  const hasMapLocation = Boolean(
    data.settings.googleMapsEmbedUrl ||
      data.settings.googleMapsUrl ||
      getParsedNumericCoords(data.settings) ||
      data.settings.showroomAddressEn ||
      data.settings.showroomAddressAr
  );

  const computedDirectionsUrl = useMemo(
    () => buildDirectionsUrl(data.settings),
    [data.settings]
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917]">
      {/* Draft Preview Top Ribbon */}
      {isPreviewMode && (
        <div className="sticky top-0 z-50 h-11 bg-[#3A2B22] text-[#FAF7F2] px-4 flex items-center justify-between text-xs border-b border-[#C8A97E]/40">
          <span className="font-medium tracking-wide">
            {lang === 'ar'
              ? 'معاينة المسودة قبل النشر — التغييرات غير منشورة للزوار بعد'
              : 'Draft Preview Mode — Changes are not yet live'}
          </span>
          <div className="flex items-center gap-2">
            {onPublishFromPreview && (
              <button
                type="button"
                onClick={onPublishFromPreview}
                className="px-3 py-1 bg-[#C8A97E] text-[#1C1917] font-semibold rounded hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'نشر الآن' : 'Publish Live'}
              </button>
            )}
            {onExitPreview && (
              <button
                type="button"
                onClick={onExitPreview}
                className="px-3 py-1 border border-[#FAF7F2]/40 rounded hover:bg-[#FAF7F2]/10 transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'العودة للإدارة' : 'Back to Dashboard'}
              </button>
            )}
          </div>
        </div>
      )}

      <Navbar
        navItems={navItems}
        lang={lang}
        onToggleLang={onToggleLang}
        whatsappUrl={data.settings.whatsappUrl}
        onOpenAdmin={onOpenAdmin}
        isPreviewMode={isPreviewMode}
      />

      {/* 1. HERO SHOWCASE */}
      <HeroSection
        lang={lang}
        whatsappUrl={data.settings.whatsappUrl}
        onExploreCollections={() => {
          const target = document.getElementById(activeCategories.length > 0 ? 'collections' : 'products');
          target?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 2. SOPHISTICATED WELCOME & 3D SHOWCASE */}
      <section className="py-16 sm:py-24 border-b border-[#E5DDD0] bg-[#FAF7F2]">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6 }}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end"
          >
            <div className="lg:col-span-7">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8C7E70]">
                {lang === 'ar' ? 'فن المعيشة الفاخرة · أولاد الراجحي' : 'THE ART OF LUXURY LIVING · TIMELESS ELEGANCE'}
              </p>
              <h2
                style={{ textWrap: 'balance' }}
                className={`mt-3 text-3xl sm:text-5xl font-medium text-[#1C1917] leading-[1.12] ${
                  lang === 'ar' ? 'font-arabic' : 'font-display'
                }`}
              >
                {lang === 'ar'
                  ? 'حيث تلتقي الأناقة بالتميز في كل مساحة معيشة'
                  : 'Elevate Your Living Space with Exceptional Craftsmanship'}
              </h2>
            </div>

            <div className="lg:col-span-5 space-y-3">
              <p className={`text-sm sm:text-base text-[#3A2B22] leading-relaxed ${lang === 'ar' ? 'font-arabic' : ''}`}>
                {lang === 'ar'
                  ? 'نقدم في معرض أولاد الراجحي مجموعات حصرية مصممة للتميز، تجمع بين الدفء الطبيعي للأخشاب الفاخرة والتفاصيل العصرية الراقية.'
                  : 'Awlad Al Rajhi curates exclusive collections designed for distinction—uniting European architectural proportions, natural walnut veneers, and tailored upholstery for refined living.'}
              </p>
              <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-[0.14em] text-[#8C7E70]">
                <span>EXCLUSIVE COLLECTION</span>
                <span aria-hidden="true">·</span>
                <span>REFINED LIVING</span>
                <span aria-hidden="true">·</span>
                <span>DESIGNED FOR DISTINCTION</span>
              </div>
            </div>
          </motion.div>

          {/* 3D Perspective Carousel */}
          <div className="mt-10">
            <Showcase3D
              products={publishedProducts}
              lang={lang}
              onSelectProduct={(p) => setSelectedProduct(p)}
            />
          </div>
        </div>
      </section>

      {/* 3. FULL-WIDTH IMAGE ADVERTISING BANNER (NO VIDEO ADS) */}
      {activeBanners.length > 0 && (
        <section aria-label="Showroom Advertising Showcase" className="relative w-full bg-[#1C1917] overflow-hidden">
          <div className="relative h-[420px] sm:h-[520px] lg:h-[600px] w-full">
            {activeBanners.map((banner, idx) => (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  idx === bannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <img
                  src={banner.imageUrl}
                  alt={lang === 'ar' ? banner.titleAr : banner.titleEn}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover animate-kenburns"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#1C1917]/80 via-[#1C1917]/35 to-transparent" />
                <div
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  className="absolute inset-0 max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center"
                >
                  <div className="max-w-xl">
                    <p className="text-xs uppercase tracking-[0.22em] text-[#C8A97E]">
                      AWLAD AL RAJHI · WHERE ELEGANCE MEETS EXCELLENCE
                    </p>
                    <h3
                      className={`mt-3 text-3xl sm:text-5xl font-medium text-[#FAF7F2] ${
                        lang === 'ar' ? 'font-arabic' : 'font-display'
                      }`}
                    >
                      {lang === 'ar' ? banner.titleAr : banner.titleEn}
                    </h3>
                    {(banner.subtitleEn || banner.subtitleAr) && (
                      <p className={`mt-3 text-sm sm:text-base text-[#F2ECE1]/85 ${lang === 'ar' ? 'font-arabic' : ''}`}>
                        {lang === 'ar' ? banner.subtitleAr : banner.subtitleEn}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {activeBanners.length > 1 && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                {activeBanners.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBannerIndex(i)}
                    aria-label={`Banner ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      i === bannerIndex ? 'w-8 bg-[#C8A97E]' : 'w-2.5 bg-[#FAF7F2]/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. COLLECTIONS OVERVIEW (Empty categories auto-hidden + Search Bar) */}
      {activeCategories.length > 0 && (
        <section id="collections" className="py-16 sm:py-24 bg-[#F2ECE1]/60 border-b border-[#E5DDD0]">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
            <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#8C7E70]">
                  {lang === 'ar' ? 'مجموعاتنا الحصرية' : 'EXCLUSIVE COLLECTION'}
                </p>
                <h2 className={`mt-2 text-3xl sm:text-4xl font-medium text-[#1C1917] ${lang === 'ar' ? 'font-arabic' : 'font-display'}`}>
                  {lang === 'ar' ? 'الأقسام والمجموعات' : 'Curated Showroom Collections'}
                </h2>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-1 sm:w-80 lg:w-96">
                  <Search
                    className={`w-4 h-4 text-[#8C7E70] absolute top-1/2 -translate-y-1/2 pointer-events-none ${
                      lang === 'ar' ? 'right-3.5' : 'left-3.5'
                    }`}
                  />
                  <input
                    type="search"
                    value={collectionSearch}
                    onChange={(e) => setCollectionSearch(e.target.value)}
                    placeholder={
                      lang === 'ar'
                        ? 'ابحث باسم القطعة أو القسم (سفرة، صالون، جوز...)'
                        : 'Search products by name or category...'
                    }
                    aria-label={lang === 'ar' ? 'ابحث في المنتجات والمجموعات' : 'Search products by name or category'}
                    className={`w-full py-2.5 bg-[#FAF7F2] border border-[#D6CCC0] rounded-lg text-sm text-[#1C1917] placeholder:text-[#8C7E70] focus:outline-none focus:border-[#B89362] transition-colors ${
                      lang === 'ar' ? 'pr-10 pl-9 font-arabic' : 'pl-10 pr-9'
                    }`}
                  />
                  {collectionSearch && (
                    <button
                      type="button"
                      onClick={() => setCollectionSearch('')}
                      aria-label={lang === 'ar' ? 'مسح البحث' : 'Clear search'}
                      className={`p-1 text-[#8C7E70] hover:text-[#1C1917] absolute top-1/2 -translate-y-1/2 cursor-pointer ${
                        lang === 'ar' ? 'left-2.5' : 'right-2.5'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs uppercase tracking-[0.14em] text-[#8C7E70] tabular-nums whitespace-nowrap shrink-0">
                  {normalizedQuery
                    ? `${searchMatchingProducts.length} ${lang === 'ar' ? 'نتيجة مطابقة' : 'Matches'}`
                    : `${activeCategories.length} ${lang === 'ar' ? 'أقسام متاحة' : 'Active Collections'}`}
                </p>
              </div>
            </div>

            {/* Instant Search Results inside Collections when query is active */}
            {normalizedQuery && (
              <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="mb-12">
                {searchMatchingProducts.length > 0 ? (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-[#D6CCC0] pb-3">
                      <p className={`text-sm font-medium text-[#3A2B22] ${lang === 'ar' ? 'font-arabic' : ''}`}>
                        {lang === 'ar'
                          ? `المنتجات المطابقة لـ «${collectionSearch.trim()}»`
                          : `Matching pieces for "${collectionSearch.trim()}"`}
                      </p>
                      <button
                        type="button"
                        onClick={() => setCollectionSearch('')}
                        className="text-xs uppercase tracking-wider text-[#8C7E70] hover:text-[#1C1917] underline cursor-pointer"
                      >
                        {lang === 'ar' ? 'عرض كل الأقسام' : 'Reset Filter'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                      {searchMatchingProducts.map((product) => {
                        const cat = getCategoryForProduct(product);
                        return (
                          <article
                            key={`search-${product.id}`}
                            onClick={() => setSelectedProduct(product)}
                            className="group bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg overflow-hidden hover:border-[#B89362] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                          >
                            <div className="aspect-[4/3] w-full overflow-hidden bg-[#F2ECE1]">
                              <img
                                src={product.images[0]}
                                alt={lang === 'ar' ? product.titleAr : product.titleEn}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                            </div>
                            <div className="p-5">
                              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8C7E70] truncate">
                                {cat ? (lang === 'ar' ? cat.nameAr : cat.nameEn) : 'AWLAD AL RAJHI'}
                                {product.isBestSeller ? ` · ${lang === 'ar' ? 'الأكثر مبيعاً' : 'Best Seller'}` : ''}
                              </p>
                              <h3 className={`mt-1.5 text-lg font-semibold text-[#1C1917] truncate ${lang === 'ar' ? 'font-arabic' : ''}`}>
                                {lang === 'ar' ? product.titleAr : product.titleEn}
                              </h3>
                              <p className={`mt-1 text-xs text-[#3A2B22]/80 line-clamp-2 ${lang === 'ar' ? 'font-arabic' : ''}`}>
                                {lang === 'ar' ? product.descriptionAr : product.descriptionEn}
                              </p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#FAF7F2] border border-[#D6CCC0] rounded-lg p-8 text-center">
                    <p className={`text-sm text-[#3A2B22] ${lang === 'ar' ? 'font-arabic' : ''}`}>
                      {lang === 'ar'
                        ? `لم يتم العثور على منتجات مطابقة لـ «${collectionSearch.trim()}».`
                        : `No showroom pieces found matching "${collectionSearch.trim()}".`}
                    </p>
                    <button
                      type="button"
                      onClick={() => setCollectionSearch('')}
                      className="mt-3 px-4 py-2 text-xs uppercase tracking-wider bg-[#1C1917] text-[#FAF7F2] rounded hover:bg-[#3A2B22] transition-colors cursor-pointer"
                    >
                      {lang === 'ar' ? 'مسح البحث' : 'Clear Search'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {visibleCollections.map((cat) => {
                const count = publishedProducts.filter((p) => p.categoryId === cat.id).length;
                const fallbackCover =
                  cat.coverImage ||
                  publishedProducts.find((p) => p.categoryId === cat.id)?.images[0] ||
                  '';

                return (
                  <motion.button
                    key={cat.id}
                    type="button"
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.45 }}
                    onClick={() => handleCategorySelect(cat.id)}
                    className="group text-left bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg overflow-hidden hover:border-[#B89362] hover:-translate-y-0.5 transition-all duration-300 shadow-sm cursor-pointer"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-[#F2ECE1]">
                      {fallbackCover ? (
                        <img
                          src={fallbackCover}
                          alt={lang === 'ar' ? cat.nameAr : cat.nameEn}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[#8C7E70]">
                          AWLAD AL RAJHI
                        </div>
                      )}
                    </div>

                    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="p-5 sm:p-6">
                      <div className="flex items-center justify-between gap-2 text-xs text-[#8C7E70]">
                        <span className="uppercase tracking-[0.12em]">
                          {lang === 'ar' ? cat.nameEn : cat.nameAr}
                        </span>
                        <span className="tabular-nums">
                          {count} {lang === 'ar' ? 'موديل' : count === 1 ? 'Piece' : 'Pieces'}
                        </span>
                      </div>
                      <h3
                        className={`mt-1.5 text-xl font-semibold text-[#1C1917] ${
                          lang === 'ar' ? 'font-arabic' : 'font-display text-2xl'
                        }`}
                      >
                        {lang === 'ar' ? cat.nameAr : cat.nameEn}
                      </h3>
                      {(cat.descriptionEn || cat.descriptionAr) && (
                        <p className={`mt-2 text-xs sm:text-sm text-[#3A2B22]/85 line-clamp-2 ${lang === 'ar' ? 'font-arabic' : ''}`}>
                          {lang === 'ar' ? cat.descriptionAr : cat.descriptionEn}
                        </p>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 5. DYNAMIC PRODUCT GALLERIES */}
      {publishedProducts.length > 0 && (
        <section id="products" className="py-16 sm:py-24 bg-[#FAF7F2] border-b border-[#E5DDD0]">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
            <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#8C7E70]">
                  {lang === 'ar' ? 'معرض المنتجات الديناميكي' : 'DESIGNED FOR DISTINCTION'}
                </p>
                <h2 className={`mt-2 text-3xl sm:text-4xl font-medium text-[#1C1917] ${lang === 'ar' ? 'font-arabic' : 'font-display'}`}>
                  {lang === 'ar' ? 'أحدث التصميمات والموديلات' : 'Showroom Product Galleries'}
                </h2>
              </div>

              {/* Interactive Filter Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap bg-[#F2ECE1] p-1.5 rounded-lg border border-[#E5DDD0]">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId('all')}
                  className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategoryId === 'all'
                      ? 'bg-[#1C1917] text-[#FAF7F2]'
                      : 'text-[#3A2B22] hover:bg-[#FAF7F2]'
                  }`}
                >
                  {lang === 'ar' ? `الكل (${publishedProducts.length})` : `All (${publishedProducts.length})`}
                </button>
                {activeCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedCategoryId === cat.id
                        ? 'bg-[#1C1917] text-[#FAF7F2]'
                        : 'text-[#3A2B22] hover:bg-[#FAF7F2]'
                    } ${lang === 'ar' ? 'font-arabic' : ''}`}
                  >
                    {lang === 'ar' ? cat.nameAr : cat.nameEn}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredProducts.map((product) => {
                const cat = getCategoryForProduct(product);
                return (
                  <motion.article
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    onClick={() => setSelectedProduct(product)}
                    className="group bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg overflow-hidden hover:border-[#B89362] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F2ECE1]">
                      <img
                        src={product.images[0]}
                        alt={lang === 'ar' ? product.titleAr : product.titleEn}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>

                    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="p-5">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#8C7E70] truncate">
                        {cat ? (lang === 'ar' ? cat.nameAr : cat.nameEn) : 'AWLAD AL RAJHI'}
                        {product.isBestSeller ? ` · ${lang === 'ar' ? 'الأكثر مبيعاً' : 'Best Seller'}` : ''}
                        {product.images.length > 1
                          ? ` · ${product.images.length} ${lang === 'ar' ? 'صور' : 'Photos'}`
                          : ''}
                      </p>

                      <h3
                        className={`mt-1.5 text-lg font-semibold text-[#1C1917] truncate ${
                          lang === 'ar' ? 'font-arabic' : ''
                        }`}
                      >
                        {lang === 'ar' ? product.titleAr : product.titleEn}
                      </h3>

                      <p
                        className={`mt-1.5 text-xs sm:text-sm text-[#3A2B22]/80 line-clamp-2 ${
                          lang === 'ar' ? 'font-arabic' : ''
                        }`}
                      >
                        {lang === 'ar' ? product.descriptionAr : product.descriptionEn}
                      </p>

                      <div className="mt-4 pt-3 border-t border-[#E5DDD0] flex items-center justify-between gap-2 text-xs text-[#8C7E70]">
                        {product.price ? (
                          <span className="text-[#1C1917] font-semibold tabular-nums whitespace-nowrap">
                            {(product.discountPrice && product.discountPrice < product.price
                              ? product.discountPrice
                              : product.price
                            ).toLocaleString()}{' '}
                            {lang === 'ar' ? 'ج.م' : 'EGP'}
                            {product.discountPrice && product.discountPrice < product.price && (
                              <span className="ml-1.5 text-[11px] font-normal text-[#8C7E70] line-through">
                                {product.price.toLocaleString()}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="truncate">
                            {lang === 'ar' ? product.materialsAr : product.materialsEn}
                          </span>
                        )}
                        <span className="text-[#1C1917] font-medium whitespace-nowrap shrink-0 group-hover:text-[#B89362]">
                          {lang === 'ar' ? 'التفاصيل ←' : 'View →'}
                        </span>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 6. BEST SELLERS (Auto-hidden if none selected) */}
      {bestSellers.length > 0 && (
        <section id="best-sellers" className="py-16 sm:py-24 bg-[#1C1917] text-[#FAF7F2] border-b border-[#3A2B22]">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
            <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="flex items-end justify-between gap-4 mb-10">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#C8A97E]">
                  {lang === 'ar' ? 'اختيارات عملائنا المفضلة' : 'REFINED LIVING · OWNER SELECTION'}
                </p>
                <h2 className={`mt-2 text-3xl sm:text-4xl font-medium text-[#FAF7F2] ${lang === 'ar' ? 'font-arabic' : 'font-display'}`}>
                  {lang === 'ar' ? 'الأكثر مبيعاً · BEST SELLERS' : 'BEST SELLERS'}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => bestSellerTrackRef.current?.scrollBy({ left: -380, behavior: 'smooth' })}
                  aria-label="Scroll best sellers left"
                  className="p-2.5 border border-[#FAF7F2]/25 rounded hover:border-[#C8A97E] text-[#FAF7F2] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => bestSellerTrackRef.current?.scrollBy({ left: 380, behavior: 'smooth' })}
                  aria-label="Scroll best sellers right"
                  className="p-2.5 border border-[#FAF7F2]/25 rounded hover:border-[#C8A97E] text-[#FAF7F2] cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              ref={bestSellerTrackRef}
              className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth"
            >
              {bestSellers.map((product) => {
                const cat = getCategoryForProduct(product);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className="snap-start shrink-0 w-[84vw] sm:w-[360px] bg-[#26211E] border border-[#3A2B22] rounded-lg overflow-hidden text-left hover:border-[#C8A97E] transition-colors cursor-pointer"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden">
                      <img
                        src={product.images[0]}
                        alt={lang === 'ar' ? product.titleAr : product.titleEn}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                      />
                    </div>
                    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="p-5">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#C8A97E]">
                        {cat ? (lang === 'ar' ? cat.nameAr : cat.nameEn) : 'BEST SELLER'}
                      </p>
                      <h3 className={`mt-1.5 text-lg font-medium text-[#FAF7F2] truncate ${lang === 'ar' ? 'font-arabic' : 'font-display text-xl'}`}>
                        {lang === 'ar' ? product.titleAr : product.titleEn}
                      </h3>
                      <p className={`mt-1 text-xs text-[#F2ECE1]/70 line-clamp-2 ${lang === 'ar' ? 'font-arabic' : ''}`}>
                        {lang === 'ar' ? product.descriptionAr : product.descriptionEn}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 7. EXCLUSIVE OFFERS (Auto-hidden when no active offers) */}
      {activeOffers.length > 0 && (
        <section id="offers" className="py-16 sm:py-24 bg-[#F2ECE1] border-b border-[#E5DDD0]">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
            <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="mb-10">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8C7E70]">
                {lang === 'ar' ? 'عروض موسمية مختارة' : 'LIMITED SHOWROOM PRIVILEGES'}
              </p>
              <h2 className={`mt-2 text-3xl sm:text-4xl font-medium text-[#1C1917] ${lang === 'ar' ? 'font-arabic' : 'font-display'}`}>
                {lang === 'ar' ? 'العروض الحصرية · EXCLUSIVE OFFERS' : 'EXCLUSIVE OFFERS'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {activeOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-[#FAF7F2] border border-[#D6CCC0] rounded-lg overflow-hidden shadow-sm"
                >
                  <div className="aspect-[16/9] w-full overflow-hidden bg-[#1C1917]">
                    <img
                      src={offer.imageUrl}
                      alt={lang === 'ar' ? offer.titleAr : offer.titleEn}
                      referrerPolicy="no-referrer"
                      onClick={() => setLightboxImage(offer.imageUrl)}
                      className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className={`text-xl font-semibold text-[#1C1917] ${lang === 'ar' ? 'font-arabic' : 'font-display text-2xl'}`}>
                        {lang === 'ar' ? offer.titleAr : offer.titleEn}
                      </h3>
                      {(offer.subtitleEn || offer.subtitleAr || offer.descriptionEn || offer.descriptionAr) && (
                        <p className={`mt-1 text-sm text-[#3A2B22] ${lang === 'ar' ? 'font-arabic' : ''}`}>
                          {lang === 'ar'
                            ? offer.descriptionAr || offer.subtitleAr
                            : offer.descriptionEn || offer.subtitleEn}
                        </p>
                      )}
                      {(offer.discountPrice || offer.originalPrice) && (
                        <div className="mt-2 flex items-baseline gap-2 tabular-nums">
                          {offer.discountPrice && (
                            <span className="text-base font-bold text-[#1C1917]">
                              {offer.discountPrice.toLocaleString()} {lang === 'ar' ? 'ج.م' : 'EGP'}
                            </span>
                          )}
                          {offer.originalPrice && (
                            <span className="text-xs text-[#8C7E70] line-through">
                              {offer.originalPrice.toLocaleString()} {lang === 'ar' ? 'ج.م' : 'EGP'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <a
                      href={`${data.settings.whatsappUrl}?text=${encodeURIComponent(
                        `استفسار عن العرض الحصري: ${offer.titleAr || offer.titleEn}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1C1917] text-[#FAF7F2] text-xs font-medium uppercase tracking-wider rounded hover:bg-[#3A2B22] whitespace-nowrap shrink-0"
                    >
                      <MessageCircle className="w-4 h-4 text-[#C8A97E]" />
                      <span>{lang === 'ar' ? 'احجز العرض' : 'Inquire'}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 8. VIDEO GALLERY (Auto-hidden when no active videos) */}
      {activeVideos.length > 0 && (
        <section id="videos" className="py-16 sm:py-24 bg-[#FAF7F2] border-b border-[#E5DDD0]">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
            <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="mb-10">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8C7E70]">
                {lang === 'ar' ? 'جولات مصورة داخل المعرض' : 'SHOWROOM FILMS'}
              </p>
              <h2 className={`mt-2 text-3xl sm:text-4xl font-medium text-[#1C1917] ${lang === 'ar' ? 'font-arabic' : 'font-display'}`}>
                {lang === 'ar' ? 'معرض الفيديو · VIDEO GALLERY' : 'VIDEO GALLERY'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {activeVideos.map((vid) => {
                const isPlaying = playingVideoId === vid.id;
                return (
                  <div
                    key={vid.id}
                    className="bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg overflow-hidden shadow-sm"
                  >
                    <div className="relative aspect-video bg-[#1C1917]">
                      <video
                        ref={(el) => {
                          videoRefs.current[vid.id] = el;
                        }}
                        src={vid.videoUrl}
                        poster={vid.thumbnailUrl || undefined}
                        playsInline
                        onEnded={() => setPlayingVideoId(null)}
                        className="w-full h-full object-cover"
                      />

                      <div className="absolute inset-0 flex items-center justify-center gap-3 bg-[#1C1917]/25">
                        <button
                          type="button"
                          onClick={() => toggleInlineVideo(vid.id)}
                          aria-label={isPlaying ? 'Pause video' : 'Play video'}
                          className="p-3.5 rounded-full bg-[#FAF7F2]/90 text-[#1C1917] hover:bg-[#C8A97E] transition-colors cursor-pointer"
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveVideoModal(vid)}
                          aria-label="Fullscreen video"
                          className="p-3 rounded-full bg-[#1C1917]/80 text-[#FAF7F2] hover:bg-[#C8A97E] hover:text-[#1C1917] transition-colors cursor-pointer"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="p-4">
                      <h3 className={`text-base font-semibold text-[#1C1917] ${lang === 'ar' ? 'font-arabic' : ''}`}>
                        {lang === 'ar' ? vid.titleAr : vid.titleEn}
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 9. CLIENT TESTIMONIALS – REAL CUSTOMER FEEDBACK */}
      {(activeReviews.length > 0 || data.settings.whatsappScreenshots.length > 0) && (
        <section id="reviews" className="py-16 sm:py-24 bg-[#F2ECE1]/70 border-b border-[#E5DDD0]">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
            <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#8C7E70]">
                  {lang === 'ar' ? 'رسائل عملائنا الحقيقية عبر واتساب' : 'REAL CLIENT FEEDBACK'}
                </p>
                <h2 className={`mt-2 text-3xl sm:text-4xl font-medium text-[#1C1917] ${lang === 'ar' ? 'font-arabic' : 'font-display'}`}>
                  {lang === 'ar' ? 'آراء عملائنا · CLIENT TESTIMONIALS' : 'CLIENT TESTIMONIALS'}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewIndex((prev) => (prev - 1 + activeReviews.length) % Math.max(1, activeReviews.length))}
                  aria-label="Previous testimonial"
                  className="p-2.5 border border-[#D6CCC0] rounded bg-[#FAF7F2] hover:border-[#B89362] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setReviewIndex((prev) => (prev + 1) % Math.max(1, activeReviews.length))}
                  aria-label="Next testimonial"
                  className="p-2.5 border border-[#D6CCC0] rounded bg-[#FAF7F2] hover:border-[#B89362] cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {data.settings.reviewDisplayMode === 'screenshots' && data.settings.whatsappScreenshots.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.settings.whatsappScreenshots.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    onClick={() => setLightboxImage(src)}
                    className="bg-[#FAF7F2] border border-[#D6CCC0] rounded-lg overflow-hidden p-3 hover:border-[#B89362] transition-colors cursor-zoom-in"
                  >
                    <img
                      src={src}
                      alt={`WhatsApp client feedback ${i + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-96 object-contain rounded"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {/* Featured Auto-Slider Card */}
                {activeReviews[reviewIndex] && (
                  <div
                    dir="rtl"
                    className="bg-[#FAF7F2] border border-[#D6CCC0] rounded-lg p-6 sm:p-10 shadow-sm max-w-4xl mx-auto text-right"
                  >
                    {activeReviews[reviewIndex].showStars && (
                      <div className="flex items-center gap-1 mb-4 text-[#B89362]">
                        {Array.from({ length: activeReviews[reviewIndex].rating || 5 }).map((_, idx) => (
                          <Star key={idx} className="w-4 h-4 fill-[#B89362]" />
                        ))}
                      </div>
                    )}
                    <blockquote className="font-arabic text-xl sm:text-2xl lg:text-3xl font-medium text-[#1C1917] leading-relaxed">
                      «{activeReviews[reviewIndex].commentAr}»
                    </blockquote>
                    <div className="mt-6 pt-4 border-t border-[#E5DDD0] flex flex-wrap items-center justify-between gap-3 text-xs text-[#8C7E70]">
                      <span className="font-arabic">
                        {activeReviews[reviewIndex].customerName
                          ? `${activeReviews[reviewIndex].customerName} · عميل أولاد الراجحي للأثاث`
                          : 'عميل أولاد الراجحي للأثاث · رسالة واتساب أصلية'}
                      </span>
                      {activeReviews[reviewIndex].screenshotUrl && (
                        <button
                          type="button"
                          onClick={() => setLightboxImage(activeReviews[reviewIndex].screenshotUrl || null)}
                          className="underline text-[#3A2B22] hover:text-[#B89362] cursor-pointer font-arabic"
                        >
                          عرض لقطة شاشة المحادثة الأصلية
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* All Original Client Comments Grid */}
                <div dir="rtl" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {activeReviews.map((rev, idx) => (
                    <button
                      key={rev.id}
                      type="button"
                      onClick={() => setReviewIndex(idx)}
                      className={`text-right p-5 rounded-lg border transition-colors cursor-pointer ${
                        idx === reviewIndex
                          ? 'bg-[#FAF7F2] border-[#B89362]'
                          : 'bg-[#FAF7F2]/80 border-[#E5DDD0] hover:border-[#C8A97E]'
                      }`}
                    >
                      {rev.showStars && (
                        <div className="flex items-center gap-1 mb-2.5 text-[#B89362]">
                          {Array.from({ length: rev.rating || 5 }).map((_, s) => (
                            <Star key={s} className="w-3.5 h-3.5 fill-[#B89362]" />
                          ))}
                        </div>
                      )}
                      <p className="font-arabic text-sm sm:text-base text-[#1C1917] leading-relaxed">
                        "{rev.commentAr}"
                      </p>
                      <p className="mt-3 text-[11px] text-[#8C7E70] font-arabic">
                        {rev.customerName || 'عميل أولاد الراجحي'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Owner-Approved Delivered Furniture Photographs ONLY */}
            {approvedDeliveredPhotos.length > 0 && (
              <div className="mt-12 pt-10 border-t border-[#D6CCC0]">
                <h3
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  className={`text-xl font-medium text-[#1C1917] mb-5 ${lang === 'ar' ? 'font-arabic' : 'font-display text-2xl'}`}
                >
                  {lang === 'ar' ? 'صور من تسليمات عملائنا المعتمدة' : 'Approved Client Delivery Gallery'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {approvedDeliveredPhotos.map((photo) => (
                    <div key={photo.id} className="bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg overflow-hidden">
                      <img
                        src={photo.imageUrl}
                        alt={lang === 'ar' ? photo.captionAr : photo.captionEn}
                        referrerPolicy="no-referrer"
                        onClick={() => setLightboxImage(photo.imageUrl)}
                        className="w-full aspect-[4/3] object-cover cursor-zoom-in"
                      />
                      {(photo.captionEn || photo.captionAr) && (
                        <p dir={lang === 'ar' ? 'rtl' : 'ltr'} className="p-4 text-xs sm:text-sm text-[#3A2B22] font-arabic">
                          {lang === 'ar' ? photo.captionAr : photo.captionEn}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 10. GOOGLE MAPS – FIND OUR SHOWROOM */}
      <section id="find-us" className="py-16 sm:py-24 bg-[#FAF7F2] border-b border-[#E5DDD0]">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
          <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8C7E70]">
                {lang === 'ar' ? 'زيارة المعرض' : 'SHOWROOM LOCATION'}
              </p>
              <h2 className={`mt-2 text-3xl sm:text-4xl font-medium text-[#1C1917] ${lang === 'ar' ? 'font-arabic' : 'font-display'}`}>
                FIND OUR SHOWROOM
              </h2>

              {hasMapLocation ? (
                <div className="mt-5 space-y-4">
                  {(data.settings.showroomAddressEn || data.settings.showroomAddressAr) && (
                    <div className="flex items-start gap-3 text-sm sm:text-base text-[#3A2B22]">
                      <MapPin className="w-5 h-5 text-[#B89362] shrink-0 mt-0.5" />
                      <p className={lang === 'ar' ? 'font-arabic' : ''}>
                        {lang === 'ar'
                          ? data.settings.showroomAddressAr || data.settings.showroomAddressEn
                          : data.settings.showroomAddressEn || data.settings.showroomAddressAr}
                      </p>
                    </div>
                  )}

                  {computedDirectionsUrl && (
                    <a
                      href={computedDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#1C1917] text-[#FAF7F2] text-xs font-medium uppercase tracking-[0.14em] rounded hover:bg-[#3A2B22] transition-colors"
                    >
                      <span>{lang === 'ar' ? 'الحصول على الاتجاهات' : 'Get Directions'}</span>
                      <ExternalLink className="w-4 h-4 text-[#C8A97E]" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="mt-5 p-6 bg-[#F2ECE1] border border-[#D6CCC0] rounded-lg space-y-4">
                  <p className={`text-sm text-[#3A2B22] leading-relaxed ${lang === 'ar' ? 'font-arabic' : ''}`}>
                    {lang === 'ar'
                      ? 'سيتم عرض موقع المعرض وخريطة جوجل فور تأكيد العنوان من قبل المالك في لوحة التحكم. يمكنك طلب اللوكيشن مباشرة عبر واتساب.'
                      : 'Our official showroom address and interactive Google Map will appear here once confirmed by the owner in the dashboard. Contact us on WhatsApp for direct location sharing.'}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`${data.settings.whatsappUrl}?text=${encodeURIComponent(
                        'مرحباً أولاد الراجحي، برجاء إرسال موقع المعرض على الخريطة'
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1C1917] text-[#FAF7F2] text-xs font-medium rounded hover:bg-[#3A2B22] transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 text-[#C8A97E]" />
                      <span>{lang === 'ar' ? 'طلب الموقع عبر واتساب' : 'Request Location on WhatsApp'}</span>
                    </a>
                    <button
                      type="button"
                      onClick={onOpenAdmin}
                      className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#D6CCC0] bg-[#FAF7F2] text-[#3A2B22] text-xs font-medium rounded hover:border-[#B89362] cursor-pointer"
                    >
                      <span>{lang === 'ar' ? 'تحديد العنوان من لوحة المالك' : 'Set Location in Dashboard'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-7">
              <ShowroomMap settings={data.settings} lang={lang} />
            </div>
          </div>
        </div>
      </section>

      {/* 11. CONTACT & FOOTER */}
      <footer id="contact" className="bg-[#1C1917] text-[#FAF7F2] py-16">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
          <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#FAF7F2]/15">
            <div className="md:col-span-5">
              <p className="font-display text-2xl sm:text-3xl tracking-[0.12em] text-[#FAF7F2]">
                AWLAD AL RAJHI – أولاد الراجحي
              </p>
              <p className="mt-2 text-xs tracking-[0.22em] uppercase text-[#C8A97E]">
                WHERE ELEGANCE MEETS EXCELLENCE
              </p>
              <p className={`mt-4 text-sm text-[#F2ECE1]/75 max-w-md leading-relaxed ${lang === 'ar' ? 'font-arabic' : ''}`}>
                {lang === 'ar'
                  ? 'معرض أولاد الراجحي للأثاث — تصميمات عالمية تجمع بين الفخامة والأصالة وجودة التنفيذ.'
                  : 'An international-standard luxury furniture showroom dedicated to timeless design, enduring materials, and distinguished interiors.'}
              </p>
            </div>

            <div className="md:col-span-4 space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[#C8A97E]">
                {lang === 'ar' ? 'معلومات التواصل المباشر' : 'Direct Contact'}
              </p>
              <a
                href={`tel:+2${data.settings.phone}`}
                className="flex items-center gap-3 text-base text-[#FAF7F2] hover:text-[#C8A97E] transition-colors"
              >
                <Phone className="w-4 h-4 text-[#C8A97E]" />
                <span className="tabular-nums font-medium">{data.settings.phone}</span>
              </a>
              <a
                href={data.settings.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-[#C8A97E] text-[#1C1917] text-xs font-semibold uppercase tracking-[0.12em] rounded hover:bg-[#FAF7F2] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{lang === 'ar' ? 'محادثة واتساب مباشرة' : 'Chat on WhatsApp'}</span>
              </a>
              {data.settings.facebookUrl && (
                <div className="pt-1">
                  <a
                    href={data.settings.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[#F2ECE1]/85 hover:text-[#C8A97E] transition-colors"
                  >
                    <Share2 className="w-4 h-4 text-[#C8A97E]" />
                    <span>{lang === 'ar' ? 'صفحة فيسبوك الرسمية' : 'Official Facebook Page'}</span>
                  </a>
                </div>
              )}
              {data.settings.instagramUrl && (
                <div className="pt-0.5">
                  <a
                    href={data.settings.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[#F2ECE1]/85 hover:text-[#C8A97E] transition-colors"
                  >
                    <Share2 className="w-4 h-4 text-[#C8A97E]" />
                    <span>{lang === 'ar' ? 'حساب إنستغرام الرسمي' : 'Official Instagram'}</span>
                  </a>
                </div>
              )}
            </div>

            <div className="md:col-span-3 space-y-2.5">
              <p className="text-xs uppercase tracking-[0.18em] text-[#C8A97E]">
                {lang === 'ar' ? 'روابط الأقسام' : 'Navigation'}
              </p>
              <div className="flex flex-col items-start gap-2 text-xs text-[#F2ECE1]/80">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })}
                    className="hover:text-[#C8A97E] transition-colors cursor-pointer"
                  >
                    {lang === 'ar' ? item.labelAr : item.labelEn}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#F2ECE1]/60">
            <p>© {new Date().getFullYear()} AWLAD AL RAJHI – أولاد الراجحي. All rights reserved.</p>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="hover:text-[#C8A97E] transition-colors cursor-pointer"
            >
              {lang === 'ar' ? 'بوابة إدارة المعرض' : 'Owner Management Portal'}
            </button>
          </div>
        </div>
      </footer>

      {/* Product Detail Modal */}
      <ProductModal
        product={selectedProduct}
        category={selectedProduct ? getCategoryForProduct(selectedProduct) : undefined}
        lang={lang}
        whatsappUrl={data.settings.whatsappUrl}
        phone={data.settings.phone}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Image Enlarge Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            aria-label="Close image preview"
            className="absolute top-4 right-4 p-2.5 bg-[#FAF7F2] text-[#1C1917] rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxImage}
            alt="Enlarged showroom visual"
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[88vh] object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Fullscreen Video Modal */}
      {activeVideoModal && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/95 flex flex-col items-center justify-center p-4"
          onClick={() => setActiveVideoModal(null)}
        >
          <button
            type="button"
            onClick={() => setActiveVideoModal(null)}
            aria-label="Close video"
            className="absolute top-4 right-4 p-2.5 bg-[#FAF7F2] text-[#1C1917] rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <video
              src={activeVideoModal.videoUrl}
              poster={activeVideoModal.thumbnailUrl || undefined}
              controls
              autoPlay
              className="w-full max-h-[80vh] rounded bg-black"
            />
            <p className="mt-3 text-center text-sm text-[#FAF7F2] font-arabic">
              {lang === 'ar' ? activeVideoModal.titleAr : activeVideoModal.titleEn}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
