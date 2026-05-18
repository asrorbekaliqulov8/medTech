import { useState, FormEvent } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { setStoredAuth } from '@/lib/auth';

const T = {
  uz: {
    title: 'Xodimlar uchun kirish',
    subtitle: 'Telegram ID ingizni kiriting',
    placeholder: 'Telegram ID (masalan: 123456789)',
    login: 'Kirish',
    logging: 'Tekshirilmoqda...',
    notFound: "Siz xodimlar ro'yxatida yo'qsiz. Admin bilan bog'laning.",
    error: 'Xatolik yuz berdi. Qayta urinib ko\'ring.',
    lang: 'Til',
  },
  ru: {
    title: 'Вход для сотрудников',
    subtitle: 'Введите ваш Telegram ID',
    placeholder: 'Telegram ID (например: 123456789)',
    login: 'Войти',
    logging: 'Проверка...',
    notFound: 'Вас нет в списке сотрудников. Обратитесь к администратору.',
    error: 'Произошла ошибка. Попробуйте снова.',
    lang: 'Язык',
  },
  en: {
    title: 'Staff Login',
    subtitle: 'Enter your Telegram ID',
    placeholder: 'Telegram ID (e.g. 123456789)',
    login: 'Login',
    logging: 'Checking...',
    notFound: 'You are not in the staff list. Contact your admin.',
    error: 'An error occurred. Please try again.',
    lang: 'Language',
  },
};

const ROLE_PATHS: Record<string, string> = {
  admin: '/admin',
  doctor: '/doctor',
  courier: '/courier',
};

const ROLE_LABELS: Record<string, string> = {
  admin: '👑 Admin',
  doctor: '👨‍⚕️ Doctor',
  courier: '🚗 Courier',
};

type Lang = 'uz' | 'ru' | 'en';

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [lang, setLang] = useState<Lang>('uz');
  const [tgId, setTgId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const t = T[lang];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const id = tgId.trim();
    if (!id || isNaN(Number(id))) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/staff/me?tg_id=${id}`);
      if (!res.ok) {
        setError(t.notFound);
        return;
      }
      const data = await res.json();
      if (!data?.role) {
        setError(t.notFound);
        return;
      }
      setStoredAuth({ tgId: Number(id), role: data.role, lang, username: data.username });
      const path = ROLE_PATHS[data.role] ?? '/admin';
      navigate(path);
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-indigo-200">
            🧪
          </div>
          <h1 className="text-2xl font-bold text-slate-800">N-MedHomeLab</h1>
          <p className="text-slate-500 text-sm mt-1">{t.title}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8 space-y-5">
          {/* Language selector */}
          <div className="flex gap-2 justify-center">
            {(['uz', 'ru', 'en'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  lang === l
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-slate-500">{t.subtitle}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg select-none">✈️</div>
              <input
                type="number"
                value={tgId}
                onChange={e => { setTgId(e.target.value); setError(''); }}
                placeholder={t.placeholder}
                className="w-full h-14 pl-10 pr-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-400 focus:outline-none text-sm transition-colors bg-slate-50 focus:bg-white"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-sm text-center bg-red-50 rounded-xl p-3"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading || !tgId.trim()}
              className="w-full h-14 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-semibold text-base shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  {t.logging}
                </span>
              ) : t.login}
            </button>
          </form>
        </div>

        {/* Role hints */}
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          {Object.entries(ROLE_LABELS).map(([role, label]) => (
            <div key={role} className="text-xs bg-white rounded-full px-3 py-1.5 text-slate-500 shadow-sm border border-slate-100">
              {label}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          N-MedHomeLab © {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}
