import { useOrderStore } from '../../store/useOrderStore';
import { useTranslation } from '../../hooks/useTranslation';
import { Card } from '@/components/ui/card';

interface Props {
  onNext: () => void;
}

export function Step6Delivery({ onNext }: Props) {
  const { t } = useTranslation();
  const { updateField, patientType, childTiming, pickupSlot } = useOrderStore();

  const handleSelect = (slot: string) => {
    updateField('pickupSlot', slot);
    updateField('deliverySlot', null);
    onNext();
  };

  let title = `🚚 ${t('pickupTimeTitle')}`;
  let options: { id: string; label: string }[] = [];

  if (patientType === 'adult') {
    options = [
      { id: '18:00-20:00', label: '18:00–20:00' },
      { id: '20:00-22:00', label: '20:00–22:00' },
    ];
  } else {
    if (childTiming === 'irregular') {
      options = [
        { id: 'pickup_call', label: `📞 ${t('pickupCall')}` },
      ];
    } else if (childTiming === 'morning') {
      options = [
        { id: '07:00-10:00', label: '07:00–10:00' },
      ];
    } else if (childTiming === 'day') {
      options = [
        { id: '12:00-15:00', label: '12:00–15:00' },
        { id: '15:00-18:00', label: '15:00–18:00' },
      ];
    } else if (childTiming === 'evening') {
      options = [
        { id: '15:00-18:00', label: '15:00–18:00' },
        { id: '18:00-20:00', label: '18:00–20:00' },
      ];
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-center mb-6 text-foreground">{title}</h2>

      <div className="grid gap-3">
        {options.map((opt) => {
          const isSelected = pickupSlot === opt.id;

          return (
            <Card
              key={opt.id}
              className={`p-5 cursor-pointer transition-all active:scale-[0.98] flex items-center justify-between ${
                isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/50'
              }`}
              onClick={() => handleSelect(opt.id)}
            >
              <span className="font-medium text-lg">{opt.label}</span>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                isSelected ? 'border-primary' : 'border-muted-foreground/30'
              }`}>
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
