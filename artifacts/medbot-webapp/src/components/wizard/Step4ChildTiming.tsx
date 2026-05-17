import { useOrderStore } from '../../store/useOrderStore';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  onNext: () => void;
}

export function Step4ChildTiming({ onNext }: Props) {
  const { t } = useTranslation();
  const { updateField, childTiming, usesDiaper } = useOrderStore();

  const timings = [
    { id: 'morning', label: `🌅 ${t('morning')}` },
    { id: 'day', label: `☀️ ${t('day')}` },
    { id: 'evening', label: `🌙 ${t('evening')}` },
    { id: 'irregular', label: `❓ ${t('irregular')}` },
  ];

  const isValid = childTiming !== null && usesDiaper !== null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-center mb-4 text-foreground">{t('childTimingTitle')}</h2>
      
      <div className="grid gap-3">
        {timings.map((timing) => (
          <Card 
            key={timing.id}
            className={`p-4 cursor-pointer transition-all active:scale-[0.98] flex items-center justify-between ${
              childTiming === timing.id ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/50'
            }`}
            onClick={() => updateField('childTiming', timing.id)}
          >
            <span className="font-medium">{timing.label}</span>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              childTiming === timing.id ? 'border-primary' : 'border-muted-foreground/30'
            }`}>
              {childTiming === timing.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
          </Card>
        ))}
      </div>
      
      {childTiming && (
        <div className="space-y-4 pt-4 border-t animate-in fade-in slide-in-from-bottom-2">
          <h3 className="text-lg font-medium text-center">🧷 {t('usesDiaper')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={usesDiaper === true ? 'default' : 'outline'}
              className="h-14 text-lg"
              onClick={() => updateField('usesDiaper', true)}
            >
              {t('yes')}
            </Button>
            <Button
              type="button"
              variant={usesDiaper === false ? 'default' : 'outline'}
              className="h-14 text-lg"
              onClick={() => updateField('usesDiaper', false)}
            >
              {t('no')}
            </Button>
          </div>
        </div>
      )}
      
      <div className="pt-4">
        <Button 
          className="w-full h-14 text-lg rounded-xl" 
          onClick={onNext}
          disabled={!isValid}
        >
          ▶️ {t('continue')}
        </Button>
      </div>
    </div>
  );
}
