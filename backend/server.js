// ── YA Consulting — Multi-Tenant API Server ──────────────────────────────────
import express from "express";
import cors from "cors";
import logger from "./utils/logger.js";
import { registerSSEClient } from "./utils/sse.js";
import { BODY_SIZE_LIMIT } from "./config/constants.js";

// Route modules
import authRoutes from "./routes/auth.js";
import clientRoutes from "./routes/clients.js";
import employeeRoutes from "./routes/employees.js";
import operationRoutes from "./routes/operations.js";
import pushRoutes from "./routes/push.js";
import reportRoutes from "./routes/reports.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ── Global Middleware ────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: BODY_SIZE_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_SIZE_LIMIT }));

// ── SSE Endpoint ─────────────────────────────────────────────────────────────
app.get("/api/events", (req, res) => {
  registerSSEClient(req, res);
});

// ── Mount Route Modules ──────────────────────────────────────────────────────
app.use(authRoutes);
app.use(clientRoutes);
app.use(employeeRoutes);
app.use(operationRoutes);
app.use(pushRoutes);
app.use(reportRoutes);

// ── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`Serveur API Multi-Tenant à l'écoute sur le port ${PORT}`);
});
