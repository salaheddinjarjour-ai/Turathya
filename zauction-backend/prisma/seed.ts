// Seed script to create initial admin user
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@zauction.com' },
    update: {},
    create: {
      email: 'admin@zauction.com',
      passwordHash: adminPassword,
      fullName: 'Admin User',
      role: 'admin',
      status: 'approved',
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create regular test user
  const userPassword = await bcrypt.hash('user123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@zauction.com' },
    update: {},
    create: {
      email: 'user@zauction.com',
      passwordHash: userPassword,
      fullName: 'Test User',
      role: 'user',
      status: 'approved',
    },
  });

  console.log('✅ Test user created:', user.email);

  // Check for existing auctions
  const auctionCount = await prisma.auction.count();

  if (auctionCount === 0) {
    console.log('creating demo auctions...');

    // Create Premium Watch Auction
    const watchAuction = await prisma.auction.create({
      data: {
        title: 'Luxury Timepieces Collection',
        description: 'An exclusive collection of rare and vintage watches from top Swiss manufacturers.',
        category: 'Watches',
        location: 'Geneva, Switzerland',
        startDate: new Date(), // Starts now
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Ends in 7 days
        buyersPremium: 25.00,
        imageUrl: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?auto=format&fit=crop&q=80',
        featured: true,
        status: 'active',
        createdBy: admin.id,
        lots: {
          create: [
            {
              lotNumber: 1,
              title: 'Patek Philippe Nautilus',
              description: 'Stainless steel, blue dial, reference 5711/1A-010. In excellent condition with original box and papers.',
              category: 'Watches',
              condition: 'Excellent',
              provenance: 'Private Collection',
              estimateLow: 80000,
              estimateHigh: 120000,
              startingBid: 60000,
              currentBid: 60000,
              bidIncrement: 1000,
              status: 'active',
              media: {
                create: [
                  {
                    mediaType: 'image',
                    url: 'https://images.unsplash.com/photo-1622434641406-a158123450f9?auto=format&fit=crop&q=80',
                    displayOrder: 0
                  }
                ]
              }
            },
            {
              lotNumber: 2,
              title: 'Rolex Daytona "Panda"',
              description: 'Ceramic bezel, white dial. Unworn condition.',
              category: 'Watches',
              condition: 'New',
              provenance: 'Authorized Dealer',
              estimateLow: 25000,
              estimateHigh: 35000,
              startingBid: 20000,
              currentBid: 20000,
              bidIncrement: 500,
              status: 'active',
              media: {
                create: [
                  {
                    mediaType: 'image',
                    url: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80',
                    displayOrder: 0
                  }
                ]
              }
            }
          ]
        }
      }
    });
    console.log('✅ Created Watch Auction with 2 lots');

    // Create Art Auction
    const artAuction = await prisma.auction.create({
      data: {
        title: 'Modern Art & Design',
        description: 'Contemporary works from emerging and established artists.',
        category: 'Art',
        location: 'New York, USA',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Starts in 2 days
        endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000), // Ends in 9 days
        buyersPremium: 20.00,
        imageUrl: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&q=80',
        featured: false,
        status: 'upcoming',
        createdBy: admin.id,
        lots: {
          create: [
            {
              lotNumber: 101,
              title: 'Abstract Composition #4',
              description: 'Oil on canvas, signed lower right. 120x100cm.',
              category: 'Art',
              condition: 'Good',
              provenance: 'Artist Studio',
              estimateLow: 5000,
              estimateHigh: 8000,
              startingBid: 3000,
              currentBid: 3000,
              bidIncrement: 200,
              status: 'active',
              media: {
                create: [
                  {
                    mediaType: 'image',
                    url: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80',
                    displayOrder: 0
                  }
                ]
              }
            }
          ]
        }
      }
    });
    console.log('✅ Created Art Auction with 1 lot');

  } else {
    console.log('ℹ️ Auctions already exist, skipping demo data creation.');
  }

  console.log('\n📝 Login credentials:');
  console.log('Admin: admin@zauction.com / admin123');
  console.log('User:  user@zauction.com / user123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
