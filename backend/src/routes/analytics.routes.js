import express from "express";
import { getDashboardAnalyticsController } from "../controllers/analytics.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { roleMiddleware } from "../middleware/role.middleware.js";
import { validationMiddleware } from "../middleware/validation.middleware.js";
import { getAnalyticsValidator } from "../validators/analytics.validator.js";

const router = express.Router();

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get dashboard analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard analytics data
 *       403:
 *         description: Forbidden
 */
router.get(
  "/dashboard",
  authMiddleware,
  roleMiddleware("admin", "manager"),
  getAnalyticsValidator,
  validationMiddleware,
  getDashboardAnalyticsController
);

export default router;