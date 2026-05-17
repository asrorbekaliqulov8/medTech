import { type ReactNode } from 'react';

export function TelegramGuard({ children }: { children: ReactNode }) {
  // @ts-ignore
  const initData: string = window.Telegram?.WebApp?.initData ?? '';
  if (!initData) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center p-8 bg-background">
        <div className="text-center space-y-4 max-w-xs">
          <div className="text-7xl">🔒</div>
          <h2 className="text-xl font-bold text-foreground">Faqat Telegram orqali</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Bu sahifa faqat Telegram ilovasidan ochilishi mumkin. Iltimos, bot orqali kiring.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
