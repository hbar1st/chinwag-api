// Routes belonging to /user 

import { Router } from "express";

import passport from "passport";

import * as userController from "../controllers/userController.js";

import { handleExpressValidationErrors } from "./routerUtil.js";

import * as userValidator from "../validators/userValidator.js";

const userRouter = Router();


userRouter
  .route("/signup")
  .post(
    userValidator.validateUserFields,
    handleExpressValidationErrors,
    userController.signUp,
  );

userRouter
  .route("/login")
  .post(
    userValidator.validateUserLoginFields,
    handleExpressValidationErrors,
    userController.login,
  );

// note that we retrieve the user id from the jwt token so we don't need it specified in the route
userRouter
  .route("/")
  .put(
    passport.authenticate("jwt", { session: false }),
    userValidator.bodyExists,
    handleExpressValidationErrors,
    userValidator.validateOptionalUserFields,
    handleExpressValidationErrors,
    userController.updateUser
)
  .get(
    passport.authenticate("jwt", { session: false }),
    userController.getUser,
  );
  /* TODO
  .delete(passport.authenticate("jwt", { session: false }), deleteUser);
  */

export default userRouter;