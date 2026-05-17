import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { staffUsersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const ADMIN_IDS = (process.env.ADMIN_IDS ?? "6194484795,8161075408")
  .split(",")
  .map(Number)
  .filter(Boolean);

export interface StaffUser {
  tgId: number;
  role: string;
  regionId?: string | null;
  lang?: string;
}

declare global {
  namespace Express {
    interface Request {
      staffUser?: StaffUser;
    }
  }
}

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tgId = Number(req.query.tg_id ?? (req.body as Record<string, unknown>)?.tg_id);
    if (!tgId || isNaN(tgId)) {
      res.status(401).json({ error: "tg_id required" });
      return;
    }

    if (roles.includes("admin") && ADMIN_IDS.includes(tgId)) {
      req.staffUser = { tgId, role: "admin", regionId: null };
      next();
      return;
    }

    const users = await db.select().from(staffUsersTable).where(eq(staffUsersTable.tgId, tgId));
    if (users.length === 0 || !roles.includes(users[0].role)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    req.staffUser = {
      tgId,
      role: users[0].role,
      regionId: users[0].regionId,
      lang: users[0].lang,
    };
    next();
  };
}

export { ADMIN_IDS };
