import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { loadDatabase, recordActivity, saveDatabase } from './server/store.ts';
import { classifyFurnitureImage } from './server/gemini.ts';
import type {
  AdvertisingBanner,
  Category,
  CustomerReview,
  DeliveredGalleryPhoto,
  ExclusiveOffer,
  MediaLibraryItem,
  Product,
  ShowroomDatabase,
  ShowroomSettings,
  StagingClassifiedImage,
  SupabaseStatusInfo,
  VideoItem,
} from './src/types/showroom.ts';

dotenv.config();

const PORT = 3000;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@awladalrajhi.com').trim().toLowerCase();
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'ALRAJHI2026';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update(`awlad-alrajhi-${ADMIN_PASSCODE}`).digest('hex');

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

function getSupabaseStatus(): SupabaseStatusInfo {
  const hasUrl = Boolean(SUPABASE_URL && !SUPABASE_URL.includes('YOUR_PROJECT_ID'));
  const hasAnonKey = Boolean(SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY'));
  const hasServiceRoleKey = Boolean(
    SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_SERVICE_ROLE_KEY.includes('YOUR_SUPABASE_SERVICE_ROLE_KEY')
  );
  const missingVars: string[] = [];
  if (!hasUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!hasAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
  if (!hasServiceRoleKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
  const configured = hasUrl && hasAnonKey && hasServiceRoleKey;
  return {
    configured,
    hasUrl,
    hasAnonKey,
    hasServiceRoleKey,
    storageMode: configured ? 'supabase' : 'local-server',
    missingVars,
  };
}

function syncPublishedAndSave(db: ShowroomDatabase, autoSync = true): void {
  const now = new Date().toISOString();
  db.draft.updatedAt = now;
  if (autoSync) {
    db.published = JSON.parse(JSON.stringify(db.draft));
    db.hasUnpublishedChanges = false;
  } else {
    db.hasUnpublishedChanges = true;
  }
  saveDatabase(db);
}

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 32);
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const uploadImages = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 25 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const uploadVideo = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video and image thumbnail files are allowed'));
    }
  },
});

