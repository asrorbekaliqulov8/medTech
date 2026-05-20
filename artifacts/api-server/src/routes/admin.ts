import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, settingsTable } from "@workspace/db/schema";
import { staffUsersTable } from "@workspace/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { requireRole, ADMIN_IDS } from "../middleware/requireRole";
import { tgSendMessage, tgGetFileUrl } from "../lib/telegram";

const router = Router();

router.get("/admin/stats", requireRole("admin"), async (_req, res) => {
  const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable);
  const [completed] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(eq(ordersTable.status, "completed"));
  const [pendingAdmin] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(eq(ordersTable.status, "pending_admin"));
  const [approved] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(eq(ordersTable.status, "approved"));
  const [revenue] = await db.select({ sum: sql<number>`coalesce(sum(price + extra_price), 0)::bigint` }).from(ordersTable).where(eq(ordersTable.status, "completed"));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [todayOrders] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(sql`created_at >= ${today.toISOString()}::timestamp`);
  const users = await db.selectDistinct({ tgId: ordersTable.telegramUserId }).from(ordersTable);

  res.json({
    totalOrders: Number(total.count),
    completedOrders: Number(completed.count),
    pendingAdminOrders: Number(pendingAdmin.count),
    approvedOrders: Number(approved.count),
    todayOrders: Number(todayOrders.count),
    revenue: Number(revenue.sum),
    totalUsers: users.length,
  });
});

router.get("/admin/orders", requireRole("admin"), async (req, res) => {
  const status = req.query.status as string | undefined;
  const rows = status && status !== "all"
    ? await db.select().from(ordersTable).where(eq(ordersTable.status, status)).orderBy(desc(ordersTable.createdAt)).limit(60)
    : await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(60);

  res.json(rows.map(o => ({ ...o, complaints: JSON.parse(o.complaints || "[]") })));
});

router.patch("/admin/orders/:orderId", requireRole("admin"), async (req, res) => {
  const orderId = String(req.params.orderId);
  const { status } = req.body as { status: string };

  if (!["approved", "rejected", "completed", "pending_admin"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.orderId, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  if (["approved", "rejected"].includes(status) && !["pending_admin", "pending_payment", "approved"].includes(order.status)) {
    res.status(409).json({ error: "Order already processed", currentStatus: order.status });
    return;
  }

  await db.update(ordersTable).set({ status }).where(eq(ordersTable.orderId, orderId));

  const lang = order.lang || "uz";
  if (status === "approved") {
    const msg = lang === "ru"
      ? `✅ Ваш заказ <code>${orderId}</code> подтверждён! Курьер скоро свяжется с вами.`
      : lang === "en"
        ? `✅ Your order <code>${orderId}</code> is approved! The courier will contact you soon.`
        : `✅ Buyurtmangiz <code>${orderId}</code> tasdiqlandi! Kuryer tez orada siz bilan bog'lanadi.`;
    await tgSendMessage(order.telegramUserId, msg);
  } else if (status === "rejected") {
    const msg = lang === "ru"
      ? `❌ Ваш заказ <code>${orderId}</code> отклонён.`
      : lang === "en"
        ? `❌ Your order <code>${orderId}</code> was rejected.`
        : `❌ Buyurtmangiz <code>${orderId}</code> rad etildi.`;
    await tgSendMessage(order.telegramUserId, msg);
  }

  res.json({ success: true });
});

router.get("/admin/settings", requireRole("admin"), async (_req, res) => {
  const rows = await db.select().from(settingsTable);
  const result: Record<string, string> = {};
  for (const s of rows) result[s.key] = s.value;
  res.json(result);
});

router.post("/admin/settings", requireRole("admin"), async (req, res) => {
  const { key, value } = req.body as { key: string; value: string };
  if (!key || value === undefined) { res.status(400).json({ error: "key and value required" }); return; }
  const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  if (existing.length > 0) {
    await db.update(settingsTable).set({ value }).where(eq(settingsTable.key, key));
  } else {
    await db.insert(settingsTable).values({ key, value });
  }
  res.json({ success: true });
});

router.get("/admin/staff", requireRole("admin"), async (_req, res) => {
  const staff = await db.select().from(staffUsersTable).orderBy(staffUsersTable.role);
  const admins = ADMIN_IDS.map(id => ({ tgId: id, role: "admin", regionId: null, username: "Admin", lang: "uz", id: 0 }));
  res.json([...admins, ...staff]);
});

router.post("/admin/staff", requireRole("admin"), async (req, res) => {
  const { tg_id, role, region_id, username } = req.body as { tg_id: number; role: string; region_id?: string; username?: string };
  if (!tg_id || !role) { res.status(400).json({ error: "tg_id and role required" }); return; }
  if (!["doctor", "courier"].includes(role)) { res.status(400).json({ error: "Role must be doctor or courier" }); return; }

  const existing = await db.select().from(staffUsersTable).where(eq(staffUsersTable.tgId, Number(tg_id)));
  if (existing.length > 0) {
    await db.update(staffUsersTable).set({ role, regionId: region_id ?? null, username: username ?? null }).where(eq(staffUsersTable.tgId, Number(tg_id)));
  } else {
    await db.insert(staffUsersTable).values({ tgId: Number(tg_id), role, regionId: region_id ?? null, username: username ?? null });
  }

  // Notify the new staff member
  const notifMsg = role === "doctor"
    ? "👨‍⚕️ Siz N-MedHomeLab tizimiga <b>Shifokor</b> sifatida qo'shildingiz! /doctor buyrug'ini yuboring."
    : `🚗 Siz N-MedHomeLab tizimiga <b>Kuryer</b> sifatida qo'shildingiz! /courier buyrug'ini yuboring.`;
  await tgSendMessage(Number(tg_id), notifMsg);

  res.json({ success: true });
});

router.delete("/admin/staff/:staffTgId", requireRole("admin"), async (req, res) => {
  const staffTgId = Number(req.params.staffTgId);
  await db.delete(staffUsersTable).where(eq(staffUsersTable.tgId, staffTgId));
  res.json({ success: true });
});

router.get("/admin/users", requireRole("admin"), async (_req, res) => {
  const rows = await db.selectDistinct({ tgId: ordersTable.telegramUserId }).from(ordersTable).orderBy(ordersTable.telegramUserId);
  res.json(rows.map(r => ({ tgId: r.tgId })));
});

router.get("/admin/tg-file/:fileId", requireRole("admin"), async (req, res) => {
  const { fileId } = req.params;
  const url = await tgGetFileUrl(fileId);
  if (!url) { res.status(404).json({ error: "File not found" }); return; }
  res.redirect(url);
});

router.post("/admin/broadcast", requireRole("admin"), async (req, res) => {
  const { text } = req.body as { text: string };
  if (!text) { res.status(400).json({ error: "text required" }); return; }

  const users = await db.selectDistinct({ tgId: ordersTable.telegramUserId }).from(ordersTable);
  let sent = 0;
  for (let i = 0; i < users.length; i++) {
    await tgSendMessage(users[i].tgId, text);
    sent++;
    if ((i + 1) % 25 === 0) await new Promise(r => setTimeout(r, 1000));
  }

  res.json({ success: true, sent });
});

export default router;
