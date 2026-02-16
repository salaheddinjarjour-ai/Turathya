// ============================================
// TURATHYA - DEMO DATA & LOCALSTORAGE MANAGEMENT
// Auction data, lots, users, bids
// ============================================

// Initialize demo data on first load
function initializeData() {
  // Mock data disabled - data now comes from backend API
  // Clear any old mock data from localStorage
  localStorage.removeItem('turathya_auctions');
  localStorage.removeItem('turathya_lots');
  localStorage.removeItem('turathya_initialized_v2');
  
  // Only initialize empty arrays if they don't exist
  if (!localStorage.getItem('turathya_bids')) {
    localStorage.setItem('turathya_bids', JSON.stringify([]));
  }
  if (!localStorage.getItem('turathya_watchlist')) {
    localStorage.setItem('turathya_watchlist', JSON.stringify([]));
  }
}

// ==================== DEMO AUCTIONS ====================

const DEMO_AUCTIONS = [
  {
    id: 'auction-1',
    title: 'European Antiques & Fine Art',
    slug: 'european-antiques-fine-art',
    description: 'A curated collection of 18th and 19th century European furniture, paintings, and decorative arts from distinguished private collections.',
    category: 'Furniture & Art',
    startDate: '2026-01-15T10:00:00',
    endDate: '2026-01-25T20:00:00',
    location: 'London',
    lotCount: 45,
    image: 'assets/images/fine_art_painting_1768926352186.png',
    featured: true,
    status: 'ongoing',
    buyersPremium: 25
  },
  {
    id: 'auction-2',
    title: 'Asian Ceramics & Works of Art',
    slug: 'asian-ceramics-works-of-art',
    description: 'Exceptional Chinese and Japanese porcelain, jade carvings, and decorative objects spanning the Ming and Qing dynasties.',
    category: 'Ceramics & Porcelain',
    startDate: '2026-01-18T10:00:00',
    endDate: '2026-01-22T18:00:00',
    location: 'Hong Kong',
    lotCount: 32,
    image: 'assets/images/vintage_ceramics_1768926317654.png',
    featured: false,
    status: 'ongoing',
    buyersPremium: 25
  },
  {
    id: 'auction-3',
    title: 'Rare Books & Manuscripts',
    slug: 'rare-books-manuscripts',
    description: 'First editions, illuminated manuscripts, and important literary works from the 15th to 19th centuries.',
    category: 'Books & Manuscripts',
    startDate: '2026-01-20T10:00:00',
    endDate: '2026-01-28T19:00:00',
    location: 'New York',
    lotCount: 28,
    image: 'assets/images/rare_books_1768926387288.png',
    featured: true,
    status: 'ongoing',
    buyersPremium: 20
  },
  {
    id: 'auction-4',
    title: 'Fine Jewelry & Precious Stones',
    slug: 'fine-jewelry-precious-stones',
    description: 'Victorian and Edwardian jewelry, featuring rare gemstones, intricate goldwork, and pieces from renowned European houses.',
    category: 'Jewelry',
    startDate: '2026-01-16T10:00:00',
    endDate: '2026-01-21T17:00:00',
    location: 'Geneva',
    lotCount: 38,
    image: 'assets/images/antique_jewelry_1768926335354.png',
    featured: false,
    status: 'ongoing',
    buyersPremium: 25
  },
  {
    id: 'auction-5',
    title: 'Islamic & Middle Eastern Art',
    slug: 'islamic-middle-eastern-art',
    description: 'Ottoman silver, Persian carpets, and decorative arts from the Islamic world, 16th to 19th centuries.',
    category: 'Decorative Arts',
    startDate: '2026-01-19T10:00:00',
    endDate: '2026-01-26T18:00:00',
    location: 'Dubai',
    lotCount: 25,
    image: 'assets/images/antique_silver_1768926369103.png',
    featured: false,
    status: 'ongoing',
    buyersPremium: 25
  },
  {
    id: 'auction-6',
    title: 'French Impressionist Art',
    slug: 'french-impressionist-art',
    description: 'A remarkable collection of late 19th century French Impressionist paintings and sculptures from a distinguished European estate.',
    category: 'Fine Art',
    startDate: '2025-12-01T10:00:00',
    endDate: '2025-12-15T20:00:00',
    location: 'Paris',
    lotCount: 52,
    image: 'assets/images/fine_art_painting_1768926352186.png',
    featured: false,
    status: 'ended',
    buyersPremium: 25
  },
  {
    id: 'auction-7',
    title: 'English Silver Collection',
    slug: 'english-silver-collection',
    description: 'Georgian and Victorian sterling silver from renowned English silversmiths, including tea services, flatware, and decorative pieces.',
    category: 'Silver',
    startDate: '2025-11-10T10:00:00',
    endDate: '2025-11-25T18:00:00',
    location: 'London',
    lotCount: 38,
    image: 'assets/images/antique_silver_1768926369103.png',
    featured: false,
    status: 'ended',
    buyersPremium: 20
  },
  {
    id: 'auction-8',
    title: 'Modern Design & Furniture',
    slug: 'modern-design-furniture',
    description: 'Mid-century modern furniture and design objects from renowned designers including Eames, Saarinen, and Wegner.',
    category: 'Furniture & Art',
    startDate: '2026-01-22T10:00:00',
    endDate: '2026-01-30T19:00:00',
    location: 'Los Angeles',
    lotCount: 42,
    image: 'assets/images/antique_furniture_1768926300100.png',
    featured: false,
    status: 'ongoing',
    buyersPremium: 25
  },
  {
    id: 'auction-9',
    title: 'Vintage Watches & Timepieces',
    slug: 'vintage-watches-timepieces',
    description: 'Rare and collectible watches from prestigious Swiss manufacturers, including Rolex, Patek Philippe, and Audemars Piguet.',
    category: 'Jewelry',
    startDate: '2026-01-23T10:00:00',
    endDate: '2026-01-29T18:00:00',
    location: 'Geneva',
    lotCount: 35,
    image: 'assets/images/antique_jewelry_1768926335354.png',
    featured: true,
    status: 'ongoing',
    buyersPremium: 25
  },
  {
    id: 'auction-10',
    title: 'Ancient Coins & Medals',
    slug: 'ancient-coins-medals',
    description: 'Roman, Greek, and Byzantine coins, along with military medals and decorations from the 18th to 20th centuries.',
    category: 'Collectibles',
    startDate: '2026-01-24T10:00:00',
    endDate: '2026-02-01T17:00:00',
    location: 'Rome',
    lotCount: 28,
    image: 'assets/images/antique_silver_1768926369103.png',
    featured: false,
    status: 'ongoing',
    buyersPremium: 20
  },
  {
    id: 'auction-11',
    title: 'Japanese Woodblock Prints',
    slug: 'japanese-woodblock-prints',
    description: 'Ukiyo-e prints from the Edo and Meiji periods, featuring works by Hokusai, Hiroshige, and Utamaro.',
    category: 'Fine Art',
    startDate: '2026-01-25T10:00:00',
    endDate: '2026-02-02T19:00:00',
    location: 'Tokyo',
    lotCount: 31,
    image: 'assets/images/fine_art_painting_1768926352186.png',
    featured: false,
    status: 'ongoing',
    buyersPremium: 25
  },
  {
    id: 'auction-12',
    title: 'Antique Maps & Globes',
    slug: 'antique-maps-globes',
    description: 'Rare cartographic works from the 16th to 19th centuries, including world maps, celestial charts, and terrestrial globes.',
    category: 'Books & Manuscripts',
    startDate: '2026-01-26T10:00:00',
    endDate: '2026-02-03T18:00:00',
    location: 'Amsterdam',
    lotCount: 24,
    image: 'assets/images/rare_books_1768926387288.png',
    featured: false,
    status: 'ongoing',
    buyersPremium: 20
  },
  {
    id: 'auction-13',
    title: 'Art Deco Jewelry & Accessories',
    slug: 'art-deco-jewelry-accessories',
    description: '1920s and 1930s jewelry, compacts, and accessories featuring geometric designs and precious stones.',
    category: 'Jewelry',
    startDate: '2026-01-21T10:00:00',
    endDate: '2026-01-27T17:00:00',
    location: 'Paris',
    lotCount: 33,
    image: 'assets/images/antique_jewelry_1768926335354.png',
    featured: false,
    status: 'ongoing',
    buyersPremium: 25
  },
  {
    id: 'auction-14',
    title: 'Renaissance Manuscripts',
    slug: 'renaissance-manuscripts',
    description: 'Illuminated manuscripts and early printed books from the 15th and 16th centuries, including religious texts and scientific works.',
    category: 'Books & Manuscripts',
    startDate: '2025-10-15T10:00:00',
    endDate: '2025-10-30T19:00:00',
    location: 'Florence',
    lotCount: 19,
    image: 'assets/images/rare_books_1768926387288.png',
    featured: false,
    status: 'ended',
    buyersPremium: 20
  },
  {
    id: 'auction-15',
    title: 'Chinese Export Porcelain',
    slug: 'chinese-export-porcelain',
    description: 'Qing dynasty export porcelain made for European markets, featuring famille rose and blue and white patterns.',
    category: 'Ceramics & Porcelain',
    startDate: '2025-09-20T10:00:00',
    endDate: '2025-10-05T18:00:00',
    location: 'Hong Kong',
    lotCount: 27,
    image: 'assets/images/vintage_ceramics_1768926317654.png',
    featured: false,
    status: 'ended',
    buyersPremium: 25
  }
];

