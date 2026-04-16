import { query } from "express-validator";

export const getAnalyticsValidator = [
  query("tenantId")
    .notEmpty()
    .withMessage("tenantId is required")
];