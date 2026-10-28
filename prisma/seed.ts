/**
 * IMPS seed.
 *
 * Creates the role/permission model and the first platform owner from
 * environment variables. Demo listings, demo staff accounts, demo leads and
 * demo editorial content are only created when SEED_DEMO_DATA=true and are
 * flagged `isSample`, so a production database can start clean.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ALL_PERMISSIONS, PERMISSION_META, ROLE_META, ROLE_PERMISSIONS, type RoleKey } from "../src/lib/rbac";
import { propertySlug, referenceFor } from "../src/lib/slug";

const prisma = new PrismaClient();

const DEMO = process.env.SEED_DEMO_DATA !== "false";
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "owner@imps.ma";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe!2026";
const STAFF_PASSWORD = "DemoStaff!2026";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000);

async function reset() {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.staffTask.deleteMany();
  await prisma.viewingAppointment.deleteMany();
  await prisma.leadNote.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.savedProperty.deleteMany();
  await prisma.savedSearch.deleteMany();
  await prisma.emailToken.deleteMany();
  await prisma.publicationReview.deleteMany();
  await prisma.propertyVerification.deleteMany();
  await prisma.propertyStatusHistory.deleteMany();
  await prisma.propertyMedia.deleteMany();
  await prisma.propertyOffer.deleteMany();
  await prisma.propertyAmenity.deleteMany();
  await prisma.property.deleteMany();
  await prisma.ownerContact.deleteMany();
  await prisma.leadContactAttempt.deleteMany();
  await prisma.propertyLead.deleteMany();
  await prisma.developmentUnit.deleteMany();
  await prisma.development.deleteMany();
  await prisma.article.deleteMany();
  await prisma.articleCategory.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.propertyCategory.deleteMany();
  await prisma.neighborhood.deleteMany();
  await prisma.city.deleteMany();
  await prisma.siteSetting.deleteMany();
  await prisma.session.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
}

async function seedAccessControl() {
  for (const key of ALL_PERMISSIONS) {
    const meta = PERMISSION_META[key];
    await prisma.permission.create({ data: { key, label: meta.label, group: meta.group } });
  }

  const roles: Record<string, string> = {};
  for (const [key, meta] of Object.entries(ROLE_META)) {
    const role = await prisma.role.create({
      data: {
        key,
        nameFr: meta.nameFr,
        nameAr: meta.nameAr,
        description: meta.description,
      },
    });
    roles[key] = role.id;
    const permissions = await prisma.permission.findMany({
      where: { key: { in: ROLE_PERMISSIONS[key as RoleKey] } },
      select: { id: true },
    });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
    });
  }

  const ownerHash = await bcrypt.hash(OWNER_PASSWORD, 11);
  const owner = await prisma.profile.create({
    data: {
      email: OWNER_EMAIL.toLowerCase(),
      fullName: "Elb Develop",
      passwordHash: ownerHash,
      isStaff: true,
      isActive: true,
      emailVerifiedAt: new Date(),
      roleId: roles.owner,
      locale: "fr",
    },
  });

  const staff: { email: string; fullName: string; role: RoleKey }[] = DEMO
    ? [
        { email: "manager@imps.ma", fullName: "Salma Bennani", role: "manager" },
        { email: "collector@imps.ma", fullName: "Yassine El Amrani", role: "collector" },
        { email: "reviewer@imps.ma", fullName: "Nadia Chraibi", role: "reviewer" },
        { email: "crm@imps.ma", fullName: "Omar Tazi", role: "crm" },
        { email: "editor@imps.ma", fullName: "Leila Fassi", role: "editor" },
        { email: "analyst@imps.ma", fullName: "Karim Idrissi", role: "analyst" },
      ]
    : [];

  const staffPasswordHash = await bcrypt.hash(STAFF_PASSWORD, 11);
  const profiles: Record<string, string> = { owner: owner.id };
  for (const person of staff) {
    const created = await prisma.profile.create({
      data: {
        email: person.email,
        fullName: person.fullName,
        passwordHash: staffPasswordHash,
        isStaff: true,
        isActive: true,
        emailVerifiedAt: new Date(),
        roleId: roles[person.role],
        locale: "fr",
      },
    });
    profiles[person.role] = created.id;
  }
  return { roles, profiles, ownerId: owner.id };
}

const CITY_IMAGES: Record<string, string> = {
  casablanca: "apartment-anfa-1.jpg",
  rabat: "office-1.jpg",
  marrakech: "marrakech-city-1.jpg",
  tanger: "villa-pool-1.jpg",
  agadir: "villa-exterior-1.jpg",
  fes: "riad-courtyard-1.jpg",
};

const CITIES = [
  {
    slug: "casablanca",
    nameFr: "Casablanca",
    nameAr: "الدار البيضاء",
    region: "Casablanca-Settat",
    lat: 33.5731,
    lng: -7.5898,
    descriptionFr:
      "Capitale économique du Maroc, Casablanca combine quartiers d'affaires, résidences en bord de mer et patrimoine Art déco.",
    descriptionAr:
      "العاصمة الاقتصادية للمغرب، تجمع الدار البيضاء بين أحياء الأعمال والمجمّعات الساحلية والتراث العمراني.",
    neighborhoods: [
      ["anfa", "Anfa", "أنفا"],
      ["gauthier", "Gauthier", "غوتييه"],
      ["maarif", "Maârif", "المعاريف"],
      ["ain-diab", "Aïn Diab", "عين الذياب"],
      ["californie", "Californie", "كاليفورنيا"],
      ["ain-sebaa", "Aïn Sebaâ", "عين السبع"],
    ],
  },
  {
    slug: "rabat",
    nameFr: "Rabat",
    nameAr: "الرباط",
    region: "Rabat-Salé-Kénitra",
    lat: 34.0209,
    lng: -6.8416,
    descriptionFr:
      "Capitale administrative, Rabat offre des quartiers résidentiels calmes, des ambassades et une corniche rénovée.",
    descriptionAr: "العاصمة الإدارية، تتميز الرباط بأحياء سكنية هادئة وسفارات وكورنيش مجدد.",
    neighborhoods: [
      ["hay-riad", "Hay Riad", "حي الرياض"],
      ["agdal", "Agdal", "أكدال"],
      ["souissi", "Souissi", "السويسي"],
    ],
  },
  {
    slug: "marrakech",
    nameFr: "Marrakech",
    nameAr: "مراكش",
    region: "Marrakech-Safi",
    lat: 31.6295,
    lng: -7.9811,
    descriptionFr:
      "Ville patrimoniale et destination touristique majeure, Marrakech mêle médina, riads et résidences contemporaines.",
    descriptionAr: "مدينة تراثية ووجهة سياحية كبرى، تجمع مراكش بين المدينة العتيقة والرياضات والإقامات الحديثة.",
    neighborhoods: [
      ["medina", "Médina", "المدينة"],
      ["gueliz", "Guéliz", "كليز"],
      ["hivernage", "Hivernage", "هيفرناج"],
      ["palmeraie", "Palmeraie", "النخيل"],
    ],
  },
  {
    slug: "tanger",
    nameFr: "Tanger",
    nameAr: "طنجة",
    region: "Tanger-Tétouan-Al Hoceïma",
    lat: 35.7595,
    lng: -5.834,
    descriptionFr:
      "Porte de l'Afrique et pôle logistique en croissance, Tanger attire investisseurs et résidents en bord de mer.",
    descriptionAr: "بوابة إفريقيا وقطب لوجستي في نمو، تجذب طنجة المستثمرين والسكان الساحليين.",
    neighborhoods: [
      ["malabata", "Malabata", "ملاباطا"],
      ["iberia", "Iberia", "إيبيريا"],
    ],
  },
  {
    slug: "agadir",
    nameFr: "Agadir",
    nameAr: "أكادير",
    region: "Souss-Massa",
    lat: 30.4278,
    lng: -9.5981,
    descriptionFr: "Station balnéaire moderne du Sud, Agadir propose une longue plage et un parc immobilier récent.",
    descriptionAr: "منتجع ساحلي حديث في الجنوب، يوفر أكادير شاطئاً طويلاً وعقارات حديثة.",
    neighborhoods: [["founty", "Founty", "فونتي"], ["talborjt", "Talborjt", "تالبرجت"]],
  },
  {
    slug: "fes",
    nameFr: "Fès",
    nameAr: "فاس",
    region: "Fès-Meknès",
    lat: 34.0331,
    lng: -5.0003,
    descriptionFr: "Ville impériale et spirituelle, Fès abrite une médina classée et un artisanat réputé.",
    descriptionAr: "مدينة إمبراطورية وروحية، تضم فاس مدينة عتيقة مصنفة وحرفاً مشهورة.",
    neighborhoods: [["medina-fes", "Médina", "المدينة"], ["ville-nouvelle", "Ville nouvelle", "المدينة الجديدة"]],
  },
];

const CATEGORIES = [
  { slug: "apartment", nameFr: "Appartement", nameAr: "شقة", kind: "residential", order: 1 },
  { slug: "villa", nameFr: "Villa", nameAr: "فيلا", kind: "residential", order: 2 },
  { slug: "riad", nameFr: "Riad", nameAr: "رياض", kind: "residential", order: 3 },
  { slug: "house", nameFr: "Maison de ville", nameAr: "منزل", kind: "residential", order: 4 },
  { slug: "studio", nameFr: "Studio", nameAr: "استوديو", kind: "residential", order: 5 },
  { slug: "office", nameFr: "Bureau", nameAr: "مكتب", kind: "commercial", order: 6 },
  { slug: "retail", nameFr: "Local commercial", nameAr: "محل تجاري", kind: "commercial", order: 7 },
  { slug: "warehouse", nameFr: "Entrepôt", nameAr: "مستودع", kind: "commercial", order: 8 },
  { slug: "land-residential", nameFr: "Terrain constructible", nameAr: "أرض قابلة للبناء", kind: "land", order: 9 },
  { slug: "land-agricultural", nameFr: "Terrain agricole", nameAr: "أرض زراعية", kind: "land", order: 10 },
];

const AMENITIES = [
  ["parking", "Parking", "موقف سيارات", "building"],
  ["elevator", "Ascenseur", "مصعد", "building"],
  ["terrace", "Terrasse / balcon", "تراس / شرفة", "outdoor"],
  ["garden", "Jardin", "حديقة", "outdoor"],
  ["pool", "Piscine", "مسبح", "outdoor"],
  ["security", "Sécurité 24/7", "أمن 24/7", "building"],
  ["concierge", "Conciergerie", "خدمة الاستقبال", "building"],
  ["aircon", "Climatisation", "مكيف هواء", "interior"],
  ["gym", "Salle de sport", "قاعة رياضة", "building"],
  ["sea_view", "Vue mer", "إطلالة على البحر", "outdoor"],
  ["fireplace", "Cheminée", "مدفأة", "interior"],
  ["loading", "Accès poids lourds", "مدخل للشاحنات", "commercial"],
];

type PropertySeed = {
  key: string;
  titleFr: string;
  titleAr: string;
  descFr: string;
  descAr: string;
  category: string;
  transaction: "sale" | "rent";
  city: string;
  neighborhood: string;
  price: number;
  rentPeriod?: "month" | "day";
  builtArea?: number;
  landArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  floors?: number;
  parking?: number;
  condition?: string;
  furnished?: boolean;
  streetFrontage?: number;
  occupancy?: string;
  status: string;
  featured?: boolean;
  verification: string;
  permission: string;
  documentedMonthlyRent?: number;
  annualOperatingCosts?: number;
  images: string[];
  amenities: string[];
  publishedDaysAgo?: number;
};

const IMG = {
  apt1: "apartment-anfa-1.jpg",
  aptInt1: "apartment-interior-1.jpg",
  aptInt2: "apartment-interior-2.jpg",
  aptInt3: "apartment-interior-3.jpg",
  villa1: "villa-exterior-1.jpg",
  villa2: "villa-exterior-2.jpg",
  villaPool: "villa-pool-1.jpg",
  house: "house-exterior-1.jpg",
  riadCourt: "riad-courtyard-1.jpg",
  riadInt: "riad-interior-1.jpg",
  office1: "office-1.jpg",
  office2: "office-2.jpg",
  office3: "office-3.jpg",
  retail: "retail-1.jpg",
  land: "land-1.jpg",
  marrakech1: "marrakech-city-1.jpg",
  marrakech2: "marrakech-city-2.jpg",
};

const PROPERTIES: PropertySeed[] = [
  {
    key: "apt-anfa",
    titleFr: "Appartement lumineux 3 chambres — Anfa",
    titleAr: "شقة مشرقة بثلاث غرف — أنفا",
    descFr:
      "Appartement de 142 m² au quatrième étage d'un immeuble récent à Anfa. Séjour double exposition, cuisine équipée, trois chambres dont une suite parentale. L'appartement dispose d'une place de parking en sous-sol et d'une terrasse de 12 m². Charges de copropriété à confirmer auprès du syndic. Disponibilité vérifiée par téléphone avec le propriétaire.",
    descAr:
      "شقة بمساحة 142 م² في الطابق الرابع داخل بناية حديثة بأنفا. صالون مزدوج الإطلالة، مطبخ مجهز، ثلاث غرف نوم إحداها بحمام خاص، مع موقف سيارات في الطابق السفلي وتراس 12 م². مصاريف الملكية المشتركة تُؤكد لدى السانديك. تم التحقق من التوفر هاتفياً مع المالك.",
    category: "apartment",
    transaction: "sale",
    city: "casablanca",
    neighborhood: "anfa",
    price: 2_850_000,
    builtArea: 142,
    bedrooms: 3,
    bathrooms: 2,
    floors: 7,
    parking: 1,
    condition: "excellent",
    furnished: false,
    status: "published",
    featured: true,
    verification: "availability_confirmed",
    permission: "written",
    documentedMonthlyRent: 12_000,
    images: [IMG.apt1, IMG.aptInt1, IMG.aptInt2, IMG.marrakech1],
    amenities: ["parking", "elevator", "terrace", "security"],
    publishedDaysAgo: 6,
  },
  {
    key: "villa-palmeraie",
    titleFr: "Villa contemporaine avec piscine — Palmeraie",
    titleAr: "فيلا عصرية مع مسبح — النخيل",
    descFr:
      "Villa de 420 m² bâtis sur un terrain de 1 200 m² dans la Palmeraie. Cinq chambres avec salles de bain, grand séjour ouvert sur le jardin, piscine de 12 mètres et pool house. Les documents de propriété ont été examinés par notre équipe ; la vérification juridique complète reste à effectuer par le notaire de l'acquéreur.",
    descAr:
      "فيلا بمساحة مبنية 420 م² على أرض 1200 م² في النخيل. خمس غرف نوم بحمّامات، صالون كبير يفتح على الحديقة، مسبح بطول 12 متراً وملحقات. تم فحص وثائق الملكية من فريقنا؛ ويبقى التحقق القانوني الكامل مسؤولية موثق المشتري.",
    category: "villa",
    transaction: "sale",
    city: "marrakech",
    neighborhood: "palmeraie",
    price: 8_900_000,
    builtArea: 420,
    landArea: 1_200,
    bedrooms: 5,
    bathrooms: 4,
    parking: 2,
    condition: "excellent",
    status: "published",
    featured: true,
    verification: "documents_reviewed",
    permission: "documented",
    documentedMonthlyRent: 35_000,
    annualOperatingCosts: 96_000,
    images: [IMG.villaPool, IMG.villa1, IMG.villa2, IMG.riadInt],
    amenities: ["parking", "garden", "pool", "security", "aircon", "fireplace"],
    publishedDaysAgo: 12,
  },
  {
    key: "riad-medina",
    titleFr: "Riad rénové de 6 chambres — Médina",
    titleAr: "رياض مجدد بست غرف — المدينة",
    descFr:
      "Riad de 260 m² restauré en 2022, organisé autour d'un patio planté. Six chambres, deux salons, terrasse panoramique. Le bien est exploité en maison d'hôtes ; les autorisations d'exploitation n'ont pas été contrôlées par IMPS et doivent être vérifiées auprès des autorités compétentes.",
    descAr:
      "رياض بمساحة 260 م² رمم سنة 2022 حول صحن مزروع. ست غرف، صالونان وتراس بانورامي. يُستغل كدار ضيافة؛ ولم يتحقق IMPS من تراخيص الاستغلال التي يجب التأكد منها لدى السلطات المختصة.",
    category: "riad",
    transaction: "sale",
    city: "marrakech",
    neighborhood: "medina",
    price: 4_200_000,
    builtArea: 260,
    landArea: 180,
    bedrooms: 6,
    bathrooms: 4,
    condition: "excellent",
    status: "published",
    featured: true,
    verification: "documents_reviewed",
    permission: "written",
    images: [IMG.riadCourt, IMG.riadInt, IMG.marrakech2],
    amenities: ["terrace", "aircon"],
    publishedDaysAgo: 20,
  },
  {
    key: "apt-gauthier-rent",
    titleFr: "Appartement meublé 2 chambres — Gauthier",
    titleAr: "شقة مفروشة بغرفتين — غوتييه",
    descFr:
      "Appartement meublé de 95 m² au cœur de Gauthier, à proximité des commerces et des transports. Deux chambres, séjour, cuisine équipée. Loyer mensuel de 12 000 DH, charges de copropriété incluses selon le propriétaire. Caution de deux mois demandée.",
    descAr:
      "شقة مفروشة بمساحة 95 م² في قلب غوتييه، قريبة من المحلات والمواصلات. غرفتان، صالون ومطبخ مجهز. الإيجار الشهري 12.000 درهم مع مصاريف الملكية المشتركة حسب المالك. تأمين شهرين.",
    category: "apartment",
    transaction: "rent",
    city: "casablanca",
    neighborhood: "gauthier",
    price: 12_000,
    rentPeriod: "month",
    builtArea: 95,
    bedrooms: 2,
    bathrooms: 2,
    furnished: true,
    condition: "good",
    status: "published",
    verification: "availability_confirmed",
    permission: "written",
    images: [IMG.aptInt3, IMG.aptInt1],
    amenities: ["elevator", "aircon", "security"],
    publishedDaysAgo: 3,
  },
  {
    key: "office-hay-riad",
    titleFr: "Plateau de bureaux 210 m² — Hay Riad",
    titleAr: "طابق مكاتب 210 م² — حي الرياض",
    descFr:
      "Plateau de bureaux de 210 m² au premier étage d'un immeuble d'affaires à Hay Riad. Espace ouvert divisible, deux bureaux fermés, sanitaires et kitchenette. Immeuble avec ascenseur et parking visiteurs. Loyer de 28 000 DH par mois, hors charges.",
    descAr:
      "طابق مكاتب بمساحة 210 م² في الطابق الأول من بناية أعمال بحي الرياض. فضاء مفتوح قابل للتقسيم، مكتبان مغلقان، مرافق ومطبخ صغير. البناية بمصعد ومواقف للزوار. الإيجار 28.000 درهم شهرياً دون المصاريف.",
    category: "office",
    transaction: "rent",
    city: "rabat",
    neighborhood: "hay-riad",
    price: 28_000,
    rentPeriod: "month",
    builtArea: 210,
    floors: 6,
    condition: "good",
    status: "published",
    verification: "availability_confirmed",
    permission: "written",
    images: [IMG.office1, IMG.office2, IMG.office3],
    amenities: ["parking", "elevator", "security", "aircon"],
    publishedDaysAgo: 9,
  },
  {
    key: "retail-gueliz",
    titleFr: "Local commercial avec vitrine — Guéliz",
    titleAr: "محل تجاري بواجهة — كليز",
    descFr:
      "Local commercial de 120 m² en rez-de-chaussée sur l'avenue principale de Guéliz, avec vitrine de 8 mètres. Réserve et sanitaires à l'arrière. Emplacement à fort passage. Loyer de 18 000 DH par mois. L'usage commercial autorisé doit être confirmé dans le règlement de copropriété.",
    descAr:
      "محل تجاري بمساحة 120 م² في الطابق الأرضي بالشارع الرئيسي بكليز، بواجهة 8 أمتار. مخزن ومرافق في الخلف. موقع بحركة كبيرة. الإيجار 18.000 درهم شهرياً. يجب تأكيد الاستعمال التجاري في نظام الملكية المشتركة.",
    category: "retail",
    transaction: "rent",
    city: "marrakech",
    neighborhood: "gueliz",
    price: 18_000,
    rentPeriod: "month",
    builtArea: 120,
    streetFrontage: 8,
    occupancy: "Vacant",
    status: "published",
    verification: "availability_confirmed",
    permission: "verbal",
    images: [IMG.retail],
    amenities: ["aircon", "loading"],
    publishedDaysAgo: 15,
  },
  {
    key: "land-souissi",
    titleFr: "Terrain constructible 900 m² — Souissi",
    titleAr: "أرض قابلة للبناء 900 م² — السويسي",
    descFr:
      "Terrain de 900 m² dans un secteur résidentiel de Souissi, viabilisé et clôturé. Le plan d'aménagement autorise une construction R+2 selon le certificat communiqué par le propriétaire ; ce document n'a pas été authentifié par IMPS. Titre foncier à vérifier auprès de la conservation foncière.",
    descAr:
      "أرض بمساحة 900 م² في قطاع سكني بالسويسي، مهيأة ومسيّجة. يسمح تصميم التهيئة ببناء طابقين مع سطح حسب الشهادة التي قدمها المالك، ولم يتحقق IMPS من صحتها. يجب التحقق من الرسم العقاري لدى المحافظة العقارية.",
    category: "land-residential",
    transaction: "sale",
    city: "rabat",
    neighborhood: "souissi",
    price: 5_400_000,
    landArea: 900,
    status: "published",
    verification: "availability_confirmed",
    permission: "written",
    images: [IMG.land],
    amenities: [],
    publishedDaysAgo: 25,
  },
  {
    key: "villa-californie",
    titleFr: "Villa familiale avec jardin — Californie",
    titleAr: "فيلا عائلية بحديقة — كاليفورنيا",
    descFr:
      "Villa de 380 m² bâtis sur 800 m² de terrain dans le quartier Californie. Quatre chambres, trois salles de bain, double salon et jardin arboré. Cuisine à rénover. Garage pour deux voitures. Prix affiché à 6 750 000 DH, négociable selon le propriétaire.",
    descAr:
      "فيلا بمساحة مبنية 380 م² على أرض 800 م² بحي كاليفورنيا. أربع غرف نوم، ثلاث حمّامات، صالونان وحديقة مشجرة. المطبخ يحتاج تجديداً. مرأب لسيارتين. السعر المعروض 6.750.000 درهم قابل للتفاوض حسب المالك.",
    category: "villa",
    transaction: "sale",
    city: "casablanca",
    neighborhood: "californie",
    price: 6_750_000,
    builtArea: 380,
    landArea: 800,
    bedrooms: 4,
    bathrooms: 3,
    parking: 2,
    condition: "good",
    status: "published",
    verification: "availability_confirmed",
    permission: "written",
    documentedMonthlyRent: 20_000,
    images: [IMG.house, IMG.villa2, IMG.aptInt2],
    amenities: ["parking", "garden", "security"],
    publishedDaysAgo: 33,
  },
  {
    key: "studio-agdal",
    titleFr: "Studio meublé — Agdal",
    titleAr: "استوديو مفروش — أكدال",
    descFr:
      "Studio meublé de 42 m² à Agdal, idéal pour un jeune professionnel. Pièce de vie avec kitchenette, salle de bain, climatisation. Immeuble avec ascenseur. Loyer de 5 500 DH par mois, charges incluses.",
    descAr:
      "استوديو مفروش بمساحة 42 م² بأكدال، مناسب لمهني شاب. غرفة مع مطبخ صغير، حمّام وتكييف. البناية بمصعد. الإيجار 5.500 درهم شهرياً مع المصاريف.",
    category: "studio",
    transaction: "rent",
    city: "rabat",
    neighborhood: "agdal",
    price: 5_500,
    rentPeriod: "month",
    builtArea: 42,
    bedrooms: 1,
    bathrooms: 1,
    furnished: true,
    status: "published",
    verification: "availability_confirmed",
    permission: "written",
    images: [IMG.aptInt1],
    amenities: ["elevator", "aircon"],
    publishedDaysAgo: 2,
  },
  {
    key: "warehouse-ain-sebaa",
    titleFr: "Entrepôt logistique 650 m² — Aïn Sebaâ",
    titleAr: "مستودع لوجستي 650 م² — عين السبع",
    descFr:
      "Entrepôt de 650 m² avec hauteur sous plafond de 8 mètres, quai de chargement et accès poids lourds, dans la zone industrielle d'Aïn Sebaâ. Bureau de 40 m² et sanitaires. Loyer de 45 000 DH par mois. Disponible immédiatement selon le gestionnaire.",
    descAr:
      "مستودع بمساحة 650 م² بارتفاع 8 أمتار، رصيف تحميل ومدخل للشاحنات، بالمنطقة الصناعية بعين السبع. مكتب 40 م² ومرافق. الإيجار 45.000 درهم شهرياً. متوفر فوراً حسب المسير.",
    category: "warehouse",
    transaction: "rent",
    city: "casablanca",
    neighborhood: "ain-sebaa",
    price: 45_000,
    rentPeriod: "month",
    builtArea: 650,
    occupancy: "Vacant",
    status: "published",
    verification: "availability_confirmed",
    permission: "written",
    images: [IMG.office2],
    amenities: ["loading", "parking", "security"],
    publishedDaysAgo: 18,
  },
  {
    key: "apt-malabata",
    titleFr: "Appartement vue mer — Malabata",
    titleAr: "شقة بإطلالة على البحر — ملاباطا",
    descFr:
      "Appartement de 118 m² avec vue dégagée sur la baie de Tanger depuis le sixième étage. Trois chambres, deux salles de bain, balcon de 9 m². Résidence sécurisée avec piscine commune. Prix de 3 150 000 DH.",
    descAr:
      "شقة بمساحة 118 م² بإطلالة مفتوحة على خليج طنجة من الطابق السادس. ثلاث غرف، حمّامان وشرفة 9 م². إقامة مؤمنة بمسبح مشترك. السعر 3.150.000 درهم.",
    category: "apartment",
    transaction: "sale",
    city: "tanger",
    neighborhood: "malabata",
    price: 3_150_000,
    builtArea: 118,
    bedrooms: 3,
    bathrooms: 2,
    parking: 1,
    condition: "good",
    status: "published",
    verification: "identity_checked",
    permission: "verbal",
    documentedMonthlyRent: 9_000,
    images: [IMG.aptInt2, IMG.marrakech1],
    amenities: ["parking", "elevator", "pool", "sea_view", "security"],
    publishedDaysAgo: 40,
  },
  {
    key: "duplex-founty",
    titleFr: "Duplex 4 chambres — Founty",
    titleAr: "دوبلكس بأربع غرف — فونتي",
    descFr:
      "Duplex de 160 m² à Founty, à 400 mètres de la plage. Quatre chambres, trois salles de bain, terrasse de 20 m². Résidence récente avec parking souterrain. Disponibilité confirmée le mois dernier auprès du promoteur.",
    descAr:
      "دوبلكس بمساحة 160 م² بفونتي على بعد 400 متر من الشاطئ. أربع غرف، ثلاث حمّامات وتراس 20 م². إقامة حديثة بمواقف تحت أرضية. تم تأكيد التوفر الشهر الماضي لدى المطوّر.",
    category: "apartment",
    transaction: "sale",
    city: "agadir",
    neighborhood: "founty",
    price: 2_400_000,
    builtArea: 160,
    bedrooms: 4,
    bathrooms: 3,
    parking: 1,
    condition: "new",
    status: "published",
    verification: "availability_confirmed",
    permission: "written",
    documentedMonthlyRent: 8_500,
    images: [IMG.villa1, IMG.aptInt3],
    amenities: ["parking", "terrace", "pool", "elevator"],
    publishedDaysAgo: 48,
  },
  {
    key: "house-fes",
    titleFr: "Maison de ville restaurée — Médina de Fès",
    titleAr: "منزل مجدد — مدينة فاس",
    descFr:
      "Maison de ville de 180 m² restaurée dans la médina de Fès, à dix minutes à pied de Bab Boujloud. Trois chambres, deux salles de bain, patio central et terrasse. Bien actuellement réservé ; les visites restent possibles sur demande.",
    descAr:
      "منزل بمساحة 180 م² مجدد بمدينة فاس، على عشر دقائق سيراً من باب بوجلود. ثلاث غرف، حمّامان، صحن مركزي وتراس. العقار محجوز حالياً؛ وتبقى الزيارات ممكنة عند الطلب.",
    category: "house",
    transaction: "sale",
    city: "fes",
    neighborhood: "medina-fes",
    price: 1_950_000,
    builtArea: 180,
    landArea: 110,
    bedrooms: 3,
    bathrooms: 2,
    condition: "good",
    status: "reserved",
    verification: "availability_confirmed",
    permission: "written",
    images: [IMG.riadInt, IMG.riadCourt],
    amenities: ["terrace"],
    publishedDaysAgo: 60,
  },
  {
    key: "apt-maarif-sold",
    titleFr: "Appartement 2 chambres — Maârif",
    titleAr: "شقة بغرفتين — المعاريف",
    descFr:
      "Appartement de 88 m² vendu en septembre 2026. L'annonce est conservée pour référence et n'est plus proposée à la vente.",
    descAr: "شقة بمساحة 88 م² بيعت في سبتمبر 2026. يُحفظ الإعلان للمرجعية ولم يعد معروضاً للبيع.",
    category: "apartment",
    transaction: "sale",
    city: "casablanca",
    neighborhood: "maarif",
    price: 1_750_000,
    builtArea: 88,
    bedrooms: 2,
    bathrooms: 1,
    status: "sold",
    verification: "availability_confirmed",
    permission: "written",
    images: [IMG.aptInt1],
    amenities: ["elevator"],
    publishedDaysAgo: 120,
  },
  {
    key: "penthouse-anfa",
    titleFr: "Penthouse avec terrasse — Anfa",
    titleAr: "بنتهاوس بتراس — أنفا",
    descFr:
      "Penthouse de 210 m² avec terrasse de 80 m² et vue sur l'océan, au dernier étage d'une résidence récente à Anfa. Quatre chambres, trois salles de bain. Prix de 7 200 000 DH. Annonce en attente de révision : photos supplémentaires et confirmation de disponibilité demandées.",
    descAr:
      "بنتهاوس بمساحة 210 م² مع تراس 80 م² وإطلالة على المحيط، في الطابق الأخير بإقامة حديثة بأنفا. أربع غرف وثلاث حمّامات. السعر 7.200.000 درهم. الإعلان في انتظار المراجعة: طُلبت صور إضافية وتأكيد التوفر.",
    category: "apartment",
    transaction: "sale",
    city: "casablanca",
    neighborhood: "anfa",
    price: 7_200_000,
    builtArea: 210,
    bedrooms: 4,
    bathrooms: 3,
    parking: 2,
    condition: "excellent",
    status: "in_review",
    verification: "identity_checked",
    permission: "verbal",
    images: [IMG.apt1, IMG.aptInt2],
    amenities: ["parking", "elevator", "terrace", "sea_view", "security"],
  },
  {
    key: "villa-tanger-draft",
    titleFr: "Villa à compléter — Malabata",
    titleAr: "فيلا ناقصة المعلومات — ملاباطا",
    descFr:
      "Fiche en cours de collecte. Le propriétaire a été contacté mais n'a pas encore transmis les photos intérieures ni confirmé le prix de vente. Ne pas publier avant vérification.",
    descAr:
      "بطاقة قيد الجمع. تم التواصل مع المالك لكنه لم يرسل الصور الداخلية ولم يؤكد سعر البيع بعد. لا تُنشر قبل التحقق.",
    category: "villa",
    transaction: "sale",
    city: "tanger",
    neighborhood: "malabata",
    price: 5_000_000,
    builtArea: 300,
    bedrooms: 4,
    bathrooms: 3,
    status: "draft",
    verification: "unverified",
    permission: "none",
    images: [],
    amenities: [],
  },
  {
    key: "local-rabat-archived",
    titleFr: "Local commercial — Agdal (archivé)",
    titleAr: "محل تجاري — أكدال (مؤرشف)",
    descFr:
      "Local commercial de 75 m² retiré du marché par le propriétaire en août 2026. Conservé pour l'historique des demandes reçues.",
    descAr: "محل تجاري بمساحة 75 م² سحبه المالك من السوق في غشت 2026. محفوظ لسجل الطلبات المستلمة.",
    category: "retail",
    transaction: "rent",
    city: "rabat",
    neighborhood: "agdal",
    price: 9_000,
    rentPeriod: "month",
    builtArea: 75,
    status: "archived",
    verification: "availability_confirmed",
    permission: "written",
    images: [IMG.retail],
    amenities: [],
    publishedDaysAgo: 90,
  },
];

async function seedGeography() {
  const cities: Record<string, { id: string; slug: string }> = {};
  const neighborhoods: Record<string, string> = {};
  for (const [index, city] of CITIES.entries()) {
    const created = await prisma.city.create({
      data: {
        slug: city.slug,
        nameFr: city.nameFr,
        nameAr: city.nameAr,
        region: city.region,
        descriptionFr: city.descriptionFr,
        descriptionAr: city.descriptionAr,
        latitude: city.lat,
        longitude: city.lng,
        heroImage: `/media/${CITY_IMAGES[city.slug] ?? "marrakech-city-2.jpg"}`,
        sortOrder: index,
      },
    });
    cities[city.slug] = { id: created.id, slug: created.slug };
    for (const [slug, nameFr, nameAr] of city.neighborhoods) {
      const hood = await prisma.neighborhood.create({
        data: { cityId: created.id, slug, nameFr, nameAr },
      });
      neighborhoods[`${city.slug}/${slug}`] = hood.id;
    }
  }
  return { cities, neighborhoods };
}

async function main() {
  console.log("→ Resetting IMPS data…");
  await reset();

  console.log("→ Roles, permissions and staff accounts");
  const access = await seedAccessControl();

  console.log("→ Geography and taxonomy");
  const { cities, neighborhoods } = await seedGeography();

  const categories: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const created = await prisma.propertyCategory.create({
      data: { slug: cat.slug, nameFr: cat.nameFr, nameAr: cat.nameAr, kind: cat.kind, sortOrder: cat.order },
    });
    categories[cat.slug] = created.id;
  }

  const amenities: Record<string, string> = {};
  for (const [slug, labelFr, labelAr, group] of AMENITIES) {
    const created = await prisma.amenity.create({ data: { slug, labelFr, labelAr, group } });
    amenities[slug] = created.id;
  }

  await prisma.siteSetting.createMany({
    data: [
      { key: "brand.name", value: "IMPS", group: "general", label: "Nom de la marque" },
      {
        key: "brand.tagline",
        value: "Immobilier vérifié au Maroc",
        group: "general",
        label: "Accroche",
      },
      { key: "contact.email", value: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@imps.ma", group: "contact" },
      { key: "contact.phone", value: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "", group: "contact" },
      { key: "contact.address", value: "Casablanca, Maroc", group: "contact" },
      { key: "features.investment", value: "true", group: "features" },
      { key: "features.developments", value: "true", group: "features" },
      { key: "listings.staleDays", value: "30", group: "operations", label: "Jours avant reconfirmation" },
    ],
  });

  if (!DEMO) {
    console.log("✓ Production base ready (owner only, no demo data).");
    return;
  }

  console.log("→ Demo properties");
  const ownerId = access.ownerId;
  const collectorId = access.profiles.collector;
  const reviewerId = access.profiles.reviewer;
  const managerId = access.profiles.manager;

  const propertyIds: Record<string, string> = {};
  let sequence = 1;
  for (const seed of PROPERTIES) {
    const reference = referenceFor(2026, sequence++);
    const publishedAt = seed.publishedDaysAgo ? daysAgo(seed.publishedDaysAgo) : null;
    const property = await prisma.property.create({
      data: {
        reference,
        slug: propertySlug(seed.titleFr, reference),
        titleFr: seed.titleFr,
        titleAr: seed.titleAr,
        descriptionFr: seed.descFr,
        descriptionAr: seed.descAr,
        categoryId: categories[seed.category]!,
        transactionType: seed.transaction,
        cityId: cities[seed.city]!.id,
        neighborhoodId: neighborhoods[`${seed.city}/${seed.neighborhood}`]!,
        locationPrecision: "approximate",
        latitude: CITIES.find((c) => c.slug === seed.city)!.lat + 0.01,
        longitude: CITIES.find((c) => c.slug === seed.city)!.lng + 0.01,
        builtArea: seed.builtArea ?? null,
        landArea: seed.landArea ?? null,
        bedrooms: seed.bedrooms ?? null,
        bathrooms: seed.bathrooms ?? null,
        floors: seed.floors ?? null,
        parkingSpaces: seed.parking ?? null,
        condition: seed.condition ?? null,
        furnished: seed.furnished ?? null,
        streetFrontage: seed.streetFrontage ?? null,
        occupancyStatus: seed.occupancy ?? null,
        documentedMonthlyRent: seed.documentedMonthlyRent ?? null,
        annualOperatingCosts: seed.annualOperatingCosts ?? null,
        status: seed.status,
        sourcingStage: seed.status === "published" ? "published" : seed.status === "in_review" ? "review" : "collecting",
        isFeatured: seed.featured ?? false,
        publicationPermission: seed.permission,
        dataSource: "Appel direct au propriétaire — dossier interne IMPS",
        internalNotes:
          "Données de démonstration. Aucune information réelle sur un propriétaire ou un bien n'est utilisée.",
        verificationLevel: seed.verification,
        availabilityConfirmedAt: seed.status === "draft" ? null : daysAgo(5),
        nextAvailabilityCheckAt: daysAhead(25),
        publishedAt,
        isSample: true,
        createdById: collectorId ?? ownerId,
        assignedToId: collectorId ?? ownerId,
        primaryPrice: seed.price,
        primaryRentPeriod: seed.rentPeriod ?? null,
      },
    });
    propertyIds[seed.key] = property.id;

    await prisma.propertyOffer.create({
      data: {
        propertyId: property.id,
        transactionType: seed.transaction,
        price: seed.price,
        rentPeriod: seed.transaction === "rent" ? seed.rentPeriod ?? "month" : null,
        isActive: true,
      },
    });

    for (const [index, image] of seed.images.entries()) {
      await prisma.propertyMedia.create({
        data: {
          propertyId: property.id,
          url: `/media/${image}`,
          kind: "image",
          visibility: "public",
          sortOrder: index,
          isCover: index === 0,
          altFr: `${seed.titleFr} — photo ${index + 1}`,
          altAr: `${seed.titleAr} — صورة ${index + 1}`,
          width: 1600,
          height: 1067,
        },
      });
    }

    for (const slug of seed.amenities) {
      await prisma.propertyAmenity.create({
        data: { propertyId: property.id, amenityId: amenities[slug]! },
      });
    }

    if (seed.status !== "draft") {
      await prisma.propertyVerification.create({
        data: {
          propertyId: property.id,
          type: "availability",
          result: "passed",
          notes: "Disponibilité confirmée par téléphone avec le propriétaire.",
          verifiedById: collectorId ?? ownerId,
          verifiedAt: daysAgo(5),
          nextCheckAt: daysAhead(25),
        },
      });
      if (seed.verification !== "availability_confirmed") {
        await prisma.propertyVerification.create({
          data: {
            propertyId: property.id,
            type: seed.verification === "documents_reviewed" ? "ownership_document" : "identity",
            result: "passed",
            notes:
              seed.verification === "documents_reviewed"
                ? "Copie du titre de propriété examinée. Authenticité non certifiée."
                : "Pièce d'identité du vendeur contrôlée en agence.",
            verifiedById: reviewerId ?? ownerId,
            verifiedAt: daysAgo(4),
          },
        });
      }
    }

    if (publishedAt) {
      await prisma.publicationReview.create({
        data: {
          propertyId: property.id,
          submittedById: collectorId ?? ownerId,
          reviewerId: reviewerId ?? ownerId,
          decision: "approved",
          notes: "Contrôles de complétude et de disponibilité effectués (démonstration).",
          createdAt: daysAgo((seed.publishedDaysAgo ?? 5) + 1),
          decidedAt: publishedAt,
        },
      });
    }

    await prisma.propertyStatusHistory.create({
      data: {
        propertyId: property.id,
        fromStatus: "draft",
        toStatus: seed.status,
        reason: "Jeu de démonstration",
        actorId: reviewerId ?? ownerId,
        createdAt: publishedAt ?? daysAgo(1),
      },
    });
  }

  console.log("→ Sourcing pipeline");
  const sourcingSeed = [
    {
      title: "Appartement 4 chambres — CIL Casablanca",
      city: "casablanca",
      hood: "maarif",
      category: "apartment",
      stage: "contacted",
      permission: "none",
      price: 2_100_000,
      owner: "Propriétaire (démo)",
      phone: "+212 6XX XXX XXX",
      followUp: daysAhead(2),
      attempts: [
        ["call", "reached", "Le propriétaire confirme vouloir vendre ; photos à venir."],
        ["whatsapp", "callback", "Message envoyé, réponse attendue."],
      ],
    },
    {
      title: "Villa 5 chambres — Souissi Rabat",
      city: "rabat",
      hood: "souissi",
      category: "villa",
      stage: "collecting",
      permission: "verbal",
      price: 7_800_000,
      owner: "Représentant familial (démo)",
      phone: "+212 6XX XXX XXX",
      followUp: daysAhead(4),
      attempts: [["call", "reached", "Accord verbal de publication, documents en attente."]],
    },
    {
      title: "Local commercial — Guéliz Marrakech",
      city: "marrakech",
      hood: "gueliz",
      category: "retail",
      stage: "verification",
      permission: "written",
      price: 15_000,
      owner: "Agence partenaire (démo)",
      phone: "+212 5XX XXX XXX",
      followUp: daysAhead(1),
      attempts: [["email", "reached", "Autorisation écrite reçue, vérification du loyer en cours."]],
    },
    {
      title: "Terrain 2 000 m² — Route d'Amizmiz",
      city: "marrakech",
      hood: "palmeraie",
      category: "land-residential",
      stage: "discovered",
      permission: "none",
      price: 3_200_000,
      owner: "Propriétaire (démo)",
      phone: "+212 6XX XXX XXX",
      followUp: daysAhead(3),
      attempts: [],
    },
  ];

  let srcSeq = 1;
  for (const item of sourcingSeed) {
    const lead = await prisma.propertyLead.create({
      data: {
        code: `SRC-2026-${String(srcSeq++).padStart(4, "0")}`,
        title: item.title,
        sourceType: "owner",
        sourceDetail: "Prospection interne (démonstration)",
        cityId: cities[item.city]!.id,
        neighborhoodId: neighborhoods[`${item.city}/${item.hood}`]!,
        categoryId: categories[item.category]!,
        transactionType: item.category.startsWith("land") || item.price > 1_000_000 ? "sale" : "rent",
        askingPrice: item.price,
        description: "Piste de démonstration — aucune donnée réelle.",
        stage: item.stage,
        permissionToPublish: item.permission,
        assignedToId: collectorId ?? ownerId,
        createdById: collectorId ?? ownerId,
        firstContactAt: item.attempts.length ? daysAgo(6) : null,
        nextFollowUpAt: item.followUp,
        internalNotes: "Données de démonstration.",
      },
    });
    await prisma.ownerContact.create({
      data: {
        propertyLeadId: lead.id,
        name: item.owner,
        phone: item.phone,
        role: "owner",
        isPrimary: true,
      },
    });
    for (const [channel, outcome, notes] of item.attempts) {
      await prisma.leadContactAttempt.create({
        data: {
          propertyLeadId: lead.id,
          staffId: collectorId ?? ownerId,
          channel,
          outcome,
          notes,
          createdAt: daysAgo(3),
        },
      });
    }
    await prisma.staffTask.create({
      data: {
        title: `Relancer : ${item.title}`,
        description: "Suivi de collecte d'informations (démonstration).",
        entityType: "sourcing",
        entityId: lead.id,
        assigneeId: collectorId ?? ownerId,
        dueAt: item.followUp,
        status: "open",
      },
    });
  }

  console.log("→ CRM, viewings and tasks");
  const crmStaff = access.profiles.crm ?? managerId;
  const leadSeed = [
    {
      name: "Visiteur Démo 1",
      phone: "+212 6XX XXX 101",
      email: "demo1@example.com",
      property: "apt-anfa",
      source: "website_form",
      status: "new",
      message: "Bonjour, l'appartement est-il toujours disponible ? Je souhaite visiter cette semaine.",
      priority: "high",
      days: 1,
    },
    {
      name: "Visiteur Démo 2",
      phone: "+212 6XX XXX 102",
      property: "villa-palmeraie",
      source: "viewing_form",
      status: "contacted",
      message: "Demande de visite pour la villa de la Palmeraie.",
      priority: "normal",
      days: 3,
    },
    {
      name: "Visiteur Démo 3",
      phone: "+212 6XX XXX 103",
      property: "office-hay-riad",
      source: "whatsapp",
      status: "qualified",
      message: "Nous cherchons 200 m² de bureaux à Hay Riad pour septembre.",
      priority: "high",
      days: 8,
    },
    {
      name: "Visiteur Démo 4",
      phone: "+212 6XX XXX 104",
      property: "apt-gauthier-rent",
      source: "website_form",
      status: "viewing_scheduled",
      message: "Location meublée pour six mois.",
      priority: "normal",
      days: 5,
    },
    {
      name: "Visiteur Démo 5",
      phone: "+212 6XX XXX 105",
      property: "land-souissi",
      source: "phone",
      status: "lost",
      message: "Budget insuffisant pour le quartier.",
      priority: "low",
      days: 20,
    },
  ];

  const leadIds: string[] = [];
  let leadSeq = 1;
  for (const item of leadSeed) {
    const lead = await prisma.lead.create({
      data: {
        code: `LD-${String(leadSeq++).padStart(5, "0")}`,
        propertyId: propertyIds[item.property]!,
        name: item.name,
        phone: item.phone,
        email: item.email,
        message: item.message,
        source: item.source,
        status: item.status,
        priority: item.priority,
        assignedToId: item.status === "new" ? null : crmStaff,
        followUpAt: item.status === "new" ? daysAhead(1) : daysAgo(0),
        createdAt: daysAgo(item.days),
        locale: "fr",
      },
    });
    leadIds.push(lead.id);
    if (item.status !== "new") {
      await prisma.leadNote.create({
        data: {
          leadId: lead.id,
          staffId: crmStaff,
          body: "Premier contact effectué (démonstration).",
          createdAt: daysAgo(item.days - 1),
        },
      });
    }
  }

  await prisma.viewingAppointment.createMany({
    data: [
      {
        leadId: leadIds[1],
        propertyId: propertyIds["villa-palmeraie"]!,
        visitorName: "Visiteur Démo 2",
        visitorPhone: "+212 6XX XXX 102",
        requestedAt: daysAhead(3),
        status: "requested",
        assignedToId: crmStaff,
        staffNotes: "À confirmer avec le propriétaire (démonstration).",
      },
      {
        leadId: leadIds[2],
        propertyId: propertyIds["office-hay-riad"]!,
        visitorName: "Visiteur Démo 3",
        visitorPhone: "+212 6XX XXX 103",
        requestedAt: daysAhead(2),
        status: "confirmed",
        assignedToId: crmStaff,
        confirmedAt: daysAgo(1),
      },
      {
        leadId: leadIds[3],
        propertyId: propertyIds["apt-gauthier-rent"]!,
        visitorName: "Visiteur Démo 4",
        visitorPhone: "+212 6XX XXX 104",
        requestedAt: daysAhead(5),
        status: "requested",
        assignedToId: crmStaff,
      },
    ],
  });

  await prisma.staffTask.createMany({
    data: [
      {
        title: "Reconfirmer la disponibilité de la villa Californie",
        description: "Annonce publiée il y a plus de 30 jours.",
        entityType: "property",
        entityId: propertyIds["villa-californie"]!,
        propertyId: propertyIds["villa-californie"]!,
        assigneeId: collectorId ?? ownerId,
        dueAt: daysAhead(2),
        priority: "high",
        status: "open",
      },
      {
        title: "Compléter les photos du penthouse Anfa",
        entityType: "property",
        entityId: propertyIds["penthouse-anfa"]!,
        propertyId: propertyIds["penthouse-anfa"]!,
        assigneeId: collectorId ?? ownerId,
        dueAt: daysAhead(1),
        priority: "normal",
        status: "open",
      },
      {
        title: "Relancer le propriétaire du studio Agdal",
        entityType: "sourcing",
        assigneeId: collectorId ?? ownerId,
        dueAt: daysAgo(1),
        priority: "normal",
        status: "open",
      },
    ],
  });

  console.log("→ Developments and editorial content");
  const developmentSeeds = [
    {
      slug: "residence-anfa-horizon",
      nameFr: "Résidence Anfa Horizon",
      nameAr: "إقامة أنفا هوريزون",
      city: "casablanca",
      hood: "anfa",
      developer: "Promoteur (démonstration)",
      status: "under_construction",
      delivery: daysAhead(420),
      cover: IMG.apt1,
      descFr:
        "Programme résidentiel de 24 appartements à Anfa, du studio au 4 pièces, avec parking souterrain et espace commun paysagé. Les prix et disponibilités sont indicatifs et doivent être confirmés auprès du promoteur.",
      descAr:
        "برنامج سكني من 24 شقة بأنفا، من الاستوديو إلى أربع غرف، مع موقف تحت أرضي وفضاء مشترك منسق. الأسعار والتوفر إرشادية وتُؤكد لدى المطوّر.",
      units: [
        ["A-101", "2 chambres", 2, 2, 88, 1_450_000],
        ["A-205", "3 chambres", 3, 2, 118, 1_980_000],
        ["A-401", "4 chambres", 4, 3, 165, 2_850_000],
      ],
    },
    {
      slug: "programme-marrakech-gueliz",
      nameFr: "Programme Guéliz Central",
      nameAr: "مشروع كليز سنترال",
      city: "marrakech",
      hood: "gueliz",
      developer: "Promoteur (démonstration)",
      status: "planned",
      delivery: daysAhead(720),
      cover: IMG.marrakech2,
      descFr:
        "Projet mixte de commerces en rez-de-chaussée et appartements aux étages supérieurs, au centre de Guéliz. Calendrier de livraison communiqué par le promoteur, non vérifié par IMPS.",
      descAr:
        "مشروع مختلط يشمل محلات في الطابق الأرضي وشققاً في الطوابق العليا بوسط كليز. جدول التسليم مقدم من المطوّر ولم يتحقق منه IMPS.",
      units: [
        ["B-01", "Studio", 1, 1, 45, 850_000],
        ["B-02", "2 chambres", 2, 2, 78, 1_250_000],
      ],
    },
  ];

  for (const dev of developmentSeeds) {
    const created = await prisma.development.create({
      data: {
        slug: dev.slug,
        nameFr: dev.nameFr,
        nameAr: dev.nameAr,
        descriptionFr: dev.descFr,
        descriptionAr: dev.descAr,
        cityId: cities[dev.city]!.id,
        neighborhoodId: neighborhoods[`${dev.city}/${dev.hood}`]!,
        developerName: dev.developer,
        constructionStatus: dev.status,
        deliveryDate: dev.delivery,
        coverImage: `/media/${dev.cover}`,
        status: "published",
        isFeatured: true,
        isSample: true,
        createdById: access.profiles.editor ?? ownerId,
        units: {
          create: dev.units.map(([code, type, beds, baths, area, price]) => ({
            code: code as string,
            unitType: type as string,
            bedrooms: beds as number,
            bathrooms: baths as number,
            area: area as number,
            priceFrom: price as number,
            status: "available",
          })),
        },
      },
    });
    void created;
  }

  const editorialCategories = [
    ["acheter", "Acheter au Maroc", "الشراء في المغرب"],
    ["louer", "Louer au Maroc", "الكراء في المغرب"],
    ["quartiers", "Guides de quartiers", "أدلة الأحياء"],
    ["investir", "Investir", "الاستثمار"],
  ];
  const editorial: Record<string, string> = {};
  for (const [slug, nameFr, nameAr] of editorialCategories) {
    const created = await prisma.articleCategory.create({ data: { slug, nameFr, nameAr } });
    editorial[slug] = created.id;
  }

  const articleSeed = [
    {
      slug: "acheter-un-appartement-a-casablanca",
      titleFr: "Acheter un appartement à Casablanca : ce qu'il faut vérifier",
      titleAr: "شراء شقة في الدار البيضاء: ما يجب التحقق منه",
      excerptFr:
        "Prix au mètre carré, charges de copropriété, titre foncier : les points à contrôler avant de signer.",
      excerptAr: "سعر المتر، مصاريف الملكية المشتركة والرسم العقاري: نقاط يجب فحصها قبل التوقيع.",
      bodyFr:
        "Avant toute offre, demandez le titre foncier et vérifiez l'identité du vendeur. Les prix affichés sur les plateformes sont des prix demandés, pas des prix de transaction.\n\nLes charges de copropriété varient fortement d'un immeuble à l'autre : demandez les derniers procès-verbaux d'assemblée générale et le montant des charges annuelles. Un appartement avec ascenseur et gardiennage implique des charges plus élevées.\n\nEnfin, faites vérifier la surface mentionnée au titre et l'existence d'éventuelles hypothèques par un professionnel du droit. Ce guide est informatif et ne remplace pas un avis juridique.",
      bodyAr:
        "قبل أي عرض، اطلب الرسم العقاري وتحقق من هوية البائع. الأسعار المعروضة على المنصات هي أسعار مطلوبة وليست أسعار معاملات.\n\nتختلف مصاريف الملكية المشتركة كثيراً بين البنايات: اطلب محاضر الجمع العام الأخيرة ومبلغ المصاريف السنوية. الشقق بالمصعد والحراسة تترتب عنها مصاريف أعلى.\n\nأخيراً، تحقق من المساحة المذكورة في الرسم ومن وجود رهون محتملة بواسطة مختص قانوني. هذا الدليل إعلامي ولا يعوض الاستشارة القانونية.",
      category: "acheter",
      city: "casablanca",
      cover: IMG.apt1,
      days: 10,
    },
    {
      slug: "louer-au-maroc-contrat-et-garanties",
      titleFr: "Location au Maroc : contrat, caution et obligations",
      titleAr: "الكراء في المغرب: العقد والتأمين والالتزامات",
      excerptFr: "Durée du bail, caution, état des lieux : les bases d'une location sereine.",
      excerptAr: "مدة العقد، التأمين ومحضر الحالة: أساسيات كراء مريح.",
      bodyFr:
        "Un contrat de bail écrit précise la durée, le loyer, les charges et les obligations de chaque partie. La caution usuelle représente un à deux mois de loyer ; elle ne remplace pas l'état des lieux.\n\nRéalisez un état des lieux détaillé à l'entrée et à la sortie, avec photos datées. Pour un logement meublé, listez l'inventaire du mobilier.\n\nLes obligations fiscales du bailleur et du locataire doivent être confirmées auprès d'un professionnel. Ce contenu est informatif.",
      bodyAr:
        "عقد الكراء المكتوب يحدد المدة والإيجار والمصاريف والتزامات كل طرف. التأمين المعتاد يعادل شهراً إلى شهرين من الإيجار، ولا يعوض محضر الحالة.\n\nأنجز محضر حالة مفصلاً عند الدخول والخروج مع صور مؤرخة. بالنسبة للسكن المفروش، أدرج جرد الأثاث.\n\nيجب تأكيد الالتزامات الضريبية للمكري والمكتري لدى مختص. هذا المحتوى إعلامي.",
      category: "louer",
      city: null,
      cover: IMG.aptInt1,
      days: 24,
    },
    {
      slug: "comprendre-le-rendement-locatif-brut",
      titleFr: "Comprendre le rendement locatif brut",
      titleAr: "فهم العائد الإيجاري الإجمالي",
      excerptFr:
        "Comment se calcule un rendement brut, ce qu'il ignore, et pourquoi il ne faut pas le confondre avec une rentabilité nette.",
      excerptAr: "كيف يُحسب العائد الإجمالي، وما يتجاهله، ولماذا لا يجب الخلط بينه وبين العائد الصافي.",
      bodyFr:
        "Le rendement locatif brut se calcule en divisant le loyer annuel par le prix d'achat : (loyer mensuel × 12 ÷ prix) × 100. Il ne tient compte ni des charges, ni des impôts, ni des périodes de vacance.\n\nIMPS n'affiche ce chiffre que lorsque le loyer est documenté par l'équipe. Un rendement calculé sur un loyer estimé ne doit pas être présenté comme une performance.\n\nLe rendement net, plus utile, déduit les charges récurrentes et la fiscalité. Il dépend de la situation de chaque acquéreur et doit être validé par un professionnel.",
      bodyAr:
        "يُحسب العائد الإيجاري الإجمالي بقسمة الإيجار السنوي على سعر الشراء: (الإيجار الشهري × 12 ÷ السعر) × 100. ولا يأخذ في الحسبان المصاريف ولا الضرائب ولا فترات الشغور.\n\nلا يعرض IMPS هذا الرقم إلا عندما يكون الإيجار موثقاً من الفريق. العائد المحسوب على إيجار تقديري لا يجوز تقديمه كأداء.\n\nالعائد الصافي أدق، إذ يخصم المصاريف المتكررة والضرائب، ويعتمد على وضع كل مشتري ويجب تأكيده من مختص.",
      category: "investir",
      city: null,
      cover: IMG.marrakech1,
      days: 6,
    },
  ];

  for (const article of articleSeed) {
    await prisma.article.create({
      data: {
        slug: article.slug,
        titleFr: article.titleFr,
        titleAr: article.titleAr,
        excerptFr: article.excerptFr,
        excerptAr: article.excerptAr,
        bodyFr: article.bodyFr,
        bodyAr: article.bodyAr,
        categoryId: editorial[article.category],
        cityId: article.city ? cities[article.city]!.id : null,
        coverImage: `/media/${article.cover}`,
        status: "published",
        publishedAt: daysAgo(article.days),
        authorId: access.profiles.editor ?? ownerId,
        metaTitle: article.titleFr,
        metaDescription: article.excerptFr,
      },
    });
  }

  await prisma.article.create({
    data: {
      slug: "guide-terrains-brouillon",
      titleFr: "Acheter un terrain : vérifications préalables (brouillon)",
      excerptFr: "Brouillon en cours de rédaction, non publié.",
      bodyFr:
        "Brouillon interne. Ce contenu doit être relu avant publication et ne doit pas apparaître dans le sitemap.",
      categoryId: editorial["acheter"],
      status: "draft",
      authorId: access.profiles.editor ?? ownerId,
    },
  });

  console.log("→ Notifications and audit trail");
  await prisma.notification.createMany({
    data: [
      {
        profileId: managerId,
        type: "lead.new",
        title: "Nouvelle demande reçue",
        body: "Une demande a été déposée sur l'annonce Appartement lumineux 3 chambres — Anfa.",
        link: "/admin/crm",
        isRead: false,
      },
      {
        profileId: managerId,
        type: "property.review",
        title: "Annonce en attente de révision",
        body: "Penthouse avec terrasse — Anfa attend une décision de publication.",
        link: "/admin/review",
        isRead: false,
      },
      {
        profileId: reviewerId,
        type: "property.review",
        title: "Annonce à réviser",
        body: "Penthouse avec terrasse — Anfa a été soumis à révision.",
        link: "/admin/review",
        isRead: false,
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: reviewerId ?? ownerId,
        action: "property.publish",
        entityType: "property",
        entityId: propertyIds["apt-anfa"]!,
        summary: "Publication de IMP-2026-0001 (démonstration)",
        createdAt: daysAgo(6),
      },
      {
        actorId: managerId,
        action: "property.price_change",
        entityType: "property",
        entityId: propertyIds["villa-californie"]!,
        summary: "Prix demandé modifié de 6 900 000 à 6 750 000 MAD (démonstration)",
        createdAt: daysAgo(4),
      },
      {
        actorId: ownerId,
        action: "staff.role_change",
        entityType: "profile",
        entityId: access.profiles.collector ?? ownerId,
        summary: "Rôle attribué : collecteur (démonstration)",
        createdAt: daysAgo(30),
      },
    ],
  });

  const counts = {
    properties: await prisma.property.count(),
    published: await prisma.property.count({ where: { status: "published" } }),
    leads: await prisma.lead.count(),
    staff: await prisma.profile.count({ where: { isStaff: true } }),
    articles: await prisma.article.count(),
  };
  console.log("✓ Seed complete:", counts);
  console.log(`  Owner login: ${OWNER_EMAIL} / (SEED_OWNER_PASSWORD)`);
  if (DEMO) console.log(`  Demo staff: manager@imps.ma, collector@imps.ma, reviewer@imps.ma, crm@imps.ma, editor@imps.ma, analyst@imps.ma / ${STAFF_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
