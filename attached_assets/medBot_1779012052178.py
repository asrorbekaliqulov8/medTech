"""
MedBot — Medical Analysis Telegram Bot
Library: python-telegram-bot v20+ (async)
Install: pip install python-telegram-bot
"""

import json
import math
import os
import random
import sqlite3
import string
import asyncio
from datetime import date, datetime

# Optional geocoding for region detection
try:
    from geopy.geocoders import Nominatim
    from geopy.extra.rate_limiter import RateLimiter
    _GEOPY_AVAILABLE = True
except Exception:
    _GEOPY_AVAILABLE = False

from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    KeyboardButtonRequestUsers,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
    Update,
)
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)
from telegram.constants import ParseMode

# ─── CONFIG ───────────────────────────────────────────────────────────────────
BOT_TOKEN = "7723160549:AAHm95Og2REAyYG0UjQKzaB8qvYj8rCDLnE"
CHANNEL_ID = "-1003969388677"
ADMIN_IDS = [6194484795, 8161075408]

# ─── TASHKENT DISTRICTS ───────────────────────────────────────────────────────
REGIONS = [
    {"id": "1",  "name_uz": "Bekobod tumani",         "name_ru": "Бекабадский район",       "name_en": "Bekobod district"},
    {"id": "2",  "name_uz": "Bo'ka tumani",            "name_ru": "Букинский район",         "name_en": "Buka district"},
    {"id": "3",  "name_uz": "Bo'stonliq tumani",       "name_ru": "Бостанлыкский район",     "name_en": "Bostanliq district"},
    {"id": "4",  "name_uz": "Zangiota tumani",         "name_ru": "Зангиатинский район",     "name_en": "Zangiota district"},
    {"id": "5",  "name_uz": "Oqqo'rg'on tumani",       "name_ru": "Аккурганский район",      "name_en": "Oqqorgon district"},
    {"id": "6",  "name_uz": "Ohangaron tumani",        "name_ru": "Ахангаранский район",     "name_en": "Ohangaron district"},
    {"id": "7",  "name_uz": "Parkent tumani",          "name_ru": "Паркентский район",       "name_en": "Parkent district"},
    {"id": "8",  "name_uz": "Piskent tumani",          "name_ru": "Пскентский район",        "name_en": "Piskent district"},
    {"id": "9",  "name_uz": "Chinoz tumani",           "name_ru": "Чиназский район",         "name_en": "Chinoz district"},
    {"id": "10", "name_uz": "Yuqori Chirchiq tumani",  "name_ru": "Верхнечирчикский район",  "name_en": "Yuqori Chirchiq district"},
    {"id": "11", "name_uz": "Yangiyo'l tumani",        "name_ru": "Янгиюльский район",       "name_en": "Yangiyol district"},
    {"id": "12", "name_uz": "O'rta Chirchiq tumani",   "name_ru": "Среднечирчикский район",  "name_en": "Orta Chirchiq district"},
    {"id": "13", "name_uz": "Qibray tumani",           "name_ru": "Кибрайский район",        "name_en": "Qibray district"},
    {"id": "14", "name_uz": "Quyi Chirchiq tumani",    "name_ru": "Нижнечирчикский район",   "name_en": "Quyi Chirchiq district"},
    {"id": "15", "name_uz": "Toshkent tumani",         "name_ru": "Ташкентский район",       "name_en": "Tashkent district"},
]

REGION_COORDS = {
    "1":  (41.22, 69.23), "2":  (41.10, 69.50), "3":  (41.55, 70.02),
    "4":  (41.36, 69.10), "5":  (41.08, 69.65), "6":  (40.92, 69.32),
    "7":  (41.30, 69.73), "8":  (40.95, 69.70), "9":  (40.93, 68.77),
    "10": (41.47, 69.68), "11": (41.11, 69.20), "12": (41.19, 69.58),
    "13": (41.36, 69.44), "14": (41.27, 69.35),
    "15": (41.32, 69.27),
}

# ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
T = {
    "choose_lang": {
        "uz": "🌐 Assalomu alaykum!\nIltimos, tilni tanlang:",
        "ru": "🌐 Добро пожаловать!\nПожалуйста, выберите язык:",
        "en": "🌐 Welcome!\nPlease choose your language:"
    },
    "subscribe_msg": {
        "uz": (
            "📢 Salom! Botimizdan to'liq foydalanish uchun\n"
            "quyidagi kanalimizga obuna bo'lishingiz zarur.\n\n"
            "Obuna bo'lgach — «✅ Tekshirish» tugmasini bosing."
        ),
        "ru": (
            "📢 Привет! Чтобы пользоваться ботом,\n"
            "пожалуйста, подпишитесь на наш канал.\n\n"
            "После подписки нажмите «✅ Проверить»."
        ),
        "en": (
            "📢 Hello! To use this bot,\n"
            "please subscribe to our channel first.\n\n"
            "After subscribing, tap «✅ Check»."
        ),
    },
    "channel_name": {
        "uz": "📣 Rasmiy kanal",
        "ru": "📣 Официальный канал",
        "en": "📣 Official channel"
    },
    "check_sub": {
        "uz": "✅ Tekshirish",
        "ru": "✅ Проверить",
        "en": "✅ Check"
    },
    "not_subscribed": {
        "uz": "⚠️ Hali obuna bo'lmadingiz. Iltimos, avval kanalga qo'shiling.",
        "ru": "⚠️ Вы ещё не подписались. Пожалуйста, сначала подпишитесь.",
        "en": "⚠️ You haven't subscribed yet. Please join the channel first."
    },
    "main_menu": {
        "uz": (
            "👋 Xush kelibsiz!\n\n"
            "🏥 <b>N-MedHomeLab</b> — uy sharoitida professional tibbiy tahlil xizmati.\n"
            "Kuryer namunangizni olib ketadi, natija sizga yuboriladi.\n\n"
            "Quyidagilardan birini tanlang 👇"
        ),
        "ru": (
            "👋 Добро пожаловать!\n\n"
            "🏥 <b>N-MedHomeLab</b> — профессиональный медицинский анализ на дому.\n"
            "Курьер заберёт образец, результат придёт вам.\n\n"
            "Выберите нужное 👇"
        ),
        "en": (
            "👋 Welcome!\n\n"
            "🏥 <b>N-MedHomeLab</b> — professional home medical analysis.\n"
            "A courier picks up your sample, results come to you.\n\n"
            "Please choose below 👇"
        ),
    },
    "btn_order":        {"uz": "🧪 Tahlil buyurtma berish", "ru": "🧪 Заказать анализ",    "en": "🧪 Order analysis"},
    "btn_results":      {"uz": "📊 Natijalarim",             "ru": "📊 Мои результаты",     "en": "📊 My results"},
    "btn_order_status": {"uz": "🚚 Buyurtma holati",         "ru": "🚚 Статус заказа",      "en": "🚚 Order status"},
    "btn_profile":      {"uz": "👤 Mening profilim",         "ru": "👤 Мой профиль",        "en": "👤 My profile"},
    "btn_feedback":     {"uz": "⭐️ Fikr & shikoyat",        "ru": "⭐️ Отзыв & жалоба",    "en": "⭐️ Feedback & complaint"},
    "btn_contact":      {"uz": "📞 Biz bilan bog'lanish",    "ru": "📞 Связаться с нами",   "en": "📞 Contact us"},

    "service_kal": {
        "uz": "🦠 Kal tahlili",
        "ru": "🦠 Анализ кала",
        "en": "🦠 Stool analysis"
    },
    "who_is_patient": {
        "uz": "👥 Tahlil kim uchun?",
        "ru": "👥 Для кого анализ?",
        "en": "👥 Who is the patient?"
    },
    "adult":  {"uz": "🧑 Kattalar uchun",  "ru": "🧑 Взрослый",  "en": "🧑 Adult"},
    "child":  {"uz": "👶 Bola uchun",      "ru": "👶 Ребёнок",   "en": "👶 Child"},

    "ask_full_name": {
        "uz": (
            "✏️ <b>Bemor ismini kiriting</b>\n\n"
            "Ism va familiyani to'liq yozing.\n"
            "📌 Masalan: <i>Alisher Haitmirzayev</i>"
        ),
        "ru": (
            "✏️ <b>Введите ФИО пациента</b>\n\n"
            "Напишите имя и фамилию полностью.\n"
            "📌 Например: <i>Алишер Хаитмирзаев</i>"
        ),
        "en": (
            "✏️ <b>Enter patient's full name</b>\n\n"
            "Write first and last name in full.\n"
            "📌 Example: <i>Alisher Haitmirzayev</i>"
        ),
    },
    "ask_age": {
        "uz": "🎂 Bemorning yoshini kiriting <b>(raqamda)</b>:",
        "ru": "🎂 Введите возраст пациента <b>(цифрой)</b>:",
        "en": "🎂 Enter patient's age <b>(number)</b>:",
    },
    "ask_gender": {
        "uz": "⚧ Bemorning jinsini tanlang:",
        "ru": "⚧ Укажите пол пациента:",
        "en": "⚧ Select patient's gender:",
    },
    "male":   {"uz": "👨 Erkak",  "ru": "👨 Мужской",  "en": "👨 Male"},
    "female": {"uz": "👩 Ayol",   "ru": "👩 Женский",   "en": "👩 Female"},

    "child_timing": {
        "uz": "🕐 Bola odatda qachon hojatga boradi?\n\n(Bu konteyner yetkazish vaqtini belgilaydi)",
        "ru": "🕐 Когда обычно ребёнок ходит в туалет?\n\n(Это определяет время доставки контейнера)",
        "en": "🕐 When does the child usually use the toilet?\n\n(This helps us schedule container delivery)",
    },
    "morning":   {"uz": "🌅 Ertalab  (06:00 – 09:00)", "ru": "🌅 Утром (06:00 – 09:00)",  "en": "🌅 Morning (06:00 – 09:00)"},
    "afternoon": {"uz": "☀️ Kunduzi (09:00 – 15:00)",  "ru": "☀️ Днём (09:00 – 15:00)",   "en": "☀️ Afternoon (09:00 – 15:00)"},
    "evening":   {"uz": "🌙 Kechqurun (15:00 – 21:00)","ru": "🌙 Вечером (15:00 – 21:00)", "en": "🌙 Evening (15:00 – 21:00)"},
    "irregular": {"uz": "❓ Aniq vaqt yo'q",            "ru": "❓ Нерегулярно",             "en": "❓ Irregular / no fixed time"},

    "uses_diaper": {
        "uz": "🧷 Bola taglik ishlatadimi?",
        "ru": "🧷 Ребёнок использует подгузник?",
        "en": "🧷 Does the child use a diaper?",
    },
    "yes": {"uz": "✅ Ha",  "ru": "✅ Да",  "en": "✅ Yes"},
    "no":  {"uz": "❌ Yo'q","ru": "❌ Нет", "en": "❌ No"},

    "diaper_instruction": {
        "uz": (
            "📋 <b>Taglik bilan namuna olish bo'yicha ko'rsatma</b>\n\n"
            "Quyidagi faylni diqqat bilan o'qing va bajarib, keyin davom eting."
        ),
        "ru": (
            "📋 <b>Инструкция по сбору образца с подгузником</b>\n\n"
            "Внимательно ознакомьтесь с файлом ниже, затем продолжите."
        ),
        "en": (
            "📋 <b>Diaper sample collection instructions</b>\n\n"
            "Please read the file below carefully, then continue."
        ),
    },

    "complaints_title": {
        "uz": (
            "🩺 <b>Sizni nima bezovta qilmoqda?</b>\n\n"
            "Keraklilarini belgilang (bir yoki bir nechtasini tanlang).\n"
            "Boshqa shikoyat bo'lsa ✍️ tugmani bosing.\n"
            "Tayyor bo'lgach <b>▶️ Davom etish</b> ni bosing."
        ),
        "ru": (
            "🩺 <b>Что вас беспокоит?</b>\n\n"
            "Отметьте нужные (можно несколько).\n"
            "Если есть другая жалоба — нажмите ✍️.\n"
            "Когда готово — нажмите <b>▶️ Продолжить</b>."
        ),
        "en": (
            "🩺 <b>What's bothering you?</b>\n\n"
            "Select all that apply (one or more).\n"
            "If you have another complaint — tap ✍️.\n"
            "When done — tap <b>▶️ Continue</b>."
        ),
    },

    "complaint_constipation": {"uz": "Ich qotishi",      "ru": "Запор",               "en": "Constipation"},
    "complaint_diarrhea":     {"uz": "Ich ketishi",      "ru": "Диарея",              "en": "Diarrhea"},
    "complaint_bloating":     {"uz": "Qorin dam bo'lish","ru": "Вздутие живота",      "en": "Bloating"},
    "complaint_stomach_pain": {"uz": "Qorin og'rig'i",  "ru": "Боль в животе",       "en": "Stomach pain"},
    "complaint_nausea":       {"uz": "Ko'ngil aynishi",  "ru": "Тошнота",             "en": "Nausea"},
    "complaint_low_appetite": {"uz": "Ishtaha pasayishi","ru": "Снижение аппетита",   "en": "Low appetite"},
    "complaint_weight_loss":  {"uz": "Vazn yo'qotish",  "ru": "Снижение веса",       "en": "Weight loss"},
    "complaint_blood":        {"uz": "Axlatda qon",     "ru": "Кровь в стуле",       "en": "Blood in stool"},
    "complaint_parasite":     {"uz": "Parazit gumohi",  "ru": "Подозрение на паразит","en": "Parasite suspicion"},
    "complaint_allergy":      {"uz": "Allergiya",        "ru": "Аллергия",            "en": "Allergy"},
    "other_complaint":        {"uz": "✍️ Boshqa yozish", "ru": "✍️ Написать другое",  "en": "✍️ Write other"},
    "continue_btn":           {"uz": "▶️ Davom etish",   "ru": "▶️ Продолжить",       "en": "▶️ Continue"},

    "ask_other_complaint": {
        "uz": "✍️ Boshqa shikoyatingizni yozing:",
        "ru": "✍️ Напишите вашу другую жалобу:",
        "en": "✍️ Write your other complaint:",
    },

    "delivery_time_adult": {
        "uz": (
            "📦 <b>Konteyner yetkazish vaqtini tanlang</b>\n\n"
            "Bugun kechqurun kuryer konteyner olib keladi.\n"
            "Ertaga erta axlat namunasini to'playsiz."
        ),
        "ru": (
            "📦 <b>Выберите время доставки контейнера</b>\n\n"
            "Сегодня вечером курьер привезёт контейнер.\n"
            "Завтра утром соберёте образец."
        ),
        "en": (
            "📦 <b>Select container delivery time</b>\n\n"
            "Today evening a courier will bring the container.\n"
            "Tomorrow morning you collect the sample."
        ),
    },

    "pickup_title": {
        "uz": (
            "🚚 <b>Namuna tayyor bo'lganda pickup vaqtini tanlang</b>\n\n"
            "⚠️ Alohida chiqish uchun qo'shimcha to'lov: <b>{extra} so'm</b>"
        ),
        "ru": (
            "🚚 <b>Выберите время забора образца</b>\n\n"
            "⚠️ Доплата за отдельный выезд: <b>{extra} сум</b>"
        ),
        "en": (
            "🚚 <b>Select pickup time for your sample</b>\n\n"
            "⚠️ Extra charge for separate pickup: <b>{extra} sum</b>"
        ),
    },

    "container_predelivered": {
        "uz": (
            "📦 <b>Konteyner oldindan yetkaziladi</b>\n\n"
            "Vaqt aniq bo'lmagani uchun kuryer avval konteyner olib keladi.\n"
            "Namuna tayyor bo'lgach, pickup chaqirishingiz mumkin."
        ),
        "ru": (
            "📦 <b>Контейнер будет доставлен заранее</b>\n\n"
            "Так как время нефиксированное, курьер сначала привезёт контейнер.\n"
            "Когда образец будет готов — вызовите курьера."
        ),
        "en": (
            "📦 <b>Container will be delivered in advance</b>\n\n"
            "Since the timing is irregular, the courier will first bring the container.\n"
            "When your sample is ready, call for pickup."
        ),
    },
    "call_pickup": {
        "uz": "🚚 Pickup chaqirish",
        "ru": "🚚 Вызвать курьера",
        "en": "🚚 Call for pickup"
    },

    "ask_location": {
        "uz": (
            "📍 <b>Joylashuvingizni yuboring</b>\n\n"
            "Kuryer sizning manzilingizga keladi.\n"
            "Pastdagi tugmani bosib, joylashuvni yuboring 👇"
        ),
        "ru": (
            "📍 <b>Отправьте ваше местоположение</b>\n\n"
            "Курьер приедет по вашему адресу.\n"
            "Нажмите кнопку ниже, чтобы отправить геолокацию 👇"
        ),
        "en": (
            "📍 <b>Send your location</b>\n\n"
            "The courier will come to your address.\n"
            "Tap the button below to share your location 👇"
        ),
    },
    "send_location_btn": {
        "uz": "📍 Joylashuvni yuborish",
        "ru": "📍 Отправить геолокацию",
        "en": "📍 Send my location"
    },
    "location_outside_uz": {
        "uz": (
            "🌏 Kechirasiz, xizmatimiz hozircha faqat\n"
            "<b>O'zbekiston</b> hududida mavjud."
        ),
        "ru": (
            "🌏 Извините, наш сервис пока доступен\n"
            "только на территории <b>Узбекистана</b>."
        ),
        "en": (
            "🌏 Sorry, our service is currently available\n"
            "only within <b>Uzbekistan</b>."
        ),
    },
    "region_not_served": {
        "uz": "⚠️ Sizning tumanningiz: <b>{district}</b> ❌",
        "ru": "⚠️ Ваш район: <b>{district}</b> ❌",
        "en": "⚠️ Your district: <b>{district}</b> ❌",
    },
    "select_allowed_region": {
        "uz": "Quyidagi ruxsat etilgan tumonlardan birini tanlang:",
        "ru": "Выберите один из разрешённых районов:",
        "en": "Please choose one of the allowed districts:",
    },
    "change_region_btn": {
        "uz": "🔄 Tumanni almashtirish",
        "ru": "🔄 Сменить район",
        "en": "🔄 Change district",
    },
    "service_unavailable_info": {
        "uz": "⚠️ Afsuski, xizmatimiz hozircha sizning hududingizda mavjud emas.\n",
        "ru": "⚠️ К сожалению, наш сервис пока недоступен в вашем районе.\n",
        "en": "⚠️ Unfortunately, our service is not available in your area yet.\n",
    },
    "district_coming_soon": {
        "uz": (
            "💛 <b>{district}</b> hududida xizmat\n"
            "tez orada boshlanadi!\n\n"
            "Yangiliklar uchun kanalimizga obuna bo'ling 👉 {channel}"
        ),
        "ru": (
            "💛 В районе <b>{district}</b> сервис\n"
            "скоро будет доступен!\n\n"
            "Следите за новостями в нашем канале 👉 {channel}"
        ),
        "en": (
            "💛 Service in <b>{district}</b>\n"
            "is coming soon!\n\n"
            "Follow our channel for updates 👉 {channel}"
        ),
    },

    "order_summary_title": {
        "uz": "📋 <b>Buyurtma xulosasi</b>\n\nQuyidagi ma'lumotlarni tekshiring:",
        "ru": "📋 <b>Сводка заказа</b>\n\nПроверьте указанные данные:",
        "en": "📋 <b>Order summary</b>\n\nPlease verify the details below:",
    },
    "confirm_btn": {"uz": "✅ Tasdiqlash",  "ru": "✅ Подтвердить", "en": "✅ Confirm"},
    "cancel_btn":  {"uz": "❌ Bekor qilish","ru": "❌ Отменить",    "en": "❌ Cancel"},

    "order_cancelled": {
        "uz": "🚫 Buyurtma bekor qilindi. Istalgan vaqt yangi buyurtma bera olasiz.",
        "ru": "🚫 Заказ отменён. Вы можете сделать новый заказ в любое время.",
        "en": "🚫 Order cancelled. You can place a new order any time.",
    },

    "payment_instruction": {
        "uz": (
            "💳 <b>To'lov ma'lumotlari</b>\n\n"
            "🏦 Karta raqami: <code>{card}</code>\n"
            "👤 Karta egasi: <b>{owner}</b>\n"
            "💰 To'lov miqdori: <b>{amount} so'm</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            "To'lovni amalga oshiring va <b>chek rasmini</b> (screenshot) shu yerga yuboring.\n"
            "Admin tasdiqlashini kuting ⏳"
        ),
        "ru": (
            "💳 <b>Реквизиты оплаты</b>\n\n"
            "🏦 Номер карты: <code>{card}</code>\n"
            "👤 Владелец: <b>{owner}</b>\n"
            "💰 Сумма: <b>{amount} сум</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            "Произведите оплату и отправьте <b>скриншот чека</b> сюда.\n"
            "Ожидайте подтверждения ⏳"
        ),
        "en": (
            "💳 <b>Payment details</b>\n\n"
            "🏦 Card number: <code>{card}</code>\n"
            "👤 Card owner: <b>{owner}</b>\n"
            "💰 Amount: <b>{amount} sum</b>\n\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            "Make the payment and send a <b>screenshot of your receipt</b> here.\n"
            "Await admin approval ⏳"
        ),
    },
    "receipt_received": {
        "uz": "✅ Chek qabul qilindi!\nAdmin yaqin orada tasdiqlaydi. Sabr qiling ⏳",
        "ru": "✅ Чек получен!\nАдминистратор подтвердит в ближайшее время ⏳",
        "en": "✅ Receipt received!\nAdmin will confirm shortly. Please wait ⏳",
    },

    "no_results": {
        "uz": "📭 Hozircha natijalar mavjud emas.\nTahlil buyurtma bering va natijangiz bu yerda chiqadi.",
        "ru": "📭 Результатов пока нет.\nОформите заказ — результаты появятся здесь.",
        "en": "📭 No results yet.\nPlace an order and your results will appear here.",
    },
    "no_orders": {
        "uz": "📭 Hozircha buyurtmalar yo'q.\nBirinchi buyurtmangizni bering! 🎉",
        "ru": "📭 Заказов пока нет.\nОформите первый заказ! 🎉",
        "en": "📭 No orders yet.\nPlace your first order! 🎉",
    },

    "feedback_rating": {
        "uz": "⭐️ <b>Xizmatimizga baho bering</b>\n\nQuyidagi yulduzlardan birini tanlang:",
        "ru": "⭐️ <b>Оцените наш сервис</b>\n\nВыберите одну из звёзд ниже:",
        "en": "⭐️ <b>Rate our service</b>\n\nSelect a star rating below:",
    },
    "feedback_type": {
        "uz": "📝 <b>Muammo turini tanlang:</b>",
        "ru": "📝 <b>Выберите тип проблемы:</b>",
        "en": "📝 <b>Select the type of issue:</b>",
    },
    "feedback_courier":   {"uz": "🚚 Kuryer kechikdi",         "ru": "🚚 Курьер опоздал",        "en": "🚚 Courier was late"},
    "feedback_container": {"uz": "📦 Konteyner muammosi",      "ru": "📦 Проблема с контейнером", "en": "📦 Container issue"},
    "feedback_staff":     {"uz": "💬 Xodim muomilasi",         "ru": "💬 Поведение сотрудника",   "en": "💬 Staff conduct"},
    "feedback_result":    {"uz": "📄 Natija kechikdi",         "ru": "📄 Результат задержан",      "en": "📄 Result delayed"},
    "feedback_payment":   {"uz": "💳 To'lov muammosi",         "ru": "💳 Проблема с оплатой",      "en": "💳 Payment issue"},
    "feedback_other":     {"uz": "🗒 Boshqa muammo",           "ru": "🗒 Другое",                  "en": "🗒 Other"},
    "feedback_comment": {
        "uz": "✍️ Izohingizni yozing (batafsil):",
        "ru": "✍️ Напишите ваш комментарий (подробно):",
        "en": "✍️ Write your comment (in detail):",
    },
    "feedback_sent": {
        "uz": "💚 Fikringiz uchun katta rahmat!\nSiz uchun yanada yaxshi bo'lamiz 🙏",
        "ru": "💚 Большое спасибо за ваш отзыв!\nМы будем ещё лучше для вас 🙏",
        "en": "💚 Thank you so much for your feedback!\nWe'll keep improving for you 🙏",
    },

    "profile_title": {
        "uz": "👤 <b>Sizning profilingiz</b>",
        "ru": "👤 <b>Ваш профиль</b>",
        "en": "👤 <b>Your profile</b>",
    },
    "contact_info": {
        "uz": "📞 <b>Bizga murojaat qiling:</b>",
        "ru": "📞 <b>Свяжитесь с нами:</b>",
        "en": "📞 <b>Get in touch with us:</b>",
    },
    "invalid_age": {
        "uz": "❌ Iltimos, to'g'ri yosh kiriting (1 — 120 oralig'ida).",
        "ru": "❌ Пожалуйста, введите корректный возраст (от 1 до 120).",
        "en": "❌ Please enter a valid age (between 1 and 120).",
    },
    "free_order": {
        "uz": "🎁 <b>Tabriklaymiz!</b>\nBu sizning 5-buyurtmangiz — <b>BEPUL!</b> 🥳",
        "ru": "🎁 <b>Поздравляем!</b>\nЭто ваш 5-й заказ — <b>БЕСПЛАТНО!</b> 🥳",
        "en": "🎁 <b>Congratulations!</b>\nThis is your 5th order — <b>FREE!</b> 🥳",
    },
    "back_btn": {
        "uz": "⬅️ Orqaga",
        "ru": "⬅️ Назад",
        "en": "⬅️ Back"
    },
    "admin_contact": {
        "uz": "@admin_username",
        "ru": "@admin_username",
        "en": "@admin_username"
    },

    # ── BROADCAST ─────────────────────────────────────────────────────────────
    "broadcast_ask_format": {
        "uz": (
            "📣 <b>Xabar turini tanlang:</b>\n\n"
            "Matn uchun HTML teglar ishlaydi: <code>&lt;b&gt;</code>, <code>&lt;i&gt;</code>, "
            "<code>&lt;u&gt;</code>, <code>&lt;code&gt;</code>\n"
            "Rasm yubormoqchi bo'lsangiz — rasmni caption bilan yuboring."
        ),
        "ru": (
            "📣 <b>Выберите тип рассылки:</b>\n\n"
            "Для текста поддерживаются HTML теги: <code>&lt;b&gt;</code>, <code>&lt;i&gt;</code>, "
            "<code>&lt;u&gt;</code>, <code>&lt;code&gt;</code>\n"
            "Для рассылки с фото — отправьте фото с подписью."
        ),
        "en": (
            "📣 <b>Select broadcast type:</b>\n\n"
            "HTML tags supported for text: <code>&lt;b&gt;</code>, <code>&lt;i&gt;</code>, "
            "<code>&lt;u&gt;</code>, <code>&lt;code&gt;</code>\n"
            "To send a photo — attach it with a caption."
        ),
    },
    "broadcast_btn_text":  {"uz": "✍️ Matn yuborish",  "ru": "✍️ Текст",  "en": "✍️ Text"},
    "broadcast_btn_photo": {"uz": "🖼 Rasm yuborish",  "ru": "🖼 Фото",   "en": "🖼 Photo"},
    "broadcast_ask_text": {
        "uz": "✍️ Barcha foydalanuvchilarga yuboriladigan <b>matn</b>ni yozing:\n\n"
              "<b>Qo'llab-quvvatlanadigan formatlar:</b>\n"
              "• <code>&lt;b&gt;qalin&lt;/b&gt;</code> → <b>qalin</b>\n"
              "• <code>&lt;i&gt;kursiv&lt;/i&gt;</code> → <i>kursiv</i>\n"
              "• <code>&lt;u&gt;tagiga chiziq&lt;/u&gt;</code> → <u>tagiga chiziq</u>\n"
              "• <code>&lt;code&gt;kod&lt;/code&gt;</code> → <code>kod</code>",
        "ru": "✍️ Напишите <b>текст</b> для рассылки всем пользователям:\n\n"
              "<b>Поддерживаемые форматы:</b>\n"
              "• <code>&lt;b&gt;жирный&lt;/b&gt;</code> → <b>жирный</b>\n"
              "• <code>&lt;i&gt;курсив&lt;/i&gt;</code> → <i>курсив</i>\n"
              "• <code>&lt;u&gt;подчёркнутый&lt;/u&gt;</code> → <u>подчёркнутый</u>\n"
              "• <code>&lt;code&gt;код&lt;/code&gt;</code> → <code>код</code>",
        "en": "✍️ Write the <b>text</b> to broadcast to all users:\n\n"
              "<b>Supported formats:</b>\n"
              "• <code>&lt;b&gt;bold&lt;/b&gt;</code> → <b>bold</b>\n"
              "• <code>&lt;i&gt;italic&lt;/i&gt;</code> → <i>italic</i>\n"
              "• <code>&lt;u&gt;underline&lt;/u&gt;</code> → <u>underline</u>\n"
              "• <code>&lt;code&gt;code&lt;/code&gt;</code> → <code>code</code>",
    },
    "broadcast_ask_photo": {
        "uz": "🖼 Barcha foydalanuvchilarga yuboriladigan <b>rasmni caption bilan</b> yuboring.",
        "ru": "🖼 Отправьте <b>фото с подписью</b> для рассылки всем пользователям.",
        "en": "🖼 Send the <b>photo with caption</b> to broadcast to all users.",
    },
    "broadcast_sent": {
        "uz": "✅ Xabar barcha foydalanuvchilarga yuborilmoqda...",
        "ru": "✅ Сообщение рассылается всем пользователям...",
        "en": "✅ Message is being sent to all users...",
    },
}

