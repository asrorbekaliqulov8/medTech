import { useOrderStore } from '../../store/useOrderStore';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  onNext: () => void;
}

export function Step3PatientInfo({ onNext }: Props) {
  const { t } = useTranslation();
  const { updateField, patientName, patientAge, patientGender } = useOrderStore();

  const isValid = patientName.trim().length > 2 && patientAge !== '' && patientGender !== null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-center mb-2 text-foreground">📋 {t('patient')}</h2>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="patientName">{t('fullName')}</Label>
          <Input 
            id="patientName"
            placeholder="Alisher Haitmirzayev"
            value={patientName}
            onChange={(e) => updateField('patientName', e.target.value)}
            className="h-12"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="patientAge">{t('age')}</Label>
          <Input 
            id="patientAge"
            type="number"
            min="0"
            max="120"
            placeholder="25"
            value={patientAge}
            onChange={(e) => updateField('patientAge', e.target.value ? Number(e.target.value) : '')}
            className="h-12"
          />
        </div>
        
        <div className="space-y-2">
          <Label>{t('gender')}</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={patientGender === 'male' ? 'default' : 'outline'}
              className="h-12 text-base"
              onClick={() => updateField('patientGender', 'male')}
            >
              👨 {t('male')}
            </Button>
            <Button
              type="button"
              variant={patientGender === 'female' ? 'default' : 'outline'}
              className="h-12 text-base"
              onClick={() => updateField('patientGender', 'female')}
            >
              👩 {t('female')}
            </Button>
          </div>
        </div>
      </div>
      
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
