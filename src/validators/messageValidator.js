import { param } from "express-validator";

import AppError from "../errors/AppError.js";

import * as messageQueries from "../db/messageQueries.js";
import ValidationError from "../errors/ValidationError.js";


const checkMessageId = () => {
  return param("id")
  .isInt({ min: 1 }).withMessage("Message id must be a number.").bail()
  .toInt()
  .custom(async (value, {req}) => {
    // check if the auth user owns the message being deleted or modified    
    try {
      const msgRow = await messageQueries.getMessage(value, req.user.id);
      if (msgRow) return true;
      throw new ValidationError("Failed to find this message or invalid id.");
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
  })
};
export const validateMessageId = [checkMessageId()];
