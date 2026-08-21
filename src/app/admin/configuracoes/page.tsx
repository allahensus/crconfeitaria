'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Settings, Save, CheckCircle2, MessageCircle, Phone, Instagram, MapPin } from 'lucide-react';

export default function AdminSettingsPage() {
  const [bakeryName, setBakeryName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [instagram, setInstagram] = useState('');
  const [address, setAddress] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data) {
          setBakeryName(data.bakery_name || 'Cinthia Rodrigues - Confeitaria Artesanal');
          setWhatsappNumber(data.whatsapp_number || '5511999999999');
          setInstagram(data.instagram || '@crconfeitaria__');
          setAddress(data.address || 'São Paulo - SP');
          setWelcomeMessage(data.welcome_message || '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bakery_name: bakeryName,
          whatsapp_number: whatsappNumber,
          instagram,
          address,
          welcome_message: welcomeMessage,
        }),
      });

      if (res.ok) {
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A]">
            Configurações da Confeitaria
          </h1>
          <p className="text-xs md:text-sm text-[#645451]">
            Gerencie o número do WhatsApp de atendimento, redes sociais e mensagens automáticas
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[#645451]">Carregando configurações...</div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#F2D7D0] p-6 md:p-8 shadow-card max-w-2xl">
            <form onSubmit={handleSave} className="space-y-6">
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Nome da Confeitaria
                </label>
                <input
                  type="text"
                  required
                  value={bakeryName}
                  onChange={(e) => setBakeryName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> Número do WhatsApp de Atendimento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 5511999998888"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Este é o número que receberá os orçamentos gerados pelos clientes na vitrine pública.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1 flex items-center gap-1">
                  <Instagram className="w-3.5 h-3.5 text-rose-500" /> Instagram Oficial
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#C27360]" /> Endereço / Cidade
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                />
              </div>

              {savedMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" /> Configurações salvas com sucesso!
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-bold text-sm shadow-blush hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Salvar Configurações
                </button>
              </div>

            </form>
          </div>
        )}
      </main>
    </div>
  );
}
