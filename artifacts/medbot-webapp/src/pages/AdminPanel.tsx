import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3, Users, Package, Settings, Megaphone,
  CheckCircle2, XCircle, Clock, Trash2, Plus, RefreshCw,
  TrendingUp, DollarSign, ShoppingBag, CalendarDays, UserPlus, MapPin,
} from 'lucide-react';

// Leaflet
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polygon, Tooltip } from 'react-leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type Lang = 'uz' | 'ru' | 'en';
const T = {
  uz: {
    title: 'Admin Panel', stats: 'Statistika', orders: 'Buyurtmalar',
    staff: 'Xodimlar', settings: 'Sozlamalar', broadcast: 'Xabar', districts: 'Tumanlar',
    totalOrders: 'Jami buyurtma', revenue: 'Daromad', pending: 'Kutilmoqda',
    completed: 'Bajarilgan', today: 'Bugun', users: 'Foydalanuvchilar',
    approve: 'Tasdiqlash', reject: 'Rad etish', approved: 'Tasdiqlangan',
    rejected: 'Rad etildi', pendingPay: "To'lov kutilmoqda",
    pendingAdmin: 'Admin kutilmoqda', all: 'Barchasi', courier: 'Kuryer',
    doctor: 'Shifokor', admin: 'Admin', deleteStaff: "O'chirish",
    addStaff: "Qo'shish", tgId: 'Telegram ID', role: 'Rol',
    region: 'Tuman', save: 'Saqlash', sendMsg: 'Yuborish',
    broadcastPlaceholder: "Xabar matnini yozing...", broadcastTitle: "Barcha foydalanuvchilarga xabar",
    noOrders: "Buyurtmalar yo'q", noStaff: "Xodimlar yo'q",
    currency: "so'm", price: 'Narx', district: 'Tuman',
    settingsSaved: "Saqlandi ✓", messageSent: "Yuborildi ✓",
    loading: 'Yuklanmoqda...', error: 'Xatolik',
    servicePrice: 'Xizmat narxi', pickupExtra: 'Pickup qo\'shimcha',
    cardNumber: 'Karta raqami', cardOwner: 'Karta egasi', clickUrl: 'Click URL',
    allowedDistricts: 'Faol tumanlar (ID, vergul bilan)',
    staffList: 'Xodimlar ro\'yxati', addNew: 'Yangi qo\'shish',
    courier_done: 'Kuryer oldi', sample_collected: 'Namuna olindi',
    activateDistrict: 'Faollashtirish', deactivateDistrict: 'O\'chirish',
    extraFee: 'Qo\'shimcha to\'lov', loadPolygons: 'Chegaralarni yuklash',
    districtActive: 'Faol', districtInactive: 'Nofaol',
    loadingPolygons: 'Chegaralar yuklanmoqda...',
  },
  ru: {
    title: 'Админ Панель', stats: 'Статистика', orders: 'Заказы',
    staff: 'Персонал', settings: 'Настройки', broadcast: 'Рассылка', districts: 'Районы',
    totalOrders: 'Всего заказов', revenue: 'Доход', pending: 'В ожидании',
    completed: 'Выполнено', today: 'Сегодня', users: 'Пользователи',
    approve: 'Подтвердить', reject: 'Отклонить', approved: 'Подтверждён',
    rejected: 'Отклонён', pendingPay: 'Ожидает оплаты',
    pendingAdmin: 'Ожидает админа', all: 'Все', courier: 'Курьер',
    doctor: 'Врач', admin: 'Админ', deleteStaff: 'Удалить',
    addStaff: 'Добавить', tgId: 'Telegram ID', role: 'Роль',
    region: 'Район', save: 'Сохранить', sendMsg: 'Отправить',
    broadcastPlaceholder: "Напишите сообщение...", broadcastTitle: "Рассылка всем пользователям",
    noOrders: 'Нет заказов', noStaff: 'Нет персонала',
    currency: 'сум', price: 'Цена', district: 'Район',
    settingsSaved: "Сохранено ✓", messageSent: "Отправлено ✓",
    loading: 'Загрузка...', error: 'Ошибка',
    servicePrice: 'Цена услуги', pickupExtra: 'Доп. за доставку',
    cardNumber: 'Номер карты', cardOwner: 'Владелец карты', clickUrl: 'Click URL',
    allowedDistricts: 'Активные районы (ID через запятую)',
    staffList: 'Список персонала', addNew: 'Добавить нового',
    courier_done: 'Курьер забрал', sample_collected: 'Образец получен',
    activateDistrict: 'Активировать', deactivateDistrict: 'Деактивировать',
    extraFee: 'Доп. плата', loadPolygons: 'Загрузить границы',
    districtActive: 'Активен', districtInactive: 'Неактивен',
    loadingPolygons: 'Загрузка границ...',
  },
  en: {
    title: 'Admin Panel', stats: 'Statistics', orders: 'Orders',
    staff: 'Staff', settings: 'Settings', broadcast: 'Broadcast', districts: 'Districts',
    totalOrders: 'Total orders', revenue: 'Revenue', pending: 'Pending',
    completed: 'Completed', today: 'Today', users: 'Users',
    approve: 'Approve', reject: 'Reject', approved: 'Approved',
    rejected: 'Rejected', pendingPay: 'Awaiting payment',
    pendingAdmin: 'Awaiting admin', all: 'All', courier: 'Courier',
    doctor: 'Doctor', admin: 'Admin', deleteStaff: 'Delete',
    addStaff: 'Add', tgId: 'Telegram ID', role: 'Role',
    region: 'District', save: 'Save', sendMsg: 'Send',
    broadcastPlaceholder: "Write a message...", broadcastTitle: "Broadcast to all users",
    noOrders: 'No orders', noStaff: 'No staff',
    currency: 'UZS', price: 'Price', district: 'District',
    settingsSaved: "Saved ✓", messageSent: "Sent ✓",
    loading: 'Loading...', error: 'Error',
    servicePrice: 'Service price', pickupExtra: 'Pickup extra',
    cardNumber: 'Card number', cardOwner: 'Card owner', clickUrl: 'Click URL',
    allowedDistricts: 'Active districts (IDs, comma-separated)',
    staffList: 'Staff list', addNew: 'Add new',
    courier_done: 'Courier collected', sample_collected: 'Sample collected',
    activateDistrict: 'Activate', deactivateDistrict: 'Deactivate',
    extraFee: 'Extra fee', loadPolygons: 'Load boundaries',
    districtActive: 'Active', districtInactive: 'Inactive',
    loadingPolygons: 'Loading boundaries...',
  },
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  pending_admin: 'bg-orange-100 text-orange-800',
  approved: 'bg-blue-100 text-blue-800',
  courier_done: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const REGIONS = [
  { id: '4', name: 'Zangiota' }, { id: '11', name: 'Yangiyol' },
  { id: '13', name: 'Qibray' }, { id: '15', name: 'Toshkent tumani' },
  { id: '1', name: 'Bekobod' }, { id: '2', name: "Bo'ka" },
  { id: '3', name: "Bo'stonliq" }, { id: '5', name: "Chinoz" },
  { id: '6', name: "Ohangaron" }, { id: '7', name: "Oqqo'rg'on" },
  { id: '8', name: "Parkent" }, { id: '9', name: "Piskent" },
  { id: '10', name: "Quyi Chirchiq" }, { id: '12', name: "Yuqori Chirchiq" },
  { id: '14', name: "O'rtachirchiq" },
];

type Tab = 'orders' | 'districts' | 'staff' | 'settings' | 'broadcast';

async function api(path: string, opts: RequestInit = {}) {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || `HTTP ${r.status}`); }
  return r.json();
}