COMPLAINT_KEYS = [
    "complaint_constipation", "complaint_diarrhea", "complaint_bloating",
    "complaint_stomach_pain", "complaint_nausea",   "complaint_low_appetite",
    "complaint_weight_loss",  "complaint_blood",    "complaint_parasite", "complaint_allergy"
]

# ─── DATABASE ─────────────────────────────────────────────────────────────────
DB_PATH = "medbot.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    c.execute("""CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        tg_id INTEGER UNIQUE,
        lang TEXT DEFAULT 'uz',
        patient_id TEXT UNIQUE,
        full_name TEXT,
        order_count INTEGER DEFAULT 0,
        bonus_points INTEGER DEFAULT 0,
        role TEXT DEFAULT 'user',
        region_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT UNIQUE,
        user_tg_id INTEGER,
        patient_name TEXT,
        patient_age INTEGER,
        patient_gender TEXT,
        patient_type TEXT,
        service TEXT,
        child_timing TEXT,
        uses_diaper INTEGER,
        complaints TEXT,
        delivery_slot TEXT,
        pickup_slot TEXT,
        latitude REAL,
        longitude REAL,
        region_id TEXT,
        price INTEGER DEFAULT 0,
        extra_price INTEGER DEFAULT 0,
        is_free INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending_payment',
        assigned_courier_id INTEGER,
        assigned_doctor_id INTEGER,
        receipt_file_id TEXT,
        result_file_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_tg_id INTEGER,
        rating INTEGER,
        problem_type TEXT,
        comment TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )""")

    defaults = {
        "mandatory_sub":     "1",
        "channel_id":        CHANNEL_ID,
        "service_price":     "150000",
        "pickup_extra":      "30000",
        "payment_card":      "8600 0000 0000 0000",
        "payment_owner":     "Admin Familiyasi",
        "instruction_file_id": "",
        "admin_contact":     "@admin_username",
        "allowed_region_ids": "13,15,4,11",
    }
    for k, v in defaults.items():
        c.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v))

    conn.commit()
    conn.close()

def get_setting(key):
    conn = get_db()
    row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    conn.close()
    return row["value"] if row else None

def set_setting(key, value):
    conn = get_db()
    conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, str(value)))
    conn.commit()
    conn.close()

def get_allowed_region_ids():
    raw = get_setting("allowed_region_ids") or ""
    return [r.strip() for r in raw.split(",") if r.strip()]

def get_user(tg_id):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE tg_id=?", (tg_id,)).fetchone()
    conn.close()
    return dict(user) if user else None

def create_user(tg_id, lang="uz"):
    patient_id = f"MED{tg_id % 1000000:06d}"
    conn = get_db()
    conn.execute(
        "INSERT OR IGNORE INTO users (tg_id, lang, patient_id) VALUES (?, ?, ?)",
        (tg_id, lang, patient_id)
    )
    conn.commit()
    conn.close()

def update_user(tg_id, **kwargs):
    conn = get_db()
    for k, v in kwargs.items():
        conn.execute(f"UPDATE users SET {k}=? WHERE tg_id=?", (v, tg_id))
    conn.commit()
    conn.close()

def get_all_users():
    conn = get_db()
    rows = conn.execute("SELECT * FROM users").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_users_by_role(role):
    conn = get_db()
    rows = conn.execute("SELECT * FROM users WHERE role=?", (role,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def _short_order_id():
    chars = string.ascii_uppercase + string.digits
    return "#" + "".join(random.choices(chars, k=4))

def create_order(data: dict):
    conn = get_db()
    for _ in range(10):
        order_id = _short_order_id()
        exists = conn.execute("SELECT 1 FROM orders WHERE order_id=?", (order_id,)).fetchone()
        if not exists:
            break
    conn.execute("""INSERT INTO orders
        (order_id, user_tg_id, patient_name, patient_age, patient_gender, patient_type,
         service, child_timing, uses_diaper, complaints, delivery_slot, pickup_slot,
         latitude, longitude, region_id, price, extra_price, is_free)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
        order_id, data["user_tg_id"], data["patient_name"], data["patient_age"],
        data["patient_gender"], data["patient_type"], data["service"],
        data.get("child_timing", ""), data.get("uses_diaper", 0),
        # FIX: Always serialize complaints list as JSON string
        json.dumps(data.get("complaints", []), ensure_ascii=False),
        data.get("delivery_slot", ""), data.get("pickup_slot", ""),
        data.get("latitude"), data.get("longitude"), data.get("region_id", ""),
        data.get("price", 0), data.get("extra_price", 0), data.get("is_free", 0)
    ))
    conn.execute("UPDATE users SET order_count = order_count + 1 WHERE tg_id=?", (data["user_tg_id"],))
    conn.commit()
    conn.close()
    return order_id

def get_order(order_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM orders WHERE order_id=?", (order_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def update_order(order_id, **kwargs):
    conn = get_db()
    for k, v in kwargs.items():
        conn.execute(f"UPDATE orders SET {k}=? WHERE order_id=?", (v, order_id))
    conn.commit()
    conn.close()

def get_user_orders(tg_id):
    conn = get_db()
    rows = conn.execute("SELECT * FROM orders WHERE user_tg_id=? ORDER BY created_at DESC", (tg_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def find_nearest_courier(region_id):
    couriers = get_users_by_role("courier")
    if not couriers:
        return None
    for c in couriers:
        if c.get("region_id") == region_id:
            return c
    if region_id not in REGION_COORDS:
        return couriers[0]
    lat1, lon1 = REGION_COORDS[region_id]
    def dist(c):
        rid = c.get("region_id", "")
        if rid in REGION_COORDS:
            lat2, lon2 = REGION_COORDS[rid]
            return math.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2)
        return 9999
    return min(couriers, key=dist)

# ─── SESSION STATE ────────────────────────────────────────────────────────────
def get_state(context: ContextTypes.DEFAULT_TYPE) -> dict:
    return context.user_data

def set_state(context: ContextTypes.DEFAULT_TYPE, **kwargs):
    context.user_data.update(kwargs)

def clear_state(context: ContextTypes.DEFAULT_TYPE):
    context.user_data.clear()

def reset_order_state(context: ContextTypes.DEFAULT_TYPE):
    preserved = {k: context.user_data[k] for k in ("step", "lang") if k in context.user_data}
    context.user_data.clear()
    context.user_data.update(preserved)

# ─── HELPERS ──────────────────────────────────────────────────────────────────
def t(key, lang, **kwargs):
    val = T.get(key, {}).get(lang, T.get(key, {}).get("uz", key))
    return val.format(**kwargs) if kwargs else val

def lang_of_ctx(context: ContextTypes.DEFAULT_TYPE, tg_id: int) -> str:
    if context.user_data.get("lang"):
        return context.user_data["lang"]
    user = get_user(tg_id)
    if user:
        return user.get("lang", "uz")
    return "uz"

def region_name(region_id, lang):
    for r in REGIONS:
        if r["id"] == str(region_id):
            return r.get(f"name_{lang}", r["name_uz"])
    return region_id

def is_uzbekistan_location(lat, lon):
    return 37.1 <= lat <= 45.6 and 55.9 <= lon <= 73.2

def detect_region(lat, lon):
    """
    Reverse-geocode the lat/lon (if geopy available) to extract a human-readable
    address and a detected district name. Then find the nearest serviceable
    region from `REGION_COORDS` and return a tuple:
        (nearest_region_id, address_string_or_None, detected_district_name_or_None)

    If geopy isn't available or reverse lookup fails, detected_district_name
    and address will be None and nearest_region_id will be selected by
    centroid distance as a fallback.
    """
    address = None
    detected_name = None

    if _GEOPY_AVAILABLE:
        try:
            geolocator = Nominatim(user_agent="medbot_region_detector")
            reverse = RateLimiter(geolocator.reverse, min_delay_seconds=1)
            location = reverse((lat, lon), language="en", addressdetails=True, exactly_one=True, timeout=10)
            if location and getattr(location, "raw", None):
                address = location.address
                addr = location.raw.get("address", {})
                # Common address keys that can represent district/town
                for key in ("city_district", "county", "district", "suburb", "town", "village", "city", "municipality"):
                    if key in addr:
                        detected_name = addr.get(key)
                        break
                # As a last resort, try state_district or region
                if not detected_name:
                    for key in ("state_district", "region", "state"):
                        if key in addr:
                            detected_name = addr.get(key)
                            break
        except Exception:
            address = None
            detected_name = None

    # Compute nearest service region from REGION_COORDS (centroid fallback)
    best, best_dist = None, float("inf")
    for rid, (rlat, rlon) in REGION_COORDS.items():
        d = math.sqrt((lat - rlat) ** 2 + (lon - rlon) ** 2)
        if d < best_dist:
            best_dist = d
            best = rid

    return best, address, detected_name

async def is_subscribed(bot, tg_id):
    return True

# ─── KEYBOARD BUILDERS ────────────────────────────────────────────────────────
def make_main_menu(lang) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton(t("btn_order", lang), callback_data="menu_order")],
        [
            InlineKeyboardButton(t("btn_results", lang),      callback_data="menu_results"),
            InlineKeyboardButton(t("btn_order_status", lang), callback_data="menu_status"),
        ],
        [InlineKeyboardButton(t("btn_profile", lang), callback_data="menu_profile")],
        [
            InlineKeyboardButton(t("btn_feedback", lang), callback_data="menu_feedback"),
            InlineKeyboardButton(t("btn_contact", lang),  callback_data="menu_contact"),
        ],
    ])

def complaints_keyboard(lang, selected: set) -> InlineKeyboardMarkup:
    rows = []
    for key in COMPLAINT_KEYS:
        label = t(key, lang)
        icon = "✅" if key in selected else "⬜️"
        rows.append([InlineKeyboardButton(f"{icon}  {label}", callback_data=f"cmp_{key}")])
    rows.append([InlineKeyboardButton(t("other_complaint", lang), callback_data="cmp_other")])
    rows.append([InlineKeyboardButton(t("continue_btn", lang),    callback_data="cmp_done")])
    return InlineKeyboardMarkup(rows)

def admin_payment_kb(order_id) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("✅ Tasdiqlash", callback_data=f"admin_approve_{order_id}"),
        InlineKeyboardButton("❌ Rad etish",  callback_data=f"admin_reject_{order_id}"),
    ]])

