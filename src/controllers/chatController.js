import { matchedData } from "express-validator";

import AppError from "../errors/AppError.js";
import * as chatQueries from "../db/chatQueries.js";
import { logger } from "../utils/logger.js";

/**
* get all the chats and their unread message count values for display
*/
export async function getAllChats(req, res) {
  const user = req.user;
  logger.info("in getAllChats");
  try {
    const chats = await chatQueries.getChats(user.id);
    res.status(200).json({ data: chats });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    } else {
      throw new AppError(
        "Failed to get a list of chats -",
        500,
        error,
      );
    }
  }
}

export async function getChatMessages(req, res) {
  const user = req.user;
  logger.info("in getChatMessages");
  
  const data = matchedData(req);
  try {
    const messages = await chatQueries.getMessages(data.id);
    res.status(200).json({ data: messages })
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    } else {
      throw new AppError("Failed to get a list of chats -", 500, error);
    }
  }
}

/**
* Either the target user has an ongoing chat already with the authenticated user or they don't
* if they don't, we make a new chat row, otherwise, we return the existing chat id
* @param {*} req
* @param {*} res
*/
export async function setupChat(req, res) {
  const user = req.user;
  
  const data = matchedData(req);
  logger.info(`in setupChat: `, user, data.user_id);
  try {
    const { newChat, chat } = await chatQueries.addChat(user.id, data.user_id);
    logger.info("newChat: "+newChat)
    if (chat) {
      const code = newChat ? 201 : 200;
      res.status(code).json({ data: chat });
    } else {
      throw new AppError("Failed to get or create the chat record.", 500);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    } else {
      throw new AppError(
        "Failed to get or create the chat record -",
        500,
        error,
      );
    }
  }
}
