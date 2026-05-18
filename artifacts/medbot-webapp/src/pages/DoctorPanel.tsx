import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Upload, RefreshCw, X, CheckCircle, FileText } from 'lucide-react';

type Lang = 'uz' | 'ru' | 'en';
const T = {
  uz: {
    title: "Shifokor Paneli", orders: "Buyurtmalar", loading: "Yuklanmoqda...",
    noOrders: "Hozircha buyurtma yo'q", sendResult: "Natija yuborish",
    chooseFile: "Fayl tanlash", upload: "Yuborish", cancel: "Bekor qilish",
    uploading: "Yuborilmoqda...", success: "Natija muvaffaqiyatli yuborildi! ✅",
    patient: "Bemor", age: "yosh", service: "Xizmat", date: "Sana",
    approved: "Tasdiqlangan", courier_done: "Namuna olindi", completed: "Yakunlangan",
    noFile: "Fayl tanlanmagan", resultTitle: "Natija yuborish",
    resultHint: "PDF, JPG yoki PNG faylni tanlang",
    error: "Xatolik yuz berdi", accessDenied: "Ruxsat yo'q",
    chooseFileBtn: "📎 Fayl tanlang",
  },
  ru: {
    title: "Панель врача", orders: "Заказы", loading: "Загрузка...",
    noOrders: "Нет заказов", sendResult: "Отправить результат",
    chooseFile: "Выбрать файл", upload: "Отправить", cancel: "Отмена",
    uploading: "Отправка...", success: "Результат успешно отправлен! ✅",
    patient: "Пациент", age: "лет", service: "Услуга", date: "Дата",
    approved: "Подтверждён", courier_done: "Образец получен", completed: "Завершён",
    noFile: "Файл не выбран", resultTitle: "Отправить результат",
    resultHint: "Выберите PDF, JPG или PNG файл",
    error: "Произошла ошибка", accessDenied: "Нет доступа",
    chooseFileBtn: "📎 Выбрать файл",
  },
  en: {
    title: "Doctor Panel", orders: "Orders", loading: "Loading...",
    noOrders: "No orders", sendResult: "Send result",
    chooseFile: "Choose file", upload: "Send", cancel: "Cancel",
    uploading: "Sending...", success: "Result sent successfully! ✅",
    patient: "Patient", age: "y.o.", service: "Service", date: "Date",
    approved: "Approved", courier_done: "Sample collected", completed: "Completed",
    noFile: "No file chosen", resultTitle: "Send result",
    resultHint: "Select a PDF, JPG or PNG file",
    error: "An error occurred", accessDenied: "Access denied",
    chooseFileBtn: "📎 Choose file",
  },
};

const STATUS_COLOR: Record<string, string> = {
  approved: 'bg-blue-100 text-blue-700',
  courier_done: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
};

async function api(path: string, opts: RequestInit = {}) {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || `HTTP ${r.status}`); }
  return r.json();
}

export default function DoctorPanel() {
  return <DoctorPanelInner />;
}

function DoctorPanelInner() {
  const { tgId, lang } = useStaffAuth();
  const t = T[lang] ?? T.uz;
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!tgId) { setAuthorized(false); return; }
    api(`/api/staff/me?tg_id=${tgId}`)
      .then(d => setAuthorized(['doctor', 'admin'].includes(d.role)))
      .catch(() => setAuthorized(false));
  }, [tgId]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await api(`/api/doctor/orders?tg_id=${tgId}`)); }
    finally { setLoading(false); }
  }, [tgId]);

  useEffect(() => { if (authorized) load(); }, [authorized, load]);

  const sendResult = async () => {
    if (!file || !selected) return;
    setUploading(true); setErrorMsg('');
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((res, rej) => {
        reader.onload = () => res((reader.result as string).split(',')[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      await fetch(`/api/doctor/orders/${selected.orderId}/result?tg_id=${tgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_base64: base64, filename: file.name }),
      }).then(r => { if (!r.ok) throw new Error(); return r.json(); });

      setSuccessMsg(t.success);
      setSelected(null); setFile(null);
      setTimeout(() => setSuccessMsg(''), 3000);
      await load();
    } catch {
      setErrorMsg(t.error);
    } finally { setUploading(false); }
  };

  if (authorized === null) return <Loading text={t.loading} />;
  if (!authorized) return <AccessDenied text={t.accessDenied} />;

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50">
      {/* Header */}
      <div className="shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 pt-10 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">👨‍⚕️ {t.title}</h1>
            <p className="text-emerald-100 text-xs mt-0.5">ID: {tgId}</p>
          </div>
          <button onClick={load} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="shrink-0 bg-green-500 text-white text-center py-3 text-sm font-medium">
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-sm">{t.noOrders}</p>
          </div>
        ) : (
          orders.map(order => (
            <motion.div key={order.orderId} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-4 border-0 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-emerald-700">{order.orderId}</span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {(t as any)[order.status] ?? order.status}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-semibold">{order.patientName}</span>
                  <span className="text-slate-500 ml-1.5">{order.patientAge} {t.age} · {order.patientType === 'child' ? '👶' : '🧑'}</span>
                </div>
                <div className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</div>
                {order.status !== 'completed' && (
                  <Button size="sm" className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 rounded-lg mt-1"
                    onClick={() => { setSelected(order); setFile(null); setErrorMsg(''); }}>
                    <Upload size={14} className="mr-1.5" /> {t.sendResult}
                  </Button>
                )}
                {order.status === 'completed' && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium pt-1">
                    <CheckCircle size={13} /> Natija yuborilgan
                  </div>
                )}
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Upload sheet */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div className="fixed inset-0 bg-black/50 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} />
            <motion.div className="fixed bottom-0 inset-x-0 bg-white rounded-t-3xl z-50 p-6 space-y-4 max-w-md mx-auto"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">{t.resultTitle}</h3>
                <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-sm">
                <div className="font-semibold">{selected.patientName}</div>
                <div className="text-slate-500 text-xs">{selected.orderId} · {selected.patientAge} {t.age}</div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-500">{t.resultHint}</p>
                <input type="file" ref={fileRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setFile(e.target.files?.[0] ?? null)} />
                <button onClick={() => fileRef.current?.click()}
                  className="w-full h-12 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center gap-2 text-sm text-slate-600 hover:border-emerald-400 hover:text-emerald-600 transition-colors">
                  <FileText size={16} />
                  {file ? <span className="truncate max-w-[200px] text-emerald-700 font-medium">{file.name}</span> : t.chooseFileBtn}
                </button>
              </div>
              {errorMsg && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-12" onClick={() => setSelected(null)} disabled={uploading}>{t.cancel}</Button>
                <Button className="h-12 bg-emerald-600 hover:bg-emerald-700" onClick={sendResult} disabled={!file || uploading}>
                  {uploading ? <><RefreshCw size={14} className="animate-spin mr-1.5" />{t.uploading}</> : <><Upload size={14} className="mr-1.5" />{t.upload}</>}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="h-[100dvh] flex items-center justify-center">
      <div className="text-center space-y-3">
        <RefreshCw size={32} className="animate-spin text-emerald-500 mx-auto" />
        <p className="text-slate-500 text-sm">{text}</p>
      </div>
    </div>
  );
}

function AccessDenied({ text }: { text: string }) {
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center p-8">
      <div className="text-6xl mb-3">🚫</div>
      <h2 className="text-xl font-bold">{text}</h2>
    </div>
  );
}
