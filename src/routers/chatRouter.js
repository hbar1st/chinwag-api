// Routes belonging to /chat

import { Router } from "express";

import passport from "passport";

import * as chatController from "../controllers/chatController.js";

import { handleExpressValidationErrors } from "./routerUtil.js";

import * as chatValidator from "../validators/chatValidator.js";

const chatRouter = Router();


chatRouter
  .route("/")
  .get(
    passport.authenticate("jwt", { session: false }),
    chatController.getAllChats,
  )
  .post(
    passport.authenticate("jwt", { session: false }),
    chatValidator.validateToUser, //validates the user we are chatting to in the body of the request
    handleExpressValidationErrors,
    chatController.setupChat,
  );

// if the auth user is not a member of the chat, the validation should fail
chatRouter
  .route("/:id/message")
  .post(passport.authenticate("jwt", { session: false }),
    chatValidator.validateChatMembership,
    handleExpressValidationErrors,
  chatController.addMessage);

    
chatRouter
  .route("/:id")
  .get(
    passport.authenticate("jwt", { session: false }),
    chatValidator.validateChatMembership,
    handleExpressValidationErrors,
    chatController.getChat,
  )
  .delete(
    passport.authenticate("jwt", { session: false }),
    chatValidator.validateChatMembership,
    handleExpressValidationErrors,
    chatController.leaveChat,
  );

export default chatRouter;