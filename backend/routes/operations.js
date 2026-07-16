// ── Operation Routes ─────────────────────────────────────────────────────────
import { Router } from "express";
import pkg from "@prisma/client";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { broadcastEvent } from "../utils/sse.js";
import { sendPushNotification } from "../utils/push.js";
import logger from "../utils/logger.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = Router();

// ── GET all operations ───────────────────────────────────────────────────────
router.get("/api/operations", authenticateToken, async (req, res) => {
  try {
    const operations = await prisma.operation.findMany({
      where: { organizationId: req.user.organizationId },
    });
    res.json(operations);
  } catch (err) {
    logger.error("GET /api/operations error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST create a new operation (admin only) ─────────────────────────────────
router.post(
  "/api/operations",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    const { clientId, description, date, employeeId } = req.body;
    if (!clientId || !description || !date || !employeeId) {
      return res.status(400).json({
        error: "Tous les champs d'opération sont obligatoires",
      });
    }

    try {
      const opsCount = await prisma.operation.count();
      const newOp = await prisma.operation.create({
        data: {
          id: `op_${opsCount + 1}`,
          clientId,
          description,
          date,
          employeeId,
          status: "planifiée",
          organizationId: req.user.organizationId,
        },
      });

      broadcastEvent({
        type: "OPERATION_ASSIGNED",
        organizationId: req.user.organizationId,
        operationId: newOp.id,
        employeeId,
        message:
          "Nouvelle mission assignée pour le " +
          new Date(date).toLocaleDateString(),
      });

      sendPushNotification(employeeId, {
        title: "Nouvelle mission assignée",
        body:
          `Mission: ${description} (prévue le ` +
          `${new Date(date).toLocaleDateString()})`,
        data: { url: "/?tab=list" },
      });

      res.status(201).json(newOp);
    } catch (err) {
      logger.error("POST /api/operations error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

// ── PUT update operation status ──────────────────────────────────────────────
router.put(
  "/api/operations/:id/status",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Statut manquant" });
    }

    try {
      const op = await prisma.operation.findFirst({
        where: {
          id,
          organizationId: req.user.organizationId,
        },
      });
      if (!op) {
        return res.status(404).json({ error: "Opération introuvable." });
      }

      const updated = await prisma.operation.update({
        where: { id },
        data: { status },
      });

      broadcastEvent({
        type: "OPERATION_STATUS_CHANGED",
        organizationId: req.user.organizationId,
        operationId: id,
        newStatus: status,
        message: `La mission ${id} est maintenant: ${status}`,
      });

      sendPushNotification(updated.employeeId, {
        title: "Statut de mission mis à jour",
        body: `La mission ${id} a été mise à jour: ${status}`,
        data: { url: "/?tab=list" },
      });

      res.json(updated);
    } catch (err) {
      logger.error(`PUT /api/operations/${id}/status error:`, err);
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
