"use strict";
/**
 * Helpers for building dynamic UPDATE statements safely.
 *
 * Postgres cannot parameterize identifiers — only values. So any column name
 * that ends up in SQL has to come from a fixed allowlist in our own code,
 * never from the request body. Interpolating `Object.keys(req.body)` hands the
 * caller the left-hand side of a SET clause, which is enough to read or write
 * arbitrary tables.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUCTION_UPDATABLE_COLUMNS = exports.LOT_UPDATABLE_COLUMNS = void 0;
exports.buildUpdateSet = buildUpdateSet;
exports.LOT_UPDATABLE_COLUMNS = [
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
];
// current_bid / bid_count are intentionally absent: they are derived from the
// bids table and maintained by the bidding transaction.
exports.AUCTION_UPDATABLE_COLUMNS = [
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
];
/**
 * Build a parameterized SET clause from a payload, keeping only allowlisted
 * columns.
 *
 * @param firstParamIndex placeholder number for the first value. Defaults to 2
 *   because callers conventionally pass the row id as $1.
 */
function buildUpdateSet(updates, allowedColumns, firstParamIndex = 2) {
    const allowed = new Set(allowedColumns);
    const keys = Object.keys(updates);
    const fields = keys.filter((key) => allowed.has(key));
    const rejected = keys.filter((key) => !allowed.has(key));
    const setClause = fields
        .map((field, idx) => `"${field}" = $${idx + firstParamIndex}`)
        .join(', ');
    const values = fields.map((field) => updates[field]);
    return { fields, rejected, setClause, values };
}
//# sourceMappingURL=buildUpdate.js.map