import { getStoredAuth } from '@/lib/auth';

export type Lang = 'uz' | 'ru' | 'en';

export function useStaffAuth() {
  const params = new URLSearchParams(window.location.search);

  // 1) URL param (Telegram WebApp button opens with ?tg_id=X&lang=uz)
  let tgId = Number(params.get('tg_id')) || 0;
  let rawLang = params.get('lang') ?? '';

  // 2) Telegram WebApp initData
  if (!tgId) {
    // @ts-ignore
    tgId = (window.Telegram?.WebApp?.initDataUnsafe?.user?.id as number | undefined) || 0;
  }

  // 3) SessionStorage (browser login)
  const stored = getStoredAuth();
  if (!tgId && stored?.tgId) {
    tgId = stored.tgId;
  }
  if (!rawLang && stored?.lang) {
    rawLang = stored.lang;
  }

  const lang: Lang = rawLang === 'ru' ? 'ru' : rawLang === 'en' ? 'en' : 'uz';
  return { tgId, lang, storedRole: stored?.role ?? null };
}