// ==================== DEMO LOTS ====================

const DEMO_LOTS = [
  // European Antiques & Fine Art
  {
    id: 'lot-1',
    auctionId: 'auction-1',
    lotNumber: 12,
    title: '18th Century Mahogany Writing Desk',
    category: 'Furniture',
    description: 'An exceptional George III mahogany writing desk, circa 1780, featuring ornate carved details, original brass hardware, and seven drawers with dovetail construction.',
    condition: 'Excellent. Minor age-appropriate wear. Original finish preserved.',
    provenance: 'Private English collection, acquired 1965',
    estimate: { min: 8000, max: 12000 },
    startingBid: 6000,
    currentBid: 8500,
    bidCount: 7,
    endDate: '2026-01-25T20:00:00',
    images: ['assets/images/antique_furniture_1768926300100.png'],
    shipping: 'Worldwide shipping available. White glove delivery service.',
    buyersPremium: 25,
    reserve: 7500,
    featured: true,
    status: 'active',
    finalPrice: null,
    sold: false
  },
  {
    id: 'lot-2',
    auctionId: 'auction-1',
    lotNumber: 24,
    title: '19th Century European Landscape',
    category: 'Paintings',
    description: 'Oil on canvas depicting a pastoral European countryside scene with river and bridge. Housed in original ornate gilded frame. Unsigned, attributed to English School.',
    condition: 'Very good. Canvas relined. Frame with minor gilt loss.',
    provenance: 'European private collection',
    estimate: { min: 15000, max: 20000 },
    startingBid: 12000,
    currentBid: 16500,
    bidCount: 12,
    endDate: '2026-01-25T20:00:00',
    images: ['assets/images/fine_art_painting_1768926352186.png'],
    shipping: 'Specialized art shipping available',
    buyersPremium: 25,
    reserve: 14000,
    featured: false,
    status: 'active',
    finalPrice: null,
    sold: false
  },
  // Asian Ceramics
  {
    id: 'lot-3',
    auctionId: 'auction-2',
    lotNumber: 8,
    title: 'Ming Dynasty Blue and White Porcelain Vase',
    category: 'Ceramics',
    description: 'Rare meiping vase with intricate floral scrollwork in cobalt blue. Classic Ming dynasty form and decoration. Height: 35cm.',
    condition: 'Excellent. No restoration. Minor age-appropriate crazing to glaze.',
    provenance: 'Hong Kong private collection, acquired 1982',
    estimate: { min: 45000, max: 65000 },
    startingBid: 35000,
    currentBid: 48000,
    bidCount: 15,
    endDate: '2026-01-22T18:00:00',
    images: ['assets/images/vintage_ceramics_1768926317654.png'],
    shipping: 'International shipping with specialized packing',
    buyersPremium: 25,
    reserve: 42000,
    featured: true,
    status: 'active',
    finalPrice: null,
    sold: false
  },
  // Rare Books
  {
    id: 'lot-4',
    auctionId: 'auction-3',
    lotNumber: 42,
    title: 'Collection of First Edition Leather-Bound Classics',
    category: 'Books',
    description: 'Five volumes of 18th and 19th century first editions in original leather bindings with gold embossing. Includes works by notable authors. Pages with age-appropriate foxing.',
    condition: 'Good to very good. Bindings intact. Some spine wear.',
    provenance: 'American private library',
    estimate: { min: 5000, max: 7500 },
    startingBid: 4000,
    currentBid: 5200,
    bidCount: 8,
    endDate: '2026-01-28T19:00:00',
    images: ['assets/images/rare_books_1768926387288.png'],
    shipping: 'Insured shipping worldwide',
    buyersPremium: 20,
    reserve: 4500,
    featured: false,
    status: 'active',
    finalPrice: null,
    sold: false
  },
  // Fine Jewelry
  {
    id: 'lot-5',
    auctionId: 'auction-4',
    lotNumber: 15,
    title: 'Victorian Gold and Garnet Brooch',
    category: 'Jewelry',
    description: 'Exceptional Victorian-era brooch in 14K gold with intricate filigree work. Set with Bohemian garnets and seed pearls. Circa 1880. Dimensions: 5.5cm diameter.',
    condition: 'Excellent. All stones secure. Original pin mechanism.',
    provenance: 'European estate',
    estimate: { min: 3500, max: 5000 },
    startingBid: 2800,
    currentBid: 3800,
    bidCount: 9,
    endDate: '2026-01-21T17:00:00',
    images: ['assets/images/antique_jewelry_1768926335354.png'],
    shipping: 'Fully insured international shipping',
    buyersPremium: 25,
    reserve: 3200,
    featured: false,
    status: 'active',
    finalPrice: null,
    sold: false
  },
  // Islamic Art
  {
    id: 'lot-6',
    auctionId: 'auction-5',
    lotNumber: 7,
    title: 'Ottoman Silver Serving Tray',
    category: 'Silver',
    description: 'Large circular silver tray with intricate hand-engraved arabesque patterns and calligraphy. Ottoman Empire, 19th century. Diameter: 42cm. Weight: 1.8kg.',
    condition: 'Very good. Minor surface wear consistent with age. No dents.',
    provenance: 'Middle Eastern private collection',
    estimate: { min: 6000, max: 9000 },
    startingBid: 5000,
    currentBid: 6500,
    bidCount: 6,
    endDate: '2026-01-26T18:00:00',
    images: ['assets/images/antique_silver_1768926369103.png'],
    shipping: 'Worldwide shipping available',
    buyersPremium: 25,
    reserve: 5500,
    featured: false,
    status: 'active',
    finalPrice: null,
    sold: false
  },
  // Past Auction Lots (French Impressionist Art - auction-6)
  {
    id: 'lot-7',
    auctionId: 'auction-6',
    lotNumber: 3,
    title: 'Monet-Style Garden Scene',
    category: 'Paintings',
    description: 'Impressionist oil painting of a garden with water lilies and bridge. Late 19th century, attributed to French School.',
    condition: 'Very good. Original frame.',
    provenance: 'French private collection',
    estimate: { min: 25000, max: 35000 },
    startingBid: 20000,
    currentBid: null,
    bidCount: 0,
    endDate: '2025-12-15T20:00:00',
    images: ['assets/images/fine_art_painting_1768926352186.png'],
    shipping: 'Specialized art shipping',
    buyersPremium: 25,
    reserve: 22000,
    featured: false,
    status: 'closed',
    finalPrice: 32000,
    sold: true
  },
  {
    id: 'lot-8',
    auctionId: 'auction-6',
    lotNumber: 15,
    title: 'Bronze Sculpture of Dancer',
    category: 'Sculpture',
    description: 'Late 19th century bronze sculpture depicting a ballet dancer. Signed on base.',
    condition: 'Excellent. Original patina.',
    provenance: 'European estate',
    estimate: { min: 8000, max: 12000 },
    startingBid: 6000,
    currentBid: null,
    bidCount: 0,
    endDate: '2025-12-15T20:00:00',
    images: ['assets/images/antique_furniture_1768926300100.png'],
    shipping: 'Worldwide shipping available',
    buyersPremium: 25,
    reserve: 7000,
    featured: false,
    status: 'closed',
    finalPrice: null,
    sold: false
  },
  // Past Auction Lots (English Silver - auction-7)
  {
    id: 'lot-9',
    auctionId: 'auction-7',
    lotNumber: 12,
    title: 'Georgian Sterling Silver Tea Service',
    category: 'Silver',
    description: 'Complete five-piece tea service in sterling silver. London hallmarks, circa 1820.',
    condition: 'Excellent. Minor surface wear.',
    provenance: 'English private collection',
    estimate: { min: 12000, max: 18000 },
    startingBid: 10000,
    currentBid: null,
    bidCount: 0,
    endDate: '2025-11-25T18:00:00',
    images: ['assets/images/antique_silver_1768926369103.png'],
    shipping: 'Insured worldwide shipping',
    buyersPremium: 20,
    reserve: 11000,
    featured: false,
    status: 'closed',
    finalPrice: 15500,
    sold: true
  },
  // Modern Design (auction-8)
  {
    id: 'lot-10',
    auctionId: 'auction-8',
    lotNumber: 5,
    title: 'Eames Lounge Chair and Ottoman',
    category: 'Furniture',
    description: 'Original 1956 production by Herman Miller. Rosewood veneer and black leather. Classic mid-century modern icon.',
    condition: 'Good vintage condition. Leather shows patina.',
    provenance: 'California private collection',
    estimate: { min: 4000, max: 6000 },
    startingBid: 3000,
    currentBid: 4200,
    bidCount: 4,
    endDate: '2026-01-30T19:00:00',
    images: ['assets/images/antique_furniture_1768926300100.png'],
    shipping: 'White glove delivery',
    buyersPremium: 25,
    reserve: 3500,
    featured: true,
    status: 'active',
    finalPrice: null,
    sold: false
  },
  // Vintage Watches (auction-9)
  {
    id: 'lot-11',
    auctionId: 'auction-9',
    lotNumber: 2,
    title: 'Rolex Submariner 5513',
    category: 'Watches',
    description: 'Stainless steel vintage divers watch, circa 1970. Matte dial with meters first. Original condition.',
    condition: 'Very good. Case unpolished.',
    provenance: 'Original owner',
    estimate: { min: 12000, max: 15000 },
    startingBid: 10000,
    currentBid: 13500,
    bidCount: 11,
    endDate: '2026-01-29T18:00:00',
    images: ['assets/images/antique_jewelry_1768926335354.png'],
    shipping: 'Insured express shipping',
    buyersPremium: 25,
    reserve: 11000,
    featured: true,
    status: 'active',
    finalPrice: null,
    sold: false
  },
  // Ancient Coins (auction-10)
  {
    id: 'lot-12',
    auctionId: 'auction-10',
    lotNumber: 22,
    title: 'Roman Gold Aureus of Nero',
    category: 'Coins',
    description: 'Gold aureus minted in Rome, 64-65 AD. Laureate head of Nero facing right. Reverse: Jupiter seated.',
    condition: 'About Extremely Fine.',
    provenance: 'Swiss collection',
    estimate: { min: 4000, max: 6000 },
    startingBid: 3500,
    currentBid: 3800,
    bidCount: 2,
    endDate: '2026-02-01T17:00:00',
    images: ['assets/images/antique_silver_1768926369103.png'],
    shipping: 'Insured shipping',
    buyersPremium: 20,
    reserve: 3800,
    featured: false,
    status: 'active',
    finalPrice: null,
    sold: false
  },
  // Japanese Prints (auction-11)
  {
    id: 'lot-13',
    auctionId: 'auction-11',
    lotNumber: 1,
    title: 'Hokusai - The Great Wave',
    category: 'Prints',
    description: 'The Great Wave off Kanagawa from Thirty-six Views of Mount Fuji. Woodblock print, circa 1831.',
    condition: 'Good impression and color. Minor trimming.',
    provenance: 'Japanese private collection',
    estimate: { min: 100000, max: 150000 },
    startingBid: 80000,
    currentBid: 95000,
    bidCount: 5,
    endDate: '2026-02-02T19:00:00',
    images: ['assets/images/fine_art_painting_1768926352186.png'],
    shipping: 'Specialized art shipping',
    buyersPremium: 25,
    reserve: 90000,
    featured: true,
    status: 'active',
    finalPrice: null,
    sold: false
  },
  // Maps (auction-12)
  {
    id: 'lot-14',
    auctionId: 'auction-12',
    lotNumber: 10,
    title: 'Blaeu World Map 1665',
    category: 'Maps',
    description: 'Double hemisphere world map with allegorical decorations. Hand-colored copper engraving.',
    condition: 'Excellent. Wide margins.',
    provenance: 'Dutch estate',
    estimate: { min: 8000, max: 12000 },
    startingBid: 6000,
    currentBid: 6000,
    bidCount: 1,
    endDate: '2026-02-03T18:00:00',
    images: ['assets/images/rare_books_1768926387288.png'],
    shipping: 'Flat packed insured shipping',
    buyersPremium: 20,
    reserve: 7000,
    featured: false,
    status: 'active',
    finalPrice: null,
    sold: false
  },
  // Art Deco Jewelry (auction-13)
  {
    id: 'lot-15',
    auctionId: 'auction-13',
    lotNumber: 8,
    title: 'Art Deco Diamond and Sapphire Bracelet',
    category: 'Jewelry',
    description: 'Platinum bracelet set with old European cut diamonds and calibré cut sapphires. Geometric design, circa 1925.',
    condition: 'Excellent. All stones original.',
    provenance: 'New York estate',
    estimate: { min: 18000, max: 24000 },
    startingBid: 14000,
    currentBid: 16000,
    bidCount: 3,
    endDate: '2026-01-27T17:00:00',
    images: ['assets/images/antique_jewelry_1768926335354.png'],
    shipping: 'Armored transport',
    buyersPremium: 25,
    reserve: 15000,
    featured: true,
    status: 'active',
    finalPrice: null,
    sold: false
  },
  // Renaissance Manuscripts (auction-14)
  {
    id: 'lot-16',
    auctionId: 'auction-14',
    lotNumber: 3,
    title: 'Illuminated Book of Hours',
    category: 'Manuscripts',
    description: 'Vellum manuscript with 12 full-page miniatures. France, mid-15th century. Original binding.',
    condition: 'Very good. Colors vibrant.',
    provenance: 'Monastery library',
    estimate: { min: 30000, max: 50000 },
    startingBid: 25000,
    currentBid: null,
    bidCount: 0,
    endDate: '2025-10-30T19:00:00',
    images: ['assets/images/rare_books_1768926387288.png'],
    shipping: 'Specialized shipping',
    buyersPremium: 20,
    reserve: 28000,
    featured: true,
    status: 'closed',
    finalPrice: 42000,
    sold: true
  },
  // Chinese Porcelain (auction-15)
  {
    id: 'lot-17',
    auctionId: 'auction-15',
    lotNumber: 12,
    title: 'Pair of Famille Rose Vases',
    category: 'Porcelain',
    description: 'Large pair of export soldier vases with floral decoration. Qianlong period.',
    condition: 'One with hairline crack on rim.',
    provenance: 'English country house',
    estimate: { min: 15000, max: 20000 },
    startingBid: 12000,
    currentBid: null,
    bidCount: 0,
    endDate: '2025-10-05T18:00:00',
    images: ['assets/images/vintage_ceramics_1768926317654.png'],
    shipping: 'Crated shipping',
    buyersPremium: 25,
    reserve: 14000,
    featured: false,
    status: 'closed',
    finalPrice: 13000,
    sold: false
  }
];

