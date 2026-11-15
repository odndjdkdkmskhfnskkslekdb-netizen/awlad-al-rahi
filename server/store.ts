import fs from 'fs';
import path from 'path';
import type { ActivityLogEntry, Product, ShowroomContent, ShowroomDatabase } from '../src/types/showroom.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'showroom-state.json');
const CURRENT_SEED_VERSION = 3;

function getBatchTwoProducts(now: string): Product[] {
  return [
    {
      id: 'prod-oval-inset-master',
      categoryId: 'cat-bedroom',
      titleEn: 'Oval-Inset Walnut & Ivory Master Suite',
      titleAr: 'غرفة نوم رئيسية بتطعيمات بيضاوية',
      descriptionEn: 'Complete walnut and cream master suite featuring arched mirror wardrobe doors, illuminated headboard sconces, and a dual-compartment storage bench.',
      descriptionAr: 'غرفة نوم رئيسية متكاملة بدولاب مرايا مقوسة وإضاءة جانبية دافئة وبانكيت تخزين مزدوج.',
      materialsEn: 'Warm Walnut Veneer, Cream Lacquer, Bouclé Ottoman',
      materialsAr: 'قشرة جوز طبيعي، لاكيه كريمي، تنجيد بوكليه',
      images: ['/assets/aistudio/FB_IMG_1794687758985_7cc2e618.jpg'],
      isBestSeller: true,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-fluted-pillar-master',
      categoryId: 'cat-bedroom',
      titleEn: 'Fluted Pillar & Lit Mirror Master Suite',
      titleAr: 'جناح نوم أولاد الراجحي بإضاءة معمارية',
      descriptionEn: 'Vertical walnut & ivory sliding wardrobe paired with a tall channeled headboard, backlit dressing table, and signature bench.',
      descriptionAr: 'دولاب جرار بتصميم طولي مع ظهر سرير منجد مضاء وتسريحة بمرآة ليد عريضة.',
      materialsEn: 'Book-Matched Walnut, Gloss Ivory, Smoked Display Glass',
      materialsAr: 'خشب جوز طبيعي، عاجي لامع، زجاج مدخن',
      images: ['/assets/aistudio/FB_IMG_1794687762635_a991850d.jpg'],
      isBestSeller: false,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-diagonal-walnut-suite',
      categoryId: 'cat-bedroom',
      titleEn: 'Diagonal Walnut & Illuminated Headboard Suite',
      titleAr: 'غرفة نوم جوز بخطوط مائلة مضيئة',
      descriptionEn: 'Architectural headboard with integrated diagonal LED inlay, two-tone walnut and ivory wardrobe, and matching smoked-glass nightstand.',
      descriptionAr: 'غرفة نوم بتفاصيل مائلة مضيئة في ظهر السرير ودولاب جوز وعاجي بمرآة كاملة.',
      materialsEn: 'Walnut Veneer, Matte Ivory, Warm LED Inlay',
      materialsAr: 'قشرة جوز، عاجي مطفي، إضاءة ليد مدمجة',
      images: ['/assets/aistudio/FB_IMG_1794687785312_af9f7aa9.jpg'],
      isBestSeller: false,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-molded-wall-suite',
      categoryId: 'cat-bedroom',
      titleEn: 'Molded-Wall Walnut & Oval Mirror Suite',
      titleAr: 'غرفة نوم جوز مع مرآة بيضاوية مضيئة',
      descriptionEn: 'Refined walnut wardrobe with pill-shaped ivory inlays, twin-sconce upholstered headboard, and oval halo nightstand mirror.',
      descriptionAr: 'دولاب جوز بتطعيمات عاجية انسيابية مع سرير بإضاءة جانبية وتسريحة مرآة بيضاوية.',
      materialsEn: 'Natural Walnut, Cream Upholstery, Brushed Brass Sconces',
      materialsAr: 'خشب جوز طبيعي، تنجيد كريمي، أباليك نحاسية',
      images: ['/assets/aistudio/FB_IMG_1794687752319_f97e8a76.jpg'],
      isBestSeller: false,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-chevron-marble-suite',
      categoryId: 'cat-bedroom',
      titleEn: 'Chevron Walnut & Backlit Marble Suite',
      titleAr: 'غرفة نوم شيفرون جوز وعاجي',
      descriptionEn: 'Diagonal-grain walnut and ivory four-door wardrobe paired with a chamfered vanity dresser and floating-look nightstands.',
      descriptionAr: 'غرفة نوم عصرية بدولاب ٤ أبواب بمرايا مدخنة وقشرة جوز شيفرون وتسريحة هندسية.',
      materialsEn: 'Chevron Walnut, Ivory Lacquer, Smoked Mirrors',
      materialsAr: 'قشرة جوز شيفرون، لاكيه عاجي، مرايا فاميه',
      images: ['/assets/aistudio/FB_IMG_1794687699213_018b6f9e.jpg'],
      isBestSeller: false,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-kidney-halo-vanity-set',
      categoryId: 'cat-dressing',
      titleEn: 'Organic Kidney Halo Vanity & Wardrobe Ensemble',
      titleAr: 'طقم تسريحة أورجانيك بمرآة ليد ودولاب',
      descriptionEn: 'Sculptural organic-contour LED mirror vanity with travertine-veined top, cylindrical walnut drawers, bouclé pouf, and matching standing mirror.',
      descriptionAr: 'تسريحة بتصميم أورجانيك انسيابي مع سطح رخامي وأدراج جوز دائرية وبوف بوكليه ومرآة ستاند.',
      materialsEn: 'Walnut Veneer, Marble-Vein Surface, Bouclé Fabric, Touch LED',
      materialsAr: 'قشرة جوز، سطح رخامي، قماش بوكليه، مرآة ليد',
      images: [
        '/assets/aistudio/FB_IMG_1794687710273_dd43914c.jpg',
        '/assets/aistudio/FB_IMG_1794687712614_a7e4203b.jpg',
        '/assets/aistudio/FB_IMG_1794687718996_55a6765b.jpg',
      ],
      isBestSeller: true,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-stepped-walnut-vanity',
      categoryId: 'cat-dressing',
      titleEn: 'Stepped Walnut LED Vanity & Mirror Tower',
      titleAr: 'تسريحة جوز متدرجة مع مرآة ليد طولية',
      descriptionEn: 'Multi-level walnut and matte ivory vanity console with smoked glass counters, side tray, and tall standing dressing mirror.',
      descriptionAr: 'تسريحة متعددة المستويات من الجوز والعاجي بسطح زجاجي مدخن ومرآة طولية جانبية.',
      materialsEn: 'Walnut Veneer, Smoked Glass, Matte Cream Drawers',
      materialsAr: 'قشرة جوز، زجاج فاميه، أدراج كريمي مطفي',
      images: ['/assets/aistudio/FB_IMG_1794687760860_9dcbec41.jpg'],
      isBestSeller: false,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-vitrine-tower-vanity',
      categoryId: 'cat-dressing',
      titleEn: 'Illuminated Vitrine & Walnut Dressing Console',
      titleAr: 'تسريحة جوز بفاترينة إضاءة ومرآة جانبية',
      descriptionEn: 'Spacious walnut dresser featuring backlit glass display shelves, stepped drawers, and a rotating full-length mirror.',
      descriptionAr: 'تسريحة فاخرة بوحدة عرض زجاجية مضيئة وأدراج متعددة ومرآة جانبية كاملة.',
      materialsEn: 'Espresso Walnut, Warm LED Glass Shelves, Brushed Steel Handles',
      materialsAr: 'جوز إسبريسو، أرفف زجاجية مضيئة، مقابض معدنية',
      images: [
        '/assets/aistudio/FB_IMG_1794687754435_8f471667.jpg',
        '/assets/aistudio/FB_IMG_1794687783522_64f80725.jpg',
      ],
      isBestSeller: false,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-octagon-fluted-vanity',
      categoryId: 'cat-dressing',
      titleEn: 'Octagonal Halo Fluted Walnut Vanity',
      titleAr: 'تسريحة فاخرة بمرآة ثمانية وإضاءة ليد',
      descriptionEn: 'Damietta-crafted fluted walnut dressing table on sculptural brass-tone feet with octagonal LED mirror and tall accessory mirror.',
      descriptionAr: 'تسريحة بتصميم عصري من قلب دمياط بمرآة ثمانية مضيئة وأرجل نحاسية وبوف بوكليه.',
      materialsEn: 'Fluted Walnut, Brass-Finish Pedestal Legs, Smoked Glass Top',
      materialsAr: 'جوز مضلع، أرجل لمسة نحاسية، سطح زجاجي مدخن',
      images: [
        '/assets/aistudio/FB_IMG_1794687750663_a0d0b824.jpg',
        '/assets/aistudio/FB_IMG_1794687728693_5620f00b.jpg',
      ],
      isBestSeller: false,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-teardrop-halo-dining',
      categoryId: 'cat-dining',
      titleEn: 'Teardrop Halo Dining & Vitrine Suite',
      titleAr: 'غرفة سفرة كاملة بمرآتين هالو وفاترينات مضيئة',
      descriptionEn: 'Six-seat smoked-glass dining table with sculptural wraparound bouclé chairs, dual asymmetric halo buffet mirrors, and illuminated glass vitrines.',
      descriptionAr: 'طقم سفرة ٦ كراسي بتصميم معاصر مع طاولة زجاج مدخن وبوفيه بمرآتين مضيئتين ونيش مزدوج.',
      materialsEn: 'Taupe Oak, Smoked Glass Top, Two-Tone Bouclé Upholstery',
      materialsAr: 'بلوط توب، زجاج مدخن، تنجيد بوكليه بلونين',
      images: [
        '/assets/aistudio/FB_IMG_1794687695081_2b091905.jpg',
        '/assets/aistudio/FB_IMG_1794687693059_fc680bd5.jpg',
        '/assets/aistudio/FB_IMG_1794687696844_dbe6c162.jpg',
      ],
      isBestSeller: true,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-grey-console-sectional',
      categoryId: 'cat-sofa',
      titleEn: 'Architectural Grey Sectional with Walnut Console',
      titleAr: 'ركنة مودرن رمادي بوحدة ضيافة خشب جوز',
      descriptionEn: 'Modular deep-comfort sectional sofa featuring integrated walnut cup-holder armrests, adjustable headrests, and a tailored matching ottoman.',
      descriptionAr: 'ركنة عملية فاخرة بتنجيد رمادي ومساند رأس قابلة للتعديل ووحدة ضيافة جوز مدمجة وبوف.',
      materialsEn: 'Textured Charcoal Linen, Solid Walnut Armrest Decks',
      materialsAr: 'كتان رمادي متين، أسطح خشب جوز طبيعي',
      images: ['/assets/aistudio/FB_IMG_1794687768171_72dedbe2.jpg'],
      isBestSeller: false,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-twotone-trim-sofa',
      categoryId: 'cat-sofa',
      titleEn: 'Two-Tone Ivory & Stone Wood-Trim Sofa Suite',
      titleAr: 'طقم صالون وأنتريه بتطعيمات جوز هندسية',
      descriptionEn: 'Harmonious grey and warm ivory sofa pair accented with faceted walnut arm frames, two armchairs, and an oval coffee table.',
      descriptionAr: 'طقم أنتريه يجمع بين الرمادي والعاجي مع لمسات خشب جوز على الأذرع وطاولة وسط بيضاوية.',
      materialsEn: 'Woven Stone & Ivory Fabric, Faceted Walnut Arm Inlays',
      materialsAr: 'أقمشة منسوجة فاخرة، تطعيمات خشب جوز',
      images: ['/assets/aistudio/FB_IMG_1794687766355_d48c527b.jpg'],
      isBestSeller: false,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-sculptural-strap-sofa',
      categoryId: 'cat-sofa',
      titleEn: 'Curved Bouclé Lounge Suite with Walnut Straps',
      titleAr: 'طقم صالون أتيليه منحني بأحزمة خشب جوز',
      descriptionEn: 'Organic rounded sofas and swivel barrel chairs finished with vertical solid-walnut spine straps and an integrated drinks console.',
      descriptionAr: 'طقم صالون فاخر بتفاصيل دائرية ناعمة ودعامات خشبية طولية ووحدة ضيافة مدمجة.',
      materialsEn: 'Warm Taupe & Cream Bouclé, Curved Walnut Straps',
      materialsAr: 'قماش بوكليه دافئ، دعامات جوز منحنية',
      images: [
        '/assets/aistudio/FB_IMG_1794687741421_b8e145f0.jpg',
        '/assets/aistudio/FB_IMG_1794687700522_83e95f24.jpg',
      ],
      isBestSeller: true,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-grand-vitrine-salon',
      categoryId: 'cat-sofa',
      titleEn: 'Grand Cream & Mocha Lounge Ensemble',
      titleAr: 'صالون مودرن فاخر باللون الكريمي والموكا',
      descriptionEn: 'Channeled luxury sofa ensemble paired with sculpted barrel armchairs and a dual-pedestal solid walnut coffee table.',
      descriptionAr: 'طقم صالون كبير بتنجيد مبطن متناسق مع كراسي استرخاء وطاولة وسط منحوتة من الجوز.',
      materialsEn: 'Cream & Mocha Chenille, Solid Sculpted Walnut Table',
      materialsAr: 'قماش شينيل كريمي وموكا، طاولة خشب جوز',
      images: ['/assets/aistudio/FB_IMG_1794687790760_dd118a6b.jpg'],
      isBestSeller: false,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-royal-sage-classic-salon',
      categoryId: 'cat-sofa',
      titleEn: 'Royal Sage & Champagne-Leaf Classic Salon',
      titleAr: 'صالون كلاسيك ملكي بلون سيج وتذهيب هادئ',
      descriptionEn: 'Hand-carved neoclassical sofa set upholstered in muted sage and champagne damask velvet with a marble-top center table.',
      descriptionAr: 'طقم صالون كلاسيك منحوت يدوياً بتنجيد مخمل سيج وطاولة وسط بسطح رخامي.',
      materialsEn: 'Carved Beechwood, Champagne Gold Finish, Sage Velvet, Marble',
      materialsAr: 'خشب زان منحوت، تشطيب ذهبي هادئ، قطيفة سيج، رخام',
      images: ['/assets/aistudio/FB_IMG_1794687777092_ac06cd14.jpg'],
      isBestSeller: false,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-convertible-twin-beds',
      categoryId: 'cat-beds',
      titleEn: 'Convertible Curved Twin Beds Suite',
      titleAr: 'طقم سريرين شباب منفصلين أو متصلين',
      descriptionEn: 'Two sculptural bouclé-upholstered single beds with contoured walnut headboards designed to sit side-by-side or independently.',
      descriptionAr: 'سريرين بتصميم عصري انسيابي من البوكليه والجوز يمكن استخدامهما معاً أو بشكل منفصل.',
      materialsEn: 'Natural Walnut Frame, Textured Ivory Bouclé',
      materialsAr: 'إطار خشب جوز طبيعي، تنجيد بوكليه عاجي',
      images: ['/assets/aistudio/FB_IMG_1794687717001_b34f2e68.jpg'],
      isBestSeller: false,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-marble-oval-nightstand',
      categoryId: 'cat-beds',
      titleEn: 'Oval Marble-Top Walnut Bedside Table',
      titleAr: 'كومود بيضاوي بسطح رخامي ودرج جوز',
      descriptionEn: 'Rounded walnut bedside pedestal crowned with a natural veined marble slab and brass ring pull.',
      descriptionAr: 'كومود بيضاوي أنيق من قشرة الجوز بسطح رخامي طبيعي ومقبض حلقي نحاسي.',
      materialsEn: 'Walnut Veneer, Cream Pedestal Base, Marble Top',
      materialsAr: 'قشرة جوز، قاعدة كريمي، سطح رخام طبيعي',
      images: [
        '/assets/aistudio/FB_IMG_1794687733258_2ce73763.jpg',
        '/assets/aistudio/FB_IMG_1794687714729_0b665d0c.jpg',
      ],
      isBestSeller: false,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-sculpted-sconce-nightstand',
      categoryId: 'cat-beds',
      titleEn: 'Architectural Sconce & Marble Nightstand',
      titleAr: 'كومود بتصميم معماري وإضاءة رأس السرير',
      descriptionEn: 'Geometric walnut bridge nightstand with marble surface paired with a textured cream chevron headboard and warm sconce.',
      descriptionAr: 'كومود عصري بإطار جوز هندسي وسطح رخام مع ظهر سرير منجد وأبليك إضاءة دافئة.',
      materialsEn: 'Walnut Bridge Frame, Marble Inlay, Matte Taupe Drawer',
      materialsAr: 'إطار جوز، سطح رخامي، درج توب مطفي',
      images: ['/assets/aistudio/FB_IMG_1794687756124_6bea7d7d.jpg'],
      isBestSeller: false,
      isPublished: true,
      createdAt: now,
    },
    {
      id: 'prod-kidney-glass-nightstand',
      categoryId: 'cat-beds',
      titleEn: 'Organic Smoked-Glass Dual-Drawer Nightstand',
      titleAr: 'كومود أورجانيك بسطح زجاجي مدخن',
      descriptionEn: 'Curved two-tone drawer bedside unit beneath an asymmetric smoked-glass tabletop.',
      descriptionAr: 'كومود جانبي بتصميم انسيابي ودرجين بلونين مع سطح زجاجي مدخن فاخر.',
      materialsEn: 'Brushed Taupe & Ivory Finish, Smoked Tempered Glass',
      materialsAr: 'تشطيب توب وعاجي، زجاج سيكوريت مدخن',
      images: ['/assets/aistudio/FB_IMG_1794687772835_c0b8da70.jpg'],
      isBestSeller: false,
      isPublished: true,
      createdAt: now,
    },
  ];
}

