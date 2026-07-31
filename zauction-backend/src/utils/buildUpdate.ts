/**
 * Helpers for building dynamic UPDATE statements safely.
 *
 * Postgres cannot parameterize identifiers — only values. So any column name
 * that ends up in SQL has to come from a fixed allowlist in our own code,
 * never from the request body. Interpolating `Object.keys(req.body)` hands the
 * caller the left-hand side of a SET clause, which is enough to read or write
 * arbitrary tables.
 */

export const LOT_UPDATABLE_COLUMNS = [
    'auction_id',
    'lot_number',
    'title',
    'description',
    'category',
    'condition',
    'provenance',
    'title_en',
    'title_ar',
    'description_en',
    'description_ar',
    'category_en',
    'category_ar',
    'condition_en',
    'condition_ar',
    'provenance_en',
    'provenance_ar',
    'estimate_low',
    'estimate_high',
    'starting_bid',
    'reserve_price',
    'bid_increment',
    'status',
    'start_date',
    'end_date',
    'image_data',
    // show_in_gallery and is_featured exist on the production lots table but are
    // absent from schema.prisma and from every migration — see the schema-drift
    // migration that reconciles them.
    'show_in_gallery',
    'is_featured'
] as const;

// current_bid / bid_count are intentionally absent: they are derived from the
// bids table and maintained by the bidding transaction.
export const AUCTION_UPDATABLE_COLUMNS = [
    'title',
    'description',
    'category',
    'location',
    'title_en',
    'title_ar',
    'description_en',
    'description_ar',
    'category_en',
    'category_ar',
    'location_en',
    'location_ar',
    'start_date',
    'end_date',
    'buyers_premium',
    'image_url',
    'image_data',
    'featured',
    'status'
] as const;

export type UpdateSet = {
    /** Allowed column names present in the payload. */
    fields: string[];
    /** Payload keys that are not updatable — reported back to the caller. */
    rejected: string[];
    /** e.g. `"title" = $2, "status" = $3` */
    setClause: string;
    /** Values aligned with setClause, starting at firstParamIndex. */
    values: unknown[];
};

/**
 * Build a parameterized SET clause from a payload, keeping only allowlisted
 * columns.
 *
 * @param firstParamIndex placeholder number for the first value. Defaults to 2
 *   because callers conventionally pass the row id as $1.
 */
export function buildUpdateSet(
    updates: Record<string, unknown>,
    allowedColumns: readonly string[],
    firstParamIndex = 2
): UpdateSet {
    const allowed = new Set<string>(allowedColumns);
    const keys = Object.keys(updates);

    const fields = keys.filter((key) => allowed.has(key));
    const rejected = keys.filter((key) => !allowed.has(key));

    const setClause = fields
        .map((field, idx) => `"${field}" = $${idx + firstParamIndex}`)
        .join(', ');
    const values = fields.map((field) => updates[field]);

    return { fields, rejected, setClause, values };
}
