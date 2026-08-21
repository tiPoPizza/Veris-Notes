import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CalendarModal } from './CalendarModal';
import { CalendarEvent } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Bell,
  Trash2,
  Edit2,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';

const MONTH_NAMES_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const MONTH_GENITIVE_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

const WEEKDAY_NAMES_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const FULL_WEEKDAYS_RU = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];

export const CalendarView: React.FC = () => {
  const {
    events,
    selectedCalendarDate,
    setSelectedCalendarDate,
    deleteCalendarEvent,
    setViewMode,
    previousViewMode,
    setSidebarOpen,
    theme,
    quickSettings,
  } = useApp();

  const isLight = isLightColor(theme.bg);
  const cardBg = hexToRgba(theme.text, 0.05);
  const cardBorder = quickSettings.showBorder
    ? theme.accent
    : hexToRgba(theme.text, 0.12);

  // Parse currently selected date
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  const [currentYear, setCurrentYear] = useState(() => {
    const initial = selectedCalendarDate ? new Date(selectedCalendarDate) : new Date();
    return isNaN(initial.getTime()) ? today.getFullYear() : initial.getFullYear();
  });

  const [currentMonth, setCurrentMonth] = useState(() => {
    const initial = selectedCalendarDate ? new Date(selectedCalendarDate) : new Date();
    return isNaN(initial.getTime()) ? today.getMonth() : initial.getMonth();
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Calendar grid calculations
  const calendarGrid = useMemo(() => {
    // Days in current month
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    // First day of current month (0: Sunday, 1: Monday, ...)
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    // In Russian calendar: Monday is 0, Sunday is 6
    const startOffset = (firstDayIndex + 6) % 7;

    // Previous month filler days
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      eventsCount: number;
    }> = [];

    // Prev month days
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const m = currentMonth === 0 ? 12 : currentMonth;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dayNumber: dayNum,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedCalendarDate,
        eventsCount: events.filter(e => !e.deleted && e.date === dateStr).length,
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
        dayNum
      ).padStart(2, '0')}`;
      days.push({
        dayNumber: dayNum,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedCalendarDate,
        eventsCount: events.filter(e => !e.deleted && e.date === dateStr).length,
      });
    }

    // Next month filler days (fill up to complete weeks of 7)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let dayNum = 1; dayNum <= remaining; dayNum++) {
        const m = currentMonth === 11 ? 1 : currentMonth + 2;
        const y = currentMonth === 11 ? currentYear + 1 : currentYear;
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        days.push({
          dayNumber: dayNum,
          dateStr,
          isCurrentMonth: false,
          isToday: dateStr === todayStr,
          isSelected: dateStr === selectedCalendarDate,
          eventsCount: events.filter(e => !e.deleted && e.date === dateStr).length,
        });
      }
    }

    return days;
  }, [currentYear, currentMonth, selectedCalendarDate, todayStr, events]);

  // Events for the selected date
  const selectedDateEvents = useMemo(() => {
    return events.filter(e => !e.deleted && e.date === selectedCalendarDate);
  }, [events, selectedCalendarDate]);

  // Format selected date display header
  const selectedDateTitle = useMemo(() => {
    if (!selectedCalendarDate) return '';
    const parts = selectedCalendarDate.split('-');
    if (parts.length !== 3) return selectedCalendarDate;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const targetDate = new Date(y, m, d);

    const isCurrentDay = selectedCalendarDate === todayStr;
    const weekday = FULL_WEEKDAYS_RU[targetDate.getDay()];
    const monthGen = MONTH_GENITIVE_RU[m];

    if (isCurrentDay) {
      return `Сегодня, ${d} ${monthGen}`;
    }
    return `${d} ${monthGen}, ${weekday}`;
  }, [selectedCalendarDate, todayStr]);

  const isPastDay = Boolean(selectedCalendarDate && selectedCalendarDate < todayStr);

  const handleOpenCreateModal = () => {
    if (isPastDay) return;
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-4 sm:px-8 lg:px-12 pt-6 pb-28 relative select-none">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-center mb-8 pt-1">
        {/* Centered Title */}
        <h1
          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center"
          style={{ color: theme.text }}
        >
          Календарь
        </h1>
      </div>

      {/* Main Calendar Container */}
      <div className="max-w-2xl mx-auto w-full space-y-8">
        {/* Calendar Card */}
        <div
          className="p-5 sm:p-7 rounded-3xl border backdrop-blur-xl shadow-xl space-y-6"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          {/* Month & Year Header with Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="p-2 rounded-2xl border hover:bg-white/10 active:scale-95 transition cursor-pointer"
              style={{ borderColor: cardBorder, color: theme.text }}
              title="Предыдущий месяц"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: theme.text }}>
                {MONTH_NAMES_RU[currentMonth]} {currentYear}
              </h2>
            </div>

            <button
              onClick={nextMonth}
              className="p-2 rounded-2xl border hover:bg-white/10 active:scale-95 transition cursor-pointer"
              style={{ borderColor: cardBorder, color: theme.text }}
              title="Следующий месяц"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
            {WEEKDAY_NAMES_RU.map((day, idx) => (
              <div
                key={day}
                className={`text-[11px] font-extrabold uppercase tracking-wider py-1 ${
                  idx >= 5 ? 'opacity-40' : 'opacity-60'
                }`}
                style={{ color: theme.text }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarGrid.map((item, idx) => {
              // Check states
              const isToday = item.isToday;
              const isSelected = item.isSelected;
              const isCurrent = item.isCurrentMonth;
              const hasEvents = item.eventsCount > 0;

              return (
                <button
                  key={`${item.dateStr}-${idx}`}
                  onClick={() => setSelectedCalendarDate(item.dateStr)}
                  className={`relative flex flex-col items-center justify-center h-10 sm:h-12 rounded-2xl transition cursor-pointer active:scale-95 ${
                    !isCurrent ? 'opacity-30' : 'opacity-100'
                  }`}
                  style={{
                    backgroundColor: isSelected
                      ? hexToRgba(theme.accent, 0.22)
                      : 'transparent',
                    color: theme.text,
                  }}
                >
                  {/* Date Number with Hollow Circle for Today */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition relative ${
                      isToday
                        ? 'border-2' // Hollow circle around today's date
                        : ''
                    }`}
                    style={{
                      borderColor: isToday ? theme.accent : 'transparent',
                      color: isSelected
                        ? theme.accent
                        : isToday
                        ? theme.accent
                        : theme.text,
                    }}
                  >
                    <span>{item.dayNumber}</span>
                  </div>

                  {/* Dot indicator if day has events */}
                  {hasEvents && (
                    <div
                      className="absolute bottom-1 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: theme.accent }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Events Section */}
        <div className="space-y-4">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold" style={{ color: theme.text }}>
                {selectedDateTitle}
              </h3>
              <p className="text-xs opacity-50">
                {selectedDateEvents.length > 0
                  ? `Событий: ${selectedDateEvents.length}`
                  : 'Нет запланированных событий'}
              </p>
            </div>

            {/* + Событие Button (only for today and future days) */}
            {!isPastDay && (
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-1.5 py-2 px-4 rounded-2xl text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-md"
                style={{ backgroundColor: theme.accent }}
              >
                <Plus size={15} />
                <span>Событие</span>
              </button>
            )}
          </div>

          {/* Events List */}
          {selectedDateEvents.length === 0 ? (
            <div
              className="p-8 rounded-3xl border backdrop-blur-md flex flex-col items-center justify-center text-center space-y-3"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center opacity-40"
                style={{ backgroundColor: hexToRgba(theme.text, 0.08), color: theme.text }}
              >
                <CalendarIcon size={24} />
              </div>
              <div>
                <p className="text-sm font-bold opacity-70">
                  {isPastDay ? 'Прошедший день' : 'На этот день событий нет'}
                </p>
                <p className="text-xs opacity-40 mt-0.5">
                  {isPastDay
                    ? 'Событий не было (создание недоступно)'
                    : 'Нажмите "+ Событие", чтобы запланировать задачу или напоминание'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedDateEvents.map(event => (
                <div
                  key={event.id}
                  className="p-4 rounded-2xl border backdrop-blur-md flex items-center justify-between gap-3 shadow-xs transition hover:shadow-md group"
                  style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: hexToRgba(theme.accent, 0.15),
                        color: theme.accent,
                      }}
                    >
                      {event.remindOnDay ? <Bell size={18} /> : <Clock size={18} />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold truncate" style={{ color: theme.text }}>
                          {event.title}
                        </h4>
                        {event.remindOnDay && (
                          <span
                            className="text-xs font-bold"
                            style={{
                              color: theme.accent,
                            }}
                          >
                            Напоминание
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs opacity-60 mt-0.5 font-medium">
                        <Clock size={12} />
                        <span>
                          {event.isAllDay
                            ? 'Весь день'
                            : `${event.startTime || '--:--'} – ${event.endTime || '--:--'}`}
                        </span>
                      </div>

                      {event.description && (
                        <p className="text-xs opacity-60 line-clamp-1 mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer"
                      style={{ color: theme.text }}
                      title="Редактировать"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => deleteCalendarEvent(event.id)}
                      className="p-2 rounded-xl hover:bg-red-500/20 active:scale-95 transition cursor-pointer text-red-500"
                      title="Удалить в корзину"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event Creation & Editing Modal */}
      <CalendarModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }}
        initialDate={selectedCalendarDate}
        editingEvent={editingEvent}
      />
    </div>
  );
};
