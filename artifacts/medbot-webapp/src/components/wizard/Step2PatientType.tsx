import { useOrderStore } from '../../store/useOrderStore';
import { useTranslation } from '../../hooks/useTranslation';
import { Card } from '@/components/ui/card';

interface Props {
  onNext: () => void;
}

export function Step2PatientType({ onNext }: Props) {
  const { t } = useTranslation();
  const { updateField, patientType } = useOrderStore();

  const handleSelect = (type: 'adult' | 'child') => {
    updateField('patientType', type);
    onNext();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-center mb-6 text-foreground">👥 {t('whoIsPatient')}</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <Card 
          className={`p-6 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all active:scale-[0.98] ${
            patientType === 'adult' ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/50'
          }`}
          onClick={() => handleSelect('adult')}
        >
          <div className="text-5xl">🧑</div>
          <span className="font-medium text-lg">{t('adult')}</span>
        </Card>
        
        <Card 
          className={`p-6 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all active:scale-[0.98] ${
            patientType === 'child' ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/50'
          }`}
          onClick={() => handleSelect('child')}
        >
          <div className="text-5xl">👶</div>
          <span className="font-medium text-lg">{t('child')}</span>
        </Card>
      </div>
    </div>
  );
}
