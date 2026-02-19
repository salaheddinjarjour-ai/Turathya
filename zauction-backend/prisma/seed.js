// Rich seed script — 6 auctions, 25+ lots with real images, videos, and detailed descriptions
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Turathya database with rich demo content...');

    // ── Users ──────────────────────────────────────────────────────────────────
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@turathya.com' },
        update: {},
        create: {
            email: 'admin@turathya.com',
            passwordHash: adminPassword,
            fullName: 'Turathya Admin',
            role: 'admin',
            status: 'approved',
        },
    });
    console.log('✅ Admin:', admin.email);

    const userPassword = await bcrypt.hash('user123', 12);
    const user = await prisma.user.upsert({
        where: { email: 'user@turathya.com' },
        update: {},
        create: {
            email: 'user@turathya.com',
            passwordHash: userPassword,
            fullName: 'Demo Collector',
            role: 'user',
            status: 'approved',
        },
    });
    console.log('✅ User:', user.email);

    // ── Clear existing demo data and re-seed ─────────────────────────────────
    console.log('🗑️  Clearing existing data for fresh seed...');
    await prisma.bid.deleteMany({});
    await prisma.watchlist.deleteMany({});
    await prisma.lotMedia.deleteMany({});
    await prisma.lot.deleteMany({});
    await prisma.auction.deleteMany({});

    const now = new Date();
    const days = (n) => new Date(now.getTime() + n * 86400000);

    // ══════════════════════════════════════════════════════════════════════════
    // AUCTION 1 — Rare Islamic Manuscripts & Calligraphy
    // ══════════════════════════════════════════════════════════════════════════
    await prisma.auction.create({
        data: {
            title: 'Rare Islamic Manuscripts & Calligraphy',
            description: `A landmark sale presenting an exceptional collection of Islamic manuscripts, Quranic folios, and masterworks of Arabic calligraphy spanning nine centuries. Assembled over four decades by a distinguished European private collector, this auction offers scholars, institutions, and connoisseurs a rare opportunity to acquire pieces of profound cultural and spiritual significance. Each lot has been authenticated by leading specialists and is accompanied by full provenance documentation.`,
            category: 'Manuscripts',
            location: 'Dubai, UAE',
            startDate: now,
            endDate: days(14),
            buyersPremium: 22.00,
            imageUrl: 'https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&w=1200&q=80',
            featured: true,
            status: 'active',
            createdBy: admin.id,
            lots: {
                create: [
                    {
                        lotNumber: 1,
                        title: 'Illuminated Quran Folio — Mamluk Egypt, 14th Century',
                        description: `An exceptionally fine single folio from a monumental Mamluk Quran, executed in gold and polychrome on vellum. The text is written in a bold muhaqqaq script in dark brown ink, with vowel marks in red and green. The margins are decorated with intricate geometric interlace in gold, lapis lazuli, and vermilion. Provenance: Sotheby's London, 1987; Private European Collection. Dimensions: 47 × 33 cm. Accompanied by a certificate of authenticity from Dr. Nasser Khalili.`,
                        category: 'Manuscripts',
                        condition: 'Very Good',
                        provenance: 'Sotheby\'s London 1987; Private European Collection',
                        estimateLow: 45000,
                        estimateHigh: 65000,
                        startingBid: 35000,
                        currentBid: 38500,
                        bidIncrement: 500,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?auto=format&fit=crop&w=800&q=80', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        lotNumber: 2,
                        title: 'Large Thuluth Panel — Ottoman Turkey, 18th Century',
                        description: `A monumental calligraphic panel in thuluth script, executed in black ink on cream paper mounted on card. The text reads the Throne Verse (Ayat al-Kursi) from Surat al-Baqara. Signed by the master calligrapher Mehmed Şefik Bey and dated 1189 AH / 1775 CE. The panel retains its original gilded frame with floral corner ornaments. An outstanding example of Ottoman imperial calligraphy at its zenith. Dimensions (framed): 82 × 58 cm.`,
                        category: 'Calligraphy',
                        condition: 'Excellent',
                        provenance: 'Istanbul private collection; Christie\'s London 2003',
                        estimateLow: 28000,
                        estimateHigh: 42000,
                        startingBid: 22000,
                        currentBid: 25000,
                        bidIncrement: 500,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                    {
                        lotNumber: 3,
                        title: 'Safavid Lacquer Pen Box with Calligraphic Decoration',
                        description: `A superb Safavid lacquered pen box (qalamdan) of rectangular form, the lid painted with a medallion containing a ghazal by Hafez in nasta'liq script, surrounded by flowering branches with birds. The interior fitted with a removable tray. Persia, Isfahan, circa 1650–1700. Length: 24 cm. Condition: minor rubbing to edges consistent with age and use. A rare survival of Safavid courtly craftsmanship.`,
                        category: 'Decorative Arts',
                        condition: 'Good',
                        provenance: 'Private French Collection; acquired Paris 1962',
                        estimateLow: 18000,
                        estimateHigh: 26000,
                        startingBid: 14000,
                        currentBid: 14000,
                        bidIncrement: 250,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                    {
                        lotNumber: 4,
                        title: 'Moroccan Leather-Bound Quran — Fez, 19th Century',
                        description: `A complete Quran manuscript in fine naskh script on cream laid paper, bound in original dark brown morocco leather with blind-tooled geometric decoration and central medallion. 312 folios. The opening pages feature polychrome illuminated headpieces with gold rosettes. Colophon dated 1278 AH / 1861 CE, copied in Fez. Dimensions: 22 × 16 cm. A beautiful example of North African Quranic manuscript tradition.`,
                        category: 'Manuscripts',
                        condition: 'Very Good',
                        provenance: 'Acquired Marrakech 1978; Private UK Collection',
                        estimateLow: 8000,
                        estimateHigh: 14000,
                        startingBid: 6000,
                        currentBid: 7200,
                        bidIncrement: 200,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                ]
            }
        }
    });
    console.log('✅ Auction 1: Islamic Manuscripts (4 lots)');

    // ══════════════════════════════════════════════════════════════════════════
    // AUCTION 2 — Fine Antique Timepieces
    // ══════════════════════════════════════════════════════════════════════════
    await prisma.auction.create({
        data: {
            title: 'Fine Antique & Vintage Timepieces',
            description: `An outstanding selection of horological masterpieces from the great Swiss and English makers, spanning three centuries of watchmaking excellence. From pocket watches bearing royal warrants to early wristwatches that defined the modern era, this auction presents timepieces of the highest quality, rarity, and historical importance. All lots have been serviced and certified by independent horological experts.`,
            category: 'Watches',
            location: 'Geneva, Switzerland',
            startDate: now,
            endDate: days(10),
            buyersPremium: 25.00,
            imageUrl: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?auto=format&fit=crop&w=1200&q=80',
            featured: true,
            status: 'active',
            createdBy: admin.id,
            lots: {
                create: [
                    {
                        lotNumber: 101,
                        title: 'Patek Philippe Ref. 2499 — Perpetual Calendar Chronograph',
                        description: `One of the most coveted complications in watchmaking history. This Patek Philippe Reference 2499 in 18-carat yellow gold features a perpetual calendar with moon phase and a column-wheel chronograph. Produced in only four series between 1950 and 1985, this third-series example (circa 1968) retains its original silver dial with applied gold baton indices, subsidiary dials for running seconds, 30-minute and 12-hour registers, and apertures for date, day, month, and moon phase. Accompanied by original Patek Philippe Extract from the Archives confirming production date and case metal. Case diameter: 37 mm. Movement: calibre 13-130 Q.`,
                        category: 'Watches',
                        condition: 'Excellent',
                        provenance: 'Private Swiss Collection; Antiquorum Geneva 1998',
                        estimateLow: 280000,
                        estimateHigh: 420000,
                        startingBid: 220000,
                        currentBid: 245000,
                        bidIncrement: 5000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1622434641406-a158123450f9?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?auto=format&fit=crop&w=800&q=80', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        lotNumber: 102,
                        title: 'Rolex Daytona Ref. 6239 "Paul Newman" — Circa 1968',
                        description: `The most celebrated Rolex of all time. This Reference 6239 features the iconic "Paul Newman" exotic dial in cream with red and black subsidiary registers, a pump pushers case in stainless steel, and the manual-winding Valjoux 72 movement. The dial shows beautiful tropical patina consistent with age. Accompanied by original Rolex Oyster bracelet, original hang tag, and a letter from the Rolex Archive. Case diameter: 37 mm. A cornerstone of any serious watch collection.`,
                        category: 'Watches',
                        condition: 'Very Good',
                        provenance: 'Private American Collection; Phillips New York 2015',
                        estimateLow: 180000,
                        estimateHigh: 260000,
                        startingBid: 150000,
                        currentBid: 168000,
                        bidIncrement: 2000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                    {
                        lotNumber: 103,
                        title: 'A. Lange & Söhne Lange 1 — First Series, 1994',
                        description: `A historic piece from the very first production run of the Lange 1 following the reunification of Germany. This example in 18-carat yellow gold was among the 150 watches unveiled at the legendary Dresden launch on October 24, 1994 — a date that transformed the watch world. Features the iconic asymmetric dial with outsize date, subsidiary seconds, and power reserve indicator. Movement: calibre L901.0 with hand-engraved balance cock. Accompanied by original certificate, box, and documentation. Case diameter: 38.5 mm.`,
                        category: 'Watches',
                        condition: 'Excellent',
                        provenance: 'Original owner; acquired Dresden 1994',
                        estimateLow: 65000,
                        estimateHigh: 95000,
                        startingBid: 52000,
                        currentBid: 58000,
                        bidIncrement: 1000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1548171915-e79a380a2a4b?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                    {
                        lotNumber: 104,
                        title: 'English Fusee Pocket Watch — Thomas Mudge, London, c.1760',
                        description: `A magnificent pocket watch by Thomas Mudge, inventor of the lever escapement, in a gold pair case with engine-turned decoration. The white enamel dial with Roman numerals and blued steel hands. The movement with Mudge's signature lever escapement, gilt three-quarter plate, and diamond endstone. Signed "Tho. Mudge London" on the movement. A piece of supreme horological importance by one of the greatest watchmakers in history. Diameter: 52 mm.`,
                        category: 'Pocket Watches',
                        condition: 'Good',
                        provenance: 'Bonhams London 2001; Private UK Collection',
                        estimateLow: 35000,
                        estimateHigh: 55000,
                        startingBid: 28000,
                        currentBid: 28000,
                        bidIncrement: 500,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                ]
            }
        }
    });
    console.log('✅ Auction 2: Fine Timepieces (4 lots)');

    // ══════════════════════════════════════════════════════════════════════════
    // AUCTION 3 — Modern & Contemporary Art
    // ══════════════════════════════════════════════════════════════════════════
    await prisma.auction.create({
        data: {
            title: 'Modern & Contemporary Art from the Arab World',
            description: `A curated selection of paintings, sculptures, and works on paper by leading artists from the Arab world, spanning the mid-twentieth century to the present day. This auction celebrates the rich diversity of artistic expression across the region, from the pioneering modernists of Cairo and Baghdad to the globally recognised voices of today's art scene. Each work has been carefully researched and is accompanied by full exhibition and publication history.`,
            category: 'Art',
            location: 'London, UK',
            startDate: days(3),
            endDate: days(17),
            buyersPremium: 20.00,
            imageUrl: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1200&q=80',
            featured: true,
            status: 'upcoming',
            createdBy: admin.id,
            lots: {
                create: [
                    {
                        lotNumber: 201,
                        title: 'Jewad Selim — Composition in Blue and Gold, 1958',
                        description: `A seminal work by the father of modern Iraqi art, painted during Selim's most productive period in Baghdad. This large-format oil on canvas demonstrates his masterful synthesis of Cubist influence with ancient Mesopotamian visual language. The composition features interlocking geometric forms in deep cobalt blue, ochre, and gold against a warm cream ground. Exhibited at the Baghdad Modern Art Group exhibition, 1958. Published in "Jewad Selim: A Retrospective" (Baghdad Museum of Modern Art, 1972). Canvas: 120 × 95 cm.`,
                        category: 'Paintings',
                        condition: 'Excellent',
                        provenance: 'Acquired directly from the artist\'s estate; Private Iraqi Collection',
                        estimateLow: 85000,
                        estimateHigh: 130000,
                        startingBid: 70000,
                        currentBid: 70000,
                        bidIncrement: 2000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=800&q=80', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        lotNumber: 202,
                        title: 'Mahmoud Said — Portrait of a Nubian Woman, 1942',
                        description: `One of the most celebrated Egyptian painters of the twentieth century, Mahmoud Said here captures a Nubian woman in a moment of quiet dignity. The subject is rendered with Said's characteristic warmth and psychological depth, her dark skin luminous against a golden background. The work exemplifies Said's unique synthesis of European academic technique with distinctly Egyptian sensibility. Oil on canvas. Signed and dated lower right. Canvas: 80 × 65 cm. Accompanied by a certificate of authenticity from the Mahmoud Said Museum, Alexandria.`,
                        category: 'Paintings',
                        condition: 'Very Good',
                        provenance: 'Private Egyptian Collection; Sotheby\'s London 1995',
                        estimateLow: 120000,
                        estimateHigh: 180000,
                        startingBid: 95000,
                        currentBid: 95000,
                        bidIncrement: 2500,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                    {
                        lotNumber: 203,
                        title: 'Dia Azzawi — Gilgamesh Series No. 7, 1978',
                        description: `From Azzawi's celebrated Gilgamesh series, this large-scale mixed media work on paper draws on the ancient Mesopotamian epic to explore themes of mortality, heroism, and the human condition. The composition is dominated by a monumental warrior figure rendered in Azzawi's distinctive style, combining calligraphic line with bold colour fields. Mixed media (acrylic, ink, and gold leaf) on paper. Signed and dated. Sheet: 150 × 100 cm. Exhibited: Institut du Monde Arabe, Paris, 1988.`,
                        category: 'Works on Paper',
                        condition: 'Excellent',
                        provenance: 'Acquired from the artist; Private London Collection',
                        estimateLow: 35000,
                        estimateHigh: 55000,
                        startingBid: 28000,
                        currentBid: 31000,
                        bidIncrement: 1000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                    {
                        lotNumber: 204,
                        title: 'Etel Adnan — Leporello Book, "The Arab Apocalypse", 1989',
                        description: `A unique artist's book by the Lebanese-American poet and visual artist Etel Adnan, comprising 59 accordion-folded panels in watercolour and ink. Each panel pairs a stanza from Adnan's landmark poem with an abstract visual response in her signature style of bold colour and simplified form. The work is presented in its original handmade linen slipcase. Signed and numbered 3/5. Dimensions (open): 59 × 18 cm each panel. A rare opportunity to acquire a complete unique work by one of the Arab world's most important cultural figures.`,
                        category: 'Artist Books',
                        condition: 'Excellent',
                        provenance: 'Acquired from the artist, 1989; Private Paris Collection',
                        estimateLow: 22000,
                        estimateHigh: 35000,
                        startingBid: 18000,
                        currentBid: 18000,
                        bidIncrement: 500,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                    {
                        lotNumber: 205,
                        title: 'Fahrelnissa Zeid — Abstract Composition, 1955',
                        description: `A magnificent large-scale abstract by the Turkish-Jordanian pioneer of modernism, painted at the height of her powers in Paris. The canvas is a kaleidoscopic explosion of jewel-like colour — emerald, sapphire, ruby, and gold — arranged in Zeid's characteristic mosaic-like facets that evoke both Byzantine mosaics and stained glass. Oil on canvas. Signed lower right. Canvas: 180 × 240 cm. Exhibited: Galerie Colette Allendy, Paris, 1955. A monumental work by one of the most important women artists of the twentieth century.`,
                        category: 'Paintings',
                        condition: 'Very Good',
                        provenance: 'Private Jordanian Royal Collection; Christie\'s London 2010',
                        estimateLow: 200000,
                        estimateHigh: 320000,
                        startingBid: 165000,
                        currentBid: 175000,
                        bidIncrement: 5000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                ]
            }
        }
    });
    console.log('✅ Auction 3: Modern & Contemporary Art (5 lots)');

    // ══════════════════════════════════════════════════════════════════════════
    // AUCTION 4 — Antique Jewellery & Gemstones
    // ══════════════════════════════════════════════════════════════════════════
    await prisma.auction.create({
        data: {
            title: 'Magnificent Jewels: Antique & Signed Pieces',
            description: `A dazzling array of antique and signed jewellery spanning four centuries, from Renaissance enamel pendants to Art Deco masterpieces by Cartier and Van Cleef & Arpels. Each piece has been examined by independent gemmological experts, and stones of significance are accompanied by GIA or Gübelin certificates. This auction represents the finest jewels to come to market this season.`,
            category: 'Jewellery',
            location: 'Paris, France',
            startDate: days(1),
            endDate: days(12),
            buyersPremium: 23.00,
            imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=80',
            featured: false,
            status: 'active',
            createdBy: admin.id,
            lots: {
                create: [
                    {
                        lotNumber: 301,
                        title: 'Cartier Art Deco Diamond & Emerald Bracelet, c.1925',
                        description: `A spectacular Art Deco bracelet by Cartier Paris, set with 47 old European-cut diamonds totalling approximately 18.5 carats and 12 Colombian emeralds totalling approximately 8.2 carats, all set in platinum. The geometric design features alternating diamond and emerald links with millegrain edges, exemplifying the Cartier Art Deco aesthetic at its most refined. Signed "Cartier Paris" and numbered. Length: 18.5 cm. Accompanied by Cartier archive documentation confirming date and original owner. GIA certificate for principal emerald (5.1 ct, Colombian, no treatment).`,
                        category: 'Bracelets',
                        condition: 'Excellent',
                        provenance: 'Comtesse de Beaumont, Paris; Christie\'s Geneva 1987; Private Collection',
                        estimateLow: 380000,
                        estimateHigh: 550000,
                        startingBid: 300000,
                        currentBid: 325000,
                        bidIncrement: 5000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1573408301185-9519f94815b5?auto=format&fit=crop&w=800&q=80', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        lotNumber: 302,
                        title: 'Natural Kashmir Sapphire & Diamond Ring — 12.8 Carats',
                        description: `A magnificent ring centred on a cushion-cut natural Kashmir sapphire of 12.83 carats, displaying the velvety cornflower blue characteristic of the finest Kashmir stones. The sapphire is set in a platinum mount with a surround of 24 old European-cut diamonds totalling approximately 3.2 carats. Gübelin certificate confirming natural Kashmir origin, no heat treatment. Ring size: 54 (UK N). A stone of this quality, origin, and size is extraordinarily rare on the open market.`,
                        category: 'Rings',
                        condition: 'Excellent',
                        provenance: 'Private Swiss Collection',
                        estimateLow: 450000,
                        estimateHigh: 650000,
                        startingBid: 380000,
                        currentBid: 395000,
                        bidIncrement: 5000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                    {
                        lotNumber: 303,
                        title: 'Van Cleef & Arpels "Alhambra" Necklace — Vintage, 1968',
                        description: `An iconic Van Cleef & Arpels Vintage Alhambra long necklace from the first year of the collection's creation, featuring 20 motifs in 18-carat yellow gold set with white mother-of-pearl. The necklace is signed "Van Cleef & Arpels" and numbered, and is accompanied by the original leather box. Length: 84 cm. A piece of jewellery history — the Alhambra collection, launched in 1968, has become one of the most recognised and beloved jewellery designs in the world.`,
                        category: 'Necklaces',
                        condition: 'Very Good',
                        provenance: 'Purchased Van Cleef & Arpels Paris 1968; Private French Family Collection',
                        estimateLow: 28000,
                        estimateHigh: 42000,
                        startingBid: 22000,
                        currentBid: 24500,
                        bidIncrement: 500,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                    {
                        lotNumber: 304,
                        title: 'Renaissance Enamel & Gold Pendant — Northern Europe, c.1580',
                        description: `A remarkable survival from the Renaissance period, this pendant is fashioned in 22-carat gold with translucent enamel in deep blue, green, and white. The central motif depicts a pelican in her piety — a symbol of Christ's sacrifice — surrounded by a border of table-cut diamonds and rubies. The reverse is decorated with polychrome enamel floral scrollwork. Accompanied by a report from the Victoria & Albert Museum confirming date and attribution. Height: 8.5 cm. An extraordinary piece of Renaissance goldsmithing.`,
                        category: 'Pendants',
                        condition: 'Good',
                        provenance: 'Private English Aristocratic Collection; Sotheby\'s London 1962',
                        estimateLow: 55000,
                        estimateHigh: 85000,
                        startingBid: 45000,
                        currentBid: 45000,
                        bidIncrement: 1000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                ]
            }
        }
    });
    console.log('✅ Auction 4: Magnificent Jewels (4 lots)');

    // ══════════════════════════════════════════════════════════════════════════
    // AUCTION 5 — Antique Furniture & Decorative Arts
    // ══════════════════════════════════════════════════════════════════════════
    await prisma.auction.create({
        data: {
            title: 'Important Antique Furniture & European Decorative Arts',
            description: `A distinguished collection of European furniture and decorative arts from the 17th through 19th centuries, drawn from historic country houses and private collections across Britain, France, and Italy. Highlights include a documented Louis XIV bureau mazarin, a pair of George II giltwood mirrors, and an important Meissen porcelain service. Each piece has been researched by specialists and is offered with full provenance.`,
            category: 'Furniture',
            location: 'London, UK',
            startDate: days(5),
            endDate: days(19),
            buyersPremium: 20.00,
            imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
            featured: false,
            status: 'upcoming',
            createdBy: admin.id,
            lots: {
                create: [
                    {
                        lotNumber: 401,
                        title: 'Louis XIV Bureau Mazarin — Paris, c.1690',
                        description: `A magnificent bureau mazarin of the Louis XIV period, attributed to the workshop of André-Charles Boulle, veneered in tortoiseshell and brass marquetry in the première-partie technique. The rectangular top with a central drawer flanked by two tiers of three drawers on each side, raised on eight legs joined by an X-shaped stretcher with central finial. The mounts of gilt bronze with masks, espagnolettes, and foliate scrolls. Width: 142 cm; Height: 78 cm; Depth: 72 cm. A documented piece of the highest quality from the golden age of French furniture making.`,
                        category: 'Furniture',
                        condition: 'Good',
                        provenance: 'Château de Vaux-le-Vicomte; Duc de Choiseul; Christie\'s Paris 1978',
                        estimateLow: 180000,
                        estimateHigh: 280000,
                        startingBid: 145000,
                        currentBid: 145000,
                        bidIncrement: 5000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        lotNumber: 402,
                        title: 'Pair of George II Giltwood Mirrors — England, c.1745',
                        description: `A superb pair of George II giltwood pier mirrors in the manner of William Kent, each with a rectangular plate in a carved and gilded frame surmounted by a broken pediment with central eagle and flanking acanthus scrolls. The apron carved with a shell motif. Height: 185 cm; Width: 82 cm. Both mirrors retain their original plates with characteristic foxing. From a documented English country house collection. A rare and important pair in exceptional condition.`,
                        category: 'Mirrors',
                        condition: 'Very Good',
                        provenance: 'Holkham Hall, Norfolk (by descent); Christie\'s London 1985',
                        estimateLow: 65000,
                        estimateHigh: 95000,
                        startingBid: 52000,
                        currentBid: 52000,
                        bidIncrement: 1000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                    {
                        lotNumber: 403,
                        title: 'Meissen "Swan Service" Tureen & Cover — c.1737-1741',
                        description: `A magnificent Meissen porcelain tureen and cover from the celebrated Swan Service, modelled by Johann Joachim Kändler and Johann Friedrich Eberlein for Count Heinrich von Brühl. The oval form moulded in relief with swans, herons, and water plants, painted in underglaze blue and overglaze enamels. The cover surmounted by a modelled swan finial. Marked with crossed swords in underglaze blue. Height: 38 cm; Width: 52 cm. One of only a handful of Swan Service pieces to appear at auction in the past decade.`,
                        category: 'Porcelain',
                        condition: 'Very Good',
                        provenance: 'Private German Collection; Sotheby\'s Munich 1991',
                        estimateLow: 95000,
                        estimateHigh: 145000,
                        startingBid: 78000,
                        currentBid: 82000,
                        bidIncrement: 2000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                    {
                        lotNumber: 404,
                        title: 'Flemish Verdure Tapestry — Brussels, c.1680',
                        description: `A large and finely woven Flemish verdure tapestry from the Brussels workshops, depicting a lush forest landscape with deer, birds, and exotic flora. The border of acanthus scrolls, fruit, and flowers. Wool and silk, with metallic thread highlights. Dimensions: 380 × 290 cm. The tapestry retains exceptional colour and condition for its age, with only minor restoration to the lower border. Accompanied by a technical analysis report from the Textile Conservation Centre.`,
                        category: 'Textiles',
                        condition: 'Good',
                        provenance: 'Palazzo Colonna, Rome; Private Italian Collection',
                        estimateLow: 45000,
                        estimateHigh: 70000,
                        startingBid: 36000,
                        currentBid: 36000,
                        bidIncrement: 1000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                ]
            }
        }
    });
    console.log('✅ Auction 5: Antique Furniture (4 lots)');

    // ══════════════════════════════════════════════════════════════════════════
    // AUCTION 6 — Rare Books, Maps & Photographs
    // ══════════════════════════════════════════════════════════════════════════
    await prisma.auction.create({
        data: {
            title: 'Rare Books, Maps & Historical Photographs',
            description: `A fascinating collection of rare books, antique maps, and early photographs documenting the history of the Arab world and the broader Islamic civilisation. From 16th-century Ottoman cartography to early 20th-century photographic expeditions, this auction offers unique windows into history. All books have been examined by bibliographic specialists and are offered with full collation notes.`,
            category: 'Books',
            location: 'Beirut, Lebanon',
            startDate: days(7),
            endDate: days(21),
            buyersPremium: 18.00,
            imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80',
            featured: false,
            status: 'upcoming',
            createdBy: admin.id,
            lots: {
                create: [
                    {
                        lotNumber: 501,
                        title: 'Piri Reis — Kitab-ı Bahriye (Book of Navigation), Istanbul, 1526',
                        description: `An exceptional Ottoman manuscript copy of Piri Reis's landmark navigational atlas, the Kitab-ı Bahriye, comprising 215 folios with 210 hand-coloured maps of the Mediterranean, Black Sea, and Aegean coastlines. The maps are executed in vibrant colours with gold highlights, depicting harbours, islands, and coastal features with remarkable accuracy. The text in Ottoman Turkish provides detailed sailing directions. Bound in contemporary Ottoman red leather with gilt tooling. Folio: 32 × 22 cm. One of fewer than 30 known copies, this is a work of supreme importance to the history of cartography.`,
                        category: 'Maps',
                        condition: 'Very Good',
                        provenance: 'Topkapı Palace Library (deaccessioned 1923); Private Turkish Collection',
                        estimateLow: 320000,
                        estimateHigh: 480000,
                        startingBid: 260000,
                        currentBid: 275000,
                        bidIncrement: 5000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        lotNumber: 502,
                        title: 'Bonfils — Album of 100 Photographs of Egypt & the Levant, c.1880',
                        description: `A superb album of 100 albumen prints by the Bonfils studio of Beirut, documenting Egypt, Palestine, Syria, and Lebanon in the 1870s–1880s. The photographs include iconic views of the Pyramids and Sphinx, the streets of Cairo, the ruins of Baalbek, and portraits of local people in traditional dress. Each print is mounted on card with the Bonfils studio stamp. Album dimensions: 42 × 32 cm. A comprehensive and beautifully preserved record of the Levant at a pivotal moment in history.`,
                        category: 'Photographs',
                        condition: 'Very Good',
                        provenance: 'Private French Colonial Family; acquired Beirut 1890s',
                        estimateLow: 18000,
                        estimateHigh: 28000,
                        startingBid: 14000,
                        currentBid: 15500,
                        bidIncrement: 250,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                    {
                        lotNumber: 503,
                        title: 'First Edition — T.E. Lawrence "Seven Pillars of Wisdom", 1926',
                        description: `The rare subscriber's edition of T.E. Lawrence's masterpiece, one of only 211 copies printed by the Oxford Times press in 1926 and distributed to subscribers. This copy is bound in the original vellum with gilt lettering and retains the original slipcase. The text is illustrated with 65 portraits by Eric Kennington and other artists. Signed by Lawrence on the limitation page. A cornerstone of any collection relating to the Arab Revolt and the First World War in the Middle East.`,
                        category: 'Books',
                        condition: 'Very Good',
                        provenance: 'Original subscriber; Private UK Collection',
                        estimateLow: 55000,
                        estimateHigh: 85000,
                        startingBid: 45000,
                        currentBid: 48000,
                        bidIncrement: 1000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                    {
                        lotNumber: 504,
                        title: 'Ortelius — Theatrum Orbis Terrarum, Antwerp, 1570 (First Edition)',
                        description: `The first edition of the first modern atlas, Abraham Ortelius's Theatrum Orbis Terrarum, published in Antwerp by Gielis Coppens van Diest on May 20, 1570. This copy contains all 53 maps on 70 sheets, hand-coloured in the period. The maps include the first printed map of the Arab world as a distinct region. Bound in contemporary vellum. Folio: 52 × 35 cm. Complete and in remarkable condition. One of the most important books in the history of cartography and geography.`,
                        category: 'Books',
                        condition: 'Good',
                        provenance: 'Biblioteca Nazionale Marciana, Venice (deaccessioned 1890); Private Italian Collection',
                        estimateLow: 280000,
                        estimateHigh: 420000,
                        startingBid: 230000,
                        currentBid: 230000,
                        bidIncrement: 5000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                ]
            }
        }
    });
    console.log('✅ Auction 6: Rare Books & Maps (4 lots)');

    // ══════════════════════════════════════════════════════════════════════════
    // AUCTION 7 — Antique Carpets & Textiles
    // ══════════════════════════════════════════════════════════════════════════
    await prisma.auction.create({
        data: {
            title: 'Exceptional Antique Carpets & Textiles',
            description: `A landmark collection of antique Oriental carpets and textiles, assembled over fifty years by a distinguished European connoisseur. The collection spans the great weaving traditions of Persia, Anatolia, the Caucasus, and Central Asia, with examples ranging from 16th-century court carpets to 19th-century tribal masterpieces. Each piece has been examined by leading carpet specialists and is offered with full technical analysis.`,
            category: 'Carpets',
            location: 'Vienna, Austria',
            startDate: days(2),
            endDate: days(16),
            buyersPremium: 20.00,
            imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80',
            featured: false,
            status: 'active',
            createdBy: admin.id,
            lots: {
                create: [
                    {
                        lotNumber: 601,
                        title: 'Safavid "Vase" Carpet — Kerman, Persia, 17th Century',
                        description: `A magnificent Safavid vase carpet of the type associated with the royal workshops of Kerman, woven in wool pile on a cotton foundation with a silk warp. The field is filled with a dense lattice of flowering vines issuing from vases, populated with birds and animals, in a palette of deep crimson, cobalt blue, ivory, and gold. The border of cartouches and arabesque scrolls. Dimensions: 520 × 280 cm. Technical analysis confirms 17th-century dating. Exhibited: Österreichisches Museum für angewandte Kunst, Vienna, 1972. A carpet of museum quality.`,
                        category: 'Carpets',
                        condition: 'Good',
                        provenance: 'Private Viennese Collection; acquired Istanbul 1920s',
                        estimateLow: 350000,
                        estimateHigh: 550000,
                        startingBid: 280000,
                        currentBid: 295000,
                        bidIncrement: 5000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?auto=format&fit=crop&w=800&q=80', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        lotNumber: 602,
                        title: 'Anatolian "Bird" Ushak Carpet — 16th Century',
                        description: `A rare and important Ushak carpet of the "bird" type, woven in western Anatolia in the late 16th century. The field is decorated with a repeating pattern of stylised birds amid flowering branches on a rich red ground, with a border of reciprocal trefoil and running vine. Wool pile on wool foundation. Dimensions: 380 × 240 cm. Condition: even pile with some restoration to edges. Illustrated in "Anatolian Carpets" (Vienna, 1984). One of the finest examples of this rare type to appear at auction.`,
                        category: 'Carpets',
                        condition: 'Good',
                        provenance: 'Private Austrian Collection; Dorotheum Vienna 1968',
                        estimateLow: 120000,
                        estimateHigh: 180000,
                        startingBid: 95000,
                        currentBid: 102000,
                        bidIncrement: 2000,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                    {
                        lotNumber: 603,
                        title: 'Senneh Kilim — Kurdistan, Persia, 19th Century',
                        description: `An exceptionally fine Senneh kilim of small format, woven in the Kurdish town of Sanandaj (Senneh) in the 19th century. The field is covered in a dense herati pattern in an extraordinary range of colours — over 30 distinct shades — on a deep indigo ground. The border of reciprocal trefoil. Wool weft on cotton warp. Dimensions: 165 × 120 cm. The finest example of this type we have encountered in thirty years of dealing. A masterpiece of flat-weave technique.`,
                        category: 'Kilims',
                        condition: 'Excellent',
                        provenance: 'Private German Collection; acquired Tehran 1965',
                        estimateLow: 28000,
                        estimateHigh: 42000,
                        startingBid: 22000,
                        currentBid: 24000,
                        bidIncrement: 500,
                        status: 'active',
                        media: {
                            create: [
                                { mediaType: 'image', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
                            ]
                        }
                    },
                ]
            }
        }
    });
    console.log('✅ Auction 7: Antique Carpets (3 lots)');

    console.log('\n🎉 Seeding complete!');
    console.log('📊 Summary: 7 auctions, 28 lots');
    console.log('\n📝 Login credentials:');
    console.log('Admin: admin@turathya.com / admin123');
    console.log('User:  user@turathya.com / user123');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
