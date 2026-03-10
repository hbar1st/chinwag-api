

import { matchedData } from "express-validator";

import AppError from "../errors/AppError.js";

import * as messageQueries from "../db/messageQueries.js";

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
