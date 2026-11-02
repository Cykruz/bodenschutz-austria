'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, SendHorizontal, X } from 'lucide-react';
import { chat, describeError } from '@/lib/api';
import { PRINCIPLES } from '@/lib/site';
import type { ChatMessage } from '@/lib/types';
import { CHAT_OPEN_EVENT } from '@/components/home/ChatOpenButton';

const SESSION_KEY = 'bsa_chat_session';
const HISTORY_KEY = 'bsa_chat_history';

const QUICK_QUESTIONS = ['Welche Platte für einen LKW?', 'Wie wird geliefert?', 'Was kostet das?'];

const FALLBACK_DISCLOSURE =
  'Ich beantworte Fragen zu Bodenschutzplatten, Einsatz, Lieferung und Ablauf. Verbindliche Preise, Lieferzeiten oder Tragfähigkeitszusagen gibt es erst nach Prüfung durch einen Menschen.';

type Entry = ChatMessage & { id: string; system?: boolean };

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Verlauf und Sitzung liegen im sessionStorage; das Panel wird erst nach dem Öffnen gerendert, daher kein Hydrationskonflikt.
  const [sessionId, setSessionId] = useState<string | undefined>(() => (typeof window === 'undefined' ? undefined : readStorage<string | undefined>(SESSION_KEY, undefined)));
  const [saved] = useState(() => (typeof window === 'undefined' ? { entries: [] as Entry[] } : readStorage<{ entries: Entry[]; disclosure?: string }>(HISTORY_KEY, { entries: [] })));
  const [disclosure, setDisclosure] = useState<string>(saved.disclosure ?? FALLBACK_DISCLOSURE);
  const [entries, setEntries] = useState<Entry[]>(saved.entries);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const counter = useRef(0);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(HISTORY_KEY, JSON.stringify({ entries, disclosure }));
    } catch {
      /* Speicher nicht verfügbar */
    }
  }, [entries, disclosure]);

  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      inputRef.current?.focus();
    }
  }, [open, entries, loading]);

  useEffect(() => {
    // „Fragen stellen“-Knöpfe auf der Seite öffnen das Panel
    const onOpen = () => setOpen(true);
    window.addEventListener(CHAT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CHAT_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setError(null);
    setInput('');
    counter.current += 1;
    const userEntry: Entry = { id: `u_${counter.current}`, role: 'user', content };
    const history: ChatMessage[] = [...entries.filter((e) => !e.system).map(({ role, content }) => ({ role, content })), { role: 'user', content }];
    setEntries((prev) => [...prev, userEntry]);
    setLoading(true);
    try {
      const res = await chat({ sessionId, channel: 'WEB', messages: history });
      if (res.sessionId && res.sessionId !== sessionId) {
        setSessionId(res.sessionId);
        try {
          window.sessionStorage.setItem(SESSION_KEY, res.sessionId);
        } catch {
          /* ignorieren */
        }
      }
      if (res.disclosure) setDisclosure(res.disclosure);
      counter.current += 1;
      setEntries((prev) => [...prev, { id: `a_${counter.current}`, role: 'assistant', content: res.reply }]);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn-grow fixed right-4 bottom-4 z-40 flex min-h-[56px] items-center gap-2 rounded-full bg-gruen px-5 py-3 font-heading font-bold text-white shadow-karte transition-colors hover:bg-gruen-hell sm:right-6 sm:bottom-6 ${
          open ? 'hidden' : ''
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="chat-panel"
      >
        <span aria-hidden className="pulse-ring pointer-events-none absolute inset-0 rounded-full border-4 border-terracotta" />
        <MessageCircle className="size-6" aria-hidden />
        <span>Fragen</span>
        <span aria-hidden>·</span>
        <span className="rounded-full bg-akzent px-2 py-0.5 text-xs font-extrabold text-gruen-dunkel" aria-label="KI-Assistent">
          KI
        </span>
      </button>

      {open && (
        <section
          id="chat-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="chat-title"
          className="fixed inset-x-0 bottom-0 z-50 flex h-[min(92dvh,680px)] flex-col overflow-hidden rounded-t-[24px] border border-linie bg-white shadow-karte sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px] sm:rounded-[24px]"
        >
          <header className="flex items-center justify-between gap-3 bg-gruen px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-white/10">
                <Bot className="size-6" aria-hidden />
              </span>
              <div>
                <h2 id="chat-title" className="font-heading text-lg font-extrabold text-white">
                  Fragen an den Berater
                </h2>
                <p className="text-xs text-sand/80">KI-Assistent · keine verbindlichen Preise</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="touch flex items-center justify-center rounded-full hover:bg-white/10" aria-label="Chat schließen">
              <X className="size-6" aria-hidden />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-sand px-4 py-4" aria-live="polite" aria-relevant="additions">
            <div className="rounded-2xl rounded-tl-md border border-salbei-dunkel bg-salbei px-4 py-3 text-[0.95rem] text-gruen">
              <p className="font-bold">{PRINCIPLES.aiDisclosure}</p>
              <p className="mt-1">{disclosure}</p>
            </div>
            {entries.map((e) => (
              <div key={e.id} className={`slide-in-up flex ${e.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-[0.95rem] whitespace-pre-wrap ${
                    e.role === 'user' ? 'rounded-tr-md bg-gruen text-white' : 'rounded-tl-md border border-linie bg-white text-text-dunkel'
                  }`}
                >
                  {e.role === 'assistant' && <span className="mb-1 block text-xs font-bold text-terracotta-text">KI-Berater</span>}
                  {e.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="slide-in-up flex items-center gap-3" role="status">
                <span className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-linie bg-white px-4 py-3" aria-hidden>
                  <span className="typing-dot block size-2 rounded-full bg-gruen" />
                  <span className="typing-dot block size-2 rounded-full bg-gruen" />
                  <span className="typing-dot block size-2 rounded-full bg-gruen" />
                </span>
                <span className="text-sm text-text/80">Der Berater schreibt …</span>
              </div>
            )}
            {error && (
              <p role="alert" className="rounded-2xl border border-fehler/30 bg-fehler-hell px-4 py-3 text-sm font-semibold text-fehler">
                {error}
              </p>
            )}
          </div>

          <div className="border-t border-linie bg-white px-4 pt-3 pb-4">
            {entries.length === 0 && (
              <ul className="mb-3 flex flex-wrap gap-2" aria-label="Schnellfragen">
                {QUICK_QUESTIONS.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      onClick={() => send(q)}
                      className="touch rounded-full border border-gruen/30 px-3 py-2 text-sm font-semibold text-gruen hover:bg-salbei"
                    >
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <label htmlFor="chat-input" className="sr-only">
                Deine Frage an den KI-Berater
              </label>
              <div className="relative flex-1">
                <textarea
                  id="chat-input"
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="Frage eingeben …"
                  className="max-h-32 min-h-[48px] w-full resize-none rounded-2xl border-2 border-linie bg-white py-3 pr-12 pl-4 text-base focus:border-gruen focus:outline-none"
                />
                <span
                  className="blink-once pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-akzent px-2 py-0.5 text-xs font-extrabold text-gruen-dunkel"
                  title="Antworten kommen von einer KI"
                >
                  KI
                </span>
              </div>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-terracotta text-white hover:bg-terracotta-dunkel disabled:opacity-50"
                aria-label="Frage senden"
              >
                <SendHorizontal className="size-5" aria-hidden />
              </button>
            </form>
            <p className="mt-2 text-xs text-text/70">Keine personenbezogenen Daten Dritter eingeben. Mengen und Preise erst nach Prüfung verbindlich.</p>
          </div>
        </section>
      )}
    </>
  );
}
