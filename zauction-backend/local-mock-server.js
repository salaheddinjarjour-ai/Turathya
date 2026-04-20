#!/usr/bin/env node
/**
 * TURATHYA — Local Mock API Server  (v2)
 * Matches exact field names expected by the frontend JS.
 * Start:  node local-mock-server.js
 */
'use strict';

const http = require('http');
const PORT = process.env.PORT || 3000;

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
const NOW  = Date.now();
const H    = 3600000;
const DAY  = 24 * H;
const WEEK = 7 * DAY;

function iso(ms) { return new Date(ms).toISOString(); }

/* Hero-slider images — root-relative paths work from any page depth */
const IMG = {
  painting:  '/assets/images/hero-slide-painting.jpg',
  furniture: '/assets/images/hero-slide-furniture.jpg',
  jewelry:   '/assets/images/hero-slide-jewelry.jpg',
  ceramics:  '/assets/images/hero-slide-ceramics.jpg',
};

/* ═══════════════════════════════════════════════
   AUCTIONS
   Field names match what the frontend JS reads:
     id, title, title_ar, category, location,
     status, featured, lot_count,
     start_date, end_date, image_url
═══════════════════════════════════════════════ */
const AUCTIONS = [
  {
    id: 'auc-001',
    title:          'Heritage Coins & Medals',
    title_en:       'Heritage Coins & Medals',
    title_ar:       'العملات والميداليات التراثية',
    description:    'A curated collection of rare Arabic and Ottoman coins spanning five centuries.',
    description_en: 'A curated collection of rare Arabic and Ottoman coins spanning five centuries.',
    description_ar: 'مجموعة مختارة من العملات العربية والعثمانية النادرة عبر خمسة قرون.',
    category:       'Coins & Medals',
    location:       'Riyadh, KSA',
    status: 'active',
    featured: true,
    lot_count: 24,
    start_date: iso(NOW - 2 * DAY),
    end_date:   iso(NOW + 4 * H),
    image_url:  IMG.painting,
  },
  {
    id: 'auc-002',
    title:          'Islamic Manuscripts & Calligraphy',
    title_en:       'Islamic Manuscripts & Calligraphy',
    title_ar:       'المخطوطات الإسلامية والخط العربي',
    description:    'Rare manuscripts, folios, and works of classical Arabic calligraphy.',
    description_en: 'Rare manuscripts, folios, and works of classical Arabic calligraphy.',
    description_ar: 'مخطوطات نادرة وصفحات وأعمال من الخط العربي الكلاسيكي.',
    category:       'Manuscripts',
    location:       'Jeddah, KSA',
    status: 'active',
    featured: true,
    lot_count: 18,
    start_date: iso(NOW - 3 * DAY),
    end_date:   iso(NOW + 22 * H),
    image_url:  IMG.furniture,
  },
  {
    id: 'auc-003',
    title:          'Arabian Antiquities',
    title_en:       'Arabian Antiquities',
    title_ar:       'الآثار العربية',
    description:    'Pre-Islamic and early Islamic artifacts from the Arabian Peninsula.',
    description_en: 'Pre-Islamic and early Islamic artifacts from the Arabian Peninsula.',
    description_ar: 'قطع أثرية من ما قبل الإسلام وصدر الإسلام من شبه الجزيرة العربية.',
    category:       'Antiquities',
    location:       'Dubai, UAE',
    status: 'upcoming',
    featured: false,
    lot_count: 31,
    start_date: iso(NOW + 3 * DAY),
    end_date:   iso(NOW + 10 * DAY),
    image_url:  IMG.jewelry,
  },
  {
    id: 'auc-004',
    title:          'Levantine Art & Décor',
    title_en:       'Levantine Art & Décor',
    title_ar:       'الفن والزخرفة الشامية',
    description:    'Fine art and decorative objects from the Levant region, 17th–20th century.',
    description_en: 'Fine art and decorative objects from the Levant region, 17th–20th century.',
    description_ar: 'أعمال فنية وتحف زخرفية من منطقة الشام، القرن السابع عشر حتى العشرين.',
    category:       'Fine Art',
    location:       'Amman, Jordan',
    status: 'upcoming',
    featured: false,
    lot_count: 45,
    start_date: iso(NOW + 7 * DAY),
    end_date:   iso(NOW + 14 * DAY),
    image_url:  IMG.ceramics,
  },
  {
    id: 'auc-005',
    title:          'Modern Arab Masters',
    title_en:       'Modern Arab Masters',
    title_ar:       'أساتذة الفن العربي الحديث',
    description:    'Works by 20th-century Arab painters and sculptors.',
    description_en: 'Works by 20th-century Arab painters and sculptors.',
    description_ar: 'أعمال رسامين ونحاتين عرب من القرن العشرين.',
    category:       'Paintings',
    location:       'Kuwait City, Kuwait',
    status: 'closed',
    featured: false,
    lot_count: 22,
    start_date: iso(NOW - 2 * WEEK),
    end_date:   iso(NOW - WEEK),
    image_url:  IMG.painting,
  },
];

