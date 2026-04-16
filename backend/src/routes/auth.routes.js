import express from "express";
import { loginController } from "../controllers/auth.controller.js";
import { loginValidator } from "../validators/auth.validator.js";
import { validationMiddleware } from "../middleware/validation.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *               - username
 *               - password
 *             properties:
 *               tenantId:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", loginValidator, validationMiddleware, loginController);

export default router;