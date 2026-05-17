import { useOrderStore } from '../../store/useOrderStore';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface Props {
  onNext: () => void;
}

const COMMON_COMPLAINTS = [
  "Ich qotishi", "Ich ketishi", "Qorin dam", "Qorin og'rig'i", 
  "Ko'ngil aynishi", "Ishtaha pasayishi", "Vazn yo'qotish", 
  "Axlatda qon", "Parazit gumoni", "Allergiya"
];

export function Step5Complaints({ onNext }: Props) {
  const { t } = useTranslation();
  const { updateField, complaints, customComplaint } = useOrderStore();

  const handleToggle = (complaint: string) => {
    if (complaints.includes(complaint)) {
      updateField('complaints', complaints.filter(c => c !== complaint));
    } else {
      updateField('complaints', [...complaints, complaint]);
    }
  };

  const isValid = complaints.length > 0 || customComplaint.trim().length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-center mb-4 text-foreground">🩺 {t('complaintsTitle')}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto p-1">
        {COMMON_COMPLAINTS.map((complaint) => {
          const isChecked = complaints.includes(complaint);
          return (
            <div 
              key={complaint}
              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                isChecked ? 'bg-primary/5 border-primary/50' : 'hover:bg-muted/50'
              }`}
              onClick={() => handleToggle(complaint)}
            >
              <Checkbox 
                id={`complaint-${complaint}`} 
                checked={isChecked}
                onCheckedChange={() => handleToggle(complaint)}
                className="pointer-events-none"
              />
              <Label 
                htmlFor={`complaint-${complaint}`}
                className="flex-1 cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {complaint}
              </Label>
            </div>
          );
        })}
      </div>
      
      <div className="space-y-2 pt-2">
        <Label htmlFor="customComplaint">✍️ {t('otherComplaints')}</Label>
        <Input 
          id="customComplaint"
          placeholder="..."
          value={customComplaint}
          onChange={(e) => updateField('customComplaint', e.target.value)}
          className="h-12"
        />
      </div>
      
      <div className="pt-2">
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
