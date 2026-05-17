const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function tgSendMessage(chatId: number, text: string): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`${TG_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (_) {}
}

export async function tgSendDocument(
  chatId: number,
  fileBuffer: Buffer,
  filename: string,
  caption?: string,
): Promise<{ ok: boolean; result?: { document?: { file_id?: string } } } | null> {
  if (!BOT_TOKEN) return null;
  try {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("document", new Blob([fileBuffer]), filename);
    if (caption) {
      form.append("caption", caption);
      form.append("parse_mode", "HTML");
    }
    const resp = await fetch(`${TG_API}/sendDocument`, { method: "POST", body: form });
    return (await resp.json()) as { ok: boolean };
  } catch (_) {
    return null;
  }
}

export async function tgSendPhoto(
  chatId: number,
  fileBuffer: Buffer,
  caption?: string,
): Promise<{ ok: boolean } | null> {
  if (!BOT_TOKEN) return null;
  try {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("photo", new Blob([fileBuffer]), "result.jpg");
    if (caption) {
      form.append("caption", caption);
      form.append("parse_mode", "HTML");
    }
    const resp = await fetch(`${TG_API}/sendPhoto`, { method: "POST", body: form });
    return (await resp.json()) as { ok: boolean };
  } catch (_) {
    return null;
  }
}
