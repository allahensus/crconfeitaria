'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, QrCode } from 'lucide-react';
import { generatePixPayload } from '@/lib/pix';
import { formatCurrency } from '@/lib/utils';

interface PixChargeModalProps {
  onClose: () => void;
  defaultAmount: number;
  txid: string; // ex: order number, shown on the payer's bank statement
  customerName?: string;
}

export function PixChargeModal({ onClose, defaultAmount, txid, customerName }: PixChargeModalProps) {
  const [pixKey, setPixKey] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [merchantCity, setMerchantCity] = useState('');
  const [amount, setAmount] = useState(defaultAmount > 0 ? defaultAmount.toFixed(2) : '');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [payload, setPayload] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPixSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        setPixKey(data.pix_key || '');
        setMerchantName(data.pix_beneficiary_name || '');
        setMerchantCity(data.pix_city || '');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPixSettings();
  }, []);

  useEffect(() => {
    if (!pixKey) {
      setQrDataUrl('');
      setPayload('');
      return;
    }
    const parsedAmount = parseFloat(amount);
    const newPayload = generatePixPayload({
      pixKey,
      merchantName: merchantName || 'CONFEITARIA',
      merchantCity: merchantCity || 'BRASIL',
      amount: parsedAmount > 0 ? parsedAmount : undefined,
      txid,
    });
    setPayload(newPayload);
    QRCode.toDataURL(newPayload, { width: 260, margin: 1 })
      .then(setQrDataUrl)
      .catch((err) => console.error('Error generating QR code:', err));
  }, [pixKey, merchantName, merchantCity, amount, txid]);

  const handleCopy = () => {
    if (!payload) return;
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-[#F2D7D0] shadow-2xl space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-[#F2D7D0]">
          <h3 className="font-serif font-bold text-lg text-[#4A231A] flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#C27360]" /> Cobrança via Pix
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-[#645451] text-center py-6">Carregando...</p>
        ) : !pixKey ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-xs text-[#645451]">
              Você ainda não cadastrou sua chave Pix. Configure em{' '}
              <a href="/admin/configuracoes" className="text-[#C27360] font-bold underline">
                Configurações
              </a>{' '}
              pra poder gerar cobranças.
            </p>
          </div>
        ) : (
          <>
            {customerName && (
              <p className="text-xs text-[#645451]">
                Cliente: <span className="font-bold text-[#4A231A]">{customerName}</span>
              </p>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase text-[#A75644] mb-1">
                Valor da Cobrança (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Deixe em branco pro cliente digitar o valor"
                className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
              />
            </div>

            {qrDataUrl && (
              <div className="flex justify-center py-2">
                <img src={qrDataUrl} alt="QR Code Pix" className="w-52 h-52 rounded-xl border border-[#F2D7D0]" />
              </div>
            )}

            {amount && parseFloat(amount) > 0 && (
              <p className="text-center text-sm font-bold text-[#C27360] font-serif">
                {formatCurrency(parseFloat(amount))}
              </p>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase text-[#A75644] mb-1">
                Pix Copia e Cola
              </label>
              <div className="flex gap-2">
                <code className="flex-1 text-[10px] bg-[#FAF6F4] px-2 py-2 rounded-xl border border-[#F2D7D0] text-[#874132] font-mono block truncate">
                  {payload}
                </code>
                <button
                  onClick={handleCopy}
                  className="px-3 rounded-xl bg-[#C27360] hover:bg-[#A75644] text-white shrink-0"
                  title="Copiar código Pix"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copied && <p className="text-[10px] text-emerald-600 font-semibold mt-1">Copiado! Envie pelo WhatsApp.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