export default function AdminPanel() {
  return <AdminPanelInner />;
}

function AdminPanelInner() {
  const { tgId, lang } = useStaffAuth();
  const t = T[lang] ?? T.uz;
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('orders');

  const urlTab = new URLSearchParams(window.location.search).get('tab');
  const initialFilter = urlTab === 'pending' ? 'pending_admin' : 'all';

  useEffect(() => {
    if (urlTab === 'pending') setTab('orders');
  }, []);

  useEffect(() => {
    if (!tgId) { setAuthorized(false); return; }
    api(`/api/staff/me?tg_id=${tgId}`)
      .then(d => setAuthorized(d.role === 'admin'))
      .catch(() => setAuthorized(false));
  }, [tgId]);

  if (authorized === null) return <LoadingScreen text={t.loading} />;
  if (!authorized) return <AccessDenied />;

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50">
      {/* Header */}
      <div className="shrink-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 pt-10 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">🛠 {t.title}</h1>
            <p className="text-indigo-100 text-xs mt-0.5">ID: {tgId}</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">👑</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 bg-white border-b flex overflow-x-auto">
        {([
          ['orders', <Package size={14} />, t.orders],
          ['districts', <MapPin size={14} />, t.districts],
          ['staff', <Users size={14} />, t.staff],
          ['settings', <Settings size={14} />, t.settings],
          ['broadcast', <Megaphone size={14} />, t.broadcast],
        ] as const).map(([key, icon, label]) => (
          <button key={key} onClick={() => setTab(key as Tab)}
            className={`flex-1 min-w-[60px] flex flex-col items-center gap-0.5 py-2.5 px-1 text-[10px] font-medium transition-colors border-b-2 ${tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {tab === 'orders' && <OrdersTab tgId={tgId} lang={lang} t={t} initialFilter={initialFilter} />}
            {tab === 'districts' && <DistrictsTab tgId={tgId} lang={lang} t={t} />}
            {tab === 'staff' && <StaffTab tgId={tgId} lang={lang} t={t} />}
            {tab === 'settings' && <SettingsTab tgId={tgId} t={t} />}
            {tab === 'broadcast' && <BroadcastTab tgId={tgId} t={t} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab({ tgId, lang, t, initialFilter = 'all' }: { tgId: number; lang: Lang; t: typeof T.uz; initialFilter?: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [stats, setStats] = useState<any>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [actError, setActError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, s] = await Promise.all([
        api(`/api/admin/orders?tg_id=${tgId}&status=${statusFilter}`),
        api(`/api/admin/stats?tg_id=${tgId}`),
      ]);
      setOrders(o); setStats(s);
    } finally { setLoading(false); }
  }, [tgId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const act = async (orderId: string, status: string) => {
    setActing(orderId);
    setActError(null);
    try {
      await api(`/api/admin/orders/${orderId}?tg_id=${tgId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await load();
    } catch (e: any) {
      if (e.message?.includes('already processed') || e.message?.includes('409')) {
        setActError('Bu buyurtma boshqa admin tomonidan allaqachon tasdiqlangan yoki rad etilgan.');
      } else {
        setActError(e.message || 'Xatolik yuz berdi');
      }
      await load();
    } finally { setActing(null); }
  };

  const filters = [
    { key: 'all', label: t.all },
    { key: 'pending_admin', label: t.pendingAdmin },
    { key: 'approved', label: t.approved },
    { key: 'completed', label: t.completed },
    { key: 'rejected', label: t.rejected },
  ];

  return (
    <div className="p-4 space-y-4">
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<ShoppingBag size={18} />} label={t.totalOrders} value={stats.totalOrders} color="bg-blue-500" />
          <StatCard icon={<DollarSign size={18} />} label={t.revenue} value={`${Number(stats.revenue).toLocaleString()}`} color="bg-green-500" />
          <StatCard icon={<Clock size={18} />} label={t.pending} value={stats.pendingAdminOrders} color="bg-orange-500" />
          <StatCard icon={<CalendarDays size={18} />} label={t.today} value={stats.todayOrders} color="bg-indigo-500" />
        </div>
      )}

      {actError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3 flex items-center justify-between">
          <span>⚠️ {actError}</span>
          <button onClick={() => setActError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === f.key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border'}`}>
            {f.label}
          </button>
        ))}
        <button onClick={load} className="shrink-0 p-1.5 rounded-full bg-white border ml-auto">
          <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-500' : 'text-slate-500'} />
        </button>
      </div>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
      ) : orders.length === 0 ? (
        <EmptyState text={t.noOrders} />
      ) : (
        orders.map(order => (
          <motion.div key={order.orderId} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="p-4 space-y-2.5 shadow-sm border-0">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-indigo-700">{order.orderId}</span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {(t as any)[order.status] ?? order.status}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-semibold">{order.patientName}</span>
                <span className="text-slate-500 ml-1.5">{order.patientAge} yosh · {order.patientType === 'child' ? '👶' : '🧑'}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>📍 {order.districtId}</span>
                <span className="font-medium text-slate-700">{(order.price + order.extraPrice).toLocaleString()} {t.currency}</span>
              </div>
              <div className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleString('uz-UZ')}</div>
              {order.status === 'pending_admin' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button size="sm" className="bg-green-500 hover:bg-green-600 h-9 rounded-lg"
                    onClick={() => act(order.orderId, 'approved')} disabled={acting === order.orderId}>
                    <CheckCircle2 size={14} className="mr-1" /> {t.approve}
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-300 text-red-500 h-9 rounded-lg"
                    onClick={() => act(order.orderId, 'rejected')} disabled={acting === order.orderId}>
                    <XCircle size={14} className="mr-1" /> {t.reject}
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        ))
      )}
    </div>
  );
}

