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
  
  const { data: services } = useListServices();
  const { data: settings } = useGetPublicSettings();
  const { data: districts } = useListDistricts();
  
  const { mutate: createOrder, isPending } = useCreateOrder();

  const service = services?.find(s => s.id === orderState.serviceId);
  const district = districts?.find(d => d.id === orderState.districtId);
  
  const serviceName = service ? (lang === 'uz' ? service.nameUz : lang === 'ru' ? service.nameRu : service.nameEn) : '';
  const districtName = district ? (lang === 'uz' ? district.nameUz : lang === 'ru' ? district.nameRu : district.nameEn) : '';
  
  const basePrice = service?.price || settings?.servicePrice || 0;
  const extraFee = orderState.pickupSlot ? (service?.extraPickupPrice || settings?.pickupExtra || 0) : 0;
  const total = basePrice + extraFee;

  const handleConfirm = () => {
    let tgUser = undefined;
    try {
      // @ts-ignore
      tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    } catch(e) {}

    createOrder({
      data: {
        telegramUserId: tgUser?.id || Math.floor(Math.random() * 100000),
        telegramUsername: tgUser?.username || null,
        lang: lang,
        patientType: orderState.patientType as any,
        patientName: orderState.patientName,
        patientAge: Number(orderState.patientAge),
        patientGender: orderState.patientGender as any,
        serviceId: orderState.serviceId!,
        childTiming: orderState.childTiming,
        usesDiaper: orderState.usesDiaper,
        complaints: orderState.complaints,
        customComplaint: orderState.customComplaint,
        deliverySlot: orderState.deliverySlot || '',
        pickupSlot: orderState.pickupSlot,
        districtId: orderState.districtId!,
        latitude: orderState.latitude!,
        longitude: orderState.longitude!,
        addressNote: orderState.addressNote
      }
    }, {
      onSuccess: (data) => {
        try {
          // @ts-ignore
          if (window.Telegram?.WebApp) {
            // @ts-ignore
            window.Telegram.WebApp.sendData(JSON.stringify({ orderId: data.id }));
          }
        } catch(e) {}
        onConfirm();
      }
    });
  };

  return (
    <div className="space-y-6 pb-6">
      <h2 className="text-xl font-semibold text-center text-foreground">📄 Ma'lumotlarni tekshiring</h2>
      
      <Card className="p-5 space-y-4">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">{t('patient')}</div>
          <div className="font-medium">{orderState.patientName}, {orderState.patientAge} yosh ({orderState.patientType === 'adult' ? t('adult') : t('child')})</div>
        </div>
        
        <Separator />
        
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">{t('service')}</div>
          <div className="font-medium">{serviceName}</div>
        </div>
        
        <Separator />
        
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">{t('complaints')}</div>
          <div className="font-medium">
            {orderState.complaints.join(', ')}
            {orderState.customComplaint && orderState.complaints.length > 0 ? ', ' : ''}
            {orderState.customComplaint}
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">{t('delivery')}</div>
          <div className="font-medium">
            {orderState.pickupSlot ? `Pickup: ${orderState.pickupSlot}` : `Yetkazib berish: ${orderState.deliverySlot}`}
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">{t('address')}</div>
          <div className="font-medium">
            {districtName} {orderState.addressNote && `- ${orderState.addressNote}`}
          </div>
        </div>
        
        <Separator className="my-4 border-2 border-dashed border-muted" />
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('price')}</span>
            <span>{basePrice.toLocaleString()} UZS</span>
          </div>
          {extraFee > 0 && (
            <div className="flex justify-between text-sm text-amber-600">
              <span>{t('extraFee')} (Pickup)</span>
              <span>+{extraFee.toLocaleString()} UZS</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>{t('total')}</span>
            <span className="text-primary">{total.toLocaleString()} UZS</span>
          </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          className="h-14 text-lg rounded-xl"
          onClick={onCancel}
          disabled={isPending}
        >
          ❌ {t('cancelOrder')}
        </Button>
        <Button 
          className="h-14 text-lg rounded-xl"
          onClick={handleConfirm}
          disabled={isPending}
        >
          {isPending ? '⏳...' : `✅ ${t('confirmOrder')}`}
        </Button>
      </div>
    </div>
  );
}
