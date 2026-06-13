import express from "express";
import {
  subscribeToNotificationsController,
  sendTestNotificationController,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.post("/subscribe", subscribeToNotificationsController);
router.post("/test", sendTestNotificationController);

export default router;