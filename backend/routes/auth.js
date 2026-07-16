// ── Auth & Onboarding Routes ─────────────────────────────────────────────────
import { Router } from "express";
import pkg from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import logger from "../utils/logger.js";
import { mapOrganizationResponse } from "../utils/mappers.js";
import {
  AVATAR_PRESETS,
  BCRYPT_ROUNDS,
  JWT_EXPIRY,
  DEFAULT_LATITUDE,
  DEFAULT_LONGITUDE,
  DEFAULT_WORKING_HOURS_START,
  DEFAULT_WORKING_HOURS_END,
} from "../config/constants.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "ya-consulting-dev-only";

// ── SaaS Onboarding (Create Organization + Admin) ────────────────────────────
router.post("/api/organizations", async (req, res) => {
  const { companyName, email, phone, sector, adminName, password } = req.body;

  if (!companyName || !email || !adminName || !password) {
    return res.status(400).json({
      error:
        "Nom de l'entreprise, email, nom de l'administrateur" +
        " et mot de passe requis.",
    });
  }

  try {
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const existingOrg = await prisma.organization.findFirst({
      where: { OR: [{ email }, { slug }] },
    });
    if (existingOrg) {
      return res.status(400).json({
        error: "Cette entreprise ou cet e-mail est déjà enregistré.",
      });
    }

    const existingEmp = await prisma.employee.findFirst({
      where: { email },
    });
    if (existingEmp) {
      return res.status(400).json({
        error: "Cet e-mail est déjà utilisé pour un compte collaborateur.",
      });
    }

    const inviteCode = "invite_" + Math.random().toString(36).substring(2, 9);

    const newOrg = await prisma.organization.create({
      data: {
        name: companyName.trim(),
        slug,
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : "",
        sector: sector ? sector.trim() : "",
        inviteCode,
        logo: "",
      },
    });

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const newEmp = await prisma.employee.create({
      data: {
        id: `emp_admin_${Date.now()}`,
        name: adminName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : "",
        role: "admin",
        status: "active",
        latitude: DEFAULT_LATITUDE,
        longitude: DEFAULT_LONGITUDE,
        workingHoursStart: DEFAULT_WORKING_HOURS_START,
        workingHoursEnd: DEFAULT_WORKING_HOURS_END,
        avatar: AVATAR_PRESETS[0],
        password: hashedPassword,
        organizationId: newOrg.id,
      },
    });

    const token = jwt.sign(
      {
        id: newEmp.id,
        role: newEmp.role,
        name: newEmp.name,
        organizationId: newOrg.id,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY },
    );

    res.status(201).json({
      token,
      user: {
        id: newEmp.id,
        name: newEmp.name,
        email: newEmp.email,
        phone: newEmp.phone,
        role: newEmp.role,
        avatar: newEmp.avatar,
        organizationId: newOrg.id,
      },
      organization: mapOrganizationResponse(newOrg),
    });
  } catch (err) {
    logger.error("POST /api/organizations error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Login ────────────────────────────────────────────────────────────────────
router.post("/api/login", async (req, res) => {
  let { identifier, password } = req.body;
  identifier = identifier ? identifier.trim() : identifier;

  if (!identifier || !password) {
    return res.status(400).json({
      error: "Identifiant et mot de passe requis.",
    });
  }

  try {
    const user = await prisma.employee.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    if (user.status === "inactif") {
      return res.status(403).json({
        error:
          "Ce compte a été désactivé." +
          " Veuillez contacter l'administrateur.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        name: user.name,
        organizationId: user.organizationId,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY },
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        organizationId: user.organizationId,
      },
      organization: org ? mapOrganizationResponse(org) : null,
    });
  } catch (err) {
    logger.error("POST /api/login error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Register (public self-registration using inviteCode) ─────────────────────
router.post("/api/register", async (req, res) => {
  const { name, email, phone, password, avatar, inviteCode } = req.body;

  if (!name || !email || !phone || !password || !inviteCode) {
    return res.status(400).json({
      error:
        "Nom, email, téléphone, mot de passe et code d'invitation" +
        " d'entreprise sont obligatoires.",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: "Le mot de passe doit contenir au moins 6 caractères.",
    });
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { inviteCode: inviteCode.trim() },
    });
    if (!org) {
      return res.status(400).json({
        error:
          "Code d'invitation invalide. Veuillez demander le code" +
          " à l'administrateur de votre entreprise.",
      });
    }

    const existing = await prisma.employee.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (existing) {
      return res.status(400).json({
        error: "Un compte avec cet email ou ce téléphone existe déjà.",
      });
    }

    const empCount = await prisma.employee.count();
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const chosenAvatar =
      avatar || AVATAR_PRESETS[empCount % AVATAR_PRESETS.length];

    const newEmp = await prisma.employee.create({
      data: {
        id: `emp_${empCount + 1}_${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: "employee",
        status: "active",
        latitude: DEFAULT_LATITUDE,
        longitude: DEFAULT_LONGITUDE,
        workingHoursStart: DEFAULT_WORKING_HOURS_START,
        workingHoursEnd: DEFAULT_WORKING_HOURS_END,
        avatar: chosenAvatar,
        password: hashedPassword,
        organizationId: org.id,
      },
    });

    res.status(201).json({
      message:
        "Compte créé avec succès. Vous pouvez maintenant" + " vous connecter.",
      user: {
        id: newEmp.id,
        name: newEmp.name,
        email: newEmp.email,
        phone: newEmp.phone,
        role: newEmp.role,
      },
    });
  } catch (err) {
    logger.error("POST /api/register error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Reset Password Simulation ────────────────────────────────────────────────
router.post("/api/auth/reset-password", async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: "Identifiant requis." });
  }

  try {
    const user = await prisma.employee.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "Aucun compte associé à cet identifiant.",
      });
    }

    logger.info(`[SIMULATION] Lien de réinitialisation envoyé à ${identifier}`);

    res.json({
      message:
        "Un lien de réinitialisation vous a été envoyé" + " par e-mail/SMS.",
    });
  } catch (err) {
    logger.error("POST /api/auth/reset-password error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
