import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
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

router.get("/services", async (req, res) => {
  const price = parseInt(await getSetting("service_price", "150000"), 10);
  const extra = parseInt(await getSetting("pickup_extra", "30000"), 10);

  res.json([
    {
      id: "kal_tahlili",
      nameUz: "Kal tahlili",
      nameRu: "Анализ кала",
      nameEn: "Stool analysis",
      price,
      extraPickupPrice: extra,
      description: null,
    },
  ]);
});

export default router;
