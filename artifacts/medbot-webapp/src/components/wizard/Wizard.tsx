import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Step1Service } from './Step1Service';
import { Step2PatientType } from './Step2PatientType';
import { Step3PatientInfo } from './Step3PatientInfo';
import { Step4ChildTiming } from './Step4ChildTiming';
import { Step5Complaints } from './Step5Complaints';
import { Step6Delivery } from './Step6Delivery';
import { Step7Location } from './Step7Location';
import { Step8Confirmation } from './Step8Confirmation';
import { useOrderStore } from '../../store/useOrderStore';
import { useTranslation } from '../../hooks/useTranslation';

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
};

export function Wizard() {
  const { t } = useTranslation();
  const { patientType } = useOrderStore();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    try {
      // @ts-ignore
      if (window.Telegram?.WebApp) {
        // @ts-ignore
        window.Telegram.WebApp.ready();
        // @ts-ignore
        window.Telegram.WebApp.expand();
      }
    } catch (_) {}
  }, []);

  const totalSteps = patientType === 'child' ? 7 : 6;
  const displayStep = step > 4 && patientType === 'adult' ? step - 1 : step;
  const currentProgress = step < 8 ? ((displayStep - 1) / totalSteps) * 100 : 100;

  const nextStep = () => {
    setDirection(1);
    if (step === 3 && patientType === 'adult') {
      setStep(5);
    } else {
      setStep(s => s + 1);
    }
  };

  const prevStep = () => {
    setDirection(-1);
    if (step === 5 && patientType === 'adult') {
      setStep(3);
    } else {
      setStep(s => s - 1);
    }
  };

  const handleConfirm = () => {
    setIsSuccess(true);
    setTimeout(() => {
      try {
        // @ts-ignore
        window.Telegram?.WebApp?.close();
      } catch (_) {}
    }, 3000);
  };

  if (isSuccess) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center p-6 bg-primary/5">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-5xl mb-6 shadow-xl"
        >
          ✓
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-center"
        >
          {t('orderSuccess')}
        </motion.h2>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background max-w-md mx-auto">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-2 bg-background z-10">
        <div className="flex items-center mb-3">
          {step > 1 && step < 8 && (
            <button
              onClick={prevStep}
              className="p-2 -ml-2 rounded-full active:bg-muted text-muted-foreground"
            >
              ← Orqaga
            </button>
          )}
          <div className="flex-1 text-center text-sm font-medium text-muted-foreground">
            {step < 8 && `Qadam ${displayStep} / ${totalSteps}`}
          </div>
        </div>
        {step < 8 && <Progress value={currentProgress} className="h-1.5" />}
      </div>

      {/* Animated content — overflow-hidden clips the sliding panels */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-0 overflow-y-auto px-4 py-3"
          >
            {step === 1 && <Step1Service onNext={nextStep} />}
            {step === 2 && <Step2PatientType onNext={nextStep} />}
            {step === 3 && <Step3PatientInfo onNext={nextStep} />}
            {step === 4 && <Step4ChildTiming onNext={nextStep} />}
            {step === 5 && <Step5Complaints onNext={nextStep} />}
            {step === 6 && <Step6Delivery onNext={nextStep} />}
            {step === 7 && <Step7Location onNext={nextStep} />}
            {step === 8 && <Step8Confirmation onConfirm={handleConfirm} onCancel={prevStep} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
