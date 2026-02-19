import { Pool } from 'pg';
export declare const pool: Pool;
/**
 * Test database connection
 */
export declare function testConnection(): Promise<boolean>;
/**
 * Execute a query
 */
export declare function query(text: string, params?: any[]): Promise<import("pg").QueryResult<any>>;
/**
 * Get a client from the pool for transactions
 */
export declare function getClient(): Promise<import("pg").PoolClient>;
export default pool;
//# sourceMappingURL=database.d.ts.map