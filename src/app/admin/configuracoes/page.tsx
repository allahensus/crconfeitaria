'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Settings, Save, CheckCircle2, MessageCircle, Phone, Instagram, MapPin, Image as ImageIcon, CalendarClock, QrCode } from 'lucide-react';

interface HeroPhotoState {
  image: string;
  zoom: number;
  posX: number;
  posY: number;
}

export default function AdminSettingsPage() {
  const [bakeryName, setBakeryName] = useState('');
  const [logoUrl, setLogoUrl] = useState('/images/logo_cinthia.png');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadMsg, setLogoUploadMsg] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [instagram, setInstagram] = useState('');
  const [address, setAddress] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [minLeadDays, setMinLeadDays] = useState('3');
  const [pixKey, setPixKey] = useState('');
  const [pixBeneficiaryName, setPixBeneficiaryName] = useState('');
  const [pixCity, setPixCity] = useState('');
  const [depositPercentage, setDepositPercentage] = useState('50');

  const [heroMain, setHeroMain] = useState<HeroPhotoState>({ image: '/images/hero-bolo-destaque.jpg', zoom: 1, posX: 50, posY: 0 });
  const [heroBiscoitos, setHeroBiscoitos] = useState<HeroPhotoState>({ image: '/images/hero-biscoitos-destaque.jpg', zoom: 1, posX: 50, posY: 50 });
  const [heroBentocake, setHeroBentocake] = useState<HeroPhotoState>({ image: '/images/hero-bentocake-destaque.jpg', zoom: 1, posX: 50, posY: 50 });

  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data) {
          setBakeryName(data.bakery_name || 'Cinthia Rodrigues');
          setLogoUrl(data.logo_url || '/images/logo_cinthia.png');
          setWhatsappNumber(data.whatsapp_number || '5512997594697');
          setInstagram(data.instagram || '@crconfeitaria__');
          setAddress(data.address || 'São Paulo - SP');
          setWelcomeMessage(data.welcome_message || '');
          setMinLeadDays(data.min_lead_days || '3');
          setPixKey(data.pix_key || '');
          setPixBeneficiaryName(data.pix_beneficiary_name || '');
          setPixCity(data.pix_city || '');
          setDepositPercentage(data.deposit_percentage || '50');
          setHeroMain({
            image: data.hero_main_image || '/images/hero-bolo-destaque.jpg',
            zoom: parseFloat(data.hero_main_zoom || '1') || 1,
            posX: data.hero_main_pos_x !== undefined ? parseFloat(data.hero_main_pos_x) : 50,
            posY: data.hero_main_pos_y !== undefined ? parseFloat(data.hero_main_pos_y) : 0,
          });
          setHeroBiscoitos({
            image: data.hero_biscoitos_image || '/images/hero-biscoitos-destaque.jpg',
            zoom: parseFloat(data.hero_biscoitos_zoom || '1') || 1,
            posX: data.hero_biscoitos_pos_x !== undefined ? parseFloat(data.hero_biscoitos_pos_x) : 50,
            posY: data.hero_biscoitos_pos_y !== undefined ? parseFloat(data.hero_biscoitos_pos_y) : 50,
          });
          setHeroBentocake({
            image: data.hero_bentocake_image || '/images/hero-bentocake-destaque.jpg',
            zoom: parseFloat(data.hero_bentocake_zoom || '1') || 1,
            posX: data.hero_bentocake_pos_x !== undefined ? parseFloat(data.hero_bentocake_pos_x) : 50,
            posY: data.hero_bentocake_pos_y !== undefined ? parseFloat(data.hero_bentocake_pos_y) : 50,
          });
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
          logo_url: logoUrl,
          whatsapp_number: whatsappNumber,
          instagram,
          address,
          welcome_message: welcomeMessage,
          min_lead_days: minLeadDays,
          pix_key: pixKey,
          pix_beneficiary_name: pixBeneficiaryName,
          pix_city: pixCity,
          deposit_percentage: depositPercentage,
          hero_main_image: heroMain.image,
          hero_main_zoom: String(heroMain.zoom),
          hero_main_pos_x: String(heroMain.posX),
          hero_main_pos_y: String(heroMain.posY),
          hero_biscoitos_image: heroBiscoitos.image,
          hero_biscoitos_zoom: String(heroBiscoitos.zoom),
          hero_biscoitos_pos_x: String(heroBiscoitos.posX),
          hero_biscoitos_pos_y: String(heroBiscoitos.posY),
          hero_bentocake_image: heroBentocake.image,
          hero_bentocake_zoom: String(heroBentocake.zoom),
          hero_bentocake_pos_x: String(heroBentocake.posX),
          hero_bentocake_pos_y: String(heroBentocake.posY),
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
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
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
          <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
          <div className="bg-white rounded-3xl border border-[#F2D7D0] p-6 md:p-8 shadow-card">
            <div className="space-y-6">

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
                <p className="text-[11px] text-gray-500 mt-1">
                  Aparece no cabeçalho, no rodapé e no título da aba do navegador.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-[#C27360]" /> Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border border-[#F2D7D0] bg-[#FAF6F4] shrink-0">
                    <img key={logoUrl} src={logoUrl} alt="Logo atual" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <label
                      htmlFor="logo-upload"
                      className="cursor-pointer inline-flex px-3.5 py-2 rounded-xl bg-[#C27360] hover:bg-[#A75644] text-white font-bold text-xs items-center gap-2 shadow-sm transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Trocar Logo
                    </label>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={logoUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setLogoUploading(true);
                        setLogoUploadMsg('Enviando...');
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          const res = await fetch('/api/upload', { method: 'POST', body: formData });
                          const data = await res.json();
                          if (res.ok && data.url) {
                            setLogoUrl(data.url);
                            setLogoUploadMsg('✅ Enviada!');
                            setTimeout(() => setLogoUploadMsg(''), 3000);
                          } else {
                            setLogoUploadMsg(`⚠️ ${data.error || 'Erro ao enviar'}`);
                          }
                        } catch {
                          setLogoUploadMsg('⚠️ Erro ao conectar ao servidor de imagens.');
                        } finally {
                          setLogoUploading(false);
                        }
                      }}
                    />
                    {logoUploadMsg && <p className="text-xs font-semibold text-[#C27360] mt-1.5">{logoUploadMsg}</p>}
                  </div>
                </div>
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

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1 flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5 text-[#C27360]" /> Prazo Mínimo de Antecedência
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={minLeadDays}
                    onChange={(e) => setMinLeadDays(e.target.value)}
                    className="w-24 p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                  />
                  <span className="text-xs text-[#645451]">dia(s) antes da data desejada</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  No calendário do orçamento, o cliente não consegue escolher datas mais próximas do que isso.
                </p>
              </div>

            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#F2D7D0] p-6 md:p-8 shadow-card">
            <div className="mb-5">
              <h2 className="font-serif text-lg font-bold text-[#4A231A] flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#C27360]" /> Cobrança via Pix
              </h2>
              <p className="text-xs text-[#645451]">
                Cadastre sua chave Pix pra gerar QR Code de cobrança direto nos pedidos, sem precisar de conta em
                gateway de pagamento.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Chave Pix
                </label>
                <input
                  type="text"
                  placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                    Nome do Titular
                  </label>
                  <input
                    type="text"
                    placeholder="Como está na conta"
                    value={pixBeneficiaryName}
                    onChange={(e) => setPixBeneficiaryName(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Sao Paulo"
                    value={pixCity}
                    onChange={(e) => setPixCity(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-500">
                Não usamos nenhum banco ou gateway de pagamento — o QR Code é gerado direto com a sua chave Pix, o
                dinheiro cai direto na sua conta.
              </p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Percentual de Sinal
                </label>
                <div className="relative w-32">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={depositPercentage}
                    onChange={(e) => setDepositPercentage(e.target.value)}
                    className="w-full p-3 pr-8 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Percentual do valor total que é sugerido como sinal ao gerar um orçamento -- não é obrigatório cobrar o valor cheio.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#F2D7D0] p-6 md:p-8 shadow-card">
            <div className="mb-5">
              <h2 className="font-serif text-lg font-bold text-[#4A231A]">Fotos da Página Inicial</h2>
              <p className="text-xs text-[#645451]">
                As 3 fotos que aparecem no topo do site. Envie uma nova foto ou ajuste o zoom/posição da atual.
              </p>
            </div>
            <div className="space-y-6">
              <HeroPhotoEditor
                label="Foto Principal (a grande)"
                aspectClass="aspect-[3/4]"
                photo={heroMain}
                onChange={setHeroMain}
              />
              <HeroPhotoEditor
                label="Foto — Biscoitos"
                aspectClass="aspect-square"
                photo={heroBiscoitos}
                onChange={setHeroBiscoitos}
              />
              <HeroPhotoEditor
                label="Foto — Bentô Cake"
                aspectClass="aspect-square"
                photo={heroBentocake}
                onChange={setHeroBentocake}
              />
            </div>
          </div>

          {savedMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" /> Configurações salvas com sucesso!
            </div>
          )}

          <div>
            <button
              type="submit"
              className="px-6 py-3 rounded-full bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-bold text-sm shadow-blush hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Salvar Configurações
            </button>
          </div>

          </form>
        )}
      </main>
    </div>
  );
}

