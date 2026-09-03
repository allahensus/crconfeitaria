'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { UserCog, Plus, Edit2, Trash2, X, Check } from 'lucide-react';

export default function AdminTeamPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState<'OWNER' | 'STAFF'>('STAFF');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        setRole(data?.user?.role || null);
        setCurrentUserId(data?.user?.userId || '');
      })
      .finally(() => setRoleChecked(true));
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/team');
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setPassword('');
    setUserRole('STAFF');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: any) => {
    setEditingId(u.id);
    setName(u.name);
    setEmail(u.email);
    setPassword('');
    setUserRole(u.role);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload: any = { name, email, role: userRole };
      if (password) payload.password = password;
      if (!editingId) payload.password = password;

      const url = editingId ? `/api/team/${editingId}` : '/api/team';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        loadData();
      } else {
        setErrorMsg(data.error || 'Erro ao salvar conta.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao conectar ao servidor.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
    const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      loadData();
    } else {
      alert(data.error || 'Erro ao excluir conta.');
    }
  };

  if (roleChecked && role !== 'OWNER') {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-10 flex items-center justify-center">
          <div className="bg-white rounded-3xl border border-[#F2D7D0] shadow-card p-10 text-center max-w-md">
            <h1 className="font-serif text-xl font-bold text-[#4A231A] mb-2">Acesso restrito</h1>
            <p className="text-sm text-[#645451]">Esta área é visível apenas para a dona da loja.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A]">Equipe</h1>
            <p className="text-xs md:text-sm text-[#645451]">
              Contas com acesso ao painel administrativo desta loja
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-bold text-sm shadow-blush hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Conta
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5">
          <p className="text-xs text-amber-900">
            <span className="font-bold text-amber-800">Atenção: </span>
            Por segurança, ao remover ou trocar o papel de uma conta, o acesso dela pode continuar ativo por até 7 dias
            (tempo de validade da sessão). Se precisar bloquear o acesso imediatamente, oriente a pessoa a trocar a
            senha ou aguarde a expiração da sessão.
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[#645451]">Carregando equipe...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((u) => (
              <div
                key={u.id}
                className="bg-white rounded-3xl border border-[#F2D7D0] p-5 shadow-card flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <UserCog className="w-5 h-5 text-[#C27360]" />
                  <div className="flex items-center gap-1.5">
                    {u.id === currentUserId && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F9ECE9] text-[#874132]">
                        Você
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        u.role === 'OWNER' ? 'bg-[#C27360] text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {u.role === 'OWNER' ? 'Dona' : 'Funcionária'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-sm text-[#4A231A] block">{u.name}</span>
                  <span className="text-xs text-[#645451]">{u.email}</span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#F2D7D0]/60 mt-auto">
                  <button
                    onClick={() => handleOpenEdit(u)}
                    className="flex-1 p-2 rounded-lg bg-white border border-[#F2D7D0] text-[#4A231A] hover:bg-[#FDF7F6] flex items-center justify-center gap-1.5 text-xs font-semibold"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#C27360]" /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="p-2 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-[#F2D7D0] flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
              <h2 className="font-serif text-xl font-bold text-[#4A231A]">
                {editingId ? 'Editar Conta' : 'Nova Conta'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-[#FAF6F4] text-[#645451]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Senha {editingId ? '(deixe em branco para manter a atual)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingId}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Papel
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as 'OWNER' | 'STAFF')}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                >
                  <option value="STAFF">Funcionária — acesso restrito</option>
                  <option value="OWNER">Dona — acesso total</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-[#F2D7D0] text-[#4A231A] font-bold text-sm hover:bg-[#FAF6F4] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-bold text-sm shadow-blush hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