/* ═══════════════════════════════════════════════
   LOTS
   Fields: id, title, title_ar, auction_id,
     lot_number, category, status,
     start_date, end_date,
     starting_bid, current_bid, estimate_low,
     estimate_high, final_price,
     primary_image
═══════════════════════════════════════════════ */
const LOTS = [
  /* auc-001 — Heritage Coins */
  { id:'lot-001', auction_id:'auc-001', lot_number:1,  title:'Ottoman Gold Coin — 1788',          title_en:'Ottoman Gold Coin — 1788',          title_ar:'عملة ذهبية عثمانية — ١٧٨٨',           category:'Coins',        status:'active',   start_date:iso(NOW-2*DAY), end_date:iso(NOW+4*H),    starting_bid:800,  current_bid:950,   estimate_low:800,  estimate_high:1200, final_price:null, primary_image:IMG.painting  },
  { id:'lot-002', auction_id:'auc-001', lot_number:2,  title:'Abbasid Silver Dirham — 9th C',     title_en:'Abbasid Silver Dirham — 9th C',     title_ar:'درهم فضي عباسي — القرن التاسع',       category:'Coins',        status:'active',   start_date:iso(NOW-2*DAY), end_date:iso(NOW+4*H),    starting_bid:1500, current_bid:2100,  estimate_low:1500, estimate_high:2500, final_price:null, primary_image:IMG.jewelry   },
  { id:'lot-003', auction_id:'auc-001', lot_number:3,  title:'Fatimid Dinar — Cairo Mint',        title_en:'Fatimid Dinar — Cairo Mint',        title_ar:'دينار فاطمي — دار ضرب القاهرة',       category:'Coins',        status:'active',   start_date:iso(NOW-2*DAY), end_date:iso(NOW+4*H),    starting_bid:3000, current_bid:4200,  estimate_low:3000, estimate_high:5000, final_price:null, primary_image:IMG.ceramics  },
  /* auc-002 — Manuscripts */
  { id:'lot-004', auction_id:'auc-002', lot_number:1,  title:'Quran Folio — Maghrebi Script',     title_en:'Quran Folio — Maghrebi Script',     title_ar:'صفحة من القرآن الكريم — خط مغربي',   category:'Manuscripts',  status:'active',   start_date:iso(NOW-3*DAY), end_date:iso(NOW+22*H),   starting_bid:5000, current_bid:6500,  estimate_low:5000, estimate_high:8000, final_price:null, primary_image:IMG.furniture },
  { id:'lot-005', auction_id:'auc-002', lot_number:2,  title:'Calligraphy Panel — Ibn Muqlah',    title_en:'Calligraphy Panel — Ibn Muqlah',    title_ar:'لوحة خطّ — بأسلوب ابن مقلة',          category:'Calligraphy',  status:'active',   start_date:iso(NOW-3*DAY), end_date:iso(NOW+22*H),   starting_bid:2000, current_bid:2800,  estimate_low:2000, estimate_high:3500, final_price:null, primary_image:IMG.painting  },
  /* auc-003 — Antiquities (upcoming) */
  { id:'lot-006', auction_id:'auc-003', lot_number:1,  title:'Bronze Incense Burner — Pre-Islamic',title_en:'Bronze Incense Burner — Pre-Islamic',title_ar:'مبخرة برونزية — ما قبل الإسلام',     category:'Artifacts',    status:'upcoming', start_date:iso(NOW+3*DAY), end_date:iso(NOW+10*DAY), starting_bid:4000, current_bid:0,     estimate_low:4000, estimate_high:7000, final_price:null, primary_image:IMG.jewelry   },
  { id:'lot-007', auction_id:'auc-003', lot_number:2,  title:'Alabaster Vessel — South Arabia',   title_en:'Alabaster Vessel — South Arabia',   title_ar:'إناء من المرمر — جنوب الجزيرة',       category:'Artifacts',    status:'upcoming', start_date:iso(NOW+3*DAY), end_date:iso(NOW+10*DAY), starting_bid:6000, current_bid:0,     estimate_low:6000, estimate_high:10000,final_price:null, primary_image:IMG.ceramics  },
  /* auc-004 — Levantine (upcoming) */
  { id:'lot-008', auction_id:'auc-004', lot_number:1,  title:'Damascus Tilework Panel — 18th C',  title_en:'Damascus Tilework Panel — 18th C',  title_ar:'لوحة بلاط دمشقية — القرن الثامن عشر',category:'Decor',        status:'upcoming', start_date:iso(NOW+7*DAY), end_date:iso(NOW+14*DAY),starting_bid:3500, current_bid:0,     estimate_low:3500, estimate_high:6000, final_price:null, primary_image:IMG.furniture },
  { id:'lot-009', auction_id:'auc-004', lot_number:2,  title:'Mashrabiya Window Screen',          title_en:'Mashrabiya Window Screen',          title_ar:'شاشة مشربية خشبية',                   category:'Decor',        status:'upcoming', start_date:iso(NOW+7*DAY), end_date:iso(NOW+14*DAY),starting_bid:2500, current_bid:0,     estimate_low:2500, estimate_high:4500, final_price:null, primary_image:IMG.ceramics  },
  /* auc-005 — Modern Masters (closed) */
  { id:'lot-010', auction_id:'auc-005', lot_number:1,  title:'Ismail Shammout — Oil Painting',    title_en:'Ismail Shammout — Oil Painting',    title_ar:'إسماعيل شموط — لوحة زيتية',           category:'Paintings',    status:'sold',     start_date:iso(NOW-2*WEEK),end_date:iso(NOW-WEEK),  starting_bid:15000,current_bid:22000, estimate_low:15000,estimate_high:25000,final_price:22000,primary_image:IMG.painting  },
  { id:'lot-011', auction_id:'auc-005', lot_number:2,  title:'Paul Guiragossian — Watercolour',   title_en:'Paul Guiragossian — Watercolour',   title_ar:'بول غيراغوسيان — ألوان مائية',         category:'Paintings',    status:'unsold',   start_date:iso(NOW-2*WEEK),end_date:iso(NOW-WEEK),  starting_bid:8000, current_bid:0,     estimate_low:8000, estimate_high:15000,final_price:null, primary_image:IMG.furniture },
];

