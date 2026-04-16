import express from "express";
import {
  createTicketController,
  getAllTicketsController,
  getTicketByIdController,
  getPublicTrackingTicketController,
  getQueueStatusByTrackController,
  callNextTicketController,
  completeCurrentTicketController
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

/**
 * @swagger
 * /api/tickets:
 *   post:
 *     summary: Create a new ticket with track selection
 *     tags: [Tickets]
 */
router.post("/", createTicketValidator, validationMiddleware, createTicketController);

/**
 * @swagger
 * /api/tickets:
 *   get:
 *     summary: Get all tickets
 *     tags: [Tickets]
 */
router.get("/", getTicketsValidator, validationMiddleware, getAllTicketsController);

/**
 * @swagger
 * /api/tickets/track/{ticketId}:
 *   get:
 *     summary: Public tracking API for one ticket
 *     tags: [Tickets]
 */
router.get(
  "/track/:ticketId",
  getTicketByIdValidator,
  validationMiddleware,
  getPublicTrackingTicketController
);

/**
 * @swagger
 * /api/tickets/internal/{ticketId}:
 *   get:
 *     summary: Internal get ticket by id
 *     tags: [Tickets]
 */
router.get(
  "/internal/:ticketId",
  getTicketByIdValidator,
  validationMiddleware,
  getTicketByIdController
);

/**
 * @swagger
 * /api/tickets/queue-status:
 *   get:
 *     summary: Get queue status by track
 *     tags: [Tickets]
 */
router.get(
  "/queue-status",
  getQueueStatusByTrackValidator,
  validationMiddleware,
  getQueueStatusByTrackController
);

/**
 * @swagger
 * /api/tickets/call-next:
 *   post:
 *     summary: Call next ticket based on role and priority
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/call-next",
  authMiddleware,
  roleMiddleware("admin", "agent"),
  tenantOnlyValidator,
  validationMiddleware,
  callNextTicketController
);

/**
 * @swagger
 * /api/tickets/complete:
 *   post:
 *     summary: Complete current ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/complete",
  authMiddleware,
  roleMiddleware("admin", "agent"),
  tenantOnlyValidator,
  validationMiddleware,
  completeCurrentTicketController
);

export default router;