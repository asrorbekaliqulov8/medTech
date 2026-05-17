export type Lang = 'uz' | 'ru' | 'en';

export function useStaffAuth() {
  const params = new URLSearchParams(window.location.search);
  const tgId =
    Number(params.get('tg_id')) ||
    // @ts-ignore
    (window.Telegram?.WebApp?.initDataUnsafe?.user?.id as number | undefined) ||
    0;
  const rawLang = params.get('lang') ?? 'uz';
  const lang: Lang = rawLang === 'ru' ? 'ru' : rawLang === 'en' ? 'en' : 'uz';
  return { tgId, lang };
}
