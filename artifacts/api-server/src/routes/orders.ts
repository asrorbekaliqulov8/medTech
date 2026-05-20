import { Router } from "express";
import { db, ordersTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateOrderBody } from "@workspace/api-zod";
import { tgSendMessageWithKeyboard } from "../lib/telegram";

const router = Router();

function generateOrderId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "#";
  for (let i = 0; i < 4; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

async function getSetting(key: string, fallback: string): Promise<string> {
  try {
    const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
    return rows[0]?.value ?? fallback;
  } catch {
    return fallback;
  }
}

const PAYMENT_MSG: Record<string, string> = {
  uz: "✅ <b>Buyurtmangiz qabul qilindi!</b>\n\n🔖 Buyurtma: <code>{order_id}</code>\n💰 Jami summa: <b>{amount} so'm</b>\n\n💳 To'lov usulini tanlang:",
  ru: "✅ <b>Ваш заказ принят!</b>\n\n🔖 Заказ: <code>{order_id}</code>\n💰 Сумма: <b>{amount} сум</b>\n\nВыберите способ оплаты:",
  en: "✅ <b>Your order has been received!</b>\n\n🔖 Order: <code>{order_id}</code>\n💰 Amount: <b>{amount} sum</b>\n\nChoose payment method:",
};

const PAY_ADMIN_BTN: Record<string, string> = { uz: "🏦 Admin orqali", ru: "🏦 Через администратора", en: "🏦 Via admin" };
const PAY_CLICK_BTN: Record<string, string> = { uz: "💳 Click orqali", ru: "💳 Через Click", en: "💳 Via Click" };

async function sendPaymentMessage(telegramUserId: number, lang: string, orderId: string, amount: number): Promise<void> {
  const l = (["uz", "ru", "en"] as const).includes(lang as "uz") ? lang as "uz" | "ru" | "en" : "uz";
  const text = (PAYMENT_MSG[l] ?? PAYMENT_MSG.uz)
    .replace("{order_id}", orderId)
    .replace("{amount}", amount.toLocaleString("uz-UZ"));
  const keyboard = [
    [
      { text: PAY_ADMIN_BTN[l] ?? PAY_ADMIN_BTN.uz, callback_data: `pay_admin_${orderId}` },
      { text: PAY_CLICK_BTN[l] ?? PAY_CLICK_BTN.uz, callback_data: `pay_click_${orderId}` },
    ],
  ];
  await tgSendMessageWithKeyboard(telegramUserId, text, keyboard);
}

router.post("/orders", async (req, res) => {
  const parseResult = CreateOrderBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const data = parseResult.data;

  const [servicePriceStr, pickupExtraStr] = await Promise.all([
    getSetting("service_price", "150000"),
    getSetting("pickup_extra", "30000"),
  ]);

  const servicePrice = parseInt(servicePriceStr, 10);
  const pickupExtra = parseInt(pickupExtraStr, 10);
  const extraPrice = data.pickupSlot ? pickupExtra : 0;
  const totalPrice = servicePrice + extraPrice;

  let orderId = generateOrderId();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.select().from(ordersTable).where(eq(ordersTable.orderId, orderId));
    if (existing.length === 0) break;
    orderId = generateOrderId();
    attempts++;
  }

  const [inserted] = await db.insert(ordersTable).values({
    orderId,
    telegramUserId: data.telegramUserId,
    telegramUsername: data.telegramUsername ?? null,
    lang: data.lang,
    patientName: data.patientName,
    patientAge: data.patientAge,
    patientGender: data.patientGender,
    patientType: data.patientType,
    serviceId: data.serviceId,
    childTiming: data.childTiming ?? null,
    usesDiaper: data.usesDiaper ?? null,
    complaints: JSON.stringify(data.complaints),
    customComplaint: data.customComplaint ?? null,
    deliverySlot: data.deliverySlot,
    pickupSlot: data.pickupSlot ?? null,
    districtId: data.districtId,
    latitude: data.latitude,
    longitude: data.longitude,
    addressNote: data.addressNote ?? null,
    price: totalPrice,
    extraPrice,
    isFree: false,
    status: "pending_payment",
  }).returning();

  // Send Telegram payment message (fire-and-forget)
  sendPaymentMessage(inserted.telegramUserId, inserted.lang ?? "uz", inserted.orderId, inserted.price + inserted.extraPrice).catch(() => {});

  res.status(201).json({
    id: inserted.id,
    orderId: inserted.orderId,
    telegramUserId: inserted.telegramUserId,
    patientName: inserted.patientName,
    patientAge: inserted.patientAge,
    patientGender: inserted.patientGender,
    patientType: inserted.patientType,
    serviceId: inserted.serviceId,
    complaints: JSON.parse(inserted.complaints),
    deliverySlot: inserted.deliverySlot,
    pickupSlot: inserted.pickupSlot,
    districtId: inserted.districtId,
    latitude: inserted.latitude,
    longitude: inserted.longitude,
    price: inserted.price,
    extraPrice: inserted.extraPrice,
    isFree: inserted.isFree,
    status: inserted.status,
    createdAt: inserted.createdAt.toISOString(),
  });
});

router.get("/orders/:orderId", async (req, res) => {
  const { orderId } = req.params;
  const rows = await db.select().from(ordersTable).where(eq(ordersTable.orderId, orderId));
  if (rows.length === 0) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const o = rows[0];
  res.json({
    id: o.id,
    orderId: o.orderId,
    telegramUserId: o.telegramUserId,
    patientName: o.patientName,
    patientAge: o.patientAge,
    patientGender: o.patientGender,
    patientType: o.patientType,
    serviceId: o.serviceId,
    complaints: JSON.parse(o.complaints),
    deliverySlot: o.deliverySlot,
    pickupSlot: o.pickupSlot,
    districtId: o.districtId,
    latitude: o.latitude,
    longitude: o.longitude,
    price: o.price,
    extraPrice: o.extraPrice,
    isFree: o.isFree,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
  });
});

export default router;
