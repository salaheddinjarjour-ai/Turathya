-- Migration: reconcile_production_schema_drift
--
-- Three columns were added directly to the production database and never
-- captured in schema.prisma or in a migration:
--
--   lots.show_in_gallery  — written by POST/PATCH /api/admin/lots
--   lots.is_featured      — written by PATCH /api/admin/lots, sent by admin.js
--   lots.image_data       — present in schema.prisma, but no migration created it
--   auctions.image_data   — same
--
-- Consequence: `prisma migrate deploy` against a fresh database produced a
-- schema where admin lot creation failed immediately. This migration is written
-- to be idempotent so it is a no-op on the live database (where the columns
-- already exist) and correct on a rebuilt one.

-- ── Columns ────────────────────────────────────────────────────────────────
ALTER TABLE "lots" ADD COLUMN IF NOT EXISTS "image_data"      TEXT;
ALTER TABLE "lots" ADD COLUMN IF NOT EXISTS "show_in_gallery" BOOLEAN;
ALTER TABLE "lots" ADD COLUMN IF NOT EXISTS "is_featured"     BOOLEAN;

ALTER TABLE "auctions" ADD COLUMN IF NOT EXISTS "image_data" TEXT;

-- ── Converge the flags on NOT NULL DEFAULT false ───────────────────────────
-- The production columns may be nullable; a fresh database should not be. Fill
-- existing NULLs first so the NOT NULL constraint can be applied either way.
UPDATE "lots" SET "show_in_gallery" = false WHERE "show_in_gallery" IS NULL;
UPDATE "lots" SET "is_featured"     = false WHERE "is_featured"     IS NULL;

ALTER TABLE "lots" ALTER COLUMN "show_in_gallery" SET DEFAULT false;
ALTER TABLE "lots" ALTER COLUMN "is_featured"     SET DEFAULT false;
ALTER TABLE "lots" ALTER COLUMN "show_in_gallery" SET NOT NULL;
ALTER TABLE "lots" ALTER COLUMN "is_featured"     SET NOT NULL;

-- ── Backfill the denormalized bid columns ──────────────────────────────────
-- current_bid / bid_count were never maintained when a bid was placed, so any
-- lot with existing bids carries a stale value. The bidding transaction now
-- keeps them in sync; this repairs the history.
UPDATE "lots" l
SET "current_bid" = agg.current_bid,
    "bid_count"   = agg.bid_count
FROM (
    SELECT lot_id,
           MAX(amount)   AS current_bid,
           COUNT(*)::int AS bid_count
    FROM bids
    GROUP BY lot_id
) agg
WHERE l.id = agg.lot_id
  AND (l."current_bid" IS DISTINCT FROM agg.current_bid
       OR l."bid_count" IS DISTINCT FROM agg.bid_count);

-- Lots with no bids at all should read zero, not a leftover value.
UPDATE "lots"
SET "current_bid" = NULL,
    "bid_count"   = 0
WHERE NOT EXISTS (SELECT 1 FROM bids WHERE bids.lot_id = "lots".id)
  AND ("current_bid" IS NOT NULL OR "bid_count" <> 0);
