import { useState } from 'react';
import { useOrderStore } from '../../store/useOrderStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useCreateOrder, useListServices, useGetPublicSettings, useListDistricts } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export function Step8Confirmation({ onConfirm, onCancel }: Props) {
  const { t, lang } = useTranslation();
  const orderState = useOrderStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: services } = useListServices();
  const { data: settings } = useGetPublicSettings();
  const { data: districts } = useListDistricts();

  const { mutate: createOrder, isPending } = useCreateOrder();

  const service = services?.find(s => s.id === orderState.serviceId);
  const district = districts?.find(d => d.id === orderState.districtId);

  const serviceName = service
    ? lang === 'uz' ? service.nameUz : lang === 'ru' ? service.nameRu : service.nameEn
    : '';
  const districtName = district
    ? lang === 'uz' ? district.nameUz : lang === 'ru' ? district.nameRu : district.nameEn
    : '';

  const basePrice = service?.price ?? settings?.servicePrice ?? 0;
  const extraFee = orderState.pickupSlot ? (service?.extraPickupPrice ?? settings?.pickupExtra ?? 0) : 0;
  const total = basePrice + extraFee;

  const handleConfirm = () => {
    setErrorMsg(null);

    let tgUser: { id?: number; username?: string } | undefined;
    try {
      // @ts-ignore
      tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    } catch (_) {}

    const telegramUserId = tgUser?.id ?? Math.floor(Math.random() * 900000) + 100000;

    createOrder(
      {
        data: {
          telegramUserId,
          telegramUsername: tgUser?.username ?? null,
          lang: lang as 'uz' | 'ru' | 'en',
          patientType: orderState.patientType as 'adult' | 'child',
          patientName: orderState.patientName,
          patientAge: Number(orderState.patientAge) || 0,
          patientGender: orderState.patientGender as 'male' | 'female',
          serviceId: orderState.serviceId!,
          childTiming: orderState.childTiming ?? null,
          usesDiaper: orderState.usesDiaper ?? null,
          complaints: orderState.complaints,
          customComplaint: orderState.customComplaint || null,
          deliverySlot: orderState.deliverySlot ?? orderState.pickupSlot ?? 'not-selected',
          pickupSlot: orderState.pickupSlot ?? null,
          districtId: orderState.districtId!,
          latitude: orderState.latitude!,
          longitude: orderState.longitude!,
          addressNote: orderState.addressNote || null,
        },
      },
      {
        onSuccess: (data) => {
          try {
            // @ts-ignore
            if (window.Telegram?.WebApp?.sendData) {
              // @ts-ignore
              window.Telegram.WebApp.sendData(JSON.stringify({ orderId: data.orderId }));
            }
          } catch (_) {}
          onConfirm();
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Xatolik yuz berdi. Qayta urinib ko\'ring.';
          setErrorMsg(msg);
        },
      }
    );
  };

  return (
    <div className="space-y-5 pb-8">
      <h2 className="text-xl font-semibold text-center text-foreground">📄 Ma'lumotlarni tekshiring</h2>

      <Card className="p-4 space-y-3">
        <Row label={t('patient')} value={`${orderState.patientName}, ${orderState.patientAge} yosh (${orderState.patientType === 'adult' ? t('adult') : t('child')})`} />
        <Separator />
        <Row label={t('service')} value={serviceName} />
        <Separator />
        <Row
          label={t('complaints')}
          value={[...orderState.complaints, orderState.customComplaint].filter(Boolean).join(', ') || '—'}
        />
        <Separator />
        <Row
          label={t('delivery')}
          value={orderState.pickupSlot ? `Pickup: ${orderState.pickupSlot}` : orderState.deliverySlot ?? '—'}
        />
        <Separator />
        <Row label={t('address')} value={[districtName, orderState.addressNote].filter(Boolean).join(' – ')} />

        <div className="pt-2 border-t space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('price')}</span>
            <span>{basePrice.toLocaleString()} UZS</span>
          </div>
          {extraFee > 0 && (
            <div className="flex justify-between text-sm text-amber-600">
              <span>{t('extraFee')}</span>
              <span>+{extraFee.toLocaleString()} UZS</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-1 border-t">
            <span>{t('total')}</span>
            <span className="text-primary">{total.toLocaleString()} UZS</span>
          </div>
        </div>
      </Card>

      {errorMsg && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive text-center">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-13 text-base rounded-xl"
          onClick={onCancel}
          disabled={isPending}
        >
          ❌ {t('cancelOrder')}
        </Button>
        <Button
          className="h-13 text-base rounded-xl"
          onClick={handleConfirm}
          disabled={isPending}
        >
          {isPending ? '⏳ Yuborilmoqda...' : `✅ ${t('confirmOrder')}`}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-medium text-sm leading-snug">{value}</div>
    </div>
  );
}
