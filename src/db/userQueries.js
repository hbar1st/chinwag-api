import { pool } from "./pool.js";
import { logger } from "../utils/logger.js";


import AppError from "../errors/AppError.js";

export async function findOtherUser(userId, email) {
  logger.info("in findOtherUser: ", { userId, email });
  const { rows } = await pool.query(
    "SELECT id,username,email,nickname,avatar_id FROM chinwag.users WHERE email=$1 AND id<>$2;",
    [email, Number(userId)],
  );
  return rows[0]; //return only the first row which hopefully exists
}

export async function findOtherUserByUsername(userId, username) {
  logger.info("in findOtherUserByUsername: ", { userId, username });
  const { rows } = await pool.query(
    "SELECT id,username,email,nickname,avatar_id FROM chinwag.users WHERE username=$1 AND id<>$2;",
    [username, Number(userId)],
  );
  return rows[0]; //return only the first row which hopefully exists
}

/**
 * Do a select from the view that joins the users table and the images table
 * @param {*} id 
 * @returns 
 */
export async function getUserProfile(id) {
  logger.info("in getUserProfile: ", { id });
  const { rows } = await pool.query("SELECT * FROM chinwag.user_profile WHERE id=$1", [id]);
  return rows[0]; //return only the first row only which hopefully exists
}

export async function getUserByEmail(email) {
  logger.info("in getUserByEmail: ", { email });
  const { rows } = await pool.query(
    "SELECT id,username,email,nickname,avatar_id FROM chinwag.users WHERE email=$1;",
    [email],
  );
  return rows[0]; //return only the first row which hopefully exists
}

export async function getUserByUsername(username) {
  logger.info("in getUserByUsername: ", { username });
  const { rows } = await pool.query(
    "SELECT id,username,email,nickname,avatar_id FROM chinwag.users WHERE username=$1;",
    [username],
  );
  return rows[0];
}

export async function getUserById(id) {
  logger.info("in getUserById: ", { id });
  const { rows } = await pool.query(
    "SELECT id,username,email,nickname,avatar_id FROM chinwag.users WHERE id=$1;",
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
    "SELECT id,username,email,nickname,avatar_id,pw.user_password FROM chinwag.users INNER JOIN chinwag.passwords AS pw ON chinwag.users.id=pw.user_id WHERE username=$1;",
    [username],
  );
  return rows[0]; // return the first row only
}

/**
 * deletes the user and the profile image but not their messages?
 * @param {} id 
 * @returns 
 */
export async function deleteUser(id) {
  logger.info("in deleteUser: ", { id });

  try {
    const { rows } = await pool.query(
      "DELETE FROM chinwag.users WHERE id=$1 RETURNING username,avatar_id",
      [id],
    );
    return rows[0];
  } catch (error) {
    logger.error("Add User Transaction failed:", error);
    throw error;
  } 
}

export async function updateProfileImage(user_id, public_id, resource_type, secure_url, old_avatar_id) {
  logger.info(
    "in updateProfileImage: ",
    {
      user_id,
      public_id,
      resource_type,
      secure_url,
      old_avatar_id
    },
  );
  
  const client = await pool.connect();
  try {
    // use a transaction to keep the tables in sync
    await client.query("BEGIN");

    const { rows } = await client.query(
      `INSERT INTO chinwag.images (img_url,resource_type,public_id)
       VALUES ($1, $2, $3) RETURNING id, img_url, public_id;`,
      [secure_url, resource_type, public_id],
    );

    logger.info("the new images row: ", rows)
    const avatar_id = rows[0].id;

    const result = await client.query(
      `UPDATE chinwag.users SET avatar_id = $1 WHERE id = $2
       RETURNING id, username, email, nickname, avatar_id;`,
      [avatar_id, user_id],
    );

    const user = result.rows[0];
    
    logger.info("the initial data for user: ", result);
    user["avatar_url"] = rows[0].img_url;
    user["public_id"] = rows[0].public_id;

    logger.info("the returned data for user: ", user)

    
    await client.query(`DELETE FROM chinwag.images WHERE id=${old_avatar_id};`);
    
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
       RETURNING id, username, email, nickname, avatar_id;`,
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
  avatar_id
}) {
  logger.info(`in updateUser: ${id}`, {username, email, nickname, avatar_id});

  if (!id) {
    throw new AppError("Cannot update a user without an id");
  }

  const sqlsnip = ["UPDATE chinwag.users SET"];
  const params = [Number(id)];

  if (username) {
    sqlsnip.push(`username=$${params.length + 1}${email||nickname ? "," : ""}`);
    params.push(username);
  }
  if (email) {
    sqlsnip.push(`email=$${params.length + 1}${nickname ? "," : ""}`);
    params.push(email);
  }
  if (nickname) {
    sqlsnip.push(`nickname=$${params.length + 1}`);
    params.push(nickname)
  }
  sqlsnip.push("WHERE id=$1 RETURNING id,username,email,nickname,avatar_id;");
  logger.info(`Query to be run: ${sqlsnip.join(" ")}`)

  const { rows } = await pool.query(sqlsnip.join(" "), params);
  logger.info("updateUser query result: ", rows);
  return rows[0];
}
