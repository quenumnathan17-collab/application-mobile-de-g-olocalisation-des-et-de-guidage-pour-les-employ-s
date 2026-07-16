// ── Structured Logger ────────────────────────────────────────────────────────
// Simple wrapper around console with timestamps and log levels.

const timestamp = () => new Date().toISOString();

const logger = {
  info: (...args) => {
    const msg = args
      .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
      .join(" ");
    process.stdout.write(`[${timestamp()}] [INFO] ${msg}\n`);
  },

  warn: (...args) => {
    const msg = args
      .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
      .join(" ");
    process.stderr.write(`[${timestamp()}] [WARN] ${msg}\n`);
  },

  error: (...args) => {
    const msg = args
      .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
      .join(" ");
    process.stderr.write(`[${timestamp()}] [ERROR] ${msg}\n`);
  },

  debug: (...args) => {
    if (process.env.NODE_ENV !== "production") {
      const msg = args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
        .join(" ");
      process.stdout.write(`[${timestamp()}] [DEBUG] ${msg}\n`);
    }
  },
};

export default logger;
