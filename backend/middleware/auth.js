// ── Authentication Middleware ─────────────────────────────────────────────────
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ya-consulting-dev-only";

/**
 * Express middleware that validates Bearer JWT tokens.
 * Attaches decoded payload to `req.user`.
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Accès refusé. Token manquant." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .json({ error: "Session expirée ou token invalide." });
    }
    req.user = decoded;
    next();
  });
}

/**
 * Express middleware factory that restricts access to a specific role.
 * Must be used AFTER `authenticateToken`.
 *
 * @param {string} role - Required role (e.g. 'admin')
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res
        .status(403)
        .json({ error: "Accès refusé. Privilèges insuffisants." });
    }
    next();
  };
}
