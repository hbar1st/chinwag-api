import { pool } from "./pool.js";
import { logger } from "../utils/logger.js";

export async function deleteMessage(msg_id, user_id) {
  logger.info("in deleteMessage:", { msg_id, user_id });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const { rows } = await client.query(
      "DELETE FROM chinwag.messages WHERE id = $1;",
      [msg_id],
    );
    await client.query("SAVEPOINT sp1");
    
    // Activity update — failure should NOT rollback the transaction
    try {
      await client.query(
        `INSERT INTO chinwag.activity (user_id)
      VALUES ($1)
      ON CONFLICT (user_id)
      DO UPDATE SET last_active = now();`,
        [user_id],
      );
    } catch (err) {
      await client.query("ROLLBACK TO SAVEPOINT sp1");
      logger.error("Failed to update activity table:", err);
      // DO NOT throw to avoid rolling back the whole transaction
    }
    await client.query("COMMIT");
    
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Delete Message failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

/**
* a way to mark a message as read
*/
export async function readMessage(user_id, id) {
  logger.info("in readMessage:", { user_id, id });
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const { rows } = await client.query(
      "UPDATE chinwag.messages_meta SET read_at = now() WHERE message_id = $1;",
      [id],
    );
    await client.query("SAVEPOINT sp1");
    
    // Activity update — failure should NOT rollback the transaction
    try {
      await client.query(
        `INSERT INTO chinwag.activity (user_id)
      VALUES ($1)
      ON CONFLICT (user_id)
      DO UPDATE SET last_active = now();`,
        [user_id],
      );
    } catch (err) {
      await client.query("ROLLBACK TO SAVEPOINT sp1");
      logger.error("Failed to update activity table:", err);
      // DO NOT throw to avoid rolling back the whole transaction
    }
    await client.query("COMMIT");
    
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Add New Chat Transaction failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

export async function editMessage(user_id, id, content) {
  logger.info("in editMessage: ", { user_id, id, content });
  const client = await pool.connect();
  try {
    
      await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE chinwag.messages AS m
       SET content = $1,
       updated_at = now()
       WHERE m.id = $2
       AND EXISTS (
       SELECT 1 
       FROM chinwag.chat_participants AS p WHERE p.id = $2 AND p.has_left=false AND p.chat_id = m.chat_id
    ) RETURNING m.id,m.content,m.updated_at,m.chat_id;`,
      [content, id],
    );
    await client.query("SAVEPOINT sp1");

    // Activity update — failure should NOT rollback the transaction
    try {
      
      
      await client.query(
        `INSERT INTO chinwag.activity (user_id)
      VALUES ($1)
      ON CONFLICT (user_id)
      DO UPDATE SET last_active = now();`,
        [user_id],
      );
    } catch (err) {
      await client.query("ROLLBACK TO SAVEPOINT sp1");
      logger.error("Failed to update activity table:", err);
      // DO NOT throw to avoid rolling back the whole transaction
    }
    await client.query("COMMIT");
    
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Edit Message failed: ", error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getMessage(id, user_id) {
  logger.info("in getMessage: " + id);
  const { rows } = await pool.query(
    "SELECT * FROM chinwag.messages AS m LEFT JOIN chinwag.messages_meta AS mm ON m.id = mm.message_id WHERE id=$1 AND author_id=$2;",
    [id, user_id],
  );
  return rows[0]; // return the first row only
}
export async function addMessage(author_id, chat_id, content, reply_to = null) {
  logger.info("in addMessage:", { author_id, chat_id, reply_to, content });
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const { rows } = await client.query(
      `INSERT INTO chinwag.messages (reply_to,content,chat_id,author_id) 
      VALUES ($1,$2,$3,$4) RETURNING id,reply_to,content,sent_at,chat_id;`,
      [reply_to, `${content}`, chat_id, author_id],
    );
    
    // get a list of recipients by getting a list of userids involved in the same chat
    const recipients = await client.query(
      `SELECT cm.user_id FROM chinwag.chat_members AS cm 
      WHERE chat_id = $1 AND has_left = FALSE AND user_id <> $2;`,
      [chat_id, author_id],
    );
    
    logger.info("message recipients list: ", recipients.rows);
    /*
    for (const recipient of recipients.rows) {
    // create a meta record for each intended recipient to keep track of when they read the message
    
    await client.query(
    `INSERT INTO chinwag.messages_meta (message_id, recipient_id) VALUES ($1, $2);`
    , [rows[0].id, recipient.user_id]
    )
    }
    */
    await client.query("SAVEPOINT sp1");
    
    // Activity update — failure should NOT rollback the transaction
    try {
      await client.query(
        `INSERT INTO chinwag.activity (user_id)
      VALUES ($1)
      ON CONFLICT (user_id)
      DO UPDATE SET last_active = now();`,
        [author_id],
      );
    } catch (err) {
      await client.query("ROLLBACK TO SAVEPOINT sp1");
      logger.error("Failed to update activity table:", err);
      // DO NOT throw to avoid rolling back the whole transaction
    }
    await client.query("COMMIT");
    
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Add New Chat Transaction failed:", error);
    throw error;
  } finally {
    client.release();
  }
}
