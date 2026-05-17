"""
MedBot — Medical Analysis Telegram Bot (WebApp Version)
Library: python-telegram-bot v20+ (async)
Install: pip install python-telegram-bot

CHANGES FROM ORIGINAL:
- "Buyurtma berish" button now opens Telegram Web App instead of inline flow
- Bot receives order data from WebApp via web_app_data handler
- Payment message has 2 inline buttons: "Admin orqali" and "Click orqali"
- "Admin orqali" -> shows card details, waits for screenshot
- "Click orqali" -> shows payment URL with "Tekshirish" button (simulated)
- All other sections (results, profile, feedback, admin panel, etc.) remain unchanged
"""

import json
import math
import os
import random
import sqlite3
import string
import asyncio
from datetime import date, datetime

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
    WebAppInfo,
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
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
if not BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN environment variable is not set.")

CHANNEL_ID = "-1003969388677"
ADMIN_IDS = [6194484795, 8161075408]

# Automatically derive the Web App URL from the Replit domain env var,
# falling back to the WEBAPP_URL env var, then a hardcoded default.
_replit_domain = os.environ.get("REPLIT_DEV_DOMAIN") or os.environ.get("REPLIT_DOMAINS", "").split(",")[0].strip()
WEBAPP_URL = os.environ.get("WEBAPP_URL") or (f"https://{_replit_domain}/" if _replit_domain else "https://lab-test-order--asroraliqulov.replit.app/")

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
    "channel_name": {"uz": "📣 Rasmiy kanal", "ru": "📣 Официальный канал", "en": "📣 Official channel"},
    "check_sub":    {"uz": "✅ Tekshirish",    "ru": "✅ Проверить",          "en": "✅ Check"},
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

    "service_kal": {"uz": "🦠 Kal tahlili", "ru": "🦠 Анализ кала", "en": "🦠 Stool analysis"},
    "who_is_patient": {"uz": "👥 Tahlil kim uchun?", "ru": "👥 Для кого анализ?", "en": "👥 Who is the patient?"},
    "adult":  {"uz": "🧑 Kattalar uchun", "ru": "🧑 Взрослый", "en": "🧑 Adult"},
    "child":  {"uz": "👶 Bola uchun",     "ru": "👶 Ребёнок",   "en": "👶 Child"},

    "ask_full_name": {
        "uz": "✏️ <b>Bemor ismini kiriting</b>\n\n📌 Masalan: <i>Alisher Haitmirzayev</i>",
        "ru": "✏️ <b>Введите ФИО пациента</b>\n\n📌 Например: <i>Алишер Хаитмирзаев</i>",
        "en": "✏️ <b>Enter patient's full name</b>\n\n📌 Example: <i>Alisher Haitmirzayev</i>",
    },
    "ask_age":    {"uz": "🎂 Bemorning yoshini kiriting <b>(raqamda)</b>:", "ru": "🎂 Введите возраст пациента <b>(цифрой)</b>:", "en": "🎂 Enter patient's age <b>(number)</b>:"},
    "ask_gender": {"uz": "⚧ Bemorning jinsini tanlang:", "ru": "⚧ Укажите пол пациента:", "en": "⚧ Select patient's gender:"},
    "male":   {"uz": "👨 Erkak", "ru": "👨 Мужской", "en": "👨 Male"},
    "female": {"uz": "👩 Ayol",  "ru": "👩 Женский",  "en": "👩 Female"},

    "child_timing": {
        "uz": "🕐 Bola odatda qachon hojatga boradi?\n\n(Bu konteyner yetkazish vaqtini belgilaydi)",
        "ru": "🕐 Когда обычно ребёнок ходит в туалет?\n\n(Это определяет время доставки контейнера)",
        "en": "🕐 When does the child usually use the toilet?\n\n(This helps us schedule container delivery)",
    },
    "morning":   {"uz": "🌅 Ertalab  (06:00 – 09:00)", "ru": "🌅 Утром (06:00 – 09:00)",  "en": "🌅 Morning (06:00 – 09:00)"},
    "afternoon": {"uz": "☀️ Kunduzi (09:00 – 15:00)",  "ru": "☀️ Днём (09:00 – 15:00)",   "en": "☀️ Afternoon (09:00 – 15:00)"},
    "evening":   {"uz": "🌙 Kechqurun (15:00 – 21:00)", "ru": "🌙 Вечером (15:00 – 21:00)", "en": "🌙 Evening (15:00 – 21:00)"},
    "irregular": {"uz": "❓ Aniq vaqt yo'q",            "ru": "❓ Нерегулярно",             "en": "❓ Irregular / no fixed time"},

    "uses_diaper":        {"uz": "🧷 Bola taglik ishlatadimi?", "ru": "🧷 Ребёнок использует подгузник?", "en": "🧷 Does the child use a diaper?"},
    "yes":                {"uz": "✅ Ha",   "ru": "✅ Да",  "en": "✅ Yes"},
    "no":                 {"uz": "❌ Yo'q", "ru": "❌ Нет", "en": "❌ No"},

    "diaper_instruction": {
        "uz": "📋 <b>Taglik bilan namuna olish bo'yicha ko'rsatma</b>\n\nQuyidagi faylni diqqat bilan o'qing va bajarib, keyin davom eting.",
        "ru": "📋 <b>Инструкция по сбору образца с подгузником</b>\n\nВнимательно ознакомьтесь с файлом ниже, затем продолжите.",
        "en": "📋 <b>Diaper sample collection instructions</b>\n\nPlease read the file below carefully, then continue.",
    },

    "complaints_title": {
        "uz": "🩺 <b>Sizni nima bezovta qilmoqda?</b>\n\nKeraklilarini belgilang (bir yoki bir nechtasini tanlang).\nBoshqa shikoyat bo'lsa ✍️ tugmani bosing.\nTayyor bo'lgach <b>▶️ Davom etish</b> ni bosing.",
        "ru": "🩺 <b>Что вас беспокоит?</b>\n\nОтметьте нужные (можно несколько).\nЕсли есть другая жалоба — нажмите ✍️.\nКогда готово — нажмите <b>▶️ Продолжить</b>.",
        "en": "🩺 <b>What's bothering you?</b>\n\nSelect all that apply (one or more).\nIf you have another complaint — tap ✍️.\nWhen done — tap <b>▶️ Continue</b>.",
    },

    "complaint_constipation": {"uz": "Ich qotishi",      "ru": "Запор",               "en": "Constipation"},
    "complaint_diarrhea":     {"uz": "Ich ketishi",      "ru": "Диарея",              "en": "Diarrhea"},
    "complaint_bloating":     {"uz": "Qorin dam bo'lish","ru": "Вздутие живота",      "en": "Bloating"},
    "complaint_stomach_pain": {"uz": "Qorin og'rig'i",   "ru": "Боль в животе",       "en": "Stomach pain"},
    "complaint_nausea":       {"uz": "Ko'ngil aynishi",  "ru": "Тошнота",             "en": "Nausea"},
    "complaint_low_appetite": {"uz": "Ishtaha pasayishi","ru": "Снижение аппетита",   "en": "Low appetite"},
    "complaint_weight_loss":  {"uz": "Vazn yo'qotish",   "ru": "Снижение веса",       "en": "Weight loss"},
    "complaint_blood":        {"uz": "Axlatda qon",      "ru": "Кровь в стуле",       "en": "Blood in stool"},
    "complaint_parasite":     {"uz": "Parazit gumohi",   "ru": "Подозрение на паразит","en": "Parasite suspicion"},
    "complaint_allergy":      {"uz": "Allergiya",        "ru": "Аллергия",            "en": "Allergy"},
    "other_complaint":        {"uz": "✍️ Boshqa yozish", "ru": "✍️ Написать другое",  "en": "✍️ Write other"},
    "continue_btn":           {"uz": "▶️ Davom etish",   "ru": "▶️ Продолжить",       "en": "▶️ Continue"},

    "ask_other_complaint": {
        "uz": "✍️ Boshqa shikoyatingizni yozing:",
        "ru": "✍️ Напишите вашу другую жалобу:",
        "en": "✍️ Write your other complaint:",
    },

    "delivery_time_adult": {
        "uz": "📦 <b>Konteyner yetkazish vaqtini tanlang</b>\n\nBugun kechqurun kuryer konteyner olib keladi.\nErtaga erta axlat namunasini to'playsiz.",
        "ru": "📦 <b>Выберите время доставки контейнера</b>\n\nСегодня вечером курьер привезёт контейнер.\nЗавтра утром соберёте образец.",
        "en": "📦 <b>Select container delivery time</b>\n\nToday evening a courier will bring the container.\nTomorrow morning you collect the sample.",
    },

    "pickup_title": {
        "uz": "🚚 <b>Namuna tayyor bo'lganda pickup vaqtini tanlang</b>\n\n⚠️ Alohida chiqish uchun qo'shimcha to'lov: <b>{extra} so'm</b>",
        "ru": "🚚 <b>Выберите время забора образца</b>\n\n⚠️ Доплата за отдельный выезд: <b>{extra} сум</b>",
        "en": "🚚 <b>Select pickup time for your sample</b>\n\n⚠️ Extra charge for separate pickup: <b>{extra} sum</b>",
    },

    "container_predelivered": {
        "uz": "📦 <b>Konteyner oldindan yetkaziladi</b>\n\nVaqt aniq bo'lmagani uchun kuryer avval konteyner olib keladi.\nNamuna tayyor bo'lgach, pickup chaqirishingiz mumkin.",
        "ru": "📦 <b>Контейнер будет доставлен заранее</b>\n\nТак как время нефиксированное, курьер сначала привезёт контейнер.\nКогда образец будет готов — вызовите курьера.",
        "en": "📦 <b>Container will be delivered in advance</b>\n\nSince the timing is irregular, the courier will first bring the container.\nWhen your sample is ready, call for pickup.",
    },
    "call_pickup": {"uz": "🚚 Pickup chaqirish", "ru": "🚚 Вызвать курьера", "en": "🚚 Call for pickup"},

    "ask_location": {
        "uz": "📍 <b>Joylashuvingizni yuboring</b>\n\nKuryer sizning manzilingizga keladi.\nPastdagi tugmani bosib, joylashuvni yuboring 👇",
        "ru": "📍 <b>Отправьте ваше местоположение</b>\n\nКурьер приедет по вашему адресу.\nНажмите кнопку ниже, чтобы отправить геолокацию 👇",
        "en": "📍 <b>Send your location</b>\n\nThe courier will come to your address.\nTap the button below to share your location 👇",
    },
    "send_location_btn": {"uz": "📍 Joylashuvni yuborish", "ru": "📍 Отправить геолокацию", "en": "📍 Send my location"},
    "location_outside_uz": {
        "uz": "🌏 Kechirasiz, xizmatimiz hozircha faqat\n<b>O'zbekiston</b> hududida mavjud.",
        "ru": "🌏 Извините, наш сервис пока доступен\nтолько на территории <b>Узбекистана</b>.",
        "en": "🌏 Sorry, our service is currently available\nonly within <b>Uzbekistan</b>.",
    },
    "region_not_served":    {"uz": "⚠️ Sizning tumaningiz: <b>{district}</b> ❌", "ru": "⚠️ Ваш район: <b>{district}</b> ❌", "en": "⚠️ Your district: <b>{district}</b> ❌"},
    "select_allowed_region": {"uz": "Quyidagi ruxsat etilgan tumanlardan birini tanlang:", "ru": "Выберите один из разрешённых районов:", "en": "Please choose one of the allowed districts:"},
    "change_region_btn":    {"uz": "🔄 Tumanni almashtirish", "ru": "🔄 Сменить район", "en": "🔄 Change district"},
    "service_unavailable_info": {
        "uz": "⚠️ Afsuski, xizmatimiz hozircha sizning hududingizda mavjud emas.\n",
        "ru": "⚠️ К сожалению, наш сервис пока недоступен в вашем районе.\n",
        "en": "⚠️ Unfortunately, our service is not available in your area yet.\n",
    },

    "order_summary_title": {
        "uz": "📋 <b>Buyurtma xulosasi</b>\n\nQuyidagi ma'lumotlarni tekshiring:",
        "ru": "📋 <b>Сводка заказа</b>\n\nПроверьте указанные данные:",
        "en": "📋 <b>Order summary</b>\n\nPlease verify the details below:",
    },
    "confirm_btn": {"uz": "✅ Tasdiqlash", "ru": "✅ Подтвердить", "en": "✅ Confirm"},
    "cancel_btn":  {"uz": "❌ Bekor qilish", "ru": "❌ Отменить", "en": "❌ Cancel"},
    "order_cancelled": {
        "uz": "🚫 Buyurtma bekor qilindi. Istalgan vaqt yangi buyurtma bera olasiz.",
        "ru": "🚫 Заказ отменён. Вы можете сделать новый заказ в любое время.",
        "en": "🚫 Order cancelled. You can place a new order any time.",
    },

    # ── NEW: Payment method selection ─────────────────────────────────────────
    "payment_method_title": {
        "uz": (
            "💳 <b>To'lov usulini tanlang</b>\n\n"
            "🔖 Buyurtma: <code>{order_id}</code>\n"
            "💰 Jami summa: <b>{amount} so'm</b>\n\n"
            "Quyidagi usullardan birini tanlang:"
        ),
        "ru": (
            "💳 <b>Выберите способ оплаты</b>\n\n"
            "🔖 Заказ: <code>{order_id}</code>\n"
            "💰 Сумма: <b>{amount} сум</b>\n\n"
            "Выберите один из вариантов:"
        ),
        "en": (
            "💳 <b>Choose payment method</b>\n\n"
            "🔖 Order: <code>{order_id}</code>\n"
            "💰 Amount: <b>{amount} sum</b>\n\n"
            "Select one of the options below:"
        ),
    },
    "pay_via_admin":  {"uz": "🏦 Admin orqali",  "ru": "🏦 Через администратора", "en": "🏦 Via admin"},
    "pay_via_click":  {"uz": "💳 Click orqali",  "ru": "💳 Через Click",           "en": "💳 Via Click"},

    # ── Admin card payment ─────────────────────────────────────────────────────
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

    # ── Click payment ──────────────────────────────────────────────────────────
    "click_payment_title": {
        "uz": (
            "💳 <b>Click orqali to'lov</b>\n\n"
            "🔖 Buyurtma: <code>{order_id}</code>\n"
            "💰 Summa: <b>{amount} so'm</b>\n\n"
            "Quyidagi havoladan to'lov qiling, so'ng «✅ Tekshirish» tugmasini bosing:"
        ),
        "ru": (
            "💳 <b>Оплата через Click</b>\n\n"
            "🔖 Заказ: <code>{order_id}</code>\n"
            "💰 Сумма: <b>{amount} сум</b>\n\n"
            "Оплатите по ссылке ниже, затем нажмите «✅ Проверить»:"
        ),
        "en": (
            "💳 <b>Payment via Click</b>\n\n"
            "🔖 Order: <code>{order_id}</code>\n"
            "💰 Amount: <b>{amount} sum</b>\n\n"
            "Pay via the link below, then tap «✅ Check»:"
        ),
    },
    "click_pay_btn":   {"uz": "💳 Click orqali to'lash", "ru": "💳 Оплатить через Click", "en": "💳 Pay via Click"},
    "click_check_btn": {"uz": "✅ Tekshirish",            "ru": "✅ Проверить",             "en": "✅ Check"},
    "click_pending": {
        "uz": "⏳ To'lov hali tasdiqlanmagan. Iltimos, to'lov qiling va qayta tekshiring.",
        "ru": "⏳ Оплата ещё не подтверждена. Пожалуйста, оплатите и попробуйте снова.",
        "en": "⏳ Payment not yet confirmed. Please pay and try again.",
    },
    "click_confirmed": {
        "uz": "✅ To'lov tasdiqlandi! Buyurtmangiz qabul qilindi. Kuryer siz bilan bog'lanadi.",
        "ru": "✅ Оплата подтверждена! Заказ принят. Курьер свяжется с вами.",
        "en": "✅ Payment confirmed! Order accepted. A courier will contact you.",
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
    "feedback_type": {"uz": "📝 <b>Muammo turini tanlang:</b>", "ru": "📝 <b>Выберите тип проблемы:</b>", "en": "📝 <b>Select the type of issue:</b>"},
    "feedback_courier":   {"uz": "🚚 Kuryer kechikdi",         "ru": "🚚 Курьер опоздал",        "en": "🚚 Courier was late"},
    "feedback_container": {"uz": "📦 Konteyner muammosi",      "ru": "📦 Проблема с контейнером", "en": "📦 Container issue"},
    "feedback_staff":     {"uz": "💬 Xodim muomilasi",         "ru": "💬 Поведение сотрудника",   "en": "💬 Staff conduct"},
    "feedback_result":    {"uz": "📄 Natija kechikdi",         "ru": "📄 Результат задержан",      "en": "📄 Result delayed"},
    "feedback_payment":   {"uz": "💳 To'lov muammosi",         "ru": "💳 Проблема с оплатой",      "en": "💳 Payment issue"},
    "feedback_other":     {"uz": "🗒 Boshqa muammo",           "ru": "🗒 Другое",                  "en": "🗒 Other"},
    "feedback_comment":   {"uz": "✍️ Izohingizni yozing (batafsil):", "ru": "✍️ Напишите ваш комментарий (подробно):", "en": "✍️ Write your comment (in detail):"},
    "feedback_sent": {
        "uz": "💚 Fikringiz uchun katta rahmat!\nSiz uchun yanada yaxshi bo'lamiz 🙏",
        "ru": "💚 Большое спасибо за ваш отзыв!\nМы будем ещё лучше для вас 🙏",
        "en": "💚 Thank you so much for your feedback!\nWe'll keep improving for you 🙏",
    },

    "profile_title": {"uz": "👤 <b>Sizning profilingiz</b>", "ru": "👤 <b>Ваш профиль</b>", "en": "👤 <b>Your profile</b>"},
    "contact_info":  {"uz": "📞 <b>Bizga murojaat qiling:</b>", "ru": "📞 <b>Свяжитесь с нами:</b>", "en": "📞 <b>Get in touch with us:</b>"},
    "invalid_age":   {"uz": "❌ Iltimos, to'g'ri yosh kiriting (1 — 120 oralig'ida).", "ru": "❌ Пожалуйста, введите корректный возраст (от 1 до 120).", "en": "❌ Please enter a valid age (between 1 and 120)."},
    "free_order":    {"uz": "🎁 <b>Tabriklaymiz!</b>\nBu sizning 5-buyurtmangiz — <b>BEPUL!</b> 🥳", "ru": "🎁 <b>Поздравляем!</b>\nЭто ваш 5-й заказ — <b>БЕСПЛАТНО!</b> 🥳", "en": "🎁 <b>Congratulations!</b>\nThis is your 5th order — <b>FREE!</b> 🥳"},
    "back_btn":      {"uz": "⬅️ Orqaga", "ru": "⬅️ Назад", "en": "⬅️ Back"},
    "admin_contact": {"uz": "@admin_username", "ru": "@admin_username", "en": "@admin_username"},

    "broadcast_ask_format": {
        "uz": "📣 <b>Xabar turini tanlang:</b>",
        "ru": "📣 <b>Выберите тип рассылки:</b>",
        "en": "📣 <b>Select broadcast type:</b>",
    },
    "broadcast_btn_text":  {"uz": "✍️ Matn yuborish", "ru": "✍️ Текст", "en": "✍️ Text"},
    "broadcast_btn_photo": {"uz": "🖼 Rasm yuborish",  "ru": "🖼 Фото",  "en": "🖼 Photo"},
    "broadcast_ask_text":  {"uz": "✍️ Barcha foydalanuvchilarga yuboriladigan <b>matn</b>ni yozing:", "ru": "✍️ Напишите <b>текст</b> для рассылки:", "en": "✍️ Write the <b>text</b> to broadcast:"},
    "broadcast_ask_photo": {"uz": "🖼 Rasmni caption bilan yuboring.", "ru": "🖼 Отправьте фото с подписью.", "en": "🖼 Send the photo with caption."},
    "broadcast_sent":      {"uz": "✅ Xabar barcha foydalanuvchilarga yuborilmoqda...", "ru": "✅ Сообщение рассылается...", "en": "✅ Broadcasting to all users..."},

    # WebApp-specific
    "webapp_order_btn": {
        "uz": "🧪 Tahlil buyurtma berish",
        "ru": "🧪 Заказать анализ",
        "en": "🧪 Order analysis",
    },
    "webapp_opened": {
        "uz": "📱 Buyurtma berish ilovasini oching 👇",
        "ru": "📱 Откройте приложение для заказа 👇",
        "en": "📱 Open the ordering app below 👇",
    },
    "order_received_from_webapp": {
        "uz": "✅ <b>Buyurtmangiz qabul qilindi!</b>\n\n🔖 Buyurtma ID: <code>{order_id}</code>\n\nTo'lov turini tanlang:",
        "ru": "✅ <b>Ваш заказ принят!</b>\n\n🔖 Заказ ID: <code>{order_id}</code>\n\nВыберите способ оплаты:",
        "en": "✅ <b>Your order has been received!</b>\n\n🔖 Order ID: <code>{order_id}</code>\n\nChoose payment method:",
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
        payment_method TEXT DEFAULT 'pending',
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
        "payment_card":      "8600 1234 5678 9012",
        "payment_owner":     "N-MedHomeLab Admin",
        "instruction_file_id": "",
        "admin_contact":     "@admin_username",
        "allowed_region_ids": "4,11,13,15",
        "click_payment_url": "https://my.click.uz/services/pay?service_id=12345&merchant_id=54321",
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

async def is_subscribed(bot, tg_id):
    return True

# ─── KEYBOARD BUILDERS ────────────────────────────────────────────────────────
def make_main_menu(lang) -> InlineKeyboardMarkup:
    """Main menu — order button opens the WebApp with user's language."""
    webapp_url = f"{WEBAPP_URL}?lang={lang}"
    return InlineKeyboardMarkup([
        [InlineKeyboardButton(
            t("webapp_order_btn", lang),
            web_app=WebAppInfo(url=webapp_url)
        )],
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

def payment_method_keyboard(lang, order_id) -> InlineKeyboardMarkup:
    """Two payment options: admin card or Click."""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton(t("pay_via_admin", lang), callback_data=f"pay_admin_{order_id}")],
        [InlineKeyboardButton(t("pay_via_click", lang), callback_data=f"pay_click_{order_id}")],
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

# ─── ORDER SUMMARY ────────────────────────────────────────────────────────────
def order_summary_text(order_data, lang):
    complaints = order_data.get("complaints", [])
    if isinstance(complaints, str):
        try:
            complaints = json.loads(complaints)
        except Exception:
            complaints = []

    labels = []
    for c in complaints:
        translated_label = t(c, lang)
        labels.append(translated_label if translated_label != c else c)
    other = order_data.get("other_complaint", "") or order_data.get("customComplaint", "")
    if other:
        labels.append(other)
    shikoyat_final = ", ".join(labels) if labels else "—"

    is_free = order_data.get("is_free", 0)
    price_val = order_data.get("price", 0) or 0
    extra_val = order_data.get("extra_price", 0) or 0
    if price_val == 0:
        try:
            cfg_price = int(get_setting("service_price") or 0)
        except Exception:
            cfg_price = 0
        price_val = cfg_price
    total = price_val + extra_val
    price_display = "🎁 BEPUL" if is_free else f"{total:,} so'm"

    ptype = order_data.get("patient_type", "")
    patient_type_label = t(ptype, lang) if ptype in T else ptype or "—"

    region_id = order_data.get("region_id") or order_data.get("districtId", "")
    district_name = region_name(region_id, lang) if region_id else "—"

    sep = "━━━━━━━━━━━━━━━━━━━━"
    fields = {
        "uz": [
            sep,
            f"👤 Ism:          {order_data.get('patient_name', '')}",
            f"🎂 Yosh:         {order_data.get('patient_age', '')}",
            f"⚧  Jins:         {order_data.get('patient_gender', '')}",
            f"👶 Bemor turi:   {patient_type_label}",
            f"🧪 Xizmat:       {order_data.get('service', order_data.get('serviceId', ''))}",
            f"📦 Yetkazish:    {order_data.get('delivery_slot', order_data.get('deliverySlot', '—'))}",
            f"🚚 Pickup:       {order_data.get('pickup_slot', order_data.get('pickupSlot', '—')) or '—'}",
            f"📍 Tuman:        {district_name}",
            f"🩺 Shikoyat:     {shikoyat_final}",
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
            f"🧪 Услуга:       {order_data.get('service', order_data.get('serviceId', ''))}",
            f"📦 Доставка:     {order_data.get('delivery_slot', order_data.get('deliverySlot', '—'))}",
            f"🚚 Забор:        {order_data.get('pickup_slot', order_data.get('pickupSlot', '—')) or '—'}",
            f"📍 Район:        {district_name}",
            f"🩺 Жалобы:       {shikoyat_final}",
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
            f"🧪 Service:      {order_data.get('service', order_data.get('serviceId', ''))}",
            f"📦 Delivery:     {order_data.get('delivery_slot', order_data.get('deliverySlot', '—'))}",
            f"🚚 Pickup:       {order_data.get('pickup_slot', order_data.get('pickupSlot', '—')) or '—'}",
            f"📍 District:     {district_name}",
            f"🩺 Complaints:   {shikoyat_final}",
            sep,
            f"💰 Price:        {price_display}",
            sep,
        ],
    }
    return t("order_summary_title", lang) + "\n\n<code>" + "\n".join(fields.get(lang, fields["uz"])) + "</code>"

def profile_text(user: dict, orders: list, lang: str) -> str:
    count = len(orders)
    cycle_pos = count % 6
    next_free = 6 - cycle_pos if cycle_pos != 0 else 6
    bar = "🟦" * cycle_pos + "⬜" * (6 - cycle_pos)
    completed = sum(1 for o in orders if o.get("status") == "completed")
    bonus = user.get("bonus_points", 0)
    body = {
        "uz": (
            f"<b>👤 SHAXSIY PROFIL</b>\n\n"
            f"🆔 ID: <code>{user.get('patient_id', '—')}</code>\n"
            f"📅 Sana: {user.get('created_at', '')[:10]}\n"
            f"⭐️ Bonuslar: {bonus} ball\n\n"
            f"<b>Buyurtmalar holati:</b>\n"
            f"└ Jami: {count} ta\n"
            f"└ Yakunlangan: {completed} ta\n\n"
            f"<b>Aksiya: Har 6-chi buyurtma bepul!</b>\n"
            f"{bar}\n"
            f"💡 Yana <b>{next_free} ta</b> buyurtmadan keyin keyingisi bepul."
        ),
        "ru": (
            f"<b>👤 ЛИЧНЫЙ ПРОФИЛЬ</b>\n\n"
            f"🆔 ID: <code>{user.get('patient_id', '—')}</code>\n"
            f"📅 Дата: {user.get('created_at', '')[:10]}\n"
            f"⭐️ Бонусы: {bonus} баллов\n\n"
            f"<b>Статистика заказов:</b>\n"
            f"└ Всего: {count}\n"
            f"└ Завершено: {completed}\n\n"
            f"<b>Акция: Каждый 6-й заказ бесплатно!</b>\n"
            f"{bar}\n"
            f"💡 До бесплатного заказа осталось: <b>{next_free}</b>"
        ),
        "en": (
            f"<b>👤 PERSONAL PROFILE</b>\n\n"
            f"🆔 ID: <code>{user.get('patient_id', '—')}</code>\n"
            f"📅 Date: {user.get('created_at', '')[:10]}\n"
            f"⭐️ Bonus: {bonus} pts\n\n"
            f"<b>Order stats:</b>\n"
            f"└ Total: {count}\n"
            f"└ Completed: {completed}\n\n"
            f"<b>Promo: Every 6th order is FREE!</b>\n"
            f"{bar}\n"
            f"💡 <b>{next_free}</b> more orders until your free one."
        ),
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
        "🌐 <b>Tilni tanlang</b>\n🌐 <b>Выберите язык</b>\n🌐 <b>Choose language</b>",
        reply_markup=kb, parse_mode="HTML"
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

# ─── WEB APP DATA HANDLER ─────────────────────────────────────────────────────
async def handle_web_app_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Receives order data submitted from the Telegram Web App."""
    tg_id = update.effective_user.id
    lang = lang_of_ctx(context, tg_id)

    if not update.message or not update.message.web_app_data:
        return

    raw = update.message.web_app_data.data
    try:
        order_data = json.loads(raw)
    except Exception:
        await update.message.reply_text("❌ Noto'g'ri ma'lumot keldi. Qaytadan urinib ko'ring.")
        return

    order_id = order_data.get("orderId") or order_data.get("order_id")
    price = order_data.get("price", 0)
    extra = order_data.get("extraPrice", order_data.get("extra_price", 0))
    total = (price or 0) + (extra or 0)

    if not order_id:
        # Fallback: create order locally if webapp didn't create it
        user = get_user(tg_id) or {}
        create_user(tg_id, lang)
        current_count = user.get("order_count", 0) + 1
        is_free = 1 if current_count % 6 == 0 else 0
        price = 0 if is_free else int(get_setting("service_price") or 150000)
        extra = int(get_setting("pickup_extra") or 30000) if order_data.get("pickupSlot") else 0
        total = price + extra

        local_data = {
            "user_tg_id":    tg_id,
            "patient_name":  order_data.get("patientName", ""),
            "patient_age":   order_data.get("patientAge", 0),
            "patient_gender":order_data.get("patientGender", ""),
            "patient_type":  order_data.get("patientType", "adult"),
            "service":       order_data.get("serviceId", "kal_tahlili"),
            "complaints":    order_data.get("complaints", []),
            "delivery_slot": order_data.get("deliverySlot", ""),
            "pickup_slot":   order_data.get("pickupSlot", ""),
            "latitude":      order_data.get("latitude"),
            "longitude":     order_data.get("longitude"),
            "region_id":     order_data.get("districtId", ""),
            "price":         price,
            "extra_price":   extra,
            "is_free":       is_free,
        }
        order_id = create_order(local_data)

    if not order_id:
        await update.message.reply_text("❌ Buyurtma yaratishda xatolik. Qaytadan urinib ko'ring.")
        return

    # Store for payment tracking
    set_state(context, step="waiting_payment", current_order_id=order_id, lang=lang)

    # Send payment method selection
    await update.message.reply_text(
        t("order_received_from_webapp", lang, order_id=order_id),
        reply_markup=payment_method_keyboard(lang, order_id),
        parse_mode="HTML"
    )

# ─── CALLBACK ROUTER ──────────────────────────────────────────────────────────
async def callback_router(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    tg_id = query.from_user.id
    data = query.data

    # Language selection
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

    # Subscription check
    if data == "check_sub":
        await query.answer()
        if await is_subscribed(context.bot, tg_id):
            await query.edit_message_reply_markup(reply_markup=None)
            await send_main_menu(update, context, lang)
        else:
            await query.answer(t("not_subscribed", lang), show_alert=True)
        return

    # Main menu buttons
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
        await query.message.reply_text(f"{t('contact_info', lang)}\n\n{contact}", parse_mode="HTML")
        return

    # ── Payment method selection ───────────────────────────────────────────
    if data.startswith("pay_admin_"):
        order_id = data[len("pay_admin_"):]
        await query.answer()
        order = get_order(order_id)
        if not order:
            await query.message.reply_text("❌ Buyurtma topilmadi.")
            return
        update_order(order_id, payment_method="admin_card")
        card  = get_setting("payment_card")  or "8600 0000 0000 0000"
        owner = get_setting("payment_owner") or "Admin"
        total = (order.get("price", 0) or 0) + (order.get("extra_price", 0) or 0)
        set_state(context, step="waiting_receipt", current_order_id=order_id)
        await query.message.reply_text(
            t("payment_instruction", lang, card=card, owner=owner, amount=f"{total:,}"),
            parse_mode="HTML"
        )
        return

    if data.startswith("pay_click_"):
        order_id = data[len("pay_click_"):]
        await query.answer()
        order = get_order(order_id)
        if not order:
            await query.message.reply_text("❌ Buyurtma topilmadi.")
            return
        update_order(order_id, payment_method="click")
        click_url = get_setting("click_payment_url") or "https://my.click.uz"
        total = (order.get("price", 0) or 0) + (order.get("extra_price", 0) or 0)
        # Add order ID to URL as parameter
        if "?" in click_url:
            full_url = f"{click_url}&order_id={order_id}&amount={total}"
        else:
            full_url = f"{click_url}?order_id={order_id}&amount={total}"

        set_state(context, step="click_payment", current_order_id=order_id, click_payment_attempts=0)
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton(t("click_pay_btn", lang), url=full_url)],
            [InlineKeyboardButton(t("click_check_btn", lang), callback_data=f"click_check_{order_id}")],
        ])
        await query.message.reply_text(
            t("click_payment_title", lang, order_id=order_id, amount=f"{total:,}"),
            reply_markup=kb, parse_mode="HTML"
        )
        return

    if data.startswith("click_check_"):
        order_id = data[len("click_check_"):]
        await query.answer()
        state = get_state(context)
        attempts = state.get("click_payment_attempts", 0) + 1
        set_state(context, click_payment_attempts=attempts)

        # Simulation: 1st tap → still pending; 2nd+ tap → confirmed
        # In production: check Click API for real payment status
        if attempts < 2:
            await query.answer(t("click_pending", lang), show_alert=True)
        else:
            update_order(order_id, status="approved", payment_method="click")
            order = get_order(order_id)
            if order:
                await notify_staff_new_order(context, order_id, tg_id, lang)
            await query.message.reply_text(t("click_confirmed", lang), parse_mode="HTML")
            reset_order_state(context)
            await send_main_menu(update, context, lang)
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

    # ── Broadcast ──────────────────────────────────────────────────────────
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

# ─── PHOTO HANDLER ────────────────────────────────────────────────────────────
async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    tg_id = update.effective_user.id
    state = get_state(context)
    lang = lang_of_ctx(context, tg_id)

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
                    f"💰 Summa: <b>{((order['price'] or 0) + (order['extra_price'] or 0)):,} so'm</b>"
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

    if state.get("step") == "doctor_sending_result":
        order_id = state.get("doctor_order_id")
        if order_id:
            order = get_order(order_id)
            if order:
                file_id = update.message.photo[-1].file_id
                update_order(order_id, result_file_id=file_id, status="completed")
                result_caption = f"📊 <b>Natijangiz tayyor!</b>\n🔖 Buyurtma: <code>{order_id}</code>"
                await context.bot.send_photo(
                    order["user_tg_id"], file_id,
                    caption=result_caption,
                    parse_mode="HTML"
                )
                RESULT_NOTIFY_ID = 6194484795
                if order["user_tg_id"] != RESULT_NOTIFY_ID:
                    try:
                        await context.bot.send_photo(
                            RESULT_NOTIFY_ID, file_id,
                            caption=f"🔔 <b>Natija yuborildi</b>\n{result_caption}\n👤 Bemor ID: <code>{order['user_tg_id']}</code>",
                            parse_mode="HTML"
                        )
                    except Exception:
                        pass
                await update.message.reply_text("✅ Natija muvaffaqiyatli yuborildi.")
        set_state(context, step="doctor_panel")
        return

    if state.get("step") == "admin_broadcast_photo" and tg_id in ADMIN_IDS:
        file_id = update.message.photo[-1].file_id
        caption = update.message.caption or ""
        await update.message.reply_text(t("broadcast_sent", "uz"), parse_mode="HTML")
        await broadcast_photo_to_all(context, file_id, caption)
        await send_admin_panel(update, context, tg_id)
        return

async def handle_doc_or_video(update: Update, context: ContextTypes.DEFAULT_TYPE):
    tg_id = update.effective_user.id
    state = get_state(context)
    if state.get("step") == "admin_waiting_instruction" and tg_id in ADMIN_IDS:
        doc = update.message.document or update.message.video
        if doc:
            set_setting("instruction_file_id", doc.file_id)
            await update.message.reply_text("✅ Ko'rsatma fayl saqlandi.")
            await send_admin_panel(update, context, tg_id)

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
        await update.message.reply_text("❌ Avval «Xodim qo'shish» tugmasini bosing!")
        return

    role = step.replace("admin_select_user_for_", "")
    user = get_user(selected_user_id)
    if not user:
        create_user(selected_user_id)
        user = get_user(selected_user_id)

    current_role = user.get("role") if user else None
    if current_role == role:
        await update.message.reply_text(f"✅ Bu foydalanuvchi allaqachon <b>{role}</b>!", parse_mode="HTML")
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

    if step == "ask_feedback_comment":
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

    elif step == "admin_broadcast_text":
        await update.message.reply_text(t("broadcast_sent", "uz"), parse_mode="HTML")
        await broadcast_to_all(context, text)
        await send_admin_panel(update, context, tg_id)

    elif step == "admin_set_price":
        if text.isdigit():
            set_setting("service_price", text)
            await update.message.reply_text(f"✅ Yangi narx: <b>{int(text):,} so'm</b>", parse_mode="HTML")
        else:
            await update.message.reply_text("❌ Faqat raqam kiriting.")
        await send_admin_panel(update, context, tg_id)

    elif step == "admin_set_extra":
        if text.isdigit():
            set_setting("pickup_extra", text)
            await update.message.reply_text(f"✅ Pickup qo'shimcha: <b>{int(text):,} so'm</b>", parse_mode="HTML")
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

    elif step == "admin_set_click_url":
        set_setting("click_payment_url", text)
        await update.message.reply_text(f"✅ Click URL: <code>{text}</code>", parse_mode="HTML")
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
            await update.message.reply_text("❌ Noto'g'ri format. Raqamlarni vergul bilan kiriting: 1,4,13")
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
                await update.message.reply_text(f"✅ Foydalanuvchi <code>{uid}</code> → <b>{role}</b>", parse_mode="HTML")
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
        "pending_payment": {"uz": "💳 To'lov kutilmoqda",   "ru": "💳 Ожидает оплаты",   "en": "💳 Awaiting payment"},
        "pending_admin":   {"uz": "🔍 Admin tekshirmoqda",  "ru": "🔍 Проверяется",       "en": "🔍 Under review"},
        "approved":        {"uz": "✅ Tasdiqlandi",          "ru": "✅ Подтверждён",        "en": "✅ Approved"},
        "courier_assigned":{"uz": "🚚 Kuryer yo'lda",       "ru": "🚚 Курьер едет",        "en": "🚚 Courier on the way"},
        "completed":       {"uz": "🎉 Bajarildi",           "ru": "🎉 Завершён",           "en": "🎉 Completed"},
        "rejected":        {"uz": "❌ Rad etildi",          "ru": "❌ Отклонён",           "en": "❌ Rejected"},
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
    user = get_user(tg_id)
    if not user:
        return
    orders = get_user_orders(tg_id)
    text = profile_text(user, orders, lang)
    kb = InlineKeyboardMarkup([
        [
            InlineKeyboardButton(t("btn_results", lang),      callback_data="menu_results"),
            InlineKeyboardButton(t("btn_order_status", lang), callback_data="menu_status"),
        ],
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
    if not order:
        return
    district = region_name(order.get("region_id", ""), "uz")
    text = (
        f"🆕 <b>Yangi buyurtma!</b>\n\n"
        f"🔖 ID: <code>{order_id}</code>\n"
        f"👤 Bemor: <b>{order['patient_name']}</b>, {order['patient_age']} yosh\n"
        f"🧪 Xizmat: {order['service']}\n"
        f"📍 Hudud: {district}\n"
        f"📦 Yetkazish: {order['delivery_slot']}\n"
        f"🚚 Pickup: {order.get('pickup_slot', '—')}"
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
    lang = lang_of_ctx(context, tg_id)
    webapp_url = f"{WEBAPP_URL}admin?tg_id={tg_id}&lang={lang}"
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("🛠 Admin panelni ochish", web_app=WebAppInfo(url=webapp_url))],
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
    request_users = KeyboardButtonRequestUsers(request_id=1, user_is_bot=False, max_quantity=1, request_name=True)
    kb = ReplyKeyboardMarkup(
        [
            [KeyboardButton("👤 Telegramdagi userlardan tanlash", request_users=request_users)],
            [KeyboardButton("⬅️ Orqaga")],
        ],
        one_time_keyboard=True, resize_keyboard=True
    )
    set_state(context, step=f"admin_select_user_for_{role}", pending_role=role)
    await context.bot.send_message(
        admin_id, f"👤 <b>{role.capitalize()}</b> uchun Telegram-dan user tanlang:",
        reply_markup=kb, parse_mode="HTML"
    )

async def send_region_selection_for_courier(update: Update, context: ContextTypes.DEFAULT_TYPE, admin_id: int, courier_tg_id: int):
    rows = []
    for i in range(0, len(REGIONS), 2):
        row = []
        for r in REGIONS[i:i+2]:
            row.append(InlineKeyboardButton(r["name_uz"], callback_data=f"admin_region_courier_{courier_tg_id}_{r['id']}"))
        rows.append(row)
    kb = InlineKeyboardMarkup(rows)
    await context.bot.send_message(
        admin_id, f"📍 Kuryer <code>{courier_tg_id}</code> uchun tuman tanlang:",
        reply_markup=kb, parse_mode="HTML"
    )

async def handle_admin_callback(update: Update, context: ContextTypes.DEFAULT_TYPE, query, data: str, lang: str):
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
            [InlineKeyboardButton("🔗 Click URL",         callback_data="admin_set_click_url")],
            [InlineKeyboardButton("📋 Ko'rsatma fayl",    callback_data="admin_set_instruction")],
            [InlineKeyboardButton("⬅️ Orqaga",            callback_data="admin_back")],
        ])
        await query.message.reply_text(
            f"⚙️ <b>Joriy sozlamalar:</b>\n\n"
            f"💰 Narx: <b>{int(get_setting('service_price') or 0):,} so'm</b>\n"
            f"🚚 Pickup extra: <b>{int(get_setting('pickup_extra') or 0):,} so'm</b>\n"
            f"💳 Karta: <code>{get_setting('payment_card')}</code>\n"
            f"👤 Egasi: <b>{get_setting('payment_owner')}</b>\n"
            f"🔗 Click URL: <code>{get_setting('click_payment_url') or '—'}</code>",
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
            "Masalan: <code>4,11,13,15</code>",
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
        await query.message.reply_text("📣 Yangi kanal ID ni yozing:\n📌 Masalan: <code>@kanal_nomi</code>", parse_mode="HTML")

    elif data == "admin_set_price":
        set_state(context, step="admin_set_price")
        await query.message.reply_text("💰 Yangi xizmat narxini <b>so'mda</b> kiriting:", parse_mode="HTML")

    elif data == "admin_set_extra":
        set_state(context, step="admin_set_extra")
        await query.message.reply_text("🚚 Pickup uchun qo'shimcha to'lovni kiriting:")

    elif data == "admin_set_card":
        set_state(context, step="admin_set_card")
        await query.message.reply_text("💳 Yangi karta raqamini kiriting:")

    elif data == "admin_set_owner":
        set_state(context, step="admin_set_owner")
        await query.message.reply_text("👤 Karta egasining to'liq ismini kiriting:")

    elif data == "admin_set_click_url":
        set_state(context, step="admin_set_click_url")
        await query.message.reply_text(
            "🔗 Click to'lov URL ni kiriting:\n📌 Masalan: <code>https://my.click.uz/services/pay?service_id=12345</code>",
            parse_mode="HTML"
        )

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
        await query.message.reply_text("👥 <b>Xodimlar boshqaruvi:</b>", reply_markup=kb, parse_mode="HTML")

    elif data in ("admin_add_admin", "admin_add_courier", "admin_add_doctor"):
        role_map = {"admin_add_admin": "admin", "admin_add_courier": "courier", "admin_add_doctor": "doctor"}
        await show_telegram_user_selector(update, context, tg_id, role_map[data])

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
        total_revenue = conn.execute("SELECT SUM(price+extra_price) FROM orders WHERE status='completed'").fetchone()[0] or 0
        today = date.today().isoformat()
        today_orders  = conn.execute("SELECT COUNT(*) FROM orders WHERE created_at LIKE ?", (f"{today}%",)).fetchone()[0]
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
            "SELECT * FROM orders WHERE status IN ('pending_admin','approved') ORDER BY created_at DESC LIMIT 10"
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
                f"💰 {(o['price'] + o['extra_price']):,} so'm\n"
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
            await context.bot.send_message(order["user_tg_id"], msg.get(user_lang, msg["uz"]), parse_mode="HTML")
        await query.answer("✅ Tasdiqlandi")

    elif data.startswith("admin_reject_"):
        order_id = data[len("admin_reject_"):]
        update_order(order_id, status="rejected")
        order = get_order(order_id)
        if order:
            user_lang = (get_user(order["user_tg_id"]) or {}).get("lang", "uz")
            msg = {
                "uz": f"❌ Buyurtmangiz (<code>{order_id}</code>) rad etildi.",
                "ru": f"❌ Ваш заказ (<code>{order_id}</code>) отклонён.",
                "en": f"❌ Your order (<code>{order_id}</code>) was rejected.",
            }
            await context.bot.send_message(order["user_tg_id"], msg.get(user_lang, msg["uz"]), parse_mode="HTML")
        await query.answer("❌ Rad etildi")

    elif data == "admin_ad":
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton(t("broadcast_btn_text",  "uz"), callback_data="admin_broadcast_text")],
            [InlineKeyboardButton(t("broadcast_btn_photo", "uz"), callback_data="admin_broadcast_photo")],
            [InlineKeyboardButton("⬅️ Orqaga", callback_data="admin_back")],
        ])
        await query.message.reply_text(t("broadcast_ask_format", "uz"), reply_markup=kb, parse_mode="HTML")

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

# ─── DOCTOR / COURIER PANELS ──────────────────────────────────────────────────
async def send_doctor_panel(update: Update, context: ContextTypes.DEFAULT_TYPE, tg_id: int):
    set_state(context, step="doctor_panel")
    lang = lang_of_ctx(context, tg_id)
    webapp_url = f"{WEBAPP_URL}doctor?tg_id={tg_id}&lang={lang}"
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("👨‍⚕️ Shifokor panelini ochish", web_app=WebAppInfo(url=webapp_url))],
        [InlineKeyboardButton("📋 Buyurtmalar (bot)",  callback_data="doctor_orders")],
        [InlineKeyboardButton("📤 Natija yuborish",    callback_data="doctor_send_result")],
    ])
    await context.bot.send_message(tg_id, "👨‍⚕️ <b>Shifokor paneli</b>", reply_markup=kb, parse_mode="HTML")

async def handle_staff_callback(update: Update, context: ContextTypes.DEFAULT_TYPE, query, data: str, lang: str):
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
        await query.message.reply_text("📝 Buyurtma ID ni kiriting:\n📌 Masalan: <code>#A3F9</code>", parse_mode="HTML")
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
                f"🚚 Pickup: {order.get('pickup_slot', '—')}",
                parse_mode="HTML"
            )

async def send_courier_panel(update: Update, context: ContextTypes.DEFAULT_TYPE, tg_id: int):
    user = get_user(tg_id)
    region_id = user.get("region_id", "") if user else ""
    set_state(context, step="courier_panel")
    lang = lang_of_ctx(context, tg_id)
    webapp_url = f"{WEBAPP_URL}courier?tg_id={tg_id}&lang={lang}"
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("🚗 Kuryer panelini ochish", web_app=WebAppInfo(url=webapp_url))],
    ])
    await context.bot.send_message(
        tg_id,
        f"🚗 <b>Kuryer paneli</b>\n"
        f"📍 Tumaningiz: <b>{region_name(region_id, 'uz') if region_id else 'Belgilanmagan'}</b>\n\n"
        f"Barcha tayinlangan buyurtmalarni ko'rish va bajarish uchun panelni oching.",
        reply_markup=kb, parse_mode="HTML"
    )

# ─── BROADCAST ────────────────────────────────────────────────────────────────
async def broadcast_to_all(context: ContextTypes.DEFAULT_TYPE, text: str):
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

# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    print("MedBot ishga tushmoqda...")
    init_db()
    print("Ma'lumotlar bazasi tayyor.")

    app = Application.builder().token(BOT_TOKEN).build()

    # Commands
    app.add_handler(CommandHandler("start",  cmd_start))
    app.add_handler(CommandHandler("menu",   cmd_start))
    app.add_handler(CommandHandler("admin",   lambda u, c: handle_text(u, c)))
    app.add_handler(CommandHandler("doctor",  lambda u, c: handle_text(u, c)))
    app.add_handler(CommandHandler("courier", lambda u, c: handle_text(u, c)))

    # Callback queries
    app.add_handler(CallbackQueryHandler(callback_router))

    # WebApp data — MUST come before generic TEXT handler
    app.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, handle_web_app_data))

    # Message handlers
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.add_handler(MessageHandler(filters.Document.ALL | filters.VIDEO, handle_doc_or_video))
    app.add_handler(MessageHandler(filters.StatusUpdate.USERS_SHARED, handle_user_shared))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    print("Polling boshlandi...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
