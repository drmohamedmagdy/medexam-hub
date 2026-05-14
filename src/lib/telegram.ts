import "server-only";

// Minimal Telegram Bot API client. Pure fetch — no SDK, no auth flows.
// Used for:
//   - Daily QOTD auto-post to our public channel (src/app/api/cron/daily)
//   - Manual admin broadcasts (src/app/admin/broadcast)
//
// Setup (operator-side):
//   1. @BotFather → /newbot → save the token.
//   2. Create a public channel, add the bot as admin with Post Messages.
//   3. Set Vercel env vars TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL_ID
//      (the latter is "@channelusername" with the leading @).

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);
}

type SendMessageArgs = {
  /** Markdown- or HTML-formatted text. Set parseMode to match. */
  text: string;
  /** "HTML" lets us use <b>, <i>, <a href>, <code>. Telegram is strict
   *  about closing tags; bad markup will 400. */
  parseMode?: "HTML" | "MarkdownV2";
  /** Optional photo URL — if set, we send a photo with `text` as the caption
   *  (which has a 1024-char limit, not 4096). */
  photoUrl?: string;
  /** Disable the link preview that Telegram normally fetches for the first
   *  URL in the message. Useful when we have our own image. */
  disablePreview?: boolean;
  /** Optional inline reply markup: list of buttons that open URLs. */
  inlineButtons?: Array<{ text: string; url: string }>;
  /** Override the default channel — admin broadcast leaves this null. */
  chatId?: string;
};

export type TelegramResult =
  | { ok: true; messageId: number }
  | { ok: false; error: string };

const API_BASE = "https://api.telegram.org";

/**
 * Send a text or photo message to the configured channel (or any chatId).
 * Returns {ok: true, messageId} on success, {ok: false, error} otherwise.
 * Never throws — callers can fire-and-forget without try/catch.
 */
export async function sendTelegramMessage(args: SendMessageArgs): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channel = args.chatId ?? process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !channel) {
    return { ok: false, error: "Telegram not configured (missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID)" };
  }

  const replyMarkup = args.inlineButtons && args.inlineButtons.length > 0
    ? { inline_keyboard: [args.inlineButtons.map((b) => ({ text: b.text, url: b.url }))] }
    : undefined;

  // Photo path — different endpoint and the text becomes the caption.
  if (args.photoUrl) {
    const body = {
      chat_id: channel,
      photo: args.photoUrl,
      caption: args.text.slice(0, 1024),
      parse_mode: args.parseMode ?? "HTML",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    };
    const res = await fetch(`${API_BASE}/bot${token}/sendPhoto`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return parseResult(res);
  }

  const body = {
    chat_id: channel,
    text: args.text.slice(0, 4096),
    parse_mode: args.parseMode ?? "HTML",
    ...(args.disablePreview ? { disable_web_page_preview: true } : {}),
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  };
  const res = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResult(res);
}

async function parseResult(res: Response): Promise<TelegramResult> {
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: `Telegram returned non-JSON (${res.status})` };
  }
  const obj = json as { ok?: boolean; description?: string; result?: { message_id?: number } };
  if (!res.ok || !obj.ok) {
    return {
      ok: false,
      error: obj.description ?? `HTTP ${res.status}`,
    };
  }
  return { ok: true, messageId: obj.result?.message_id ?? 0 };
}

/**
 * Escape a string for safe HTML insertion. Telegram's HTML parse mode
 * only requires &, <, > to be escaped (no other entities).
 */
export function escapeTelegramHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
