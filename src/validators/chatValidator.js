import { body, checkExact } from "express-validator";
/*
import ValidationError from "../errors/ValidationError.js";
import AuthError from "../errors/AuthError.js";

import { logger } from "../utils/logger.js";
*/

import { checkUserId } from "./userValidator.js";

/**
 * checks if the user id is valid and not equal to the id of the authenticated user
 */
export const validateToUser = [
  checkExact(
    [checkUserId(false, "user_id"), body('user_id').custom((value, {req}) => {
      return req.user.id !== value;
    })]
  ,{
      message: "Unexpected fields were specified.",
  },
  ),
]
