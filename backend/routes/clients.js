// ── Client Routes ────────────────────────────────────────────────────────────
import { Router } from "express";
import pkg from "@prisma/client";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { mapClientResponse } from "../utils/mappers.js";
import logger from "../utils/logger.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = Router();

// ── GET all clients for the authenticated user's org ─────────────────────────
router.get("/api/clients", authenticateToken, async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { organizationId: req.user.organizationId },
    });
    res.json(clients.map(mapClientResponse));
  } catch (err) {
    logger.error("GET /api/clients error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST create a new client ─────────────────────────────────────────────────
router.post(
  "/api/clients",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    const { name, type, address, lat, lng, phone, email, contactName, notes } =
      req.body;

    if (!name || !address || lat === undefined || lng === undefined) {
      return res.status(400).json({
        error: "Champs Nom, Adresse, lat et lng obligatoires",
      });
    }

    try {
      const clientsCount = await prisma.client.count();
      const newClient = await prisma.client.create({
        data: {
          id: `client_${clientsCount + 1}`,
          name,
          type: type || "particulier",
          address,
          latitude: lat,
          longitude: lng,
          phone: phone || "",
          email: email || "",
          contactName: contactName || "",
          notes: notes || "",
          archived: false,
          organizationId: req.user.organizationId,
        },
      });

      res.status(201).json(mapClientResponse(newClient));
    } catch (err) {
      logger.error("POST /api/clients error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

// ── PUT update an existing client ────────────────────────────────────────────
router.put(
  "/api/clients/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    const { id } = req.params;
    const {
      name,
      type,
      address,
      archived,
      lat,
      lng,
      phone,
      email,
      contactName,
      notes,
    } = req.body;

    try {
      const client = await prisma.client.findFirst({
        where: { id, organizationId: req.user.organizationId },
      });
      if (!client) {
        return res.status(404).json({ error: "Client introuvable." });
      }

      const dataToUpdate = { name, type, address, archived };
      if (lat !== undefined && lng !== undefined) {
        dataToUpdate.latitude = lat;
        dataToUpdate.longitude = lng;
      }
      if (phone !== undefined) dataToUpdate.phone = phone;
      if (email !== undefined) dataToUpdate.email = email;
      if (contactName !== undefined) {
        dataToUpdate.contactName = contactName;
      }
      if (notes !== undefined) dataToUpdate.notes = notes;

      const updated = await prisma.client.update({
        where: { id },
        data: dataToUpdate,
      });

      res.json(mapClientResponse(updated));
    } catch (err) {
      logger.error(`PUT /api/clients/${id} error:`, err);
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
