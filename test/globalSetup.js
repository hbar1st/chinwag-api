/* eslint-disable no-console */
// use this file to setup the tables for testing and clear them up at the end of each run
/* eslint-disable no-console */
import { config } from "dotenv";
import { pool } from "../src/db/pool.js";

// Load .env.test BEFORE anything else runs
config({ path: ".env.test" });


import { createTables } from "../src/db/createTables.js";
//import { clearAllTables } from "../src/db/dbutil.js";

export async function setup() {
  console.log("global setup is running");

  await createTables();
}


export function teardown() {
  console.log("teardown - clears all records from the tables");
  //await clearAllTables();
  return pool.end();

}


