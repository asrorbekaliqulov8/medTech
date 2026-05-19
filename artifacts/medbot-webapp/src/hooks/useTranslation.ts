import { useState, useEffect } from 'react';

type Language = 'uz' | 'ru' | 'en';

const translations = {
  uz: {
    serviceSelectionTitle: "Xizmatni tanlang",
    whoIsPatient: "Bemor kim?",
    adult: "Kattalar",
    child: "Bola",
    fullName: "F.I.SH.",
    age: "Yosh",
    gender: "Jins",
    male: "Erkak",
    female: "Ayol",
    childTimingTitle: "Bola qachon hojatga boradi?",
    morning: "Ertalab 06:00–09:00",
    day: "Kunduzi 09:00–15:00",
    evening: "Kechqurun 15:00–21:00",
    irregular: "Tartibsiz",
    usesDiaper: "Bola taglik ishlatadimi?",
    yes: "Ha",
    no: "Yo'q",
    complaintsTitle: "Sizni nima bezovta qilmoqda?",
    otherComplaints: "Boshqa yozish",
    continue: "Davom etish",
    deliveryTimeAdult: "Bugun kechqurun konteyner yetkaziladi",
    pickupCall: "Pickup chaqirish",
    containerAdvance: "Konteyner oldindan yetkaziladi",
    mapTab: "Xaritadan tanlash",
    listTab: "Ro'yxatdan tanlash",
    findLocation: "GPS joylashuvimni aniqlash",
    soon: "Tez orada",
    confirmOrder: "Tasdiqlash",
    cancelOrder: "Bekor qilish",
    orderSuccess: "Buyurtma qabul qilindi! Siz bilan tez orada bog'lanamiz.",
    price: "Narx",
    extraFee: "Qo'shimcha to'lov",
    total: "Jami",
    patient: "Bemor",
    service: "Xizmat",
    complaints: "Shikoyatlar",
    address: "Manzil",
    delivery: "Yetkazib berish",
    pickupTimeTitle: "Olib ketish vaqti",
  },
  ru: {
    serviceSelectionTitle: "Выберите услугу",
    whoIsPatient: "Для кого?",
    adult: "Взрослый",
    child: "Ребёнок",
    fullName: "Ф.И.О.",
    age: "Возраст",
    gender: "Пол",
    male: "Мужской",
    female: "Женский",
    childTimingTitle: "Когда ребенок ходит в туалет?",
    morning: "Утром 06:00–09:00",
    day: "Днем 09:00–15:00",
    evening: "Вечером 15:00–21:00",
    irregular: "Нерегулярно",
    usesDiaper: "Использует ли подгузники?",
    yes: "Да",
    no: "Нет",
    complaintsTitle: "Что вас беспокоит?",
    otherComplaints: "Написать другое",
    continue: "Продолжить",
    deliveryTimeAdult: "Контейнер будет доставлен сегодня вечером",
    pickupCall: "Вызвать курьера",
    containerAdvance: "Контейнер доставляется заранее",
    mapTab: "Выбрать на карте",
    listTab: "Выбрать из списка",
    findLocation: "Определить мое местоположение",
    soon: "Скоро",
    confirmOrder: "Подтвердить",
    cancelOrder: "Отменить",
    orderSuccess: "Заказ принят! Мы скоро с вами свяжемся.",
    price: "Цена",
    extraFee: "Дополнительный сбор",
    total: "Итого",
    patient: "Пациент",
    service: "Услуга",
    complaints: "Жалобы",
    address: "Адрес",
    delivery: "Доставка",
    pickupTimeTitle: "Время забора",
  },
  en: {
    serviceSelectionTitle: "Select a service",
    whoIsPatient: "Who is the patient?",
    adult: "Adult",
    child: "Child",
    fullName: "Full Name",
    age: "Age",
    gender: "Gender",
    male: "Male",
    female: "Female",
    childTimingTitle: "When does the child go to the toilet?",
    morning: "Morning 06:00–09:00",
    day: "Day 09:00–15:00",
    evening: "Evening 15:00–21:00",
    irregular: "Irregular",
    usesDiaper: "Does the child use a diaper?",
    yes: "Yes",
    no: "No",
    complaintsTitle: "What is bothering you?",
    otherComplaints: "Write other",
    continue: "Continue",
    deliveryTimeAdult: "The container will be delivered tonight",
    pickupCall: "Call pickup",
    containerAdvance: "The container is delivered in advance",
    mapTab: "Select from map",
    listTab: "Select from list",
    findLocation: "Find my GPS location",
    soon: "Soon",
    confirmOrder: "Confirm",
    cancelOrder: "Cancel",
    orderSuccess: "Order received! We will contact you soon.",
    price: "Price",
    extraFee: "Extra fee",
    total: "Total",
    patient: "Patient",
    service: "Service",
    complaints: "Complaints",
    address: "Address",
    delivery: "Delivery",
    pickupTimeTitle: "Pickup time",
  }
};

function detectLanguage(): Language {
  // 1. URL query param: ?lang=uz  (passed by the bot)
  try {
    const params = new URLSearchParams(window.location.search);
    const paramLang = params.get('lang');
    if (paramLang === 'uz' || paramLang === 'ru' || paramLang === 'en') {
      return paramLang;
    }
  } catch (_) {}

  // 2. Telegram WebApp initDataUnsafe.user.language_code
  try {
    // @ts-ignore
    const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
    if (tgLang === 'ru') return 'ru';
    if (tgLang === 'en') return 'en';
    if (tgLang === 'uz') return 'uz';
  } catch (_) {}

  // 3. Default
  return 'uz';
}

export function useTranslation() {
  const [lang, setLang] = useState<Language>(detectLanguage);

  useEffect(() => {
    setLang(detectLanguage());
  }, []);

  const t = (key: keyof typeof translations.uz) => {
    return translations[lang][key] || translations.uz[key];
  };

  return { t, lang, setLang };
}
