import { pool } from "./pool.js";
import { logger } from "../utils/logger.js";


import AppError from "../errors/AppError.js";

export async function findOtherUser(userId, email) {
  logger.info("in findOtherUser: ", { userId, email });
  const { rows } = await pool.query(
    "SELECT id,username,email,nickname,avatar_url FROM chinwag.users WHERE email=$1 AND id<>$2;",
    [email, Number(userId)],
  );
  return rows[0]; //return only the first row which hopefully exists
}

export async function findOtherUserByUsername(userId, username) {
  logger.info("in findOtherUserByUsername: ", { userId, username });
  const { rows } = await pool.query(
    "SELECT id,username,email,nickname,avatar_url FROM chinwag.users WHERE username=$1 AND id<>$2;",
    [username, Number(userId)],
  );
  return rows[0]; //return only the first row which hopefully exists
}

export async function getUserByEmail(email) {
  logger.info("in getUserByEmail: ", { email });
  const { rows } = await pool.query(
    "SELECT id,username,email,nickname,avatar_url FROM chinwag.users WHERE email=$1;",
    [email],
  );
  return rows[0]; //return only the first row which hopefully exists
}

export async function getUserByUsername(username) {
  logger.info("in getUserByUsername: ", { username });
  const { rows } = await pool.query(
    "SELECT id,username,email,nickname,avatar_url FROM chinwag.users WHERE username=$1;",
    [username],
  );
  return rows[0];
}

export async function getUserById(id) {
  logger.info("in getUserById: ", { id });
  const { rows } = await pool.query(
    "SELECT id,username,email,nickname,avatar_url FROM chinwag.users WHERE id=$1;",
    [id],
  );
  return rows[0];
}

export async function getUserPasswordById(id) {
  logger.info("in getUserPasswordById: ", { id });
  const { rows } = await pool.query(
    "SELECT id,username,email,pw.user_password FROM chinwag.users INNER JOIN chinwag.passwords AS pw ON chinwag.users.id=pw.user_id WHERE id=$1;",
    [id],
  );
  return rows[0]; // return the first row only
}

export async function getUserPassword(username) {
  logger.info("in getUserPassword: ", { username });
  const { rows } = await pool.query(
    "SELECT id,username,email,nickname,avatar_url,pw.user_password FROM chinwag.users INNER JOIN chinwag.passwords AS pw ON chinwag.users.id=pw.user_id WHERE username=$1;",
    [username],
  );
  return rows[0]; // return the first row only
}

export async function updateUserPwd(id, password) {
  logger.info(`in updateUserPwd: ${id}`);
  if (!id) {
    throw new AppError("Cannot update a user password without the id");
  }

  const { rows } = await pool.query(
    `UPDATE chinwag.passwords SET user_password=$1 WHERE user_id=$2`,
    [password, id],
  );
  return rows;
}

export async function addNewUser(username, email, nickname, password) {
  logger.info("in addNewUser:", { username, email, nickname });

  const client = await pool.connect();

  try {
    // use a transaction to keep the tables in sync
    await client.query("BEGIN");

    const { rows } = await client.query(
      `INSERT INTO chinwag.users (username, email, nickname)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, nickname, avatar_url;`,
      [username, email, nickname],
    );

    const user = rows[0];

    await client.query(
      `INSERT INTO chinwag.passwords (user_id, user_password)
       VALUES ($1, $2);`,
      [user.id, password],
    );

    await client.query("COMMIT");
    return user;
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Add User Transaction failed:", error);
    throw error;
  } finally {
    client.release();
  }
}



export async function updateUser(id, {
  username,
  email,
  nickname,
  avatar_url
}) {
  logger.info(`in updateUser: ${id}`, {username, email, nickname, avatar_url});

  if (!id) {
    throw new AppError("Cannot update a user without an id");
  }

  const sqlsnip = ["UPDATE chinwag.users SET"];
  const params = [Number(id)];

  if (username) {
    sqlsnip.push(`username=$${params.length + 1}${email ? "," : ""}`);
    params.push(username);
  }
  if (email) {
    sqlsnip.push(`email=$${params.length + 1}`);
    params.push(email);
  }
  sqlsnip.push("WHERE id=$1 RETURNING id,username,email;");
  logger.info(`Query to be run: ${sqlsnip.join(" ")}`)

  const { rows } = await pool.query(sqlsnip.join(" "), params);
  logger.info("updateUser query result: ", rows);
  return rows[0];
}
