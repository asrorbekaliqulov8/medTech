import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TelegramGuard } from '@/components/TelegramGuard';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, MapPin, Clock, RefreshCw, Package2, Truck } from 'lucide-react';

type Lang = 'uz' | 'ru' | 'en';
const T = {
  uz: {
    title: "Kuryer Paneli", loading: "Yuklanmoqda...", noOrders: "Hozircha buyurtma yo'q",
    markDone: "✅ Bajarildi", doing: "Yuborilmoqda...", success: "Bajarildi!",
    patient: "Bemor", delivery: "Yetkazish", pickup: "Pickup", district: "Tuman",
    accessDenied: "Ruxsat yo'q", age: "yosh", yourRegion: "Sizning tumaningiz",
    allRegions: "Barcha tumanlar", ordersCount: "ta buyurtma",
    noRegion: "Tuman belgilanmagan", done: "Namuna olindi ✓",
    addressNote: "Manzil izohi",
  },
  ru: {
    title: "Панель курьера", loading: "Загрузка...", noOrders: "Нет заказов",
    markDone: "✅ Выполнено", doing: "Отправка...", success: "Выполнено!",
    patient: "Пациент", delivery: "Доставка", pickup: "Забор", district: "Район",
    accessDenied: "Нет доступа", age: "лет", yourRegion: "Ваш район",
    allRegions: "Все районы", ordersCount: "заказов",
    noRegion: "Район не назначен", done: "Образец получен ✓",
    addressNote: "Примечание к адресу",
  },
  en: {
    title: "Courier Panel", loading: "Loading...", noOrders: "No orders",
    markDone: "✅ Done", doing: "Sending...", success: "Done!",
    patient: "Patient", delivery: "Delivery", pickup: "Pickup", district: "District",
    accessDenied: "Access denied", age: "y.o.", yourRegion: "Your region",
    allRegions: "All regions", ordersCount: "orders",
    noRegion: "No region assigned", done: "Sample collected ✓",
    addressNote: "Address note",
  },
};

const REGIONS: Record<string, string> = {
  '1': 'Bekobod', '2': "Bo'ka", '3': "Bo'stonliq", '4': 'Zangiota',
  '5': 'Chinoz', '6': 'Ohangaron', '7': "Oqqo'rg'on", '8': 'Parkent',
  '9': 'Piskent', '10': 'Quyi Chirchiq', '11': 'Yangiyol', '12': 'Yuqori Chirchiq',
  '13': 'Qibray', '14': "O'rtachirchiq", '15': 'Toshkent tumani',
};

async function api(path: string, opts: RequestInit = {}) {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || `HTTP ${r.status}`); }
  return r.json();
}

export default function CourierPanel() {
  return (
    <TelegramGuard>
      <CourierPanelInner />
    </TelegramGuard>
  );
}

function CourierPanelInner() {
  const { tgId, lang } = useStaffAuth();
  const t = T[lang] ?? T.uz;
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!tgId) { setAuthorized(false); return; }
    api(`/api/staff/me?tg_id=${tgId}`)
      .then(d => {
        setAuthorized(['courier', 'admin'].includes(d.role));
        if (d.regionId) setRegionId(d.regionId);
      })
      .catch(() => setAuthorized(false));
  }, [tgId]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await api(`/api/courier/orders?tg_id=${tgId}`)); }
    finally { setLoading(false); }
  }, [tgId]);

  useEffect(() => { if (authorized) load(); }, [authorized, load]);

  const markDone = async (orderId: string) => {
    setActing(orderId);
    try {
      await api(`/api/courier/orders/${orderId}/done?tg_id=${tgId}`, { method: 'POST' });
      setDoneSet(s => new Set([...s, orderId]));
      setToast(t.success);
      setTimeout(() => setToast(''), 2500);
    } finally { setActing(null); }
  };

  if (authorized === null) return <Loading text={t.loading} />;
  if (!authorized) return <AccessDenied text={t.accessDenied} />;

  const activeOrders = orders.filter(o => !doneSet.has(o.orderId));
  const completedOrders = orders.filter(o => doneSet.has(o.orderId));

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50">
      {/* Header */}
      <div className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 pt-10 pb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">🚗 {t.title}</h1>
            <p className="text-amber-100 text-xs mt-0.5">ID: {tgId}</p>
          </div>
          <button onClick={load} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {/* Region badge */}
        <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2">
          <MapPin size={14} />
          <span className="text-sm font-medium">
            {regionId ? `${t.yourRegion}: ${REGIONS[regionId] ?? regionId}` : t.noRegion}
          </span>
          <span className="ml-auto text-xs bg-white/20 rounded-full px-2 py-0.5">{activeOrders.length} {t.ordersCount}</span>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="shrink-0 bg-green-500 text-white text-center py-3 text-sm font-semibold">
            ✅ {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Truck size={48} className="mb-3 opacity-30" />
            <p className="text-sm">{t.noOrders}</p>
          </div>
        ) : (
          <>
            {activeOrders.map(order => (
              <motion.div key={order.orderId} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <Card className="p-4 border-0 shadow-sm space-y-3 rounded-2xl overflow-hidden relative">
                  {/* Side accent */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-2xl" />
                  <div className="pl-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-amber-700">{order.orderId}</span>
                      <Package2 size={16} className="text-slate-400" />
                    </div>
                    <div className="text-sm font-semibold mt-1">{order.patientName}
                      <span className="font-normal text-slate-500 ml-1.5">{order.patientAge} {t.age}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                      <MapPin size={12} className="text-amber-500" />
                      <span className="font-medium text-slate-700">{REGIONS[order.districtId] ?? order.districtId}</span>
                    </div>
                    {order.addressNote && (
                      <div className="text-xs text-slate-500 mt-1 bg-slate-50 rounded-lg px-2 py-1.5">
                        📝 {order.addressNote}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {order.deliverySlot && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 bg-blue-50 text-blue-700 rounded-full px-2.5 py-1">
                          <Clock size={11} /> {t.delivery}: {order.deliverySlot}
                        </div>
                      )}
                      {order.pickupSlot && (
                        <div className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 rounded-full px-2.5 py-1">
                          <Clock size={11} /> {t.pickup}: {order.pickupSlot}
                        </div>
                      )}
                    </div>
                    <Button className="w-full h-11 mt-3 bg-amber-500 hover:bg-amber-600 rounded-xl text-base font-semibold"
                      onClick={() => markDone(order.orderId)} disabled={acting === order.orderId}>
                      {acting === order.orderId
                        ? <><RefreshCw size={15} className="animate-spin mr-1.5" />{t.doing}</>
                        : t.markDone}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}

            {completedOrders.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">Yakunlangan</p>
                {completedOrders.map(order => (
                  <Card key={order.orderId} className="p-3.5 border-0 shadow-sm opacity-60 flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                    <div>
                      <div className="font-mono text-sm font-bold text-slate-600">{order.orderId}</div>
                      <div className="text-xs text-slate-500">{order.patientName} · {t.done}</div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="h-[100dvh] flex items-center justify-center">
      <div className="text-center space-y-3">
        <RefreshCw size={32} className="animate-spin text-amber-500 mx-auto" />
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