# ─── SUMMARY TEXT ─────────────────────────────────────────────────────────────
def order_summary_text(order_data, lang):
    # Shikoyatlar listini olish
    complaints = order_data.get("complaints", None)
    # If not provided (we're previewing before creating an order), try state field
    if complaints is None:
        sc = order_data.get("selected_complaints") or order_data.get("selected_complaints", None)
        if isinstance(sc, (set, list)):
            complaints = list(sc)
        else:
            complaints = []
    
    # Agar bazadan JSON string bo'lib kelsa (ba'zi DB larda shunday bo'ladi)
    if isinstance(complaints, str):
        try:
            import json
            complaints = json.loads(complaints)
        except:
            complaints = []

    # Kalitlarni matnga aylantirish
    labels = []
    for c in complaints:
        # T lug'atidan qidirish (masalan: T['uz']['complaint_diarrhea'])
        translated_label = t(c, lang)
        # Agar tarjima topilsa uni qo'shish, bo'lmasa kalitni o'zini qo'shish
        labels.append(translated_label if translated_label != c else c)

    # Qo'shimcha yozma shikoyat
    other = order_data.get("other_complaint", "")
    if other:
        labels.append(other)

    shikoyat_final = ", ".join(labels) if labels else "—"
    
    # Narx dizayni: agar order_data da price 0 bo'lsa, settings dagi `service_price`
    is_free = order_data.get("is_free", 0)
    price_val = order_data.get("price", 0) or 0
    extra_val = order_data.get("extra_price", 0) or 0
    # Fallback to configured service price when price==0 (user-facing summary)
    if price_val == 0:
        try:
            cfg_price = int(get_setting("service_price") or 0)
        except Exception:
            cfg_price = 0
        price_val = cfg_price
    total = price_val + extra_val
    price_display = "🎁 BEPUL" if is_free else f"{total:,} so'm"
    # Xulosa matni
    shikoyat_text = shikoyat_final

    # Patient type localized
    ptype = order_data.get("patient_type", "")
    if ptype:
        try:
            patient_type_label = t(ptype, lang)
        except Exception:
            patient_type_label = ptype
    else:
        patient_type_label = "—"

    sep = "━━━━━━━━━━━━━━━━━━━━"
    # Compose hudud (location) display: prefer detected_name and show nearest service region
    detected = order_data.get('detected_name') or order_data.get('detected_address')
    nearest_label_uz = region_name(order_data.get('region_id', ''), 'uz')
    nearest_label_ru = region_name(order_data.get('region_id', ''), 'ru')
    nearest_label_en = region_name(order_data.get('region_id', ''), 'en')
    if detected:
        hudud_uz = f"{detected} — Eng yaqin servis: {nearest_label_uz}"
        hudud_ru = f"{detected} — Ближайший сервис: {nearest_label_ru}"
        hudud_en = f"{detected} — Nearest service: {nearest_label_en}"
    else:
        hudud_uz = nearest_label_uz
        hudud_ru = nearest_label_ru
        hudud_en = nearest_label_en
    lines = {
        "uz": [
            sep,
            f"👤 Ism:          {order_data.get('patient_name', '')}",
            f"🎂 Yosh:         {order_data.get('patient_age', '')}",
            f"⚧  Jins:         {order_data.get('patient_gender', '')}",
            f"👶 Bemor turi:   {patient_type_label}",
            f"🧪 Xizmat:       {order_data.get('service', '')}",
            f"📦 Yetkazish:    {order_data.get('delivery_slot', '—')}",
            f"🚚 Pickup:       {order_data.get('pickup_slot', '—')}",
            f"📍 Hudud:        {hudud_uz}",
            f"🩺 Shikoyat:     {shikoyat_text}",
            sep,
            f"💰 Narx:         {price_display}",
            sep,
        ],
        "ru": [
            sep,
            f"👤 Имя:          {order_data.get('patient_name', '')}",
            f"🎂 Возраст:      {order_data.get('patient_age', '')}",
            f"⚧  Пол:          {order_data.get('patient_gender', '')}",
            f"👶 Тип пациента: {patient_type_label}",
            f"🧪 Услуга:       {order_data.get('service', '')}",
            f"📦 Доставка:     {order_data.get('delivery_slot', '—')}",
            f"🚚 Забор:        {order_data.get('pickup_slot', '—')}",
            f"📍 Район:        {hudud_ru}",
            f"🩺 Жалобы:       {shikoyat_text}",
            sep,
            f"💰 Стоимость:    {price_display}",
            sep,
        ],
        "en": [
            sep,
            f"👤 Name:         {order_data.get('patient_name', '')}",
            f"🎂 Age:          {order_data.get('patient_age', '')}",
            f"⚧  Gender:       {order_data.get('patient_gender', '')}",
            f"👶 Patient type: {patient_type_label}",
            f"🧪 Service:      {order_data.get('service', '')}",
            f"📦 Delivery:     {order_data.get('delivery_slot', '—')}",
            f"🚚 Pickup:       {order_data.get('pickup_slot', '—')}",
            f"📍 District:     {hudud_en}",
            f"🩺 Complaints:   {shikoyat_text}",
            sep,
            f"💰 Price:        {price_display}",
            sep,
        ],
    }
    return t("order_summary_title", lang) + "\n\n<code>" + "\n".join(lines.get(lang, lines["uz"])) + "</code>"

# ─── PROFILE TEXT (Interactive) ───────────────────────────────────────────────
def profile_text(user: dict, orders: list, lang: str) -> str:
    count = len(orders)
    # 6 talik sikl
    cycle_pos = count % 6
    next_free = 6 - cycle_pos if cycle_pos != 0 else 6
    
    # Progress bar (6 ta katakcha)
    bar = "🟦" * cycle_pos + "⬜" * (6 - cycle_pos)
    
    completed = sum(1 for o in orders if o.get("status") == "completed")
    bonus = user.get("bonus_points", 0)

    titles = {
        "uz": "👤 SHAXSIY PROFIL",
        "ru": "👤 ЛИЧНЫЙ ПРОФИЛЬ",
        "en": "👤 PERSONAL PROFILE"
    }

    body = {
        "uz": (
            f"<b>{titles['uz']}</b>\n\n"
            f"🆔 ID: <code>{user.get('patient_id', '—')}</code>\n"
            f"📅 Sana: {user.get('created_at', '')[:10]}\n"
            f"⭐️ Bonuslar: {bonus} ball\n\n"
            f"<b>Buyurtmalar holati:</b>\n"
            f"└ Jami: {count} ta\n"
            f"└ Yakunlangan: {completed} ta\n\n"
            f"<b>Aksiya: Har 6-chi buyurtma bepul!</b>\n"
            f"{bar}\n"
            f"💡 Yana <b>{next_free} ta</b> buyurtmadan keyin keyingisi bepul bo'ladi."
        ),
        "ru": (
            f"<b>{titles['ru']}</b>\n\n"
            f"🆔 ID: <code>{user.get('patient_id', '—')}</code>\n"
            f"📅 Дата: {user.get('created_at', '')[:10]}\n"
            f"⭐️ Бонусы: {bonus} баллов\n\n"
            f"<b>Статистика заказов:</b>\n"
            f"└ Всего: {count}\n"
            f"└ Завершено: {completed}\n\n"
            f"<b>Акция: Каждый 6-й заказ бесплатно!</b>\n"
            f"{bar}\n"
            f"💡 До бесплатного заказа осталось: <b>{next_free}</b>"
        )
    }
    return body.get(lang, body["uz"])

# ─── /start ───────────────────────────────────────────────────────────────────
async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    tg_id = update.effective_user.id
    user = get_user(tg_id)
    if user and user.get("lang"):
        lang = user["lang"]
        if await is_subscribed(context.bot, tg_id):
            await send_main_menu(update, context, lang)
        else:
            await send_subscribe_prompt(update, context, lang)
        return

    kb = InlineKeyboardMarkup([[
        InlineKeyboardButton("🇺🇿 O'zbek",  callback_data="lang_uz"),
        InlineKeyboardButton("🇷🇺 Русский", callback_data="lang_ru"),
        InlineKeyboardButton("🇬🇧 English", callback_data="lang_en"),
    ]])
    await update.message.reply_text(
        "🌐 <b>Tilni tanlang</b>\n"
        "🌐 <b>Выберите язык</b>\n"
        "🌐 <b>Choose language</b>",
        reply_markup=kb,
        parse_mode="HTML"
    )

async def send_subscribe_prompt(update: Update, context: ContextTypes.DEFAULT_TYPE, lang: str):
    channel = get_setting("channel_id") or CHANNEL_ID
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton(t("channel_name", lang), url=f"https://t.me/{channel.lstrip('@').lstrip('-100')}")],
        [InlineKeyboardButton(t("check_sub", lang), callback_data="check_sub")],
    ])
    await update.effective_message.reply_text(
        t("subscribe_msg", lang), reply_markup=kb, parse_mode="HTML"
    )

async def send_main_menu(update: Update, context: ContextTypes.DEFAULT_TYPE, lang: str):
    set_state(context, step="main", lang=lang)
    await update.effective_message.reply_text(
        t("main_menu", lang),
        reply_markup=make_main_menu(lang),
        parse_mode="HTML"
    )

