-- Migration: add_lot_dates_make_auction_dates_optional
-- Moves auction timing from the Auction (category) level to the Lot (product) level.
-- 
-- 1. Make start_date / end_date nullable on auctions table
--    (categories no longer require timing — products do)
-- 2. Add start_date / end_date to lots table
-- 3. Add performance indexes on lots(start_date) and lots(end_date)

-- Step 1: Make auction dates optional
ALTER TABLE "auctions"
  ALTER COLUMN "start_date" DROP NOT NULL,
  ALTER COLUMN "end_date"   DROP NOT NULL;

-- Step 2: Add start_date and end_date to lots
ALTER TABLE "lots"
  ADD COLUMN "start_date" TIMESTAMPTZ,
  ADD COLUMN "end_date"   TIMESTAMPTZ;

-- Step 3: Add indexes for performance (ending-soon queries, countdown)
CREATE INDEX IF NOT EXISTS "lots_end_date_idx"   ON "lots"("end_date");
CREATE INDEX IF NOT EXISTS "lots_start_date_idx" ON "lots"("start_date");
