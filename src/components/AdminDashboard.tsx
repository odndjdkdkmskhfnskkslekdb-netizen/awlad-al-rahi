import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Award,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Copy,
  Crosshair,
  Database,
  Edit3,
  Eye,
  EyeOff,
  FolderKanban,
  GitMerge,
  Image as ImageIcon,
  ImagePlus,
  Languages,
  LayoutDashboard,
  Link2,
  Lock,
  LogOut,
  MapPin,
  Maximize2,
  Menu,
  MessageSquareQuote,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Square,
  Star,
  Tag,
  Trash2,
  Upload,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import type {
  AdvertisingBanner,
  Category,
  CustomerReview,
  DeliveredGalleryPhoto,
  ExclusiveOffer,
  MediaLibraryItem,
  Product,
  ProductAvailability,
  ReviewStatus,
  ShowroomDatabase,
  ShowroomSettings,
  StagingClassifiedImage,
  SupabaseStatusInfo,
  VideoItem,
} from '../types/showroom.ts';
import { ShowroomMap } from './ShowroomMap.tsx';
import { parseGoogleMapsInput } from '../utils/maps.ts';
import { getSupabaseClient, isSupabaseClientConfigured } from '../lib/supabase.ts';

interface AdminDashboardProps {
  lang: 'en' | 'ar';
  onToggleLang: () => void;
  onBackToSite: () => void;
  onPreviewDraft: (draft: ShowroomDatabase['draft']) => void;
  onPublishedUpdated: () => void;
}

type AdminSection =
  | 'overview'
  | 'products'
  | 'categories'
  | 'ai-upload'
  | 'reviews'
  | 'offers'
  | 'media'
  | 'banners-videos'
  | 'settings';

