import { Router } from "express";
import { db, districtsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../middleware/requireRole";

const router = Router();

const SEED_DISTRICTS = [
  { id: "1",  nameUz: "Bekobod tumani",        nameRu: "Бекабадский район",      nameEn: "Bekobod district",        lat: 41.22, lng: 69.23, available: false, courierExtraFee: 0, osmRelationId: "1723861" },
  { id: "2",  nameUz: "Bo'ka tumani",           nameRu: "Букинский район",        nameEn: "Buka district",           lat: 41.10, lng: 69.50, available: false, courierExtraFee: 0, osmRelationId: "1723862" },
  { id: "3",  nameUz: "Bo'stonliq tumani",      nameRu: "Бостанлыкский район",    nameEn: "Bostanliq district",      lat: 41.55, lng: 70.02, available: false, courierExtraFee: 0, osmRelationId: "1723863" },
  { id: "4",  nameUz: "Zangiota tumani",        nameRu: "Зангиатинский район",    nameEn: "Zangiota district",       lat: 41.36, lng: 69.10, available: true,  courierExtraFee: 0, osmRelationId: "1723864" },
  { id: "5",  nameUz: "Oqqo'rg'on tumani",      nameRu: "Аккурганский район",     nameEn: "Oqqorgon district",       lat: 41.08, lng: 69.65, available: false, courierExtraFee: 0, osmRelationId: "1723865" },
  { id: "6",  nameUz: "Ohangaron tumani",       nameRu: "Ахангаранский район",    nameEn: "Ohangaron district",      lat: 40.92, lng: 69.32, available: false, courierExtraFee: 0, osmRelationId: "1723866" },
  { id: "7",  nameUz: "Parkent tumani",         nameRu: "Паркентский район",      nameEn: "Parkent district",        lat: 41.30, lng: 69.73, available: false, courierExtraFee: 0, osmRelationId: "1723867" },
  { id: "8",  nameUz: "Piskent tumani",         nameRu: "Пскентский район",       nameEn: "Piskent district",        lat: 40.95, lng: 69.70, available: false, courierExtraFee: 0, osmRelationId: "1723868" },
  { id: "9",  nameUz: "Chinoz tumani",          nameRu: "Чиназский район",        nameEn: "Chinoz district",         lat: 40.93, lng: 68.77, available: false, courierExtraFee: 0, osmRelationId: "1723869" },
  { id: "10", nameUz: "Yuqori Chirchiq tumani", nameRu: "Верхнечирчикский район", nameEn: "Yuqori Chirchiq district", lat: 41.47, lng: 69.68, available: false, courierExtraFee: 0, osmRelationId: "1723870" },
  { id: "11", nameUz: "Yangiyo'l tumani",       nameRu: "Янгиюльский район",      nameEn: "Yangiyol district",       lat: 41.11, lng: 69.20, available: true,  courierExtraFee: 0, osmRelationId: "1723871" },
  { id: "12", nameUz: "O'rta Chirchiq tumani",  nameRu: "Среднечирчикский район", nameEn: "Orta Chirchiq district",  lat: 41.19, lng: 69.58, available: false, courierExtraFee: 0, osmRelationId: "1723872" },
  { id: "13", nameUz: "Qibray tumani",          nameRu: "Кибрайский район",       nameEn: "Qibray district",         lat: 41.36, lng: 69.44, available: true,  courierExtraFee: 0, osmRelationId: "1723873" },
  { id: "14", nameUz: "Quyi Chirchiq tumani",   nameRu: "Нижнечирчикский район",  nameEn: "Quyi Chirchiq district",  lat: 41.27, lng: 69.35, available: false, courierExtraFee: 0, osmRelationId: "1723874" },
  { id: "15", nameUz: "Toshkent tumani",        nameRu: "Ташкентский район",      nameEn: "Tashkent district",       lat: 41.32, lng: 69.27, available: true,  courierExtraFee: 0, osmRelationId: "1723875" },
] as const;

async function ensureSeeded() {
  const existing = await db.select({ id: districtsTable.id }).from(districtsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(districtsTable).values(SEED_DISTRICTS.map(d => ({ ...d }))).onConflictDoNothing();
  }
}

router.get("/districts", async (_req, res) => {
  await ensureSeeded();
  const rows = await db.select().from(districtsTable).orderBy(districtsTable.id);
  res.json(rows.map(d => ({
    id: d.id,
    nameUz: d.nameUz,
    nameRu: d.nameRu,
    nameEn: d.nameEn,
    lat: d.lat,
    lng: d.lng,
    available: d.available,
    courierExtraFee: d.courierExtraFee,
    geojson: d.geojson ? JSON.parse(d.geojson) : null,
    osmRelationId: d.osmRelationId,
  })));
});

router.patch("/admin/districts/:id", requireRole("admin"), async (req, res) => {
  const id = String(req.params.id);
  const { available, courierExtraFee, geojson } = req.body as {
    available?: boolean;
    courierExtraFee?: number;
    geojson?: object;
  };

  const updates: Partial<typeof districtsTable.$inferInsert> = {};
  if (available !== undefined) updates.available = available;
  if (courierExtraFee !== undefined) updates.courierExtraFee = Number(courierExtraFee);
  if (geojson !== undefined) updates.geojson = JSON.stringify(geojson);

  await db.update(districtsTable).set(updates).where(eq(districtsTable.id, id));
  const [updated] = await db.select().from(districtsTable).where(eq(districtsTable.id, id));
  res.json({ ...updated, geojson: updated.geojson ? JSON.parse(updated.geojson) : null });
});

export default router;
