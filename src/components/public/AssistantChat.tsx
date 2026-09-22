'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type InferUITools, type UIMessage } from 'ai';
import { MessageCircleQuestion, X, Send, ChevronUp } from 'lucide-react';
import { formatWhatsappForUrl } from '@/lib/utils';
import type { AssistantToolSet } from '@/lib/assistant-tools';

// Typed so tool UI parts (e.g. `tool-gerarResumoWhatsApp`) narrow their
// `output` instead of staying `unknown` -- the brief's default `useChat()`
// (no generic) can't infer this from `AssistantToolSet` on its own.
type AssistantUIMessage = UIMessage<unknown, never, InferUITools<AssistantToolSet>>;

interface AssistantChatProps {
  open: boolean;
  onClose: () => void;
  whatsappNumber?: string;
}

const SUGGESTIONS = [
  'Quais sabores vocês têm?',
  'Qual o prazo mínimo para encomendar?',
  'Quanto custa um bolo para 20 pessoas?',
  'Vocês fazem entrega?',
  'Como funciona o pagamento/sinal?',
  'Quais sabores têm acréscimo no preço?',
];

export function AssistantChat({ open, onClose, whatsappNumber = '5512997594697' }: AssistantChatProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  // One id per widget session, sent with every request so the server can
  // group messages into a conversation for the admin's "Conversas da IA"
  // log. Client-generated and untrusted for anything beyond that grouping
  // (see ADR 0004) -- it never gates access to data.
  const [conversationId] = useState(() => crypto.randomUUID());

  const { messages, sendMessage, status, error, stop } = useChat<AssistantUIMessage>({
    transport: new DefaultChatTransport({ api: '/api/assistant', body: { conversationId } }),
  });

  // Gemini's free tier occasionally fails mid-stream (quota, transient 503)
  // in a way that never reaches useChat's `error` state, leaving `status`
  // stuck at "streaming" forever -- the chat just shows "digitando..."
  // indefinitely. This watchdog forces a terminal state after 20s so the
  // fallback (below) always has a way to show up.
  const [stalled, setStalled] = useState(false);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === 'submitted' || status === 'streaming') {
      stallTimerRef.current = setTimeout(() => {
        setStalled(true);
        stop();
      }, 20000);
    } else if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
    return () => {
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    };
  }, [status, stop]);

  const fallbackWhatsappUrl = `https://wa.me/${formatWhatsappForUrl(whatsappNumber)}?text=${encodeURIComponent(
    'Olá! Gostaria de tirar dúvidas sobre os bolos e encomendar um orçamento!'
  )}`;

  const isBusy = status === 'submitted' || status === 'streaming';
  const showFallback = Boolean(error) || stalled;

  const send = (text: string) => {
    setStalled(false);
    sendMessage({ text });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isBusy) return;
    send(input);
    setInput('');
  };

  if (!open) return null;

  return (
    <div className="fixed z-40 bottom-0 right-0 left-0 sm:left-auto sm:bottom-6 sm:right-6 w-full sm:w-96 h-[80vh] sm:h-[min(520px,calc(100vh-8rem))] bg-white sm:rounded-3xl shadow-2xl border border-[var(--color-border)] flex flex-col overflow-hidden">
      <div className="px-4 py-3 bg-[var(--color-accent-strong)] text-white flex items-center justify-between">
        <span className="font-serif font-bold text-sm flex items-center gap-2">
          <MessageCircleQuestion className="w-4 h-4" /> Assistente Virtual
        </span>
        <button type="button" onClick={onClose} aria-label="Fechar chat">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--color-bg)]">
        {messages.length === 0 && (
          <p className="text-xs text-[var(--color-text-soft)]">
            Oi! Eu sou a assistente virtual da confeitaria. Posso te contar sobre sabores, preços e prazos.
            Não sou a confeiteira, mas te ajudo a chegar até ela com tudo pronto 🍰
          </p>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
              message.role === 'user'
                ? 'ml-auto bg-[var(--color-accent-strong)] text-white'
                : 'bg-white border border-[var(--color-border)] text-[var(--color-heading)]'
            }`}
          >
            {message.parts.map((part, index) => {
              if (part.type === 'text') {
                return <span key={index}>{part.text}</span>;
              }

              if (part.type === 'tool-gerarResumoWhatsApp' && part.state === 'output-available') {
                return (
                  <a
                    key={index}
                    href={part.output.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs"
                  >
                    Continuar no WhatsApp
                  </a>
                );
              }

              return null;
            })}
          </div>
        ))}

        {isBusy && !showFallback && (
          <div className="max-w-[60%] rounded-2xl px-3 py-2 text-xs bg-white border border-[var(--color-border)] text-[var(--color-text-soft)]">
            digitando...
          </div>
        )}

        {showFallback && (
          <div className="rounded-2xl px-3 py-2 text-xs bg-white border border-[var(--color-border)] text-[var(--color-heading)] space-y-2">
            <p>Não consegui responder agora. Fala direto com a gente no WhatsApp:</p>
            <a
              href={fallbackWhatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs"
            >
              Falar no WhatsApp
            </a>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] bg-white">
        <button
          type="button"
          onClick={() => setShowSuggestions((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent-strong)]"
        >
          <span>Perguntas frequentes</span>
          <ChevronUp className={`w-3.5 h-3.5 transition-transform ${showSuggestions ? '' : 'rotate-180'}`} />
        </button>
        {showSuggestions && (
          <div className="flex flex-wrap gap-2 px-4 pb-3 -mt-1 max-h-32 overflow-y-auto">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={isBusy}
                className="text-left text-xs px-3 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-[var(--color-border)] flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isBusy}
          placeholder="Digite sua pergunta..."
          className="flex-1 px-3 py-2 rounded-full border border-[var(--color-border)] text-xs outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
        <button
          type="submit"
          disabled={isBusy || !input.trim()}
          aria-label="Enviar"
          className="p-2.5 rounded-full bg-[var(--color-accent-strong)] hover:bg-[var(--color-accent-deep)] disabled:opacity-40 text-white transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
