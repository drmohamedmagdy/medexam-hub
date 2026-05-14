// One-shot Telegram test post to confirm the bot + channel are wired up.
// Self-contained: takes the bot token + channel id as args, hits the
// Telegram Bot API directly, prints the result. No env file needed.
//
// Usage:
//   npx tsx scripts/test-telegram-post.ts <BOT_TOKEN> <CHANNEL_ID>
//
// Example:
//   npx tsx scripts/test-telegram-post.ts 8817831695:AAG... @MedExamHub

async function main() {
  const token = process.argv[2];
  const channel = process.argv[3];
  if (!token || !channel) {
    console.error("Usage: npx tsx scripts/test-telegram-post.ts <BOT_TOKEN> <CHANNEL_ID>");
    process.exit(1);
  }

  const text = [
    "🚀 <b>MedExam Hub channel is live</b>",
    "",
    "Daily AI-generated medical exam questions start <b>tomorrow at 12 PM Cairo time</b>.",
    "MRCP, MRCS, USMLE, Egyptian Boards.",
    "",
    "👉 medexamhub.org · use code <code>STUDY30</code> for 30% off any plan.",
  ].join("\n");

  const body = {
    chat_id: channel,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Try MedExam Hub →", url: "https://medexamhub.org" },
          { text: "Sign up free", url: "https://medexamhub.org/signup" },
        ],
      ],
    },
  };

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    ok?: boolean;
    description?: string;
    result?: { message_id?: number; chat?: { title?: string; username?: string } };
  };

  if (!res.ok || !json.ok) {
    console.error(`✗ Telegram API rejected (${res.status}):`, json.description);
    console.error("\nFull response:", JSON.stringify(json, null, 2));
    process.exit(1);
  }

  console.log("✓ Posted successfully!");
  console.log("");
  console.log(`  Channel:    ${json.result?.chat?.title ?? "?"} (@${json.result?.chat?.username ?? "?"})`);
  console.log(`  Message ID: ${json.result?.message_id}`);
  console.log(`  Open it:    https://t.me/${json.result?.chat?.username}/${json.result?.message_id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
