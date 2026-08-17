import { Author, Book, Category, Coupon, StoreSettings } from "../types";

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: "cat-amharic-lit",
    name: "Amharic Literature",
    slug: "amharic-literature",
    description: "Classic and contemporary Ethiopian novels, poetry, and prose written in Amharic.",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    active: true,
    bookCount: 12
  },
  {
    id: "cat-fiction",
    name: "Fiction & Novels",
    slug: "fiction-novels",
    description: "Captivating stories, literary masterpieces, and bestselling global novels.",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
    active: true,
    bookCount: 18
  },
  {
    id: "cat-history",
    name: "Ethiopian History & Heritage",
    slug: "ethiopian-history",
    description: "Deep dive into ancient Aksum, Lalibela, Adwa, and modern Ethiopian history.",
    image: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80",
    active: true,
    bookCount: 9
  },
  {
    id: "cat-business",
    name: "Business & Entrepreneurship",
    slug: "business-entrepreneurship",
    description: "Finance, leadership, startup strategy, and economics for builders.",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80",
    active: true,
    bookCount: 14
  },
  {
    id: "cat-self-dev",
    name: "Self-Development & Personal Growth",
    slug: "self-development",
    description: "Mindset, productivity, discipline, and building lifelong healthy habits.",
    image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&auto=format&fit=crop&q=80",
    active: true,
    bookCount: 15
  },
  {
    id: "cat-tech",
    name: "Technology & Software Engineering",
    slug: "technology-engineering",
    description: "Coding, AI, system design, data science, and modern software architectures.",
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
    active: true,
    bookCount: 10
  },
  {
    id: "cat-children",
    name: "Children & Young Adult",
    slug: "children-young-adult",
    description: "Bilingual storybooks, Ethiopian folktales, and fun learning for kids.",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
    active: true,
    bookCount: 8
  }
];

