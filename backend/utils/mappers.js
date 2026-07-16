// ── Response Mapping Helpers ─────────────────────────────────────────────────
// Eliminates duplicated object-mapping code across route handlers.

/**
 * Map a Prisma Employee record to the API response shape.
 * @param {object} e - Prisma Employee record
 * @returns {object}
 */
export function mapEmployeeResponse(e) {
  return {
    id: e.id,
    name: e.name,
    email: e.email,
    phone: e.phone,
    role: e.role,
    status: e.status,
    gps: { lat: e.latitude, lng: e.longitude },
    workingHours: {
      start: e.workingHoursStart,
      end: e.workingHoursEnd,
    },
    avatar: e.avatar,
  };
}

/**
 * Map a Prisma Client record to the API response shape.
 * @param {object} c - Prisma Client record
 * @returns {object}
 */
export function mapClientResponse(c) {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    address: c.address,
    gps: { lat: c.latitude, lng: c.longitude },
    phone: c.phone,
    email: c.email,
    contactName: c.contactName,
    notes: c.notes,
    archived: c.archived,
  };
}

/**
 * Map a Prisma Organization record to the API response shape.
 * @param {object} o - Prisma Organization record
 * @returns {object}
 */
export function mapOrganizationResponse(o) {
  return {
    id: o.id,
    name: o.name,
    slug: o.slug,
    logo: o.logo,
    inviteCode: o.inviteCode,
  };
}