function createSessionToken(): string {
  const expires = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  const payload = Buffer.from(JSON.stringify({ role: 'owner', exp: expires })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token?: string): boolean {
  if (!token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  try {
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    return decoded.role === 'owner' && typeof decoded.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

function getTokenFromRequest(req: express.Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    for (const part of cookieHeader.split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (k === 'alrajhi_owner_token') {
        return decodeURIComponent(v.join('='));
      }
    }
  }
  return undefined;
}

const ADMIN_PUBLIC_ACCESS = process.env.ADMIN_REQUIRE_AUTH !== 'true';

const requireOwner: express.RequestHandler = (req, res, next) => {
  if (ADMIN_PUBLIC_ACCESS) {
    return next();
  }
  const token = getTokenFromRequest(req);
  if (!verifySessionToken(token)) {
    return res.status(401).json({ error: 'Owner authentication required.' });
  }
  next();
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Serve uploaded files and public assets directly
  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use('/assets', express.static(path.join(PUBLIC_DIR, 'assets')));

  // Public storefront data (published only, empty categories filtered on client or returned cleanly)
  app.get('/api/storefront', (_req, res) => {
    const db = loadDatabase();
    res.json(db.published);
  });

  // Owner Auth endpoints (supports Email + Password or Passcode, plus optional Supabase Auth JWT)
  app.post('/api/auth/login', async (req, res) => {
    const { email, password, passcode } = req.body as {
      email?: string;
      password?: string;
      passcode?: string;
    };

    const enteredEmail = (email || ADMIN_EMAIL).trim().toLowerCase();
    const enteredSecret = (password || passcode || '').trim();

    if (!enteredSecret) {
      return res.status(401).json({ error: 'Email and password are required.' });
    }

    // If Supabase Auth is configured, verify via Supabase Auth + admin_users table
    const sbStatus = getSupabaseStatus();
    if (sbStatus.configured && email && password) {
      try {
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: authData, error: authErr } = await sb.auth.signInWithPassword({
          email: enteredEmail,
          password: enteredSecret,
        });
        if (!authErr && authData.user) {
          const { data: adminRow } = await sb
            .from('admin_users')
            .select('user_id, role')
            .eq('user_id', authData.user.id)
            .maybeSingle();
          if (adminRow) {
            const token = createSessionToken();
            res.cookie('alrajhi_owner_token', token, {
              httpOnly: true,
              sameSite: 'lax',
              maxAge: 1000 * 60 * 60 * 24 * 7,
            });
            return res.json({ ok: true, token, email: authData.user.email, authProvider: 'supabase' });
          }
          return res.status(403).json({ error: 'Account is not listed in admin_users.' });
        }
      } catch (err) {
        console.error('Supabase login check failed:', err);
      }
    }

    // Server-side owner credentials check
    if (email && enteredEmail !== ADMIN_EMAIL) {
      return res.status(401).json({ error: 'Invalid administrator email or password.' });
    }
    if (enteredSecret !== ADMIN_PASSCODE) {
      return res.status(401).json({ error: 'Invalid administrator email or password.' });
    }

    const token = createSessionToken();
    res.cookie('alrajhi_owner_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    res.json({ ok: true, token, email: enteredEmail, authProvider: 'server' });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('alrajhi_owner_token');
    res.json({ ok: true });
  });

  app.get('/api/auth/session', (req, res) => {
    const token = getTokenFromRequest(req);
    const isAuth = ADMIN_PUBLIC_ACCESS || verifySessionToken(token);
    res.json({
      authenticated: isAuth,
      publicAccess: ADMIN_PUBLIC_ACCESS,
      email: isAuth ? ADMIN_EMAIL : null,
      supabase: getSupabaseStatus(),
    });
  });

  // Admin: Get full Draft + Published status
  app.get('/api/admin/state', requireOwner, (_req, res) => {
    const db = loadDatabase();
    res.json(db);
  });

  // Admin: Supabase diagnostic status
  app.get('/api/admin/supabase-status', requireOwner, (_req, res) => {
    res.json(getSupabaseStatus());
  });

  // Admin: Publish all draft changes to live
  app.post('/api/admin/publish', requireOwner, (_req, res) => {
    const db = loadDatabase();
    db.draft.updatedAt = new Date().toISOString();
    db.published = JSON.parse(JSON.stringify(db.draft));
    db.hasUnpublishedChanges = false;
    saveDatabase(db);
    res.json(db);
  });

  // Admin: Discard draft changes (revert draft to published)
  app.post('/api/admin/discard-draft', requireOwner, (_req, res) => {
    const db = loadDatabase();
    db.draft = JSON.parse(JSON.stringify(db.published));
    db.hasUnpublishedChanges = false;
    saveDatabase(db);
    res.json(db);
  });

  // Admin: Upload images & run Gemini AI automatic classification (staged, NEVER auto-published!)
  app.post('/api/admin/upload-and-classify', requireOwner, uploadImages.array('images', 25), async (req, res) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) {
        return res.status(400).json({ error: 'No images uploaded.' });
      }

      const staged: StagingClassifiedImage[] = await Promise.all(
        files.map(async (file, idx) => {
          const imageUrl = `/uploads/${file.filename}`;
          const analysis = await classifyFurnitureImage(imageUrl);
          return {
            tempId: `stg-${Date.now()}-${idx}`,
            imageUrl,
            suggestedCategorySlug: analysis.suggestedCategorySlug,
            suggestedCategoryNameEn: analysis.suggestedCategoryNameEn,
            suggestedCategoryNameAr: analysis.suggestedCategoryNameAr,
            selectedCategorySlug: analysis.suggestedCategorySlug,
            titleEn: analysis.titleEn,
            titleAr: analysis.titleAr,
            descriptionEn: analysis.descriptionEn,
            descriptionAr: analysis.descriptionAr,
            materialsEn: analysis.materialsEn,
            materialsAr: analysis.materialsAr,
            selected: true,
            confidence: analysis.confidence,
          };
        })
      );

      res.json({ staged });
    } catch (error: any) {
      console.error('Upload & classify error:', error);
      res.status(500).json({ error: error?.message || 'Failed to upload and classify images.' });
    }
  });

  // Admin: Plain image upload (for banners, offers, product galleries, WhatsApp screenshots, video thumbnails)
  app.post('/api/admin/upload-media', requireOwner, uploadImages.array('files', 10), (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'No image files received.' });
    }
    res.json({ urls: files.map((f) => `/uploads/${f.filename}`) });
  });

  // Admin: Upload video (+ optional thumbnail)
  app.post(
    '/api/admin/upload-video',
    requireOwner,
    uploadVideo.fields([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
    ]),
    (req, res) => {
      const fileMap = req.files as Record<string, Express.Multer.File[]> | undefined;
      const videoFile = fileMap?.video?.[0];
      const thumbFile = fileMap?.thumbnail?.[0];
      if (!videoFile) {
        return res.status(400).json({ error: 'Video file is required.' });
      }
      res.json({
        videoUrl: `/uploads/${videoFile.filename}`,
        thumbnailUrl: thumbFile ? `/uploads/${thumbFile.filename}` : '',
      });
    }
  );

  // Admin: Confirm & Publish Staged Classified Images ("تأكيد ونشر الصور")
  app.post('/api/admin/confirm-staged-images', requireOwner, (req, res) => {
    const { items, publishImmediately } = req.body as {
      items: StagingClassifiedImage[];
      publishImmediately?: boolean;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items selected to publish.' });
    }

    const db = loadDatabase();
    const now = new Date().toISOString();

    const CATEGORY_DEFAULTS: Record<string, { nameEn: string; nameAr: string; descEn: string; descAr: string }> = {
      'bedroom-collection': {
        nameEn: 'BEDROOM COLLECTION',
        nameAr: 'غرف النوم الرئيسية',
        descEn: 'Architectural master bedroom suites crafted for serene luxury.',
        descAr: 'غرف نوم رئيسية فاخرة بتصميمات معمارية هادئة.',
      },
      'dressing-room': {
        nameEn: 'DRESSING ROOM & VANITIES',
        nameAr: 'التسريحات وغرف الملابس',
        descEn: 'Illuminated dressing tables, mirrors, and bespoke wardrobe ensembles.',
        descAr: 'تسريحات بمرايا مضيئة وغرف ملابس مصممة بذوق رفيع.',
      },
      'dining-collection': {
        nameEn: 'DINING COLLECTION',
        nameAr: 'غرف السفرة والنيش',
        descEn: 'Refined dining ensembles crafted for distinguished gatherings.',
        descAr: 'مجموعات سفرة فاخرة تناسب أرقى المساحات.',
      },
      'sofa-collection': {
        nameEn: 'SOFA COLLECTION',
        nameAr: 'الصالونات والركنات',
        descEn: 'Sculptural lounge seating with bespoke textiles and wood accents.',
        descAr: 'صالونات وركنات بأقمشة فاخرة وتفاصيل خشبية راقية.',
      },
      'office-furniture': {
        nameEn: 'OFFICE FURNITURE',
        nameAr: 'الأثاث المكتبي',
        descEn: 'Executive desks, conference tables, and refined study furnishings.',
        descAr: 'مكاتب تنفيذية وتجهيزات غرف دراسة فاخرة.',
      },
      chairs: {
        nameEn: 'CHAIRS',
        nameAr: 'الكراسي الفاخرة',
        descEn: 'Accent armchairs and sculptural dining chairs.',
        descAr: 'كراسي استرخاء وطعام بتصميمات استثنائية.',
      },
      'beds-youth': {
        nameEn: 'BEDS & YOUTH SUITES',
        nameAr: 'غرف الشباب والأسرّة',
        descEn: 'Contemporary beds and curated youth bedroom suites.',
        descAr: 'أسرّة منجدة وغرف شباب عصرية.',
      },
    };

    for (const item of items) {
      const slug = item.selectedCategorySlug || 'bedroom-collection';
      let category = db.draft.categories.find((c) => c.slug === slug || c.id === slug);
      if (!category) {
        const meta = CATEGORY_DEFAULTS[slug] || {
          nameEn: item.suggestedCategoryNameEn || slug.toUpperCase(),
          nameAr: item.suggestedCategoryNameAr || slug,
          descEn: 'Curated luxury furniture collection.',
          descAr: 'مجموعة أثاث فاخرة منتقاة بعناية.',
        };
        category = {
          id: `cat-${slug}-${Date.now()}`,
          slug,
          nameEn: meta.nameEn,
          nameAr: meta.nameAr,
          descriptionEn: meta.descEn,
          descriptionAr: meta.descAr,
          coverImage: item.imageUrl,
          order: db.draft.categories.length + 1,
        };
        db.draft.categories.push(category);
      }

      const newProduct: Product = {
        id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        categoryId: category.id,
        titleEn: item.titleEn,
        titleAr: item.titleAr,
        descriptionEn: item.descriptionEn,
        descriptionAr: item.descriptionAr,
        materialsEn: item.materialsEn,
        materialsAr: item.materialsAr,
        images: [item.imageUrl],
        isBestSeller: false,
        isPublished: true,
        createdAt: now,
      };
      db.draft.products.unshift(newProduct);
    }

    db.draft.updatedAt = now;
    if (publishImmediately !== false) {
      db.published = JSON.parse(JSON.stringify(db.draft));
      db.hasUnpublishedChanges = false;
    } else {
      db.hasUnpublishedChanges = true;
    }
    recordActivity(db, ADMIN_EMAIL, `Published ${items.length} AI-classified image(s)`, `نشر ${items.length} صورة مصنفة بالذكاء الاصطناعي`);
    saveDatabase(db);
    res.json(db);
  });

  // Admin: Categories CRUD + Rename + Reorder + Merge (syncs immediately to live website)
  app.post('/api/admin/categories', requireOwner, (req, res) => {
    const db = loadDatabase();
    const { nameEn, nameAr, descriptionEn, descriptionAr, coverImage } = req.body as Partial<Category>;
    if (!nameEn || !nameAr) {
      return res.status(400).json({ error: 'English and Arabic category names are required.' });
    }
    const slug = nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `cat-${Date.now()}`;
    const cat: Category = {
      id: `cat-${Date.now()}`,
      slug,
      nameEn: nameEn.trim(),
      nameAr: nameAr.trim(),
      descriptionEn: (descriptionEn || '').trim(),
      descriptionAr: (descriptionAr || '').trim(),
      coverImage: coverImage || '',
      order: db.draft.categories.length + 1,
    };
    db.draft.categories.push(cat);
    recordActivity(db, ADMIN_EMAIL, `Created category "${cat.nameEn}"`, `إنشاء قسم "${cat.nameAr}"`);
    syncPublishedAndSave(db, true);
    res.json(db);
  });

  app.put('/api/admin/categories/:id', requireOwner, (req, res) => {
    const db = loadDatabase();
    const idx = db.draft.categories.findIndex((c) => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Category not found.' });
    db.draft.categories[idx] = { ...db.draft.categories[idx], ...req.body, id: req.params.id };
    recordActivity(db, ADMIN_EMAIL, `Updated category "${db.draft.categories[idx].nameEn}"`, `تحديث قسم "${db.draft.categories[idx].nameAr}"`);
    syncPublishedAndSave(db, true);
    res.json(db);
  });

  app.post('/api/admin/categories/reorder', requireOwner, (req, res) => {
    const { orderedIds } = req.body as { orderedIds: string[] };
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds array is required.' });
    }
    const db = loadDatabase();
    const orderMap: Record<string, number> = {};
    orderedIds.forEach((id, i) => {
      orderMap[id] = i + 1;
    });
    db.draft.categories = db.draft.categories
      .map((c) => ({ ...c, order: orderMap[c.id] ?? c.order }))
      .sort((a, b) => a.order - b.order);
    recordActivity(db, ADMIN_EMAIL, 'Reordered categories', 'تغيير ترتيب الأقسام');
    syncPublishedAndSave(db, true);
    res.json(db);
  });

  app.post('/api/admin/categories/merge', requireOwner, (req, res) => {
    const { sourceCategoryId, targetCategoryId } = req.body as {
      sourceCategoryId: string;
      targetCategoryId: string;
    };
    if (!sourceCategoryId || !targetCategoryId || sourceCategoryId === targetCategoryId) {
      return res.status(400).json({ error: 'Select two distinct categories to merge.' });
    }
    const db = loadDatabase();
    const targetExists = db.draft.categories.some((c) => c.id === targetCategoryId);
    if (!targetExists) return res.status(404).json({ error: 'Target category not found.' });

    db.draft.products = db.draft.products.map((p) =>
      p.categoryId === sourceCategoryId ? { ...p, categoryId: targetCategoryId } : p
    );
    db.draft.categories = db.draft.categories.filter((c) => c.id !== sourceCategoryId);
    recordActivity(db, ADMIN_EMAIL, 'Merged categories', 'دمج قسمين');
    syncPublishedAndSave(db, true);
    res.json(db);
  });

  app.delete('/api/admin/categories/:id', requireOwner, (req, res) => {
    const db = loadDatabase();
    const hasProducts = db.draft.products.some((p) => p.categoryId === req.params.id);
    if (hasProducts) {
      return res.status(400).json({ error: 'Move or delete products in this category first, or merge it.' });
    }
    const target = db.draft.categories.find((c) => c.id === req.params.id);
    db.draft.categories = db.draft.categories.filter((c) => c.id !== req.params.id);
    recordActivity(db, ADMIN_EMAIL, `Deleted category "${target?.nameEn || req.params.id}"`, `حذف قسم "${target?.nameAr || req.params.id}"`);
    syncPublishedAndSave(db, true);
    res.json(db);
  });

  // Admin: Products CRUD + Reorder (syncs immediately to live website)
  app.post('/api/admin/products', requireOwner, (req, res) => {
    const db = loadDatabase();
    const body = req.body as Partial<Product>;
    if (!body.categoryId || !body.titleEn || !body.images?.length) {
      return res.status(400).json({ error: 'Category, title, and at least one image are required.' });
    }
    const product: Product = {
      id: `prod-${Date.now()}`,
      categoryId: body.categoryId,
      titleEn: body.titleEn.trim(),
      titleAr: (body.titleAr || body.titleEn).trim(),
      descriptionEn: (body.descriptionEn || '').trim(),
      descriptionAr: (body.descriptionAr || '').trim(),
      materialsEn: (body.materialsEn || '').trim(),
      materialsAr: (body.materialsAr || '').trim(),
      price: typeof body.price === 'number' && body.price > 0 ? body.price : undefined,
      discountPrice: typeof body.discountPrice === 'number' && body.discountPrice > 0 ? body.discountPrice : undefined,
      images: body.images,
      isBestSeller: Boolean(body.isBestSeller),
      isFeatured: Boolean(body.isFeatured),
      isPublished: body.isPublished !== false,
      availability: body.availability || 'in-stock',
      displayOrder: body.displayOrder ?? 0,
      createdAt: new Date().toISOString(),
    };
    db.draft.products.unshift(product);
    recordActivity(db, ADMIN_EMAIL, `Added product "${product.titleEn}"`, `إضافة منتج "${product.titleAr}"`);
    syncPublishedAndSave(db, true);
    res.json(db);
  });

  app.put('/api/admin/products/:id', requireOwner, (req, res) => {
    const db = loadDatabase();
    const idx = db.draft.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found.' });
    db.draft.products[idx] = { ...db.draft.products[idx], ...req.body, id: req.params.id };
    recordActivity(db, ADMIN_EMAIL, `Updated product "${db.draft.products[idx].titleEn}"`, `تحديث منتج "${db.draft.products[idx].titleAr}"`);
    syncPublishedAndSave(db, true);
    res.json(db);
  });

  app.post('/api/admin/products/reorder', requireOwner, (req, res) => {
    const { orderedIds } = req.body as { orderedIds: string[] };
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds array is required.' });
    }
    const db = loadDatabase();
    const mapOrder: Record<string, number> = {};
    orderedIds.forEach((id, i) => {
      mapOrder[id] = i + 1;
    });
    db.draft.products = db.draft.products
      .map((p) => ({ ...p, displayOrder: mapOrder[p.id] ?? p.displayOrder ?? 999 }))
      .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
    recordActivity(db, ADMIN_EMAIL, 'Updated product display order', 'تحديث ترتيب عرض المنتجات');
    syncPublishedAndSave(db, true);
    res.json(db);
  });

  app.delete('/api/admin/products/:id', requireOwner, (req, res) => {
    const db = loadDatabase();
    const removed = db.draft.products.find((p) => p.id === req.params.id);
    db.draft.products = db.draft.products.filter((p) => p.id !== req.params.id);
    recordActivity(db, ADMIN_EMAIL, `Deleted product "${removed?.titleEn || req.params.id}"`, `حذف منتج "${removed?.titleAr || req.params.id}"`);
    syncPublishedAndSave(db, true);
    res.json(db);
  });

  // Admin: Advertising Banners CRUD
  app.put('/api/admin/banners', requireOwner, (req, res) => {
    const db = loadDatabase();
    const { banners } = req.body as { banners: AdvertisingBanner[] };
    db.draft.banners = banners;
    recordActivity(db, ADMIN_EMAIL, 'Updated advertising banners', 'تحديث البنرات الإعلانية');
    syncPublishedAndSave(db, true);
    res.json(db);
  });

  // Admin: Exclusive Offers CRUD
  app.put('/api/admin/offers', requireOwner, (req, res) => {
    const db = loadDatabase();
    const { offers } = req.body as { offers: ExclusiveOffer[] };
    db.draft.offers = offers;
    recordActivity(db, ADMIN_EMAIL, 'Updated exclusive offers', 'تحديث العروض الحصرية');
    syncPublishedAndSave(db, true);
    res.json(db);
  });

  // Admin: Customer Reviews CRUD (max 20) + Delivered Photos Approval
  app.put('/api/admin/reviews', requireOwner, (req, res) => {
    const db = loadDatabase();
    const { reviews, deliveredPhotos } = req.body as {
      reviews: CustomerReview[];
      deliveredPhotos?: DeliveredGalleryPhoto[];
    };
    if (reviews.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 customer reviews supported.' });
    }
    db.draft.reviews = reviews;
    if (deliveredPhotos) {
      db.draft.deliveredPhotos = deliveredPhotos;
    }
    recordActivity(db, ADMIN_EMAIL, 'Updated customer reviews & approvals', 'تحديث آراء العملاء واعتماد الصور');
    syncPublishedAndSave(db, true);
    res.json(db);
  });

  // Admin: Video Gallery CRUD
  app.put('/api/admin/videos', requireOwner, (req, res) => {
    const db = loadDatabase();
    const { videos } = req.body as { videos: VideoItem[] };
    db.draft.videos = videos;
    recordActivity(db, ADMIN_EMAIL, 'Updated video gallery', 'تحديث معرض الفيديو');
    syncPublishedAndSave(db, true);
    res.json(db);
  });

  // Admin: Settings (Contact, Location, Google Maps, Facebook, Instagram, Review display mode, WhatsApp screenshots)
  app.put('/api/admin/settings', requireOwner, (req, res) => {
    const db = loadDatabase();
    const settings = req.body as Partial<ShowroomSettings>;
    const merged = { ...db.draft.settings, ...settings };
    if (settings.phone) {
      const digits = settings.phone.replace(/\D/g, '');
      if (digits.startsWith('0')) {
        merged.whatsappUrl = `https://wa.me/2${digits}`;
      } else if (digits) {
        merged.whatsappUrl = `https://wa.me/${digits}`;
      }
    }
    db.draft.settings = merged;
    recordActivity(db, ADMIN_EMAIL, 'Updated contact, social & Google Maps settings', 'تحديث بيانات التواصل وخرائط جوجل');
    syncPublishedAndSave(db, true);
    res.json(db);
  });

  // Admin: Media Library – list uploaded & showroom images with reference tracking
  app.get('/api/admin/media', requireOwner, (_req, res) => {
    const db = loadDatabase();
    const usageMap: Record<string, string[]> = {};
    const addRef = (url: string | undefined, label: string) => {
      if (!url) return;
      if (!usageMap[url]) usageMap[url] = [];
      if (!usageMap[url].includes(label)) usageMap[url].push(label);
    };

    db.draft.products.forEach((p) => p.images.forEach((img) => addRef(img, `Product: ${p.titleEn}`)));
    db.draft.categories.forEach((c) => addRef(c.coverImage, `Category: ${c.nameEn}`));
    db.draft.banners.forEach((b) => addRef(b.imageUrl, `Banner: ${b.titleEn}`));
    db.draft.offers.forEach((o) => addRef(o.imageUrl, `Offer: ${o.titleEn}`));
    db.draft.reviews.forEach((r) => addRef(r.screenshotUrl, `Review: ${r.customerName || r.id}`));
    db.draft.settings.whatsappScreenshots.forEach((s, i) => addRef(s, `WhatsApp Screenshot #${i + 1}`));
    db.draft.deliveredPhotos.forEach((d) => addRef(d.imageUrl, `Delivered: ${d.id}`));

    const items: MediaLibraryItem[] = [];
    const scanDir = (dirPath: string, urlPrefix: string, source: MediaLibraryItem['source']) => {
      if (!fs.existsSync(dirPath)) return;
      for (const fname of fs.readdirSync(dirPath)) {
        const full = path.join(dirPath, fname);
        const stat = fs.statSync(full);
        if (!stat.isFile()) continue;
        if (!/\.(jpg|jpeg|png|webp|gif|avif)$/i.test(fname)) continue;
        const url = `${urlPrefix}/${fname}`;
        items.push({
          url,
          filename: fname,
          source,
          sizeBytes: stat.size,
          createdAt: stat.mtime.toISOString(),
          usedIn: usageMap[url] || [],
        });
      }
    };

    scanDir(UPLOADS_DIR, '/uploads', 'uploads');
    scanDir(path.join(PUBLIC_DIR, 'assets', 'aistudio'), '/assets/aistudio', 'showroom-assets');
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ items });
  });

  // Admin: Replace an image URL across all products/categories/banners/offers/reviews
  app.post('/api/admin/media/replace', requireOwner, (req, res) => {
    const { oldUrl, newUrl } = req.body as { oldUrl?: string; newUrl?: string };
    if (!oldUrl || !newUrl) {
      return res.status(400).json({ error: 'oldUrl and newUrl are required.' });
    }
    const db = loadDatabase();
    const swap = (u: string) => (u === oldUrl ? newUrl : u);
    const swapInContent = (c: ShowroomDatabase['draft']) => {
      c.products = c.products.map((p) => ({ ...p, images: p.images.map(swap) }));
      c.categories = c.categories.map((cat) => ({ ...cat, coverImage: swap(cat.coverImage) }));
      c.banners = c.banners.map((b) => ({ ...b, imageUrl: swap(b.imageUrl) }));
      c.offers = c.offers.map((o) => ({ ...o, imageUrl: swap(o.imageUrl) }));
      c.reviews = c.reviews.map((r) => ({ ...r, screenshotUrl: r.screenshotUrl ? swap(r.screenshotUrl) : r.screenshotUrl }));
      c.settings.whatsappScreenshots = c.settings.whatsappScreenshots.map(swap);
    };
    swapInContent(db.draft);
    recordActivity(db, ADMIN_EMAIL, 'Replaced media asset across showroom', 'استبدال صورة في المعرض');
    syncPublishedAndSave(db, true);
    res.json({ ok: true, db });
  });

  // Admin: Delete an unused uploaded image file
  app.delete('/api/admin/media', requireOwner, (req, res) => {
    const { url } = req.body as { url?: string };
    if (!url || !url.startsWith('/uploads/')) {
      return res.status(400).json({ error: 'Only uploaded files in /uploads/ can be deleted.' });
    }
    const db = loadDatabase();
    const isReferenced =
      db.draft.products.some((p) => p.images.includes(url)) ||
      db.draft.categories.some((c) => c.coverImage === url) ||
      db.draft.banners.some((b) => b.imageUrl === url) ||
      db.draft.offers.some((o) => o.imageUrl === url) ||
      db.draft.reviews.some((r) => r.screenshotUrl === url) ||
      db.draft.settings.whatsappScreenshots.includes(url);

    if (isReferenced) {
      return res.status(400).json({ error: 'Image is currently in use. Replace or remove references first.' });
    }

    const safeName = path.basename(url);
    const fullPath = path.join(UPLOADS_DIR, safeName);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    recordActivity(db, ADMIN_EMAIL, `Deleted unused upload "${safeName}"`, `حذف صورة غير مستخدمة`);
    saveDatabase(db);
    res.json({ ok: true });
  });

  // Admin: Resolve shortened Google Maps URLs (e.g. maps.app.goo.gl) safely to extract coordinates
  app.post('/api/admin/resolve-maps-link', requireOwner, async (req, res) => {
    const { url } = req.body as { url?: string };
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Google Maps URL is required.' });
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.trim());
    } catch {
      return res.status(400).json({ error: 'Invalid URL format.' });
    }

    const allowedHosts = new Set([
      'maps.app.goo.gl',
      'goo.gl',
      'maps.google.com',
      'www.google.com',
      'google.com',
      'g.page',
    ]);
    if (!['https:', 'http:'].includes(parsedUrl.protocol) || !allowedHosts.has(parsedUrl.hostname)) {
      return res.status(400).json({ error: 'Only official Google Maps links are allowed.' });
    }

    let finalUrl = parsedUrl.toString();
    try {
      const response = await fetch(finalUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (response.url) {
        finalUrl = response.url;
      }
    } catch {
      // If network redirect fails, still attempt regex coordinate parsing on submitted URL
    }

    const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const dataMatch = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    const queryMatch = finalUrl.match(/[?&](?:q|query|ll|center)=(-?\d+\.\d+)[,%2C]+(-?\d+\.\d+)/i);
    const match = atMatch || dataMatch || queryMatch;

    res.json({
      resolvedUrl: finalUrl,
      latitude: match ? match[1] : '',
      longitude: match ? match[2] : '',
    });
  });

  // Vite Dev or Production Static Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AWLAD AL RAJHI Showroom running at http://localhost:${PORT}`);
  });
}

startServer();
