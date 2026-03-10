// Routes belonging to /foodbank

import { Router } from "express";

import passport from "passport";

import { handleExpressValidationErrors } from "./routerUtil.js";

import * as messageValidator from "../validators/messageValidator.js";

import * as messageController from "../controllers/messageController.js";

const messageRouter = Router();


messageRouter
  .route("/:id")
  .delete(
    passport.authenticate("jwt", { session: false }),
    messageValidator.validateMessageId,
    handleExpressValidationErrors,
    messageController.deleteMessage,
  );


export default messageRouter;
