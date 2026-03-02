
/*
import { pool } from "./pool.js";
import { logger } from "../utils/logger.js";
import AppError from "../errors/AppError.js";
*/
/*
export async function addMessage(chat_id, author_id, target_id, content, reply_to) {
  logger.info("in addMessage:", { chat_id, author_id, target_id, reply_to });
  let newChat = false;
  let { rows } = await pool.query(
    `WITH curr_chat AS (SELECT m1.chat_id FROM chinwag.chat_members AS m1 WHERE m1.user_id = $1)
      SELECT m2.chat_id,m2.has_left FROM chinwag.chat_members AS m2 WHERE m2.user_id = $2 AND m2.chat_id IN (SELECT chat_id FROM curr_chat);`,
    [author_id, target_id],
  );
  
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (!rows.length) {
        newChat = true;

        ({ rows } = await client.query(
          `INSERT INTO chinwag.chats (name) VALUES ('chat') RETURNING id,name,created_at;`,
        ));
        logger.info("new chat rows: ", rows);
        if (rows[0].id) {
          const result = await client.query(
            `INSERT INTO chinwag.chat_members (chat_id, user_id) VALUES ($1,$2), ($1,$3);`,
            [rows[0].id, author_id, target_id],
          );
          logger.info("chinwag.members inserted row count: "+result.rowCount);
          await client.query("COMMIT");
        } else {
          throw new AppError("Failed to complete new chat transaction");
        }
      } else if (rows.hasLeft) {
        await client.query(`UPDATE chinwag.chat_members SET has_left = FALSE WHERE chat_id=$1 AND user_id=$2`,[rows[0].id, author_id])
      }
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Add New Chat Transaction failed:", error);
      throw error;
    } finally {
      client.release();
    }
  return { newChat, chat: rows[0] };
}
  */