// ==================== DEMO USERS ====================

const DEMO_USERS = [
  {
    id: 'user-1',
    phone: '+1234567890',
    password: 'demo123', // In production, this would be hashed
    name: 'Demo User',
    role: 'user',
    status: 'approved', // pending, approved, rejected, suspended
    registeredDate: '2026-01-01T00:00:00'
  },
  {
    id: 'admin-1',
    phone: '+9876543210',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    status: 'approved',
    registeredDate: '2026-01-01T00:00:00'
  }
];

// ==================== DATA ACCESS FUNCTIONS ====================

// Auctions
function getAuctions() {
  return JSON.parse(localStorage.getItem('turathya_auctions') || '[]');
}

function getAuctionById(id) {
  const auctions = getAuctions();
  return auctions.find(a => a.id === id);
}

function getAuctionBySlug(slug) {
  const auctions = getAuctions();
  return auctions.find(a => a.slug === slug);
}

function saveAuction(auction) {
  const auctions = getAuctions();
  const index = auctions.findIndex(a => a.id === auction.id);
  if (index >= 0) {
    auctions[index] = auction;
  } else {
    auctions.push(auction);
  }
  localStorage.setItem('turathya_auctions', JSON.stringify(auctions));
}

// Featured, Ongoing, and Past Auctions
function getFeaturedAuctions() {
  return getAuctions().filter(a => a.featured === true && a.status === 'ongoing');
}

