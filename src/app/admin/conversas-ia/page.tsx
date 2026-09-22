'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { formatDateTime } from '@/lib/utils';
import { MessageCircleQuestion, X, Bot, User } from 'lucide-react';

interface ConversationSummary {
  id: string;
  startedAt: string;
  lastMessageAt: string;
  totalTokens: number;
  messageCount: number;
  firstQuestion: string | null;
}

interface ConversationMessage {
  id: string;
  role: string;
  text: string;
  toolCalls: string | null;
  tokens: number | null;
  createdAt: string;
}

interface ConversationDetail {
  id: string;
  startedAt: string;
  totalTokens: number;
  messages: ConversationMessage[];
}

export default function AdminAssistantConversationsPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ConversationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetch('/api/assistant-conversations')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setConversations(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const openConversation = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/assistant-conversations/${id}`);
      const data = await res.json();
      if (res.ok) setSelected(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const totalConversas = conversations.length;
  const totalTokens = conversations.reduce((sum, c) => sum + c.totalTokens, 0);
  const totalMensagens = conversations.reduce((sum, c) => sum + c.messageCount, 0);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A] flex items-center gap-2">
            <MessageCircleQuestion className="w-6 h-6 text-[#C27360]" /> Conversas da Assistente de IA
          </h1>
          <p className="text-xs md:text-sm text-[#645451]">
            Últimas 100 conversas do assistente virtual no site, com o que foi conversado e quantos tokens cada uma consumiu.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm">
            <span className="text-[10px] font-bold uppercase text-[#A75644]">Conversas</span>
            <p className="text-2xl font-serif font-bold text-[#4A231A]">{totalConversas}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm">
            <span className="text-[10px] font-bold uppercase text-[#A75644]">Mensagens</span>
            <p className="text-2xl font-serif font-bold text-[#4A231A]">{totalMensagens}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm">
            <span className="text-[10px] font-bold uppercase text-[#A75644]">Tokens usados</span>
            <p className="text-2xl font-serif font-bold text-[#4A231A]">{totalTokens.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-gray-500 mt-1">Grátis hoje (camada free do Gemini) -- registrado pra quando isso mudar.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[#645451]">Carregando conversas...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-[#F2D7D0] p-8">
            <p className="text-[#645451] font-medium">Nenhuma conversa registrada ainda.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#F2D7D0] shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[#FAF6F4] text-[#A75644] uppercase font-bold">
                <tr>
                  <th className="text-left px-4 py-3">Primeira pergunta</th>
                  <th className="text-left px-4 py-3">Última mensagem</th>
                  <th className="text-center px-4 py-3">Mensagens</th>
                  <th className="text-center px-4 py-3">Tokens</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2D7D0]">
                {conversations.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FDF7F6]">
                    <td className="px-4 py-3 text-[#4A231A] max-w-xs truncate">
                      {c.firstQuestion || <span className="text-gray-400">(sem pergunta registrada)</span>}
                    </td>
                    <td className="px-4 py-3 text-[#645451]">{formatDateTime(c.lastMessageAt)}</td>
                    <td className="px-4 py-3 text-center text-[#645451]">{c.messageCount}</td>
                    <td className="px-4 py-3 text-center text-[#645451]">{c.totalTokens}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openConversation(c.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#C27360] hover:bg-[#A75644] text-white font-bold text-[10px]"
                      >
                        Ver conversa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(selected || loadingDetail) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#F2D7D0] shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-3 border-b border-[#F2D7D0]">
                <h3 className="font-serif font-bold text-xl text-[#4A231A]">Conversa</h3>
                <button onClick={() => setSelected(null)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {loadingDetail ? (
                <p className="text-xs text-[#645451] text-center py-6">Carregando...</p>
              ) : (
                <div className="space-y-3">
                  {selected!.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-2xl px-3 py-2 text-xs leading-relaxed max-w-[85%] ${
                        m.role === 'user'
                          ? 'ml-auto bg-[#C27360] text-white'
                          : 'bg-[#FAF6F4] border border-[#F2D7D0] text-[#4A231A]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 opacity-70 text-[10px] font-bold uppercase">
                        {m.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                        {m.role === 'user' ? 'Cliente' : 'Assistente'}
                        {m.tokens ? <span>· {m.tokens} tokens</span> : null}
                      </div>
                      <p>{m.text || <span className="italic opacity-60">(sem texto)</span>}</p>
                      {m.toolCalls && (
                        <p className="mt-1.5 text-[10px] opacity-70 font-mono break-all">
                          ferramentas: {m.toolCalls}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
