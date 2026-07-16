// ── Address Report Routes ────────────────────────────────────────────────────
import { Router } from "express";
import pkg from "@prisma/client";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { broadcastEvent } from "../utils/sse.js";
import logger from "../utils/logger.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = Router();

// ── GET all address reports (admin only) ─────────────────────────────────────
router.get(
  "/api/address-reports",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const reports = await prisma.addressReport.findMany({
        where: { organizationId: req.user.organizationId },
        orderBy: { createdAt: "desc" },
      });
      res.json(reports);
    } catch (err) {
      logger.error("GET /api/address-reports error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

// ── POST create a new report ─────────────────────────────────────────────────
router.post("/api/address-reports", authenticateToken, async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({
      error: "Le contenu du message est requis.",
    });
  }

  try {
    const newReport = await prisma.addressReport.create({
      data: {
        employeeId: req.user.id,
        employeeName: req.user.name,
        message: message.trim(),
        organizationId: req.user.organizationId,
      },
    });

    broadcastEvent({
      type: "ADDRESS_REPORT_CREATED",
      organizationId: req.user.organizationId,
      report: newReport,
      message: "Nouveau signalement d'adresse par " + req.user.name,
    });

    res.status(201).json(newReport);
  } catch (err) {
    logger.error("POST /api/address-reports error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE a report (admin only) ─────────────────────────────────────────────
router.delete(
  "/api/address-reports/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const report = await prisma.addressReport.findFirst({
        where: {
          id,
          organizationId: req.user.organizationId,
        },
      });
      if (!report) {
        return res.status(404).json({ error: "Signalement introuvable." });
      }

      await prisma.addressReport.delete({ where: { id } });

      broadcastEvent({
        type: "ADDRESS_REPORT_DELETED",
        organizationId: req.user.organizationId,
        reportId: id,
      });

      res.json({ message: "Signalement supprimé." });
    } catch (err) {
      logger.error(`DELETE /api/address-reports/${id} error:`, err);
      res.status(500).json({ error: err.message });
    }
  },
);

// ── Organization settings (logo) ─────────────────────────────────────────────
router.put(
  "/api/organizations/logo",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    const { logo } = req.body;
    if (logo === undefined) {
      return res.status(400).json({
        error: "Données du logo manquantes.",
      });
    }

    try {
      const updated = await prisma.organization.update({
        where: { id: req.user.organizationId },
        data: { logo },
      });

      res.json({
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        logo: updated.logo,
        inviteCode: updated.inviteCode,
      });
    } catch (err) {
      logger.error("PUT /api/organizations/logo error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
