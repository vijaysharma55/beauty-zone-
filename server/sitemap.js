// Keep these conditions aligned with findLiveSalon / hasLiveApproval: only
// published, non-suspended salons with an approved snapshot are public.
export function listLiveSalonSlugs(db, { limit = -1, offset = 0 } = {}) {
  return db.prepare(`
    SELECT s.slug FROM salons s
    WHERE s.website_published = 1 AND s.suspended = 0
      AND s.status NOT IN ('rejected', 'changes_requested')
      AND EXISTS (SELECT 1 FROM salon_versions v WHERE v.salon_id = s.id AND v.status = 'approved')
    ORDER BY s.slug COLLATE NOCASE, s.id
    LIMIT ? OFFSET ?
  `).all(limit, offset).map(row => row.slug);
}
