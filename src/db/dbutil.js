import { pool } from "./pool.js";
import logger from "../utils/logger.js";


const SCHEMA_NAME = 'chinwag';

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
    const table = `${row.schema_name}.${row.relation_name}`
    console.log(`clearing rows in: ${table}`);
    await pool.query(`TRUNCATE TABLE ${table} CASCADE;`);
  }
} catch (error) {
  console.log(error)
  logger.error({ error });
} finally {
  console.log("Tables successfully cleared of data");
  await pool.end();
}

  return true;
}

clearAllTables();