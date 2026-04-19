import express from "express";
import {
  createTicketController,
  getAllTicketsController,
  getTicketByIdController,
  getPublicTrackingTicketController,
  getQueueStatusByTrackController,
  callNextTicketController,
  completeCurrentTicketController,
  markCurrentTicketAbsentController
} from "../controllers/ticket.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { roleMiddleware } from "../middleware/role.middleware.js";
import { validationMiddleware } from "../middleware/validation.middleware.js";
import {
  createTicketValidator,
  getTicketsValidator,
  tenantOnlyValidator,
  getTicketByIdValidator,
  getQueueStatusByTrackValidator
} from "../validators/ticket.validator.js";

const router = express.Router();

router.post("/", createTicketValidator, validationMiddleware, createTicketController);
router.get("/", getTicketsValidator, validationMiddleware, getAllTicketsController);

router.get(
  "/track/:ticketId",
  getTicketByIdValidator,
  validationMiddleware,
  getPublicTrackingTicketController
);

router.get(
  "/internal/:ticketId",
  getTicketByIdValidator,
  validationMiddleware,
  getTicketByIdController
);

router.get(
  "/queue-status",
  getQueueStatusByTrackValidator,
  validationMiddleware,
  getQueueStatusByTrackController
);

router.post(
  "/call-next",
  authMiddleware,
  roleMiddleware("admin", "agent"),
  tenantOnlyValidator,
  validationMiddleware,
  callNextTicketController
);

router.post(
  "/complete",
  authMiddleware,
  roleMiddleware("admin", "agent"),
  tenantOnlyValidator,
  validationMiddleware,
  completeCurrentTicketController
);

router.post(
  "/absent",
  authMiddleware,
  roleMiddleware("admin", "agent"),
  tenantOnlyValidator,
  validationMiddleware,
  markCurrentTicketAbsentController
);

export default router;