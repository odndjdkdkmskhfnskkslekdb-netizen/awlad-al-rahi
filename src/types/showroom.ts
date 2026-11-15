export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  coverImage: string;
  order: number;
}

export type ProductAvailability = 'in-stock' | 'made-to-order' | 'out-of-stock';

export interface Product {
  id: string;
  categoryId: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  materialsEn: string;
  materialsAr: string;
  price?: number;
  discountPrice?: number;
  images: string[];
  isBestSeller: boolean;
  isFeatured?: boolean;
  isPublished: boolean;
  availability?: ProductAvailability;
  displayOrder?: number;
  isDeliveredPhoto?: boolean;
  deliveredApproved?: boolean;
  createdAt: string;
}

export interface AdvertisingBanner {
  id: string;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  imageUrl: string;
  isActive: boolean;
  order: number;
}

export interface ExclusiveOffer {
  id: string;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  originalPrice?: number;
  discountPrice?: number;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
}

export type ReviewStatus = 'approved' | 'pending' | 'rejected';

export interface CustomerReview {
  id: string;
  customerName?: string;
  commentAr: string;
  commentEn?: string;
  screenshotUrl?: string;
  showStars: boolean;
  rating: number;
  status?: ReviewStatus;
  isActive: boolean;
  order: number;
}

export interface DeliveredGalleryPhoto {
  id: string;
  imageUrl: string;
  captionEn: string;
  captionAr: string;
  approved: boolean;
  createdAt: string;
}

export interface VideoItem {
  id: string;
  titleEn: string;
  titleAr: string;
  videoUrl: string;
  thumbnailUrl: string;
  isActive: boolean;
  createdAt: string;
}

export interface ShowroomSettings {
  brandNameEn: string;
  brandNameAr: string;
  slogan: string;
  phone: string;
  whatsappUrl: string;
  facebookUrl: string;
  instagramUrl?: string;
  showroomAddressEn: string;
  showroomAddressAr: string;
  googleMapsUrl: string;
  googleMapsEmbedUrl: string;
  latitude: string;
  longitude: string;
  reviewDisplayMode: 'cards' | 'screenshots';
  whatsappScreenshots: string[];
}

export interface ActivityLogEntry {
  id: string;
  actor: string;
  actionEn: string;
  actionAr: string;
  createdAt: string;
}

export interface ShowroomContent {
  categories: Category[];
  products: Product[];
  banners: AdvertisingBanner[];
  offers: ExclusiveOffer[];
  reviews: CustomerReview[];
  deliveredPhotos: DeliveredGalleryPhoto[];
  videos: VideoItem[];
  settings: ShowroomSettings;
  recentUpdates?: ActivityLogEntry[];
  updatedAt: string;
}

export interface ShowroomDatabase {
  draft: ShowroomContent;
  published: ShowroomContent;
  hasUnpublishedChanges: boolean;
  seedVersion?: number;
}

export interface MediaLibraryItem {
  url: string;
  filename: string;
  source: 'uploads' | 'showroom-assets';
  sizeBytes: number;
  createdAt: string;
  usedIn: string[];
}

export interface SupabaseStatusInfo {
  configured: boolean;
  hasUrl: boolean;
  hasAnonKey: boolean;
  hasServiceRoleKey: boolean;
  storageMode: 'supabase' | 'local-server';
  missingVars: string[];
}

export interface StagingClassifiedImage {
  tempId: string;
  imageUrl: string;
  suggestedCategorySlug: string;
  suggestedCategoryNameEn: string;
  suggestedCategoryNameAr: string;
  selectedCategorySlug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  materialsEn: string;
  materialsAr: string;
  selected: boolean;
  confidence?: string;
}
