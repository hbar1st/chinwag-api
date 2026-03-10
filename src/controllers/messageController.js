import { matchedData } from "express-validator";

import AppError from "../errors/AppError.js";

import * as messageQueries from "../db/messageQueries.js";
import ValidationError, {
  STD_VALIDATION_MSG,
} from "../errors/ValidationError.js";

export async function deleteMessage(req, res) {
  try {
    const data = matchedData(req);
    await messageQueries.deleteMessage(data.id);
    res.status(204).end();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    } else {
      throw new AppError("Failed to delete message -", 500, error);
    }
  }
}

export async function editMessage(req, res) {
  try {
    const data = matchedData(req);
    const row = await messageQueries.editMessage(req.user.id, data.id, data.content);
    if (row) {
      res.status(200).json({ data: row });
    } else {
      throw new ValidationError(STD_VALIDATION_MSG, 
        [{ msg: "Cannot remove message if user is no longer in the chat." }]);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    } else {
      throw new AppError("Failed to edit message -", 500, error);
    }
  }
}