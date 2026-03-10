// use this file to setup the tables for testing and clear them up at the end of each run
import { config } from "dotenv";

// Load .env.test BEFORE anything else runs with override to prevent other files from overriding it
config({ path: ".env.test", override: true });

// Now import modules that depend on env vars
import { pool } from "../src/db/pool.js";

import Image from "../src/utils/Image.js"

// Reload again in case any imports called dotenv/config
config({ path: ".env.test", override: true });

import { createTables } from "../src/db/createTables.js";

//import { clearAllTables } from "../src/db/dbutil.js";

export async function setup() {
  console.log("global setup is running");

  await createTables();
  await Image.deleteAll();
}


export function teardown() {
  console.log("teardown - clears all records from the tables");
  //await clearAllTables();
  return pool.end();

}


