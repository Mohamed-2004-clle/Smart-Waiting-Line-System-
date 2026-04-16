import { body, query } from "express-validator";

export const getCountersValidator = [
  query("tenantId")
    .notEmpty()
    .withMessage("tenantId is required")
];

export const openCloseCounterValidator = [
  body("tenantId")
    .notEmpty()
    .withMessage("tenantId is required"),
  body("counterId")
    .notEmpty()
    .withMessage("counterId is required")
];

export const assignStaffToCounterValidator = [
  body("tenantId")
    .notEmpty()
    .withMessage("tenantId is required"),
  body("counterId")
    .notEmpty()
    .withMessage("counterId is required"),
  body("staffId")
    .notEmpty()
    .withMessage("staffId is required")
];