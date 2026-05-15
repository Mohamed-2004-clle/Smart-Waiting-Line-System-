import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import { swaggerSpec } from "./config/swagger.js";

import ticketRoutes from "./routes/ticket.routes.js";
import authRoutes from "./routes/auth.routes.js";
import counterRoutes from "./routes/counter.routes.js";
import userRoutes from "./routes/user.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import trackingRoutes from "./routes/tracking.routes.js";

import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();

const FRONTEND_BASE_URL =
  process.env.FRONTEND_BASE_URL || "http://localhost:5173";

app.use(helmet());

app.use(
  cors({
    origin: FRONTEND_BASE_URL,
    credentials: true
  })
);

app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running"
  });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/tickets", ticketRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/counters", counterRoutes);
app.use("/api/users", userRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/track", trackingRoutes);

app.use(errorMiddleware);

export default app;