import { Router } from "express";

const router = Router();

const DISTRICTS = [
  { id: "1",  nameUz: "Bekobod tumani",        nameRu: "Бекабадский район",      nameEn: "Bekobod district",        lat: 41.22, lng: 69.23, available: false, osmRelationId: "1723861" },
  { id: "2",  nameUz: "Bo'ka tumani",           nameRu: "Букинский район",        nameEn: "Buka district",           lat: 41.10, lng: 69.50, available: false, osmRelationId: "1723862" },
  { id: "3",  nameUz: "Bo'stonliq tumani",      nameRu: "Бостанлыкский район",    nameEn: "Bostanliq district",      lat: 41.55, lng: 70.02, available: false, osmRelationId: "1723863" },
  { id: "4",  nameUz: "Zangiota tumani",        nameRu: "Зангиатинский район",    nameEn: "Zangiota district",       lat: 41.36, lng: 69.10, available: true,  osmRelationId: "1723864" },
  { id: "5",  nameUz: "Oqqo'rg'on tumani",      nameRu: "Аккурганский район",     nameEn: "Oqqorgon district",       lat: 41.08, lng: 69.65, available: false, osmRelationId: "1723865" },
  { id: "6",  nameUz: "Ohangaron tumani",       nameRu: "Ахангаранский район",    nameEn: "Ohangaron district",      lat: 40.92, lng: 69.32, available: false, osmRelationId: "1723866" },
  { id: "7",  nameUz: "Parkent tumani",         nameRu: "Паркентский район",      nameEn: "Parkent district",        lat: 41.30, lng: 69.73, available: false, osmRelationId: "1723867" },
  { id: "8",  nameUz: "Piskent tumani",         nameRu: "Пскентский район",       nameEn: "Piskent district",        lat: 40.95, lng: 69.70, available: false, osmRelationId: "1723868" },
  { id: "9",  nameUz: "Chinoz tumani",          nameRu: "Чиназский район",        nameEn: "Chinoz district",         lat: 40.93, lng: 68.77, available: false, osmRelationId: "1723869" },
  { id: "10", nameUz: "Yuqori Chirchiq tumani", nameRu: "Верхнечирчикский район", nameEn: "Yuqori Chirchiq district", lat: 41.47, lng: 69.68, available: false, osmRelationId: "1723870" },
  { id: "11", nameUz: "Yangiyo'l tumani",       nameRu: "Янгиюльский район",      nameEn: "Yangiyol district",       lat: 41.11, lng: 69.20, available: true,  osmRelationId: "1723871" },
  { id: "12", nameUz: "O'rta Chirchiq tumani",  nameRu: "Среднечирчикский район", nameEn: "Orta Chirchiq district",  lat: 41.19, lng: 69.58, available: false, osmRelationId: "1723872" },
  { id: "13", nameUz: "Qibray tumani",          nameRu: "Кибрайский район",       nameEn: "Qibray district",         lat: 41.36, lng: 69.44, available: true,  osmRelationId: "1723873" },
  { id: "14", nameUz: "Quyi Chirchiq tumani",   nameRu: "Нижнечирчикский район",  nameEn: "Quyi Chirchiq district",  lat: 41.27, lng: 69.35, available: false, osmRelationId: "1723874" },
  { id: "15", nameUz: "Toshkent tumani",        nameRu: "Ташкентский район",      nameEn: "Tashkent district",       lat: 41.32, lng: 69.27, available: true,  osmRelationId: "1723875" },
];

router.get("/districts", (req, res) => {
  res.json(DISTRICTS);
});

export default router;
