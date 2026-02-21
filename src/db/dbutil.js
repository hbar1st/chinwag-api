/* eslint-disable no-console */

import { pool } from "./pool.js";
import { logger } from "../utils/logger.js";

const SCHEMA_NAME = "chinwag";

/**
 * 
 * clears the data in all the tables
 * useful for testing when the schema has not changed but we want a fresh start
 * 
 * @returns 
 */
export async function clearAllTables() {
  try {
    const { rows } = await pool.query(
      `SELECT
    table_name AS relation_name
FROM
    information_schema.tables
WHERE
    table_schema = '${SCHEMA_NAME}';`,
    );

    for (const row of rows) {
      const table = `${SCHEMA_NAME}.${row.relation_name}`;
      await pool.query(`TRUNCATE TABLE ${table} CASCADE;`);
    }
  } catch (error) {
    logger.error({ error });
  } /*finally {
    console.log("Tables successfully cleared of data");
  }*/

  return true;
}

/**
 * if you need to test this file, uncomment the code below
 * then run the following command to load .env on command line as you run the file
 *
 * node -r dotenv/config src/db/dbutil.js
 */
//clearAllTables();
