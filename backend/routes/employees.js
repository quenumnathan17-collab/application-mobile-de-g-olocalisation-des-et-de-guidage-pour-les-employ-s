// ── Employee Routes ──────────────────────────────────────────────────────────
import { Router } from "express";
import pkg from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { mapEmployeeResponse } from "../utils/mappers.js";
import { broadcastEvent } from "../utils/sse.js";
import logger from "../utils/logger.js";
import {
  AVATAR_PRESETS,
  BCRYPT_ROUNDS,
  DEFAULT_LATITUDE,
  DEFAULT_LONGITUDE,
  DEFAULT_WORKING_HOURS_START,
  DEFAULT_WORKING_HOURS_END,
} from "../config/constants.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = Router();

/**
 * Generate a random temporary password (12 chars).
 * @returns {string}
 */
function generateTempPassword() {
  return crypto.randomBytes(6).toString("base64url");
}

// ── GET all employees ────────────────────────────────────────────────────────
router.get("/api/employees", authenticateToken, async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { organizationId: req.user.organizationId },
    });
    res.json(employees.map(mapEmployeeResponse));
  } catch (err) {
    logger.error("GET /api/employees error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST create a new employee (admin only) ──────────────────────────────────
router.post(
  "/api/employees",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    const { name, email, phone, role, avatar } = req.body;
    if (!name || !email || !phone || !role) {
      return res.status(400).json({
        error: "Tous les champs sont requis.",
      });
    }

    try {
      const existing = await prisma.employee.findFirst({
        where: { OR: [{ email }, { phone }] },
      });
      if (existing) {
        return res.status(400).json({
          error: "Un employé avec cet email ou téléphone existe déjà.",
        });
      }

      const empCount = await prisma.employee.count();
      const tempPassword = generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
      const chosenAvatar =
        avatar || AVATAR_PRESETS[empCount % AVATAR_PRESETS.length];

      logger.info(`Mot de passe temporaire pour ${email}: ${tempPassword}`);

      const newEmp = await prisma.employee.create({
        data: {
          id: `emp_${empCount + 1}_${Date.now()}`,
          name,
          email,
          phone,
          role,
          status: "active",
          latitude: DEFAULT_LATITUDE,
          longitude: DEFAULT_LONGITUDE,
          workingHoursStart: DEFAULT_WORKING_HOURS_START,
          workingHoursEnd: DEFAULT_WORKING_HOURS_END,
          avatar: chosenAvatar,
          password: hashedPassword,
          organizationId: req.user.organizationId,
        },
      });

      res.status(201).json(mapEmployeeResponse(newEmp));
    } catch (err) {
      logger.error("POST /api/employees error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

// ── PUT update an employee (admin only) ──────────────────────────────────────
router.put(
  "/api/employees/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, role, status, avatar } = req.body;

    try {
      const employee = await prisma.employee.findFirst({
        where: {
          id,
          organizationId: req.user.organizationId,
        },
      });
      if (!employee) {
        return res.status(404).json({
          error: "Employé introuvable dans cette entreprise.",
        });
      }

      const updated = await prisma.employee.update({
        where: { id },
        data: { name, email, phone, role, status, avatar },
      });

      res.json(mapEmployeeResponse(updated));
    } catch (err) {
      logger.error(`PUT /api/employees/${id} error:`, err);
      res.status(500).json({ error: err.message });
    }
  },
);

// ── DELETE an employee (admin only) ──────────────────────────────────────────
router.delete(
  "/api/employees/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const employee = await prisma.employee.findFirst({
        where: {
          id,
          organizationId: req.user.organizationId,
        },
      });
      if (!employee) {
        return res.status(404).json({
          error: "Employé introuvable dans cette entreprise.",
        });
      }

      await prisma.employee.delete({ where: { id } });
      res.json({ success: true });
    } catch (err) {
      logger.error(`DELETE /api/employees/${id} error:`, err);
      res.status(500).json({ error: err.message });
    }
  },
);

// ── PUT update own profile ───────────────────────────────────────────────────
router.put(
  "/api/employees/:id/profile",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;

    if (req.user.id !== id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Accès refusé." });
    }

    const { name, email, phone, avatar, currentPassword, newPassword } =
      req.body;

    try {
      const user = await prisma.employee.findFirst({
        where: {
          id,
          organizationId: req.user.organizationId,
        },
      });
      if (!user) {
        return res.status(404).json({ error: "Employé introuvable." });
      }

      const dataToUpdate = {};

      if (name && name.trim()) {
        dataToUpdate.name = name.trim();
      }
      if (email && email.trim()) {
        const conflict = await prisma.employee.findFirst({
          where: {
            email: email.trim().toLowerCase(),
            NOT: { id },
          },
        });
        if (conflict) {
          return res.status(400).json({
            error: "Cet email est déjà utilisé par un autre compte.",
          });
        }
        dataToUpdate.email = email.trim().toLowerCase();
      }
      if (phone && phone.trim()) {
        dataToUpdate.phone = phone.trim();
      }
      if (avatar !== undefined) {
        dataToUpdate.avatar = avatar;
      }

      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({
            error: "Veuillez fournir votre mot de passe actuel.",
          });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(401).json({
            error: "Mot de passe actuel incorrect.",
          });
        }
        if (newPassword.length < 6) {
          return res.status(400).json({
            error:
              "Le nouveau mot de passe doit contenir" +
              " au moins 6 caractères.",
          });
        }
        dataToUpdate.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      }

      const updated = await prisma.employee.update({
        where: { id },
        data: dataToUpdate,
      });

      res.json(mapEmployeeResponse(updated));
    } catch (err) {
      logger.error(`PUT /api/employees/${id}/profile error:`, err);
      res.status(500).json({ error: err.message });
    }
  },
);

// ── PUT update tech live GPS ─────────────────────────────────────────────────
router.put("/api/employees/:id/gps", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({
      error: "Coordonnées lat et lng obligatoires",
    });
  }

  if (req.user.id !== id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Accès refusé." });
  }

  try {
    const updated = await prisma.employee.update({
      where: { id },
      data: { latitude: lat, longitude: lng },
    });

    broadcastEvent({
      type: "EMPLOYEE_GPS_UPDATED",
      employeeId: id,
      organizationId: req.user.organizationId,
      gps: { lat, lng },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      status: updated.status,
      gps: { lat: updated.latitude, lng: updated.longitude },
      avatar: updated.avatar,
    });
  } catch (err) {
    logger.error(`PUT /api/employees/${id}/gps error:`, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
