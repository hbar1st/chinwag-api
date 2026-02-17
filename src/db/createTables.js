/* eslint-disable no-console */
// run this script once
// node -r dotenv/config -e "require('./src/db/createTables.js').createTables()"


import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { pool } from "./pool.js";

export async function createTables() {
  console.log("creating tables...");

  // Get the current file's URL
  const currentFileUrl = import.meta.url;
  
  // Convert the URL to a file path
  const currentFilePath = url.fileURLToPath(currentFileUrl);

  // Get the directory name from the file path
  const currentDirname = path.dirname(currentFilePath);

  const sqlFilePath = path.join(currentDirname, "setup-tables.sql");
  const sqlCode = fs.readFileSync(sqlFilePath, "utf8");

  try {
    await pool.query(sqlCode);
  } catch (err) {
    console.error(err);
  } finally {
    console.log("done");
    await pool.end();
  }
}