function getOngoingAuctions() {
  return getAuctions().filter(a => a.status === 'ongoing');
}

function getPastAuctions() {
  return getAuctions().filter(a => a.status === 'ended');
}


// Lots
function getLots() {
  return JSON.parse(localStorage.getItem('turathya_lots') || '[]');
}

function getLotById(id) {
  const lots = getLots();
  return lots.find(l => l.id === id);
}

function getLotsByAuctionId(auctionId) {
  const lots = getLots();
  return lots.filter(l => l.auctionId === auctionId);
}

function saveLot(lot) {
  const lots = getLots();
  const index = lots.findIndex(l => l.id === lot.id);
  if (index >= 0) {
    lots[index] = lot;
  } else {
    lots.push(lot);
  }
  localStorage.setItem('turathya_lots', JSON.stringify(lots));
}

// Featured, Active, and Closed Lots
function getFeaturedLots(auctionId) {
  return getLotsByAuctionId(auctionId).filter(l => l.featured === true && l.status === 'active');
}

function getActiveLots(auctionId) {
  return getLotsByAuctionId(auctionId).filter(l => l.status === 'active');
}

function getClosedLots(auctionId) {
  return getLotsByAuctionId(auctionId).filter(l => l.status === 'closed');
}


// Bids
function getBids() {
  return JSON.parse(localStorage.getItem('turathya_bids') || '[]');
}

