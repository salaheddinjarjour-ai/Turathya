-- AlterTable
ALTER TABLE "auctions" ADD COLUMN     "category_ar" VARCHAR(100),
ADD COLUMN     "category_en" VARCHAR(100),
ADD COLUMN     "description_ar" TEXT,
ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "image_data" TEXT,
ADD COLUMN     "location_ar" VARCHAR(255),
ADD COLUMN     "location_en" VARCHAR(255),
ADD COLUMN     "title_ar" VARCHAR(255),
ADD COLUMN     "title_en" VARCHAR(255),
ALTER COLUMN "buyers_premium" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "lot_media" ALTER COLUMN "url" SET DATA TYPE TEXT,
ALTER COLUMN "thumbnail_url" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "lots" ADD COLUMN     "category_ar" VARCHAR(100),
ADD COLUMN     "category_en" VARCHAR(100),
ADD COLUMN     "condition_ar" VARCHAR(100),
ADD COLUMN     "condition_en" VARCHAR(100),
ADD COLUMN     "description_ar" TEXT,
ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "image_data" TEXT,
ADD COLUMN     "provenance_ar" TEXT,
ADD COLUMN     "provenance_en" TEXT,
ADD COLUMN     "title_ar" VARCHAR(255),
ADD COLUMN     "title_en" VARCHAR(255);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone" VARCHAR(20);
