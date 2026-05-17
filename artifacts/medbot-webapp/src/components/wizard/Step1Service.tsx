import { useOrderStore } from '../../store/useOrderStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useListServices } from '@workspace/api-client-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  onNext: () => void;
}

export function Step1Service({ onNext }: Props) {
  const { t, lang } = useTranslation();
  const { updateField, serviceId } = useOrderStore();
  const { data: services, isLoading } = useListServices();

  const handleSelect = (id: string) => {
    updateField('serviceId', id);
    onNext();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-center mb-6 text-foreground">{t('serviceSelectionTitle')}</h2>
      
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-4">
          {services?.map((service) => {
            const name = lang === 'uz' ? service.nameUz : lang === 'ru' ? service.nameRu : service.nameEn;
            
            return (
              <Card 
                key={service.id}
                className={`p-5 cursor-pointer transition-all active:scale-[0.98] ${
                  serviceId === service.id 
                    ? 'border-primary bg-primary/5 shadow-sm' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleSelect(service.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                    🦠
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-lg leading-tight">{name}</h3>
                    <p className="text-muted-foreground mt-1 font-medium">{service.price.toLocaleString()} UZS</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
