import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { requireRole } from "../middleware/requireRole";
import { tgSendDocument, tgSendMessage } from "../lib/telegram";

const router = Router();
const RESULT_NOTIFY_ID = 6194484795;

router.get("/doctor/orders", requireRole("doctor", "admin"), async (_req, res) => {
  const rows = await db.select().from(ordersTable)
    .where(or(eq(ordersTable.status, "approved"), eq(ordersTable.status, "courier_done"), eq(ordersTable.status, "completed")))
    .orderBy(desc(ordersTable.createdAt))
    .limit(40);
  res.json(rows.map(o => ({ ...o, complaints: JSON.parse(o.complaints || "[]") })));
});

router.post("/doctor/orders/:orderId/result", requireRole("doctor", "admin"), async (req, res) => {
  const { orderId } = req.params;
  const { file_base64, filename } = req.body as { file_base64: string; filename: string; caption?: string };

  if (!file_base64 || !filename) {
    res.status(400).json({ error: "file_base64 and filename required" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.orderId, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const fileBuffer = Buffer.from(file_base64, "base64");
  const lang = order.lang ?? "uz";

  const caption =
    lang === "ru"
      ? `📊 <b>Результат анализа готов!</b>\n📋 Заказ: <code>${orderId}</code>\n👤 Пациент: <b>${order.patientName}</b>`
      : lang === "en"
        ? `📊 <b>Your analysis result is ready!</b>\n📋 Order: <code>${orderId}</code>\n👤 Patient: <b>${order.patientName}</b>`
        : `📊 <b>Tahlil natijangiz tayyor!</b>\n📋 Buyurtma: <code>${orderId}</code>\n👤 Bemor: <b>${order.patientName}</b>`;

  await tgSendDocument(order.telegramUserId, fileBuffer, filename, caption);

  if (order.telegramUserId !== RESULT_NOTIFY_ID) {
    await tgSendDocument(RESULT_NOTIFY_ID, fileBuffer, filename,
      `🔔 <b>Natija yuborildi</b>\n${caption}`);
  }

  await db.update(ordersTable)
    .set({ status: "completed", resultFileId: `webapp:${filename}`, doctorTgId: req.staffUser!.tgId })
    .where(eq(ordersTable.orderId, orderId));

  const notifyMsg = lang === "ru"
    ? `✅ Результат вашего анализа отправлен!`
    : lang === "en"
      ? `✅ Your analysis result has been sent!`
      : `✅ Tahlil natijangiz yuborildi!`;
  await tgSendMessage(order.telegramUserId, notifyMsg);

  res.json({ success: true });
});

export default router;
