// ── SSE (Server-Sent Events) Manager ─────────────────────────────────────────
import logger from "./logger.js";

/** @type {import('express').Response[]} */
let sseClients = [];

/**
 * Register a new SSE client connection.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export function registerSSEClient(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  sseClients.push(res);
  logger.debug(`SSE client connected (total: ${sseClients.length})`);

  req.on("close", () => {
    sseClients = sseClients.filter((client) => client !== res);
    logger.debug(`SSE client disconnected (total: ${sseClients.length})`);
  });
}

/**
 * Broadcast an event to all connected SSE clients.
 * @param {object} data - The data to send as JSON.
 */
export function broadcastEvent(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => client.write(payload));
}
