"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | string;
  content: string;
  createdAt: string;
};

const SUGGESTED_PROMPTS = [
  "Why is the correct answer right?",
  "Explain the pathophysiology",
  "Give me 2 similar variants",
  "What are common pitfalls examiners test here?",
];

export default function TutorChatPanel({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Lazy-load chat history the first time the panel is opened.
  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/tutor/${questionId}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("history load failed");
        const data = (await res.json()) as { messages: ChatMessage[] };
        if (!cancelled) {
          setMessages(data.messages);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loaded, questionId]);

  useEffect(() => {
    if (!open) return;
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  async function send(prompt?: string) {
    const text = (prompt ?? draft).trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((cur) => [...cur, tempUserMsg]);
    setDraft("");

    try {
      const res = await fetch(`/api/tutor/${questionId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Tutor request failed");
      }
      setMessages((cur) => [...cur, data.message as ChatMessage]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Tutor request failed";
      setError(msg);
      // Roll back the optimistic user message so they can retry.
      setMessages((cur) => cur.filter((m) => m.id !== tempUserMsg.id));
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-3 print:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
        >
          💬 Ask the tutor
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-violet-300 bg-violet-50/60 p-3 dark:border-violet-700/60 dark:bg-violet-950/30 print:hidden">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-300">
          💬 Tutor
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-violet-700 hover:underline dark:text-violet-300"
        >
          Close
        </button>
      </div>

      <div
        ref={scrollerRef}
        className="mt-2 max-h-72 overflow-y-auto rounded-md bg-white p-2 dark:bg-zinc-900"
      >
        {messages.length === 0 ? (
          <div className="px-1 py-2 text-xs text-zinc-500">
            Ask anything about this question. The tutor sees the prompt,
            options, correct answer and explanation.
          </div>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-violet-600 text-white"
                      : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  {m.content}
                </div>
              </li>
            ))}
            {sending && (
              <li className="flex justify-start">
                <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  Thinking…
                </div>
              </li>
            )}
          </ul>
        )}
      </div>

      {messages.length === 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => send(p)}
              disabled={sending}
              className="rounded-full border border-violet-300 bg-white px-2.5 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-60 dark:border-violet-700/60 dark:bg-zinc-900 dark:text-violet-300"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="mt-2 flex gap-2"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask the tutor…"
          maxLength={2000}
          className="flex-1 rounded-md border border-violet-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:border-violet-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={sending || draft.trim().length === 0}
          className="rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {sending ? "…" : "Ask"}
        </button>
      </form>
      {error && (
        <p className="mt-1.5 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
