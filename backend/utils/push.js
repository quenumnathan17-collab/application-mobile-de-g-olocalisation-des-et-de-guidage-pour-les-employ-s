// ── Web Push Notification Helper ─────────────────────────────────────────────
import webpush from "web-push";
import pkg from "@prisma/client";
import logger from "./logger.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

/**
 * Send a push notification to all subscriptions of a given employee.
 * Automatically cleans up expired subscriptions (410/404).
 *
 * @param {string} employeeId
 * @param {{ title: string, body: string, data?: object }} payload
 */
export async function sendPushNotification(employeeId, payload) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { employeeId },
    });

    const payloadString = JSON.stringify(payload);

    const promises = subscriptions.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      return webpush
        .sendNotification(pushSubscription, payloadString)
        .catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            logger.info(
              `Suppression abonnement push expiré [${sub.id}]` +
                ` pour le technicien ${employeeId}`,
            );
            await prisma.pushSubscription
              .delete({ where: { id: sub.id } })
              .catch(() => {});
          } else {
            logger.error("Erreur envoi notification push:", err);
          }
        });
    });

    await Promise.all(promises);
  } catch (err) {
    logger.error("Erreur générale sendPushNotification:", err);
  }
}
