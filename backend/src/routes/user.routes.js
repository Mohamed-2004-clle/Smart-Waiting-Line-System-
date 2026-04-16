import express from "express";
import {
  getAllUsersController,
  createUserController,
  disableUserController,
  enableUserController
} from "../controllers/user.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { roleMiddleware } from "../middleware/role.middleware.js";
import { validationMiddleware } from "../middleware/validation.middleware.js";
import {
  getUsersValidator,
  createUserValidator,
  userStatusValidator
} from "../validators/user.validator.js";

const router = express.Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
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
 *         description: List of users
 */
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  getUsersValidator,
  validationMiddleware,
  getAllUsersController
);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
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
 *               - fullName
 *               - username
 *               - password
 *               - role
 *             properties:
 *               tenantId:
 *                 type: string
 *               fullName:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, manager, staff]
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  createUserValidator,
  validationMiddleware,
  createUserController
);

/**
 * @swagger
 * /api/users/disable:
 *   post:
 *     summary: Disable a user
 *     tags: [Users]
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
 *               - userId
 *             properties:
 *               tenantId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User disabled successfully
 */
router.post(
  "/disable",
  authMiddleware,
  roleMiddleware("admin"),
  userStatusValidator,
  validationMiddleware,
  disableUserController
);

/**
 * @swagger
 * /api/users/enable:
 *   post:
 *     summary: Enable a user
 *     tags: [Users]
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
 *               - userId
 *             properties:
 *               tenantId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User enabled successfully
 */
router.post(
  "/enable",
  authMiddleware,
  roleMiddleware("admin"),
  userStatusValidator,
  validationMiddleware,
  enableUserController
);

export default router;