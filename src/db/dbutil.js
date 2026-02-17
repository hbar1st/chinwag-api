/* eslint-disable no-console */

import { pool } from "./pool.js";
import { getLogger } from "./utils/logger.js";
const logger = getLogger(); "../utils/logger.js";

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
    table_schema AS schema_name,
    table_name AS relation_name,
    table_type AS relation_type
FROM
    information_schema.tables
WHERE
    table_schema = '${SCHEMA_NAME}'
ORDER BY
    table_schema,
    table_name;`,
    );

    for (const row of rows) {
      const table = `${row.schema_name}.${row.relation_name}`;
      console.log(`clearing rows in: ${table}`);
      await pool.query(`TRUNCATE TABLE ${table} CASCADE;`);
    }
  } catch (error) {
    console.log(error);
    logger.error({ error });
  } finally {
    console.log("Tables successfully cleared of data");
    await pool.end();
  }

  return true;
}

/**
 * if you need to test this file, uncomment the code below
 * then run the following command to load .env on command line as you run the file
 *
 * node -r dotenv/config src/db/dbutil.js
 */
//clearAllTables();
