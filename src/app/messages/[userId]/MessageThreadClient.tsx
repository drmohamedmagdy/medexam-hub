"use client";

import { useEffect, useRef, useState } from "react";

type Msg = {
  id: string;
  senderId: string;
  receiverId: string;
  body: string;
  sentAt: string;
  pending?: boolean;
};

const EPOCH = "1970-01-01T00:00:00.000Z";

export default function MessageThreadClient({
  meId,
  partnerId,
  initialMessages,
}: {
  meId: string;
  partnerId: string;
  initialMessages: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const scrollerRef = useRef<HTMLUListElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Live updates via Server-Sent Events. EventSource auto-reconnects
  // when the server closes (we cap each connection at ~25s to play
  // nicely with Vercel function limits) and uses Last-Event-ID so we
  // never replay messages we've already seen.
  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }
    const watermark = messagesRef.current
      .filter((m) => !m.pending)
      .reduce((acc, m) => (m.sentAt > acc ? m.sentAt : acc), EPOCH);

    const es = new EventSource(
      `/api/messages/${partnerId}/stream?since=${encodeURIComponent(watermark)}`
    );

    function onMessage(ev: MessageEvent) {
      try {
        const m = JSON.parse(ev.data) as Msg;
        setMessages((cur) => {
          if (cur.some((x) => x.id === m.id)) return cur;
          // Drop pending optimistic copy whose body matches the
          // arriving real message from me.
          if (m.senderId === meId) {
            const pruned = cur.filter(
              (x) => !(x.pending && x.senderId === meId && x.body === m.body)
            );
            return [...pruned, m];
          }
          return [...cur, m];
        });
      } catch {
        // Malformed payload — ignore, keep streaming.
      }
    }

    es.addEventListener("message", onMessage as EventListener);

    return () => {
      es.removeEventListener("message", onMessage as EventListener);
      es.close();
    };
  }, [partnerId, meId]);

  // Auto-scroll to the bottom when a new message arrives, but only if the
  // user is already near the bottom — otherwise we'd yank them away from
  // history they're reading.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);

    const tempId = `temp-${
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)
    }`;
    const optimistic: Msg = {
      id: tempId,
      senderId: meId,
      receiverId: partnerId,
      body: text,
      sentAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((cur) => [...cur, optimistic]);
    setBody("");
    requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });

    try {
      const res = await fetch(`/api/messages/${partnerId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Send failed");
      setMessages((cur) =>
        cur.map((m) =>
          m.id === tempId ? { ...(data.message as Msg), pending: false } : m
        )
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Send failed";
      setError(msg);
      setMessages((cur) => cur.filter((m) => m.id !== tempId));
      setBody(text);
    } finally {
      setSending(false);
      textRef.current?.focus();
    }
  }

  return (
    <>
      <ul
        ref={scrollerRef}
        className="mt-4 flex max-h-[60vh] flex-1 flex-col gap-2 overflow-y-auto pb-4"
      >
        {messages.length === 0 && (
          <li className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
            No messages yet — say hi 👋
          </li>
        )}
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <li
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  mine
                    ? "rounded-br-sm bg-blue-600 text-white"
                    : "rounded-bl-sm bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                } ${m.pending ? "opacity-60" : ""}`}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <span
                  className={`mt-1 block text-[10px] ${
                    mine ? "text-blue-100" : "text-zinc-500 dark:text-zinc-500"
                  }`}
                >
                  {m.pending ? "Sending…" : new Date(m.sentAt).toLocaleString()}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <form
        onSubmit={send}
        className="sticky bottom-0 mt-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <textarea
          ref={textRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={5000}
          placeholder="Type a message…"
          className="w-full resize-none rounded-md border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-xs text-zinc-500">
            ⏎ to send · Shift+⏎ for new line
          </span>
          <button
            type="submit"
            disabled={sending || body.trim().length === 0}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
        {error && (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
      </form>
    </>
  );
}
