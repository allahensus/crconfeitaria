'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Lock, Mail, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@cinthia.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciais inválidas');
      }

      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-card border border-[#F2D7D0] p-8 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-full bg-[#F9ECE9] border-2 border-[#E6B9AE] p-1 mx-auto relative overflow-hidden shadow-sm">
            <Image
              src="/images/logo_cinthia.png"
              alt="Logo Cinthia Rodrigues Confeitaria"
              fill
              className="object-cover rounded-full"
            />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#4A231A]">
            Área da Confeiteira
          </h1>
          <p className="text-xs text-[#645451]">
            Acesse o painel de gestão de produtos, pedidos e financeiro
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
              E-mail Administrativo
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
              Senha de Acesso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 font-semibold bg-red-50 p-3 rounded-xl border border-red-200">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-bold text-sm shadow-blush hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              'Entrando...'
            ) : (
              <>
                <span>Entrar no Painel</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-[#F2D7D0]/60 text-center">
          <p className="text-[11px] text-[#645451] flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C27360]" /> Acesso restrito e criptografado
          </p>
        </div>

      </div>
    </div>
  );
}
