import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function getSetting(key: string, fallback: string): Promise<string> {
  try {
    const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
    return rows[0]?.value ?? fallback;
  } catch {
    return fallback;
  }
}

router.get("/settings/public", async (req, res) => {
  const [servicePrice, pickupExtra, paymentCard, paymentOwner, adminContact, clickPaymentUrl] =
    await Promise.all([
      getSetting("service_price", "150000"),
      getSetting("pickup_extra", "30000"),
      getSetting("payment_card", "8600 0000 0000 0000"),
      getSetting("payment_owner", "N-MedHomeLab"),
      getSetting("admin_contact", "@admin_username"),
      getSetting("click_payment_url", "https://my.click.uz/services/pay?service_id=12345"),
    ]);

  res.json({
    servicePrice: parseInt(servicePrice, 10),
    pickupExtra: parseInt(pickupExtra, 10),
    paymentCard,
    paymentOwner,
    adminContact,
    clickPaymentUrl,
  });
});

export default router;
