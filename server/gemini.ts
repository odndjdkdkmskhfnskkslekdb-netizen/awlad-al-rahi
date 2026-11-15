import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const CATEGORY_CATALOG = [
  { slug: 'bedroom-collection', nameEn: 'BEDROOM COLLECTION', nameAr: 'غرف النوم الرئيسية' },
  { slug: 'dressing-room', nameEn: 'DRESSING ROOM & VANITIES', nameAr: 'التسريحات وغرف الملابس' },
  { slug: 'dining-collection', nameEn: 'DINING COLLECTION', nameAr: 'غرف السفرة والنيش' },
  { slug: 'sofa-collection', nameEn: 'SOFA COLLECTION', nameAr: 'الصالونات والركنات' },
  { slug: 'office-furniture', nameEn: 'OFFICE FURNITURE', nameAr: 'الأثاث المكتبي' },
  { slug: 'chairs', nameEn: 'CHAIRS', nameAr: 'الكراسي الفاخرة' },
  { slug: 'beds-youth', nameEn: 'BEDS & YOUTH SUITES', nameAr: 'غرف الشباب والأسرّة' },
];

export interface ClassifiedImageResult {
  suggestedCategorySlug: string;
  suggestedCategoryNameEn: string;
  suggestedCategoryNameAr: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  materialsEn: string;
  materialsAr: string;
  confidence: string;
}

function resolvePublicImagePath(imageUrl: string): string | null {
  const cleanUrl = imageUrl.split('?')[0].replace(/^\/+/, '');
  const candidate = path.resolve(process.cwd(), 'public', cleanUrl);
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return null;
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

export async function classifyFurnitureImage(imageUrl: string): Promise<ClassifiedImageResult> {
  const fallback: ClassifiedImageResult = {
    suggestedCategorySlug: 'bedroom-collection',
    suggestedCategoryNameEn: 'BEDROOM COLLECTION',
    suggestedCategoryNameAr: 'غرف النوم الرئيسية',
    titleEn: 'Luxury Showroom Piece',
    titleAr: 'قطعة أثاث فاخرة',
    descriptionEn: 'Curated luxury furniture crafted with refined wood veneers and tailored upholstery.',
    descriptionAr: 'قطعة أثاث راقية مصنوعة بعناية من أجود الأخشاب والتنجيد الفاخر.',
    materialsEn: 'Natural Wood Veneer, Premium Upholstery',
    materialsAr: 'قشرة خشب طبيعي، تنجيد فاخر',
    confidence: 'manual-review',
  };

  if (!process.env.GEMINI_API_KEY) {
    return fallback;
  }

  const filePath = resolvePublicImagePath(imageUrl);
  if (!filePath) {
    return fallback;
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    const mimeType = getMimeType(filePath);

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: `Analyze this luxury furniture photograph for the showroom AWLAD AL RAJHI (أولاد الراجحي).
Choose the single best matching categorySlug from:
- bedroom-collection (BEDROOM COLLECTION / غرف النوم الرئيسية)
- dressing-room (DRESSING ROOM & VANITIES / التسريحات وغرف الملابس)
- dining-collection (DINING COLLECTION / غرف السفرة والنيش)
- sofa-collection (SOFA COLLECTION / الصالونات والركنات)
- office-furniture (OFFICE FURNITURE / الأثاث المكتبي)
- chairs (CHAIRS / الكراسي الفاخرة)
- beds-youth (BEDS & YOUTH SUITES / غرف الشباب والأسرّة)

Provide refined, accurate English and Arabic product titles, concise descriptions, and visible material notes (e.g., walnut veneer, ivory lacquer, smoked glass, bouclé upholstery). Never invent prices or Pharaonic references.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedCategorySlug: { type: Type.STRING },
            titleEn: { type: Type.STRING },
            titleAr: { type: Type.STRING },
            descriptionEn: { type: Type.STRING },
            descriptionAr: { type: Type.STRING },
            materialsEn: { type: Type.STRING },
            materialsAr: { type: Type.STRING },
            confidence: { type: Type.STRING },
          },
          required: [
            'suggestedCategorySlug',
            'titleEn',
            'titleAr',
            'descriptionEn',
            'descriptionAr',
            'materialsEn',
            'materialsAr',
            'confidence',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const matchedCat =
      CATEGORY_CATALOG.find((c) => c.slug === parsed.suggestedCategorySlug) ?? CATEGORY_CATALOG[0];

    return {
      suggestedCategorySlug: matchedCat.slug,
      suggestedCategoryNameEn: matchedCat.nameEn,
      suggestedCategoryNameAr: matchedCat.nameAr,
      titleEn: parsed.titleEn || fallback.titleEn,
      titleAr: parsed.titleAr || fallback.titleAr,
      descriptionEn: parsed.descriptionEn || fallback.descriptionEn,
      descriptionAr: parsed.descriptionAr || fallback.descriptionAr,
      materialsEn: parsed.materialsEn || fallback.materialsEn,
      materialsAr: parsed.materialsAr || fallback.materialsAr,
      confidence: parsed.confidence || 'high',
    };
  } catch (error) {
    console.error('Gemini image classification error:', error);
    return fallback;
  }
}