function getBidsByLotId(lotId) {
  const bids = getBids();
  return bids.filter(b => b.lotId === lotId).sort((a, b) => b.amount - a.amount);
}

function placeBid(lotId, userId, amount) {
  const bids = getBids();
  const bid = {
    id: `bid-${Date.now()}`,
    lotId,
    userId,
    amount,
    timestamp: new Date().toISOString()
  };
  bids.push(bid);
  localStorage.setItem('turathya_bids', JSON.stringify(bids));

  // Update lot current bid
  const lot = getLotById(lotId);
  if (lot) {
    lot.currentBid = amount;
    lot.bidCount = (lot.bidCount || 0) + 1;
    saveLot(lot);
  }

  return bid;
}

// Watchlist
function getWatchlist(userId) {
  const watchlist = JSON.parse(localStorage.getItem('turathya_watchlist') || '[]');
  return watchlist.filter(w => w.userId === userId);
}

function addToWatchlist(userId, lotId) {
  const watchlist = JSON.parse(localStorage.getItem('turathya_watchlist') || '[]');
  if (!watchlist.find(w => w.userId === userId && w.lotId === lotId)) {
    watchlist.push({ userId, lotId, addedDate: new Date().toISOString() });
    localStorage.setItem('turathya_watchlist', JSON.stringify(watchlist));
  }
}

function removeFromWatchlist(userId, lotId) {
  let watchlist = JSON.parse(localStorage.getItem('turathya_watchlist') || '[]');
  watchlist = watchlist.filter(w => !(w.userId === userId && w.lotId === lotId));
  localStorage.setItem('turathya_watchlist', JSON.stringify(watchlist));
}

function isInWatchlist(userId, lotId) {
  const watchlist = getWatchlist(userId);
  return watchlist.some(w => w.lotId === lotId);
}

// Users
function getUsers() {
  return JSON.parse(localStorage.getItem('turathya_users') || '[]');
}

function getUserById(id) {
  const users = getUsers();
  return users.find(u => u.id === id);
}

function getUserByPhone(phone) {
  const users = getUsers();
  return users.find(u => u.phone === phone);
}

function saveUser(user) {
  const users = getUsers();
  const index = users.findIndex(u => u.id === user.id);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem('turathya_users', JSON.stringify(users));
}

function deleteUser(userId) {
  let users = getUsers();
  users = users.filter(u => u.id !== userId);
  localStorage.setItem('turathya_users', JSON.stringify(users));
}

// Initialize data on page load
initializeData();
