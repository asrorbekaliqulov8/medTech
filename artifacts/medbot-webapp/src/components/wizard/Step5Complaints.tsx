import { useOrderStore } from '../../store/useOrderStore';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';

interface Props {
  onNext: () => void;
}

const ADULT_COMPLAINTS = [
  "Ich qotishi", "Ich ketishi", "Qorin dam", "Qorin og'rig'i",
  "Ko'ngil aynishi", "Ishtaha pasayishi", "Vazn yo'qotish",
  "Axlatda qon", "Parazit gumoni", "Allergiya",
];

const CHILD_COMPLAINTS = [
  "Ich qotishi", "Ich ketishi", "Qorin og'rig'i", "Qorin dam",
  "Ko'ngil aynishi", "Ishtaha yo'qligi", "Holsizlik",
  "Axlatda qon", "Parazit gumoni", "Allergiya",
];

export function Step5Complaints({ onNext }: Props) {
  const { t, lang } = useTranslation();
  const { updateField, complaints, customComplaint, patientType } = useOrderStore();
  const isChild = patientType === 'child';

  const COMPLAINTS = isChild ? CHILD_COMPLAINTS : ADULT_COMPLAINTS;

  const warmTitle = isChild
    ? (lang === 'ru' ? 'Что беспокоит вашего малыша? 💙'
      : lang === 'en' ? "What is bothering your little one? 💙"
      : "Bolangizni nima bezovta qilayabdi? 💙")
    : `🩺 ${t('complaintsTitle')}`;

  const warmHint = isChild
    ? (lang === 'ru' ? 'Отметьте все наблюдаемые симптомы'
      : lang === 'en' ? 'Select all the symptoms you have noticed'
      : "Kuzatgan barcha belgilarni belgilang")
    : null;

  const handleToggle = (complaint: string) => {
    if (complaints.includes(complaint)) {
      updateField('complaints', complaints.filter(c => c !== complaint));
    } else {
      updateField('complaints', [...complaints, complaint]);
    }
  };

  const isValid = complaints.length > 0 || customComplaint.trim().length > 0;

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">{warmTitle}</h2>
        {warmHint && <p className="text-sm text-muted-foreground">{warmHint}</p>}
      </motion.div>

      <div className="grid gap-2.5 max-h-[44vh] overflow-y-auto px-0.5 pb-1">
        {COMPLAINTS.map((complaint, i) => {
          const isChecked = complaints.includes(complaint);
          return (
            <motion.div key={complaint} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <div
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  isChecked ? 'bg-primary/5 border-primary/50 shadow-sm' : 'hover:bg-muted/40 border-border'
                }`}
                onClick={() => handleToggle(complaint)}
              >
                <Checkbox
                  id={`c-${complaint}`}
                  checked={isChecked}
                  onCheckedChange={() => handleToggle(complaint)}
                  className="pointer-events-none"
                />
                <Label htmlFor={`c-${complaint}`} className="flex-1 cursor-pointer font-medium text-sm leading-tight">
                  {isChild ? `👶 ${complaint}` : complaint}
                </Label>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="space-y-2 pt-1">
        <Label htmlFor="customComplaint" className="text-sm font-medium">
          ✍️ {t('otherComplaints')}
        </Label>
        <Input
          id="customComplaint"
          placeholder={isChild
            ? (lang === 'ru' ? 'Другие симптомы...' : lang === 'en' ? 'Other symptoms...' : 'Boshqa belgilar...')
            : '...'}
          value={customComplaint}
          onChange={e => updateField('customComplaint', e.target.value)}
          className="h-12 rounded-xl"
        />
      </div>

      <Button className="w-full h-14 text-lg rounded-2xl font-semibold" onClick={onNext} disabled={!isValid}>
        ▶️ {t('continue')}
      </Button>
    </div>
  );
}
