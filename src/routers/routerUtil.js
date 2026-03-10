import { validationResult } from "express-validator";
import ValidationError from "../errors/ValidationError.js";
import { logger } from "../utils/logger.js";

import { STD_VALIDATION_MSG } from "../errors/ValidationError.js";
export function handleExpressValidationErrors(req, _res, next) {
  const errors = validationResult(req);

  if (errors && errors.length > 0) {
    logger.info("validation ERRORS? ", errors);
  } else {
    logger.info("no validation errors recorded")
  }
  if (!errors.isEmpty()) {
    logger.warn(`request url: ${req.url }`);
    
    logger.warn(`request body: `, req.body)
    throw new ValidationError(
      STD_VALIDATION_MSG,
      errors.array(),
    );
  } else {
    next();
  }
}
