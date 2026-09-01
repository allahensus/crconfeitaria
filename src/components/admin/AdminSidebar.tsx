'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Cake,
  FolderTree,
  FileText,
  ShoppingBag,
  Calendar,
  DollarSign,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Quote,
} from 'lucide-react';

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Pedidos (Kanban)', href: '/admin/pedidos', icon: ShoppingBag },
    { label: 'Calendário Produção', href: '/admin/calendario', icon: Calendar },
    { label: 'Orçamentos', href: '/admin/orcamentos', icon: FileText },
    { label: 'Produtos', href: '/admin/produtos', icon: Cake },
    { label: 'Insumos & Precificação', href: '/admin/insumos', icon: Sparkles },
    { label: 'Categorias', href: '/admin/categorias', icon: FolderTree },
    { label: 'Clientes (CRM)', href: '/admin/clientes', icon: Users },
    { label: 'Financeiro', href: '/admin/financeiro', icon: DollarSign },
    { label: 'Depoimentos', href: '/admin/depoimentos', icon: Quote },
    { label: 'Configurações', href: '/admin/configuracoes', icon: Settings },
  ];

  return (
    <aside
      className={`bg-[#332220] text-white flex flex-col justify-between transition-all duration-300 min-h-screen border-r border-[#4A3531] z-30 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Header Logo */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-[#4A3531]">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#C27360] flex items-center justify-center font-bold text-white shadow-md font-serif">
                CR
              </div>
              <div>
                <h1 className="font-serif font-bold text-base text-[#F2D7D0] leading-none">
                  Cinthia Rodrigues
                </h1>
                <span className="text-[10px] text-rose-300 font-semibold tracking-wider uppercase">
                  Painel Confeiteira
                </span>
              </div>
            </Link>
          )}

          {collapsed && (
            <div className="w-10 h-10 rounded-full bg-[#C27360] flex items-center justify-center font-bold text-white mx-auto font-serif">
              CR
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg bg-[#4A3531] hover:bg-[#645451] text-[#F2D7D0] transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-bold shadow-md'
                    : 'text-[#E3E0DE] hover:bg-[#4A3531] hover:text-white'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-rose-300'}`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Logout & Public Link */}
      <div className="p-3 border-t border-[#4A3531] space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#F2D7D0] bg-[#4A3531] hover:bg-[#645451] transition-colors"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          {!collapsed && <span>Ver Vitrine Pública</span>}
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-900/40 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Sair do Sistema</span>}
        </button>
      </div>
    </aside>
  );
}
