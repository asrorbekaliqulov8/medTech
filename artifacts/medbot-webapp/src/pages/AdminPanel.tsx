import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TelegramGuard } from '@/components/TelegramGuard';
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
  TrendingUp, DollarSign, ShoppingBag, CalendarDays, UserPlus,
} from 'lucide-react';

type Lang = 'uz' | 'ru' | 'en';
const T = {
  uz: {
    title: 'Admin Panel', stats: 'Statistika', orders: 'Buyurtmalar',
    staff: 'Xodimlar', settings: 'Sozlamalar', broadcast: 'Xabar',
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
  },
  ru: {
    title: 'Админ Панель', stats: 'Статистика', orders: 'Заказы',
    staff: 'Персонал', settings: 'Настройки', broadcast: 'Рассылка',
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
  },
  en: {
    title: 'Admin Panel', stats: 'Statistics', orders: 'Orders',
    staff: 'Staff', settings: 'Settings', broadcast: 'Broadcast',
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

type Tab = 'orders' | 'staff' | 'settings' | 'broadcast';

async function api(path: string, opts: RequestInit = {}) {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || `HTTP ${r.status}`); }
  return r.json();
}

export default function AdminPanel() {
  return (
    <TelegramGuard>
      <AdminPanelInner />
    </TelegramGuard>
  );
}

function AdminPanelInner() {
  const { tgId, lang } = useStaffAuth();
  const t = T[lang] ?? T.uz;
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('orders');

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
        {([['orders', <Package size={16} />, t.orders], ['staff', <Users size={16} />, t.staff],
          ['settings', <Settings size={16} />, t.settings], ['broadcast', <Megaphone size={16} />, t.broadcast]] as const).map(([key, icon, label]) => (
          <button key={key} onClick={() => setTab(key as Tab)}
            className={`flex-1 min-w-[70px] flex flex-col items-center gap-0.5 py-2.5 px-1 text-[11px] font-medium transition-colors border-b-2 ${tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {tab === 'orders' && <OrdersTab tgId={tgId} lang={lang} t={t} />}
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
function OrdersTab({ tgId, lang, t }: { tgId: number; lang: Lang; t: typeof T.uz }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState<any>(null);
  const [acting, setActing] = useState<string | null>(null);

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
    try { await api(`/api/admin/orders/${orderId}?tg_id=${tgId}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await load(); }
    finally { setActing(null); }
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
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<ShoppingBag size={18} />} label={t.totalOrders} value={stats.totalOrders} color="bg-blue-500" />
          <StatCard icon={<DollarSign size={18} />} label={t.revenue} value={`${Number(stats.revenue).toLocaleString()}`} color="bg-green-500" />
          <StatCard icon={<Clock size={18} />} label={t.pending} value={stats.pendingAdminOrders} color="bg-orange-500" />
          <StatCard icon={<CalendarDays size={18} />} label={t.today} value={stats.todayOrders} color="bg-indigo-500" />
        </div>
      )}

      {/* Filter chips */}
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

      {/* Orders list */}
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
                    onClick={() => act(order.orderId, 'approved')}
                    disabled={acting === order.orderId}>
                    <CheckCircle2 size={14} className="mr-1" /> {t.approve}
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-300 text-red-500 h-9 rounded-lg"
                    onClick={() => act(order.orderId, 'rejected')}
                    disabled={acting === order.orderId}>
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

// ─── Staff Tab ────────────────────────────────────────────────────────────────
function StaffTab({ tgId, lang, t }: { tgId: number; lang: Lang; t: typeof T.uz }) {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ tg_id: '', role: 'courier', region_id: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try { setStaff(await api(`/api/admin/staff?tg_id=${tgId}`)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

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
      {/* Add staff form */}
      <Card className="p-4 space-y-3 border-0 shadow-sm">
        <div className="flex items-center gap-2">
          <UserPlus size={16} className="text-indigo-600" />
          <span className="font-semibold text-sm">{t.addNew}</span>
        </div>
        <Input placeholder={`${t.tgId} (e.g. 12345678)`} value={form.tg_id}
          onChange={e => setForm(f => ({ ...f, tg_id: e.target.value }))}
          className="h-11 text-base" type="number" />
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

      {/* Staff list */}
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
    { key: 'allowed_region_ids', label: t.allowedDistricts, type: 'text' },
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
          <div className="text-sm text-green-600">{result.sent} ta foydalanuvchiga yuborildi</div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: any; color: string }) {
  return (
    <Card className="p-3.5 border-0 shadow-sm flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${color} text-white flex items-center justify-center shrink-0`}>{icon}</div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="font-bold text-lg leading-tight">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      </div>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <div className="text-5xl mb-3">📭</div>
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
      <div className="text-center space-y-3">
        <div className="text-6xl">🚫</div>
        <h2 className="text-xl font-bold">Ruxsat yo'q</h2>
        <p className="text-slate-500 text-sm">Siz admin emassiz</p>
      </div>
    </div>
  );
}
