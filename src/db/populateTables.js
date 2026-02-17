/* eslint-disable no-console */

/*
 !!! before running this code, we need to create the tables from setup-tables.sql !!! (npm run db:setup will do that)
*/

import { pool } from "./pool.js";

import fs from "fs";
import path from "path";

import "dotenv/config";
import url from "url";

// needed to hash the password value
import bcrypt from "bcrypt";
import { logger} from "./utils/logger.js";