# ─── CALLBACK ROUTER ──────────────────────────────────────────────────────────
async def callback_router(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    tg_id = query.from_user.id
    data = query.data

    # ── Language selection ─────────────────────────────────────────────────
    if data.startswith("lang_"):
        lang = data.split("_")[1]
        create_user(tg_id, lang)
        update_user(tg_id, lang=lang)
        set_state(context, lang=lang)
        await query.answer()
        await query.edit_message_reply_markup(reply_markup=None)
        if await is_subscribed(context.bot, tg_id):
            await send_main_menu(update, context, lang)
        else:
            await send_subscribe_prompt(update, context, lang)
        return

    lang = lang_of_ctx(context, tg_id)

    # ── Subscription check ─────────────────────────────────────────────────
    if data == "check_sub":
        await query.answer()
        if await is_subscribed(context.bot, tg_id):
            await query.edit_message_reply_markup(reply_markup=None)
            await send_main_menu(update, context, lang)
        else:
            await query.answer(t("not_subscribed", lang), show_alert=True)
        return

    # ── Main menu buttons ──────────────────────────────────────────────────
    if data == "menu_order":
        await query.answer()
        await handle_order_start(update, context, lang)
        return
    if data == "menu_results":
        await query.answer()
        await handle_results(update, context, tg_id, lang)
        return
    if data == "menu_status":
        await query.answer()
        await handle_order_status(update, context, tg_id, lang)
        return
    if data == "menu_profile":
        await query.answer()
        await handle_profile(update, context, tg_id, lang)
        return
    if data == "menu_feedback":
        await query.answer()
        await handle_feedback_start(update, context, tg_id, lang)
        return
    if data == "menu_contact":
        await query.answer()
        contact = get_setting("admin_contact") or "@admin_username"
        await query.message.reply_text(
            f"{t('contact_info', lang)}\n\n{contact}", parse_mode="HTML"
        )
        return

    # ── Service selection ──────────────────────────────────────────────────
    if data == "service_kal":
        await query.answer()
        set_state(context, service=t("service_kal", lang))
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton(t("adult", lang), callback_data="patient_adult")],
            [InlineKeyboardButton(t("child", lang), callback_data="patient_child")],
        ])
        await query.message.reply_text(t("who_is_patient", lang), reply_markup=kb, parse_mode="HTML")
        return

    # ── Patient type ───────────────────────────────────────────────────────
    if data in ("patient_adult", "patient_child"):
        await query.answer()
        ptype = "adult" if data == "patient_adult" else "child"
        set_state(context, patient_type=ptype, step="ask_name")
        await query.message.reply_text(t("ask_full_name", lang), parse_mode="HTML")
        return

    # ── Gender ─────────────────────────────────────────────────────────────
    if data.startswith("gender_"):
        await query.answer()
        gender_key = data.split("_")[1]
        gender = t("male" if gender_key == "male" else "female", lang)
        set_state(context, patient_gender=gender)
        state = get_state(context)
        if state.get("patient_type") == "child":
            set_state(context, step="ask_child_timing")
            kb = InlineKeyboardMarkup([
                [InlineKeyboardButton(t("morning",   lang), callback_data="timing_morning")],
                [InlineKeyboardButton(t("afternoon", lang), callback_data="timing_afternoon")],
                [InlineKeyboardButton(t("evening",   lang), callback_data="timing_evening")],
                [InlineKeyboardButton(t("irregular", lang), callback_data="timing_irregular")],
            ])
            await query.message.reply_text(t("child_timing", lang), reply_markup=kb, parse_mode="HTML")
        else:
            await send_complaints_keyboard(query.message, context, lang)
        return

    # ── Child timing ───────────────────────────────────────────────────────
    if data.startswith("timing_"):
        await query.answer()
        timing_map = {
            "timing_morning": "morning", "timing_afternoon": "afternoon",
            "timing_evening": "evening", "timing_irregular": "irregular"
        }
        timing_key = timing_map.get(data, "irregular")
        set_state(context, child_timing=timing_key, step="ask_diaper")
        kb = InlineKeyboardMarkup([[
            InlineKeyboardButton(t("yes", lang), callback_data="diaper_yes"),
            InlineKeyboardButton(t("no", lang),  callback_data="diaper_no"),
        ]])
        await query.message.reply_text(t("uses_diaper", lang), reply_markup=kb, parse_mode="HTML")
        return

    # ── Diaper ─────────────────────────────────────────────────────────────
    if data in ("diaper_yes", "diaper_no"):
        await query.answer()
        uses_diaper = 1 if data == "diaper_yes" else 0
        set_state(context, uses_diaper=uses_diaper)
        if uses_diaper:
            file_id = get_setting("instruction_file_id")
            if file_id:
                try:
                    await query.message.reply_document(
                        file_id, caption=t("diaper_instruction", lang), parse_mode="HTML"
                    )
                except Exception:
                    await query.message.reply_text(t("diaper_instruction", lang), parse_mode="HTML")
            else:
                await query.message.reply_text(t("diaper_instruction", lang), parse_mode="HTML")
        await send_complaints_keyboard(query.message, context, lang)
        return

    # ── Complaints toggle ──────────────────────────────────────────────────
    # FIX: Prefix changed from "complaint_" to "cmp_" to avoid collision with
    # complaint translation keys (e.g. "complaint_diarrhea" in T dict).
    # The old code's callback_data was the same as the T-dict key which caused
    # the router to misroute — now they are distinct.
    if data.startswith("cmp_"):
        sub = data[len("cmp_"):]
        state = get_state(context)

        if sub == "other":
            await query.answer()
            set_state(context, step="ask_other_complaint")
            await query.message.reply_text(t("ask_other_complaint", lang), parse_mode="HTML")
            return

        if sub == "done":
            await query.answer()
            set_state(context, step="ask_delivery")
            await ask_delivery_time(query.message, context, lang)
            return

        # Toggle the complaint key (stored as the full T-dict key, e.g. "complaint_diarrhea")
        full_key = sub  # sub already is "complaint_diarrhea" etc.
        old_selected: set = state.get("selected_complaints", set())
        new_selected = set(old_selected)
        if full_key in new_selected:
            new_selected.discard(full_key)
        else:
            new_selected.add(full_key)
        set_state(context, selected_complaints=new_selected)

        complaints_msg_id = state.get("complaints_msg_id")
        if complaints_msg_id:
            try:
                await context.bot.edit_message_reply_markup(
                    chat_id=tg_id,
                    message_id=complaints_msg_id,
                    reply_markup=complaints_keyboard(lang, new_selected)
                )
            except Exception as e:
                if "not modified" not in str(e).lower():
                    print(f"[complaints toggle error] {e}")
        await query.answer()
        return

    # ── Delivery slot ──────────────────────────────────────────────────────
    if data.startswith("delivery_"):
        await query.answer()
        slot = data[len("delivery_"):]
        set_state(context, delivery_slot=slot, step="ask_pickup")
        await ask_pickup_time(query.message, context, lang)
        return

    # ── Pickup slot ────────────────────────────────────────────────────────
    if data.startswith("pickup_"):
        await query.answer()
        slot = data[len("pickup_"):]
        set_state(context, pickup_slot=slot, step="ask_location")
        await ask_location(query.message, context, lang)
        return

    if data == "change_region":
        await query.answer()
        allowed_ids = get_allowed_region_ids()
        buttons = []
        row = []
        for i, rid in enumerate(allowed_ids):
            label = region_name(rid, lang)
            row.append(InlineKeyboardButton(label, callback_data=f"manual_region_{rid}"))
            if len(row) == 2:
                buttons.append(row)
                row = []
        if row:
            buttons.append(row)
        kb = InlineKeyboardMarkup(buttons)
        await query.message.reply_text(t("select_allowed_region", lang), reply_markup=kb, parse_mode="HTML")
        set_state(context, step="choose_manual_region")
        return

    if data.startswith("manual_region_"):
        await query.answer()
        selected_region = data[len("manual_region_"):]
        set_state(context,
            region_id=selected_region,
            region_allowed=True,
            detected_name=region_name(selected_region, lang),
            detected_address=None,
            step="confirm_order"
        )
        await query.message.reply_text(
            f"✅ {region_name(selected_region, lang)} tanlandi.",
            parse_mode="HTML"
        )
        await show_order_summary(update, context, tg_id, lang)
        return

    # ── Order confirm / cancel ─────────────────────────────────────────────
    if data in ("order_confirm", "order_cancel"):
        await query.answer()
        if data == "order_cancel":
            reset_order_state(context)
            await query.message.reply_text(t("order_cancelled", lang), parse_mode="HTML")
            await send_main_menu(update, context, lang)
        else:
            await finalize_order(update, context, tg_id, lang)
        return

    # ── Feedback rating ────────────────────────────────────────────────────
    if data.startswith("rating_"):
        await query.answer()
        rating = int(data.split("_")[1])
        set_state(context, feedback_rating=rating, step="ask_feedback_type")
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton(t("feedback_courier",   lang), callback_data="ftype_courier")],
            [InlineKeyboardButton(t("feedback_container", lang), callback_data="ftype_container")],
            [InlineKeyboardButton(t("feedback_staff",     lang), callback_data="ftype_staff")],
            [InlineKeyboardButton(t("feedback_result",    lang), callback_data="ftype_result")],
            [InlineKeyboardButton(t("feedback_payment",   lang), callback_data="ftype_payment")],
            [InlineKeyboardButton(t("feedback_other",     lang), callback_data="ftype_other")],
        ])
        await query.message.reply_text(t("feedback_type", lang), reply_markup=kb, parse_mode="HTML")
        return

    # ── Feedback type ──────────────────────────────────────────────────────
    if data.startswith("ftype_"):
        await query.answer()
        ftype = data[len("ftype_"):]
        set_state(context, feedback_type=ftype, step="ask_feedback_comment")
        await query.message.reply_text(t("feedback_comment", lang), parse_mode="HTML")
        return

    # ── Courier done ───────────────────────────────────────────────────────
    if data.startswith("courier_done_"):
        order_id = data[len("courier_done_"):]
        update_order(order_id, status="completed")
        order = get_order(order_id)
        if order:
            user_info = get_user(order["user_tg_id"])
            user_lang = user_info.get("lang", "uz") if user_info else "uz"
            msg = {
                "uz": f"🚚 Kuryer yetib keldi!\n🎉 Buyurtma <code>{order_id}</code> bajarildi.",
                "ru": f"🚚 Курьер прибыл!\n🎉 Заказ <code>{order_id}</code> завершён.",
                "en": f"🚚 Courier arrived!\n🎉 Order <code>{order_id}</code> completed.",
            }
            await context.bot.send_message(
                order["user_tg_id"], msg.get(user_lang, msg["uz"]), parse_mode="HTML"
            )
        await query.answer("✅ Bajarildi")
        return

    # ── Broadcast type selection ───────────────────────────────────────────
    if data == "admin_broadcast_text":
        set_state(context, step="admin_broadcast_text")
        await query.message.reply_text(t("broadcast_ask_text", "uz"), parse_mode="HTML")
        await query.answer()
        return
    if data == "admin_broadcast_photo":
        set_state(context, step="admin_broadcast_photo")
        await query.message.reply_text(t("broadcast_ask_photo", "uz"), parse_mode="HTML")
        await query.answer()
        return

    # ── Admin / Staff callbacks ────────────────────────────────────────────
    if data.startswith("admin_"):
        await handle_admin_callback(update, context, query, data, lang)
        return
    if data.startswith("courier_") or data.startswith("doctor_"):
        await handle_staff_callback(update, context, query, data, lang)
        return

# ─── ORDER FLOW HELPERS ───────────────────────────────────────────────────────
async def handle_order_start(update: Update, context: ContextTypes.DEFAULT_TYPE, lang: str):
    reset_order_state(context)
    set_state(context, step="choose_service", lang=lang)
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton(t("service_kal", lang), callback_data="service_kal")]
    ])
    text = (
        "🧬 <b>Xizmat turini tanlang:</b>" if lang == "uz"
        else ("🧬 <b>Выберите вид услуги:</b>" if lang == "ru"
              else "🧬 <b>Select a service:</b>")
    )
    await update.effective_message.reply_text(text, reply_markup=kb, parse_mode="HTML")

async def send_complaints_keyboard(message, context: ContextTypes.DEFAULT_TYPE, lang: str):
    """Send complaints keyboard and store message_id for in-place editing."""
    # FIX: Always reset selected_complaints to a fresh set when starting complaints step
    set_state(context, step="ask_complaints", selected_complaints=set())
    sent = await message.reply_text(
        t("complaints_title", lang),
        reply_markup=complaints_keyboard(lang, set()),
        parse_mode="HTML"
    )
    set_state(context, complaints_msg_id=sent.message_id)

async def ask_delivery_time(message, context: ContextTypes.DEFAULT_TYPE, lang: str):
    state = get_state(context)
    ptype = state.get("patient_type", "adult")
    timing = state.get("child_timing", "irregular")

    if ptype == "adult":
        await message.reply_text(t("delivery_time_adult", lang), parse_mode="HTML")
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton("🌆  18:00 – 20:00", callback_data="delivery_18:00–20:00")],
            [InlineKeyboardButton("🌃  20:00 – 22:00", callback_data="delivery_20:00–22:00")],
        ])
        label = "⏰ Vaqtni tanlang:" if lang == "uz" else ("⏰ Выберите время:" if lang == "ru" else "⏰ Choose time:")
        await message.reply_text(label, reply_markup=kb)
    else:
        if timing == "morning":
            slots = [("🌅  07:00 – 10:00", "delivery_07:00–10:00")]
        elif timing == "afternoon":
            slots = [("☀️  12:00 – 15:00", "delivery_12:00–15:00"),
                     ("🌤  15:00 – 18:00", "delivery_15:00–18:00")]
        elif timing == "evening":
            slots = [("🌙  17:00 – 20:00", "delivery_17:00–20:00")]
        else:
            # Irregular: skip delivery slot, jump straight to pickup
            set_state(context, delivery_slot="—")
            await ask_pickup_time(message, context, lang)
            return

        await message.reply_text(t("delivery_time_adult", lang), parse_mode="HTML")
        kb = InlineKeyboardMarkup([[InlineKeyboardButton(label, callback_data=cd)] for label, cd in slots])
        label = "⏰ Vaqtni tanlang:" if lang == "uz" else ("⏰ Выберите время:" if lang == "ru" else "⏰ Choose time:")
        await message.reply_text(label, reply_markup=kb)

async def ask_pickup_time(message, context: ContextTypes.DEFAULT_TYPE, lang: str):
    state = get_state(context)
    ptype = state.get("patient_type", "adult")
    timing = state.get("child_timing", "irregular")
    extra = int(get_setting("pickup_extra") or 30000)

    if ptype == "adult":
        await message.reply_text(t("pickup_title", lang, extra=f"{extra:,}"), parse_mode="HTML")
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton("🌆  18:00 – 20:00", callback_data="pickup_18:00–20:00")],
            [InlineKeyboardButton("🌃  20:00 – 22:00", callback_data="pickup_20:00–22:00")],
        ])
        label = ("🚚 Pickup vaqtini tanlang:" if lang == "uz"
                 else ("🚚 Выберите время забора:" if lang == "ru" else "🚚 Select pickup time:"))
        await message.reply_text(label, reply_markup=kb)
    else:
        if timing == "irregular":
            await message.reply_text(t("container_predelivered", lang), parse_mode="HTML")
            kb = InlineKeyboardMarkup([
                [InlineKeyboardButton(t("call_pickup", lang), callback_data="pickup_call")]
            ])
            await message.reply_text("👇", reply_markup=kb)
        else:
            if timing == "morning":
                slots = [("🌅  07:00 – 10:00", "pickup_07:00–10:00")]
            elif timing == "afternoon":
                slots = [("☀️  12:00 – 15:00", "pickup_12:00–15:00"),
                         ("🌤  15:00 – 18:00", "pickup_15:00–18:00")]
            else:
                slots = [("🌙  17:00 – 20:00", "pickup_17:00–20:00")]

            await message.reply_text(t("pickup_title", lang, extra=f"{extra:,}"), parse_mode="HTML")
            kb = InlineKeyboardMarkup([[InlineKeyboardButton(lbl, callback_data=cd)] for lbl, cd in slots])
            label = ("🚚 Pickup vaqtini tanlang:" if lang == "uz"
                     else ("🚚 Выберите время забора:" if lang == "ru" else "🚚 Select pickup time:"))
            await message.reply_text(label, reply_markup=kb)

async def ask_location(message, context: ContextTypes.DEFAULT_TYPE, lang: str):
    kb = ReplyKeyboardMarkup(
        [[KeyboardButton(t("send_location_btn", lang), request_location=True)]],
        resize_keyboard=True,
        one_time_keyboard=True
    )
    await message.reply_text(t("ask_location", lang), reply_markup=kb, parse_mode="HTML")
    set_state(context, step="waiting_location")

# ─── LOCATION HANDLER ─────────────────────────────────────────────────────────
async def handle_location(update: Update, context: ContextTypes.DEFAULT_TYPE):
    tg_id = update.effective_user.id
    state = get_state(context)
    if state.get("step") != "waiting_location":
        return

    lang = lang_of_ctx(context, tg_id)
    lat = update.message.location.latitude
    lon = update.message.location.longitude

    if not is_uzbekistan_location(lat, lon):
        await update.message.reply_text(
            t("location_outside_uz", lang),
            reply_markup=ReplyKeyboardRemove(),
            parse_mode="HTML"
        )
        await send_main_menu(update, context, lang)
        return

    region_id, address, detected_name = detect_region(lat, lon)
    allowed = get_allowed_region_ids()

    # If region is not in allowed list, we will block automatic progression and
    # offer manual region selection buttons for the user to choose a nearby
    # allowed region. Otherwise continue to order summary.
    is_allowed = region_id in allowed

    set_state(context, latitude=lat, longitude=lon, region_id=region_id, step="confirm_order", region_allowed=is_allowed, detected_name=detected_name, detected_address=address)
    district_label = region_name(region_id, lang)

    # Compose header showing detected-name and nearest service region
    caption_lines = []
    if detected_name:
        caption_lines.append(f"📍 Sizning tumaningiz: <b>{detected_name}</b>")
    caption_lines.append(f"🔎 Eng yaqin servis hududi: <b>{district_label}</b>")
    if address:
        caption_lines.append(address)
    caption = "\n".join(caption_lines)

    await update.message.reply_text(
        caption,
        reply_markup=ReplyKeyboardRemove(),
        parse_mode="HTML"
    )

    if not is_allowed:
        # Show list of allowed regions as inline buttons so user can pick manually
        allowed_ids = get_allowed_region_ids()
        buttons = []
        row = []
        for i, rid in enumerate(allowed_ids):
            label = region_name(rid, lang)
            row.append(InlineKeyboardButton(label, callback_data=f"manual_region_{rid}"))
            if len(row) == 2:
                buttons.append(row)
                row = []
        if row:
            buttons.append(row)
        kb = InlineKeyboardMarkup(buttons)
        await update.message.reply_text(
            t("region_not_served", lang, district=detected_name or district_label),
            reply_markup=ReplyKeyboardRemove(),
            parse_mode="HTML"
        )
        await update.message.reply_text(
            t("service_unavailable_info", lang) + t("select_allowed_region", lang),
            reply_markup=kb,
            parse_mode="HTML"
        )
        set_state(context, step="choose_manual_region")
        return

    # If allowed, show the order summary as before
    await show_order_summary(update, context, tg_id, lang)

