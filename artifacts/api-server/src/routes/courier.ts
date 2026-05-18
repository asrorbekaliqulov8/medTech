import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db/schema";
import { eq, or, and, desc } from "drizzle-orm";
import { requireRole } from "../middleware/requireRole";
import { tgSendMessage } from "../lib/telegram";

const router = Router();

router.get("/courier/orders", requireRole("courier", "admin"), async (req, res) => {
  const regionId = req.staffUser?.regionId;

  const baseCondition = or(eq(ordersTable.status, "approved"), eq(ordersTable.status, "courier_done"));

  const rows = regionId
    ? await db.select().from(ordersTable)
        .where(and(eq(ordersTable.districtId, regionId), baseCondition!))
        .orderBy(desc(ordersTable.createdAt)).limit(30)
    : await db.select().from(ordersTable)
        .where(baseCondition)
        .orderBy(desc(ordersTable.createdAt)).limit(30);

  res.json(rows.map(o => ({ ...o, complaints: JSON.parse(o.complaints || "[]") })));
});

router.post("/courier/orders/:orderId/done", requireRole("courier", "admin"), async (req, res) => {
  const orderId = String(req.params.orderId);

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.orderId, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  await db.update(ordersTable)
    .set({ status: "courier_done", courierTgId: req.staffUser!.tgId })
    .where(eq(ordersTable.orderId, orderId));

  const lang = order.lang ?? "uz";
  const msg = lang === "ru"
    ? `📦 Курьер забрал ваш образец (<code>${orderId}</code>).\nОжидайте результат — обычно 1–2 дня.`
    : lang === "en"
      ? `📦 The courier has collected your sample (<code>${orderId}</code>).\nExpect results within 1–2 days.`
      : `📦 Kuryer namunangizni oldi (<code>${orderId}</code>).\nNatijani kuting — odatda 1–2 kun.`;

  await tgSendMessage(order.telegramUserId, msg);
  res.json({ success: true });
});

export default router;
