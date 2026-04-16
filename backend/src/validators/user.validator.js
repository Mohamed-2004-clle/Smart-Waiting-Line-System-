import { body, query } from "express-validator";

export const getUsersValidator = [
  query("tenantId")
    .notEmpty()
    .withMessage("tenantId is required")
];

export const createUserValidator = [
  body("tenantId")
    .notEmpty()
    .withMessage("tenantId is required"),

  body("fullName")
    .notEmpty()
    .withMessage("fullName is required"),

  body("username")
    .notEmpty()
    .withMessage("username is required"),

  body("password")
    .notEmpty()
    .withMessage("password is required"),

  body("role")
    .notEmpty()
    .withMessage("role is required")
    .isIn(["admin", "manager", "agent"])
    .withMessage("role must be admin, manager, or agent")
];

export const userStatusValidator = [
  body("tenantId")
    .notEmpty()
    .withMessage("tenantId is required"),

  body("userId")
    .notEmpty()
    .withMessage("userId is required")
];