async def show_order_summary(update: Update, context: ContextTypes.DEFAULT_TYPE, tg_id: int, lang: str):
    state = get_state(context)
    summary = order_summary_text(state, lang)
    if state.get("region_allowed") is False:
        kb = InlineKeyboardMarkup([[
            InlineKeyboardButton(t("change_region_btn", lang), callback_data="change_region"),
            InlineKeyboardButton(t("cancel_btn", lang), callback_data="order_cancel"),
        ]])
    else:
        kb = InlineKeyboardMarkup([[
            InlineKeyboardButton(t("confirm_btn", lang), callback_data="order_confirm"),
            InlineKeyboardButton(t("cancel_btn", lang), callback_data="order_cancel"),
        ]])
    await update.effective_message.reply_text(summary, reply_markup=kb, parse_mode="HTML")

async def finalize_order(update: Update, context: ContextTypes.DEFAULT_TYPE, tg_id: int, lang: str):
    state = get_state(context)
    user = get_user(tg_id)
    
    current_order_no = user.get("order_count", 0) + 1
    is_free = 1 if current_order_no % 6 == 0 else 0
    
    price = 0 if is_free else int(get_setting("service_price") or 150000)
    extra = int(get_setting("pickup_extra") or 30000) if state.get("pickup_slot") == "call" else 0

    # Bemor turini tarjima qilish (adult -> Kattalar, child -> Bolalar)
    p_type_key = state.get("patient_type", "adult")
    patient_type_translated = t(p_type_key, lang) if p_type_key in T else p_type_key

    # Shikoyatlar to'plamini listga o'tkazish
    selected = state.get("selected_complaints")
    if isinstance(selected, set):
        complaints_list = list(selected)
    elif isinstance(selected, list):
        complaints_list = selected
    else:
        complaints_list = []

    order_data = {
        "user_tg_id":    tg_id,
        "patient_name":  state.get("patient_name", ""),
        "patient_age":   state.get("patient_age", 0),
        "patient_gender":state.get("patient_gender", ""),
        "patient_type":  patient_type_translated, # Tarjima qilingan qiymat
        "service":       state.get("service", t("service_kal", lang)),
        "complaints":    complaints_list,
        "other_complaint": state.get("other_complaint", ""),
        "delivery_slot": state.get("delivery_slot", ""),
        "pickup_slot":   state.get("pickup_slot", ""),
        "latitude":      state.get("latitude"),
        "longitude":     state.get("longitude"),
        "region_id":     state.get("region_id", ""),
        "price":         price,
        "extra_price":   extra,
        "is_free":       is_free,
    }

    order_id = create_order(order_data)


    if is_free:
        await update.effective_message.reply_text(t("free_order", lang), parse_mode="HTML")
        await notify_staff_new_order(context, order_id, tg_id, lang)
        reset_order_state(context)
        await send_main_menu(update, context, lang)
        return

    card  = get_setting("payment_card")  or "0000 0000 0000 0000"
    owner = get_setting("payment_owner") or "Admin"
    total = price + extra
    set_state(context, step="waiting_receipt", current_order_id=order_id)
    await update.effective_message.reply_text(
        t("payment_instruction", lang, card=card, owner=owner, amount=f"{total:,}"),
        parse_mode="HTML"
    )

# ─── PHOTO HANDLER ────────────────────────────────────────────────────────────
async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    tg_id = update.effective_user.id
    state = get_state(context)
    lang = lang_of_ctx(context, tg_id)

    # Receipt (payment proof)
    if state.get("step") == "waiting_receipt":
        order_id = state.get("current_order_id")
        if not order_id:
            return
        file_id = update.message.photo[-1].file_id
        update_order(order_id, receipt_file_id=file_id, status="pending_admin")
        await update.message.reply_text(t("receipt_received", lang), parse_mode="HTML")
        for admin_id in ADMIN_IDS:
            try:
                order = get_order(order_id)
                user = get_user(tg_id)
                caption = (
                    f"💳 <b>Yangi to'lov!</b>\n\n"
                    f"🔖 Buyurtma: <code>{order_id}</code>\n"
                    f"👤 Foydalanuvchi: {user.get('patient_id')} | <code>{tg_id}</code>\n"
                    f"💰 Summa: <b>{(order['price'] + order['extra_price']):,} so'm</b>"
                )
                await context.bot.send_photo(
                    admin_id, file_id, caption=caption,
                    reply_markup=admin_payment_kb(order_id), parse_mode="HTML"
                )
            except Exception:
                pass
        reset_order_state(context)
        await send_main_menu(update, context, lang)
        return

    # Doctor sending result
    if state.get("step") == "doctor_sending_result":
        order_id = state.get("doctor_order_id")
        if order_id:
            order = get_order(order_id)
            if order:
                file_id = update.message.photo[-1].file_id
                update_order(order_id, result_file_id=file_id, status="completed")
                user_tg = order["user_tg_id"]
                await context.bot.send_photo(
                    user_tg, file_id,
                    caption=f"📊 <b>Natijangiz tayyor!</b>\n🔖 Buyurtma: <code>{order_id}</code>",
                    parse_mode="HTML"
                )
                await update.message.reply_text("✅ Natija muvaffaqiyatli yuborildi.")
        set_state(context, step="doctor_panel")
        return

    # FIX: Admin broadcast photo — accept photo with caption for rich broadcasts
    if state.get("step") == "admin_broadcast_photo" and tg_id in ADMIN_IDS:
        file_id = update.message.photo[-1].file_id
        caption = update.message.caption or ""
        await update.message.reply_text(t("broadcast_sent", "uz"), parse_mode="HTML")
        await broadcast_photo_to_all(context, file_id, caption)
        await send_admin_panel(update, context, tg_id)
        return

# ─── DOCUMENT / VIDEO HANDLER ─────────────────────────────────────────────────
async def handle_doc_or_video(update: Update, context: ContextTypes.DEFAULT_TYPE):
    tg_id = update.effective_user.id
    state = get_state(context)
    if state.get("step") == "admin_waiting_instruction" and tg_id in ADMIN_IDS:
        doc = update.message.document or update.message.video
        if doc:
            set_setting("instruction_file_id", doc.file_id)
            await update.message.reply_text("✅ Ko'rsatma fayl saqlandi.")
            await send_admin_panel(update, context, tg_id)

# ─── USER_SHARED HANDLER ──────────────────────────────────────────────────────
async def handle_user_shared(update: Update, context: ContextTypes.DEFAULT_TYPE):
    tg_id = update.effective_user.id
    state = get_state(context)
    step = state.get("step", "")

    users_shared = update.message.users_shared
    if not users_shared or not users_shared.users:
        await update.message.reply_text("❌ Foydalanuvchi tanlanmadi.")
        return

    selected_user_id = users_shared.users[0].user_id

    if not step.startswith("admin_select_user_for_"):
        await update.message.reply_text("❌ Avval «Shifokor qo'shish» tugmasini bosing!")
        return

    role = step.replace("admin_select_user_for_", "")

    user = get_user(selected_user_id)
    if not user:
        create_user(selected_user_id)
        user = get_user(selected_user_id)

    current_role = user.get("role") if user else None

    if current_role == role:
        await update.message.reply_text(
            f"✅ Bu foydalanuvchi allaqachon <b>{role}</b>!", parse_mode="HTML"
        )
        await send_admin_panel(update, context, tg_id)
        return

    update_user(selected_user_id, role=role)

    if role == "courier":
        set_state(context, step="admin_set_courier_region", pending_courier_id=selected_user_id)
        await send_region_selection_for_courier(update, context, tg_id, selected_user_id)
    else:
        await update.message.reply_text(
            f"✅ Foydalanuvchi <code>{selected_user_id}</code> → <b>{role}</b> qilib yangilandi",
            parse_mode="HTML"
        )
        await send_admin_panel(update, context, tg_id)

# ─── TEXT MESSAGE HANDLER ─────────────────────────────────────────────────────
async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    tg_id = update.effective_user.id
    text  = update.message.text.strip() if update.message.text else ""
    state = get_state(context)
    lang  = lang_of_ctx(context, tg_id)
    step  = state.get("step", "")

    if text in ("/start", "/menu"):
        await cmd_start(update, context)
        return

    if text == "/admin" and tg_id in ADMIN_IDS:
        await send_admin_panel(update, context, tg_id)
        return
    if text == "/doctor":
        user = get_user(tg_id)
        if user and user.get("role") == "doctor":
            await send_doctor_panel(update, context, tg_id)
        return
    if text == "/courier":
        user = get_user(tg_id)
        if user and user.get("role") == "courier":
            await send_courier_panel(update, context, tg_id)
        return

    if text == "⬅️ Orqaga" and tg_id in ADMIN_IDS and step.startswith("admin_select_user_for_"):
        await send_admin_panel(update, context, tg_id)
        return

    # ── Order flow steps ───────────────────────────────────────────────────
    if step == "ask_name":
        if len(text.split()) < 2:
            await update.message.reply_text(
                "❌ Iltimos, <b>ism va familiyani</b> to'liq kiriting.\n"
                "📌 Masalan: <i>Alisher Haitmirzayev</i>" if lang == "uz" else
                ("❌ Пожалуйста, введите <b>имя и фамилию</b> полностью.\n"
                 "📌 Например: <i>Алишер Хаитмирзаев</i>" if lang == "ru" else
                 "❌ Please enter <b>first and last name</b> in full.\n"
                 "📌 Example: <i>Alisher Haitmirzayev</i>"),
                parse_mode="HTML"
            )
            return
        set_state(context, patient_name=text, step="ask_age")
        await update.message.reply_text(t("ask_age", lang), parse_mode="HTML")

    elif step == "ask_age":
        if not text.isdigit() or not (1 <= int(text) <= 120):
            await update.message.reply_text(t("invalid_age", lang), parse_mode="HTML")
            return
        set_state(context, patient_age=int(text), step="ask_gender")
        kb = InlineKeyboardMarkup([[
            InlineKeyboardButton(t("male", lang),   callback_data="gender_male"),
            InlineKeyboardButton(t("female", lang), callback_data="gender_female"),
        ]])
        await update.message.reply_text(t("ask_gender", lang), reply_markup=kb, parse_mode="HTML")

    elif step == "ask_other_complaint":
        set_state(context, other_complaint=text, step="ask_delivery")
        await ask_delivery_time(update.message, context, lang)

    elif step == "ask_feedback_comment":
        s = get_state(context)
        conn = get_db()
        conn.execute(
            "INSERT INTO feedback (user_tg_id, rating, problem_type, comment) VALUES (?,?,?,?)",
            (tg_id, s.get("feedback_rating", 0), s.get("feedback_type", ""), text)
        )
        conn.commit()
        conn.close()
        for admin_id in ADMIN_IDS:
            try:
                stars = "⭐" * s.get("feedback_rating", 0)
                await context.bot.send_message(
                    admin_id,
                    f"⭐️ <b>Yangi fikr!</b>\n\n"
                    f"👤 TG ID: <code>{tg_id}</code>\n"
                    f"⭐ Reyting: {stars} ({s.get('feedback_rating')}/5)\n"
                    f"🔖 Muammo: {s.get('feedback_type')}\n"
                    f"💬 Izoh: {text}",
                    parse_mode="HTML"
                )
            except Exception:
                pass
        await update.message.reply_text(t("feedback_sent", lang), parse_mode="HTML")
        reset_order_state(context)
        await send_main_menu(update, context, lang)

    # FIX: Broadcast text — now supports HTML formatting (bold, italic, underline, code)
    elif step == "admin_broadcast_text":
        await update.message.reply_text(t("broadcast_sent", "uz"), parse_mode="HTML")
        await broadcast_to_all(context, text)
        await send_admin_panel(update, context, tg_id)

    elif step == "admin_set_price":
        if text.isdigit():
            set_setting("service_price", text)
            await update.message.reply_text(
                f"✅ Yangi narx: <b>{int(text):,} so'm</b>", parse_mode="HTML"
            )
        else:
            await update.message.reply_text("❌ Faqat raqam kiriting.")
        await send_admin_panel(update, context, tg_id)

    elif step == "admin_set_extra":
        if text.isdigit():
            set_setting("pickup_extra", text)
            await update.message.reply_text(
                f"✅ Pickup qo'shimcha: <b>{int(text):,} so'm</b>", parse_mode="HTML"
            )
        else:
            await update.message.reply_text("❌ Faqat raqam kiriting.")
        await send_admin_panel(update, context, tg_id)

    elif step == "admin_set_card":
        set_setting("payment_card", text)
        await update.message.reply_text(f"✅ Karta: <code>{text}</code>", parse_mode="HTML")
        await send_admin_panel(update, context, tg_id)

    elif step == "admin_set_owner":
        set_setting("payment_owner", text)
        await update.message.reply_text(f"✅ Karta egasi: <b>{text}</b>", parse_mode="HTML")
        await send_admin_panel(update, context, tg_id)

    elif step == "admin_set_channel":
        set_setting("channel_id", text)
        await update.message.reply_text(f"✅ Kanal: <b>{text}</b>", parse_mode="HTML")
        await send_admin_panel(update, context, tg_id)

    elif step == "admin_set_allowed_regions":
        ids = [r.strip() for r in text.split(",") if r.strip().isdigit()]
        if ids:
            set_setting("allowed_region_ids", ",".join(ids))
            names = [region_name(i, "uz") for i in ids]
            await update.message.reply_text(
                f"✅ Faol tumanlar yangilandi:\n\n" + "\n".join(f"• {n}" for n in names),
                parse_mode="HTML"
            )
        else:
            await update.message.reply_text(
                "❌ Noto'g'ri format. Raqamlarni vergul bilan kiriting: 1,4,13"
            )
        await send_admin_panel(update, context, tg_id)

    elif step == "admin_add_user_id":
        if text.isdigit():
            role = state.get("pending_role", "courier")
            uid = int(text)
            create_user(uid)
            if role == "courier":
                set_state(context, step="admin_set_courier_region", pending_courier_id=uid)
                await send_region_selection_for_courier(update, context, tg_id, uid)
            else:
                update_user(uid, role=role)
                await update.message.reply_text(
                    f"✅ Foydalanuvchi <code>{uid}</code> → <b>{role}</b>", parse_mode="HTML"
                )
                await send_admin_panel(update, context, tg_id)
        else:
            await update.message.reply_text("❌ Telegram ID raqam bo'lishi kerak.")

    elif step == "doctor_waiting_order_id":
        order_id = text
        order = get_order(order_id)
        if not order:
            await update.message.reply_text("❌ Bunday buyurtma topilmadi. ID ni tekshiring.")
            return
        set_state(context, step="doctor_sending_result", doctor_order_id=order_id)
        await update.message.reply_text(
            f"📸 <b>{order['patient_name']}</b> uchun natija rasmini yuboring:",
            parse_mode="HTML"
        )