function createInitialShowroomContent(): ShowroomContent {
  const now = new Date().toISOString();

  return {
    categories: [
      {
        id: 'cat-bedroom',
        slug: 'bedroom-collection',
        nameEn: 'BEDROOM COLLECTION',
        nameAr: 'غرف النوم الرئيسية',
        descriptionEn: 'Architectural master suites crafted in warm walnut veneers, fluted ivory paneling, and integrated ambient illumination.',
        descriptionAr: 'أجنحة غرف نوم رئيسية بتصميمات معمارية فاخرة من قشرة الجوز الدافئ والخشب المضلع والإضاءة المحيطية الهادئة.',
        coverImage: '/assets/aistudio/FB_IMG_1794687979441_242eb32a.jpg',
        order: 1,
      },
      {
        id: 'cat-dressing',
        slug: 'dressing-room',
        nameEn: 'DRESSING ROOM & VANITIES',
        nameAr: 'التسريحات وغرف الملابس',
        descriptionEn: 'Sculptural vanity consoles with halo-lit mirrors, smoked glass tops, and tailored storage vitrines.',
        descriptionAr: 'تسريحات عصرية بلمسات فنية ومرايا مضيئة بتقنية الليد مع أسطح زجاجية مدخنة ووحدات عرض أنيقة.',
        coverImage: '/assets/aistudio/FB_IMG_1794687934492_3c2e7eb6.jpg',
        order: 2,
      },
      {
        id: 'cat-dining',
        slug: 'dining-collection',
        nameEn: 'DINING COLLECTION',
        nameAr: 'غرف السفرة والنيش',
        descriptionEn: 'Refined dining ensembles uniting smoked-glass tabletops, tailored upholstered seating, and illuminated crystal vitrines.',
        descriptionAr: 'مجموعات سفرة فاخرة تجمع بين الطاولات ذات الزجاج المدخن والكراسي المنجدة والنيش المضيء.',
        coverImage: '/assets/aistudio/FB_IMG_1794687794741_4817b8cf.jpg',
        order: 3,
      },
      {
        id: 'cat-sofa',
        slug: 'sofa-collection',
        nameEn: 'SOFA COLLECTION',
        nameAr: 'الصالونات والركنات',
        descriptionEn: 'Organic curved silhouettes, deep bouclé upholstery, and sculptural espresso wood bases designed for distinguished hospitality.',
        descriptionAr: 'تصميمات صالونات وركنات منحنية فاخرة بأقمشة ناعمة وقواعد خشبية بلون الإسبريسو تمنح رحابة وأناقة استثنائية.',
        coverImage: '/assets/aistudio/FB_IMG_1794687953960_6ea0d05d.jpg',
        order: 4,
      },
      {
        id: 'cat-beds',
        slug: 'beds-youth',
        nameEn: 'BEDS & YOUTH SUITES',
        nameAr: 'غرف الشباب والأسرّة',
        descriptionEn: 'Thoughtfully proportioned twin suites, upholstered beds, and smart bedside tables balancing comfort and contemporary warmth.',
        descriptionAr: 'غرف شباب وأسرّة منجدة وكومودات عصرية بتفاصيل هندسية متقنة تجمع بين الراحة العالية والذوق الرفيع.',
        coverImage: '/assets/aistudio/FB_IMG_1794687903018_e56014dd.jpg',
        order: 5,
      },
    ],
    products: [
      {
        id: 'prod-master-verona',
        categoryId: 'cat-bedroom',
        titleEn: 'Al Rajhi Signature Master Suite',
        titleAr: 'جناح نوم أولاد الراجحي الرئيسي',
        descriptionEn: 'Complete architectural bedroom featuring a wide cushioned headboard, dual-tone sliding wardrobe, curved dressing console, and matching nightstands.',
        descriptionAr: 'غرفة نوم رئيسية متكاملة بسرير منجد عريض ودولاب جرار بتطعيمات راقية وتسريحة دائرية بمرآة مضيئة وكومود متناسق.',
        materialsEn: 'Warm Walnut Veneer, Ivory Lacquer, Brushed Champagne Trim',
        materialsAr: 'قشرة جوز طبيعي، لاكيه عاجي مطفي، إكسسوارات شامبين جولد',
        images: ['/assets/aistudio/FB_IMG_1794687979441_242eb32a.jpg'],
        isBestSeller: true,
        isPublished: true,
        createdAt: now,
      },
      ...getBatchTwoProducts(now),
      {
        id: 'prod-walnut-fluted-suite',
        categoryId: 'cat-bedroom',
        titleEn: 'Fluted Walnut & Ivory Bedroom Suite',
        titleAr: 'غرفة نوم جوز وعاجي بإضاءة مخفية',
        descriptionEn: 'Diagonal book-matched walnut wardrobe with integrated LED mirror door paired with a backlit upholstered headboard and glass-top nightstand.',
        descriptionAr: 'دولاب جرار بقشرة جوز مائلة ومرآة ليد طولية مع ظهر سرير منجد مضاء وكومود بسطح زجاجي أسود.',
        materialsEn: 'Natural Walnut, Soft Taupe Upholstery, Smoked Glass',
        materialsAr: 'خشب جوز طبيعي، تنجيد توب فاخر، زجاج فاميه',
        images: ['/assets/aistudio/FB_IMG_1794687887549_753739d1.jpg'],
        isBestSeller: false,
        isPublished: true,
        createdAt: now,
      },
      {
        id: 'prod-ivory-ribbed-suite',
        categoryId: 'cat-bedroom',
        titleEn: 'Ivory Ribbed & Gold Trim Suite',
        titleAr: 'غرفة نوم عاجي مضلع بتطعيم ذهبي',
        descriptionEn: 'Vertical ribbed ivory fronts contrasted with warm walnut framing, subtle champagne accents, and smoked-mirror wardrobe panels.',
        descriptionAr: 'تصميم عصري يجمع بين الخشب المضلع باللون العاجي وقشرة الجوز مع شرائح شامبين ذهبية وزجاج عاكس.',
        materialsEn: 'Ribbed Matte Ivory, Walnut Veneer, Champagne Metal Accents',
        materialsAr: 'عاجي مضلع مطفي، قشرة جوز، تطعيمات معدنية ذهبية',
        images: ['/assets/aistudio/FB_IMG_1794687924692_34dce688.jpg'],
        isBestSeller: false,
        isPublished: true,
        createdAt: now,
      },
      {
        id: 'prod-oval-halo-vanity',
        categoryId: 'cat-dressing',
        titleEn: 'Sculptural Oval Halo Vanity',
        titleAr: 'تسريحة أوفال دائرية بإضاءة هالو',
        descriptionEn: 'Organic rounded twin-pedestal vanity crafted in brushed taupe wood with dual curved drawers, smoked glass top, and touch-LED mirror.',
        descriptionAr: 'تسريحة بتصميم انسيابي مزدوج الأدراج من الخشب التوب الفاخر مع سطح زجاجي ومرآة ليد تعمل باللمس وبوف متناسق.',
        materialsEn: 'Brushed Taupe Wood, Smoked Glass, Touch-Dimming LED Mirror',
        materialsAr: 'خشب توب مصقول، زجاج مدخن، مرآة ليد باللمس',
        images: ['/assets/aistudio/FB_IMG_1794687934492_3c2e7eb6.jpg'],
        isBestSeller: true,
        isPublished: true,
        createdAt: now,
      },
      {
        id: 'prod-asymmetric-vanity',
        categoryId: 'cat-dressing',
        titleEn: 'Asymmetric Architectural Vanity',
        titleAr: 'تسريحة معمارية غير متماثلة',
        descriptionEn: 'Contemporary ivory and warm taupe dressing table featuring an arched backlit mirror, floating pedestal drawers, and integrated side tray.',
        descriptionAr: 'تسريحة حديثة باللون العاجي والتوب مع مرآة مقوسة بإضاءة خلفية وأدراج عائمة وطاولة جانبية مدمجة.',
        materialsEn: 'Cream Beige Lacquer, Taupe Grain Frame, Warm LED Strip',
        materialsAr: 'لاكيه بيج كريمي، إطار خشب توب، إضاءة ليد دافئة',
        images: ['/assets/aistudio/FB_IMG_1794687946546_30e224f0.jpg'],
        isBestSeller: false,
        isPublished: true,
        createdAt: now,
      },
      {
        id: 'prod-vitrine-vanity',
        categoryId: 'cat-dressing',
        titleEn: 'Walnut Vitrine Dressing Console',
        titleAr: 'تسريحة جوز بوحدة عرض زجاجية',
        descriptionEn: 'Signature Al Rajhi vanity pairing stepped cream-and-walnut drawers with a full-height illuminated glass display vitrine and LED mirror.',
        descriptionAr: 'تسريحة فاخرة من أولاد الراجحي تجمع بين الأدراج المتدرجة والزجاج المضيء لعرض المقتنيات مع مرآة ليد كاملة.',
        materialsEn: 'Espresso Walnut, Cream Fronts, Illuminated Glass Vitrine',
        materialsAr: 'جوز إسبريسو، واجهات كريمي، فاترينة زجاجية مضيئة',
        images: [
          '/assets/aistudio/FB_IMG_1794687893251_15f789ac.jpg',
          '/assets/aistudio/FB_IMG_1794687838372_c3c7856f.jpg',
        ],
        isBestSeller: false,
        isPublished: true,
        createdAt: now,
      },
      {
        id: 'prod-twin-circle-vanity',
        categoryId: 'cat-dressing',
        titleEn: 'Twin-Circle Marble & Walnut Vanity',
        titleAr: 'تسريحة دوائر مزدوجة بسطح رخامي',
        descriptionEn: 'Dual overlapping halo mirrors above a curved walnut console inlaid with travertine-look surfaces and ambient under-counter lighting.',
        descriptionAr: 'تسريحة مميزة بمرآتين دائريتين متداخلتين وسطح رخامي أنيق وإضاءة سفلية مع بوف بوكليه مريح.',
        materialsEn: 'Natural Walnut, Marble-Vein Surface, Bouclé Ottoman',
        materialsAr: 'خشب جوز طبيعي، سطح بلمسة الرخام، بوف قماش بوكليه',
        images: ['/assets/aistudio/FB_IMG_1794687883162_d21f239d.jpg'],
        isBestSeller: false,
        isPublished: true,
        createdAt: now,
      },
      {
        id: 'prod-ribbed-round-vanity',
        categoryId: 'cat-dressing',
        titleEn: 'Fluted Ivory Round-Mirror Vanity',
        titleAr: 'تسريحة عاجي مضلع بمرآة دائرية',
        descriptionEn: 'Refined asymmetrical fluted ivory and walnut dressing unit crowned with a halo-lit circular mirror and tapered ivory legs.',
        descriptionAr: 'تسريحة تجمع بين التضليع العاجي والجوز الدافئ مع مرآة دائرية مضيئة وأرجل مخروطية أنيقة.',
        materialsEn: 'Fluted Ivory, Walnut Veneer, Dark Tinted Glass',
        materialsAr: 'واجهات عاجية مضلعة، قشرة جوز، زجاج فاميه',
        images: ['/assets/aistudio/FB_IMG_1794687849827_352afaae.jpg'],
        isBestSeller: false,
        isPublished: true,
        createdAt: now,
      },
      {
        id: 'prod-imperial-dining',
        categoryId: 'cat-dining',
        titleEn: 'Imperial Smoked-Glass Dining Ensemble',
        titleAr: 'طقم سفرة فاخر بزجاج مدخن ونيش مزدوج',
        descriptionEn: 'Six-seat luxury dining suite featuring a chamfered smoked-glass table, tailored taupe upholstered chairs, triple-mirror buffet, and dual illuminated vitrines.',
        descriptionAr: 'سفرة فاخرة ٦ كراسي منجدة بتفاصيل راقية مع طاولة زجاج مدخن وبوفيه بثلاث مرايا بيضاوية و٢ نيش زجاجي مضيء.',
        materialsEn: 'Taupe Oak Veneer, Smoked Tempered Glass, Linen-Weave Upholstery',
        materialsAr: 'قشرة بلوط توب، زجاج مدخن سيكوريت، تنجيد كتان فاخر',
        images: ['/assets/aistudio/FB_IMG_1794687794741_4817b8cf.jpg'],
        isBestSeller: true,
        isPublished: true,
        createdAt: now,
      },
      {
        id: 'prod-oval-mirror-dining',
        categoryId: 'cat-dining',
        titleEn: 'Oval-Halo Walnut Dining Suite',
        titleAr: 'سفرة جوز فاخرة ببوفيه مرآة مضيئة',
        descriptionEn: 'Warm espresso walnut dining table paired with two-tone wraparound chairs, backlit oval sideboard mirror, and twin glass display cabinets.',
        descriptionAr: 'طقم سفرة متكامل من الجوز الدافئ مع ٦ كراسي مريحة بلونين وبوفيه بمرآة بيضاوية مضيئة ووحدتي عرض زجاجيتين.',
        materialsEn: 'Espresso Walnut, Two-Tone Upholstered Seating, Warm LED Glass Cabinets',
        materialsAr: 'خشب جوز إسبريسو، كراسي منجدة بلونين، فاترينات بإضاءة دافئة',
        images: ['/assets/aistudio/FB_IMG_1794687807830_17b502f4.jpg'],
        isBestSeller: false,
        isPublished: true,
        createdAt: now,
      },
      {
        id: 'prod-curved-atelier-sofa',
        categoryId: 'cat-sofa',
        titleEn: 'Curved Atelier Lounge Sofa Set',
        titleAr: 'طقم صالون أتيليه منحني فاخر',
        descriptionEn: 'Sculptural channel-tufted curved sofas and barrel armchairs resting on carved espresso timber cradles, complete with tiered walnut coffee tables.',
        descriptionAr: 'طقم صالون وركنة بتصميم منحني مبطن بخطوط أنيقة وقواعد خشب إسبريسو مع طاولة وسط ثلاثية القطع.',
        materialsEn: 'Warm Ivory & Charcoal Textured Fabric, Solid Walnut Base Trim',
        materialsAr: 'قماش فاخر باللون العاجي والرمادي، قواعد خشب جوز طبيعي',
        images: ['/assets/aistudio/FB_IMG_1794687953960_6ea0d05d.jpg'],
        isBestSeller: true,
        isPublished: true,
        createdAt: now,
      },
      {
        id: 'prod-ivory-espresso-sofa',
        categoryId: 'cat-sofa',
        titleEn: 'Ivory & Espresso Signature Sofa Suite',
        titleAr: 'صالون عاجي بقاعدة خشب إسبريسو',
        descriptionEn: 'Dual three-seater cream sofas with architectural espresso wood wraparound bases, two swivel lounge chairs, and a sculptural two-tier table.',
        descriptionAr: 'طقم صالون متكامل من كنبتين بلون عاجي دافئ وكرسيين دوارين بقاعدة إسبريسو وطاولة وسط عصرية.',
        materialsEn: 'Cream Chenille Upholstery, Espresso Timber Cradle, Geometric Cushions',
        materialsAr: 'قماش شينيل عاجي، قاعدة خشب إسبريسو، خداديات هندسية',
        images: ['/assets/aistudio/FB_IMG_1794687917096_94110550.jpg'],
        isBestSeller: false,
        isPublished: true,
        createdAt: now,
      },
      {
        id: 'prod-sectional-console-sofa',
        categoryId: 'cat-sofa',
        titleEn: 'Architectural Sectional & Console Ensemble',
        titleAr: 'أنتريه وركنة عصرية بوحدة ضيافة خشبية',
        descriptionEn: 'Grand living ensemble combining a curved sectional with integrated walnut cup-holder console, full-length taupe sofa, and sculptural armchairs.',
        descriptionAr: 'طقم ركنة وأنتريه واسع بلمسات خشبية متصلة ووحدة ضيافة مدمجة للراحة الفائقة في المساحات الراقية.',
        materialsEn: 'Soft Taupe & Cream Woven Textile, Curved Walnut Spine, Smoked Glass Table',
        materialsAr: 'نسيج فاخر بتدرجات التوب والعاجي، دعامات خشبية منحنية، طاولة زجاجية',
        images: ['/assets/aistudio/FB_IMG_1794687798462_825d5212.jpg'],
        isBestSeller: false,
        isPublished: true,
        createdAt: now,
      },
      {
        id: 'prod-geometric-twin-suite',
        categoryId: 'cat-beds',
        titleEn: 'Geometric Twin Youth Bedroom Suite',
        titleAr: 'غرفة شباب بسريرين وتصميم هندسي',
        descriptionEn: 'Balanced twin-bed suite with soft sage-and-taupe upholstered headboards, architectural sliding wardrobe, nightstand, and framed dresser.',
        descriptionAr: 'غرفة شباب متكاملة بسريرين منجدين ودولاب جرار بتصميم هندسي مبتكر وكومود وتسريحة متناسقة.',
        materialsEn: 'Walnut & Cream Veneer, Velvet Headboards, Soft-Close Hardware',
        materialsAr: 'قشرة جوز وكريمي، تنجيد قطيفة ناعم، مفصلات سوفت كلوز',
        images: ['/assets/aistudio/FB_IMG_1794687903018_e56014dd.jpg'],
        isBestSeller: false,
        isPublished: true,
        createdAt: now,
      },
      {
        id: 'prod-circle-motif-suite',
        categoryId: 'cat-beds',
        titleEn: 'Circle-Motif Contemporary Youth Suite',
        titleAr: 'غرفة شباب عصرية بتصميم دوائر متداخلة',
        descriptionEn: 'Playful yet refined youth suite featuring layered circular upholstered accents, arched-mirror sliding wardrobe, and glass-top nightstand.',
        descriptionAr: 'غرفة أطفال وشباب أنيقة بتصميم دوائر متداخلة بألوان هادئة مع دولاب بمرآة مقوسة وكومود بسطح زجاجي.',
        materialsEn: 'Ash Grey Wood Grain, Bouclé & Velvet Medallions, Cream Lacquer',
        materialsAr: 'خشب رمادي دافئ، تطعيمات دوائر بوكليه وقطيفة، لاكيه عاجي',
        images: ['/assets/aistudio/FB_IMG_1794687805398_f751ba2a.jpg'],
        isBestSeller: false,
        isPublished: true,
        createdAt: now,
      },
      {
        id: 'prod-horizon-kids-suite',
        categoryId: 'cat-beds',
        titleEn: 'Horizon Kids & Junior Bedroom Suite',
        titleAr: 'غرفة أطفال وشباب جوز وعاجي',
        descriptionEn: 'Tailored junior suite uniting a curved walnut-and-ivory wardrobe, padded geometric headboard, and full-height standing mirror vanity.',
        descriptionAr: 'غرفة أطفال بتفاصيل عصرية تجمع بين الجوز والعاجي مع سرير مبطن وتسريحة بمرآة طولية.',
        materialsEn: 'Walnut Veneer, Gloss Ivory Trim, Grey Woven Headboard',
        materialsAr: 'قشرة جوز، تطعيمات عاجية، ظهر سرير منجد باللون الرمادي',
        images: ['/assets/aistudio/FB_IMG_1794687809542_c45ba550.jpg'],
        isBestSeller: false,
        isPublished: true,
        createdAt: now,
      },
      {
        id: 'prod-angled-walnut-twin',
        categoryId: 'cat-beds',
        titleEn: 'Angled Walnut Twin Bedroom Suite',
        titleAr: 'غرفة شباب سريرين جوز بظهر مائل',
        descriptionEn: 'Architectural twin beds with backlit angled walnut headboards, illuminated mirror-door sliding wardrobe, and floating-style vanity nightstand.',
        descriptionAr: 'غرفة شبابية بسريرين بظهر خشبي مائل وإضاءة مخفية مع دولاب جرار بمرآة مضيئة وكومود تسريحة.',
        materialsEn: 'Rich Walnut, Bouclé Ivory Cushions, Integrated Warm LED',
        materialsAr: 'خشب جوز غني، تنجيد بوكليه عاجي، إضاءة ليد دافئة',
        images: ['/assets/aistudio/FB_IMG_1794687800963_1daddb90.jpg'],
        isBestSeller: false,
        isPublished: true,
        createdAt: now,
      },
    ],
    banners: [
      {
        id: 'banner-1',
        titleEn: 'THE ART OF LUXURY LIVING',
        titleAr: 'فن المعيشة الفاخرة',
        subtitleEn: 'Curated European-inspired suites crafted for timeless distinction.',
        subtitleAr: 'مجموعات أثاث منتقاة بعناية تجمع بين الفخامة العالمية وجودة التنفيذ الاستثنائية.',
        imageUrl: '/assets/aistudio/FB_IMG_1794687953960_6ea0d05d.jpg',
        isActive: true,
        order: 1,
      },
      {
        id: 'banner-2',
        titleEn: 'EXCEPTIONAL CRAFTSMANSHIP',
        titleAr: 'حرفية استثنائية في كل تفصيلة',
        subtitleEn: 'Refined dining and living collections tailored for modern palaces and villas.',
        subtitleAr: 'غرف سفرة ومعيشة بتشطيبات فائقة الدقة وأخشاب طبيعية مختارة.',
        imageUrl: '/assets/aistudio/FB_IMG_1794687794741_4817b8cf.jpg',
        isActive: true,
        order: 2,
      },
      {
        id: 'banner-3',
        titleEn: 'DESIGNED FOR DISTINCTION',
        titleAr: 'مصممة للتميز والذوق الرفيع',
        subtitleEn: 'Master bedrooms and bespoke dressing consoles with architectural illumination.',
        subtitleAr: 'غرف نوم رئيسية وتسريحات عصرية بإضاءة معمارية دافئة.',
        imageUrl: '/assets/aistudio/FB_IMG_1794687979441_242eb32a.jpg',
        isActive: true,
        order: 3,
      },
      {
        id: 'banner-4',
        titleEn: 'COMING SOON · NEW BEDROOM COLLECTION',
        titleAr: 'قريباً · غرفة نوم جديدة بتصميم مختلف',
        subtitleEn: 'Reserve a private showroom preview with Awlad Al Rajhi.',
        subtitleAr: 'احجز معاينة خاصة لأحدث تصميمات غرف النوم من أولاد الراجحي.',
        imageUrl: '/assets/aistudio/FB_IMG_1794687731343_ec89d312.jpg',
        isActive: true,
        order: 4,
      },
    ],
    offers: [],
    reviews: [
      {
        id: 'rev-1',
        commentAr: 'تمام عشان انتوا ناس ثقة في التعامل والحاجة بتاعتكم عالية جدا وأصلية.',
        screenshotUrl: '/assets/aistudio/FB_IMG_1794687879292_8baba293.jpg',
        showStars: true,
        rating: 5,
        isActive: true,
        order: 1,
      },
      {
        id: 'rev-2',
        commentAr: 'وانا استريحت معاكم في التعامل بجد والله.',
        screenshotUrl: '/assets/aistudio/FB_IMG_1794687879292_8baba293.jpg',
        showStars: true,
        rating: 5,
        isActive: true,
        order: 2,
      },
      {
        id: 'rev-3',
        commentAr: 'ايوه استلمت الحاجة تحفة تسلم ايدك.',
        showStars: true,
        rating: 5,
        isActive: true,
        order: 3,
      },
      {
        id: 'rev-4',
        commentAr: 'تمام ربنا يبارك يارب.',
        showStars: false,
        rating: 5,
        isActive: true,
        order: 4,
      },
      {
        id: 'rev-5',
        commentAr: 'الله يباركلك.',
        screenshotUrl: '/assets/aistudio/FB_IMG_1794687748505_440ee3df.jpg',
        showStars: false,
        rating: 5,
        isActive: true,
        order: 5,
      },
      {
        id: 'rev-6',
        commentAr: 'بكره هنتفق معاك على الأوضة التانية بس مواصفات تانية عشان الأوضة صغيرة شوية.',
        screenshotUrl: '/assets/aistudio/FB_IMG_1794687748505_440ee3df.jpg',
        showStars: true,
        rating: 5,
        isActive: true,
        order: 6,
      },
      {
        id: 'rev-7',
        commentAr: 'الله يباركلك بجد.',
        screenshotUrl: '/assets/aistudio/FB_IMG_1794687748505_440ee3df.jpg',
        showStars: false,
        rating: 5,
        isActive: true,
        order: 7,
      },
    ],
    deliveredPhotos: [
      {
        id: 'deliv-1',
        imageUrl: '/assets/aistudio/FB_IMG_1794687854448_e0c4818e.jpg',
        captionEn: 'Delivered Smart Walnut Bedside Unit (Awaiting Owner Approval)',
        captionAr: 'كومود ذكي بإضاءة ليد تم تسليمه للعميل (بانتظار موافقة المالك للنشر)',
        approved: false,
        createdAt: now,
      },
      {
        id: 'deliv-2',
        imageUrl: '/assets/aistudio/FB_IMG_1794687974775_5e79b87a.jpg',
        captionEn: 'Delivered Upholstered Headboard & Smart Nightstand (Awaiting Owner Approval)',
        captionAr: 'سرير منجد وكومود مضيء تم تسليمه للعميل (بانتظار موافقة المالك للنشر)',
        approved: false,
        createdAt: now,
      },
      {
        id: 'deliv-3',
        imageUrl: '/assets/aistudio/FB_IMG_1794687764583_8d19f7a0.jpg',
        captionEn: 'Delivered Channeled Headboard & Smoked-Glass Nightstand (Awaiting Owner Approval)',
        captionAr: 'سرير منجد بإضاءة وكومود زجاج مدخن تم تسليمه للعميل (بانتظار موافقة المالك للنشر)',
        approved: false,
        createdAt: now,
      },
    ],
    videos: [],
    settings: {
      brandNameEn: 'AWLAD AL RAJHI',
      brandNameAr: 'أولاد الراجحي',
      slogan: 'WHERE ELEGANCE MEETS EXCELLENCE',
      phone: '01275979910',
      whatsappUrl: 'https://wa.me/201275979910',
      facebookUrl: '',
      instagramUrl: '',
      showroomAddressEn: '',
      showroomAddressAr: '',
      googleMapsUrl: '',
      googleMapsEmbedUrl: '',
      latitude: '',
      longitude: '',
      reviewDisplayMode: 'cards',
      whatsappScreenshots: [
        '/assets/aistudio/FB_IMG_1794687879292_8baba293.jpg',
        '/assets/aistudio/FB_IMG_1794687748505_440ee3df.jpg',
      ],
    },
    recentUpdates: [],
    updatedAt: now,
  };
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function migrateSeedV2(db: ShowroomDatabase): ShowroomDatabase {
  if ((db.seedVersion ?? 1) >= CURRENT_SEED_VERSION) {
    return db;
  }

  const now = new Date().toISOString();
  const batchTwo = getBatchTwoProducts(now);
  const secondScreenshot = '/assets/aistudio/FB_IMG_1794687748505_440ee3df.jpg';

  const applyToContent = (content: ShowroomContent) => {
    const existingIds = new Set(content.products.map((p) => p.id));
    for (const prod of batchTwo) {
      if (!existingIds.has(prod.id)) {
        content.products.push(prod);
      }
    }

    if (!content.banners.some((b) => b.id === 'banner-4')) {
      content.banners.push({
        id: 'banner-4',
        titleEn: 'COMING SOON · NEW BEDROOM COLLECTION',
        titleAr: 'قريباً · غرفة نوم جديدة بتصميم مختلف',
        subtitleEn: 'Reserve a private showroom preview with Awlad Al Rajhi.',
        subtitleAr: 'احجز معاينة خاصة لأحدث تصميمات غرف النوم من أولاد الراجحي.',
        imageUrl: '/assets/aistudio/FB_IMG_1794687731343_ec89d312.jpg',
        isActive: true,
        order: content.banners.length + 1,
      });
    }

    if (!content.settings.whatsappScreenshots.includes(secondScreenshot)) {
      content.settings.whatsappScreenshots.push(secondScreenshot);
    }

    content.reviews = content.reviews.map((r) =>
      ['rev-5', 'rev-6', 'rev-7'].includes(r.id) && !r.screenshotUrl
        ? { ...r, screenshotUrl: secondScreenshot }
        : r
    );

    if (!content.deliveredPhotos.some((d) => d.id === 'deliv-3')) {
      content.deliveredPhotos.push({
        id: 'deliv-3',
        imageUrl: '/assets/aistudio/FB_IMG_1794687764583_8d19f7a0.jpg',
        captionEn: 'Delivered Channeled Headboard & Smoked-Glass Nightstand (Awaiting Owner Approval)',
        captionAr: 'سرير منجد بإضاءة وكومود زجاج مدخن تم تسليمه للعميل (بانتظار موافقة المالك للنشر)',
        approved: false,
        createdAt: now,
      });
    }
  };

  applyToContent(db.draft);
  applyToContent(db.published);
  db.seedVersion = 2;
  saveDatabase(db);
  return db;
}

function migrateSeedV3(db: ShowroomDatabase): ShowroomDatabase {
  const afterV2 = migrateSeedV2(db);
  if ((afterV2.seedVersion ?? 2) >= CURRENT_SEED_VERSION) {
    return afterV2;
  }

  const upgradeContent = (content: ShowroomContent) => {
    content.products = content.products.map((p, idx) => ({
      ...p,
      isFeatured: p.isFeatured ?? p.isBestSeller,
      availability: p.availability || 'in-stock',
      displayOrder: p.displayOrder ?? idx + 1,
    }));
    content.reviews = content.reviews.map((r) => ({
      ...r,
      status: r.status || (r.isActive ? 'approved' : 'pending'),
      customerName: r.customerName || '',
    }));
    content.settings = {
      ...content.settings,
      instagramUrl: content.settings.instagramUrl || '',
    };
    content.recentUpdates = content.recentUpdates || [];
  };

  upgradeContent(afterV2.draft);
  upgradeContent(afterV2.published);
  afterV2.seedVersion = CURRENT_SEED_VERSION;
  saveDatabase(afterV2);
  return afterV2;
}

export function recordActivity(
  db: ShowroomDatabase,
  actor: string,
  actionEn: string,
  actionAr: string
): void {
  const entry: ActivityLogEntry = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actor,
    actionEn,
    actionAr,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...(db.draft.recentUpdates || [])].slice(0, 25);
  db.draft.recentUpdates = next;
  db.published.recentUpdates = next;
}

export function loadDatabase(): ShowroomDatabase {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialShowroomContent();
    const db: ShowroomDatabase = {
      draft: JSON.parse(JSON.stringify(initial)),
      published: JSON.parse(JSON.stringify(initial)),
      hasUnpublishedChanges: false,
      seedVersion: CURRENT_SEED_VERSION,
    };
    saveDatabase(db);
    return migrateSeedV3(db);
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as ShowroomDatabase;
    return migrateSeedV3(parsed);
  } catch (err) {
    console.error('Failed to read showroom database, reinitializing:', err);
    const initial = createInitialShowroomContent();
    const db: ShowroomDatabase = {
      draft: JSON.parse(JSON.stringify(initial)),
      published: JSON.parse(JSON.stringify(initial)),
      hasUnpublishedChanges: false,
      seedVersion: CURRENT_SEED_VERSION,
    };
    saveDatabase(db);
    return migrateSeedV3(db);
  }
}

export function saveDatabase(db: ShowroomDatabase): void {
  ensureDataDir();
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}