// ─── Districts Tab ─────────────────────────────────────────────────────────────
function DistrictsTab({ tgId, lang, t }: { tgId: number; lang: Lang; t: typeof T.uz }) {
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [extraFee, setExtraFee] = useState('');
  const [loadingPolygons, setLoadingPolygons] = useState(false);
  const [polyProgress, setPolyProgress] = useState(0);
  const [view, setView] = useState<'map' | 'list'>('list');
  const polyFetchRef = useRef(false);

  const load = async () => {
    setLoading(true);
    try { setDistricts(await api('/api/districts')); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id: string, current: boolean) => {
    setToggling(id);
    try {
      const updated = await api(`/api/admin/districts/${id}?tg_id=${tgId}`, {
        method: 'PATCH',
        body: JSON.stringify({ available: !current }),
      });
      setDistricts(ds => ds.map(d => d.id === id ? { ...d, available: updated.available } : d));
      if (selected?.id === id) setSelected((s: any) => ({ ...s, available: updated.available }));
    } finally { setToggling(null); }
  };

  const saveExtraFee = async (id: string) => {
    const fee = Number(extraFee);
    if (isNaN(fee)) return;
    await api(`/api/admin/districts/${id}?tg_id=${tgId}`, {
      method: 'PATCH',
      body: JSON.stringify({ courierExtraFee: fee }),
    });
    setDistricts(ds => ds.map(d => d.id === id ? { ...d, courierExtraFee: fee } : d));
    if (selected?.id === id) setSelected((s: any) => ({ ...s, courierExtraFee: fee }));
  };

  const fetchAllPolygons = async () => {
    if (polyFetchRef.current) return;
    polyFetchRef.current = true;
    setLoadingPolygons(true);
    setPolyProgress(0);
    const missing = districts.filter(d => !d.geojson);
    for (let i = 0; i < missing.length; i++) {
      const d = missing[i];
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(d.nameEn + ', Tashkent Region, Uzbekistan')}&format=json&polygon_geojson=1&limit=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        if (data.length > 0 && data[0].geojson && ['Polygon', 'MultiPolygon'].includes(data[0].geojson.type)) {
          await api(`/api/admin/districts/${d.id}?tg_id=${tgId}`, {
            method: 'PATCH',
            body: JSON.stringify({ geojson: data[0].geojson }),
          });
          setDistricts(ds => ds.map(x => x.id === d.id ? { ...x, geojson: data[0].geojson } : x));
        }
      } catch {}
      setPolyProgress(Math.round(((i + 1) / missing.length) * 100));
      await new Promise(r => setTimeout(r, 1200));
    }
    setLoadingPolygons(false);
    polyFetchRef.current = false;
  };

  const geojsonToLeaflet = (geojson: any): [number, number][][] => {
    if (!geojson) return [];
    if (geojson.type === 'Polygon') {
      return [geojson.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number])];
    }
    if (geojson.type === 'MultiPolygon') {
      return geojson.coordinates.map((poly: number[][][]) =>
        poly[0].map((c: number[]) => [c[1], c[0]] as [number, number])
      );
    }
    return [];
  };

  if (loading) return <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;

  const activeDists = districts.filter(d => d.available);
  const inactiveDists = districts.filter(d => !d.available);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="shrink-0 p-3 bg-white border-b flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border text-xs font-medium">
          <button onClick={() => setView('list')} className={`px-3 py-1.5 ${view === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>☰ Ro'yxat</button>
          <button onClick={() => setView('map')} className={`px-3 py-1.5 ${view === 'map' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>🗺 Xarita</button>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-green-600 font-semibold">{activeDists.length} faol</span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs text-slate-500">{inactiveDists.length} nofaol</span>
        </div>
        <Button size="sm" variant="outline" className="text-xs h-8"
          onClick={fetchAllPolygons} disabled={loadingPolygons}>
          {loadingPolygons ? `${polyProgress}% ...` : '🌍 Chegaralar'}
        </Button>
      </div>

      {/* Map view */}
      {view === 'map' && (
        <div className="flex-1 relative" style={{ minHeight: 400 }}>
          <MapContainer center={[41.3, 69.3]} zoom={9} style={{ height: '100%', width: '100%', minHeight: 400 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>' />
            {districts.map(d => {
              const polygons = geojsonToLeaflet(d.geojson);
              const color = d.available ? '#16a34a' : '#94a3b8';
              const fillColor = d.available ? '#16a34a' : '#94a3b8';
              const name = lang === 'ru' ? d.nameRu : lang === 'en' ? d.nameEn : d.nameUz;
              return (
                <Fragment key={d.id}>
                  {polygons.length > 0 ? (
                    polygons.map((coords, pi) => (
                      <Polygon key={`${d.id}-${pi}`} positions={coords}
                        pathOptions={{ color, fillColor, fillOpacity: 0.35, weight: 2 }}
                        eventHandlers={{ click: () => { setSelected(d); setExtraFee(String(d.courierExtraFee ?? 0)); } }}>
                        <Tooltip sticky>{name} · {d.available ? t.districtActive : t.districtInactive}</Tooltip>
                      </Polygon>
                    ))
                  ) : (
                    <Marker position={[d.lat, d.lng]}
                      eventHandlers={{ click: () => { setSelected(d); setExtraFee(String(d.courierExtraFee ?? 0)); } }}>
                      <Tooltip>{name}</Tooltip>
                    </Marker>
                  )}
                </Fragment>
              );
            })}
          </MapContainer>

          {/* Map legend */}
          <div className="absolute bottom-4 left-4 z-[400] bg-white rounded-xl shadow-lg p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-green-600 opacity-70" /><span>Faol tuman</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-slate-400 opacity-70" /><span>Nofaol tuman</span></div>
            <div className="text-slate-400 text-[10px] mt-1">Bosing → tahrirlash</div>
          </div>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {[...activeDists, ...inactiveDists].map(d => {
            const name = lang === 'ru' ? d.nameRu : lang === 'en' ? d.nameEn : d.nameUz;
            return (
              <Card key={d.id} className={`p-3.5 border-0 shadow-sm flex items-center gap-3 cursor-pointer transition-colors ${selected?.id === d.id ? 'ring-2 ring-indigo-400' : ''}`}
                onClick={() => { setSelected(d); setExtraFee(String(d.courierExtraFee ?? 0)); }}>
                <div className={`w-3 h-3 rounded-full shrink-0 ${d.available ? 'bg-green-500' : 'bg-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{name}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span>{d.available ? t.districtActive : t.districtInactive}</span>
                    {d.courierExtraFee > 0 && <span className="text-amber-600">+{d.courierExtraFee.toLocaleString()}</span>}
                    {d.geojson && <span className="text-teal-600">🗺</span>}
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); toggle(d.id, d.available); }}
                  disabled={toggling === d.id}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${d.available ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                  {toggling === d.id ? '...' : d.available ? '✕ O\'ch' : '✓ Faol'}
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {/* District detail bottom sheet */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div className="fixed inset-0 bg-black/40 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)} />
            <motion.div className="fixed bottom-0 inset-x-0 bg-white rounded-t-3xl z-50 p-5 space-y-4 max-w-md mx-auto"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">{lang === 'ru' ? selected.nameRu : lang === 'en' ? selected.nameEn : selected.nameUz}</h3>
                  <span className={`text-xs font-semibold ${selected.available ? 'text-green-600' : 'text-slate-400'}`}>
                    {selected.available ? `✅ ${t.districtActive}` : `⛔ ${t.districtInactive}`}
                  </span>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 text-xl leading-none">✕</button>
              </div>

              <Button className={`w-full h-11 rounded-xl ${selected.available ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
                onClick={() => toggle(selected.id, selected.available)} disabled={toggling === selected.id}>
                {toggling === selected.id ? '...' : selected.available ? `⛔ ${t.deactivateDistrict}` : `✅ ${t.activateDistrict}`}
              </Button>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t.extraFee} (so'm)</label>
                <div className="flex gap-2">
                  <Input type="number" value={extraFee} onChange={e => setExtraFee(e.target.value)}
                    className="h-11 flex-1 text-base" placeholder="0" />
                  <Button className="h-11 px-4 bg-indigo-600 hover:bg-indigo-700" onClick={() => saveExtraFee(selected.id)}>
                    {t.save}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>📍 {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}</span>
                <span>{selected.geojson ? '🗺 Chegara bor' : '⚠️ Chegara yo\'q'}</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Staff Tab ────────────────────────────────────────────────────────────────
function StaffTab({ tgId, lang, t }: { tgId: number; lang: Lang; t: typeof T.uz }) {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ tg_id: '', role: 'courier', region_id: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<number[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setStaff(await api(`/api/admin/staff?tg_id=${tgId}`)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    api(`/api/admin/users?tg_id=${tgId}`)
      .then((rows: { tgId: number }[]) => setUserSuggestions(rows.map(r => r.tgId)))
      .catch(() => {});
  }, [tgId]);

  const addStaff = async () => {
    if (!form.tg_id) return;
    setSaving(true);
    try {
      await api(`/api/admin/staff?tg_id=${tgId}`, { method: 'POST', body: JSON.stringify({ tg_id: Number(form.tg_id), role: form.role, region_id: form.region_id || undefined }) });
      setForm({ tg_id: '', role: 'courier', region_id: '' });
      setMsg(t.settingsSaved);
      setTimeout(() => setMsg(''), 2000);
      await load();
    } finally { setSaving(false); }
  };

  const removeStaff = async (staffTgId: number) => {
    await api(`/api/admin/staff/${staffTgId}?tg_id=${tgId}`, { method: 'DELETE' });
    await load();
  };

  const roleColor = (role: string) => role === 'admin' ? 'bg-indigo-100 text-indigo-700' : role === 'doctor' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
  const roleIcon = (role: string) => role === 'admin' ? '👑' : role === 'doctor' ? '👨‍⚕️' : '🚗';

  return (
    <div className="p-4 space-y-4">
      <Card className="p-4 space-y-3 border-0 shadow-sm">
        <div className="flex items-center gap-2">
          <UserPlus size={16} className="text-indigo-600" />
          <span className="font-semibold text-sm">{t.addNew}</span>
        </div>
        <div className="relative">
          <Input placeholder={`${t.tgId} (e.g. 12345678)`} value={form.tg_id}
            onChange={e => { setForm(f => ({ ...f, tg_id: e.target.value })); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className="h-11 text-base" type="number" />
          {showSuggestions && form.tg_id.length >= 3 && (
            <div className="absolute top-full left-0 right-0 z-50 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto mt-1">
              {userSuggestions
                .filter(id => String(id).includes(form.tg_id))
                .slice(0, 8)
                .map(id => (
                  <button key={id} type="button"
                    onMouseDown={() => { setForm(f => ({ ...f, tg_id: String(id) })); setShowSuggestions(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b last:border-0 font-mono">
                    {id}
                  </button>
                ))}
              {userSuggestions.filter(id => String(id).includes(form.tg_id)).length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-400">Topilmadi</div>
              )}
            </div>
          )}
        </div>
        <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          className="w-full h-11 rounded-lg border bg-background px-3 text-sm">
          <option value="courier">🚗 {t.courier}</option>
          <option value="doctor">👨‍⚕️ {t.doctor}</option>
        </select>
        {form.role === 'courier' && (
          <select value={form.region_id} onChange={e => setForm(f => ({ ...f, region_id: e.target.value }))}
            className="w-full h-11 rounded-lg border bg-background px-3 text-sm">
            <option value="">{t.region} tanlang</option>
            {REGIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
        <Button className="w-full h-11 bg-indigo-600 hover:bg-indigo-700" onClick={addStaff} disabled={saving || !form.tg_id}>
          <Plus size={16} className="mr-1" /> {t.addStaff}
        </Button>
        {msg && <p className="text-center text-green-600 text-sm font-medium">{msg}</p>}
      </Card>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">{t.staffList}</p>
        {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />) :
          staff.length === 0 ? <EmptyState text={t.noStaff} /> :
          staff.map(s => (
            <Card key={s.tgId} className="flex items-center gap-3 p-3.5 border-0 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl shrink-0">
                {roleIcon(s.role)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{s.username || `ID: ${s.tgId}`}</div>
                <div className="flex gap-1.5 mt-0.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${roleColor(s.role)}`}>{(t as any)[s.role]}</span>
                  {s.regionId && <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{REGIONS.find(r => r.id === s.regionId)?.name ?? s.regionId}</span>}
                </div>
              </div>
              {s.role !== 'admin' && (
                <button onClick={() => removeStaff(s.tgId)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </Card>
          ))}
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({ tgId, t }: { tgId: number; t: typeof T.uz }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    api(`/api/admin/settings?tg_id=${tgId}`).then(setSettings).finally(() => setLoading(false));
  }, []);

  const saveSetting = async (key: string, value: string) => {
    setSaving(key);
    try {
      await api(`/api/admin/settings?tg_id=${tgId}`, { method: 'POST', body: JSON.stringify({ key, value }) });
      setSettings(s => ({ ...s, [key]: value }));
      setSaved(key); setTimeout(() => setSaved(null), 2000);
    } finally { setSaving(null); }
  };

  const fields = [
    { key: 'service_price', label: t.servicePrice, type: 'number' },
    { key: 'pickup_extra', label: t.pickupExtra, type: 'number' },
    { key: 'payment_card', label: t.cardNumber, type: 'text' },
    { key: 'payment_owner', label: t.cardOwner, type: 'text' },
    { key: 'click_payment_url', label: t.clickUrl, type: 'url' },
  ];

  if (loading) return <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  return (
    <div className="p-4 space-y-3">
      {fields.map(f => (
        <SettingField key={f.key} label={f.label} value={settings[f.key] ?? ''}
          isSaved={saved === f.key} saving={saving === f.key}
          onSave={v => saveSetting(f.key, v)} saveLabel={t.save} type={f.type} />
      ))}
    </div>
  );
}

function SettingField({ label, value: initial, onSave, saving, isSaved, saveLabel, type }: {
  label: string; value: string; onSave: (v: string) => void; saving: boolean; isSaved: boolean; saveLabel: string; type: string;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => { setValue(initial); }, [initial]);
  return (
    <Card className="p-4 space-y-2 border-0 shadow-sm">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <div className="flex gap-2">
        <Input value={value} onChange={e => setValue(e.target.value)} type={type} className="h-11 flex-1 text-base" />
        <Button size="sm" className={`h-11 px-4 shrink-0 ${isSaved ? 'bg-green-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          onClick={() => onSave(value)} disabled={saving}>
          {isSaved ? '✓' : saving ? '...' : saveLabel}
        </Button>
      </div>
    </Card>
  );
}

// ─── Broadcast Tab ────────────────────────────────────────────────────────────
function BroadcastTab({ tgId, t }: { tgId: number; t: typeof T.uz }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number } | null>(null);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const r = await api(`/api/admin/broadcast?tg_id=${tgId}`, { method: 'POST', body: JSON.stringify({ text }) });
      setResult(r); setText('');
    } finally { setSending(false); }
  };

  return (
    <div className="p-4 space-y-4">
      <Card className="p-4 space-y-3 border-0 shadow-sm">
        <div className="flex items-center gap-2">
          <Megaphone size={16} className="text-indigo-600" />
          <span className="font-semibold text-sm">{t.broadcastTitle}</span>
        </div>
        <Textarea placeholder={t.broadcastPlaceholder} value={text} onChange={e => setText(e.target.value)}
          className="min-h-[140px] text-base resize-none" />
        <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-base" onClick={send}
          disabled={sending || !text.trim()}>
          {sending ? <><RefreshCw size={16} className="animate-spin mr-2" /> Yuborilmoqda...</> : <><Megaphone size={16} className="mr-2" /> {t.sendMsg}</>}
        </Button>
      </Card>
      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
          <div className="text-2xl mb-1">✅</div>
          <div className="font-semibold text-green-700">{t.messageSent}</div>
          <div className="text-sm text-green-600 mt-1">{result.sent} ta foydalanuvchiga yuborildi</div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: any; color: string }) {
  return (
    <Card className="p-4 border-0 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white`}>{icon}</div>
        <div>
          <div className="text-xl font-bold">{value}</div>
          <div className="text-xs text-slate-500">{label}</div>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <div className="text-4xl mb-2">📭</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function LoadingScreen({ text }: { text: string }) {
  return (
    <div className="h-[100dvh] flex items-center justify-center">
      <div className="text-center space-y-3">
        <RefreshCw size={32} className="animate-spin text-indigo-500 mx-auto" />
        <p className="text-slate-500 text-sm">{text}</p>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center p-8">
      <div className="text-6xl mb-3">🔒</div>
      <h2 className="text-xl font-bold">Ruxsat yo'q</h2>
      <p className="text-slate-500 text-sm mt-2">Bu panel faqat adminlar uchun</p>
    </div>
  );
}