# ─── MENU HANDLERS ────────────────────────────────────────────────────────────
async def handle_results(update: Update, context: ContextTypes.DEFAULT_TYPE, tg_id: int, lang: str):
    orders = get_user_orders(tg_id)
    results = [o for o in orders if o.get("result_file_id")]
    if not results:
        await update.effective_message.reply_text(t("no_results", lang), parse_mode="HTML")
        return
    for o in results[:5]:
        await context.bot.send_photo(
            tg_id, o["result_file_id"],
            caption=f"📊 <b>{o['order_id']}</b> — {o['service']}\n📅 {o['created_at'][:10]}",
            parse_mode="HTML"
        )

async def handle_order_status(update: Update, context: ContextTypes.DEFAULT_TYPE, tg_id: int, lang: str):
    orders = get_user_orders(tg_id)
    if not orders:
        await update.effective_message.reply_text(t("no_orders", lang), parse_mode="HTML")
        return
    STATUS_LABELS = {
        "pending_payment": {"uz": "💳 To'lov kutilmoqda",     "ru": "💳 Ожидает оплаты",   "en": "💳 Awaiting payment"},
        "pending_admin":   {"uz": "🔍 Admin tekshirmoqda",    "ru": "🔍 Проверяется",       "en": "🔍 Under review"},
        "approved":        {"uz": "✅ Tasdiqlandi",            "ru": "✅ Подтверждён",        "en": "✅ Approved"},
        "courier_assigned":{"uz": "🚚 Kuryer yo'lda",         "ru": "🚚 Курьер едет",        "en": "🚚 Courier on the way"},
        "completed":       {"uz": "🎉 Bajarildi",             "ru": "🎉 Завершён",           "en": "🎉 Completed"},
        "rejected":        {"uz": "❌ Rad etildi",            "ru": "❌ Отклонён",           "en": "❌ Rejected"},
    }
    sep = "━━━━━━━━━━━━━━━━━━"
    lines = []
    for o in orders[:5]:
        status_label = STATUS_LABELS.get(o["status"], {}).get(lang, o["status"])
        lines.append(
            f"{sep}\n"
            f"🔖 <code>{o['order_id']}</code>\n"
            f"🩺 {o['service']}\n"
            f"{status_label}\n"
            f"📅 {o['created_at'][:10]}"
        )
    await update.effective_message.reply_text("\n".join(lines), parse_mode="HTML")

async def handle_profile(update: Update, context: ContextTypes.DEFAULT_TYPE, tg_id: int, lang: str):
    """FIX: Use the new interactive profile_text() function."""
    user = get_user(tg_id)
    if not user:
        return
    orders = get_user_orders(tg_id)
    text = profile_text(user, orders, lang)

    # Profile inline buttons: quick access to order & results
    kb = InlineKeyboardMarkup([
        [
            InlineKeyboardButton(t("btn_order", lang),   callback_data="menu_order"),
            InlineKeyboardButton(t("btn_results", lang), callback_data="menu_results"),
        ],
        [InlineKeyboardButton(t("btn_order_status", lang), callback_data="menu_status")],
    ])
    await update.effective_message.reply_text(text, reply_markup=kb, parse_mode="HTML")

async def handle_feedback_start(update: Update, context: ContextTypes.DEFAULT_TYPE, tg_id: int, lang: str):
    set_state(context, step="ask_feedback_rating")
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("⭐" * i, callback_data=f"rating_{i}")] for i in range(1, 6)
    ])
    await update.effective_message.reply_text(t("feedback_rating", lang), reply_markup=kb, parse_mode="HTML")

# ─── STAFF NOTIFICATIONS ──────────────────────────────────────────────────────
async def notify_staff_new_order(context: ContextTypes.DEFAULT_TYPE, order_id: str, user_tg_id: int, lang: str):
    order = get_order(order_id)
    text = (
        f"🆕 <b>Yangi buyurtma!</b>\n\n"
        f"🔖 ID: <code>{order_id}</code>\n"
        f"👤 Bemor: <b>{order['patient_name']}</b>, {order['patient_age']} yosh\n"
        f"🧪 Xizmat: {order['service']}\n"
        f"📍 Hudud: {region_name(order['region_id'], 'uz')}\n"
        f"📦 Yetkazish: {order['delivery_slot']}\n"
        f"🚚 Pickup: {order['pickup_slot']}"
    )
    for d in get_users_by_role("doctor"):
        try:
            await context.bot.send_message(d["tg_id"], text, parse_mode="HTML")
        except Exception:
            pass
    courier = find_nearest_courier(order.get("region_id", ""))
    if courier:
        update_order(order_id, assigned_courier_id=courier["tg_id"], status="courier_assigned")
        try:
            await context.bot.send_message(
                courier["tg_id"], text + "\n\n🚗 <b>Sizga tayinlandi!</b>", parse_mode="HTML"
            )
        except Exception:
            pass
    else:
        update_order(order_id, status="approved")

# ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
async def send_admin_panel(update: Update, context: ContextTypes.DEFAULT_TYPE, tg_id: int):
    set_state(context, step="admin_panel")
    kb = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("⚙️ Sozlamalar",     callback_data="admin_settings"),
            InlineKeyboardButton("👥 Xodimlar",       callback_data="admin_users"),
        ],
        [
            InlineKeyboardButton("📊 Statistika",     callback_data="admin_stats"),
            InlineKeyboardButton("📣 Xabar yuborish", callback_data="admin_ad"),
        ],
        [
            InlineKeyboardButton("📦 Buyurtmalar",    callback_data="admin_orders"),
            InlineKeyboardButton("📍 Faol tumanlar",  callback_data="admin_districts"),
        ],
    ])
    await context.bot.send_message(
        tg_id, "🛠 <b>Admin boshqaruv paneli</b>", reply_markup=kb, parse_mode="HTML"
    )

async def show_telegram_user_selector(update: Update, context: ContextTypes.DEFAULT_TYPE, admin_id: int, role: str):
    request_users = KeyboardButtonRequestUsers(
        request_id=1,
        user_is_bot=False,
        max_quantity=1,
        request_name=True
    )
    kb = ReplyKeyboardMarkup(
        [
            [KeyboardButton("👤 Telegramdagi userlardan tanlash", request_users=request_users)],
            [KeyboardButton("⬅️ Orqaga")],
        ],
        one_time_keyboard=True,
        resize_keyboard=True
    )
    set_state(context, step=f"admin_select_user_for_{role}", pending_role=role)
    await context.bot.send_message(
        admin_id,
        f"👤 <b>{role.capitalize()}</b> uchun Telegram-dan user tanlang:",
        reply_markup=kb,
        parse_mode="HTML"
    )

async def send_region_selection_for_courier(update: Update, context: ContextTypes.DEFAULT_TYPE, admin_id: int, courier_tg_id: int):
    rows = []
    for i in range(0, len(REGIONS), 2):
        row = []
        for r in REGIONS[i:i+2]:
            row.append(InlineKeyboardButton(
                r["name_uz"],
                callback_data=f"admin_region_courier_{courier_tg_id}_{r['id']}"
            ))
        rows.append(row)
    kb = InlineKeyboardMarkup(rows)
    await context.bot.send_message(
        admin_id,
        f"📍 Kuryer <code>{courier_tg_id}</code> uchun tuman tanlang:",
        reply_markup=kb,
        parse_mode="HTML"
    )

