import { pool } from "./pool.js";
import { logger } from "../utils/logger.js";
import AppError from "../errors/AppError.js";

/**
 * get messages (and their images) minus those that were deleted in sent_at order
 * use a different query to get reactions and/or to get data on delivered/read
 * @param {*} chat_id 
 * @returns 
 */
export async function getChatMessages(chat_id) {
  logger.info("in getChatMessages:", { chat_id });
  try {
    const { rows } = await pool.query(
      `SELECT * FROM chinwag.message_details 
      WHERE chat_id = $1 AND deleted = FALSE ORDER BY sent_at;`, [chat_id]);

    return { rows };
  } catch (error) {
    logger.error("Get chat messages & update activity failed:", error);
    throw error;
  }
}

export async function addChat(auth_id, target_id) {
  logger.info("in addChat:", { auth_id, target_id });
  let newChat = false;
  let { rows } = await pool.query(
    `WITH curr_chat AS (SELECT m1.chat_id FROM chinwag.chat_members AS m1 WHERE m1.user_id = $1)
      SELECT m2.chat_id,m2.has_left FROM chinwag.chat_members AS m2 WHERE m2.user_id = $2 AND m2.chat_id IN (SELECT chat_id FROM curr_chat);`,
    [auth_id, target_id],
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
          [rows[0].id, auth_id, target_id],
        );
        logger.info("chinwag.members inserted row count: " + result.rowCount);
        
        await client.query("SAVEPOINT sp1");
        
        // Activity update — failure should NOT rollback the transaction
        try {
          await client.query(
            `INSERT INTO chinwag.activity (user_id)
         VALUES ($1)
         ON CONFLICT (user_id)
         DO UPDATE SET last_active = now();`,
            [auth_id],
          );
        } catch (err) {
          await client.query("ROLLBACK TO SAVEPOINT sp1");
          logger.error("Failed to update activity table:", err);
          // DO NOT throw to avoid rolling back the whole transaction
        }
        await client.query("COMMIT");
      } else {
        throw new AppError("Failed to complete new chat transaction");
      }
    } else if (rows.hasLeft) {
      await client.query(`UPDATE chinwag.chat_members SET has_left = FALSE WHERE chat_id=$1 AND user_id=$2`,[rows[0].id, auth_id])
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

/**
* Get a list of all chats this user is involved in and their new message counts
* (count unread messages belonging to the chat id that have not been authored by the user)
* @param {*} id
* @returns
*/
export async function getChats(user_id) {
  logger.info("in getChats: ", { user_id });
  const { rows } = await pool.query(
      `SELECT * FROM chinwag.getUnreadMsgCounts($1)`,
    [user_id],
  );
  return rows;
}


/**
*  Use this query with the same id to get the list of all the chats this user is in:
* 

with curr_chat as (select m1.chat_id from chinwag.chat_members as m1 where m1.user_id = 1) select m2.chat_id from chinwag.chat_members as m2 where m2.user_id = 1 and m2.chat_id IN (select chat_id from curr_chat);

or u can use a join

select m1.chat_id,m1.user_id as authUser, m2.user_id as targetUser from chinwag.chat_members as m1 left join chinwag.chat_members as m2 on m1.chat_id = m2.chat_id
where m1.user_id=1 and m2.user_id=1;

*/