/* ═══════════════════════════════════════════════
   STATS
═══════════════════════════════════════════════ */
const STATS = {
  totalAuctions:    AUCTIONS.length,
  liveAuctions:     AUCTIONS.filter(a => a.status === 'active').length,
  upcomingAuctions: AUCTIONS.filter(a => a.status === 'upcoming').length,
  closedAuctions:   AUCTIONS.filter(a => a.status === 'closed').length,
  totalLots:        LOTS.length,
  activeLots:       LOTS.filter(l => l.status === 'active').length,
  totalBids:        LOTS.filter(l => l.current_bid > 0).length,
  totalUsers:       0,
  pendingUsers:     0,
  totalRevenue:     0,
};

/* ═══════════════════════════════════════════════
   ROUTER
═══════════════════════════════════════════════ */
function json(res, data, status = 200) {
  const body = JSON.stringify(data, null, 0);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function filterAuctions(params) {
  let data = AUCTIONS;
  const status   = params.get('status');
  const featured = params.get('featured');
  if (status)   data = data.filter(a => a.status === status);
  if (featured === 'true') data = data.filter(a => a.featured === true);
  const limit = parseInt(params.get('limit') || '50', 10);
  return { auctions: data.slice(0, limit), total: data.length };
}

function filterLots(params) {
  let data = LOTS;
  const status    = params.get('status');
  const auctionId = params.get('auction_id');
  const category  = params.get('category');
  if (status)    data = data.filter(l => l.status === status);
  if (auctionId) data = data.filter(l => l.auction_id === auctionId);
  if (category)  data = data.filter(l => l.category === category);
  const limit = parseInt(params.get('limit') || '100', 10);
  return { lots: data.slice(0, limit), total: data.length };
}

const server = http.createServer((req, res) => {
  /* CORS pre-flight */
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  const url    = new URL(req.url, `http://localhost:${PORT}`);
  const path   = url.pathname;
  const method = req.method;

  /* ── Health ── */
  if (method === 'GET' && path === '/health') {
    return json(res, { status: 'ok', mode: 'mock', timestamp: new Date().toISOString() });
  }

  /* ── Auctions ── */
  if (method === 'GET' && path === '/api/auctions') {
    return json(res, filterAuctions(url.searchParams));
  }
  if (method === 'GET' && /^\/api\/auctions\/([^/]+)$/.test(path)) {
    const id = path.split('/').pop();
    const a  = AUCTIONS.find(a => a.id === id);
    return a ? json(res, { auction: a }) : json(res, { error: 'Not found' }, 404);
  }
  if (method === 'GET' && /^\/api\/auctions\/([^/]+)\/lots$/.test(path)) {
    const auctionId = path.split('/')[3];
    return json(res, filterLots(new URLSearchParams(`auction_id=${auctionId}`)));
  }

  /* ── Lots ── */
  if (method === 'GET' && path === '/api/lots') {
    return json(res, filterLots(url.searchParams));
  }
  if (method === 'GET' && /^\/api\/lots\/([^/]+)$/.test(path)) {
    const id = path.split('/').pop();
    const l  = LOTS.find(l => l.id === id);
    return l ? json(res, { lot: l }) : json(res, { error: 'Not found' }, 404);
  }
  if (method === 'GET' && /^\/api\/lots\/([^/]+)\/bids$/.test(path)) {
    return json(res, { bids: [] });
  }

  /* ── Stats ── */
  if (method === 'GET' && path === '/api/admin/stats') {
    return json(res, STATS);
  }

  /* ── Auth stubs (prevent JS errors) ── */
  if (path === '/api/auth/me') {
    return json(res, { error: 'Unauthorized' }, 401);
  }
  if (method === 'POST' && path.startsWith('/api/auth/')) {
    return json(res, { error: 'Mock server — auth not implemented' }, 501);
  }

  /* ── Bids / Watchlist stubs ── */
  if (path === '/api/bids/my-bids') return json(res, { bids: [] });
  if (path === '/api/watchlist')     return json(res, { watchlist: [] });

  /* ── 404 ── */
  json(res, { error: 'Not found', path }, 404);
});

server.listen(PORT, () => {
  console.log('');
  console.log('🏛️  TURATHYA  Local Mock API Server  v2');
  console.log(`🟢  http://localhost:${PORT}`);
  console.log('');
  console.log(`   Auctions : ${AUCTIONS.length}  (${AUCTIONS.filter(a=>a.status==='active').length} active · ${AUCTIONS.filter(a=>a.status==='upcoming').length} upcoming · ${AUCTIONS.filter(a=>a.status==='closed').length} closed)`);
  console.log(`   Lots     : ${LOTS.length}       hero-slide images wired`);
  console.log('');
  console.log('   Key endpoints:');
  console.log(`   GET /api/auctions?featured=true            → Featured Auctions section`);
  console.log(`   GET /api/auctions?status=active            → Ending Soon section`);
  console.log(`   GET /api/lots                              → Collection page`);
  console.log(`   GET /api/admin/stats                       → Stats bar`);
  console.log('');
});
