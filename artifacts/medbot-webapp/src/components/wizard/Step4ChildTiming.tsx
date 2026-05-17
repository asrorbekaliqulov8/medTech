import { useOrderStore } from '../../store/useOrderStore';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface Props {
  onNext: () => void;
}

export function Step4ChildTiming({ onNext }: Props) {
  const { t, lang } = useTranslation();
  const { updateField, childTiming, usesDiaper } = useOrderStore();

  const timings = [
    { id: 'morning', emoji: '🌅', label: t('morning') },
    { id: 'day',     emoji: '☀️', label: t('day') },
    { id: 'evening', emoji: '🌙', label: t('evening') },
    { id: 'irregular', emoji: '🔄', label: t('irregular') },
  ];

  const isValid = childTiming !== null && usesDiaper !== null;

  const warmTitle =
    lang === 'ru' ? 'Когда ваш малыш обычно ходит в туалет? 🌸'
    : lang === 'en' ? 'When does your little one usually go? 🌸'
    : 'Farzandingiz odatda qachon hojatga boradi? 🌸';

  const warmHint =
    lang === 'ru' ? 'Это поможет нам приехать в удобное время'
    : lang === 'en' ? 'This helps us arrive at the most convenient time'
    : 'Bu bizga qulay vaqtda kelishimizga yordam beradi 💙';

  const diaperQ =
    lang === 'ru' ? 'Использует ли малыш подгузники? 🧷'
    : lang === 'en' ? 'Does your little one use diapers? 🧷'
    : 'Farzandingiz taglik ishlataydimi? 🧷';

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-1.5 pt-2">
        <h2 className="text-xl font-bold text-foreground">{warmTitle}</h2>
        <p className="text-sm text-muted-foreground">{warmHint}</p>
      </motion.div>

      <div className="grid gap-3">
        {timings.map((timing, i) => (
          <motion.div key={timing.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
            <Card
              className={`p-4 cursor-pointer transition-all active:scale-[0.98] flex items-center gap-4 rounded-2xl ${
                childTiming === timing.id
                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                  : 'hover:border-primary/40 hover:bg-muted/30'
              }`}
              onClick={() => updateField('childTiming', timing.id)}
            >
              <span className="text-2xl">{timing.emoji}</span>
              <span className="font-medium flex-1">{timing.label}</span>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                childTiming === timing.id ? 'border-primary bg-primary' : 'border-muted-foreground/30'
              }`}>
                {childTiming === timing.id && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {childTiming && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-4 border-t">
          <h3 className="text-lg font-semibold text-center">{diaperQ}</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant={usesDiaper === true ? 'default' : 'outline'}
              className="h-14 text-base rounded-2xl" onClick={() => updateField('usesDiaper', true)}>
              😊 {t('yes')}
            </Button>
            <Button type="button" variant={usesDiaper === false ? 'default' : 'outline'}
              className="h-14 text-base rounded-2xl" onClick={() => updateField('usesDiaper', false)}>
              🙅 {t('no')}
            </Button>
          </div>
        </motion.div>
      )}

      <div className="pt-2">
        <Button className="w-full h-14 text-lg rounded-2xl font-semibold" onClick={onNext} disabled={!isValid}>
          ▶️ {t('continue')}
        </Button>
      </div>
    </div>
  );
}
