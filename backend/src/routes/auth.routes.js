import express from "express";
import { loginController, logoutController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validationMiddleware } from "../middleware/validation.middleware.js";
import { body } from "express-validator";

const router = express.Router();

const loginValidator = [
  body("tenantId").notEmpty().withMessage("tenantId is required"),
  body("username").notEmpty().withMessage("username is required"),
  body("password").notEmpty().withMessage("password is required")
];

const logoutValidator = [
  body("tenantId").notEmpty().withMessage("tenantId is required")
];

router.post("/login", loginValidator, validationMiddleware, loginController);

router.post(
  "/logout",
  authMiddleware,
  logoutValidator,
  validationMiddleware,
  logoutController
);

export default router;