import { body } from "express-validator";

export const loginValidator = [
  body("tenantId")
    .notEmpty()
    .withMessage("tenantId is required"),

  body("username")
    .notEmpty()
    .withMessage("username is required"),

  body("password")
    .notEmpty()
    .withMessage("password is required")
];