interface HeroPhotoEditorProps {
  label: string;
  aspectClass: string;
  photo: HeroPhotoState;
  onChange: (photo: HeroPhotoState) => void;
}

function HeroPhotoEditor({ label, aspectClass, photo, onChange }: HeroPhotoEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const inputId = `hero-upload-${label.replace(/[^a-zA-Z0-9]/g, '')}`;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMsg('Enviando...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        onChange({ image: data.url, zoom: 1, posX: 50, posY: 50 });
        setUploadMsg('✅ Enviada!');
        setTimeout(() => setUploadMsg(''), 3000);
      } else {
        setUploadMsg(`⚠️ ${data.error || 'Erro ao enviar'}`);
      }
    } catch {
      setUploadMsg('⚠️ Erro ao conectar ao servidor de imagens.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-[#FAF6F4] border border-[#F2D7D0] space-y-3">
      <span className="text-xs font-bold uppercase text-[#A75644] block">{label}</span>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className={`relative w-full sm:w-40 ${aspectClass} rounded-xl border border-[#E6B9AE] overflow-hidden bg-white shadow-sm shrink-0`}>
          <img
            key={photo.image}
            src={photo.image}
            alt={label}
            className="w-full h-full object-cover"
            style={{
              objectPosition: `${photo.posX}% ${photo.posY}%`,
              transform: `scale(${photo.zoom})`,
            }}
          />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor={inputId}
              className="cursor-pointer px-3.5 py-2 rounded-xl bg-[#C27360] hover:bg-[#A75644] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Trocar Foto
            </label>
            <input id={inputId} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            {uploading && <span className="text-xs text-gray-500">Enviando...</span>}
            {uploadMsg && <span className="text-xs font-semibold text-[#C27360]">{uploadMsg}</span>}
          </div>

          <div>
            <label className="flex justify-between text-[10px] font-bold text-[#A75644] uppercase mb-1">
              <span>Zoom</span>
              <span>{Math.round(photo.zoom * 100)}%</span>
            </label>
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.05"
              value={photo.zoom}
              onChange={(e) => onChange({ ...photo, zoom: parseFloat(e.target.value) })}
              className="w-full accent-[#C27360]"
            />
          </div>
          <div>
            <label className="flex justify-between text-[10px] font-bold text-[#A75644] uppercase mb-1">
              <span>Posição Horizontal</span>
              <span>{Math.round(photo.posX)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={photo.posX}
              onChange={(e) => onChange({ ...photo, posX: parseFloat(e.target.value) })}
              className="w-full accent-[#C27360]"
            />
          </div>
          <div>
            <label className="flex justify-between text-[10px] font-bold text-[#A75644] uppercase mb-1">
              <span>Posição Vertical</span>
              <span>{Math.round(photo.posY)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={photo.posY}
              onChange={(e) => onChange({ ...photo, posY: parseFloat(e.target.value) })}
              className="w-full accent-[#C27360]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
