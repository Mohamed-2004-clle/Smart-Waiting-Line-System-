import { body, query, param } from "express-validator";

export const createTicketValidator = [
  body("tenantId")
    .notEmpty()
    .withMessage("tenantId is required"),

  body("track")
    .notEmpty()
    .withMessage("track is required")
    .isIn(["A", "B", "C"])
    .withMessage("track must be A, B, or C"),

  body("customerType")
    .notEmpty()
    .withMessage("customerType is required")
    .isIn([
      "company",
      "professional",
      "vip",
      "medical",
      "elderly",
      "special-needs",
      "regular"
    ])
    .withMessage(
      "customerType must be one of: company, professional, vip, medical, elderly, special-needs, regular"
    ),

  body("companyName")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("companyName must be a string")
];

export const getTicketsValidator = [
  query("tenantId")
    .notEmpty()
    .withMessage("tenantId is required")
];

export const tenantOnlyValidator = [
  body("tenantId")
    .notEmpty()
    .withMessage("tenantId is required")
];

export const getTicketByIdValidator = [
  param("ticketId")
    .notEmpty()
    .withMessage("ticketId is required"),

  query("tenantId")
    .notEmpty()
    .withMessage("tenantId is required")
];

export const getQueueStatusByTrackValidator = [
  query("tenantId")
    .notEmpty()
    .withMessage("tenantId is required"),

  query("track")
    .notEmpty()
    .withMessage("track is required")
    .isIn(["A", "B", "C"])
    .withMessage("track must be A, B, or C")
];