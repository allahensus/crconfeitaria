'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AvailabilityDatePickerProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (date: string) => void;
  blockedDates: string[]; // ['YYYY-MM-DD', ...]
  minDaysFromNow?: number;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function AvailabilityDatePicker({ value, onChange, blockedDates, minDaysFromNow = 0 }: AvailabilityDatePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const earliestAllowed = new Date(today);
  earliestAllowed.setDate(earliestAllowed.getDate() + minDaysFromNow);

  const initial = value ? new Date(value + 'T00:00:00') : earliestAllowed;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const blockedSet = new Set(blockedDates);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const goPrevMonth = () => {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };
  const goNextMonth = () => {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  return (
    <div className="rounded-xl border border-[#F2D7D0] bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={goPrevMonth}
          className="p-1.5 rounded-lg hover:bg-[#FAF6F4] text-[#4A231A]"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-[#4A231A]">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={goNextMonth}
          className="p-1.5 rounded-lg hover:bg-[#FAF6F4] text-[#4A231A]"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAY_LABELS.map((w, i) => (
          <span key={i} className="text-[9px] font-bold text-[#A75644] uppercase">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {[...Array(firstDayOfWeek)].map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {[...Array(daysInMonth)].map((_, i) => {
          const dayNum = i + 1;
          const dateStr = toDateStr(viewYear, viewMonth, dayNum);
          const dateObj = new Date(viewYear, viewMonth, dayNum);
          const isPast = dateObj < earliestAllowed;
          const isBlocked = blockedSet.has(dateStr);
          const isDisabled = isPast || isBlocked;
          const isSelected = value === dateStr;

          return (
            <button
              key={dayNum}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(dateStr)}
              title={isBlocked ? 'Data indisponível' : undefined}
              className={`aspect-square rounded-lg text-[11px] font-semibold flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-[#C27360] text-white shadow-sm'
                  : isDisabled
                  ? 'text-gray-300 line-through cursor-not-allowed'
                  : 'text-[#4A231A] hover:bg-[#FDF7F6]'
              }`}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-[#F2D7D0] text-[9px] text-[#645451]">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-[#C27360] inline-block" /> Selecionada
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-gray-200 inline-block" /> Indisponível
        </span>
      </div>
    </div>
  );
}
