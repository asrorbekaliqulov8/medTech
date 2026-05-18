import { motion } from 'framer-motion';

const TELEGRAM_BOT_URL = 'https://t.me/NMedHomeLab_bot';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧪</span>
            <span className="font-bold text-lg text-teal-700">N-MedHomeLab</span>
          </div>
          <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer"
            className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors">
            Buyurtma berish
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-400 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-teal-200 blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 py-16 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              🏠 Uyda tahlil • Tezkor natija
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
              Uy sharoitida<br />
              <span className="text-yellow-300">tibbiy tahlil</span>
            </h1>
            <p className="text-teal-50 text-lg max-w-lg mx-auto mb-8 leading-relaxed">
              Kuryer uyingizga keladi, namuna oladi. Natija PDF ko'rinishda Telegram orqali yuboriladi.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-white text-teal-700 font-bold text-base px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0">
                <span className="text-xl">✈️</span>
                Telegramda ochish
              </a>
              <a href="#how"
                className="inline-flex items-center justify-center gap-2 border-2 border-white/50 text-white font-semibold text-base px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors">
                Qanday ishlaydi?
              </a>
            </div>
          </motion.div>
        </div>

        {/* Wave */}
        <div className="h-12 relative">
          <svg viewBox="0 0 1440 48" className="absolute bottom-0 w-full" fill="white">
            <path d="M0,48 C360,0 1080,0 1440,48 L1440,48 L0,48 Z" />
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { value: '4', label: 'Tuman', sub: 'xizmat ko\'rsatiladi' },
              { value: '24h', label: 'Natija', sub: '24 soat ichida' },
              { value: '150k', label: "So'm", sub: 'xizmat narxi' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i, duration: 0.5 }}>
                <div className="text-2xl font-extrabold text-teal-600">{s.value}</div>
                <div className="font-semibold text-slate-800 text-sm">{s.label}</div>
                <div className="text-xs text-slate-400">{s.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-14 max-w-4xl mx-auto px-4">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">Xizmatlar</span>
          <h2 className="text-3xl font-extrabold mt-1">Nima tahlil qilamiz?</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            { emoji: '🦠', title: 'Kal tahlili', desc: 'Ichaklardagi parazitlar va mikroorganizmlarni aniqlash uchun najot tahlili (koprogramma).' },
            { emoji: '🩸', title: 'Qon tahlili', desc: 'Umumiy qon tekshiruvi — gemoglobin, leykotsitlar, trombositlar va boshqalar. (Tez orada)', coming: true },
            { emoji: '💧', title: 'Siydik tahlili', desc: 'Umumiy siydik tahlili, buyrak va siydik yo\'llari holatini tekshirish. (Tez orada)', coming: true },
            { emoji: '🧫', title: 'Biokimyo', desc: 'Qon biokimyoviy tahlili — glukoza, xolesterin, fermentlar va boshqalar. (Tez orada)', coming: true },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 * i }}
              className={`p-6 rounded-2xl border ${s.coming ? 'bg-slate-50 border-slate-200' : 'bg-teal-50 border-teal-100'} relative`}>
              {s.coming && <span className="absolute top-3 right-3 text-[10px] font-bold bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full uppercase">Tez orada</span>}
              <div className="text-3xl mb-3">{s.emoji}</div>
              <h3 className="font-bold text-lg mb-1.5">{s.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-14 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">Jarayon</span>
            <h2 className="text-3xl font-extrabold mt-1">Qanday ishlaydi?</h2>
          </div>
          <div className="space-y-4 max-w-lg mx-auto">
            {[
              { step: '1', emoji: '📱', title: 'Buyurtma bering', desc: 'Telegram botda xizmatni tanlang, manzil va vaqt kiriting.' },
              { step: '2', emoji: '💳', title: "To'lovni amalga oshiring", desc: "Karta orqali yoki Click to'lov tizimi orqali to'lang." },
              { step: '3', emoji: '🚗', title: 'Kuryer keladi', desc: 'Kuryer belgilangan vaqtda uyingizga kelib, namuna oladi.' },
              { step: '4', emoji: '🧪', title: 'Laboratoriya tekshiruvi', desc: 'Laboratoriyada tahlil qilinadi va natija tayyorlanadi.' },
              { step: '5', emoji: '📄', title: "Natija Telegramda", desc: 'PDF natija to\'g\'ridan-to\'g\'ri Telegram orqali yuboriladi.' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }}
                className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-black flex items-center justify-center text-lg shrink-0">
                  {s.step}
                </div>
                <div>
                  <div className="font-bold flex items-center gap-2">{s.emoji} {s.title}</div>
                  <p className="text-sm text-slate-500 mt-0.5">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Districts */}
      <section className="py-14 max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">Hududlar</span>
          <h2 className="text-3xl font-extrabold mt-1">Qayerlarga boramiz?</h2>
          <p className="text-slate-500 mt-2 text-sm">Hozircha Toshkent viloyatining quyidagi tumanlarida xizmat ko'rsatamiz</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: 'Zangiota tumani', emoji: '🏘️' },
            { name: "Yangiyo'l tumani", emoji: '🏙️' },
            { name: 'Qibray tumani', emoji: '🌿' },
            { name: 'Toshkent tumani', emoji: '🏛️' },
          ].map((d, i) => (
            <div key={i} className="bg-teal-50 border border-teal-100 rounded-2xl p-4 text-center">
              <div className="text-2xl mb-1.5">{d.emoji}</div>
              <div className="font-semibold text-sm text-teal-800">{d.name}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">Boshqa tumanlar tez orada qo'shiladi</p>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-teal-600 to-cyan-500 text-white text-center">
        <div className="max-w-md mx-auto px-4">
          <div className="text-5xl mb-4">🧪</div>
          <h2 className="text-3xl font-extrabold mb-3">Hoziroq buyurtma bering</h2>
          <p className="text-teal-100 mb-8 text-sm leading-relaxed">
            Telegram botga o'ting va bir necha daqiqada buyurtma bering. Kuryer belgilangan vaqtda uyingizga keladi.
          </p>
          <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 bg-white text-teal-700 font-bold text-lg px-10 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 active:translate-y-0">
            <span className="text-2xl">✈️</span>
            Telegram Botni ochish
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-xl">🧪</span>
            <span className="font-bold text-white">N-MedHomeLab</span>
          </div>
          <p className="text-xs leading-relaxed max-w-xs mx-auto">
            Uy sharoitida tibbiy tahlil xizmati. Toshkent viloyati, O'zbekiston.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs">
            <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Telegram Bot</a>
            <span>·</span>
            <a href="/app" className="hover:text-white transition-colors">Buyurtma berish</a>
          </div>
          <p className="text-xs mt-4 text-slate-600">© 2025 N-MedHomeLab. Barcha huquqlar himoyalangan.</p>
        </div>
      </footer>
    </div>
  );
}
