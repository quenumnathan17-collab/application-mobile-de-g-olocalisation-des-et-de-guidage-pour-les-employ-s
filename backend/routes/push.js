// ── Web Push Routes ──────────────────────────────────────────────────────────
import { Router } from "express";
import pkg from "@prisma/client";
import webpush from "web-push";
import { authenticateToken } from "../middleware/auth.js";
import logger from "../utils/logger.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = Router();

// ── Initialize VAPID keys ────────────────────────────────────────────────────
let vapidKeys;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
  };
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  logger.info("──────────────────────────────────────────────────────");
  logger.info("Clés VAPID générées dynamiquement pour le Web Push :");
  logger.info("Clé Publique :", vapidKeys.publicKey);
  logger.info("──────────────────────────────────────────────────────");
}

webpush.setVapidDetails(
  "mailto:info@portail-terrain.ci",
  vapidKeys.publicKey,
  vapidKeys.privateKey,
);

// ── GET VAPID public key ─────────────────────────────────────────────────────
router.get("/api/push/key", (_req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// ── POST subscribe to push ───────────────────────────────────────────────────
router.post("/api/push/subscribe", authenticateToken, async (req, res) => {
  const { subscription } = req.body;
  if (
    !subscription ||
    !subscription.endpoint ||
    !subscription.keys ||
    !subscription.keys.p256dh ||
    !subscription.keys.auth
  ) {
    return res.status(400).json({
      error: "Format d'abonnement push invalide.",
    });
  }

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        employeeId: req.user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        employeeId: req.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    res.status(201).json({ success: true });
  } catch (err) {
    logger.error("POST /api/push/subscribe error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST unsubscribe from push ───────────────────────────────────────────────
router.post("/api/push/unsubscribe", authenticateToken, async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ error: "Endpoint manquant." });
  }

  try {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, employeeId: req.user.id },
    });
    res.json({ success: true });
  } catch (err) {
    logger.error("POST /api/push/unsubscribe error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
