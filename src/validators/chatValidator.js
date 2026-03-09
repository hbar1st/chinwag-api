import { body, checkExact, param } from "express-validator";

import AuthError from "../errors/AuthError.js";

import { logger } from "../utils/logger.js";

import * as chatQueries from "../db/chatQueries.js";

import { checkUserId } from "./userValidator.js";
import { hasBadLanguage } from "../middleware/textFilter.js";

export const checkChatId = (isParam, name="id") => {
  const ch1 = isParam ? param(name) : body(name);
  return ch1
  .trim()
  .notEmpty()
  .withMessage("A chat id is required to complete the request.")
  .bail()
  .isInt({ min: 1 }).withMessage("chat id must be a number").bail()
  .toInt()
  .custom(async (value, {req}) => {
    logger.info(`try to validate if the authenticated user ${req.user.id} belongs to this chat: ${value}`);
    try {
      const memberRow = await chatQueries.getChatWithMember(
        value,
        req.user.id,
      );
      
      logger.info("chat member row found: ", memberRow);
      if (!memberRow) {
        throw new AuthError("Insufficient authorization for this action.");
      } else {
        return true;
      }
    } catch (error) {
      logger.error(error, { stack: error.stack });
      throw error;
    }
  });
};

/**
* checks if the user id is valid and not equal to the id of the authenticated user
*/
export const validateToUser = [
  checkExact(
    [
      checkUserId(false, "user_id"),
      body("user_id")
      .custom((value, { req }) => {
        return req.user.id !== value;
      })
      .withMessage("Chat should be with another person."),
    ],
    {
      message: "Unexpected fields were specified.",
    },
  ),
];

/**
* checks if the chat id is valid and if so, confirms that the auth user is a member of that chat
*/
export const validateChatMembership = [
  checkChatId(true),  
]

const checkMessageContent = () => {
  return body("content").trim().notEmpty().withMessage("Message must not be blank.").bail()
  .isLength({ max: 1000 }).withMessage("Message exceeded max 1000 character length.").bail()
  .custom(value => !hasBadLanguage(value)).withMessage('Captain America: "Language!"');
}

export const validateMessage = [
  checkMessageContent()
]