import express from "express";
import { renderTrackingPageController } from "../controllers/tracking.controller.js";

const router = express.Router();

router.get("/:ticketId", renderTrackingPageController);

export default router;