const CATEGORY_OPTIONS = [
  { slug: 'bedroom-collection', label: 'BEDROOM COLLECTION · غرف النوم الرئيسية' },
  { slug: 'dressing-room', label: 'DRESSING ROOM & VANITIES · التسريحات وغرف الملابس' },
  { slug: 'dining-collection', label: 'DINING COLLECTION · غرف السفرة والنيش' },
  { slug: 'sofa-collection', label: 'SOFA COLLECTION · الصالونات والركنات' },
  { slug: 'office-furniture', label: 'OFFICE FURNITURE · الأثاث المكتبي' },
  { slug: 'chairs', label: 'CHAIRS · الكراسي الفاخرة' },
  { slug: 'beds-youth', label: 'BEDS & YOUTH SUITES · غرف الشباب والأسرّة' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  lang,
  onToggleLang,
  onBackToSite,
  onPreviewDraft,
  onPublishedUpdated,
}) => {
  const isAr = lang === 'ar';

  // Auth & session state
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [publicAccess, setPublicAccess] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Core state
  const [db, setDb] = useState<ShowroomDatabase | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatusInfo | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Staging AI classification state
  const [stagedImages, setStagedImages] = useState<StagingClassifiedImage[]>([]);
  const [enlargedImg, setEnlargedImg] = useState<string | null>(null);
  const [bulkCategorySlug, setBulkCategorySlug] = useState('bedroom-collection');

  // Product state
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productStatusFilter, setProductStatusFilter] = useState<'all' | 'published' | 'hidden' | 'featured' | 'bestseller'>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({
    categoryId: '',
    titleEn: '',
    titleAr: '',
    descriptionEn: '',
    descriptionAr: '',
    materialsEn: '',
    materialsAr: '',
    price: '',
    discountPrice: '',
    availability: 'in-stock' as ProductAvailability,
    images: [] as string[],
    isBestSeller: false,
    isFeatured: false,
    isPublished: true,
  });

  // Category state
  const [newCategory, setNewCategory] = useState({
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    descriptionAr: '',
    coverImage: '',
  });
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');

  // Banners & Videos state
  const [newBanner, setNewBanner] = useState({
    titleEn: '',
    titleAr: '',
    subtitleEn: '',
    subtitleAr: '',
    imageUrl: '',
  });
  const [newVideoTitleEn, setNewVideoTitleEn] = useState('');
  const [newVideoTitleAr, setNewVideoTitleAr] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);

  // Offers state
  const [newOffer, setNewOffer] = useState({
    titleEn: '',
    titleAr: '',
    subtitleEn: '',
    subtitleAr: '',
    descriptionEn: '',
    descriptionAr: '',
    originalPrice: '',
    discountPrice: '',
    imageUrl: '',
  });
  const [editingOffer, setEditingOffer] = useState<ExclusiveOffer | null>(null);
  const [featuredSearch, setFeaturedSearch] = useState('');

  // Reviews state
  const [reviewFilter, setReviewFilter] = useState<'all' | ReviewStatus>('all');
  const [newReviewCustomerName, setNewReviewCustomerName] = useState('');
  const [newReviewAr, setNewReviewAr] = useState('');
  const [newReviewScreenshotUrl, setNewReviewScreenshotUrl] = useState('');
  const [newReviewStars, setNewReviewStars] = useState(true);
  const [newReviewStatus, setNewReviewStatus] = useState<ReviewStatus>('approved');

  // Media Library state
  const [mediaItems, setMediaItems] = useState<MediaLibraryItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'uploads' | 'unused' | 'used'>('all');
  const [mediaSearch, setMediaSearch] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Settings / Contact / Maps state
  const [settingsForm, setSettingsForm] = useState({
    brandNameEn: 'AWLAD AL RAJHI',
    brandNameAr: 'أولاد الراجحي للأثاث',
    slogan: 'WHERE ELEGANCE MEETS EXCELLENCE',
    phone: '01275979910',
    whatsappUrl: 'https://wa.me/201275979910',
    facebookUrl: '',
    instagramUrl: '',
    showroomAddressEn: '',
    showroomAddressAr: '',
    latitude: '',
    longitude: '',
    googleMapsUrl: '',
    googleMapsEmbedUrl: '',
  });
  const [resolvingMap, setResolvingMap] = useState(false);

  const notify = (msg: string) => {
    setErrorMsg(null);
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 4500);
  };

  const fail = (msg: string) => {
    setStatusMsg(null);
    setErrorMsg(msg);
  };

  const syncSettingsFromDb = useCallback((json: ShowroomDatabase) => {
    const s = json.draft.settings;
    setSettingsForm({
      brandNameEn: s.brandNameEn || 'AWLAD AL RAJHI',
      brandNameAr: s.brandNameAr || 'أولاد الراجحي للأثاث',
      slogan: s.slogan || 'WHERE ELEGANCE MEETS EXCELLENCE',
      phone: s.phone || '01275979910',
      whatsappUrl: s.whatsappUrl || '',
      facebookUrl: s.facebookUrl || '',
      instagramUrl: s.instagramUrl || '',
      showroomAddressEn: s.showroomAddressEn || '',
      showroomAddressAr: s.showroomAddressAr || '',
      latitude: s.latitude || '',
      longitude: s.longitude || '',
      googleMapsUrl: s.googleMapsUrl || '',
      googleMapsEmbedUrl: s.googleMapsEmbedUrl || '',
    });
  }, []);

  const fetchState = useCallback(async () => {
    const res = await fetch('/api/admin/state', { credentials: 'include' });
    if (res.status === 401) {
      setAuthenticated(false);
      return;
    }
    const json = (await res.json()) as ShowroomDatabase;
    setDb(json);
    syncSettingsFromDb(json);
    setNewProduct((prev) =>
      !prev.categoryId && json.draft.categories[0]
        ? { ...prev, categoryId: json.draft.categories[0].id }
        : prev
    );
  }, [syncSettingsFromDb]);

  const fetchMediaLibrary = useCallback(async () => {
    setMediaLoading(true);
    try {
      const res = await fetch('/api/admin/media', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setMediaItems(json.items || []);
      }
    } finally {
      setMediaLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setAuthenticated(Boolean(d.authenticated));
        setPublicAccess(Boolean(d.publicAccess));
        if (d.email) setAdminEmail(d.email);
        if (d.supabase) setSupabaseStatus(d.supabase);
        if (d.authenticated) {
          fetchState();
        }
      })
      .catch(() => setAuthenticated(false));
  }, [fetchState]);

  useEffect(() => {
    if (authenticated && activeSection === 'media') {
      fetchMediaLibrary();
    }
  }, [authenticated, activeSection, fetchMediaLibrary]);

  const sortedCategories = useMemo(() => {
    if (!db) return [];
    return [...db.draft.categories].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [db]);

  const sortedProducts = useMemo(() => {
    if (!db) return [];
    return [...db.draft.products].sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
  }, [db]);

  const filteredAdminProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return sortedProducts.filter((p) => {
      if (productCategoryFilter !== 'all' && p.categoryId !== productCategoryFilter) return false;
      if (productStatusFilter === 'published' && !p.isPublished) return false;
      if (productStatusFilter === 'hidden' && p.isPublished) return false;
      if (productStatusFilter === 'featured' && !p.isFeatured) return false;
      if (productStatusFilter === 'bestseller' && !p.isBestSeller) return false;
      if (!q) return true;
      return (
        p.titleEn.toLowerCase().includes(q) ||
        p.titleAr.toLowerCase().includes(q) ||
        p.materialsEn.toLowerCase().includes(q) ||
        p.materialsAr.toLowerCase().includes(q)
      );
    });
  }, [sortedProducts, productSearch, productCategoryFilter, productStatusFilter]);

  const filteredReviews = useMemo(() => {
    if (!db) return [];
    return db.draft.reviews.filter((r) => {
      if (reviewFilter === 'all') return true;
      return (r.status || 'approved') === reviewFilter;
    });
  }, [db, reviewFilter]);

  const filteredMedia = useMemo(() => {
    const q = mediaSearch.trim().toLowerCase();
    return mediaItems.filter((m) => {
      if (mediaFilter === 'uploads' && m.source !== 'uploads') return false;
      if (mediaFilter === 'unused' && m.usedIn.length > 0) return false;
      if (mediaFilter === 'used' && m.usedIn.length === 0) return false;
      if (!q) return true;
      return (
        m.filename.toLowerCase().includes(q) ||
        m.usedIn.some((u) => u.toLowerCase().includes(q))
      );
    });
  }, [mediaItems, mediaFilter, mediaSearch]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoggingIn(true);
    try {
      if (isSupabaseClientConfigured()) {
        const sb = getSupabaseClient();
        if (sb) {
          await sb.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPassword });
        }
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthError(
          data.error ||
            (isAr
              ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
              : 'Invalid administrator email or password.')
        );
        return;
      }
      setAuthenticated(true);
      setAdminEmail(data.email || loginEmail.trim());
      setLoginPassword('');
      await fetchState();
      const sbRes = await fetch('/api/admin/supabase-status', { credentials: 'include' });
      if (sbRes.ok) setSupabaseStatus(await sbRes.json());
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (isSupabaseClientConfigured()) {
      const sb = getSupabaseClient();
      if (sb) await sb.auth.signOut().catch(() => {});
    }
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setAuthenticated(false);
    setAdminEmail('');
    setDb(null);
  };

  const applyDbUpdate = (updated: ShowroomDatabase, refreshPublic = true) => {
    setDb(updated);
    syncSettingsFromDb(updated);
    if (refreshPublic) onPublishedUpdated();
  };

  const uploadSingleMedia = async (files: FileList | File[]): Promise<string[]> => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('files', f));
    const res = await fetch('/api/admin/upload-media', {
      method: 'POST',
      credentials: 'include',
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.urls as string[];
  };

  // AI Image Upload & Classification
  const handleAiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('images', f));
      const res = await fetch('/api/admin/upload-and-classify', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Classification failed');
      setStagedImages((prev) => [...json.staged, ...prev]);
      notify(
        isAr
          ? `تم تحليل ${json.staged.length} صورة. راجع الأقسام أدناه ثم اضغط «تأكيد ونشر الصور».`
          : `Analyzed ${json.staged.length} image(s). Review below and click تأكيد ونشر الصور to publish.`
      );
    } catch (err: unknown) {
      fail(err instanceof Error ? err.message : 'Failed to classify images');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const allStagedSelected = stagedImages.length > 0 && stagedImages.every((s) => s.selected);
  const toggleSelectAllStaged = () => {
    const nextVal = !allStagedSelected;
    setStagedImages((prev) => prev.map((s) => ({ ...s, selected: nextVal })));
  };

  const applyBulkCategoryToSelected = () => {
    setStagedImages((prev) =>
      prev.map((s) => (s.selected ? { ...s, selectedCategorySlug: bulkCategorySlug } : s))
    );
    notify(isAr ? 'تم تحديث القسم لجميع الصور المحددة.' : 'Updated category for all selected staged images.');
  };

  const confirmAndPublishStaged = async () => {
    const selected = stagedImages.filter((s) => s.selected);
    if (selected.length === 0) {
      fail(isAr ? 'يرجى تحديد صورة واحدة على الأقل قبل النشر.' : 'Select at least one image before publishing.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/confirm-staged-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items: selected, publishImmediately: true }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Failed to publish staged images');
      applyDbUpdate(updated, true);
      setStagedImages((prev) => prev.filter((s) => !s.selected));
      notify(
        isAr
          ? `تم نشر ${selected.length} قطعة أثاث مباشرة على موقع المعرض!`
          : `Published ${selected.length} furniture piece(s) to the live showroom!`
      );
    } catch (err: unknown) {
      fail(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setBusy(false);
    }
  };

  const publishAllDraft = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/publish', { method: 'POST', credentials: 'include' });
      const updated = await res.json();
      applyDbUpdate(updated, true);
      notify(
        isAr
          ? 'تم نشر ومزامنة جميع التغييرات على الموقع بنجاح!'
          : 'All changes synced live to the AWLAD AL RAJHI showroom.'
      );
    } catch {
      fail(isAr ? 'تعذر نشر التغييرات.' : 'Failed to publish changes.');
    } finally {
      setBusy(false);
    }
  };

  const discardDraft = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/discard-draft', { method: 'POST', credentials: 'include' });
      const updated = await res.json();
      applyDbUpdate(updated, false);
      notify(isAr ? 'تم التراجع عن تعديلات المسودة.' : 'Draft changes discarded.');
    } finally {
      setBusy(false);
    }
  };

  // Loading state
  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center text-sm text-[#8C7E70]">
        {isAr ? 'جارٍ التحقق من جلسة الإدارة...' : 'Verifying administrator session...'}
      </div>
    );
  }

  // Protected Login View (/admin)
  if (!authenticated) {
    return (
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className="min-h-screen bg-[#1C1917] flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md bg-[#FAF7F2] border border-[#C8A97E]/50 rounded-xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="font-display text-2xl tracking-[0.12em] text-[#1C1917] block">
                AWLAD AL RAJHI
              </span>
              <span className="text-[10px] uppercase tracking-[0.22em] text-[#B89362] block">
                WHERE ELEGANCE MEETS EXCELLENCE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleLang}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-[#D6CCC0] rounded hover:border-[#B89362] text-[#3A2B22] cursor-pointer"
              >
                <Languages className="w-3.5 h-3.5 text-[#B89362]" />
                <span>{isAr ? 'EN' : 'العربية'}</span>
              </button>
              <div className="p-2 rounded-lg bg-[#F2ECE1] border border-[#D6CCC0]">
                <Lock className="w-4 h-4 text-[#B89362]" />
              </div>
            </div>
          </div>

          <h1 className={`text-xl font-semibold text-[#1C1917] ${isAr ? 'font-arabic' : ''}`}>
            {isAr ? 'تسجيل دخول الإدارة · أولاد الراجحي' : 'Admin Portal Sign In'}
          </h1>
          <p className={`mt-1 text-xs text-[#8C7E70] ${isAr ? 'font-arabic leading-relaxed' : ''}`}>
            {isAr
              ? 'وصول حصري للمسؤولين المصرح لهم فقط. لا يتوفر تسجيل عام.'
              : 'Restricted access for authorized showroom administrators only. Public registration is disabled.'}
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className={`block text-xs font-medium text-[#3A2B22] mb-1.5 ${isAr ? 'font-arabic' : ''}`}>
                {isAr ? 'البريد الإلكتروني للمسؤول' : 'Administrator Email'}
              </label>
              <input
                type="email"
                dir="ltr"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@awladalrajhi.com"
                autoComplete="email"
                className="w-full px-3.5 py-2.5 bg-[#F2ECE1] border border-[#D6CCC0] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-[#B89362]"
                required
              />
            </div>

            <div>
              <label className={`block text-xs font-medium text-[#3A2B22] mb-1.5 ${isAr ? 'font-arabic' : ''}`}>
                {isAr ? 'كلمة المرور' : 'Password'}
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 bg-[#F2ECE1] border border-[#D6CCC0] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-[#B89362]"
                required
              />
            </div>

            {authError && (
              <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-800 font-arabic">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className={`w-full py-3 bg-[#1C1917] text-[#FAF7F2] text-xs font-semibold uppercase tracking-[0.14em] rounded-lg hover:bg-[#3A2B22] transition-colors cursor-pointer disabled:opacity-60 ${
                isAr ? 'font-arabic tracking-normal text-sm' : ''
              }`}
            >
              {loggingIn
                ? isAr
                  ? 'جارٍ التحقق...'
                  : 'Signing In...'
                : isAr
                ? 'دخول إلى لوحة التحكم'
                : 'Sign In to Admin Dashboard'}
            </button>
          </form>

          <button
            type="button"
            onClick={onBackToSite}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 py-2.5 text-xs text-[#3A2B22] hover:text-[#1C1917] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className={isAr ? 'font-arabic' : ''}>
              {isAr ? 'العودة إلى الموقع الرئيسي' : 'Return to Live Showroom'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (!db) return null;

  const draft = db.draft;
  const previewSettings: ShowroomSettings = {
    ...draft.settings,
    ...settingsForm,
  };

  // Helpers that persist immediately & sync storefront
  const saveBanners = async (banners: AdvertisingBanner[]) => {
    const res = await fetch('/api/admin/banners', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ banners }),
    });
    applyDbUpdate(await res.json(), true);
  };

  const saveOffers = async (offers: ExclusiveOffer[]) => {
    const res = await fetch('/api/admin/offers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ offers }),
    });
    applyDbUpdate(await res.json(), true);
  };

  const saveReviewsAndDelivered = async (
    reviews: CustomerReview[],
    deliveredPhotos?: DeliveredGalleryPhoto[]
  ) => {
    const res = await fetch('/api/admin/reviews', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reviews, deliveredPhotos }),
    });
    const json = await res.json();
    if (!res.ok) {
      fail(json.error || 'Failed to save reviews');
      return;
    }
    applyDbUpdate(json, true);
  };

  const saveVideos = async (videos: VideoItem[]) => {
    const res = await fetch('/api/admin/videos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ videos }),
    });
    applyDbUpdate(await res.json(), true);
  };

  const saveSettings = async (patch: Partial<ShowroomSettings>, message?: string) => {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    const json = (await res.json()) as ShowroomDatabase;
    applyDbUpdate(json, true);
    notify(
      message ||
        (isAr
          ? 'تم حفظ الإعدادات وتحديث الموقع العام مباشرة.'
          : 'Settings saved and synced live to the showroom.')
    );
  };

  const moveCategoryOrder = async (catId: string, direction: -1 | 1) => {
    const idx = sortedCategories.findIndex((c) => c.id === catId);
    const targetIdx = idx + direction;
    if (idx === -1 || targetIdx < 0 || targetIdx >= sortedCategories.length) return;
    const reordered = [...sortedCategories];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    const res = await fetch('/api/admin/categories/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }),
    });
    if (res.ok) {
      applyDbUpdate(await res.json(), true);
      notify(isAr ? 'تم تحديث ترتيب الأقسام.' : 'Category order updated.');
    }
  };

  const moveProductOrder = async (prodId: string, direction: -1 | 1) => {
    const idx = sortedProducts.findIndex((p) => p.id === prodId);
    const targetIdx = idx + direction;
    if (idx === -1 || targetIdx < 0 || targetIdx >= sortedProducts.length) return;
    const reordered = [...sortedProducts];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    const res = await fetch('/api/admin/products/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ orderedIds: reordered.map((p) => p.id) }),
    });
    if (res.ok) {
      applyDbUpdate(await res.json(), true);
      notify(isAr ? 'تم تحديث ترتيب عرض المنتجات.' : 'Product display order updated.');
    }
  };

  const handleResolveGoogleMapsLink = async () => {
    const raw = settingsForm.googleMapsUrl.trim();
    if (!raw) {
      fail(isAr ? 'الصق رابط خرائط جوجل أولاً.' : 'Paste a Google Maps link first.');
      return;
    }

    const localParsed = parseGoogleMapsInput(raw);
    if (localParsed?.latitude && localParsed?.longitude) {
      const updated = {
        ...settingsForm,
        latitude: localParsed.latitude,
        longitude: localParsed.longitude,
        googleMapsEmbedUrl: localParsed.embedUrl || settingsForm.googleMapsEmbedUrl,
      };
      setSettingsForm(updated);
      await saveSettings(
        updated,
        isAr
          ? `تم استخراج الإحداثيات وربط خرائط جوجل (${localParsed.latitude}, ${localParsed.longitude}) بنجاح!`
          : `Extracted coordinates (${localParsed.latitude}, ${localParsed.longitude}) and linked Google Maps!`
      );
      return;
    }

    setResolvingMap(true);
    try {
      const res = await fetch('/api/admin/resolve-maps-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: raw }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not resolve link');

      const updated = {
        ...settingsForm,
        googleMapsUrl: json.resolvedUrl || raw,
        latitude: json.latitude || settingsForm.latitude,
        longitude: json.longitude || settingsForm.longitude,
      };
      setSettingsForm(updated);
      await saveSettings(
        updated,
        json.latitude
          ? isAr
            ? `تم فك الرابط المختصر واستخراج الموقع (${json.latitude}, ${json.longitude})!`
            : `Resolved shortened link and pinned (${json.latitude}, ${json.longitude})!`
          : isAr
          ? 'تم حفظ رابط خرائط جوجل.'
          : 'Google Maps link saved.'
      );
    } catch (err: unknown) {
      fail(err instanceof Error ? err.message : isAr ? 'تعذر قراءة رابط خرائط جوجل.' : 'Failed to parse Google Maps link.');
    } finally {
      setResolvingMap(false);
    }
  };

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      fail(isAr ? 'المتصفح لا يدعم تحديد الموقع التلقائي.' : 'Geolocation is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const gUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        const updated = {
          ...settingsForm,
          latitude: lat,
          longitude: lng,
          googleMapsUrl: gUrl,
        };
        setSettingsForm(updated);
        await saveSettings(
          updated,
          isAr ? `تم التقاط موقعك الحالي (${lat}, ${lng}) وربطه بالخريطة.` : `Captured GPS coordinates (${lat}, ${lng}).`
        );
      },
      () => {
        fail(
          isAr
            ? 'تعذر الحصول على الموقع الحالي. يرجى السماح بصلاحية الموقع أو لصق رابط خرائط جوجل.'
            : 'Unable to retrieve GPS location. Please allow location access or paste a Google Maps link.'
        );
      }
    );
  };

  // KPI computations
  const publishedProductsCount = draft.products.filter((p) => p.isPublished).length;
  const featuredProductsCount = draft.products.filter((p) => p.isFeatured || p.isBestSeller).length;
  const approvedReviewsCount = draft.reviews.filter((r) => (r.status || 'approved') === 'approved').length;
  const recentUpdates = draft.recentUpdates || [];

  const navItems: {
    id: AdminSection;
    labelEn: string;
    labelAr: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[] = [
    { id: 'overview', labelEn: 'Dashboard Overview', labelAr: 'نظرة عامة', icon: LayoutDashboard },
    { id: 'products', labelEn: 'Products', labelAr: 'المنتجات', icon: Package, badge: draft.products.length },
    { id: 'categories', labelEn: 'Categories', labelAr: 'الأقسام', icon: FolderKanban, badge: draft.categories.length },
    { id: 'ai-upload', labelEn: 'AI Smart Upload', labelAr: 'تصنيف الصور الذكي', icon: Sparkles, badge: stagedImages.length || undefined },
    { id: 'reviews', labelEn: 'Customer Reviews', labelAr: 'آراء العملاء', icon: MessageSquareQuote, badge: `${draft.reviews.length}/20` },
    { id: 'offers', labelEn: 'Offers & Featured', labelAr: 'العروض والمميزة', icon: Tag, badge: draft.offers.length },
    { id: 'media', labelEn: 'Media Library', labelAr: 'مكتبة الصور', icon: ImageIcon },
    { id: 'banners-videos', labelEn: 'Banners & Videos', labelAr: 'البنرات والفيديو', icon: Video },
    { id: 'settings', labelEn: 'Contact & Google Maps', labelAr: 'التواصل وخرائط جوجل', icon: MapPin },
  ];

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen bg-[#FAF7F2] text-[#1C1917] flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#1C1917]/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Luxury Sidebar */}
      <aside
        className={`fixed inset-y-0 z-50 w-72 bg-[#1C1917] text-[#FAF7F2] border-[#3A2B22] flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          isAr ? 'right-0 border-l' : 'left-0 border-r'
        } ${
          sidebarOpen
            ? 'translate-x-0'
            : isAr
            ? 'translate-x-full lg:translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 border-b border-[#3A2B22] flex items-center justify-between">
          <div>
            <p className="font-display text-xl tracking-[0.12em] text-[#C8A97E]">AWLAD AL RAJHI</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#F2ECE1]/60">
              {isAr ? 'لوحة إدارة المعرض' : 'Showroom Admin Suite'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-[#F2ECE1]/70 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveSection(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#C8A97E] text-[#1C1917] font-semibold shadow-sm'
                    : 'text-[#F2ECE1]/80 hover:bg-[#3A2B22] hover:text-[#FAF7F2]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${active ? 'text-[#1C1917]' : 'text-[#C8A97E]'}`} />
                  <span className={isAr ? 'font-arabic text-[13px]' : ''}>
                    {isAr ? item.labelAr : item.labelEn}
                  </span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] tabular-nums ${
                      active ? 'bg-[#1C1917] text-[#C8A97E]' : 'bg-[#3A2B22] text-[#F2ECE1]/80'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#3A2B22] space-y-3">
          <div className="text-[11px] text-[#F2ECE1]/70 truncate">
            <span className="block text-[10px] uppercase tracking-wider text-[#C8A97E]">
              {publicAccess
                ? isAr
                  ? 'وضع الوصول العام المفتوح'
                  : 'Open Public Access'
                : isAr
                ? 'المسؤول المتصل'
                : 'Signed In Administrator'}
            </span>
            <span dir="ltr">{adminEmail || 'admin@awladalrajhi.com'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToSite}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded border border-[#FAF7F2]/25 text-xs hover:border-[#C8A97E] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#C8A97E]" />
              <span className={isAr ? 'font-arabic' : ''}>{isAr ? 'العودة للمعرض' : 'Back to Storefront'}</span>
            </button>
            {!publicAccess && (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-red-900/40 border border-red-400/30 text-xs text-red-100 hover:bg-red-900/70 cursor-pointer"
                title={isAr ? 'تسجيل الخروج' : 'Sign Out'}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky Top Toolbar */}
        <header className="sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur border-b border-[#D6CCC0] px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded border border-[#D6CCC0] bg-[#F2ECE1] text-[#1C1917] cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <h1 className={`text-base sm:text-lg font-semibold text-[#1C1917] ${isAr ? 'font-arabic' : 'font-display'}`}>
                {isAr
                  ? navItems.find((n) => n.id === activeSection)?.labelAr
                  : navItems.find((n) => n.id === activeSection)?.labelEn}
              </h1>
              <p className="text-[11px] text-[#8C7E70]">
                {supabaseStatus?.configured
                  ? isAr
                    ? 'متصل مع Supabase · المزامنة التلقائية مفعّلة'
                    : 'Supabase Cloud Connected · Auto-Synced'
                  : isAr
                  ? 'حفظ فوري على الخادم · مزامنة مباشرة للموقع العام'
                  : 'Server Storage Active · Auto-Synced to Public Storefront'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {db.hasUnpublishedChanges && (
              <span className="px-2.5 py-1 rounded bg-[#C8A97E]/25 text-[#3A2B22] text-xs font-medium">
                {isAr ? 'مسودة غير منشورة' : 'Unpublished Draft'}
              </span>
            )}
            <button
              type="button"
              onClick={onToggleLang}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-[#D6CCC0] bg-[#F2ECE1] rounded hover:border-[#B89362] cursor-pointer"
            >
              <Languages className="w-3.5 h-3.5 text-[#B89362]" />
              <span>{isAr ? 'EN' : 'العربية'}</span>
            </button>
            <button
              type="button"
              onClick={() => onPreviewDraft(draft)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#D6CCC0] bg-[#F2ECE1] rounded hover:border-[#B89362] cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className={isAr ? 'font-arabic' : ''}>{isAr ? 'معاينة' : 'Preview'}</span>
            </button>
            {db.hasUnpublishedChanges && (
              <button
                type="button"
                onClick={discardDraft}
                disabled={busy}
                className="px-3 py-1.5 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50 cursor-pointer"
              >
                {isAr ? 'تراجع' : 'Discard'}
              </button>
            )}
            <button
              type="button"
              onClick={publishAllDraft}
              disabled={busy}
              className="px-4 py-1.5 text-xs font-semibold bg-[#1C1917] text-[#FAF7F2] rounded hover:bg-[#3A2B22] transition-colors cursor-pointer font-arabic"
            >
              {isAr ? 'مزامنة ونشر الموقع' : 'Sync & Publish Live'}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto space-y-6">
          {statusMsg && (
            <div className="p-3.5 bg-[#F2ECE1] border border-[#B89362] text-[#1C1917] text-sm rounded-lg font-arabic flex items-center justify-between gap-2">
              <span>{statusMsg}</span>
              <button type="button" onClick={() => setStatusMsg(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-300 text-red-900 text-sm rounded-lg font-arabic flex items-center justify-between gap-2">
              <span>{errorMsg}</span>
              <button type="button" onClick={() => setErrorMsg(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 1. OVERVIEW SECTION */}
          {activeSection === 'overview' && (
            <section className="space-y-6">
              {/* 6 Key Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                  { labelEn: 'Total Products', labelAr: 'إجمالي المنتجات', value: draft.products.length, sub: isAr ? 'في الكتالوج' : 'In catalog' },
                  { labelEn: 'Total Categories', labelAr: 'إجمالي الأقسام', value: draft.categories.length, sub: isAr ? 'أقسام المعرض' : 'Showroom collections' },
                  { labelEn: 'Published Products', labelAr: 'المنتجات المنشورة', value: publishedProductsCount, sub: isAr ? 'ظاهرة للزوار' : 'Visible to visitors' },
                  { labelEn: 'Featured Products', labelAr: 'المنتجات المميزة', value: featuredProductsCount, sub: isAr ? 'مميزة وأكثر مبيعاً' : 'Featured & Best Sellers' },
                  { labelEn: 'Customer Reviews', labelAr: 'آراء العملاء', value: `${approvedReviewsCount}/${draft.reviews.length}`, sub: isAr ? 'معتمدة للعرض' : 'Approved live' },
                  { labelEn: 'Recent Updates', labelAr: 'أحدث التحديثات', value: recentUpdates.length, sub: isAr ? 'سجل العمليات' : 'Logged actions' },
                ].map((stat) => (
                  <div
                    key={stat.labelEn}
                    className="bg-[#F2ECE1] border border-[#D6CCC0] rounded-xl p-4 flex flex-col justify-between"
                  >
                    <p className={`text-[11px] uppercase tracking-wider text-[#8C7E70] ${isAr ? 'font-arabic tracking-normal' : ''}`}>
                      {isAr ? stat.labelAr : stat.labelEn}
                    </p>
                    <p className="mt-2 font-display text-3xl font-semibold text-[#1C1917] tabular-nums">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-[11px] text-[#3A2B22]/75">{stat.sub}</p>
                  </div>
                ))}
              </div>

              {/* Quick Actions + Supabase Integration Status */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-[#FAF7F2] border border-[#D6CCC0] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-lg font-semibold ${isAr ? 'font-arabic' : 'font-display'}`}>
                      {isAr ? 'أحدث التحديثات وسجل النشاط' : 'Recent Updates & Activity Log'}
                    </h2>
                    <Clock className="w-4 h-4 text-[#B89362]" />
                  </div>

                  {recentUpdates.length === 0 ? (
                    <p className="text-xs text-[#8C7E70]">
                      {isAr ? 'لا توجد تحديثات مسجلة حتى الآن.' : 'No activity recorded yet.'}
                    </p>
                  ) : (
                    <div className="divide-y divide-[#E5DDD0] max-h-80 overflow-y-auto">
                      {recentUpdates.slice(0, 12).map((entry) => (
                        <div key={entry.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <p className={`font-medium text-[#1C1917] ${isAr ? 'font-arabic' : ''}`}>
                              {isAr ? entry.actionAr : entry.actionEn}
                            </p>
                            <p className="text-[11px] text-[#8C7E70]" dir="ltr">
                              {entry.actor}
                            </p>
                          </div>
                          <span className="text-[11px] text-[#8C7E70] shrink-0" dir="ltr">
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 space-y-4">
                  {/* Quick Launch */}
                  <div className="bg-[#F2ECE1] border border-[#D6CCC0] rounded-xl p-5 space-y-3">
                    <h3 className={`text-base font-semibold ${isAr ? 'font-arabic' : 'font-display'}`}>
                      {isAr ? 'إجراءات سريعة' : 'Quick Actions'}
                    </h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setActiveSection('products')}
                        className="p-3 bg-[#FAF7F2] border border-[#D6CCC0] hover:border-[#B89362] rounded-lg text-xs font-medium text-start cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-[#B89362] mb-1" />
                        {isAr ? 'إضافة منتج جديد' : 'Add Product'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection('offers')}
                        className="p-3 bg-[#FAF7F2] border border-[#D6CCC0] hover:border-[#B89362] rounded-lg text-xs font-medium text-start cursor-pointer"
                      >
                        <Tag className="w-4 h-4 text-[#B89362] mb-1" />
                        {isAr ? 'إدارة العروض والمميزة' : 'Offers & Featured'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection('media')}
                        className="p-3 bg-[#FAF7F2] border border-[#D6CCC0] hover:border-[#B89362] rounded-lg text-xs font-medium text-start cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4 text-[#B89362] mb-1" />
                        {isAr ? 'مكتبة الوسائط' : 'Media Library'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection('reviews')}
                        className="p-3 bg-[#FAF7F2] border border-[#D6CCC0] hover:border-[#B89362] rounded-lg text-xs font-medium text-start cursor-pointer"
                      >
                        <MessageSquareQuote className="w-4 h-4 text-[#B89362] mb-1" />
                        {isAr ? 'اعتماد آراء العملاء' : 'Moderate Reviews'}
                      </button>
                    </div>
                  </div>

                  {/* Honest Supabase Connection Diagnostics */}
                  <div className="bg-[#FAF7F2] border border-[#D6CCC0] rounded-xl p-5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#1C1917]">
                        <Database className="w-4 h-4 text-[#B89362]" />
                        {isAr ? 'حالة اتصال Supabase' : 'Supabase Connection Status'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          supabaseStatus?.configured
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {supabaseStatus?.configured
                          ? isAr
                            ? 'متصل'
                            : 'Connected'
                          : isAr
                          ? 'غير مهيأ بعد'
                          : 'Env Vars Missing'}
                      </span>
                    </div>
                    {supabaseStatus?.configured ? (
                      <p className="text-xs text-[#3A2B22]">
                        {isAr
                          ? 'جميع متغيرات بيئة Supabase مهيأة، ومخطط الجداول جاهز في supabase/schema.sql.'
                          : 'Supabase Auth and environment keys are active. Schema ready at supabase/schema.sql.'}
                      </p>
                    ) : (
                      <div className="text-xs text-[#3A2B22] space-y-1.5">
                        <p>
                          {isAr
                            ? 'لم يتم العثور على مفاتيح Supabase في البيئة الحالية. يعمل المعرض الآن بكامل وظائفه عبر تخزين الخادم المحلي الآمن مع مزامنة فورية للموقع العام.'
                            : 'No Supabase project credentials were detected in this workspace environment. All dashboard changes currently persist cleanly to the server store and sync immediately to the live site.'}
                        </p>
                        {supabaseStatus?.missingVars?.length ? (
                          <p className="text-[11px] font-mono bg-[#F2ECE1] p-2 rounded border border-[#D6CCC0]" dir="ltr">
                            Missing: {supabaseStatus.missingVars.join(', ')}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 2. PRODUCTS MANAGEMENT */}
          {activeSection === 'products' && (
            <section className="space-y-6">
              {/* Add Product Form */}
              <div className="bg-[#F2ECE1] border border-[#D6CCC0] rounded-xl p-6 space-y-4">
                <h2 className={`text-xl font-semibold ${isAr ? 'font-arabic' : 'font-display'}`}>
                  {isAr ? 'إضافة منتج جديد للمعرض' : 'Add New Furniture Product'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select
                    value={newProduct.categoryId}
                    onChange={(e) => setNewProduct((p) => ({ ...p, categoryId: e.target.value }))}
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                  >
                    {sortedCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameEn} · {c.nameAr}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Product Title (English)"
                    value={newProduct.titleEn}
                    onChange={(e) => setNewProduct((p) => ({ ...p, titleEn: e.target.value }))}
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                  />
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="اسم المنتج بالعربية"
                    value={newProduct.titleAr}
                    onChange={(e) => setNewProduct((p) => ({ ...p, titleAr: e.target.value }))}
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm font-arabic"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <textarea
                    rows={2}
                    placeholder="Description (English)"
                    value={newProduct.descriptionEn}
                    onChange={(e) => setNewProduct((p) => ({ ...p, descriptionEn: e.target.value }))}
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                  />
                  <textarea
                    rows={2}
                    dir="rtl"
                    placeholder="وصف المنتج بالعربية"
                    value={newProduct.descriptionAr}
                    onChange={(e) => setNewProduct((p) => ({ ...p, descriptionAr: e.target.value }))}
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm font-arabic"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <input
                    type="text"
                    placeholder="Materials (EN)"
                    value={newProduct.materialsEn}
                    onChange={(e) => setNewProduct((p) => ({ ...p, materialsEn: e.target.value }))}
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                  />
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="الخامات (AR)"
                    value={newProduct.materialsAr}
                    onChange={(e) => setNewProduct((p) => ({ ...p, materialsAr: e.target.value }))}
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm font-arabic"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder={isAr ? 'السعر (اختياري)' : 'Price EGP (optional)'}
                    value={newProduct.price}
                    onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder={isAr ? 'سعر الخصم (اختياري)' : 'Discount Price (optional)'}
                    value={newProduct.discountPrice}
                    onChange={(e) => setNewProduct((p) => ({ ...p, discountPrice: e.target.value }))}
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                  />
                  <select
                    value={newProduct.availability}
                    onChange={(e) =>
                      setNewProduct((p) => ({ ...p, availability: e.target.value as ProductAvailability }))
                    }
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                  >
                    <option value="in-stock">{isAr ? 'متوفر بالمعرض' : 'In Stock'}</option>
                    <option value="made-to-order">{isAr ? 'تفصيل حسب الطلب' : 'Made to Order'}</option>
                    <option value="out-of-stock">{isAr ? 'غير متوفر حالياً' : 'Unavailable'}</option>
                  </select>
                </div>

                {newProduct.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newProduct.images.map((url, idx) => (
                      <div key={`${url}-${idx}`} className="relative w-20 h-16 border border-[#D6CCC0] rounded overflow-hidden">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            setNewProduct((p) => ({
                              ...p,
                              images: p.images.filter((_, i) => i !== idx),
                            }))
                          }
                          className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded-full cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-xs cursor-pointer hover:border-[#B89362]">
                    <ImagePlus className="w-4 h-4 text-[#B89362]" />
                    <span className={isAr ? 'font-arabic' : ''}>
                      {isAr
                        ? `رفع صور المنتج (${newProduct.images.length})`
                        : `Upload Product Images (${newProduct.images.length})`}
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        if (!e.target.files?.length) return;
                        try {
                          const urls = await uploadSingleMedia(e.target.files);
                          setNewProduct((p) => ({ ...p, images: [...p.images, ...urls] }));
                        } catch (err: unknown) {
                          fail(err instanceof Error ? err.message : 'Upload failed');
                        }
                      }}
                    />
                  </label>

                  <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProduct.isBestSeller}
                      onChange={(e) => setNewProduct((p) => ({ ...p, isBestSeller: e.target.checked }))}
                    />
                    <span>{isAr ? 'الأكثر مبيعاً' : 'Best Seller'}</span>
                  </label>

                  <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProduct.isFeatured}
                      onChange={(e) => setNewProduct((p) => ({ ...p, isFeatured: e.target.checked }))}
                    />
                    <span>{isAr ? 'منتج مميز' : 'Featured'}</span>
                  </label>

                  <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProduct.isPublished}
                      onChange={(e) => setNewProduct((p) => ({ ...p, isPublished: e.target.checked }))}
                    />
                    <span>{isAr ? 'منشور فوراً' : 'Published'}</span>
                  </label>

                  <button
                    type="button"
                    onClick={async () => {
                      if ((!newProduct.titleEn && !newProduct.titleAr) || !newProduct.categoryId || newProduct.images.length === 0) {
                        fail(
                          isAr
                            ? 'يرجى اختيار القسم وكتابة اسم المنتج ورفع صورة واحدة على الأقل.'
                            : 'Provide category, product title, and at least one image.'
                        );
                        return;
                      }
                      const payload = {
                        categoryId: newProduct.categoryId,
                        titleEn: newProduct.titleEn || newProduct.titleAr,
                        titleAr: newProduct.titleAr || newProduct.titleEn,
                        descriptionEn: newProduct.descriptionEn,
                        descriptionAr: newProduct.descriptionAr,
                        materialsEn: newProduct.materialsEn,
                        materialsAr: newProduct.materialsAr,
                        price: newProduct.price ? Number(newProduct.price) : undefined,
                        discountPrice: newProduct.discountPrice ? Number(newProduct.discountPrice) : undefined,
                        availability: newProduct.availability,
                        images: newProduct.images,
                        isBestSeller: newProduct.isBestSeller,
                        isFeatured: newProduct.isFeatured,
                        isPublished: newProduct.isPublished,
                      };
                      const res = await fetch('/api/admin/products', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payload),
                      });
                      const updated = await res.json();
                      if (!res.ok) return fail(updated.error);
                      applyDbUpdate(updated, true);
                      setNewProduct({
                        categoryId: sortedCategories[0]?.id || '',
                        titleEn: '',
                        titleAr: '',
                        descriptionEn: '',
                        descriptionAr: '',
                        materialsEn: '',
                        materialsAr: '',
                        price: '',
                        discountPrice: '',
                        availability: 'in-stock',
                        images: [],
                        isBestSeller: false,
                        isFeatured: false,
                        isPublished: true,
                      });
                      notify(isAr ? 'تمت إضافة المنتج ونشره على الموقع.' : 'Product added and synced live.');
                    }}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#1C1917] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider rounded cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span className={isAr ? 'font-arabic tracking-normal text-sm' : ''}>
                      {isAr ? 'إضافة المنتج' : 'Add Product'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-[#FAF7F2] border border-[#D6CCC0] rounded-xl p-4">
                <div className="relative flex-1">
                  <Search className={`w-4 h-4 text-[#8C7E70] absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'}`} />
                  <input
                    type="search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder={isAr ? 'ابحث باسم المنتج أو الخامات...' : 'Search products by name or material...'}
                    className={`w-full py-2 bg-[#F2ECE1] border border-[#D6CCC0] rounded text-sm ${
                      isAr ? 'pr-9 pl-3 font-arabic' : 'pl-9 pr-3'
                    }`}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="px-3 py-2 bg-[#F2ECE1] border border-[#D6CCC0] rounded text-xs"
                  >
                    <option value="all">{isAr ? 'كل الأقسام' : 'All Categories'}</option>
                    {sortedCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {isAr ? c.nameAr : c.nameEn}
                      </option>
                    ))}
                  </select>

                  <select
                    value={productStatusFilter}
                    onChange={(e) => setProductStatusFilter(e.target.value as typeof productStatusFilter)}
                    className="px-3 py-2 bg-[#F2ECE1] border border-[#D6CCC0] rounded text-xs"
                  >
                    <option value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
                    <option value="published">{isAr ? 'منشور فقط' : 'Published Only'}</option>
                    <option value="hidden">{isAr ? 'مخفي فقط' : 'Hidden Only'}</option>
                    <option value="featured">{isAr ? 'مميز فقط' : 'Featured Only'}</option>
                    <option value="bestseller">{isAr ? 'الأكثر مبيعاً' : 'Best Sellers'}</option>
                  </select>
                </div>
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredAdminProducts.map((prod) => (
                  <div key={prod.id} className="bg-[#FAF7F2] border border-[#D6CCC0] rounded-xl overflow-hidden flex flex-col">
                    <div className="relative aspect-[4/3] bg-[#F2ECE1]">
                      <img src={prod.images[0]} alt={prod.titleEn} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveProductOrder(prod.id, -1)}
                            className="p-1.5 rounded bg-[#FAF7F2]/90 border border-[#D6CCC0] text-[#1C1917] cursor-pointer"
                            title={isAr ? 'تحريك للأعلى' : 'Move earlier'}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveProductOrder(prod.id, 1)}
                            className="p-1.5 rounded bg-[#FAF7F2]/90 border border-[#D6CCC0] text-[#1C1917] cursor-pointer"
                            title={isAr ? 'تحريك للأسفل' : 'Move later'}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await fetch(`/api/admin/products/${prod.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ isFeatured: !prod.isFeatured }),
                              });
                              applyDbUpdate(await res.json(), true);
                            }}
                            className={`p-1.5 rounded border text-xs cursor-pointer ${
                              prod.isFeatured
                                ? 'bg-[#1C1917] text-[#C8A97E] border-[#1C1917]'
                                : 'bg-[#FAF7F2]/90 text-[#8C7E70] border-[#D6CCC0]'
                            }`}
                            title={isAr ? 'تبديل منتج مميز' : 'Toggle Featured'}
                          >
                            <Award className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              const res = await fetch(`/api/admin/products/${prod.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ isBestSeller: !prod.isBestSeller }),
                              });
                              applyDbUpdate(await res.json(), true);
                            }}
                            className={`p-1.5 rounded border text-xs cursor-pointer ${
                              prod.isBestSeller
                                ? 'bg-[#B89362] text-[#1C1917] border-[#B89362]'
                                : 'bg-[#FAF7F2]/90 text-[#8C7E70] border-[#D6CCC0]'
                            }`}
                            title={isAr ? 'تبديل الأكثر مبيعاً' : 'Toggle Best Seller'}
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              const res = await fetch(`/api/admin/products/${prod.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ isPublished: !prod.isPublished }),
                              });
                              applyDbUpdate(await res.json(), true);
                            }}
                            className="p-1.5 rounded border bg-[#FAF7F2]/90 text-[#1C1917] border-[#D6CCC0] cursor-pointer"
                            title={prod.isPublished ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'نشر' : 'Publish')}
                          >
                            {prod.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-red-700" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-[#1C1917] truncate">
                          {isAr ? prod.titleAr : prod.titleEn}
                        </h3>
                        <p className="text-xs text-[#8C7E70] truncate">
                          {isAr ? prod.titleEn : prod.titleAr}
                        </p>

                        {(prod.price || prod.discountPrice) && (
                          <div className="mt-1.5 flex items-center gap-2 text-xs">
                            {prod.discountPrice && prod.discountPrice > 0 ? (
                              <>
                                <span className="font-semibold text-[#B89362]">{prod.discountPrice.toLocaleString()} EGP</span>
                                {prod.price && prod.price > prod.discountPrice && (
                                  <span className="line-through text-[#8C7E70]">{prod.price.toLocaleString()}</span>
                                )}
                              </>
                            ) : prod.price ? (
                              <span className="font-semibold text-[#1C1917]">{prod.price.toLocaleString()} EGP</span>
                            ) : null}
                          </div>
                        )}

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <select
                            value={prod.categoryId}
                            onChange={async (e) => {
                              const res = await fetch(`/api/admin/products/${prod.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ categoryId: e.target.value }),
                              });
                              applyDbUpdate(await res.json(), true);
                              notify(isAr ? 'تم نقل المنتج للقسم الجديد.' : 'Moved product category.');
                            }}
                            className="px-2 py-1.5 bg-[#F2ECE1] border border-[#D6CCC0] rounded text-[11px]"
                          >
                            {sortedCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {isAr ? c.nameAr : c.nameEn}
                              </option>
                            ))}
                          </select>

                          <select
                            value={prod.availability || 'in-stock'}
                            onChange={async (e) => {
                              const res = await fetch(`/api/admin/products/${prod.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ availability: e.target.value }),
                              });
                              applyDbUpdate(await res.json(), true);
                            }}
                            className="px-2 py-1.5 bg-[#F2ECE1] border border-[#D6CCC0] rounded text-[11px]"
                          >
                            <option value="in-stock">{isAr ? 'متوفر' : 'In Stock'}</option>
                            <option value="made-to-order">{isAr ? 'حسب الطلب' : 'Made to Order'}</option>
                            <option value="out-of-stock">{isAr ? 'غير متوفر' : 'Unavailable'}</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#E5DDD0] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingProduct(prod)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#3A2B22] hover:text-[#B89362] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isAr ? `تعديل (${prod.images.length})` : `Edit (${prod.images.length})`}</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await fetch(`/api/admin/products/${prod.id}`, {
                              method: 'DELETE',
                              credentials: 'include',
                            });
                            applyDbUpdate(await res.json(), true);
                            notify(isAr ? 'تم حذف المنتج.' : 'Product deleted.');
                          }}
                          className="text-xs text-red-700 hover:underline cursor-pointer"
                        >
                          {isAr ? 'حذف' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 3. CATEGORIES MANAGEMENT */}
          {activeSection === 'categories' && (
            <section className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Create Category */}
                <div className="bg-[#F2ECE1] border border-[#D6CCC0] rounded-xl p-6 space-y-4">
                  <h2 className={`text-xl font-semibold ${isAr ? 'font-arabic' : 'font-display'}`}>
                    {isAr ? 'إنشاء قسم جديد' : 'Create New Category'}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="English Name (e.g. OFFICE FURNITURE)"
                      value={newCategory.nameEn}
                      onChange={(e) => setNewCategory((c) => ({ ...c, nameEn: e.target.value }))}
                      className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                    />
                    <input
                      type="text"
                      dir="rtl"
                      placeholder="الاسم بالعربية (مثال: الأثاث المكتبي)"
                      value={newCategory.nameAr}
                      onChange={(e) => setNewCategory((c) => ({ ...c, nameAr: e.target.value }))}
                      className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm font-arabic"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Description (EN)"
                      value={newCategory.descriptionEn}
                      onChange={(e) => setNewCategory((c) => ({ ...c, descriptionEn: e.target.value }))}
                      className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                    />
                    <input
                      type="text"
                      dir="rtl"
                      placeholder="الوصف (AR)"
                      value={newCategory.descriptionAr}
                      onChange={(e) => setNewCategory((c) => ({ ...c, descriptionAr: e.target.value }))}
                      className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm font-arabic"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-xs cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5 text-[#B89362]" />
                      <span>
                        {newCategory.coverImage
                          ? isAr
                            ? 'صورة الغلاف جاهزة ✓'
                            : 'Cover Image Ready ✓'
                          : isAr
                          ? 'رفع صورة غلاف'
                          : 'Upload Cover Image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          if (!e.target.files?.length) return;
                          const [url] = await uploadSingleMedia(e.target.files);
                          setNewCategory((c) => ({ ...c, coverImage: url }));
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await fetch('/api/admin/categories', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify(newCategory),
                        });
                        const json = await res.json();
                        if (!res.ok) return fail(json.error);
                        applyDbUpdate(json, true);
                        setNewCategory({ nameEn: '', nameAr: '', descriptionEn: '', descriptionAr: '', coverImage: '' });
                        notify(isAr ? 'تم إنشاء القسم بنجاح.' : 'Category created.');
                      }}
                      className="px-5 py-2 bg-[#1C1917] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider rounded cursor-pointer"
                    >
                      {isAr ? 'إنشاء القسم' : 'Create Category'}
                    </button>
                  </div>
                </div>

                {/* Merge Categories */}
                <div className="bg-[#F2ECE1] border border-[#D6CCC0] rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <GitMerge className="w-4 h-4 text-[#B89362]" />
                    <h2 className={`text-xl font-semibold ${isAr ? 'font-arabic' : 'font-display'}`}>
                      {isAr ? 'دمج الأقسام ونقل المنتجات' : 'Merge Categories & Reassign'}
                    </h2>
                  </div>
                  <p className="text-xs text-[#3A2B22]">
                    {isAr
                      ? 'انقل جميع المنتجات من قسم إلى قسم آخر وقم بحذف القسم المصدر.'
                      : 'Move all products from a source category into a target category and delete the source.'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={mergeSourceId}
                      onChange={(e) => setMergeSourceId(e.target.value)}
                      className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-xs"
                    >
                      <option value="">{isAr ? 'القسم المصدر...' : 'Source Category...'}</option>
                      {sortedCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {isAr ? c.nameAr : c.nameEn}
                        </option>
                      ))}
                    </select>
                    <select
                      value={mergeTargetId}
                      onChange={(e) => setMergeTargetId(e.target.value)}
                      className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-xs"
                    >
                      <option value="">{isAr ? 'القسم الهدف...' : 'Target Category...'}</option>
                      {sortedCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {isAr ? c.nameAr : c.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetch('/api/admin/categories/merge', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                          sourceCategoryId: mergeSourceId,
                          targetCategoryId: mergeTargetId,
                        }),
                      });
                      const json = await res.json();
                      if (!res.ok) return fail(json.error);
                      applyDbUpdate(json, true);
                      setMergeSourceId('');
                      setMergeTargetId('');
                      notify(isAr ? 'تم دمج القسمين بنجاح.' : 'Categories merged.');
                    }}
                    className="px-5 py-2.5 bg-[#1C1917] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider rounded cursor-pointer"
                  >
                    {isAr ? 'تنفيذ الدمج' : 'Merge Categories'}
                  </button>
                </div>
              </div>

              {/* Category Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {sortedCategories.map((cat, idx) => {
                  const count = draft.products.filter((p) => p.categoryId === cat.id).length;
                  return (
                    <div key={cat.id} className="bg-[#FAF7F2] border border-[#D6CCC0] rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs text-[#8C7E70]">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#F2ECE1] border border-[#D6CCC0] font-semibold text-[#1C1917]">
                            #{idx + 1}
                          </span>
                          <span>{isAr ? `${count} منتج` : `${count} Products`}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveCategoryOrder(cat.id, -1)}
                            className="p-1 rounded border border-[#D6CCC0] disabled:opacity-40 cursor-pointer"
                            title={isAr ? 'رفع الترتيب' : 'Move up'}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === sortedCategories.length - 1}
                            onClick={() => moveCategoryOrder(cat.id, 1)}
                            className="p-1 rounded border border-[#D6CCC0] disabled:opacity-40 cursor-pointer"
                            title={isAr ? 'خفض الترتيب' : 'Move down'}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await fetch(`/api/admin/categories/${cat.id}`, {
                                method: 'DELETE',
                                credentials: 'include',
                              });
                              const json = await res.json();
                              if (!res.ok) return fail(json.error);
                              applyDbUpdate(json, true);
                              notify(isAr ? 'تم حذف القسم.' : 'Category deleted.');
                            }}
                            className="px-2 py-1 text-red-700 hover:underline cursor-pointer"
                          >
                            {isAr ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          defaultValue={cat.nameEn}
                          onBlur={async (e) => {
                            if (e.target.value === cat.nameEn) return;
                            const res = await fetch(`/api/admin/categories/${cat.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ nameEn: e.target.value }),
                            });
                            applyDbUpdate(await res.json(), true);
                          }}
                          className="px-2.5 py-1.5 border border-[#D6CCC0] rounded text-xs font-semibold"
                        />
                        <input
                          type="text"
                          dir="rtl"
                          defaultValue={cat.nameAr}
                          onBlur={async (e) => {
                            if (e.target.value === cat.nameAr) return;
                            const res = await fetch(`/api/admin/categories/${cat.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ nameAr: e.target.value }),
                            });
                            applyDbUpdate(await res.json(), true);
                          }}
                          className="px-2.5 py-1.5 border border-[#D6CCC0] rounded text-xs font-arabic"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-3">
                          {cat.coverImage && (
                            <img src={cat.coverImage} alt={cat.nameEn} className="w-16 h-12 object-cover rounded border" />
                          )}
                          <label className="text-xs underline cursor-pointer text-[#3A2B22]">
                            {isAr ? 'رفع / تغيير صورة الغلاف' : 'Upload Cover Image'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                if (!e.target.files?.length) return;
                                const [url] = await uploadSingleMedia(e.target.files);
                                const res = await fetch(`/api/admin/categories/${cat.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ coverImage: url }),
                                });
                                applyDbUpdate(await res.json(), true);
                                notify(isAr ? 'تم تحديث غلاف القسم.' : 'Category cover updated.');
                              }}
                            />
                          </label>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setProductCategoryFilter(cat.id);
                            setActiveSection('products');
                          }}
                          className="text-xs text-[#B89362] hover:underline cursor-pointer"
                        >
                          {isAr ? 'عرض المنتجات →' : 'View Products →'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 4. AI IMAGE CLASSIFICATION & STAGING */}
          {activeSection === 'ai-upload' && (
            <section className="space-y-6">
              <div className="bg-[#F2ECE1] border border-[#D6CCC0] rounded-xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#8C7E70]">
                    <Sparkles className="w-4 h-4 text-[#B89362]" />
                    <span>{isAr ? 'التصنيف التلقائي بالذكاء الاصطناعي' : 'Automatic Furniture Photo Classification'}</span>
                  </div>
                  <h2 className={`mt-2 text-2xl font-semibold text-[#1C1917] ${isAr ? 'font-arabic' : 'font-display'}`}>
                    {isAr ? 'رفع ومراجعة الصور قبل النشر' : 'Upload & Review Before Publishing'}
                  </h2>
                  <p className="mt-1 text-sm text-[#3A2B22] max-w-2xl font-arabic">
                    ارفع صور الأثاث ليقوم النظام بتصنيفها تلقائياً واقتراح القسم والعناوين. لن يتم نشر أي صورة على الموقع قبل مراجعتك والضغط على زر «تأكيد ونشر الصور».
                  </p>
                </div>

                <label className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#1C1917] text-[#FAF7F2] text-xs font-semibold uppercase tracking-[0.12em] rounded-lg hover:bg-[#3A2B22] transition-colors cursor-pointer shrink-0">
                  <Upload className="w-4 h-4 text-[#C8A97E]" />
                  <span className={isAr ? 'font-arabic tracking-normal text-sm' : ''}>
                    {busy
                      ? isAr
                        ? 'جارٍ التحليل...'
                        : 'Analyzing...'
                      : isAr
                      ? 'رفع صور الأثاث'
                      : 'Upload Furniture Photos'}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleAiUpload}
                    disabled={busy}
                    className="hidden"
                  />
                </label>
              </div>

              {stagedImages.length > 0 && (
                <div className="space-y-5">
                  <div className="bg-[#FAF7F2] border border-[#D6CCC0] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={toggleSelectAllStaged}
                        className="inline-flex items-center gap-2 px-3.5 py-2 border border-[#D6CCC0] rounded text-xs font-medium hover:border-[#B89362] cursor-pointer"
                      >
                        {allStagedSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#B89362]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#8C7E70]" />
                        )}
                        <span>{allStagedSelected ? 'إلغاء تحديد الكل · Deselect All' : 'تحديد الكل · Select All'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <select
                          value={bulkCategorySlug}
                          onChange={(e) => setBulkCategorySlug(e.target.value)}
                          className="px-3 py-2 bg-[#F2ECE1] border border-[#D6CCC0] rounded text-xs"
                        >
                          {CATEGORY_OPTIONS.map((c) => (
                            <option key={c.slug} value={c.slug}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={applyBulkCategoryToSelected}
                          className="px-3 py-2 border border-[#D6CCC0] rounded text-xs hover:border-[#B89362] cursor-pointer"
                        >
                          {isAr ? 'تطبيق على المحدد' : 'Apply to Selected'}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={confirmAndPublishStaged}
                      disabled={busy}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#B89362] text-[#1C1917] text-sm font-bold rounded-lg hover:bg-[#C8A97E] transition-colors shadow-sm cursor-pointer font-arabic"
                    >
                      <Check className="w-4 h-4" />
                      <span>تأكيد ونشر الصور ({stagedImages.filter((s) => s.selected).length})</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stagedImages.map((item) => (
                      <div
                        key={item.tempId}
                        className={`bg-[#FAF7F2] border rounded-xl overflow-hidden ${
                          item.selected ? 'border-[#B89362] ring-1 ring-[#B89362]' : 'border-[#D6CCC0] opacity-80'
                        }`}
                      >
                        <div className="relative aspect-[4/3] bg-[#F2ECE1]">
                          <img src={item.imageUrl} alt={item.titleEn} className="w-full h-full object-cover" />
                          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() =>
                                setStagedImages((prev) =>
                                  prev.map((s) =>
                                    s.tempId === item.tempId ? { ...s, selected: !s.selected } : s
                                  )
                                )
                              }
                              className="p-2 bg-[#FAF7F2]/95 rounded border border-[#D6CCC0] cursor-pointer"
                            >
                              {item.selected ? (
                                <CheckSquare className="w-4 h-4 text-[#B89362]" />
                              ) : (
                                <Square className="w-4 h-4 text-[#8C7E70]" />
                              )}
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEnlargedImg(item.imageUrl)}
                                className="p-2 bg-[#FAF7F2]/95 rounded border border-[#D6CCC0] hover:border-[#B89362] cursor-pointer"
                              >
                                <Maximize2 className="w-4 h-4 text-[#1C1917]" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setStagedImages((prev) => prev.filter((s) => s.tempId !== item.tempId))
                                }
                                className="p-2 bg-[#FAF7F2]/95 rounded border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          <div>
                            <label className="block text-[11px] uppercase tracking-wider text-[#8C7E70] mb-1">
                              {isAr ? `القسم المقترح (${item.suggestedCategoryNameAr})` : `AI Suggested (${item.suggestedCategoryNameEn})`}
                            </label>
                            <select
                              value={item.selectedCategorySlug}
                              onChange={(e) =>
                                setStagedImages((prev) =>
                                  prev.map((s) =>
                                    s.tempId === item.tempId
                                      ? { ...s, selectedCategorySlug: e.target.value }
                                      : s
                                  )
                                )
                              }
                              className="w-full px-2.5 py-2 bg-[#F2ECE1] border border-[#D6CCC0] rounded text-xs"
                            >
                              {CATEGORY_OPTIONS.map((c) => (
                                <option key={c.slug} value={c.slug}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <input
                            type="text"
                            value={item.titleEn}
                            onChange={(e) =>
                              setStagedImages((prev) =>
                                prev.map((s) =>
                                  s.tempId === item.tempId ? { ...s, titleEn: e.target.value } : s
                                )
                              )
                            }
                            placeholder="English Title"
                            className="w-full px-2.5 py-1.5 border border-[#D6CCC0] rounded text-xs"
                          />

                          <input
                            type="text"
                            dir="rtl"
                            value={item.titleAr}
                            onChange={(e) =>
                              setStagedImages((prev) =>
                                prev.map((s) =>
                                  s.tempId === item.tempId ? { ...s, titleAr: e.target.value } : s
                                )
                              )
                            }
                            placeholder="العنوان بالعربية"
                            className="w-full px-2.5 py-1.5 border border-[#D6CCC0] rounded text-xs font-arabic"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 5. CUSTOMER REVIEWS MANAGEMENT */}
          {activeSection === 'reviews' && (
            <section className="space-y-6">
              {/* Storefront Display Mode */}
              <div className="bg-[#F2ECE1] border border-[#D6CCC0] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className={`text-xl font-semibold ${isAr ? 'font-arabic' : 'font-display'}`}>
                    {isAr ? 'طريقة عرض آراء العملاء على الموقع' : 'Storefront Reviews Display Mode'}
                  </h2>
                  <p className="text-xs text-[#3A2B22]">
                    {isAr
                      ? 'تظهر فقط التقييمات المعتمدة (Approved) للزوار على الموقع.'
                      : 'Only approved reviews appear on the public storefront.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-[#FAF7F2] p-1 rounded border border-[#D6CCC0]">
                  <button
                    type="button"
                    onClick={() => saveSettings({ reviewDisplayMode: 'cards' })}
                    className={`px-3.5 py-2 text-xs font-medium rounded cursor-pointer ${
                      draft.settings.reviewDisplayMode === 'cards'
                        ? 'bg-[#1C1917] text-[#FAF7F2]'
                        : 'text-[#3A2B22]'
                    }`}
                  >
                    {isAr ? 'بطاقات تقييم مصممة' : 'Designed Review Cards'}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveSettings({ reviewDisplayMode: 'screenshots' })}
                    className={`px-3.5 py-2 text-xs font-medium rounded cursor-pointer ${
                      draft.settings.reviewDisplayMode === 'screenshots'
                        ? 'bg-[#1C1917] text-[#FAF7F2]'
                        : 'text-[#3A2B22]'
                    }`}
                  >
                    {isAr ? 'لقطات شاشة واتساب' : 'WhatsApp Screenshots'}
                  </button>
                </div>
              </div>

              {/* Add Customer Review */}
              <div className="bg-[#FAF7F2] border border-[#D6CCC0] rounded-xl p-5 space-y-4">
                <h3 className={`text-sm font-semibold ${isAr ? 'font-arabic' : ''}`}>
                  {isAr ? `إضافة تقييم عميل (${draft.reviews.length}/20)` : `Add Customer Review (${draft.reviews.length}/20)`}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder={isAr ? 'اسم العميل (اختياري)' : 'Customer Name (optional)'}
                    value={newReviewCustomerName}
                    onChange={(e) => setNewReviewCustomerName(e.target.value)}
                    className="px-3 py-2 bg-[#F2ECE1] border border-[#D6CCC0] rounded text-sm font-arabic"
                  />
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="نص تعليق العميل الحقيقي..."
                    value={newReviewAr}
                    onChange={(e) => setNewReviewAr(e.target.value)}
                    className="md:col-span-2 px-3 py-2 bg-[#F2ECE1] border border-[#D6CCC0] rounded text-sm font-arabic"
                  />
                  <select
                    value={newReviewStatus}
                    onChange={(e) => setNewReviewStatus(e.target.value as ReviewStatus)}
                    className="px-3 py-2 bg-[#F2ECE1] border border-[#D6CCC0] rounded text-xs"
                  >
                    <option value="approved">{isAr ? 'معتمد للنشر فوراً' : 'Approved (Publish)'}</option>
                    <option value="pending">{isAr ? 'قيد المراجعة' : 'Pending Review'}</option>
                    <option value="rejected">{isAr ? 'مرفوض' : 'Rejected'}</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#F2ECE1] border border-[#D6CCC0] rounded text-xs cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5 text-[#B89362]" />
                    <span>
                      {newReviewScreenshotUrl
                        ? isAr
                          ? 'تم إرفاق لقطة الشاشة ✓'
                          : 'Screenshot Attached ✓'
                        : isAr
                        ? 'رفع لقطة شاشة للتقييم'
                        : 'Upload Review Screenshot'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        if (!e.target.files?.length) return;
                        const [url] = await uploadSingleMedia(e.target.files);
                        setNewReviewScreenshotUrl(url);
                      }}
                    />
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newReviewStars}
                      onChange={(e) => setNewReviewStars(e.target.checked)}
                    />
                    <span>{isAr ? 'إظهار 5 نجوم' : 'Show 5 Stars'}</span>
                  </label>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!newReviewAr.trim()) return fail(isAr ? 'أدخل نص التقييم.' : 'Enter review text.');
                      if (draft.reviews.length >= 20) return fail('Maximum 20 reviews supported.');
                      const rev: CustomerReview = {
                        id: `rev-${Date.now()}`,
                        customerName: newReviewCustomerName.trim() || undefined,
                        commentAr: newReviewAr.trim(),
                        screenshotUrl: newReviewScreenshotUrl || undefined,
                        showStars: newReviewStars,
                        rating: 5,
                        status: newReviewStatus,
                        isActive: newReviewStatus === 'approved',
                        order: draft.reviews.length + 1,
                      };
                      await saveReviewsAndDelivered([...draft.reviews, rev]);
                      setNewReviewCustomerName('');
                      setNewReviewAr('');
                      setNewReviewScreenshotUrl('');
                      notify(isAr ? 'تمت إضافة التقييم.' : 'Customer review saved.');
                    }}
                    className="px-5 py-2 bg-[#1C1917] text-[#FAF7F2] text-xs font-semibold rounded cursor-pointer"
                  >
                    {isAr ? 'إضافة التقييم' : 'Add Review'}
                  </button>
                </div>
              </div>

              {/* Filter & Reviews List */}
              <div className="flex flex-wrap items-center gap-2">
                {(['all', 'approved', 'pending', 'rejected'] as const).map((statusKey) => (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => setReviewFilter(statusKey)}
                    className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer border ${
                      reviewFilter === statusKey
                        ? 'bg-[#1C1917] text-[#FAF7F2] border-[#1C1917]'
                        : 'bg-[#F2ECE1] text-[#3A2B22] border-[#D6CCC0]'
                    }`}
                  >
                    {statusKey === 'all'
                      ? isAr
                        ? `الكل (${draft.reviews.length})`
                        : `All (${draft.reviews.length})`
                      : statusKey === 'approved'
                      ? isAr
                        ? 'معتمد'
                        : 'Approved'
                      : statusKey === 'pending'
                      ? isAr
                        ? 'قيد المراجعة'
                        : 'Pending'
                      : isAr
                      ? 'مرفوض'
                      : 'Rejected'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredReviews.map((rev) => {
                  const status: ReviewStatus = rev.status || 'approved';
                  return (
                    <div key={rev.id} className="bg-[#FAF7F2] border border-[#D6CCC0] rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          defaultValue={rev.customerName || ''}
                          placeholder={isAr ? 'اسم العميل (اختياري)' : 'Customer Name (optional)'}
                          onBlur={(e) => {
                            if (e.target.value === (rev.customerName || '')) return;
                            saveReviewsAndDelivered(
                              draft.reviews.map((r) =>
                                r.id === rev.id ? { ...r, customerName: e.target.value.trim() || undefined } : r
                              )
                            );
                          }}
                          className="px-2.5 py-1 bg-[#F2ECE1] border border-[#D6CCC0] rounded text-xs font-semibold flex-1 font-arabic"
                        />
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {status === 'approved'
                            ? isAr
                              ? 'معتمد'
                              : 'Approved'
                            : status === 'pending'
                            ? isAr
                              ? 'معلق'
                              : 'Pending'
                            : isAr
                            ? 'مرفوض'
                            : 'Rejected'}
                        </span>
                      </div>

                      <textarea
                        rows={2}
                        dir="rtl"
                        defaultValue={rev.commentAr}
                        onBlur={(e) => {
                          if (e.target.value === rev.commentAr) return;
                          saveReviewsAndDelivered(
                            draft.reviews.map((r) => (r.id === rev.id ? { ...r, commentAr: e.target.value } : r))
                          );
                        }}
                        className="w-full p-2.5 bg-[#F2ECE1] border border-[#D6CCC0] rounded text-sm font-arabic"
                      />

                      {rev.screenshotUrl && (
                        <div className="flex items-center gap-3">
                          <img
                            src={rev.screenshotUrl}
                            alt="Review screenshot"
                            onClick={() => setEnlargedImg(rev.screenshotUrl!)}
                            className="w-20 h-16 object-cover rounded border border-[#D6CCC0] cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              saveReviewsAndDelivered(
                                draft.reviews.map((r) => (r.id === rev.id ? { ...r, screenshotUrl: undefined } : r))
                              )
                            }
                            className="text-xs text-red-700 underline cursor-pointer"
                          >
                            {isAr ? 'إزالة الصورة' : 'Remove Screenshot'}
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E5DDD0] text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              saveReviewsAndDelivered(
                                draft.reviews.map((r) =>
                                  r.id === rev.id ? { ...r, status: 'approved', isActive: true } : r
                                )
                              )
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{isAr ? 'اعتماد' : 'Approve'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              saveReviewsAndDelivered(
                                draft.reviews.map((r) =>
                                  r.id === rev.id ? { ...r, status: 'rejected', isActive: false } : r
                                )
                              )
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 border border-red-200 text-red-800 cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>{isAr ? 'رفض' : 'Reject'}</span>
                          </button>
                          <label className="px-2 py-1 rounded border border-[#D6CCC0] bg-[#F2ECE1] cursor-pointer">
                            <span>{isAr ? 'صورة' : 'Photo'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                if (!e.target.files?.length) return;
                                const [url] = await uploadSingleMedia(e.target.files);
                                await saveReviewsAndDelivered(
                                  draft.reviews.map((r) => (r.id === rev.id ? { ...r, screenshotUrl: url } : r))
                                );
                              }}
                            />
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              saveReviewsAndDelivered(
                                draft.reviews.map((r) => (r.id === rev.id ? { ...r, showStars: !r.showStars } : r))
                              )
                            }
                            className="underline cursor-pointer"
                          >
                            {rev.showStars ? '5★' : isAr ? 'بدون نجوم' : 'No ★'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              saveReviewsAndDelivered(draft.reviews.filter((r) => r.id !== rev.id))
                            }
                            className="text-red-700 cursor-pointer"
                          >
                            {isAr ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* WhatsApp Screenshots Manager */}
              <div className="bg-[#FAF7F2] border border-[#D6CCC0] rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className={`text-sm font-semibold ${isAr ? 'font-arabic' : ''}`}>
                    {isAr ? 'لقطات شاشة واتساب الأصلية' : 'Original WhatsApp Screenshots'} ({draft.settings.whatsappScreenshots.length})
                  </h3>
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#1C1917] text-[#FAF7F2] text-xs rounded cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5 text-[#C8A97E]" />
                    <span>{isAr ? 'رفع لقطة شاشة جديدة' : 'Upload Screenshot'}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        if (!e.target.files?.length) return;
                        const urls = await uploadSingleMedia(e.target.files);
                        await saveSettings({
                          whatsappScreenshots: [...draft.settings.whatsappScreenshots, ...urls],
                        });
                      }}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {draft.settings.whatsappScreenshots.map((src, idx) => (
                    <div key={`${src}-${idx}`} className="relative border border-[#D6CCC0] rounded overflow-hidden bg-[#F2ECE1]">
                      <img src={src} alt="WhatsApp screenshot" className="w-full h-36 object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          saveSettings({
                            whatsappScreenshots: draft.settings.whatsappScreenshots.filter((_, i) => i !== idx),
                          })
                        }
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivered Furniture Photograph Approval */}
              <div className="pt-4 border-t border-[#D6CCC0] space-y-4">
                <h3 className={`text-xl font-semibold ${isAr ? 'font-arabic' : 'font-display'}`}>
                  {isAr
                    ? 'صور الأثاث المُسلّم للعملاء'
                    : 'Delivered Furniture Photos (Owner Approval)'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {draft.deliveredPhotos.map((dp) => (
                    <div key={dp.id} className="bg-[#FAF7F2] border border-[#D6CCC0] rounded-xl overflow-hidden">
                      <img src={dp.imageUrl} alt={dp.captionEn} className="w-full h-44 object-cover" />
                      <div className="p-4 space-y-2">
                        <p className="text-xs text-[#3A2B22] font-arabic">{isAr ? dp.captionAr : dp.captionEn}</p>
                        <button
                          type="button"
                          onClick={() =>
                            saveReviewsAndDelivered(
                              draft.reviews,
                              draft.deliveredPhotos.map((x) =>
                                x.id === dp.id ? { ...x, approved: !x.approved } : x
                              )
                            )
                          }
                          className={`w-full py-2 text-xs font-semibold rounded cursor-pointer ${
                            dp.approved
                              ? 'bg-[#B89362] text-[#1C1917]'
                              : 'bg-[#F2ECE1] text-[#3A2B22] border border-[#D6CCC0]'
                          }`}
                        >
                          {dp.approved
                            ? isAr
                              ? 'معتمد للنشر العام ✓'
                              : 'Approved Live ✓'
                            : isAr
                            ? 'اعتماد ونشر الصورة'
                            : 'Approve Delivered Photo'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 6. OFFERS & FEATURED PRODUCTS */}
          {activeSection === 'offers' && (
            <section className="space-y-8">
              {/* Create Special Offer */}
              <div className="bg-[#F2ECE1] border border-[#D6CCC0] rounded-xl p-6 space-y-4">
                <h2 className={`text-xl font-semibold ${isAr ? 'font-arabic' : 'font-display'}`}>
                  {isAr ? 'إضافة عرض حصري بخصم خاص' : 'Create Special Showroom Offer'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Offer Title (EN)"
                    value={newOffer.titleEn}
                    onChange={(e) => setNewOffer((o) => ({ ...o, titleEn: e.target.value }))}
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                  />
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="عنوان العرض (AR)"
                    value={newOffer.titleAr}
                    onChange={(e) => setNewOffer((o) => ({ ...o, titleAr: e.target.value }))}
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm font-arabic"
                  />
                  <textarea
                    rows={2}
                    placeholder="Offer Description (EN)"
                    value={newOffer.descriptionEn}
                    onChange={(e) => setNewOffer((o) => ({ ...o, descriptionEn: e.target.value }))}
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                  />
                  <textarea
                    rows={2}
                    dir="rtl"
                    placeholder="وصف وتفاصيل العرض (AR)"
                    value={newOffer.descriptionAr}
                    onChange={(e) => setNewOffer((o) => ({ ...o, descriptionAr: e.target.value }))}
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm font-arabic"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                  <input
                    type="number"
                    min="0"
                    placeholder={isAr ? 'السعر قبل الخصم' : 'Original Price (EGP)'}
                    value={newOffer.originalPrice}
                    onChange={(e) => setNewOffer((o) => ({ ...o, originalPrice: e.target.value }))}
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder={isAr ? 'سعر العرض بعد الخصم' : 'Discounted Offer Price'}
                    value={newOffer.discountPrice}
                    onChange={(e) => setNewOffer((o) => ({ ...o, discountPrice: e.target.value }))}
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                  />
                  <label className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-xs cursor-pointer text-center">
                    {newOffer.imageUrl
                      ? isAr
                        ? 'صورة العرض جاهزة ✓'
                        : 'Offer Image Ready ✓'
                      : isAr
                      ? 'رفع صورة العرض'
                      : 'Upload Offer Image'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        if (!e.target.files?.length) return;
                        const [url] = await uploadSingleMedia(e.target.files);
                        setNewOffer((o) => ({ ...o, imageUrl: url }));
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newOffer.imageUrl || (!newOffer.titleEn && !newOffer.titleAr)) {
                        return fail(isAr ? 'أدخل عنوان العرض وارفع الصورة.' : 'Provide offer title and promotional image.');
                      }
                      const offer: ExclusiveOffer = {
                        id: `offer-${Date.now()}`,
                        titleEn: newOffer.titleEn || newOffer.titleAr,
                        titleAr: newOffer.titleAr || newOffer.titleEn,
                        subtitleEn: newOffer.subtitleEn,
                        subtitleAr: newOffer.subtitleAr,
                        descriptionEn: newOffer.descriptionEn,
                        descriptionAr: newOffer.descriptionAr,
                        originalPrice: newOffer.originalPrice ? Number(newOffer.originalPrice) : undefined,
                        discountPrice: newOffer.discountPrice ? Number(newOffer.discountPrice) : undefined,
                        imageUrl: newOffer.imageUrl,
                        isActive: true,
                        createdAt: new Date().toISOString(),
                      };
                      await saveOffers([...draft.offers, offer]);
                      setNewOffer({
                        titleEn: '',
                        titleAr: '',
                        subtitleEn: '',
                        subtitleAr: '',
                        descriptionEn: '',
                        descriptionAr: '',
                        originalPrice: '',
                        discountPrice: '',
                        imageUrl: '',
                      });
                      notify(isAr ? 'تمت إضافة العرض ونشره.' : 'Special offer added and synced live.');
                    }}
                    className="px-4 py-2.5 bg-[#1C1917] text-[#FAF7F2] text-xs font-semibold rounded cursor-pointer"
                  >
                    {isAr ? 'إضافة العرض' : 'Add Offer'}
                  </button>
                </div>
              </div>

              {/* Offers List */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {draft.offers.map((o) => (
                  <div key={o.id} className="bg-[#FAF7F2] border border-[#D6CCC0] rounded-xl overflow-hidden flex flex-col">
                    <img src={o.imageUrl} alt={o.titleEn} className="w-full h-40 object-cover" />
                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-sm font-semibold truncate">{isAr ? o.titleAr : o.titleEn}</p>
                        {(o.descriptionAr || o.descriptionEn) && (
                          <p className="text-xs text-[#8C7E70] line-clamp-2 mt-1">
                            {isAr ? o.descriptionAr : o.descriptionEn}
                          </p>
                        )}
                        {(o.discountPrice || o.originalPrice) && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            {o.discountPrice && (
                              <span className="font-semibold text-[#B89362]">{o.discountPrice.toLocaleString()} EGP</span>
                            )}
                            {o.originalPrice && (
                              <span className="line-through text-[#8C7E70]">{o.originalPrice.toLocaleString()}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[#E5DDD0] flex items-center justify-between gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setEditingOffer(o)}
                          className="font-medium text-[#3A2B22] hover:text-[#B89362] cursor-pointer"
                        >
                          {isAr ? 'تعديل' : 'Edit'}
                        </button>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              saveOffers(
                                draft.offers.map((x) => (x.id === o.id ? { ...x, isActive: !x.isActive } : x))
                              )
                            }
                            className="underline cursor-pointer"
                          >
                            {o.isActive ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                          </button>
                          <button
                            type="button"
                            onClick={() => saveOffers(draft.offers.filter((x) => x.id !== o.id))}
                            className="text-red-700 cursor-pointer"
                          >
                            {isAr ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Select Most Requested & Featured Products */}
              <div className="pt-6 border-t border-[#D6CCC0] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className={`text-xl font-semibold ${isAr ? 'font-arabic' : 'font-display'}`}>
                      {isAr ? 'اختيار المنتجات المميزة والأكثر طلباً' : 'Featured & Most Requested Products Selector'}
                    </h3>
                    <p className="text-xs text-[#8C7E70]">
                      {isAr
                        ? 'فعّل «الأكثر مبيعاً» أو «منتج مميز» للتحكم فيما يظهر في قسم الأكثر طلباً على الموقع.'
                        : 'Toggle Featured or Best Seller status to control which pieces highlight on the showroom homepage.'}
                    </p>
                  </div>
                  <input
                    type="search"
                    value={featuredSearch}
                    onChange={(e) => setFeaturedSearch(e.target.value)}
                    placeholder={isAr ? 'بحث سريع...' : 'Filter products...'}
                    className="px-3 py-2 bg-[#F2ECE1] border border-[#D6CCC0] rounded text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {sortedProducts
                    .filter((p) => {
                      const q = featuredSearch.trim().toLowerCase();
                      if (!q) return true;
                      return p.titleEn.toLowerCase().includes(q) || p.titleAr.toLowerCase().includes(q);
                    })
                    .slice(0, 24)
                    .map((p) => (
                      <div key={p.id} className="bg-[#FAF7F2] border border-[#D6CCC0] rounded-lg p-3 flex items-center gap-3">
                        <img src={p.images[0]} alt={p.titleEn} className="w-14 h-14 object-cover rounded shrink-0" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <p className="text-xs font-semibold truncate">{isAr ? p.titleAr : p.titleEn}</p>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await fetch(`/api/admin/products/${p.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ isFeatured: !p.isFeatured }),
                                });
                                applyDbUpdate(await res.json(), true);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer border ${
                                p.isFeatured
                                  ? 'bg-[#1C1917] text-[#C8A97E] border-[#1C1917]'
                                  : 'bg-[#F2ECE1] text-[#3A2B22] border-[#D6CCC0]'
                              }`}
                            >
                              {isAr ? 'مميز' : 'Featured'}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await fetch(`/api/admin/products/${p.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ isBestSeller: !p.isBestSeller }),
                                });
                                applyDbUpdate(await res.json(), true);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer border ${
                                p.isBestSeller
                                  ? 'bg-[#B89362] text-[#1C1917] border-[#B89362]'
                                  : 'bg-[#F2ECE1] text-[#3A2B22] border-[#D6CCC0]'
                              }`}
                            >
                              {isAr ? 'الأكثر طلباً' : 'Most Requested'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </section>
          )}

          {/* 7. MEDIA LIBRARY */}
          {activeSection === 'media' && (
            <section className="space-y-6">
              <div className="bg-[#F2ECE1] border border-[#D6CCC0] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className={`text-xl font-semibold ${isAr ? 'font-arabic' : 'font-display'}`}>
                    {isAr ? 'مكتبة الصور والوسائط' : 'Showroom Media Library'}
                  </h2>
                  <p className="text-xs text-[#3A2B22] mt-1">
                    {isAr
                      ? 'ارفع صوراً من الهاتف أو الكمبيوتر، استبدل الصور المستخدمة في الموقع دفعة واحدة، أو احذف الصور غير المستخدمة.'
                      : 'Upload images from mobile/tablet/desktop, replace assets globally across products & banners, or clean up unused uploads.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchMediaLibrary}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-xs cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${mediaLoading ? 'animate-spin' : ''}`} />
                    <span>{isAr ? 'تحديث' : 'Refresh'}</span>
                  </button>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#1C1917] text-[#FAF7F2] text-xs font-semibold rounded cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#C8A97E]" />
                    <span>{isAr ? 'رفع صور جديدة' : 'Upload Images'}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        if (!e.target.files?.length) return;
                        try {
                          const urls = await uploadSingleMedia(e.target.files);
                          notify(
                            isAr ? `تم رفع ${urls.length} صورة بنجاح.` : `Uploaded ${urls.length} image(s) to library.`
                          );
                          await fetchMediaLibrary();
                        } catch (err: unknown) {
                          fail(err instanceof Error ? err.message : 'Upload failed');
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Filter Media */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#FAF7F2] border border-[#D6CCC0] rounded-xl p-4">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: 'all', labelEn: `All (${mediaItems.length})`, labelAr: `الكل (${mediaItems.length})` },
                      { id: 'uploads', labelEn: 'Admin Uploads', labelAr: 'المرفوعات' },
                      { id: 'used', labelEn: 'In Use', labelAr: 'مستخدمة بالموقع' },
                      { id: 'unused', labelEn: 'Unused', labelAr: 'غير مستخدمة' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setMediaFilter(f.id)}
                      className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer border ${
                        mediaFilter === f.id
                          ? 'bg-[#1C1917] text-[#FAF7F2] border-[#1C1917]'
                          : 'bg-[#F2ECE1] text-[#3A2B22] border-[#D6CCC0]'
                      }`}
                    >
                      {isAr ? f.labelAr : f.labelEn}
                    </button>
                  ))}
                </div>

                <input
                  type="search"
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  placeholder={isAr ? 'ابحث باسم الملف أو المنتج...' : 'Search filename or usage...'}
                  className="px-3 py-2 bg-[#F2ECE1] border border-[#D6CCC0] rounded text-xs"
                />
              </div>

              {/* Media Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredMedia.map((item) => (
                  <div key={item.url} className="bg-[#FAF7F2] border border-[#D6CCC0] rounded-xl overflow-hidden flex flex-col">
                    <div className="relative aspect-[4/3] bg-[#F2ECE1]">
                      <img
                        src={item.url}
                        alt={item.filename}
                        onClick={() => setEnlargedImg(item.url)}
                        className="w-full h-full object-cover cursor-pointer"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#1C1917]/80 text-[#FAF7F2] text-[10px]">
                        {Math.round(item.sizeBytes / 1024)} KB
                      </span>
                    </div>
                    <div className="p-3 space-y-2 flex-1 flex flex-col justify-between text-xs">
                      <div>
                        <p className="font-medium truncate" dir="ltr">
                          {item.filename}
                        </p>
                        <p className="text-[11px] text-[#8C7E70] truncate mt-0.5">
                          {item.usedIn.length > 0
                            ? item.usedIn[0] + (item.usedIn.length > 1 ? ` (+${item.usedIn.length - 1})` : '')
                            : isAr
                            ? 'غير مستخدمة حالياً'
                            : 'Unused'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-[#E5DDD0] text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(item.url);
                            setCopiedUrl(item.url);
                            setTimeout(() => setCopiedUrl(null), 1500);
                          }}
                          className="inline-flex items-center gap-1 text-[#3A2B22] hover:text-[#B89362] cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedUrl === item.url ? '✓' : isAr ? 'نسخ' : 'Copy'}</span>
                        </button>

                        {item.usedIn.length > 0 && (
                          <label className="text-[#B89362] hover:underline cursor-pointer">
                            {isAr ? 'استبدال' : 'Replace'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                if (!e.target.files?.length) return;
                                const [newUrl] = await uploadSingleMedia(e.target.files);
                                const res = await fetch('/api/admin/media/replace', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ oldUrl: item.url, newUrl }),
                                });
                                const json = await res.json();
                                if (res.ok && json.db) {
                                  applyDbUpdate(json.db, true);
                                  await fetchMediaLibrary();
                                  notify(isAr ? 'تم استبدال الصورة في جميع الأماكن المرتبطة.' : 'Image replaced across site.');
                                }
                              }}
                            />
                          </label>
                        )}

                        {item.source === 'uploads' && item.usedIn.length === 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await fetch('/api/admin/media', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ url: item.url }),
                              });
                              const json = await res.json();
                              if (!res.ok) return fail(json.error);
                              await fetchMediaLibrary();
                              notify(isAr ? 'تم حذف الصورة.' : 'Image deleted.');
                            }}
                            className="text-red-700 hover:underline cursor-pointer"
                          >
                            {isAr ? 'حذف' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 8. BANNERS & VIDEOS */}
          {activeSection === 'banners-videos' && (
            <section className="space-y-8">
              {/* Advertising Banners */}
              <div className="space-y-4">
                <h2 className={`text-xl font-semibold ${isAr ? 'font-arabic' : 'font-display'}`}>
                  {isAr ? 'البنرات الإعلانية (صور فقط بعرض الشاشة)' : 'Full-Width Advertising Banners (Image-Only)'}
                </h2>
                <div className="bg-[#F2ECE1] border border-[#D6CCC0] rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                  <input
                    type="text"
                    placeholder="Banner Title (EN)"
                    value={newBanner.titleEn}
                    onChange={(e) => setNewBanner((b) => ({ ...b, titleEn: e.target.value }))}
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-xs"
                  />
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="عنوان البنر (AR)"
                    value={newBanner.titleAr}
                    onChange={(e) => setNewBanner((b) => ({ ...b, titleAr: e.target.value }))}
                    className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-xs font-arabic"
                  />
                  <label className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-xs cursor-pointer text-center">
                    {newBanner.imageUrl
                      ? isAr
                        ? 'تم رفع الصورة ✓'
                        : 'Image Selected ✓'
                      : isAr
                      ? 'رفع صورة البنر'
                      : 'Upload Banner Image'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        if (!e.target.files?.length) return;
                        const [url] = await uploadSingleMedia(e.target.files);
                        setNewBanner((b) => ({ ...b, imageUrl: url }));
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newBanner.imageUrl) return fail(isAr ? 'ارفع صورة البنر أولاً.' : 'Upload a banner image first.');
                      const item: AdvertisingBanner = {
                        id: `banner-${Date.now()}`,
                        titleEn: newBanner.titleEn || 'AWLAD AL RAJHI',
                        titleAr: newBanner.titleAr || 'أولاد الراجحي للأثاث',
                        subtitleEn: newBanner.subtitleEn,
                        subtitleAr: newBanner.subtitleAr,
                        imageUrl: newBanner.imageUrl,
                        isActive: true,
                        order: draft.banners.length + 1,
                      };
                      await saveBanners([...draft.banners, item]);
                      setNewBanner({ titleEn: '', titleAr: '', subtitleEn: '', subtitleAr: '', imageUrl: '' });
                      notify(isAr ? 'تمت إضافة البنر.' : 'Banner added and synced live.');
                    }}
                    className="px-4 py-2 bg-[#1C1917] text-[#FAF7F2] text-xs font-semibold rounded cursor-pointer"
                  >
                    {isAr ? 'إضافة البنر' : 'Add Banner'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {draft.banners.map((b) => (
                    <div key={b.id} className="bg-[#FAF7F2] border border-[#D6CCC0] rounded-xl overflow-hidden">
                      <img src={b.imageUrl} alt={b.titleEn} className="w-full h-36 object-cover" />
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold truncate">{isAr ? b.titleAr : b.titleEn}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                saveBanners(
                                  draft.banners.map((x) => (x.id === b.id ? { ...x, isActive: !x.isActive } : x))
                                )
                              }
                              className="text-xs underline cursor-pointer"
                            >
                              {b.isActive ? (isAr ? 'نشط' : 'Active') : (isAr ? 'مخفي' : 'Hidden')}
                            </button>
                            <button
                              type="button"
                              onClick={() => saveBanners(draft.banners.filter((x) => x.id !== b.id))}
                              className="text-xs text-red-700 cursor-pointer"
                            >
                              {isAr ? 'حذف' : 'Delete'}
                            </button>
                          </div>
                        </div>

                        <label className="inline-block text-[11px] underline text-[#3A2B22] cursor-pointer">
                          {isAr ? 'استبدال الصورة' : 'Replace Banner Photo'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              if (!e.target.files?.length) return;
                              const [url] = await uploadSingleMedia(e.target.files);
                              await saveBanners(
                                draft.banners.map((x) => (x.id === b.id ? { ...x, imageUrl: url } : x))
                              );
                              notify(isAr ? 'تم استبدال صورة البنر.' : 'Banner image replaced.');
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Video Gallery */}
              <div className="pt-6 border-t border-[#D6CCC0] space-y-4">
                <h2 className={`text-xl font-semibold ${isAr ? 'font-arabic' : 'font-display'}`}>
                  {isAr ? 'معرض فيديوهات المعرض' : 'Showroom Video Gallery'}
                </h2>
                <div className="bg-[#F2ECE1] border border-[#D6CCC0] rounded-xl p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Video Title (English)"
                      value={newVideoTitleEn}
                      onChange={(e) => setNewVideoTitleEn(e.target.value)}
                      className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                    />
                    <input
                      type="text"
                      dir="rtl"
                      placeholder="عنوان الفيديو (بالعربية)"
                      value={newVideoTitleAr}
                      onChange={(e) => setNewVideoTitleAr(e.target.value)}
                      className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm font-arabic"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <label className="px-4 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-xs cursor-pointer">
                      {videoFile ? videoFile.name : isAr ? 'اختيار ملف الفيديو (MP4/WebM)' : 'Select Video File (MP4/WebM)'}
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                      />
                    </label>

                    <label className="px-4 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-xs cursor-pointer">
                      {thumbFile ? thumbFile.name : isAr ? 'صورة غلاف اختيارية' : 'Optional Thumbnail Image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setThumbFile(e.target.files?.[0] || null)}
                      />
                    </label>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        if (!videoFile) return fail(isAr ? 'اختر ملف الفيديو أولاً.' : 'Select a video file first.');
                        setBusy(true);
                        try {
                          const fd = new FormData();
                          fd.append('video', videoFile);
                          if (thumbFile) fd.append('thumbnail', thumbFile);
                          const upRes = await fetch('/api/admin/upload-video', {
                            method: 'POST',
                            credentials: 'include',
                            body: fd,
                          });
                          const upJson = await upRes.json();
                          if (!upRes.ok) throw new Error(upJson.error);
                          const item: VideoItem = {
                            id: `vid-${Date.now()}`,
                            titleEn: newVideoTitleEn || 'AWLAD AL RAJHI Showroom Tour',
                            titleAr: newVideoTitleAr || 'جولة داخل معرض أولاد الراجحي',
                            videoUrl: upJson.videoUrl,
                            thumbnailUrl: upJson.thumbnailUrl,
                            isActive: true,
                            createdAt: new Date().toISOString(),
                          };
                          await saveVideos([...draft.videos, item]);
                          setVideoFile(null);
                          setThumbFile(null);
                          setNewVideoTitleEn('');
                          setNewVideoTitleAr('');
                          notify(isAr ? 'تم رفع الفيديو ونشره.' : 'Video uploaded and synced live.');
                        } catch (err: unknown) {
                          fail(err instanceof Error ? err.message : 'Video upload failed');
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="px-5 py-2 bg-[#1C1917] text-[#FAF7F2] text-xs font-semibold rounded cursor-pointer"
                    >
                      {busy ? (isAr ? 'جارٍ الرفع...' : 'Uploading...') : isAr ? 'رفع الفيديو' : 'Upload Video'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {draft.videos.map((v) => (
                    <div key={v.id} className="bg-[#FAF7F2] border border-[#D6CCC0] rounded-xl overflow-hidden">
                      <video src={v.videoUrl} poster={v.thumbnailUrl || undefined} controls className="w-full aspect-video bg-black" />
                      <div className="p-4 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate">{isAr ? v.titleAr : v.titleEn}</span>
                        <button
                          type="button"
                          onClick={() => saveVideos(draft.videos.filter((x) => x.id !== v.id))}
                          className="text-xs text-red-700 cursor-pointer"
                        >
                          {isAr ? 'حذف' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 9. CONTACT INFORMATION, SOCIALS & GOOGLE MAPS */}
          {activeSection === 'settings' && (
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 bg-[#F2ECE1] border border-[#D6CCC0] rounded-xl p-6 space-y-5">
                <h2 className={`text-xl font-semibold ${isAr ? 'font-arabic' : 'font-display'}`}>
                  {isAr ? 'بيانات التواصل والروابط وموقع المعرض' : 'Contact Info, Socials & Google Maps'}
                </h2>

                {/* Brand & Contact Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      {isAr ? 'اسم المعرض (EN)' : 'Showroom Name (EN)'}
                    </label>
                    <input
                      type="text"
                      value={settingsForm.brandNameEn}
                      onChange={(e) => setSettingsForm((p) => ({ ...p, brandNameEn: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      {isAr ? 'اسم المعرض (AR)' : 'Showroom Name (AR)'}
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={settingsForm.brandNameAr}
                      onChange={(e) => setSettingsForm((p) => ({ ...p, brandNameAr: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm font-arabic"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      {isAr ? 'رقم الهاتف وواتساب' : 'WhatsApp & Phone Number'}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={settingsForm.phone}
                      onChange={(e) => setSettingsForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      {isAr ? 'الشعار اللفظي (Slogan)' : 'Slogan'}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={settingsForm.slogan}
                      onChange={(e) => setSettingsForm((p) => ({ ...p, slogan: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      {isAr ? 'رابط فيسبوك' : 'Facebook URL'}
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      value={settingsForm.facebookUrl}
                      onChange={(e) => setSettingsForm((p) => ({ ...p, facebookUrl: e.target.value }))}
                      placeholder="https://facebook.com/..."
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      {isAr ? 'رابط إنستغرام' : 'Instagram URL'}
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      value={settingsForm.instagramUrl}
                      onChange={(e) => setSettingsForm((p) => ({ ...p, instagramUrl: e.target.value }))}
                      placeholder="https://instagram.com/..."
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                    />
                  </div>
                </div>

                {/* Google Maps Link Extractor */}
                <div className="p-4 bg-[#FAF7F2] border border-[#D6CCC0] rounded-lg space-y-3">
                  <label className={`block text-xs font-semibold text-[#1C1917] ${isAr ? 'font-arabic' : ''}`}>
                    {isAr
                      ? 'رابط خرائط جوجل (maps.app.goo.gl أو google.com/maps)'
                      : 'Google Maps Share Link'}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      dir="ltr"
                      value={settingsForm.googleMapsUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        const parsed = parseGoogleMapsInput(val);
                        setSettingsForm((prev) => ({
                          ...prev,
                          googleMapsUrl: val,
                          latitude: parsed?.latitude || prev.latitude,
                          longitude: parsed?.longitude || prev.longitude,
                          googleMapsEmbedUrl: parsed?.embedUrl || prev.googleMapsEmbedUrl,
                        }));
                      }}
                      placeholder="https://maps.app.goo.gl/..."
                      className="flex-1 px-3 py-2 bg-[#F2ECE1] border border-[#D6CCC0] rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleResolveGoogleMapsLink}
                      disabled={resolvingMap}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1C1917] text-[#FAF7F2] text-xs font-semibold rounded cursor-pointer whitespace-nowrap"
                    >
                      <Link2 className="w-3.5 h-3.5 text-[#C8A97E]" />
                      <span>{resolvingMap ? (isAr ? 'جارٍ الربط...' : 'Linking...') : isAr ? 'ربط واستخراج' : 'Link & Extract'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleUseCurrentGps}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2ECE1] border border-[#D6CCC0] hover:border-[#B89362] rounded text-xs text-[#1C1917] cursor-pointer"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-[#B89362]" />
                    <span>{isAr ? 'التقاط موقعي الحالي (GPS)' : 'Use Current GPS Location'}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    dir="rtl"
                    value={settingsForm.showroomAddressAr}
                    onChange={(e) => setSettingsForm((p) => ({ ...p, showroomAddressAr: e.target.value }))}
                    placeholder="عنوان المعرض (بالعربية)"
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm font-arabic"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    value={settingsForm.showroomAddressEn}
                    onChange={(e) => setSettingsForm((p) => ({ ...p, showroomAddressEn: e.target.value }))}
                    placeholder="Showroom Address (English)"
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      dir="ltr"
                      value={settingsForm.latitude}
                      onChange={(e) => setSettingsForm((p) => ({ ...p, latitude: e.target.value }))}
                      placeholder="Latitude"
                      className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                    />
                    <input
                      type="text"
                      dir="ltr"
                      value={settingsForm.longitude}
                      onChange={(e) => setSettingsForm((p) => ({ ...p, longitude: e.target.value }))}
                      placeholder="Longitude"
                      className="px-3 py-2 bg-[#FAF7F2] border border-[#D6CCC0] rounded text-sm"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => saveSettings(settingsForm)}
                  className="w-full py-3 bg-[#1C1917] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider rounded hover:bg-[#3A2B22] transition-colors cursor-pointer"
                >
                  <span className={isAr ? 'font-arabic tracking-normal text-sm' : ''}>
                    {isAr ? 'حفظ وتحديث بيانات التواصل والخريطة' : 'Save & Sync Contact & Map Settings'}
                  </span>
                </button>
              </div>

              <div className="lg:col-span-6 space-y-3">
                <h3 className={`text-base font-semibold text-[#1C1917] ${isAr ? 'font-arabic' : ''}`}>
                  {isAr ? 'معاينة خريطة المعرض المباشرة' : 'Live Showroom Map Preview'}
                </h3>
                <ShowroomMap settings={previewSettings} lang={lang} heightClassName="h-[480px]" />
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/80 flex items-center justify-center p-4"
          onClick={() => setEditingProduct(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#FAF7F2] border border-[#D6CCC0] rounded-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-xl font-semibold ${isAr ? 'font-arabic' : 'font-display'}`}>
                {isAr ? 'تعديل المنتج والصور والأسعار' : 'Edit Product, Pricing & Images'}
              </h3>
              <button type="button" onClick={() => setEditingProduct(null)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={editingProduct.titleEn}
                onChange={(e) => setEditingProduct({ ...editingProduct, titleEn: e.target.value })}
                placeholder="Title (EN)"
                className="px-3 py-2 border border-[#D6CCC0] rounded text-sm"
              />
              <input
                type="text"
                dir="rtl"
                value={editingProduct.titleAr}
                onChange={(e) => setEditingProduct({ ...editingProduct, titleAr: e.target.value })}
                placeholder="الاسم بالعربية"
                className="px-3 py-2 border border-[#D6CCC0] rounded text-sm font-arabic"
              />
            </div>

            <textarea
              rows={2}
              value={editingProduct.descriptionEn}
              onChange={(e) => setEditingProduct({ ...editingProduct, descriptionEn: e.target.value })}
              placeholder="Description (EN)"
              className="w-full px-3 py-2 border border-[#D6CCC0] rounded text-sm"
            />
            <textarea
              rows={2}
              dir="rtl"
              value={editingProduct.descriptionAr}
              onChange={(e) => setEditingProduct({ ...editingProduct, descriptionAr: e.target.value })}
              placeholder="الوصف بالعربية"
              className="w-full px-3 py-2 border border-[#D6CCC0] rounded text-sm font-arabic"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={editingProduct.materialsEn}
                onChange={(e) => setEditingProduct({ ...editingProduct, materialsEn: e.target.value })}
                placeholder="Materials (EN)"
                className="px-3 py-2 border border-[#D6CCC0] rounded text-sm"
              />
              <input
                type="text"
                dir="rtl"
                value={editingProduct.materialsAr}
                onChange={(e) => setEditingProduct({ ...editingProduct, materialsAr: e.target.value })}
                placeholder="الخامات (AR)"
                className="px-3 py-2 border border-[#D6CCC0] rounded text-sm font-arabic"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-[#8C7E70] mb-1">{isAr ? 'السعر' : 'Price (EGP)'}</label>
                <input
                  type="number"
                  min="0"
                  value={editingProduct.price ?? ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      price: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-[#D6CCC0] rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#8C7E70] mb-1">{isAr ? 'سعر الخصم' : 'Discount Price'}</label>
                <input
                  type="number"
                  min="0"
                  value={editingProduct.discountPrice ?? ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      discountPrice: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-[#D6CCC0] rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#8C7E70] mb-1">{isAr ? 'التوفر' : 'Availability'}</label>
                <select
                  value={editingProduct.availability || 'in-stock'}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      availability: e.target.value as ProductAvailability,
                    })
                  }
                  className="w-full px-2 py-1.5 border border-[#D6CCC0] rounded text-xs"
                >
                  <option value="in-stock">{isAr ? 'متوفر' : 'In Stock'}</option>
                  <option value="made-to-order">{isAr ? 'حسب الطلب' : 'Made to Order'}</option>
                  <option value="out-of-stock">{isAr ? 'غير متوفر' : 'Unavailable'}</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[#8C7E70] mb-1">{isAr ? 'الترتيب' : 'Order'}</label>
                <input
                  type="number"
                  min="0"
                  value={editingProduct.displayOrder ?? 0}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      displayOrder: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-[#D6CCC0] rounded text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingProduct.isBestSeller}
                  onChange={(e) => setEditingProduct({ ...editingProduct, isBestSeller: e.target.checked })}
                />
                <span>{isAr ? 'الأكثر مبيعاً' : 'Best Seller'}</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editingProduct.isFeatured)}
                  onChange={(e) => setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })}
                />
                <span>{isAr ? 'منتج مميز' : 'Featured'}</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingProduct.isPublished}
                  onChange={(e) => setEditingProduct({ ...editingProduct, isPublished: e.target.checked })}
                />
                <span>{isAr ? 'ظاهر على الموقع' : 'Published'}</span>
              </label>
            </div>

            <div>
              <p className="text-xs font-medium mb-2">
                {isAr ? 'صور المنتج (اضغط ★ لتعيين الصورة الرئيسية)' : 'Product Images (Click ★ to set primary cover)'}
              </p>
              <div className="flex flex-wrap gap-3">
                {editingProduct.images.map((img, i) => (
                  <div key={`${img}-${i}`} className="relative w-28 h-20 border border-[#D6CCC0] rounded overflow-hidden">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    {i > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const reordered = [img, ...editingProduct.images.filter((_, idx) => idx !== i)];
                          setEditingProduct({ ...editingProduct, images: reordered });
                        }}
                        className="absolute bottom-1 left-1 p-1 bg-[#1C1917]/80 text-[#C8A97E] rounded-full cursor-pointer"
                      >
                        <Star className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProduct({
                          ...editingProduct,
                          images: editingProduct.images.filter((_, idx) => idx !== i),
                        })
                      }
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="w-28 h-20 border border-dashed border-[#B89362] rounded flex flex-col items-center justify-center text-xs cursor-pointer">
                  <Plus className="w-4 h-4 text-[#B89362]" />
                  <span>{isAr ? 'إضافة' : 'Add'}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      if (!e.target.files?.length) return;
                      const urls = await uploadSingleMedia(e.target.files);
                      setEditingProduct({
                        ...editingProduct,
                        images: [...editingProduct.images, ...urls],
                      });
                    }}
                  />
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify(editingProduct),
                });
                applyDbUpdate(await res.json(), true);
                setEditingProduct(null);
                notify(isAr ? 'تم تحديث بيانات المنتج ونشرها.' : 'Updated product and synced live.');
              }}
              className="w-full py-3 bg-[#1C1917] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider rounded cursor-pointer"
            >
              {isAr ? 'حفظ التعديلات' : 'Save Product Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Edit Offer Modal */}
      {editingOffer && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/80 flex items-center justify-center p-4"
          onClick={() => setEditingOffer(null)}
        >
          <div
            className="w-full max-w-lg bg-[#FAF7F2] border border-[#D6CCC0] rounded-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${isAr ? 'font-arabic' : 'font-display'}`}>
                {isAr ? 'تعديل العرض الحصري' : 'Edit Exclusive Offer'}
              </h3>
              <button type="button" onClick={() => setEditingOffer(null)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={editingOffer.titleEn}
              onChange={(e) => setEditingOffer({ ...editingOffer, titleEn: e.target.value })}
              placeholder="Title (EN)"
              className="w-full px-3 py-2 border border-[#D6CCC0] rounded text-sm"
            />
            <input
              type="text"
              dir="rtl"
              value={editingOffer.titleAr}
              onChange={(e) => setEditingOffer({ ...editingOffer, titleAr: e.target.value })}
              placeholder="العنوان (AR)"
              className="w-full px-3 py-2 border border-[#D6CCC0] rounded text-sm font-arabic"
            />
            <textarea
              rows={2}
              value={editingOffer.descriptionEn || ''}
              onChange={(e) => setEditingOffer({ ...editingOffer, descriptionEn: e.target.value })}
              placeholder="Description (EN)"
              className="w-full px-3 py-2 border border-[#D6CCC0] rounded text-sm"
            />
            <textarea
              rows={2}
              dir="rtl"
              value={editingOffer.descriptionAr || ''}
              onChange={(e) => setEditingOffer({ ...editingOffer, descriptionAr: e.target.value })}
              placeholder="الوصف (AR)"
              className="w-full px-3 py-2 border border-[#D6CCC0] rounded text-sm font-arabic"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="0"
                value={editingOffer.originalPrice ?? ''}
                onChange={(e) =>
                  setEditingOffer({
                    ...editingOffer,
                    originalPrice: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="Original Price"
                className="px-3 py-2 border border-[#D6CCC0] rounded text-sm"
              />
              <input
                type="number"
                min="0"
                value={editingOffer.discountPrice ?? ''}
                onChange={(e) =>
                  setEditingOffer({
                    ...editingOffer,
                    discountPrice: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="Discount Price"
                className="px-3 py-2 border border-[#D6CCC0] rounded text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <img src={editingOffer.imageUrl} alt="" className="w-20 h-14 object-cover rounded border" />
              <label className="text-xs underline cursor-pointer">
                {isAr ? 'استبدال صورة العرض' : 'Replace Offer Image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    if (!e.target.files?.length) return;
                    const [url] = await uploadSingleMedia(e.target.files);
                    setEditingOffer({ ...editingOffer, imageUrl: url });
                  }}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={async () => {
                await saveOffers(draft.offers.map((x) => (x.id === editingOffer.id ? editingOffer : x)));
                setEditingOffer(null);
                notify(isAr ? 'تم تحديث العرض.' : 'Offer updated.');
              }}
              className="w-full py-2.5 bg-[#1C1917] text-[#FAF7F2] text-xs font-semibold rounded cursor-pointer"
            >
              {isAr ? 'حفظ التعديلات' : 'Save Offer'}
            </button>
          </div>
        </div>
      )}

      {/* Enlarge Image Modal */}
      {enlargedImg && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/90 flex items-center justify-center p-4"
          onClick={() => setEnlargedImg(null)}
        >
          <button
            type="button"
            onClick={() => setEnlargedImg(null)}
            className="absolute top-4 right-4 p-2 bg-[#FAF7F2] text-[#1C1917] rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={enlargedImg}
            alt="Enlarged preview"
            className="max-w-full max-h-[88vh] object-contain rounded"
          />
        </div>
      )}
    </div>
  );
};
