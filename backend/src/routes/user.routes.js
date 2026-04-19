import express from "express";
import {
  getAllUsersController,
  createUserController,
  disableUserController,
  enableUserController,
  deleteUserController
} from "../controllers/user.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { roleMiddleware } from "../middleware/role.middleware.js";
import { validationMiddleware } from "../middleware/validation.middleware.js";
import {
  getUsersValidator,
  createUserValidator,
  userStatusValidator
} from "../validators/user.validator.js";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  getUsersValidator,
  validationMiddleware,
  getAllUsersController
);

router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  createUserValidator,
  validationMiddleware,
  createUserController
);

router.post(
  "/disable",
  authMiddleware,
  roleMiddleware("admin"),
  userStatusValidator,
  validationMiddleware,
  disableUserController
);

router.post(
  "/enable",
  authMiddleware,
  roleMiddleware("admin"),
  userStatusValidator,
  validationMiddleware,
  enableUserController
);

router.post(
  "/delete",
  authMiddleware,
  roleMiddleware("admin"),
  userStatusValidator,
  validationMiddleware,
  deleteUserController
);

export default router;