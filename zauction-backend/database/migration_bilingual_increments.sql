-- =====================================================
-- MIGRATION: Bilingual Content + Remove Buyer's Premium + Tiered Bid Increments
-- =====================================================

-- 1. Add bilingual fields to AUCTIONS table
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS title_en VARCHAR(255);
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS title_ar VARCHAR(255);
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS category_en VARCHAR(100);
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS category_ar VARCHAR(100);
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS location_en VARCHAR(255);
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS location_ar VARCHAR(255);

-- Migrate existing data: copy title/description/category/location to _en fields
UPDATE auctions SET title_en = title WHERE title_en IS NULL AND title IS NOT NULL;
UPDATE auctions SET description_en = description WHERE description_en IS NULL AND description IS NOT NULL;
UPDATE auctions SET category_en = category WHERE category_en IS NULL AND category IS NOT NULL;
UPDATE auctions SET location_en = location WHERE location_en IS NULL AND location IS NOT NULL;

-- 2. Add bilingual fields to LOTS table
ALTER TABLE lots ADD COLUMN IF NOT EXISTS title_en VARCHAR(255);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS title_ar VARCHAR(255);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS category_en VARCHAR(100);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS category_ar VARCHAR(100);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS condition_en VARCHAR(100);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS condition_ar VARCHAR(100);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS provenance_en TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS provenance_ar TEXT;

-- Migrate existing data: copy to _en fields
UPDATE lots SET title_en = title WHERE title_en IS NULL AND title IS NOT NULL;
UPDATE lots SET description_en = description WHERE description_en IS NULL AND description IS NOT NULL;
UPDATE lots SET category_en = category WHERE category_en IS NULL AND category IS NOT NULL;
UPDATE lots SET condition_en = condition WHERE condition_en IS NULL AND condition IS NOT NULL;
UPDATE lots SET provenance_en = provenance WHERE provenance_en IS NULL AND provenance IS NOT NULL;

-- 3. Remove buyer's premium column from auctions
-- (Keep column but mark as deprecated - drop later after verifying no dependencies)
-- ALTER TABLE auctions DROP COLUMN IF EXISTS buyers_premium;
-- For safety we set it to 0 rather than drop
UPDATE auctions SET buyers_premium = 0;

-- 4. Remove bid_increment column from lots (now calculated dynamically)
-- Keep column for backward compat but it's no longer used for validation
-- The tiered increment function replaces per-lot bid_increment

-- Done!
