'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Cake, Clock, Lock, Unlock } from 'lucide-react';

export default function AdminCalendarPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadBlockedDates = async () => {
    try {
      const res = await fetch('/api/blocked-dates');
      const data = await res.json();
      if (Array.isArray(data)) setBlockedDates(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        if (Array.isArray(data)) setOrders(data);
      } catch (err) {
        console.error(err);
      }
    }
    loadOrders();
    loadBlockedDates();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar math
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Group orders by day
  const getOrdersForDay = (day: number) => {
    return orders.filter((o) => {
      if (!o.deliveryDate) return false;
      const d = new Date(o.deliveryDate);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const getBlockedEntryForDay = (day: number) => {
    return blockedDates.find((b) => {
      const d = new Date(b.date);
      return d.getUTCDate() === day && d.getUTCMonth() === month && d.getUTCFullYear() === year;
    });
  };

  const handleToggleBlock = async (day: number) => {
    const existing = getBlockedEntryForDay(day);
    try {
      if (existing) {
        await fetch(`/api/blocked-dates/${existing.id}`, { method: 'DELETE' });
      } else {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        await fetch('/api/blocked-dates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr, reason: 'Agenda lotada' }),
        });
      }
      loadBlockedDates();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A]">
              Calendário de Produção
            </h1>
            <p className="text-xs md:text-sm text-[#645451]">
              Visualize as encomendas agendadas por data e clique no cadeado de um dia para bloqueá-lo — dias
              bloqueados somem do calendário de orçamento no site, o cliente não consegue nem escolher
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-[#F2D7D0] shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl hover:bg-[#FAF6F4] text-[#4A231A]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-serif font-bold text-lg text-[#4A231A] px-4">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl hover:bg-[#FAF6F4] text-[#4A231A]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-3xl border border-[#F2D7D0] shadow-card overflow-hidden">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 bg-[#FDF7F6] border-b border-[#F2D7D0] text-center font-bold text-xs text-[#A75644] py-3 uppercase tracking-wider">
            <span>Dom</span>
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#F2D7D0]/60 min-h-[550px]">
            {/* Empty slots before day 1 */}
            {[...Array(firstDayOfWeek)].map((_, i) => (
              <div key={`empty-${i}`} className="bg-gray-50/50 p-2 min-h-[100px]" />
            ))}

            {/* Days of Month */}
            {[...Array(daysInMonth)].map((_, i) => {
              const dayNum = i + 1;
              const dayOrders = getOrdersForDay(dayNum);
              const blockedEntry = getBlockedEntryForDay(dayNum);
              const isBlocked = !!blockedEntry;
              const isToday =
                dayNum === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();

              return (
                <div
                  key={dayNum}
                  className={`p-2 min-h-[100px] flex flex-col justify-between transition-colors ${
                    isBlocked ? 'bg-red-50/70' : isToday ? 'bg-[#FDF7F6]' : 'bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-[#C27360] text-white' : isBlocked ? 'text-red-700' : 'text-[#4A231A]'
                      }`}
                    >
                      {dayNum}
                    </span>
                    <div className="flex items-center gap-1">
                      {dayOrders.length > 0 && (
                        <span className="text-[10px] font-bold text-[#C27360] bg-[#F9ECE9] px-1.5 py-0.5 rounded">
                          {dayOrders.length} encomenda{dayOrders.length > 1 ? 's' : ''}
                        </span>
                      )}
                      <button
                        onClick={() => handleToggleBlock(dayNum)}
                        title={isBlocked ? 'Clique para liberar este dia' : 'Clique para bloquear este dia'}
                        className={`p-1 rounded-md transition-colors ${
                          isBlocked
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-transparent text-gray-300 hover:text-[#C27360] hover:bg-[#FAF6F4]'
                        }`}
                      >
                        {isBlocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {isBlocked && (
                    <span className="text-[9px] font-bold uppercase tracking-wide text-red-700 bg-red-100 px-1.5 py-0.5 rounded self-start mb-1">
                      Indisponível
                    </span>
                  )}

                  <div className="space-y-1 overflow-y-auto max-h-24">
                    {dayOrders.map((o) => (
                      <div
                        key={o.id}
                        className="p-1.5 rounded-lg bg-[#FAF6F4] border border-[#F2D7D0] text-[10px] space-y-0.5 shadow-2xs"
                      >
                        <div className="font-bold text-[#4A231A] truncate">{o.customerName}</div>
                        {o.items && o.items.length > 0 && (
                          <div className="text-[#874132] truncate font-medium">
                            {o.items[0].productName}
                          </div>
                        )}
                        <span
                          className={`inline-block px-1 py-0.5 rounded text-[8px] font-bold ${
                            o.status === 'ENTREGUE'
                              ? 'bg-gray-200 text-gray-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {o.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
