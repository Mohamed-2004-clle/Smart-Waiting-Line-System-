import express from "express";
import {
  getAllCountersController,
  openCounterController,
  closeCounterController,
  assignStaffToCounterController
} from "../controllers/counter.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { roleMiddleware } from "../middleware/role.middleware.js";
import { validationMiddleware } from "../middleware/validation.middleware.js";
import {
  getCountersValidator,
  openCloseCounterValidator,
  assignStaffToCounterValidator
} from "../validators/counter.validator.js";

const router = express.Router();

/**
 * @swagger
 * /api/counters:
 *   get:
 *     summary: Get all counters
 *     tags: [Counters]
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of counters
 */
router.get(
  "/",
  getCountersValidator,
  validationMiddleware,
  getAllCountersController
);

/**
 * @swagger
 * /api/counters/open:
 *   post:
 *     summary: Open a counter
 *     tags: [Counters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *               - counterId
 *             properties:
 *               tenantId:
 *                 type: string
 *               counterId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Counter opened successfully
 */
router.post(
  "/open",
  authMiddleware,
  roleMiddleware("admin", "agent"),
  openCloseCounterValidator,
  validationMiddleware,
  openCounterController
);

/**
 * @swagger
 * /api/counters/close:
 *   post:
 *     summary: Close a counter
 *     tags: [Counters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *               - counterId
 *             properties:
 *               tenantId:
 *                 type: string
 *               counterId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Counter closed successfully
 */
router.post(
  "/close",
  authMiddleware,
  roleMiddleware("admin", "agent"),
  openCloseCounterValidator,
  validationMiddleware,
  closeCounterController
);

/**
 * @swagger
 * /api/counters/assign-staff:
 *   post:
 *     summary: Assign agent/admin to counter
 *     tags: [Counters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *               - counterId
 *               - staffId
 *             properties:
 *               tenantId:
 *                 type: string
 *               counterId:
 *                 type: string
 *               staffId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Staff assigned successfully
 */
router.post(
  "/assign-staff",
  authMiddleware,
  roleMiddleware("admin"),
  assignStaffToCounterValidator,
  validationMiddleware,
  assignStaffToCounterController
);

export default router;