import { Router } from "express";
import { db } from "@workspace/db";
import { staffUsersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { ADMIN_IDS } from "../middleware/requireRole";

const router = Router();

router.get("/staff/me", async (req, res) => {
  const tgId = Number(req.query.tg_id);
  if (!tgId || isNaN(tgId)) {
    res.status(400).json({ error: "tg_id required" });
    return;
  }

  if (ADMIN_IDS.includes(tgId)) {
    res.json({ tgId, role: "admin", regionId: null, lang: "uz" });
    return;
  }

  const users = await db.select().from(staffUsersTable).where(eq(staffUsersTable.tgId, tgId));
  if (users.length === 0) {
    res.status(403).json({ error: "Not a staff member" });
    return;
  }

  const u = users[0];
  res.json({ tgId: u.tgId, role: u.role, regionId: u.regionId, lang: u.lang });
});

export default router;