async def handle_admin_callback(
    update: Update, context: ContextTypes.DEFAULT_TYPE,
    query, data: str, lang: str
):
    tg_id = query.from_user.id
    if tg_id not in ADMIN_IDS:
        return

    if data == "admin_settings":
        sub_status = "✅ Yoqilgan" if get_setting("mandatory_sub") == "1" else "❌ O'chirilgan"
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton(f"📢 Majburiy obuna: {sub_status}", callback_data="admin_toggle_sub")],
            [InlineKeyboardButton("📣 Kanal ID",          callback_data="admin_change_channel")],
            [InlineKeyboardButton("💰 Xizmat narxi",      callback_data="admin_set_price")],
            [InlineKeyboardButton("🚚 Pickup qo'shimcha", callback_data="admin_set_extra")],
            [InlineKeyboardButton("💳 Karta raqami",      callback_data="admin_set_card")],
            [InlineKeyboardButton("👤 Karta egasi",       callback_data="admin_set_owner")],
            [InlineKeyboardButton("📋 Ko'rsatma fayl",    callback_data="admin_set_instruction")],
            [InlineKeyboardButton("⬅️ Orqaga",            callback_data="admin_back")],
        ])
        await query.message.reply_text(
            f"⚙️ <b>Joriy sozlamalar:</b>\n\n"
            f"💰 Narx: <b>{int(get_setting('service_price') or 0):,} so'm</b>\n"
            f"🚚 Pickup extra: <b>{int(get_setting('pickup_extra') or 0):,} so'm</b>\n"
            f"💳 Karta: <code>{get_setting('payment_card')}</code>\n"
            f"👤 Egasi: <b>{get_setting('payment_owner')}</b>",
            reply_markup=kb, parse_mode="HTML"
        )

    elif data == "admin_districts":
        allowed = get_allowed_region_ids()
        names = [f"✅ {region_name(i, 'uz')} (ID: {i})" for i in allowed]
        all_list = "\n".join(f"  {r['id']}  — {r['name_uz']}" for r in REGIONS)
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton("✏️ O'zgartirish", callback_data="admin_edit_districts")],
            [InlineKeyboardButton("⬅️ Orqaga",       callback_data="admin_back")],
        ])
        await query.message.reply_text(
            f"📍 <b>Faol tumanlar:</b>\n" + "\n".join(names) +
            f"\n\n<b>Barcha tumanlar:</b>\n<code>{all_list}</code>",
            reply_markup=kb, parse_mode="HTML"
        )

    elif data == "admin_edit_districts":
        set_state(context, step="admin_set_allowed_regions")
        await query.message.reply_text(
            "📍 Faol tuman ID larini <b>vergul bilan</b> yozing:\n\n"
            "Masalan: <code>1,4,13,15</code>\n\n"
            "(Faqat yuqoridagi ro'yxatdagi ID lar ishlaydi)",
            parse_mode="HTML"
        )

    elif data == "admin_toggle_sub":
        current = get_setting("mandatory_sub")
        new_val = "0" if current == "1" else "1"
        set_setting("mandatory_sub", new_val)
        status = "yoqildi ✅" if new_val == "1" else "o'chirildi ❌"
        await query.answer(f"Majburiy obuna {status}", show_alert=True)
        await handle_admin_callback(update, context, query, "admin_settings", lang)

    elif data == "admin_change_channel":
        set_state(context, step="admin_set_channel")
        await query.message.reply_text(
            "📣 Yangi kanal ID ni yozing:\n📌 Masalan: <code>@kanal_nomi</code>",
            parse_mode="HTML"
        )

    elif data == "admin_set_price":
        set_state(context, step="admin_set_price")
        await query.message.reply_text(
            "💰 Yangi xizmat narxini <b>so'mda</b> kiriting:", parse_mode="HTML"
        )

    elif data == "admin_set_extra":
        set_state(context, step="admin_set_extra")
        await query.message.reply_text("🚚 Pickup uchun qo'shimcha to'lovni kiriting:")

    elif data == "admin_set_card":
        set_state(context, step="admin_set_card")
        await query.message.reply_text("💳 Yangi karta raqamini kiriting:")

    elif data == "admin_set_owner":
        set_state(context, step="admin_set_owner")
        await query.message.reply_text("👤 Karta egasining to'liq ismini kiriting:")

    elif data == "admin_set_instruction":
        await query.message.reply_text("📋 Ko'rsatma faylni yuboring (rasm, video yoki hujjat):")
        set_state(context, step="admin_waiting_instruction")

    elif data == "admin_users":
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton("➕ Admin qo'shish",    callback_data="admin_add_admin")],
            [InlineKeyboardButton("➕ Kuryer qo'shish",   callback_data="admin_add_courier")],
            [InlineKeyboardButton("➕ Shifokor qo'shish", callback_data="admin_add_doctor")],
            [InlineKeyboardButton("📋 Kuryer ro'yxati",   callback_data="admin_list_couriers")],
            [InlineKeyboardButton("📋 Shifokor ro'yxati", callback_data="admin_list_doctors")],
            [InlineKeyboardButton("⬅️ Orqaga",            callback_data="admin_back")],
        ])
        await query.message.reply_text(
            "👥 <b>Xodimlar boshqaruvi:</b>", reply_markup=kb, parse_mode="HTML"
        )

    elif data in ("admin_add_admin", "admin_add_courier", "admin_add_doctor"):
        role_map = {
            "admin_add_admin":   "admin",
            "admin_add_courier": "courier",
            "admin_add_doctor":  "doctor"
        }
        role = role_map[data]
        await show_telegram_user_selector(update, context, tg_id, role)

    elif data == "admin_list_couriers":
        couriers = get_users_by_role("courier")
        if not couriers:
            await query.message.reply_text("📭 Kuryerlar ro'yxati bo'sh.")
        else:
            lines = [f"🚗 <code>{c['tg_id']}</code> — {region_name(c.get('region_id', ''), 'uz')}" for c in couriers]
            await query.message.reply_text("<b>Kuryerlar:</b>\n" + "\n".join(lines), parse_mode="HTML")

    elif data == "admin_list_doctors":
        doctors = get_users_by_role("doctor")
        if not doctors:
            await query.message.reply_text("📭 Shifokorlar ro'yxati bo'sh.")
        else:
            lines = [f"👨‍⚕️ <code>{d['tg_id']}</code>" for d in doctors]
            await query.message.reply_text("<b>Shifokorlar:</b>\n" + "\n".join(lines), parse_mode="HTML")

    elif data == "admin_stats":
        conn = get_db()
        total_users   = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        total_orders  = conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
        completed     = conn.execute("SELECT COUNT(*) FROM orders WHERE status='completed'").fetchone()[0]
        pending_pay   = conn.execute("SELECT COUNT(*) FROM orders WHERE status='pending_payment'").fetchone()[0]
        pending_admin = conn.execute("SELECT COUNT(*) FROM orders WHERE status='pending_admin'").fetchone()[0]
        total_revenue = conn.execute(
            "SELECT SUM(price+extra_price) FROM orders WHERE status='completed'"
        ).fetchone()[0] or 0
        today = date.today().isoformat()
        today_orders  = conn.execute(
            "SELECT COUNT(*) FROM orders WHERE created_at LIKE ?", (f"{today}%",)
        ).fetchone()[0]
        conn.close()
        await query.message.reply_text(
            f"📊 <b>Statistika</b>\n\n"
            f"👥 Jami foydalanuvchilar: <b>{total_users}</b>\n"
            f"📦 Jami buyurtmalar: <b>{total_orders}</b>\n"
            f"✅ Bajarilgan: <b>{completed}</b>\n"
            f"💳 To'lov kutilmoqda: <b>{pending_pay}</b>\n"
            f"🔍 Admin tekshiruvi: <b>{pending_admin}</b>\n"
            f"📅 Bugungi buyurtmalar: <b>{today_orders}</b>\n"
            f"💰 Jami daromad: <b>{int(total_revenue):,} so'm</b>",
            parse_mode="HTML"
        )

    elif data == "admin_orders":
        conn = get_db()
        orders = conn.execute(
            "SELECT * FROM orders WHERE status IN ('pending_admin','approved') "
            "ORDER BY created_at DESC LIMIT 10"
        ).fetchall()
        conn.close()
        if not orders:
            await query.message.reply_text("📭 Aktiv buyurtmalar yo'q.")
            return
        for o in orders:
            o = dict(o)
            text = (
                f"📋 <code>{o['order_id']}</code>\n"
                f"👤 {o['patient_name']}, {o['patient_age']} yosh\n"
                f"🩺 {o['service']}\n"
                f"📍 {region_name(o['region_id'], 'uz')}\n"
                f"💰 {(o['price']+o['extra_price']):,} so'm\n"
                f"🔖 Status: {o['status']}"
            )
            kb = None
            if o["status"] == "pending_admin":
                kb = InlineKeyboardMarkup([[
                    InlineKeyboardButton("✅ Tasdiqlash", callback_data=f"admin_approve_{o['order_id']}"),
                    InlineKeyboardButton("❌ Rad etish",  callback_data=f"admin_reject_{o['order_id']}"),
                ]])
            await query.message.reply_text(text, reply_markup=kb, parse_mode="HTML")

    elif data.startswith("admin_approve_"):
        order_id = data[len("admin_approve_"):]
        update_order(order_id, status="approved")
        order = get_order(order_id)
        if order:
            await notify_staff_new_order(context, order_id, order["user_tg_id"], "uz")
            user_lang = (get_user(order["user_tg_id"]) or {}).get("lang", "uz")
            msg = {
                "uz": f"✅ Buyurtmangiz (<code>{order_id}</code>) tasdiqlandi!\n🚚 Kuryer yo'lda.",
                "ru": f"✅ Ваш заказ (<code>{order_id}</code>) подтверждён!\n🚚 Курьер едет.",
                "en": f"✅ Your order (<code>{order_id}</code>) is approved!\n🚚 Courier is on the way.",
            }
            await context.bot.send_message(
                order["user_tg_id"], msg.get(user_lang, msg["uz"]), parse_mode="HTML"
            )
        await query.answer("✅ Tasdiqlandi")

    elif data.startswith("admin_reject_"):
        order_id = data[len("admin_reject_"):]
        update_order(order_id, status="rejected")
        order = get_order(order_id)
        if order:
            user_lang = (get_user(order["user_tg_id"]) or {}).get("lang", "uz")
            msg = {
                "uz": f"❌ Buyurtmangiz (<code>{order_id}</code>) rad etildi.\nQo'shimcha ma'lumot uchun adminga murojaat qiling.",
                "ru": f"❌ Ваш заказ (<code>{order_id}</code>) отклонён.\nОбратитесь к администратору.",
                "en": f"❌ Your order (<code>{order_id}</code>) was rejected.\nContact admin for support.",
            }
            await context.bot.send_message(
                order["user_tg_id"], msg.get(user_lang, msg["uz"]), parse_mode="HTML"
            )
        await query.answer("❌ Rad etildi")

    elif data == "admin_ad":
        # FIX: Now shows format selection (text vs photo) instead of going straight to text input
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton(t("broadcast_btn_text",  "uz"), callback_data="admin_broadcast_text")],
            [InlineKeyboardButton(t("broadcast_btn_photo", "uz"), callback_data="admin_broadcast_photo")],
            [InlineKeyboardButton("⬅️ Orqaga", callback_data="admin_back")],
        ])
        await query.message.reply_text(
            t("broadcast_ask_format", "uz"), reply_markup=kb, parse_mode="HTML"
        )

    elif data == "admin_back":
        await send_admin_panel(update, context, tg_id)

    elif data.startswith("admin_region_courier_"):
        parts = data.split("_")
        region_id  = parts[-1]
        courier_id = int(parts[-2])
        update_user(courier_id, region_id=region_id, role="courier")
        await query.message.reply_text(
            f"✅ Kuryer <code>{courier_id}</code> → <b>{region_name(region_id, 'uz')}</b>",
            parse_mode="HTML"
        )
        await send_admin_panel(update, context, tg_id)

# ─── DOCTOR PANEL ─────────────────────────────────────────────────────────────
async def send_doctor_panel(update: Update, context: ContextTypes.DEFAULT_TYPE, tg_id: int):
    set_state(context, step="doctor_panel")
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("📋 Tayinlangan buyurtmalar", callback_data="doctor_orders")],
        [InlineKeyboardButton("📤 Natija yuborish",         callback_data="doctor_send_result")],
    ])
    await context.bot.send_message(tg_id, "👨‍⚕️ <b>Shifokor paneli</b>", reply_markup=kb, parse_mode="HTML")

async def handle_staff_callback(
    update: Update, context: ContextTypes.DEFAULT_TYPE,
    query, data: str, lang: str
):
    tg_id = query.from_user.id
    user = get_user(tg_id)
    if not user:
        return

    if data == "doctor_orders":
        conn = get_db()
        orders = conn.execute(
            "SELECT * FROM orders WHERE status='approved' ORDER BY created_at DESC LIMIT 10"
        ).fetchall()
        conn.close()
        if not orders:
            await query.message.reply_text("📭 Tayinlangan buyurtmalar yo'q.")
            return
        for o in orders:
            o = dict(o)
            await query.message.reply_text(
                f"📋 <code>{o['order_id']}</code>\n"
                f"👤 {o['patient_name']}, {o['patient_age']} yosh\n"
                f"🩺 {o['service']}\n"
                f"📅 {o['created_at'][:10]}",
                parse_mode="HTML"
            )

    elif data == "doctor_send_result":
        await query.message.reply_text(
            "📝 Buyurtma ID ni kiriting:\n📌 Masalan: <code>#A3F9</code>",
            parse_mode="HTML"
        )
        set_state(context, step="doctor_waiting_order_id")

    elif data.startswith("courier_order_"):
        order_id = data[len("courier_order_"):]
        order = get_order(order_id)
        if order:
            await query.message.reply_text(
                f"📦 <b>{order_id}</b>\n"
                f"👤 {order['patient_name']}\n"
                f"📍 {region_name(order['region_id'], 'uz')}\n"
                f"📦 Yetkazish: {order['delivery_slot']}\n"
                f"🚚 Pickup: {order['pickup_slot']}",
                parse_mode="HTML"
            )

# ─── COURIER PANEL ────────────────────────────────────────────────────────────
async def send_courier_panel(update: Update, context: ContextTypes.DEFAULT_TYPE, tg_id: int):
    user = get_user(tg_id)
    region_id = user.get("region_id", "")
    set_state(context, step="courier_panel")
    conn = get_db()
    orders = conn.execute(
        "SELECT * FROM orders WHERE assigned_courier_id=? AND status IN ('courier_assigned','approved') LIMIT 10",
        (tg_id,)
    ).fetchall()
    conn.close()
    if not orders:
        await context.bot.send_message(
            tg_id,
            f"📭 Sizga hozircha buyurtma tayinlanmagan.\n"
            f"📍 Siz xizmat ko'rsatayotgan tuman: <b>{region_name(region_id, 'uz')}</b>",
            parse_mode="HTML"
        )
        return
    for o in orders:
        o = dict(o)
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton("✅ Bajarildi", callback_data=f"courier_done_{o['order_id']}")]
        ])
        await context.bot.send_message(
            tg_id,
            f"📦 <code>{o['order_id']}</code>\n"
            f"👤 {o['patient_name']}\n"
            f"📍 {region_name(o['region_id'], 'uz')}\n"
            f"📦 Yetkazish: {o['delivery_slot']}\n"
            f"🚚 Pickup: {o['pickup_slot']}",
            reply_markup=kb,
            parse_mode="HTML"
        )

# ─── BROADCAST ────────────────────────────────────────────────────────────────
async def broadcast_to_all(context: ContextTypes.DEFAULT_TYPE, text: str):
    """
    FIX: Broadcast text message with HTML parse_mode (supports bold, italic, etc.)
    Rate-limited to 25 users/second to avoid Telegram flood limits.
    """
    users = get_all_users()
    async def _send():
        for i, u in enumerate(users):
            try:
                await context.bot.send_message(u["tg_id"], text, parse_mode=ParseMode.HTML)
            except Exception:
                pass
            if (i + 1) % 25 == 0:
                await asyncio.sleep(1)
    asyncio.create_task(_send())

async def broadcast_photo_to_all(context: ContextTypes.DEFAULT_TYPE, file_id: str, caption: str = ""):
    """
    FIX: New function — broadcast a photo (with optional HTML caption) to all users.
    """
    users = get_all_users()
    async def _send():
        for i, u in enumerate(users):
            try:
                await context.bot.send_photo(
                    u["tg_id"], file_id,
                    caption=caption if caption else None,
                    parse_mode=ParseMode.HTML if caption else None
                )
            except Exception:
                pass
            if (i + 1) % 25 == 0:
                await asyncio.sleep(1)
    asyncio.create_task(_send())

async def backup_db(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    
    # 1. Admin ekanligini tekshirish
    if user_id not in ADMIN_IDS:
        await update.message.reply_text("Sizda bu komandadan foydalanish huquqi yo'q!")
        return


    if os.path.exists(DB_PATH):
        try:
            # 3. Faylni yuborish
            with open(DB_PATH, 'rb') as file:
                await update.message.reply_document(
                    document=file,
                    filename="MedBot_database_backup.sql", # Foydalanuvchiga ko'rinadigan nom
                    caption="Siz so'ragan ma'lumotlar bazasi nusxasi."
                )
        except Exception as e:
            await update.message.reply_text(f"Xatolik yuz berdi: {e}")
    else:
        await update.message.reply_text("Ma'lumotlar bazasi fayli topilmadi!")

# Handlerlarni qo'shish qismi:

# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    print("🚀 MedBot ishga tushmoqda...")
    init_db()
    print("✅ Ma'lumotlar bazasi tayyor.")

    app = Application.builder().token(BOT_TOKEN).build()

    # Commands
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("menu",  cmd_start))
    app.add_handler(CommandHandler("admin",   lambda u, c: handle_text(u, c)))
    app.add_handler(CommandHandler("doctor",  lambda u, c: handle_text(u, c)))
    app.add_handler(CommandHandler("courier", lambda u, c: handle_text(u, c)))
    app.add_handler(CommandHandler("backup_db", backup_db))

    # Callback queries
    app.add_handler(CallbackQueryHandler(callback_router))

    # Message handlers (order matters — specific before generic)
    app.add_handler(MessageHandler(filters.LOCATION, handle_location))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.add_handler(MessageHandler(filters.Document.ALL | filters.VIDEO, handle_doc_or_video))
    app.add_handler(MessageHandler(filters.StatusUpdate.USERS_SHARED, handle_user_shared))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    print("🔄 Polling boshlandi...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()