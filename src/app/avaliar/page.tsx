'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Heart, Star, Send, CheckCircle2 } from 'lucide-react';

export default function LeaveReviewPage() {
  const [numero, setNumero] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: numero, whatsapp, rating, comment }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setErrorMsg(data.error || 'Não foi possível enviar sua avaliação.');
      }
    } catch (err) {
      setErrorMsg('Erro ao conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-10 px-4">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent-deep)] hover:underline mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para a loja
        </Link>

        {submitted ? (
          <div className="bg-white rounded-3xl border border-[var(--color-border)] shadow-card p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-[var(--color-heading)]">Obrigada pela avaliação!</h1>
            <p className="text-sm text-[var(--color-text-soft)]">
              Sua opinião foi enviada e vai passar por uma revisão rápida antes de aparecer na nossa vitrine. 💕
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] flex items-center justify-center mx-auto mb-3">
                <Heart className="w-7 h-7" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-[var(--color-heading)]">Como foi sua experiência?</h1>
              <p className="text-sm text-[var(--color-text-soft)] mt-1">
                Conte pra gente o que achou do seu pedido -- leva menos de um minuto
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[var(--color-border)] shadow-card p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-accent-strong)] mb-1">
                  Número do Pedido
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PED-2026-0001"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[var(--color-border)] text-sm font-mono uppercase text-[var(--color-heading)] focus:ring-2 focus:ring-[var(--color-accent)] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-accent-strong)] mb-1">
                  WhatsApp usado na encomenda
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 11999998888"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-heading)] focus:ring-2 focus:ring-[var(--color-accent)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-accent-strong)] mb-2">
                  Sua Nota
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
                      className="p-1"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-accent-strong)] mb-1">
                  Conte como foi
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="O que você mais gostou? Recomendaria pra alguém?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-heading)] focus:ring-2 focus:ring-[var(--color-accent)] outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-strong)] text-white font-bold text-sm shadow-blush hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Send className="w-4 h-4" /> {loading ? 'Enviando...' : 'Enviar Avaliação'}
              </button>

              {errorMsg && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">
                  {errorMsg}
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