export function generateBookCoverSvg(
  titleAmharic: string,
  titleEnglish: string,
  author: string,
  category: string,
  bgGradient: [string, string],
  accentColor: string,
  symbol: string
): string {
  const cleanId = titleEnglish.replace(/[^a-zA-Z0-9]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">
    <defs>
      <linearGradient id="bg-${cleanId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradient[0]}" />
        <stop offset="100%" stop-color="${bgGradient[1]}" />
      </linearGradient>
      <linearGradient id="gold-${cleanId}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#F59E0B" />
        <stop offset="50%" stop-color="#FEF08A" />
        <stop offset="100%" stop-color="#D97706" />
      </linearGradient>
    </defs>

    <!-- Book Cover Base Background -->
    <rect width="400" height="600" fill="url(#bg-${cleanId})" rx="8" />
    
    <!-- Spine Line Shadow -->
    <rect x="0" y="0" width="18" height="600" fill="#000000" opacity="0.25" />
    <line x1="18" y1="0" x2="18" y2="600" stroke="#FFFFFF" stroke-opacity="0.15" stroke-width="1.5" />

    <!-- Outer Decorative Border Frame -->
    <rect x="28" y="24" width="344" height="552" fill="none" stroke="${accentColor}" stroke-width="2" stroke-dasharray="6,4" opacity="0.6" rx="4" />
    <rect x="34" y="30" width="332" height="540" fill="none" stroke="${accentColor}" stroke-width="1" opacity="0.8" rx="2" />

    <!-- Category Header Pill -->
    <rect x="80" y="55" width="240" height="24" fill="#000000" opacity="0.4" rx="12" />
    <text x="200" y="71" font-family="sans-serif" font-size="10" font-weight="900" fill="${accentColor}" text-anchor="middle" letter-spacing="1.5">${category.toUpperCase()}</text>

    <!-- Center Icon Symbol / Emblem -->
    <circle cx="200" cy="170" r="48" fill="#000000" opacity="0.3" stroke="${accentColor}" stroke-width="2" />
    <text x="200" y="184" font-family="sans-serif" font-size="36" text-anchor="middle">${symbol}</text>

    <!-- Main Title (Amharic) -->
    <text x="200" y="275" font-family="'Noto Sans Ethiopic', 'Abyssinica SIL', 'Nyala', sans-serif" font-size="25" font-weight="900" fill="#FFFFFF" text-anchor="middle">
      ${titleAmharic}
    </text>

    <!-- Subtitle (English Translation) -->
    <text x="200" y="315" font-family="sans-serif" font-size="13" font-weight="600" fill="${accentColor}" text-anchor="middle" letter-spacing="1">
      ${titleEnglish}
    </text>

    <line x1="80" y1="350" x2="320" y2="350" stroke="url(#gold-${cleanId})" stroke-width="2" />

    <!-- Author Badge -->
    <text x="200" y="435" font-family="sans-serif" font-size="10" font-weight="800" fill="#94A3B8" text-anchor="middle" letter-spacing="2">AUTHOR / ደራሲ</text>
    <text x="200" y="465" font-family="'Noto Sans Ethiopic', 'Abyssinica SIL', sans-serif" font-size="19" font-weight="800" fill="#FFFFFF" text-anchor="middle">
      ${author}
    </text>

    <!-- Publisher Seal / Seal Footer -->
    <rect x="100" y="520" width="200" height="22" fill="${accentColor}" opacity="0.2" rx="4" />
    <text x="200" y="535" font-family="sans-serif" font-size="9" font-weight="900" fill="${accentColor}" text-anchor="middle" letter-spacing="1.5">JJ BOOKSHOPPING • 🇪🇹</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getValidBookCover(book: Partial<Book>): string {
  // If book has a valid photographic URL and is not an SVG data URI or broken link, return it
  if (
    book.coverImage &&
    book.coverImage.length > 20 &&
    !book.coverImage.startsWith("data:image/svg")
  ) {
    return book.coverImage;
  }

  const title = (book.title || "").trim();
  const titleLower = title.toLowerCase();
  const slug = (book.slug || "").toLowerCase();
  const id = (book.id || "").toLowerCase();

  if (titleLower.includes("fiqir") || titleLower.includes("ፍቅር") || slug.includes("fiqir") || id.includes("fiqir")) {
    return "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80";
  }
  if (titleLower.includes("oromay") || titleLower.includes("ኦሮማይ") || slug.includes("oromay") || id.includes("oromay")) {
    return "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80";
  }
  if (titleLower.includes("yetoqolefebet") || titleLower.includes("ቁልፍ") || slug.includes("kulf") || id.includes("kulf")) {
    return "https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?auto=format&fit=crop&w=800&q=80";
  }
  if (titleLower.includes("egre") || titleLower.includes("እግረ") || slug.includes("egre") || id.includes("egre")) {
    return "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80";
  }
  if (titleLower.includes("alweledim") || titleLower.includes("አልወለድም") || slug.includes("alweledim") || id.includes("alweledim")) {
    return "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80";
  }
  if (titleLower.includes("bashager") || titleLower.includes("አድማስ") || slug.includes("bashager") || id.includes("bashager")) {
    return "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80";
  }
  if (titleLower.includes("derasew") || titleLower.includes("ደራሲው") || slug.includes("derasew") || id.includes("derasew")) {
    return "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80";
  }
  if (titleLower.includes("hiwete") || titleLower.includes("ሕይወቴና") || slug.includes("hiwete") || id.includes("hiwete")) {
    return "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80";
  }
  if (titleLower.includes("yesat") || titleLower.includes("እሳት") || slug.includes("yesat") || id.includes("yesat")) {
    return "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80";
  }
  if (titleLower.includes("taytu") || titleLower.includes("ጣይቱ") || slug.includes("taytu") || id.includes("taytu")) {
    return "https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?auto=format&fit=crop&w=800&q=80";
  }
  if (titleLower.includes("mahlet") || titleLower.includes("ማህሌት") || slug.includes("mahlet") || id.includes("mahlet")) {
    return "https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=800&q=80";
  }
  if (titleLower.includes("lenes") || titleLower.includes("ለእኔስ") || slug.includes("lenes") || id.includes("lenes")) {
    return "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80";
  }

  // Fallback high quality book photography
  return "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80";
}

export const INITIAL_AUTHORS: Author[] = [
  {
    id: "auth-haddis",
    name: "Haddis Alemayehu (ሀዲስ ዓለማየሁ)",
    slug: "haddis-alemayehu",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80",
    bio: "Renowned Ethiopian statesman and novelist, author of the landmark Amharic masterpiece 'Fiqir Eske Mequabir' (Love unto the Crypt).",
    active: true,
    bookCount: 1
  },
  {
    id: "auth-bealu",
    name: "Bealu Girma (በአሉ ግርማ)",
    slug: "bealu-girma",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    bio: "Prominent Ethiopian journalist, author, and literary icon who wrote 'Oromay', 'Keadmas Bashager', and 'Derasew'.",
    active: true,
    bookCount: 3
  },
  {
    id: "auth-mehret",
    name: "Dr. Mehret Debebe (ዶ/ር ምሕረት ደበበ)",
    slug: "dr-mehret-debebe",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    bio: "Renowned psychiatrist, speaker, and author of bestselling Amharic personal transformation books including 'Yetoqolefebet Kulf' and 'Egre Menged'.",
    active: true,
    bookCount: 2
  },
  {
    id: "auth-abe-gubegna",
    name: "Abe Gubegna (ዓቤ ጉበኛ)",
    slug: "abe-gubegna",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
    bio: "Famous Ethiopian novelist and playwright best known for his philosophical and social justice novel 'Alweledim'.",
    active: true,
    bookCount: 1
  },
  {
    id: "auth-haile-selassie",
    name: "Emperor Haile Selassie I (ቀዳማዊ ኃይለ ሥላሴ)",
    slug: "haile-selassie",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80",
    bio: "Emperor of Ethiopia whose autobiography 'Hiwete ena YeEthiopia Erimja' chronicles modern Ethiopian history and international diplomacy.",
    active: true,
    bookCount: 1
  },
  {
    id: "auth-tsegaye",
    name: "Laureate Tsegaye Gebre-Medhin (ሎሬ特 ፀጋዬ ገብረመድህን)",
    slug: "tsegaye-gebre-medhin",
    image: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80",
    bio: "Poet Laureate of Ethiopia, playwright, art director, and author of 'Yesat Wey Abeba'.",
    active: true,
    bookCount: 1
  },
  {
    id: "auth-lapiso",
    name: "Prof. Lapiso G. Dilebo (ፕሮፌሰር ላፕሶ ጌታሁን)",
    slug: "lapiso-dilebo",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80",
    bio: "Ethiopian historian and scholar documenting the Battle of Adwa and the leadership of Empress Taytu Betul.",
    active: true,
    bookCount: 1
  },
  {
    id: "auth-birhanu",
    name: "Birhanu Zerihun (ብርሃኑ ዘሪሁን)",
    slug: "birhanu-zerihun",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
    bio: "Celebrated Ethiopian writer and journalist, author of 'Mahlet', 'YeTebeka Wuha', and historical trilogies.",
    active: true,
    bookCount: 1
  },
  {
    id: "auth-adam-reta",
    name: "Adam Reta (አዳም ረጣ)",
    slug: "adam-reta",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    bio: "Master of contemporary Amharic fiction, innovator of the 'Ultra-Nebelbal' literary style, author of 'Lenes Maneh' and 'Zhantoz'.",
    active: true,
    bookCount: 1
  }
];

export const INITIAL_BOOKS: Book[] = [
  {
    id: "book-fiqir-eske-mequabir",
    title: "ፍቅር እስከ መቃብር (Fiqir Eske Mequabir)",
    slug: "fiqir-eske-mequabir",
    description: "በኢትዮጵያ ሥነ-ጽሑፍ ታሪክ ውስጥ ትልቁን ሥፍራ የያዘና በፊውዳሉ ሥርዓት ውስጥ የነበረውን የደሃና የሀብታም የፍቅር መከራ፣ የማህበረሰብ ዕሴትና ውበት በጥልቀት የሚተርክ ድንቅ ልብወለድ።",
    authorId: "auth-haddis",
    authorName: "ሀዲስ ዓለማየሁ (Haddis Alemayehu)",
    categoryId: "cat-amharic-lit",
    categoryName: "Amharic Literature",
    price: 450,
    discountPrice: 380,
    currency: "ETB",
    coverImage: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80",
    ISBN: "978-99944-0-012-3",
    publisher: "ሜጋ አታሚ ድርጅት (Mega Publishing)",
    publicationDate: "1968-04-12",
    pages: 528,
    language: "Amharic",
    stock: 45,
    soldCount: 120,
    ratingAverage: 4.9,
    reviewCount: 38,
    featured: true,
    newArrival: false,
    active: true
  },
  {
    id: "book-oromay",
    title: "ኦሮማይ (Oromay)",
    slug: "oromay",
    description: "በኤርትራ ቀይ ኮከብ ዘመቻ ወቅት በነበረው የፖለቲካና የጦርነት ውጥረት፣ የመንግሥት ቢሮክራሲና የሰው ልጅ የሞራል ትግል ዙሪያ የሚያጠነጥን ታዋቂና እውነተኛ የፖለቲካ ልብወለድ።",
    authorId: "auth-bealu",
    authorName: "በአሉ ግርማ (Bealu Girma)",
    categoryId: "cat-amharic-lit",
    categoryName: "Amharic Literature",
    price: 420,
    discountPrice: 360,
    currency: "ETB",
    coverImage: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80",
    ISBN: "978-99944-1-045-8",
    publisher: "ኩራዝ አታሚ ድርጅት (Kuraz Publishing)",
    publicationDate: "1983-09-01",
    pages: 382,
    language: "Amharic",
    stock: 3,
    soldCount: 95,
    ratingAverage: 4.8,
    reviewCount: 29,
    featured: true,
    newArrival: false,
    active: true
  },
  {
    id: "book-yetoqolefebet-kulf",
    title: "የተቆለፈበት ቁልፍ (Yetoqolefebet Kulf)",
    slug: "yetoqolefebet-kulf",
    description: "በሰው ልጅ የአስተሳሰብ ውቅር፣ የውስጥ አቅም፣ የአእምሮ እገታና አመለካከት ለውጥ ላይ ያተኮረና በብዙ ሺህ የሚቆጠሩ ኢትዮጵያውያን ዘንድ ተወዳጅነትን ያተረፈ የሥነ-ልቦና መጽሐፍ።",
    authorId: "auth-mehret",
    authorName: "ዶ/ር ምሕረት ደበበ (Dr. Mehret Debebe)",
    categoryId: "cat-self-dev",
    categoryName: "Self-Development & Personal Growth",
    price: 480,
    discountPrice: 420,
    currency: "ETB",
    coverImage: "https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?auto=format&fit=crop&w=800&q=80",
    ISBN: "978-99944-3-112-0",
    publisher: "አዲስ ህይወት ማህተም",
    publicationDate: "2013-05-15",
    pages: 310,
    language: "Amharic",
    stock: 60,
    soldCount: 210,
    ratingAverage: 4.9,
    reviewCount: 45,
    featured: true,
    newArrival: true,
    active: true
  },
  {
    id: "book-egre-menged",
    title: "እግረ መንገድ (Egre Menged)",
    slug: "egre-menged",
    description: "የሕይወትን ጉዞ፣ የውሳኔዎችን ተፅዕኖ፣ የታሪክና የዕድል ትስስርን በምሳሌያዊና በጥበብ የተሞላ አቀራረብ የሚያቀርብ የዶ/ር ምሕረት ደበበ ሁለተኛው ተወዳጅ መጽሐፍ።",
    authorId: "auth-mehret",
    authorName: "ዶ/ር ምሕረት ደበበ (Dr. Mehret Debebe)",
    categoryId: "cat-self-dev",
    categoryName: "Self-Development & Personal Growth",
    price: 460,
    discountPrice: 390,
    currency: "ETB",
    coverImage: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80",
    ISBN: "978-99944-3-220-2",
    publisher: "አዲስ ህይወት ማህተም",
    publicationDate: "2018-11-10",
    pages: 288,
    language: "Amharic",
    stock: 35,
    soldCount: 140,
    ratingAverage: 4.8,
    reviewCount: 31,
    featured: true,
    newArrival: true,
    active: true
  },
  {
    id: "book-alweledim",
    title: "አልወለድም (Alweledim)",
    slug: "alweledim",
    description: "የሰው ልጅ ነፃነት፣ ፍትሕ፣ የሥልጣን ጭቆናና የማህበራዊ እኩልነት ጥያቄዎችን በኃይለኛ ፍልስፍናዊ ገጸ-ባህርይ አማካኝነት ያቀረበ የዓቤ ጉበኛ ተጠቃሽ የትግል ልብወለድ።",
    authorId: "auth-abe-gubegna",
    authorName: "ዓቤ ጉበኛ (Abe Gubegna)",
    categoryId: "cat-amharic-lit",
    categoryName: "Amharic Literature",
    price: 390,
    discountPrice: 330,
    currency: "ETB",
    coverImage: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
    ISBN: "978-99944-0-334-1",
    publisher: "ብርሃንና ሰላም ማተሚያ ድርጅት",
    publicationDate: "1963-02-20",
    pages: 240,
    language: "Amharic",
    stock: 18,
    soldCount: 88,
    ratingAverage: 4.7,
    reviewCount: 22,
    featured: false,
    newArrival: false,
    active: true
  },
  {
    id: "book-keadmas-bashager",
    title: "ከአድማስ ባሻገር (Keadmas Bashager)",
    slug: "keadmas-bashager",
    description: "በኢትዮጵያ የከተማ ህይወት፣ የትምህርት ጥማትና የገጠሩ ማህበረሰብ ዕጣ ፈንታ መካከል ያለውን ሽግግር የሚያሳይ የበአሉ ግርማ የመጀመሪያ ድንቅ ልብወለድ።",
    authorId: "auth-bealu",
    authorName: "በአሉ ግርማ (Bealu Girma)",
    categoryId: "cat-amharic-lit",
    categoryName: "Amharic Literature",
    price: 400,
    discountPrice: 340,
    currency: "ETB",
    coverImage: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    ISBN: "978-99944-1-088-3",
    publisher: "ኩራዝ አታሚ ድርጅት",
    publicationDate: "1970-08-14",
    pages: 295,
    language: "Amharic",
    stock: 22,
    soldCount: 75,
    ratingAverage: 4.8,
    reviewCount: 19,
    featured: false,
    newArrival: false,
    active: true
  },
  {
    id: "book-derasew",
    title: "ደራሲው (Derasew)",
    slug: "derasew",
    description: "የደራሲነት ህይወት፣ የፈጠራ ውጥረት፣ የከተማይቱ የምሽት ህይወትና የሰው ልጅ የፍቅርና የስኬት ምኞትን በቁልጭ ያለ ዘይቤ የሚያቀርብ ልብወለድ።",
    authorId: "auth-bealu",
    authorName: "በአሉ ግርማ (Bealu Girma)",
    categoryId: "cat-amharic-lit",
    categoryName: "Amharic Literature",
    price: 410,
    discountPrice: 350,
    currency: "ETB",
    coverImage: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80",
    ISBN: "978-99944-1-011-2",
    publisher: "ኩራዝ አታሚ ድርጅት",
    publicationDate: "1980-03-10",
    pages: 312,
    language: "Amharic",
    stock: 15,
    soldCount: 64,
    ratingAverage: 4.7,
    reviewCount: 17,
    featured: false,
    newArrival: false,
    active: true
  },
  {
    id: "book-hiwete-haile-selassie",
    title: "ሕይወቴና የኢትዮጵያ እርምጃ (Hiwete ena YeEthiopia Erimja)",
    slug: "hiwete-haile-selassie",
    description: "የቀዳማዊ አፄ ኃይለ ሥላሴ የራሳቸው የህይወት ታሪክና የኢትዮጵያ ዘመናዊ የዲፕሎማሲ፣ የትምህርትና የፖለቲካ እድገት ማስታወሻ መጽሐፍ።",
    authorId: "auth-haile-selassie",
    authorName: "ቀዳማዊ ኃይለ ሥላሴ (Emperor Haile Selassie I)",
    categoryId: "cat-history",
    categoryName: "Ethiopian History & Heritage",
    price: 620,
    discountPrice: 540,
    currency: "ETB",
    coverImage: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80",
    ISBN: "978-99944-5-001-9",
    publisher: "የብርሃንና ሰላም ማተሚያ ድርጅት",
    publicationDate: "1973-11-02",
    pages: 480,
    language: "Amharic",
    stock: 20,
    soldCount: 110,
    ratingAverage: 4.9,
    reviewCount: 35,
    featured: true,
    newArrival: false,
    active: true
  },
  {
    id: "book-yesat-wey-abeba",
    title: "የእሳት ወይ አበባ (Yesat Wey Abeba)",
    slug: "yesat-wey-abeba",
    description: "የብሔራዊ ገጣሚው ሎሬት ፀጋዬ ገብረመድህን የታወቁ የፍቅር፣ የሀገር ፍቅር፣ የታሪክና የባህል ፍልስፍናዊ ግጥሞች ስብስብ።",
    authorId: "auth-tsegaye",
    authorName: "ሎሬት ፀጋዬ ገብረመድህን (Laureate Tsegaye)",
    categoryId: "cat-fiction",
    categoryName: "Fiction & Novels",
    price: 350,
    discountPrice: 290,
    currency: "ETB",
    coverImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
    ISBN: "978-99944-2-005-4",
    publisher: "አዲስ አበባ ዩኒቨርሲቲ ፕረስ",
    publicationDate: "1974-06-01",
    pages: 190,
    language: "Amharic",
    stock: 25,
    soldCount: 82,
    ratingAverage: 4.9,
    reviewCount: 26,
    featured: false,
    newArrival: true,
    active: true
  },
  {
    id: "book-etege-taytu",
    title: "እቴጌ ጣይቱ - የዓድዋ ድል (Etege Taytu)",
    slug: "etege-taytu",
    description: "የዓድዋ ድል መሐንዲስ የነበሩትን የእቴጌ ጣይቱ ብጡል ታሪክ፣ የዲፕሎማሲ ብልህነትና የሀገር ፍቅር ጀግንነት የሚያብራራ ታሪካዊ መጽሐፍ።",
    authorId: "auth-lapiso",
    authorName: "ፕሮፌሰር ላፕሶ ጌታሁን (Prof. Lapiso G. Dilebo)",
    categoryId: "cat-history",
    categoryName: "Ethiopian History & Heritage",
    price: 550,
    discountPrice: 480,
    currency: "ETB",
    coverImage: "https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?auto=format&fit=crop&w=800&q=80",
    ISBN: "978-99944-8-120-7",
    publisher: "ሜጋ አታሚ ድርጅት",
    publicationDate: "2004-03-01",
    pages: 360,
    language: "Amharic",
    stock: 14,
    soldCount: 95,
    ratingAverage: 4.8,
    reviewCount: 28,
    featured: true,
    newArrival: true,
    active: true
  },
  {
    id: "book-mahlet",
    title: "ማህሌት (Mahlet)",
    slug: "mahlet",
    description: "በቤተክርስቲያን መንፈሳዊ ዜማና በዘመናዊ ሙዚቃ ማህበረሰብ መካከል የተፈጠረን የባህልና የፍቅር ውጥረት የሚያሳይ ድንቅ የብርሃኑ ዘሪሁን ድርሰት።",
    authorId: "auth-birhanu",
    authorName: "ብርሃኑ ዘሪሁን (Birhanu Zerihun)",
    categoryId: "cat-amharic-lit",
    categoryName: "Amharic Literature",
    price: 380,
    discountPrice: 320,
    currency: "ETB",
    coverImage: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=800&q=80",
    ISBN: "978-99944-4-019-3",
    publisher: "ኩራዝ አታሚ ድርጅት",
    publicationDate: "1982-10-15",
    pages: 260,
    language: "Amharic",
    stock: 12,
    soldCount: 58,
    ratingAverage: 4.7,
    reviewCount: 15,
    featured: false,
    newArrival: false,
    active: true
  },
  {
    id: "book-lenes-maneh",
    title: "ለእኔስ ማነህ (Lenes Maneh)",
    slug: "lenes-maneh",
    description: "በኢትዮጵያ ዘመናዊ ሥነ-ጽሑፍ ውስጥ የቋንቋና የሥነ-ቅርፅ አብዮት ያመጣው የአዳም ረጣ አዲስ የልብወለድ ሥራ።",
    authorId: "auth-adam-reta",
    authorName: "አዳም ረጣ (Adam Reta)",
    categoryId: "cat-amharic-lit",
    categoryName: "Amharic Literature",
    price: 490,
    discountPrice: 430,
    currency: "ETB",
    coverImage: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80",
    ISBN: "978-99944-7-002-1",
    publisher: "ጃፍ አታሚ ድርጅት",
    publicationDate: "2020-01-20",
    pages: 420,
    language: "Amharic",
    stock: 28,
    soldCount: 130,
    ratingAverage: 4.9,
    reviewCount: 40,
    featured: true,
    newArrival: true,
    active: true
  }
];

export const INITIAL_COUPONS: Coupon[] = [
  {
    id: "coupon-welcome15",
    code: "WELCOME15",
    discountType: "percentage",
    discountValue: 15, // 15%
    minOrderAmount: 300,
    maxDiscount: 300,
    expirationDate: "2028-12-31",
    usageLimit: 1000,
    usedCount: 0,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "coupon-read200",
    code: "READ200",
    discountType: "fixed",
    discountValue: 200, // 200 ETB
    minOrderAmount: 1000,
    expirationDate: "2028-12-31",
    usageLimit: 500,
    usedCount: 0,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "coupon-ethiopia10",
    code: "ETHIOPIA10",
    discountType: "percentage",
    discountValue: 10,
    minOrderAmount: 200,
    expirationDate: "2028-12-31",
    usageLimit: 2000,
    usedCount: 0,
    active: true,
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_STORE_SETTINGS: StoreSettings = {
  storeName: "JJ Book Shopping",
  logo: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&auto=format&fit=crop&q=80",
  email: "support@jjbookshopping.com",
  phone: "+251 938 014 055",
  address: "Bole Medhaniallem, JJ Bookstore Building, Addis Ababa, Ethiopia",
  currency: "ETB",
  shippingFee: 150,
  minFreeShipping: 1500,
  taxRate: 15, // 15% VAT
  storeStatus: "open",
  socialLinks: {
    facebook: "https://facebook.com/jjbookshopping",
    telegram: "https://t.me/jjbookshopping",
    instagram: "https://instagram.com/jjbookshopping"
  },
  paymentGateways: {
    codEnabled: true,
    telebirrEnabled: true,
    telebirrNumber: "+251938014055 (JJ Book Shopping)",
    cbeBirrEnabled: true,
    cbeAccountNumber: "1000123456789 (Commercial Bank of Ethiopia)",
    chapaEnabled: true,
    bankTransferEnabled: true,
    bankDetails: "Bank of Abyssinia (አቢሲንያ ባንክ) Account: 155832444 (JJ Book Shopping)"
  }
};
